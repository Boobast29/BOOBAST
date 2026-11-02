// ============================================================
//  Football international : sélections, trêves, Coupe du Monde
//  (années paires multiples de 4 + 2 : 2030, 2034…), Euro (2028,
//  2032…), Ballon d'or. Matchs simulés rapidement (Poisson).
// ============================================================
const NATION_LEVEL = { FRA: 83, ESP: 83, ENG: 82, BRA: 83, ARG: 83, GER: 81, POR: 81, NED: 79, BEL: 78, ITA: 79, CRO: 77, URU: 76, COL: 75, SEN: 75, MAR: 76, DEN: 75, SUI: 74, SRB: 73, JPN: 73, USA: 72, POL: 72, AUT: 73, SWE: 72, TUR: 74, CZE: 71, SCO: 70, GRE: 70, NOR: 74, CIV: 74, CMR: 72, MLI: 71, ALG: 72, TUN: 70, GHA: 71 };
const EURO_NATIONS = ['FRA', 'ESP', 'POR', 'BEL', 'GER', 'ITA', 'NED', 'CRO', 'SRB', 'ENG', 'DEN', 'SUI', 'NOR', 'POL', 'AUT', 'SWE', 'TUR', 'CZE', 'SCO', 'GRE'];
function natName(code) { return NATIONS.find(n => n[0] === code)?.[1] || code; }

// sélection : les 23 meilleurs joueurs de la nationalité (+ complément virtuel si besoin)
function nationSquad(G, code) {
  const ps = G.players.filter(p => p.nat === code && p.club != null && !p.academy && p.injury <= 14).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 23);
  return ps;
}
function nationPower(G, code) {
  const sq = nationSquad(G, code).map(playerOvr).slice(0, 14);
  const lvl = NATION_LEVEL[code] ?? 68;
  while (sq.length < 14) sq.push(lvl - 6 + rnd() * 6);
  const real = sq.slice(0, 11).reduce((s, x) => s + x, 0) / 11;
  return real * .75 + lvl * .25;
}
function nationRanking(G) {
  return Object.keys(NATION_LEVEL).filter(c => NATIONS.some(n => n[0] === c)).map(c => ({ code: c, pow: nationPower(G, c) })).sort((a, b) => b.pow - a.pow);
}

// ---------- trêves internationales ----------
function intlBreak(G) {
  const mine = [];
  for (const code of Object.keys(NATION_LEVEL)) {
    const sq = nationSquad(G, code);
    sq.forEach((p, i) => {
      p.caps = (p.caps || 0) + 2;
      const att = { BU: .45, AG: .25, AD: .25, MOC: .25, MC: .1, MDC: .05 }[p.pos] || .02;
      const g = (rnd() < att * (i < 11 ? 1 : .4) ? 1 : 0) + (rnd() < att * .4 ? 1 : 0);
      p.intlGoals = (p.intlGoals || 0) + g;
      if (p.club === G.clubId) {
        mine.push(`${p.name} (${natName(code)}${g ? `, ${g} but${g > 1 ? 's' : ''}` : ''})`);
        p.morale = clamp(p.morale + 4, 5, 100); p.fit = clamp(p.fit - 8, 30, 100);
        if (rnd() < .035) applyInjury(G, p, sampleInjury(G, p, 'training'));
      }
    });
  }
  news(G, `🌍 Trêve internationale. ${mine.length ? `Sélectionnés : ${mine.join(', ')}.` : 'Aucun de tes joueurs n\'est appelé.'}`, 'info');
}

