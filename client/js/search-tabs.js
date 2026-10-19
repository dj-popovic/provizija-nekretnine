// ===========================
// search-tabs.js — Home hero search tab switcher (vanilla JS, no Bootstrap tabs)
// Moved out of an inline <script> in index.html so the Content-Security-Policy
// can forbid inline scripts.
// ===========================
(function () {
  'use strict';

  var tabs = document.querySelectorAll('.search-tabs [data-tab]');
  var panes = document.querySelectorAll('.search-tab-content');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = this.dataset.tab;

      tabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');

      panes.forEach(function (pane) {
        pane.hidden = pane.id !== 'tab-' + target;
      });
    });
  });
})();
