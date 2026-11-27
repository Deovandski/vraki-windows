// Translations of the website, written ahead of time and kept in content/i18n/<lang>/.
// A Node port of HusbandOutWorld's tools/i18n.py. English (site/*.html) stays the source.
//
// How it works
// - The page is split into segments: every element that holds text directly (a paragraph, heading, list item,
//   button, label, option, caption, ...) plus a few attributes (alt, title, aria-label, placeholder) and the
//   page description. Each segment is keyed by a short hash of its English HTML.
// - A segment's translation is looked up by that hash. A segment with no translation stays in English, marked
//   lang="en", so a half-translated language still works.
// - English that doesn't change keeps its hash, so it is never translated twice. Only new or edited segments
//   show up in `todo`.
// - Anything with translate="no" (or inside it) is left alone: Vraki-typeface text, the converter's sample
//   output, code, names. <textarea>, <pre>, <code>, <script>, <style> and <svg> are never translated.
//
// Store layout (content/i18n/<lang>/)
//   meta.json         the language's name, <html lang>, direction and the banner
//   glossary.json     how names and recurring terms are written in this language (read by whoever translates)
//   _shared.json      segments in the header, footer and Settings dialog (and any on 5+ pages)
//   pages/<page>.json everything else, one file per page: {"<hash>": {"en": "<English HTML>", "t": "<translation>"}}
//
// Command line
//   node tools/i18n.mjs build [--out _site]         copy site/ to _site/ and write /<lang>/ versions of every page,
//                                                   then the files for AI tools and search engines (tools/llms.mjs)
//   node tools/i18n.mjs status                      what's translated, per language
//   node tools/i18n.mjs todo --lang ja [--max-words 6000] > work.json
//                                                   only the segments that still need translating
//   node tools/i18n.mjs apply work.json             save the "t" fields of a work file into the store
//   node tools/i18n.mjs prune                       drop translations whose English no longer exists
//   node tools/i18n.mjs rehash                      re-key stored translations from their "en" (after a find/replace
//                                                   that touched the English, like changing a link everywhere)
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { writeAiFiles } from './llms.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'site');
const STORE = path.join(ROOT, 'content', 'i18n');
const BASE_URL = 'https://deovandski.github.io/vraki-windows';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'TEMPLATE', 'CODE', 'PRE', 'TEXTAREA']);
const ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
const SHARED_SELECTOR = 'header, footer, dialog, .i18n-shared';
const SHARED_MIN_PAGES = 5;
export const INDEX_COVERAGE = 0.9;  // a language is offered (auto-select, hreflang) once this much of a page is translated
const LETTER = /\p{L}/u;
// Order of the Language menu. Each language's own name comes from its meta.json.
const ORDER = ['zh', 'ja', 'pt', 'es', 'ar', 'ko', 'ms', 'th', 'de', 'vi', 'it', 'fr', 'hi', 'id'];

// ---------------------------------------------------------------- store

/** Whitespace and quote style don't change a segment's meaning, so they don't change its hash. */
export function norm(s) {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}
export const segHash = (en) => createHash('sha1').update(norm(en), 'utf8').digest('hex').slice(0, 12);

const readJson = (p, d = {}) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
const writeJson = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n');
};

export function languages() {
  if (!fs.existsSync(STORE)) return [];
  const have = fs.readdirSync(STORE).filter((d) => fs.statSync(path.join(STORE, d)).isDirectory());
  return [...ORDER.filter((c) => have.includes(c)), ...have.filter((c) => !ORDER.includes(c)).sort()];
}
const loadMeta = (code) => readJson(path.join(STORE, code, 'meta.json'));

function shardFiles(code) {
  const base = path.join(STORE, code);
  const out = [path.join(base, '_shared.json')];
  const pages = path.join(base, 'pages');
  if (fs.existsSync(pages)) for (const f of fs.readdirSync(pages, { recursive: true })) if (f.endsWith('.json')) out.push(path.join(pages, f));
  return out.filter((p) => fs.existsSync(p));
}

/** hash -> translated HTML, from every shard of one language. */
function loadStore(code) {
  const out = new Map();
  for (const p of shardFiles(code)) for (const [h, v] of Object.entries(readJson(p))) if (v && v.t) out.set(h, v.t);
  return out;
}

const pageShard = (page) => path.join('pages', page.replace(/\.html$/, '') + '.json');

// ---------------------------------------------------------------- segments

function skipped(el) {
  return SKIP_TAGS.has(el.tagName) || el.getAttribute('translate') === 'no';
}

