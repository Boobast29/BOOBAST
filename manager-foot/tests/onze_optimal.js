// Onze optimal contre composition gloutonne. Usage : node run_eval.js URL tests/onze_optimal.js
window.__T = (() => {
  const db = buildDefaultDatabase(); normalizeWorld(db); const out = { cas: [] };
  // brute force sur un petit cas : l'algorithme hongrois doit trouver l'optimum
  const C = [[4, 1, 3], [2, 0, 5], [3, 2, 2]]; const h = hongrois(C); out.hongrois = h; out.coutMin = h.reduce((s, j, i) => s + C[i][j], 0);
  for (const seed of [3, 5, 8, 13]) {
    G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', seed);
    for (const f of Object.keys(FORMATIONS).slice(0, 4)) {
      const t0 = performance.now(), opt = autoLineup(G, G.clubId, f), ms = performance.now() - t0;
      const glouton = autoLineupGlouton(G, G.clubId, f);
      out.cas.push([seed, f, +forceOnze(G, G.clubId, glouton.lineup, f).toFixed(1), +forceOnze(G, G.clubId, opt.lineup, f).toFixed(1), Math.round(ms), new Set(opt.lineup).size]);
    }
  }
  return out;
})();
