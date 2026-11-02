// ============================================================
//  Marché cohérent (lot 4)
//  - réservation des sommes engagées dans les négociations
//  - coût total des contrats : garanti / attendu / exposition maximale, échéancier
//  - primes de but / de match réellement payées, une seule fois par événement
//  - exigences selon les alternatives du joueur, statut négocié à part
//  - demandes de joueurs comparables après une grosse rémunération
//  - vente active : sonder, intermédiaire, prêt avec participation au salaire, baisse de prix
//  - clubs IA : besoin → formation, prêt, achat ou attente
// ============================================================
const OPEN_DEAL = ['club_wait', 'club_counter', 'terms', 'medical', 'medical_fail'];

// ---------- Réservations ----------
function committedFees(G, exceptId) {
  return (G.deals || []).filter(d => d.id !== exceptId && d.from != null && OPEN_DEAL.includes(d.status)).reduce((s, d) => s + (d.status === 'club_counter' ? d.counter : d.offer.fee), 0);
}
function committedWagesW(G, exceptId) {
  return (G.deals || []).filter(d => d.id !== exceptId && ['medical', 'medical_fail'].includes(d.status) && d.terms).reduce((s, d) => s + weekly(d.terms.wageM), 0);
}
function availableTransfer(G, exceptId) { return G.board.transfer - committedFees(G, exceptId); }
function transferBudgetLine(G) {
  const c = committedFees(G);
  return `Budget transferts : <b>${money(G.board.transfer)}</b>${c ? ` dont <b class="warn">${money(c)}</b> engagés dans des négociations · disponible <b>${money(availableTransfer(G))}</b>` : ''}`;
}

// ---------- Coût total d'un contrat ----------
function contractCost(p, t, fee = 0, planK = 'cash') {
  const plan = PAY_PLANS.find(x => x.k === planK) || PAY_PLANS[0];
  const goalsSeason = { BU: 12, AG: 6, AD: 6, MOC: 6, MC: 3, MDC: 1.5, DG: 1, DD: 1, DC: 1.5, GB: 0 }[p.pos] ?? 2;
  const appsSeason = 28;
  const yrs = t.yrs || 1, wageY = (t.wageM || 0) * 12;
  const guaranteed = fee + wageY * yrs + (t.signOn || 0) + (t.agentFee || 0);
  const expected = guaranteed + ((t.goalBonus || 0) * goalsSeason + (t.appBonus || 0) * appsSeason) * yrs;
  const maximum = guaranteed + ((t.goalBonus || 0) * goalsSeason * 2.5 + (t.appBonus || 0) * 50) * yrs + (t.addOn || 0);
  const sched = [{ when: 'À la signature', v: fee * plan.now + (t.signOn || 0) + (t.agentFee || 0) }];
  const rest = fee * (1 - plan.now), restSeasons = Math.max(1, Math.ceil(plan.weeks / 52));
  for (let y = 0; y < yrs; y++) sched.push({ when: `Saison ${G.season + y}/${String(G.season + y + 1).slice(2)}`, v: wageY + (y < restSeasons && plan.weeks ? rest / restSeasons : 0) });
  return { guaranteed, expected, maximum, sched, goalsSeason, appsSeason };
}
function costHTML(c) {
  return `<div class="cost"><div><small>Coût garanti</small><b>${money(c.guaranteed)}</b></div><div><small>Coût attendu</small><b>${money(c.expected)}</b><em>primes estimées : ${c.goalsSeason} buts, ${c.appsSeason} matchs/saison</em></div><div><small>Exposition maximale</small><b class="warn">${money(c.maximum)}</b></div></div>
    <small class="muted">Échéancier : ${c.sched.map(s => `${s.when} ${money(s.v)}`).join(' · ')}</small>`;
}

