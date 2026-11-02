// ============================================================
//  Économie : chaque championnat / pays a sa propre richesse
//  (droits TV, prix des billets, salaires, sponsors, merchandising),
//  budgets fixés par le président, dette, DNCG, sponsor maillot.
// ============================================================
const COUNTRY_ECO = { ENG: 1.7, ESP: 1.3, GER: 1.25, ITA: 1.15, FRA: 1, POR: .6, NED: .65, BEL: .5, CRO: .35, SRB: .3, SUI: .5, DEN: .45, TUR: .55, AUT: .5, SCO: .45, CZE: .35, GRE: .35, POL: .3, SWE: .4, NOR: .4 };
const SPONSOR_BRANDS = ['Volta Énergie', 'Kerys Télécom', 'Atlas Assurances', 'Nordis Banque', 'Solano Airlines', 'Brava Sport', 'Lumen Auto', 'Orka Mobile', 'Vertigo Boissons', 'Helios Solaire', 'Kaïros Immobilier', 'Mistral Logistique', 'Pixelia Jeux', 'Azur Croisières'];
const TICKET_LEVELS = [{ m: .6, label: 'Très bas' }, { m: .8, label: 'Bas' }, { m: 1, label: 'Normal' }, { m: 1.25, label: 'Élevé' }, { m: 1.6, label: 'Très élevé' }];
const INC_LABELS = { tv: 'Droits TV', gate: 'Billetterie', merch: 'Merchandising', sponsor: 'Sponsors', prize: 'Primes de compétitions', sales: 'Ventes de joueurs', owner: 'Apport de l\'actionnaire', other: 'Divers' };
// actionnaires : cover = part des pertes de la saison épongée, inject = apport de début de saison (part des recettes prévues)
const OWNER_TYPES = {
  asso: { label: 'Association (socios)', cover: 0, inject: 0, purse: 0, desc: 'Aucun apport : le club vit uniquement de ses recettes.' },
  local: { label: 'Actionnaire local', cover: .35, inject: 0, purse: 3e6, desc: 'Éponge une partie des pertes, sans folie.' },
  fonds: { label: 'Fonds d\'investissement', cover: .5, inject: .06, purse: 12e6, desc: 'Investit en début de saison mais veut des comptes équilibrés.' },
  mecene: { label: 'Mécène', cover: .9, inject: .12, purse: 25e6, desc: 'Comble presque toutes les pertes, dans la limite de sa fortune.' }
};
// part des recettes que le club peut consacrer aux salaires, par niveau (1re division, 2e, etc.)
const WAGE_RATIO = [.66, .75, .8];
const DNCG_LABELS = { ok: 'Comptes validés', encadrement: 'Masse salariale encadrée', interdiction: 'Interdiction de recruter' };
const EXP_LABELS = { wages: 'Salaires des joueurs', staff: 'Salaires du staff', facilities: 'Fonctionnement des installations', maintenance: 'Entretien du stade', transfers: 'Achats de joueurs', agents: 'Commissions d\'agents / primes', travel: 'Déplacements', interest: 'Intérêts de la dette', build: 'Travaux' };

function defaultLeagueEco(rank) {
  return rank === 0 ? { tv: 320e6, ticket: 26, coef: 1 } : rank === 1 ? { tv: 70e6, ticket: 13, coef: .35 } : { tv: 15e6, ticket: 9, coef: .2 };
}
// économie d'un championnat (modifiable dans l'éditeur via W.eco['L1'] = { tv, ticket, coef })
function leagueEcoByDiv(W, div) {
  const divs = [...new Set(W.clubs.filter(c => !c.foreign).map(c => c.div || 1))].sort((a, b) => a - b);
  return { ...defaultLeagueEco(Math.max(0, divs.indexOf(div))), ...((W.eco || {})['L' + div] || {}) };
}
function leagueEco(G, comp) { return leagueEcoByDiv(G, comp.div); }
function clubEco(W, c) {
  if (c.foreign) { const k = COUNTRY_ECO[c.country] ?? .8; return { coef: k, ticket: 28 * k, tv: 0 }; }
  return leagueEcoByDiv(W, c.div || 1);
}
function wageFactor(W, c) { return c ? .55 + .45 * clubEco(W, c).coef : 1; }
function demandWage(W, p, c) { return roundMoney(calcWage(p) * wageFactor(W, c)); }

