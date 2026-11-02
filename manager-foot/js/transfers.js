// ============================================================
//  Mercato avancé : clauses libératoires, paiements échelonnés,
//  bonus, pourcentage à la revente, échanges, prêts avec option,
//  surenchères de l'IA, dernier jour du mercato, historique.
// ============================================================
const PAY_PLANS = [
  { k: 'cash', label: 'Comptant', now: 1, weeks: 0, f: 1 },
  { k: 'y1', label: '50 % maintenant, 50 % sur 1 an', now: .5, weeks: 38, f: .93 },
  { k: 'y2', label: '30 % maintenant, 70 % sur 2 ans', now: .3, weeks: 76, f: .86 }
];

function logTransfer(G, p, from, to, fee, type = 'transfert') {
  (G.transfers ||= []).unshift({ season: G.season, label: weekLabel(G), pid: p.id, name: p.name, pos: p.pos, age: p.age, from: from ?? null, to: to ?? null, fee: Math.round(fee || 0), type });
  if (G.transfers.length > 400) G.transfers.length = 400;
}
function initClauses(W) {
  for (const p of W.players) if (p.clause === undefined) p.clause = p.club != null && rnd() < .3 ? roundMoney((p.value || calcValue(p)) * (1.6 + rnd())) : 0;
}

// paiements échelonnés, bonus, etc. (chaque semaine pleine)
function processPayables(G) {
  G.payables = (G.payables || []).filter(pb => {
    const v = pb.total / pb.weeks;
    flow(G, getClub(G, pb.from), -v, 'transfers');
    flow(G, getClub(G, pb.to), v, 'sales');
    pb.left--;
    return pb.left > 0;
  });
}
function scheduleRest(G, fromClubId, toClubId, amount, weeks) {
  if (amount <= 0 || !weeks) return;
  (G.payables ||= []).push({ from: fromClubId, to: toClubId, total: amount, weeks, left: weeks });
}
function payablesOwed(G) { return (G.payables || []).filter(p => p.from === G.clubId).reduce((s, p) => s + p.total * p.left / p.weeks, 0); }
function receivablesDue(G) { return (G.payables || []).filter(p => p.to === G.clubId).reduce((s, p) => s + p.total * p.left / p.weeks, 0); }

function onPlayerAppearance(G, p) {
  if (p.addOn && p.club === G.clubId) {
    p.addOn.count++;
    if (p.addOn.count >= p.addOn.need) {
      flow(G, myClub(G), -p.addOn.amount, 'transfers'); flow(G, getClub(G, p.addOn.club), p.addOn.amount, 'sales');
      news(G, `Bonus de transfert versé à ${getClub(G, p.addOn.club).name} : ${money(p.addOn.amount)} (${p.name} a atteint ${p.addOn.need} matchs).`, 'transfer');
      delete p.addOn;
    }
  }
}
// pourcentage à la revente dû à l'ancien club
function paySellOn(G, p, fee, seller) {
  if (!p.sellOn || !p.sellOn.pct) return 0;
  const v = roundMoney(fee * p.sellOn.pct / 100);
  const c = getClub(G, p.sellOn.club);
  if (c && c.id !== seller.id) { flow(G, seller, -v, 'transfers'); flow(G, c, v, 'sales'); if (seller.id === G.clubId) news(G, `${p.sellOn.pct} % de la vente de ${p.name} reversés à ${c.name} (${money(v)}).`, 'transfer'); }
  delete p.sellOn;
  return v;
}

// valeur perçue d'une offre par le club vendeur
function dealValue(G, deal, p) {
  const plan = PAY_PLANS.find(x => x.k === deal.plan) || PAY_PLANS[0];
  let v = deal.fee * plan.f + (deal.addOn || 0) * .45 + (deal.sellOn || 0) / 100 * p.value * .3;
  if (deal.swap) {
    const sp = getPlayer(G, deal.swap), seller = getClub(G, p.club);
    const sq = clubPlayers(G, seller.id);
    const need = sq.filter(x => x.pos === sp.pos).map(playerOvr).sort((a, b) => b - a)[0] || 0;
    v += sp.value * (playerOvr(sp) > need - 3 ? .95 : .6);
  }
  return v;
}
function sellerAsk(G, p, buyer) {
  const seller = getClub(G, p.club);
  const sq = clubPlayers(G, seller.id);
  const rank = sq.map(playerOvr).sort((a, b) => b - a).indexOf(playerOvr(p));
  const key = rank < 3 ? .5 : rank < 11 ? .3 : rank < 16 ? .1 : -.05;
  const lr = leagueRoundAt(G), R = leagueRoundsTotal(G), mid = Math.floor(R / 2);
  const deadline = lr === 5 || lr === mid + 3;
  return roundMoney(p.value * (p.listed || p.wantsOut ? .85 : 1.05 + key) * (seller.rep > buyer.rep + 10 ? 1.2 : 1) * (p.contract <= 1 ? .7 : 1) * (deadline ? 1.1 : 1));
}

