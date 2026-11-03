// Décisions de direction : état conservé dans chaque sauvegarde.
// Les effets différés sont résolus après la simulation de la semaine suivante.
const DIR_TASKS = {
  scout: { icon: '🔎', label: 'Rapport de recrutement', owner: 'Recruteur', detail: 'Repère un joueur intéressant et révèle son profil.' },
  medical: { icon: '✚', label: 'Suivi des blessés', owner: 'Kiné', detail: 'Améliore la condition des joueurs convalescents.' },
  youth: { icon: '◈', label: 'Suivi des jeunes', owner: 'Formateur', detail: 'Travaille avec les joueurs de 21 ans ou moins.' },
  training: { icon: '◉', label: 'Préparation du groupe', owner: 'Adjoint', detail: 'Remobilise le vestiaire avant la prochaine semaine.' },
  media: { icon: '◌', label: 'Veille médiatique', owner: 'Adjoint', detail: 'Prépare une prise de parole qui rassure les supporters.' }
};
function dirState(g = G) { return g.direction ||= { tasks: [], actions: [], comparison: [], matchActions: {} }; }
function dirSquad(g = G) { return clubPlayers(g, g.clubId).filter(p => !p.academy && (!p.loan || p.loan.inLoan)); }
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
function dirAssign(kind) {
  if (!DIR_TASKS[kind]) return;
  const d = dirState(), t = DIR_TASKS[kind];
  if (d.tasks.some(x => x.kind === kind && x.status === 'pending')) return toast('Cette mission est déjà confiée.', 'err');
  d.tasks.unshift({ id: `${G.season}:${G.week}:${kind}`, kind, status: 'pending', due: G.week + 1, season: G.season });
  dirLog('Mission confiée', `${t.owner} : ${t.label.toLowerCase()}. Résultat la semaine prochaine.`);
  show('direction');
}
function dirResolve(g) {
  const d = dirState(g);
  for (const task of d.tasks.filter(x => x.status === 'pending' && (x.season < g.season || x.season === g.season && x.due <= g.week))) {
    const sq = dirSquad(g), kind = task.kind;
    let result = '';
    if (kind === 'scout') {
      const pool = g.players.filter(p => p.club !== g.clubId && !knows(g, p) && p.age <= 28 && playerOvr(p) >= 55);
      const p = pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
      if (p) { (g.known ||= []).push(p.id); if (!g.shortlist.includes(p.id)) g.shortlist.push(p.id); result = `${p.name} (${p.pos}) a été ajouté au suivi avec un rapport complet.`; }
      else result = 'Aucun nouveau profil répondant aux critères cette semaine.';
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
  const used = recent ? d.matchActions[m.key] || [] : [];
  const red = recent && (m.f.events || []).some(e => e.t === 'red' && e.s === (m.f.h === G.clubId ? 0 : 1));
  const recentResult = recent ? `${esc(getClub(G, m.f.h).short)} ${m.f.res.join('–')} ${esc(getClub(G, m.f.a).short)}` : 'Aucun match récent';
  el.innerHTML = `<div class="dir-heading"><div><small>LE BUREAU DU DIRECTEUR</small><h1>Décisions & délégation</h1><p>Agis auprès du groupe et confie des missions. Chaque décision laisse une trace dans la partie.</p></div><div class="dir-week">${esc(weekLabel(G))}<small>Saison ${G.season}/${G.season + 1}</small></div></div>
    <div class="dir-grid"><section class="card dir-card dir-wide"><div class="dir-card-head"><span class="dir-icon">◇</span><div><h2>Missions à déléguer</h2><p>Le staff revient avec son rapport après la prochaine semaine simulée.</p></div></div><div class="dir-task-grid">${Object.entries(DIR_TASKS).map(([k, t]) => { const pending = d.tasks.some(x => x.kind === k && x.status === 'pending'); return `<div class="dir-task"><span class="dir-task-icon">${t.icon}</span><strong>${t.label}</strong><small>${t.owner} · ${t.detail}</small><button class="btn ${pending ? '' : 'primary'}" data-assign="${k}" ${pending ? 'disabled' : ''}>${pending ? 'Mission en cours' : 'Confier la mission'}</button></div>`; }).join('')}</div></section>
    <section class="card dir-card"><div class="dir-card-head"><span class="dir-icon">◈</span><div><h2>Jour de match</h2><p>${recentResult}</p></div></div><div class="dir-actions"><button class="btn" data-match="dressing" ${!recent || used.includes('dressing') ? 'disabled' : ''}>Entrer dans le vestiaire</button><button class="btn" data-match="press" ${!recent || used.includes('press') ? 'disabled' : ''}>Parler à la presse</button><button class="btn" data-match="commission" ${!red || used.includes('commission') ? 'disabled' : ''}>Aller en commission de ligue</button></div><p class="hint">${!red ? 'La commission est accessible si un de tes joueurs a été expulsé lors du dernier match.' : 'L’appel peut réduire la suspension d’un match.'}</p></section>
    <section class="card dir-card"><div class="dir-card-head"><span class="dir-icon">◎</span><div><h2>Interventions</h2><p>La réaction varie selon la situation et la confiance.</p></div></div>${isDS() && G.coach ? `<div class="dir-actions"><button class="btn" data-coach="support">Soutenir ${esc(G.coach.name)}</button><button class="btn" data-coach="pressure">Mettre l’entraîneur sous pression</button></div>` : ''}<button class="btn" id="dirPlayer">Agir auprès d’un joueur</button><p class="hint">Un entretien par joueur et par semaine. Depuis une fiche joueur, choisis félicitations, soutien public ou coup de pression.</p></section>
    <section class="card dir-card dir-wide"><div class="dir-card-head"><span class="dir-icon">☷</span><div><h2>Journal des décisions</h2><p>Missions et conséquences les plus récentes.</p></div></div><div class="dir-log">${d.actions.slice(0, 12).map(a => `<div><small>S${a.season} · semaine ${a.week + 1}</small><strong>${esc(a.label)}</strong><span>${esc(a.detail)}</span></div>`).join('') || '<p class="muted">Aucune décision pour le moment.</p>'}</div></section></div>`;
  el.querySelectorAll('[data-assign]').forEach(b => b.onclick = () => dirAssign(b.dataset.assign));
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
