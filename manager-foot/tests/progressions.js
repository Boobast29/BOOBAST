// Radar des progressions. Usage : node tests/run_eval.js URL tests/progressions.js
window.__T = (async () => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3);
  G.__harness = true; for (let i = 0; i < 14; i++) simWeek(G); G.__harness = false;
  const el = document.createElement('div'); document.body.appendChild(el);
  STATS_TAB = 'prog'; vStats(el);
  const lignes = el.querySelectorAll('tbody tr').length, onglet = !!el.querySelector('[data-st="prog"].on');
  const taille = (G.prog.debut || '').length + (G.prog.recent || '').length + (G.prog.mois || '').length;
  STATS_TAB = 'leaders'; vStats(el); const retour = !!el.querySelector('[data-st="leaders"].on') && !!el.querySelector('[data-st="prog"]');
  return { lignes, onglet, retour, taille, exemple: el.innerText.slice(0, 0) };
})();