function emptyFin(hist = []) {
  return { inc: Object.fromEntries(Object.keys(INC_LABELS).map(k => [k, 0])), exp: Object.fromEntries(Object.keys(EXP_LABELS).map(k => [k, 0])), hist };
}
// mouvement d'argent (positif = recette, négatif = dépense), comptabilisé pour le club du joueur
function flow(G, club, v, cat) {
  if (!club || !v) return;
  club.budget += v;
  if (club.id === G.clubId && G.fin?.inc) {
    if (v >= 0) G.fin.inc[cat] = (G.fin.inc[cat] || 0) + v;
    else G.fin.exp[cat] = (G.fin.exp[cat] || 0) - v;
  }
  if (club.led) {
    if (v >= 0) club.led.inc[cat] = (club.led.inc[cat] || 0) + v;
    else club.led.exp[cat] = (club.led.exp[cat] || 0) - v;
  }
}
function emptyLedger() { return { inc: {}, exp: {} }; }
function ledgerTotals(led) {
  const inc = Object.values(led?.inc || {}).reduce((s, v) => s + v, 0), exp = Object.values(led?.exp || {}).reduce((s, v) => s + v, 0);
  return { inc, exp, res: inc - exp };
}
function clubWages(G, c) {
  let w = 0;
  for (const p of clubPlayers(G, c.id)) w += p.loan?.inLoan ? p.wage * (p.loan.share ?? 1) : p.wage;
  return w;
}

// ---------- Recettes hebdomadaires ----------
function weeklyMerch(G, c) {
  const star = c.id === G.clubId ? 1 + clubPlayers(G, c.id).filter(p => playerOvr(p) >= 80).length * .05 + Math.min(.3, (c.trophies || []).filter(t => t.season >= G.season - 2).length * .1) : 1;
  return 10000 * Math.pow(c.rep / 50, 5.7) * clubEco(G, c).coef * star;
}
function baseSponsor(G, c) { return 25000 * Math.pow(c.rep / 50, 3.2) * clubEco(G, c).coef; }
function facilitiesCost(G) { const f = G.fac || {}; return ((f.training || 2) * 12000 + (f.youth || 2) * 8000 + (f.medical || 2) * 6000) * clubEco(G, myClub(G)).coef; }
function staffCost(G) { return Object.values(G.staff || {}).reduce((s, l) => s + staffWage(l, G), 0); }

function weeklyFinances(G) {
  const R = leagueRoundsTotal(G) || 38;
  for (const L of leagueComps(G)) {
    const eco = leagueEco(G, L), n = L.clubs.length, sumRep = L.clubs.reduce((s, id) => s + getClub(G, id).rep, 0);
    for (const id of L.clubs) { const c = getClub(G, id); flow(G, c, eco.tv * (.5 / n + .25 * c.rep / sumRep) / R, 'tv'); }
  }
  for (const c of G.clubs) {
    const mine = c.id === G.clubId;
    let wages = clubWages(G, c);
    for (const p of G.players) if (p.loan?.inLoan && p.loan.from === c.id) wages += p.wage * (1 - (p.loan.share ?? 1));
    flow(G, c, -wages, 'wages');
    if (c.foreign) { flow(G, c, wages * (1.02 + rnd() * .03), 'other'); continue; }
    flow(G, c, weeklyMerch(G, c), 'merch');
    flow(G, c, mine && G.sponsor ? G.sponsor.weekly : baseSponsor(G, c), 'sponsor');
    flow(G, c, -c.capacity * .4, 'maintenance');
    if (mine) { flow(G, c, -staffCost(G), 'staff'); flow(G, c, -facilitiesCost(G), 'facilities'); }
    if (c.budget < 0) flow(G, c, c.budget * .0015, 'interest');
  }
  // sponsor : choix automatique si le joueur traîne
  if (!G.sponsor && G.sponsorOffers?.length && leagueRoundAt(G) >= 2) {
    G.sponsor = { ...G.sponsorOffers[0] }; G.sponsorOffers = null;
    news(G, `Faute de décision, le président a signé avec ${G.sponsor.name} (sponsor maillot).`, 'board');
  }
}

