// ============================================================
//  Carrière du directeur sportif (lot 3)
//  Profil, contrat (simulé), réputation en 6 dimensions contextualisées,
//  postes vacants, sondages, entretiens, offres, fuites, changement de club
//  (dossiers confidentiels laissés à l'ancien club), licenciement, chômage.
// ============================================================
const REP_DIMS = { build: 'Construction d\'effectif', recruit: 'Recrutement', finance: 'Gestion financière', youth: 'Développement des jeunes', coach: 'Collaboration avec les entraîneurs', promises: 'Respect des engagements' };
const CLUB_PROFILES = { formateur: 'Club formateur', gestionnaire: 'Club gestionnaire', ambitieux: 'Club ambitieux' };
const AUTONOMY = { limitee: 'Limitée (le président valide les gros dossiers)', standard: 'Standard', large: 'Large (recrutement, staff, cellule)' };

function dsInit(G) {
  if (G.ds) return G.ds;
  const c = myClub(G);
  G.ds = { name: G.managerName, age: 38, since: G.season, status: 'employed', rep: { build: 40, recruit: 40, finance: 40, youth: 40, coach: 45, promises: 50 },
    contract: { wageM: roundMoney(4000 + c.rep * c.rep * 3), until: G.season + 2, autonomy: 'standard', scope: { transfers: true, staff: true, cell: true, youth: true }, objectives: [], indemMonths: 6, simulated: true },
    career: [{ club: c.name, clubId: c.id, from: `${G.season}`, to: null, role: 'Directeur sportif', why: null, results: [] }],
    relations: {}, offers: [], applications: [], interviews: [], earnings: 0, seasonStart: seasonSnapshot(G), notable: [] };
  return G.ds;
}
function dsOverall(ds) { const r = ds.rep; return (r.build * 1.2 + r.recruit + r.finance + r.youth * .7 + r.coach * .6 + r.promises * .5) / 5; }
function seasonSnapshot(G) {
  const sq = clubPlayers(G, G.clubId);
  return { season: G.season, club: G.clubId, value: sq.reduce((s, p) => s + p.value, 0), cash: myClub(G).budget, rep: myClub(G).rep, objective: G.objective };
}
// Réputation contextualisée : jugée selon les moyens et objectifs du club, pas en absolu
function dsSeasonReview(G, S) {
  const ds = dsInit(G), st = ds.seasonStart || seasonSnapshot(G), me = myClub(G), r = ds.rep;
  const sq = clubPlayers(G, G.clubId), val = sq.reduce((s, p) => s + p.value, 0);
  const rankGap = (G.objective || 10) - (S.rank || 10);                              // + = mieux que l'objectif
  const valGrowth = st.value ? (val - st.value) / st.value : 0;
  const tr = (G.transfers || []).filter(t => t.season === S.season);
  const sales = tr.filter(t => t.from === G.clubId).reduce((s, t) => s + t.fee, 0), buys = tr.filter(t => t.to === G.clubId);
  const signedOk = buys.filter(t => { const p = getPlayer(G, t.pid); return p && p.stats.apps >= 10; }).length;
  const ymin = sq.filter(p => p.age <= 21).reduce((s, p) => s + (p.stats.min || 0), 0);
  const cashDelta = me.budget - st.cash, ratio = wageBill(G) / Math.max(1, projectedWeeklyIncome(G));
  const reqs = (G.coachReqs || []).filter(q => q.season === S.season), kept = reqs.filter(q => q.status === 'done').length, broken = reqs.filter(q => q.status === 'failed').length;
  const scale = 100 / Math.max(40, st.rep); // une vente de 20 M€ pèse plus pour un petit club
  const d = {
    build: clamp(rankGap * 3 + valGrowth * 25, -12, 12),
    recruit: clamp((buys.length ? (signedOk / buys.length - .5) * 16 : 0) + Math.min(6, sales / 1e6 * .08 * scale), -10, 12),
    finance: clamp((cashDelta >= 0 ? 4 : -4) + (ratio < .7 ? 3 : -4) + (me.budget < 0 ? -5 : 0), -12, 10),
    youth: clamp(ymin / 600 - 2 + (G.alumni || []).filter(a => a.promoted === S.season).length * 2, -6, 10),
    coach: clamp(((G.coach?.relation ?? 55) - 55) / 4, -10, 8),
    promises: clamp((kept - broken * 1.5) * 2, -10, 8)
  };
  for (const k in d) r[k] = clamp(r[k] * .9 + (r[k] + d[k]) * .1 + d[k] * .6, 0, 100);
  const entry = { season: S.season, club: me.name, rank: S.rank, objective: S.objLabel, met: S.met, sales, buys: buys.length, ymin, cash: Math.round(me.budget), deltas: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Math.round(v)])) };
  ds.career[ds.career.length - 1].results.push(entry);
  for (const t of buys) { const p = getPlayer(G, t.pid); if (t.fee >= 5e6 || (p && p.stats.apps >= 25)) ds.notable.push({ season: S.season, kind: 'achat', name: t.name, fee: t.fee, club: me.name, apps: p?.stats.apps ?? 0 }); }
  for (const t of tr.filter(t => t.from === G.clubId && t.fee >= 5e6)) ds.notable.push({ season: S.season, kind: 'vente', name: t.name, fee: t.fee, club: me.name });
  ds.seasonStart = null;
  return entry;
}

