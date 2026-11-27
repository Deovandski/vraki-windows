// Writes _site/stats.json: facts about this build that the Stats for nerds page (debug/, #12) reads, so the browser never
// has to work them out. Run it after the build: `node tools/i18n.mjs build --out _site && node tools/stats.mjs`.
// Ported from Deovandski-repo-template's tools/stats.ts (Deovandski-repo-template#19); `app` is this repo's own.
//   code   which commit and pull request this build came from, when, and with which tools
//   site   pages, languages, files and size of what gets deployed
//   app    the 2017 Windows app: latest release, Store listing, the Vraki typeface, the converter port
//   i18n   how much of each language is translated (the same counting as `node tools/i18n.mjs status`)
// Commit, branch, pull request and repository are left out when the repo is private (GitHub Actions says so in its
// event file); a local build reads them from git.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { languageStats } from './i18n.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.resolve(ROOT, process.argv[2] || '_site');
const SITE_URL = 'https://deovandski.github.io/vraki-windows';
const env = process.env;
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const git = (...args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { return null; }
};
const version = (pkg) => readJson(path.join(ROOT, 'node_modules', pkg, 'package.json'))?.version ?? null;

if (!fs.existsSync(OUT)) { console.error('No _site/ yet: run `node tools/i18n.mjs build --out _site` first.'); process.exit(2); }

// ---------------------------------------------------------------- code
const ci = env.GITHUB_ACTIONS === 'true';
const event = env.GITHUB_EVENT_PATH ? readJson(env.GITHUB_EVENT_PATH) : null;
const isPrivate = ci ? event?.repository?.private !== false : false;   // unknown in CI counts as private
const commit = env.GITHUB_SHA || git('rev-parse', 'HEAD');
const message = event?.head_commit?.message ?? git('log', '-1', '--format=%B');
const subject = message?.split('\n')[0] ?? null;
// "Merge pull request #18 from …" (merge) or "Title (#18)" (squash).
const pr = Number(subject?.match(/Merge pull request #(\d+)/)?.[1] ?? subject?.match(/\(#(\d+)\)\s*$/)?.[1]) || null;
const remote = git('config', '--get', 'remote.origin.url');
const repo = env.GITHUB_REPOSITORY || remote?.match(/github\.com[/:]([^/]+\/[^/.]+?)(\.git)?$/)?.[1] || null;
const server = env.GITHUB_SERVER_URL || 'https://github.com';
const repoUrl = repo ? `${server}/${repo}` : null;

const code = {
  builtAt: new Date().toISOString(),
  builtBy: ci ? 'GitHub Actions' : 'local build',
  public: ci ? !isPrivate : null,
  run: ci ? Number(env.GITHUB_RUN_NUMBER) || null : null,
  runUrl: ci && !isPrivate && repoUrl && env.GITHUB_RUN_ID ? `${repoUrl}/actions/runs/${env.GITHUB_RUN_ID}` : null,
  ...(isPrivate ? {} : {
    repo, repoUrl,
    branch: env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD'),
    commit,
    commitUrl: repoUrl && commit ? `${repoUrl}/commit/${commit}` : null,
    commitDate: event?.head_commit?.timestamp ?? git('log', '-1', '--format=%cI'),
    commitSubject: subject,
    pr,
    prUrl: repoUrl && pr ? `${repoUrl}/pull/${pr}` : null,
  }),
  tools: { node: process.version, linkedom: version('linkedom') },
};

// ---------------------------------------------------------------- site
const i18n = languageStats();
let files = 0;
let bytes = 0;
const byType = {};
for (const f of fs.readdirSync(OUT, { recursive: true })) {
  const st = fs.statSync(path.join(OUT, f));
  if (!st.isFile()) continue;
  files++;
  bytes += st.size;
  const ext = path.extname(f).slice(1).toLowerCase() || '(none)';
  const t = (byType[ext] ??= { files: 0, bytes: 0 });
  t.files++; t.bytes += st.size;
}
const swVersion = fs.readFileSync(path.join(ROOT, 'site', 'sw.js'), 'utf8').match(/const VERSION = '([^']+)'/)?.[1] ?? null;
const site = {
  url: SITE_URL,
  pages: i18n.english.pages,
  languages: i18n.languages.length + 1,
  files, bytes,
  byType: Object.fromEntries(Object.entries(byType).sort(([, a], [, b]) => b.bytes - a.bytes)),
  serviceWorker: swVersion,
};

// ---------------------------------------------------------------- the Windows app (this repo's own)
// Latest release: the newest docs/release-notes/v*.md (packaging/ only holds the Store identity example; the committed
// manifest carries the development identity, so its version isn't the Store's).
const notes = fs.readdirSync(path.join(ROOT, 'docs', 'release-notes')).filter((f) => /^v.+\.md$/.test(f))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const release = notes.at(-1)?.replace(/\.md$/, '') ?? null;
const font = 'VrakiHusbandOutWorldSeries-Rg.woff2';
const fontPath = path.join(ROOT, 'site', 'fonts', font);
const app = {
  release,
  releaseNotes: release && repoUrl && !isPrivate ? `${repoUrl}/blob/main/docs/release-notes/${release}.md` : null,
  storeId: '9P41XHS4HMLX',
  storeUrl: 'https://apps.microsoft.com/detail/9P41XHS4HMLX',
  legacy: 'UWP for Windows 10, C# + XAML, in legacy/ (unchanged since 2017)',
  legacyUrl: repoUrl && !isPrivate ? `${repoUrl}/tree/main/legacy` : null,
  typeface: fs.existsSync(fontPath) ? { file: font, bytes: fs.statSync(fontPath).size, licenseUrl: repoUrl && !isPrivate ? `${repoUrl}/blob/main/site/fonts/LICENSE.md` : null } : null,
  converter: 'site/vraki-2017.js, a line-by-line port of the 2017 C#, checked by tools/test-vraki-2017.js',
};

fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify({ code, site, app, i18n }, null, 1) + '\n');
console.log(`stats.json: ${code.builtBy}${code.commit ? ` @ ${code.commit.slice(0, 7)}` : ''}${pr ? ` (PR #${pr})` : ''} · ${files} files, ${(bytes / 1048576).toFixed(1)} MB`);
