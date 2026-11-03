// Cartes de chaleur (orientation, compression, matchs sans mon club). Usage : node run_eval.js URL tests/carte_chaleur.js
window.__T = (() => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3);
  const L = clubLeague(G, G.clubId), f = L.fixtures[0].find(x => x.h === G.clubId || x.a === G.clubId);
  const m = new Match(G, { ...f, res: null }, aiTactics(G, f.h, f.a), aiTactics(G, f.a, f.h), {}); m.sides[0].ai = m.sides[1].ai = true; m.auto = true; m.runToEnd();
  const R = reportFromMatch(m), ids = Object.keys(R.heat || {});
  const gb = ids.find(id => getPlayer(G, +id).pos === 'GB' && R.pr[id][0] === 0), bu = ids.find(id => getPlayer(G, +id).pos === 'BU' && R.pr[id][0] === 0);
  const colMoy = g0 => { const g = chaleurGrille(g0); let s = 0, n = 0; g.forEach((v, i) => { s += (i % 12) * v; n += v; }); return +(s / n).toFixed(1); };
  // autre match sans mon club : aucune carte relevée
  const g = L.fixtures[0].find(x => x.h !== G.clubId && x.a !== G.clubId);
  const m2 = new Match(G, { ...g, res: null }, aiTactics(G, g.h, g.a), aiTactics(G, g.a, g.h), {}); m2.sides[0].ai = m2.sides[1].ai = true; m2.auto = true; m2.runToEnd();
  return { taille: JSON.stringify(R.heat).length, joueurs: ids.length, gardienColonne: gb && colMoy(R.heat[gb]), butColonne: bu && colMoy(R.heat[bu]), html: analysisHTML(m.names, ['#f00', '#00f'], R).includes('ch-carte'), sansMonClub: m2._ch === null };
})();