// ---------- Billetterie ----------
function clubFormPts(c) { const r = c.recent || []; return r.length ? r.reduce((s, x) => s + x, 0) / (r.length * 3) : .5; }
function ticketPrice(G, f) {
  const H = getClub(G, f.h), eco = clubEco(G, H);
  const m = H.id === G.clubId ? TICKET_LEVELS[G.ticket ?? 2].m : 1;
  return eco.ticket * (.8 + H.rep / 250) * m * (isEuroComp(f.comp) ? 1.5 : f.comp === 'CUP' ? .8 : f.comp === 'SUP' ? 1.1 : 1);
}
function attendanceFor(G, f, weather) {
  const H = getClub(G, f.h), A = getClub(G, f.a);
  const m = H.id === G.clubId ? TICKET_LEVELS[G.ticket ?? 2].m : 1;
  let d = .42 + H.rep / 230 + A.rep / 600 + (clubFormPts(H) - .5) * .25 + (f.comp === 'CUP' ? .03 : isEuroComp(f.comp) ? .12 : f.comp === 'SUP' ? .08 : 0) + (weather?.att || 0);
  if (A.rep > H.rep + 10) d += .05; // grosse affiche
  d *= Math.pow(m, -.6);
  if (H.id === G.clubId) d *= .9 + (G.fans ?? 60) / 500;
  return Math.round(H.capacity * clamp(d + rnd() * .06, .15, 1));
}

// ---------- Président : budgets ----------
function projectedWeeklyIncome(G) {
  const c = myClub(G), L = clubLeague(G, c.id);
  const R = leagueRoundsTotal(G) || 38;
  let tv = 0;
  if (L) { const eco = leagueEco(G, L), n = L.clubs.length, sumRep = L.clubs.reduce((s, id) => s + getClub(G, id).rep, 0); tv = eco.tv * (.5 / n + .25 * c.rep / sumRep + .25 / n) / R; }
  const gate = c.capacity * .75 * clubEco(G, c).ticket * (.8 + c.rep / 250) * .5;
  return tv + gate + weeklyMerch(G, c) + (G.sponsor?.weekly || baseSponsor(G, c));
}
function setBoardBudgets(G) {
  const c = myClub(G);
  if (!c.plan || c.plan.season !== G.season) planClubBudget(G, c);
  const P = c.plan, wages = wageBill(G);
  G.board.dncg = c.dncg || 'ok';
  G.board.ban = c.dncg === 'interdiction';
  if (G.board.ban) {
    G.board.wageCap = roundMoney(wages);
    G.board.transfer = 0;
  } else if (c.dncg === 'encadrement') {
    G.board.wageCap = roundMoney(Math.min(wages, P.wageCap));
    G.board.transfer = 0;
  } else {
    G.board.wageCap = roundMoney(Math.max(wages * 1.02, P.wageCap - staffCost(G)));
    G.board.transfer = roundMoney(P.transfer);
  }
}
function wageBill(G) { return clubPlayers(G, G.clubId).reduce((s, p) => s + (p.loan?.inLoan ? p.wage * (p.loan.share ?? 1) : p.wage), 0); }

