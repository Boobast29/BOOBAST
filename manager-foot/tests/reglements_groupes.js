// Usage : dans la console du jeu (index.html servi en local), coller ce fichier puis lire window.__T
// Monde synthétique : vérifie montées/descentes avec groupes, play-offs, playouts, barrages (5 pays)
window.__T = (() => {
  const out = [];
  const layouts = { ITA: [[20], [20], [20, 20, 20]], ESP: [[20], [22], [20, 20]], GER: [[18], [18], [20]], ENG: [[20], [24], [24], [24]], FRA: [[18], [18], [18]] };
  for (const [pays, lay] of Object.entries(layouts)) for (const seed of [1, 2, 3]) {
    RNG = mulberry32(seed * 97 + pays.length);
    const clubs = [], divisions = []; let id = 1, div = 1;
    lay.forEach((groups, ti) => groups.forEach((n, gi) => {
      divisions.push({ div, tier: ti + 1, group: groups.length > 1 ? 'Groupe ' + 'ABC'[gi] : null, srcId: pays + div, name: REGLES[pays].niveaux[ti].nom });
      for (let k = 0; k < n; k++) clubs.push({ id: id++, name: (k === 3 && ti === 2 ? 'Club ' + id + ' II' : 'Club ' + id), short: 'C' + id, div, tier: ti + 1, group: divisions[divisions.length - 1].group, rep: 60 - ti * 8, colors: ['#000', '#fff'] });
      div++;
    }));
    const g = { clubs, players: [], comps: {}, inbox: [], schedule: [], season: 2026, seed, week: 0, clubId: 1, real: { country: pays, divisions }, reglesOn: true, board: { conf: 50 } };
    const prev = G; G = g;
    try {
      for (const d of divisions) { const ids = clubs.filter(c => c.div === d.div).map(c => c.id); g.comps['L' + d.div] = { id: 'L' + d.div, type: 'league', div: d.div, name: d.name, clubs: ids, fixtures: makeFixtures(ids.slice(), 'L' + d.div) }; }
      for (const c of Object.values(g.comps)) for (const r of c.fixtures) for (const f of r) f.res = [rint(0, 3), rint(0, 3)];
      const before = {}; for (const d of divisions) before[d.tier] = (before[d.tier] || 0) + clubs.filter(c => c.div === d.div).length;
      const S = { promoted: [], relegated: [] };
      const rt = applyPromotions(g, S, leagueComps(g));
      const after = {}, grp = {}; for (const d of divisions) { const n = clubs.filter(c => c.div === d.div).length; after[d.tier] = (after[d.tier] || 0) + n; grp[d.div] = n; }
      const tierOk = Object.keys(before).every(t => before[t] === after[t]);
      const tierMatch = clubs.every(c => divisions.find(d => d.div === c.div).tier === c.tier);
      const reserveUp = clubs.filter(c => / II$/.test(c.name) && c.tier < (REGLES[pays].reserveMax || 1)).length;
      out.push({ pays, seed, montees: S.promoted.length, descentes: S.relegated.length, tailles_ok: tierOk, tier_coherent: tierMatch, groupes: Object.values(grp).join('/'), reserves_trop_haut: reserveUp, relegues_N1: rt.length, journal: S.barrages.length, ex: S.barrages.slice(0, 3) });
    } catch (e) { out.push({ pays, seed, crash: e.message + ' ' + e.stack.split('\n')[1] }); }
    finally { G = prev; }
  }
  return out;
})();
