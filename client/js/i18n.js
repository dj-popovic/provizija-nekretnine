// ===========================
// PV.i18n — language choice, dictionaries, translation helpers
// ===========================
// Loaded synchronously in <head>, before the dictionaries (i18n/*.js) and
// before the page scripts, so every later script can call PV.i18n.t().
//
// Language order: ?lang= in the URL → saved choice (localStorage) → Serbian.
//
// Static HTML stays in Serbian. Elements marked with data-i18n get the
// English/Russian text on DOMContentLoaded; until then the page is hidden
// (html.i18n-pending) so the Serbian text never flashes.
window.PV = window.PV || {};

(function () {
  'use strict';

  var STORAGE_KEY = 'pv-lang';
  var DEFAULT_LANG = 'sr';
  var REVEAL_TIMEOUT_MS = 3000;

  var LANGS = {
    sr: { code: 'SRB', name: 'Srpski', locale: 'sr-Latn-RS', flag: 'images/flags/rs.png' },
    en: { code: 'ENG', name: 'English', locale: 'en-GB', flag: 'images/flags/gb.svg' },
    ru: { code: 'RUS', name: 'Русский', locale: 'ru-RU', flag: 'images/flags/ru.svg' },
  };

  var dicts = {};

  function isLang(value) {
    return Object.prototype.hasOwnProperty.call(LANGS, value);
  }

  // localStorage can throw (private mode, blocked storage): never let it break the page
  function readSaved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function save(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  function readUrlLang() {
    try { return new URLSearchParams(window.location.search).get('lang'); } catch (e) { return null; }
  }

  // No browser-language detection: most visitors are Serbian, so the site
  // always opens in Serbian until the visitor picks another language.
  function decide() {
    var fromUrl = readUrlLang();
    if (isLang(fromUrl)) {
      save(fromUrl); // a shared ?lang= link keeps the language on the next pages too
      return fromUrl;
    }
    var saved = readSaved();
    if (isLang(saved)) return saved;
    return DEFAULT_LANG;
  }

  var lang = decide();
  var root = document.documentElement;
  root.lang = lang;
  if (lang !== DEFAULT_LANG) root.classList.add('i18n-pending');

  // --- Dictionaries ---

  // Deep-merges so a dictionary can be split over several add() calls
  function merge(target, source) {
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        merge(target[key], value);
      } else {
        target[key] = value;
      }
    });
    return target;
  }

  function add(code, entries) {
    dicts[code] = merge(dicts[code] || {}, entries);
  }

  function lookup(code, key) {
    var node = dicts[code];
    var parts = key.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (node == null || typeof node !== 'object') return undefined;
      node = node[parts[i]];
    }
    return node;
  }

  function fill(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match;
    });
  }

  // t('nav.agents') → text in the current language, falling back to Serbian,
  // then to the key itself (a visible bug rather than an empty string)
  function t(key, vars) {
    var value = lookup(lang, key);
    if (typeof value !== 'string') value = lookup(DEFAULT_LANG, key);
    if (typeof value !== 'string') return key;
    return fill(value, vars);
  }

  // plural(3, 'units.room') with { one, few, many, other } entries
  // (Intl.PluralRules: sr and ru use one/few/many|other, en one/other).
  // {n} in the text is replaced by the formatted number.
  function plural(n, key, vars) {
    var entry = lookup(lang, key);
    if (!entry || typeof entry !== 'object') entry = lookup(DEFAULT_LANG, key);
    if (!entry || typeof entry !== 'object') return key;
    var category = new Intl.PluralRules(LANGS[lang].locale).select(n);
    var text = entry[category] || entry.other || '';
    var allVars = { n: number(n) };
    if (vars) Object.keys(vars).forEach(function (name) { allVars[name] = vars[name]; });
    return fill(text, allVars);
  }

  // sr 270.000 · en 270,000 · ru 270 000
  function number(n, options) {
    return new Intl.NumberFormat(LANGS[lang].locale, options).format(n);
  }

  // --- Static HTML ---

  // data-i18n="key"            → textContent
  // data-i18n-html="key"       → innerHTML (our own dictionary text with <strong>/<br>)
  // data-i18n-attr="placeholder:key; aria-label:key2"
  // Serbian is already in the HTML, so only en/ru texts are written; a key
  // missing from the current dictionary keeps the Serbian original.
  function apply(scope) {
    var base = scope || document;
    if (lang !== DEFAULT_LANG) {
      each(base, '[data-i18n]', function (el) {
        var value = lookup(lang, el.getAttribute('data-i18n'));
        if (typeof value === 'string') el.textContent = value;
      });
      each(base, '[data-i18n-html]', function (el) {
        var value = lookup(lang, el.getAttribute('data-i18n-html'));
        if (typeof value === 'string') el.innerHTML = value;
      });
      each(base, '[data-i18n-attr]', function (el) {
        el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
          var idx = pair.indexOf(':');
          if (idx === -1) return;
          var attr = pair.slice(0, idx).trim();
          var value = lookup(lang, pair.slice(idx + 1).trim());
          if (attr && typeof value === 'string') el.setAttribute(attr, value);
        });
      });
    }
    each(base, '[data-lang-switch]', setupSwitch);
  }

  function each(base, selector, fn) {
    var list = base.querySelectorAll(selector);
    for (var i = 0; i < list.length; i++) fn(list[i]);
    if (base !== document && base.matches && base.matches(selector)) fn(base);
  }

  // --- Changing the language ---

  // Saves the choice and reloads; a ?lang= already in the URL is updated so
  // it doesn't override the new choice
  function setLang(code) {
    if (!isLang(code) || code === lang) return;
    save(code);
    var url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', code);
      window.location.replace(url.toString());
    } else {
      window.location.reload();
    }
  }

  // --- Header language switch ---
  // Desktop: the button shows the current flag + code; hover (mouse) or click
  // (touch / keyboard) opens a list of the other languages.
  // Mobile menu (< 992px): CSS shows all three options in one row.
  function setupSwitch(box) {
    if (box.getAttribute('data-ready') === 'true') return;
    box.setAttribute('data-ready', 'true');

    var current = LANGS[lang];
    var toggle = box.querySelector('.lang-switch-toggle');
    var menu = box.querySelector('.lang-switch-menu');
    var options = box.querySelectorAll('[data-lang]');
    if (!toggle || !menu) return;

    var flag = toggle.querySelector('.lang-flag');
    var code = toggle.querySelector('.lang-code');
    if (flag) flag.setAttribute('src', current.flag);
    if (code) code.textContent = current.code;
    toggle.setAttribute('aria-label', t('lang.choose') + ': ' + current.name);

    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var optionLang = option.getAttribute('data-lang');
      if (optionLang === lang) option.setAttribute('aria-current', 'true');
      else option.removeAttribute('aria-current');
      option.addEventListener('click', onOptionClick);
    }

    function onOptionClick(e) {
      setLang(e.currentTarget.getAttribute('data-lang'));
    }

    function focusable() {
      return Array.prototype.filter.call(options, function (o) { return o.offsetParent !== null; });
    }

    function open(focusFirst) {
      box.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (focusFirst) {
        var list = focusable();
        if (list.length) list[0].focus();
      }
    }

    function close(returnFocus) {
      box.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', function () {
      if (box.classList.contains('is-open')) close(false);
      else open(false);
    });

    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        open(true);
      }
    });

    menu.addEventListener('keydown', function (e) {
      var list = focusable();
      var idx = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var step = e.key === 'ArrowDown' ? 1 : -1;
        var next = list[(idx + step + list.length) % list.length];
        if (next) next.focus();
      }
    });

    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) {
        e.preventDefault();
        close(true);
      }
    });

    // Close when focus or a tap leaves the switch
    box.addEventListener('focusout', function (e) {
      if (!box.contains(e.relatedTarget)) close(false);
    });
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target)) close(false);
    });
  }

  // --- Reveal ---

  function reveal() {
    root.classList.remove('i18n-pending');
  }

  function onReady() {
    try {
      apply(document);
    } finally {
      reveal();
    }
  }

  if (root.classList.contains('i18n-pending')) {
    // Never leave the page blank if something below fails or loads slowly
    setTimeout(reveal, REVEAL_TIMEOUT_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  PV.i18n = {
    lang: lang,
    langs: LANGS,
    locale: LANGS[lang].locale,
    add: add,
    t: t,
    plural: plural,
    number: number,
    apply: apply,
    setLang: setLang,
  };
})();