// ---------- tournois d'été ----------
function intlMatch(G, a, b, ko) {
  const r = quickScore(nationPower(G, a), nationPower(G, b), false);
  const m = { a, b, s: r.s };
  if (ko && r.s[0] === r.s[1]) { const k = rint(3, 5); m.pens = rnd() < .5 ? [k, k - 1] : [k - 1, k]; }
  // buteurs
  [a, b].forEach((code, i) => {
    const sq = nationSquad(G, code).slice(0, 16);
    for (let g = 0; g < m.s[i]; g++) {
      const sc = sq.length ? weighted(sq, p => ({ BU: 6, AG: 3, AD: 3, MOC: 3, MC: 1.2, MDC: .5, DC: .6 }[p.pos] || .3) * (p.attrs.fin + 5)) : null;
      if (sc) { sc.intlGoals = (sc.intlGoals || 0) + 1; (m.sc ||= []).push([i, sc.id]); G._tg[sc.id] = (G._tg[sc.id] || 0) + 1; }
    }
  });
  return m;
}
function intlWinner(m) { return m.s[0] !== m.s[1] ? (m.s[0] > m.s[1] ? m.a : m.b) : (m.pens[0] > m.pens[1] ? m.a : m.b); }
function playTournament(G, kind, year) {
  G._tg = {};
  const rank = nationRanking(G);
  const teams = kind === 'WC' ? rank.slice(0, 32).map(x => x.code) : rank.filter(x => EURO_NATIONS.includes(x.code)).slice(0, 16).map(x => x.code);
  const ng = teams.length / 4;
  const pots = [0, 1, 2, 3].map(i => shuffle(teams.slice(i * ng, i * ng + ng)));
  const groups = Array.from({ length: ng }, (_, gi) => ({ name: 'ABCDEFGH'[gi], teams: pots.map(p => p[gi]), matches: [] }));
  for (const g of groups) {
    const t = g.teams;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) g.matches.push(intlMatch(G, t[i], t[j], false));
    const tab = Object.fromEntries(t.map(c => [c, { code: c, pts: 0, gd: 0, gf: 0 }]));
    for (const m of g.matches) { const A = tab[m.a], B = tab[m.b]; A.gf += m.s[0]; B.gf += m.s[1]; A.gd += m.s[0] - m.s[1]; B.gd += m.s[1] - m.s[0]; if (m.s[0] > m.s[1]) A.pts += 3; else if (m.s[0] < m.s[1]) B.pts += 3; else { A.pts++; B.pts++; } }
    g.table = Object.values(tab).sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || rnd() - .5);
  }
  // 1ers contre 2es d'un autre groupe
  let alive = [];
  for (let i = 0; i < groups.length; i += 2) { const A = groups[i].table, B = groups[i + 1].table; alive.push([A[0].code, B[1].code], [B[0].code, A[1].code]); }
  const rounds = [];
  const names = alive.length === 8 ? ['8es de finale', 'Quarts de finale', 'Demi-finales', 'Finale'] : ['Quarts de finale', 'Demi-finales', 'Finale'];
  let ri = 0;
  while (alive.length) {
    const ms = alive.map(([a, b]) => intlMatch(G, a, b, true));
    rounds.push({ name: names[ri++], matches: ms });
    const w = ms.map(intlWinner);
    if (w.length === 1) { alive = []; break; }
    alive = []; for (let i = 0; i < w.length; i += 2) alive.push([w[i], w[i + 1]]);
  }
  const winner = intlWinner(rounds[rounds.length - 1].matches[0]);
  const topScorerId = Object.entries(G._tg).sort((a, b) => b[1] - a[1])[0];
  const T = { kind, year, name: compNameOf(G, kind), groups, rounds, winner, scorer: topScorerId ? { pid: +topScorerId[0], n: topScorerId[1] } : null };
  (G.intlHistory ||= []).unshift(T);
  G.intlHistory.length = Math.min(G.intlHistory.length, 8);
  // effets sur les joueurs du club
  const mine = clubPlayers(G, G.clubId).filter(p => teams.includes(p.nat) && nationSquad(G, p.nat).includes(p));
  for (const p of mine) { p.fit = clamp(p.fit - 12, 40, 100); p.caps = (p.caps || 0) + 4; if (rnd() < .05) applyInjury(G, p, sampleInjury(G, p, 'training')); }
  for (const p of nationSquad(G, winner)) { p.morale = clamp(p.morale + 15, 5, 100); p.intlTitles = (p.intlTitles || 0) + 1; p.value = roundMoney(p.value * 1.08); }
  news(G, `🌍 ${T.name} ${year} : ${natName(winner)} remporte le tournoi !${T.scorer ? ` Meilleur buteur : ${G.pmap[T.scorer.pid]?.name} (${T.scorer.n}).` : ''}${mine.length ? ` Tes joueurs présents : ${mine.map(p => p.name).join(', ')}.` : ''}`, 'trophy');
  delete G._tg;
  return T;
}
function summerTournament(G) {
  const year = G.season + 1;
  if (year % 4 === 2) return playTournament(G, 'WC', year);
  if (year % 4 === 0) return playTournament(G, 'EURO', year);
  return null;
}

// ---------- Ballon d'or ----------
function ballonDor(G, T) {
  const C1 = G.comps.C1, champ = {};
  for (const L of leagueComps(G)) { const t = standings(G, L.id); if (t[0]) champ[t[0].id] = L.div === leagueComps(G)[0].div ? 4 : 1; }
  const cands = G.players.filter(p => p.club != null && !p.academy && playerOvr(p) >= 72);
  const score = p => {
    let s = playerOvr(p) * 1.2;
    if (p.stats.apps) s += (p.stats.rating / p.stats.apps - 6.5) * 8 + p.stats.goals * .35 + p.stats.assists * .2;
    if (C1?.winner === p.club) s += 8;
    s += champ[p.club] || 0;
    if (T && T.winner === p.nat && nationSquad(G, p.nat).slice(0, 11).includes(p)) s += 7;
    if (T?.scorer?.pid === p.id) s += 4;
    return s + rnd() * 2;
  };
  const top = cands.map(p => ({ p, s: score(p) })).sort((a, b) => b.s - a.s).slice(0, 10);
  const out = { season: G.season, list: top.map(x => ({ pid: x.p.id, name: x.p.name, club: getClub(G, x.p.club)?.name, nat: x.p.nat })) };
  (G.ballon ||= []).unshift(out);
  const w = top[0]?.p;
  if (w) { w.ballons = (w.ballons || 0) + 1; news(G, `🌟 Ballon d'or ${G.season + 1} : ${w.name} (${getClub(G, w.club)?.name}, ${natName(w.nat)}) !`, w.club === G.clubId ? 'trophy' : 'info', w.club !== G.clubId); }
  return out;
}
