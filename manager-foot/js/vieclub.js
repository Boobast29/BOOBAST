// ============================================================
//  Vie du club (lot 5)
//  - demandes du coach négociables : accepter, alternative, différer, refuser avec motif
//  - relation avec le coach en 4 axes : accord sportif, confiance, promesses, autorité
//  - réunion de projet d'avant-saison : 3 priorités maximum, moyens associés, bilan
//  - vestiaire : influence progressive, succession du capitaine, parrainage, cours de langue,
//    suivi des promesses, réunions à effet décroissant
//  - prêts détaillés (rôle, concurrence, encadrement, salaire, rappel), bilan mensuel,
//    progression liée aux minutes réelles (plus de bonus automatique)
//  - identité durable du club
// ============================================================

// ---------- Identité du club ----------
const IDENTITIES = { formateur: { label: 'Club formateur', yW: 25, tip: 'Les supporters attendent des jeunes du centre ; la direction valorise les ventes.' },
  ambitieux: { label: 'Club ambitieux', yW: 5, tip: 'Les résultats priment ; un entraîneur reconnu est attendu.' },
  gestionnaire: { label: 'Club gestionnaire', yW: 12, tip: 'Équilibre financier avant tout ; achats raisonnables, reventes.' },
  populaire: { label: 'Club populaire', yW: 10, tip: 'Attachement aux joueurs fidèles et au jeu offensif ; les départs de cadres passent mal.' } };
function clubIdentity(G, c = myClub(G)) {
  G.identities ||= {};
  return G.identities[c.id] ||= withSideRng(`${G.seed}|id|${c.id}`, () => {
    const k = typeof dsPost === 'function' && G.dsPosts?.[c.id] ? ({ formateur: 'formateur', ambitieux: 'ambitieux', gestionnaire: 'gestionnaire' }[G.dsPosts[c.id].profile]) : (c.rep >= 82 ? 'ambitieux' : pick(['formateur', 'gestionnaire', 'populaire', 'ambitieux']));
    return { k, styleLike: pick(COACH_STYLES.map(s => s.k)), since: G.season, simulated: true };
  });
}
// objectifs de la direction pondérés par l'identité
const __setBoardObjectivesV = setBoardObjectives;
setBoardObjectives = function (G) {
  __setBoardObjectivesV(G);
  const id = IDENTITIES[clubIdentity(G).k], y = G.boardObj.list.find(x => x.k === 'youth');
  if (y) { y.w = id.yW; }
  if (G.project?.season === G.season) for (const pr of G.project.priorities) { const x = G.boardObj.list.find(o => o.k === PROJECT[pr].obj); if (x) x.w += 10; }
};

// ---------- Relation avec le coach : 4 axes ----------
function coachAxes(c) { c.ax ||= { accord: 55, confiance: 55, promesses: 60, autorite: 50 }; return c.ax; }
function axis(c, k, d) { const a = coachAxes(c); a[k] = clamp(a[k] + d, 0, 100); c.relation = clamp((a.accord + a.confiance + a.promesses) / 3, 0, 100); }

