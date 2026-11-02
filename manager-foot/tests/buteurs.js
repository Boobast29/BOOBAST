// Usage : dans la console du jeu (index.html servi en local), coller ce fichier puis lire window.__T
window.__T = (() => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 2).id, 'T', 5); G.__harness = true; if (G.cell) G.cell.deleg = 'execute';
  let g = 0; while (G.week < G.schedule.length && g++ < 200) simWeek(G);
  const out = {};
  for (const L of leagueComps(G)) {
    const t = G.players.filter(p => L.clubs.includes(p.club)).sort((a, b) => b.stats.lg - a.stats.lg);
    const tot = G.players.filter(p => p.club != null && !getClub(G, p.club).foreign).sort((a, b) => b.stats.goals - a.stats.goals);
    out[L.name] = { journees: L.fixtures.length, top3champ: t.slice(0, 3).map(p => `${p.name} ${p.stats.lg}`), top1toutes: tot[0] && `${tot[0].name} ${tot[0].stats.goals} (${tot[0].stats.apps} m)` };
  }
  return out;
})();