// ---------- Postes de directeur sportif dans les autres clubs ----------
function dsPost(G, c) {
  G.dsPosts ||= {};
  return G.dsPosts[c.id] ||= withSideRng(`${G.seed}|dspost|${c.id}`, () => ({ name: pick(STAFF_FIRST) + ' ' + pick(STAFF_LAST), since: G.season - rint(0, 5), profile: pick(Object.keys(CLUB_PROFILES)), vacant: false }));
}
function vacancies(G) { return G.clubs.filter(c => !c.foreign && c.id !== G.clubId && dsPost(G, c).vacant); }
function postsSeasonEnd(G) {
  const me = myClub(G);
  for (const c of G.clubs.filter(c => !c.foreign && c.id !== G.clubId)) {
    const p = dsPost(G, c), L = clubLeague(G, c.id);
    if (p.vacant && G.season - p.vacantSince >= 1 && rnd() < .7) { p.vacant = false; p.name = pick(STAFF_FIRST) + ' ' + pick(STAFF_LAST); p.since = G.season; continue; }
    const bad = L && standings(G, L.id).findIndex(r => r.id === c.id) >= L.clubs.length * .7;
    if (!p.vacant && rnd() < (bad ? .3 : .07)) { p.vacant = true; p.vacantSince = G.season; p.deadline = G.week + 10; p.candidates = rint(2, 6); news(G, `📋 ${c.name} se sépare de son directeur sportif ${p.name}. Le poste est vacant.`, 'info', true); }
  }
  void me;
}
// sondages et offres (jamais une offre prestigieuse automatique)
function dsOffersWeekly(G) {
  const ds = dsInit(G), ov = dsOverall(ds), me = myClub(G);
  if (rnd() > .04) return;
  const exp = G.season - ds.since + ds.career.length;
  const pool = G.clubs.filter(c => !c.foreign && c.id !== G.clubId && c.rep <= 30 + ov * .9 + exp * 1.5 && c.rep >= me.rep - 20 && !ds.offers.some(o => o.clubId === c.id && !o.closed));
  if (!pool.length) return;
  const c = pick(pool), post = dsPost(G, c), kind = post.vacant ? 'entretien' : ds.status === 'employed' ? 'sondage' : 'entretien';
  const o = { id: 'o' + G.decSeq++, clubId: c.id, kind, week: G.week, season: G.season, closed: false, stage: 'contact' };
  ds.offers.push(o);
  addDecision(G, { key: 'dsoffer:' + o.id, kind: 'dsOffer', ref: o.id, blocking: false, from: kind === 'sondage' ? `Intermédiaire de ${c.name}` : `Président de ${c.name}`, icon: '💼',
    title: kind === 'sondage' ? `${c.name} vous sonde discrètement` : `${c.name} vous propose un entretien`,
    text: `${c.name} (${clubLeague(G, c.id)?.name || ''}, ${CLUB_PROFILES[post.profile]}) ${kind === 'sondage' ? 'souhaite savoir si vous seriez ouvert à un projet. Rien n\'est public.' : 'cherche un directeur sportif et souhaite vous rencontrer.'} Sans réponse, la piste se refroidit.` });
}
DECISION_OPTS.dsOffer = d => [['interview', 'Accepter un entretien', 'primary'], ['details', 'Demander des précisions'], ['refuse', 'Refuser poliment']];
const __decideDS = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || d.kind !== 'dsOffer') return __decideDS(id, opt);
  const ds = dsInit(G), o = ds.offers.find(x => x.id === d.ref), c = getClub(G, o.clubId);
  let msg;
  if (opt === 'refuse') { o.closed = true; ds.relations[c.id] = (ds.relations[c.id] || 0) + 2; msg = `Vous déclinez l'approche de ${c.name}.`; }
  else if (opt === 'details') { d.done = false; return modal(`<h2>${esc(c.name)}</h2>${clubSheet(G, c)}<div class="row gap mt"><div class="grow"></div><button class="btn primary" onclick="closeModal();decide(${d.id}, 'interview')">Accepter l'entretien</button><button class="btn" onclick="closeModal();decide(${d.id}, 'refuse')">Refuser</button></div>`, 'wide'); }
  else { d.done = opt; d.answer = 'entretien'; save(); return interview(o.id); }
  d.done = opt; d.answer = msg; save(); toast(msg);
  if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
};
function apply(clubId) {
  const ds = dsInit(G), c = getClub(G, clubId);
  if (ds.applications.some(a => a.clubId === clubId && !a.closed)) return toast('Candidature déjà envoyée.', 'err');
  const o = { id: 'o' + G.decSeq++, clubId, kind: 'candidature', week: G.week, season: G.season, closed: false, stage: 'candidature' };
  ds.applications.push(o); ds.offers.push(o);
  const ov = dsOverall(ds), shortlisted = c.rep <= 35 + ov * .9 + rnd() * 10;
  if (!shortlisted) { o.closed = true; o.result = 'Candidature non retenue'; news(G, `📋 ${c.name} n'a pas retenu votre candidature : profil jugé insuffisant pour le poste.`, 'info'); save(); toast(`${c.name} ne retient pas votre candidature.`, 'err'); return refresh(); }
  save(); toast(`${c.name} vous convoque en entretien.`); interview(o.id);
}
// ---------- Fiche club (comparatif avant signature) ----------
function clubSheet(G, c, terms) {
  const L = clubLeague(G, c.id), rank = L ? standings(G, L.id).findIndex(r => r.id === c.id) + 1 : '?', sq = clubPlayers(G, c.id).filter(p => !p.academy);
  const avg = sq.length ? Math.round(sq.map(playerOvr).sort((a, b) => b - a).slice(0, 14).reduce((a, b) => a + b, 0) / Math.min(14, sq.length)) : 0;
  const post = dsPost(G, c), wages = sq.reduce((s, p) => s + p.wage, 0);
  const risks = [];
  if (c.budget < 0) risks.push('trésorerie négative');
  if (L && rank > L.clubs.length * .7) risks.push('lutte pour le maintien');
  if (sq.filter(p => p.contract <= 1).length > 6) risks.push(`${sq.filter(p => p.contract <= 1).length} contrats qui expirent`);
  if (avg < c.rep - 10) risks.push('effectif en dessous du standing du club');
  const coachGuess = c.mgrName || 'entraîneur en place';
  return `<table class="tbl kv"><tr><td>Situation</td><td>${esc(L?.name || '')} · ${rank}<sup>e</sup> · réputation ${stars(c.rep)} · ${CLUB_PROFILES[post.profile]}</td></tr>
    <tr><td>Finances connues</td><td>trésorerie ${money(c.budget)} · masse salariale ${wageM(wages)}</td></tr>
    <tr><td>Effectif</td><td>${sq.length} joueurs · niveau des 14 meilleurs ≈ ${avg} · âge moyen ${sq.length ? (sq.reduce((s, p) => s + p.age, 0) / sq.length).toFixed(1) : '?'}</td></tr>
    <tr><td>Entraîneur</td><td>${esc(coachGuess)}</td></tr><tr><td>Cellule de recrutement</td><td>${c.rep >= 80 ? '4 personnes, spécialisées' : c.rep >= 65 ? '3 personnes' : c.rep >= 50 ? '2 personnes' : '1 personne, fonctions cumulées'} (estimation)</td></tr>
    ${terms ? `<tr><td>Pouvoirs</td><td>${AUTONOMY[terms.autonomy]}</td></tr><tr><td>Salaire</td><td>${money(terms.wageM)}/mois jusqu'en juin ${G.season + terms.yrs} <small class="muted">(conditions simulées)</small></td></tr><tr><td>Objectifs</td><td>${terms.objectives.map(esc).join(' · ')}</td></tr>` : ''}
    <tr><td>Risques identifiés</td><td class="${risks.length ? 'warn' : ''}">${risks.join(' · ') || 'aucun majeur visible'}</td></tr></table>`;
}
// ---------- Entretien : pas de réponse universellement gagnante ----------
const INTERVIEW_Q = [
  { k: 'recrut', q: 'Quelle sera votre politique de recrutement ?', a: [['jeunes', 'Des jeunes à fort potentiel, revendables'], ['confirmes', 'Des joueurs confirmés, prêts tout de suite'], ['opportunites', 'Des opportunités de marché : fins de contrat, prêts']] },
  { k: 'budget', q: 'Comment gérerez-vous le budget ?', a: [['equilibre', 'Équilibre strict : pas de déficit'], ['investir', 'Investir maintenant pour grandir'], ['vendre', 'Vendre au bon moment pour réinvestir']] },
  { k: 'formation', q: 'Quelle place pour le centre de formation ?', a: [['priorite', 'Une priorité : un jeune intégré chaque saison'], ['complement', 'Un complément à l\'effectif'], ['prets', 'Les prêter pour les aguerrir']] },
  { k: 'coach', q: 'Quelle relation avec l\'entraîneur ?', a: [['choisir', 'Je choisis l\'entraîneur et fixe le cadre'], ['collab', 'Une collaboration au quotidien'], ['servir', 'Le coach décide du sportif, je le sers']] },
  { k: 'moyens', q: 'De quels moyens avez-vous besoin ?', a: [['modestes', 'Les moyens actuels me suffisent'], ['standard', 'Une cellule renforcée'], ['ambitieux', 'Un budget transferts nettement plus élevé']] }
];
const PROFILE_PREF = {
  formateur: { jeunes: 3, opportunites: 1, equilibre: 2, vendre: 3, priorite: 3, complement: 1, prets: 2, collab: 2, servir: 1, modestes: 2, standard: 1, ambitieux: -2, confirmes: -1, investir: -1, choisir: 0 },
  gestionnaire: { opportunites: 3, jeunes: 1, equilibre: 3, vendre: 2, investir: -2, complement: 2, prets: 1, collab: 2, choisir: 1, modestes: 3, standard: 1, ambitieux: -3, confirmes: 0, priorite: 0, servir: 0 },
  ambitieux: { confirmes: 3, opportunites: 1, investir: 3, vendre: 0, equilibre: -1, complement: 2, priorite: 0, choisir: 2, collab: 1, ambitieux: 2, standard: 1, modestes: -1, jeunes: 0, prets: 0, servir: -1 }
};
function interview(offerId) {
  const ds = dsInit(G), o = ds.offers.find(x => x.id === offerId), c = getClub(G, o.clubId), post = dsPost(G, c);
  const qs = withSideRng(`${G.seed}|iv|${offerId}`, () => shuffle(INTERVIEW_Q.slice()).slice(0, 4).map(x => ({ ...x, a: shuffle(x.a.slice()) })));
  modal(`<h2>Entretien — ${esc(c.name)}</h2><p class="hint">Le président et un membre du conseil vous reçoivent. Chaque club a ses attentes : aucune réponse ne convient partout.</p>
    ${clubSheet(G, c)}<form id="ivF">${qs.map((x, i) => `<div class="card sub"><b>${esc(x.q)}</b>${x.a.map(([k, l]) => `<label class="chk"><input type="radio" name="q${i}" value="${x.k}:${k}" ${k === x.a[0][0] ? '' : ''}> ${esc(l)}</label>`).join('')}</div>`).join('')}</form>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ivOk">Terminer l'entretien</button></div><p class="hint" id="ivR"></p>`, 'wide');
  $('#ivOk').onclick = () => {
    const ans = qs.map((_, i) => document.querySelector(`input[name=q${i}]:checked`)?.value);
    if (ans.some(a => !a)) return $('#ivR').textContent = 'Réponds à toutes les questions.';
    const pref = PROFILE_PREF[post.profile];
    let score = ans.reduce((s, a) => s + (pref[a.split(':')[1]] || 0), 0) * 4 + dsOverall(ds) * .6 + (ds.relations[c.id] || 0) - Math.max(0, c.rep - dsOverall(ds) - 25);
    if (ans.some(a => a === 'moyens:ambitieux') && c.budget < 10e6) score -= 8;
    const rival = 28 + c.rep * .3 + rnd() * 15 + (post.candidates || 3); // concurrents : plus nombreux et meilleurs dans les grands clubs
    o.score = Math.round(score); o.rival = Math.round(rival); o.answers = ans;
    ds.interviews.push({ season: G.season, label: weekLabel(G), club: c.name, score: o.score, answers: ans.map(a => a.split(':')[1]) });
    // fuite : cause simulée identifiable (presse locale, club bavard), jamais systématique
    const leakChance = .12 + (c.rep >= 75 ? .1 : 0) + ds.interviews.filter(x => x.season === G.season).length * .08;
    if (ds.status === 'employed' && rnd() < leakChance) { o.leak = c.rep >= 75 ? `un média national a appris votre rencontre avec ${c.name}` : `l'entourage de ${c.name} a évoqué votre nom dans la presse locale`; scheduleLeak(G, o); }
    if (score >= rival + 6) { o.stage = 'offer'; closeModal(); makeOfferTerms(o); }
    else if (score >= rival - 4) { o.stage = 'second'; closeModal(); addDecision(G, { key: 'second:' + o.id, kind: 'dsOffer', ref: o.id, blocking: false, from: `Président de ${c.name}`, icon: '💼', title: `${c.name} demande un second entretien`, text: `Votre candidature est en balance avec ${post.candidates || 2} autre(s). Le président souhaite vous revoir.` }); toast(`${c.name} souhaite un second entretien.`); }
    else { o.closed = true; o.result = 'Un autre candidat a été préféré'; closeModal(); news(G, `💼 ${c.name} a préféré un autre candidat pour le poste de directeur sportif.`, 'info'); toast(`${c.name} choisit un autre candidat.`, 'err'); }
    save(); if ($('#top')) renderTop();
  };
}
function scheduleLeak(G, o) {
  const c = getClub(G, o.clubId);
  news(G, `📰 Fuite : ${o.leak}.`, 'press');
  G.board.conf = clamp(G.board.conf - (G.board.conf > 60 ? 4 : 8), 0, 100);
  const ds = dsInit(G);
  // réaction de la direction : prolongation, moyens supplémentaires, ou préparation de la succession
  const keep = dsOverall(ds) >= 50 && G.board.conf >= 45;
  addDecision(G, { key: 'leak:' + o.id, kind: 'leakReact', ref: o.id, data: keep ? 'keep' : 'succession', blocking: true, from: 'Président', icon: '🏛',
    title: keep ? 'Le président veut vous retenir' : 'Le président prépare votre succession',
    text: keep ? `Le président a appris vos contacts avec ${c.name}. Il propose une prolongation de 2 ans (+15 % de salaire) et un budget de recrutement renforcé si vous mettez fin aux discussions.`
      : `Le président a appris vos contacts avec ${c.name} et commence à chercher un successeur. Votre position au club est fragilisée.` });
}
DECISION_OPTS.leakReact = d => d.data === 'keep' ? [['stay', 'Rester et signer la prolongation', 'primary'], ['continue', 'Poursuivre les discussions avec l\'autre club']] : [['reassure', 'Rassurer le président : je reste', 'primary'], ['continue', 'Assumer et poursuivre']];
const __decideDS2 = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || d.kind !== 'leakReact') return __decideDS2(id, opt);
  const ds = dsInit(G), o = ds.offers.find(x => x.id === d.ref);
  let msg;
  if (opt === 'stay') { ds.contract.until += 2; ds.contract.wageM = roundMoney(ds.contract.wageM * 1.15); if (G.cell) G.cell.budgetM = roundMoney(G.cell.budgetM * 1.2); o.closed = true; o.result = 'Retenu par son club'; G.board.conf = clamp(G.board.conf + 8, 0, 100); msg = `Prolongation jusqu'en juin ${ds.contract.until}, cellule renforcée.`; }
  else if (opt === 'reassure') { const ok = rnd() < .55; G.board.conf = clamp(G.board.conf + (ok ? 6 : -3), 0, 100); o.closed = true; o.result = 'Discussions arrêtées'; msg = ok ? 'Le président est rassuré.' : 'Le président reste méfiant.'; ds.succession = !ok; }
  else { G.board.conf = clamp(G.board.conf - 6, 0, 100); ds.succession = d.data !== 'keep'; msg = 'Les discussions continuent. La confiance du président baisse.'; }
  d.done = opt; d.answer = msg; news(G, `🏛 ${d.title} — ${msg}`, 'board'); save(); toast(msg);
  if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
};
// ---------- Négociation du contrat proposé ----------
function makeOfferTerms(o) {
  const ds = dsInit(G), c = getClub(G, o.clubId), post = dsPost(G, c), L = clubLeague(G, c.id);
  const base = roundMoney((4000 + c.rep * c.rep * 3) * (.9 + dsOverall(ds) / 250));
  o.terms = { wageM: base, yrs: 2, autonomy: post.profile === 'ambitieux' ? 'standard' : 'limitee', objectives: [L && L.clubs.length ? `Finir dans la première moitié de ${L.name}` : 'Stabiliser le club', post.profile === 'formateur' ? 'Intégrer des jeunes du centre' : post.profile === 'gestionnaire' ? 'Équilibre financier' : 'Qualification européenne à moyen terme'], cellBudget: roundMoney(15000 + c.rep * c.rep * 14), patience: 2 };
  o.stage = 'offer';
  negotiateOffer(o.id);
}
function negotiateOffer(offerId) {
  const ds = dsInit(G), o = ds.offers.find(x => x.id === offerId), c = getClub(G, o.clubId), t = o.terms;
  const myTerms = { wageM: ds.contract.wageM, yrs: Math.max(0, ds.contract.until - G.season), autonomy: ds.contract.autonomy };
  modal(`<h2>Offre de ${esc(c.name)}</h2><div class="grid2"><div><h3>${esc(c.name)} (proposition)</h3>${clubSheet(G, c, t)}</div>
      <div><h3>Situation actuelle</h3>${ds.status === 'employed' ? clubSheet(G, myClub(G), { ...myTerms, yrs: myTerms.yrs, objectives: (G.boardObj?.list || []).slice(0, 2).map(x => x.label) }) : '<p>Sans club.</p>'}</div></div>
    <div class="form-grid"><label>Salaire (€/mois) <input id="ofW" type="number" step="1000" value="${t.wageM}"></label><label>Durée <select id="ofY">${[1, 2, 3, 4].map(y => `<option ${y === t.yrs ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
      <label>Autonomie <select id="ofA">${Object.entries(AUTONOMY).map(([k, l]) => `<option value="${k}" ${k === t.autonomy ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Budget mensuel de la cellule (€) <input id="ofC" type="number" step="5000" value="${t.cellBudget}"></label></div>
    <p class="hint">Conditions simulées. Votre salaire personnel est distinct du budget du club. ${ds.status === 'employed' ? `Votre contrat actuel court jusqu'en juin ${ds.contract.until} : le nouveau club paiera une indemnité à votre employeur.` : ''}</p>
    <div class="row gap mt"><button class="btn danger" id="ofNo">Refuser</button><div class="grow"></div><button class="btn" id="ofNeg">Proposer ces conditions</button><button class="btn primary" id="ofYes">Accepter l'offre telle quelle</button></div><p class="hint" id="ofR"></p>`, 'wide');
  $('#ofNo').onclick = () => { o.closed = true; o.result = 'Offre refusée'; ds.relations[c.id] = (ds.relations[c.id] || 0) - 1; closeModal(); save(); toast('Offre refusée. Vous restez en place.'); };
  $('#ofYes').onclick = () => { closeModal(); dsMoveTo(G, c.id, t); };
  $('#ofNeg').onclick = () => {
    const w = +$('#ofW').value, y = +$('#ofY').value, a = $('#ofA').value, cb = +$('#ofC').value;
    const greed = w / t.wageM + (a === 'large' && t.autonomy !== 'large' ? .15 : 0) + (cb > t.cellBudget * 1.2 ? .1 : 0) + (y > 3 ? .05 : 0);
    const room = 1 + (o.score - o.rival) / 60;
    if (greed <= room) { Object.assign(t, { wageM: w, yrs: y, autonomy: a, cellBudget: cb }); closeModal(); return dsMoveTo(G, c.id, t); }
    t.patience--;
    if (t.patience < 0) { o.closed = true; o.result = 'Offre retirée'; closeModal(); save(); news(G, `💼 ${c.name} retire son offre : vos exigences dépassent ce qu'il peut accorder.`, 'info'); return toast(`${c.name} retire son offre.`, 'err'); }
    $('#ofR').textContent = `❌ ${c.name} refuse ces conditions. ${t.patience ? 'Une dernière proposition est possible.' : 'C\'est sa limite.'}`;
  };
}
// ---------- Changement de club ----------
const CONFIDENTIAL = ['cell', 'know', 'reports', 'shortlist', 'deals', 'coachReqs', 'consq', 'promises', 'offers', 'meetLog', 'budgetPlan', 'boardObj', 'intakeLog', 'alumni', 'agents', 'ledger', 'fin', 'lastMonth', 'bankLoans', 'costCut', 'deficitAlert'];
function dsMoveTo(G, clubId, terms) {
  const ds = dsInit(G), old = myClub(G), c = getClub(G, clubId), S = { season: G.season };
  // les dossiers appartiennent au club : ils restent rangés chez l'ancien employeur
  G.clubFiles ||= {};
  const files = {}; for (const k of CONFIDENTIAL) if (G[k] !== undefined) files[k] = G[k];
  files.coach = G.coach; files.staffPeople = G.staffPeople; files.tactics = G.tactics;
  G.clubFiles[old.id] = files;
  if (ds.status === 'employed') {
    const months = Math.max(0, (ds.contract.until - G.season) * 12 - Math.round(G.week / G.schedule.length * 12));
    const indem = roundMoney(Math.min(months, ds.contract.indemMonths) * ds.contract.wageM);
    if (indem) { flow(G, old, indem, 'other'); flow(G, c, -indem, 'other'); }
    ds.career[ds.career.length - 1].to = `${weekLabel(G)} ${G.season}`; ds.career[ds.career.length - 1].why = `Rejoint ${c.name}${indem ? ` (indemnité de ${money(indem)} versée à ${old.name})` : ''}`;
    dsPost(G, old).vacant = true; dsPost(G, old).vacantSince = G.season;
  }
  // l'ancien club repasse sous contrôle de l'IA : il garde ses joueurs, son argent, son staff
  takeJob(G, clubId);
  if (G.inbox[0]?.text.includes('nouvel entraîneur')) G.inbox.shift(); // message propre au mode entraîneur
  for (const k of CONFIDENTIAL) delete G[k];
  const back = G.clubFiles[clubId] || {};
  for (const [k, v] of Object.entries(back)) G[k] = v;
  // les dossiers en attente concernaient l'ancien club : ils sont clos, l'historique reste lisible
  G.decisions = (G.decisions || []).map(d => d.done ? d : { ...d, done: 'ancien club', answer: 'Sans objet : changement de club' });
  G.fin ||= emptyFin();
  G.shortlist ||= []; G.deals ||= []; G.promises ||= []; G.offers ||= []; G.meetLog ||= [];
  delete G.staffPeople; delete G.coach; G.coachReqs = G.coachReqs || [];
  migrateGestion(G);
  if (isDS(G)) { G.coach = newCoach(c.rep); G.coach.contract = 2; G.tactics.formation = G.coach.formation; Object.assign(G.tactics, autoLineup(G, G.clubId, G.coach.formation)); }
  if (!G.cell) cellInit(G);
  if (terms.cellBudget && G.cell) G.cell.budgetM = terms.cellBudget;
  ds.status = 'employed'; ds.since = G.season;
  ds.contract = { wageM: terms.wageM, until: G.season + terms.yrs, autonomy: terms.autonomy, scope: { transfers: true, staff: terms.autonomy !== 'limitee', cell: true, youth: true }, objectives: terms.objectives, indemMonths: 6, simulated: true };
  ds.career.push({ club: c.name, clubId: c.id, from: `${weekLabel(G)} ${G.season}`, to: null, role: 'Directeur sportif', why: null, results: [] });
  ds.seasonStart = seasonSnapshot(G);
  dsPost(G, c).vacant = false; dsPost(G, c).name = ds.name;
  for (const off of ds.offers) if (!off.closed) { off.closed = true; off.result = off.clubId === clubId ? 'Signé' : 'Sans suite'; }
  makeSeasonBudget(G); ledgerOf(G);
  news(G, `✍ Vous êtes le nouveau directeur sportif de ${c.name} jusqu'en juin ${G.season + terms.yrs} (${money(terms.wageM)}/mois, autonomie ${terms.autonomy}). Les dossiers de ${old.name} restent à ${old.name}.`, 'board');
  addDecision(G, { key: 'arrive:' + c.id + ':' + G.season, kind: 'info', blocking: false, from: 'Président', icon: '📁', title: `Dossier de prise de fonction — ${c.name}`, html: clubSheet(G, c, terms) + '<p>Premières étapes conseillées : réunion de recrutement, point avec l\'entraîneur, revue du budget.</p>', text: '' });
  save(); if ($('#top') || document.body.className === 'game') enterGame();
  void S;
}

// ---------- Licenciement et chômage ----------
function dsSacked(G, reason) {
  const ds = dsInit(G), old = myClub(G), sc = typeof boardScores === 'function' ? boardScores(G) : [];
  const months = Math.max(0, (ds.contract.until - G.season) * 12 - Math.round(G.week / G.schedule.length * 12));
  const indem = roundMoney(Math.min(months, ds.contract.indemMonths) * ds.contract.wageM);
  if (indem) flow(G, old, -indem, 'staff');
  ds.earnings += indem;
  ds.career[ds.career.length - 1].to = `${weekLabel(G)} ${G.season}`;
  ds.career[ds.career.length - 1].why = `Licencié : ${reason}`;
  ds.status = 'unemployed'; ds.unemployedSince = absWeek(G);
  ds.rep.promises = clamp(ds.rep.promises - 3, 0, 100);
  G.clubFiles ||= {}; const files = {}; for (const k of CONFIDENTIAL) if (G[k] !== undefined) files[k] = G[k]; G.clubFiles[old.id] = files;
  dsPost(G, old).vacant = true; dsPost(G, old).vacantSince = G.season;
  ds.lastBilan = { club: old.name, reason, scores: sc.map(x => `${x.label} : ${x.s}/100`), indem };
  news(G, `🏛 ${old.name} met fin à votre contrat (${reason}). Indemnité : ${money(indem)}. Vous êtes libre de tout engagement.`, 'board');
}
// semaine sans club : le monde continue (votre ancien club est géré automatiquement)
function unemployedWeek() {
  const r = simWeek(G); // politique automatique pour le club laissé vacant
  dsOffersWeekly(G);
  save(); show('career');
  return r;
}
const __advanceDS = advance;
advance = function () {
  if (G?.ds?.status === 'unemployed') { if (LIVE || $('#modal')) return; unemployedWeek(); return; }
  return __advanceDS();
};
const __afterWeekDS = afterWeek;
afterWeek = function (r) {
  if (r === 'sacked' && isDS(G)) { dsSacked(G, 'résultats et confiance du président insuffisants'); save(); return show('career'); }
  return __afterWeekDS(r);
};
const __seasonEndDS = seasonEnd;
seasonEnd = function () {
  if (!isDS(G)) return __seasonEndDS();
  const ds = dsInit(G);
  const S = endSeason(G);
  if (S.sacked && ds.status === 'employed') { dsSacked(G, `objectifs non atteints (${S.objLabel})`); save(); enterGame(); return show('career'); }
  save(); enterGame(); show('career'); toast(`Saison ${S.season}/${S.season + 1} terminée : bilan dans Carrière.`);
};
// bilan de saison et réputation, avant le changement d'année
const __endSeasonDS = endSeason;
endSeason = function (G) {
  if (isDS(G) && G.ds?.status === 'employed') {
    const L = clubLeague(G, G.clubId), rank = standings(G, L.id).findIndex(r => r.id === G.clubId) + 1;
    try { dsSeasonReview(G, { season: G.season, rank, objLabel: objectiveLabel(G), met: rank <= G.objective }); } catch (e) { console.error(e); }
  }
  const S = __endSeasonDS(G);
  if (isDS(G)) {
    const ds = dsInit(G);
    postsSeasonEnd(G);
    if (ds.status === 'employed') {
      ds.seasonStart = seasonSnapshot(G); ds.age++;
      if (G.season > ds.contract.until && !S.sacked) {
        const ok = G.board.conf >= 45;
        if (ok) { ds.contract.until = G.season + 2; ds.contract.wageM = roundMoney(ds.contract.wageM * 1.08); news(G, `✍ Votre contrat est prolongé jusqu'en juin ${ds.contract.until}.`, 'board'); }
        else { S.sacked = true; }
      }
    }
  }
  return S;
};
const __completeWeekDS = completeWeek;
completeWeek = function (G, skip) {
  const r = __completeWeekDS(G, skip);
  if (isDS(G) && G.schedule[G.week - 1]?.t === 'L') { try { dsInit(G); if (G.ds.status === 'employed') dsOffersWeekly(G); } catch (e) { console.error(e); } }
  return r;
};

// ---------- Écran Carrière ----------
function vCareer(el) {
  const ds = dsInit(G), un = ds.status === 'unemployed';
  const vac = vacancies(G).sort((a, b) => b.rep - a.rep);
  const open = ds.offers.filter(o => !o.closed);
  el.innerHTML = `${un ? `<section class="card alert req"><h2>Sans club depuis ${Math.max(0, weeksAgo(G, ds.unemployedSince))} semaine(s)</h2><p>${esc(ds.lastBilan?.club || '')} : ${esc(ds.lastBilan?.reason || '')}. Indemnité perçue : ${money(ds.lastBilan?.indem || 0)}.</p><p class="hint">${(ds.lastBilan?.scores || []).map(esc).join(' · ')}</p><p>Le temps continue d'avancer : candidate aux postes vacants. Le bouton « Continuer » fait passer une semaine.</p></section>` : ''}
    <div class="grid2"><section class="card"><h2>👔 ${esc(ds.name)} <small>directeur sportif · ${ds.age} ans</small></h2>
      <table class="tbl kv"><tr><td>Statut</td><td>${un ? 'Sans club' : `En poste à <b>${esc(myClub(G).name)}</b> depuis ${ds.since}`}</td></tr>
        ${un ? '' : `<tr><td>Contrat</td><td>${money(ds.contract.wageM)}/mois jusqu'en juin ${ds.contract.until} · autonomie ${esc(AUTONOMY[ds.contract.autonomy])} · indemnité de rupture ${ds.contract.indemMonths} mois <small class="muted">(conditions simulées)</small></td></tr>
        <tr><td>Objectifs</td><td>${(ds.contract.objectives || []).map(esc).join(' · ') || '—'}</td></tr>`}
        <tr><td>Expérience</td><td>${ds.career.length} club(s) · ${new Set(ds.career.flatMap(c => c.results.map(r => r.season))).size} saison(s) complète(s)</td></tr></table>
      <h3>Réputation (6 dimensions)</h3>${Object.entries(REP_DIMS).map(([k, l]) => `<div class="attr"><span>${l}</span>${bar(ds.rep[k], 100)}<b>${Math.round(ds.rep[k])}</b></div>`).join('')}
      <p class="hint">Chaque dimension est jugée selon les moyens et objectifs du club : une belle vente pèse davantage dans un petit club. Il n'existe pas de note unique.</p></section>
    <section class="card"><h2>📨 Contacts et offres <small>${open.length}</small></h2>${open.length ? open.map(o => { const c = getClub(G, o.clubId); return `<div class="row gap"><b class="grow">${esc(c.name)}</b><small>${esc({ sondage: 'sondage discret', entretien: 'entretien proposé', candidature: 'candidature', offer: 'offre' }[o.stage === 'offer' ? 'offer' : o.kind])}</small>${o.stage === 'offer' ? `<button class="btn sm primary" data-neg="${o.id}">Négocier</button>` : `<button class="btn sm" data-iv="${o.id}">Entretien</button>`}</div>`; }).join('') : '<p class="muted">Aucun contact en cours.</p>'}
      <h3>Postes vacants</h3>${vac.length ? `<table class="tbl compact">${vac.map(c => `<tr><td class="nm">${crest(c, 18)} ${esc(c.name)}</td><td><small>${esc(clubLeague(G, c.id)?.name || '')} · ${CLUB_PROFILES[dsPost(G, c).profile]}</small></td><td>${stars(c.rep)}</td><td><button class="btn sm" data-ap="${c.id}">Candidater</button></td></tr>`).join('')}</table>` : '<p class="muted">Aucun poste vacant connu.</p>'}</section></div>
    <section class="card"><h2>📜 Parcours</h2><table class="tbl"><thead><tr><th>Club</th><th>Période</th><th>Résultats</th><th>Motif de départ</th></tr></thead><tbody>
      ${ds.career.map(c => `<tr><td>${esc(c.club)}</td><td>${esc(c.from)} → ${esc(c.to || 'en cours')}</td><td><small>${c.results.map(r => `${r.season} : ${r.rank}e (${esc(r.objective)} ${r.met ? '✔' : '✘'}), ${r.buys} recrue(s), ventes ${money(r.sales)}`).join('<br>') || '—'}</small></td><td>${esc(c.why || '—')}</td></tr>`).join('')}</tbody></table>
      <h3>Opérations marquantes</h3>${ds.notable.length ? ds.notable.slice(-12).reverse().map(n => `<div>${n.season} · ${n.kind === 'achat' ? '⬇ Achat' : '⬆ Vente'} de <b>${esc(n.name)}</b> (${money(n.fee)})${n.kind === 'achat' ? ` · ${n.apps} matchs` : ''} — ${esc(n.club)}</div>`).join('') : '<p class="muted">—</p>'}
      <h3>Jeunes développés</h3>${(G.alumni || []).length ? G.alumni.map(a => `${esc(a.name)} (pro en ${a.promoted})`).join(', ') : '<p class="muted">—</p>'}
      <h3>Entretiens passés</h3>${ds.interviews.length ? ds.interviews.slice(-8).reverse().map(i => `<div>${i.season} · ${esc(i.club)} : ${i.answers.join(', ')}</div>`).join('') : '<p class="muted">—</p>'}</section>`;
  el.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => apply(+b.dataset.ap));
  el.querySelectorAll('[data-iv]').forEach(b => b.onclick = () => interview(b.dataset.iv));
  el.querySelectorAll('[data-neg]').forEach(b => b.onclick = () => negotiateOffer(b.dataset.neg));
}
const __applyRoleNavDS = applyRoleNav;
applyRoleNav = function () {
  __applyRoleNavDS();
  if (isDS()) { const g = NAV_GROUPS.find(x => x[0] === 'Bureau'); if (g && !g[1].some(x => x[0] === 'career')) g[1].push(['career', '👔', 'Ma carrière']); }
  NAV_FLAT.length = 0; NAV_FLAT.push(...NAV_GROUPS.flatMap(x => x[1]));
};
const __showDS = show;
show = function (v) {
  if (G?.ds?.status === 'unemployed' && !['career', 'mail', 'comps', 'fixtures', 'stats', 'options', 'base', 'calendar'].includes(v)) v = 'career';
  if (v !== 'career') return __showDS(v);
  if (LIVE) return;
  VIEW_HIST.push(VIEW); VIEW = 'career';
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === 'career'));
  renderTop(); const main = $('#main'); main.innerHTML = ''; vCareer(main); navBadges();
  if (G.ds.status === 'unemployed') { const go = $('#btnGo'); if (go) { go.textContent = 'Semaine suivante ▶'; go.classList.remove('blocked'); go.onclick = () => advance(); } }
};
const __newGameDS = newGame;
newGame = function (...a) { const g = __newGameDS(...a); if (isDS(g)) { const prev = G; G = g; try { dsInit(g); } finally { G = prev; } } return g; };
