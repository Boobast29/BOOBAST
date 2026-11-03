// ============================================================
//  Onze optimal (idée de FM-Player-Analyzer, GPL : aucun code repris ; algorithme hongrois, domaine public)
//  La composition automatique remplissait les postes un par un avec le meilleur joueur restant (glouton) : un
//  joueur polyvalent pouvait être « consommé » à un poste où il était à peine meilleur, et privait un autre poste.
//  Ici, pour TON club, l'affectation joueurs -> postes maximise la somme des notes effectives (même valeur que
//  l'ancien calcul : note au poste × familiarité × forme × statut). Les clubs gérés par l'ordinateur gardent
//  l'ancienne méthode, pour ne pas changer l'équilibre des simulations.
// ============================================================
// Kuhn-Munkres : minimise le coût d'une matrice n×m (n <= m) ; renvoie pour chaque ligne la colonne choisie.
function hongrois(cout) {
  const n = cout.length, m = cout[0].length, INF = 1e18;
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Array(m + 1).fill(INF), vu = new Array(m + 1).fill(false);
    do {
      vu[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) if (!vu[j]) {
        const c = cout[i0 - 1][j - 1] - u[i0] - v[j];
        if (c < minv[j]) { minv[j] = c; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) if (vu[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const res = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1;
  return res;
}
function valeurPoste(G, p, role, clubId) {
  return effRating(p, role) * (p.fit < 75 ? .85 : 1) * (clubId === G.clubId ? ({ star: 1.06, first: 1.03, rot: 1, sub: .98, youth: .97 }[p.status] || 1) : 1);
}
function forceOnze(G, clubId, lineup, formation, tac) {
  return lineup.reduce((s, id, i) => { const p = id && getPlayer(G, id); return s + (p ? valeurPoste(G, p, tac ? slotRole({ ...tac, formation }, i) : FORMATIONS[formation][i][0], clubId) : 0); }, 0);
}
if (typeof autoLineup === 'function') {
  const __autoLineupOO = autoLineup; window.autoLineupGlouton = __autoLineupOO; // ancienne méthode (comparaisons, tests)
  autoLineup = function (G, clubId, formation, tac = null) {
    const r = __autoLineupOO.apply(this, arguments);
    if (clubId !== G.clubId) return r;
    try {
      const roles = FORMATIONS[formation].map((s, i) => tac ? slotRole({ ...tac, formation }, i) : s[0]);
      const pool = clubPlayers(G, clubId).filter(p => available(p) && !p.academy && !(p.rest || p.reserve));
      if (pool.length < roles.length) return r;
      const cout = roles.map(role => pool.map(p => -valeurPoste(G, p, role, clubId)));
      const choix = hongrois(cout);
      const lineup = choix.map(j => pool[j].id);
      if (forceOnze(G, clubId, lineup, formation, tac) + 1e-9 < forceOnze(G, clubId, r.lineup, formation, tac)) return r; // garde-fou
      const used = new Set(lineup);
      const bench = pool.filter(p => !used.has(p.id)).sort((a, b) => playerOvr(b) - playerOvr(a));
      const gk = bench.find(p => p.pos === 'GB');
      const others = bench.filter(p => p !== gk).slice(0, gk ? 8 : 9);
      return { lineup, bench: (gk ? [gk, ...others] : others).map(p => p.id) };
    } catch (e) { console.error(e); return r; }
  };
}
