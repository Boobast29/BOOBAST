// ============================================================
//  Réalisme v13 :
//  - Centre de formation (modèle V9) : U17 / U19 / Réserve, promotion
//    annuelle unique, plans de développement, minutes, parcours vers les pros
//  - Agents de joueurs (agences fictives) : exigences, patience, propositions
//  - Direction : objectifs multiples, bilans réguliers, budget de saison
//  - Clubs rivaux : approches, clauses libératoires activées
// ============================================================

// ---------- Centre de formation ----------
const YOUTH_CAT = { U17: 'U17 (15-16 ans)', U19: 'U19 (17-18 ans)', RES: 'Réserve (19-22 ans)' };
const DEV_PLANS = { equilibre: ['Équilibré', null], technique: ['Technique', ['tec', 'dri', 'pas']], physique: ['Physique', ['phy', 'vit']], mental: ['Mental', ['men']], finition: ['Finition', ['fin', 'tec']], defense: ['Défense', ['tac', 'phy']], gardien: ['Gardien', ['gar', 'men']] };
function youthCat(p) {
  if (p.academy) return p.age <= 16 ? 'U17' : p.age <= 18 ? 'U19' : 'RES';
  if (p.reserve && p.age <= 22) return 'RES';
  return null;
}
// une seule promotion par club et par saison (journal + saisons traitées sauvegardés)
const __youthIntake = youthIntake;
youthIntake = function (G) {
  G.intakeLog ||= []; G.processedYears ||= [];
  // appelée en fin de saison (avant le changement d'année) ou à la création : on vise la saison qui commence
  const year = G.schedule && G.week >= G.schedule.length ? G.season + 1 : G.season;
  if (G.processedYears.includes(year)) return [];
  G.processedYears.push(year);
  const c = myClub(G), fac = G.fac?.youth || 2, st = G.staffPeople?.youth?.lvl ?? G.staff?.youth ?? 2;
  const n = 6 + fac + rint(0, 2);
  const out = [];
  for (let i = 0; i < n; i++) {
    const role = G.youthFocus && rnd() < .5 ? G.youthFocus : SQUAD_TEMPLATE[(i * 7 + G.season) % SQUAD_TEMPLATE.length];
    const y = genPlayer(role, 3.4 + c.rep / 16 + gauss() * 1.1 + (st + fac - 4) * .25, { club: c.id, age: rnd() < .5 ? 15 : 16, rep: c.rep });
    y.pot = clamp(y.pot + rint(0, 10) + (st + fac - 4) * 2, playerOvr(y), 95);
    if (rnd() < .004 + fac * .004) { y.pot = clamp(y.pot + rint(8, 14), playerOvr(y), 96); y.gem = true; }
    y.wage = 300; y.contract = 3; y.academy = true; y.intake = year; y.fictional = true;
    y.regenId = `regen_${year}_${c.srcId || c.id}_${i + 1}`;
    y.devPlan = 'equilibre'; y.youthMin = 0; y.ovrHist = [{ s: year, o: playerOvr(y) }]; y.value = calcValue(y);
    G.players.push(y); if (G.pmap) G.pmap[y.id] = y; out.push(y);
  }
  G.intakeLog.push({ season: year, ids: out.map(p => p.id), regen: out.map(p => p.regenId), n: out.length, gems: out.filter(p => p.gem).length });
  if (typeof addDecision === 'function' && G.decisions) addDecision(G, { key: 'intake:' + year, kind: 'info', blocking: false, from: 'Centre de formation', icon: '🌱',
    title: `Promotion ${year} : ${out.length} jeunes intègrent les U17`,
    text: `${out.map(p => `${p.name} (${p.pos}, ${p.age} ans${p.gem ? ', pépite repérée' : ''})`).join(', ')}. Joueurs générés par le jeu (identifiants regen_*, fictifs). Fixe un plan de développement pour chacun dans Formation.` });
  news(G, `🌱 Promotion annuelle ${year} : ${out.length} jeunes rejoignent les U17${out.some(p => p.gem) ? ' — dont une pépite !' : '.'}`, 'youth');
  return out;
};
// développement hebdomadaire des jeunes : plan, minutes en catégorie, encadrement, plafonné par le potentiel
function youthWeekly(G) {
  const fac = G.fac?.youth || 2, st = G.staffPeople?.youth?.lvl ?? G.staff?.youth ?? 2;
  for (const p of G.players) {
    if (p.club !== G.clubId) continue;
    const cat = youthCat(p); if (!cat) continue;
    // matchs de la catégorie (poules de jeu fictives) : titulaires selon le niveau dans la catégorie
    const mates = G.players.filter(x => x.club === G.clubId && youthCat(x) === cat).sort((a, b) => playerOvr(b) - playerOvr(a));
    const rank = mates.indexOf(p), min = rank < 11 ? 90 : rank < 16 ? 30 : 0;
    p.youthMin = (p.youthMin || 0) + min; p.youthApps = (p.youthApps || 0) + (min ? 1 : 0);
    // plafond : +8 de niveau par saison au maximum, toutes sources confondues
    const base = (p.ovrHist || []).at(-1)?.o ?? playerOvr(p);
    if (playerOvr(p) - base >= 8) continue;
    const chance = (.012 + (fac + st) * .004 + (min ? .008 : 0)) * (p.age <= 18 ? 1.2 : .9);
    if (playerOvr(p) < p.pot && rnd() < chance) bumpAttr(p, 1, DEV_PLANS[p.devPlan || 'equilibre'][1] || undefined);
  }
}
function promoteWithContract(p) {
  const me = myClub(G), ask = monthly(Math.max(1200, calcWage(p) * .6));
  modal(`<h2>Premier contrat professionnel : ${esc(p.name)}</h2><p>${p.pos} · ${p.age} ans · ${esc(YOUTH_CAT[youthCat(p)] || '')} · potentiel estimé ${stars(youthPotEstimate(G, p))}</p>
    <p>Son entourage demande ${money(ask)}/mois. Un contrat pro le fait passer dans le groupe professionnel ; il faudra lui donner du temps de jeu ou le prêter.</p>
    <div class="form-grid"><label>Salaire (€/mois) <input id="pcW" type="number" step="500" value="${ask}"></label><label>Durée <select id="pcY">${[2, 3, 4, 5].map(y => `<option ${y === 3 ? 'selected' : ''}>${y}</option>`).join('')}</select></label></div>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="pcOk">Proposer</button></div><p class="hint" id="pcR"></p>`);
  $('#pcOk').onclick = () => {
    const w = +$('#pcW').value, y = +$('#pcY').value;
    if (w < ask * .8 && (p.gem || rnd() < .5)) return $('#pcR').textContent = `❌ ${p.name} refuse : des clubs étrangers lui font des propositions plus élevées.`;
    p.academy = false; p.reserve = false; p.wage = weekly(w); p.contract = y; p.status = 'youth'; p.joinedSeason = G.season; p.integ = 60;
    (G.alumni ||= []).push({ id: p.id, name: p.name, intake: p.intake, promoted: G.season, label: weekLabel(G) });
    assignNumbers(clubPlayers(G, G.clubId)); news(G, `⬆ ${p.name} signe son premier contrat professionnel (${money(w)}/mois jusqu'en juin ${G.season + y}).`, 'youth');
    closeModal(); save(); refresh();
  };
}
let YOUTH_TAB = 'U17';
vYouth = function (el) {
  G.intakeLog ||= [];
  const cats = ['U17', 'U19', 'RES'];
  const tabs = [...cats.map(k => [k, YOUTH_CAT[k]]), ['promo', 'Promotions annuelles'], ['path', 'Parcours vers les pros']];
  const fac = G.fac?.youth || 2, st = G.staffPeople?.youth ?? { name: G.staffNames?.youth, lvl: G.staff.youth };
  let body = '';
  if (cats.includes(YOUTH_TAB)) {
    const list = G.players.filter(p => p.club === G.clubId && youthCat(p) === YOUTH_TAB).sort((a, b) => playerOvr(b) - playerOvr(a));
    body = list.length ? `<table class="tbl wrap"><thead><tr><th></th><th>Joueur</th><th>Âge</th><th>Niveau</th><th>Potentiel estimé</th><th>Plan</th><th>Matchs / min.</th><th>Progression</th><th></th></tr></thead><tbody>
      ${list.map(p => { const h = p.ovrHist || []; const d = h.length ? playerOvr(p) - h[0].o : 0; return `<tr data-pid="${p.id}"><td>${avatar(p, 30)}</td><td class="nm">${esc(p.name)}${p.gem ? ' 💎' : ''}${fictionalTag(p)}<br><small class="muted">${p.pos} · ${esc(p.pers)} · promo ${p.intake ?? '—'}</small></td>
        <td>${p.age}</td><td>${ovrBadge(playerOvr(p))}</td><td>${stars(youthPotEstimate(G, p))}</td>
        <td><select data-plan="${p.id}">${Object.entries(DEV_PLANS).map(([k, [l]]) => `<option value="${k}" ${(p.devPlan || 'equilibre') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
        <td>${p.youthApps || 0} / ${p.youthMin || 0}</td><td class="${d > 0 ? 'pos' : ''}">${d > 0 ? '+' + d : '='}</td>
        <td class="row gap">${p.academy ? `<button class="btn sm primary" data-pro="${p.id}">Contrat pro</button>` : ''}${YOUTH_TAB !== 'U17' ? `<button class="btn sm" data-loan="${p.id}">Prêter</button>` : ''}<button class="btn sm danger" data-rel="${p.id}">Libérer</button></td></tr>`; }).join('')}</tbody></table>`
      : '<p class="muted">Aucun joueur dans cette catégorie.</p>';
    body += `<p class="hint">Catégories et poules de jeunes : structures modélisées (V9), pas des inscriptions officielles. Les 11 meilleurs de chaque catégorie jouent les matchs de la semaine. La progression dépend du plan, des minutes, du centre et du formateur, et reste plafonnée par le potentiel (jamais garanti).</p>`;
  } else if (YOUTH_TAB === 'promo') {
    body = G.intakeLog.length ? G.intakeLog.slice().reverse().map(l => {
      const ps = l.ids.map(id => getPlayer(G, id));
      const still = ps.filter(p => p && p.club === G.clubId).length, pro = ps.filter(p => p && p.club === G.clubId && !p.academy).length;
      return `<div class="card sub"><h3>Promotion ${l.season} — ${l.n} jeunes${l.gems ? ` · ${l.gems} pépite(s)` : ''}</h3><p>Encore au club : ${still} · passés pros : ${pro} · partis : ${l.n - still}</p>
        <div class="grp-m">${ps.filter(Boolean).map(p => `<span data-pid="${p.id}" title="${esc(p.name)} — ${p.club === G.clubId ? (p.academy ? youthCat(p) : 'pro') : 'parti'}">${avatar(p, 28)}</span>`).join('')}</div></div>`; }).join('')
      : '<p class="muted">Aucune promotion enregistrée.</p>';
  } else {
    const al = G.alumni || [];
    body = al.length ? `<table class="tbl"><thead><tr><th>Joueur</th><th>Promo</th><th>Passé pro</th><th>Situation</th><th>Matchs pros (saison)</th><th>Historique</th></tr></thead><tbody>${al.map(a => { const p = getPlayer(G, a.id);
      return `<tr ${p ? `data-pid="${p.id}"` : ''}><td>${esc(a.name)}</td><td>${a.intake ?? '—'}</td><td>${a.promoted}</td><td>${!p ? 'Retraité / inconnu' : p.club === G.clubId ? (p.loan ? 'Prêté' : 'Au club') : p.club != null ? 'Transféré à ' + esc(getClub(G, p.club).name) : 'Libre'}</td><td>${p ? p.stats.apps : '—'}</td><td><small>${p ? (p.hist || []).map(h => `${h.season} ${esc(h.club)} ${h.apps} m`).join(' · ') : ''}</small></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">Aucun jeune n\'est encore passé professionnel.</p>';
  }
  el.innerHTML = `<div class="kpis card"><div><small>Centre de formation</small><b class="stars">${'★'.repeat(fac)}${'☆'.repeat(5 - fac)}</b></div><div><small>Formateur</small><b>${esc(st?.name || '—')}</b><em class="stars">${'★'.repeat(st?.lvl || 2)}</em></div>
    <div><small>Effectif jeunes</small><b>${G.players.filter(p => p.club === G.clubId && youthCat(p)).length}</b></div><div><small>Recrutement des jeunes</small><b><select id="yFocus"><option value="">Tous postes</option>${Object.keys(ROLES).map(r => `<option value="${r}" ${G.youthFocus === r ? 'selected' : ''}>${ROLES[r].label}</option>`).join('')}</select></b></div></div>
    <section class="card"><h2>🌱 Formation</h2><div class="tabs">${tabs.map(([k, l]) => `<button data-yt="${k}" class="${YOUTH_TAB === k ? 'on' : ''}">${l}</button>`).join('')}</div><div class="mt">${body}</div></section>`;
  el.querySelectorAll('[data-yt]').forEach(b => b.onclick = () => { YOUTH_TAB = b.dataset.yt; vYouth(el); });
  $('#yFocus').onchange = e => { G.youthFocus = e.target.value || null; save(); };
  el.querySelectorAll('[data-plan]').forEach(s => s.onchange = () => { getPlayer(G, +s.dataset.plan).devPlan = s.value; save(); toast('Plan de développement mis à jour.'); });
  el.querySelectorAll('[data-pro]').forEach(b => b.onclick = () => promoteWithContract(getPlayer(G, +b.dataset.pro)));
  el.querySelectorAll('[data-loan]').forEach(b => b.onclick = () => { const p = getPlayer(G, +b.dataset.loan); if (p.academy) { p.academy = false; p.status = 'youth'; } loanModal(p.id); });
  el.querySelectorAll('[data-rel]').forEach(b => b.onclick = () => { const p = getPlayer(G, +b.dataset.rel); confirmBox(`Libérer ${esc(p.name)} ?`, () => { p.academy = false; p.club = null; p.reserve = false; news(G, `${p.name} quitte le centre de formation.`, 'youth'); save(); vYouth(el); }, 'Libérer', true); });
  el.querySelectorAll('[data-pid]').forEach(r => r.onclick = e => { if (e.target.closest('button,select')) return; playerModal(+r.dataset.pid); });
};

// ---------- Agents ----------
const AGENCY_A = ['Prime', 'Nova', 'Atlas', 'Elite', 'Global', 'Stellar', 'Horizon', 'Apex', 'Kappa', 'Vector'];
const AGENCY_B = ['Sports Management', 'Football Group', 'Talents', 'Agency', 'Players Consulting', 'Sport & Co'];
const AGENT_TYPES = {
  requin: { label: 'Négociateur féroce', wage: 1.15, fee: 1.6, patience: -1, tip: 'Exige beaucoup, menace souvent de partir à la concurrence.' },
  loyal: { label: 'Fidèle au club', wage: .95, fee: .8, patience: 1, tip: 'Privilégie la stabilité de son joueur.' },
  mediateur: { label: 'Conciliant', wage: 1, fee: 1, patience: 1, tip: 'Cherche un accord équilibré.' },
  opportuniste: { label: 'Opportuniste', wage: 1.05, fee: 1.3, patience: 0, tip: 'Pousse ses joueurs à bouger souvent.' }
};
function agentOf(p) {
  G.agents ||= {};
  if (!p.agent) return withSideRng(`${G.seed}|agent|${p.id}`, () => agentOfRaw(p)); // l'affichage d'une fiche ne consomme pas l'aléatoire de la partie
  return G.agents[p.agent];
}
function agentOfRaw(p) {
  if (!p.agent) {
    const ids = Object.keys(G.agents);
    if (ids.length < 40) { const id = 'ag' + (ids.length + 1); G.agents[id] = { id, name: `${pick(AGENCY_A)} ${pick(AGENCY_B)}`, type: pick(Object.keys(AGENT_TYPES)), clients: 0, deals: 0 }; p.agent = id; }
    else p.agent = pick(ids);
    G.agents[p.agent].clients++;
  }
  return G.agents[p.agent];
}
const __dealDemands = dealDemands;
dealDemands = function (d) {
  __dealDemands(d);
  const p = getPlayer(G, d.pid), a = agentOf(p), t = AGENT_TYPES[a.type];
  d.demand.wageM = roundMoney(d.demand.wageM * t.wage); d.demand.agentFee = roundMoney(d.demand.agentFee * t.fee);
  d.patience = Math.max(1, d.patience + t.patience);
  d.agent = a.name + ' — ' + t.label;
  d.log.push(`Agent : ${a.name} (${t.label}).`);
};
// fiche joueur : afficher l'agent
const __playerModal = playerModal;
playerModal = function (pid, tab) {
  __playerModal(pid, tab);
  const p = getPlayer(G, pid); if (!p || !G) return;
  const a = agentOf(p), box = $('#modal .pm-head > div:nth-child(2)');
  if (box) box.insertAdjacentHTML('beforeend', `<p><small class="muted">Agent : <b>${esc(a.name)}</b> (${AGENT_TYPES[a.type].label}) · contrat ${contractEnd(p)} · ${wageM(p.wage)}</small></p>`);
};

// ---------- Direction : objectifs multiples ----------
function setBoardObjectives(G) {
  const c = myClub(G), L = clubLeague(G, G.clubId);
  const inc = projectedWeeklyIncome(G) * 52;
  const ratio = c.rep >= 80 ? .7 : c.rep >= 65 ? .65 : .6;
  G.boardObj = { season: G.season, list: [
    { k: 'league', label: objectiveLabel(G), w: 40 },
    { k: 'wages', label: `Masse salariale ≤ ${Math.round(ratio * 100)} % des recettes`, ratio, w: 20 },
    { k: 'youth', label: `Faire jouer les jeunes : ${c.rep >= 80 ? 300 : 900} minutes pour des joueurs de 21 ans et moins`, target: c.rep >= 80 ? 300 : 900, w: 15 },
    { k: 'net', label: `Solde des transferts ≥ ${money(-Math.round(G.board.transfer))}`, target: -G.board.transfer, w: 15 },
    { k: 'cash', label: 'Trésorerie positive en fin de saison', w: 10 }
  ], reviews: [], startBudget: c.budget, startTransfers: transferBalance(G) };
  void inc; void L;
}
function transferBalance(G) {
  let s = 0;
  for (const t of G.transfers || []) { if (t.season !== G.season) continue; if (t.to === G.clubId) s -= t.fee || 0; if (t.from === G.clubId) s += t.fee || 0; }
  return s;
}
function boardScores(G) {
  const o = G.boardObj; if (!o) return [];
  const c = myClub(G), L = clubLeague(G, G.clubId), rank = standings(G, L.id).findIndex(r => r.id === G.clubId) + 1;
  const inc = Math.max(1, projectedWeeklyIncome(G)), wr = wageBill(G) / inc;
  const ymin = clubPlayers(G, G.clubId).filter(p => p.age <= 21).reduce((a, p) => a + (p.stats.min || 0), 0);
  const net = transferBalance(G);
  return o.list.map(x => {
    let v, s;
    if (x.k === 'league') { v = `${rank}e`; s = rank <= G.objective ? 100 : clamp(100 - (rank - G.objective) * 18, 0, 100); }
    if (x.k === 'wages') { v = `${Math.round(wr * 100)} %`; s = wr <= x.ratio ? 100 : clamp(100 - (wr - x.ratio) * 250, 0, 100); }
    if (x.k === 'youth') { v = `${ymin} min`; s = clamp(ymin / x.target * 100, 0, 100); }
    if (x.k === 'net') { v = money(net); s = net >= x.target ? 100 : clamp(100 - (x.target - net) / Math.max(1, Math.abs(x.target)) * 100, 0, 100); }
    if (x.k === 'cash') { v = money(c.budget); s = c.budget >= 0 ? 100 : 0; }
    return { ...x, v, s: Math.round(s) };
  });
}
function boardReview(G) {
  const sc = boardScores(G); if (!sc.length) return;
  const total = Math.round(sc.reduce((a, x) => a + x.s * x.w, 0) / sc.reduce((a, x) => a + x.w, 0));
  G.boardObj.reviews.push({ week: G.week, label: weekLabel(G), total });
  const d = total >= 75 ? 6 : total >= 55 ? 1 : total >= 40 ? -5 : -10;
  G.board.conf = clamp(G.board.conf + d, 0, 100);
  addDecision(G, { key: 'review:' + G.season + ':' + G.week, kind: 'info', from: 'Président', icon: '🏛', title: `Réunion d'évaluation avec la direction — ${total} / 100`,
    html: `<p>Le président fait le point sur tes objectifs (${total >= 75 ? 'très satisfait' : total >= 55 ? 'satisfait' : total >= 40 ? 'inquiet' : 'mécontent'}, confiance ${d >= 0 ? '+' : ''}${d}).</p><table class="tbl compact">${sc.map(x => `<tr><td>${esc(x.label)}</td><td>${esc(x.v)}</td><td>${meter(x.s)}</td><td><small>poids ${x.w}</small></td></tr>`).join('')}</table>`,
    text: `Évaluation : ${total}/100.` });
}
function vBoard(el) {
  if (!G.boardObj || G.boardObj.season !== G.season) setBoardObjectives(G);
  const sc = boardScores(G), total = Math.round(sc.reduce((a, x) => a + x.s * x.w, 0) / sc.reduce((a, x) => a + x.w, 0));
  el.innerHTML = `<div class="grid2"><section class="card"><h2>🏛 Objectifs de la saison <small>évaluation actuelle ${total}/100</small></h2>
      <table class="tbl">${sc.map(x => `<tr><td>${esc(x.label)}</td><td><b>${esc(x.v)}</b></td><td style="width:140px">${meter(x.s)}</td><td><small class="muted">poids ${x.w}</small></td></tr>`).join('')}</table>
      <p class="hint">Le président fait un bilan tous les 10 journées environ et à la fin de la saison. Sa confiance détermine ta sécurité d'emploi.</p></section>
    <section class="card"><h2>Relation avec le président</h2><div class="gauges"><div><small>Confiance</small>${meter(G.board.conf)}</div><div><small>Supporters</small>${meter(G.fans ?? 60)}</div></div>
      <p>Budget transferts : <b>${money(G.board.transfer)}</b> · plafond salarial : <b>${wageM(G.board.wageCap)}</b> · trésorerie : <b>${money(myClub(G).budget)}</b></p>
      <h3>Demandes au président</h3><div class="row gap wrap"><button class="btn" data-br="transfer">Plus de budget transferts</button><button class="btn" data-br="wage">Relever le plafond salarial</button><button class="btn" data-br="facility">Investir dans les installations</button></div>
      <h3>Bilans de la saison</h3>${G.boardObj.reviews.length ? G.boardObj.reviews.map(r => `<div>${esc(r.label)} : <b>${r.total}/100</b></div>`).join('') : '<p class="muted">Premier bilan à venir.</p>'}</section></div>`;
  el.querySelectorAll('[data-br]').forEach(b => b.onclick = () => { const r = boardRequest(G, b.dataset.br); toast(r.msg, r.ok ? '' : 'err'); save(); vBoard(el); });
}

// ---------- Clubs rivaux : approches, clauses ----------
function rivalsWeekly(G) {
  if (!windowOpen(G)) return;
  const me = myClub(G), sq = clubPlayers(G, G.clubId).filter(p => !p.academy && !p.loan).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 8);
  for (const p of sq) {
    const rich = G.clubs.filter(c => c.id !== G.clubId && c.rep >= me.rep + 6 && c.budget > p.value * 1.2);
    if (!rich.length) continue;
    // clause libératoire payée : le club ne peut pas s'y opposer
    if (p.clause && p.clause > 0 && rnd() < .03) {
      const b = rich.find(c => c.budget > p.clause);
      if (b && (p.pers === 'Ambitieux' || rnd() < .6)) {
        flow(G, b, -p.clause, 'transfers'); flow(G, me, p.clause, 'sales');
        logTransfer(G, p, G.clubId, b.id, p.clause, 'clause'); removeFromTactics(p.id);
        p.club = b.id; p.contract = rint(3, 5); p.num = null; p.listed = false; assignNumbers(clubPlayers(G, b.id));
        G.board.transfer = roundMoney(G.board.transfer + p.clause * .6);
        news(G, `💥 ${b.name} paie la clause libératoire de ${p.name} (${money(p.clause)}). Le transfert est immédiat : tu ne peux pas t'y opposer.`, 'transfer');
        return;
      }
    }
    // approche d'un grand club : le joueur est perturbé
    if (!p.approached && rnd() < .025 * (p.pers === 'Ambitieux' ? 2 : 1)) {
      const b = pick(rich); p.approached = b.id;
      addDecision(G, { key: 'approach:' + p.id + ':' + G.season, kind: 'approach', ref: p.id, data: b.id, from: `Agent de ${p.name}`, icon: '📞',
        title: `${b.name} s'intéresse à ${p.name}`, text: `${b.name} a pris contact avec l'entourage de ${p.name}. Le joueur est flatté${p.pers === 'Ambitieux' ? ' et rêve de ce transfert' : ''}. Que fais-tu ?` });
      return;
    }
  }
}
DECISION_OPTS.approach = d => [['talk', 'Lui proposer une revalorisation (+20 %, +1 an)', 'primary'], ['offer', 'Inviter le club à faire une offre'], ['block', 'Fermer la porte publiquement', 'danger']];
const __decide2 = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || d.kind !== 'approach') return __decide2(id, opt);
  const p = getPlayer(G, d.ref), b = getClub(G, d.data); let msg;
  if (opt === 'talk') {
    const ok = !(p.pers === 'Ambitieux' && b.rep > myClub(G).rep + 12 && rnd() < .6);
    if (ok && wageBill(G) + p.wage * .2 <= G.board.wageCap) { p.wage = roundMoney(p.wage * 1.2); p.contract++; p.morale = clamp(p.morale + 8, 5, 100); msg = `${p.name} accepte la revalorisation et reste concentré (${wageM(p.wage)}, juin ${G.season + p.contract}).`; }
    else { p.morale = clamp(p.morale - 10, 5, 100); p.wantsOut = true; msg = `${p.name} refuse : il veut rejoindre ${b.name}.`; }
  } else if (opt === 'offer') {
    const fee = roundMoney(p.value * (1.1 + rnd() * .3));
    G.offers.push({ id: Date.now() + rint(0, 9999), pid: p.id, club: b.id, fee, week: G.week, max: roundMoney(fee * 1.15) });
    p.morale = clamp(p.morale + 5, 5, 100); msg = `${b.name} formule une offre de ${money(fee)}.`;
  } else {
    const hurt = p.pers === 'Ambitieux' || p.pers === 'Tempérament';
    p.morale = clamp(p.morale - (hurt ? 15 : 4), 5, 100); p.trust = clamp((p.trust ?? 55) - (hurt ? 10 : 2), 0, 100); if (hurt && rnd() < .5) p.wantsOut = true;
    G.fans = clamp((G.fans ?? 60) + 3, 0, 100);
    msg = hurt ? `Les supporters apprécient, mais ${p.name} le vit très mal.` : `${p.name} accepte la décision du club.`;
  }
  d.done = opt; d.answer = msg; news(G, `📞 ${d.title} — ${msg}`, 'transfer'); save(); toast(msg);
  if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
};

