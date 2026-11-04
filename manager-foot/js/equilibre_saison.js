// ============================================================
//  Trésorerie surveillée et bas de tableau plus combatif
//  - Trésorerie : en plus de l'alerte sur la projection (js/budget.js, une fois par saison), une alerte de rappel
//    quand la trésorerie devient réellement négative (au plus toutes les 8 semaines) : vendre, emprunter, réduire les
//    coûts ou assumer. Le président perd patience si le trou se creuse (au-delà de 5 % du budget de début de saison).
//  - Bas de tableau : au mercato d'hiver, les 3 derniers de chaque championnat se renforcent par des prêts de joueurs
//    de réserve ou remplaçants de clubs plus forts (comme dans la réalité). Les petits clubs finissent moins loin.
//  Tirages à part (withSideRng) pour les choix.
// ============================================================
function surveillerTresorerie(G) {
  const c = myClub(G); if (!c || c.budget >= 0) return;
  const abs = G.season * 100 + G.week;
  if ((G.tresoAlerte ?? -99) + 8 > abs || (G.decisions || []).some(d => d.kind === 'deficit' && !d.done)) return;
  G.tresoAlerte = abs;
  addDecision(G, { key: 'deficit2:' + abs, kind: 'deficit', from: 'Président', icon: '⚠', blocking: false,
    title: `Trésorerie négative : ${money(c.budget)}`,
    text: `Le compte du club est dans le rouge (${money(c.budget)}). Les intérêts courent et le président attend un plan : vendre, emprunter, réduire les coûts, ou assumer.` });
  const debut = typeof ledgerOf === 'function' ? Math.abs(ledgerOf(G).start || 0) : 0;
  if (debut && -c.budget > debut * .05 && G.board) G.board.conf = clamp(G.board.conf - 3, 0, 100);
}
function renfortsHiver(G) {
  const mi = Math.floor(G.schedule.length / 2);
  if (G.week !== mi || G.renfortsHiver === G.season) return;
  G.renfortsHiver = G.season;
  withSideRng(`${G.seed}|renfort|${G.season}`, () => {
    for (const L of leagueComps(G)) {
      const t = standings(G, L.id);
      for (const r of t.slice(-3)) {
        const c = getClub(G, r.id); if (!c || c.id === G.clubId) continue;
        const sq = clubPlayers(G, c.id).filter(p => !p.academy && !p.reserve);
        const niveau = sq.map(playerOvr).sort((a, b) => b - a).slice(0, 11), moy = niveau.reduce((a, b) => a + b, 0) / Math.max(1, niveau.length);
        // prêteurs : clubs plus forts ; joueurs hors de leur onze type (réserve ou remplaçants), meilleurs que la moyenne du club
        const cands = G.players.filter(p => p.club != null && p.club !== c.id && p.club !== G.clubId && !p.loan && !p.academy && p.age <= 26 && playerOvr(p) > moy + 1
          && (getClub(G, p.club)?.rep ?? 0) >= c.rep + 8 && !(G.tactics && p.club === G.clubId)
          && (p.reserve || clubPlayers(G, p.club).filter(x => !x.academy && !x.reserve && x.pos === p.pos && playerOvr(x) > playerOvr(p)).length >= 2));
        for (const p of cands.sort(() => rnd() - .5).slice(0, 2)) {
          const de = p.club;
          p.loan = { from: de, share: .5, inLoan: true, until: G.season }; p.club = c.id; p.reserve = false; p.num = null;
          if (typeof logTransfer === 'function') logTransfer(G, p, de, c.id, 0, 'prêt');
          news(G, `🔁 ${c.name}, en difficulté, se renforce : ${p.name} prêté par ${getClub(G, de)?.name} jusqu'à la fin de la saison.`, 'transfer', true);
        }
      }
    }
  });
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateES2 = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdateES2.apply(this, arguments);
    if (full && G.clubId != null) try { surveillerTresorerie(G); renfortsHiver(G); } catch (e) { console.error(e); }
    return r;
  };
}
