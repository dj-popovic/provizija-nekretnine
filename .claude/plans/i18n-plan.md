# i18n — Serbian / English / Russian (handoff, updated 2026-11-02)

Read this whole file before any i18n work. Sections: 0 status · 1 decisions · 2 how it works · 3 rules for every step · 4 verification tools · 5 what's left (detailed) · 6 pitfalls · 7 open questions.

## 0. Status at a glance

All commits are **local on `main`, not pushed** (Relja pushes when he decides). Last commit: "i18n 6: …" (after `c072518` = 5, `b3d535c` = 3g, `ad8107c` = required inquiry message, `0ff5330` = 3f, `3d04dd9` = 3e).

| Step | What | Status | Commit |
|---|---|---|---|
| 1 | Infrastructure: `i18n.js`, dictionaries, anti-flash, flag switcher, Cyrillic font | done | c318d26 |
| 2 | Header + footer on all 8 pages, back-to-top | done | 1d614f5 |
| 3a | Shared: cards, prices, units, plurals, generated titles, API errors by code | done | 6ec323f, a93bdbf |
| 3b | Listing page `nekretnine.html` (filters, dropdowns, sort, load more) | done | cd807a8 |
| 3c | Property detail page (specs, gallery, features, share, inquiry form fields, related, 404) | done | 95d0ae8 |
| 3d | Home page — functional part (hero search, "view all", stats number format) | done | 9b23a12 |
| 3e | Agents list + agent profile — functional part (+ agent phones normalized to `+381…` in the backend) | done | see git log |
| 3f | Forms: kontakt, oglasite, inquiry forms + `lang` / "Jezik posetioca" in e-mails (moved here from 5) + form bug fixes | done | see git log |
| 3g | O nama — functional part = breadcrumb only; the rest is marketing → S | done | see git log |
| 5 | Backend cleanup (legacy fields) | done (detail `propertyType` label kept on purpose, see 5) | see git log |
| 6 | Meta: `<title>` per page per language (descriptions / og tags go with S) | done | see git log |
| S | **Static marketing copy** on all pages | **waits for the client's final texts** | |
| 7a | Translations file + API `translations` + frontend + all 43 listings translated here (Opus 5.5) | done | see git log |
| 7b | API translator after each sync + form free text → Serbian + real-API smoke test | **at production** (Relja's key) | |
| 8 | Final QA + Relja's browser check (desktop + phone) | todo, last | |
| after | New property types (after-i18n backlog): keys + type rules, chips + Zemljište subtypes, "Cena po m²", Oglasite form — all sr/en/ru | done 2026-11-05 | 3d9d92f, bd8c819, e721f82, 659410f |

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
- Pages translated: `page-properties.js`, `dropdown.js`, `page-property.js`, `page-home.js`, `page-agent.js`, `page-agents.js`, `forms.js`, `scroll-top.js`, `script.js` (stats counter locale only).

**Backend changes made for i18n:** list `propertyType` = key (was the Serbian label); heating `EG`/`Etažno` → `individual_central`, `Toplotne pumpe`/`Toplotna pumpa` → `heat_pump`. Contract + data-model docs updated. Step 3e: agent `phone` is normalized in `agent-extractor.ts` via `normalizePhone` (`shared/utils.ts`): `069…` → `+38169…`, `00381…`/`381…` → `+381…`, other shapes kept; data-model doc updated, 298 tests green.

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
- **sr unchanged proof:** `git archive HEAD client | tar -x -C <scratch>/head`, run the page test with `DUMP_DIR=<scratch>/old` on `<scratch>/head/client` and `DUMP_DIR=<scratch>/new` on `client`, `diff` the JSON files. The dump file names get long (detail pages): `git diff --no-index` can fail on Windows path length — compare with a small node script instead.
- **Backend:** `cd server && npx vitest run && npx tsc --noEmit && npx eslint src`.
- **Running a test backend:** in `server/`: `$env:PORT='3001'; npx tsx src/server.ts` (background). If 3001 is taken (an old server from an earlier chat — EADDRINUSE), use 3002. Relja's own server is usually on 3000 and may run OLD backend code — restart it after backend changes or use 3001. Wait until `/api/status` answers.
- Useful IDs (live feed 2026-11-02): `novi-sad-grbavica-lux-cetvorosoban-stan-180m2-dva-garazna-mesta-606` (apartment), `novi-sad-klisa-lokacija-gradjevinska-parcela-356m2-116` (plot), `bac-ugostiteljski-0bjekat-salas-359-m2-88` (type `other`), `ruma-voganj-porodicna-kuca-ranc-196-m2-91` (house, Okolina). Agents: `nada-atanaskovic`, `marija-ranisavljevic`. Feed IDs change over time — fetch `/api/properties?pageSize=100` for current ones.

## 5. What's left — step by step

### 3e — Agents — DONE
- Keys: `agent.tag / inquiryTitle / formLabel / aboutTag / aboutTitle / portfolioTag / portfolioTitle / activeListings / notFound.*`, `agents.empty`, `form.messageShort`, `form.send` (shared submit text; replaced `detail.agent.send`, the detail page uses it too). Names inserted via `{name}` go through `esc()` — `t()` does not escape vars.
- `agenti.html`: breadcrumb only. Its hero, "Vaši Agenti", the 6 benefit cards, the CTA (incl. its "Pošaljite Upit" button) and the section aria-labels wait for step S — the page test lists them, expected.
- `agent-detalj.html`: hero aria-label = `agent.tag`. `document.title` stays "{name} | ProVizija Nekretnine" (language-neutral); the 404 `<title>` "Agent | …" → phase 6.
- Agent bio (`shortBio`) and `stats.label` come from `server/src/modules/agents/enrichment.ts` (empty today, so nothing shows). Relja: wait for the client's short bios; then add them in sr/en/ru together with step S.
- Original notes (kept for reference):
- `page-agent.js`: hero tag "Profil agenta", breadcrumb (`common.home`, `nav.agents`, `common.breadcrumb`), "Pošaljite upit – {name}", form aria, field placeholders/aria (reuse `form.*`; "Kratka poruka..." needs a new `form.messageShort`), "Pošaljite Upit", "Portfolio", "Nekretnine – {name}", "Aktivni oglasi", contact buttons (call/email/WhatsApp… check the code), stats labels if any, 404 texts, `document.title`. `agent.stats.label` comes from data (check what it is).
- `page-agents.js`: empty/error states.
- Static HTML: only functional bits (breadcrumb, aria labels of lists). Section titles/intro/benefits = marketing → later.
- Agent names never translated.

### 3g — O nama — DONE
- Only the breadcrumb was functional. Everything else (hero, story, values, stats labels, partners, testimonials, CTA, section aria-labels) → step S.
- **Tell the client with the new texts (Relja was told 2026-11-03):** the 3 testimonials are made up (randomuser.me photos) — real ones or remove; the partner banks must be real partnerships; "3 stručna agenta" / "Tri eksperta" vs 2 agents in the feed; "10.000 klijenata", "850 prodatih godišnje" unverified; "osnovana 2008" vs "15+ godina"; agenti.html "Govorimo srpski, engleski i nemački" (site is now also Russian). The team photo is from unsplash.

### 3f — Forms — DONE
- Every `<option>` has an explicit value: og-namena / og-tip / og-pregovaranje = the API keys; og-sobe / og-sprat / og-grejanje / k-tema / "Ostalo" = the Serbian text. `forms.js` reads `.value`; only labels are translated → submitted data + e-mails stay Serbian. City / district options are proper nouns: `lang="sr"`, not translated.
- All inputs got `name` = the API field, so `details[].field` errors land under the right input. The English `details[].message` is never shown: `form.fieldError.required / tooLong / invalid` by kind.
- Consent checkbox is now enforced in JS (`form.consentRequired`). 429 → `form.rateLimit` (keeps the old Serbian text).
- Backend: optional `lang` (sr|en|ru, else 400) on all 4 forms → "Jezik posetioca: srpski/engleski/ruski" row (`forms/lang.ts`). Advertise: transactionType / propertyType / priceType / features accept only known keys and the e-mail shows Serbian labels (it showed "sale", "apartment", "negotiable", "airConditioning" before); `rooms` + `floor` are now the Serbian option text (a studio couldn't be sent — rooms 0 was rejected; the floor was a string vs number and silently dropped). Contract updated. Tests: `forms/__tests__/forms.test.ts`, 307 total.
- Verified with a scratch jsdom submit test (POSTs captured, no e-mail sent) + the captured bodies run through the real validators/composers.
- Marketing copy on kontakt / oglasite (hero, "Pošaljite nam poruku" + intro, info cards incl. "Otvori na mapi", "Zašto prodati" benefits) → step S.
- The page test flags "I agree to the" in English: the Serbian-word regex matches "I" as the word "i" — false positive.
- Inquiry message (Relja, 2026-11-03): **required** — an agent needs to know what the visitor wants. "(opciono)" removed (`form.messagePh` = "Vaša poruka..."), the textarea is `required`, and `forms.js` blocks the submit: "Morate napisati poruku." under the field (`form.messageRequired`), other empty fields get `form.fieldError.required`, an alert, focus on the first empty field. Backend already required it.
- Original notes (kept for reference):
- The inquiry forms on the detail + agent pages already use `form.*` keys for fields + `form.send`; what is left there is `forms.js` (validation, alerts, success screen).
- **Trap:** `forms.js` maps the selected `<option>` **text** to API values (`transactionTypeMap`, `propertyTypeMap`, `priceTypeMap`, `parseRooms('Garsonjera')`), and e-mails contain option texts. Before translating options: give every `<option>` an explicit `value="<current Serbian text>"` (or a key) and read `.value` in `forms.js`, so the submitted data and the e-mails stay Serbian while only the label is translated. Check every select: og-namena, og-tip, og-grad, og-opstina, og-sobe, og-sprat, og-grejanje, og-pregovaranje, k-tema.
- City/district options in og-grad / og-opstina are proper nouns — don't translate (only "Odaberite...").
- Labels, placeholders, required-field messages, checkboxes (features: lift, parking…), submit buttons, success screens ("Hvala vam…", "Nazad na početnu"), error alerts (`showAlert`), 429 message (use `errors.RATE_LIMIT_EXCEEDED`), validation messages.
- Backend field errors (`details[].message`) are English → show a translated message per field (e.g. `form.errors.<field>` or a generic "invalid field" text), never the English one.
- The long descriptive texts on Oglasite/Kontakt (benefits, intro) = marketing → later.

### 5 — Backend cleanup — DONE
- Removed from the public API: `highlights` (list + detail + home + agent portfolio — all via `toListItem`), detail `floor` (raw), `heating` (joined Serbian), `furnished` (label), `elevator`, `registrationStatus`. `buildHighlights` + its tests gone. Internal model unchanged → no `DATASET_SCHEMA_VERSION` bump. Contract + data-model updated. 305 tests.
- **Update 2026-11-05:** the flat `propertyType` is gone — Lokal (`retail`) and Ugostiteljski objekat (`hospitality`) got keys with the other new types. Old note:
- **Kept on purpose:** detail flat `propertyType` (the agency's Serbian label). Type `other` (today "Lokal" id 81, "Ugostiteljski objekat" id 88) has no key yet: Serbian shows that label in the "Tip" row, en/ru show `detail.spec.otherType` ("Other property" / "Другая недвижимость") — before, en/ru showed the Serbian word (the page test can't catch it: no č/ć/š/ž/đ). Relja (2026-11-03): these two must NOT stay "Ostalo" — they get real named types in the after-i18n types work (with Garaža, the Zemljište group…); remove the flat `propertyType` then.
- Flat `area` / `rooms` / `bathrooms` stay (numbers).
- Original notes (kept for reference):
- (`lang` in the forms + "Jezik posetioca" was done in 3f.)
- Remove legacy Serbian fields once nothing reads them: list `highlights`; detail flat `propertyType` (label), `heating` (joined string), `furnished` label, raw `floor`, `elevator`, `registrationStatus`. `page-property.js` still falls back to `p.propertyType` in the spec "Tip" row — switch it to the key first. Update contract + tests; bump nothing unless the internal model changes (`DATASET_SCHEMA_VERSION` only for Property/Agent model changes).

### 6 — Meta — DONE
- Every `<title>` has `data-i18n="meta.title.<page>"`; `apply()` already covers `<head>`. Relja chose **short en/ru titles** ("About Us | ProVizija Nekretnine", "О нас | ProVizija Nekretnine"); the long Serbian SEO titles stay as they are (Google only sees Serbian: same URL, no hreflang). "ProVizija Nekretnine" is never translated.
- Agent profile / property detail still set `document.title` from JS after load (agent name / generated title); the static title only shows for the 404 cases.
- Meta description + og tags → step S (marketing copy).
- Original notes (kept for reference):
- `<title>` per page per language (dictionary keys, set by `apply` — add support for `<title data-i18n>` or set `document.title` in i18n.js). `<html lang>` is already set. Meta descriptions / og tags: with the static content (they're marketing text).

### S — Static marketing copy (when the client's texts arrive)
- Pages: index (hero title/subtitle, section tags/titles/descriptions, stats labels, "Kako funkcionišemo" steps, team intro, FAQ ×6, CTA), o-nama (almost everything), agenti (intro, benefits), kontakt (intro, info blocks), oglasite (intro, benefits), nekretnine hero (already translated — re-check), footer about texts (already translated — re-check).
- Flow: Relja gives the final Serbian texts → put them into the HTML → `data-i18n` keys → EN + RU → `node tools/i18n-check.js --update`.
- Question to raise then: the FAQ says "pružamo usluge na engleskom jeziku" — now that the site is also Russian, maybe "na engleskom i ruskom".

### 7 — Machine translation (needs the client's API key + model choice; ask Relja first)
- **7a DONE (2026-11-03):**
  - Backend: `server/src/modules/translations/store.ts` reads `server/src/data/translations.json` (committed; entries keyed by property id + `sourceHash` of title+description; a mismatch means outdated, never shown). The list item gets `translations.{en,ru}.title`, the detail gets `translations.{en,ru}.{title,description}`, and `/api/status` gets `translations: {translated, missing, outdated}`. Docs: api-contract (detail "Translations" section), architecture. 312 tests.
  - Frontend: `propertyTitle()` prefers the translated title. The detail description uses the translation with `lang="en|ru"`, and the "Opis je na srpskom" note shows only without a translation.
  - All 43 listings were translated by Opus 5.5 subagents with `tools/translations/instructions.md`, checked by `merge-batches.js`, and spot-checked.
  - How to translate new listings later: `tools/translations/README.md`. At the start of each chat, check `/api/status` and offer to run it.
  - The page test now treats API translation text as allowed (it keeps place names in Latin).
- 7b (at production, with Relja's key): translator module (Claude API, Opus 5.5, prompt = `tools/translations/instructions.md`), run after each sync for missing/outdated entries, never blocking the sync. Form free text (message, description, address) → Serbian, added to the agency e-mail as "Prevod: …". `/api/status` shows the counts. Run 1–2 listings through the real API as a check. Read the `claude-api` skill first.
- **Update 2026-11-03:** the key is **Relja's own** (separate Console account), he pays the credits; no client key. Until production there is no key: translations are made here (Claude Code) and stored; with the key in production only new/changed listings are translated by the API.
- **Model test done 2026-11-03** (blind, 13 real listings: 5 apartments, 4 houses, 2 plots, lokal, salaš, titles + descriptions → en + ru, plus 5 en/ru visitor messages → sr; same instructions for all; run as Claude Code subagents, not the API, so no measured cost/latency). Test files: session scratchpad `mt/` (instructions.md = the draft production prompt). Automatic checks: all three kept every number, price, area and line break. Blind grades (1–10):
  | | EN | RU | messages → sr | notes |
  |---|---|---|---|---|
  | Opus 5.5 | 9.5 | 9.5 | 9.5 | most natural (buy-to-let, "выходит окнами во двор", "uknjiži na svoje ime"); follows formatting rules best; took "rivers stay as written" literally ("the Dunav") |
  | Sonnet 5.5 | 9 | 9 | 9 | faithful and natural; kept the ALL-CAPS lines of the original; used "Danube" / "Petrovaradin Fortress"; small helpful glosses |
  | Haiku 5.5 | 7.5 | 7 | 8 | more literal ("represents an opportunity", "price-to-quality ratio"); in Russian it broke the place-name rule (Нови-Сад, Подбара, even "Каћ" with a Serbian letter); calques ("в широком центре", "kozmetički remont") |
- Estimated API cost per listing (title + description, en + ru): Opus ≈ $0.03, Sonnet ≈ $0.015, Haiku ≈ $0.001 → ~40 new listings/month ≈ $1.2 / $0.6 / $0.04 (Batch API halves it). Visitor messages are negligible.
- Prompt fixes learned: well-known geographic names (Danube/Дунай, Petrovaradin Fortress) in their standard form vs. local places as written — ask Relja; say explicitly "write ALL-CAPS lines of the description in normal case".
- **Also (Relja, 2026-11-03):** free text typed into the forms in en/ru (message, description, address) should reach the agency in Serbian too: with the same API key, translate it in the form handler and put the Serbian translation under the original in the e-mail ("Prevod: …"); on failure send the original only. Dropdowns / checkboxes already arrive in Serbian.
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
- A scratch jsdom script that loads index.html / nekretnine.html never exits on its own (hero particles / timers keep it alive) → call `dom.window.close()` and `process.exit()` at the end, and keep each run to a few pages, or Relja sees it "spinning".

## 7. Open questions

- "EG" heating was assumed = etažno grejanje (Relja didn't object; confirm with the client if unsure).
- ~~New RELPER types ("Lokal", "Ugostiteljski objekat") are `other`~~ → done 2026-11-05: every type has a key + sr/en/ru labels (`enum.propertyType`, `list.chip.*`, `list.landSub.*`, `advertise.types.*`). Types not yet seen in the feed (Garaža, Hala, Građevinsko / Industrijsko zemljište, Poslovni prostor, Kancelarija) are spelled by analogy; an unknown spelling becomes `other` and shows in the sync log as "unmapped property types".
