# i18n — Serbian / English / Russian (handoff, updated 2026-11-02)

Read this whole file before any i18n work. Sections: 0 status · 1 decisions · 2 how it works · 3 rules for every step · 4 verification tools · 5 what's left (detailed) · 6 pitfalls · 7 open questions.

## 0. Status at a glance

All commits are **local on `main`, not pushed** (Relja pushes when he decides). Last commit: `9b23a12`.

| Step | What | Status | Commit |
|---|---|---|---|
| 1 | Infrastructure: `i18n.js`, dictionaries, anti-flash, flag switcher, Cyrillic font | done | c318d26 |
| 2 | Header + footer on all 8 pages, back-to-top | done | 1d614f5 |
| 3a | Shared: cards, prices, units, plurals, generated titles, API errors by code | done | 6ec323f, a93bdbf |
| 3b | Listing page `nekretnine.html` (filters, dropdowns, sort, load more) | done | cd807a8 |
| 3c | Property detail page (specs, gallery, features, share, inquiry form fields, related, 404) | done | 95d0ae8 |
| 3d | Home page — functional part (hero search, "view all", stats number format) | done | 9b23a12 |
| 3e | Agents list + agent profile — functional part | **NEXT** | |
| 3f | Forms: kontakt, oglasite, inquiry forms (labels, options, validation, alerts) | todo | |
| 5 | Backend cleanup + `lang` in forms + "Jezik posetioca" in e-mails | todo | |
| 6 | Meta: `<title>` per page per language (+ descriptions with the static content) | todo | |
| S | **Static marketing copy** on all pages | **waits for the client's final texts** | |
| 7 | Machine translation of property descriptions + titles (Claude API) | **waits for the client's API key + model choice** | |
| 8 | Final QA + Relja's browser check (desktop + phone) | todo, last | |

## 1. Decisions (confirmed by Relja)

| Topic | Decision |
|---|---|
| Languages | `sr` (default, Latin script), `en`, `ru` |
| URLs | Same URLs for every language. Choice saved in localStorage (`pv-lang`). `?lang=en` / `?lang=ru` overrides and is saved too (shareable links). No `/en/` paths, no hreflang. |
| Auto-detect | **None.** The site always opens in Serbian (~90% of visitors are Serbs); only an explicit choice or `?lang=` changes it. |
| Switcher | Right of "Kontaktirajte nas": flag + `SRB`; hover/click opens a dark glass dropdown with the other two (`ENG`, `RUS`). Mobile menu: all three in a row. Flags are files in `client/images/flags/` (Serbian = PNG with coat of arms), never emoji. Changing language = save + page reload. |
| Font | DM Sans has no Cyrillic → on `ru` the whole body font switches to **Inter** (`--font-body`). Playfair Display (headings) has Cyrillic. |
| NOT translated | City names, district names, agent names, the agency address. |
| Property titles EN/RU | Final goal (phase 7): machine-translate the agency's own title, keep every place name exactly as written ("RUMA, VOGANJ"), translate the rest, **ALL CAPS** like RELPER. Until then (and as the fallback): generated from data, places first, "Okolina" left out, ALL CAPS: `NOVI SAD, TELEP, THREE-ROOM APARTMENT, 90 M²`, `BAČ, HOUSE, 277 M²`. Serbian keeps the original title. |
| Property descriptions | Phase 7 machine translation. Until then EN/RU show the Serbian text (`lang="sr"`) with a small note. |
| Russian | Nobody reviews it: Claude's translation is final. Natural real-estate tone. Russian floor numbers keep the Serbian numbering ("3-й этаж" = 3. sprat), "Prizemlje" = "Партер". Ares = "сот.". |
| E-mails to the agency | Stay Serbian + a "Jezik posetioca" row (phase 5). Form option values sent to the backend stay Serbian. |
| Marketing copy | ~50% of the static text will change; **translate it only when the client's final texts arrive**, in one pass. Until then the functional UI only. |

## 2. How it works (as built)

**Loading (every page, in `<head>` right after the viewport meta, before the CSS):** `js/i18n.js`, then `i18n/sr.js`, `i18n/en.js`, `i18n/ru.js` — all synchronous. CSP forbids inline scripts, so everything is an external file.

