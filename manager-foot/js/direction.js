// Décisions de direction : état conservé dans chaque sauvegarde.
// Les effets différés sont résolus après la simulation de la semaine suivante.
const DIR_TASKS = {
  scout: { icon: '🔎', label: 'Rapport de recrutement', owner: 'Recruteur', detail: 'Repère un joueur intéressant et révèle son profil.' },
  medical: { icon: '✚', label: 'Suivi des blessés', owner: 'Kiné', detail: 'Améliore la condition des joueurs convalescents.' },
  youth: { icon: '◈', label: 'Suivi des jeunes', owner: 'Formateur', detail: 'Travaille avec les joueurs de 21 ans ou moins.' },
  training: { icon: '◉', label: 'Préparation du groupe', owner: 'Adjoint', detail: 'Remobilise le vestiaire avant la prochaine semaine.' },
  media: { icon: '◌', label: 'Veille médiatique', owner: 'Adjoint', detail: 'Prépare une prise de parole qui rassure les supporters.' }
};
const DIR_PLANS = {
  youth: { icon: '◇', label: 'Faire grandir les jeunes', cost: 100000, detail: 'Mentorat pendant quatre semaines. Un jeune ayant joué au moins 90 minutes progresse d’un point d’attribut à la fin du cycle.' },
  recovery: { icon: '✚', label: 'Préserver les titulaires', cost: 80000, detail: 'Suivi physique pendant quatre semaines : les six joueurs disponibles les moins en forme récupèrent 4 points par semaine.' },
  community: { icon: '◌', label: 'Rapprocher le club des supporters', cost: 50000, detail: 'Quatre semaines d’actions publiques : +2 de soutien des supporters par semaine et +1 de confiance du président au bilan.' }
};
function dirState(g = G) { return g.direction ||= { tasks: [], actions: [], comparison: [], matchActions: {} }; }
function dirSquad(g = G) { return clubPlayers(g, g.clubId).filter(p => !p.academy && (!p.loan || p.loan.inLoan)); }
function dirStartPlan(kind) {
  const plan = DIR_PLANS[kind], d = dirState();
  if (!plan || !G.schedule[G.week] || d.plan?.status === 'active') return;
  if ((myClub(G).budget || 0) < plan.cost) return toast('Budget insuffisant pour ce plan.', 'err');
  flow(G, myClub(G), -plan.cost, 'staff');
  d.plan = { kind, status: 'active', season: G.season, weeks: 0,
    minutes: kind === 'youth' ? Object.fromEntries(dirSquad().filter(p => p.age <= 21).map(p => [p.id, p.stats?.min || 0])) : {} };
  dirLog('Plan sportif lancé', `${plan.label} · quatre semaines · ${money(plan.cost)} engagés.`);
  show('direction');
}
function dirResolvePlan(g) {
  const d = dirState(g), p = d.plan;
  if (!p || p.status !== 'active') return;
  // Une saison peut se terminer avant les quatre semaines : le plan est clos au premier bilan.
  if (p.season !== g.season) p.weeks = 4;
  else {
    p.weeks++;
    if (p.kind === 'recovery') {
      const targets = dirSquad(g).filter(x => !x.injury && x.fit < 100).sort((a, b) => a.fit - b.fit).slice(0, 6);
      targets.forEach(x => x.fit = clamp(x.fit + 4, 0, 100));
      p.beneficiaries = (p.beneficiaries || 0) + targets.length;
    } else if (p.kind === 'community') g.fans = clamp((g.fans ?? 60) + 2, 0, 100);
  }
  if (p.weeks < 4) return;
  let result;
  if (p.kind === 'youth') {
    const eligible = dirSquad(g).filter(x => x.age <= 21 && (x.stats?.min || 0) - (p.minutes?.[x.id] ?? x.stats?.min ?? 0) >= 90 && playerOvr(x) < x.pot && Object.keys(ROLES[x.pos]?.w || {}).some(k => x.attrs?.[k] < 20));
    const chosen = eligible.sort((a, b) => ((b.stats?.min || 0) - (p.minutes?.[b.id] || 0)) - ((a.stats?.min || 0) - (p.minutes?.[a.id] || 0)))[0];
    if (chosen) { const keys = Object.keys(ROLES[chosen.pos].w).filter(k => chosen.attrs?.[k] < 20); bumpAttr(chosen, 1, keys); result = `${chosen.name} a progressé d’un point d’attribut après avoir joué au moins 90 minutes.`; }
    else result = 'Aucun jeune éligible n’a joué 90 minutes et conservé une marge de progression : le mentorat ne produit pas de gain supplémentaire.';
  } else if (p.kind === 'recovery') result = `${p.beneficiaries || 0} séances de récupération individuelles réalisées.`;
  else { g.board.conf = clamp(g.board.conf + 1, 0, 100); result = 'La campagne se termine : soutien des supporters renforcé et confiance du président +1.'; }
  p.status = 'done'; p.result = result;
  d.actions.unshift({ season: g.season, week: g.week, label: `Bilan : ${DIR_PLANS[p.kind].label}`, detail: result });
  d.actions = d.actions.slice(0, 35);
  news(g, `Plan sportif terminé : ${result}`, 'info');
}
function dirBriefing(g = G) {
  const next = myNextFixture(), f = next?.f, opp = f ? getClub(g, f.h === g.clubId ? f.a : f.h) : null;
  const squad = dirSquad(g), unavailable = squad.filter(p => p.injury > 0 || p.susp > 0).length;
  const tired = squad.filter(p => !p.injury && !p.susp && p.fit < 75).length;
  const pending = dirState(g).tasks.filter(t => t.status === 'pending').length;
  const average = players => { const top = players.map(playerOvr).filter(Number.isFinite).sort((a, b) => b - a).slice(0, 11); return top.length >= 7 ? top.reduce((a, b) => a + b, 0) / top.length : null; };
  const ourLevel = opp ? average(squad) : null, theirLevel = opp ? average(clubPlayers(g, opp.id)) : null;
  const advice = !opp ? 'Profite de cette semaine pour préparer le groupe et suivre les missions confiées.'
    : tired >= 3 ? 'Plusieurs joueurs sont fatigués : prévois de la rotation ou une séance de repos avant le match.'
    : unavailable >= 3 ? 'L’effectif est diminué : vérifie le onze et les solutions de remplacement.'
    : ourLevel != null && theirLevel != null && theirLevel > ourLevel + 4 ? 'Adversaire supérieur sur le papier : prépare un plan de match prudent et tes transitions.'
    : ourLevel != null && theirLevel != null && ourLevel > theirLevel + 4 ? 'Ton effectif semble supérieur : prépare un jeu ambitieux, sans négliger les remplacements.'
    : 'La rencontre s’annonce équilibrée : ajuste ton onze et tes consignes selon les disponibilités.';
  return { title: opp ? `${opp.name} · ${weekLabel(g, next.w)}` : next?.cupTbd ? 'Adversaire à déterminer' : 'Aucun match programmé', unavailable, tired, pending, advice };
}
function dirLatestFixture(g = G) {
  for (let w = Math.min(g.week - 1, g.schedule.length - 1); w >= 0; w--) {
    const f = weekFixtures(g, w).find(x => (x.h === g.clubId || x.a === g.clubId) && x.res);
    if (f) return { f, w, key: `${g.season}:${w}:${fxKey(f)}` };
  }
  return null;
}
function dirLog(label, detail, key = null) {
  const d = dirState();
  d.actions.unshift({ key, season: G.season, week: G.week, label, detail });
  d.actions = d.actions.slice(0, 35);
  news(G, `${label} — ${detail}`, 'info');
  save();
}
function dirAssign(kind, options = {}) {
  if (!DIR_TASKS[kind]) return;
  const d = dirState(), t = DIR_TASKS[kind];
  if (d.tasks.some(x => x.kind === kind && x.status === 'pending')) return toast('Cette mission est déjà confiée.', 'err');
  const criteria = kind === 'scout' ? { pos: Object.hasOwn(ROLES, options.pos) ? options.pos : '', maxAge: [21, 25, 28].includes(+options.maxAge) ? +options.maxAge : 28 } : {};
  d.tasks.unshift({ id: `${G.season}:${G.week}:${kind}`, kind, status: 'pending', due: G.week + 1, season: G.season, criteria });
  dirLog('Mission confiée', `${t.owner} : ${t.label.toLowerCase()}${kind === 'scout' ? ` (${criteria.pos || 'tous postes'}, ${criteria.maxAge} ans maximum)` : ''}. Résultat la semaine prochaine.`);
  show('direction');
}
function dirResolve(g) {
  const d = dirState(g);
  for (const task of d.tasks.filter(x => x.status === 'pending' && (x.season < g.season || x.season === g.season && x.due <= g.week))) {
    const sq = dirSquad(g), kind = task.kind;
    let result = '';
    if (kind === 'scout') {
      const pos = task.criteria?.pos, maxAge = task.criteria?.maxAge || 28;
      const pool = g.players.filter(p => p.club !== g.clubId && !knows(g, p) && p.age <= maxAge && (!pos || p.pos === pos) && playerOvr(p) >= 55);
      const p = pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
      if (p) { (g.known ||= []).push(p.id); if (!g.shortlist.includes(p.id)) g.shortlist.push(p.id); result = `${p.name} (${p.pos}) a été ajouté au suivi avec un rapport complet.`; }
      else result = `Aucun nouveau profil ${pos || 'tous postes'} de ${maxAge} ans maximum répondant aux critères cette semaine.`;
    } else if (kind === 'medical') {
      const targets = sq.filter(p => p.injury > 0 || p.fit < 85).slice(0, 6);
      targets.forEach(p => { if (p.injury > 0) p.injury = Math.max(0, p.injury - 1); else p.fit = clamp(p.fit + 5, 0, 100); });
      result = targets.length ? `${targets.length} joueur(s) ont bénéficié du suivi médical.` : 'Aucun joueur nécessitant un suivi particulier.';
    } else if (kind === 'youth') {
      const young = sq.filter(p => p.age <= 21).slice(0, 8);
      young.forEach(p => p.morale = clamp(p.morale + 4, 5, 100));
      result = `${young.length} jeune(s) accompagné(s) ; leur moral progresse.`;
    } else if (kind === 'training') {
      sq.forEach(p => p.morale = clamp(p.morale + 2, 5, 100));
      myClub(g).coh = clamp((myClub(g).coh ?? 60) + 2, 0, 100);
      result = 'Le groupe a travaillé ensemble : cohésion et moral en hausse.';
    } else if (kind === 'media') {
      g.fans = clamp((g.fans ?? 60) + 3, 0, 100);
      result = 'La communication du club a rassuré les supporters.';
    }
    task.status = 'done'; task.result = result;
    d.actions.unshift({ season: g.season, week: g.week, label: `Rapport : ${DIR_TASKS[kind].label}`, detail: result });
    news(g, `Mission terminée : ${result}`, 'info');
  }
  dirResolvePlan(g);
  d.tasks = d.tasks.slice(0, 30); d.actions = d.actions.slice(0, 35);
}
const dirCompleteWeek = completeWeek;
completeWeek = function (g, skipFixture) { const result = dirCompleteWeek(g, skipFixture); dirResolve(g); return result; };

