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

  // --- Hero search form redirect ---

  function readPrice(form, name) {
    var input = form.querySelector('input[name="' + name + '"]');
    var value = input ? Math.round(Number(input.value)) : 0;
    return value > 0 ? value : 0;
  }

  function setupSearchForms() {
    var forms = document.querySelectorAll('.search-form');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var params = new URLSearchParams();

        // Transaction type from hidden input
        var tipOglasa = form.querySelector('input[name="tip_oglasa"]');
        if (tipOglasa) {
          var mapped = PV.maps.transactionType.toApi[tipOglasa.value];
          if (mapped) params.set('transactionType', mapped);
        }

        // Location
        var lokacija = form.querySelector('input[name="lokacija"]');
        if (lokacija && lokacija.value.trim()) {
          params.set('location', lokacija.value.trim());
        }

        // Property type
        var tip = form.querySelector('select[name="tip"]');
        if (tip && tip.value) {
          var ptMap = {
            'Stan': 'apartment',
            'Kuća': 'house',
            'Apartman': 'apartment',
            'Plac': 'plot',
            'Zemljište': 'land',
            'Poslovni prostor': 'commercial',
          };
          var ptVal = ptMap[tip.value];
          if (ptVal) params.set('propertyType', ptVal);
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

        var qs = params.toString();
        window.location.href = 'nekretnine.html' + (qs ? '?' + qs : '');
      });
    });
  }

  // --- Init ---

  document.addEventListener('DOMContentLoaded', function () {
    loadHome();
    setupSearchForms();
  });
})();
