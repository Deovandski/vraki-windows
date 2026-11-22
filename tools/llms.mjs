// Files for AI tools and search engines, written into the built site by `node tools/i18n.mjs build`.
// Same idea as the Deovandski site (Deovandski/Deovandski#150) and HusbandOutWorld: plain-text copies that
// fetchers can read even when they don't run JavaScript, drop hidden content or skip #fragments.
//
//   _site/llms.txt        an index, per https://llmstxt.org/: what this is and where everything lives
//   _site/llms-full.txt   the whole English page as plain text, in one file
//   _site/index.md        the English page as Markdown
//   _site/sitemap.xml     the English page, each language that is translated enough, and the files above
//
// The page decides what goes in:
//   data-llms-skip              leave this element out (interactive widgets, decorations)
//   data-llms-note="…"          with data-llms-skip: write this sentence in its place
//   class="vraki"               text shown in the Vraki typeface; written as [Vraki typeface: …] so a reader
//                               knows the samples are English letters in another script, not words
//   data-llms-code              write this element's text as code (sample output that isn't real words)
//   class="sub" in a heading    a subtitle: written on its own line under the heading
// A link wrapped around block content (a card) becomes that content, with the link on its heading.
// Headers, dialogs, scripts, styles, [hidden] and aria-hidden elements are always left out.
//
// Reusable: everything specific to this site comes in through the options of writeAiFiles(), so another
// repo can copy this file as-is (it needs only linkedom).
//
// Usage:
//   import { writeAiFiles } from './llms.mjs';
//   writeAiFiles({ out: '_site', page: 'index.html', root: 'https://deovandski.github.io/vraki-windows',
//     title, summary, details, sections, languages: [{ code, name, url }] });
import fs from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'TEMPLATE', 'DIALOG', 'HEADER', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'OUTPUT']);
const BLOCK = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'FOOTER', 'ASIDE', 'NAV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'TABLE', 'FIGURE', 'FIGCAPTION', 'PRE', 'BLOCKQUOTE', 'FORM', 'FIELDSET', 'LEGEND', 'LABEL', 'VIDEO', 'IMG', 'HR']);