/** Text right inside the element (not only in its children). Separators like " · " don't count. */
function hasDirectText(el) {
  for (const n of el.childNodes) if (n.nodeType === 3 && LETTER.test(n.textContent)) return true;
  return false;
}

/** Yield {el, attr, en} for every translatable piece of a page. */
function* segments(document) {
  for (const m of document.querySelectorAll('head meta')) {
    const c = m.getAttribute('content');
    if (c && (m.getAttribute('name') === 'description' || ['og:title', 'og:description'].includes(m.getAttribute('property')))) {
      yield { el: m, attr: 'content', en: c };
    }
  }
  function* walk(el) {
    if (skipped(el)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && LETTER.test(v)) yield { el, attr: a, en: v };
    }
    if (!['HTML', 'HEAD', 'BODY'].includes(el.tagName) && hasDirectText(el)) {
      yield { el, attr: null, en: el.innerHTML };
      return; // attributes of descendants (an alt inside a paragraph) are part of that paragraph's HTML
    }
    for (const c of el.children) yield* walk(c);
  }
  yield* walk(document.documentElement);
}

const textWords = (s) => s.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const isShared = (el) => !!(el.closest && el.closest(SHARED_SELECTOR));

/** Every page in site/, as a path like "index.html" or "debug/index.html" (home first). */
function sourcePages() {
  return fs.readdirSync(SRC, { recursive: true }).map((f) => f.split(path.sep).join('/'))
    .filter((f) => f.endsWith('.html')).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
}

/** How many folders down a page is: 0 for index.html, 1 for debug/index.html. */
const depthOf = (page) => page.split('/').length - 1;
/** The page's folder: "" for index.html, "debug/" for debug/index.html. */
const dirOf = (page) => page.slice(0, page.lastIndexOf('/') + 1);

/**
 * A page's HTML, with its shared blocks filled in. One source: the head script, header, Settings dialog, footer and
 * shared words live in index.html, marked data-shared="…"; another page writes an empty element with the same
 * data-shared, and gets index.html's copy here. The copy keeps index.html's exact HTML (so its translations, stored by
 * hash, match) and is marked data-rebase="../"; applyRebase() moves its relative links to the page's folder after
 * translating. So a change to the header shows on every page, translated everywhere.
 */
