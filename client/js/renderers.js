// ===========================
// PV.render — Shared HTML generators & value maps
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var PLACEHOLDER_PROPERTY = 'images/placeholder-property.svg';

  var i18n = PV.i18n;
  var t = i18n.t;

  // --- Value mappings (API keys ↔ UI text) ---
  // toUi labels come from the dictionaries (i18n/*.js, "enum" section) in the
  // current language; unknown keys are shown as-is by the pages.

  // Which filter groups (listing page) and form fields (Oglasite) fit each type:
  // the same table as PROPERTY_TYPE_RULES in the backend (server/src/modules/shared/models.ts).
  // Group names are the data-scope values in nekretnine.html; "rooms" is the Broj soba dropdown.
  var BUILDING_GROUPS = ['rooms', 'bathrooms', 'year', 'heating', 'furnished', 'construction', 'condition', 'features', 'equipment'];
  var NO_ROOMS_GROUPS = BUILDING_GROUPS.filter(function (g) { return g !== 'rooms' && g !== 'furnished'; });
  var TYPE_GROUPS = {
    apartment: BUILDING_GROUPS.concat('floor'),
    house: BUILDING_GROUPS.concat('plotArea', 'infra'),
    commercial: BUILDING_GROUPS.concat('floor'),
    retail: NO_ROOMS_GROUPS,
    hospitality: BUILDING_GROUPS.concat('plotArea', 'infra'),
    warehouse: NO_ROOMS_GROUPS.concat('plotArea', 'infra'),
    garage: [],
    plot: ['infra'],
    farmland: ['infra'],
    industrial_land: ['infra'],
  };
  var OTHER_TYPE_GROUPS = BUILDING_GROUPS.concat('plotArea'); // a RELPER type without a key yet

  var maps = {
    transactionType: {
      // Hero tabs say "Kupovina" / "Izdavanje", the listing subnav "Prodaja" / "Izdavanje"
      toApi: { prodaja: 'sale', kupovina: 'sale', izdavanje: 'rent', iznajmljivanje: 'rent' },
      toUi: i18n.labels('enum.transactionType'),
    },
    propertyType: {
      // Type chip / select value → API type keys (RELPER's Kancelarija is
      // already "commercial" in the API)
      // "Zemljište" is one chip for the three land types (it opens them as subtypes)
      chips: {
        stan: ['apartment'],
        kuca: ['house'],
        zemljiste: ['plot', 'farmland', 'industrial_land'],
        poslovni: ['commercial'],
        lokal: ['retail'],
        garaza: ['garage'],
        hala: ['warehouse'],
        ugostiteljski: ['hospitality'],
      },
      // Does a filter group / form field fit the type?
      hasGroup: function (type, group) {
        return (TYPE_GROUPS[type] || OTHER_TYPE_GROUPS).indexOf(group) !== -1;
      },
      toUi: i18n.labels('enum.propertyType'),
    },
    // Spec value keys from the API.
    // Unknown keys are shown as-is (the API passes unmapped XML values through).
    furnished: {
      toUi: i18n.labels('enum.furnished'),
    },
    heating: {
      toUi: i18n.labels('enum.heating'),
    },
    registration: {
      toUi: i18n.labels('enum.registration'),
    },
    floor: {
      toUi: i18n.labels('enum.floor'),
    },
    // "Više filtera" groups (#16)
    construction: {
      toUi: i18n.labels('enum.construction'),
    },
    condition: {
      toUi: i18n.labels('enum.condition'),
    },
    equipment: {
      toUi: i18n.labels('enum.equipment'),
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
      toUi: i18n.labels('enum.feature'),
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
  // Kept for page scripts that still pass Serbian words; new code uses
  // PV.i18n.plural(n, key) with the dictionary forms.

  function plural(n, one, few, many) {
    if (n % 1 !== 0) return few; // decimals: "2,5 sobe"
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  // sr 2,5 · en 2.5 · ru 2,5 (thousands: 1.200 / 1,200 / 1 200)
  function formatNumber(n) {
    return i18n.number(n);
  }

  // --- Area formatters (area is m², landArea is ares) ---

  function formatArea(area) {
    return t('units.area', { n: formatNumber(area) });
  }

  // sr "6,29 ar", en "6.29 ares", ru "6,29 сот." (1 ar = 1 sotka)
  function formatLandArea(landArea) {
    return i18n.plural(landArea, 'units.ares');
  }

  // --- Rooms / bathrooms / floor ---

  function formatRooms(rooms) {
    if (rooms == null) return null;
    if (rooms === 0.5) return t('units.studio');
    return i18n.plural(rooms, 'units.rooms');
  }

  function formatBathrooms(bathrooms) {
    return i18n.plural(bathrooms, 'units.bathrooms');
  }

  // "3" → sr "3. sprat", en "3rd floor", ru "3-й этаж" (Serbian numbering kept:
  // the ground floor is "Prizemlje", "1" is the first floor above it)
  function formatFloor(floor) {
    if (floor == null || floor === '') return null;
    if (maps.floor.toUi[floor]) return maps.floor.toUi[floor];
    if (/^\d+$/.test(String(floor))) return t('units.floor', { n: i18n.ordinal(Number(floor)) });
    return String(floor);
  }

  // --- Price formatter ---

  function priceParts(price, transactionType) {
    if (price == null) return null;
    return {
      amount: formatNumber(Number(price)),
      unit: t(transactionType === 'rent' ? 'price.unitRent' : 'price.unitSale'),
    };
  }

  function formatPrice(price, transactionType) {
    var parts = priceParts(price, transactionType);
    return parts ? parts.amount + ' ' + parts.unit : t('price.onRequest');
  }

  // --- Property title ---
  // Serbian keeps the agency's own title. Until the titles are machine-translated
  // (i18n phase 7), English / Russian titles are built from the data in the
  // agency's order: places first (as written, "Okolina" left out), then the type
  // and the area, in capitals like the agency's titles in RELPER (Relja, 2026-11-02):
  // "NOVI SAD, TELEP, THREE-ROOM APARTMENT, 90 M²", "BAČ, HOUSE, 277 M²".
  // item: { title, propertyType (key), rooms, area, landArea, location }

  function propertyTitle(item) {
    if (i18n.lang === 'sr') return item.title;
    // The machine-translated agency title (i18n phase 7) when there is one
    var translated = item.translations && item.translations[i18n.lang];
    if (translated && translated.title) return translated.title;
    if (!item.propertyType) return item.title;
    var type = item.propertyType;
    var name;
    if (type === 'apartment' && item.rooms === 0.5) name = t('title.studio');
    else if (type === 'apartment' && item.rooms != null) name = t('title.apartmentRooms', { rooms: roomsAdjective(item.rooms) });
    else name = maps.propertyType.toUi[type] || t('card.fallbackTitle'); // "other": types not mapped yet (Lokal…)
    var area = item.area != null ? formatArea(item.area)
      : item.landArea != null ? formatLandArea(item.landArea)
      : null;
    var places = String(item.location || '').split(',').map(function (s) { return s.trim(); })
      .filter(function (s) { return s && s.toLowerCase() !== 'okolina'; });
    var parts = places.concat(name);
    if (area) parts.push(area);
    return parts.join(', ').toLocaleUpperCase(i18n.locale);
  }

  // 4 → "Four-room" / "Четырёхкомнатная"; values without their own word → "2.5-room"
  function roomsAdjective(rooms) {
    var key = 'title.roomsAdj.r' + String(rooms).replace('.', '_');
    return i18n.has(key) ? t(key) : t('title.roomsAdj.other', { n: formatNumber(rooms) });
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
      : '<span aria-hidden="true">—</span><span class="visually-hidden">' + t('card.notListed') + '</span>';
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
  // edges: card sliders stop at the first/last photo (no "back" on the first one);
  // the detail gallery and lightbox go round in a circle.
  function mediaNav(count, edges) {
    return (
      '<button type="button" class="media-nav media-nav--prev' + (edges ? ' is-off" disabled' : '"') + ' data-dir="-1" aria-label="' + t('media.prev') + '"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>' +
      '<button type="button" class="media-nav media-nav--next" data-dir="1" aria-label="' + t('media.next') + '"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>' +
      (count ? '<span class="media-count" aria-hidden="true"><span class="media-count-current">1</span> / ' + count + '</span>' : '')
    );
  }

  var CARD_SLIDES = 5;

  function propertyCard(item) {
    var title = propertyTitle(item) || t('card.fallbackTitle');
    var images = item.images && item.images.length
      ? item.images
      : [{ url: PLACEHOLDER_PROPERTY, alt: title }];
    // Photo alt texts from the feed are Serbian (the agency's title)
    function altOf(img) {
      return i18n.lang === 'sr' ? img.alt || title : title;
    }

    var href = esc(propertyHref(item));
    var isRent = item.transactionType === 'rent';
    var badgeText = maps.transactionType.toUi[item.transactionType] || '';

    // At most CARD_SLIDES slides: with more photos the last one is a blurred
    // "+N fotografija" slide that opens the listing. Only the first photo has a src;
    // the rest load on hover / arrow / swipe (warmUp), so a long list stays light.
    var more = images.length > CARD_SLIDES ? images.length - (CARD_SLIDES - 1) : 0;
    var photos = more ? images.slice(0, CARD_SLIDES - 1) : images;
    var slides = photos.map(function (img, i) {
      return '<img ' + (i === 0 ? 'src' : 'data-src') + '="' + esc(img.url) + '" alt="' + esc(altOf(img)) + '" loading="lazy" decoding="async" draggable="false" width="600" height="400">';
    }).join('');
    if (more) {
      slides +=
        '<span class="slide-more">' +
          '<img class="slide-more-bg" data-src="' + esc(images[CARD_SLIDES - 1].url) + '" alt="" loading="lazy" decoding="async" draggable="false" width="600" height="400">' +
          '<span class="slide-more-content">' +
            '<img class="slide-more-mark" src="images/pro-vizija-mark-white.svg" alt="" width="88" height="41">' +
            '<span class="slide-more-count"><span class="slide-more-plus">+</span>' + i18n.plural(more, 'card.morePhotos') + '</span>' +
            '<span class="slide-more-cta">' + t('card.seeAll') + ' <i class="bi bi-chevron-right" aria-hidden="true"></i></span>' +
          '</span>' +
        '</span>';
    }

    var nav = images.length > 1 ? mediaNav(images.length, true) : '';

    var price = priceParts(item.price, item.transactionType);
    var priceHtml = price
      ? '<p class="property-price"><span class="property-price-amount">' + esc(price.amount) + '</span><span class="property-price-unit">' + price.unit + '</span></p>'
      : '<p class="property-price is-on-request"><span class="property-price-amount">' + t('price.onRequest') + '</span><i class="bi bi-chat-dots" aria-hidden="true"></i></p>';

    var area = item.area != null ? formatArea(item.area)
      : item.landArea != null ? formatLandArea(item.landArea)
      : null;

    // Third stat: the floor of an apartment; a house has no floor, so it shows its plot
    // (ares) there instead. A plot already shows its ares in the first slot.
    var third = item.floor != null
      ? stat('bi-building', t('card.floor'), formatFloor(item.floor))
      : item.area != null && item.landArea != null
        ? stat('bi-bounding-box', t('card.plot'), formatLandArea(item.landArea))
        : stat('bi-building', t('card.floor'), null);

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
          '<h3 class="property-title"><a class="stretched-link" href="' + href + '">' + esc(title) + '</a></h3>' +
          priceHtml +
          '<ul class="property-stats">' +
            stat('bi-grid-3x3', t('card.area'), area) +
            stat('bi-door-open', t('card.rooms'), formatRooms(item.rooms)) +
            third +
          '</ul>' +
        '</div>' +
      '</article>'
    );
  }

  // --- Phone → WhatsApp / Viber (agent cards, agent profile, property page) ---

  // "064 111 2233" / "+381 64…" / "00381…" → "+38164…"
  function intlPhone(raw) {
    var d = String(raw || '').replace(/[^\d+]/g, '');
    if (!d) return null;
    if (d.indexOf('+') === 0) return d;
    if (d.indexOf('00') === 0) return '+' + d.slice(2);
    if (d.indexOf('0') === 0) return '+381' + d.slice(1);
    return '+' + d;
  }

  function whatsappHref(phone, text) {
    return 'https://wa.me/' + String(phone).replace('+', '') + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  function viberHref(phone) {
    return 'viber://chat?number=' + encodeURIComponent(phone);
  }

  // Bootstrap Icons has no Viber glyph: official mark from Simple Icons (CC0)
  var VIBER_PATH = 'M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.03-.644-.215-1.178-.58-1.557-.367-.378-.893-.574-1.52-.607h-.018z';

  function viberIcon(size) {
    return '<svg class="bi-viber" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + VIBER_PATH + '"/></svg>';
  }

  // Agents: a dedicated WhatsApp / Viber number from the API when there is one
  // (agent.whatsapp / agent.viber), otherwise the agent's phone
  function agentMessengers(agent) {
    var wa = intlPhone(agent.whatsapp || agent.phone);
    var vb = intlPhone(agent.viber || agent.phone);
    return { whatsapp: wa && whatsappHref(wa), viber: vb && viberHref(vb) };
  }

  // --- Agent card (matches .team-card in agenti.html) ---

  function agentCard(agent) {
    var href = esc(agentHref(agent));

    var contactLinks =
      '<a href="' + href + '" aria-label="' + esc(t('agent.viewProfile', { name: agent.fullName })) + '"><i class="bi bi-person" aria-hidden="true"></i></a>';
    if (agent.phone) {
      contactLinks += '<a href="tel:' + esc(agent.phone) + '" aria-label="' + esc(t('agent.call', { name: agent.fullName })) + '"><i class="bi bi-telephone" aria-hidden="true"></i></a>';
    }
    if (agent.email) {
      contactLinks += '<a href="mailto:' + esc(agent.email) + '" aria-label="' + esc(t('agent.email', { name: agent.fullName })) + '"><i class="bi bi-envelope" aria-hidden="true"></i></a>';
    }
    var chat = agentMessengers(agent);
    if (chat.whatsapp) {
      contactLinks += '<a class="team-contact-wa" href="' + esc(chat.whatsapp) + '" target="_blank" rel="noopener" aria-label="' + esc(t('agent.whatsapp', { name: agent.fullName })) + '"><i class="bi bi-whatsapp" aria-hidden="true"></i></a>';
    }
    if (chat.viber) {
      contactLinks += '<a class="team-contact-viber" href="' + esc(chat.viber) + '" aria-label="' + esc(t('agent.viber', { name: agent.fullName })) + '">' + viberIcon(17) + '</a>';
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

    var html = '<nav class="pv-pagination" aria-label="' + t('pagination.label') + '">';
    html += '<ul class="pagination justify-content-center">';

    // Previous
    if (pg.page > 1) {
      html += '<li class="page-item"><a class="page-link" href="#" data-page="' + (pg.page - 1) + '" aria-label="' + t('pagination.prev') + '"><i class="bi bi-chevron-left" aria-hidden="true"></i></a></li>';
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
      html += '<li class="page-item"><a class="page-link" href="#" data-page="' + (pg.page + 1) + '" aria-label="' + t('pagination.next') + '"><i class="bi bi-chevron-right" aria-hidden="true"></i></a></li>';
    }

    html += '</ul></nav>';
    return html;
  }

  // --- States: spinner, empty, error ---

  function spinner() {
    return (
      '<div class="pv-spinner text-center py-5">' +
        '<div class="spinner-border text-secondary" role="status">' +
          '<span class="visually-hidden">' + t('state.loading') + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function emptyState(msg) {
    return (
      '<div class="pv-empty text-center py-5">' +
        '<i class="bi bi-inbox" style="font-size:3rem;color:#ccc;" aria-hidden="true"></i>' +
        '<p class="mt-3 text-muted">' + esc(msg || t('state.empty')) + '</p>' +
      '</div>'
    );
  }

  // msg: a text, or the caught error — an API error carries a translated
  // message; any other error (a bug) shows the generic text, never its own
  function errorState(msg) {
    if (msg && typeof msg === 'object') msg = msg instanceof PV.ApiError ? msg.message : null;
    return (
      '<div class="pv-error text-center py-5">' +
        '<i class="bi bi-exclamation-triangle" style="font-size:3rem;color:#dc3545;" aria-hidden="true"></i>' +
        '<p class="mt-3 text-danger">' + esc(msg || t('errors.generic')) + '</p>' +
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
    // Cards stop at the ends; the detail gallery / lightbox go round
    var wraps = !btn.closest('.property-card') && (next < 0 || next >= count);
    next = wraps ? (next + count) % count : Math.max(0, Math.min(count - 1, next));

    warmUp(track, next);
    // Wrapping around jumps instead of rewinding through every photo
    track.scrollTo({
      left: next * track.clientWidth,
      behavior: wraps || prefersReducedMotion() ? 'auto' : 'smooth',
    });
  });

  // Cards: hide "back" on the first photo and "next" on the last
  function updateNav(track) {
    var index = slideIndex(track);
    var last = track.children.length - 1;
    var box = track.parentNode;
    [['.media-nav--prev', index <= 0], ['.media-nav--next', index >= last]].forEach(function (pair) {
      var btn = box.querySelector(pair[0]);
      if (!btn) return;
      if (pair[1] && btn === document.activeElement) {
        // Keyboard focus moves to the other arrow instead of being lost
        var other = box.querySelector(pair[0] === '.media-nav--prev' ? '.media-nav--next' : '.media-nav--prev');
        if (other && last > 0) other.focus();
      }
      btn.classList.toggle('is-off', pair[1]);
      btn.disabled = pair[1];
    });
  }

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
    if (track.closest('.property-card')) updateNav(track);
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
    agentMessengers: agentMessengers,
    intlPhone: intlPhone,
    whatsappHref: whatsappHref,
    viberHref: viberHref,
    viberIcon: viberIcon,
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
    formatNumber: formatNumber,
    propertyTitle: propertyTitle,
    plural: plural,
    propertyHref: propertyHref,
    agentHref: agentHref,
    prefersReducedMotion: prefersReducedMotion,
    esc: esc,
  };
})();
