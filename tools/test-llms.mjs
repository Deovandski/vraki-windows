// Checks the files for AI tools and search engines after a build (`node tools/i18n.mjs build`).
// Run: node tools/test-llms.mjs [_site]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || '_site';
const read = (f) => fs.readFileSync(path.join(out, f), 'utf8');
const ROOT = 'https://deovandski.github.io/vraki-windows';

const llms = read('llms.txt');
assert.match(llms, /^# .+\n\n> /, 'llms.txt starts with a title and a summary (llmstxt.org)');
for (const f of ['index.md', 'llms-full.txt']) assert.ok(llms.includes(`${ROOT}/${f}`), `llms.txt links ${f}`);

const md = read('index.md');
const body = md.replace(/^<!--.*?-->\n/, '').replace(/```[\s\S]*?```/g, '');
assert.doesNotMatch(body, /<\/?[a-z][a-z0-9]*[\s>]/i, 'index.md has no leftover HTML tags');
assert.match(md, /\[Vraki typeface: /, 'Vraki-typeface text is marked as such');
assert.doesNotMatch(md, /\]\((?!https?:|mailto:)/, 'every link in index.md is absolute');
for (const heading of ['## Try the 2017 converter', '## The Vraki typeface', '## How the 2017 conversions work']) {
  assert.ok(md.includes(heading), `index.md has "${heading}"`);
}

const full = read('llms-full.txt');
assert.ok(full.includes(body.trim().slice(-200)), 'llms-full.txt carries the whole page');

const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert.ok(urls.includes(`${ROOT}/`) && urls.includes(`${ROOT}/llms.txt`) && urls.includes(`${ROOT}/index.md`), 'sitemap lists the page and the AI files');
for (const u of urls) assert.ok(u.startsWith(`${ROOT}/`), `sitemap URL is on this site: ${u}`);

const html = read('index.html');
assert.match(html, /<link rel="alternate" type="text\/markdown" href="llms.txt"/, 'the page links llms.txt in its head');
console.log(`AI files OK: index.md ${md.length} chars, sitemap ${urls.length} URLs`);
