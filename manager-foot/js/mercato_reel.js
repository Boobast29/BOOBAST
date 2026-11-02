// ============================================================
//  Mécaniques réelles du mercato (règlement FIFA du statut et du transfert des joueurs, RSTP)
//  - mécanisme de solidarité : 5 % de l'indemnité redistribués aux clubs formateurs (0,25 %/saison de 12 à 15 ans,
//    0,5 %/saison de 16 à 23 ans), prélevés sur la somme reçue par le vendeur (RSTP, annexe 5)
//  - indemnité de formation : départ libre d'un joueur de 23 ans ou moins → le nouveau club paie son ancien club
//    (forfait annuel selon la catégorie du club acheteur, années passées entre 12 et 21 ans ; RSTP art. 20, annexe 4, simplifié)
//  - limites de prêts : 6 prêts entrants et 6 sortants par saison, 3 au plus avec un même club ;
//    joueurs de 21 ans ou moins formés au club exemptés (RSTP art. 10, en vigueur depuis 2024/25 ; ici appliqué à tous les prêts)
//  - Angleterre : autorisation de travail (Governing Body Endorsement) pour les joueurs hors Royaume-Uni et Irlande
//    (barème à points simplifié : sélections et rang de la sélection, niveau du club vendeur, temps de jeu ; 15 points requis)
//  - valeur marchande pondérée par le poste (médianes réelles des indemnités par poste, ewenme/transfers 2015-2022 :
//    gardiens ≈ moitié des milieux, attaquants au-dessus)
//  - fiche joueur : statistiques réelles des 3 dernières saisons et historique réel des transferts (transfermarkt-datasets)
// ============================================================
const RSTP = { solidarite: .05, pretsMax: 6, pretsMemeClub: 3, exemptionAge: 21,
  formation: { 1: 90000, 2: 60000, 3: 30000, 4: 10000 } }; // indemnité de formation annuelle (€) par catégorie du club acheteur

// ---------- clubs formateurs ----------
function clubParCourt(G, court) { return G.clubs.find(c => c.short === court) || null; }
function clubsFormateurs(G, p) {
  const out = new Map();
  const add = (club, age) => {
    if (!club || age < 12 || age > 23) return;
    out.set(club.id, (out.get(club.id) || 0) + (age <= 15 ? .0025 : .005));
  };
  // centre de formation (joueurs promus de l'académie)
  if (p.formeAu != null && p.intake != null) {
    const ageEntree = p.age - (G.season - p.intake);
    for (let a = Math.max(12, ageEntree); a < Math.min(ageEntree + 3, 24); a++) add(getClub(G, p.formeAu), a);
  }
  // saisons jouées en professionnel avant 24 ans (historique de carrière)
  for (const h of p.hist || []) add(h.cid != null ? getClub(G, h.cid) : clubParCourt(G, h.club), p.age - (G.season - h.season) - 1);
  return [...out].map(([id, part]) => ({ id, part: Math.min(part, .05) }));
}

// ---------- branchement sur le journal des transferts (tous les transferts y passent) ----------
let RSTP_ACTIF = true;
const __logTransferR = logTransfer;
logTransfer = function (G, p, from, to, fee, type = 'transfert') {
  __logTransferR(G, p, from, to, fee, type);
  if (!RSTP_ACTIF || !G || !p) return;
  try {
    if (fee > 0 && from != null && to != null && /^(transfert|clause|option levée)$/.test(type)) solidarite(G, p, from, to, fee);
    if (!fee && to != null && /^libre/.test(type) && p.age <= 23) indemniteFormation(G, p, to);
  } catch (e) { console.error('RSTP', e); }
};
function solidarite(G, p, from, to, fee) {
  const vendeur = getClub(G, from); if (!vendeur) return;
  let total = 0; const lignes = [];
  for (const { id, part } of clubsFormateurs(G, p)) {
    if (id === to || id === from) continue; // le vendeur formateur garde sa part ; l'acheteur n'en reçoit pas
    const c = getClub(G, id); if (!c) continue;
    const m = roundMoney(fee * part); if (m < 1000) continue;
    FLOW_LABEL = `Solidarité FIFA : ${p.name}`;
    try { flow(G, vendeur, -m, 'transfers'); flow(G, c, m, 'sales'); } finally { FLOW_LABEL = null; }
    total += m; lignes.push(`${c.name} ${money(m)}`);
    if (id === G.clubId) news(G, `🤝 Mécanisme de solidarité : ${p.name} (formé chez nous) est transféré de ${vendeur.name} à ${getClub(G, to)?.name} pour ${money(fee)}. Nous recevons ${money(m)}.`, 'transfer');
  }
  if (total) (G.solidarite ||= []).unshift({ season: G.season, name: p.name, fee, total, lignes });
  if (total && from === G.clubId) news(G, `Mécanisme de solidarité : ${money(total)} prélevés sur la vente de ${p.name} et reversés à ses clubs formateurs (${lignes.join(', ')}).`, 'finance');
  if (G.solidarite?.length > 100) G.solidarite.length = 100;
}
function indemniteFormation(G, p, to) {
  const clubH = h => h.cid != null ? getClub(G, h.cid) : clubParCourt(G, h.club);
  const ancien = [...(p.hist || [])].reverse().map(clubH).find(c => c && c.id !== to);
  if (!ancien) return;
  const L = clubLeague(G, to), cat = L ? Math.min(4, compTier(G, L)) : (getClub(G, to)?.foreign ? 1 : 4);
  const annees = clamp((p.hist || []).filter(h => clubH(h)?.id === ancien.id && p.age - (G.season - h.season) - 1 <= 21).length, 1, 4);
  const m = roundMoney(RSTP.formation[cat] * annees);
  FLOW_LABEL = `Indemnité de formation : ${p.name}`;
  try { flow(G, getClub(G, to), -m, 'transfers'); flow(G, ancien, m, 'sales'); } finally { FLOW_LABEL = null; }
  if (to === G.clubId) news(G, `Indemnité de formation : ${money(m)} versés à ${ancien.name} pour ${p.name} (${annees} saison(s) de formation, catégorie ${cat}).`, 'finance');
  if (ancien.id === G.clubId) news(G, `Indemnité de formation : ${getClub(G, to)?.name} nous verse ${money(m)} pour ${p.name}.`, 'finance');
}

