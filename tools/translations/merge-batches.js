// Checks translated batches and merges the good ones into server/src/data/translations.json.
// Usage: node merge-batches.js <run dir> <translations.json> [model] [date]
// A listing that fails a check is NOT written (re-translate it); everything else is kept.
const fs = require('fs');
const path = require('path');

const [runDir, translationsFile, model = 'claude-opus-5-5', date = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);

function numbers(text) {
  const out = [];
  const t = String(text || '').replace(/([mM])2\b/g, '$1²').replace(/\b0(BJEKAT)/g, 'O$1');
  const re = /\d[\d.,  ]*\d|\d/g;
  let m;
  while ((m = re.exec(t))) {
    let n = m[0].replace(/[  ]/g, '');
    if (/^\d{1,3}([.,]\d{3})+$/.test(n)) n = n.replace(/[.,]/g, '');
    else n = n.replace(',', '.');
    out.push(n);
  }
  return out;
}
function missing(src, dst) {
  const pool = new Map();
  dst.forEach((n) => pool.set(n, (pool.get(n) || 0) + 1));
  return src.filter((n) => { const c = pool.get(n) || 0; if (c) { pool.set(n, c - 1); return false; } return true; });
}
const lines = (t) => (t == null ? 0 : String(t).split('\n').length);
const SERBIAN_CYRILLIC = /[ђћџљњјЂЋЏЉЊЈ]/;

const file = fs.existsSync(translationsFile) ? JSON.parse(fs.readFileSync(translationsFile, 'utf8')) : { version: 1, items: {} };
let ok = 0;
const problems = [];

fs.readdirSync(runDir).filter((f) => /^batch-\d+\.json$/.test(f)).sort().forEach((bf) => {
  const n = bf.match(/\d+/)[0];
  const outFile = path.join(runDir, `out-${n}.json`);
  const batch = JSON.parse(fs.readFileSync(path.join(runDir, bf), 'utf8')).listings;
  if (!fs.existsSync(outFile)) { problems.push(`${bf}: no out-${n}.json`); return; }
  const out = new Map(JSON.parse(fs.readFileSync(outFile, 'utf8')).listings.map((l) => [String(l.id), l]));

  batch.forEach((src) => {
    const t = out.get(src.id);
    const issues = [];
    if (!t) issues.push('missing');
    else {
      const srcText = src.title + '\n' + (src.description || '');
      ['en', 'ru'].forEach((lang) => {
        const tr = t[lang];
        if (!tr || typeof tr.title !== 'string' || !tr.title) { issues.push(`${lang}: no title`); return; }
        if (src.description && typeof tr.description !== 'string') { issues.push(`${lang}: no description`); return; }
        if (!src.description) tr.description = null;
        if (tr.title !== tr.title.toUpperCase()) issues.push(`${lang}: title not ALL CAPS`);
        const miss = missing(numbers(srcText), numbers(tr.title + '\n' + (tr.description || '')));
        if (miss.length) issues.push(`${lang}: numbers ${miss.join(',')}`);
        if (src.description && lines(tr.description) !== lines(src.description)) issues.push(`${lang}: line breaks ${lines(tr.description)}/${lines(src.description)}`);
        // Whole words only: "Petrovaradinska tvrđava" is a landmark (translated), not the place "Petrovaradin"
        const has = (text, place) => new RegExp('(^|[^\\p{L}])' + place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'iu').test(text);
        [src.city, src.hood].filter(Boolean).forEach((place) => {
          if (has(srcText, place) && !has(tr.title + '\n' + (tr.description || ''), place)) {
            issues.push(`${lang}: place "${place}" not kept`);
          }
        });
        if (lang === 'ru' && SERBIAN_CYRILLIC.test(tr.title + (tr.description || ''))) issues.push('ru: Serbian Cyrillic letters');
      });
    }
    if (issues.length) { problems.push(`${src.id}: ${issues.join('; ')}`); return; }
    file.items[src.id] = {
      sourceHash: src.sourceHash,
      model,
      translatedAt: date,
      en: { title: t.en.title, description: t.en.description },
      ru: { title: t.ru.title, description: t.ru.description },
    };
    ok++;
  });
});

// Stable order (by numeric id) keeps git diffs readable
const sorted = {};
Object.keys(file.items).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)).forEach((k) => { sorted[k] = file.items[k]; });
fs.writeFileSync(translationsFile, JSON.stringify({ version: 1, items: sorted }, null, 2) + '\n');
console.log(`${ok} listings written, ${Object.keys(sorted).length} in the file.`);
if (problems.length) { console.log('NOT written (fix / re-translate):'); problems.forEach((p) => console.log('  - ' + p)); }
