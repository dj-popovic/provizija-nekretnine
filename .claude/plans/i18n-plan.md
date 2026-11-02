# i18n plan — Serbian / English / Russian (agreed with Relja 2026-10-22)

Work one phase at a time. After each phase: verify, give a short summary, and commit only when Relja says so (Serbian ASCII commit messages + Co-Authored-By line).

## Decisions (confirmed)

| Topic | Decision |
|---|---|
| Languages | `sr` (default, Latin script), `en`, `ru` |
| URLs | **Same URLs** for every language. The choice is saved in localStorage. `?lang=en` / `?lang=ru` in a link overrides it (for sharing). No `/en/` paths, no hreflang: the site is used inside Serbia only. |
| Auto-detect | **None** (Relja, 2026-11-02): the site always opens in Serbian (~90% of visitors are Serbs). Only an explicit choice (saved) or `?lang=` changes it. |
| Switcher | Header, **right of "Kontaktirajte nas"**. Closed state: a small flag + `SRB`. Hover (desktop) or tap (touch) opens a dropdown with the 🇬🇧 `ENG` and 🇷🇺 `RUS` flags (the current one is marked). Also in the mobile menu. Flags are **SVG files** in `client/images/flags/`, NOT emoji (Windows shows "RS" letters instead of emoji flags). Keyboard accessible. |
| Translated | All UI text, static page content, field labels, enum values (types, heating, furnishing, features, equipment, construction, condition…), meta title/description, **property titles** and **property descriptions** |
| NOT translated | City names, district (hood) names, agent names |
| Property titles (EN/RU) | **Generated** on the frontend from the data: type + rooms + area + location, e.g. "Four-room apartment, 101 m² · Novi Sad, Telep". Serbian keeps the agency's original title. (Possible later: machine-translate the original title instead, once phase 7 exists.) |
| Property descriptions | **Machine translation** (phase 7). Until it exists, or when a translation is missing, EN/RU show the Serbian text with a small note ("Description in Serbian"). |
| Russian review | Nobody will review it: Claude's translation is final. Write it carefully, in a natural real-estate tone. |
| Emails to the agency | Stay in Serbian, plus a "Jezik posetioca: engleski/ruski" row so the agent replies in the right language. |

## Facts found in the code (2026-10-22)