const clean = (s) => s.replace(/\s+/g, ' ').trim();
const escMd = (s) => s.replace(/([\\`*_[\]])/g, '\\$1');

function skipped(el) {
  return SKIP_TAGS.has(el.tagName) || el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true';
}

/** The page's HTML -> Markdown. Links and images become absolute, so the file works on its own. */
export function toMarkdown(html, pageUrl) {
  const { document } = parseHTML(html);
  const abs = (href) => { try { return new URL(href, pageUrl).href; } catch { return href; } };

  function inline(node) {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ');
    if (node.nodeType !== 1 || skipped(node)) return '';
    if (node.hasAttribute('data-llms-skip')) return node.getAttribute('data-llms-note') ? ` ${node.getAttribute('data-llms-note')} ` : '';
    const inner = () => [...node.childNodes].map(inline).join('');
    if (node.classList.contains('vraki')) return ` [Vraki typeface: ${clean(node.textContent)}] `;
    if (node.hasAttribute('data-llms-code')) { const t = clean(node.textContent); return t.includes('`') ? `\`\` ${t} \`\`` : `\`${t}\``; }
    switch (node.tagName) {
      case 'STRONG': case 'B': { const t = clean(inner()); return t ? `**${t}**` : ''; }
      case 'EM': case 'I': { const t = clean(inner()); return t ? `*${t}*` : ''; }
      case 'CODE': return '`' + node.textContent.replace(/`/g, "'") + '`';
      case 'BR': return '\n';
      case 'A': {
        const t = clean(inner());
        const href = node.getAttribute('href');
        return href && t ? `[${t}](${abs(href)})` : t;
      }
      case 'IMG': return node.getAttribute('alt') ? `![${escMd(node.getAttribute('alt'))}](${abs(node.getAttribute('src'))})` : '';
      default: return inner();
    }
  }

  const out = [];
  const para = (s) => { const t = clean(s); if (t) out.push(t, ''); };

  function table(el) {
    const rows = [...el.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => clean(inline(c)).replace(/\|/g, '\\|')));
    if (!rows.length) return;
    const width = Math.max(...rows.map((r) => r.length));
    const line = (r) => `| ${[...r, ...Array(width - r.length).fill('')].join(' | ')} |`;
    out.push(line(rows[0]), `|${' --- |'.repeat(width)}`, ...rows.slice(1).map(line), '');
  }

  function list(el, depth) {
    let n = 0;
    for (const li of el.children) {
      if (li.tagName !== 'LI' || skipped(li) || li.hasAttribute('data-llms-skip')) continue;
      n++;
      const own = [...li.childNodes].filter((c) => !(c.nodeType === 1 && ['UL', 'OL'].includes(c.tagName)));
      const text = clean(own.map(inline).join(''));
      out.push(`${'  '.repeat(depth)}${el.tagName === 'OL' ? `${n}.` : '-'} ${text}`);
      for (const sub of li.children) if (['UL', 'OL'].includes(sub.tagName)) list(sub, depth + 1);
    }
    if (!depth) out.push('');
  }

  let cardLink = '';   // set while inside a card (a link around block content): its heading gets the link
  const hasBlocks = (el) => [...el.children].some((c) => BLOCK.has(c.tagName));

  function block(el) {
    if (skipped(el)) return;
    if (el.tagName === 'A' && hasBlocks(el)) {
      cardLink = abs(el.getAttribute('href') || '');
      for (const c of el.childNodes) { if (c.nodeType === 1 && BLOCK.has(c.tagName)) block(c); else para(inline(c)); }
      if (cardLink) para(`Link: ${cardLink}`);   // the card had no heading to carry it
      cardLink = '';
      return;
    }
    if (el.hasAttribute('data-llms-skip')) { if (el.getAttribute('data-llms-note')) para(el.getAttribute('data-llms-note')); return; }
    const t = el.tagName;
    if (/^H[1-6]$/.test(t)) {
      const subs = [...el.children].filter((c) => c.classList.contains('sub'));
      const main = clean([...el.childNodes].filter((c) => !subs.includes(c)).map(inline).join(''));
      if (main) out.push(`${'#'.repeat(Number(t[1]))} ${cardLink ? `[${main}](${cardLink})` : main}`, '');
      if (main && cardLink) cardLink = '';
      for (const s of subs) para(`*${clean(inline(s))}*`);
      return;
    }
    if (t === 'P' || t === 'FIGCAPTION' || t === 'LEGEND' || t === 'LABEL') { para(t === 'FIGCAPTION' ? `*${clean(inline(el))}*` : inline(el)); return; }
    if (t === 'UL' || t === 'OL') { list(el, 0); return; }
    if (t === 'TABLE') { table(el); return; }
    if (t === 'PRE') { out.push('```', el.textContent.replace(/\n+$/, ''), '```', ''); return; }
    if (t === 'BLOCKQUOTE') { const s = clean(inline(el)); if (s) out.push(`> ${s}`, ''); return; }
    if (t === 'IMG') { para(inline(el)); return; }
    if (t === 'VIDEO') {
      const label = el.getAttribute('aria-label') || 'Video';
      para(`[${/^video\b/i.test(label) ? label : `Video: ${label}`}](${abs(el.getAttribute('src'))})`);
      return;
    }
    if (t === 'HR') { out.push('---', ''); return; }
    // A container: runs of inline content become paragraphs; block children are handled in turn.
    let run = '';
    for (const c of el.childNodes) {
      if (c.nodeType === 1 && (BLOCK.has(c.tagName) || c.hasAttribute('data-llms-skip') || (c.tagName === 'A' && hasBlocks(c)))) { para(run); run = ''; block(c); }
      else run += inline(c);
    }
    para(run);
  }

  block(document.body);
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Writes llms.txt, llms-full.txt, index.md and sitemap.xml into `out`.
 * @param {object} o
 * @param {string} o.out        the built site folder (e.g. "_site")
 * @param {string} o.page       the English page inside it (e.g. "index.html")
 * @param {string} o.root       the published address, no trailing slash
 * @param {string} o.title      the site's name, for the top heading
 * @param {string} o.summary    one or two sentences: what this is
 * @param {string[]} [o.details] extra lines under the summary (contact, source, AI assistance)
 * @param {{heading: string, links: {label: string, url: string, note?: string}[]}[]} [o.sections] llms.txt link lists
 * @param {{code: string, name: string, url: string}[]} [o.languages] translated versions that are ready
 */
export function writeAiFiles(o) {
  const pageUrl = `${o.root}/${o.page === 'index.html' ? '' : o.page}`;
  const md = toMarkdown(fs.readFileSync(path.join(o.out, o.page), 'utf8'), pageUrl);
  const head = [`# ${o.title}`, '', ...o.summary.split('\n').map((l) => `> ${l}`), '', ...(o.details ?? []), ...(o.details?.length ? [''] : [])];
  const note = 'Text shown in the Vraki typeface is written here as [Vraki typeface: …]. It is ordinary English in a different script, not words in another language.';

  fs.writeFileSync(path.join(o.out, 'index.md'),
    [`<!-- ${o.title}, as Markdown. The page: ${pageUrl} · Index for AI tools: ${o.root}/llms.txt -->`, '', note, '', md].join('\n'));

  fs.writeFileSync(path.join(o.out, 'llms-full.txt'),
    [...head, `The whole page as plain text. The page: ${pageUrl}`, '', note, '', '---', '', md].join('\n'));

  const sections = [
    { heading: 'This page', links: [
      { label: 'The page as Markdown', url: `${o.root}/index.md` },
      { label: 'Everything in one file', url: `${o.root}/llms-full.txt`, note: 'the same text as plain text' },
    ] },
    ...(o.sections ?? []),
    ...(o.languages?.length ? [{ heading: 'Other languages', links: o.languages.map((l) => ({ label: l.name, url: l.url, note: `AI-translated (${l.code})` })) }] : []),
  ];
  const index = [...head];
  for (const s of sections) {
    index.push(`## ${s.heading}`, '');
    for (const l of s.links) index.push(`- [${l.label}](${l.url})${l.note ? `: ${l.note}` : ''}`);
    index.push('');
  }
  fs.writeFileSync(path.join(o.out, 'llms.txt'), index.join('\n'));

  // A project site's robots.txt is ignored (crawlers read the domain root), so submit this sitemap
  // in Google Search Console and Bing Webmaster Tools instead.
  const urls = [pageUrl, ...(o.languages ?? []).map((l) => l.url), `${o.root}/llms.txt`, `${o.root}/llms-full.txt`, `${o.root}/index.md`];
  fs.writeFileSync(path.join(o.out, 'sitemap.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${xmlEsc(u)}</loc></url>`),
    '</urlset>', '',
  ].join('\n'));
  return { markdownChars: md.length, sitemapUrls: urls.length };
}
