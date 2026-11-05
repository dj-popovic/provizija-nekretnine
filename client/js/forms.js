// ===========================
// forms.js — All POST form handlers
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var t = PV.i18n.t;

  // --- Shared helpers ---

  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i> ' + t('form.sending');
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

  // The API's field messages are English ("Email is not valid.") — show our own text by kind
  function fieldMessage(apiMessage) {
    var msg = String(apiMessage || '');
    if (/required/i.test(msg)) return t('form.fieldError.required');
    if (/too long/i.test(msg)) return t('form.fieldError.tooLong');
    return t('form.fieldError.invalid');
  }

  function markField(input, message) {
    input.classList.add('is-invalid');
    var feedback = document.createElement('div');
    feedback.className = 'invalid-feedback form-field-error';
    feedback.textContent = message;
    input.parentNode.appendChild(feedback);
  }

  function showFieldErrors(form, details) {
    if (!details || !details.length) return;

    // API field names = the inputs' name attributes
    details.forEach(function (detail) {
      var input = form.querySelector('[name="' + detail.field + '"]');
      if (input) markField(input, fieldMessage(detail.message));
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
      return t('form.rateLimit');
    }
    return err.message || t('errors.generic');
  }

  function showSubmitError(form, container, err) {
    if (err.status === 400 && err.details) {
      showFieldErrors(form, err.details);
      showAlert(container, 'danger', err.message || t('errors.VALIDATION_ERROR'));
    } else {
      showAlert(container, 'danger', getErrorMessage(err));
    }
  }

  function successHtml(titleKey, textKey, extra) {
    return (
      '<div class="text-center ' + (extra ? 'py-5' : 'py-4') + '">' +
        '<i class="bi bi-check-circle" style="font-size:3rem;color:#27c964;" aria-hidden="true"></i>' +
        '<h3 style="margin-top:16px;color:var(--primary);">' + t(titleKey) + '</h3>' +
        '<p style="color:var(--text-light);">' + t(textKey) + '</p>' +
        (extra || '') +
      '</div>'
    );
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
      // The option value is the Serbian topic in every language, so the e-mail stays Serbian
      var subject = (document.getElementById('k-tema').value || '').trim();
      var message = (document.getElementById('k-poruka').value || '').trim();

      // Client-side validation
      if (!firstName || !lastName || !phone || !email || !subject || !message) {
        showAlert(card, 'danger', t('form.required.contact'));
        return;
      }
      var consent = document.getElementById('gdpr');
      if (consent && !consent.checked) {
        showAlert(card, 'danger', t('form.consentRequired'));
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
          lang: PV.i18n.lang,
        });

        // Success — replace form with success message
        card.innerHTML = successHtml('form.success.contactTitle', 'form.success.contactText');

      } catch (err) {
        setLoading(btn, false);
        showSubmitError(form, card, err);
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
    body.lang = PV.i18n.lang;

    // Client-side validation — all four fields are required; the agent needs to know what the visitor wants
    var missing = ['fullName', 'phone', 'email', 'message'].filter(function (name) { return !body[name]; });
    if (missing.length) {
      missing.forEach(function (name) {
        var input = form.querySelector('[name="' + name + '"]');
        if (input) markField(input, name === 'message' ? t('form.messageRequired') : t('form.fieldError.required'));
      });
      showAlert(container, 'danger', t('form.required.inquiry'));
      var first = form.querySelector('[name="' + missing[0] + '"]');
      if (first) first.focus();
      return;
    }

    setLoading(btn, true);

    PV.api.post(endpoint, body)
      .then(function () {
        container.innerHTML = successHtml('form.success.inquiryTitle', 'form.success.inquiryText');
      })
      .catch(function (err) {
        setLoading(btn, false);
        showSubmitError(form, container, err);
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
  // Select values: namena / tip / pregovaranje hold the API keys; the other selects hold
  // the Serbian option text, which goes to the e-mail as is. Only the labels are translated.

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

  function fieldValue(id) {
    return (document.getElementById(id).value || '').trim();
  }

  // Fields that fit the chosen type: the listing page's filter groups (renderers.js);
  // "Ostalo" shows them all. A hidden field is not sent, so the agency never gets
  // "Sobe: Garsonjera" for a garage or a plot.
  function typeFieldFits(type, field) {
    return type === 'other' || PV.maps.propertyType.hasGroup(type, field);
  }

  function syncTypeFields(form) {
    var type = fieldValue('og-tip');
    form.querySelectorAll('[data-type-field]').forEach(function (el) {
      el.hidden = !typeFieldFits(type, el.dataset.typeField);
    });
    // Land is measured in ares
    var isLand = PV.maps.propertyType.chips.zemljiste.indexOf(type) !== -1;
    form.querySelector('label[for="og-povrsina"]').textContent = isLand ? t('advertise.areaLand') : t('advertise.area');
  }

  function initAdvertiseForm() {
    var form = document.getElementById('advertiseForm');
    if (!form) return;

    syncTypeFields(form);
    document.getElementById('og-tip').addEventListener('change', function () { syncTypeFields(form); });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var card = form.closest('.oglasite-form-card') || form.parentNode;

      clearAlerts(card);
      clearFieldErrors(form);

      // Collect required fields
      var transactionType = fieldValue('og-namena');
      var propertyType = fieldValue('og-tip');
      var city = fieldValue('og-grad');
      var area = parseInt(document.getElementById('og-povrsina').value, 10);
      var fits = function (field) { return typeFieldFits(propertyType, field); };
      var rooms = fits('rooms') ? fieldValue('og-sobe') : '';
      var expectedPrice = parseInt(document.getElementById('og-cena').value, 10);
      var priceType = fieldValue('og-pregovaranje');
      var description = fieldValue('og-opis');
      var fullName = fieldValue('og-ime');
      var phone = fieldValue('og-tel');
      var email = fieldValue('og-email');

      // Client-side validation for required fields
      if (!fullName || !phone || !email || !city || !description || !area || !expectedPrice) {
        showAlert(card, 'danger', t('form.required.advertise'));
        return;
      }
      var consent = document.getElementById('og-gdpr');
      if (consent && !consent.checked) {
        showAlert(card, 'danger', t('form.consentRequired'));
        return;
      }

      // Collect optional fields
      var district = fieldValue('og-opstina');
      var address = fieldValue('og-adresa');
      var floor = fits('floor') ? fieldValue('og-sprat') : '';
      var heating = fits('heating') ? fieldValue('og-grejanje') : '';
      var yearBuilt = fits('year') ? parseInt(document.getElementById('og-godina').value, 10) : NaN;

      // Collect features
      var features = [];
      featureCheckboxes.forEach(function (f) {
        var cb = document.getElementById(f.id);
        if (cb && cb.checked && fits('features')) features.push(f.value);
      });

      // Build body
      var body = {
        transactionType: transactionType,
        propertyType: propertyType,
        city: city,
        area: area,
        expectedPrice: expectedPrice,
        priceType: priceType,
        description: description,
        fullName: fullName,
        phone: phone,
        email: email,
        lang: PV.i18n.lang,
      };

      // Add optional fields only if present
      if (rooms) body.rooms = rooms;
      if (district) body.district = district;
      if (address) body.address = address;
      if (floor) body.floor = floor;
      if (heating) body.heating = heating;
      if (!isNaN(yearBuilt) && yearBuilt > 0) body.yearBuilt = yearBuilt;
      if (features.length > 0) body.features = features;

      setLoading(btn, true);

      try {
        await PV.api.post('/api/advertise-property', body);

        card.innerHTML = successHtml('form.success.advertiseTitle', 'form.success.advertiseText',
          '<a href="index.html" class="btn-submit-full" style="display:inline-block;width:auto;padding:12px 32px;margin-top:16px;">' + t('form.success.backHome') + '</a>');

      } catch (err) {
        setLoading(btn, false);
        showSubmitError(form, card, err);
      }
    });
  }

  // --- Init static forms on DOMContentLoaded ---

  document.addEventListener('DOMContentLoaded', function () {
    initContactForm();
    initAdvertiseForm();
  });
})();
