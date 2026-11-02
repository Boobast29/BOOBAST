// ============================================================
//  Économie : chaque championnat / pays a sa propre richesse
//  (droits TV, prix des billets, salaires, sponsors, merchandising),
//  budgets fixés par le président, dette, DNCG, sponsor maillot.
// ============================================================
const COUNTRY_ECO = { ENG: 1.7, ESP: 1.3, GER: 1.25, ITA: 1.15, FRA: 1, POR: .6, NED: .65, BEL: .5, CRO: .35, SRB: .3, SUI: .5, DEN: .45 };
const SPONSOR_BRANDS = ['Volta Énergie', 'Kerys Télécom', 'Atlas Assurances', 'Nordis Banque', 'Solano Airlines', 'Brava Sport', 'Lumen Auto', 'Orka Mobile', 'Vertigo Boissons', 'Helios Solaire', 'Kaïros Immobilier', 'Mistral Logistique', 'Pixelia Jeux', 'Azur Croisières'];
const TICKET_LEVELS = [{ m: .6, label: 'Très bas' }, { m: .8, label: 'Bas' }, { m: 1, label: 'Normal' }, { m: 1.25, label: 'Élevé' }, { m: 1.6, label: 'Très élevé' }];
const INC_LABELS = { tv: 'Droits TV', gate: 'Billetterie', merch: 'Merchandising', sponsor: 'Sponsors', prize: 'Primes de compétitions', sales: 'Ventes de joueurs', other: 'Divers' };
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
    let wages = 0;
    for (const p of clubPlayers(G, c.id)) wages += p.loan?.inLoan ? p.wage * (p.loan.share ?? 1) : p.wage;
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
  return eco.ticket * (.8 + H.rep / 250) * m * (f.comp === 'EUR' ? 1.5 : f.comp === 'CUP' ? .8 : 1);
}
function attendanceFor(G, f, weather) {
  const H = getClub(G, f.h), A = getClub(G, f.a);
  const m = H.id === G.clubId ? TICKET_LEVELS[G.ticket ?? 2].m : 1;
  let d = .42 + H.rep / 230 + A.rep / 600 + (clubFormPts(H) - .5) * .25 + (f.comp === 'CUP' ? .03 : f.comp === 'EUR' ? .12 : 0) + (weather?.att || 0);
  if (A.rep > H.rep + 10) d += .05; // grosse affiche
  d *= Math.pow(m, -.6);
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
  const wages = clubPlayers(G, G.clubId).reduce((s, p) => s + p.wage, 0);
  const proj = projectedWeeklyIncome(G);
  if (G.board.ban) {
    G.board.wageCap = roundMoney(wages);
    G.board.transfer = 0;
  } else {
    G.board.wageCap = roundMoney(Math.max(wages * 1.04, proj * .72 - staffCost(G)));
    G.board.transfer = roundMoney(Math.max(0, c.budget * .55));
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
// contrôle de gestion (type DNCG)
function financialControl(G) {
  const me = myClub(G);
  const out = [];
  if (G.board.ban && me.budget >= 0) { G.board.ban = false; news(G, 'Contrôle de gestion : les comptes sont assainis, l\'interdiction de recruter est levée.', 'board'); }
  if (me.budget < -25e6) {
    G.board.ban = true; G.board.conf = clamp(G.board.conf - 15, 0, 100);
    news(G, `⚖ Contrôle de gestion : déficit de ${money(-me.budget)}. Interdiction de recruter (hors agents libres) et masse salariale gelée.`, 'board');
    out.push('ban');
  }
  for (const c of domesticClubs(G)) {
    if (c.id !== G.clubId && c.budget < -30e6) {
      const best = clubPlayers(G, c.id).sort((a, b) => b.value - a.value)[0];
      if (best) { best.listed = true; news(G, `⚖ ${c.name}, en difficulté financière, doit vendre : ${best.name} est sur le marché.`, 'transfer', true); }
    }
  }
  return out;
}
