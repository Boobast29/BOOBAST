// ============================================================
//  Fondations (lot 1)
//  - version de schéma des sauvegardes, copie avant migration, journal
//  - simulation automatique sans interface (politique de décision fixe)
//  - contrôles d'invariants et mesures sur plusieurs saisons / graines
// ============================================================
const SCHEMA_VERSION = 14;
const SCHEMA_STEPS = [
  [13, 'Gestion v12/v13 : décisions, transferts en étapes, budget, formation'],
  [14, 'Cellule de recrutement : personnel, missions, rapports, connaissance du club']
];
const __newGameF = newGame;
newGame = function (...a) { const g = __newGameF(...a); g.schemaVersion = SCHEMA_VERSION; g.migrations = [{ to: SCHEMA_VERSION, at: new Date().toISOString(), note: 'création' }]; return g; };
// copie de sécurité AVANT migration, puis migration journalisée
const __loadSlotF = loadSlot;
loadSlot = async function (id, bak = 0) {
  const g = await Store.get(slotKey(id) + (bak ? '-bak' + bak : ''));
  const from = g?.schemaVersion || 12;
  if (validSave(g) && from < SCHEMA_VERSION) {
    await Store.set(`${slotKey(id)}-premig-v${from}`, g);
    await __loadSlotF(id, bak);
    if (G) {
      G.schemaVersion = SCHEMA_VERSION;
      (G.migrations ||= []).push({ from, to: SCHEMA_VERSION, at: new Date().toISOString(), steps: SCHEMA_STEPS.filter(s => s[0] > from).map(s => s[1]), backup: `premig-v${from}` });
      await save();
      toast(`Sauvegarde mise à jour (schéma ${from} → ${SCHEMA_VERSION}). Une copie de l'ancienne version a été conservée.`);
    }
    return;
  }
  return __loadSlotF(id, bak);
};

// ---------- Joueurs sans club : retraite / départ du circuit ----------
const __endSeasonF = endSeason;
endSeason = function (G) {
  const S = __endSeasonF(G);
  // la promotion de jeunes appartient au club, pas au dirigeant : elle a lieu même après un licenciement (sans doublon)
  if (S.sacked) youthIntake(G); // la nouvelle saison a déjà commencé : promotion de l'année en cours
  const gone = new Set();
  for (const p of G.players) {
    if (p.club != null || p.academy) { p.freeSeasons = 0; continue; }
    p.freeSeasons = (p.freeSeasons || 0) + 1;
    if (p.freeSeasons >= 2 || p.age >= 33) gone.add(p.id);
  }
  if (gone.size) {
    G.players = G.players.filter(p => !gone.has(p.id));
    G.shortlist = (G.shortlist || []).filter(id => !gone.has(id));
    if (G.know) for (const id of gone) delete G.know[id];
    G.retiredCount = (G.retiredCount || 0) + gone.size;
    reindex(G);
  }
  return S;
};

// ---------- Politique automatique (tests et simulations longues) ----------
const AUTO_POLICY = { meet: 'patience', offer: 'reject', coachReq: 'accept', deal: 'cancel', deficit: 'cut', approach: 'talk', agentOffer: 'no', cellMeeting: 'later',
  scoutOffer: 'counter', staffRenew: 'renew', coachThreat: 'support', info: 'ok', dsOffer: 'refuse', leakReact: 'stay', cellProposal: 'go' };
function autoResolve(G) {
  for (const d of pendingDecisions(G)) {
    if (['dsOffer', 'leakReact'].includes(d.kind) && !G.__harness) continue; // décisions personnelles : jamais à la place du joueur
    if (d.kind === 'leakReact') { decide(d.id, d.data === 'keep' ? 'stay' : 'reassure'); continue; }
    if (d.kind === 'sponsor') { if (G.sponsorOffers?.length) { G.sponsor = { ...G.sponsorOffers[0] }; G.sponsorOffers = null; } d.done = 'auto'; continue; }
    if (d.kind === 'renew') { const p = getPlayer(G, d.ref); if (p && p.club === G.clubId) { p.contract += 2; p.wage = roundMoney(p.wage * 1.1); p.renewAsked = G.season; } d.done = 'auto'; continue; }
    const opt = AUTO_POLICY[d.kind] || (DECISION_OPTS[d.kind] || DECISION_OPTS.info)(d)[0][0];
    try { decide(d.id, opt); } catch (e) { d.done = 'erreur'; (G.autoErrors ||= []).push(`${d.kind}: ${e.message}`); }
    if (!d.done) d.done = 'auto';
    if ($('#modal')) closeModal();
  }
}
// effectif minimum : le directeur signe des joueurs libres via la vraie chaîne de transfert
function autoSquad(G) {
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy);
  if (sq.length >= 22) return;
  const free = G.players.filter(p => p.club == null && !p.retired && !p.academy).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 22 - sq.length);
  for (const p of free) {
    const d = { id: G.dealSeq++, pid: p.id, from: null, offer: { fee: 0, plan: 'cash', addOn: 0, sellOn: 0, swap: null }, status: 'terms', week: G.week, rounds: 0, log: [] };
    G.deals.unshift(d); dealDemands(d);
    d.terms = { ...d.demand, clause: d.demand.clauseMin, goalBonus: 0, appBonus: 0 };
    if (myClub(G).budget < d.terms.signOn + d.terms.agentFee) { d.status = 'failed'; continue; }
    dealComplete(d);
  }
}
function simWeek(G) {
  autoResolve(G);
  if (G.week >= G.schedule.length) {
    const S = endSeason(G);
    if (S.sacked) { (G.simEvents ||= []).push(`${S.season} : licencié (confiance ${Math.round(G.board.conf)})`); G.board.conf = 50; }
    return 'season';
  }
  if (leagueRoundAt(G) < 6) autoSquad(G);
  const f = weekFixtures(G).find(f => f.h === G.clubId || f.a === G.clubId);
  if (f) {
    ensureSquad(G, G.clubId);
    if (isDS(G) && G.coach) G.tactics.formation = G.coach.formation;
    Object.assign(G.tactics, autoLineup(G, G.clubId, G.tactics.formation, G.tactics));
    const home = f.h === G.clubId, opp = home ? f.a : f.h, oppTac = aiTactics(G, opp, G.clubId);
    const mt = new Match(G, f, home ? G.tactics : oppTac, home ? oppTac : G.tactics, { cup: isKO(f), firstLeg: f.firstRes });
    mt.my = home ? 0 : 1; mt.sides[0].ai = mt.sides[1].ai = true; mt.auto = true;
    mt.runToEnd(); applyMatch(G, mt, f); boardAfterMatch(G, f);
    if (isDS(G) && G.coach) { const w = mt.winner(); G.coach[w === mt.my ? 'w' : w == null ? 'd' : 'l']++; }
  }
  const r = completeWeek(G, f);
  if (r === 'sacked') { (G.simEvents ||= []).push(`${G.season} ${weekLabel(G)} : limogeage évité en simulation (lot 3 : chômage à venir)`); G.board.conf = 40; }
  return r;
}