// ---------- limites de prêts ----------
function pretsSaison(G) {
  const t = (G.transfers || []).filter(x => x.season === G.season && x.type === 'prêt');
  const compte = x => { const p = getPlayer(G, x.pid); return !(p && p.age <= RSTP.exemptionAge && p.formeAu === G.clubId); };
  return { in: t.filter(x => x.to === G.clubId && compte(x)), out: t.filter(x => x.from === G.clubId && compte(x)) };
}
function blocagePret(G, p, sens) {
  if (!reglesActives(G)) return null;
  if (p.age <= RSTP.exemptionAge && p.formeAu === G.clubId) return null;
  const P = pretsSaison(G), liste = P[sens], autre = sens === 'in' ? p.club : null;
  if (liste.length >= RSTP.pretsMax) return `Règlement FIFA : déjà ${liste.length} prêts ${sens === 'in' ? 'entrants' : 'sortants'} cette saison (maximum ${RSTP.pretsMax}).`;
  if (autre != null && liste.filter(x => x.from === autre).length >= RSTP.pretsMemeClub) return `Règlement FIFA : déjà ${RSTP.pretsMemeClub} prêts avec ${getClub(G, autre).name} cette saison.`;
  return null;
}

// ---------- autorisation de travail (Angleterre) ----------
function rangSelection(code) {
  if (typeof DO_ELO === 'undefined' || DO_ELO[code] == null) return 99;
  return Object.values(DO_ELO).filter(e => e > DO_ELO[code]).length + 1;
}
function pointsGBE(G, p) {
  const rang = rangSelection(p.nat), caps = p.caps || 0;
  const bande = rang <= 10 ? [12, 8] : rang <= 20 ? [10, 6] : rang <= 30 ? [8, 4] : rang <= 50 ? [6, 2] : [0, 0];
  let pts = caps >= 10 ? bande[0] : caps >= 3 ? bande[1] : 0;
  const club = p.club != null ? getClub(G, p.club) : null, L = club && clubLeague(G, club.id);
  pts += club?.foreign ? (club.rep >= 75 ? 6 : club.rep >= 65 ? 3 : 0) : L ? (compTier(G, L) === 1 ? 6 : compTier(G, L) === 2 ? 3 : 0) : 0;
  const part = (p.stats?.min || 0) / Math.max(1, leagueRoundAt(G) * 90);
  pts += part >= .6 ? 4 : part >= .3 ? 2 : 0;
  if (playerOvr(p) >= 78) pts += 4;
  return pts;
}
function blocageGBE(G, p) {
  if (!reglesActives(G) || reglesPays(G).nat !== 'ENG' || UK.has(p.nat) || p.nat === 'IRL' || p.nat === 'IRE') return null;
  const pts = pointsGBE(G, p);
  if (pts >= 15) return null;
  // commission d'exceptions : décision stable pour un joueur donné (ne consomme pas l'aléatoire de la partie)
  const accord = pts >= 10 && (tirageCle(G, 'gbe' + p.id) % 100) < 50;
  return accord ? null : `Autorisation de travail refusée pour ${p.name} : ${pts} points GBE sur 15 requis${pts >= 10 ? ' (commission d\'exceptions défavorable)' : ''}.`;
}

// ---------- garde-fous sur les écrans de recrutement ----------
if (typeof offerModal === 'function') {
  const __offerModalMR = offerModal;
  offerModal = function (pid) {
    const p = getPlayer(G, pid);
    if (p && p.club !== G.clubId) { const m = blocageGBE(G, p); if (m) return toast(m, 'err'); }
    return __offerModalMR(pid);
  };
}
if (typeof loanInModal === 'function') {
  const __loanInMR = loanInModal;
  loanInModal = function (pid) {
    const p = getPlayer(G, pid); if (!p) return;
    const m = blocagePret(G, p, 'in') || blocageGBE(G, p); if (m) return toast(m, 'err');
    return __loanInMR(pid);
  };
}
if (typeof loanModal === 'function') {
  const __loanOutMR = loanModal;
  loanModal = function (pid) {
    const p = getPlayer(G, pid); if (!p) return;
    const m = blocagePret(G, p, 'out'); if (m) return toast(m, 'err');
    return __loanOutMR(pid);
  };
}

