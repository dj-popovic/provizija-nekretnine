// ===========================
// page-property.js — Property detail page
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var esc = PV.render.esc;
  var maps = PV.maps;
  var i18n = PV.i18n;
  var t = i18n.t;

  // Title in the current language: the agency's own title in Serbian; in English /
  // Russian its translation, or a generated one (see PV.render.propertyTitle)
  function titleOf(p) {
    var s = p.specs || {};
    return PV.render.propertyTitle({
      title: p.title,
      translations: p.translations,
      propertyType: s.propertyType,
      rooms: s.rooms,
      area: s.area,
      landArea: s.landArea,
      location: p.location,
    }) || t('card.fallbackTitle');
  }

  var contentWrap = document.getElementById('propertyContent');

  // --- Read slug-id from ?id= query param ---

  function getSlugId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id') || null;
  }

  // --- Build gallery HTML ---

  // Thumbnails under the slider; when there are more photos, the last slot is "+N"
  var STRIP_SLOTS = 5;

  // Photo alt texts from the feed are the Serbian title
  var photoAlt = null;

  function slideImages(images, width, height, eagerFirst) {
    return images.map(function (img, i) {
      return '<img src="' + esc(img.url) + '" alt="' + esc(photoAlt || img.alt) + '" loading="' + (eagerFirst && i === 0 ? 'eager' : 'lazy') + '" decoding="async" draggable="false" width="' + width + '" height="' + height + '">';
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
    html += '<button type="button" class="gallery-open" aria-haspopup="dialog" aria-label="' + t('detail.gallery.open') + '"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i></button>';
    html += '</div>';

    if (count > 1) {
      var more = count > STRIP_SLOTS ? count - (STRIP_SLOTS - 1) : 0;
      var slots = more ? STRIP_SLOTS : count;
      html += '<div class="gallery-strip">';
      for (var i = 0; i < slots; i++) {
        if (more && i === slots - 1) {
          html +=
            '<button type="button" class="gallery-thumb gallery-thumb--more" data-index="' + i + '" aria-haspopup="dialog" aria-label="' + esc(i18n.plural(more, 'detail.gallery.showMore')) + '">' +
              thumbImage(images[i], 160, 88) +
              '<span class="gallery-more" aria-hidden="true">+' + more + '</span>' +
            '</button>';
        } else {
          html +=
            '<button type="button" class="gallery-thumb" data-index="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="' + esc(t('detail.gallery.photoOf', { n: i + 1, total: count })) + '">' +
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
      '<div class="modal fade gallery-modal" id="galleryModal" tabindex="-1" aria-label="' + t('detail.gallery.label') + '" aria-hidden="true">' +
        '<div class="modal-dialog modal-fullscreen">' +
          '<div class="modal-content">' +
            '<div class="gallery-modal-top">' +
              '<span class="gallery-modal-count" aria-live="polite"><span class="lb-current">1</span> / ' + count + '</span>' +
              '<button type="button" class="gallery-modal-close" data-bs-dismiss="modal" aria-label="' + t('detail.gallery.close') + '"><i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
            '</div>' +
            '<div class="gallery-modal-stage">' +
              '<div class="property-slides" id="lightboxSlides">' + slideImages(images, 1600, 1000, false) + '</div>' +
              (count > 1 ? PV.render.mediaNav() : '') +
            '</div>';

    if (count > 1) {
      html += '<div class="gallery-modal-strip">';
      for (var i = 0; i < count; i++) {
        html +=
          '<button type="button" class="lb-thumb" data-index="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="' + esc(t('detail.gallery.photoOf', { n: i + 1, total: count })) + '">' +
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
      // A RELPER type without a key yet ("other") gets a generic text
      rows += specRow(t('detail.spec.type'), maps.propertyType.toUi[s.propertyType] || t('detail.spec.otherType'));
    }
    if (s.area != null) {
      rows += specRow(t('detail.spec.area'), PV.render.formatArea(s.area));
    }
    if (s.landArea != null) {
      // Plot / farmland have only the land area, so it is just "Površina"
      rows += specRow(t(s.area != null ? 'detail.spec.plotArea' : 'detail.spec.area'), PV.render.formatLandArea(s.landArea));
    }
    if (s.location) {
      rows += specRow(t('detail.spec.location'), s.location);
    }
    if (s.rooms != null) {
      rows += specRow(t('detail.spec.rooms'), s.rooms === 0.5 ? t('units.studio') : PV.render.formatNumber(s.rooms));
    }
    if (s.bathrooms != null) {
      rows += specRow(t('detail.spec.bathrooms'), s.bathrooms);
    }
    if (s.floor != null) {
      rows += specRow(t('detail.spec.floor'), formatFloor(s.floor));
    }
    if (s.totalFloors != null) {
      rows += specRow(t('detail.spec.totalFloors'), s.totalFloors);
    }
    if (s.furnished != null) {
      rows += specRow(t('detail.spec.furnished'), ui(maps.furnished, s.furnished));
    }
    if (s.heating && s.heating.length > 0) {
      rows += specRow(t('detail.spec.heating'), s.heating.map(function (h) { return ui(maps.heating, h); }).join(', '));
    }
    if (s.registration) {
      rows += specRow(t('detail.spec.registration'), ui(maps.registration, s.registration));
    }
    if (s.constructionYear != null) {
      rows += specRow(t('detail.spec.year'), s.constructionYear);
    }
    var perUnit = pricePerUnit(p);
    if (perUnit) {
      rows += specRow(perUnit.label, perUnit.value);
    }

    if (!rows) {
      rows = '<p class="text-muted" style="font-size:14px;">' + t('detail.spec.none') + '</p>';
    }

    return (
      '<div class="col-lg-5">' +
        '<div class="detail-specs">' +
          '<h4>' + t('detail.spec.title') + '</h4>' +
          rows +
        '</div>' +
      '</div>'
    );
  }

  // Last spec row (agreed with the client, 2026-11-05): price per m², or per are for
  // land (its area is in ares). Not for rent, and not for "cena na upit".
  function pricePerUnit(p) {
    var s = p.specs || {};
    if (p.transactionType !== 'sale' || p.price == null) return null;
    var per = function (size) { return { n: PV.render.formatNumber(Math.round(p.price / size)) }; };
    if (s.area) return { label: t('detail.spec.pricePerM2'), value: t('units.pricePerM2', per(s.area)) };
    if (s.landArea) return { label: t('detail.spec.pricePerAre'), value: t('units.pricePerAre', per(s.landArea)) };
    return null;
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
          '<button type="button" class="detail-chips-arrow detail-chips-arrow--prev" aria-label="' + t('detail.features.prev') + '" aria-controls="featureTrack"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>' +
          '<div class="detail-chips-track" id="featureTrack" role="region" aria-label="' + t('detail.features.label') + '" tabindex="0">' + chips + '</div>' +
          '<button type="button" class="detail-chips-arrow detail-chips-arrow--next" aria-label="' + t('detail.features.next') + '" aria-controls="featureTrack"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>' +
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
            '<div style="font-size:12px;color:var(--text-light);margin-top:3px;"><a href="' + esc(profileLink) + '" style="color:var(--accent);text-decoration:none;font-weight:600;">' + t('detail.agent.profile') + '</a></div>' +
          '</div>' +
        '</div>' +
        '<h4 style="font-size:16px;font-weight:700;color:var(--primary);margin-bottom:14px;">' + t('detail.agent.inquiryTitle') + '</h4>' +
        '<form id="propertyInquiryForm" class="needs-validation" novalidate aria-label="' + t('detail.agent.formLabel') + '">' +
          '<input type="hidden" name="propertyId" value="' + esc(propertyId) + '">' +
          '<div class="row g-3">' +
            '<div class="col-md-6"><input type="text" class="form-control" name="fullName" placeholder="' + t('form.fullName') + '" required aria-label="' + t('form.fullName') + '"></div>' +
            '<div class="col-md-6"><input type="tel" class="form-control" name="phone" placeholder="' + t('form.phone') + '" required aria-label="' + t('form.phone') + '"></div>' +
            '<div class="col-12"><input type="email" class="form-control" name="email" placeholder="' + t('form.emailPlaceholder') + '" required aria-label="' + t('form.email') + '"></div>' +
            '<div class="col-12"><textarea class="form-control" name="message" placeholder="' + esc(t('form.messagePh')) + '" required aria-label="' + esc(t('form.message')) + '"></textarea></div>' +
            '<div class="col-12"><button type="submit" class="btn-submit-full"><i class="bi bi-send" aria-hidden="true"></i> ' + t('form.send') + '</button></div>' +
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
          '<div class="section-tag">' + t('detail.related.tag') + '</div>' +
          '<h2 class="section-title" style="font-size:30px;">' + t('detail.related.title') + '</h2>' +
        '</div>' +
        cards +
      '</div>'
    );
  }

  // --- Share: native share sheet (or copy link), WhatsApp, Viber ---


  // Agency mobile from the Kontakt page — used when a listing has no agent phone.
  // PLACEHOLDER until the agency's real number is put on the site.
  var AGENCY_PHONE = '+381641234567';

  function shareText(p) {
    var price = PV.render.priceParts(p.price, p.transactionType);
    return titleOf(p) + (price ? ' – ' + price.amount + ' ' + price.unit : '');
  }

  // Top bar: "Podeli" (share / copy the link) + contact the agency: call, WhatsApp, Viber
  function buildShare(p) {
    var phone = PV.render.intlPhone(p.agent && p.agent.phone) || AGENCY_PHONE;
    var msg = t('detail.share.message', { property: shareText(p) }) + '\n' + window.location.href;
    return (
      '<div class="share-bar">' +
        '<button type="button" class="share-btn share-btn--main" id="shareBtn">' +
          '<i class="bi bi-share" aria-hidden="true"></i><span class="share-label">' + t('detail.share.share') + '</span>' +
        '</button>' +
        '<span class="share-sep" aria-hidden="true"></span>' +
        '<a class="share-btn share-btn--icon share-btn--call" href="tel:' + esc(phone) + '" aria-label="' + t('detail.share.callAgency') + '" title="' + t('detail.share.call') + '">' +
          '<i class="bi bi-telephone" aria-hidden="true"></i>' +
        '</a>' +
        '<a class="share-btn share-btn--icon share-btn--wa" href="' + esc(PV.render.whatsappHref(phone, msg)) + '" target="_blank" rel="noopener" aria-label="' + t('detail.share.whatsapp') + '" title="WhatsApp">' +
          '<i class="bi bi-whatsapp" aria-hidden="true"></i>' +
        '</a>' +
        '<a class="share-btn share-btn--icon share-btn--viber" href="' + esc(PV.render.viberHref(phone)) + '" aria-label="' + t('detail.share.viber') + '" title="Viber">' +
          PV.render.viberIcon(18) +
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
        label.textContent = t('detail.share.copied');
      } catch (e) {
        label.textContent = t('detail.share.copyManually');
      }
      btn.classList.add('is-done');
      clearTimeout(timer);
      timer = setTimeout(function () {
        label.textContent = t('detail.share.share');
        btn.classList.remove('is-done');
      }, 2200);
    });
  }

  // --- Build price + agency commission ---

  function buildPrice(p) {
    var price = PV.render.priceParts(p.price, p.transactionType);
    if (!price) {
      return '<div class="detail-price"><div class="detail-price-tag is-on-request">' + t('price.onRequest') + '<i class="bi bi-chat-dots" aria-hidden="true"></i></div></div>';
    }
    return (
      '<div class="detail-price">' +
        '<div class="detail-price-tag">' + esc(price.amount) + ' <span class="detail-price-unit">' + price.unit + '</span></div>' +
        '<div class="detail-commission"><strong>+3%</strong> ' + t('detail.commission') + '</div>' +
      '</div>'
    );
  }

  // --- Build full page content ---

  function buildPage(p) {
    var badgeText = maps.transactionType.toUi[p.transactionType] || p.transactionType || '';
    var title = titleOf(p);
    photoAlt = i18n.lang === 'sr' ? null : title;

    var html = '';

    // Breadcrumb
    html += '<nav aria-label="' + t('common.breadcrumb') + '" class="mb-4"><ol class="breadcrumb" style="font-size:13px;background:none;padding:0;margin:0;">';
    html += '<li class="breadcrumb-item"><a href="index.html" style="color:var(--accent);text-decoration:none;">' + t('common.home') + '</a></li>';
    html += '<li class="breadcrumb-item"><a href="nekretnine.html" style="color:var(--accent);text-decoration:none;">' + t('nav.properties') + '</a></li>';
    var crumb = p.code ? t('detail.code', { code: p.code }) : title;
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
    html += '<div class="detail-summary-main">';
    html += '<h1 class="detail-title">' + esc(title) + '</h1>';
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
      // English / Russian: the machine translation when there is one (i18n phase 7),
      // otherwise the agency's Serbian text with a note
      var translated = i18n.lang !== 'sr' && p.translations && p.translations[i18n.lang];
      var descText = translated && translated.description ? translated.description : p.description;
      var descLang = descText === p.description ? 'sr' : i18n.lang;
      html += '<div class="detail-description"><h2>' + t('detail.description') + '</h2>';
      if (i18n.lang !== 'sr' && descLang === 'sr') html += '<p class="detail-description-note"><i class="bi bi-translate" aria-hidden="true"></i> ' + t('detail.descriptionInSerbian') + '</p>';
      html += '<div class="detail-description-body is-clamped" id="descBody" lang="' + descLang + '">';
      // Split description paragraphs
      var paragraphs = descText.split(/\n\n|\n/);
      for (var i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].trim()) {
          html += '<p>' + esc(paragraphs[i].trim()) + '</p>';
        }
      }
      html += '</div>';
      html += '<button type="button" class="detail-readmore" id="descToggle" aria-expanded="false" aria-controls="descBody" hidden><span>' + t('detail.readMore') + '</span> <i class="bi bi-chevron-down" aria-hidden="true"></i></button>';
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
        '<h2 class="mt-3" style="color:var(--primary);">' + t('detail.notFound.title') + '</h2>' +
        '<p class="text-muted">' + t('detail.notFound.text') + '</p>' +
        '<a href="nekretnine.html" class="btn-submit-full" style="display:inline-block;width:auto;padding:12px 32px;margin-top:16px;">' + t('detail.notFound.cta') + '</a>' +
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
      label.textContent = t(open ? 'detail.readLess' : 'detail.readMore');

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
      document.title = titleOf(p) + ' | ProVizija Nekretnine';

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
        contentWrap.innerHTML = PV.render.errorState(err);
      }
    }
  }

  // --- Init ---

  document.addEventListener('DOMContentLoaded', function () {
    loadProperty();
  });
})();
