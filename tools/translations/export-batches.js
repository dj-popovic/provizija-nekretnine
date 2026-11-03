// Exports the properties that have no up-to-date translation into batch files for translation.
// Usage: node export-batches.js <properties-cache.json> <translations.json> <out dir> [batch size]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const [cacheFile, translationsFile, outDir, sizeArg] = process.argv.slice(2);
const size = Number(sizeArg) || 9;
const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
const existing = fs.existsSync(translationsFile) ? JSON.parse(fs.readFileSync(translationsFile, 'utf8')).items || {} : {};

// Must match sourceHash() in server/src/modules/translations/store.ts
const hash = (title, description) => crypto.createHash('sha256').update(`${title}\n\n${description ?? ''}`).digest('hex').slice(0, 16);

const todo = data.properties
  .map((p) => ({ id: p.id, title: p.title, description: p.description || null, city: p.city, hood: p.hood, sourceHash: hash(p.title, p.description) }))
  .filter((p) => !existing[p.id] || existing[p.id].sourceHash !== p.sourceHash);

fs.mkdirSync(outDir, { recursive: true });
const batches = [];
for (let i = 0; i < todo.length; i += size) batches.push(todo.slice(i, i + size));
batches.forEach((b, i) => fs.writeFileSync(path.join(outDir, `batch-${i + 1}.json`), JSON.stringify({ listings: b }, null, 2)));
console.log(`${data.properties.length} properties, ${todo.length} to translate, ${batches.length} batches of up to ${size}`);
batches.forEach((b, i) => console.log(`  batch-${i + 1}: ${b.map((p) => p.id).join(', ')} (${b.reduce((s, p) => s + p.title.length + (p.description || '').length, 0)} chars)`));
