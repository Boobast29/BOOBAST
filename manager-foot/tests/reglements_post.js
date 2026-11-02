// Usage : dans la console du jeu (index.html servi en local), coller ce fichier puis lire window.__T
window.__T = (() => {
  const out = [];
  for (const [pays, rang, divIdx] of [['FRA', 5, 1], ['FRA', 16, 0], ['ENG', 3, 1], ['ITA', 17, 1], ['GER', 3, 1], ['ESP', 6, 1]]) {
    try { localStorage.setItem('mf-regles', pays); localStorage.setItem('mf-role', 'ds'); } catch { }
    const db = buildDefaultDatabase(); normalizeWorld(db);
    G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 11 + rang);
    G.__harness = true; G.cell.deleg = 'execute';
    let guard = 0;
    while (G.week < G.schedule.length - 1 && guard++ < 200) simWeek(G);
    const L = leagueComps(G)[divIdx], t = standings(G, L.id);
    const nouveau = t[rang - 1].id; G.clubId = nouveau; G.tactics.lineup = []; G.tactics.bench = [];
    simWeek(G); // dernière journée → planification
    const t2 = standings(G, L.id), place = t2.findIndex(r => r.id === G.clubId) + 1;
    const pw0 = G.schedule.filter(e => e.t === 'P').length;
    guard = 0; const labels = [];
    while (G.week < G.schedule.length && guard++ < 30) { labels.push(weekLabel(G)); simWeek(G); }
    const pw = G.schedule.filter(e => e.t === 'P').length;
    const memo = JSON.parse(JSON.stringify(G.post?.res || {}));
    const club = getClub(G, G.clubId), divAvant = club.div;
    const S = endSeason(G);
    const mesDuels = Object.entries(memo).filter(([k]) => k.split('-').map(Number).includes(G.clubId)).map(([k, v]) => v.txt);
    const coherent = mesDuels.every(txt => S.barrages.some(x => x.includes(txt)));
    const inv = checkInvariants(G);
    out.push({ pays, rang_vise: rang, place_finale: place, semaines_P_initiales: pw0, semaines_P: pw, labels, mesDuels, journal_coherent: coherent, div: divAvant + '→' + club.div, invariants: inv.slice(0, 3) });
  }
  return out;
})();
