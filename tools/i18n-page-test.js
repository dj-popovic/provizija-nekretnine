// Whole-page i18n test with real API data (jsdom) — the main check after every i18n step.
//
// Loads each page in sr / en / ru with live data from a running backend, opens every
// custom dropdown and "Više filtera", then lists any Serbian text left in en / ru.
// Allowed: proper nouns from the API (cities, districts, agent names + initials, the
// agency address) and elements marked lang="sr" (property descriptions).
// Also checks the dictionaries (every literal t('key') in client/js exists in sr,
// every sr key exists in en and ru) and reports JS errors on each page.
//
// Setup — jsdom is NOT a project dependency, install it outside the repo:
//   mkdir <scratch>/jsdom; cd <scratch>/jsdom; npm init -y; npm i jsdom@26.1.0
// Run from the repo root (Node 18+, backend running, e.g. PORT=3001):
//   NODE_PATH=<scratch>/jsdom/node_modules node tools/i18n-page-test.js client http://localhost:3001 nekretnine.html "nekretnina-detalj.html?id=<slug-id>"
//   PowerShell: $env:NODE_PATH = '<scratch>\jsdom\node_modules'; node tools\i18n-page-test.js client http://localhost:3001 nekretnine.html
// DUMP_DIR=<dir>: saves the Serbian texts per page as JSON. To prove the Serbian output
//   didn't change: run once on client/ and once on a copy of the last commit
//   (git archive HEAD client | tar -x -C <dir>), then diff the two dump folders.
//
// Pages whose marketing copy still waits for the client's final texts list that copy
// as "Serbian left" — expected until the static-content phase; everything else must be clean.
const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

const clientDir = path.resolve(process.argv[2]);
const API = process.argv[3];
const PAGES = process.argv.slice(4);
const ORIGIN = 'http://localhost:3000/';

class LocalLoader extends ResourceLoader {
  fetch(url) {
    if (url.startsWith(ORIGIN)) {
      const rel = decodeURIComponent(new URL(url).pathname.slice(1));
      const file = path.join(clientDir, rel);
      if (fs.existsSync(file)) return Promise.resolve(fs.readFileSync(file));
      return Promise.reject(new Error('404 ' + rel));
    }
    return Promise.resolve(Buffer.from(''));
  }
}

let pass = 0;
let fail = 0;
function check(name, ok, extra) {
  if (ok) pass++;
  else fail++;
  console.log((ok ? '  OK   ' : '  FAIL ') + name + (ok || extra === undefined ? '' : '  → ' + extra));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(page, lang) {
  const html = fs.readFileSync(path.join(clientDir, page.split('?')[0]), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/Not implemented/i.test(e.message)) errors.push(e.message); });
  let pending = 0;
  const dom = new JSDOM(html, {
    url: ORIGIN + page,
    runScripts: 'dangerously',
    resources: new LocalLoader(),
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.localStorage.setItem('pv-lang', lang);
      window.fetch = async (url, opts) => {
        pending++;
        try {
          const res = await fetch(API + url, { method: opts && opts.method, headers: opts && opts.headers, body: opts && opts.body });
          const text = await res.text();
          return { ok: res.ok, status: res.status, json: async () => JSON.parse(text) };
        } finally {
          pending--;
        }
      };
      window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.scrollTo = () => {};
      window.scrollBy = () => {};
      window.Element.prototype.scrollIntoView = function () {};
      window.Element.prototype.scrollTo = function () {};
      window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
      // Bootstrap comes from the CDN, which this harness doesn't load
      const instance = () => ({ show() {}, hide() {}, toggle() {}, dispose() {} });
      window.bootstrap = {
        Modal: { getOrCreateInstance: instance, getInstance: instance },
        Collapse: { getOrCreateInstance: instance, getInstance: instance },
      };
    },
  });
  await new Promise((resolve) => dom.window.addEventListener('load', resolve));
  // Wait until the API calls are done (debounced filter-options included)
  let idle = 0;
  for (let i = 0; i < 100 && idle < 4; i++) {
    await wait(100);
    idle = pending === 0 ? idle + 1 : 0;
  }
  return { dom, errors };
}

function collect(doc, skipSerbian) {
  const out = [];
  const walker = doc.createTreeWalker(doc.body, 4);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement && node.parentElement.closest('script,style,noscript')) continue;
    // Text marked as Serbian on purpose (property description, the SRB option)
    const langEl = node.parentElement && node.parentElement.closest('[lang]');
    if (skipSerbian && langEl && langEl !== doc.documentElement && langEl.getAttribute('lang') === 'sr') continue;
    const text = node.nodeValue.replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  doc.body.querySelectorAll('[aria-label],[placeholder],[title],img[alt]').forEach((el) => {
    ['aria-label', 'placeholder', 'title', 'alt'].forEach((a) => {
      const v = el.getAttribute(a);
      if (v) out.push(`@${a}=${v}`);
    });
  });
  return out;
}

const SERBIAN_LETTERS = /[čćšžđČĆŠŽĐ]/;
const SERBIAN_WORDS = /\b(i|ili|za|na|od|do|sa|se|je|su|nas|vaš\w*|naš\w*|nekretnin\w*|kontakt\w*|stan|stanovi|kuća|kuće|prodaj\w*|izdavanj\w*|pretra\w*|oglas\w*|agent(?:i|a|u|om|ima|ata)|prava|grad|grada|deo|sobe?|sprat\w*|kupatil\w*|cena|cene|godina|površina|kvadratura|grejanje|stanje|oprema\w*|svi|sve|svejedno|sortiraj|najnovije|prikazano|učitaj|više|manje|filtera|filteri|nema|izaberite)\b/i;

