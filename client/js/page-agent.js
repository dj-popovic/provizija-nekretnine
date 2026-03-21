// ===========================
// page-agent.js — Agent detail page
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var esc = PV.render.esc;
  var heroWrap = document.getElementById('agentHero');
  var contentWrap = document.getElementById('agentContent');

  function getSlug() {
    var params = new URLSearchParams(window.location.search);
    return params.get('slug') || null;
  }

  // --- Build hero ---

  function buildHero(agent) {
    return (
      '<div class="container">' +
        '<div class="page-hero-tag">Profil agenta</div>' +
        '<h1 class="page-hero-title">' + esc(agent.fullName) + '</h1>' +
        (agent.shortBio ? '<p class="page-hero-subtitle">' + esc(agent.shortBio) + '</p>' : '') +
        '<nav class="breadcrumb-nav" aria-label="Breadcrumb">' +
          '<a href="index.html">Početna</a><span class="separator">/</span>' +
          '<a href="agenti.html">Agenti</a><span class="separator">/</span>' +
          '<span class="current">' + esc(agent.fullName) + '</span>' +
        '</nav>' +
      '</div>'
    );
  }

  // --- Build sidebar card ---

  function buildSidebar(agent) {
    var photo = agent.photo || 'images/placeholder-agent.jpg';

    var html =
      '<div class="col-lg-4 agent-detail-sidebar-col">' +
        '<div class="agent-detail-card">' +
          '<img src="' + esc(photo) + '" alt="' + esc(agent.fullName) + '" class="agent-detail-img" loading="lazy" width="400" height="340">' +
          '<div class="agent-detail-info">' +
            '<div class="agent-detail-name">' + esc(agent.fullName) + '</div>' +
            (agent.stats && agent.stats.label ? '<div class="agent-detail-role">' + esc(agent.stats.label) + '</div>' : '') +
            '<div class="agent-contact-btns">';

    if (agent.phone) {
      html += '<a href="tel:' + esc(agent.phone) + '" class="btn-agent-phone"><i class="bi bi-telephone-fill" aria-hidden="true"></i> ' + esc(agent.phone) + '</a>';
    }
    if (agent.email) {
      html += '<a href="mailto:' + esc(agent.email) + '" class="btn-agent-mail"><i class="bi bi-envelope" aria-hidden="true"></i> ' + esc(agent.email) + '</a>';
    }

    html +=
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return html;
  }

  // --- Build contact form ---

  function buildForm(agent) {
    return (
      '<div class="agent-quick-contact">' +
        '<h4>Pošaljite upit – ' + esc(agent.fullName) + '</h4>' +
        '<form id="agentInquiryForm" class="needs-validation" novalidate aria-label="Kontakt forma za agenta">' +
          '<input type="hidden" name="agentId" value="' + esc(agent.agentId) + '">' +
          '<div class="row g-3">' +
            '<div class="col-md-6"><input type="text" class="form-control" name="fullName" placeholder="Ime i prezime" required aria-label="Ime i prezime"></div>' +
            '<div class="col-md-6"><input type="tel" class="form-control" name="phone" placeholder="Telefon" required aria-label="Telefon"></div>' +
            '<div class="col-12"><input type="email" class="form-control" name="email" placeholder="Email adresa" required aria-label="Email"></div>' +
            '<div class="col-12"><textarea class="form-control" name="message" placeholder="Kratka poruka..." aria-label="Poruka"></textarea></div>' +
            '<div class="col-12"><button type="submit" class="btn-submit-full"><i class="bi bi-send" aria-hidden="true"></i> Pošaljite Upit</button></div>' +
          '</div>' +
        '</form>' +
      '</div>'
    );
  }

  // --- Build portfolio ---

  function buildPortfolio(agent, properties) {
    if (!properties || properties.length === 0) return '';

    var cards = properties.map(function (item) {
      return '<div class="col-md-6">' + PV.render.propertyCard(item) + '</div>';
    }).join('');

    return (
      '<div>' +
        '<div class="section-tag">Portfolio</div>' +
        '<h2 class="section-title" style="font-size:30px;text-align:left;">Nekretnine – ' + esc(agent.fullName) + '</h2>' +
        '<p style="color:var(--text-light);margin-bottom:28px;">Aktivni oglasi</p>' +
        '<div class="row g-4">' + cards + '</div>' +
      '</div>'
    );
  }

  // --- Build full page ---

  function buildPage(agent, properties) {
    var html = '<div class="row g-5">';

    // Left column
    html += '<div class="col-lg-8">';
    html += buildForm(agent);

    // Bio
    if (agent.shortBio) {
      html += '<div class="mb-5">';
      html += '<div class="section-tag">O agentu</div>';
      html += '<h2 class="section-title" style="font-size:30px;text-align:left;">Kratki opis</h2>';
      html += '<p style="color:var(--text-light);font-size:17px;line-height:1.8;">' + esc(agent.shortBio) + '</p>';
      html += '</div>';
    }

    html += buildPortfolio(agent, properties);
    html += '</div>';

    // Right sidebar
    html += buildSidebar(agent);

    html += '</div>';
    return html;
  }

  // --- 404 ---

  function build404() {
    return (
      '<div class="text-center py-5">' +
        '<i class="bi bi-person-slash" style="font-size:4rem;color:#ccc;" aria-hidden="true"></i>' +
        '<h2 class="mt-3" style="color:var(--primary);">Agent nije pronađen</h2>' +
        '<p class="text-muted">Traženi agent ne postoji.</p>' +
        '<a href="agenti.html" class="btn-submit-full" style="display:inline-block;width:auto;padding:12px 32px;margin-top:16px;">Pogledajte sve agente</a>' +
      '</div>'
    );
  }

  // --- Load ---

  async function loadAgent() {
    var slug = getSlug();

    if (!slug) {
      heroWrap.style.display = 'none';
      contentWrap.innerHTML = build404();
      return;
    }

    contentWrap.innerHTML = PV.render.spinner();

    try {
      var res = await PV.api.get('/api/agents/' + encodeURIComponent(slug));
      var agent = res.data.agent;
      var properties = res.data.properties || [];

      // Update page title
      document.title = agent.fullName + ' | ProVizija Nekretnine';

      // Render hero
      heroWrap.innerHTML = buildHero(agent);

      // Render content
      contentWrap.innerHTML = buildPage(agent, properties);

    } catch (err) {
      if (err.status === 404) {
        heroWrap.style.display = 'none';
        contentWrap.innerHTML = build404();
      } else {
        contentWrap.innerHTML = PV.render.errorState(err.message);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadAgent();
  });
})();
