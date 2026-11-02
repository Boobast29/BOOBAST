// ============================================================
//  Compétitions européennes au format réel :
//  3 coupes de 36 clubs (phase de ligue 8 journées, barrages,
//  8es / quarts / demies aller-retour, finale), supercoupes,
//  ~100 clubs étrangers dans 19 pays.
//  Les noms sont génériques par défaut et modifiables dans l'éditeur.
// ============================================================
const COMP_NAMES_DEF = {
  C1: 'Coupe des Champions', C2: 'Coupe d\'Europe', C3: 'Coupe de la Conférence',
  SUP: 'Supercoupe nationale', ESUP: 'Supercoupe d\'Europe', WC: 'Coupe du Monde des Nations', EURO: 'Championnat d\'Europe des Nations'
};
function compNameOf(W, id) { return W.compNames?.[id] || COMP_NAMES_DEF[id]; }
const EURO_DEF = [
  { id: 'C1', dom: 4, prize: { part: 18e6, win: 2.1e6, draw: .7e6, stage: [1e6, 11e6, 12.5e6, 15e6, 18.5e6, 6.5e6] } },
  { id: 'C2', dom: 2, prize: { part: 4.3e6, win: .45e6, draw: .15e6, stage: [.3e6, 1.75e6, 2.6e6, 4e6, 6e6, 4e6] } },
  { id: 'C3', dom: 1, prize: { part: 3.2e6, win: .4e6, draw: .13e6, stage: [.2e6, .8e6, 1.3e6, 2.5e6, 3e6, 2e6] } }
];
const KO_NAMES = ['Barrages', '8es de finale', 'Quarts de finale', 'Demi-finales', 'Finale'];
const EURO_ROUNDS = 17; // 8 journées + 2 barrages + 2 8es + 2 quarts + 2 demies + finale

