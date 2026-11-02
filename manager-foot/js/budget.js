// ============================================================
//  Gestion budgétaire
//  - journal comptable : chaque mouvement d'argent du club est enregistré
//    (mois × catégorie + opérations importantes), rapprochement de trésorerie
//  - budget de saison : prévision par poste, réalisé, projection de fin de saison
//  - engagements futurs : salaires garantis par saison, échéanciers de transferts
//  - structure salariale, comparaison avec la ligue
//  - rapport financier mensuel, alerte de déficit avec plan d'action
// ============================================================
const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const ONE_OFF = ['transfers', 'sales', 'agents', 'prize', 'build', 'other'];
function curMonthKey(G) { const d = dateOfWeek(G, Math.min(G.week, G.schedule.length - 1)); return d.getFullYear() * 12 + d.getMonth(); }
function monthLabel(k) { return `${MONTHS_FR[k % 12]} ${Math.floor(k / 12)}`; }
function ledgerOf(G, season = G.season) {
  G.ledger ||= {};
  return G.ledger[season] ||= { start: myClub(G).budget, months: {}, ops: [] };
}
let FLOW_LABEL = null; // libellé facultatif de l'opération en cours
const __flow = flow;
flow = function (G, club, v, cat) {
  const mine = club && v && club.id === G.clubId && G.schedule;
  const L = mine ? ledgerOf(G) : null; // solde d'ouverture pris avant le premier mouvement
  __flow(G, club, v, cat);
  if (!mine) return;
  const mk = curMonthKey(G);
  const m = L.months[mk] ||= {};
  m[cat] = (m[cat] || 0) + v;
  if (ONE_OFF.includes(cat) || Math.abs(v) >= 1e6 || FLOW_LABEL) { // toute opération nommée est détaillée
    L.ops.unshift({ w: G.week, label: weekLabel(G), cat, v: Math.round(v), txt: FLOW_LABEL || '' });
    if (L.ops.length > 400) L.ops.length = 400;
  }
};
function ledgerTotal(L) { return Object.values(L.months).reduce((a, m) => a + Object.values(m).reduce((x, y) => x + y, 0), 0); }
function reconcile(G) { const L = ledgerOf(G); return { start: L.start, moves: ledgerTotal(L), expected: L.start + ledgerTotal(L), actual: myClub(G).budget, gap: myClub(G).budget - (L.start + ledgerTotal(L)) }; }

// ---------- Budget de saison (prévision) ----------
function homeGamesLeft(G, from = G.week) { let n = 0; for (let w = from; w < G.schedule.length; w++) n += weekFixtures(G, w).filter(f => f.h === G.clubId).length; return n; }
function makeSeasonBudget(G) {
  const c = myClub(G), weeks = G.schedule.length, R = leagueRoundsTotal(G) || 38, L = clubLeague(G, c.id);
  const eco = leagueEco(G, L), n = L.clubs.length, sumRep = L.clubs.reduce((s, id) => s + getClub(G, id).rep, 0);
  const rankGuess = clamp(G.objective || Math.round(n / 2), 1, n), W = n * (n + 1) / 2;
  const homeN = Math.max(homeGamesLeft(G, 0), Math.round(R / 2));
  const fakeFx = { h: c.id, a: L.clubs.find(id => id !== c.id), comp: L.id };
  const gate = homeN * ticketPrice(G, fakeFx) * c.capacity * clamp(.42 + c.rep / 230 + .08, .15, 1);
  const inc = {
    tv: eco.tv * (.5 / n + .25 * c.rep / sumRep) + eco.tv * .25 * (n - rankGuess + 1) / W,
    gate, merch: weeklyMerch(G, c) * weeks, sponsor: (G.sponsor?.weekly || baseSponsor(G, c)) * weeks, prize: 0, sales: 0, other: 0
  };
  const exp = {
    wages: wageBill(G) * weeks, staff: staffCost(G) * weeks, facilities: facilitiesCost(G) * weeks,
    maintenance: c.capacity * .4 * weeks, transfers: payablesOwed(G), agents: 0, travel: 0, interest: c.budget < 0 ? -c.budget * .0015 * weeks : 0, build: 0
  };
  for (const k in inc) inc[k] = roundMoney(inc[k]); for (const k in exp) exp[k] = roundMoney(exp[k]);
  (G.budgetPlan ||= {})[G.season] = { inc, exp, made: weekLabel(G), weeks };
  ledgerOf(G);
  return G.budgetPlan[G.season];
}
function seasonPlan(G) { return G.budgetPlan?.[G.season] || makeSeasonBudget(G); }
function actualByCat(G) {
  const L = ledgerOf(G), a = {};
  for (const m of Object.values(L.months)) for (const [k, v] of Object.entries(m)) a[k] = (a[k] || 0) + v;
  return a;
}
function projection(G) {
  const plan = seasonPlan(G), act = actualByCat(G), frac = clamp(G.week / Math.max(1, G.schedule.length), 0, 1);
  const rows = [];
  for (const [k, l] of Object.entries(INC_LABELS)) { const p = plan.inc[k] || 0, a = Math.max(0, act[k] || 0); rows.push({ k, l, type: 'inc', plan: p, act: a, proj: ONE_OFF.includes(k) ? a : a + p * (1 - frac) }); }
  for (const [k, l] of Object.entries(EXP_LABELS)) { const p = plan.exp[k] || 0, a = Math.max(0, -(act[k] || 0)); rows.push({ k, l, type: 'exp', plan: p, act: a, proj: ONE_OFF.includes(k) ? a : a + p * (1 - frac) }); }
  const tot = t => rows.filter(r => r.type === t);
  const sum = (t, f) => tot(t).reduce((s, r) => s + r[f], 0);
  return { rows, frac, planRes: sum('inc', 'plan') - sum('exp', 'plan'), actRes: sum('inc', 'act') - sum('exp', 'act'), projRes: sum('inc', 'proj') - sum('exp', 'proj'), start: ledgerOf(G).start };
}

