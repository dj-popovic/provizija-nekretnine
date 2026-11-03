# Translating properties during development (i18n phase 7a)

Until production there is no API key. Translations are made in Claude Code (Opus 5.5, by Relja's decision) and stored in `server/src/data/translations.json`, which is committed. In production the backend translates new or changed properties itself (phase 7b).

When to run this: `/api/status` → `translations.missing` or `translations.outdated` is above 0, or Relja says "prevedi nove".

1. **Export** what's missing or outdated into batches (default 9 listings each), into a scratch folder **outside the repo**:
   `node tools/translations/export-batches.js server/src/data/properties-cache.json server/src/data/translations.json <scratch>/run 9`
2. **Translate**: one Opus subagent per batch, in parallel (`model: "opus"`). Each one reads `tools/translations/instructions.md` + `<scratch>/run/batch-N.json`, translates the batch itself (no external API) and writes `<scratch>/run/out-N.json`. Have it reply only "done".
3. **Merge**: this checks each listing first. Every number must be kept, along with the line breaks, the city and district names (Latin, whole words) and the ALL CAPS title, and the Russian must not contain Serbian Cyrillic. Then it writes `translations.json`. A listing that fails a check is NOT written; re-translate it:
   `node tools/translations/merge-batches.js <scratch>/run server/src/data/translations.json claude-opus-5-5 <YYYY-MM-DD>`
4. **Spot-check** a few titles and descriptions. Restart the server, because the file is read once at startup. Then check `/api/status`, run `tools/i18n-page-test.js` on a detail page, and commit `translations.json`.

`sourceHash` in `export-batches.js` must stay identical to `sourceHash()` in `server/src/modules/translations/store.ts`. It is a hash of the title and description, so a description edited by the agency counts as outdated.

Rules for the translations (decided by Relja on 2026-11-03) are in `instructions.md`:
- cities, districts and streets stay as written, in Latin script also in Russian;
- other geography uses the standard foreign name (Danube / Дунай);
- titles are ALL CAPS;
- numbers are never changed.
