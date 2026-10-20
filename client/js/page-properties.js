// ===========================
// page-properties.js — Property listing page
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var esc = PV.render.esc;

  // --- DOM refs ---
  var grid = document.getElementById('propertiesGrid');
  var paginationWrap = document.getElementById('paginationWrap');
  var resultsCount = document.getElementById('resultsCount');
  var resultsNoun = document.getElementById('resultsNoun');
  var btnSearch = document.getElementById('btnSearch');
  var btnReset = document.getElementById('btnReset');
  var priceMinEl = document.getElementById('priceMin');
  var priceMaxEl = document.getElementById('priceMax');
  var sqmMinEl = document.getElementById('sqmMin');
  var sqmMaxEl = document.getElementById('sqmMax');
  var areaLabel = document.getElementById('areaLabel');
  var areaUnit = document.getElementById('areaUnit');
  var moreWrap = document.getElementById('moreFilters');
  var moreInner = document.getElementById('moreFiltersInner');
  var btnMore = document.getElementById('btnMoreFilters');
  var moreBadge = document.getElementById('moreFiltersBadge');
  var yearMinEl = document.getElementById('yearMin');
  var yearMaxEl = document.getElementById('yearMax');
  var plotMinEl = document.getElementById('plotMin');
  var plotMaxEl = document.getElementById('plotMax');

  var TYPE_CHIPS = PV.maps.propertyType.chips;

  // Chips always shown on a tab; any other chip only when the feed has that type
  var CORE_CHIPS = {
    sale: ['stan', 'kuca', 'plac', 'zemljiste', 'poslovni'],
    rent: ['stan', 'kuca', 'poslovni'],
    new: ['stan', 'kuca', 'poslovni'],
  };

  // Plots and farmland: no rooms, area in ares
  var LAND_TYPES = ['plot', 'land'];

  // --- Rooms: the feed stores a studio (garsonjera) as 0.5 rooms ---
  var ROOM_WORDS = {
    1: 'jednosoban', 1.5: 'jednoiposoban', 2: 'dvosoban', 2.5: 'dvoiposoban',
    3: 'trosoban', 3.5: 'troiposoban', 4: 'četvorosoban', 4.5: 'četvoroiposoban', 5: 'petosoban',
  };

  function roomOptions(isMax) {
    var steps = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    return steps.map(function (n) {
      if (n === 0.5) return { value: '0.5', label: 'Garsonjera' };
      // "Od 5+" also finds the big houses (7, 8, 10 rooms)
      var open = n === 5 && !isMax;
      return {
        value: String(n),
        label: String(n).replace('.', ',') + (open ? '+' : ''),
        hint: open ? 'petosoban i više' : ROOM_WORDS[n],
      };
    });
  }

  // Floor 0 = prizemlje; "Od 10+" reaches the towers
  function floorOptions(isMax) {
    var list = [{ value: '0', label: 'Prizemlje' }];
    for (var n = 1; n <= 10; n++) {
      list.push({ value: String(n), label: n === 10 && !isMax ? '10+' : String(n) });
    }
    return list;
  }

  var BATH_OPTIONS = [1, 2, 3, 4].map(function (n) {
    return { value: String(n), label: n + '+', hint: n === 1 ? 'kupatilo' : 'kupatila' };
  });

  var SORT_OPTIONS = [
    { value: 'newest', label: 'Najnovije' },
    { value: 'priceAsc', label: 'Cena: od najniže' },
    { value: 'priceDesc', label: 'Cena: od najviše' },
  ];

  // --- "Više filtera" chip groups (#16) ---
  // Amenities and infrastructure both set the `feature` param (all of them must be present).
  var AMENITY_KEYS = [
    'elevator', 'terrace', 'parking', 'garage_space', 'basement', 'storage', 'salon',
    'duplex', 'penthouse', 'villa', 'luxury', 'pool', 'pet_friendly', 'move_in_ready', 'mortgage_eligible',
  ];
  var INFRA_KEYS = ['paved_road', 'city_water', 'city_sewage', 'building_permit', 'location_permit', 'occupancy_permit'];

  var CHIP_GROUPS = {
    heating: {
      state: 'heating', counts: 'heating', labels: PV.maps.heating.toUi, extraFromCounts: true,
      keys: ['central', 'gas', 'underfloor', 'solid_fuel', 'norwegian_radiators', 'storage_heater'],
    },
    furnished: {
      state: 'furnished', counts: 'furnished', labels: PV.maps.furnished.toUi,
      keys: ['furnished', 'semi_furnished', 'empty'],
    },
    construction: {
      state: 'construction', counts: 'construction', labels: PV.maps.construction.toUi,
      keys: ['new', 'under_construction', 'old'],
    },
    condition: {
      state: 'condition', counts: 'condition', labels: PV.maps.condition.toUi,
      keys: ['original', 'renovated', 'needs_renovation'],
    },
    feature: {
      state: 'features', counts: 'feature', labels: PV.maps.feature.toUi, icons: PV.maps.feature.icon,
      keys: AMENITY_KEYS,
    },
    infra: {
      state: 'features', counts: 'feature', labels: PV.maps.feature.toUi, icons: PV.maps.feature.icon,
      keys: INFRA_KEYS,
    },
    equipment: {
      state: 'equipment', counts: 'equipment', labels: PV.maps.equipment.toUi, icons: PV.maps.equipment.icon,
      keys: ['air_conditioning', 'internet', 'cable_tv', 'intercom', 'video_intercom', 'video_surveillance'],
    },
  };

  // Filter state key → URL / API param name (lists become repeated params)
  var PARAM_NAMES = { propertyTypes: 'propertyType', hoods: 'hood', features: 'feature' };
  var NUMBER_KEYS = [
    'roomsMin', 'roomsMax', 'priceMin', 'priceMax', 'areaMin', 'areaMax', 'landAreaMin', 'landAreaMax',
    'bathroomsMin', 'floorMin', 'floorMax', 'yearMin', 'yearMax',
  ];
  var FLAG_KEYS = ['newBuild', 'notGroundFloor', 'notTopFloor', 'registered'];
  var LIST_KEYS = ['heating', 'furnished', 'construction', 'condition', 'features', 'equipment'];

  // --- Filter state ---
  // tab: 'sale' | 'rent' | 'new' (Novogradnja = new builds for sale)
  function emptyFilters(tab, sort) {
    var f = {
      transactionType: tab === 'rent' ? 'rent' : 'sale',
      newBuild: tab === 'new',
      propertyTypes: [],
      city: undefined,
      hoods: [],
      notGroundFloor: false,
      notTopFloor: false,
      registered: false,
      page: 1,
      sort: sort || 'newest',
    };
    NUMBER_KEYS.forEach(function (k) { f[k] = undefined; });
    LIST_KEYS.forEach(function (k) { f[k] = []; });
    return f;
  }

  var filters = emptyFilters('sale');

  function tabKey() {
    return filters.newBuild ? 'new' : filters.transactionType;
  }

  // Last /api/filter-options answer (cities → districts, present types, value counts)
  var options = { propertyTypes: [], cities: [], counts: {} };
  var optionsLoaded = false;

  // Dropdowns
  var ui = {};

  function isLandMode() {
    return filters.propertyTypes.length > 0 && filters.propertyTypes.every(function (k) {
      return LAND_TYPES.indexOf(k) !== -1;
    });
  }

  // The chip whose keys cover the given types ("commercial" alone → the Poslovni prostor chip)
  function chipFor(types) {
    if (!types.length) return 'sve';
    var vals = Object.keys(TYPE_CHIPS);
    for (var i = 0; i < vals.length; i++) {
      var keys = TYPE_CHIPS[vals[i]];
      if (types.every(function (t) { return keys.indexOf(t) !== -1; })) return vals[i];
    }
    return null;
  }

  function findCity(name) {
    if (!name) return null;
    var key = name.toLowerCase();
    for (var i = 0; i < options.cities.length; i++) {
      if (options.cities[i].name.toLowerCase() === key) return options.cities[i];
    }
    return null;
  }

  function numberParam(params, key) {
    var raw = params.get(key);
    var n = raw === null || raw === '' ? NaN : Number(raw);
    return isFinite(n) ? n : undefined;
  }

  // --- Read URL params into filter state ---
  function readUrlParams() {
    var params = new URLSearchParams(window.location.search);
    var tab = params.get('newBuild') === 'true' ? 'new' : (params.get('transactionType') === 'rent' ? 'rent' : 'sale');
    filters = emptyFilters(tab, params.get('sort') || 'newest');

    var types = params.getAll('propertyType').filter(Boolean);
    var chip = chipFor(types);
    filters.propertyTypes = chip && chip !== 'sve' ? TYPE_CHIPS[chip].slice() : types;

    filters.city = params.get('city') || undefined;
    filters.hoods = filters.city ? params.getAll('hood').filter(Boolean) : [];

    NUMBER_KEYS.forEach(function (key) { filters[key] = numberParam(params, key); });
    ['notGroundFloor', 'notTopFloor', 'registered'].forEach(function (key) {
      filters[key] = params.get(key) === 'true' || params.get(key) === '1';
    });
    LIST_KEYS.forEach(function (key) {
      filters[key] = params.getAll(PARAM_NAMES[key] || key).filter(Boolean);
    });
    filters.page = numberParam(params, 'page') || 1;
  }

  // State → params object (lists as arrays, switches only when on)
  function toParams(f) {
    var p = {};
    Object.keys(f).forEach(function (key) {
      var val = f[key];
      if (val === false) return;
      p[PARAM_NAMES[key] || key] = val;
    });
    return p;
  }

  // The panel exactly as it is on screen (typed values included, ranges in order),
  // even before "Pretraži" — the filter-options counts follow it
  function panelParams() {
    var f = Object.assign({}, filters);
    readInputsInto(f);
    orderRanges(f);
    return toParams(f);
  }

  // --- Sync filter state to URL (arrays as repeated params) ---
  function syncUrl() {
    var params = new URLSearchParams();
    var p = toParams(filters);
    Object.keys(p).forEach(function (key) {
      if ((key === 'page' && p[key] === 1) || (key === 'sort' && p[key] === 'newest')) return;
      [].concat(p[key]).forEach(function (v) {
        if (v !== undefined && v !== null && v !== '') params.append(key, v);
      });
    });
    var qs = params.toString();
    history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
  }

  // --- Sync UI controls to match filter state ---
  function syncUiToFilters() {
    // Subnav tabs
    var tab = tabKey();
    document.querySelectorAll('.properties-subnav .nav-link').forEach(function (link) {
      var isActive = link.dataset.type === tab;
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    syncTypeChips();
    syncLandMode();
    renderLocationOptions();

    ui.roomsMin.setValue(filters.roomsMin !== undefined ? String(filters.roomsMin) : '');
    ui.roomsMax.setValue(filters.roomsMax !== undefined ? String(filters.roomsMax) : '');
    ui.sort.setValue(filters.sort);

    // Numeric inputs — the area pair holds ares for plots / farmland
    var land = isLandMode();
    setInput(priceMinEl, filters.priceMin);
    setInput(priceMaxEl, filters.priceMax);
    setInput(sqmMinEl, land ? filters.landAreaMin : filters.areaMin);
    setInput(sqmMaxEl, land ? filters.landAreaMax : filters.areaMax);

    syncMoreFilters();
  }

  function setInput(el, val) {
    if (el) el.value = val !== undefined ? val : '';
  }

  // Type chips: active state, which ones are shown on this tab, and which are dimmed
  // (no listing of that type with the rest of the panel, e.g. no Plac in Telep)
  function syncTypeChips() {
    var active = chipFor(filters.propertyTypes);
    var core = CORE_CHIPS[tabKey()] || CORE_CHIPS.sale;
    var counts = {};
    options.propertyTypes.forEach(function (t) { counts[t.key] = t.count; });
    document.querySelectorAll('.filter-chip[data-filter="tip"]').forEach(function (chip) {
      var val = chip.dataset.val;
      var isActive = val === active;
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      if (val === 'sve') return;
      var keys = TYPE_CHIPS[val];
      var inFeed = keys.some(function (k) { return k in counts; });
      chip.hidden = !(core.indexOf(val) !== -1 || inFeed || isActive);
      var empty = optionsLoaded && !isActive && keys.every(function (k) { return !counts[k]; });
      chip.classList.toggle('is-muted', empty);
      chip.disabled = empty;
    });
  }

  // Plots / farmland: rooms off, area in ares
  function syncLandMode() {
    var land = isLandMode();
    if (areaLabel) areaLabel.textContent = land ? 'Površina (ari)' : 'Kvadratura (m²)';
    if (areaUnit) areaUnit.textContent = land ? 'ar' : 'm²';
    if (sqmMinEl) { sqmMinEl.step = land ? '1' : '5'; sqmMinEl.setAttribute('aria-label', land ? 'Površina od (ari)' : 'Kvadratura od'); }
    if (sqmMaxEl) { sqmMaxEl.step = land ? '1' : '5'; sqmMaxEl.setAttribute('aria-label', land ? 'Površina do (ari)' : 'Kvadratura do'); }
    ui.roomsMin.setDisabled(land, '—');
    ui.roomsMax.setDisabled(land, '—');
  }

  // City and district dropdowns from the last filter-options answer.
  // A choice from the URL that is no longer in the feed stays shown with 0.
  function renderLocationOptions() {
    var cityItems = options.cities.map(function (c) {
      return { value: c.name, label: c.name, count: c.count };
    });
    var city = findCity(filters.city);
    if (city) filters.city = city.name; // the feed's own spelling
    else if (filters.city) cityItems.push({ value: filters.city, label: filters.city, count: 0 });
    ui.city.setOptions(cityItems);
    ui.city.setValue(filters.city || '');

    if (!filters.city) {
      ui.hood.setOptions([]);
      ui.hood.setValue([]);
      ui.hood.setDisabled(true, 'Prvo izaberite grad');
      return;
    }
    var hoodItems = (city ? city.hoods : []).map(function (h) {
      return { value: h.name, label: h.name, count: h.count };
    });
    filters.hoods.forEach(function (name) {
      var known = hoodItems.some(function (h) { return h.value === name; });
      if (!known) hoodItems.push({ value: name, label: name, count: 0 });
    });
    ui.hood.setOptions(hoodItems);
    ui.hood.setValue(filters.hoods);
    if (hoodItems.length) ui.hood.setDisabled(false);
    else ui.hood.setDisabled(true, optionsLoaded ? 'Nema delova grada' : 'Učitavanje…');
  }

  // ===========================
  // "Više filtera" (#16)
  // ===========================

  // Which groups fit the chosen type (data-scope in the HTML)
  function scopeVisible(scope) {
    var types = filters.propertyTypes;
    var land = isLandMode();
    function anyOf(list) {
      return !types.length || types.some(function (t) { return list.indexOf(t) !== -1; });
    }
    return scope.split(' ').every(function (s) {
      if (s === 'building') return !land;
      if (s === 'apartment') return anyOf(['apartment']);
      if (s === 'plot') return !land && anyOf(['house']);
      if (s === 'infra') return anyOf(['house', 'plot', 'land']);
      if (s === 'not-new') return !filters.newBuild;
      return true; // 'all'
    });
  }

  // A group that no longer fits the type drops its values, so nothing invisible filters
  function clearHiddenValues() {
    if (!scopeVisible('building')) {
      filters.bathroomsMin = filters.yearMin = filters.yearMax = undefined;
      ['heating', 'furnished', 'construction', 'condition', 'equipment'].forEach(function (k) { filters[k] = []; });
      filters.features = filters.features.filter(function (k) { return INFRA_KEYS.indexOf(k) !== -1; });
    }
    if (!scopeVisible('apartment')) {
      filters.floorMin = filters.floorMax = undefined;
      filters.notGroundFloor = filters.notTopFloor = false;
    }
    if (!scopeVisible('infra')) {
      filters.features = filters.features.filter(function (k) { return INFRA_KEYS.indexOf(k) === -1; });
    }
    if (!scopeVisible('not-new')) filters.construction = [];
    if (!scopeVisible('plot') && !isLandMode()) filters.landAreaMin = filters.landAreaMax = undefined;
  }

  // A muted chip (no listing has that value) is disabled: clicking it does nothing
  function chipHtml(group, key, label, icon, selected, muted) {
    return '<button type="button" class="filter-chip filter-chip--toggle' + (selected ? ' active' : '') + (muted ? ' is-muted' : '') +
      '" data-group="' + group + '" data-key="' + esc(key) + '" aria-pressed="' + selected + '"' + (muted ? ' disabled' : '') + '>' +
      (icon ? '<i class="bi ' + icon + '" aria-hidden="true"></i>' : '') + esc(label) + '</button>';
  }

  function renderMoreChips() {
    var counts = options.counts || {};
    Object.keys(CHIP_GROUPS).forEach(function (name) {
      var group = CHIP_GROUPS[name];
      var box = moreWrap.querySelector('.filter-chips[data-group="' + name + '"]');
      if (!box) return;
      var groupCounts = counts[group.counts] || {};
      var keys = group.keys.slice();
      // Heating values RELPER sends that have no key yet still get a chip (in Serbian)
      if (group.extraFromCounts) {
        Object.keys(groupCounts).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
      }
      if (name === 'heating' || name === 'furnished') {
        filters[group.state].forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
      }
      box.innerHTML = keys.map(function (k) {
        var selected = filters[group.state].indexOf(k) !== -1;
        return chipHtml(name, k, group.labels[k] || k, group.icons && group.icons[k], selected, optionsLoaded && !groupCounts[k] && !selected);
      }).join('');
    });

    var registeredCount = (counts.registration || {}).registered;
    moreWrap.querySelector('.filter-chips[data-group="registered"]').innerHTML =
      chipHtml('registered', 'registered', 'Samo uknjižene', 'bi-patch-check', filters.registered, optionsLoaded && !registeredCount && !filters.registered);

    document.getElementById('floorChips').innerHTML =
      chipHtml('floor', 'notGroundFloor', 'Nije prizemlje', '', filters.notGroundFloor, false) +
      chipHtml('floor', 'notTopFloor', 'Nije poslednji sprat', '', filters.notTopFloor, false);
  }

  // How many extra filters are set — the gold badge on "Više filtera"
  function moreCount() {
    var n = 0;
    if (filters.bathroomsMin !== undefined) n++;
    if (filters.floorMin !== undefined || filters.floorMax !== undefined) n++;
    if (filters.notGroundFloor) n++;
    if (filters.notTopFloor) n++;
    if (filters.yearMin !== undefined || filters.yearMax !== undefined) n++;
    if (!isLandMode() && (filters.landAreaMin !== undefined || filters.landAreaMax !== undefined)) n++;
    if (filters.registered) n++;
    LIST_KEYS.forEach(function (k) { n += filters[k].length; });
    return n;
  }

  function updateBadge() {
    var n = moreCount();
    moreBadge.hidden = n === 0;
    moreBadge.textContent = n;
    moreBadge.setAttribute('aria-label', n + ' aktivnih');
  }

  function syncMoreFilters() {
    moreWrap.querySelectorAll('[data-scope]').forEach(function (el) {
      el.hidden = !scopeVisible(el.dataset.scope);
    });
    ui.bath.setValue(filters.bathroomsMin !== undefined ? String(filters.bathroomsMin) : '');
    ui.floorMin.setValue(filters.floorMin !== undefined ? String(filters.floorMin) : '');
    ui.floorMax.setValue(filters.floorMax !== undefined ? String(filters.floorMax) : '');
    setInput(yearMinEl, filters.yearMin);
    setInput(yearMaxEl, filters.yearMax);
    var land = isLandMode();
    setInput(plotMinEl, land ? undefined : filters.landAreaMin);
    setInput(plotMaxEl, land ? undefined : filters.landAreaMax);
    renderMoreChips();
    updateBadge();
  }

  // Open / close in place. The panel's height animates (grid rows 0fr → 1fr);
  // once open it stops clipping, so dropdowns inside can hang out of it.
  var moreOpen = false;
  var settleTimer = null;

  function setMoreOpen(open, instant) {
    moreOpen = open;
    clearTimeout(settleTimer);
    btnMore.setAttribute('aria-expanded', open ? 'true' : 'false');
    btnMore.querySelector('.btn-more-filters-text').textContent = open ? 'Manje filtera' : 'Više filtera';
    moreWrap.classList.remove('is-settled');
    moreWrap.classList.toggle('is-instant', !!instant);
    moreWrap.classList.toggle('is-open', open);
    if (open) {
      moreInner.removeAttribute('inert');
      // transitionend can be missed (reduced motion, older browsers): settle anyway
      settleTimer = setTimeout(function () { if (moreOpen) moreWrap.classList.add('is-settled'); }, instant ? 0 : 420);
    } else {
      moreInner.setAttribute('inert', '');
      ['bath', 'floorMin', 'floorMax'].forEach(function (k) { ui[k].close(); });
    }
  }

  function setupMoreFilters() {
    btnMore.addEventListener('click', function () { setMoreOpen(!moreOpen, false); });

    moreWrap.addEventListener('transitionend', function (e) {
      if (e.target === moreWrap && moreOpen) moreWrap.classList.add('is-settled');
    });

    moreWrap.addEventListener('click', function (e) {
      var chip = e.target.closest('.filter-chip--toggle');
      if (!chip || chip.disabled) return;
      var group = chip.dataset.group;
      var key = chip.dataset.key;
      var on;
      if (group === 'registered') {
        on = filters.registered = !filters.registered;
      } else if (group === 'floor') {
        on = filters[key] = !filters[key];
      } else {
        var list = filters[CHIP_GROUPS[group].state];
        var at = list.indexOf(key);
        if (at === -1) list.push(key); else list.splice(at, 1);
        on = at === -1;
      }
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      updateBadge();
      scheduleOptions();
    });
  }

  // --- Filter options: counts follow the whole panel as it is on screen ---
  var optionsRequest = 0;
  var optionsTimer = null;

  // Clicks and typing come in bursts: ask once they pause
  function scheduleOptions() {
    clearTimeout(optionsTimer);
    optionsTimer = setTimeout(loadOptions, 200);
  }

  async function loadOptions() {
    clearTimeout(optionsTimer);
    var id = ++optionsRequest;
    try {
      var res = await PV.api.get('/api/filter-options', panelParams());
      if (id !== optionsRequest) return;
      options = res.data;
    } catch (err) {
      if (id !== optionsRequest) return;
      options = { propertyTypes: [], cities: [], counts: {} }; // dropdowns still show what is chosen
    }
    optionsLoaded = true;
    syncTypeChips();
    renderLocationOptions();
    renderMoreChips();
  }

  // --- Fetch and render ---
  var listRequest = 0;

  async function fetchAndRender() {
    var id = ++listRequest;
    if (grid) grid.innerHTML = PV.render.spinner();
    if (paginationWrap) paginationWrap.innerHTML = '';
    if (resultsCount) resultsCount.textContent = '…';

    syncUrl();

    try {
      var res = await PV.api.get('/api/properties', toParams(filters));
      if (id !== listRequest) return;
      var items = res.items || [];
      var pg = res.pagination;

      // Results count
      var total = pg ? pg.total : items.length;
      if (resultsCount) resultsCount.textContent = total;
      if (resultsNoun) resultsNoun.textContent = PV.render.plural(total, 'nekretnina', 'nekretnine', 'nekretnina');

      // Cards
      if (items.length === 0) {
        grid.innerHTML = PV.render.emptyState('Nema nekretnina za zadate filtere.');
      } else {
        grid.innerHTML = items.map(function (item) {
          return '<div class="col-lg-4 col-md-6">' + PV.render.propertyCard(item) + '</div>';
        }).join('');
      }

      // Pagination
      if (paginationWrap && pg) {
        paginationWrap.innerHTML = PV.render.pagination(pg);
        paginationWrap.querySelectorAll('[data-page]').forEach(function (link) {
          link.addEventListener('click', function (e) {
            e.preventDefault();
            filters.page = Number(this.dataset.page);
            fetchAndRender();
            // Scroll to top of grid
            var filterSection = document.querySelector('.filter-section');
            if (filterSection) filterSection.scrollIntoView({ behavior: PV.render.prefersReducedMotion() ? 'auto' : 'smooth' });
          });
        });
      }
    } catch (err) {
      if (id !== listRequest) return;
      if (grid) grid.innerHTML = PV.render.errorState(err.message);
      if (resultsCount) resultsCount.textContent = '-';
    }
  }

  // --- Dropdowns ---
  function setupDropdowns() {
    ui.city = PV.ui.select(document.getElementById('citySelect'), {
      label: 'Grad',
      placeholder: 'Svi gradovi',
      allOption: 'Svi gradovi',
      searchPlaceholder: 'Pretraži grad',
      onChange: function (val) {
        filters.city = val || undefined;
        filters.hoods = [];
        renderLocationOptions();
        scheduleOptions();
      },
    });

    ui.hood = PV.ui.select(document.getElementById('hoodSelect'), {
      label: 'Deo grada',
      placeholder: 'Svi delovi grada',
      multiple: true,
      searchFrom: 8,
      searchPlaceholder: 'Pretraži deo grada',
      onChange: function (val) {
        filters.hoods = val;
        scheduleOptions();
      },
    });

    function numberSelect(id, opts, key, items) {
      ui[opts.name] = PV.ui.select(document.getElementById(id), {
        label: opts.label,
        placeholder: opts.placeholder,
        allOption: 'Svejedno',
        searchFrom: 99,
        onChange: function (val) {
          filters[key] = val ? Number(val) : undefined;
          updateBadge();
          scheduleOptions();
        },
      });
      ui[opts.name].setOptions(items);
    }

    numberSelect('roomsMinSelect', { name: 'roomsMin', label: 'Broj soba od', placeholder: 'Od' }, 'roomsMin', roomOptions(false));
    numberSelect('roomsMaxSelect', { name: 'roomsMax', label: 'Broj soba do', placeholder: 'Do' }, 'roomsMax', roomOptions(true));
    numberSelect('bathSelect', { name: 'bath', label: 'Kupatila', placeholder: 'Svejedno' }, 'bathroomsMin', BATH_OPTIONS);
    numberSelect('floorMinSelect', { name: 'floorMin', label: 'Sprat od', placeholder: 'Od' }, 'floorMin', floorOptions(false));
    numberSelect('floorMaxSelect', { name: 'floorMax', label: 'Sprat do', placeholder: 'Do' }, 'floorMax', floorOptions(true));

    ui.sort = PV.ui.select(document.getElementById('sortSelect'), {
      label: 'Sortiraj',
      placeholder: 'Najnovije',
      searchFrom: 99,
      onChange: function (val) {
        filters.sort = val || 'newest';
        applyFilters();
      },
    });
    ui.sort.setOptions(SORT_OPTIONS);
  }

  // --- Wire up subnav tabs: sale, rent and new builds are different markets, so a tab starts clean ---
  function setupSubnav() {
    document.querySelectorAll('.properties-subnav .nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        if (this.dataset.type === tabKey()) return;
        filters = emptyFilters(this.dataset.type, filters.sort);
        options = { propertyTypes: [], cities: [], counts: {} };
        optionsLoaded = false;
        syncUiToFilters();
        loadOptions();
        fetchAndRender();
      });
    });
  }

  // --- Wire up type chips ---
  function setupTypeChips() {
    document.querySelectorAll('.filter-chip[data-filter="tip"]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var wasLand = isLandMode();
        var val = this.dataset.val;
        readInputsInto(filters); // keep what was typed (the area pair is read in the old unit)
        filters.propertyTypes = val === 'sve' ? [] : TYPE_CHIPS[val].slice();

        // m² and ares are different numbers: switching between them clears the pair
        if (wasLand !== isLandMode()) {
          filters.areaMin = filters.areaMax = filters.landAreaMin = filters.landAreaMax = undefined;
          setInput(sqmMinEl, undefined);
          setInput(sqmMaxEl, undefined);
        }
        if (isLandMode()) {
          filters.roomsMin = filters.roomsMax = undefined;
          ui.roomsMin.setValue('');
          ui.roomsMax.setValue('');
        }
        clearHiddenValues();

        syncTypeChips();
        syncLandMode();
        syncMoreFilters();
        loadOptions(); // counts follow the type
      });
    });
  }

  function readNumber(el) {
    if (!el || el.value === '') return undefined;
    var n = Number(el.value);
    return isFinite(n) && n >= 0 ? n : undefined;
  }

  // Every typed field into a filter object. The main area pair holds ares for
  // plots / farmland; otherwise the plot-area pair in "Više filtera" does.
  function readInputsInto(f) {
    var land = isLandMode();
    f.priceMin = readNumber(priceMinEl);
    f.priceMax = readNumber(priceMaxEl);
    f.areaMin = land ? undefined : readNumber(sqmMinEl);
    f.areaMax = land ? undefined : readNumber(sqmMaxEl);
    f.landAreaMin = readNumber(land ? sqmMinEl : plotMinEl);
    f.landAreaMax = readNumber(land ? sqmMaxEl : plotMaxEl);
    f.yearMin = readNumber(yearMinEl);
    f.yearMax = readNumber(yearMaxEl);
  }

  // "Od 200.000 Do 100.000" is read as the same range typed the other way round
  var RANGE_PAIRS = [
    ['priceMin', 'priceMax'], ['areaMin', 'areaMax'], ['landAreaMin', 'landAreaMax'],
    ['roomsMin', 'roomsMax'], ['floorMin', 'floorMax'], ['yearMin', 'yearMax'],
  ];

  function orderRanges(f) {
    RANGE_PAIRS.forEach(function (pair) {
      var min = pair[0];
      var max = pair[1];
      if (f[min] !== undefined && f[max] !== undefined && f[min] > f[max]) {
        var tmp = f[min];
        f[min] = f[max];
        f[max] = tmp;
      }
    });
  }

  // Read the typed values, then search
  function applyFilters() {
    readInputsInto(filters);
    orderRanges(filters);
    filters.page = 1;
    syncUiToFilters();
    fetchAndRender();
  }

  // --- Wire up search/reset buttons and the typed fields ---
  function setupButtons() {
    if (btnSearch) btnSearch.addEventListener('click', applyFilters);

    // Enter searches; typing updates the badge and (after a pause) the dimmed choices
    [priceMinEl, priceMaxEl, sqmMinEl, sqmMaxEl, yearMinEl, yearMaxEl, plotMinEl, plotMaxEl].forEach(function (el) {
      if (!el) return;
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') applyFilters();
      });
      el.addEventListener('input', function () {
        readInputsInto(filters);
        updateBadge();
        scheduleOptions();
      });
    });

    if (btnReset) {
      btnReset.addEventListener('click', function () {
        filters = emptyFilters(tabKey(), filters.sort); // keep the tab and the order
        syncUiToFilters();
        loadOptions();
        fetchAndRender();
      });
    }
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', function () {
    setupDropdowns();
    readUrlParams();
    syncUiToFilters();
    setupSubnav();
    setupTypeChips();
    setupMoreFilters();
    setupButtons();
    // A link that already carries extra filters opens the section, without animation
    if (moreCount() > 0) setMoreOpen(true, true);
    loadOptions();
    fetchAndRender();
  });
})();