**`client/js/i18n.js` → `PV.i18n`:**
- `lang`, `locale` (sr-Latn-RS / en-GB / ru-RU), `langs`, `setLang(code)`.
- `t(key, vars)` — current language → Serbian fallback → the key itself (a visible bug). `{name}` placeholders.
- `plural(n, key, vars)` — entry `{ one, few, many, other, fraction? }`, `Intl.PluralRules`; `{n}` = formatted number; `fraction` wins for decimals (sr "2,5 sobe").
- `ordinal(n)` (sr "3.", en "3rd", ru "3-й"), `number(n, opts)` (Intl), `labels('enum.heating')` → `{key: text}`, `has(key)`.
- `apply(root)` fills `data-i18n` (textContent), `data-i18n-html` (innerHTML, only our own dictionary markup like `<br>`), `data-i18n-attr="placeholder:key; aria-label:key2"`. **For `sr` it writes nothing** — the Serbian text lives in the HTML.
- Anti-flash: for en/ru `html.i18n-pending` hides the body until `apply()` ran on DOMContentLoaded (3 s safety timeout).
- Also builds the language switcher (`li.lang-switch[data-lang-switch]` — static markup in each page).

**Dictionaries `client/i18n/{sr,en,ru}.js`** — `PV.i18n.add('en', {...})`, same key tree:
- `sr.js` holds only what **JS** needs (+ `enum.*`, the reference list of keys). Static HTML keys need entries in `en.js` + `ru.js` only (Serbian = the HTML).
- Top-level groups so far: `lang`, `common`, `nav`, `footer`, `enum` (transactionType, propertyType, furnished, heating, registration, floor, construction, condition, equipment, feature), `units`, `ordinal`, `price`, `title`, `card`, `media`, `agent`, `pagination`, `state`, `home`, `dd` (dropdown.js), `list` (listing page), `detail`, `form`, `errors` (by API error code).

**JS:**
- `renderers.js`: every `PV.maps.*.toUi` = `i18n.labels('enum.*')` → pages using the maps are translated automatically. Formatters (`formatArea`, `formatLandArea`, `formatRooms`, `formatBathrooms`, `formatFloor`, `priceParts`, `formatPrice`, `formatNumber`) use the dictionaries. `propertyTitle(item)` (see decisions). `errorState(err)` takes the caught error: ApiError → its translated message, anything else → generic text. `PV.render.plural(n, one, few, many)` (Serbian words) still exists for old callers — don't use it in new code.
- `api.js`: `ApiError.message` = `errors.<CODE>` from the dictionary (generic fallback); the server's English text is in `serverMessage`.
- Pages translated: `page-properties.js`, `dropdown.js`, `page-property.js`, `page-home.js`, `scroll-top.js`, `script.js` (stats counter locale only).

**Backend changes made for i18n:** list `propertyType` = key (was the Serbian label); heating `EG`/`Etažno` → `individual_central`, `Toplotne pumpe`/`Toplotna pumpa` → `heat_pump`. Contract + data-model docs updated, 294 tests green.

**CSS:** `--font-body`, `html[lang="ru"]` → Inter, `html.i18n-pending body {visibility:hidden}`, `.lang-switch*`, `.lang-option`, `.detail-description-note`.

## 3. Rules for every step (Relja's way of working)

1. One step at a time. First a short plan + questions (with a recommendation), wait for OK, then implement, verify, summarize. Relja writes Serbian — answer in Serbian.
2. **Serbian output must not change** (except agreed fixes). Prove it with the DUMP diff (section 4).
3. Static HTML: add `data-i18n…` attributes, keep the Serbian text in the HTML. A text next to an icon goes into a `<span data-i18n>` so the icon survives. Duplicate markup on several pages must be patched identically on all pages.
4. JS strings: `var t = PV.i18n.t;` and `t('group.key')`; plurals via `PV.i18n.plural`. Every key used in JS must exist in `sr.js` **and** `en.js` + `ru.js`. Attribute values built from dictionary text go through `esc()`.
5. Keep keys grouped per page (`agents.*`, `agent.*` already exists for card aria labels, `contact.*`, `advertise.*`, `form.*` for shared fields).
6. Only functional text now; marketing copy waits (section 5, "S").
7. After each step: `node tools/i18n-check.js` (must say "All good." — run `--update` after translating new HTML keys), the page test, the sr DUMP diff, then update this file (status table + notes) and the memory handoff.
8. Commits: local, logical, Serbian ASCII message + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, author `git -c user.name="Relja Opacic" -c user.email="opacicrelja@gmail.com" commit -F <file>`. Don't push unless Relja asks.
9. Big UI/visual changes are Đorđe's area — ask first. Small i18n-related CSS is OK.

## 4. Verification tools (in the repo)

