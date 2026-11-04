// ============================================================
//  Table de négociation détaillée : offre au club, contrat d'une recrue, prolongation
//  Chaque point est une ligne : ce que demande l'autre partie, ta proposition, l'importance du point pour elle
//  (selon la personnalité du joueur ou la situation du club) et sa satisfaction. Une jauge globale estime les chances
//  d'accord en direct (même calcul que la décision, sans tirage aléatoire).
//  Contrat — points : salaire, durée, statut, prime à la signature, commission d'agent, clause libératoire, primes par but,
//  par passe décisive, par match, par clean sheet (gardiens et défenseurs), prime d'objectif collectif, augmentation annuelle,
//  prime de fidélité (fin de contrat), clause de relégation (baisse de salaire), option d'une année supplémentaire pour le club.
//  Transfert — points : indemnité, échéancier, bonus après 25 matchs, bonus après 15 buts, % à la revente, clause de rachat,
//  joueur inclus. Toutes les clauses sont appliquées ensuite dans la partie (paiements, augmentations, rachat…).
// ============================================================
const PRIORITES_PERSO = {
  Ambitieux: { statut: 3, salaire: 2, clause: 3, objectif: 2 }, Professionnel: { primes: 3, duree: 2, objectif: 2 },
  Loyal: { duree: 3, fidelite: 3, statut: 1 }, 'Tempérament': { salaire: 3, signature: 2, releg: 2 },
  Leader: { statut: 3, duree: 2 }, Discret: { salaire: 2, duree: 2 }
};
const fmtE = v => money(Math.round(v || 0));
const imp = n => `<span class="imp" title="Importance pour lui : ${n}/3">${'●'.repeat(n)}${'○'.repeat(3 - n)}</span>`;
const jauge = v => { const p = Math.round(Math.max(0, Math.min(1.2, v)) / 1.2 * 100); return `<span class="sat ${v >= .97 ? 'ok' : v >= .85 ? 'moy' : 'ko'}"><i style="width:${p}%"></i></span>`; };