// ---------- Engagements futurs ----------
function commitments(G) {
  const bySeason = {};
  const add = (s, k, v) => { (bySeason[s] ||= { wages: 0, staff: 0, transfers: 0 })[k] += v; };
  const fracLeft = 1 - clamp(G.week / Math.max(1, G.schedule.length), 0, 1);
  for (const p of clubPlayers(G, G.clubId)) {
    const w = p.loan?.inLoan ? p.wage * (p.loan.share ?? 1) : p.wage;
    for (let i = 0; i < Math.max(1, p.contract || 0); i++) add(G.season + i, 'wages', w * 52 * (i === 0 ? fracLeft : 1));
  }
  for (const x of Object.values(G.staffPeople || {})) for (let i = 0; i < Math.max(1, x.contract || 1); i++) add(G.season + i, 'staff', x.wageW * 52 * (i === 0 ? fracLeft : 1));
  if (G.coach && !G.coach.interim) for (let i = 0; i < Math.max(1, G.coach.contract || 1); i++) add(G.season + i, 'staff', G.coach.wageW * 52 * (i === 0 ? fracLeft : 1));
  for (const pb of G.payables || []) if (pb.from === G.clubId) add(G.season, 'transfers', pb.total * pb.left / pb.weeks);
  const recv = (G.payables || []).filter(pb => pb.to === G.clubId).reduce((s, pb) => s + pb.total * pb.left / pb.weeks, 0);
  const addOns = clubPlayers(G, G.clubId).filter(p => p.addOn && p.addOn.count < p.addOn.need).reduce((s, p) => s + p.addOn.amount, 0);
  return { bySeason, recv, addOns };
}