function dirPlayerAction(kind, pid) {
  const p = getPlayer(G, pid);
  if (!p || p.club !== G.clubId || !['pressure', 'protect', 'praise'].includes(kind)) return;
  const d = dirState(), key = `player:${pid}:${G.season}:${G.week}`;
  if (d.actions.some(x => x.key === key)) return toast('Une intervention par joueur et par semaine.', 'err');
  const effective = kind === 'pressure' ? (p.morale >= 55 && (p.trust ?? 55) >= 45) : true;
  const delta = kind === 'pressure' ? (effective ? 5 : -11) : kind === 'protect' ? 5 : 7;
  p.morale = clamp(p.morale + delta, 5, 100);
  p.trust = clamp((p.trust ?? 55) + (kind === 'pressure' ? (effective ? -2 : -9) : 4), 0, 100);
  if (kind === 'pressure' && !effective) groupEcho(p, -2);
  const label = { pressure: 'Coup de pression', protect: 'Soutien public', praise: 'Félicitations' }[kind];
  const detail = `${p.name} : ${effective ? 'le message est bien reçu' : 'la pression a eu l’effet inverse'} (moral ${delta > 0 ? '+' : ''}${delta}).`;
  d.actions.unshift({ key, season: G.season, week: G.week, label, detail });
  news(G, `${label} : ${detail}`, kind === 'pressure' && !effective ? 'warn' : 'press'); save();
  closeModal(); show('direction');
}
function dirCoachAction(kind) {
  if (!isDS() || !G.coach) return;
  const d = dirState(), key = `coach:${G.season}:${G.week}`;
  if (d.actions.some(x => x.key === key)) return toast('Tu as déjà rencontré ton entraîneur cette semaine.', 'err');
  const c = G.coach, hard = kind === 'pressure';
  c.relation = clamp(c.relation + (hard ? -8 : 6), 0, 100);
  c.respect = clamp((c.respect ?? 60) + (hard ? 2 : 3), 0, 100);
  dirLog(hard ? 'Entretien exigeant' : 'Soutien à l’entraîneur', `${c.name} : relation ${hard ? '-8' : '+6'}, respect du vestiaire ${hard ? '+2' : '+3'}.`, key);
  show('direction');
}
function dirMatchAction(kind) {
  const m = dirLatestFixture(); if (!m || G.week - m.w > 2) return toast('Aucun match récent à traiter.', 'err');
  const d = dirState(), used = d.matchActions[m.key] ||= [];
  if (used.includes(kind)) return toast('Cette action a déjà été faite pour ce match.', 'err');
  const sq = dirSquad(), home = m.f.h === G.clubId, ours = m.f.res[home ? 0 : 1], theirs = m.f.res[home ? 1 : 0];
  let detail = '';
  if (kind === 'dressing') {
    const delta = ours > theirs ? 4 : ours === theirs ? 2 : -3;
    sq.forEach(p => p.morale = clamp(p.morale + delta, 5, 100));
    myClub(G).coh = clamp((myClub(G).coh ?? 60) + (delta > 0 ? 2 : -1), 0, 100);
    detail = `Discours d’après-match : moral ${delta > 0 ? '+' : ''}${delta} pour le groupe.`;
  } else if (kind === 'press') {
    const delta = ours >= theirs ? 3 : -2;
    G.fans = clamp((G.fans ?? 60) + delta, 0, 100);
    G.board.conf = clamp(G.board.conf + (delta > 0 ? 1 : -1), 0, 100);
    detail = `Déclaration à la presse : supporters ${delta > 0 ? '+' : ''}${delta}.`;
  } else if (kind === 'commission') {
    const red = (m.f.events || []).find(e => e.t === 'red' && e.s === (home ? 0 : 1));
    if (!red) return toast('Aucun carton rouge de ton équipe à contester.', 'err');
    const p = getPlayer(G, red.p);
    if (!p) return toast('Joueur introuvable.', 'err');
    const won = rnd() < .35;
    if (won) p.susp = Math.max(0, p.susp - 1);
    detail = won ? `Commission : appel accepté, suspension de ${p.name} réduite d’un match.` : `Commission : appel rejeté, suspension de ${p.name} maintenue.`;
  } else return;
  used.push(kind); dirLog({ dressing: 'Vestiaire', press: 'Sortie dans la presse', commission: 'Commission de ligue' }[kind], detail);
  show('direction');
}
function vDirection(el) {
  const d = dirState(), m = dirLatestFixture(), recent = m && G.week - m.w <= 2;
  const brief = dirBriefing(), activePlan = d.plan?.status === 'active' ? d.plan : null;
  const used = recent ? d.matchActions[m.key] || [] : [];
  const red = recent && (m.f.events || []).some(e => e.t === 'red' && e.s === (m.f.h === G.clubId ? 0 : 1));
  const recentResult = recent ? `${esc(getClub(G, m.f.h).short)} ${m.f.res.join('–')} ${esc(getClub(G, m.f.a).short)}` : 'Aucun match récent';
  el.innerHTML = `<div class="dir-heading"><div><small>LE BUREAU DU DIRECTEUR</small><h1>Décisions & délégation</h1><p>Agis auprès du groupe et confie des missions. Chaque décision laisse une trace dans la partie.</p></div><div class="dir-week">${esc(weekLabel(G))}<small>Saison ${G.season}/${G.season + 1}</small></div></div>
    <section class="dir-brief" aria-label="Situation du club"><div><small>PROCHAIN RENDEZ-VOUS</small><strong>${esc(brief.title)}</strong></div><div><small>INDISPONIBLES</small><strong>${brief.unavailable}</strong></div><div><small>À MÉNAGER</small><strong>${brief.tired}</strong></div><div><small>MISSIONS EN COURS</small><strong>${brief.pending}</strong></div><div class="dir-brief-advice"><p>${esc(brief.advice)}</p><button class="btn" data-brief="tactics">Préparer le onze</button><button class="btn" data-brief="training">Adapter l’entraînement</button></div></section>
    <div class="dir-grid"><section class="card dir-card dir-wide"><div class="dir-card-head"><span class="dir-icon">▤</span><div><h2>Plan sportif · quatre semaines</h2><p>Choisis une priorité, finance-la et suis ses effets après chaque semaine simulée.</p></div></div>${activePlan ? `<div class="dir-plan-progress"><strong>${esc(DIR_PLANS[activePlan.kind].label)}</strong><span>${activePlan.weeks}/4 semaines</span><div role="progressbar" aria-label="Progression du plan sportif" aria-valuenow="${activePlan.weeks}" aria-valuemin="0" aria-valuemax="4"><i style="width:${activePlan.weeks * 25}%"></i></div></div>` : d.plan?.status === 'done' ? `<p class="dir-plan-result"><b>Dernier bilan :</b> ${esc(d.plan.result)}</p>` : ''}<div class="dir-plan-grid">${Object.entries(DIR_PLANS).map(([k, p]) => `<div class="dir-plan"><span class="dir-task-icon">${p.icon}</span><strong>${p.label}</strong><small>${p.detail}</small><div class="dir-plan-foot"><span>${money(p.cost)}</span><button class="btn ${!activePlan ? 'primary' : ''}" data-plan="${k}" ${activePlan || !G.schedule[G.week] || (myClub(G).budget || 0) < p.cost ? 'disabled' : ''}>${activePlan?.kind === k ? 'Plan en cours' : 'Choisir ce plan'}</button></div></div>`).join('')}</div></section><section class="card dir-card dir-wide"><div class="dir-card-head"><span class="dir-icon">◇</span><div><h2>Missions à déléguer</h2><p>Le staff revient avec son rapport après la prochaine semaine simulée.</p></div></div><div class="dir-task-grid">${Object.entries(DIR_TASKS).map(([k, t]) => { const pendingTask = d.tasks.find(x => x.kind === k && x.status === 'pending'), pending = !!pendingTask; return `<div class="dir-task"><span class="dir-task-icon">${t.icon}</span><strong>${t.label}</strong><small>${t.owner} · ${t.detail}</small>${k === 'scout' ? `<div class="dir-scout-criteria"><label>Poste <select data-scout-pos aria-label="Poste recherché" ${pending ? 'disabled' : ''}><option value="" ${!pendingTask?.criteria?.pos ? 'selected' : ''}>Tous</option>${Object.keys(ROLES).map(pos => `<option value="${pos}" ${pendingTask?.criteria?.pos === pos ? 'selected' : ''}>${pos} · ${esc(ROLES[pos].label)}</option>`).join('')}</select></label><label>Âge maximum <select data-scout-age aria-label="Âge maximum" ${pending ? 'disabled' : ''}><option value="21" ${pendingTask?.criteria?.maxAge === 21 ? 'selected' : ''}>21 ans</option><option value="25" ${pendingTask?.criteria?.maxAge === 25 ? 'selected' : ''}>25 ans</option><option value="28" ${!pendingTask || pendingTask.criteria?.maxAge === 28 ? 'selected' : ''}>28 ans</option></select></label></div>` : ''}<button class="btn ${pending ? '' : 'primary'}" data-assign="${k}" ${pending ? 'disabled' : ''}>${pending ? 'Mission en cours' : 'Confier la mission'}</button></div>`; }).join('')}</div></section>
    <section class="card dir-card"><div class="dir-card-head"><span class="dir-icon">◈</span><div><h2>Jour de match</h2><p>${recentResult}</p></div></div><div class="dir-actions"><button class="btn" data-match="dressing" ${!recent || used.includes('dressing') ? 'disabled' : ''}>Entrer dans le vestiaire</button><button class="btn" data-match="press" ${!recent || used.includes('press') ? 'disabled' : ''}>Parler à la presse</button><button class="btn" data-match="commission" ${!red || used.includes('commission') ? 'disabled' : ''}>Aller en commission de ligue</button></div><p class="hint">${!red ? 'La commission est accessible si un de tes joueurs a été expulsé lors du dernier match.' : 'L’appel peut réduire la suspension d’un match.'}</p></section>
    <section class="card dir-card"><div class="dir-card-head"><span class="dir-icon">◎</span><div><h2>Interventions</h2><p>La réaction varie selon la situation et la confiance.</p></div></div>${isDS() && G.coach ? `<div class="dir-actions"><button class="btn" data-coach="support">Soutenir ${esc(G.coach.name)}</button><button class="btn" data-coach="pressure">Mettre l’entraîneur sous pression</button></div>` : ''}<button class="btn" id="dirPlayer">Agir auprès d’un joueur</button><p class="hint">Un entretien par joueur et par semaine. Depuis une fiche joueur, choisis félicitations, soutien public ou coup de pression.</p></section>
    <section class="card dir-card dir-wide"><div class="dir-card-head"><span class="dir-icon">☷</span><div><h2>Journal des décisions</h2><p>Missions et conséquences les plus récentes.</p></div></div><div class="dir-log">${d.actions.slice(0, 12).map(a => `<div><small>S${a.season} · semaine ${a.week + 1}</small><strong>${esc(a.label)}</strong><span>${esc(a.detail)}</span></div>`).join('') || '<p class="muted">Aucune décision pour le moment.</p>'}</div></section></div>`;
  el.querySelectorAll('[data-assign]').forEach(b => b.onclick = () => { const card = b.closest('.dir-task'); dirAssign(b.dataset.assign, { pos: card.querySelector('[data-scout-pos]')?.value, maxAge: card.querySelector('[data-scout-age]')?.value }); });
  el.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => dirStartPlan(b.dataset.plan));
  el.querySelectorAll('[data-brief]').forEach(b => b.onclick = () => show(b.dataset.brief));
  el.querySelectorAll('[data-match]').forEach(b => b.onclick = () => dirMatchAction(b.dataset.match));
  el.querySelectorAll('[data-coach]').forEach(b => b.onclick = () => dirCoachAction(b.dataset.coach));
  $('#dirPlayer').onclick = () => { show('squad'); toast('Ouvre la fiche du joueur pour choisir une intervention.'); };
}