// ---------- modèle du contrat ----------
function demandeDetaillee(p, base) {
  const prio = PRIORITES_PERSO[p.pers] || {};
  const attaque = ['BU', 'AG', 'AD', 'MOC'].includes(p.pos), defense = ['GB', 'DC', 'DG', 'DD'].includes(p.pos);
  return {
    ...base,
    goalBonus: attaque ? roundMoney(base.wageM * .06) : 0, assistBonus: attaque || p.pos === 'MC' ? roundMoney(base.wageM * .03) : 0,
    appBonus: roundMoney(base.wageM * .02), csBonus: defense ? roundMoney(base.wageM * .04) : 0, objBonus: roundMoney(base.wageM * (prio.objectif ? 2 : 1)),
    raise: prio.salaire >= 2 || p.age <= 23 ? 5 : 0, loyalty: prio.fidelite ? roundMoney(base.wageM * 3) : 0, relegPct: 0, option: false, prio
  };
}
function primesAttendues(p, t) { // valeur annuelle attendue des primes de performance
  const buts = { BU: 14, AG: 8, AD: 8, MOC: 7, MC: 4, MDC: 2, DG: 1.5, DD: 1.5, DC: 2, GB: 0 }[p.pos] ?? 3, passes = { BU: 5, AG: 7, AD: 7, MOC: 8, MC: 5, MDC: 2, DG: 3, DD: 3, DC: 1, GB: 0 }[p.pos] ?? 2;
  const cs = ['GB', 'DC', 'DG', 'DD'].includes(p.pos) ? 10 : 0;
  return (t.goalBonus || 0) * buts + (t.assistBonus || 0) * passes + (t.appBonus || 0) * 28 + (t.csBonus || 0) * cs + (t.objBonus || 0) * .5;
}
function satisfactionContrat(p, t, dm) {
  const prio = dm.prio || {}, L = [];
  const add = (cle, label, s, w = 1) => L.push({ cle, label, s: Math.max(0, Math.min(1.25, s)), w: w + (prio[cle] ? prio[cle] - 1 : 0) });
  const sGap = STATUS_ORDER.indexOf(t.status) - STATUS_ORDER.indexOf(dm.status);
  add('salaire', 'Salaire', t.wageM / dm.wageM, 3);
  add('duree', 'Durée', 1 - Math.abs((t.yrs || 1) - dm.yrs) * .12, 1);
  add('statut', 'Statut', 1 - Math.max(0, sGap) * .25 + Math.max(0, -sGap) * .08, 1.5);
  add('signature', 'Prime à la signature', dm.signOn ? (t.signOn || 0) / dm.signOn : 1, 1);
  add('agent', 'Commission d\'agent', dm.agentFee ? (t.agentFee || 0) / dm.agentFee : 1, 1);
  add('clause', 'Clause libératoire', dm.clauseMin ? (t.clause && t.clause <= dm.clauseMin * 1.5 ? 1.05 : .3) : (t.clause ? 1.05 : 1), 1);
  const ref = primesAttendues(p, dm) || dm.wageM;
  add('primes', 'Primes de performance', .8 + .2 * Math.min(1.8, primesAttendues(p, t) / ref), 1);
  add('objectif', 'Prime d\'objectif', dm.objBonus ? .9 + .1 * Math.min(1.5, (t.objBonus || 0) / dm.objBonus) : 1, .5);
  add('raise', 'Augmentation annuelle', 1 + ((t.raise || 0) - dm.raise) * .02, .8);
  add('fidelite', 'Prime de fidélité', dm.loyalty ? .85 + .15 * Math.min(1.5, (t.loyalty || 0) / dm.loyalty) : 1 + Math.min(.06, (t.loyalty || 0) / (dm.wageM * 20)), .6);
  add('releg', 'Clause de relégation', 1 - (t.relegPct || 0) / 100 * 1.2, .8);
  add('option', 'Option +1 an (club)', t.option ? .9 : 1, .6);
  const tot = L.reduce((s, x) => s + x.w, 0), S = L.reduce((s, x) => s + x.s * x.w, 0) / tot;
  return { L, S, sGap };
}
function verdictContrat(p, t, dm, { renouvellement = false } = {}) {
  const me = myClub(G), { S, sGap } = satisfactionContrat(p, t, dm);
  const coutSem = weekly(t.wageM) - (renouvellement ? p.wage : 0);
  if (sGap >= 2) return { ok: false, S, bloque: `il refuse le statut « ${STATUS[t.status].label} ».` };
  if (dm.clauseMin && (!t.clause || t.clause > dm.clauseMin * 1.5)) return { ok: false, S, bloque: `il exige une clause libératoire autour de ${fmtE(dm.clauseMin)}.` };
  if (renouvellement && typeof renewalProjection === 'function') { // engagements en cours (transferts à la visite médicale) compris
    const r = renewalProjection(G, p, { wageM: t.wageM, years: t.yrs, bonus: (t.signOn || 0) + (t.agentFee || 0), clause: t.clause || 0 });
    if (!r.valid) return { ok: false, S, club: true, bloque: r.reason };
    if (!r.allowed) return { ok: false, S, club: true, bloque: `le président bloque : ${r.reasons.join(' ').toLowerCase()}` };
  }
  if (wageBill(G) + coutSem > G.board.wageCap) return { ok: false, S, club: true, bloque: `le président bloque : plafond salarial (${wageM(G.board.wageCap)}) dépassé.` };
  if ((t.signOn || 0) + (t.agentFee || 0) > me.budget) return { ok: false, S, club: true, bloque: 'trésorerie insuffisante pour la prime et la commission.' };
  if (dm.agentFee && (t.agentFee || 0) < dm.agentFee * .6) return { ok: false, S, bloque: 'l\'agent juge sa commission insultante.' };
  return { ok: S >= .95, S, bloque: '' };
}
function chancesTxt(v) { return v.bloque ? `Bloqué : ${v.bloque}` : v.S >= .95 ? 'Accord très probable' : v.S >= .9 ? 'Accord possible, il faudra peut-être un effort' : v.S >= .82 ? 'Encore loin de ses attentes' : 'Très loin de ses attentes'; }

