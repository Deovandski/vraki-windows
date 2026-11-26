# Vraki Language for Windows

The 2017 UWP app (`legacy/`, never edited beyond the manifest identity), its docs, and the GitHub Pages website (`site/`). See README.md for the layout.

## Rules
- **Leave `legacy/` alone.** It is the 2017 code, kept for the record. The manifest must keep the development identity (CI checks it; see docs/STORE.md). Never commit Store identity files, certificates or packages.
- **The converter port** in `site/vraki-2017.js` mirrors the 2017 C# line by line, quirks included. Run `node tools/test-vraki-2017.js` after touching it.
- **The Vraki typeface** in `site/fonts/` is not MIT and must not be altered (see `site/fonts/LICENSE.md`). Copy it unaltered from HusbandOutWorld when it changes there.
- **Text shown in the Vraki typeface is English letters.** Mark it `translate="no"` so the translations never touch it; the same goes for the converter's sample text and outputs.
- Commits Claude contributes to are marked `Co-Authored-By: Claude` (see the README's Disclosure section).

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
The gear (top right) opens Settings: Language, "Want a language added?" (links to #2), Text size and App (the Install app button, `site/install-app.js`). Choices are saved in `localStorage` under `vraki-site` (`lang`, `size`); PRIVACY.md and the site's Privacy section say so. Text size scales every font size through the `--scale` CSS variable (17px = 1), so new CSS font sizes should be written as `calc(Npx * var(--scale))`.

## Installable app (manifest, service worker)
The site is installable: `site/manifest.webmanifest`, `site/icons/`, and `site/sw.js` (registered from the inline script in `site/index.html`'s head, with the site's root as its scope so it covers every language). The worker fetches everything network first with `cache: 'no-cache'`, so a deploy shows at once; it never saves images or video. Change `VERSION` in `sw.js` whenever its rules change. Anything new the worker saves must be listed in PRIVACY.md and the site's Privacy section.