- Static text: ~1,600 words in 8 HTML pages. Biggest: index ~380, o-nama ~300, oglasite ~280, agenti ~240, kontakt ~160, nekretnine ~120, the two detail pages ~50 each.
- JS strings: ~125, mostly in `renderers.js` (31), `page-properties.js` (26), `page-property.js` (26), `forms.js` (17), `dropdown.js` (9).
- Enum values already arrive as stable keys and are rendered through `PV.maps` in `client/js/renderers.js`. That is the seed of the dictionaries.
- **Font:** DM Sans (the body font) has **no Cyrillic**. Playfair Display does. Fix: add a Cyrillic-capable sans that is only used for Cyrillic glyphs (Google Fonts `cyrillic` subset, so the font stack falls back per glyph; e.g. Manrope / Inter / Golos Text, whichever sits closest to DM Sans). Check it visually.
- CSP: no inline `<script>` and no `onclick=`. Dictionaries must be external JS files (`client/i18n/*.js`). fonts.googleapis / gstatic are already allowed. Any new CDN must go into `CSP_DIRECTIVES` in `server/src/app/app.ts`.
- The backend sends English error messages ("Property not found.") and the UI sometimes shows them. Translate by `error.code` on the frontend instead.
- Legacy Serbian fields in the API that are still to be removed: list `propertyType` (Serbian label → switch to key), `highlights`, detail flat `heating` / `furnished` / `floor` / `elevator` / `registrationStatus`. Only `page-property.js:125` still reads `p.propertyType` as a fallback.
- There are no agent bios in the data (the enrichment file doesn't exist), so there is nothing to translate there.

## Architecture

- `client/js/i18n.js` loads **synchronously in `<head>`** (external file):
  - decides the language (`?lang` → localStorage → `sr`), sets `<html lang>`;
  - adds an `i18n-pending` class that hides the body for a moment, so no Serbian text flashes;
  - exposes `PV.i18n.t(key, vars)`, `PV.i18n.plural(n, key)` (`Intl.PluralRules`: ru has one/few/many like sr), `PV.i18n.lang`, number/price formatting (`Intl.NumberFormat`: sr "270.000 €", en "€270,000", ru "270 000 €"), and `PV.i18n.apply(root)`, which fills `data-i18n` / `data-i18n-attr` (placeholder, aria-label, title, alt).
- Dictionaries: `client/i18n/sr.js`, `en.js`, `ru.js`, each `PV.i18n.add('en', { ... })`. Use the same key tree in all three; `sr` is the reference. Move `PV.maps.*.toUi` labels into them.
- Static HTML: elements get `data-i18n="section.key"`. The Serbian text stays in the HTML as-is (the fallback for no-JS / crawlers).
- JS-built UI calls `t()`. Changing the language at runtime: simplest is a page reload after saving the choice (fine for this site); re-render only if cheap.
- Units: m² everywhere; ares → en "ares", ru "сот." (1 ar = 1 сотка). Rooms: garsonjera → en "Studio", ru "Студия".
- Generated EN/RU title: `{roomsWord} {type}, {area} · {location}`, with pieces dropped when missing (plot: "Plot, 21.06 ares · Beočin, Okolina").

## Phase 1 — as built (2026-11-02)

- `client/js/i18n.js` + `client/i18n/{sr,en,ru}.js`, all four as sync scripts right after the viewport meta on every page (before the stylesheets).
- No browser detection (Relja changed this on 2026-11-02): `?lang=` → saved choice → sr. Only an explicit choice or `?lang=` is saved.
- Static Serbian text lives only in the HTML: `apply()` writes en/ru texts and leaves missing keys Serbian. `sr.js` holds only what JS needs via `t()` (and is the `t()` fallback). So `data-i18n` keys need en + ru entries; sr entries are needed only for JS strings.
- Also `data-i18n-html` (innerHTML, for our own markup like `<strong>`) and `data-i18n-attr="attr:key; attr2:key2"`.
- Anti-flash: `html.i18n-pending body { visibility: hidden }`, removed on DOMContentLoaded (3 s safety timeout).
- Switcher markup is static in each page (`li.lang-switch[data-lang-switch]` after the btn-contact item); `i18n.js` sets the flag/code/aria-current. Desktop: hover (mouse) / click / ArrowDown, the dropdown shows only the other two. < 992px: all three in a row inside the burger menu.
- Flags: `images/flags/rs.png` (coat of arms; flag-icons rs.svg is 184 KB, so it's rasterized to 72×54 px, 2.7 KB), `gb.svg`, `ru.svg` (flag-icons 7.2.3, MIT).
- Font: `--font-body` CSS variable (all 15 `'DM Sans'` uses); `html[lang="ru"]` switches the whole body font to the Cyrillic one (Relja: uniform look). Google Fonts downloads it only when used. Relja picked **Inter** from a test page (vs Manrope, Golos Text, Onest).
- Phase 1 also translated the 5 header nav links + burger aria-label (smoke test for the flash check). The rest of header/footer = phase 2.
- Headless test: scratchpad `domtest/i18n-phase1.js` (70 checks).

## Phase 2 — as built (2026-11-02)

- Footer on all 8 pages: 13 `data-i18n` keys under `footer.*`. The "about" text has 3 variants: `textLong` (index), `textShort` (6 pages), `textSell` (oglasite). The address, phone, e-mail and "ProVizija" brand stay as they are.
- `scroll-top.js` aria-label → `t('common.backToTop')`.
- Headless test: scratchpad `domtest/i18n-phase2.js <client> [scope]`. It checks that every HTML key exists in en + ru, that no Serbian is left in the scope for en/ru (č ć š ž đ + common words, with an allowlist for proper nouns), that sr is identical to the HTML, and that each page has the same number of texts per language. Reuse it in phase 4 with the scope `body`.

## Phase 3 — split per page, phases 3 + 4 merged (Relja OK'd 2026-11-02)

Each step translates a page's JS strings AND its static HTML: 3a shared (renderers/api), 3b nekretnine, 3c nekretnina-detalj, 3d index, 3e agenti + agent-detalj, 3f kontakt + oglasite (forms), 3g o-nama.

### 3a — as built (2026-11-02)
- Backend: list `propertyType` is now the KEY (was the Serbian label; nothing on the frontend read it). Contract note updated. Detail flat `propertyType` is still legacy (phase 5).
- `i18n.js` added `labels(prefix)` (enum group → {key: text}), `ordinal(n)`, `has(key)`, and a `fraction` plural form (sr "2,5 sobe").
- `renderers.js`: every `PV.maps.*.toUi` = `i18n.labels('enum.*')`, so pages that use maps get translated labels automatically. Formatters use dictionary units/plurals + `Intl` numbers. `propertyTitle(item, withLocation)`: sr = the original title; en/ru = generated ("Four-room apartment, 180 m²"; unknown type `other` → "Property, 33 m²"). Cards use it without the location (it's shown right above).
- `PV.render.plural(n, one, few, many)` (Serbian words) is still exported for page scripts until their step.
- `api.js`: `ApiError.message` comes from `errors.<CODE>` (generic fallback); the server's English text is kept as `serverMessage`. This fixes English error texts that were shown on the Serbian site.
- Russian floors: Serbian numbering kept ("3-й этаж" = 3. sprat); "Prizemlje" = "Партер".
- Price stays "amount unit" in every language (en "650,000 €").
- sr output verified identical to the old renderer on all 44 live listings (except the fixed decimal: "55,5 m²", was "55.5 m²"). Test: scratchpad `domtest/i18n-3a.js <client> <old renderers.js> <api>`.

### 3b — as built (2026-11-02)
- nekretnine.html: every static text has `data-i18n` / `data-i18n-html` / `data-i18n-attr` (keys `list.*`, `common.home`, `common.breadcrumb`). Texts next to an icon are wrapped in a `<span>` so the icon survives.
- page-properties.js + dropdown.js: every string goes through `t()` (`list.*`, `dd.*`). Room hints are `list.roomHint.r2_5`; the "N aktivnih" badge is now a proper plural.
- Backend: heating `EG` / `Etažno` → `individual_central`, `Toplotne pumpe` / `Toplotna pumpa` → `heat_pump` (both were in the feed as raw Serbian). Docs updated.
- Test: scratchpad `domtest/i18n-page.js <client> <api> <pages…>` loads a page with real API data in sr/en/ru, opens every dropdown + "Više filtera", reports Serbian left in en/ru (proper nouns from the API allowed), and checks that every sr key exists in en + ru. Reuse it for every next page.

## Phases (verify after each one)

1. **Infrastructure:** `i18n.js`, the 3 dictionary skeletons, the anti-flash, the flag switcher in the header (all 8 pages + mobile menu), the Cyrillic font. Verify: switching works and the choice persists, `?lang` works, no flash, RU font OK.
2. **Header + footer** on all 8 pages (nav, footer links, CTA buttons, copyright).
3. **JS-built UI:** cards, price/"Cena na upit", spec panel, feature chips, related properties, gallery labels, filters page (labels, dropdowns, chips, badge, sort, empty/error states), `dropdown.js` texts, home hero search, agents pages, forms (labels, placeholders, validation, alerts), error states by `error.code`, plurals, number formats, generated EN/RU titles.
4. **Static page content:** index, o-nama, kontakt, oglasite, agenti, nekretnine, detail pages. Claude writes EN + RU.
5. **Backend cleanup:** list `propertyType` → key (update the frontend + `api-contract.md`); remove the legacy Serbian fields from list/detail once nothing reads them; forms accept an optional `lang` and the email shows "Jezik posetioca"; tests.
6. **Meta:** `<title>` and meta description per page per language, `<html lang>`, og tags if present.
7. **Description machine translation** (new backend module):
   - after each sync, translate only new/changed descriptions (keyed by property id + text hash) into en/ru;
   - store them in a cache file next to `properties-cache.json`;
   - never block or fail the sync; on failure keep the Serbian text;
   - the detail API exposes the translations, the frontend picks by language and falls back to Serbian + the note.
   - Provider: DeepL or the Claude API. **Needs a paid API key from the client: ask Relja first.** Keep proper nouns (cities, districts, agent names) untranslated. If the Claude API is used, read the `claude-api` skill before writing code. Add the key to config/.env and never log it (like `XML_FEED_URL`).
   - Discussed with Relja on 2026-10-22: Claude is recommended (instruction-following for proper nouns, all-caps titles, real-estate tone). **The model is the client's choice** (Opus 5.5 by default; Sonnet 5.5 / Haiku 5.5 are cheaper). Before choosing, run a side-by-side test on 3–4 real descriptions with each model so Relja can compare the Russian. Estimated cost for ~40 new listings/month: Opus ≈ $1.80, Sonnet ≈ $0.90, Haiku ≈ $0.05. The one-time backfill of ~300 listings is ≈ $13 / $7 / $0.35. The Batch API halves this (async is fine). Also translate the title with the same call.
   - Setup for the client: console.anthropic.com → billing with **prepaid credit** + a monthly spend limit → create an API key → `ANTHROPIC_API_KEY` in `server/.env` and in Render → Environment.
   - Show the number of pending/failed translations in `/api/status`, so the job is fully hands-off yet still checkable.
8. **QA:** a headless jsdom test per language that scans every page for leftover Serbian (č ć š ž đ + a list of common words) in EN/RU, checks the switcher, `?lang`, the forms and the filters; plus Relja's browser check on desktop + phone.

## Pitfalls to remember

- Windows / PowerShell 5.1: write multi-line files with the Write tool, not bash heredocs (they hang here). PowerShell strips `"` from native-exe arguments.
- Client files are CRLF; git normalizes, so whole-file rewrites are fine.
- Restart the server after backend changes (`npx tsx src/server.ts` in `server/`, port 3000); frontend changes only need Ctrl+F5.
- The jsdom headless test harness lives in the session scratchpad (`domtest/`); recreate it in the new session if needed (`npm i jsdom@26.1.0` in a scratch folder, stub `fetch` / `matchMedia` / `IntersectionObserver`).