function lignesContrat(p, t, dm, opts = {}) {
  const sat = Object.fromEntries(satisfactionContrat(p, t, dm).L.map(x => [x.cle, x]));
  const pr = c => imp(Math.min(3, Math.max(1, Math.round(sat[c]?.w || 1))));
  const n = (id, v, step = 1000) => `<input id="${id}" type="number" min="0" step="${step}" value="${v || 0}">`;
  const row = (cle, label, demande, champ, aide = '') => `<tr data-cle="${cle}"><td><b>${label}</b>${aide ? `<small>${aide}</small>` : ''}</td><td>${demande}</td><td>${champ}</td><td>${pr(cle)}</td><td class="satc">${jauge(sat[cle]?.s ?? 1)}</td></tr>`;
  const attaque = ['BU', 'AG', 'AD', 'MOC', 'MC'].includes(p.pos), defense = ['GB', 'DC', 'DG', 'DD'].includes(p.pos);
  return `<table class="tbl nego"><thead><tr><th>Point</th><th>Demande</th><th>Ta proposition</th><th>Importance</th><th>Satisfaction</th></tr></thead><tbody>
    <tr class="nego-sep"><td colspan="5">Rémunération</td></tr>
    ${row('salaire', 'Salaire', `${fmtE(dm.wageM)}/mois`, n('nW', t.wageM, 5000) + '<small>€/mois</small>')}
    ${row('signature', 'Prime à la signature', fmtE(dm.signOn), n('nS', t.signOn, 10000))}
    ${opts.agent !== false ? row('agent', 'Commission d\'agent', fmtE(dm.agentFee), n('nA', t.agentFee, 10000), 'payée une fois') : ''}
    ${row('raise', 'Augmentation annuelle', `${dm.raise} %`, `<select id="nR">${[0, 3, 5, 8, 10].map(v => `<option ${v === (t.raise || 0) ? 'selected' : ''}>${v}</option>`).join('')}</select><small>%/an</small>`, 'appliquée à chaque nouvelle saison')}
    ${row('fidelite', 'Prime de fidélité', dm.loyalty ? fmtE(dm.loyalty) : '—', n('nF', t.loyalty, 50000), 'versée à la fin du contrat s\'il est toujours au club')}
    <tr class="nego-sep"><td colspan="5">Contrat</td></tr>
    ${row('duree', 'Durée', `${dm.yrs} saison(s)`, `<select id="nY">${[1, 2, 3, 4, 5].map(y => `<option ${y === t.yrs ? 'selected' : ''}>${y}</option>`).join('')}</select>`)}
    ${row('statut', 'Statut promis', STATUS[dm.status].label, `<select id="nT">${STATUS_ORDER.map(k => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}</select>`, 'temps de jeu attendu')}
    ${row('clause', 'Clause libératoire', dm.clauseMin ? `≈ ${fmtE(dm.clauseMin)}` : 'aucune exigée', n('nC', t.clause, 500000), '0 = aucune')}
    ${row('option', 'Option +1 an pour le club', 'non', `<label class="chk"><input id="nO" type="checkbox" ${t.option ? 'checked' : ''}> à lever en dernière année</label>`)}
    ${row('releg', 'Clause de relégation', '0 %', `<select id="nL">${[0, 10, 20, 30, 50].map(v => `<option ${v === (t.relegPct || 0) ? 'selected' : ''}>${v}</option>`).join('')}</select><small>% de baisse</small>`, 'baisse de salaire si le club descend')}
    <tr class="nego-sep"><td colspan="5">Primes de performance</td></tr>
    ${attaque ? row('primes', 'Prime par but', fmtE(dm.goalBonus), n('nPG', t.goalBonus, 1000)) : ''}
    ${attaque ? row('primes', 'Prime par passe décisive', fmtE(dm.assistBonus), n('nPA', t.assistBonus, 1000)) : ''}
    ${row('primes', 'Prime par match joué', fmtE(dm.appBonus), n('nPM', t.appBonus, 1000))}
    ${defense ? row('primes', 'Prime par clean sheet', fmtE(dm.csBonus), n('nPC', t.csBonus, 1000), '60 minutes jouées sans encaisser') : ''}
    ${row('objectif', 'Prime d\'objectif collectif', fmtE(dm.objBonus), n('nPO', t.objBonus, 10000), 'si l\'objectif du président est atteint')}
  </tbody></table>`;
}
function lireContrat(t) {
  const v = id => { const e = $('#' + id); return e ? (e.type === 'checkbox' ? e.checked : e.tagName === 'SELECT' && isNaN(+e.value) ? e.value : +e.value || 0) : undefined; };
  const o = { wageM: v('nW'), signOn: v('nS'), agentFee: v('nA') ?? t.agentFee ?? 0, raise: v('nR'), loyalty: v('nF'), yrs: v('nY'), status: $('#nT')?.value ?? t.status, clause: v('nC'), option: v('nO'),
    relegPct: v('nL'), goalBonus: v('nPG') ?? 0, assistBonus: v('nPA') ?? 0, appBonus: v('nPM'), csBonus: v('nPC') ?? 0, objBonus: v('nPO') };
  return o;
}
function panneauContrat(p, t, dm, opts) {
  const v = verdictContrat(p, t, dm, opts);
  return `<div class="nego-bilan"><div><small>Chances d'accord (estimation de ton adjoint)</small><b class="${v.bloque ? 'neg' : v.S >= .95 ? 'pos' : v.S >= .88 ? 'warn' : 'neg'}">${chancesTxt(v)}</b></div>
    <div class="nego-jauge">${jauge(v.S)}<small>${Math.round(v.S * 100)} % de ses attentes</small></div>
    <div><small>Coût sur la durée</small><b>${fmtE(t.wageM * 12 * t.yrs * (1 + (t.raise || 0) / 100 * (t.yrs - 1) / 2) + (t.signOn || 0) + (t.agentFee || 0) + primesAttendues(p, t) * t.yrs + (t.loyalty || 0))}</b></div></div>`;
}
function brancherContrat(p, t, dm, opts) {
  const maj = () => {
    Object.assign(t, lireContrat(t));
    const z = $('#negoBilan'); if (z) z.innerHTML = panneauContrat(p, t, dm, opts);
    const S = Object.fromEntries(satisfactionContrat(p, t, dm).L.map(x => [x.cle, x.s]));
    $$('#negoTable tr[data-cle]').forEach(tr => { const c = tr.querySelector('.satc'); if (c) c.innerHTML = jauge(S[tr.dataset.cle] ?? 1); });
    opts?.majCout?.(t);
  };
  $$('#negoTable input, #negoTable select').forEach(e => { e.oninput = maj; e.onchange = maj; });
  $('#negoTout')?.addEventListener('click', () => { Object.assign(t, { ...dm, prio: undefined, status: dm.status, clause: dm.clauseMin || t.clause || 0 }); delete t.prio; $('#negoTable').innerHTML = lignesContrat(p, t, dm, opts); brancherContrat(p, t, dm, opts); maj(); });
}

// ---------- 1. contrat d'une recrue (étape « conditions » d'une négociation) ----------
if (typeof dealDemands === 'function') {
  const __dealDemandsN = dealDemands;
  dealDemands = function (d) { __dealDemandsN.apply(this, arguments); const p = getPlayer(G, d.pid); if (p && d.demand) d.demand = demandeDetaillee(p, d.demand); };
}
if (typeof openDeal === 'function') {
  const __openDealN = openDeal;
  openDeal = function (id) {
    const d = (G.deals || []).find(x => x.id === id || x.id === +id);
    if (!d || d.status !== 'terms') return __openDealN.apply(this, arguments);
    const p = getPlayer(G, d.pid), seller = d.from != null ? getClub(G, d.from) : null;
    if (!d.demand?.prio) d.demand = demandeDetaillee(p, d.demand || {});
    const dm = d.demand;
    d.brouillon ||= { wageM: roundMoney(dm.wageM * .9), yrs: dm.yrs, status: dm.status, signOn: roundMoney(dm.signOn * .8), agentFee: dm.agentFee, clause: dm.clauseMin || 0,
      goalBonus: dm.goalBonus, assistBonus: dm.assistBonus, appBonus: dm.appBonus, csBonus: dm.csBonus, objBonus: dm.objBonus, raise: 0, loyalty: 0, relegPct: 0, option: false };
    const t = d.brouillon;
    modal(`<h2>Contrat : ${esc(p.name)}</h2>
      <div class="row gap">${avatar(p, 50)}<div><small>${ROLES[p.pos].label} · ${p.age} ans · ${esc(p.pers || '')} · ${seller ? `accord trouvé avec ${esc(seller.name)} (${fmtE(d.offer.fee)})` : 'joueur libre'}</small>
        <br><small class="muted">Ses priorités : ${Object.keys(dm.prio).map(k => ({ statut: 'temps de jeu', salaire: 'salaire', clause: 'clause libératoire', objectif: 'ambition sportive', primes: 'primes de performance', duree: 'sécurité (durée)', fidelite: 'fidélité', signature: 'prime à la signature', releg: 'pas de clause de relégation' }[k])).join(', ') || 'équilibrées'}</small></div></div>
      ${dealSteps(d.status)}
      <div id="negoBilan">${panneauContrat(p, t, dm)}</div>
      <div id="negoTable" class="tbl-wrap">${lignesContrat(p, t, dm)}</div>
      <div id="costBox" class="mt"></div>
      <p class="hint">${d.alternatives ? `L'agent évoque ${d.alternatives} autre(s) piste(s) : ses exigences en tiennent compte. ` : ''}Masse salariale ${wageM(wageBill(G))} sur ${wageM(G.board.wageCap)} · patience de l'agent : ${'●'.repeat(Math.max(0, d.patience))}${'○'.repeat(Math.max(0, 4 - d.patience))}. Chaque proposition refusée use sa patience.</p>
      <div class="row gap mt wrap"><button class="btn danger" id="dNo">Rompre les discussions</button><div class="grow"></div><button class="btn" id="negoTout">Reprendre toutes ses demandes</button><button class="btn primary" id="dTerms">Proposer ces conditions</button></div><p class="hint" id="dResp"></p>`, 'wide');
    const majCout = x => { const b = $('#costBox'); if (b && typeof costHTML === 'function' && typeof contractCost === 'function') b.innerHTML = costHTML(contractCost(p, { ...x, addOn: d.offer.addOn || 0 }, d.from != null ? d.offer.fee : 0, d.offer.plan)); };
    brancherContrat(p, t, dm, { majCout }); majCout(t);
    $('#dNo').onclick = () => { dealFail(d, 'Négociation interrompue par ton club.'); closeModal(); refresh(); };
    $('#dTerms').onclick = () => {
      Object.assign(t, lireContrat(t));
      const v = verdictContrat(p, t, dm);
      if (!v.ok && v.club) return toast(`Offre non envoyée : ${v.bloque}`, 'err'); // bloquée chez nous : l'agent n'en sait rien
      d.terms = { ...t }; d.log.push(`${weekLabel(G)} : conditions proposées (${fmtE(t.wageM)}/mois, ${t.yrs} ans) → ${v.ok ? 'acceptées' : (v.bloque || `${Math.round(v.S * 100)} % de ses attentes`)}`);
      if (v.ok) { d.status = 'medical'; d.respond = G.week + 1; delete d.brouillon; save(); closeModal(); toast(`Accord personnel avec ${p.name} ! Visite médicale la semaine prochaine.`); refresh(); return; }
      d.patience--;
      if (d.patience <= 0) { dealFail(d, `L'agent de ${p.name} rompt les discussions (${v.bloque || 'offre trop éloignée'}).`); closeModal(); refresh(); return; }
      save(); openDeal(d.id);
      // l'agent indique le point qui le gêne le plus
      const pire = satisfactionContrat(p, t, dm).L.filter(x => x.s < .97).sort((a, b) => (a.s - 1) * a.w - (b.s - 1) * b.w)[0];
      $('#dResp').innerHTML = `❌ ${esc(v.bloque || `Refusé : ${Math.round(v.S * 100)} % de ses attentes.`)}${pire && !v.bloque ? ` L'agent insiste surtout sur : <b>${esc(pire.label.toLowerCase())}</b>.` : ''}`;
    };
  };
}
// recrue signée : les clauses détaillées passent dans son contrat
if (typeof dealComplete === 'function') {
  const __dealCompleteN = dealComplete;
  dealComplete = function (d) {
    const r = __dealCompleteN.apply(this, arguments);
    if (d.status === 'done' && d.terms) { const p = getPlayer(G, d.pid); if (p) p.deal = { ...(p.deal || {}), ...clausesDe(d.terms) }; }
    return r;
  };
}
function clausesDe(t) { return { assistBonus: t.assistBonus || 0, csBonus: t.csBonus || 0, objBonus: t.objBonus || 0, raise: t.raise || 0, loyalty: t.loyalty || 0, relegPct: t.relegPct || 0, option: !!t.option, optionUsed: false }; }

// ---------- 2. prolongation ----------
if (typeof renewModal === 'function') {
  const __renewModalN = renewModal;
  renewModal = function (pid) {
    const p = getPlayer(G, pid);
    if (!p || p.noRenew === G.season || p.wantsOut) return __renewModalN.apply(this, arguments);
    const askW = Math.max(p.wage, demandWage(G, p, myClub(G))) * (1.05 + (p.morale < 50 ? .3 : 0) + (p.pers === 'Ambitieux' ? .15 : 0) + (p.contract <= 1 ? .08 : 0));
    const askM = monthly(askW), rank = clubPlayers(G, G.clubId).filter(x => playerOvr(x) > playerOvr(p)).length;
    const dm = demandeDetaillee(p, { wageM: askM, yrs: p.age >= 31 ? 1 : p.age <= 23 ? 5 : 3, status: typeof defaultStatus === 'function' ? defaultStatus(rank, p.age) : (p.status || 'rot'), signOn: roundMoney(askM * 2), agentFee: roundMoney(askM), clauseMin: 0 });
    p.renewPatience ??= 3;
    const t = { wageM: askM, yrs: dm.yrs, status: p.status || dm.status, signOn: dm.signOn, agentFee: dm.agentFee, clause: p.clause || 0, goalBonus: p.deal?.goalBonus || 0, assistBonus: p.deal?.assistBonus || 0,
      appBonus: p.deal?.appBonus || 0, csBonus: p.deal?.csBonus || 0, objBonus: p.deal?.objBonus || 0, raise: 0, loyalty: 0, relegPct: 0, option: false };
    const opts = { renouvellement: true, majCout: x => { const b = $('#renewalProjection'); if (b && typeof renewalProjection === 'function' && typeof renewalProjectionHTML === 'function') b.innerHTML = renewalProjectionHTML(renewalProjection(G, p, { wageM: x.wageM, years: x.yrs, bonus: x.signOn, clause: x.clause || 0 })); } };
    modal(`<h2>Prolonger ${esc(p.name)}</h2>
      <p>Contrat actuel : ${contractEnd(p, true)} · ${wageM(p.wage)} · ${esc(p.pers || '')} · moral ${Math.round(p.morale)}</p>
      <div id="negoBilan">${panneauContrat(p, t, dm, opts)}</div>
      <div id="negoTable" class="tbl-wrap">${lignesContrat(p, t, dm, opts)}</div>
      <div id="renewalProjection" class="mt"></div>
      <p class="hint">Patience de l'agent : ${'●'.repeat(p.renewPatience)}${'○'.repeat(Math.max(0, 3 - p.renewPatience))}. Un joueur en fin de contrat peut partir libre le 30 juin.</p>
      <div class="row gap mt wrap"><div class="grow"></div><button class="btn" id="negoTout">Reprendre toutes ses demandes</button><button class="btn primary" id="ok">Proposer la prolongation</button></div><p id="resp" class="hint"></p>`, 'wide');
    brancherContrat(p, t, dm, opts); opts.majCout(t);
    $('#ok').onclick = () => {
      Object.assign(t, lireContrat(t));
      const v = verdictContrat(p, t, dm, opts);
      if (v.ok) {
        flow(G, myClub(G), -(t.signOn + t.agentFee), 'agents');
        p.wage = weekly(t.wageM); p.contract = t.yrs; p.clause = t.clause; p.contractSim = false; p.status = t.status; p.morale = clamp(p.morale + 10, 0, 100); p.renewPatience = 3;
        p.deal = { ...(p.deal || {}), signOn: t.signOn, agentFee: t.agentFee, goalBonus: t.goalBonus, appBonus: t.appBonus, ...clausesDe(t), signed: `${weekLabel(G)} ${G.season}` };
        news(G, `✍ ${p.name} prolonge jusqu'en juin ${G.season + t.yrs} (${fmtE(t.wageM)}/mois).`, 'transfer');
        save(); closeModal(); toast(`${p.name} prolonge !`); refresh();
      } else if (v.club) { // bloqué chez nous (président, trésorerie, montants) : rien n'est envoyé à l'agent
        $('#resp').innerHTML = `⛔ Offre non envoyée : ${esc(v.bloque)}`;
      } else {
        p.renewPatience--; p.morale = clamp(p.morale - 3, 0, 100);
        if (p.renewPatience <= 0) { p.noRenew = G.season; closeModal(); news(G, `${p.name} rompt les discussions de prolongation. Il partira libre en fin de contrat si rien ne change.`, 'warn'); save(); return toast(`${p.name} met fin aux discussions.`, 'err'); }
        save(); $('#resp').innerHTML = `❌ ${esc(v.bloque || `Refusé : ${Math.round(v.S * 100)} % de ses attentes.`)} Patience restante : ${p.renewPatience}.`;
      }
    };
  };
}

// ---------- 3. offre au club vendeur ----------
function valeurOffreEtendue(G, o, p) { return typeof dealValue === 'function' ? dealValue(G, o, p) : o.fee; } // dealValue compte déjà les nouveaux points (voir plus bas)
function lignesOffre(p, o, myPlayers) {
  const n = (id, v, step = 100000) => `<input id="${id}" type="number" min="0" step="${step}" value="${v || 0}">`;
  return `<table class="tbl nego"><thead><tr><th>Point</th><th>Ta proposition</th><th>Effet pour le vendeur</th></tr></thead><tbody>
    <tr class="nego-sep"><td colspan="3">Argent</td></tr>
    <tr><td><b>Indemnité</b></td><td>${n('oF', o.fee)}</td><td><small>Le cœur de l'offre.</small></td></tr>
    <tr><td><b>Échéancier</b></td><td><select id="oP">${PAY_PLANS.map(x => `<option value="${x.k}" ${o.plan === x.k ? 'selected' : ''}>${x.label}</option>`).join('')}</select></td><td><small>Plus c'est étalé, moins il valorise l'indemnité.</small></td></tr>
    <tr class="nego-sep"><td colspan="3">Bonus et clauses</td></tr>
    <tr><td><b>Bonus après 25 matchs</b></td><td>${n('oA', o.addOn)}</td><td><small>Compté à 45 % de sa valeur.</small></td></tr>
    <tr><td><b>Bonus après 15 buts</b></td><td>${n('oG', o.addOnGoals)}</td><td><small>Intéressant surtout pour un attaquant.</small></td></tr>
    <tr><td><b>% à la revente</b></td><td><select id="oS">${[0, 10, 15, 20, 30].map(v => `<option ${v === (o.sellOn || 0) ? 'selected' : ''}>${v}</option>`).join('')}</select></td><td><small>Ils touchent ce % de la plus-value future.</small></td></tr>
    <tr><td><b>Clause de rachat</b></td><td>${n('oB', o.buyBack)}<small>0 = aucune · valable 2 saisons</small></td><td><small>Ils pourront le racheter à ce prix : rassurant pour eux.</small></td></tr>
    <tr><td><b>Joueur inclus</b></td><td><select id="oW"><option value="">— Aucun —</option>${myPlayers.map(x => `<option value="${x.id}" ${o.swap === x.id ? 'selected' : ''}>${esc(x.name)} (${x.pos}, ${money(x.value)})</option>`).join('')}</select></td><td><small>Valorisé s'il comble un besoin chez eux.</small></td></tr>
  </tbody></table>`;
}
function bilanOffre(p, o) {
  const ask = sellerAsk(G, p, myClub(G)), v = valeurOffreEtendue(G, o, p), r = v / ask;
  const flou = knows(G, p) ? 0 : .08; // moins bien renseigné, estimation plus prudente
  const txt = r >= 1 + flou ? 'Offre probablement acceptée' : r >= .9 ? 'Proche de leurs attentes : contre-offre probable' : r >= .78 ? 'En dessous : contre-offre ou refus' : 'Très en dessous : refus probable';
  const total = o.fee + (o.addOn || 0) + (o.addOnGoals || 0);
  return `<div class="nego-bilan"><div><small>Réaction attendue (estimation de ton directeur sportif)</small><b class="${r >= 1 + flou ? 'pos' : r >= .9 ? 'warn' : 'neg'}">${txt}</b></div>
    <div class="nego-jauge">${jauge(Math.min(1.2, r * 1.0))}<small>${flou ? 'joueur non supervisé : estimation approximative' : 'joueur supervisé'}</small></div>
    <div><small>Coût maximal</small><b>${fmtE(total)}</b></div></div>`;
}
if (typeof offerModal === 'function') {
  const __offerModalN = offerModal;
  offerModal = function (pid) {
    const p = getPlayer(G, pid); if (!p) return;
    const ex = G.deals.find(d => d.pid === pid && !['done', 'failed'].includes(d.status));
    const seller = p.club != null ? getClub(G, p.club) : null;
    if (ex || !seller || p.club === G.clubId || !windowOpen(G) || G.board.ban || effectifPro(G).length >= 32) return __offerModalN.apply(this, arguments);
    const me = myClub(G), known = knows(G, p);
    const myPlayers = clubPlayers(G, G.clubId).filter(x => !x.loan).sort((a, b) => b.value - a.value);
    const o = { fee: roundMoney(p.value * .9), plan: 'cash', addOn: 0, addOnGoals: 0, sellOn: 0, buyBack: 0, swap: null };
    modal(`<h2>Offre de transfert : ${esc(p.name)}</h2>
      <div class="row gap">${avatar(p, 56)}<div><p>${ROLES[p.pos].label} · ${p.age} ans · ${ovrCell(p)} ${potCell(p)}</p>
        <p>${crest(seller, 18)} ${esc(seller.name)} · valeur estimée <b>${money(p.value)}</b> · contrat ${contractEnd(p)}${p.clause && known ? ` · clause <b>${money(p.clause)}</b>` : ''}</p></div></div>
      ${dealSteps('club_wait')}
      <p>${typeof transferBudgetLine === 'function' ? transferBudgetLine(G) : `Budget transferts : <b>${money(G.board.transfer)}</b>`} · trésorerie ${money(me.budget)}</p>
      <div id="negoBilan">${bilanOffre(p, o)}</div>
      <div id="negoTable" class="tbl-wrap">${lignesOffre(p, o, myPlayers)}</div>
      <p class="hint">Le club répond la semaine suivante (acceptation, contre-offre ou refus motivé). Viennent ensuite le contrat du joueur, la visite médicale et ta confirmation finale.</p>
      <div class="row gap mt">${p.clause && known ? `<button class="btn" id="clz">💥 Payer la clause (${money(p.clause)})</button>` : ''}<div class="grow"></div><button class="btn primary" id="ok">Envoyer l'offre</button></div><p id="resp" class="hint"></p>`, 'wide');
    const lire = () => ({ fee: +$('#oF').value || 0, plan: $('#oP').value, addOn: +$('#oA').value || 0, addOnGoals: +$('#oG').value || 0, sellOn: +$('#oS').value || 0, buyBack: +$('#oB').value || 0, swap: $('#oW').value ? +$('#oW').value : null });
    const maj = () => { Object.assign(o, lire()); $('#negoBilan').innerHTML = bilanOffre(p, o); };
    $$('#negoTable input, #negoTable select').forEach(e => { e.oninput = maj; e.onchange = maj; });
    const check = x => { const nowPay = x.fee * PAY_PLANS.find(k => k.k === x.plan).now; return x.fee > availableTransfer(G) + 1 || nowPay > me.budget ? `Le président refuse : budget transferts disponible insuffisant (${money(availableTransfer(G))}) ou trésorerie insuffisante. Baisse l'indemnité, étale le paiement ou vends un joueur.` : ''; };
    $('#ok').onclick = () => { const x = lire(), e = check(x); if (e) return $('#resp').innerHTML = '❌ ' + esc(e); createDeal(p, seller, x); };
    $('#clz')?.addEventListener('click', () => { const x = { fee: p.clause, plan: 'cash', addOn: 0, sellOn: 0, swap: null, viaClause: true }, e = check(x); if (e) return $('#resp').innerHTML = '❌ ' + esc(e); createDeal(p, seller, x); });
  };
}
// le club vendeur juge l'offre avec les nouveaux points
if (typeof dealValue === 'function') {
  const __dealValueN = dealValue;
  dealValue = function (G, deal, p) { let v = __dealValueN.apply(this, arguments); v += (deal.addOnGoals || 0) * (['BU', 'AG', 'AD', 'MOC'].includes(p.pos) ? .35 : .1); if (deal.buyBack) v += p.value * (deal.buyBack <= p.value * 1.6 ? .12 : .05); return v; };
}
// transfert conclu : bonus aux buts et clause de rachat enregistrés sur le joueur
if (typeof dealComplete === 'function') {
  const __dealCompleteN2 = dealComplete;
  dealComplete = function (d) {
    const r = __dealCompleteN2.apply(this, arguments);
    if (d.status === 'done' && d.from != null) {
      const p = getPlayer(G, d.pid);
      if (p && d.offer.addOnGoals) p.addOnGoals = { club: d.from, amount: d.offer.addOnGoals, need: 15, base: p.stats?.goals || 0 };
      if (p && d.offer.buyBack) p.buyBack = { club: d.from, fee: d.offer.buyBack, until: G.season + 2 };
    }
    return r;
  };
}

// ---------- application des clauses pendant la partie ----------
if (typeof applyMatch === 'function') {
  const __applyMatchN = applyMatch;
  applyMatch = function (G, mt, f) {
    const r = __applyMatchN.apply(this, arguments);
    try {
      const me = myClub(G); let total = 0;
      for (const id in mt.pr) {
        const x = mt.pr[id]; if (!x.min) continue; const p = getPlayer(G, +id); if (!p || p.club !== G.clubId || !p.deal) continue;
        if (p.deal.assistBonus && x.a) total += p.deal.assistBonus * x.a;
        const enc = x.side === 0 ? mt.score[1] : mt.score[0];
        if (p.deal.csBonus && x.min >= 60 && enc === 0 && ['GB', 'DC', 'DG', 'DD'].includes(p.pos)) total += p.deal.csBonus;
        if (p.addOnGoals && (p.stats?.goals || 0) - p.addOnGoals.base >= p.addOnGoals.need) { const c = getClub(G, p.addOnGoals.club); if (c) { flow(G, me, -p.addOnGoals.amount, 'transfers'); flow(G, c, p.addOnGoals.amount, 'sales'); news(G, `Bonus de transfert (15 buts de ${p.name}) versé à ${c.name} : ${money(p.addOnGoals.amount)}.`, 'transfer'); } delete p.addOnGoals; }
      }
      if (total > 0) { if (typeof FLOW_LABEL !== 'undefined') FLOW_LABEL = 'Primes de match (contrats)'; flow(G, me, -total, 'agents'); if (typeof FLOW_LABEL !== 'undefined') FLOW_LABEL = null; }
    } catch (e) { console.error(e); }
    return r;
  };
}
if (typeof endSeason === 'function') {
  const __endSeasonN = endSeason;
  endSeason = function (G) {
    let divAvant = null, atteint = false;
    try {
      const L = clubLeague(G, G.clubId); divAvant = L?.div;
      const rang = L ? standings(G, L.id).findIndex(r => r.id === G.clubId) + 1 : 99; atteint = rang > 0 && rang <= (G.objective || 0);
      const me = myClub(G);
      for (const p of clubPlayers(G, G.clubId)) {
        if (!p.deal) continue;
        if (atteint && p.deal.objBonus) { flow(G, me, -p.deal.objBonus, 'agents'); }
        if (p.deal.loyalty && p.contract <= 1) { flow(G, me, -p.deal.loyalty, 'agents'); news(G, `🎗 Prime de fidélité versée à ${p.name} (${money(p.deal.loyalty)}).`, 'info'); p.deal.loyalty = 0; }
      }
      if (atteint) news(G, '🎯 Objectif atteint : les primes d\'objectif prévues dans les contrats sont versées.', 'info');
      // clauses de rachat : le club d'origine peut racheter son ancien joueur
      for (const p of clubPlayers(G, G.clubId)) {
        const b = p.buyBack; if (!b) continue;
        if (G.season >= b.until) { delete p.buyBack; continue; }
        const c = getClub(G, b.club);
        if (c && c.budget > b.fee * 1.2 && p.value > b.fee * 1.25) {
          flow(G, c, -b.fee, 'transfers'); flow(G, me, b.fee, 'sales'); logTransfer(G, p, G.clubId, c.id, b.fee, 'clause de rachat');
          if (typeof removeFromTactics === 'function') removeFromTactics(p.id); p.club = c.id; p.num = null; delete p.buyBack;
          news(G, `🔁 ${c.name} active sa clause de rachat : ${p.name} repart pour ${money(b.fee)}.`, 'transfer');
        }
      }
    } catch (e) { console.error(e); }
    const r = __endSeasonN.apply(this, arguments);
    try {
      const L2 = clubLeague(G, G.clubId), relegue = divAvant != null && L2 && L2.div > divAvant;
      for (const p of clubPlayers(G, G.clubId)) {
        if (!p.deal) continue;
        if (p.deal.raise) p.wage = Math.round(p.wage * (1 + p.deal.raise / 100));
        if (relegue && p.deal.relegPct) { p.wage = Math.round(p.wage * (1 - p.deal.relegPct / 100)); p.deal.relegPct = 0; news(G, `⬇ Clause de relégation : le salaire de ${p.name} baisse.`, 'info'); }
      }
    } catch (e) { console.error(e); }
    return r;
  };
}
// option d'une année supplémentaire : à lever depuis la fiche du joueur en dernière année
if (typeof playerModal === 'function') {
  const __playerModalN = playerModal;
  playerModal = function (pid) {
    const r = __playerModalN.apply(this, arguments);
    const p = getPlayer(G, pid);
    if (p && p.club === G.clubId && p.deal?.option && !p.deal.optionUsed && p.contract <= 1) {
      $('#modal .pm-head')?.insertAdjacentHTML('afterend', `<div class="alert">Option d'une année supplémentaire disponible dans son contrat. <button class="btn sm primary" id="leverOpt">Lever l'option (+1 an aux mêmes conditions)</button></div>`);
      $('#leverOpt').onclick = () => { p.contract += 1; p.deal.optionUsed = true; news(G, `📄 Option levée : ${p.name} est sous contrat une saison de plus.`, 'transfer'); save(); toast('Option levée.'); playerModal(pid); };
    }
    return r;
  };
}