// ---------- Primes contractuelles : payées une fois par but / par match ----------
function bonusesWeekly(G) {
  for (const p of clubPlayers(G, G.clubId)) {
    const d = p.deal; if (!d || (!d.goalBonus && !d.appBonus)) continue;
    const seen = p.bonusSeen && p.bonusSeen.season === G.season ? p.bonusSeen : { season: G.season, goals: 0, apps: 0 };
    const ng = Math.max(0, p.stats.goals - seen.goals), na = Math.max(0, p.stats.apps - seen.apps);
    const v = ng * (d.goalBonus || 0) + na * (d.appBonus || 0);
    if (v > 0) { FLOW_LABEL = `Primes de ${p.name} (${ng} but(s), ${na} match(s))`; flow(G, myClub(G), -v, 'wages'); FLOW_LABEL = null; }
    p.bonusSeen = { season: G.season, goals: p.stats.goals, apps: p.stats.apps };
  }
}

// ---------- Exigences : alternatives du joueur, statut à part ----------
const __dealDemandsM = dealDemands;
dealDemands = function (d) {
  __dealDemandsM(d);
  const p = getPlayer(G, d.pid), o = playerOvr(p);
  const alts = G.clubs.filter(c => c.id !== G.clubId && c.id !== p.club && !c.foreign && c.rep >= o - 12 && c.budget > p.value * .8 && lineStrengthClub(G, c, p.pos) < o).length;
  d.alternatives = Math.min(alts, 8);
  d.demand.wageM = roundMoney(d.demand.wageM * (1 + Math.min(.2, d.alternatives * .025)));
  d.log.push(`L'agent évoque ${d.alternatives} autre(s) piste(s) pour son joueur.`);
};
function lineStrengthClub(G, c, pos) { const v = clubPlayers(G, c.id).filter(x => x.pos === pos).map(playerOvr).sort((a, b) => b - a); return v[0] || 0; }
const __evalTermsM = evalTerms;
evalTerms = function (d) {
  const p = getPlayer(G, d.pid), t = d.terms, dm = d.demand;
  const sGap = STATUS_ORDER.indexOf(t.status) - STATUS_ORDER.indexOf(dm.status);
  if (sGap >= 1 && (p.pers === 'Ambitieux' || playerOvr(p) >= myClub(G).rep)) return { ok: false, txt: `il veut le statut « ${STATUS[dm.status].label} » : ce point n'est pas négociable contre de l'argent.` };
  if (wageBill(G) + committedWagesW(G, d.id) + weekly(t.wageM) > G.board.wageCap) return { ok: false, txt: `le plafond salarial serait dépassé en comptant les accords déjà conclus (${wageM(committedWagesW(G, d.id))} engagés).` };
  return __evalTermsM(d);
};

