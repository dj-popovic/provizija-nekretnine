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

  // --- Build feature chips (kvadratići) ---
  // Only "extras" here — area, rooms, bathrooms and floor are already in the spec panel.
  // Always one row: if it doesn't fit, the row scrolls (see setupFeatureStrip).

  function buildFeatures(p) {
    var keys = p.features || [];
    var dealText = maps.transactionType.toUi[p.transactionType] || '';
    if (keys.length === 0 && !dealText) return '';

    var chips = keys.map(function (key) {
      return featureChip(maps.feature.icon[key] || 'bi-check-circle', ui(maps.feature, key));
    }).join('');

    // Sale / rent chip — pinned at the right end; feature chips scroll "behind" it
    var isRent = p.transactionType === 'rent';
    var deal = dealText
      ? '<div class="detail-chip detail-chip--deal' + (isRent ? ' is-rent' : '') + '">' +
          '<span class="property-badge' + (isRent ? ' badge-rent' : '') + '">' + esc(dealText) + '</span>' +
        '</div>'
      : '';

    return (
      '<div class="detail-chips" id="featureStrip">' +
        '<div class="detail-chips-viewport">' +
          '<button type="button" class="detail-chips-arrow detail-chips-arrow--prev" aria-label="Prethodne karakteristike" aria-controls="featureTrack"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>' +
          '<div class="detail-chips-track" id="featureTrack" role="region" aria-label="Karakteristike nekretnine" tabindex="0">' + chips + '</div>' +
          '<button type="button" class="detail-chips-arrow detail-chips-arrow--next" aria-label="Sledeće karakteristike" aria-controls="featureTrack"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>' +
        '</div>' +
        deal +
      '</div>'
    );
  }

  function featureChip(icon, text) {
    return '<div class="detail-feature detail-chip"><i class="bi ' + icon + '" aria-hidden="true"></i> ' + esc(text) + '</div>';
  }

  // --- Feature strip: one row; auto-scrolls only when the chips don't fit ---
  //
  // - Fits → stays still.
  // - Overflows → glides slowly back and forth, pausing briefly at each end.
  // - Hover / touch / focus / wheel → stops; arrows (desktop) and manual
  //   scrolling take over. Resumes after a few idle seconds.
  // - prefers-reduced-motion → no auto-scroll, manual scrolling only.

  var STRIP_SPEED = 30;        // px per second
  var STRIP_END_HOLD = 1500;   // ms to rest at each end
  var STRIP_RESUME_DELAY = 3000;

  function setupFeatureStrip() {
    var strip = document.getElementById('featureStrip');
    if (!strip) return;

    var track = strip.querySelector('.detail-chips-track');
    var prevBtn = strip.querySelector('.detail-chips-arrow--prev');
    var nextBtn = strip.querySelector('.detail-chips-arrow--next');
    var autoScroll = !PV.render.prefersReducedMotion();

    var pos = 0;              // float position; scrollLeft rounds
    var direction = 1;
    var holdUntil = 0;
    var lastTime = 0;
    var hovering = false;
    var interacting = false;
    var visible = true;
    var resumeTimer = null;
    var rafId = null;

    function maxScroll() {
      return track.scrollWidth - track.clientWidth;
    }

    function updateArrows() {
      prevBtn.disabled = track.scrollLeft <= 1;
      nextBtn.disabled = track.scrollLeft >= maxScroll() - 1;
    }

    function running() {
      return autoScroll && visible && !hovering && !interacting && strip.classList.contains('is-overflowing');
    }

    function frame(time) {
      rafId = null;
      if (!running()) return;

      var dt = lastTime ? Math.min(time - lastTime, 100) : 0;
      lastTime = time;

      if (time >= holdUntil) {
        var max = maxScroll();
        pos += direction * STRIP_SPEED * dt / 1000;
        if (pos >= max) { pos = max; direction = -1; holdUntil = time + STRIP_END_HOLD; }
        if (pos <= 0) { pos = 0; direction = 1; holdUntil = time + STRIP_END_HOLD; }
        track.scrollLeft = pos;
      }
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (rafId || !running()) return;
      pos = track.scrollLeft; // continue from wherever the user left it
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    // User took over: stop now, resume after a few idle seconds
    function pauseForUser() {
      interacting = true;
      stop();
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () {
        interacting = false;
        start();
      }, STRIP_RESUME_DELAY);
    }

    function measure() {
      strip.classList.toggle('is-overflowing', maxScroll() > 1);
      updateArrows();
      if (running()) start(); else stop();
    }

    prevBtn.addEventListener('click', function () {
      pauseForUser();
      track.scrollBy({ left: -track.clientWidth * 0.7, behavior: autoScroll ? 'smooth' : 'auto' });
    });
    nextBtn.addEventListener('click', function () {
      pauseForUser();
      track.scrollBy({ left: track.clientWidth * 0.7, behavior: autoScroll ? 'smooth' : 'auto' });
    });

    strip.addEventListener('mouseenter', function () { hovering = true; stop(); });
    strip.addEventListener('mouseleave', function () { hovering = false; start(); });
    track.addEventListener('touchstart', pauseForUser, { passive: true });
    track.addEventListener('wheel', pauseForUser, { passive: true });
    track.addEventListener('focusin', pauseForUser);
    track.addEventListener('keydown', pauseForUser);
    track.addEventListener('scroll', updateArrows, { passive: true });

    // Don't animate while the strip is off-screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(strip);
    }

    var resizeRaf = null;
    window.addEventListener('resize', function () {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(function () { resizeRaf = null; measure(); });
    });

    measure();
    // Chip widths change once the web fonts finish loading
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
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

  // --- Share: native share sheet (or copy link), WhatsApp, Viber ---

  // Bootstrap Icons has no Viber glyph: official mark from Simple Icons (CC0)
  var VIBER_PATH = 'M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.03-.644-.215-1.178-.58-1.557-.367-.378-.893-.574-1.52-.607h-.018z';

  // Agency mobile from the Kontakt page — used when a listing has no agent phone.
  // PLACEHOLDER until the agency's real number is put on the site.
  var AGENCY_PHONE = '+381641234567';

  function shareText(p) {
    var price = PV.render.priceParts(p.price, p.transactionType);
    return (p.title || 'Nekretnina') + (price ? ' – ' + price.amount + ' ' + price.unit : '');
  }

  // "064 111 2233" / "+381 64…" / "00381…" → "+38164…"
  function intlPhone(raw) {
    var d = String(raw || '').replace(/[^\d+]/g, '');
    if (!d) return null;
    if (d.indexOf('+') === 0) return d;
    if (d.indexOf('00') === 0) return '+' + d.slice(2);
    if (d.indexOf('0') === 0) return '+381' + d.slice(1);
    return '+' + d;
  }

  // Top bar: "Podeli" (share / copy the link) + contact the agency: call, WhatsApp, Viber
  function buildShare(p) {
    var phone = intlPhone(p.agent && p.agent.phone) || AGENCY_PHONE;
    var msg = 'Zdravo, zanima me nekretnina: ' + shareText(p) + '\n' + window.location.href;
    return (
      '<div class="share-bar">' +
        '<button type="button" class="share-btn share-btn--main" id="shareBtn">' +
          '<i class="bi bi-share" aria-hidden="true"></i><span class="share-label">Podeli</span>' +
        '</button>' +
        '<span class="share-sep" aria-hidden="true"></span>' +
        '<a class="share-btn share-btn--icon share-btn--call" href="tel:' + esc(phone) + '" aria-label="Pozovite agenciju" title="Pozovite">' +
          '<i class="bi bi-telephone" aria-hidden="true"></i>' +
        '</a>' +
        '<a class="share-btn share-btn--icon share-btn--wa" href="https://wa.me/' + esc(phone.replace('+', '')) + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener" aria-label="Pišite agenciji na WhatsApp" title="WhatsApp">' +
          '<i class="bi bi-whatsapp" aria-hidden="true"></i>' +
        '</a>' +
        '<a class="share-btn share-btn--icon share-btn--viber" href="viber://chat?number=' + encodeURIComponent(phone) + '" aria-label="Pišite agenciji na Viber" title="Viber">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + VIBER_PATH + '"/></svg>' +
        '</a>' +
      '</div>'
    );
  }

  function setupShare(p) {
    var btn = document.getElementById('shareBtn');
    if (!btn) return;
    var label = btn.querySelector('.share-label');
    var timer = 0;
    btn.addEventListener('click', async function () {
      var data = { title: document.title, text: shareText(p), url: window.location.href };
      // Phones (and some desktops): the system share sheet
      if (navigator.share) {
        try { await navigator.share(data); } catch (e) { /* closed by the visitor */ }
        return;
      }
      // Elsewhere: copy the link and say so on the button
      try {
        await navigator.clipboard.writeText(data.url);
        label.textContent = 'Link kopiran';
      } catch (e) {
        label.textContent = 'Kopirajte link iz adrese';
      }
      btn.classList.add('is-done');
      clearTimeout(timer);
      timer = setTimeout(function () {
        label.textContent = 'Podeli';
        btn.classList.remove('is-done');
      }, 2200);
    });
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

    // Badge + ID, share buttons on the right
    html += '<div class="detail-topbar">';
    html += '<span class="property-badge' + (p.transactionType === 'rent' ? ' badge-rent' : '') + '" style="position:static;">' + esc(badgeText) + '</span>';
    html += '<span style="font-size:12px;color:var(--text-light);font-weight:600;">ID: ' + esc(p.id) + '</span>';
    html += buildShare(p);
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

    // Feature chips (one row, see setupFeatureStrip)
    html += buildFeatures(p);

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
      setupShare(p);
      setupFeatureStrip();

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
