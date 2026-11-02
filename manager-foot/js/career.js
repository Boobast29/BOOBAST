// ============================================================
//  Carrière & développement : progression individuelle, postes,
//  parrainage, centre de formation, missions de recrutement,
//  réputation du manager, succès, postes vacants, président,
//  supporters.
// ============================================================

// ---------- polyvalence (familiarité par poste) ----------
function initPosFam(p) {
  if (p.posFam) return p.posFam;
  const f = {};
  for (const r of Object.keys(ROLES)) f[r] = r === p.pos ? 100 : (COMPAT[p.pos] || []).includes(r) ? 65 : (r === 'GB' || p.pos === 'GB') ? 5 : 30;
  p.posFam = f;
  return f;
}
function posFamOf(p, role) { return (p.posFam || initPosFam(p))[role] ?? 30; }
function famFromValue(v) { return v >= 90 ? 1 : clamp(.7 + .3 * v / 100, .3, 1); }

// ---------- développement individuel (chaque semaine, joueurs du club) ----------
const TRAIN_ATTRS = { '': 'Selon le programme collectif', ...ATTRS };
function developWeekly(G) {
  const st = G.staff || {};
  for (const p of clubPlayers(G, G.clubId)) {
    initPosFam(p);
    const t = p.train || {};
    if (t.learn && t.learn !== p.pos) {
      p.posFam[t.learn] = clamp(p.posFam[t.learn] + 2.2 + (st.coach || 2) * .5, 0, 100);
      if (p.posFam[t.learn] >= 90 && !t.done) { t.done = true; news(G, `🎓 ${p.name} maîtrise désormais le poste de ${ROLES[t.learn].label.toLowerCase()}.`, 'youth'); }
    }
    if (t.attr && p.age <= 30 && playerOvr(p) < p.pot && rnd() < .05 + (st.coach || 2) * .01) {
      p.attrs[t.attr] = clamp(p.attrs[t.attr] + 1, 1, 20);
      G.weekProg?.push({ pid: p.id, k: t.attr, d: 1 });
    }
    // parrainage
    const m = p.mentor ? getPlayer(G, p.mentor) : null;
    if (m && m.club === G.clubId) {
      if (rnd() < .06 && playerOvr(p) < p.pot) { const k = bumpAttr(p, 1, ['men', 'tec', 'pas']); G.weekProg?.push({ pid: p.id, k, d: 1 }); }
      p.morale = clamp(p.morale + .5, 5, 100);
      if (rnd() < .02 && p.pers !== m.pers && ['Professionnel', 'Leader', 'Loyal'].includes(m.pers)) {
        news(G, `🧑‍🏫 Au contact de ${m.name}, ${p.name} devient « ${m.pers} ».`, 'youth'); p.pers = m.pers;
      }
    } else if (p.mentor) p.mentor = null;
  }
  // académie : progression gérée par youthWeekly (realisme.js), plafonnée par saison
}
// en match : on apprend le poste où l'on joue
function learnFromMatch(G, side) {
  for (const x of side.onPitch) { const p = getPlayer(G, x.id); initPosFam(p); if (x.role !== p.pos) p.posFam[x.role] = clamp(p.posFam[x.role] + 1.5, 0, 100); }
}