// ---------- Demandes de joueurs comparables ----------
function comparableDemands(G, newcomer) {
  const nw = newcomer.wage, no = playerOvr(newcomer);
  for (const p of clubPlayers(G, G.clubId)) {
    if (p === newcomer || p.academy || p.loan) continue;
    if (playerOvr(p) < no - 4 || p.wage >= nw * .65) continue;
    const knowsIt = langOf(p) === langOf(newcomer) || influence(G, p) > 55;     // l'information circule surtout entre proches et cadres
    const temper = p.pers === 'Ambitieux' || p.pers === 'Tempérament';
    if (!knowsIt && !temper) continue;
    if (rnd() > (temper ? .45 : .2)) continue;
    addDecision(G, { key: 'raise:' + p.id + ':' + G.season, kind: 'raiseReq', ref: p.id, data: newcomer.id, blocking: false, deadline: G.week + 4, from: p.name, icon: '💶',
      title: `${p.name} demande une revalorisation`, text: `${p.name} a appris le salaire de ${newcomer.name} (${wageM(nw)}) alors qu'il touche ${wageM(p.wage)} pour un niveau comparable. Sans réponse sous 4 semaines, il le prendra mal.` });
  }
}
DECISION_OPTS.raiseReq = d => [['raise', 'Revaloriser (+25 %, +1 an)', 'primary'], ['promise', 'Promettre une révision l\'été prochain'], ['refuse', 'Refuser', 'danger']];
const __decideM = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || !['raiseReq', 'saleReport'].includes(d.kind)) return __decideM(id, opt);
  let msg = '';
  if (d.kind === 'raiseReq') {
    const p = getPlayer(G, d.ref); if (!p) { d.done = 'parti'; return; }
    if (opt === 'raise') { if (wageBill(G) + p.wage * .25 > G.board.wageCap) { toast('Plafond salarial dépassé : impossible.', 'err'); return; } p.wage = roundMoney(p.wage * 1.25); p.contract++; p.morale = clamp(p.morale + 8, 5, 100); msg = `${p.name} est revalorisé (${wageM(p.wage)}).`; }
    else if (opt === 'promise') { p.raisePromise = G.season + 1; p.morale = clamp(p.morale + 2, 5, 100); msg = `Promesse faite à ${p.name} : révision l'été prochain (suivie).`; }
    else { p.morale = clamp(p.morale - 12, 5, 100); p.trust = clamp((p.trust ?? 55) - 8, 0, 100); msg = `${p.name} est vexé.`; groupEcho(p, -1); }
  } else { msg = 'Rapport lu.'; }
  d.done = opt; d.answer = msg; save(); toast(msg);
  if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
};
function raisePromisesCheck(G) {
  if (leagueRoundAt(G) < 6) return; // jugée à la fermeture du mercato d'été
  for (const p of clubPlayers(G, G.clubId)) if (p.raisePromise && G.season >= p.raisePromise) {
    if (!p.raiseDone) { p.morale = clamp(p.morale - 15, 5, 100); p.trust = clamp((p.trust ?? 55) - 12, 0, 100); news(G, `💶 Promesse non tenue : ${p.name} attendait une revalorisation cet été.`, 'warn'); }
    else news(G, `💶 Promesse tenue : ${p.name} a été revalorisé comme convenu.`, 'info');
    delete p.raisePromise; delete p.raiseDone;
  }
}
function raiseDeadlines(G) {
  for (const d of G.decisions.filter(x => x.kind === 'raiseReq' && !x.done && G.week > x.deadline)) {
    const p = getPlayer(G, d.ref); d.done = 'silence'; d.answer = 'Sans réponse';
    if (p) { p.morale = clamp(p.morale - 8, 5, 100); news(G, `${p.name} n'a pas eu de réponse à sa demande de revalorisation : il est déçu.`, 'warn'); }
  }
}

// ---------- Vente active ----------
const SALE_MODES = { sonder: { label: 'Sonder le marché', weeks: 2, tip: 'Discret et gratuit : rapport sur les clubs intéressés, sans offre ferme.' },
  agent: { label: 'Mandater un intermédiaire', weeks: 4, tip: 'Commission de 5 % si la vente se fait ; touche plus de clubs, y compris étrangers.' },
  direct: { label: 'Proposer aux clubs', weeks: 4, tip: 'Le club démarche les clubs qui ont un besoin à ce poste.' },
  pret: { label: 'Proposer un prêt', weeks: 4, tip: 'Prêt jusqu\'à la fin de saison, avec participation au salaire.' } };