// ---------- Invariants ----------
function checkInvariants(G) {
  const errs = [], ids = new Set(), src = new Set(), clubIds = new Set(G.clubs.map(c => c.id));
  for (const p of G.players) {
    if (ids.has(p.id)) errs.push(`id joueur dupliqué ${p.id}`); ids.add(p.id);
    if (p.srcId) { if (src.has(p.srcId)) errs.push(`identité réelle dupliquée ${p.srcId}`); src.add(p.srcId); }
    if (p.club != null && !clubIds.has(p.club)) errs.push(`${p.name} : club inexistant`);
    if (p.club != null && !(p.contract >= 0)) errs.push(`${p.name} : contrat invalide ${p.contract}`);
    for (const [k, v] of Object.entries(p.attrs)) if (!(v >= 1 && v <= 20)) errs.push(`${p.name} : attribut ${k}=${v}`);
    if (p.age > 46 || p.age < 14) errs.push(`${p.name} : âge ${p.age}`);
    if (p.loan && p.loan.from === p.club) errs.push(`${p.name} : prêté à son propre club`);
  }
  for (const c of G.clubs) { const n = clubPlayers(G, c.id).filter(p => !p.academy).length; if (n < 14) errs.push(`${c.name} : effectif ${n}`); if (n > 45) errs.push(`${c.name} : effectif ${n}`); }
  const rc = typeof reconcile === 'function' ? reconcile(G) : { gap: 0 };
  if (Math.abs(rc.gap) > 1) errs.push(`trésorerie non rapprochée : écart ${Math.round(rc.gap)}`);
  if ((G.processedYears || []).length !== new Set(G.processedYears || []).size) errs.push('promotion de jeunes en double');
  if (G.cell) {
    for (const ms of G.cell.missions) for (const id of ms.scouts) if (!G.cell.members.some(m => m.id === id)) errs.push(`mission ${ms.id} : recruteur inexistant ${id}`);
    if (!G.cell.members.some(m => m.id === G.cell.chiefId)) errs.push('cellule sans responsable');
  }
  return errs;
}
function checkStandings(G) {
  const errs = [];
  for (const L of leagueComps(G)) for (const r of standings(G, L.id)) {
    if (r.pts !== 3 * r.w + r.d) errs.push(`${L.name} : points incohérents`);
    if (r.p !== (L.clubs.length - 1) * 2) errs.push(`${L.name} : ${getClub(G, r.id).name} a joué ${r.p} matchs au lieu de ${(L.clubs.length - 1) * 2}`);
  }
  return [...new Set(errs)];
}
function seasonMetrics(G) {
  const act = G.players.filter(p => p.club != null && !p.academy), dom = domesticClubs(G);
  const tr = (G.transfers || []).filter(t => t.season === G.season);
  const mine = clubPlayers(G, G.clubId);
  return {
    saison: G.season, joueurs: G.players.length, salaire_moyen_mois: Math.round(act.reduce((s, p) => s + monthly(p.wage), 0) / act.length),
    transferts: tr.length, montant_transferts: tr.reduce((s, t) => s + (t.fee || 0), 0), effectif_moyen: +(act.length / G.clubs.length).toFixed(1),
    age_moyen: +(act.reduce((s, p) => s + p.age, 0) / act.length).toFixed(1), niveau_moyen: +(act.reduce((s, p) => s + playerOvr(p), 0) / act.length).toFixed(1),
    sans_club: G.players.filter(p => p.club == null).length, minutes_jeunes_club: mine.filter(p => p.age <= 21).reduce((s, p) => s + (p.stats.min || 0), 0),
    clubs_en_difficulte: dom.filter(c => c.budget < -25e6).length, tresorerie: Math.round(myClub(G).budget), rapports: (G.reports || []).length,
    cellule: G.cell ? G.cell.members.length : 0, taille_sauvegarde_ko: Math.round(JSON.stringify((({ pmap, ...r }) => r)(G)).length / 1024)
  };
}
