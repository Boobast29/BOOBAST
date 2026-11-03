window.__T = (async () => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3);
  G.__harness = true; for (let i = 0; i < 20; i++) simWeek(G); G.__harness = false;
  const comp = clubLeague(G, G.clubId);
  const t0 = performance.now(); const S = simulerFinSaison(G, comp); const ms = Math.round(performance.now() - t0);
  const S2 = simulerFinSaison(G, comp);
  const sc = scoresProbables(5), sc0 = scoresProbables(0);
  const titreTotal = S.res.reduce((s, r) => s + r.pos[0], 0);
  return { ms, restants: S.restants, titreTotal: +titreTotal.toFixed(3), deterministe: JSON.stringify(S) === JSON.stringify(S2), top3: S.res.slice(0, 3).map(r => [getClub(G, r.id).name, r.pts, Math.round(r.ptsProj), Math.round(r.pos[0] * 100)]), favori: sc.top.map(x => x[0] + '-' + x[1] + ' ' + Math.round(x[2] * 100)), equilibre: sc0.top.map(x => x[0] + '-' + x[1] + ' ' + Math.round(x[2] * 100)), html: blocPrevisions(G, comp).includes('prev') };
})();