// ---------- clubs étrangers ----------
const FOREIGN_PLAN = {
  ENG: [10, 70, 91, ['United', 'City', 'Rovers', 'Athletic', 'Town', 'Wanderers', 'Albion', 'County'], ['Ashbury', 'Kingsmoor', 'Redcliffe', 'Harwick', 'Thornbury', 'Lynford', 'Marston', 'Fenmouth', 'Blackwell', 'Easterly', 'Hollowgate', 'Brightmoor'], 1],
  ESP: [10, 68, 90, ['Real', 'Deportivo', 'Atlético', 'CD', 'UD', 'SD', 'Racing', 'Unión'], ['Brisamar', 'Calaterra', 'Peñaroja', 'Valdoria', 'Santaluz', 'Riomar', 'Altavega', 'Costafría', 'Montesur', 'Villaclara', 'Almenar'], 0],
  GER: [9, 68, 89, ['FC', 'SV', 'VfB', 'TSV', 'Borussia', 'Eintracht', 'SC', 'Fortuna'], ['Kaltenbrück', 'Sonnenthal', 'Eisenfurt', 'Hohenmoor', 'Talbrunn', 'Weidenstadt', 'Falkenried', 'Lindenau', 'Steinbach', 'Rotheim'], 0],
  ITA: [9, 68, 87, ['AC', 'US', 'SS', 'Sporting', 'Calcio', 'Atletico', 'Virtus'], ['Valmonte', 'Rocca Alta', 'Portoferro', 'Montesole', 'Castelvento', 'Pietralunga', 'Sanluce', 'Torrechiara', 'Belfiore', 'Acquaviva'], 0],
  POR: [7, 62, 81, ['SC', 'CD', 'FC', 'GD', 'Académico', 'União'], ['Vila Serena', 'Porto Alto', 'Ribamar', 'Montalva', 'Serradouro', 'Pinhalverde', 'Aldeia Nova', 'Castro Novo'], 0],
  NED: [7, 62, 80, ['FC', 'SC', 'SV', 'Rapid', 'VV'], ['Westerdam', 'Hoogeveld', 'Lindmeer', 'Zuidhaven', 'Oosterbroek', 'Kanaalstad', 'Veenhoven', 'Dijkzicht'], 1],
  BEL: [6, 60, 76, ['KV', 'RSC', 'Royal', 'Sporting', 'KRC', 'Cercle'], ['Hoogbeek', 'Lierveld', 'Montaval', 'Kempenaar', 'Maasveld', 'Saint-Aubert', 'Brugheide'], 0],
  TUR: [6, 60, 75, ['Spor', 'SK', 'Belediyespor'], ['Yeşilova', 'Akdağ', 'Gökhisar', 'Demirkale', 'Altınköy', 'Karaburun', 'Denizköy'], 2],
  AUT: [5, 57, 70, ['SK', 'SV', 'FC', 'Austria', 'Union'], ['Bergtal', 'Seewalden', 'Donaufeld', 'Almhofen', 'Kirchbrunn', 'Grünau'], 0],
  SCO: [5, 55, 72, ['FC', 'Athletic', 'Thistle', 'Rovers', 'Academicals'], ['Dunmarrow', 'Inverleith', 'Craigmuir', 'Glenmoor', 'Strathmore', 'Kinlochy'], 1],
  SUI: [5, 56, 72, ['FC', 'Servette', 'Grasshopper', 'BSC', 'Lausanne'], ['Seetal', 'Bergli', 'Lacmont', 'Rhonetal', 'Jurafeld', 'Aarwil'], 0],
  DEN: [5, 56, 71, ['BK', 'FC', 'IF', 'AGF'], ['Havnstrup', 'Skovbæk', 'Vestermølle', 'Fjordby', 'Kystlund', 'Søndervig'], 0],
  CRO: [4, 55, 74, ['NK', 'HNK', 'Dinamo'], ['Jadranska', 'Brodovac', 'Kamenica', 'Zelengaj', 'Primorje'], 0],
  SRB: [4, 54, 73, ['FK', 'Radnički', 'Spartak'], ['Belovar', 'Podunavlje', 'Zlatibor', 'Drinovac', 'Moravci'], 0],
  CZE: [4, 55, 70, ['FK', 'SK', 'Baník', 'Slovan'], ['Vltavice', 'Horní Lesy', 'Krkonoš', 'Brodský Dvůr', 'Lipany'], 0],
  GRE: [4, 56, 72, ['PAS', 'FC', 'Athlitikos', 'Thyella'], ['Thalassópoli', 'Akrópetra', 'Kalamaki', 'Asteroúpoli', 'Neochóri'], 0],
  NOR: [3, 55, 69, ['IL', 'FK', 'SK'], ['Fjellstad', 'Nordvika', 'Havøy', 'Skarvik'], 0],
  POL: [3, 54, 68, ['KS', 'MKS', 'Sokół'], ['Borowiec', 'Lipnica', 'Dąbrowo', 'Wisłów'], 0],
  SWE: [3, 54, 67, ['IF', 'BK', 'IFK', 'AIK'], ['Skogsvik', 'Älvstad', 'Sjöholm', 'Granberga'], 0]
};
const PALETTE = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#00838f', '#ef6c00', '#37474f', '#ad1457', '#283593', '#558b2f', '#111111', '#ffffff', '#4e342e', '#0277bd', '#d84315'];
function foreignName(country, used) {
  const [, , , pre, towns, mode] = FOREIGN_PLAN[country];
  for (let k = 0; k < 40; k++) {
    const t = pick(towns), p = pick(pre);
    const n = mode === 1 ? `${t} ${p}` : mode === 2 ? `${t}${p === 'Spor' ? 'spor' : ' ' + p}` : `${p} ${t}`;
    if (!used.has(n)) { used.add(n); return n; }
  }
  return `${pick(pre)} ${pick(towns)} ${used.size}`;
}
// complète le monde avec des clubs étrangers jusqu'aux effectifs prévus par pays
function ensureForeignPool(W) {
  if (W.noForeign) return;
  const used = new Set(W.clubs.map(c => c.name));
  let nextId = Math.max(...W.clubs.map(c => c.id)) + 1;
  NEXT_PID = Math.max(NEXT_PID, ...W.players.map(p => p.id)) + 1;
  for (const [country, [count, lo, hi]] of Object.entries(FOREIGN_PLAN)) {
    const have = W.clubs.filter(c => c.foreign && c.country === country).length;
    for (let i = have; i < count; i++) {
      const rep = Math.round(hi - (hi - lo) * (i / Math.max(1, count - 1)) + gauss() * 2);
      const name = foreignName(country, used);
      const c1 = pick(PALETTE); let c2 = pick(PALETTE); if (c2 === c1) c2 = '#ffffff';
      const pre = FOREIGN_PLAN[country][3];
      const word = name.split(' ').find(w => w.length >= 4 && !pre.includes(w)) || name.replace(/ /g, '');
      const short = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
      const club = { id: nextId++, name, short, colors: [c1, c2], rep: clamp(rep, 45, 94), div: 0, foreign: true, country,
        stadium: `Stade de ${name.split(' ').slice(-1)[0]}`, capacity: 15000 + Math.round(rep * rep * 6), budget: roundMoney(Math.pow(rep / 50, 5) * 3e6 * (COUNTRY_ECO[country] ?? .6)), logo: null, style: clubStyle(), coh: 70, trophies: [] };
      W.clubs.push(club);
      const q = 8.6 + (club.rep - 50) / 40 * 5.2;
      const squad = SQUAD_TEMPLATE.slice(0, 22).map((role, idx) => genPlayer(role, q + (idx % 3 === 0 ? 1 : idx % 3 === 1 ? 0 : -1.1) + gauss() * .9, { club: club.id, rep: club.rep, nat: rnd() < .65 ? country : undefined }));
      assignNumbers(squad);
      squad.forEach(p => { p.value = calcValue(p); p.wage = roundMoney(p.wage * (.55 + .45 * (COUNTRY_ECO[country] ?? .6))); });
      W.players.push(...squad);
    }
  }
}