// ---------- Rapport mensuel et alerte de déficit ----------
function budgetWeekly(G) {
  const mk = curMonthKey(G);
  if (G.lastMonth != null && mk !== G.lastMonth) {
    const m = ledgerOf(G).months[G.lastMonth] || {};
    const inc = Object.entries(m).filter(([, v]) => v > 0), exp = Object.entries(m).filter(([, v]) => v < 0);
    const res = Object.values(m).reduce((a, b) => a + b, 0), lab = k => INC_LABELS[k] || EXP_LABELS[k] || k;
    if (Object.keys(m).length) addDecision(G, { key: 'month:' + G.lastMonth, kind: 'info', blocking: false, from: 'Direction financière', icon: '💶',
      title: `Rapport financier — ${monthLabel(G.lastMonth)} : ${res >= 0 ? '+' : ''}${money(res)}`,
      html: `<p>Résultat du mois : <b class="${res >= 0 ? 'pos' : 'neg'}">${money(res)}</b> · trésorerie ${money(myClub(G).budget)}.</p>
        <table class="tbl compact">${inc.sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${lab(k)}</td><td class="pos">+${money(v)}</td></tr>`).join('')}${exp.sort((a, b) => a[1] - b[1]).map(([k, v]) => `<tr><td>${lab(k)}</td><td class="neg">${money(v)}</td></tr>`).join('')}</table>
        <p class="hint">Projection de fin de saison : ${money(myClub(G).budget - ledgerOf(G).start - projection(G).actRes + projection(G).projRes + ledgerOf(G).start)} de trésorerie.</p>`, text: '' });
    // alerte : trésorerie projetée négative
    const pr = projection(G), endCash = ledgerOf(G).start + pr.projRes;
    if (endCash < 0 && !(G.deficitAlert === G.season)) {
      G.deficitAlert = G.season;
      addDecision(G, { key: 'deficit:' + G.season, kind: 'deficit', from: 'Président', icon: '⚠', title: `Alerte budgétaire : ${money(endCash)} prévus au 30 juin`,
        text: `Au rythme actuel, la trésorerie sera négative en fin de saison (${money(endCash)}). Sous -25 M€, le contrôle de gestion interdit de recruter. Le président attend un plan.` });
    }
  }
  G.lastMonth = mk;
}
DECISION_OPTS.deficit = d => [['sell', 'Mettre en vente les 2 plus gros salaires non indispensables', 'primary'], ['loan', 'Emprunter à la banque (remboursé sur 2 saisons, 6 %)'], ['cut', 'Réduire les coûts (installations au minimum, -10 % staff)'], ['accept', 'Assumer le déficit', 'danger']];
const __decideB = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || d.kind !== 'deficit') return __decideB(id, opt);
  const c = myClub(G); let msg;
  if (opt === 'sell') {
    const ps = clubPlayers(G, G.clubId).filter(p => !p.loan && STATUS_ORDER.indexOf(p.status || 'rot') >= 1).sort((a, b) => b.wage - a.wage).slice(0, 2);
    ps.forEach(p => { p.listed = true; p.morale = clamp(p.morale - 6, 5, 100); });
    msg = `${ps.map(p => p.name).join(' et ')} sont placés sur la liste des transferts.`; G.board.conf = clamp(G.board.conf + 3, 0, 100);
  } else if (opt === 'loan') {
    const amt = roundMoney(Math.max(5e6, -(ledgerOf(G).start + projection(G).projRes) * 1.2));
    FLOW_LABEL = 'Emprunt bancaire'; flow(G, c, amt, 'other'); FLOW_LABEL = null;
    G.bankLoans = [...(G.bankLoans || []), { amount: amt, total: roundMoney(amt * 1.06), left: 104, weeks: 104 }];
    msg = `Emprunt de ${money(amt)} accordé : remboursement de ${money(roundMoney(amt * 1.06))} sur 2 saisons.`; G.board.conf = clamp(G.board.conf - 4, 0, 100);
  } else if (opt === 'cut') {
    G.costCut = G.season; for (const x of Object.values(G.staffPeople || {})) x.wageW = roundMoney(x.wageW * .9);
    for (const x of Object.values(G.staffPeople || {})) { if (rnd() < .25) news(G, `${x.name} accepte mal la baisse de salaire.`, 'warn'); }
    msg = 'Plan d\'économies : salaires du staff -10 %, coûts de fonctionnement réduits de 30 % jusqu\'à la fin de la saison.';
    G.board.conf = clamp(G.board.conf + 2, 0, 100);
  } else { G.board.conf = clamp(G.board.conf - 10, 0, 100); msg = 'Le président n\'apprécie pas : confiance -10.'; }
  d.done = opt; d.answer = msg; news(G, `⚠ ${d.title} — ${msg}`, 'board'); save(); toast(msg);
  if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
};
// salaire de l'entraîneur principal (mode directeur sportif) inclus dans les dépenses de staff
const __staffCostB = staffCost;
staffCost = function (G) { return __staffCostB(G) + (G.role === 'ds' && G.coach && !G.coach.interim ? G.coach.wageW : 0); };
// coûts de fonctionnement réduits ; remboursements d'emprunt
const __facilitiesCost = facilitiesCost;
facilitiesCost = function (G) { return __facilitiesCost(G) * (G.costCut === G.season ? .7 : 1); };
function loansWeekly(G) {
  G.bankLoans = (G.bankLoans || []).filter(l => { FLOW_LABEL = 'Remboursement d\'emprunt'; flow(G, myClub(G), -l.total / l.weeks, 'interest'); FLOW_LABEL = null; l.left--; return l.left > 0; });
}
const __completeWeekB = completeWeek;
completeWeek = function (G, skip) {
  ledgerOf(G);
  const r = __completeWeekB(G, skip);
  try { loansWeekly(G); budgetWeekly(G); } catch (e) { console.error(e); }
  return r;
};
const __endSeasonB = endSeason;
endSeason = function (G) {
  const S = __endSeasonB(G);
  const L = ledgerOf(G); L.end = myClub(G).budget; L.closed = true;
  return S;
};

// ---------- Écran Finances à onglets ----------
let FIN_TAB = 'overview';
const __vFinances = vFinances;
vFinances = function (el) {
  const tabs = [['overview', 'Vue d\'ensemble'], ['budget', 'Budget de la saison'], ['ledger', 'Journal comptable'], ['commit', 'Engagements futurs'], ['wages', 'Masse salariale']];
  el.innerHTML = `<section class="card"><div class="tabs">${tabs.map(([k, l]) => `<button data-ft="${k}" class="${FIN_TAB === k ? 'on' : ''}">${l}</button>`).join('')}</div></section><div id="finBody" class="col"></div>`;
  el.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { FIN_TAB = b.dataset.ft; vFinances(el); });
  const box = $('#finBody');
  if (FIN_TAB === 'overview') return withSideRng(`${G.seed}|fin|${G.week}`, () => __vFinances(box));
  if (FIN_TAB === 'budget') return finBudget(box);
  if (FIN_TAB === 'ledger') return finLedger(box);
  if (FIN_TAB === 'commit') return finCommit(box);
  return finWages(box);
};
function finBudget(el) {
  const pr = projection(G), plan = seasonPlan(G);
  const line = r => { const d = r.type === 'inc' ? r.proj - r.plan : r.plan - r.proj; return `<tr><td>${r.l}</td><td>${money(r.plan)}</td><td>${money(r.act)}</td><td>${bar(r.plan ? clamp(r.act / r.plan * 100, 0, 100) : 0, 100, r.type === 'exp' && r.act > r.plan ? 'low' : '')}</td><td>${money(r.proj)}</td><td class="${d >= 0 ? 'pos' : 'neg'}">${d >= 0 ? '+' : ''}${money(d)}</td></tr>`; };
  const endCash = pr.start + pr.projRes;
  el.innerHTML = `<div class="kpis card"><div><small>Trésorerie au début de saison</small><b>${money(pr.start)}</b></div><div><small>Résultat prévu (budget)</small><b class="${pr.planRes < 0 ? 'neg' : 'pos'}">${money(pr.planRes)}</b></div>
      <div><small>Résultat réalisé (${Math.round(pr.frac * 100)} % de la saison)</small><b class="${pr.actRes < 0 ? 'neg' : 'pos'}">${money(pr.actRes)}</b></div><div><small>Trésorerie projetée au 30 juin</small><b class="${endCash < 0 ? 'neg' : 'pos'}">${money(endCash)}</b></div></div>
    <section class="card"><h2>📒 Budget ${G.season}/${String(G.season + 1).slice(2)} <small>établi ${esc(plan.made)}</small></h2>
      <table class="tbl"><thead><tr><th>Poste</th><th>Budget</th><th>Réalisé</th><th>Consommation</th><th>Projection fin de saison</th><th>Écart / budget</th></tr></thead><tbody>
      <tr class="sec"><td colspan="6"><b>Recettes</b></td></tr>${pr.rows.filter(r => r.type === 'inc').map(line).join('')}
      <tr class="sec"><td colspan="6"><b>Dépenses</b></td></tr>${pr.rows.filter(r => r.type === 'exp').map(line).join('')}</tbody></table>
      <div class="row gap mt"><button class="btn" id="bRe">Réviser le budget (recalcul)</button><div class="grow"></div><small class="muted">Projection = réalisé + budget restant au prorata pour les postes récurrents ; transferts, primes et ventes : réalisé uniquement.</small></div>
      <p class="hint">Valeurs de simulation : droits TV selon le modèle de la ligue (50 % égalitaire, 25 % notoriété, 25 % classement), billetterie selon le stade et le prix, salaires selon les contrats de la partie. Ce ne sont pas des comptes réels de club.</p></section>`;
  $('#bRe').onclick = () => { makeSeasonBudget(G); save(); finBudget(el); toast('Budget révisé.'); };
}
function finLedger(el) {
  const L = ledgerOf(G), rc = reconcile(G), months = Object.keys(L.months).map(Number).sort((a, b) => a - b);
  const cats = [...Object.keys(INC_LABELS), ...Object.keys(EXP_LABELS)].filter(k => months.some(m => L.months[m][k]));
  const lab = k => INC_LABELS[k] || EXP_LABELS[k] || k;
  el.innerHTML = `<section class="card"><h2>🧾 Journal comptable ${G.season}/${String(G.season + 1).slice(2)}</h2>
      <div class="scroll-x"><table class="tbl compact"><thead><tr><th>Poste</th>${months.map(m => `<th>${monthLabel(m)}</th>`).join('')}<th>Total</th></tr></thead><tbody>
      ${cats.map(k => { const tot = months.reduce((s, m) => s + (L.months[m][k] || 0), 0); return `<tr><td>${lab(k)}</td>${months.map(m => { const v = L.months[m][k] || 0; return `<td class="${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}">${v ? money(v) : ''}</td>`; }).join('')}<td><b>${money(tot)}</b></td></tr>`; }).join('')}
      <tr><td><b>Résultat</b></td>${months.map(m => { const v = Object.values(L.months[m]).reduce((a, b) => a + b, 0); return `<td class="${v < 0 ? 'neg' : 'pos'}"><b>${money(v)}</b></td>`; }).join('')}<td><b>${money(rc.moves)}</b></td></tr></tbody></table></div>
      <h3>Rapprochement de trésorerie</h3><p>Solde initial ${money(rc.start)} + mouvements enregistrés ${money(rc.moves)} = <b>${money(rc.expected)}</b> · trésorerie réelle <b>${money(rc.actual)}</b> · écart <b class="${Math.abs(rc.gap) > 1 ? 'neg' : 'pos'}">${money(rc.gap)}</b>${Math.abs(rc.gap) > 1 ? ' (modification manuelle dans l\'éditeur ?)' : ' ✔ aucun argent sans écriture'}</p></section>
    <section class="card"><h2>Opérations importantes</h2>${L.ops.length ? `<table class="tbl compact">${L.ops.slice(0, 60).map(o => `<tr><td>${esc(o.label)}</td><td>${lab(o.cat)}</td><td>${esc(o.txt)}</td><td class="${o.v < 0 ? 'neg' : 'pos'}">${money(o.v)}</td></tr>`).join('')}</table>` : '<p class="muted">Aucune opération exceptionnelle.</p>'}</section>
    ${Object.keys(G.ledger || {}).filter(s => +s !== G.season).length ? `<section class="card"><h2>Saisons précédentes</h2><table class="tbl compact">${Object.entries(G.ledger).filter(([s]) => +s !== G.season).map(([s, l]) => `<tr><td>${s}/${String(+s + 1).slice(2)}</td><td>début ${money(l.start)}</td><td>résultat ${money(ledgerTotal(l))}</td><td>fin ${money(l.end ?? l.start + ledgerTotal(l))}</td></tr>`).join('')}</table></section>` : ''}`;
}
function finCommit(el) {
  const cm = commitments(G), seasons = Object.keys(cm.bySeason).map(Number).sort((a, b) => a - b);
  const total = seasons.reduce((s, y) => s + cm.bySeason[y].wages + cm.bySeason[y].staff + cm.bySeason[y].transfers, 0);
  const proj = projectedWeeklyIncome(G) * 52;
  el.innerHTML = `<div class="kpis card"><div><small>Coût total garanti (contrats en cours)</small><b>${money(total)}</b></div><div><small>Recettes annuelles estimées</small><b>${money(proj)}</b></div>
      <div><small>Échéances de transferts à recevoir</small><b class="pos">${money(cm.recv)}</b></div><div><small>Bonus conditionnels possibles</small><b>${money(cm.addOns)}</b></div></div>
    <section class="card"><h2>📅 Engagements par saison</h2><table class="tbl"><thead><tr><th>Saison</th><th>Salaires joueurs</th><th>Staff & entraîneur</th><th>Échéances transferts</th><th>Total</th><th>% des recettes estimées</th></tr></thead><tbody>
      ${seasons.map(y => { const r = cm.bySeason[y], t = r.wages + r.staff + r.transfers; return `<tr><td>${y}/${String(y + 1).slice(2)}${y === G.season ? ' (reste)' : ''}</td><td>${money(r.wages)}</td><td>${money(r.staff)}</td><td>${money(r.transfers)}</td><td><b>${money(t)}</b></td><td>${y === G.season ? '—' : Math.round(t / proj * 100) + ' %'}</td></tr>`; }).join('')}</tbody></table>
      <p class="hint">Engagements = ce que le club doit payer si personne ne part : salaires jusqu'à la fin des contrats, staff, échéances de transferts déjà signés. C'est différent de l'échéancier de trésorerie : les recettes futures n'y sont pas déduites.</p></section>
    ${(G.bankLoans || []).length ? `<section class="card"><h2>Emprunts</h2>${G.bankLoans.map(l => `<p>${money(l.amount)} empruntés · reste ${money(l.total * l.left / l.weeks)} à rembourser (${l.left} semaines)</p>`).join('')}</section>` : ''}`;
}
function finWages(el) {
  const sq = clubPlayers(G, G.clubId), tot = wageBill(G), inc = Math.max(1, projectedWeeklyIncome(G));
  const L = clubLeague(G, G.clubId), others = L.clubs.map(id => ({ c: getClub(G, id), w: clubPlayers(G, id).reduce((s, p) => s + p.wage, 0) })).sort((a, b) => b.w - a.w);
  const rank = others.findIndex(x => x.c.id === G.clubId) + 1;
  const byStatus = STATUS_ORDER.map(k => { const ps = sq.filter(p => (p.status || 'rot') === k); return { k, n: ps.length, w: ps.reduce((s, p) => s + p.wage, 0) }; });
  el.innerHTML = `<div class="kpis card"><div><small>Masse salariale</small><b>${wageM(tot)}</b></div><div><small>Ratio salaires / recettes</small><b class="${tot / inc > .7 ? 'neg' : 'pos'}">${Math.round(tot / inc * 100)} %</b><em>repère sain : < 70 %</em></div>
      <div><small>Rang dans la ligue</small><b>${rank}<sup>e</sup> / ${others.length}</b></div><div><small>Plafond fixé par le président</small><b>${wageM(G.board.wageCap)}</b></div></div>
    <div class="grid2"><section class="card"><h2>Par statut</h2><table class="tbl">${byStatus.map(x => `<tr><td>${STATUS[x.k].label}</td><td>${x.n} joueurs</td><td>${wageM(x.w)}</td><td>${bar(tot ? x.w / tot * 100 : 0, 100)} ${tot ? Math.round(x.w / tot * 100) : 0} %</td></tr>`).join('')}</table>
      <h3>Joueurs les mieux payés</h3><table class="tbl compact">${sq.slice().sort((a, b) => b.wage - a.wage).slice(0, 12).map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 22)}</td><td class="nm">${esc(p.name)}</td><td>${STATUS[p.status || 'rot'].label}</td><td>${wageM(p.wage)}</td><td>${contractEnd(p)}</td><td>${p.stats.apps} MJ</td></tr>`).join('')}</table></section>
    <section class="card"><h2>Masses salariales de ${esc(L.name)}</h2><table class="tbl compact">${others.map((x, i) => `<tr class="${x.c.id === G.clubId ? 'me' : ''}"><td>${i + 1}</td><td class="nm">${crest(x.c, 16)} ${esc(x.c.name)}</td><td>${wageM(x.w)}</td></tr>`).join('')}</table>
      <p class="hint">Salaires de simulation (non vérifiés dans la réalité).</p></section></div>`;
  el.querySelectorAll('[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}
// libellés des opérations importantes
const __dealCompleteB = dealComplete;
dealComplete = function (d) { const p = getPlayer(G, d.pid); FLOW_LABEL = p ? `Arrivée de ${p.name}` : ''; try { __dealCompleteB(d); } finally { FLOW_LABEL = null; } };
const __acceptOfferB = acceptOffer;
acceptOffer = function (oid) { const o = G.offers.find(x => x.id === oid), p = o && getPlayer(G, o.pid); FLOW_LABEL = p ? `Vente de ${p.name}` : ''; try { __acceptOfferB(oid); } finally { FLOW_LABEL = null; } };