- **`node tools/i18n-check.js [--update]`** (no dependencies): every HTML key exists in en/ru; every literal `t('key')` in `client/js` exists in sr; every sr key exists in en/ru; the HTML text = sr.js where both exist; **stale translations** — `tools/i18n-sr-snapshot.json` remembers the Serbian text of each HTML key at translation time and reports any later change. After translating new/changed keys run with `--update`.
- **`tools/i18n-page-test.js`** (jsdom, real API data): loads pages in sr/en/ru, opens all dropdowns, lists Serbian left in en/ru (allows API proper nouns + `lang="sr"`), reports JS errors, checks dictionaries. Setup + usage in the file header (jsdom 26.1.0 installed in a scratch folder, `NODE_PATH`). Stubs: fetch → real backend, Bootstrap, matchMedia, IntersectionObserver, canvas.
- **sr unchanged proof:** `git archive HEAD client | tar -x -C <scratch>/head`, run the page test with `DUMP_DIR=<scratch>/old` on `<scratch>/head/client` and `DUMP_DIR=<scratch>/new` on `client`, `diff` the JSON files.
- **Backend:** `cd server && npx vitest run && npx tsc --noEmit && npx eslint src`.
- **Running a test backend:** in `server/`: `$env:PORT='3001'; npx tsx src/server.ts` (background). Relja's own server is usually on 3000 and may run OLD backend code — restart it after backend changes or use 3001. Wait until `/api/status` answers.
- Useful IDs (live feed 2026-11-02): `novi-sad-grbavica-lux-cetvorosoban-stan-180m2-dva-garazna-mesta-606` (apartment), `novi-sad-klisa-lokacija-gradjevinska-parcela-356m2-116` (plot), `bac-ugostiteljski-0bjekat-salas-359-m2-88` (type `other`), `ruma-voganj-porodicna-kuca-ranc-196-m2-91` (house, Okolina). Agents: `nada-atanaskovic`, `marija-ranisavljevic`. Feed IDs change over time — fetch `/api/properties?pageSize=100` for current ones.

## 5. What's left — step by step

### 3e — Agents (`agenti.html`, `agent-detalj.html`, `page-agents.js`, `page-agent.js`) — functional only
- `page-agent.js`: hero tag "Profil agenta", breadcrumb (`common.home`, `nav.agents`, `common.breadcrumb`), "Pošaljite upit – {name}", form aria, field placeholders/aria (reuse `form.*`; "Kratka poruka..." needs a new `form.messageShort`), "Pošaljite Upit", "Portfolio", "Nekretnine – {name}", "Aktivni oglasi", contact buttons (call/email/WhatsApp… check the code), stats labels if any, 404 texts, `document.title`. `agent.stats.label` comes from data (check what it is).
- `page-agents.js`: empty/error states.
- Static HTML: only functional bits (breadcrumb, aria labels of lists). Section titles/intro/benefits = marketing → later.
- Agent names never translated.

### 3f — Forms (`forms.js`, `kontakt.html`, `oglasite-nekretninu.html`, inquiry forms on detail + agent pages)
- **Trap:** `forms.js` maps the selected `<option>` **text** to API values (`transactionTypeMap`, `propertyTypeMap`, `priceTypeMap`, `parseRooms('Garsonjera')`), and e-mails contain option texts. Before translating options: give every `<option>` an explicit `value="<current Serbian text>"` (or a key) and read `.value` in `forms.js`, so the submitted data and the e-mails stay Serbian while only the label is translated. Check every select: og-namena, og-tip, og-grad, og-opstina, og-sobe, og-sprat, og-grejanje, og-pregovaranje, k-tema.
- City/district options in og-grad / og-opstina are proper nouns — don't translate (only "Odaberite...").
- Labels, placeholders, required-field messages, checkboxes (features: lift, parking…), submit buttons, success screens ("Hvala vam…", "Nazad na početnu"), error alerts (`showAlert`), 429 message (use `errors.RATE_LIMIT_EXCEEDED`), validation messages.
- Backend field errors (`details[].message`) are English → show a translated message per field (e.g. `form.errors.<field>` or a generic "invalid field" text), never the English one.
- The long descriptive texts on Oglasite/Kontakt (benefits, intro) = marketing → later.