// ---------- force rapide d'une équipe (matchs entre clubs étrangers) ----------
function clubPower(G, id) {
  G._pow ||= {};
  const k = id + '-' + G.week;
  if (G._pow[k]) return G._pow[k];
  const top = clubPlayers(G, id).filter(available).map(playerOvr).sort((a, b) => b - a).slice(0, 11);
  const v = top.length ? top.reduce((s, x) => s + x, 0) / top.length - (11 - top.length) * 3 : 50;
  return (G._pow[k] = v);
}
function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; }
function quickScore(sA, sB, home = true) {
  const lA = clamp(1.3 * Math.exp((sA - sB) / 11) * (home ? 1.12 : 1), .2, 4.5), lB = clamp(1.3 * Math.exp((sB - sA) / 11) / (home ? 1.12 : 1), .2, 4.5);
  return { s: [poisson(lA), poisson(lB)], xg: [lA, lB] };
}
function quickSimFixture(G, f) {
  const r = quickScore(clubPower(G, f.h), clubPower(G, f.a), !f.neutral);
  f.res = r.s; f.xg = r.xg.map(x => Math.round(x * 10) / 10); f.quick = true;
  if (isKO(f) && fixtureWinner(f) == null) {
    if (rnd() < .45) f.res[rnd() < .5 ? 0 : 1]++, f.et = true;
    else { f.et = true; const a = rint(3, 5); f.pens = rnd() < .5 ? [a, a - 1] : [a - 1, a]; }
  }
  [f.h, f.a].forEach(id => { const c = getClub(G, id); const w = fixtureWinner(f); c.recent = [...(c.recent || []), w === id ? 3 : w == null ? 1 : 0].slice(-5); });
  euroMatchPrize(G, f);
}