// demandes du coach : accepter / alternative / différer / refuser avec motif
DECISION_OPTS.coachReq = d => {
  const q = G.coachReqs?.find(x => x.id === d.ref);
  const extra = { reinforce: [['scout', 'Accepter et lancer une mission', 'primary']], sell: [['list', 'Accepter : le placer sur la liste', 'primary']], extend: [['nego', 'Accepter : négocier la prolongation', 'primary']],
    staff: [['go', 'Accepter (ouvrir le staff)', 'primary']], promote: [['promote', 'Accepter : le promouvoir', 'primary']] }[q?.kind] || [['accept', 'Accepter', 'primary']];
  const alt = { reinforce: 'Proposer plutôt un prêt', sell: 'Proposer plutôt un prêt du joueur', extend: 'Proposer une prolongation d\'un an seulement', staff: 'Proposer une formation du staff actuel', promote: 'Proposer de l\'intégrer aux entraînements seulement' }[q?.kind];
  return [...extra, ...(alt ? [['alt', alt]] : []), ...(q && !q.deferred ? [['defer', 'Différer au prochain mercato']] : []), ['refuse_budget', 'Refuser : pas de budget'], ['refuse_sport', 'Refuser : désaccord sportif', 'danger']];
};
const __decideV = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || d.kind !== 'coachReq' || !['alt', 'defer', 'refuse_budget', 'refuse_sport'].includes(opt)) return __decideV(id, opt);
  const c = G.coach, q = G.coachReqs.find(x => x.id === d.ref); let msg;
  if (opt === 'alt') {
    const ok = rnd() < .35 + coachAxes(c).confiance / 200 + coachAxes(c).accord / 300;
    if (ok) { q.status = 'accepted'; q.alt = true; if (q.kind === 'reinforce') q.min = Math.max(0, q.min - 3); axis(c, 'accord', 2); msg = `${c.name} accepte l'alternative.`; if (q.kind === 'sell') { const p = getPlayer(G, q.pid); if (p) (G.sales ||= []).push({ id: 's' + G.decSeq++, season: G.season, pid: p.id, mode: 'pret', ask: 0, minFee: 0, share: 60, start: G.week, deadline: G.week + 4, status: 'active', offers: 0, log: [] }); } }
    else { q.status = 'refused'; axis(c, 'accord', -6); msg = `${c.name} refuse l'alternative : « Ce n'est pas ce dont j'ai besoin. »`; }
  } else if (opt === 'defer') { q.deferred = true; q.status = 'open'; q.deadline += 12; axis(c, 'confiance', -2); d.done = false; msg = `${c.name} accepte d'attendre le prochain mercato, sans enthousiasme.`; d.done = 'defer'; d.answer = msg; save(); toast(msg); addDecisionLater(q); if ($('#top')) renderTop(); return; }
  else {
    const budgetTight = availableTransfer(G) < 3e6 || myClub(G).budget < 0;
    q.status = 'refused';
    if (opt === 'refuse_budget') { axis(c, 'confiance', budgetTight ? -1 : -6); msg = budgetTight ? `${c.name} comprend : les moyens manquent.` : `${c.name} n'est pas dupe : « Le budget existe, c'est un choix. »`; }
    else { axis(c, 'accord', -8); axis(c, 'autorite', 3); msg = `${c.name} prend acte du désaccord sportif.`; }
  }
  d.done = opt; d.answer = msg; news(G, `🧢 ${d.title} — ${msg}`, 'info'); save(); toast(msg);
  if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
};
function addDecisionLater(q) { q.reask = G.week + 10; }
// promesses tenues ou non au coach → axe « promesses » ; autorité selon les résultats et les arbitrages
const __coachReqCheckV = coachReqCheck;
coachReqCheck = function (G) {
  const before = (G.coachReqs || []).map(q => q.status);
  __coachReqCheckV(G);
  (G.coachReqs || []).forEach((q, i) => { if (before[i] === 'accepted' && q.status === 'done') axis(G.coach, 'promesses', 6); if (before[i] === 'accepted' && q.status === 'failed') axis(G.coach, 'promesses', -10); });
  for (const q of G.coachReqs || []) if (q.reask && G.week >= q.reask && q.status === 'open') { delete q.reask; addDecision(G, { key: 'coachReq:' + q.id + ':re', kind: 'coachReq', ref: q.id, from: G.coach.name + ' (entraîneur)', icon: '🧢', title: 'Demande reportée : ' + q.title, text: q.text }); }
};