function saleBuyers(G, s, p) {
  const o = playerOvr(p), pool = G.clubs.filter(c => c.id !== G.clubId && (s.mode === 'agent' || !c.foreign));
  return pool.filter(c => {
    const best = clubPlayers(G, c.id).filter(x => x.pos === p.pos).map(x => aiPerceived(G, c, x)).sort((a, b) => b - a);
    const need = (best[0] || 0) < aiPerceived(G, c, p) || best.length < 2;
    if (!need || c.rep < o - 25 || c.rep > o + 30) return false;
    if (s.mode === 'pret') return c.budget > p.wage * 52 * (1 - s.share / 100);
    const env = (G.aiStart?.[c.id + ':' + G.season] ?? c.budget) * .4 - (G.aiSpend?.[c.id + ':' + G.season] || 0);
    return env >= s.minFee * .9;
  });
}
function saleModal(pid) {
  const p = getPlayer(G, pid), s0 = (G.sales || []).find(x => x.pid === pid && x.status === 'active');
  modal(`<h2>Vente active : ${esc(p.name)}</h2><p>${ROLES[p.pos].label} · ${p.age} ans · valeur estimée ${money(p.value)} · contrat ${contractEnd(p)} · ${wageM(p.wage)}</p>
    ${s0 ? `<p class="warn">Démarche en cours : ${SALE_MODES[s0.mode].label}, jusqu'à ${weekLabel(G, Math.min(s0.deadline, G.schedule.length - 1))}.</p>` : ''}
    <div class="form-grid"><label>Démarche <select id="slM">${Object.entries(SALE_MODES).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join('')}</select></label>
      <label>Prix demandé (€) <input id="slA" type="number" step="100000" value="${roundMoney(p.value * 1.1)}"></label><label>Prix plancher (€) <input id="slF" type="number" step="100000" value="${roundMoney(p.value * .8)}"></label>
      <label>Prêt : salaire pris en charge par l'emprunteur (%) <input id="slS" type="number" min="0" max="100" step="10" value="70"></label></div>
    <p class="hint" id="slTip">${SALE_MODES.sonder.tip}</p><p class="hint">Mettre un joueur en vente ne crée pas d'acheteur : il faut un club avec un besoin à ce poste et les moyens.</p>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="slGo">Lancer</button></div>`);
  $('#slM').onchange = e => $('#slTip').textContent = SALE_MODES[e.target.value].tip;
  $('#slGo').onclick = () => {
    const mode = $('#slM').value;
    if (mode !== 'sonder' && !windowOpen(G)) return toast('Mercato fermé : seuls les sondages sont possibles.', 'err');
    G.sales = (G.sales || []).filter(x => !(x.pid === pid && x.status === 'active'));
    G.sales.push({ id: 's' + G.decSeq++, season: G.season, pid, mode, ask: +$('#slA').value, minFee: +$('#slF').value, share: +$('#slS').value, start: G.week, deadline: G.week + SALE_MODES[mode].weeks, status: 'active', offers: 0, log: [] });
    p.listed = mode !== 'sonder';
    closeModal(); save(); toast(`${SALE_MODES[mode].label} : démarche lancée.`); refresh();
  };
}
function salesWeekly(G) {
  for (const s of (G.sales || []).filter(x => x.status === 'active')) {
    const p = getPlayer(G, s.pid);
    if (!p || p.club !== G.clubId) { s.status = 'done'; continue; }
    const buyers = saleBuyers(G, s, p);
    if (s.mode === 'sonder') {
      if (G.week >= s.deadline) {
        s.status = 'done';
        const est = buyers.map(c => ({ c, v: roundMoney(Math.min(s.ask, p.value * (.8 + (c.rep - 50) / 200))) }));
        addDecision(G, { key: 'sale:' + s.id, kind: 'saleReport', ref: s.id, blocking: false, from: 'Directeur sportif adjoint', icon: '📊', title: `Sondage du marché pour ${p.name} : ${buyers.length} club(s) intéressé(s)`,
          html: buyers.length ? `<p>Clubs avec un besoin à ce poste et les moyens (estimation, sans engagement) :</p><ul>${est.slice(0, 6).map(x => `<li>${esc(x.c.name)} — autour de ${money(x.v)}</li>`).join('')}</ul><p class="hint">Pour obtenir des offres fermes : proposer aux clubs ou mandater un intermédiaire.</p>` : '<p>Aucun club n\'a de besoin à ce poste avec les moyens nécessaires pour l\'instant. Baisser le prix ou proposer un prêt élargirait le marché.</p>', text: '' });
      }
      continue;
    }
    if (!windowOpen(G)) { s.status = 'done'; s.log.push('Mercato fermé.'); news(G, `🏷 Fin du mercato : ${p.name} reste au club faute d'accord.`, 'transfer'); continue; }
    const chance = s.mode === 'agent' ? .35 : .22;
    for (const c of buyers) {
      if (G.offers.some(o => o.pid === p.id && o.club === c.id) || rnd() > chance / Math.max(1, buyers.length / 3)) continue;
      if (s.mode === 'pret') { G.offers.push({ id: Date.now() + rint(0, 1e6), pid: p.id, club: c.id, fee: 0, type: 'loan', share: s.share, week: G.week, max: 0 }); news(G, `🔁 ${c.name} propose de prendre ${p.name} en prêt (${s.share} % du salaire).`, 'offer'); }
      else { const fee = roundMoney(Math.max(s.minFee, Math.min(s.ask, p.value * (.75 + rnd() * .35)))); G.offers.push({ id: Date.now() + rint(0, 1e6), pid: p.id, club: c.id, fee, week: G.week, max: roundMoney(Math.min(s.ask * 1.05, fee * 1.12)), sale: s.id }); news(G, `🏷 ${c.name} fait une offre de ${money(fee)} pour ${p.name}.`, 'offer'); }
      s.offers++;
    }
    if (G.week >= s.deadline) {
      s.status = 'done';
      if (!s.offers) { p.listed = false; addDecision(G, { key: 'sale:' + s.id, kind: 'info', blocking: false, from: 'Directeur sportif adjoint', icon: '🏷', title: `${p.name} : aucune offre`, text: buyers.length ? 'Des clubs ont un besoin mais aucun n\'a fait d\'offre au prix demandé. Baisser le prix ou relancer la démarche.' : 'Aucun club n\'a de besoin à ce poste avec les moyens nécessaires. Le joueur est conservé.' }); }
    }
  }
}
// vente : commission de l'intermédiaire ; prêt sortant avec participation au salaire
const __acceptOfferM = acceptOffer;
acceptOffer = function (oid) {
  const o = G.offers.find(x => x.id === oid); if (!o) return;
  const p = getPlayer(G, o.pid), c = getClub(G, o.club);
  if (o.type === 'loan') {
    G.offers = G.offers.filter(x => x.pid !== p.id);
    removeFromTactics(p.id);
    p.loan = { from: G.clubId, share: o.share / 100, inLoan: true, until: G.season }; p.club = c.id; p.num = null; p.listed = false; // inLoan + share : l'emprunteur paie sa part, le prêteur le reste
    assignNumbers(clubPlayers(G, c.id));
    logTransfer(G, p, G.clubId, c.id, 0, 'prêt');
    (G.sales || []).forEach(s => { if (s.pid === p.id && s.status === 'active') s.status = 'done'; });
    news(G, `🔁 ${p.name} est prêté à ${c.name} jusqu'à la fin de la saison (${o.share} % de son salaire pris en charge). Le temps de jeu n'est pas garanti : ${c.name} choisit ses équipes.`, 'transfer');
    save(); refresh(); return;
  }
  const s = (G.sales || []).find(x => x.pid === p.id && x.status === 'active');
  __acceptOfferM(oid);
  if (p.club !== G.clubId && s) {
    if (s.mode === 'agent') { FLOW_LABEL = `Commission de l'intermédiaire (vente de ${p.name})`; flow(G, myClub(G), -roundMoney(o.fee * .05), 'agents'); FLOW_LABEL = null; }
    s.status = 'done';
  }
};

// listing seul : plus d'acheteur automatique ; il faut un besoin réel
aiOffers = function (G) {
  if (!windowOpen(G)) return;
  const me = myClub(G);
  for (const p of clubPlayers(G, G.clubId)) {
    if (p.loan || G.offers.some(o => o.pid === p.id)) continue;
    const ovr = playerOvr(p);
    if (ovr >= me.rep + 4 && p.age <= 29 && rnd() < .035) {
      const big = G.clubs.filter(c => c.id !== G.clubId && c.rep >= me.rep + 6 && c.budget > marketValue(p) * 1.2);
      if (big.length) {
        const b = pick(big), fee = roundMoney(marketValue(p) * (1.3 + rnd() * .4));
        G.offers.push({ id: Date.now() + Math.floor(rnd() * 1e6), pid: p.id, club: b.id, fee, week: G.week, max: roundMoney(fee * 1.15), star: true });
        p.morale = clamp(p.morale + 5, 0, 100);
        news(G, `📰 ${b.name} veut ${p.name} ! Offre de ${money(fee)}.`, 'offer');
        continue;
      }
    }
    if ((G.sales || []).some(s => s.pid === p.id && s.status === 'active')) continue; // géré par la vente active
    if (rnd() > (p.listed ? .06 : .015)) continue;
    const buyers = saleBuyers(G, { mode: 'direct', minFee: marketValue(p) * .8, ask: marketValue(p) * 1.1 }, p);
    if (!buyers.length) continue;
    const b = pick(buyers), fee = roundMoney(marketValue(p) * (p.listed ? .8 + rnd() * .3 : .95 + rnd() * .45));
    G.offers.push({ id: Date.now() + Math.floor(rnd() * 1e6), pid: p.id, club: b.id, fee, week: G.week, max: roundMoney(fee * (1.05 + rnd() * .2)) });
    news(G, `${b.name} propose ${money(fee)} pour ${p.name}.`, 'offer');
  }
  G.offers = G.offers.filter(o => {
    if (G.week - o.week < 5) return true;
    if (o.star) { const p = getPlayer(G, o.pid); if (p && p.club === G.clubId) { p.morale = clamp(p.morale - 12, 5, 100); news(G, `${p.name} est déçu que son transfert vers ${getClub(G, o.club).name} n'ait pas abouti.`, 'warn'); } }
    return false;
  });
};

// ---------- Clubs IA : formation, prêt, achat ou attente ----------
const __aiTransfersM = aiTransfers;
aiTransfers = function (G) {
  if (!windowOpen(G)) return;
  G.aiPlans ||= {};
  for (const c of G.clubs) {
    if (c.id === G.clubId || c.foreign || rnd() > .1) continue;
    const key = c.id + ':' + G.season, sq = clubPlayers(G, c.id);
    if (sq.length >= 28) continue;
    const byPos = {}; for (const r of Object.keys(ROLES)) byPos[r] = sq.filter(p => p.pos === r).map(p => aiPerceived(G, c, p)).sort((a, b) => b - a)[0] || 0;
    const need = Object.keys(byPos).sort((a, b) => byPos[a] - byPos[b])[0];
    const env = (G.aiStart?.[key] ?? c.budget) * .4 - (G.aiSpend?.[key] || 0);
    // 1. formation : un jeune du club au poste, au potentiel suffisant → on attend sa progression
    const young = sq.find(p => p.pos === need && p.age <= 20 && p.pot >= byPos[need] + 6);
    if (young && rnd() < .6) { G.aiPlans[key] = { need, choice: 'formation', who: young.name, week: G.week }; continue; }
    // 2. prêt : surplus d'un club plus réputé, si l'enveloppe est faible
    if (env < sq.reduce((s, p) => s + p.value, 0) / Math.max(1, sq.length) * .5 || rnd() < .3) {
      const loan = G.players.find(p => p.pos === need && !p.loan && !p.academy && p.club != null && p.club !== c.id && p.club !== G.clubId && getClub(G, p.club).rep >= c.rep + 8
        && STATUS_ORDER.indexOf(p.status || 'rot') >= 3 && aiPerceived(G, c, p) > byPos[need] && p.age <= 24);
      if (loan) {
        const from = getClub(G, loan.club);
        loan.loan = { from: from.id, share: .5, inLoan: true, until: G.season }; loan.club = c.id; loan.num = null; assignNumbers(clubPlayers(G, c.id));
        logTransfer(G, loan, from.id, c.id, 0, 'prêt');
        G.aiPlans[key] = { need, choice: 'prêt', who: loan.name, week: G.week };
        news(G, `🔁 ${loan.name} est prêté par ${from.name} à ${c.name}.`, 'transfer', true);
        continue;
      }
    }
    G.aiPlans[key] = { need, choice: env > 0 ? 'achat' : 'attente', week: G.week };
  }
  __aiTransfersM(G); // achat dans l'enveloppe (cellule.js) — les clubs passés par formation/prêt ont déjà « continue »
};

// ---------- Interface : coût total dans la négociation, budget disponible ----------
const __openDealM = openDeal;
openDeal = function (id) {
  __openDealM(id);
  const d = G.deals.find(x => x.id === id); if (!d || d.status !== 'terms') return;
  const p = getPlayer(G, d.pid), box = document.createElement('div'); box.id = 'costBox'; box.className = 'mt';
  const anchor = $('#dTerms')?.closest('.row'); if (!anchor) return;
  anchor.parentNode.insertBefore(box, anchor);
  const upd = () => { const t = { wageM: +$('#tW').value, yrs: +$('#tY').value, signOn: +$('#tB').value || 0, agentFee: +$('#tA').value || 0, goalBonus: +$('#tG').value || 0, appBonus: +$('#tM').value || 0, addOn: d.offer.addOn || 0 };
    box.innerHTML = costHTML(contractCost(p, t, d.from != null ? d.offer.fee : 0, d.offer.plan)) + `<p class="hint">${d.alternatives ? `L'agent évoque ${d.alternatives} autre(s) piste(s) : ses exigences en tiennent compte.` : 'Peu d\'alternatives pour le joueur.'} Le statut se négocie à part : l'argent ne compense pas un statut refusé.</p>`; };
  ['#tW', '#tY', '#tB', '#tA', '#tG', '#tM'].forEach(s => $(s)?.addEventListener('input', upd)); $('#tY')?.addEventListener('change', upd);
  upd();
};
// ---------- Branchements ----------
const __gestionWeeklyM = gestionWeekly;
gestionWeekly = function (G, full) {
  __gestionWeeklyM(G, full);
  try { bonusesWeekly(G); if (full) { salesWeekly(G); raiseDeadlines(G); raisePromisesCheck(G); } } catch (e) { console.error(e); }
};
const __dealCompleteM = dealComplete;
dealComplete = function (d) { __dealCompleteM(d); const p = getPlayer(G, d.pid); if (p && p.club === G.clubId) try { comparableDemands(G, p); } catch (e) { console.error(e); } };
const __endSeasonM = endSeason;
endSeason = function (G) {
  const S = __endSeasonM(G);
  G.sales = (G.sales || []).filter(s => s.status === 'active' || G.season - (s.season || G.season) < 1).slice(-40);
  return S;
};
// une revalorisation en cours de saison tient la promesse
const __renewModalM = renewModal;
renewModal = function (pid) { __renewModalM(pid); const p = getPlayer(G, pid); const ok = $('#ok'); if (ok && p?.raisePromise) { const h = ok.onclick; ok.onclick = () => { const w = p.wage; h(); if (p.wage > w) p.raiseDone = true; }; } };

const __playerModalM = playerModal;
playerModal = function (pid, tab) {
  __playerModalM(pid, tab);
  const p = getPlayer(G, pid); if (!p || p.club !== G.clubId || p.loan) return;
  const row = $('#modal .row.gap.wrap.mt'); if (row) row.insertAdjacentHTML('afterbegin', `<button class="btn" onclick="saleModal(${p.id})">🏷 Vente active / prêt</button>`);
};
const __vDealsM = vDeals;
vDeals = function (el) {
  __vDealsM(el);
  const ss = (G.sales || []).filter(s => s.status === 'active' || G.season === s.season).slice().reverse();
  el.insertAdjacentHTML('afterbegin', `<section class="card"><h2>🏷 Ventes et prêts en cours <small>${ss.filter(s => s.status === 'active').length}</small></h2><p class="hint">${transferBudgetLine(G)}</p>
    ${ss.length ? `<table class="tbl compact">${ss.map(s => { const p = getPlayer(G, s.pid); return p ? `<tr><td class="nm">${esc(p.name)}</td><td>${SALE_MODES[s.mode].label}</td><td>${s.mode === 'pret' ? `prêt, ${s.share} % du salaire` : `demandé ${money(s.ask)} · plancher ${money(s.minFee)}`}</td><td>${s.status === 'active' ? `jusqu'à ${weekLabel(G, Math.min(s.deadline, G.schedule.length - 1))}` : 'terminé'}</td><td>${s.offers} offre(s)</td>
      <td>${s.status === 'active' && s.mode !== 'sonder' ? `<button class="btn sm" data-cut="${s.id}">Baisser de 10 %</button>` : ''}</td></tr>` : ''; }).join('')}</table>` : '<p class="muted">Aucune démarche. Depuis la fiche d\'un joueur : « Vente active / prêt ».</p>'}</section>`);
  el.querySelectorAll('[data-cut]').forEach(b => b.onclick = () => { const s = G.sales.find(x => x.id === b.dataset.cut); s.ask = roundMoney(s.ask * .9); s.minFee = roundMoney(s.minFee * .9); s.deadline = Math.max(s.deadline, G.week + 2); save(); vDeals(el); toast('Prix revu à la baisse.'); });
};
