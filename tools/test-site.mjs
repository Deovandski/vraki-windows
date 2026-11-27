// Checks the built site's pages after `node tools/i18n.mjs build` and `node tools/stats.mjs` (#12).
// Run: node tools/test-site.mjs [_site]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || '_site';
const read = (f) => fs.readFileSync(path.join(out, f), 'utf8');
const langs = fs.readdirSync(out).filter((d) => fs.existsSync(path.join(out, d, 'meta.json')) || fs.existsSync(path.join(out, d, 'index.html')) && /^[a-z]{2}$/.test(d));

for (const page of ['index.html', 'debug/index.html', ...langs.flatMap((l) => [`${l}/index.html`, `${l}/debug/index.html`])]) {
  const html = read(page);
  assert.doesNotMatch(html, /data-shared="[^"]*"><\/|data-rebase=/, `${page}: every shared block is filled in`);
  assert.match(html, /<header class="top"/, `${page}: has the header`);
  assert.match(html, /class="settings-close" value="close" aria-label="[^"]+"/, `${page}: Settings has the × close button`);
  assert.doesNotMatch(html, /<button value="close">/, `${page}: no Done button`);
  assert.match(html, /class="debug-btn" href="(\.\.\/)?debug\/"/, `${page}: Settings has the DEBUG button, staying in the language`);
}
for (const page of ['debug/index.html', ...langs.map((l) => `${l}/debug/index.html`)]) {
  const html = read(page);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/, `${page}: not indexed`);
  assert.doesNotMatch(html, /<link rel="alternate" hreflang=/, `${page}: no hreflang links`);
  assert.match(html, /translate="no"[^>]*>\s*<div class="term-hi">/, `${page}: the terminal is translate="no"`);
}
for (const f of ['sitemap.xml', 'llms.txt', 'llms-full.txt', 'index.md']) assert.doesNotMatch(read(f), /debug/i, `${f} leaves out /debug/`);

const stats = JSON.parse(read('stats.json'));
assert.ok(stats.code.builtAt && stats.site.files > 0 && stats.i18n.languages.length === langs.length, 'stats.json has code, site and languages');
assert.ok(stats.app.release && stats.app.storeId, 'stats.json has the Windows app');
console.log(`Site OK: ${2 * (langs.length + 1)} pages checked, stats.json ${stats.site.files} files`);
