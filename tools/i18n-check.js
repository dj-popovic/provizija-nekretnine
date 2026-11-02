// i18n check — run from the repo root:  node tools/i18n-check.js [--update]
//
// 1. Every data-i18n / data-i18n-html / data-i18n-attr key in client/*.html exists
//    in en.js and ru.js (the Serbian text lives in the HTML itself).
// 2. Every literal t('key') / plural(n, 'key') in client/js exists in sr.js, and
//    every sr.js key exists in en.js and ru.js.
// 3. Stale translations: tools/i18n-sr-snapshot.json remembers the Serbian text
//    each HTML key had when it was translated. If the Serbian text changes later,
//    the key is reported until en/ru are updated and the snapshot is refreshed
//    with --update.
//
// Exit code 1 when something needs attention.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const SNAPSHOT = path.join(__dirname, 'i18n-sr-snapshot.json');
const update = process.argv.includes('--update');

function loadDict(lang) {
  let dict = {};
  const PV = { i18n: { add: (l, d) => { dict = d; } } };
  new Function('PV', fs.readFileSync(path.join(CLIENT, 'i18n', lang + '.js'), 'utf8'))(PV);
  return dict;
}

function get(obj, key) {
  return key.split('.').reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), obj);
}

// Leaf keys; plural objects ({ one, other, … }) count as one leaf
function leaves(obj, prefix) {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? prefix + '.' + k : k;
    const isPlural = v && typeof v === 'object' && 'other' in v;
    return v && typeof v === 'object' && !isPlural ? leaves(v, key) : [key];
  });
}

const clean = (s) => s.replace(/\s+/g, ' ').trim();

// key → Serbian text, from the HTML
function htmlKeys() {
  const found = {};
  const conflicts = [];
  function add(key, text, page) {
    if (found[key] !== undefined && found[key] !== text) conflicts.push(`${key}: "${found[key]}" vs "${text}" (${page})`);
    if (found[key] === undefined) found[key] = text;
  }
  for (const page of fs.readdirSync(CLIENT).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(CLIENT, page), 'utf8');
    for (const m of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) add(m[1], clean(m[2]), page);
    for (const m of html.matchAll(/data-i18n-html="([^"]+)"[^>]*>([\s\S]*?)<\/(h1|h2|h3|p|div|span|a|li)>/g)) add(m[1], clean(m[2]), page);
    for (const tag of html.matchAll(/<[^>]*data-i18n-attr="([^"]+)"[^>]*>/g)) {
      for (const pair of tag[1].split(';')) {
        const [attr, key] = pair.split(':').map((s) => s && s.trim());
        if (!attr || !key) continue;
        const value = tag[0].match(new RegExp(`\\s${attr}="([^"]*)"`));
        add(key, value ? clean(value[1]) : '', page);
      }
    }
  }
  return { found, conflicts };
}

function jsKeys() {
  const used = new Set();
  for (const file of fs.readdirSync(path.join(CLIENT, 'js'))) {
    const src = fs.readFileSync(path.join(CLIENT, 'js', file), 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'\s*[,)]/g)) used.add(m[1]);
    for (const m of src.matchAll(/plural\([^,()]+(?:\([^)]*\))?,\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
    for (const m of src.matchAll(/\?\s*'([a-z]+\.[a-zA-Z0-9_.]+)'\s*:\s*'([a-z]+\.[a-zA-Z0-9_.]+)'\s*\)/g)) { used.add(m[1]); used.add(m[2]); }
  }
  // A key built from a prefix + a variable ('errors.' + code) isn't matched — checked by hand
  return [...used].filter((k) => !k.endsWith('.'));
}

const dicts = { sr: loadDict('sr'), en: loadDict('en'), ru: loadDict('ru') };
const problems = [];
const report = (title, list) => {
  if (!list.length) return;
  problems.push(title);
  console.log(`\n${title} (${list.length})`);
  list.forEach((line) => console.log('  - ' + line));
};

const { found, conflicts } = htmlKeys();
const htmlList = Object.keys(found).sort();

report('Same key, different Serbian text in the HTML', conflicts);
for (const lang of ['en', 'ru']) {
  report(`HTML keys missing in ${lang}.js`, htmlList.filter((k) => typeof get(dicts[lang], k) !== 'string'));
}

// Keys whose dictionary entry is used both by the HTML and by sr.js must agree
report('HTML text differs from sr.js', htmlList.filter((k) => typeof get(dicts.sr, k) === 'string' && clean(get(dicts.sr, k)) !== found[k])
  .map((k) => `${k}: HTML "${found[k]}" / sr.js "${get(dicts.sr, k)}"`));

report('JS keys missing in sr.js', jsKeys().filter((k) => get(dicts.sr, k) === undefined && !k.startsWith('title.')));
const srLeaves = leaves(dicts.sr);
for (const lang of ['en', 'ru']) {
  report(`sr.js keys missing in ${lang}.js`, srLeaves.filter((k) => get(dicts[lang], k) === undefined));
}

// Stale translations
let snapshot = {};
if (fs.existsSync(SNAPSHOT)) snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
const changed = htmlList.filter((k) => snapshot[k] !== undefined && snapshot[k] !== found[k])
  .map((k) => `${k}: was "${snapshot[k]}", now "${found[k]}"`);
const fresh = htmlList.filter((k) => snapshot[k] === undefined);

if (update) {
  const next = {};
  htmlList.forEach((k) => { next[k] = found[k]; });
  fs.writeFileSync(SNAPSHOT, JSON.stringify(next, null, 2) + '\n');
  console.log(`Snapshot updated: ${htmlList.length} keys.`);
} else {
  report('Serbian text changed since translation — update en/ru, then run with --update', changed);
  report('New keys not in the snapshot yet — translate, then run with --update', fresh);
}

console.log(`\n${htmlList.length} HTML keys, ${srLeaves.length} sr.js keys.`);
if (problems.length) {
  console.log(`${problems.length} problem group(s).`);
  process.exit(1);
}
console.log('All good.');
