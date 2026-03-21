// ===========================
// forms.js — All POST form handlers
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  // --- Shared helpers ---

  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Slanje...';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
  }

  function showAlert(container, type, message) {
    var existing = container.querySelector('.form-alert');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.className = 'form-alert alert alert-' + type;
    div.setAttribute('role', 'alert');
    div.textContent = message;
    container.prepend(div);
  }

  function clearAlerts(container) {
    var alerts = container.querySelectorAll('.form-alert');
    alerts.forEach(function (a) { a.remove(); });
  }

  function showFieldErrors(form, details) {
    if (!details || !details.length) return;

    // Map API field names to form input selectors
    details.forEach(function (detail) {
      var input = form.querySelector('[name="' + detail.field + '"]');
      if (input) {
        input.classList.add('is-invalid');
        var feedback = document.createElement('div');
        feedback.className = 'invalid-feedback form-field-error';
        feedback.textContent = detail.message;
        input.parentNode.appendChild(feedback);
      }
    });
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });
    form.querySelectorAll('.form-field-error').forEach(function (el) {
      el.remove();
    });
  }

  function getErrorMessage(err) {
    if (err.status === 429) {
      return 'Previše zahteva. Pokušajte ponovo za nekoliko minuta.';
    }
    return err.message || 'Došlo je do greške. Pokušajte ponovo.';
  }

  // --- C1: Contact form (kontakt.html) ---

  function initContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var card = form.closest('.kontakt-form-card') || form.parentNode;

      clearAlerts(card);
      clearFieldErrors(form);

      // Collect fields
      var firstName = (document.getElementById('k-ime').value || '').trim();
      var lastName = (document.getElementById('k-prezime').value || '').trim();
      var phone = (document.getElementById('k-tel').value || '').trim();
      var email = (document.getElementById('k-email').value || '').trim();
      var subject = (document.getElementById('k-tema').value || '').trim();
      var message = (document.getElementById('k-poruka').value || '').trim();

      // Client-side validation
      if (!firstName || !lastName || !phone || !email || !subject || !message) {
        showAlert(card, 'danger', 'Molimo popunite sva obavezna polja.');
        return;
      }

      setLoading(btn, true);

      try {
        await PV.api.post('/api/contact', {
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          email: email,
          subject: subject,
          message: message,
        });

        // Success — replace form with success message
        card.innerHTML =
          '<div class="text-center py-4">' +
            '<i class="bi bi-check-circle" style="font-size:3rem;color:#27c964;" aria-hidden="true"></i>' +
            '<h3 style="margin-top:16px;color:var(--primary);">Poruka je poslata!</h3>' +
            '<p style="color:var(--text-light);">Hvala vam na poruci. Javićemo vam se u najkraćem roku.</p>' +
          '</div>';

      } catch (err) {
        setLoading(btn, false);

        if (err.status === 400 && err.details) {
          showFieldErrors(form, err.details);
          showAlert(card, 'danger', err.message || 'Molimo ispravite greške u formularu.');
        } else {
          showAlert(card, 'danger', getErrorMessage(err));
        }
      }
    });
  }

  // --- C2: Inquiry forms (property detail + agent detail) ---
  // These forms are dynamically rendered, so use event delegation.

  function handleInquirySubmit(form, endpoint) {
    var btn = form.querySelector('button[type="submit"]');
    var container = form.closest('.agent-contact-card') || form.closest('.agent-quick-contact') || form.parentNode;

    clearAlerts(container);
    clearFieldErrors(form);

    // Collect fields via name attributes
    var body = {};
    var inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(function (input) {
      if (input.name) {
        body[input.name] = (input.value || '').trim();
      }
    });

    // Client-side validation — fullName, phone, email required
    if (!body.fullName || !body.phone || !body.email) {
      showAlert(container, 'danger', 'Molimo popunite ime, telefon i email.');
      return;
    }

    setLoading(btn, true);

    PV.api.post(endpoint, body)
      .then(function () {
        container.innerHTML =
          '<div class="text-center py-4">' +
            '<i class="bi bi-check-circle" style="font-size:3rem;color:#27c964;" aria-hidden="true"></i>' +
            '<h3 style="margin-top:16px;color:var(--primary);">Upit je poslat!</h3>' +
            '<p style="color:var(--text-light);">Hvala vam. Javićemo vam se u najkraćem roku.</p>' +
          '</div>';
      })
      .catch(function (err) {
        setLoading(btn, false);
        if (err.status === 400 && err.details) {
          showFieldErrors(form, err.details);
          showAlert(container, 'danger', err.message || 'Molimo ispravite greške u formularu.');
        } else {
          showAlert(container, 'danger', getErrorMessage(err));
        }
      });
  }

  // Delegated listener for dynamically rendered inquiry forms
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.id === 'propertyInquiryForm') {
      e.preventDefault();
      handleInquirySubmit(form, '/api/inquiries/property');
    } else if (form.id === 'agentInquiryForm') {
      e.preventDefault();
      handleInquirySubmit(form, '/api/inquiries/agent');
    }
  });

  // --- C3: Advertise property form (oglasite-nekretninu.html) ---

  // Value mappings for advertise form (Serbian UI → English API)
  var transactionTypeMap = { 'Prodaja': 'sale', 'Iznajmljivanje': 'rent' };
  var propertyTypeMap = {
    'Stan': 'apartment', 'Kuća': 'house', 'Poslovni prostor': 'commercial',
    'Zemljište': 'land', 'Garaža': 'garage', 'Ostalo': 'other',
  };
  var priceTypeMap = { 'Fiksna': 'fixed', 'Po dogovoru': 'negotiable', 'Hitna prodaja': 'urgent' };
  var featureCheckboxes = [
    { id: 'f-lift', value: 'lift' },
    { id: 'f-parking', value: 'parking' },
    { id: 'f-terasa', value: 'terrace' },
    { id: 'f-bazen', value: 'pool' },
    { id: 'f-dvor', value: 'yard' },
    { id: 'f-klima', value: 'airConditioning' },
    { id: 'f-internet', value: 'internet' },
    { id: 'f-alarm', value: 'alarm' },
  ];

  function parseRooms(val) {
    if (!val) return null;
    if (val === 'Garsonjera') return 0;
    var match = val.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  function initAdvertiseForm() {
    var form = document.getElementById('advertiseForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var card = form.closest('.oglasite-form-card') || form.parentNode;

      clearAlerts(card);
      clearFieldErrors(form);

      // Collect required fields
      var transactionType = transactionTypeMap[document.getElementById('og-namena').value] || document.getElementById('og-namena').value;
      var propertyType = propertyTypeMap[document.getElementById('og-tip').value] || document.getElementById('og-tip').value;
      var city = (document.getElementById('og-grad').value || '').trim();
      var area = parseInt(document.getElementById('og-povrsina').value, 10);
      var rooms = parseRooms(document.getElementById('og-sobe').value);
      var expectedPrice = parseInt(document.getElementById('og-cena').value, 10);
      var priceType = priceTypeMap[document.getElementById('og-pregovaranje').value] || document.getElementById('og-pregovaranje').value;
      var description = (document.getElementById('og-opis').value || '').trim();
      var fullName = (document.getElementById('og-ime').value || '').trim();
      var phone = (document.getElementById('og-tel').value || '').trim();
      var email = (document.getElementById('og-email').value || '').trim();

      // Client-side validation for required fields
      if (!fullName || !phone || !email || !city || !description || !area || !expectedPrice) {
        showAlert(card, 'danger', 'Molimo popunite sva obavezna polja (površina, cena, opis, kontakt podaci).');
        return;
      }

      // Collect optional fields
      var district = (document.getElementById('og-opstina').value || '').trim();
      var address = (document.getElementById('og-adresa').value || '').trim();
      var floor = document.getElementById('og-sprat').value || null;
      var heating = (document.getElementById('og-grejanje').value || '').trim();
      var yearBuilt = parseInt(document.getElementById('og-godina').value, 10);

      // Collect features
      var features = [];
      featureCheckboxes.forEach(function (f) {
        var cb = document.getElementById(f.id);
        if (cb && cb.checked) features.push(f.value);
      });

      // Build body
      var body = {
        transactionType: transactionType,
        propertyType: propertyType,
        city: city,
        area: area,
        rooms: rooms,
        expectedPrice: expectedPrice,
        priceType: priceType,
        description: description,
        fullName: fullName,
        phone: phone,
        email: email,
      };

      // Add optional fields only if present
      if (district) body.district = district;
      if (address) body.address = address;
      if (floor) body.floor = floor;
      if (heating) body.heating = heating;
      if (!isNaN(yearBuilt) && yearBuilt > 0) body.yearBuilt = yearBuilt;
      if (features.length > 0) body.features = features;

      setLoading(btn, true);

      try {
        await PV.api.post('/api/advertise-property', body);

        card.innerHTML =
          '<div class="text-center py-5">' +
            '<i class="bi bi-check-circle" style="font-size:3rem;color:#27c964;" aria-hidden="true"></i>' +
            '<h3 style="margin-top:16px;color:var(--primary);">Oglas je poslat!</h3>' +
            '<p style="color:var(--text-light);">Hvala vam. Naš tim će pregledati vaš oglas i javiti vam se u roku od 24 sata.</p>' +
            '<a href="index.html" class="btn-submit-full" style="display:inline-block;width:auto;padding:12px 32px;margin-top:16px;">Nazad na početnu</a>' +
          '</div>';

      } catch (err) {
        setLoading(btn, false);

        if (err.status === 400 && err.details) {
          showFieldErrors(form, err.details);
          showAlert(card, 'danger', err.message || 'Molimo ispravite greške u formularu.');
        } else {
          showAlert(card, 'danger', getErrorMessage(err));
        }
      }
    });
  }

  // --- Init static forms on DOMContentLoaded ---

  document.addEventListener('DOMContentLoaded', function () {
    initContactForm();
    initAdvertiseForm();
  });
})();