### 5 — Backend cleanup
- Forms accept an optional `lang` (`sr|en|ru`); the frontend sends `PV.i18n.lang`; the agency e-mail gets a row "Jezik posetioca: srpski / engleski / ruski". Validate strictly, tests, update `docs/api-contract.md`.
- Remove legacy Serbian fields once nothing reads them: list `highlights`; detail flat `propertyType` (label), `heating` (joined string), `furnished` label, raw `floor`, `elevator`, `registrationStatus`. `page-property.js` still falls back to `p.propertyType` in the spec "Tip" row — switch it to the key first. Update contract + tests; bump nothing unless the internal model changes (`DATASET_SCHEMA_VERSION` only for Property/Agent model changes).

### 6 — Meta
- `<title>` per page per language (dictionary keys, set by `apply` — add support for `<title data-i18n>` or set `document.title` in i18n.js). `<html lang>` is already set. Meta descriptions / og tags: with the static content (they're marketing text).

### S — Static marketing copy (when the client's texts arrive)
- Pages: index (hero title/subtitle, section tags/titles/descriptions, stats labels, "Kako funkcionišemo" steps, team intro, FAQ ×6, CTA), o-nama (almost everything), agenti (intro, benefits), kontakt (intro, info blocks), oglasite (intro, benefits), nekretnine hero (already translated — re-check), footer about texts (already translated — re-check).
- Flow: Relja gives the final Serbian texts → put them into the HTML → `data-i18n` keys → EN + RU → `node tools/i18n-check.js --update`.
- Question to raise then: the FAQ says "pružamo usluge na engleskom jeziku" — now that the site is also Russian, maybe "na engleskom i ruskom".

### 7 — Machine translation (needs the client's API key + model choice; ask Relja first)
- New backend module: after each sync, translate only new/changed descriptions AND titles (keyed by property id + text hash) into en/ru; cache file next to `properties-cache.json`; never block or fail the sync; on failure keep Serbian; `/api/status` shows pending/failed counts.
- Prompt rules: keep place names / streets / agent names exactly as written; titles in ALL CAPS ("RUMA, VOGANJ, FAMILY HOUSE – RANCH, 196 M²"); natural real-estate tone.
- Detail API exposes `translations`; the frontend prefers the translated title/description, falls back to the generated title / Serbian description + note.
- Provider: Claude API (recommended). Model is the client's choice: Opus 5.5 (default) / Sonnet 5.5 / Haiku 5.5. Before choosing: side-by-side test on 3–4 real descriptions. Cost estimate (~40 new listings/month): Opus ≈ $1.80, Sonnet ≈ $0.90, Haiku ≈ $0.05; one-time backfill of ~300 ≈ $13 / $7 / $0.35; Batch API halves it. **Read the `claude-api` skill before writing code.** Key in `server/.env` + Render env as `ANTHROPIC_API_KEY`, never logged.
- Client setup: console.anthropic.com → prepaid credit + monthly limit → API key.

### 8 — QA
- Page test on all 8 pages × 3 languages (after S, everything must be clean), `i18n-check`, forms submitted in en/ru (e-mail stays Serbian + language row), switcher + `?lang`, mobile menu. Relja checks desktop + phone; especially Russian line lengths (buttons, nav at 992–1200 px, footer columns).

## 6. Pitfalls (this machine: Windows, PowerShell 5.1 + Git Bash)

- **Bash heredocs and `node -e` with quotes/backslashes mangle `\` (regexes!) and can hang.** Write scripts with the Write tool into the session scratchpad and run them. For exact multi-line replacements use a small "patch" script with `[from, to]` pairs that must each match exactly once (that's how steps 3b–3d were done).
- The Edit tool can fail on lines containing `²` in client JS — use a patch script for those.
- Client files are CRLF in git (autocrlf); LF in the working copy is fine, git normalizes. "LF will be replaced by CRLF" warnings are harmless.
- `sed -i` on Git Bash may convert CRLF→LF — harmless, but prefer the patch scripts.
- A command waiting for a permission prompt looks "stuck" to Relja — keep commands small and plain.
- Fastify serves `client/` statically: new files under `client/` need no server change; any new external resource needs a CSP entry in `server/src/app/app.ts`.
- jsdom has no Bootstrap/canvas/layout: stub them (the page test does); `offsetParent` is always null there.
- Russian text is longer — check buttons and the nav in a real browser.

## 7. Open questions

- "EG" heating was assumed = etažno grejanje (Relja didn't object; confirm with the client if unsure).
- New RELPER types seen in the feed ("Lokal", "Ugostiteljski objekat") are `other` for now → after-i18n backlog (with Garaža, Hala, Zemljište group, rent types, "Cena po m²").