function dirCompareAdd(pid) {
  const p = getPlayer(G, pid), d = dirState(); if (!p) return;
  if (d.comparison.includes(pid)) d.comparison = d.comparison.filter(id => id !== pid);
  else if (d.comparison.length < 4) d.comparison.push(pid);
  else return toast('Quatre joueurs maximum.', 'err');
  save(); closeModal(); show('compare');
}
function vCompare(el) {
  const d = dirState(), ps = d.comparison.map(id => getPlayer(G, id)).filter(Boolean);
  const known = p => knows(G, p);
  const value = (p, fn) => known(p) ? fn(p) : null;
  const fields = [
    { section: 'Profil' },
    ['Poste', p => p.pos], ['Âge', p => p.ageKnown === false ? '?' : p.age],
    ['Club', p => p.club == null ? 'Libre' : getClub(G, p.club)?.short || '—'],
    ['Note globale', p => known(p) ? Math.round(playerOvr(p)) : `~${estOvr(G, p)}`, p => value(p, playerOvr), 100],
    ['Potentiel', p => known(p) ? p.pot : '?', p => value(p, x => x.pot), 100],
    ['Valeur', p => money(p.value)], ['Salaire', p => known(p) ? wageM(p.wage) : '?'],
    ['Moral', p => p.club === G.clubId ? `${Math.round(p.morale)} / 100` : '—'],
    { section: 'Saison' },
    ['Matchs', p => p.stats?.apps ?? 0], ['Buts', p => p.stats?.goals ?? 0],
    ['Passes décisives', p => p.stats?.assists ?? 0],
    ['Note moyenne', p => p.stats?.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '—'],
    { section: 'Attributs / 20' },
    ...Object.entries(ATTRS).map(([k, label]) => [label, p => known(p) ? p.attrs?.[k] ?? '—' : '?', p => value(p, x => x.attrs?.[k]), 20])
  ];
  const top = p => known(p) ? Object.entries(ATTRS).filter(([k]) => Number.isFinite(p.attrs?.[k])).sort((a, b) => p.attrs[b[0]] - p.attrs[a[0]]).slice(0, 3) : [];
  const row = f => {
    if (f.section) return `<tr class="dir-section"><th colspan="${ps.length + 1}" scope="colgroup">${esc(f.section)}</th></tr>`;
    const [label, display, metric, max] = f;
    const values = metric ? ps.map(metric).filter(Number.isFinite) : [];
    const best = values.length > 1 ? Math.max(...values) : null;
    return `<tr><th scope="row">${esc(label)}</th>${ps.map(p => {
      const n = metric?.(p), highlight = best != null && n === best;
      const fill = Number.isFinite(n) && max ? `<span class="dir-metric-track" aria-hidden="true"><i style="width:${clamp(n / max * 100, 0, 100)}%"></i></span>` : '';
      return `<td class="${highlight ? 'dir-best' : ''}"><span class="dir-metric-value">${esc(display(p))}${highlight ? '<span class="dir-best-mark" aria-label="Meilleur du groupe">↑</span>' : ''}</span>${fill}</td>`;
    }).join('')}</tr>`;
  };
  el.innerHTML = `<div class="dir-heading"><div><small>CELLULE DE RECRUTEMENT</small><h1>Comparer les joueurs</h1><p>Jusqu’à quatre profils côte à côte. Les notes non supervisées restent masquées ; une note précédée de ~ est une estimation.</p></div><button class="btn" id="cmpBack">Voir l’effectif</button></div><section class="card"><label class="dir-search-label" for="cmpSearch">Ajouter un joueur <small>(${ps.length}/4)</small></label><div class="dir-search-row"><input id="cmpSearch" type="search" placeholder="Nom, club ou poste…" autocomplete="off" ${ps.length >= 4 ? 'disabled' : ''}><select id="cmpScope" aria-label="Périmètre de recherche" ${ps.length >= 4 ? 'disabled' : ''}><option value="all">Tous les joueurs</option><option value="squad">Mon effectif</option><option value="known">Joueurs supervisés</option></select></div><div id="cmpResults" class="dir-results" role="status" aria-live="polite"></div><div class="dir-selected">${ps.map(p => `<span>${avatar(p, 26)} ${esc(p.name)} <button data-remove="${p.id}" aria-label="Retirer ${esc(p.name)}">×</button></span>`).join('') || '<small>Sélectionne deux à quatre joueurs pour comparer leurs profils.</small>'}</div></section>
    ${ps.length ? `<section class="dir-compare-cards" aria-label="Profils sélectionnés">${ps.map(p => `<article class="card dir-compare-card"><div class="dir-compare-person">${avatar(p, 48)}<div><strong>${esc(p.name)}</strong><small>${esc(p.pos)} · ${esc(p.club == null ? 'Libre' : getClub(G, p.club)?.name || '—')}</small></div></div><div class="dir-compare-rating"><b>${known(p) ? Math.round(playerOvr(p)) : `~${estOvr(G, p)}`}</b><span>Note globale<br><small>${known(p) ? 'Rapport disponible' : 'Estimation · à superviser'}</small></span></div><div class="dir-strengths">${top(p).length ? top(p).map(([k, label]) => `<span>${esc(label)} <b>${p.attrs[k]}</b></span>`).join('') : '<span>Attributs à découvrir</span>'}</div></article>`).join('')}</section><section class="card dir-compare-scroll"><h2>Détail des profils</h2><p class="hint">La flèche signale la meilleure valeur connue parmi les joueurs sélectionnés. Les barres reflètent la note sur 20 ou 100.</p><table class="tbl dir-compare"><thead><tr><th>Critère</th>${ps.map(p => `<th>${avatar(p, 40)}<strong>${esc(p.name)}</strong><small>${esc(p.pos)} · ${p.ageKnown === false ? 'âge inconnu' : `${p.age} ans`}</small></th>`).join('')}</tr></thead><tbody>${fields.map(row).join('')}</tbody></table></section>` : ''}`;
  $('#cmpBack').onclick = () => show('squad');
  el.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => dirCompareAdd(+b.dataset.remove));
  const search = () => {
    const q = $('#cmpSearch').value.trim().toLocaleLowerCase('fr'), scope = $('#cmpScope').value;
    const list = q.length < 2 ? [] : G.players.filter(p => !d.comparison.includes(p.id) && (scope === 'all' || scope === 'squad' && p.club === G.clubId || scope === 'known' && known(p)) && `${p.name} ${p.pos} ${p.club == null ? '' : getClub(G, p.club)?.name || ''}`.toLocaleLowerCase('fr').includes(q)).slice(0, 12);
    const box = $('#cmpResults'); box.innerHTML = list.map(p => `<button data-add="${p.id}">${avatar(p, 26)} <span>${esc(p.name)} <small>${esc(p.pos)} · ${esc(p.club == null ? 'Libre' : getClub(G, p.club)?.short || '')}</small></span><b>Ajouter +</b></button>`).join('') || (q.length >= 2 ? '<p class="hint">Aucun joueur trouvé avec ce filtre.</p>' : '');
    box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => dirCompareAdd(+b.dataset.add));
  };
  $('#cmpSearch').oninput = search;
  $('#cmpScope').onchange = search;
}
const dirShow = show;
show = function (view) {
  if (view !== 'direction' && view !== 'compare') return dirShow(view);
  if (!G || LIVE) return;
  if (VIEW && VIEW !== view && VIEW !== 'x') VIEW_HIST.push(VIEW);
  VIEW = view;
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
  renderTop(); const main = $('#main'); main.innerHTML = '';
  (view === 'direction' ? vDirection : vCompare)(main); main.scrollTop = 0; navBadges();
};
const dirPlayerModal = playerModal;
playerModal = function (pid, tab) {
  dirPlayerModal(pid, tab);
  const p = getPlayer(G, pid), row = $('#modal .row.gap.wrap.mt'); if (!p || !row) return;
  const b = document.createElement('button'); b.className = 'btn'; b.textContent = dirState().comparison.includes(pid) ? '⇄ Retirer de la comparaison' : '⇄ Comparer';
  b.onclick = () => dirCompareAdd(pid); row.prepend(b);
  if (p.club === G.clubId) {
    for (const [kind, label] of [['pressure', 'Coup de pression'], ['protect', 'Soutien public'], ['praise', 'Féliciter']]) {
      const a = document.createElement('button'); a.className = 'btn'; a.textContent = label;
      a.onclick = () => dirPlayerAction(kind, pid); row.prepend(a);
    }
  }
};