// ---------- Propositions spontanées d'agents ----------
function agentsWeekly(G) {
  if (rnd() > (windowOpen(G) ? .35 : .08)) return;
  const me = myClub(G);
  const pool = G.players.filter(p => p.club !== G.clubId && !p.academy && (p.club == null || p.wantsOut || p.listed || p.contract <= 1) && (windowOpen(G) || p.club == null) && Math.abs(playerOvr(p) - (me.rep - 5)) < 14 && !G.shortlist.includes(p.id));
  if (!pool.length) return;
  const p = pick(pool), a = agentOf(p), from = p.club != null ? getClub(G, p.club) : null;
  addDecision(G, { key: 'agentoffer:' + p.id + ':' + G.season, kind: 'agentOffer', ref: p.id, blocking: false, from: a.name, icon: '🤝',
    title: `Un agent te propose ${p.name}`, text: `${a.name} (${AGENT_TYPES[a.type].label}) : « Mon client ${p.name} (${ROLES[p.pos].label}, ${p.age} ans${from ? `, ${from.name}` : ', libre'}) aimerait rejoindre un projet comme le vôtre. » Niveau estimé ~${estOvr(G, p)}. Attention : un agent présente toujours son client sous son meilleur jour.` });
}
DECISION_OPTS.agentOffer = d => [['follow', 'Le suivre et envoyer un recruteur', 'primary'], ['offer', 'Ouvrir une négociation'], ['no', 'Pas intéressé']];
const __decide3 = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || d.kind !== 'agentOffer') return __decide3(id, opt);
  const p = getPlayer(G, d.ref);
  if (opt === 'follow') { if (!G.shortlist.includes(p.id)) G.shortlist.push(p.id); if (!knows(G, p) && !G.scouting.some(s => s.pid === p.id)) scoutPlayer(p.id); }
  d.done = opt; d.answer = opt === 'no' ? 'décliné' : opt === 'follow' ? 'joueur suivi' : 'négociation';
  save();
  if (opt === 'offer') return offerModal(p.id);
  if ($('#top')) show(VIEW === 'mail' ? 'mail' : VIEW);
};