// ---------- formé au club : marqué à la promotion des jeunes ----------
const __youthIntakeMR = youthIntake;
youthIntake = function (G, ...a) {
  const avant = new Set(G.players.map(p => p.id));
  const r = __youthIntakeMR(G, ...a);
  for (const p of G.players) if (!avant.has(p.id) && p.academy && p.formeAu == null) p.formeAu = p.club ?? G.clubId;
  return r;
};
// parties existantes : les jeunes du centre de formation actuel sont formés au club
const __enterGameMR = enterGame;
enterGame = function () { if (G) for (const p of G.players) if (p.formeAu == null && p.intake != null && p.club === G.clubId) p.formeAu = G.clubId; __enterGameMR(); };

// ---------- valeur selon le poste ----------
const VALEUR_POSTE = { GB: .6, DC: .88, DG: .88, DD: .88, MDC: .95, MC: 1, MOC: 1.08, AG: 1.08, AD: 1.08, BU: 1.15 };
const __calcValueMR = calcValue;
calcValue = function (p) { return roundMoney(__calcValueMR(p) * (VALEUR_POSTE[p.pos] || 1)); };

// ---------- monde réel : sélections, statistiques et transferts réels ----------
if (typeof buildRealWorld === 'function') {
  const __buildRealWorldMR = buildRealWorld;
  buildRealWorld = function (scn) {
    const W = __buildRealWorldMR(scn);
    const bySp = new Map(scn.players.map(p => [p.srcId, p]));
    for (const p of W.players) {
      const sp = p.srcId && bySp.get(p.srcId); if (!sp) continue;
      if (sp.caps != null && !p.caps) p.caps = sp.caps;
      if (sp.transfersReal) p.transfersReal = sp.transfersReal;
      if (sp.seasonsReal) p.seasonsReal = sp.seasonsReal;
    }
    return W;
  };
}
const __playerModalMR = playerModal;
playerModal = function (pid, tab = 'profil') {
  __playerModalMR(pid, tab);
  const p = getPlayer(G, pid); if (!p || tab !== 'profil') return;
  const morceaux = [];
  if (p.seasonsReal?.length) morceaux.push(`<h3>Saisons réelles</h3><table class="tbl compact"><tr><th>Saison</th><th>M</th><th>Min</th><th>Buts</th><th>Passes</th><th>🟨</th><th>🟥</th></tr>${p.seasonsReal.map(s => `<tr>${s.map(v => `<td>${esc(String(v ?? '—'))}</td>`).join('')}</tr>`).join('')}</table>`);
  if (p.transfersReal?.length) morceaux.push(`<h3>Transferts réels</h3><table class="tbl compact">${p.transfersReal.map(([d, de, vers, ind, val]) => `<tr><td>${esc((d || '').slice(0, 7))}</td><td>${esc(de || '?')} → ${esc(vers || '?')}</td><td>${ind ? money(ind) : ind === 0 ? 'libre' : '—'}</td><td class="muted">${val ? 'valeur ' + money(val) : ''}</td></tr>`).join('')}</table>`);
  const f = clubsFormateurs(G, p).map(x => getClub(G, x.id)?.name).filter(Boolean);
  if (f.length) morceaux.push(`<p class="hint">Clubs formateurs (mécanisme de solidarité FIFA) : ${f.map(esc).join(', ')}</p>`);
  if (reglesActives(G) && reglesPays(G).nat === 'ENG' && p.club !== G.clubId && !UK.has(p.nat) && p.nat !== 'IRL') {
    const pts = pointsGBE(G, p); morceaux.push(`<p class="hint">Autorisation de travail (GBE) : ${pts} points sur 15 ${pts >= 15 ? '✅' : pts >= 10 ? '⚖ commission d\'exceptions' : '❌'}</p>`);
  }
  if (!morceaux.length) return;
  const zone = $('#modal .reel-j') || $('#modal .tabs');
  if (zone) zone.insertAdjacentHTML('afterend', `<div class="reel-plus">${morceaux.join('')}</div>`);
};

// agent réel (transfermarkt-datasets) : remplace l'agence générée sur la fiche et dans les négociations
if (typeof agentOf === 'function') {
  const __agentOfMR = agentOf;
  agentOf = function (p) {
    if (p?.agentReal && G) {
      const id = 'reel:' + p.agentReal;
      G.agents ||= {};
      if (!G.agents[id]) G.agents[id] = withSideRng(`${G.seed}|agentReel|${id}`, () => ({ id, name: p.agentReal, type: pick(Object.keys(AGENT_TYPES)), clients: 0, deals: 0, real: true }));
      if (p.agent !== id) { p.agent = id; G.agents[id].clients++; }
      return G.agents[id];
    }
    return __agentOfMR(p);
  };
}
