# Vraki Language for Windows

The 2017 UWP app (`legacy/`, never edited beyond the manifest identity), its docs, and the GitHub Pages website (`site/`). See README.md for the layout.

## Rules
- **Leave `legacy/` alone.** It is the 2017 code, kept for the record. The manifest must keep the development identity (CI checks it; see docs/STORE.md). Never commit Store identity files, certificates or packages.
- **The converter port** in `site/vraki-2017.js` mirrors the 2017 C# line by line, quirks included. Run `node tools/test-vraki-2017.js` after touching it.
- **The Vraki typeface** in `site/fonts/` is not MIT and must not be altered (see `site/fonts/LICENSE.md`). Copy it unaltered from HusbandOutWorld when it changes there.
- **Text shown in the Vraki typeface is English letters.** Mark it `translate="no"` so the translations never touch it; the same goes for the converter's sample text and outputs.
- Commits Claude contributes to are marked `Co-Authored-By: Claude` (see the README's Disclosure section).
- **Workflow actions** stay on their current major release (all run on Node 24 now). GitHub retires old Node versions and warns first, in the run's annotations; when it does, bump them in their own PR.

## Translations (Chinese, Japanese, Portuguese, Spanish, Arabic, Korean, Malay, Thai, German, Vietnamese, Italian, French, Hindi, Indonesian)
The website is also published in 14 languages (`/zh/`, `/ja/`, `/pt/`, `/es/`, `/ar/`, `/ko/`, `/ms/`, `/th/`, `/de/`, `/vi/`, `/it/`, `/fr/`, `/hi/`, `/id/`), the same way as HusbandOutWorld (HusbandOutWorld#50) and the Deovandski site (Deovandski#87). Translations are written ahead of time by Claude and committed in `content/i18n/<lang>/`; English (`site/index.html`) is the source. See the top of [tools/i18n.mjs](tools/i18n.mjs) for how it works. Tracking issue: #2.
- **Translate only what changed.** Every segment is stored under a hash of its English, so unchanged English is never translated again. Never re-translate segments that already have a translation, and never "improve" one unless the author asks.
- **The loop:** `npm ci`, then `node tools/i18n.mjs status`, then for each language `node tools/i18n.mjs todo --lang ja > work.json`. Fill in each item's `"t"`, then `node tools/i18n.mjs apply work.json`. `node tools/i18n.mjs build` writes `_site/` to check the pages (serve it with any static server). `node tools/i18n.mjs prune` drops translations whose English is gone; `node tools/i18n.mjs rehash` re-keys them after a find/replace that touched the English (like changing a link everywhere: replace it in `site/index.html` and `content/i18n/` together, then rehash).
- **When to translate:** not on every commit. English changes never wait for translations (untranslated segments show in English, marked `lang="en"`; CI reports the gap and never blocks). Translate in batches, after a change merges or when asked. Each batch is its own PR.
- **Keep the HTML exactly.** Translate the visible text (and alt/title/aria-label text) only. Every tag, link and attribute in `"en"` must appear unchanged in `"t"` (`apply` warns when they differ). Don't translate URLs, file names, code, `#HusbandOutWorld` or the app's name, *Vraki Language*.
- **Names are written by sound, never translated** (the author's rule): katakana in Japanese; the closest-sounding spelling in Chinese, Korean, Arabic, Thai and Hindi; unchanged in the Latin-script languages. Follow and extend `content/i18n/<lang>/glossary.json`. Spellings come from HusbandOutWorld's glossaries so the series reads the same everywhere; Thai and Hindi are first versions here (HusbandOutWorld has none yet). Real people (Deovandski) and *A Husband Out of This World* stay in Latin letters.
- **Variants:** Simplified Chinese, Brazilian Portuguese, Spain Spanish, Malaysian Malay, German (Germany, informal *du*), French (France), standard Indonesian, standard Hindi. Arabic is right to left (`dir="rtl"`); the 2017 app replica keeps its left-to-right layout.
- **Text the page's script writes** (toggle labels, the direction button's label, the alphabet tooltips) lives in `#ui-strings` in `site/index.html`, so it is translated with the page. Add new script strings there, not in JavaScript.
- **The banner** on translated pages comes from `content/i18n/<lang>/meta.json`: "AI-Translated to <language> from Original work by Deovandski".
- A language is offered to search engines (`hreflang`) and to the browser-language auto-select only once a page is 90% translated (`INDEX_COVERAGE` in tools/i18n.mjs).

## Files for AI tools (llms.txt, index.md, sitemap)
`node tools/i18n.mjs build` also writes `llms.txt`, `llms-full.txt`, `index.md` and `sitemap.xml` from the English page (`tools/llms.mjs`, issue #6). They are English only.
- When you add something interactive or decorative to the page, mark it `data-llms-skip`, with `data-llms-note="…"` saying what a visitor sees there. Sample output that isn't real words gets `data-llms-code`. Vraki-typeface text (`class="vraki"`) is written as `[Vraki typeface: …]` automatically.
- After a page change, run `node tools/test-llms.mjs` and read `_site/index.md`: it should read like the page, top to bottom, with nothing missing and no HTML left over.
- The `llms.txt` summary and link lists live in the `writeAiFiles()` call in `tools/i18n.mjs`. Keep them in step with the page.

## Build reusable components
If a piece of UI could be useful twice, in this repo or in another of Deovandski's repos, build it as a reusable component instead of one-off code in a page. Examples: a clock, a counter or score card, a board, a gallery, a map, a picker.
- **Where:** its own script and stylesheet in `site/` (for example `site/<name>.js` and `site/<name>.css`), set up from data attributes on its HTML. Any text its script shows lives in `#ui-strings` so it gets translated. List it in a "Reusable components" section of README.md.
- **Self-contained:** everything it needs comes in as options/props or data attributes, with no reliance on page-specific code. Its styles are scoped to its own class and themed with CSS custom properties (with fallbacks). It works when used several times on one page.
- **Accessible:** text for screen readers, keyboard-friendly, and it respects `prefers-reduced-motion`.
- **Documented:** a comment at the top with a usage example and its options, plus a row in the list of reusable components.
- **Look before you build:** check the reusable components here and in the other repos first. The same rule is in Deovandski/Deovandski (`src/components/reusable/`: `SplitFlap`, a split-flap board, and `LedClock`, an LED countdown), Deovandski-repo-template, HusbandOutWorld, vraki-windows and Vraki-West-March-Campaign-D-D. Copy and adapt an existing component instead of starting over, and note where it came from.
- **Extract when you touch it:** when you change one-off UI that fits this rule, pull it out into a reusable component in the same PR.

## Website settings
The gear (top right) opens Settings: Language, "Want a language added?" (links to #2), Text size, App (the Install app button, `site/install-app.js`) and Stats for nerds (the DEBUG button, which opens `debug/`). The × at the top right closes it (a `value="close"` button in the `method="dialog"` form), and so does Esc. Its code is `site/settings.js`, shared by every page. Choices are saved in `localStorage` under `vraki-site` (`lang`, `size`); PRIVACY.md and the site's Privacy section say so. Text size scales every font size through the `--scale` CSS variable (17px = 1), so new CSS font sizes should be written as `calc(Npx * var(--scale))`.

## Installable app (manifest, service worker)
The site is installable: `site/manifest.webmanifest`, `site/icons/`, and `site/sw.js` (registered from the inline script in `site/index.html`'s head, with the site's root as its scope so it covers every language). The worker fetches everything network first with `cache: 'no-cache'`, so a deploy shows at once; it never saves images or video. Change `VERSION` in `sw.js` whenever its rules change. Anything new the worker saves must be listed in PRIVACY.md and the site's Privacy section.

## Pages and shared blocks (one source)
The site has two pages: `site/index.html` and `site/debug/index.html`. Everything both pages show lives once, in `index.html`, marked `data-shared="…"`: the head script (`head`), the header (`header`), the Settings dialog (`settings`), the footer (`footer`) and the words shared scripts write (`strings`, `#ui-strings`). Another page writes an empty element with the same `data-shared`, and `tools/i18n.mjs` fills it from `index.html` at build time (`loadSource()`), keeping its exact HTML so its translations (stored by hash) match, then moves its relative links to the page's folder (`applyRebase()`). Styles are one file, `site/site.css`. So:
- **Change the header, Settings, footer or head script only in `index.html`;** never paste them into another page.
- **A new page** goes in its own folder (`site/<name>/index.html`) with `data-root="../"` and `data-page="<name>/"` on `<html>`, links to files as `../site.css` and to pages as `../#try`, and empty `data-shared` blocks. The build makes `/<lang>/<name>/` for every language; links to pages stay inside the language, links to files point back at the one copy.
- The converter's own script words are in `#converter-strings` (home page only).

## Stats for nerds (/debug/)
`site/debug/index.html` (#12, from Deovandski-repo-template#19): the header and footer stay, the page turns black (`.page-terminal` in `site/site.css`), and a terminal (`site/terminal-screen.js` + `.css`) types out, fast and one character at a time, green with amber section headings: **Code**, **Site**, **Windows app** (this repo's own: latest release, Store, the Vraki typeface, the converter port), **Runtime**, **Network**, **Performance** and **Languages**.
- **Build facts come from `stats.json`,** written by `tools/stats.mjs` after `node tools/i18n.mjs build` (`npm run build` runs both; so do CI and the Website workflow), so the browser never works them out. Commit, branch, pull request and repository are left out when the repo is private. The translation numbers come from `languageStats()` in `tools/i18n.mjs`, the same counting as `status`.
- **Browser facts** are read by `site/debug/debug.js`, which writes every line, fills in every `[data-v]` value and then starts the typing. It saves nothing and sends nothing (it fetches `stats.json`, plus three timed HEAD requests for Ping). A browser that doesn't share something shows "n/a".
- **To add a line:** add `['Label', 'key']` to its section in `SECTIONS` at the top of `debug.js`, then `set('key', value)` in the same file. For a build fact, add it to `tools/stats.mjs` first (it ends up in `stats.json`). Words the script writes go in `.debug-words` on the page.
- **Not indexed:** `<meta name="robots" content="noindex, nofollow">`; the build gives noindex pages no hreflang links, and `tools/llms.mjs` only reads the home page, so `/debug/` stays out of `sitemap.xml` and `llms.txt` (`tools/test-site.mjs` checks). The terminal is `translate="no"` (machine output); the page's title and description are translated.
- **Check it:** `npm run build`, `npm test`, then open `/debug/` and `/ar/debug/` at 1280px and 412px: no "..." left once it has typed, and no console errors.