// ---------- mise en place ----------
const isEuroComp = id => id === 'C1' || id === 'C2' || id === 'C3' || id === 'ESUP';
function euroComps(G) { return ['C1', 'C2', 'C3'].map(id => G.comps[id]).filter(Boolean); }
function setupEuropean(G) {
  const foreign = G.clubs.filter(c => c.foreign);
  const L = leagueComps(G);
  if (foreign.length < 30 || !L.length) { for (const k of ['C1', 'C2', 'C3']) delete G.comps[k]; return; }
  const top = (G.lastTable?.length ? G.lastTable : L[0].clubs.slice().sort((a, b) => getClub(G, b).rep - getClub(G, a).rep)).filter(id => getClub(G, id) && !getClub(G, id).foreign && L[0].clubs.includes(id));
  const domQ = { C1: top.slice(0, 4), C2: top.slice(4, 6), C3: top.slice(6, 7) };
  const cw = G.lastWinners?.CUP;
  if (cw && !domQ.C1.includes(cw) && !domQ.C2.includes(cw) && L[0].clubs.includes(cw)) { domQ.C3 = [domQ.C2[1]].filter(Boolean); domQ.C2 = [domQ.C2[0], cw].filter(Boolean); }
  const fr = foreign.map(c => ({ id: c.id, k: c.rep + rnd() * 9 })).sort((a, b) => b.k - a.k).map(x => x.id);
  let used = 0;
  for (const d of EURO_DEF) {
    const dom = domQ[d.id] || [];
    const need = 36 - dom.length;
    const teams = [...dom, ...fr.slice(used, used + need)];
    used += need;
    const order = teams.slice().sort((a, b) => getClub(G, b).rep - getClub(G, a).rep);
    const pots = [0, 1, 2, 3].map(i => shuffle(order.slice(i * 9, i * 9 + 9)));
    const mixed = [];
    for (let i = 0; i < 9; i++) for (const p of pots) if (p[i] != null) mixed.push(p[i]);
    const league = makeFixtures(mixed, d.id).slice(0, 8);
    league.flat().forEach(f => { f.lp = true; });
    G.comps[d.id] = { id: d.id, type: 'euro', name: compNameOf(G, d.id), teams, league, ko: [], winner: null, prize: d.prize };
    teams.forEach(id => flow(G, getClub(G, id), d.prize.part, 'prize'));
    if (teams.includes(G.clubId)) news(G, `${compNameOf(G, d.id)} : ton club est qualifié pour la phase de ligue (36 clubs, 8 matchs). Prime : ${money(d.prize.part)}.`, 'cup');
  }
  // supercoupes
  const dom = L[0].clubs;
  const champ = G.lastWinners?.L1 ?? top[0], cupW = G.lastWinners?.CUP && G.lastWinners.CUP !== champ ? G.lastWinners.CUP : top[1];
  if (champ && cupW && getClub(G, champ) && getClub(G, cupW)) {
    G.comps.SUP = { id: 'SUP', type: 'super', name: compNameOf(G, 'SUP'), ties: [{ h: champ, a: cupW, res: null, comp: 'SUP', ko: true }], winner: null };
    if ([champ, cupW].includes(G.clubId)) news(G, `${compNameOf(G, 'SUP')} : rendez-vous en début de saison face à ${getClub(G, champ === G.clubId ? cupW : champ).name} !`, 'cup');
  } else delete G.comps.SUP;
  const e1 = G.lastWinners?.C1 ?? fr[0], e2 = G.lastWinners?.C2 && G.lastWinners.C2 !== e1 ? G.lastWinners.C2 : fr[1];
  if (e1 && e2 && getClub(G, e1) && getClub(G, e2)) G.comps.ESUP = { id: 'ESUP', type: 'super', name: compNameOf(G, 'ESUP'), ties: [{ h: e1, a: e2, res: null, comp: 'ESUP', ko: true, neutral: true }], winner: null };
  else delete G.comps.ESUP;
}
// créneaux de semaine (indexés sur les journées de championnat)
function euroSlots(R) {
  const at = x => clamp(Math.round(x * R / 38), 0, R - 1);
  return [2, 4, 6, 9, 12, 15, 18, 20, 22, 23, 25, 27, 29, 31, 33, 35, 37].map(at);
}