// ---------- prêts entrants ----------
function canLoanIn(G, p) {
  if (!p.club || p.club === G.clubId || p.loan) return false;
  const sq = clubPlayers(G, p.club).sort((a, b) => playerOvr(b) - playerOvr(a));
  return p.age <= 24 || sq.indexOf(p) >= 13;
}
function loanInEval(G, p, share, option) {
  const seller = getClub(G, p.club), me = myClub(G);
  const sq = clubPlayers(G, seller.id).sort((a, b) => playerOvr(b) - playerOvr(a));
  const rank = sq.indexOf(p);
  if (rank < 8 && p.age > 21) return { ok: false, msg: `${seller.name} refuse : c'est un titulaire.` };
  if (share < .5 && rank < 14) return { ok: false, msg: `${seller.name} exige que tu prennes au moins 50 % du salaire.` };
  if (option && option < p.value * .9) return { ok: false, msg: `${seller.name} veut une option d'achat d'au moins ${money(roundMoney(p.value * .9))}.` };
  const myRank = clubPlayers(G, G.clubId).filter(x => x.pos === p.pos && playerOvr(x) > playerOvr(p)).length;
  if (myRank >= 2 && rnd() < .7) return { ok: false, msg: `${p.name} refuse : il ne jouerait pas assez chez toi.` };
  if (wageBill(G) + p.wage * share > G.board.wageCap) return { ok: false, msg: 'Le président refuse : plafond salarial dépassé.' };
  return { ok: true };
}
function doLoanIn(G, p, share, option) {
  const seller = getClub(G, p.club);
  p.loan = { from: seller.id, share, option: option || 0, inLoan: true };
  p.club = G.clubId; p.num = null; p.listed = false; p.status = 'rot';
  assignNumbers(clubPlayers(G, G.clubId));
  if (G.tactics.bench.length < 9) G.tactics.bench.push(p.id);
  logTransfer(G, p, seller.id, G.clubId, 0, 'prêt');
  news(G, `Prêt : ${p.name} rejoint le club en provenance de ${seller.name} jusqu'à la fin de saison${option ? ` (option d'achat ${money(option)})` : ''}.`, 'transfer');
}
function exerciseOption(G, p) {
  const seller = getClub(G, p.loan.from), fee = p.loan.option;
  if (fee > G.board.transfer || fee > myClub(G).budget) return 'Budget transferts insuffisant.';
  flow(G, myClub(G), -fee, 'transfers'); flow(G, seller, fee, 'sales'); aiReceive(seller, fee);
  G.board.transfer = roundMoney(G.board.transfer - fee);
  delete p.loan; p.contract = 3;
  logTransfer(G, p, seller.id, G.clubId, fee, 'option levée');
  news(G, `Option d'achat levée : ${p.name} est définitivement à toi (${money(fee)}).`, 'transfer');
  return '';
}

// ---------- IA : surenchères, clauses, dernier jour ----------
function aiMarketExtras(G) {
  if (!windowOpen(G)) return;
  const lr = leagueRoundAt(G), R = leagueRoundsTotal(G), mid = Math.floor(R / 2);
  const deadline = lr === 5 || lr === mid + 3;
  if (deadline && !G.deadlineNews?.[`${G.season}-${lr}`]) {
    (G.deadlineNews ||= {})[`${G.season}-${lr}`] = 1;
    news(G, '⏰ DERNIER JOUR DU MERCATO ! Les clubs s\'activent, les prix s\'envolent.', 'transfer');
    for (let i = 0; i < 2; i++) aiTransfers(G);
  }
  // surenchères après un refus
  G.rejected = (G.rejected || []).filter(r => {
    const p = getPlayer(G, r.pid);
    if (!p || p.club !== G.clubId || G.week - r.week > 3) return false;
    if (rnd() < .45) {
      const b = getClub(G, r.club);
      const fee = roundMoney(r.fee * (1.1 + rnd() * .08));
      if (aiCanBuy(G, b, fee)) {
        G.offers.push({ id: Date.now() + Math.floor(rnd() * 1e6), pid: p.id, club: b.id, fee, week: G.week, max: roundMoney(fee * 1.12), star: r.star, improved: true });
        news(G, `${b.name} revient à la charge pour ${p.name} : nouvelle offre de ${money(fee)} !`, 'offer');
      }
      return false;
    }
    return true;
  });
  // bataille pour un joueur convoité
  for (const o of G.offers.filter(o => o.star && o.week === G.week)) {
    const p = getPlayer(G, o.pid);
    const rivals = G.clubs.filter(c => c.id !== o.club && c.id !== G.clubId && c.rep >= myClub(G).rep + 4 && aiCanBuy(G, c, o.fee * 1.2) && !G.offers.some(x => x.pid === p.id && x.club === c.id));
    if (rivals.length && rnd() < .35) {
      const c = pick(rivals), fee = roundMoney(o.fee * (1.05 + rnd() * .15));
      G.offers.push({ id: Date.now() + Math.floor(rnd() * 1e6), pid: p.id, club: c.id, fee, week: G.week, max: roundMoney(fee * 1.12), star: true });
      news(G, `🔥 Bataille pour ${p.name} : ${c.name} surenchérit à ${money(fee)} !`, 'offer');
    }
    // clause libératoire
    if (p.clause && rnd() < .2) {
      const c = getClub(G, o.club);
      if (aiCanBuy(G, c, p.clause)) {
        flow(G, c, -p.clause, 'transfers'); flow(G, myClub(G), p.clause, 'sales'); aiSpend(c, p.clause);
        paySellOn(G, p, p.clause, myClub(G));
        removeFromTactics(p.id);
        p.club = c.id; p.listed = false; p.contract = rint(3, 5); p.num = null; p.status = null; assignNumbers(clubPlayers(G, c.id));
        G.offers = G.offers.filter(x => x.pid !== p.id);
        logTransfer(G, p, G.clubId, c.id, p.clause, 'clause');
        news(G, `💥 ${c.name} paie la clause libératoire de ${p.name} (${money(p.clause)}) ! Tu ne peux pas t'y opposer.`, 'transfer');
      }
    }
  }
}
