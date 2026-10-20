// ===========================
// PV.ui — Custom dropdowns for the filters
//
// PV.ui.select(container, opts)          one or several choices, optional search and counts
// PV.ui.locationPicker(container, opts)  city → districts in one two-step panel (home hero)
//
// Desktop: a panel under the field (flips up when there is no room below).
// Phones (≤575px): the same panel slides up as a bottom sheet.
// Keyboard: ↑ ↓ Home End move, Enter / Space choose, Esc closes, ← back (picker).
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var esc = PV.render.esc;
  var sheetQuery = window.matchMedia('(max-width: 575.98px)');
  var uid = 0;
  var openShell = null;

  function nextId() {
    uid += 1;
    return 'pv-dd-' + uid;
  }

  // Search ignores case and diacritics: "cenej" finds "Čenej", "dj" finds "Đ"
  function fold(str) {
    return String(str).toLowerCase()
      .replace(/đ/g, 'dj')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function countHtml(count) {
    return typeof count === 'number' ? '<span class="pv-dd-count">' + count + '</span>' : '';
  }

  function searchHtml(id, placeholder, value) {
    return '<div class="pv-dd-search">' +
      '<i class="bi bi-search" aria-hidden="true"></i>' +
      '<input type="text" id="' + id + '" autocomplete="off" spellcheck="false" placeholder="' + esc(placeholder) +
      '" aria-label="' + esc(placeholder) + '" value="' + esc(value) + '">' +
      '</div>';
  }

  function footerHtml() {
    return '<div class="pv-dd-footer">' +
      '<button type="button" class="pv-dd-clear">Očisti</button>' +
      '<button type="button" class="pv-dd-done">Gotovo</button>' +
      '</div>';
  }

  // One closed-field text for a multi choice: "Telep", "Telep, Grbavica", "Telep +2"
  function summaryHtml(labels) {
    if (labels.length <= 2) return '<span class="pv-dd-text">' + esc(labels.join(', ')) + '</span>';
    return '<span class="pv-dd-text">' + esc(labels[0]) + '</span><span class="pv-dd-more">+' + (labels.length - 1) + '</span>';
  }

  // ---------------------------------------------------------------------------
  // Shell — trigger, panel, open / close, outside click, keyboard navigation
  // ---------------------------------------------------------------------------

  function createShell(container, opts) {
    var panelId = nextId();
    container.classList.add('pv-dd');
    container.innerHTML =
      '<button type="button" class="pv-dd-trigger" aria-haspopup="' + opts.popup + '" aria-expanded="false" aria-controls="' + panelId + '">' +
        '<span class="pv-dd-value"></span>' +
        '<i class="bi bi-chevron-down pv-dd-caret" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="pv-dd-backdrop" aria-hidden="true"></div>' +
      '<div class="pv-dd-panel" id="' + panelId + '">' +
        '<div class="pv-dd-sheet-head">' +
          '<span class="pv-dd-sheet-title">' + esc(opts.label) + '</span>' +
          '<button type="button" class="pv-dd-close" aria-label="Zatvori"><i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
        '</div>' +
        '<div class="pv-dd-body"></div>' +
      '</div>';

    var trigger = container.querySelector('.pv-dd-trigger');
    var panel = container.querySelector('.pv-dd-panel');
    var shell = {
      root: container,
      trigger: trigger,
      valueEl: container.querySelector('.pv-dd-value'),
      panel: panel,
      body: container.querySelector('.pv-dd-body'),
      isOpen: false,
      open: open,
      close: close,
      setActive: setActive,
      activateSelected: activateSelected,
      focusInside: focusInside,
    };
    if (opts.ariaLabel) trigger.setAttribute('aria-label', opts.ariaLabel);

    function open() {
      if (shell.isOpen || trigger.disabled) return;
      if (openShell) openShell.close(false);
      openShell = shell;
      shell.isOpen = true;
      opts.onOpen();
      container.classList.toggle('is-up', shouldFlipUp());
      container.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      if (sheetQuery.matches) document.documentElement.classList.add('pv-dd-locked');
      focusInside();
    }

    function close(returnFocus) {
      if (!shell.isOpen) return;
      shell.isOpen = false;
      if (openShell === shell) openShell = null;
      container.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('pv-dd-locked');
      if (returnFocus) trigger.focus();
      if (opts.onClose) opts.onClose();
    }

    // Open upwards only when the panel doesn't fit below but fits better above
    function shouldFlipUp() {
      if (sheetQuery.matches) return false;
      var rect = trigger.getBoundingClientRect();
      var below = window.innerHeight - rect.bottom;
      var needed = panel.offsetHeight + 16;
      return below < needed && rect.top > below;
    }

    // Phones get the list focused, not the search box, so the keyboard doesn't pop up
    function focusInside() {
      var search = panel.querySelector('.pv-dd-search input');
      var list = panel.querySelector('.pv-dd-list');
      var target = search && !sheetQuery.matches ? search : list;
      if (target) target.focus({ preventScroll: true });
    }

    function options() {
      // Disabled options (0 listings) are skipped by the keyboard
      return Array.prototype.slice.call(panel.querySelectorAll('.pv-dd-option:not([aria-disabled="true"])'));
    }

    function setActive(el, scroll) {
      options().forEach(function (o) { o.classList.toggle('is-active', o === el); });
      var list = panel.querySelector('.pv-dd-list');
      var search = panel.querySelector('.pv-dd-search input');
      [list, search].forEach(function (node) {
        if (!node) return;
        if (el) node.setAttribute('aria-activedescendant', el.id);
        else node.removeAttribute('aria-activedescendant');
      });
      if (el && scroll && list) scrollIntoList(list, el);
    }

    // Scroll only the list (scrollIntoView could also scroll the page)
    function scrollIntoList(list, el) {
      var top = el.offsetTop;
      var bottom = top + el.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
    }

    function activateSelected() {
      var selected = panel.querySelector('.pv-dd-option[aria-selected="true"]');
      setActive(selected || options()[0] || null, true);
    }

    function move(step) {
      var items = options();
      if (!items.length) return;
      var current = items.indexOf(panel.querySelector('.pv-dd-option.is-active'));
      var next;
      if (step === 'first') next = 0;
      else if (step === 'last') next = items.length - 1;
      else next = current < 0 ? 0 : Math.min(items.length - 1, Math.max(0, current + step));
      setActive(items[next], true);
    }

    trigger.addEventListener('click', function () {
      if (shell.isOpen) close(false); else open();
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        open();
      } else if (e.key === 'Escape' && shell.isOpen) {
        e.preventDefault();
        close(true);
      }
    });

    panel.addEventListener('keydown', function (e) {
      var inSearch = e.target.matches('.pv-dd-search input');
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if ((e.key === 'Home' || e.key === 'End') && !inSearch) {
        e.preventDefault();
        move(e.key === 'Home' ? 'first' : 'last');
      } else if (e.key === 'Enter' || (e.key === ' ' && !inSearch)) {
        var active = panel.querySelector('.pv-dd-option.is-active');
        if (active && e.target.closest('.pv-dd-list, .pv-dd-search')) {
          e.preventDefault();
          active.click();
        }
      } else if (opts.onKey) {
        opts.onKey(e, inSearch);
      }
    });

    // Keep the focus where it is (search box / list) while clicking an option
    panel.addEventListener('mousedown', function (e) {
      if (e.target.closest('.pv-dd-option')) e.preventDefault();
    });

    panel.addEventListener('mouseover', function (e) {
      var option = e.target.closest('.pv-dd-option');
      if (option && !option.classList.contains('is-active') && option.getAttribute('aria-disabled') !== 'true') setActive(option, false);
    });

    container.querySelector('.pv-dd-close').addEventListener('click', function () { close(true); });
    container.querySelector('.pv-dd-backdrop').addEventListener('click', function () { close(false); });

    // Tabbing out of the field closes it
    container.addEventListener('focusout', function (e) {
      if (shell.isOpen && e.relatedTarget && !container.contains(e.relatedTarget)) close(false);
    });

    return shell;
  }

  // A click anywhere else closes the open panel
  document.addEventListener('pointerdown', function (e) {
    if (openShell && !openShell.root.contains(e.target)) openShell.close(false);
  });

  // ---------------------------------------------------------------------------
  // Select
  //
  // opts: label, placeholder, multiple, allOption (single: a first "all" choice
  //       with value ''), searchPlaceholder, searchFrom (show search from this
  //       many options, default 9), emptyText, onChange(value)
  // option: { value, label, short (closed-field text), hint, count }
  // ---------------------------------------------------------------------------

  function select(container, opts) {
    var multiple = !!opts.multiple;
    var value = multiple ? [] : '';
    var items = [];
    var query = '';
    var disabledText = '';
    var searchFrom = opts.searchFrom || 9;
    var listId = nextId();

    var shell = createShell(container, {
      label: opts.label,
      ariaLabel: opts.ariaLabel || opts.label,
      popup: 'listbox',
      onOpen: renderPanel,
      onClose: function () { query = ''; },
    });

    function allItems() {
      return !multiple && opts.allOption ? [{ value: '', label: opts.allOption }].concat(items) : items;
    }

    function isSelected(v) {
      return multiple ? value.indexOf(v) !== -1 : value === v;
    }

    function findItem(v) {
      for (var i = 0; i < items.length; i++) if (items[i].value === v) return items[i];
      return null;
    }

    function renderTrigger() {
      var html;
      var placeholder = false;
      if (shell.trigger.disabled && disabledText) {
        html = '<span class="pv-dd-text">' + esc(disabledText) + '</span>';
        placeholder = true;
      } else if (multiple && value.length) {
        html = summaryHtml(value.map(function (v) { var it = findItem(v); return it ? it.label : v; }));
      } else if (!multiple && value !== '') {
        var it = findItem(value);
        html = '<span class="pv-dd-text">' + esc(it ? (it.short || it.label) : value) + '</span>';
      } else {
        html = '<span class="pv-dd-text">' + esc(opts.placeholder) + '</span>';
        placeholder = true;
      }
      shell.valueEl.innerHTML = html;
      shell.root.classList.toggle('has-value', !placeholder);
    }

    function optionHtml(item, i) {
      var selected = isSelected(item.value);
      // 0 listings for this choice with the rest of the panel: dimmed and not pickable
      // (a choice that is already selected stays enabled, so it can be removed)
      var muted = item.count === 0 && !selected;
      return '<li class="pv-dd-option' + (muted ? ' is-muted" aria-disabled="true' : '') + '" role="option" id="' + listId + '-' + i +
        '" data-index="' + i + '" aria-selected="' + selected + '">' +
        (multiple ? '<span class="pv-dd-check" aria-hidden="true"><i class="bi bi-check-lg"></i></span>' : '') +
        '<span class="pv-dd-label">' + esc(item.label) +
          (item.hint ? '<span class="pv-dd-hint">' + esc(item.hint) + '</span>' : '') +
        '</span>' +
        countHtml(item.count) +
        (multiple ? '' : '<i class="bi bi-check2 pv-dd-tick" aria-hidden="true"></i>') +
        '</li>';
    }

    function renderList() {
      var list = shell.body.querySelector('.pv-dd-list');
      var all = allItems();
      var q = fold(query.trim());
      var html = '';
      all.forEach(function (item, i) {
        if (!q || fold(item.label).indexOf(q) !== -1) html += optionHtml(item, i);
      });
      list.innerHTML = html || '<li class="pv-dd-empty">' + esc(opts.emptyText || 'Nema rezultata') + '</li>';
      shell.activateSelected();
    }

    function renderPanel() {
      var searchable = allItems().length >= searchFrom;
      shell.body.innerHTML =
        (searchable ? searchHtml(listId + '-search', opts.searchPlaceholder || 'Pretraži', query) : '') +
        '<ul class="pv-dd-list" id="' + listId + '" role="listbox" tabindex="-1" aria-label="' + esc(opts.label) + '"' +
        (multiple ? ' aria-multiselectable="true"' : '') + '></ul>' +
        (multiple ? footerHtml() : '');
      renderList();
      var search = shell.body.querySelector('.pv-dd-search input');
      if (search) {
        search.setAttribute('aria-controls', listId);
        search.addEventListener('input', function () {
          query = search.value;
          renderList();
        });
      }
    }

    function emit() {
      renderTrigger();
      if (opts.onChange) opts.onChange(api.getValue());
    }

    shell.body.addEventListener('click', function (e) {
      var option = e.target.closest('.pv-dd-option');
      if (option) {
        if (option.getAttribute('aria-disabled') === 'true') return;
        var item = allItems()[Number(option.dataset.index)];
        if (multiple) {
          var at = value.indexOf(item.value);
          if (at === -1) value.push(item.value); else value.splice(at, 1);
          option.setAttribute('aria-selected', String(at === -1));
          option.classList.remove('is-muted');
          emit();
        } else {
          value = item.value;
          emit();
          shell.close(true);
        }
        return;
      }
      if (e.target.closest('.pv-dd-clear')) {
        value = [];
        emit();
        renderList();
        shell.focusInside();
      } else if (e.target.closest('.pv-dd-done')) {
        shell.close(true);
      }
    });

    var api = {
      el: container,
      getValue: function () { return multiple ? value.slice() : value; },
      setValue: function (v) {
        value = multiple ? (v || []).slice() : (v == null ? '' : String(v));
        renderTrigger();
        if (shell.isOpen) renderList();
      },
      setOptions: function (list) {
        items = list || [];
        renderTrigger();
        if (shell.isOpen) renderPanel();
      },
      setDisabled: function (disabled, text) {
        shell.trigger.disabled = !!disabled;
        disabledText = disabled ? (text || '') : '';
        shell.root.classList.toggle('is-disabled', !!disabled);
        if (disabled) shell.close(false);
        renderTrigger();
      },
      close: function () { shell.close(false); },
    };

    renderTrigger();
    return api;
  }

  // ---------------------------------------------------------------------------
  // Location picker — step 1: cities, step 2: that city's districts
  //
  // opts: label, placeholder, onChange({ city, hoods })
  // cities: [{ name, count, hoods: [{ name, count }] }] from /api/filter-options
  // ---------------------------------------------------------------------------

  function locationPicker(container, opts) {
    var cities = [];
    var value = { city: '', hoods: [] };
    var view = 'cities';
    var viewCity = null;
    var query = '';
    var listId = nextId();

    var shell = createShell(container, {
      label: opts.label,
      ariaLabel: opts.label,
      popup: 'dialog',
      onOpen: function () {
        // Reopening with a chosen city goes straight to its districts
        var current = findCity(value.city);
        if (current && current.hoods.length) showHoods(current, false); else showCities(false);
      },
      onClose: function () { query = ''; },
      onKey: function (e, inSearch) {
        if (inSearch) return;
        if (e.key === 'ArrowLeft' && view === 'hoods') {
          e.preventDefault();
          showCities(true);
        } else if (e.key === 'ArrowRight' && view === 'cities') {
          var active = shell.panel.querySelector('.pv-dd-option.is-active');
          var city = active && findCity(active.dataset.city);
          if (city && city.hoods.length) {
            e.preventDefault();
            showHoods(city, true);
          }
        }
      },
    });
    container.classList.add('pv-dd--picker');

    function findCity(name) {
      if (!name) return null;
      var key = name.toLowerCase();
      for (var i = 0; i < cities.length; i++) if (cities[i].name.toLowerCase() === key) return cities[i];
      return null;
    }

    function renderTrigger() {
      var html;
      if (value.hoods.length) html = summaryHtml(value.hoods);
      else if (value.city) html = '<span class="pv-dd-text">' + esc(value.city) + '</span>';
      else html = '<span class="pv-dd-text">' + esc(opts.placeholder) + '</span>';
      shell.valueEl.innerHTML = html;
      shell.root.classList.toggle('has-value', !!value.city);
    }

    function setView(html, animate, direction) {
      shell.body.innerHTML = '<div class="pv-dd-view' + (animate ? ' is-entering-' + direction : '') + '">' + html + '</div>';
      shell.activateSelected();
      var search = shell.body.querySelector('.pv-dd-search input');
      if (search) {
        search.setAttribute('aria-controls', listId);
        search.addEventListener('input', function () {
          query = search.value;
          renderHoodList();
        });
      }
      if (animate) shell.focusInside();
    }

    function showCities(animate) {
      view = 'cities';
      viewCity = null;
      query = '';
      var html = '<li class="pv-dd-option" role="option" id="' + listId + '-all" data-city="" aria-selected="' + !value.city + '">' +
        '<span class="pv-dd-label">Sve lokacije</span><i class="bi bi-check2 pv-dd-tick" aria-hidden="true"></i></li>';
      cities.forEach(function (city, i) {
        var selected = value.city.toLowerCase() === city.name.toLowerCase();
        html += '<li class="pv-dd-option' + (city.count === 0 && !selected ? ' is-muted" aria-disabled="true' : '') + '" role="option" id="' + listId + '-c' + i +
          '" data-city="' + esc(city.name) + '" aria-selected="' + selected + '">' +
          '<span class="pv-dd-label">' + esc(city.name) +
          (selected && value.hoods.length ? '<span class="pv-dd-hint">' + esc(value.hoods.join(', ')) + '</span>' : '') +
          '</span>' + countHtml(city.count) +
          (city.hoods.length ? '<i class="bi bi-chevron-right pv-dd-next" aria-hidden="true"></i>' : '<i class="bi bi-check2 pv-dd-tick" aria-hidden="true"></i>') +
          '</li>';
      });
      setView('<ul class="pv-dd-list" id="' + listId + '" role="listbox" tabindex="-1" aria-label="Grad">' + html + '</ul>', animate, 'back');
    }

    function hoodListHtml() {
      var city = viewCity;
      var sameCity = value.city.toLowerCase() === city.name.toLowerCase();
      var q = fold(query.trim());
      var html = '';
      if (!q) {
        html += '<li class="pv-dd-option pv-dd-option--whole" role="option" id="' + listId + '-whole" data-whole="1" aria-selected="' + (sameCity && !value.hoods.length) + '">' +
          '<span class="pv-dd-label">Ceo grad<span class="pv-dd-hint">' + esc(city.name) + '</span></span>' + countHtml(city.count) +
          '<i class="bi bi-check2 pv-dd-tick" aria-hidden="true"></i></li>';
      }
      city.hoods.forEach(function (hood, i) {
        if (q && fold(hood.name).indexOf(q) === -1) return;
        var selected = sameCity && value.hoods.indexOf(hood.name) !== -1;
        html += '<li class="pv-dd-option' + (hood.count === 0 && !selected ? ' is-muted" aria-disabled="true' : '') + '" role="option" id="' + listId + '-h' + i +
          '" data-hood="' + esc(hood.name) + '" aria-selected="' + selected + '">' +
          '<span class="pv-dd-check" aria-hidden="true"><i class="bi bi-check-lg"></i></span>' +
          '<span class="pv-dd-label">' + esc(hood.name) + '</span>' + countHtml(hood.count) + '</li>';
      });
      return html || '<li class="pv-dd-empty">Nema rezultata</li>';
    }

    function renderHoodList() {
      shell.body.querySelector('.pv-dd-list').innerHTML = hoodListHtml();
      shell.activateSelected();
    }

    function showHoods(city, animate) {
      view = 'hoods';
      viewCity = city;
      query = '';
      setView(
        '<div class="pv-dd-subhead">' +
          '<button type="button" class="pv-dd-back"><i class="bi bi-chevron-left" aria-hidden="true"></i> Gradovi</button>' +
          '<span class="pv-dd-subtitle">' + esc(city.name) + '</span>' +
        '</div>' +
        (city.hoods.length >= 8 ? searchHtml(listId + '-search', 'Pretraži deo grada', '') : '') +
        '<ul class="pv-dd-list" id="' + listId + '" role="listbox" tabindex="-1" aria-multiselectable="true" aria-label="Deo grada – ' + esc(city.name) + '">' +
          hoodListHtml() +
        '</ul>' +
        footerHtml(),
        animate, 'forward'
      );
    }

    function emit() {
      renderTrigger();
      if (opts.onChange) opts.onChange(api.getValue());
    }

    shell.body.addEventListener('click', function (e) {
      var option = e.target.closest('.pv-dd-option');
      if (option && option.getAttribute('aria-disabled') === 'true') return;
      if (e.target.closest('.pv-dd-back')) {
        showCities(true);
      } else if (option && view === 'cities') {
        var city = findCity(option.dataset.city);
        if (city && city.hoods.length) {
          showHoods(city, true);
        } else {
          value = { city: city ? city.name : '', hoods: [] };
          emit();
          shell.close(true);
        }
      } else if (option && option.dataset.whole) {
        value = { city: viewCity.name, hoods: [] };
        emit();
        shell.close(true);
      } else if (option) {
        var name = option.dataset.hood;
        if (value.city.toLowerCase() !== viewCity.name.toLowerCase()) value = { city: viewCity.name, hoods: [] };
        var at = value.hoods.indexOf(name);
        if (at === -1) value.hoods.push(name); else value.hoods.splice(at, 1);
        option.setAttribute('aria-selected', String(at === -1));
        option.classList.remove('is-muted');
        var whole = shell.body.querySelector('.pv-dd-option--whole');
        if (whole) whole.setAttribute('aria-selected', String(!value.hoods.length));
        emit();
      } else if (e.target.closest('.pv-dd-clear')) {
        value = { city: '', hoods: [] };
        emit();
        renderHoodList();
        shell.focusInside();
      } else if (e.target.closest('.pv-dd-done')) {
        shell.close(true);
      }
    });

    var api = {
      el: container,
      getValue: function () { return { city: value.city, hoods: value.hoods.slice() }; },
      setValue: function (v) {
        value = { city: (v && v.city) || '', hoods: ((v && v.hoods) || []).slice() };
        renderTrigger();
      },
      setCities: function (list) {
        cities = list || [];
        if (shell.isOpen) {
          var current = viewCity && findCity(viewCity.name);
          if (current) showHoods(current, false); else showCities(false);
        }
      },
      close: function () { shell.close(false); },
    };

    renderTrigger();
    return api;
  }

  PV.ui = {
    select: select,
    locationPicker: locationPicker,
  };
})();
