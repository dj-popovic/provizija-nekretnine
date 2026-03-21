// ===========================
// page-property.js — Property detail page
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var esc = PV.render.esc;
  var formatPrice = PV.render.formatPrice;
  var maps = PV.maps;

  var contentWrap = document.getElementById('propertyContent');

  // --- Read slug-id from ?id= query param ---

  function getSlugId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id') || null;
  }

  // --- Build gallery HTML ---

  function buildGallery(images) {
    if (!images || images.length === 0) {
      return '<div class="col-lg-7"><div style="height:420px;border-radius:12px;background:var(--bg-light);display:flex;align-items:center;justify-content:center;"><i class="bi bi-image" style="font-size:4rem;color:#ccc;" aria-hidden="true"></i></div></div>';
    }

    var main = images[0];
    var html = '<div class="col-lg-7">';
    html += '<img src="' + esc(main.url) + '" alt="' + esc(main.alt) + '" class="detail-gallery-main" loading="eager" width="900" height="420" id="mainPhoto" style="height:420px;border-radius:12px 12px 0 0;width:100%;object-fit:cover;display:block;">';

    if (images.length > 1) {
      html += '<div class="detail-gallery-thumbs">';
      for (var i = 1; i < images.length; i++) {
        var img = images[i];
        html += '<img src="' + esc(img.url) + '" alt="' + esc(img.alt) + '" loading="lazy" width="400" height="100" data-full="' + esc(img.url) + '" data-alt="' + esc(img.alt) + '">';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // --- Build specs panel ---

  function buildSpecs(p) {
    var rows = '';

    if (p.propertyType) {
      rows += specRow('Tip', maps.propertyType.toUi[p.propertyType] || p.propertyType);
    }
    if (p.area != null) {
      rows += specRow('Površina', p.area + ' m\u00B2');
    }
    if (p.rooms != null) {
      rows += specRow('Sobe', p.rooms);
    }
    if (p.bathrooms != null) {
      rows += specRow('Kupatila', p.bathrooms);
    }
    if (p.floor != null) {
      rows += specRow('Sprat', p.floor);
    }
    if (p.heating) {
      rows += specRow('Grejanje', p.heating);
    }
    if (p.furnished != null) {
      rows += specRow('Nameštenost', p.furnished);
    }
    if (p.elevator != null) {
      rows += specRow('Lift', p.elevator ? 'Da' : 'Ne');
    }
    if (p.registrationStatus) {
      var regMap = {
        registered: 'Uknjiženo',
        unregisterable: 'Neuknjiživo',
        in_progress: 'U procesu',
      };
      rows += specRow('Uknjižba', regMap[p.registrationStatus] || p.registrationStatus);
    }

    if (!rows) {
      rows = '<p class="text-muted" style="font-size:14px;">Nema dostupnih specifikacija.</p>';
    }

    return (
      '<div class="col-lg-5">' +
        '<div class="detail-specs" style="background:var(--bg-light);border-radius:12px;padding:28px;height:100%;">' +
          '<h4>Specifikacije</h4>' +
          rows +
        '</div>' +
      '</div>'
    );
  }

  function specRow(label, value) {
    return '<div class="spec-row"><span class="spec-label">' + esc(label) + '</span><span class="spec-value">' + esc(value) + '</span></div>';
  }

  // --- Build feature chips ---

  function buildFeatures(p) {
    var chips = '';

    if (p.area != null) {
      chips += featureChip('bi-grid-3x3', p.area + ' m\u00B2');
    }
    if (p.rooms != null) {
      chips += featureChip('bi-door-open', p.rooms + ' sobe');
    }
    if (p.bathrooms != null) {
      chips += featureChip('bi-water', p.bathrooms + ' kupatila');
    }
    if (p.floor != null) {
      chips += featureChip('bi-building', p.floor + '. sprat');
    }

    // Highlights
    var highlights = p.highlights || [];
    var iconMap = {
      'Parking': 'bi-car-front',
      'Terasa': 'bi-sun',
      'Lift': 'bi-arrow-up-circle',
      'Garaža': 'bi-car-front',
      'Klima': 'bi-snow',
      'Centralno': 'bi-thermometer-half',
      'Podrum': 'bi-box',
    };
    for (var i = 0; i < highlights.length; i++) {
      var icon = iconMap[highlights[i]] || 'bi-check-circle';
      chips += featureChip(icon, highlights[i]);
    }

    // Transaction type badge
    if (p.transactionType) {
      var badgeText = maps.transactionType.toUi[p.transactionType] || p.transactionType;
      chips += '<div class="detail-feature" style="background:rgba(201,162,39,.1);padding:9px 16px;border-radius:8px;font-size:14px;color:var(--accent);font-weight:700;"><span class="property-badge" style="position:static;font-size:12px;">' + esc(badgeText) + '</span></div>';
    }

    return chips;
  }

  function featureChip(icon, text) {
    return '<div class="detail-feature" style="background:var(--bg-light);padding:9px 16px;border-radius:8px;font-size:14px;"><i class="bi ' + icon + '" aria-hidden="true"></i> ' + esc(text) + '</div>';
  }

  // --- Build agent card ---

  function buildAgent(agent, propertyId) {
    if (!agent) return '';

    var photo = agent.photo || 'images/placeholder-agent.jpg';
    var profileLink = PV.render.agentHref(agent);

    var html =
      '<div class="agent-contact-card">' +
        '<div class="agent-contact-card-head">' +
          '<img src="' + esc(photo) + '" alt="Agent ' + esc(agent.fullName) + '" loading="lazy" width="64" height="64">' +
          '<div>' +
            '<div class="agent-contact-card-name">' + esc(agent.fullName) + '</div>' +
            (agent.shortBio ? '<div class="agent-contact-card-role">' + esc(agent.shortBio) + '</div>' : '') +
            '<div style="font-size:12px;color:var(--text-light);margin-top:3px;"><a href="' + esc(profileLink) + '" style="color:var(--accent);text-decoration:none;font-weight:600;">Pogledaj profil</a></div>' +
          '</div>' +
        '</div>' +
        '<h4 style="font-size:16px;font-weight:700;color:var(--primary);margin-bottom:14px;">Pošaljite upit za ovu nekretninu</h4>' +
        '<form id="propertyInquiryForm" class="needs-validation" novalidate aria-label="Kontakt forma za nekretninu">' +
          '<input type="hidden" name="propertyId" value="' + esc(propertyId) + '">' +
          '<div class="row g-3">' +
            '<div class="col-md-6"><input type="text" class="form-control" name="fullName" placeholder="Ime i prezime" required aria-label="Ime i prezime"></div>' +
            '<div class="col-md-6"><input type="tel" class="form-control" name="phone" placeholder="Telefon" required aria-label="Telefon"></div>' +
            '<div class="col-12"><input type="email" class="form-control" name="email" placeholder="Email adresa" required aria-label="Email"></div>' +
            '<div class="col-12"><textarea class="form-control" name="message" placeholder="Poruka (opciono)..." aria-label="Poruka"></textarea></div>' +
            '<div class="col-12"><button type="submit" class="btn-submit-full"><i class="bi bi-send" aria-hidden="true"></i> Pošaljite Upit</button></div>' +
          '</div>' +
        '</form>' +
        '<div class="agent-contact-phones">' +
          (agent.phone ? '<a href="tel:' + esc(agent.phone) + '"><i class="bi bi-telephone" aria-hidden="true"></i> ' + esc(agent.phone) + '</a>' : '') +
        '</div>' +
      '</div>';

    return html;
  }

  // --- Build related properties ---

  function buildRelated(items) {
    if (!items || items.length === 0) return '';

    var cards = items.map(function (item) {
      return '<div class="col-lg-4 col-md-6">' + PV.render.propertyCard(item) + '</div>';
    }).join('');

    return (
      '<div class="row mt-5 pt-3">' +
        '<div class="col-12 mb-4">' +
          '<div class="section-tag">Slične nekretnine</div>' +
          '<h2 class="section-title" style="font-size:30px;">Možda vas zanima</h2>' +
        '</div>' +
        cards +
      '</div>'
    );
  }

  // --- Build full page content ---

  function buildPage(p) {
    var badgeText = maps.transactionType.toUi[p.transactionType] || p.transactionType || '';

    var html = '';

    // Breadcrumb
    html += '<nav aria-label="Breadcrumb" class="mb-4"><ol class="breadcrumb" style="font-size:13px;background:none;padding:0;margin:0;">';
    html += '<li class="breadcrumb-item"><a href="index.html" style="color:var(--accent);text-decoration:none;">Početna</a></li>';
    html += '<li class="breadcrumb-item"><a href="nekretnine.html" style="color:var(--accent);text-decoration:none;">Nekretnine</a></li>';
    html += '<li class="breadcrumb-item active" aria-current="page" style="color:var(--text-light);">' + esc(p.title) + '</li>';
    html += '</ol></nav>';

    // Badge + ID
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">';
    html += '<span class="property-badge" style="position:static;">' + esc(badgeText) + '</span>';
    html += '<span style="font-size:12px;color:var(--text-light);font-weight:600;">ID: ' + esc(p.id) + '</span>';
    html += '</div>';

    // Row 1: Gallery + Specs
    html += '<div class="row g-4 mb-0">';
    html += buildGallery(p.images);
    html += buildSpecs(p);
    html += '</div>';

    // Row 2: Title, location, price, features
    html += '<div class="row mb-4"><div class="col-12">';
    html += '<div style="background:var(--white);border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">';

    // Title + price
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:12px;">';
    html += '<div>';
    html += '<h1 class="detail-title" style="margin-bottom:6px;">' + esc(p.title) + '</h1>';
    html += '<div class="detail-location"><i class="bi bi-geo-alt-fill" style="color:var(--accent);" aria-hidden="true"></i> ' + esc(p.location || '') + (p.address ? ', ' + esc(p.address) : '') + '</div>';
    html += '</div>';
    html += '<div class="detail-price-tag" style="margin-bottom:0;white-space:nowrap;">' + formatPrice(p.price, p.transactionType) + '</div>';
    html += '</div>';

    // Feature chips
    html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;padding-top:16px;">';
    html += buildFeatures(p);
    html += '</div>';

    html += '</div></div></div>';

    // Description + Agent
    html += '<div class="row g-4"><div class="col-12">';
    if (p.description) {
      html += '<div class="detail-description"><h2>Opis nekretnine</h2>';
      // Split description paragraphs
      var paragraphs = p.description.split(/\n\n|\n/);
      for (var i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].trim()) {
          html += '<p>' + esc(paragraphs[i].trim()) + '</p>';
        }
      }
      html += '</div>';
    }
    html += buildAgent(p.agent, p.id);
    html += '</div></div>';

    // Related properties
    html += buildRelated(p.relatedProperties);

    return html;
  }

  // --- 404 page ---

  function build404() {
    return (
      '<div class="text-center py-5">' +
        '<i class="bi bi-house-slash" style="font-size:4rem;color:#ccc;" aria-hidden="true"></i>' +
        '<h2 class="mt-3" style="color:var(--primary);">Nekretnina nije pronađena</h2>' +
        '<p class="text-muted">Tražena nekretnina ne postoji ili je uklonjena.</p>' +
        '<a href="nekretnine.html" class="btn-submit-full" style="display:inline-block;width:auto;padding:12px 32px;margin-top:16px;">Pogledajte sve nekretnine</a>' +
      '</div>'
    );
  }

  // --- Gallery thumbnail swap ---

  function setupGallerySwap() {
    var thumbs = document.querySelectorAll('.detail-gallery-thumbs img');
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var mainPhoto = document.getElementById('mainPhoto');
        if (!mainPhoto) return;
        mainPhoto.src = this.dataset.full;
        mainPhoto.alt = this.dataset.alt;
        // Reset opacity
        thumbs.forEach(function (t) { t.style.opacity = '1'; });
        this.style.opacity = '0.5';
      });
    });
  }

  // --- Load property ---

  async function loadProperty() {
    var slugId = getSlugId();

    if (!slugId) {
      contentWrap.innerHTML = build404();
      return;
    }

    contentWrap.innerHTML = PV.render.spinner();

    try {
      var res = await PV.api.get('/api/properties/' + encodeURIComponent(slugId));
      var p = res.data;

      // Update page title
      document.title = (p.title || 'Nekretnina') + ' | ProVizija Nekretnine';

      // Render content
      contentWrap.innerHTML = buildPage(p);

      // Wire gallery
      setupGallerySwap();

    } catch (err) {
      if (err.status === 404) {
        contentWrap.innerHTML = build404();
      } else {
        contentWrap.innerHTML = PV.render.errorState(err.message);
      }
    }
  }

  // --- Init ---

  document.addEventListener('DOMContentLoaded', function () {
    loadProperty();
  });
})();
