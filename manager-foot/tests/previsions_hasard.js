window.__T = (async () => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  const run = avec => { G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3); G.__harness = true; for (let i = 0; i < 6; i++) { simWeek(G); if (avec) simulerFinSaison(G, clubLeague(G, G.clubId), 300); } G.__harness = false; return standings(G, clubLeague(G, G.clubId).id).map(r => r.id + ':' + r.pts).join(','); };
  return { identique: run(false) === run(true) };
})();