function makeSponsorOffers(G) {
  const c = myClub(G), base = baseSponsor(G, c);
  const b = shuffle(SPONSOR_BRANDS.slice());
  G.sponsorOffers = [
    { name: b[0], kind: 'Sécurité', weekly: roundMoney(base * 1.05), seasons: 3, objBonus: 0, winBonus: 0 },
    { name: b[1], kind: 'Équilibre', weekly: roundMoney(base * .85), seasons: 2, objBonus: roundMoney(base * 15), winBonus: roundMoney(base * .25) },
    { name: b[2], kind: 'Ambition', weekly: roundMoney(base * .6), seasons: 1, objBonus: roundMoney(base * 40), winBonus: roundMoney(base * .8) }
  ];
  news(G, `💼 Trois marques veulent s'afficher sur ton maillot ! Choisis ton sponsor dans Finances (avant la 3e journée).`, 'board');
}

// ---------- Fin de saison ----------
function seasonEndFinances(G, S, L) {
  for (const comp of L) {
    const eco = leagueEco(G, comp), t = standings(G, comp.id), n = t.length, W = n * (n + 1) / 2;
    t.forEach((r, i) => flow(G, getClub(G, r.id), eco.tv * .25 * (n - i) / W, 'tv'));
  }
  const me = myClub(G);
  if (G.sponsor) {
    if (S.met && G.sponsor.objBonus) { flow(G, me, G.sponsor.objBonus, 'sponsor'); news(G, `💼 ${G.sponsor.name} verse une prime d'objectif de ${money(G.sponsor.objBonus)} !`, 'board'); }
    G.sponsor.seasons--;
    if (G.sponsor.seasons <= 0) { news(G, `Le contrat avec ${G.sponsor.name} arrive à son terme.`, 'board'); G.sponsor = null; }
  }
}
function parachutes(G, relegatedIds, topComp) {
  const eco = leagueEco(G, topComp);
  for (const id of relegatedIds) {
    const v = roundMoney(eco.tv * .03);
    flow(G, getClub(G, id), v, 'tv');
    if (id === G.clubId) news(G, `Indemnité de relégation (« parachute ») : ${money(v)} versés par la ligue.`, 'board');
  }
}
// contrôle de gestion (type DNCG) : sanction graduée selon la dette rapportée aux recettes
function dncgLevel(c) {
  const rev = Math.max(1e6, c.plan?.revT || 0), r = c.budget / rev;
  return c.budget >= 0 || r > -.1 ? 'ok' : r > -.3 ? 'encadrement' : 'interdiction';
}
function financialControl(G) {
  const me = myClub(G);
  const out = [];
  for (const c of domesticClubs(G)) {
    const before = c.dncg || 'ok', lvl = dncgLevel(c);
    c.dncg = lvl;
    if (c.id === G.clubId) {
      G.board.dncg = lvl; G.board.ban = lvl === 'interdiction';
      if (lvl === 'ok' && before !== 'ok') news(G, '⚖ Contrôle de gestion : les comptes sont assainis, les sanctions sont levées.', 'board');
      if (lvl === 'encadrement') { G.board.conf = clamp(G.board.conf - 6, 0, 100); news(G, `⚖ Contrôle de gestion : dette de ${money(-me.budget)}. Masse salariale encadrée : elle ne peut plus augmenter et les achats doivent être financés par des ventes.`, 'board'); out.push('cap'); }
      if (lvl === 'interdiction') { G.board.conf = clamp(G.board.conf - 15, 0, 100); news(G, `⚖ Contrôle de gestion : dette de ${money(-me.budget)}. Interdiction de recruter (hors agents libres) et masse salariale gelée.`, 'board'); out.push('ban'); }
    } else if (lvl !== 'ok') {
      const best = clubPlayers(G, c.id).filter(p => !p.loan).sort((a, b) => b.value - a.value)[0];
      if (best) { best.listed = true; news(G, `⚖ ${c.name}, épinglé par le contrôle de gestion (${DNCG_LABELS[lvl].toLowerCase()}), doit vendre : ${best.name} est sur le marché.`, 'transfer', true); }
    }
  }
  return out;
}

