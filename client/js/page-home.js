// ===========================
// page-home.js — Home page API integration
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var featuredGrid = document.getElementById('featuredGrid');
  var teamGrid = document.getElementById('teamGrid');

  // --- Load home data ---

  async function loadHome() {
    // Show spinners while loading
    if (featuredGrid) featuredGrid.innerHTML = PV.render.spinner();
    if (teamGrid) teamGrid.innerHTML = PV.render.spinner();

    try {
      var res = await PV.api.get('/api/home');
      var data = res.data;

      // Featured properties
      if (featuredGrid) {
        var props = data.featuredProperties || [];
        if (props.length === 0) {
          featuredGrid.innerHTML = PV.render.emptyState('Trenutno nema istaknutih nekretnina.');
        } else {
          featuredGrid.innerHTML = props.map(function (item) {
            return '<div class="col-lg-4 col-md-6">' + PV.render.propertyCard(item) + '</div>';
          }).join('');
        }
      }

      // Team preview
      if (teamGrid) {
        var agents = data.teamPreview || [];
        if (agents.length > 0) {
          teamGrid.innerHTML = agents.map(function (agent) {
            return '<div class="col-lg-4 col-md-6">' + PV.render.agentCard(agent) + '</div>';
          }).join('');
        } else {
          // No agents — hide the entire team section
          var teamSection = teamGrid.closest('section') || teamGrid.closest('.team-section');
          if (teamSection) {
            teamSection.style.display = 'none';
          } else {
            teamGrid.innerHTML = '';
          }
        }
      }
    } catch (err) {
      if (featuredGrid) featuredGrid.innerHTML = PV.render.errorState(err.message);
      if (teamGrid) teamGrid.innerHTML = PV.render.errorState(err.message);
    }
  }

  // --- Hero search: Lokacija (city → districts) + Tip dropdowns, then redirect ---

  var TYPE_CHIPS = PV.maps.propertyType.chips;
  var TYPE_LABELS = { stan: 'Stan', kuca: 'Kuća', plac: 'Plac', zemljiste: 'Zemljište', poslovni: 'Poslovni prostor', garaza: 'Garaža' };

  // Same rule as the listing chips: these always, any other type only when the feed has it
  var CORE_TYPES = {
    sale: ['stan', 'kuca', 'plac', 'zemljiste', 'poslovni'],
    rent: ['stan', 'kuca', 'poslovni'],
  };

  function readPrice(form, name) {
    var input = form.querySelector('input[name="' + name + '"]');
    var value = input ? Math.round(Number(input.value)) : 0;
    return value > 0 ? value : 0;
  }

  function setupSearchForm(form) {
    var transactionType = form.dataset.transaction === 'rent' ? 'rent' : 'sale';
    var state = { type: '', location: { city: '', hoods: [] } };
    var presentTypes = [];

    var picker = PV.ui.locationPicker(form.querySelector('.js-location'), {
      label: 'Lokacija',
      placeholder: 'Grad ili deo grada',
      onChange: function (val) { state.location = val; },
    });

    var typeSelect = PV.ui.select(form.querySelector('.js-type'), {
      label: 'Tip',
      placeholder: 'Sve',
      allOption: 'Sve',
      searchFrom: 99,
      onChange: function (val) {
        state.type = val;
        loadOptions(); // location counts follow the type
      },
    });

    function typeOptions() {
      return Object.keys(TYPE_CHIPS).filter(function (val) {
        return CORE_TYPES[transactionType].indexOf(val) !== -1 ||
          TYPE_CHIPS[val].some(function (k) { return presentTypes.indexOf(k) !== -1; });
      }).map(function (val) {
        return { value: val, label: TYPE_LABELS[val] };
      });
    }

    // Without an answer the picker just lists nothing; the search itself still works
    var request = 0;
    async function loadOptions() {
      var id = ++request;
      try {
        var res = await PV.api.get('/api/filter-options', {
          transactionType: transactionType,
          propertyType: state.type ? TYPE_CHIPS[state.type] : [],
        });
        if (id !== request) return;
        presentTypes = res.data.propertyTypes.map(function (t) { return t.key; });
        picker.setCities(res.data.cities);
        typeSelect.setOptions(typeOptions());
      } catch (err) {
        // keep the dropdowns as they are
      }
    }

    typeSelect.setOptions(typeOptions());
    loadOptions();

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var params = new URLSearchParams();
      params.set('transactionType', transactionType);
      if (state.type) TYPE_CHIPS[state.type].forEach(function (k) { params.append('propertyType', k); });
      if (state.location.city) {
        params.set('city', state.location.city);
        state.location.hoods.forEach(function (h) { params.append('hood', h); });
      }

      // Price range — the listing page reads priceMin / priceMax from the URL
      var priceMin = readPrice(form, 'priceMin');
      var priceMax = readPrice(form, 'priceMax');
      if (priceMin && priceMax && priceMin > priceMax) {
        var tmp = priceMin;
        priceMin = priceMax;
        priceMax = tmp;
      }
      if (priceMin) params.set('priceMin', priceMin);
      if (priceMax) params.set('priceMax', priceMax);

      window.location.href = 'nekretnine.html?' + params.toString();
    });
  }

  function setupSearchForms() {
    document.querySelectorAll('.search-form').forEach(setupSearchForm);
  }

  // --- Init ---

  document.addEventListener('DOMContentLoaded', function () {
    loadHome();
    setupSearchForms();
  });
})();
