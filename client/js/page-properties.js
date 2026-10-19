// ===========================
// page-properties.js — Property listing page
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

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

  // --- Location chip value → API location string ---
  var locationMap = {
    grbavica: 'Grbavica',
    liman: 'Liman',
    petrovaradin: 'Petrovaradin',
    stari: 'Stari Grad',
    detelinara: 'Detelinara',
    sajam: 'Sajam',
    adice: 'Adice',
  };

  // --- Room chip value → API rooms value (the feed stores a studio as 0.5 rooms) ---
  function roomsFromChip(val) {
    return val === 'garsonjera' ? 0.5 : Number(val);
  }

  // --- Filter state ---
  var filters = {
    transactionType: undefined,
    propertyType: undefined,
    location: undefined,
    rooms: undefined,
    priceMin: undefined,
    priceMax: undefined,
    areaMin: undefined,
    areaMax: undefined,
    page: 1,
    sort: 'newest',
  };

  // --- Read URL params into filter state ---
  function readUrlParams() {
    var params = new URLSearchParams(window.location.search);
    filters.transactionType = params.get('transactionType') || undefined;
    filters.propertyType = params.get('propertyType') || undefined;
    filters.location = params.get('location') || undefined;
    filters.rooms = params.get('rooms') ? Number(params.get('rooms')) : undefined;
    filters.priceMin = params.get('priceMin') ? Number(params.get('priceMin')) : undefined;
    filters.priceMax = params.get('priceMax') ? Number(params.get('priceMax')) : undefined;
    filters.areaMin = params.get('areaMin') ? Number(params.get('areaMin')) : undefined;
    filters.areaMax = params.get('areaMax') ? Number(params.get('areaMax')) : undefined;
    filters.page = params.get('page') ? Number(params.get('page')) : 1;
    filters.sort = params.get('sort') || 'newest';
  }

  // --- Sync filter state to URL ---
  function syncUrl() {
    var params = new URLSearchParams();
    Object.keys(filters).forEach(function (key) {
      var val = filters[key];
      if (val !== undefined && val !== null && val !== '' && !(key === 'page' && val === 1) && !(key === 'sort' && val === 'newest')) {
        params.set(key, val);
      }
    });
    var qs = params.toString();
    var newUrl = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', newUrl);
  }

  // --- Sync UI controls to match filter state ---
  function syncUiToFilters() {
    // Subnav tabs
    document.querySelectorAll('.properties-subnav .nav-link').forEach(function (link) {
      var type = link.dataset.type;
      var isActive = type === (filters.transactionType || 'sale');
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Property type chips
    syncChipGroup('tip', function (val) {
      if (val === 'sve') return !filters.propertyType;
      return PV.maps.propertyType.toApi[val] === filters.propertyType;
    });

    // Location chips
    syncChipGroup('lok', function (val) {
      if (val === 'sve') return !filters.location;
      return locationMap[val] === filters.location;
    });

    // Room chips
    syncChipGroup('sobe', function (val) {
      if (val === 'sve') return filters.rooms === undefined;
      return roomsFromChip(val) === filters.rooms;
    });

    // Numeric inputs
    if (priceMinEl) priceMinEl.value = filters.priceMin || '';
    if (priceMaxEl) priceMaxEl.value = filters.priceMax || '';
    if (sqmMinEl) sqmMinEl.value = filters.areaMin || '';
    if (sqmMaxEl) sqmMaxEl.value = filters.areaMax || '';
  }

  function syncChipGroup(filterName, isActiveFn) {
    document.querySelectorAll('.filter-chip[data-filter="' + filterName + '"]').forEach(function (chip) {
      setChipActive(chip, isActiveFn(chip.dataset.val));
    });
  }

  function setChipActive(chip, isActive) {
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }

  // --- Fetch and render ---
  async function fetchAndRender() {
    if (grid) grid.innerHTML = PV.render.spinner();
    if (paginationWrap) paginationWrap.innerHTML = '';
    if (resultsCount) resultsCount.textContent = '...';

    syncUrl();

    try {
      var res = await PV.api.get('/api/properties', filters);
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
        // Attach click handlers
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
      if (grid) grid.innerHTML = PV.render.errorState(err.message);
      if (resultsCount) resultsCount.textContent = '-';
    }
  }

  // --- Wire up subnav tabs ---
  function setupSubnav() {
    document.querySelectorAll('.properties-subnav .nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var type = this.dataset.type;
        filters.transactionType = type;
        filters.page = 1;
        syncUiToFilters();
        fetchAndRender();
      });
    });
  }

  // --- Wire up filter chips ---
  function setupFilterChips() {
    document.querySelectorAll('.filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var group = this.dataset.filter;
        var val = this.dataset.val;

        // Activate this chip in its group
        var self = this;
        document.querySelectorAll('.filter-chip[data-filter="' + group + '"]').forEach(function (c) {
          setChipActive(c, c === self);
        });

        // Update filter state
        if (group === 'tip') {
          filters.propertyType = val === 'sve' ? undefined : (PV.maps.propertyType.toApi[val] || undefined);
        } else if (group === 'lok') {
          filters.location = val === 'sve' ? undefined : (locationMap[val] || undefined);
        } else if (group === 'sobe') {
          filters.rooms = val === 'sve' ? undefined : roomsFromChip(val);
        }

        filters.page = 1;
      });
    });
  }

  // "Od 200.000 Do 100.000" is read as the same range typed the other way round
  function orderRange(minKey, maxKey) {
    if (filters[minKey] !== undefined && filters[maxKey] !== undefined && filters[minKey] > filters[maxKey]) {
      var tmp = filters[minKey];
      filters[minKey] = filters[maxKey];
      filters[maxKey] = tmp;
    }
  }

  // --- Wire up search/reset buttons ---
  function setupButtons() {
    if (btnSearch) {
      btnSearch.addEventListener('click', function () {
        // Read numeric inputs
        filters.priceMin = priceMinEl && priceMinEl.value ? Number(priceMinEl.value) : undefined;
        filters.priceMax = priceMaxEl && priceMaxEl.value ? Number(priceMaxEl.value) : undefined;
        filters.areaMin = sqmMinEl && sqmMinEl.value ? Number(sqmMinEl.value) : undefined;
        filters.areaMax = sqmMaxEl && sqmMaxEl.value ? Number(sqmMaxEl.value) : undefined;
        orderRange('priceMin', 'priceMax');
        orderRange('areaMin', 'areaMax');
        filters.page = 1;
        syncUiToFilters();
        fetchAndRender();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', function () {
        filters.transactionType = filters.transactionType; // keep current tab
        filters.propertyType = undefined;
        filters.location = undefined;
        filters.rooms = undefined;
        filters.priceMin = undefined;
        filters.priceMax = undefined;
        filters.areaMin = undefined;
        filters.areaMax = undefined;
        filters.page = 1;
        syncUiToFilters();
        fetchAndRender();
      });
    }
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', function () {
    readUrlParams();

    // Default to sale if no transactionType
    if (!filters.transactionType) filters.transactionType = 'sale';

    syncUiToFilters();
    setupSubnav();
    setupFilterChips();
    setupButtons();
    fetchAndRender();
  });
})();