// ============================================================
//  Budget prévisionnel des clubs (tous les clubs du pays)
// ============================================================
function assignOwner(c) {
  if (c.foreign || OWNER_TYPES[c.owner?.type]) return;
  const r = rnd();
  const t = c.rep >= 75 ? (r < .35 ? 'fonds' : r < .6 ? 'mecene' : 'local') : c.rep >= 60 ? (r < .2 ? 'fonds' : r < .32 ? 'mecene' : r < .85 ? 'local' : 'asso') : (r < .06 ? 'mecene' : r < .72 ? 'local' : 'asso');
  c.owner = { type: t, purse: ownerPurse(t, c.rep) };
}
function ownerPurse(t, rep) { return roundMoney((OWNER_TYPES[t]?.purse || 0) * Math.pow(rep / 60, 3)); }
function divLevel(G, c) { return Math.max(0, leagueComps(G).findIndex(L => L.div === c.div)); }

// recettes attendues sur la saison, avec les mêmes formules que les recettes réelles
function clubForecast(G, c) {
  const R = leagueRoundsTotal(G) || 38, L = clubLeague(G, c.id), eco = clubEco(G, c), mine = c.id === G.clubId;
  const f = { tv: 0, gate: 0, merch: 0, sponsor: 0, prize: 0 };
  let avgOpp = c.rep, home = 0;
  if (L) {
    const le = leagueEco(G, L), n = L.clubs.length, reps = L.clubs.map(id => getClub(G, id).rep), sumRep = reps.reduce((s, v) => s + v, 0);
    const rank = reps.filter(v => v > c.rep).length, W = n * (n + 1) / 2;
    f.tvW = le.tv * (.5 / n + .25 * c.rep / sumRep);
    f.tv = f.tvW + le.tv * .25 * (n - rank) / W;
    avgOpp = (sumRep - c.rep) / Math.max(1, n - 1); home = n - 1;
  }
  const m = mine ? TICKET_LEVELS[G.ticket ?? 2].m : 1;
  let att = clamp(.45 + c.rep / 230 + avgOpp / 600, .15, 1);
  if (mine) att = clamp(att * Math.pow(m, -.6) * (.9 + (G.fans ?? 60) / 500), .15, 1);
  const price = eco.ticket * (.8 + c.rep / 250) * m;
  f.gate = home * c.capacity * att * price;
  const euro = euroComps(G).find(C => C.teams?.includes(c.id));
  if (euro) { f.gate += 4 * c.capacity * Math.min(1, att + .12) * price * 1.5; f.prize = euro.prize.part * 1.35; }
  f.gate += c.capacity * att * price * .8 * .9; // coupe nationale (1 à 2 matchs à domicile en moyenne)
  f.merch = weeklyMerch(G, c) * R;
  f.sponsor = (mine && G.sponsor ? G.sponsor.weekly : baseSponsor(G, c)) * R;
  return f;
}
function clubFixedCosts(G, c) {
  const R = leagueRoundsTotal(G) || 38, coef = clubEco(G, c).coef, mine = c.id === G.clubId;
  const L = clubLeague(G, c.id), away = L ? L.clubs.length - 1 : 0;
  let v = c.capacity * .4 * R + away * 25000 * coef;
  if (euroComps(G).some(C => C.teams?.includes(c.id))) v += 4 * 180000 * coef;
  if (mine) v += (staffCost(G) + facilitiesCost(G)) * R;
  return v;
}
function planClubBudget(G, c, inject = 0) {
  const R = leagueRoundsTotal(G) || 38, fc = clubForecast(G, c);
  const revT = fc.tv + fc.gate + fc.merch + fc.sponsor + fc.prize;
  const fixed = clubFixedCosts(G, c), own = OWNER_TYPES[c.owner?.type] || OWNER_TYPES.local;
  let ratio = (WAGE_RATIO[divLevel(G, c)] ?? .78) + own.cover * .06;
  if (c.dncg && c.dncg !== 'ok') ratio -= .08;
  const wages = clubWages(G, c);
  // la trésorerie au-delà de 30 % des recettes est réinvestie (en partie) dans les salaires
  const wageCap = Math.min(revT * (ratio + .14), revT * ratio + Math.max(0, c.budget - revT * .3) * .35) / R;
  const reserve = revT * .08;
  const surplus = revT - Math.max(wages, wageCap * .9) * R - fixed;
  let transfer = Math.max(0, surplus) * .6 + Math.max(0, c.budget - reserve) * .5 + inject;
  transfer = Math.min(transfer, Math.max(0, c.budget + Math.max(0, surplus) * .3));
  if (c.dncg && c.dncg !== 'ok') transfer = 0;
  c.plan = { season: G.season, rev: fc, revT, fixed, ratio, wageCap: roundMoney(wageCap), transfer: roundMoney(transfer), transfer0: roundMoney(transfer), inject, wages0: wages };
  return c.plan;
}
// début de saison : apports des actionnaires, puis budget de chaque club
function planSeasonBudgets(G, withInject = true) {
  for (const c of domesticClubs(G)) {
    assignOwner(c);
    c.led ||= emptyLedger();
    c.owner.used = 0;
    let inj = 0;
    const own = OWNER_TYPES[c.owner.type];
    if (withInject && own.inject && c.dncg !== 'interdiction' && c.budget < 40e6) {
      const fc = clubForecast(G, c), revT = fc.tv + fc.gate + fc.merch + fc.sponsor + fc.prize;
      inj = roundMoney(Math.min(c.owner.purse * .5, own.inject * revT));
      if (inj > 0) { flow(G, c, inj, 'owner'); c.owner.used = inj; }
    }
    const P = planClubBudget(G, c, inj);
    // clubs IA : revalorisations salariales (prolongations, primes) quand la marge le permet
    if (c.id !== G.clubId && P.wages0 > 0 && P.wages0 < P.wageCap * .88) {
      const k = Math.min(1.25, P.wageCap * .92 / P.wages0);
      for (const p of clubPlayers(G, c.id)) if (!p.loan) p.wage = roundMoney(p.wage * k);
      P.wages0 = clubWages(G, c);
    }
    if (c.id === G.clubId && inj > 0) news(G, `💶 ${OWNER_TYPES[c.owner.type].label} : apport de ${money(inj)} pour la nouvelle saison.`, 'board');
  }
}
function boardBudgetNews(G) {
  const c = myClub(G), P = c.plan; if (!P) return;
  news(G, `📋 Budget ${G.season}/${String(G.season + 1).slice(2)} présenté par le président : recettes prévues ${money(P.revT)}, plafond salarial ${money(G.board.wageCap)}/sem., budget transferts ${money(G.board.transfer)}.`, 'board');
}
// dépenses des clubs IA dans le cadre de leur budget
function aiTransferRoom(c) { return c.plan && !c.foreign ? Math.min(c.plan.transfer, Math.max(0, c.budget)) : Math.max(0, c.budget * .4); }
function aiCanBuy(G, c, fee, wage = 0) {
  if (c.foreign) return c.budget > fee;
  if (c.dncg === 'interdiction' && fee > 0) return false;
  if (fee > aiTransferRoom(c)) return false;
  if (wage && c.plan && clubWages(G, c) + wage > c.plan.wageCap * 1.05) return false;
  return true;
}
function aiSpend(c, fee) { if (c.plan && !c.foreign) c.plan.transfer = roundMoney(Math.max(0, c.plan.transfer - fee)); }
function aiReceive(c, fee) { if (c.plan && !c.foreign && c.dncg !== 'interdiction') c.plan.transfer = roundMoney(c.plan.transfer + fee * .5); }
// clubs IA au-dessus de leur plafond : mise en vente du plus gros salaire
function aiWageControl(G) {
  for (const c of domesticClubs(G)) {
    if (c.id === G.clubId || !c.plan) continue;
    const w = clubWages(G, c);
    if (w > c.plan.wageCap * 1.1 || (c.dncg && c.dncg !== 'ok')) {
      const sq = clubPlayers(G, c.id).filter(p => !p.loan && !p.listed);
      if (sq.length <= 20) continue;
      const p = sq.sort((a, b) => b.wage - a.wage)[rint(0, 2)];
      if (p) p.listed = true;
    }
  }
}
// point budgétaire au mercato d'hiver : les recettes suivent-elles le prévisionnel ?
function midSeasonReview(G) {
  const R = leagueRoundsTotal(G) || 38, k = leagueRoundAt(G) / R;
  for (const c of domesticClubs(G)) {
    const P = c.plan; if (!P || !c.led) continue;
    const exp = (P.rev.tvW + P.rev.gate + P.rev.merch + P.rev.sponsor) * k + P.rev.prize * .75;
    const got = ['tv', 'gate', 'merch', 'sponsor', 'prize'].reduce((s, x) => s + (c.led.inc[x] || 0), 0);
    const d = got - exp;
    P.mid = { exp, got };
    if (c.dncg && c.dncg !== 'ok') continue;
    let adj = 0;
    if (d < -.05 * exp) adj = -Math.min(P.transfer, -d * .8);
    else if (d > .05 * exp) adj = d * .5;
    P.transfer = roundMoney(Math.max(0, P.transfer + adj));
    if (c.id === G.clubId) {
      G.board.transfer = roundMoney(Math.max(0, G.board.transfer + adj));
      if (adj < 0) news(G, `📉 Point budgétaire de mi-saison : recettes inférieures de ${money(-d)} au prévisionnel. Le président retire ${money(-adj)} du budget transferts.`, 'board');
      else if (adj > 0) news(G, `📈 Point budgétaire de mi-saison : recettes supérieures de ${money(d)} au prévisionnel. Le président ajoute ${money(adj)} au budget transferts.`, 'board');
      else news(G, '📋 Point budgétaire de mi-saison : les recettes sont conformes au prévisionnel.', 'board');
    }
  }
}
// fin de saison : l'actionnaire éponge une partie des pertes, bilan archivé
function ownersCoverLosses(G) {
  for (const c of domesticClubs(G)) {
    if (!c.led || !c.owner) continue;
    const own = OWNER_TYPES[c.owner.type], t = ledgerTotals(c.led);
    if (t.res < 0 && own.cover > 0 && c.budget < (c.plan?.revT || 0) * .1) {
      const v = roundMoney(Math.min(-t.res * own.cover, Math.max(0, c.owner.purse - (c.owner.used || 0))));
      if (v > 0) {
        flow(G, c, v, 'owner'); c.owner.used = (c.owner.used || 0) + v;
        if (c.id === G.clubId) news(G, `💶 ${own.label} : il éponge ${money(v)} des ${money(-t.res)} de pertes de la saison.`, 'board');
      }
    }
  }
}
function archiveAccounts(G) {
  for (const c of domesticClubs(G)) {
    if (!c.led) continue;
    const t = ledgerTotals(c.led);
    c.accounts = [...(c.accounts || []), { season: G.season, div: c.div, inc: Math.round(t.inc), exp: Math.round(t.exp), res: Math.round(t.res), wages: Math.round(c.led.exp.wages || 0), budget: Math.round(c.budget), prev: Math.round(c.plan?.revT || 0) }].slice(-6);
    c.ledPrev = c.led; c.led = emptyLedger();
  }
}
// clause de relégation : les salaires baissent de 30 % en cas de descente
function relegationWageCut(G, ids) {
  for (const id of ids) {
    for (const p of clubPlayers(G, id)) if (!p.loan?.inLoan) p.wage = roundMoney(p.wage * .7);
    if (id === G.clubId) news(G, '✂ Clause de relégation : tous les salaires de l\'effectif baissent de 30 %.', 'board');
  }
}
