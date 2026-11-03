// Recommandations selon les besoins du club. Usage : node run_eval.js URL tests/recommandation.js
window.__T = (() => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 2).id, 'T', 3);
  const t0 = performance.now(); const R = recommandations(G); const ms = Math.round(performance.now() - t0);
  const el = document.createElement('div'); el.innerHTML = blocRecommandations(G);
  return { ms, budget: R.budget, moy: R.B.moy, top: R.liste.slice(0, 5).map(r => [r.x.name, r.x.pos, r.x.age, estOvr(G, r.x), '+' + Math.round(r.gain), r.cible.o, Math.round(r.x.value / 1e5) / 10 + 'M']), lignes: el.querySelectorAll('tbody tr').length };
})();
