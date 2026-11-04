// ============================================================
//  Marché des jeunes
//  - Jeunes non conservés (fin de formation, réserve trop pleine) : ils restent sur le marché et d'autres clubs peuvent
//    les recruter (club dont le niveau correspond à leur potentiel), en U19 ou en réserve. Nouvelle dans le monde.
//  - Les clubs de l'IA font aussi le ménage : réserve au-delà de 20 joueurs en fin de saison → les moins prometteurs
//    sont libérés (et peuvent rebondir ailleurs).
//  - Offres pour tes jeunes (U19 et réserve à fort potentiel) pendant le mercato : achat par un club plus huppé,
//    prêt par un club plus modeste (temps de jeu, salaire payé par le club qui l'accueille). Tu acceptes ou refuses.
//  Tirages à part (withSideRng) : le déroulé des matchs ne change pas.
// ============================================================
const jeuneLibre = p => p.club == null && !p.retired && p.age <= 21 && (p.academyAncien || p.libereJeune);
// recrutement des jeunes libres par les autres clubs (chaque semaine)
function rebondJeunes(G) {
  const libres = G.players.filter(jeuneLibre);
  if (!libres.length) return;
  withSideRng(`${G.seed}|rebond|${G.season}|${G.week}`, () => {
    for (const p of libres) {
      if (rnd() > .12) continue;
      const cible = G.clubs.filter(c => c.id !== G.clubId && Math.abs(c.rep - (p.pot - 8)) <= 12);
      if (!cible.length) continue;
      const c = pick(cible), ancien = p.ancienClub != null ? getClub(G, p.ancienClub) : null;
      p.club = c.id; p.contract = 2; p.academy = p.age <= 18; p.reserve = p.age > 18; delete p.libereJeune; delete p.academyAncien;
      p.wage = Math.max(p.wage || 0, 300);
      if (typeof logTransfer === 'function') logTransfer(G, p, null, c.id, 0, 'libre');
      news(G, `🌱 ${p.name} (${p.age} ans${ancien ? `, non conservé par ${ancien.name}` : ''}) rebondit à ${c.name}.`, ancien?.id === G.clubId ? 'youth' : 'info', ancien?.id !== G.clubId);
    }
  });
}
// fin de saison : réserves de l'IA ramenées à 20, libérés sur le marché ; tes U19 non conservés marqués
function menageReserves(G) {
  for (const c of G.clubs) {
    if (c.id === G.clubId) continue;
    const R = G.players.filter(p => p.club === c.id && p.reserve && !p.academy);
    if (R.length <= 20) continue;
    R.sort((a, b) => (b.pot + playerOvr(b)) - (a.pot + playerOvr(a))).slice(20).forEach(p => { p.ancienClub = c.id; p.club = null; p.reserve = false; p.contract = 0; p.libereJeune = true; });
  }
}
// offres pour tes jeunes
function offresJeunes(G) {
  if (!windowOpen(G) || (G.offresJeunesSemaine === `${G.season}|${G.week}`)) return;
  G.offresJeunesSemaine = `${G.season}|${G.week}`;
  if ((G.decisions || []).some(d => d.kind === 'offreJeune' && !d.done)) return;
  withSideRng(`${G.seed}|offrejeune|${G.season}|${G.week}`, () => {
    if (rnd() > .18) return;
    const jeunes = G.players.filter(p => p.club === G.clubId && (p.academy || p.reserve) && p.age >= 17 && p.age <= 21 && p.pot - playerOvr(p) >= 6 && !p.loan);
    if (!jeunes.length) return;
    const p = jeunes.sort((a, b) => b.pot - a.pot)[Math.floor(rnd() * Math.min(3, jeunes.length))];
    const me = myClub(G), achat = rnd() < .5;
    const cands = G.clubs.filter(c => c.id !== G.clubId && (achat ? c.rep >= me.rep - 2 && c.budget > p.value * 1.5 : c.rep < me.rep - 4 && c.rep >= me.rep - 30));
    if (!cands.length) return;
    const c = pick(cands), prix = roundMoney(Math.max(p.value * (1.1 + rnd() * .4), 150000));
    addDecision(G, { key: `offreJeune:${p.id}:${G.season}:${G.week}`, kind: 'offreJeune', ref: p.id, blocking: false, from: c.name, icon: achat ? '💰' : '🔁',
      data: { club: c.id, achat, prix },
      title: achat ? `${c.name} veut acheter ${p.name} (${p.age} ans)` : `${c.name} veut prendre ${p.name} en prêt (${p.age} ans)`,
      text: achat ? `${c.name} propose ${money(prix)} pour ton jeune ${ROLES[p.pos].label.toLowerCase()} ${p.name} (${p.academy ? 'U19' : 'réserve'}, valeur ${money(p.value)}).`
        : `${c.name} propose de prêter ${p.name} (${p.academy ? 'U19' : 'réserve'}) jusqu'à la fin de la saison : temps de jeu en équipe première, salaire entièrement payé par ${c.name}.` });
  });
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateMJ = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdateMJ.apply(this, arguments);
    if (full && G.clubId != null) try { rebondJeunes(G); offresJeunes(G); } catch (e) { console.error(e); }
    return r;
  };
}
if (typeof endSeason === 'function') {
  const __endSeasonMJ = endSeason;
  endSeason = function (G) {
    // U19 de ton club non conservés (js/centre_formation.js, avant ce passage) : marqués pour pouvoir rebondir ailleurs
    const avant = new Set(G.players.filter(p => p.club === G.clubId && p.academy).map(p => p.id));
    const S = __endSeasonMJ.apply(this, arguments);
    try {
      for (const p of G.players) if (avant.has(p.id) && p.club == null) { p.academyAncien = true; p.ancienClub = G.clubId; }
      menageReserves(G);
      for (const p of G.players) if (p.retourJeune && p.club === G.clubId && !p.loan) { p.reserve = true; delete p.retourJeune; } // retour de prêt : en réserve, à toi de le promouvoir
    } catch (e) { console.error(e); }
    return S;
  };
}
if (typeof DECISION_OPTS !== 'undefined') DECISION_OPTS.offreJeune = d => d.data?.achat
  ? [['vendre', `Vendre (${money(d.data.prix)})`, 'primary'], ['contre', `Demander plus (${money(roundMoney(d.data.prix * 1.4))})`], ['non', 'Refuser : il reste au club']]
  : [['preter', 'Accepter le prêt (fin de saison)', 'primary'], ['non', 'Refuser : il reste au club']];