// ---------- Réunion de projet d'avant-saison ----------
const PROJECT = {
  results: { label: 'Gagner tout de suite', obj: 'league', means: 'priorité aux joueurs confirmés, budget transferts mobilisé', coach: s => s.k !== 'jeunes' },
  youth: { label: 'Intégrer des jeunes', obj: 'youth', means: 'minutes garanties aux 21 ans et moins, coach impliqué', coach: s => s.k === 'jeunes' || s.k === 'possession' },
  finance: { label: 'Équilibre financier', obj: 'wages', means: 'masse salariale contenue, ventes au bon moment', coach: () => true },
  style: { label: 'Installer un style de jeu', obj: 'league', means: 'recrutement au profil du système du coach', coach: () => true },
  resell: { label: 'Vendre pour réinvestir', obj: 'net', means: 'achats de joueurs revendables (≤ 24 ans)', coach: s => s.k !== 'bloc' },
  stability: { label: 'Stabilité de l\'effectif', obj: 'cash', means: 'peu de départs de cadres, prolongations', coach: () => true }
};
function projectMeeting() {
  const c = G.coach, st = c ? coachStyle(c) : null, id = IDENTITIES[clubIdentity(G).k];
  modal(`<h2>📌 Réunion de projet ${G.season}/${String(G.season + 1).slice(2)}</h2><p>Président, entraîneur${c ? ` (${esc(c.name)}, ${esc(st.label)})` : ''} et toi fixez <b>au maximum trois priorités</b> pour la saison. Identité du club : <b>${id.label}</b> — ${esc(id.tip)}</p>
    <div class="topics">${Object.entries(PROJECT).map(([k, p]) => `<label class="topic"><input type="checkbox" name="pj" value="${k}"> <b>${p.label}</b><small>Moyens : ${esc(p.means)}${st ? ` · coach : ${p.coach(st) ? 'adhère' : '<span class="warn">réticent</span>'}` : ''}</small></label>`).join('')}</div>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="pjOk">Valider le projet</button></div><p class="hint" id="pjR"></p>`, 'wide');
  $('#pjOk').onclick = () => {
    const pr = [...document.querySelectorAll('input[name=pj]:checked')].map(i => i.value);
    if (!pr.length || pr.length > 3) return $('#pjR').textContent = 'Choisis entre une et trois priorités.';
    G.project = { season: G.season, priorities: pr, at: weekLabel(G) };
    const fitCoach = st ? pr.filter(k => PROJECT[k].coach(st)).length / pr.length : 1;
    if (c) axis(c, 'accord', Math.round((fitCoach - .6) * 15));
    const fitId = pr.filter(k => (k === 'youth' && id === IDENTITIES.formateur) || (k === 'finance' && id === IDENTITIES.gestionnaire) || (k === 'results' && id === IDENTITIES.ambitieux) || (k === 'stability' && id === IDENTITIES.populaire)).length;
    G.board.conf = clamp(G.board.conf + fitId * 3, 0, 100); G.fans = clamp((G.fans ?? 60) + fitId * 2, 0, 100);
    if (G.boardObj) setBoardObjectives(G);
    G.decisions.filter(x => x.kind === 'project' && !x.done).forEach(x => { x.done = 'ok'; x.answer = pr.map(k => PROJECT[k].label).join(', '); });
    news(G, `📌 Projet de la saison : ${pr.map(k => PROJECT[k].label).join(' · ')}.${c && fitCoach < .6 ? ` ${c.name} n'adhère pas à tout.` : ''}`, 'board');
    closeModal(); save(); if ($('#top')) renderTop();
  };
}
DECISION_OPTS.project = d => [['open', 'Tenir la réunion de projet', 'primary']];
const __decideV2 = decide;
decide = function (id, opt) { const d = G.decisions.find(x => x.id === id); if (d && !d.done && d.kind === 'project') return projectMeeting(); return __decideV2(id, opt); };
function projectReview(G) {
  const P = G.project; if (!P || P.season !== G.season || P.reviewed) return;
  const sc = typeof boardScores === 'function' ? boardScores(G) : [];
  const res = P.priorities.map(k => ({ k, s: sc.find(x => x.k === PROJECT[k].obj)?.s ?? 50 }));
  P.reviewed = res; const avg = res.reduce((a, x) => a + x.s, 0) / Math.max(1, res.length);
  if (G.coach) axis(G.coach, 'promesses', avg >= 60 ? 4 : -4);
  news(G, `📌 Bilan du projet : ${res.map(x => `${PROJECT[x.k].label} ${x.s}/100`).join(' · ')}.`, avg >= 60 ? 'board' : 'warn');
}

// ---------- Vestiaire ----------
// influence progressive : on se rapproche de la valeur cible de 8 % par semaine
const __influenceV = influence;
influence = function (G, p) { const t = __influenceV(G, p); return p.infl == null ? t : p.infl; };
function influenceWeekly(G) {
  for (const p of clubPlayers(G, G.clubId)) { const t = __influenceV(G, p); p.infl = p.infl == null ? t * (p.joinedSeason === G.season ? .6 : 1) : p.infl + (t - p.infl) * .08; }
}
// réunions : effet décroissant si le même sujet revient dans la saison
const __teamMeetingV = teamMeeting;
teamMeeting = function (topic) {
  const k = G.season + ':' + topic; G.meet.count ||= {};
  const n = G.meet.count[k] || 0, before = new Map(firstTeam(G).map(p => [p.id, [p.morale, p.trust]]));
  __teamMeetingV(topic);
  if (G.meet.team !== G.week) return;
  G.meet.count[k] = n + 1;
  if (n) { const f = Math.pow(.5, n); for (const p of firstTeam(G)) { const [m0, t0] = before.get(p.id) || [p.morale, p.trust]; p.morale = m0 + (p.morale - m0) * f; p.trust = t0 + ((p.trust ?? 55) - t0) * f; } news(G, `Le groupe a déjà entendu ce discours (${n + 1}e fois cette saison) : effet réduit.`, 'info'); save(); }
};
// succession du capitaine
function captainWeekly(G) {
  const T = G.tactics.takers ||= {}, cap = getPlayer(G, T.cap);
  if (!cap || cap.club !== G.clubId) {
    const vice = getPlayer(G, G.vice);
    const next = vice && vice.club === G.clubId ? vice : firstTeam(G).sort((a, b) => influence(G, b) - influence(G, a))[0];
    if (next) { T.cap = next.id; if (G.vice === next.id) G.vice = null; next.morale = clamp(next.morale + 5, 5, 100); if (cap || T.capWasSet) news(G, `©️ ${next.name} reprend le brassard${vice === next ? ' (vice-capitaine)' : ''}.`, 'info'); T.capWasSet = true; }
    return;
  }
  if ((cap.age >= 33 || cap.contract <= 1) && !G.vice && leagueRoundAt(G) % 10 === 5) addDecision(G, { key: 'capsucc:' + G.season, kind: 'info', blocking: false, from: 'Adjoint', icon: '©️', title: 'Préparer la succession du capitaine', text: `${cap.name} (${cap.age} ans, contrat ${contractEnd(cap)}) n'a pas de vice-capitaine désigné. Nomme-en un dans Réunions pour assurer la transition.` });
}
// intégration : parrainage et cours de langue
function integrationWeekly(G) {
  for (const p of clubPlayers(G, G.clubId)) {
    if ((p.integ ?? 100) >= 100) continue;
    const m = p.integMentor ? getPlayer(G, p.integMentor) : null;
    if (m && m.club === G.clubId) { p.integ = clamp(p.integ + 4 + (m.pers === 'Leader' ? 2 : 0), 0, 100); bondGrow(G, p, m); } else delete p.integMentor;
    if (p.langCourse) { p.integ = clamp(p.integ + 3, 0, 100); FLOW_LABEL = `Cours de langue de ${p.name}`; flow(G, myClub(G), -350, 'staff'); FLOW_LABEL = null; if (p.integ >= 100) delete p.langCourse; }
  }
}
function bondGrow(G, a, b) { G.bonds ||= {}; const k = bondKey(a.id, b.id); G.bonds[k] = clamp(bondVal(G, a.id, b.id) + 1.5, 0, 100); }
// interface réunions : promesses, intégration, vice-capitaine
const __vMeetingsV = vMeetings;
vMeetings = function (el) {
  __vMeetingsV(el);
  const recr = firstTeam(G).filter(p => (p.integ ?? 100) < 100);
  const proms = (G.promises || []).map(pr => ({ pr, p: getPlayer(G, pr.pid) })).filter(x => x.p);
  const coachRows = G.coach ? Object.entries({ accord: 'Accord sportif', confiance: 'Confiance', promesses: 'Respect des promesses', autorite: 'Autorité perçue' }).map(([k, l]) => `<div class="attr"><span>${l}</span>${bar(coachAxes(G.coach)[k], 100)}<b>${Math.round(coachAxes(G.coach)[k])}</b></div>`).join('') : '';
  el.insertAdjacentHTML('afterbegin', `<div class="grid2"><section class="card"><h2>🤝 Intégration des recrues</h2>${recr.length ? `<table class="tbl compact">${recr.map(p => `<tr><td class="nm">${esc(p.name)}<br><small>${esc(langOf(p))} · intégration ${Math.round(p.integ)} %</small></td>
      <td><select data-mt="${p.id}"><option value="">Parrain…</option>${firstTeam(G).filter(x => x !== p && (x.integ ?? 100) >= 100).sort((a, b) => (langOf(b) === langOf(p)) - (langOf(a) === langOf(p)) || influence(G, b) - influence(G, a)).slice(0, 8).map(x => `<option value="${x.id}" ${p.integMentor === x.id ? 'selected' : ''}>${esc(x.name)}${langOf(x) === langOf(p) ? ' (même langue)' : ''}</option>`).join('')}</select></td>
      <td><label class="chk"><input type="checkbox" data-lc="${p.id}" ${p.langCourse ? 'checked' : ''}> Cours de langue (≈ 1 500 €/mois)</label></td></tr>`).join('')}</table>` : '<p class="muted">Toutes les recrues sont intégrées.</p>'}</section>
    <section class="card"><h2>📋 Promesses en cours</h2>${proms.length ? proms.map(({ pr, p }) => `<p>${esc(p.name)} : ${esc(pr.kind || 'temps de jeu')} — échéance ${weekLabel(G, Math.min(pr.until, G.schedule.length - 1))} · ${p.stats.apps > pr.apps ? '<span class="pos">en bonne voie</span>' : '<span class="warn">pas encore tenue</span>'}</p>`).join('') : '<p class="muted">Aucune promesse en cours.</p>'}
      ${G.coach ? `<h3>Relation avec ${esc(G.coach.name)}</h3>${coachRows}` : ''}
      ${G.project?.season === G.season ? `<h3>Projet de la saison</h3><p>${G.project.priorities.map(k => PROJECT[k].label).join(' · ')}</p>` : `<button class="btn" onclick="projectMeeting()">📌 Tenir la réunion de projet</button>`}</section></div>`);
  el.querySelectorAll('[data-mt]').forEach(s => s.onchange = () => { const p = getPlayer(G, +s.dataset.mt); p.integMentor = s.value ? +s.value : null; save(); toast(s.value ? `${getPlayer(G, +s.value).name} parraine ${p.name}.` : 'Parrainage arrêté.'); });
  el.querySelectorAll('[data-lc]').forEach(c => c.onchange = () => { getPlayer(G, +c.dataset.lc).langCourse = c.checked; save(); });
};

// ---------- Prêts détaillés ----------
function loanProfile(G, p, c) {
  const o = playerOvr(p), mates = clubPlayers(G, c.id).filter(x => x.pos === p.pos), better = mates.filter(x => playerOvr(x) > o).length;
  const role = better === 0 ? 'Titulaire envisagé' : better === 1 ? 'Rotation envisagée' : 'Remplaçant probable';
  const coachLvl = clamp(Math.round(c.rep / 20), 1, 5);
  return { role, better, mates: mates.length, level: clubLeague(G, c.id)?.name || '', coachLvl, rep: c.rep };
}
loanModal = function (pid) {
  const p = getPlayer(G, pid);
  if (!windowOpen(G)) return toast('Les prêts se font pendant le mercato.', 'err');
  const clubs = G.clubs.filter(c => c.id !== G.clubId && !c.foreign && clubPlayers(G, c.id).length < 30).map(c => ({ c, f: loanProfile(G, p, c) })).filter(x => x.f.better <= 2).sort((a, b) => a.f.better - b.f.better || b.c.rep - a.c.rep).slice(0, 8);
  modal(`<h2>Prêter ${esc(p.name)}</h2><p class="hint">Le temps de jeu annoncé est une intention : le club emprunteur choisit ses équipes. La progression dépendra des minutes réellement jouées, de la santé et du joueur.</p>
    <div class="form-grid"><label>Salaire pris en charge par l'emprunteur (%) <input id="lnS" type="number" min="0" max="100" step="10" value="60"></label><label class="chk"><input type="checkbox" id="lnR" checked> Clause de rappel au mercato d'hiver</label></div>
    <table class="tbl compact"><thead><tr><th>Club</th><th>Niveau</th><th>Rôle envisagé</th><th>Concurrence au poste</th><th>Encadrement</th><th></th></tr></thead><tbody>
    ${clubs.map(({ c, f }) => `<tr><td class="nm">${crest(c, 20)} ${esc(c.name)}</td><td><small>${esc(f.level)}</small></td><td>${f.role}</td><td>${f.better} meilleur(s) / ${f.mates} au poste</td><td class="stars">${'★'.repeat(f.coachLvl)}</td><td><button class="btn sm primary" data-loan="${c.id}">Proposer</button></td></tr>`).join('') || '<tr><td class="muted">Aucun club adapté.</td></tr>'}</tbody></table>`, 'wide');
  $$('[data-loan]').forEach(b => b.onclick = () => {
    const c = getClub(G, +b.dataset.loan), share = clamp(+$('#lnS').value, 0, 100), f = loanProfile(G, p, c);
    if (share > 70 && c.rep < myClub(G).rep - 10 && rnd() < .5) return toast(`${c.name} refuse de payer ${share} % du salaire.`, 'err');
    p.loan = { from: G.clubId, share: share / 100, inLoan: true, recall: $('#lnR').checked, role: f.role, startMin: p.stats.min || 0, since: G.week, until: G.season };
    p.club = c.id; p.num = null; p.listed = false; p.academy = false;
    assignNumbers(clubPlayers(G, c.id)); removeFromTactics(p.id); logTransfer(G, p, G.clubId, c.id, 0, 'prêt');
    news(G, `🔁 ${p.name} est prêté à ${c.name} (${f.role.toLowerCase()}, ${share} % du salaire pris en charge${p.loan.recall ? ', rappel possible en hiver' : ''}).`, 'transfer');
    save(); closeModal(); toast(`${p.name} prêté à ${c.name}.`); refresh();
  });
};
function recallLoan(pid) {
  const p = getPlayer(G, pid), R = leagueRoundsTotal(G), lr = leagueRoundAt(G), mid = Math.floor(R / 2);
  if (!p?.loan?.recall || p.loan.from !== G.clubId) return toast('Pas de clause de rappel.', 'err');
  if (!(lr >= mid && lr < mid + 4)) return toast('Le rappel n\'est possible que pendant le mercato d\'hiver.', 'err');
  const c = getClub(G, p.club); p.club = G.clubId; delete p.loan; p.num = null; assignNumbers(clubPlayers(G, G.clubId));
  news(G, `↩ ${p.name} est rappelé de son prêt à ${c.name}.`, 'transfer'); save(); closeModal(); refresh();
}
// bilan mensuel regroupé des prêtés
function loansMonthly(G) {
  const mk = typeof curMonthKey === 'function' ? curMonthKey(G) : null; if (mk == null || G.loanMonth === mk) return;
  const prev = G.loanMonth; G.loanMonth = mk; if (prev == null) return;
  const out = G.players.filter(p => p.loan?.from === G.clubId && p.club !== G.clubId);
  if (!out.length) return;
  addDecision(G, { key: 'loans:' + prev, kind: 'info', blocking: false, from: 'Responsable des prêts', icon: '🔁', title: `Bilan mensuel des prêts (${out.length} joueur(s))`,
    html: `<table class="tbl compact"><thead><tr><th>Joueur</th><th>Club</th><th>Rôle annoncé</th><th>Matchs</th><th>Minutes (saison)</th><th>Note moy.</th><th>Moral</th></tr></thead><tbody>${out.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(getClub(G, p.club).name)}</td><td>${esc(p.loan.role || '—')}</td><td>${p.stats.apps}</td><td>${p.stats.min}</td><td>${p.stats.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '—'}</td><td>${Math.round(p.morale)} %</td></tr>`).join('')}</tbody></table><p class="hint">Le temps de jeu reste décidé par le club emprunteur.</p>`, text: '' });
}

// ---------- Branchements ----------
const __gestionWeeklyV = gestionWeekly;
gestionWeekly = function (G, full) {
  __gestionWeeklyV(G, full);
  try { askProject(G); } catch (e) { console.error(e); }
  if (!full) return;
  try { influenceWeekly(G); captainWeekly(G); integrationWeekly(G); loansMonthly(G); } catch (e) { console.error(e); }
};
function askProject(G) {
  if (G.project?.season === G.season || leagueRoundAt(G) > 3) return;
  if (G.__harness) { G.project = { season: G.season, priorities: ['results', 'finance'], at: 'auto' }; return; }
  addDecision(G, { key: 'project:' + G.season, kind: 'project', from: 'Président', icon: '📌', title: `Réunion de projet ${G.season}/${String(G.season + 1).slice(2)}`, text: 'Avant le début de la saison, fixe au maximum trois priorités avec le président et l\'entraîneur.' });
}
const __newGameV = newGame;
newGame = function (...a) { const g = __newGameV(...a); const prev = G; G = g; try { askProject(g); } finally { G = prev; } return g; };
const __endSeasonV = endSeason;
endSeason = function (G) { try { projectReview(G); } catch (e) { console.error(e); } const S = __endSeasonV(G); try { askProject(G); } catch (e) { console.error(e); } return S; };
// identité : un entraîneur engagé contre l'identité du club fait réagir supporters et direction
const __coachNegotiateV = coachNegotiate;
coachNegotiate = function (x, el) {
  const before = G.coach;
  __coachNegotiateV(x, el);
  const ok = $('#nOk'); if (!ok) return;
  const h = ok.onclick;
  ok.onclick = () => {
    h();
    if (G.coach !== before && G.coach?.name === x.name) {
      const id = clubIdentity(G), clash = (id.k === 'formateur' && x.style === 'bloc') || (id.k === 'ambitieux' && x.lvl <= 2) || (id.k === 'populaire' && x.style === 'bloc');
      const match = x.style === id.styleLike || (id.k === 'formateur' && x.style === 'jeunes');
      if (clash) { G.fans = clamp((G.fans ?? 60) - 5, 0, 100); G.board.conf = clamp(G.board.conf - 3, 0, 100); news(G, `📰 Les supporters doutent : le profil de ${x.name} ne correspond pas à l'identité du club (${IDENTITIES[id.k].label.toLowerCase()}).`, 'press'); }
      else if (match) { G.fans = clamp((G.fans ?? 60) + 3, 0, 100); news(G, `📰 L'arrivée de ${x.name} est bien accueillie : son jeu correspond à l'identité du club.`, 'press'); }
      save();
    }
  };
};
// fiche joueur : rappel d'un prêt
const __playerModalV = playerModal;
playerModal = function (pid, tab) {
  __playerModalV(pid, tab);
  const p = getPlayer(G, pid); if (!p?.loan || p.loan.from !== G.clubId || p.club === G.clubId) return;
  const row = $('#modal .row.gap.wrap.mt'); if (row) row.insertAdjacentHTML('afterbegin', `<span class="muted">Prêté (${esc(p.loan.role || '')}, ${Math.round((p.loan.share ?? 0) * 100)} % du salaire payé par l'emprunteur) · ${p.stats.min} min cette saison</span>${p.loan.recall ? `<button class="btn" onclick="recallLoan(${p.id})">↩ Rappeler</button>` : ''}`);
};
// identité : affichée dans la Direction
const __vBoardV = vBoard;
vBoard = function (el) { __vBoardV(el); const id = clubIdentity(G); el.insertAdjacentHTML('afterbegin', `<section class="card"><h2>🏛 Identité du club : ${IDENTITIES[id.k].label}</h2><p>${esc(IDENTITIES[id.k].tip)} <small class="muted">(trait de jeu simulé, non sourcé)</small></p>${G.project?.season === G.season ? `<p>Projet : <b>${G.project.priorities.map(k => PROJECT[k].label).join(' · ')}</b></p>` : ''}</section>`); };
