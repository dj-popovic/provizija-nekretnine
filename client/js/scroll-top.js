// ===========================
// scroll-top.js — "back to top" button, bottom-left on every page
// ===========================
(function () {
  'use strict';

  var SHOW_AFTER = 400; // px scrolled before the button appears

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Nazad na vrh stranice');
  btn.innerHTML = '<i class="bi bi-arrow-up" aria-hidden="true"></i>';
  // Hidden from keyboard and screen readers until it is shown
  btn.tabIndex = -1;
  btn.setAttribute('aria-hidden', 'true');
  document.body.appendChild(btn);

  var shown = false;
  function update() {
    var show = window.scrollY > SHOW_AFTER;
    if (show === shown) return;
    shown = show;
    btn.classList.toggle('is-visible', show);
    btn.tabIndex = show ? 0 : -1;
    btn.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  window.addEventListener('scroll', update, { passive: true });
  update();

  btn.addEventListener('click', function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // Keyboard users continue from the top of the page
    var skipTo = document.querySelector('.navbar-brand');
    if (skipTo) skipTo.focus({ preventScroll: true });
  });
})();
