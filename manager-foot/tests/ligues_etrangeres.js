window.__T = (async () => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  const run = avec => {
    G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3);
    if (!avec) G.etr = { season: -999, ligues: {} }, avancerLiguesEtrangeres = () => {};
    G.__harness = true; while (G.week < G.schedule.length) simWeek(G); G.__harness = false;
    return standings(G, clubLeague(G, G.clubId).id).map(r => r.id + ':' + r.pts).join(',');
  };
  const sauve = avancerLiguesEtrangeres;
  const a = run(true); const ligues = G.etr.ligues, pays = Object.keys(ligues);
  const L = ligues[pays[0]], fini = Object.values(ligues).every(l => l.joue === l.fixtures.length);
  const t = tableOf(L.clubs, L.fixtures), buts = L.fixtures.flat().reduce((s, f) => s + f.res[0] + f.res[1], 0) / L.fixtures.flat().length;
  const taille = JSON.stringify(G.etr).length;
  const b = run(false); avancerLiguesEtrangeres = sauve;
  return { pays: pays.length, journees: L.fixtures.length, fini, champion: getClub(G, t[0].id)?.name, pts: t[0].pts, butsParMatch: +buts.toFixed(2), taille, hasardIdentique: a === b };
})();
