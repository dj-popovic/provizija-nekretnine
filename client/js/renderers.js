// ===========================
// PV.render — Shared HTML generators & value maps
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var PLACEHOLDER_PROPERTY = 'images/placeholder-property.svg';

  // --- Value mappings (English API ↔ Serbian UI) ---

  var maps = {
    transactionType: {
      // Hero tabs say "Kupovina" / "Izdavanje", the listing subnav "Prodaja" / "Izdavanje"
      toApi: { prodaja: 'sale', kupovina: 'sale', izdavanje: 'rent', iznajmljivanje: 'rent' },
      toUi:  { sale: 'Prodaja', rent: 'Izdavanje' },
    },
    propertyType: {
      // Type chip / select value → API type keys. "Poslovni prostor" covers
      // both RELPER types Poslovni prostor and Kancelarija.
      chips: {
        stan: ['apartment'],
        kuca: ['house'],
        plac: ['plot'],
        zemljiste: ['land'],
        poslovni: ['commercial', 'office'],
        garaza: ['garage'],
      },
      toUi: {
        apartment: 'Stan',
        house: 'Kuća',
        commercial: 'Poslovni prostor',
        plot: 'Plac',
        land: 'Zemljište',
        garage: 'Garaža',
        office: 'Kancelarija',
      },
    },
    // Spec value keys from the API → Serbian UI text.
    // Unknown keys are shown as-is (the API passes unmapped XML values through).
    furnished: {
      toUi: { furnished: 'Namešteno', semi_furnished: 'Polunamešteno', empty: 'Prazno' },
    },
    heating: {
      toUi: {
        central: 'Centralno',
        gas: 'Gas',
        underfloor: 'Podno',
        solid_fuel: 'Čvrsta goriva',
        norwegian_radiators: 'Norveški radijatori',
        storage_heater: 'TA peć',
      },
    },
    registration: {
      toUi: { registered: 'Da', in_progress: 'U fazi knjiženja', unregisterable: 'Ne', not_registered: 'Ne' },
    },
    floor: {
      toUi: { ground: 'Prizemlje' },
    },
    // "Više filtera" groups (#16)
    construction: {
      toUi: { new: 'Novogradnja', under_construction: 'U izgradnji', old: 'Stara gradnja' },
    },
    condition: {
      toUi: { original: 'Izvorno stanje', renovated: 'Renovirano', needs_renovation: 'Za adaptaciju' },
    },
    equipment: {
      toUi: {
        air_conditioning: 'Klima',
        internet: 'Internet',
        cable_tv: 'Kablovska',
        intercom: 'Interfon',
        video_intercom: 'Video interfon',
        video_surveillance: 'Video nadzor',
      },
      icon: {
        air_conditioning: 'bi-snow',
        internet: 'bi-wifi',
        cable_tv: 'bi-tv',
        intercom: 'bi-bell',
        video_intercom: 'bi-camera-video',
        video_surveillance: 'bi-webcam',
      },
    },
    // Feature chips (kvadratići) — keys arrive from the API already in display order
    feature: {
      toUi: {
        penthouse: 'Penthouse',
        villa: 'Vila',
        duplex: 'Duplex',
        luxury: 'Lux',
        pool: 'Bazen',
        pet_friendly: 'Pet friendly',
        new_build: 'Novogradnja',
        under_construction: 'U izgradnji',
        salon: 'Salonski',
        elevator: 'Lift',
        terrace: 'Terasa',
        garage_space: 'Garažno mesto',
        parking: 'Parking',
        basement: 'Podrum',
        storage: 'Ostava',
        paved_road: 'Asfaltni put',
        city_water: 'Gradska voda',
        city_sewage: 'Gradska kanalizacija',
        building_permit: 'Građevinska dozvola',
        location_permit: 'Lokacijska dozvola',
        occupancy_permit: 'Upotrebna dozvola',
        renovated: 'Renovirano',
        move_in_ready: 'Odmah useljivo',
        mortgage_eligible: 'Može na kredit',
      },
      icon: {
        penthouse: 'bi-building-up',
        villa: 'bi-house-heart',
        duplex: 'bi-layers',
        luxury: 'bi-gem',
        pool: 'bi-water',
        pet_friendly: 'bi-heart',
        new_build: 'bi-stars',
        under_construction: 'bi-cone-striped',
        salon: 'bi-house-door',
        elevator: 'bi-arrow-up-circle',
        terrace: 'bi-sun',
        garage_space: 'bi-car-front',
        parking: 'bi-p-square',
        basement: 'bi-box-seam',
        storage: 'bi-archive',
        paved_road: 'bi-signpost-split',
        city_water: 'bi-droplet',
        city_sewage: 'bi-moisture',
        building_permit: 'bi-file-earmark-check',
        location_permit: 'bi-file-earmark-check',
        occupancy_permit: 'bi-file-earmark-check',
        renovated: 'bi-tools',
        move_in_ready: 'bi-key',
        mortgage_eligible: 'bi-bank',
      },
    },
  };

  // --- Serbian plural forms: 1 soba, 2–4 sobe, 5+ soba (11–14 take the last form) ---

  function plural(n, one, few, many) {
    if (n % 1 !== 0) return few; // decimals: "2,5 sobe"
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function formatNumber(n) {
    return String(n).replace('.', ',');
  }

  // --- Area formatters (area is m², landArea is ares) ---

  function formatArea(area) {
    return area + ' m²';
  }

  function formatLandArea(landArea) {
    return landArea + ' ar';
  }

  // --- Rooms / bathrooms / floor ---

  function formatRooms(rooms) {
    if (rooms == null) return null;
    if (rooms === 0.5) return 'Garsonjera';
    return formatNumber(rooms) + ' ' + plural(rooms, 'soba', 'sobe', 'soba');
  }

  function formatBathrooms(bathrooms) {
    return formatNumber(bathrooms) + ' ' + plural(bathrooms, 'kupatilo', 'kupatila', 'kupatila');
  }

  function formatFloor(floor) {
    if (floor == null || floor === '') return null;
    if (maps.floor.toUi[floor]) return maps.floor.toUi[floor];
    if (/^\d+$/.test(String(floor))) return floor + '. sprat';
    return String(floor);
  }

  // --- Price formatter ---

  function priceParts(price, transactionType) {
    if (price == null) return null;
    return {
      amount: Number(price).toLocaleString('de-DE'),
      unit: transactionType === 'rent' ? '€/mes.' : '€',
    };
  }

  function formatPrice(price, transactionType) {
    var parts = priceParts(price, transactionType);
    return parts ? parts.amount + ' ' + parts.unit : 'Cena na upit';
  }

  // --- Build detail page URL ---

  function propertyHref(item) {
    return 'nekretnina-detalj.html?id=' + encodeURIComponent(item.slug + '-' + item.id);
  }

  function agentHref(agent) {
    return 'agent-detalj.html?slug=' + encodeURIComponent(agent.slug);
  }

  // --- Escape HTML to prevent XSS ---

  // Escapes quotes too — esc() output is used inside HTML attributes
  // (src="…", alt="…", aria-label="…"), not only in element text.
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, function (ch) { return ESC_MAP[ch]; });
  }

  // --- Agent photo, or initials while the feed has no photo for the agent ---

  function initials(name) {
    return String(name || '').trim().split(/\s+/).slice(0, 2).map(function (word) {
      return word.charAt(0);
    }).join('').toUpperCase();
  }

  function agentAvatar(agent, className) {
    if (agent.photo) {
      return '<img src="' + esc(agent.photo) + '" alt="' + esc(agent.fullName) + '" class="' + className + '" loading="lazy">';
    }
    return '<div class="' + className + ' avatar-initials" role="img" aria-label="' + esc(agent.fullName) + '"><span aria-hidden="true">' + esc(initials(agent.fullName)) + '</span></div>';
  }

  // --- Property card (home, listing, agent portfolio, related) ---

  function stat(icon, label, value) {
    var shown = value
      ? esc(value)
      : '<span aria-hidden="true">—</span><span class="visually-hidden">nije navedeno</span>';
    return (
      '<li class="property-stat' + (value ? '' : ' is-empty') + '" title="' + label + '">' +
        '<i class="bi ' + icon + '" aria-hidden="true"></i>' +
        '<span class="visually-hidden">' + label + ': </span>' +
        '<span>' + shown + '</span>' +
      '</li>'
    );
  }

  // Prev/next arrows + "1 / N" counter of a photo slider (cards and the detail gallery).
  // Without a count it returns just the arrows.
  function mediaNav(count) {
    return (
      '<button type="button" class="media-nav media-nav--prev" data-dir="-1" aria-label="Prethodna slika"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>' +
      '<button type="button" class="media-nav media-nav--next" data-dir="1" aria-label="Sledeća slika"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>' +
      (count ? '<span class="media-count" aria-hidden="true"><span class="media-count-current">1</span> / ' + count + '</span>' : '')
    );
  }

  var CARD_SLIDES = 5;

  function propertyCard(item) {
    var images = item.images && item.images.length
      ? item.images
      : [{ url: PLACEHOLDER_PROPERTY, alt: item.title || 'Nekretnina' }];

    var href = esc(propertyHref(item));
    var isRent = item.transactionType === 'rent';
    var badgeText = maps.transactionType.toUi[item.transactionType] || '';

    // At most CARD_SLIDES slides: with more photos the last one is a blurred
    // "+N fotografija" slide that opens the listing. Only the first photo has a src;
    // the rest load on hover / arrow / swipe (warmUp), so a long list stays light.
    var more = images.length > CARD_SLIDES ? images.length - (CARD_SLIDES - 1) : 0;
    var photos = more ? images.slice(0, CARD_SLIDES - 1) : images;
    var slides = photos.map(function (img, i) {
      return '<img ' + (i === 0 ? 'src' : 'data-src') + '="' + esc(img.url) + '" alt="' + esc(img.alt || item.title) + '" loading="lazy" decoding="async" draggable="false" width="600" height="400">';
    }).join('');
    if (more) {
      slides +=
        '<span class="slide-more">' +
          '<img class="slide-more-bg" data-src="' + esc(images[CARD_SLIDES - 1].url) + '" alt="" loading="lazy" decoding="async" draggable="false" width="600" height="400">' +
          '<span class="slide-more-content">' +
            '<img class="slide-more-mark" src="images/pro-vizija-mark-white.svg" alt="" width="88" height="41">' +
            '<span class="slide-more-count">+' + more + ' ' + plural(more, 'fotografija', 'fotografije', 'fotografija') + '</span>' +
            '<span class="slide-more-cta">Pogledajte sve <i class="bi bi-chevron-right" aria-hidden="true"></i></span>' +
          '</span>' +
        '</span>';
    }

    var nav = images.length > 1 ? mediaNav(images.length) : '';

    var price = priceParts(item.price, item.transactionType);
    var priceHtml = price
      ? '<p class="property-price"><span class="property-price-amount">' + esc(price.amount) + '</span><span class="property-price-unit">' + price.unit + '</span></p>'
      : '<p class="property-price is-on-request">Cena na upit</p>';

    var area = item.area != null ? formatArea(item.area)
      : item.landArea != null ? formatLandArea(item.landArea)
      : null;

    return (
      '<article class="property-card">' +
        '<div class="property-media">' +
          // Duplicate of the title link for pointer users; the title link is the accessible one
          '<a class="property-slides" href="' + href + '" tabindex="-1" aria-hidden="true">' + slides + '</a>' +
          (badgeText ? '<span class="property-badge' + (isRent ? ' badge-rent' : '') + '">' + esc(badgeText) + '</span>' : '') +
          nav +
        '</div>' +
        '<div class="property-details">' +
          '<div class="property-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ' + esc(item.location) + '</div>' +
          '<h3 class="property-title"><a class="stretched-link" href="' + href + '">' + esc(item.title) + '</a></h3>' +
          priceHtml +
          '<ul class="property-stats">' +
            stat('bi-grid-3x3', 'Kvadratura', area) +
            stat('bi-door-open', 'Sobe', formatRooms(item.rooms)) +
            // The listing API does not send `floor` yet; the slot fills in once it does
            stat('bi-building', 'Sprat', formatFloor(item.floor)) +
          '</ul>' +
        '</div>' +
      '</article>'
    );
  }

  // --- Agent card (matches .team-card in agenti.html) ---

  function agentCard(agent) {
    var href = esc(agentHref(agent));

    var contactLinks =
      '<a href="' + href + '" aria-label="Pogledaj profil – ' + esc(agent.fullName) + '"><i class="bi bi-person" aria-hidden="true"></i></a>';
    if (agent.phone) {
      contactLinks += '<a href="tel:' + esc(agent.phone) + '" aria-label="Pozovi ' + esc(agent.fullName) + '"><i class="bi bi-telephone" aria-hidden="true"></i></a>';
    }
    if (agent.email) {
      contactLinks += '<a href="mailto:' + esc(agent.email) + '" aria-label="Email ' + esc(agent.fullName) + '"><i class="bi bi-envelope" aria-hidden="true"></i></a>';
    }

    return (
      '<article class="team-card">' +
        '<div class="team-photo">' + agentAvatar(agent, 'team-photo-img') + '</div>' +
        '<div class="team-info">' +
          '<h3 class="team-name"><a class="stretched-link" href="' + href + '">' + esc(agent.fullName) + '</a></h3>' +
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
      html += '<li class="page-item"><a class="page-link" href="#" data-page="' + (pg.page - 1) + '" aria-label="Prethodna"><i class="bi bi-chevron-left" aria-hidden="true"></i></a></li>';
    }

    // Page numbers — show max 5 centered around current
    var start = Math.max(1, pg.page - 2);
    var end = Math.min(pg.totalPages, start + 4);
    start = Math.max(1, end - 4);

    for (var i = start; i <= end; i++) {
      var active = i === pg.page;
      html += '<li class="page-item' + (active ? ' active' : '') + '"><a class="page-link" href="#" data-page="' + i + '"' + (active ? ' aria-current="page"' : '') + '>' + i + '</a></li>';
    }

    // Next
    if (pg.page < pg.totalPages) {
      html += '<li class="page-item"><a class="page-link" href="#" data-page="' + (pg.page + 1) + '" aria-label="Sledeća"><i class="bi bi-chevron-right" aria-hidden="true"></i></a></li>';
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

  // --- Card photo slider ---
  // Cards are rendered after API calls, so every listener is delegated from document.

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function slideIndex(track) {
    return Math.round(track.scrollLeft / track.clientWidth);
  }

  // Card photos after the first have only data-src: give the current one and its
  // neighbours their src. Detail-gallery photos use native lazy-loading instead.
  function warmUp(track, index) {
    [index - 1, index, index + 1].forEach(function (i) {
      var slide = track.children[i];
      if (!slide) return;
      var img = slide.tagName === 'IMG' ? slide : slide.querySelector('img[data-src]');
      if (!img) return;
      if (img.dataset.src && !img.getAttribute('src')) img.src = img.dataset.src;
      else if (img.loading === 'lazy') img.loading = 'eager';
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.media-nav');
    if (!btn) return;

    var track = btn.parentNode.querySelector('.property-slides');
    var count = track.children.length;
    var next = slideIndex(track) + Number(btn.dataset.dir);
    var wraps = next < 0 || next >= count;
    next = (next + count) % count;

    warmUp(track, next);
    // Wrapping around jumps instead of rewinding through every photo
    track.scrollTo({
      left: next * track.clientWidth,
      behavior: wraps || prefersReducedMotion() ? 'auto' : 'smooth',
    });
  });

  // scroll does not bubble, so listen in the capture phase
  document.addEventListener('scroll', function (e) {
    var track = e.target;
    if (!track.classList || !track.classList.contains('property-slides')) return;
    var index = slideIndex(track);
    var current = track.parentNode.querySelector('.media-count-current');
    if (current) current.textContent = index + 1;
    // The "+N" slide has its own text; the counter would only repeat it
    var counter = track.parentNode.querySelector('.media-count');
    var slide = track.children[index];
    if (counter) counter.classList.toggle('is-hidden', !!(slide && slide.classList.contains('slide-more')));
    warmUp(track, index); // swipes on touch screens, where there is no hover
  }, { capture: true, passive: true });

  // The card photo is a duplicate, aria-hidden link: a mouse click must not focus it
  // (Chrome warns "Blocked aria-hidden on an element because its descendant retained focus").
  // The click itself still opens the property.
  document.addEventListener('mousedown', function (e) {
    if (e.target.closest && e.target.closest('a.property-slides[aria-hidden="true"]')) e.preventDefault();
  });

  document.addEventListener('pointerover', function (e) {
    var media = e.target.closest && e.target.closest('.property-media');
    if (!media) return;
    var track = media.querySelector('.property-slides');
    warmUp(track, slideIndex(track));
  });

  // A photo URL from the feed that 404s falls back to the neutral placeholder
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName !== 'IMG' || img.dataset.fallback) return;
    if (!img.closest('.property-media, .detail-gallery, .gallery-modal')) return;
    img.dataset.fallback = '1';
    img.src = PLACEHOLDER_PROPERTY;
  }, true);

  // --- Public API ---

  PV.maps = maps;

  PV.render = {
    propertyCard: propertyCard,
    agentCard: agentCard,
    agentAvatar: agentAvatar,
    mediaNav: mediaNav,
    pagination: pagination,
    spinner: spinner,
    emptyState: emptyState,
    errorState: errorState,
    formatPrice: formatPrice,
    priceParts: priceParts,
    formatArea: formatArea,
    formatLandArea: formatLandArea,
    formatRooms: formatRooms,
    formatBathrooms: formatBathrooms,
    formatFloor: formatFloor,
    plural: plural,
    propertyHref: propertyHref,
    agentHref: agentHref,
    prefersReducedMotion: prefersReducedMotion,
    esc: esc,
  };
})();
