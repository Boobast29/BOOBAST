window.__T = (async () => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  const sauve = avancerLiguesEtrangeres;
  const run = (etr, ui) => {
    G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3);
    avancerLiguesEtrangeres = etr ? sauve : () => {};
    G.__harness = true;
    for (let w = 0; w < 12; w++) {
      if (ui) { const L = clubLeague(G, G.clubId), f = weekFixtures(G).find(x => x.h === G.clubId || x.a === G.clubId); if (f) blocAvantMatch(G, f); simulerFinSaison(G, L, 200); }
      simWeek(G);
    }
    G.__harness = false; avancerLiguesEtrangeres = sauve;
    return standings(G, clubLeague(G, G.clubId).id).map(r => r.id + ':' + r.pts + ':' + r.gf).join(',');
  };
  const base = run(false, false);
  const base2 = run(false, false); return { reproductible: base === base2, avecLiguesEtrangeres: run(true, false) === base, avecAvantMatchEtPrevisions: run(false, true) === base, tout: run(true, true) === base };
})();
