// ===========================
// reveal.js — sections ease in as they scroll into view
// ===========================
// Subtle: opacity + a 14px rise, strong ease-out, 60ms stagger inside a batch.
// What is already on screen when the page opens is left alone (nothing waits to
// appear). Property / agent cards that arrive from the API ease in when inserted.
// prefers-reduced-motion: nothing is hidden or moved.
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Static content, per section
  var STATIC = [
    '.section-tag', '.section-title', '.section-description', '.btn-view-all',
    '.stat-item', '.step-card', '.accordion-item',
    '.about-img-wrap', '.about-content', '.value-item',
    '.partners-title', '.testimonial-card',
    '.cta-title', '.cta-description', '.cta-buttons', '.cta-feature',
    '.kontakt-form-card', '.info-card', '.map-container',
  ].join(',');
  // Rendered later from the API
  var CARDS = '.property-card, .team-card';

  var STAGGER = 60;      // ms between items revealed together
  var MAX_DELAY = 300;   // the last item of a long batch never waits longer than this

  function belowFold(el) {
    return el.getBoundingClientRect().top > window.innerHeight * 0.92;
  }

  // Once done, hand the element back to its own styles (hover lifts, transitions).
  // A timer, not transitionend: that event is skipped when a transition is cut short.
  var DURATION = 550;

  function play(items) {
    items.forEach(function (el, i) {
      var delay = Math.min(i * STAGGER, MAX_DELAY);
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('rv-in');
      setTimeout(function () {
        el.classList.remove('rv', 'rv-in', 'rv-quick');
        el.style.transitionDelay = '';
      }, delay + DURATION + 80);
    });
  }

  var io = new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
    batch.forEach(function (el) { io.unobserve(el); });
    // Reveal in reading order
    batch.sort(function (a, b) {
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (ra.top - rb.top) || (ra.left - rb.left);
    });
    play(batch);
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  function watch(el) {
    if (el.classList.contains('rv')) return;
    el.classList.add('rv');
    io.observe(el);
  }

  document.querySelectorAll(STATIC).forEach(function (el) {
    if (belowFold(el)) watch(el);
  });

  // Cards from the API: below the fold → reveal on scroll; on screen → ease in now
  var fresh = [];
  var queued = false;
  function flushFresh() {
    queued = false;
    var now = fresh.splice(0);
    now.forEach(function (el) { el.classList.add('rv', 'rv-quick'); });
    // Two frames: let the hidden state paint before transitioning out of it
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { play(now); });
    });
  }

  new MutationObserver(function (records) {
    records.forEach(function (r) {
      r.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        var cards = node.matches && node.matches(CARDS) ? [node] : [].slice.call(node.querySelectorAll ? node.querySelectorAll(CARDS) : []);
        cards.forEach(function (card) {
          if (card.classList.contains('rv')) return;
          if (belowFold(card)) watch(card);
          else fresh.push(card);
        });
      });
    });
    if (fresh.length && !queued) {
      queued = true;
      requestAnimationFrame(flushFresh);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
