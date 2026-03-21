// ===========================
// page-agents.js — Agent listing page
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var grid = document.getElementById('agentsGrid');

  async function loadAgents() {
    if (!grid) return;

    grid.innerHTML = PV.render.spinner();

    try {
      var res = await PV.api.get('/api/agents');
      var agents = res.items || [];

      if (agents.length === 0) {
        grid.innerHTML = PV.render.emptyState('Trenutno nema agenata.');
        return;
      }

      grid.innerHTML = agents.map(function (agent) {
        return '<div class="col-lg-4 col-md-6">' + PV.render.agentCard(agent) + '</div>';
      }).join('');

    } catch (err) {
      grid.innerHTML = PV.render.errorState(err.message);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadAgents();
  });
})();
