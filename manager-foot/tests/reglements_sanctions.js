// Usage : dans la console du jeu (index.html servi en local), coller ce fichier puis lire window.__T
window.__T = (() => {
  const out = [];
  const run = (pays, seed) => {
    try { localStorage.setItem('mf-regles', pays); localStorage.setItem('mf-role', 'ds'); } catch { }
    const db = buildDefaultDatabase(); normalizeWorld(db);
    G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 2).id, 'T', seed);
    G.__harness = true; G.cell.deleg = 'execute';
    return G;
  };
  for (const pays of ['ENG', 'FRA', 'ITA', 'GER', 'ESP']) {
    run(pays, 5);
    const cupName = G.comps.CUP.name, r0 = G.comps.CUP.rounds[0];
    const tierOf = id => compTier(G, clubLeague(G, id));
    const hostsOk = r0.ties.every(t => pays === 'ENG' ? true : pays === 'ITA' ? tierOf(t.h) <= tierOf(t.a) : tierOf(t.h) >= tierOf(t.a));
    let guard = 0; while (G.week < G.schedule.length && guard++ < 200) simWeek(G);
    const me = myClub(G); me.budget = -wageBill(G) * 52 * .8; // déficit de 80 % de la masse salariale
    const S = endSeason(G);
    const L = clubLeague(G, G.clubId), t = standings(G, L.id), row = t.find(r => r.id === G.clubId);
    const cs = checkStandings(G);
    const cupFinal = G.comps.CUP.rounds.length;
    out.push({ pays, coupe: cupName, hotes_ok: hostsOk, sanctions: S.sanctions, penalite: G.penalty, pts_debut: row.pts, pen: row.pen, ban: G.board.ban, relegues: S.relegated.filter(x => /administrative/.test(x)), pts_incoherents: cs.filter(x => /incohérents/.test(x)).length, inv: checkInvariants(G).slice(0, 3) });
  }
  // non-UE : France, 4 non-UE déjà
  run('FRA', 9);
  const mine = clubPlayers(G, G.clubId); let k = 0;
  for (const p of mine) { if (k < 4) { p.nat = 'BRA'; k++; } else p.nat = 'FRA'; }
  const cible = G.players.find(p => p.club != null && p.club !== G.clubId && !getClub(G, p.club).foreign);
  cible.nat = 'ARG';
  let msg = ''; const t0 = toast; toast = (m) => { msg = m; }; offerModal(cible.id); toast = t0; closeModal?.();
  out.push({ nonUE: msg, conformite: conformite(G, G.clubId) });
  return out;
})();