// ---------- Branchements ----------
const __gestionWeekly2 = gestionWeekly;
gestionWeekly = function (G, full) {
  __gestionWeekly2(G, full);
  if (!full) return;
  try {
    youthWeekly(G); rivalsWeekly(G); agentsWeekly(G);
    if (!G.boardObj || G.boardObj.season !== G.season) setBoardObjectives(G);
    const lr = leagueRoundAt(G); if (lr > 0 && lr % 10 === 0 && !G.boardObj.reviews.some(r => r.week === G.week)) boardReview(G);
  } catch (e) { console.error(e); }
};
const __endSeason3 = endSeason;
endSeason = function (G) {
  if (G.boardObj) boardReview(G);
  for (const p of G.players) if (p.club === G.clubId && youthCat(p)) (p.ovrHist ||= []).push({ s: G.season, o: playerOvr(p) });
  for (const p of G.players) { delete p.approached; p.youthMin = 0; p.youthApps = 0; }
  return __endSeason3(G);
};
// la vue Direction dans la navigation (section Club)
const __applyRoleNav = applyRoleNav;
applyRoleNav = function () {
  __applyRoleNav();
  const club = NAV_GROUPS.find(g => g[0] === 'Club');
  if (club && !club[1].some(x => x[0] === 'board')) club[1].unshift(['board', '🏛', 'Direction']);
  NAV_FLAT.length = 0; NAV_FLAT.push(...NAV_GROUPS.flatMap(g => g[1]));
};
const __show3 = show;
show = function (v) {
  if (v !== 'board') return __show3(v);
  if (LIVE) return;
  VIEW_HIST.push(VIEW); VIEW = 'board';
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === 'board'));
  renderTop(); const main = $('#main'); main.innerHTML = ''; vBoard(main); navBadges();
};