// ---------- matchs d'une semaine européenne ----------
function euroStage(r) { return r < 8 ? null : r === 16 ? { s: 4, leg: 0 } : { s: Math.floor((r - 8) / 2), leg: (r - 8) % 2 }; }
function euroWeekFixtures(G, r) {
  const out = [];
  for (const C of euroComps(G)) {
    if (r < 8) out.push(...(C.league[r] || []));
    else { const st = euroStage(r), stg = C.ko[st.s]; if (stg) out.push(...stg.ties.map(t => st.leg === 0 ? t.f1 : t.f2).filter(Boolean)); }
  }
  return out;
}
function euroTable(C) { return tableOf(C.teams, C.league); }
function euroMatchPrize(G, f) {
  if (!f.lp || !f.res) return;
  const C = G.comps[f.comp]; if (!C) return;
  const w = fixtureWinner(f);
  if (w) flow(G, getClub(G, w), C.prize.win, 'prize'); else { flow(G, getClub(G, f.h), C.prize.draw, 'prize'); flow(G, getClub(G, f.a), C.prize.draw, 'prize'); }
}
function mkTie(C, hi, lo, single = false) {
  if (single) return { a: hi, b: lo, f1: { h: hi, a: lo, res: null, comp: C.id, ko: true, neutral: true } };
  return { a: lo, b: hi, f1: { h: lo, a: hi, res: null, comp: C.id }, f2: { h: hi, a: lo, res: null, comp: C.id, ko: true, firstRes: null } };
}
function tieWinner(t) { return t.f2 ? fixtureWinner(t.f2) : fixtureWinner(t.f1); }
function afterEuroWeek(G, r) {
  const me = G.clubId;
  for (const C of euroComps(G)) {
    const name = C.name;
    if (r === 7) {
      const t = euroTable(C).map(x => x.id);
      C.final8 = t.slice(0, 8);
      const po = t.slice(8, 24);
      const seeds = shuffle(po.slice(0, 8)), un = shuffle(po.slice(8, 16));
      C.ko[0] = { name: KO_NAMES[0], ties: seeds.map((h, i) => mkTie(C, h, un[i])) };
      if (C.teams.includes(me)) {
        const rk = t.indexOf(me) + 1;
        news(G, `${name} : fin de la phase de ligue, ${rk}e sur 36. ${rk <= 8 ? 'Qualifié directement pour les 8es !' : rk <= 24 ? 'Direction les barrages.' : 'Éliminé.'}`, rk <= 24 ? 'cup' : 'loss');
        G.board.conf = clamp(G.board.conf + (rk <= 8 ? 6 : rk <= 24 ? 2 : -4), 0, 100);
      }
      continue;
    }
    if (r < 8) continue;
    const st = euroStage(r), stg = C.ko[st.s];
    if (!stg) continue;
    if (st.leg === 0 && st.s < 4) { for (const t of stg.ties) if (t.f1.res) t.f2.firstRes = [t.f1.res[1], t.f1.res[0]]; continue; }
    // tour terminé
    const winners = stg.ties.map(tieWinner).filter(Boolean);
    winners.forEach(id => flow(G, getClub(G, id), C.prize.stage[st.s], 'prize'));
    const mineTie = stg.ties.find(t => t.a === me || t.b === me);
    if (mineTie) news(G, tieWinner(mineTie) === me ? `${name} : qualifié ! Prochaine étape : ${KO_NAMES[st.s + 1] || 'le titre'}.` : `${name} : élimination en ${stg.name.toLowerCase()}.`, tieWinner(mineTie) === me ? 'trophy' : 'loss');
    if (st.s === 4) {
      C.winner = winners[0];
      const wc = getClub(G, C.winner);
      flow(G, wc, C.prize.stage[5], 'prize');
      wc.trophies = [...(wc.trophies || []), { season: G.season, name }];
      wc.rep = clamp(wc.rep + (C.id === 'C1' ? 3 : 1.5), 30, 97);
      news(G, `🏆 ${wc.name} remporte la ${name} !`, C.winner === me ? 'trophy' : 'info', C.winner !== me);
      if (C.winner === me) G.board.conf = clamp(G.board.conf + (C.id === 'C1' ? 25 : 12), 0, 100);
      continue;
    }
    let pool;
    if (st.s === 0) { const f8 = shuffle(C.final8.slice()), w = shuffle(winners.slice()); C.ko[1] = { name: KO_NAMES[1], ties: f8.map((h, i) => mkTie(C, h, w[i])).filter(t => t.b != null && t.a != null) }; continue; }
    pool = shuffle(winners.slice());
    const ties = [];
    for (let i = 0; i + 1 < pool.length; i += 2) ties.push(mkTie(C, pool[i], pool[i + 1], st.s + 1 === 4));
    C.ko[st.s + 1] = { name: KO_NAMES[st.s + 1], ties };
    if (st.s + 1 === 4) { const ft = ties[0]; if (ft && (ft.a === me || ft.b === me)) news(G, `🏟 FINALE de la ${name} contre ${getClub(G, ft.a === me ? ft.b : ft.a).name} !`, 'trophy'); }
  }
}
function afterSuperWeek(G, id) {
  const C = G.comps[id]; if (!C) return;
  const f = C.ties[0]; const w = fixtureWinner(f);
  if (!w) return;
  C.winner = w;
  const wc = getClub(G, w);
  wc.trophies = [...(wc.trophies || []), { season: G.season, name: C.name }];
  flow(G, wc, id === 'ESUP' ? 4e6 : 1e6, 'prize');
  news(G, `🏆 ${wc.name} remporte la ${C.name} !`, w === G.clubId ? 'trophy' : 'info', w !== G.clubId && f.h !== G.clubId && f.a !== G.clubId);
}
function euroTiesForClub(G, C, id) { return C.ko.flatMap(s => s ? s.ties : []).filter(t => t.a === id || t.b === id); }
function inEuroAlive(G, id = G.clubId) {
  for (const C of euroComps(G)) {
    if (!C.teams.includes(id) || C.winner) continue;
    if (!C.ko.length) return true;
    const last = C.ko[C.ko.length - 1];
    if (last.ties.some(t => (t.a === id || t.b === id) && !tieWinner(t))) return true;
    if (C.ko.length === 1 && C.final8?.includes(id)) return true;
    if (last.ties.some(t => tieWinner(t) === id)) return true;
  }
  return false;
}