window.addEventListener('load', () => {
  const __decideMJ = decide;
  decide = function (id, opt) {
    const q = G.decisions.find(x => x.id === id);
    if (!q || q.done || q.kind !== 'offreJeune') return __decideMJ.apply(this, arguments);
    const p = getPlayer(G, q.ref), c = getClub(G, q.data?.club);
    let msg = 'Offre caduque.';
    if (p && c && p.club === G.clubId) {
      if (opt === 'vendre' || (opt === 'contre' && withSideRng(`${G.seed}|contre|${p.id}`, () => rnd() < .45))) {
        const prix = opt === 'contre' ? roundMoney(q.data.prix * 1.4) : q.data.prix;
        flow(G, myClub(G), prix, 'sales'); flow(G, c, -prix, 'transfers');
        if (typeof logTransfer === 'function') logTransfer(G, p, G.clubId, c.id, prix, 'transfert');
        if (typeof removeFromTactics === 'function') removeFromTactics(p.id);
        p.club = c.id; p.academy = false; p.reserve = p.age <= 19; p.contract = 4; p.num = null;
        msg = `${p.name} rejoint ${c.name} pour ${money(prix)}.`;
      } else if (opt === 'contre') msg = `${c.name} refuse de payer plus. ${p.name} reste au club.`;
      else if (opt === 'preter') {
        if (typeof removeFromTactics === 'function') removeFromTactics(p.id);
        p.loan = { from: G.clubId, share: 1, inLoan: true, until: G.season }; p.club = c.id; p.num = null; p.academy = false; p.reserve = false; p.retourJeune = true;
        msg = `${p.name} part en prêt à ${c.name} jusqu'à la fin de la saison (salaire payé par ${c.name}).`;
      } else msg = `${p.name} reste au club.`;
    }
    q.done = opt; q.answer = msg; news(G, `${q.icon} ${q.title} — ${msg}`, 'transfer'); save(); toast(msg);
    if (!$('#top')) return; if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop();
  };
});

// ============================================================
//  Vrais joueurs libres (monde réel importé, Transfermarkt : sans club, actifs récemment)
//  Ajoutés sans club à la création du monde, recrutables sans indemnité ; raccourci dans Mercato › Recherche.
// ============================================================
window.addEventListener('load', () => {
  if (typeof buildRealWorld !== 'function' || typeof realPlayer !== 'function') return;
  const __buildRealWorldLR = buildRealWorld;
  buildRealWorld = function (scn) {
    const W = __buildRealWorldLR.apply(this, arguments);
    try {
      for (const sp of scn.freeAgents || []) {
        const p = realPlayer(sp, null, 60);
        p.club = null; p.contract = 0; p.libreReel = true; p.estimated = true;
        if (sp.marketValue) p.marketValueReal = sp.marketValue;
        if (sp.foot && { right: 1, left: 1, both: 1 }[sp.foot]) p.foot = { right: 'Droit', left: 'Gauche', both: 'Les deux' }[sp.foot];
        if (sp.agent) p.agentReal = sp.agent;
        for (const k of ['transfersReal', 'seasonsReal', 'valueHistReal']) if (sp[k]) p[k] = sp[k];
        W.players.push(p);
      }
    } catch (e) { console.error(e); }
    return W;
  };
});
