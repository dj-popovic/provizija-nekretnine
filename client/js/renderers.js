// ===========================
// PV.render — Shared HTML generators & value maps
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  // --- Value mappings (English API ↔ Serbian UI) ---

  var maps = {
    transactionType: {
      toApi: { prodaja: 'sale', iznajmljivanje: 'rent' },
      toUi:  { sale: 'Prodaja', rent: 'Iznajmljivanje' },
    },
    propertyType: {
      toApi: {
        stan: 'apartment',
        kuca: 'house',
        poslovni: 'commercial',
        zemljiste: 'land',
      },
      toUi: {
        apartment: 'Stan',
        house: 'Kuća',
        commercial: 'Poslovni prostor',
        land: 'Zemljište',
      },
    },
  };

  // --- Price formatter ---

  function formatPrice(price, transactionType) {
    if (price == null) return 'Cena na upit';
    var formatted = Number(price).toLocaleString('de-DE');
    if (transactionType === 'rent') {
      return formatted + ' \u20AC/mes.';
    }
    return formatted + ' \u20AC';
  }

  // --- Build detail page URL ---

  function propertyHref(item) {
    return 'nekretnina-detalj.html?id=' + encodeURIComponent(item.slug + '-' + item.id);
  }

  function agentHref(agent) {
    return 'agent-detalj.html?slug=' + encodeURIComponent(agent.slug);
  }

  // --- Escape HTML to prevent XSS ---

  function esc(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  // --- Property card (matches .property-card in nekretnine.html) ---

  function propertyCard(item) {
    var img = item.images && item.images.length
      ? item.images[0]
      : { url: 'images/placeholder-property.jpg', alt: item.title || 'Nekretnina' };

    var isRent = item.transactionType === 'rent';
    var badgeClass = isRent ? 'property-badge badge-rent' : 'property-badge';
    var badgeText = maps.transactionType.toUi[item.transactionType] || '';
    var href = propertyHref(item);

    var features = '';
    if (item.area != null) {
      features += '<div class="feature"><i class="bi bi-grid-3x3" aria-hidden="true"></i> ' + esc(item.area) + ' m\u00B2</div>';
    }
    if (item.rooms != null) {
      features += '<div class="feature"><i class="bi bi-door-open" aria-hidden="true"></i> ' + esc(item.rooms) + ' sobe</div>';
    }

    return (
      '<article class="property-card">' +
        '<a href="' + esc(href) + '" aria-label="' + esc(item.title) + '">' +
          '<div class="property-image">' +
            '<img src="' + esc(img.url) + '" alt="' + esc(img.alt) + '" loading="lazy" width="600" height="280">' +
            '<span class="' + badgeClass + '">' + esc(badgeText) + '</span>' +
          '</div>' +
        '</a>' +
        '<div class="property-details">' +
          '<div class="property-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ' + esc(item.location) + '</div>' +
          '<h3 class="property-title"><a href="' + esc(href) + '" style="text-decoration:none;color:inherit;">' + esc(item.title) + '</a></h3>' +
          '<div class="property-price-inline">' + formatPrice(item.price, item.transactionType) + '</div>' +
          '<div class="property-features">' + features + '</div>' +
        '</div>' +
      '</article>'
    );
  }

  // --- Agent card (matches .team-card in agenti.html) ---

  function agentCard(agent) {
    var photo = agent.photo || 'images/placeholder-agent.jpg';
    var href = agentHref(agent);

    var contactLinks =
      '<a href="' + esc(href) + '" aria-label="Pogledaj profil \u2013 ' + esc(agent.fullName) + '"><i class="bi bi-person"></i></a>';
    if (agent.phone) {
      contactLinks += '<a href="tel:' + esc(agent.phone) + '" aria-label="Pozovi ' + esc(agent.fullName) + '"><i class="bi bi-telephone"></i></a>';
    }
    if (agent.email) {
      contactLinks += '<a href="mailto:' + esc(agent.email) + '" aria-label="Email ' + esc(agent.fullName) + '"><i class="bi bi-envelope"></i></a>';
    }

    return (
      '<article class="team-card">' +
        '<div class="team-photo">' +
          '<img src="' + esc(photo) + '" alt="' + esc(agent.fullName) + '" loading="lazy" width="400" height="320">' +
        '</div>' +
        '<div class="team-info">' +
          '<div class="team-name">' + esc(agent.fullName) + '</div>' +
          (agent.shortBio ? '<p class="team-bio">' + esc(agent.shortBio) + '</p>' : '') +
          '<div class="team-contact">' + contactLinks + '</div>' +
        '</div>' +
      '</article>'
    );
  }

  // --- Pagination ---

  function pagination(pg) {
    if (!pg || pg.totalPages <= 1) return '';

    var html = '<nav class="pv-pagination" aria-label="Stranice">';
    html += '<ul class="pagination justify-content-center">';

    // Previous
    if (pg.page > 1) {
      html += '<li class="page-item"><a class="page-link" href="#" data-page="' + (pg.page - 1) + '" aria-label="Prethodna">&laquo;</a></li>';
    }

    // Page numbers — show max 5 centered around current
    var start = Math.max(1, pg.page - 2);
    var end = Math.min(pg.totalPages, start + 4);
    start = Math.max(1, end - 4);

    for (var i = start; i <= end; i++) {
      var active = i === pg.page ? ' active' : '';
      html += '<li class="page-item' + active + '"><a class="page-link" href="#" data-page="' + i + '">' + i + '</a></li>';
    }

    // Next
    if (pg.page < pg.totalPages) {
      html += '<li class="page-item"><a class="page-link" href="#" data-page="' + (pg.page + 1) + '" aria-label="Sledeća">&raquo;</a></li>';
    }

    html += '</ul></nav>';
    return html;
  }

  // --- States: spinner, empty, error ---

  function spinner() {
    return (
      '<div class="pv-spinner text-center py-5">' +
        '<div class="spinner-border text-secondary" role="status">' +
          '<span class="visually-hidden">Učitavanje...</span>' +
        '</div>' +
      '</div>'
    );
  }

  function emptyState(msg) {
    return (
      '<div class="pv-empty text-center py-5">' +
        '<i class="bi bi-inbox" style="font-size:3rem;color:#ccc;" aria-hidden="true"></i>' +
        '<p class="mt-3 text-muted">' + esc(msg || 'Nema rezultata.') + '</p>' +
      '</div>'
    );
  }

  function errorState(msg) {
    return (
      '<div class="pv-error text-center py-5">' +
        '<i class="bi bi-exclamation-triangle" style="font-size:3rem;color:#dc3545;" aria-hidden="true"></i>' +
        '<p class="mt-3 text-danger">' + esc(msg || 'Došlo je do greške. Pokušajte ponovo.') + '</p>' +
      '</div>'
    );
  }

  // --- Public API ---

  PV.maps = maps;

  PV.render = {
    propertyCard: propertyCard,
    agentCard: agentCard,
    pagination: pagination,
    spinner: spinner,
    emptyState: emptyState,
    errorState: errorState,
    formatPrice: formatPrice,
    propertyHref: propertyHref,
    agentHref: agentHref,
    esc: esc,
  };
})();