// ---------- centre de formation ----------
function youthIntake(G) {
  const c = myClub(G), st = G.staff || {}, fac = G.fac || {};
  const n = 4 + rint(0, 2) + ((fac.youth || 2) >= 4 ? 1 : 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const role = G.youthFocus && rnd() < .55 ? G.youthFocus : pick(SQUAD_TEMPLATE);
    const y = genPlayer(role, 3.8 + c.rep / 15 + gauss() * 1.1 + ((st.youth || 2) + (fac.youth || 2) - 4) * .25, { club: c.id, age: rint(15, 17), rep: c.rep });
    y.pot = clamp(y.pot + rint(0, 12) + ((st.youth || 2) + (fac.youth || 2) - 4) * 2, playerOvr(y), 96);
    if (rnd() < .06 + (fac.youth || 2) * .01) { y.pot = clamp(y.pot + rint(6, 12), playerOvr(y), 96); y.gem = true; }
    y.wage = 500; y.contract = 3; y.academy = true; y.intake = G.season; y.value = calcValue(y);
    G.players.push(y); G.pmap[y.id] = y; out.push(y);
  }
  const gem = out.find(y => y.gem);
  news(G, `🌱 Journée des jeunes : ${out.length} nouveaux talents intègrent l'académie${gem ? ` — ton formateur s'enthousiasme pour ${gem.name} !` : '.'}`, 'youth');
  return out;
}
function youthPotEstimate(G, p) {
  const err = Math.max(1, 7 - (G.staff?.youth || 2)) * 2;
  const h = ((p.id * 7919) % 101) / 101 * 2 - 1;
  return clamp(Math.round(p.pot + h * err), 30, 99);
}
function promoteYouth(G, p) { p.academy = false; p.wage = Math.max(p.wage, 1500); p.status = 'youth'; assignNumbers(clubPlayers(G, G.clubId)); news(G, `⬆ ${p.name} est promu en équipe première.`, 'youth'); }

// ---------- missions de recrutement ----------
const REGIONS = { dom: 'Championnats nationaux', eur: 'Europe (clubs étrangers)', world: 'Monde (Afrique, Amérique du Sud, Asie)', free: 'Joueurs libres' };
function maxMissions(G) { return 1 + Math.floor((G.staff?.scout || 2) / 2); }
function startMission(G, m) {
  (G.missions ||= []).push({ id: Date.now() + rint(0, 999), ...m, left: Math.max(2, 6 - (G.staff?.scout || 2)), found: [] });
}
function missionsWeekly(G) {
  for (const m of G.missions || []) {
    if (m.left <= 0) continue;
    m.left--;
    if (m.left > 0) continue;
    const ok = p => p.club !== G.clubId && (!m.pos || p.pos === m.pos) && p.age <= m.maxAge && p.pot >= m.minPot && !p.loan;
    let pool = G.players.filter(ok);
    if (m.region === 'dom') pool = pool.filter(p => p.club != null && !getClub(G, p.club).foreign);
    if (m.region === 'eur') pool = pool.filter(p => p.club != null && getClub(G, p.club).foreign);
    if (m.region === 'free') pool = pool.filter(p => p.club == null);
    if (m.region === 'world') {
      pool = [];
      const nats = ['SEN', 'CIV', 'CMR', 'MLI', 'GHA', 'BRA', 'ARG', 'URU', 'COL', 'JPN', 'MAR'];
      const fr = G.clubs.filter(c => c.foreign);
      for (let i = 0; i < rint(2, 4); i++) {
        const role = m.pos || pick(SQUAD_TEMPLATE);
        const y = genPlayer(role, 6 + rnd() * 3, { club: rnd() < .5 ? null : pick(fr).id, age: rint(16, Math.min(m.maxAge, 20)), nat: pick(nats) });
        y.pot = clamp(Math.max(m.minPot, y.pot) + rint(0, 8), playerOvr(y), 95); y.value = calcValue(y);
        G.players.push(y); G.pmap[y.id] = y; pool.push(y);
      }
    }
    m.found = pool.sort((a, b) => b.pot - a.pot + (rnd() - .5) * 6).slice(0, 6).map(p => p.id);
    for (const id of m.found) if (!G.known.includes(id)) G.known.push(id);
    news(G, `🔎 Mission de recrutement terminée (${m.pos ? ROLES[m.pos].label : 'tous postes'}, ${REGIONS[m.region]}) : ${m.found.length} joueur(s) repéré(s).`, 'scout');
  }
}

// ---------- réputation du manager & succès ----------
const ACHIEVEMENTS = {
  firstWin: 'Première victoire', unbeaten10: 'Invincibles : 10 matchs sans défaite', streak5: '5 victoires d\'affilée', bigWin: 'Large victoire (4 buts d\'écart)',
  title: 'Champion !', cup: 'Vainqueur de la coupe', euro: 'Roi d\'Europe', promo: 'Promotion', youthStar: 'Révélation du centre de formation (jeune de l\'académie titulaire)',
  bigSale: 'Vente record (+30 M€)', century: '100 matchs sur le banc', saver: 'Maintien arraché'
};
function unlock(G, key) {
  G.ach ||= {};
  if (G.ach[key]) return;
  G.ach[key] = { season: G.season, label: weekLabel(G) };
  G.mgr.rep = clamp(G.mgr.rep + 1, 0, 100);
  news(G, `🏅 Succès débloqué : ${ACHIEVEMENTS[key]} !`, 'trophy');
  if (typeof toast === 'function') toast(`🏅 ${ACHIEVEMENTS[key]}`);
}
function careerAfterMatch(G, f, mt) {
  G.mgr ||= { rep: 30, matches: 0, w: 0, d: 0, l: 0 };
  const w = fixtureWinner(f), my = f.h === G.clubId ? 0 : 1;
  G.mgr.matches++;
  if (w === G.clubId) G.mgr.w++; else if (w == null) G.mgr.d++; else G.mgr.l++;
  G.mgr.run = w === G.clubId ? (G.mgr.run > 0 ? G.mgr.run + 1 : 1) : w == null ? (G.mgr.run > 0 ? 0 : G.mgr.run) : 0;
  G.mgr.unb = w == null || w === G.clubId ? (G.mgr.unb || 0) + 1 : 0;
  if (w === G.clubId) unlock(G, 'firstWin');
  if (G.mgr.run >= 5) unlock(G, 'streak5');
  if (G.mgr.unb >= 10) unlock(G, 'unbeaten10');
  if (f.res && (f.res[my] - f.res[1 - my]) >= 4) unlock(G, 'bigWin');
  if (G.mgr.matches >= 100) unlock(G, 'century');
  const side = mt?.sides?.[my];
  if (side?.onPitch.some(x => getPlayer(G, x.id)?.intake)) unlock(G, 'youthStar');
  // supporters
  const d = w === G.clubId ? 2.5 : w == null ? 0 : -3;
  G.fans = clamp((G.fans ?? 60) + d + (60 - (G.fans ?? 60)) * .03, 0, 100);
}
function careerSeasonEnd(G, S) {
  G.mgr.rep = clamp(G.mgr.rep + (S.met ? 4 : -3) + (S.rank === 1 ? 8 : 0) + (G.comps.CUP.winner === G.clubId ? 4 : 0) + (G.comps.C1?.winner === G.clubId ? 12 : 0) + (G.comps.C2?.winner === G.clubId ? 6 : 0) + (G.comps.C3?.winner === G.clubId ? 4 : 0), 0, 100);
  if (S.rank === 1) unlock(G, 'title');
  if (G.comps.CUP.winner === G.clubId) unlock(G, 'cup');
  if (G.comps.C1?.winner === G.clubId) unlock(G, 'euro');
  if (S.promoted.includes(myClub(G).name)) unlock(G, 'promo');
  const L = clubLeague(G, G.clubId);
  if (L && S.rank >= L.clubs.length - promoSpots(L) - 1 && S.met && !S.relegated.includes(myClub(G).name)) unlock(G, 'saver');
}

// ---------- entraîneurs de l'IA, limogeages, postes vacants ----------
const MGR_FIRST = ['Didier', 'Paolo', 'Hans', 'José', 'Karim', 'Thomas', 'Luc', 'Pedro', 'Erik', 'Sami', 'Marco', 'Yves', 'Rudi', 'Claude', 'Unai', 'Bruno', 'Mikel', 'Franck'];
const MGR_LAST = ['Lambert', 'Moretti', 'Krüger', 'Silva', 'Benali', 'Dupuis', 'Garnier', 'Ortiz', 'Svensson', 'Haddad', 'Rossi', 'Perrin', 'Vogel', 'Arnaud', 'Etxeberria', 'Costa', 'Morel', 'Leclerc'];
function aiManagerName() { return pick(MGR_FIRST) + ' ' + pick(MGR_LAST); }
function aiManagersWeekly(G) {
  G.vacancies = (G.vacancies || []).filter(v => G.week - v.week < 4 && v.club !== G.clubId);
  const lr = leagueRoundAt(G);
  if (lr < 8) return;
  for (const L of leagueComps(G)) {
    const t = standings(G, L.id);
    t.slice(-4).forEach(r => {
      const c = getClub(G, r.id);
      if (c.id === G.clubId) return;
      c.mgrName ||= aiManagerName();
      const exp = L.clubs.length - (L.clubs.slice().sort((a, b) => getClub(G, b).rep - getClub(G, a).rep).indexOf(c.id));
      if (rnd() < .025 * (c.rep > 65 ? 2 : 1) && !G.vacancies.some(v => v.club === c.id)) {
        news(G, `🪑 ${c.name} limoge son entraîneur ${c.mgrName}. Le poste est vacant.`, 'board', true);
        c.mgrName = null;
        G.vacancies.push({ club: c.id, week: G.week });
      }
    });
  }
  for (const v of G.vacancies) { const c = getClub(G, v.club); if (!c.mgrName && G.week - v.week >= 3) { c.mgrName = aiManagerName(); news(G, `${c.name} nomme ${c.mgrName} entraîneur.`, 'board', true); } }
}
function applyForJob(G, clubId) {
  const c = getClub(G, clubId);
  const chance = clamp(.5 + (G.mgr.rep - (c.rep - 30)) / 60, .05, .95);
  if (rnd() < chance) return true;
  G.mgr.rep = clamp(G.mgr.rep - 1, 0, 100);
  return false;
}

// ---------- demandes au président ----------
function boardRequest(G, kind) {
  const b = G.board, c = myClub(G);
  if ((b.lastAsk ?? -99) > G.week - 6) return { ok: false, msg: 'Le président : « Tu m\'as déjà sollicité récemment. Reviens plus tard. »' };
  b.lastAsk = G.week;
  const conf = b.conf;
  if (kind === 'transfer') {
    if (conf < 55 || c.budget < 5e6) { b.conf = clamp(conf - 2, 0, 100); return { ok: false, msg: 'Refusé : « Les résultats et les finances ne le permettent pas. »' }; }
    const add = roundMoney(Math.min(c.budget * .2, 30e6));
    b.transfer = roundMoney(b.transfer + add);
    return { ok: true, msg: `Accordé : +${money(add)} de budget transferts.` };
  }
  if (kind === 'wage') {
    if (conf < 60) { b.conf = clamp(conf - 2, 0, 100); return { ok: false, msg: 'Refusé : « Pas question d\'alourdir la masse salariale. »' }; }
    const add = roundMoney(b.wageCap * .08);
    b.wageCap = roundMoney(b.wageCap + add);
    return { ok: true, msg: `Accordé : plafond salarial +${wageM(add)}.` };
  }
  if (kind === 'facility') {
    if (conf < 72 || c.budget < 10e6 || G.fac.build) { b.conf = clamp(conf - 1, 0, 100); return { ok: false, msg: 'Refusé : « Pas d\'investissement dans les installations pour le moment. »' }; }
    const k = ['training', 'youth', 'medical'].sort((x, y) => (G.fac[x] || 2) - (G.fac[y] || 2))[0];
    if ((G.fac[k] || 2) >= 5) return { ok: false, msg: 'Toutes les installations sont déjà au maximum.' };
    G.fac.build = { type: k, done: leagueRoundAt(G) + 8 };
    return { ok: true, msg: `Accordé : le club finance les travaux du ${FACILITIES[k].label.toLowerCase()} (8 semaines).` };
  }
  return { ok: false, msg: '?' };
}

// ---------- discours et conférences ----------
const PRE_TALKS = [
  { k: 'relax', label: '😌 « Jouez libérés, pas de pression »', fav: 'under' },
  { k: 'motivate', label: '🔥 « Montrez-moi votre envie ! »', fav: 'even' },
  { k: 'focus', label: '🎯 « Restez concentrés, respectez l\'adversaire »', fav: 'fav' },
  { k: 'fans', label: '📣 « Faites-le pour nos supporters »', fav: 'home' }
];
function preTalkEffect(k, ctx) {
  // ctx: { diff: force relative (+ = favori), home }
  let g = 0;
  if (k === 'relax') g = ctx.diff < -3 ? .02 : ctx.diff > 5 ? -.015 : .005;
  if (k === 'motivate') g = Math.abs(ctx.diff) <= 4 ? .02 : .006;
  if (k === 'focus') g = ctx.diff > 3 ? .02 : -.004;
  if (k === 'fans') g = ctx.home ? .016 : -.008;
  return g + (rnd() - .5) * .01;
}
const POST_PRESS = {
  win: { q: 'Belle victoire aujourd\'hui. Votre réaction ?', a: [['Les joueurs ont été remarquables.', 'praise'], ['On peut encore mieux faire.', 'demand'], ['Personne ne nous arrêtera cette saison !', 'boast']] },
  draw: { q: 'Un match nul, satisfait ?', a: [['Un point mérité, on avance.', 'calm'], ['Frustrant, on méritait mieux.', 'demand'], ['L\'arbitre nous a coûté la victoire.', 'ref']] },
  loss: { q: 'Défaite difficile. Quelles explications ?', a: [['J\'assume, c\'est ma responsabilité.', 'own'], ['Certains joueurs n\'étaient pas au niveau.', 'blame'], ['L\'arbitrage était scandaleux.', 'ref']] }
};
function postPressEffect(G, k) {
  const sq = clubPlayers(G, G.clubId);
  const all = d => sq.forEach(p => p.morale = clamp(p.morale + d, 5, 100));
  switch (k) {
    case 'praise': all(3); return 'Les joueurs apprécient tes éloges.';
    case 'demand': all(-1); G.board.conf = clamp(G.board.conf + 1, 0, 100); return 'Le président aime ton exigence.';
    case 'boast': all(2); G.fans = clamp((G.fans ?? 60) + 3, 0, 100); return 'Les supporters adorent… attention à ne pas décevoir.';
    case 'calm': return 'Discours mesuré.';
    case 'ref': G.fans = clamp((G.fans ?? 60) + 2, 0, 100); if (rnd() < .3) { G.board.conf = clamp(G.board.conf - 3, 0, 100); return 'La ligue te rappelle à l\'ordre pour tes propos sur l\'arbitrage.'; } return 'Les supporters partagent ta colère.';
    case 'own': all(2); G.board.conf = clamp(G.board.conf + 1, 0, 100); return 'Le vestiaire apprécie que tu protèges le groupe.';
    case 'blame': sq.forEach(p => { p.morale = clamp(p.morale - (p.pers === 'Discret' ? 6 : 3), 5, 100); p.trust = clamp((p.trust ?? 55) - 3, 0, 100); }); return 'Le vestiaire n\'a pas aimé être pointé du doigt.';
  }
  return '';
}
