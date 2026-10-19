// ===========================
// page-property.js — Property detail page
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var esc = PV.render.esc;
  var maps = PV.maps;

  var contentWrap = document.getElementById('propertyContent');

  // --- Read slug-id from ?id= query param ---

  function getSlugId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id') || null;
  }

  // --- Build gallery HTML ---

  // Thumbnails under the slider; when there are more photos, the last slot is "+N"
  var STRIP_SLOTS = 5;

  function slideImages(images, width, height, eagerFirst) {
    return images.map(function (img, i) {
      return '<img src="' + esc(img.url) + '" alt="' + esc(img.alt) + '" loading="' + (eagerFirst && i === 0 ? 'eager' : 'lazy') + '" decoding="async" draggable="false" width="' + width + '" height="' + height + '">';
    }).join('');
  }

  function thumbImage(img, width, height) {
    return '<img src="' + esc(img.url) + '" alt="" loading="lazy" decoding="async" width="' + width + '" height="' + height + '">';
  }

  function buildGallery(images) {
    if (!images || images.length === 0) {
      return '<div class="col-lg-7"><div class="detail-gallery-placeholder"><i class="bi bi-image" aria-hidden="true"></i></div></div>';
    }

    var count = images.length;
    var html = '<div class="col-lg-7"><div class="detail-gallery">';

    // Same slider as the cards: renderers.js drives the arrows and the counter
    html += '<div class="property-media gallery-stage">';
    html += '<div class="property-slides" id="gallerySlides">' + slideImages(images, 900, 420, true) + '</div>';
    if (count > 1) html += PV.render.mediaNav(count);
    html += '<button type="button" class="gallery-open" aria-haspopup="dialog" aria-label="Otvori galeriju preko celog ekrana"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i></button>';
    html += '</div>';

    if (count > 1) {
      var more = count > STRIP_SLOTS ? count - (STRIP_SLOTS - 1) : 0;
      var slots = more ? STRIP_SLOTS : count;
      html += '<div class="gallery-strip">';
      for (var i = 0; i < slots; i++) {
        if (more && i === slots - 1) {
          html +=
            '<button type="button" class="gallery-thumb gallery-thumb--more" data-index="' + i + '" aria-haspopup="dialog" aria-label="Prikaži još ' + more + ' ' + PV.render.plural(more, 'fotografiju', 'fotografije', 'fotografija') + '">' +
              thumbImage(images[i], 160, 88) +
              '<span class="gallery-more" aria-hidden="true">+' + more + '</span>' +
            '</button>';
        } else {
          html +=
            '<button type="button" class="gallery-thumb" data-index="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="Slika ' + (i + 1) + ' od ' + count + '">' +
              thumbImage(images[i], 160, 88) +
            '</button>';
        }
      }
      html += '</div>';
    }

    html += '</div></div>';
    return html;
  }

  // Full-screen gallery: one big photo (arrows, swipe, ←/→), every photo in a row at the bottom
  function buildLightbox(images) {
    var count = images.length;
    var html =
      '<div class="modal fade gallery-modal" id="galleryModal" tabindex="-1" aria-label="Galerija fotografija" aria-hidden="true">' +
        '<div class="modal-dialog modal-fullscreen">' +
          '<div class="modal-content">' +
            '<div class="gallery-modal-top">' +
              '<span class="gallery-modal-count" aria-live="polite"><span class="lb-current">1</span> / ' + count + '</span>' +
              '<button type="button" class="gallery-modal-close" data-bs-dismiss="modal" aria-label="Zatvori galeriju"><i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
            '</div>' +
            '<div class="gallery-modal-stage">' +
              '<div class="property-slides" id="lightboxSlides">' + slideImages(images, 1600, 1000, false) + '</div>' +
              (count > 1 ? PV.render.mediaNav() : '') +
            '</div>';

    if (count > 1) {
      html += '<div class="gallery-modal-strip">';
      for (var i = 0; i < count; i++) {
        html +=
          '<button type="button" class="lb-thumb" data-index="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="Slika ' + (i + 1) + ' od ' + count + '">' +
            thumbImage(images[i], 96, 64) +
          '</button>';
      }
      html += '</div>';
    }

    html += '</div></div></div>';
    return html;
  }

  // --- Build specs panel ---

  // Map an API key to UI text; unknown keys are shown as-is
  function ui(map, key) {
    return map.toUi[key] || key;
  }

  function formatFloor(floor) {
    return ui(maps.floor, floor);
  }

  var formatRooms = PV.render.formatRooms;
  var formatBathrooms = PV.render.formatBathrooms;

  // Row order agreed with the client. The API sends null (or [] for heating)
  // for anything that doesn't apply to the property type, so those rows are skipped.
  function buildSpecs(p) {
    var s = p.specs || {};
    var rows = '';

    if (s.propertyType) {
      rows += specRow('Tip', maps.propertyType.toUi[s.propertyType] || p.propertyType);
    }
    if (s.area != null) {
      rows += specRow('Površina', PV.render.formatArea(s.area));
    }
    if (s.landArea != null) {
      // Plot / farmland have only the land area, so it is just "Površina"
      rows += specRow(s.area != null ? 'Površina placa' : 'Površina', PV.render.formatLandArea(s.landArea));
    }
    if (s.location) {
      rows += specRow('Lokacija', s.location);
    }
    if (s.rooms != null) {
      rows += specRow('Sobe', s.rooms === 0.5 ? 'Garsonjera' : String(s.rooms).replace('.', ','));
    }
    if (s.bathrooms != null) {
      rows += specRow('Kupatila', s.bathrooms);
    }
    if (s.floor != null) {
      rows += specRow('Sprat', formatFloor(s.floor));
    }
    if (s.totalFloors != null) {
      rows += specRow('Ukupno spratova', s.totalFloors);
    }
    if (s.furnished != null) {
      rows += specRow('Opremljenost', ui(maps.furnished, s.furnished));
    }
    if (s.heating && s.heating.length > 0) {
      rows += specRow('Grejanje', s.heating.map(function (h) { return ui(maps.heating, h); }).join(', '));
    }
    if (s.registration) {
      rows += specRow('Uknjiženost', ui(maps.registration, s.registration));
    }
    if (s.constructionYear != null) {
      rows += specRow('Godina gradnje', s.constructionYear);
    }

    if (!rows) {
      rows = '<p class="text-muted" style="font-size:14px;">Nema dostupnih specifikacija.</p>';
    }

    return (
      '<div class="col-lg-5">' +
        '<div class="detail-specs">' +
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
    var s = p.specs || {};

    if (s.area != null) {
      chips += featureChip('bi-grid-3x3', PV.render.formatArea(s.area));
    } else if (s.landArea != null) {
      chips += featureChip('bi-grid-3x3', PV.render.formatLandArea(s.landArea));
    }
    if (s.rooms != null) {
      chips += featureChip('bi-door-open', formatRooms(s.rooms));
    }
    if (s.bathrooms != null) {
      chips += featureChip('bi-water', formatBathrooms(s.bathrooms));
    }
    if (s.floor != null) {
      chips += featureChip('bi-building', PV.render.formatFloor(s.floor));
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

    // The transaction type is already shown as the badge above the gallery
    return chips;
  }

  function featureChip(icon, text) {
    return '<div class="detail-feature detail-chip"><i class="bi ' + icon + '" aria-hidden="true"></i> ' + esc(text) + '</div>';
  }

  // --- Build agent card ---

  function buildAgent(agent, propertyId) {
    if (!agent) return '';

    var profileLink = PV.render.agentHref(agent);

    var html =
      '<div class="agent-contact-card">' +
        '<div class="agent-contact-card-head">' +
          PV.render.agentAvatar(agent, 'agent-contact-avatar') +
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

  // --- Build price + agency commission ---

  function buildPrice(p) {
    var price = PV.render.priceParts(p.price, p.transactionType);
    if (!price) {
      return '<div class="detail-price"><div class="detail-price-tag is-on-request">Cena na upit</div></div>';
    }
    return (
      '<div class="detail-price">' +
        '<div class="detail-price-tag">' + esc(price.amount) + ' <span class="detail-price-unit">' + price.unit + '</span></div>' +
        '<div class="detail-commission"><strong>+3%</strong> posrednička provizija</div>' +
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
    var crumb = p.code ? 'Šifra nekretnine: ' + p.code : p.title;
    html += '<li class="breadcrumb-item active" aria-current="page" style="color:var(--text-light);">' + esc(crumb) + '</li>';
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

    // Row 2: Title, location, price, features — same left edge as the gallery
    html += '<div class="row mb-4"><div class="col-12">';
    html += '<div class="detail-summary">';

    // Title + price
    html += '<div class="detail-summary-head">';
    html += '<div>';
    html += '<h1 class="detail-title">' + esc(p.title) + '</h1>';
    html += '<div class="detail-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ' + esc(p.location || '') + '</div>';
    html += '</div>';
    html += buildPrice(p);
    html += '</div>';

    // Feature chips
    html += '<div class="detail-chips">';
    html += buildFeatures(p);
    html += '</div>';

    html += '</div></div></div>';

    // Description + Agent
    html += '<div class="row g-4"><div class="col-12">';
    if (p.description) {
      html += '<div class="detail-description"><h2>Opis nekretnine</h2>';
      html += '<div class="detail-description-body is-clamped" id="descBody">';
      // Split description paragraphs
      var paragraphs = p.description.split(/\n\n|\n/);
      for (var i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].trim()) {
          html += '<p>' + esc(paragraphs[i].trim()) + '</p>';
        }
      }
      html += '</div>';
      html += '<button type="button" class="detail-readmore" id="descToggle" aria-expanded="false" aria-controls="descBody" hidden><span>Vidi više</span> <i class="bi bi-chevron-down" aria-hidden="true"></i></button>';
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

  // --- Gallery: thumbnails follow the slider, the lightbox opens at the current photo ---

  function slideIndex(track) {
    return Math.round(track.scrollLeft / track.clientWidth);
  }

  function goTo(track, index, smooth) {
    track.scrollTo({
      left: index * track.clientWidth,
      behavior: smooth && !PV.render.prefersReducedMotion() ? 'smooth' : 'auto',
    });
  }

  function markPressed(buttons, index) {
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.index) === index));
    });
  }

  function setupGallery(images) {
    var stage = document.getElementById('gallerySlides');
    if (!stage) return;

    var thumbs = document.querySelectorAll('.gallery-thumb[aria-pressed]');
    var moreBtn = document.querySelector('.gallery-thumb--more');
    stage.addEventListener('scroll', function () {
      var index = slideIndex(stage);
      markPressed(thumbs, index);
      // Photos behind "+N" light up that tile instead
      if (moreBtn) moreBtn.classList.toggle('is-current', index >= Number(moreBtn.dataset.index));
    }, { passive: true });
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        goTo(stage, Number(thumb.dataset.index), true);
      });
    });

    document.body.insertAdjacentHTML('beforeend', buildLightbox(images));
    var modalEl = document.getElementById('galleryModal');
    var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    var track = document.getElementById('lightboxSlides');
    var counter = modalEl.querySelector('.lb-current');
    var strip = modalEl.querySelector('.gallery-modal-strip');
    var lbThumbs = modalEl.querySelectorAll('.lb-thumb');
    var openBtn = document.querySelector('.gallery-open');
    var current = 0;
    var startAt = 0;
    var opener = null;
    var pending = 0;

    // Lightbox photos are lazy; load the one on screen and its neighbours
    function warmUp(index) {
      [index - 1, index, index + 1].forEach(function (i) {
        var img = track.children[i];
        if (img && img.loading === 'lazy') img.loading = 'eager';
      });
    }

    function sync() {
      if (!track.clientWidth) return;
      var index = slideIndex(track);
      if (index === current) return;
      current = index;
      counter.textContent = index + 1;
      markPressed(lbThumbs, index);
      warmUp(index);

      // Keep the active thumbnail centred in the bottom row
      var thumb = lbThumbs[index];
      if (strip && thumb) {
        var s = strip.getBoundingClientRect();
        var t = thumb.getBoundingClientRect();
        strip.scrollBy({
          left: (t.left + t.width / 2) - (s.left + s.width / 2),
          behavior: PV.render.prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }
    }

    function open(index, from) {
      startAt = index;
      // Focus goes back where it came from; a click on the photo itself returns to the expand button
      opener = from || openBtn;
      warmUp(index);
      modal.show();
    }

    stage.addEventListener('click', function () { open(slideIndex(stage)); });
    openBtn.addEventListener('click', function () { open(slideIndex(stage), openBtn); });
    if (moreBtn) {
      moreBtn.addEventListener('click', function () { open(Number(moreBtn.dataset.index), moreBtn); });
    }

    track.addEventListener('scroll', sync, { passive: true });
    lbThumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        goTo(track, Number(thumb.dataset.index), true);
      });
    });

    // ←/→ step through the photos (Esc already closes the modal)
    modalEl.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var btn = modalEl.querySelector(e.key === 'ArrowLeft' ? '.media-nav--prev' : '.media-nav--next');
      if (!btn) return;
      e.preventDefault();
      btn.click();
    });

    // Bootstrap keeps the dialog display:none until the backdrop has faded in,
    // so wait for it to have a width before jumping to the photo
    modalEl.addEventListener('show.bs.modal', function () {
      cancelAnimationFrame(pending);
      (function jump() {
        if (!track.clientWidth) {
          pending = requestAnimationFrame(jump);
          return;
        }
        current = -1;
        goTo(track, startAt, false);
        sync();
      })();
    });

    // The slider on the page continues from the photo the visitor stopped at
    modalEl.addEventListener('hidden.bs.modal', function () {
      cancelAnimationFrame(pending);
      if (current >= 0) goTo(stage, current, false);
      if (opener && document.body.contains(opener)) opener.focus();
    });
  }

  // --- "Vidi više" for long descriptions ---

  function setupReadMore() {
    var body = document.getElementById('descBody');
    var btn = document.getElementById('descToggle');
    if (!body || !btn) return;

    // Only a few lines over the limit: show it all, no button
    if (body.scrollHeight <= body.clientHeight + 40) {
      body.classList.remove('is-clamped');
      return;
    }

    var label = btn.querySelector('span');
    btn.hidden = false;

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Prikaži manje' : 'Vidi više';

      if (open) {
        body.classList.add('is-open');
        body.style.maxHeight = PV.render.prefersReducedMotion() ? 'none' : body.scrollHeight + 'px';
      } else {
        // From the full height back to the clamp; start at a pixel value so it animates
        body.style.maxHeight = body.scrollHeight + 'px';
        void body.offsetHeight;
        body.style.maxHeight = '';
        body.classList.remove('is-open');
        // If the visitor had read past the top, bring the heading back into view
        var top = body.parentNode.getBoundingClientRect().top;
        if (top < 0) {
          window.scrollBy({ top: top - 100, behavior: PV.render.prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      }
    });

    // Once open, drop the pixel cap so the text can reflow on resize
    body.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'max-height' && btn.getAttribute('aria-expanded') === 'true') {
        body.style.maxHeight = 'none';
      }
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

      setupGallery(p.images);
      setupReadMore();

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