(async () => {
  // Proper nouns that legitimately stay Serbian
  const allowed = new Set(['ProVizija', 'ProVizija Nekretnine', 'Vase Stajića 36, Novi Sad']);
  const opts = await (await fetch(API + '/api/filter-options')).json();
  ((opts.data && opts.data.cities) || []).forEach((c) => {
    allowed.add(c.name);
    (c.hoods || []).forEach((h) => { allowed.add(h.name); allowed.add(`${c.name}, ${h.name}`); });
  });
  const props = await (await fetch(API + '/api/properties?pageSize=100')).json();
  (props.items || []).forEach((p) => allowed.add(p.location));
  const agents = await (await fetch(API + '/api/agents')).json();
  ((agents.data && agents.data.items) || agents.items || agents.data || []).forEach((a) => { if (a && a.fullName) { allowed.add(a.fullName); allowed.add(a.fullName.split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase()); } });

  function isAllowed(text) {
    const bare = text.replace(/^@[a-z-]+=/, '');
    if (allowed.has(bare)) return true;
    // Strip every allowed name, then look again
    let rest = bare;
    [...allowed].sort((a, b) => b.length - a.length).forEach((n) => { rest = rest.split(n).join(' ').split(n.toLocaleUpperCase('sr')).join(' '); });
    return !(SERBIAN_LETTERS.test(rest) || SERBIAN_WORDS.test(rest));
  }

  console.log('\n0) Dictionaries: every sr key exists in en and ru');
  {
    const dicts = {};
    for (const lang of ['sr', 'en', 'ru']) {
      new Function('PV', fs.readFileSync(path.join(clientDir, 'i18n', lang + '.js'), 'utf8'))({ i18n: { add: (l, d) => { dicts[l] = d; } } });
    }
    const leaves = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) => {
      const p = prefix ? prefix + '.' + k : k;
      const isPlural = v && typeof v === 'object' && ('other' in v);
      return v && typeof v === 'object' && !isPlural ? leaves(v, p) : [p];
    });
    const get = (obj, p) => p.split('.').reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), obj);
    const srKeys = leaves(dicts.sr);
    // Every literal t('key') / plural(n, 'key') in the JS must exist in sr
    // (sr is the fallback; a missing key would show the key itself)
    const used = new Set();
    for (const f of fs.readdirSync(path.join(clientDir, 'js'))) {
      const src = fs.readFileSync(path.join(clientDir, 'js', f), 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'\s*[,)]/g)) used.add(m[1]);
      for (const m of src.matchAll(/plural\([^,()]+(?:\([^)]*\))?,\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
      for (const m of src.matchAll(/\?\s*'([a-z]+\.[a-zA-Z0-9_.]+)'\s*:\s*'([a-z]+\.[a-zA-Z0-9_.]+)'\s*\)/g)) { used.add(m[1]); used.add(m[2]); }
    }
    const missingSr = [...used].filter((k) => !k.endsWith('.') && get(dicts.sr, k) === undefined && !k.startsWith('title.'));
    check(`sr has all ${used.size} literal keys used in the JS`, missingSr.length === 0, missingSr.join(', '));
    for (const lang of ['en', 'ru']) {
      const missing = srKeys.filter((k) => get(dicts[lang], k) === undefined && !k.startsWith('title.'));
      check(`${lang} has all ${srKeys.length} sr keys`, missing.length === 0, missing.join(', '));
    }
  }

  for (const page of PAGES) {
    console.log(`\n== ${page}`);
    const srTexts = {};
    for (const lang of ['sr', 'en', 'ru']) {
      const { dom, errors } = await load(page, lang);
      const w = dom.window;
      const doc = w.document;
      // Open every dropdown once so its options are rendered, and the extra filters
      const more = doc.getElementById('btnMoreFilters');
      if (more) more.click();
      const triggers = Array.from(doc.querySelectorAll('.pv-dd-trigger'));
      const panels = [];
      for (const trig of triggers) {
        trig.click();
        await wait(30);
        const panel = trig.parentElement.querySelector('.pv-dd-panel');
        if (panel) panels.push(...collect({ body: panel, createTreeWalker: doc.createTreeWalker.bind(doc) }, lang !== 'sr'));
        trig.click();
      }
      const texts = collect(doc, lang !== 'sr').concat(panels);
      const cards = doc.querySelectorAll('.property-card').length;
      if (lang === 'sr') {
        srTexts.count = texts.length;
        // DUMP_DIR=…: save the Serbian texts, to diff against another client version
        if (process.env.DUMP_DIR) {
          fs.mkdirSync(process.env.DUMP_DIR, { recursive: true });
          fs.writeFileSync(path.join(process.env.DUMP_DIR, page.replace(/[^a-z0-9]+/gi, '_') + '.json'), JSON.stringify(texts, null, 1));
        }
        check(`[sr] loads, ${cards} cards, no JS errors`, errors.length === 0, errors.join(' | '));
      } else {
        const left = [...new Set(texts.filter((t) => !isAllowed(t)))];
        check(`[${lang}] ${cards} cards, ${texts.length} texts, no Serbian left`, left.length === 0 && errors.length === 0,
          '\n        ' + left.slice(0, 40).join('\n        ') + (errors.length ? '\n        ERRORS: ' + errors.join(' | ') : ''));
      }
      w.close();
    }
  }

  console.log(`\n${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