let homeDoc = null;
function loadSource(page) {
  const html = fs.readFileSync(path.join(SRC, page), 'utf8');
  if (page === 'index.html' || !html.includes('data-shared')) return html;
  homeDoc ||= parseHTML(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8')).document;
  const { document } = parseHTML(html);
  const up = '../'.repeat(depthOf(page));
  for (const slot of [...document.querySelectorAll('[data-shared]')]) {
    const name = slot.getAttribute('data-shared');
    const from = homeDoc.querySelector(`[data-shared="${name}"]`);
    if (!from) throw new Error(`${page}: index.html has no data-shared="${name}"`);
    const copy = from.cloneNode(true);
    copy.setAttribute('data-rebase', up);
    slot.replaceWith(copy);
  }
  return document.toString();
}

/** Move the relative links of copied shared blocks (data-rebase="../") to work from the page's folder. */
function applyRebase(document) {
  for (const block of document.querySelectorAll('[data-rebase]')) {
    const up = block.getAttribute('data-rebase');
    block.removeAttribute('data-rebase');
    for (const el of [block, ...block.querySelectorAll('[href], [src], [action]')]) {
      for (const a of ['href', 'src', 'action']) {
        const v = el.getAttribute(a);
        if (v == null || /^([a-z][a-z0-9+.-]*:|\/)/i.test(v)) continue;   // URLs and site-absolute paths stay
        el.setAttribute(a, v.startsWith('#') ? up + v : path.posix.normalize(up + v));
      }
    }
  }
}

/** hash -> {en, words, pages[], shared} for every segment of every source page. */
function inventory() {
  const segs = new Map();
  for (const page of sourcePages()) {
    const { document } = parseHTML(loadSource(page));
    for (const { el, en } of segments(document)) {
      const h = segHash(en);
      const s = segs.get(h) || { en, words: textWords(en), pages: [], shared: false };
      if (!s.pages.includes(page)) s.pages.push(page);
      s.shared = s.shared || isShared(el);
      segs.set(h, s);
    }
  }
  for (const s of segs.values()) if (s.pages.length >= SHARED_MIN_PAGES) s.shared = true;
  return segs;
}

// ---------------------------------------------------------------- pages

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A relative link, moved from the English page to its copy at /<lang>/<page>. Links to pages ("./", "../", "debug/",
 * "#try", "../#origin") stay as they are, so they stay inside the language. Links to files ("icon.png", "../site.css")
 * point back at the one copy of the file, outside the language folder.
 */
function rebaseLink(v, page) {
  if (!v || /^([a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(v)) return v;
  const bare = v.replace(/[?#].*$/, '');
  if (bare === '' || bare === '.' || bare.endsWith('/')) return v;           // a page: stay in the language
  return path.posix.normalize('../'.repeat(depthOf(page) + 1) + dirOf(page) + v);
}

function languageOptions(langs) {
  const opts = ['<option value="en" lang="en">English</option>'];
  for (const { code, meta } of langs) opts.push(`<option value="${code}" lang="${esc(meta.html_lang || code)}">${esc(meta.name || code)}</option>`);
  return opts.join('');
}

/** Things every version of a page shares: the Language menu, the issue link. */
function prepare(document, langs) {
  for (const sel of document.querySelectorAll('select[data-setting="lang"]')) sel.innerHTML = languageOptions(langs);
}

/** English page -> {html, coverage} for one language. */
function translatePage(src, page, code, meta, store, langs) {
  const { document } = parseHTML(src);
  prepare(document, langs);
  let total = 0, done = 0;
  for (const { el, attr, en } of [...segments(document)]) {
    const w = textWords(en) || 1;
    total += w;
    const t = store.get(segHash(en));
    if (!t) {
      if (!attr) {
        el.setAttribute('lang', 'en'); // still English: say so (screen readers, and left to right inside Arabic)
        if (meta.dir === 'rtl') el.setAttribute('dir', 'ltr');
      }
      continue;
    }
    done += w;
    if (attr) el.setAttribute(attr, t);
    else el.innerHTML = t;
  }
  applyRebase(document);
  // the page lives one folder further down: file links point back at the one copy of each file
  for (const el of document.querySelectorAll('[src], [href], [poster]')) {
    for (const a of ['src', 'href', 'poster']) if (el.hasAttribute(a)) el.setAttribute(a, rebaseLink(el.getAttribute(a), page));
  }
  const root = document.documentElement;
  root.setAttribute('lang', meta.html_lang || code);
  root.setAttribute('dir', meta.dir || 'ltr');
  root.setAttribute('data-lang', code);
  root.setAttribute('data-root', '../'.repeat(depthOf(page) + 1));
  const canon = document.querySelector('link[rel="canonical"]');
  if (canon) canon.setAttribute('href', pageUrl(page, code));
  const top = document.querySelector('header');
  if (top && meta.banner) {
    const en = '../'.repeat(depthOf(page) + 1) + dirOf(page);
    top.insertAdjacentHTML('afterend',
      `<div class="i18n-banner" role="note">${meta.banner} <a href="${en}" class="i18n-en" data-lang-switch="en" hreflang="en" lang="en" translate="no">${esc(meta.english || 'English')}</a></div>`);
  }
  return { document, coverage: total ? done / total : 1 };
}

const pageUrl = (page, code) => `${BASE_URL}/${code && code !== 'en' ? code + '/' : ''}${page.replace(/(^|\/)index\.html$/, '$1')}`;
/** A page with <meta name="robots" content="noindex"> (like debug/) gets no hreflang links, and stays out of the AI files. */
const isNoindex = (document) => /noindex/i.test(document.querySelector('meta[name="robots"]')?.getAttribute('content') || '');

/** Tell search engines and the auto-select script which language versions are ready. */
function headExtras(document, page, cov, thisCode) {
  const ready = Object.keys(cov).filter((c) => cov[c] >= INDEX_COVERAGE);
  const head = document.querySelector('head');
  if (ready.length && !isNoindex(document)) {
    for (const c of ['en', ...ready]) head.insertAdjacentHTML('beforeend', `<link rel="alternate" hreflang="${c}" href="${pageUrl(page, c)}">`);
    head.insertAdjacentHTML('beforeend', `<link rel="alternate" hreflang="x-default" href="${pageUrl(page)}">`);
  }
  if (thisCode && (cov[thisCode] || 0) < INDEX_COVERAGE) head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex">');
  document.documentElement.setAttribute('data-langs', ready.join(' '));
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

function cmdBuild(args) {
  const out = path.resolve(ROOT, args.out || '_site');
  fs.rmSync(out, { recursive: true, force: true });
  copyDir(SRC, out);
  const langs = languages().map((code) => ({ code, meta: loadMeta(code), store: loadStore(code) }));
  const lines = [];
  let homeCov = {};
  for (const page of sourcePages()) {
    const src = loadSource(page);
    const cov = {}, outs = {};
    for (const { code, meta, store } of langs) {
      const r = translatePage(src, page, code, meta, store, langs);
      outs[code] = r.document; cov[code] = r.coverage;
    }
    const { document: en } = parseHTML(src);
    prepare(en, langs);
    applyRebase(en);
    headExtras(en, page, cov);
    fs.writeFileSync(path.join(out, page), en.toString());
    for (const { code } of langs) {
      headExtras(outs[code], page, cov, code);
      fs.mkdirSync(path.dirname(path.join(out, code, page)), { recursive: true });
      fs.writeFileSync(path.join(out, code, page), outs[code].toString());
    }
    lines.push(`${page}: ` + langs.map(({ code }) => `${code} ${Math.round(100 * cov[code])}%`).join(' · '));
    if (page === 'index.html') homeCov = cov;
  }
  console.log(`built ${path.relative(ROOT, out) || '.'}/ with ${langs.length} languages\n` + lines.join('\n'));
  const ai = writeAiFiles({
    out, page: 'index.html', root: BASE_URL,
    title: 'Vraki Language for Windows (2017)',
    summary: 'Vraki Language is a 2017 Universal Windows Platform app by Deovandski Skibinski Junior that turns English into Vraki, the writing\n' +
      'behind the #HusbandOutWorld light novel series, by reversing, shifting and restructuring it. Kept for historical purposes;\n' +
      'today Vraki is written 1:1 with English, one glyph per letter, in its own typeface.',
    details: [
      'Microsoft Store: https://apps.microsoft.com/detail/9P41XHS4HMLX. Source: https://github.com/Deovandski/vraki-windows (app code MIT;',
      'the Vraki typeface has its own license). The website was built with AI assistance (Claude) under Deovandski\'s direction.',
    ],
    sections: [
      { heading: 'On the page', links: [
        { label: 'Try the 2017 converter', url: `${BASE_URL}/#try`, note: 'the app\'s conversion code, ported to JavaScript; runs in the browser' },
        { label: 'The Vraki typeface', url: `${BASE_URL}/#typeface`, note: 'one glyph per English letter, and where to get the font' },
        { label: 'How the 2017 conversions work', url: 'https://github.com/Deovandski/vraki-windows/blob/main/docs/ALGORITHMS.md' },
      ] },
      { heading: 'Related', links: [
        { label: 'Vraki Language & Font (HusbandOutWorld World Lore)', url: 'https://www.husbandoutworld.com/lore/language/', note: 'the language in the series\' lore' },
        { label: '#HusbandOutWorld', url: 'https://www.husbandoutworld.com/llms.txt', note: 'the light novel series, with its own llms.txt' },
        { label: 'Vraki West March Campaign', url: 'https://deovandski.github.io/Vraki-West-March-Campaign-D-D/', note: 'a D&D 5e campaign set in the same world' },
        { label: "Deovandski's Blog", url: 'https://deovandski.github.io/Deovandski/llms.txt', note: 'the author, with his own llms.txt' },
      ] },
    ],
    languages: langs.filter(({ code }) => (homeCov[code] || 0) >= INDEX_COVERAGE)
      .map(({ code, meta }) => ({ code, name: meta.name || code, url: `${BASE_URL}/${code}/` })),
  });
  console.log(`llms.txt, llms-full.txt, index.md (${ai.markdownChars} characters of Markdown), sitemap.xml (${ai.sitemapUrls} URLs)`);
}

// ---------------------------------------------------------------- command line

/**
 * How much of each language is translated, counted the same way as `status`: words of English segments that have a
 * translation. Used by tools/stats.mjs for the Stats for nerds page (Deovandski-repo-template's languageStats()).
 */
export function languageStats() {
  const segs = inventory();
  const pages = sourcePages();
  const indexable = pages.filter((p) => !isNoindex(parseHTML(loadSource(p)).document));
  const words = [...segs.values()].reduce((n, s) => n + s.words, 0);
  const pageWords = new Map();
  for (const s of segs.values()) for (const p of s.pages) pageWords.set(p, (pageWords.get(p) || 0) + s.words);
  return {
    english: { pages: pages.length, pagesIndexable: indexable.length, segments: segs.size, words },
    indexCoverage: INDEX_COVERAGE,
    languages: languages().map((code) => {
      const meta = loadMeta(code);
      const st = loadStore(code);
      let doneWords = 0, doneSegs = 0;
      const pageDone = new Map();
      for (const [h, s] of segs) {
        if (!st.has(h)) continue;
        doneWords += s.words;
        doneSegs++;
        for (const p of s.pages) pageDone.set(p, (pageDone.get(p) || 0) + s.words);
      }
      const indexed = indexable.filter((p) => (pageDone.get(p) || 0) >= INDEX_COVERAGE * (pageWords.get(p) || 0)).length;
      return {
        code, name: meta.name || code, dir: meta.dir || 'ltr',
        percent: Math.round((1000 * doneWords) / Math.max(1, words)) / 10,
        words: doneWords, segments: doneSegs, pagesIndexed: indexed,
      };
    }),
  };
}

function cmdStatus() {
  const segs = inventory();
  const words = [...segs.values()].reduce((n, s) => n + s.words, 0);
  console.log(`English: ${segs.size} segments, ${words.toLocaleString('en')} words`);
  for (const code of languages()) {
    const st = loadStore(code);
    let dw = 0, waiting = 0;
    for (const [h, s] of segs) if (st.has(h)) dw += s.words; else waiting++;
    console.log(`${code}: ${Math.round((100 * dw) / Math.max(1, words))}% · ${waiting} segments waiting`);
  }
}

function cmdTodo(args) {
  if (!args.lang) die('todo needs --lang <code>');
  const segs = inventory();
  const st = loadStore(args.lang);
  let budget = +args['max-words'] || Infinity;
  const items = [];
  for (const [h, s] of segs) {
    if (st.has(h)) continue;
    if (items.length && s.words > budget) break;
    budget -= s.words;
    items.push({ h, page: s.pages[0], en: s.en, t: '' });
  }
  process.stdout.write(JSON.stringify({
    lang: args.lang,
    glossary: `content/i18n/${args.lang}/glossary.json`,
    rules: 'Translate "en" into "t". Keep every HTML tag and attribute exactly (only translate visible text and alt/title/aria-label text). ' +
      'Write names as glossary.json says. Leave "t" empty to skip.',
    items,
  }, null, 1) + '\n');
  console.error(`${items.length} segments, ${items.reduce((n, i) => n + textWords(i.en), 0)} words`);
}

const tagShape = (s) => (s.match(/<\/?[a-z0-9]+/gi) || []).map((t) => t.toLowerCase()).sort().join(' ');

function cmdApply(args) {
  const file = args._[0];
  if (!file) die('apply needs a work file');
  const segs = inventory();
  const work = readJson(path.resolve(file));
  const base = path.join(STORE, work.lang);
  const shards = new Map();
  let saved = 0, warned = 0;
  for (const it of work.items) {
    const t = (it.t || '').trim();
    if (!t) continue;
    if (tagShape(t) !== tagShape(it.en)) { console.error(`warning: ${it.h} (${it.page}): the HTML tags differ from the English; check it`); warned++; }
    const s = segs.get(it.h) || { pages: [it.page], shared: false };
    const p = path.join(base, s.shared ? '_shared.json' : pageShard(s.pages[0]));
    if (!shards.has(p)) shards.set(p, readJson(p));
    shards.get(p)[it.h] = { en: it.en, t };
    saved++;
  }
  for (const [p, data] of shards) writeJson(p, Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b))));
  console.log(`${work.lang}: saved ${saved} translations into ${shards.size} files` + (warned ? `, ${warned} to check` : ''));
}

function cmdPrune() {
  const segs = inventory();
  for (const code of languages()) {
    let dropped = 0;
    for (const p of shardFiles(code)) {
      const data = readJson(p);
      const keep = Object.fromEntries(Object.entries(data).filter(([h]) => segs.has(h)));
      dropped += Object.keys(data).length - Object.keys(keep).length;
      if (Object.keys(keep).length !== Object.keys(data).length) Object.keys(keep).length ? writeJson(p, keep) : fs.rmSync(p);
    }
    console.log(`${code}: dropped ${dropped} translations of English that no longer exists`);
  }
}

/** A find/replace that also changed the stored "en" text leaves old hashes behind: key every entry by its "en" again. */
function cmdRehash() {
  for (const code of languages()) {
    let moved = 0;
    for (const p of shardFiles(code)) {
      const data = readJson(p), out = {};
      for (const [h, v] of Object.entries(data)) {
        const k = v && v.en ? segHash(v.en) : h;
        if (k !== h) moved++;
        out[k] = v;
      }
      writeJson(p, Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))));
    }
    console.log(`${code}: re-keyed ${moved} translations`);
  }
}

function die(msg) { console.error(msg); process.exit(2); }

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else a._.push(argv[i]);
  }
  return a;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const cmds = { build: cmdBuild, status: cmdStatus, todo: cmdTodo, apply: cmdApply, prune: cmdPrune, rehash: cmdRehash };
  if (!cmds[cmd]) die('usage: node tools/i18n.mjs build|status|todo|apply|prune|rehash (see the top of tools/i18n.mjs)');
  cmds[cmd](parseArgs(rest));
}
