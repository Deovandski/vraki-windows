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
- **The loop:** `npm ci`, then `node tools/i18n.mjs status`, then for each language `node tools/i18n.mjs todo --lang ja > work.json`. Fill in each item's `"t"`, then `node tools/i18n.mjs apply work.json`. `node tools/i18n.mjs build` writes `_site/` to check the pages (serve it with any static server). `node tools/i18n.mjs prune` drops translations whose English is gone.
- **When to translate:** not on every commit. English changes never wait for translations (untranslated segments show in English, marked `lang="en"`; CI reports the gap and never blocks). Translate in batches, after a change merges or when asked. Each batch is its own PR.
- **Keep the HTML exactly.** Translate the visible text (and alt/title/aria-label text) only. Every tag, link and attribute in `"en"` must appear unchanged in `"t"` (`apply` warns when they differ). Don't translate URLs, file names, code, `#HusbandOutWorld` or the app's name, *Vraki Language*.
- **Names are written by sound, never translated** (the author's rule): katakana in Japanese; the closest-sounding spelling in Chinese, Korean, Arabic, Thai and Hindi; unchanged in the Latin-script languages. Follow and extend `content/i18n/<lang>/glossary.json`. Spellings come from HusbandOutWorld's glossaries so the series reads the same everywhere; Thai and Hindi are first versions here (HusbandOutWorld has none yet). Real people (Deovandski) and *A Husband Out of This World* stay in Latin letters.
- **Variants:** Simplified Chinese, Brazilian Portuguese, Spain Spanish, Malaysian Malay, German (Germany, informal *du*), French (France), standard Indonesian, standard Hindi. Arabic is right to left (`dir="rtl"`); the 2017 app replica keeps its left-to-right layout.
- **Text the page's script writes** (toggle labels, the direction button's label, the alphabet tooltips) lives in `#ui-strings` in `site/index.html`, so it is translated with the page. Add new script strings there, not in JavaScript.
- **The banner** on translated pages comes from `content/i18n/<lang>/meta.json`: "AI-Translated to <language> from Original work by Deovandski".
- A language is offered to search engines (`hreflang`) and to the browser-language auto-select only once a page is 90% translated (`INDEX_COVERAGE` in tools/i18n.mjs).

## Website settings
The gear (top right) opens Settings: Language, "Want a language added?" (links to #2) and Text size. Choices are saved in `localStorage` under `vraki-site` (`lang`, `size`); PRIVACY.md and the site's Privacy section say so. Text size scales every font size through the `--scale` CSS variable (17px = 1), so new CSS font sizes should be written as `calc(Npx * var(--scale))`.
