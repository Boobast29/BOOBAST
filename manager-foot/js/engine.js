// ============================================================
//  Moteur : compositions, force d'équipe, simulation de match,
//  calendrier, classement, fin de saison.
// ============================================================

function clubPlayers(G, clubId) { return G.players.filter(p => p.club === clubId); }
function getPlayer(G, id) { return G.pmap[id]; }
function getClub(G, id) { return G.clubs.find(c => c.id === id); }
function reindex(G) { G.pmap = {}; for (const p of G.players) G.pmap[p.id] = p; }

function available(p) { return p.injury <= 0 && p.susp <= 0; }

function effRating(p, role) {
  const base = playerRoleRating(p, role) * familiarity(p, role);
  return base * (.72 + .28 * p.fit / 100) * (.94 + .06 * p.morale / 100);
}

// Composition automatique (gloutonne, du poste le plus rare au plus courant)
function autoLineup(G, clubId, formation) {
  const slots = FORMATIONS[formation];
  const pool = clubPlayers(G, clubId).filter(available);
  const used = new Set();
  const lineup = new Array(slots.length).fill(null);
  const order = slots.map((s, i) => i).sort((a, b) => (slots[a][0] === 'GB' ? -1 : 0) - (slots[b][0] === 'GB' ? -1 : 0));
  // 1er passage : poste exact ; 2e : poste voisin ; 3e : n'importe qui
  for (const pass of [0, 1, 2]) {
    for (const i of order) {
      if (lineup[i]) continue;
      const role = slots[i][0];
      let best = null, bv = -1;
      for (const p of pool) {
        if (used.has(p.id)) continue;
        if (pass === 0 && p.pos !== role) continue;
        if (pass === 1 && familiarity(p, role) < .92) continue;
        const v = effRating(p, role) * (p.fit < 75 ? .85 : 1);
        if (v > bv) { bv = v; best = p; }
      }
      if (best) { lineup[i] = best.id; used.add(best.id); }
    }
  }
  const bench = pool.filter(p => !used.has(p.id))
    .sort((a, b) => playerOvr(b) - playerOvr(a));
  // banc : un gardien + les meilleurs
  const gk = bench.find(p => p.pos === 'GB');
  const others = bench.filter(p => p !== gk).slice(0, gk ? 8 : 9);
  return { lineup, bench: (gk ? [gk, ...others] : others).map(p => p.id) };
}

function teamStrength(G, side) {
  // side = { formation, lineup:[ids], mentality, onPitch:[{id, role}] }
  const acc = { def: 0, mid: 0, att: 0, gk: 0, wd: 0, wm: 0, wa: 0, wg: 0 };
  for (const s of side.onPitch) {
    const p = getPlayer(G, s.id); if (!p) continue;
    const r = effRating(p, s.role) * (s.fatigueF || 1);
    const L = ROLE_LINES[s.role];
    if (L.def) { acc.def += r * L.def; acc.wd += L.def; }
    if (L.mid) { acc.mid += r * L.mid; acc.wm += L.mid; }
    if (L.att) { acc.att += r * L.att; acc.wa += L.att; }
    if (L.gk) { acc.gk += r; acc.wg += 1; }
  }
  const line = (sum, w, exp) => w > 0 ? (sum / w) * (.8 + .2 * Math.min(w / exp, 1.5)) : 15;
  return {
    def: line(acc.def, acc.wd, 4), mid: line(acc.mid, acc.wm, 3.5),
    att: line(acc.att, acc.wa, 2.6), gk: acc.wg ? acc.gk / acc.wg : 20
  };
}

// ---------- Match ----------
const COMM = {
  kick: ['Coup d\'envoi ! {H} reçoit {A}.', 'C\'est parti au {S} !'],
  chance: ['{P} tente sa chance… à côté !', 'Frappe de {P}, au-dessus de la barre.', 'Belle action de {T}, mais {P} manque le cadre.', '{P} reprend de la tête… juste à côté !'],
  save: ['Arrêt superbe du gardien sur la frappe de {P} !', '{P} frappe fort, le gardien détourne en corner.', 'Tir cadré de {P}, capté sans difficulté.'],
  post: ['POTEAU ! {P} n\'est pas passé loin !', 'Sur la barre ! Énorme frappe de {P} !'],
  goal: ['BUUUT ! {P} ouvre son compteur ! ({SC})', 'BUT ! {P} conclut une action magnifique ! ({SC})', 'BUT pour {T} ! {P} ne tremble pas ! ({SC})', 'BUT ! Reprise imparable de {P} ! ({SC})'],
  yellow: ['Carton jaune pour {P} ({T}).', '{P} est averti après une faute grossière.'],
  red: ['CARTON ROUGE ! {P} est expulsé !', 'Deuxième jaune pour {P}, c\'est le rouge !'],
  injury: ['{P} se tient la cuisse… il semble blessé.', 'Coup dur : {P} reste au sol, blessé.'],
  half: ['Mi-temps : {SC}.'],
  calm: ['{T} fait tourner le ballon au milieu de terrain.', '{T} construit patiemment depuis l\'arrière.', 'Le pressing de {T} gêne la relance adverse.', '{T} accélère sur le côté…', 'Le public pousse derrière {T} !', 'Long ballon de {T}, la défense dégage.', '{P} récupère le ballon pour {T}.', 'Centre de {P}, repoussé par la défense.'],
  end: ['Coup de sifflet final ! {SC}.']
};
function fmt(s, o) { return s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? ''); }

function makeSide(G, clubId, tac) {
  return {
    clubId, formation: tac.formation, mentality: tac.mentality || 0,
    onPitch: tac.lineup.map((id, i) => ({ id, role: FORMATIONS[tac.formation][i][0] })).filter(s => s.id),
    bench: [...tac.bench], subsLeft: 5, sentOff: []
  };
}

function aiTactics(G, clubId) {
  const club = getClub(G, clubId);
  if (!club.formation) club.formation = pick(['4-4-2', '4-3-3', '4-2-3-1', '4-1-4-1', '3-5-2', '4-3-1-2']);
  const t = autoLineup(G, clubId, club.formation);
  return { formation: club.formation, mentality: 0, lineup: t.lineup, bench: t.bench };
}

class Match {
  constructor(G, homeId, awayId, homeTac, awayTac) {
    this.G = G; this.minute = 0; this.done = false;
    this.sides = [makeSide(G, homeId, homeTac), makeSide(G, awayId, awayTac)];
    this.score = [0, 0]; this.events = []; this.log = [];
    this.stats = [{ shots: 0, onT: 0, poss: 0, fouls: 0, corners: 0 }, { shots: 0, onT: 0, poss: 0, fouls: 0, corners: 0 }];
    this.pr = {}; // notes joueurs
    for (const s of this.sides) for (const x of s.onPitch) this.pr[x.id] = { r: 6.3, g: 0, a: 0, min: 0, yel: 0, red: 0, side: s === this.sides[0] ? 0 : 1 };
    const H = getClub(G, homeId), A = getClub(G, awayId);
    this.names = [H.name, A.name];
    this.say(fmt(pick(COMM.kick), { H: H.name, A: A.name, S: H.stadium }), 'info');
  }
  scoreStr() { return `${this.names[0]} ${this.score[0]}-${this.score[1]} ${this.names[1]}`; }
  say(text, type = '', side = null) { this.log.push({ m: this.minute, text, type, side }); }
  pname(id) { return getPlayer(this.G, id).name; }

  step() {
    if (this.done) return;
    this.minute++;
    const m = this.minute;
    const fat = m > 60 ? 1 - (m - 60) * .0025 : 1;
    for (const s of this.sides) for (const x of s.onPitch) { x.fatigueF = fat * (x.fresh ? 1.04 : 1); this.pr[x.id].min++; }
    const S = this.sides.map(s => teamStrength(this.G, s));
    S[0].mid *= 1.05; S[0].att *= 1.03; // avantage du terrain
    const ment = this.sides.map(s => s.mentality);
    // ajustement à 10
    this.sides.forEach((s, i) => { const miss = 11 - s.onPitch.length; if (miss > 0) { S[i].mid *= 1 - .07 * miss; S[i].def *= 1 - .06 * miss; S[i].att *= 1 - .05 * miss; } });

    const midH = Math.pow(S[0].mid, 1.5) * (1 + .03 * ment[0]), midA = Math.pow(S[1].mid, 1.5) * (1 + .03 * ment[1]);
    const pHome = midH / (midH + midA);
    const atk = rnd() < pHome ? 0 : 1, dfn = 1 - atk;
    this.stats[atk].poss++;

    const ratio = S[atk].att / (S[dfn].def * .65 + S[dfn].mid * .35);
    let pChance = .145 * Math.pow(ratio, 1.1) * (1 + .12 * ment[atk]) * (1 - .07 * ment[dfn]);
    if (rnd() < pChance) this.chance(atk, dfn, S);
    else if (rnd() < .07) {
      const x = pick(this.sides[atk].onPitch);
      if (x) this.say(fmt(pick(COMM.calm), { T: this.names[atk], P: getPlayer(this.G, x.id).name }), 'calm', atk);
    }

    // fautes / cartons
    if (rnd() < .2) {
      this.stats[dfn].fouls++;
      if (rnd() < .17) this.card(dfn);
    }
    if (rnd() < .0018) this.injure(rint(0, 1));

    if (m === 45) this.say(fmt(COMM.half[0], { SC: this.scoreStr() }), 'half');
    if (m >= 90 + (this.extra ??= rint(1, 5))) this.finish();
  }

  shooter(side) {
    const s = this.sides[side];
    return weighted(s.onPitch, x => {
      const L = ROLE_LINES[x.role]; const p = getPlayer(this.G, x.id);
      return ((L.att || 0) * 2.2 + (L.mid || 0) * .8 + (L.def || 0) * .15) * (p.attrs.fin + 9);
    });
  }

  chance(atk, dfn, S) {
    const st = this.stats[atk];
    st.shots++;
    const sh = this.shooter(atk); const p = getPlayer(this.G, sh.id);
    const T = this.names[atk];
    const gkSlot = this.sides[dfn].onPitch.find(x => x.role === 'GB');
    const gk = gkSlot ? effRating(getPlayer(this.G, gkSlot.id), 'GB') : 25;
    const quality = (p.attrs.fin * 4 + p.attrs.tec * 1.5 + p.attrs.men) / 6.5 * 5;
    const onTarget = rnd() < .28 + quality / 260;
    if (rnd() < .3) this.stats[atk].corners++;
    if (!onTarget) {
      if (rnd() < .07) this.say(fmt(pick(COMM.post), { P: p.name, T }), 'chance', atk);
      else if (rnd() < .45) this.say(fmt(pick(COMM.chance), { P: p.name, T }), 'chance', atk);
      this.pr[sh.id].r -= .05;
      return;
    }
    st.onT++;
    const pGoal = clamp(.35 * Math.pow(quality / gk, .9), .12, .6);
    if (rnd() < pGoal) {
      this.score[atk]++;
      const others = this.sides[atk].onPitch.filter(x => x.id !== sh.id && x.role !== 'GB');
      let assist = null;
      if (rnd() < .75 && others.length) {
        const ax = weighted(others, x => getPlayer(this.G, x.id).attrs.pas + getPlayer(this.G, x.id).attrs.dri * .5);
        assist = ax.id; this.pr[assist].a++; this.pr[assist].r += .6;
      }
      this.pr[sh.id].g++; this.pr[sh.id].r += 1.1;
      if (gkSlot) this.pr[gkSlot.id].r -= .35;
      this.sides[dfn].onPitch.forEach(x => { if (ROLE_LINES[x.role].def) this.pr[x.id].r -= .12; });
      this.events.push({ type: 'goal', side: atk, min: this.minute, pid: sh.id, assist });
      const txt = fmt(pick(COMM.goal), { P: p.name, T, SC: `${this.score[0]}-${this.score[1]}` }) + (assist ? ` Passe décisive de ${this.pname(assist)}.` : '');
      this.say(txt, 'goal', atk);
    } else {
      if (gkSlot) this.pr[gkSlot.id].r += .25;
      if (rnd() < .6) this.say(fmt(pick(COMM.save), { P: p.name, T }), 'save', atk);
    }
  }

  card(side) {
    const s = this.sides[side]; if (!s.onPitch.length) return;
    const x = weighted(s.onPitch, x => (ROLE_LINES[x.role].def || .2) + .1);
    const pr = this.pr[x.id];
    const p = getPlayer(this.G, x.id);
    if (rnd() < .035 || pr.yel === 1) {
      pr.red = 1; pr.r -= 1.5;
      this.say(fmt(pick(COMM.red), { P: p.name, T: this.names[side] }), 'red', side);
      this.events.push({ type: 'red', side, min: this.minute, pid: x.id });
      s.onPitch = s.onPitch.filter(y => y !== x); s.sentOff.push(x.id);
      if (this.pendingInjury && this.pendingInjury.id === x.id) this.pendingInjury = null;
    } else {
      pr.yel = 1; pr.r -= .3;
      this.say(fmt(pick(COMM.yellow), { P: p.name, T: this.names[side] }), 'yellow', side);
      this.events.push({ type: 'yellow', side, min: this.minute, pid: x.id });
    }
  }

  injure(side) {
    const s = this.sides[side]; if (!s.onPitch.length) return;
    const x = pick(s.onPitch);
    const p = getPlayer(this.G, x.id);
    if (this.events.some(e => e.type === 'inj' && e.pid === x.id)) return;
    this.events.push({ type: 'inj', side, min: this.minute, pid: x.id, weeks: rint(1, 6) });
    this.say(fmt(pick(COMM.injury), { P: p.name }), 'inj', side);
    x.injured = true;
    // l'IA remplace automatiquement ; l'humain aussi si plus de pause possible
    if (this.sides[side].ai || this.auto) this.autoSub(side, x);
    else { x.fatigueF = .6; this.pendingInjury = { side, id: x.id }; }
  }

  sub(side, outId, inId) {
    const s = this.sides[side];
    if (s.subsLeft <= 0) return false;
    const slot = s.onPitch.find(x => x.id === outId);
    if (!slot || !s.bench.includes(inId)) return false;
    slot.id = inId; slot.fresh = true; slot.injured = false;
    s.bench = s.bench.filter(i => i !== inId); s.subsLeft--;
    this.pr[inId] = { r: 6.3, g: 0, a: 0, min: 0, yel: 0, red: 0, side };
    this.events.push({ type: 'sub', side, min: this.minute, pid: inId, out: outId });
    this.say(`Changement ${this.names[side]} : ${this.pname(inId)} remplace ${this.pname(outId)}.`, 'sub', side);
    return true;
  }

  autoSub(side, slot) {
    const s = this.sides[side];
    if (s.subsLeft <= 0) return;
    let best = null, bv = -1;
    for (const id of s.bench) {
      const v = effRating(getPlayer(this.G, id), slot.role);
      if (v > bv) { bv = v; best = id; }
    }
    if (best) this.sub(side, slot.id, best);
  }

  aiManage() {
    // changements de l'IA entre 60' et 80'
    this.sides.forEach((s, i) => {
      if (!s.ai) return;
      if ([60, 70, 80].includes(this.minute) && s.subsLeft > 0) {
        const tired = s.onPitch.filter(x => x.role !== 'GB' && !x.fresh).sort((a, b) => getPlayer(this.G, a.id).attrs.phy - getPlayer(this.G, b.id).attrs.phy)[0];
        if (tired && rnd() < .8) this.autoSub(i, tired);
      }
      const diff = this.score[i] - this.score[1 - i];
      if (this.minute >= 70) s.mentality = diff < 0 ? 1 : diff > 0 ? -1 : 0;
    });
  }

  finish() {
    this.done = true;
    this.say(fmt(COMM.end[0], { SC: this.scoreStr() }), 'end');
    const tot = this.stats[0].poss + this.stats[1].poss || 1;
    this.possPct = [Math.round(this.stats[0].poss / tot * 100), 0]; this.possPct[1] = 100 - this.possPct[0];
    const diff = this.score[0] - this.score[1];
    for (const id in this.pr) {
      const r = this.pr[id];
      const d = r.side === 0 ? diff : -diff;
      r.r += d > 0 ? .5 : d < 0 ? -.4 : 0;
      const p = getPlayer(this.G, id);
      if (ROLE_LINES[p.pos]?.def || p.pos === 'GB') { if ((r.side === 0 ? this.score[1] : this.score[0]) === 0) r.r += .6; }
      r.r = clamp(r.r + gauss() * .35, 3, 10);
    }
  }

  runToEnd() { while (!this.done) { this.aiManage(); this.step(); } return this; }
}

// Applique le résultat d'un match au monde (stats, forme, blessures, suspensions)
function applyMatch(G, mt, fixture) {
  fixture.res = [mt.score[0], mt.score[1]];
  fixture.events = mt.events.filter(e => e.type === 'goal' || e.type === 'red').map(e => ({ t: e.type, s: e.side, m: e.min, p: e.pid }));
  const played = new Set();
  for (const id in mt.pr) {
    const r = mt.pr[id], p = getPlayer(G, +id);
    if (!p || r.min === 0) continue;
    played.add(p.id);
    p.stats.apps++; p.stats.goals += r.g; p.stats.assists += r.a;
    p.stats.rating += r.r; p.stats.yel += r.yel; p.stats.red += r.red;
    p.fit = clamp(p.fit - r.min * (.3 - p.attrs.phy * .007), 30, 100);
    p.morale = clamp(p.morale + (r.r - 6.6) * 4, 10, 100);
    if (r.yel && !r.red) { p.yellow++; if (p.yellow % 5 === 0) { p.susp = 1; p.suspNew = true; } }
    if (r.red) { p.susp = Math.max(p.susp, rint(1, 3)); p.suspNew = true; }
    p.lastRating = Math.round(r.r * 10) / 10;
  }
  for (const e of mt.events) if (e.type === 'inj') { const p = getPlayer(G, e.pid); p.injury = e.weeks; p.injNew = true; }
  // les joueurs non utilisés perdent un peu de moral (surtout les bons)
  for (const side of mt.sides) {
    for (const p of clubPlayers(G, side.clubId)) {
      if (!played.has(p.id) && playerOvr(p) > 60) p.morale = clamp(p.morale - 1.5, 10, 100);
    }
  }
  // affluence et recettes pour le club à domicile
  const home = getClub(G, fixture.h), away = getClub(G, fixture.a);
  const att = Math.round(home.capacity * clamp(.55 + home.rep / 250 + away.rep / 500 + rnd() * .1, .4, 1));
  const gate = att * (12 + home.rep * .45);
  home.budget += gate;
  fixture.att = att;
  if (home.id === G.clubId) G.fin.gate += gate;
}

// ---------- Calendrier (aller-retour, méthode circulaire) ----------
function makeFixtures(clubIds) {
  const ids = [...clubIds];
  if (ids.length % 2) ids.push(null);
  const n = ids.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i], b = ids[n - 1 - i];
      if (a == null || b == null) continue;
      round.push(r % 2 === 0 ? { h: a, a: b, res: null } : { h: b, a: a, res: null });
    }
    rounds.push(round);
    ids.splice(1, 0, ids.pop());
  }
  const second = rounds.map(r => r.map(f => ({ h: f.a, a: f.h, res: null })));
  return [...rounds, ...second];
}

function standings(G) {
  const T = {};
  for (const c of G.clubs) T[c.id] = { id: c.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  for (const round of G.fixtures) for (const f of round) {
    if (!f.res) continue;
    const [h, a] = f.res, H = T[f.h], A = T[f.a];
    H.p++; A.p++; H.gf += h; H.ga += a; A.gf += a; A.ga += h;
    if (h > a) { H.w++; A.l++; H.pts += 3; H.form.push('V'); A.form.push('D'); }
    else if (h < a) { A.w++; H.l++; A.pts += 3; H.form.push('D'); A.form.push('V'); }
    else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('N'); A.form.push('N'); }
  }
  return Object.values(T).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}

// ---------- Semaine & transferts IA ----------
function weeklyUpdate(G) {
  for (const p of G.players) {
    p.fit = clamp(p.fit + 22 + p.attrs.phy * .4, 0, 100);
    if (p.injury > 0 && !p.injNew) { p.injury--; p.fit = Math.min(p.fit, 70); }
    if (p.suspNew) p.suspNew = false; else if (p.susp > 0) p.susp--;
    if (p.injNew) p.injNew = false;
    p.morale += (70 - p.morale) * .05;
  }
  // salaires (débités chaque journée = 1 semaine)
  for (const c of G.clubs) {
    const wages = clubPlayers(G, c.id).reduce((s, p) => s + p.wage, 0);
    c.budget -= wages;
    if (c.id === G.clubId) G.fin.wages += wages;
  }
  // entraînement : petite progression pendant la saison
  for (const p of G.players) {
    if (p.club == null) continue;
    const o = playerOvr(p);
    if (p.age <= 23 && o < p.pot && rnd() < .12) bumpAttr(p, 1);
    if (p.age >= 31 && rnd() < .05) bumpAttr(p, -1);
  }
}

function bumpAttr(p, d) {
  const keys = Object.keys(ROLES[p.pos].w);
  const k = weighted(keys, k => ROLES[p.pos].w[k]);
  p.attrs[k] = clamp(p.attrs[k] + d, 1, 20);
}

function windowOpen(G) { return G.round < 5 || (G.round >= 19 && G.round < 22); }

function marketValue(p) { return calcValue(p); }

// L'IA fait quelques transferts entre elle et vers les agents libres
function aiTransfers(G) {
  if (!windowOpen(G)) return;
  for (const c of G.clubs) {
    if (c.id === G.clubId || rnd() > .12) continue;
    const squad = clubPlayers(G, c.id);
    if (squad.length >= 28) continue;
    // cherche le poste le plus faible
    const byPos = {};
    for (const r of Object.keys(ROLES)) byPos[r] = squad.filter(p => p.pos === r).map(playerOvr).sort((a, b) => b - a)[0] || 0;
    const need = Object.keys(byPos).sort((a, b) => byPos[a] - byPos[b])[0];
    const targets = G.players.filter(p => p.pos === need && p.club !== c.id && p.club !== G.clubId && playerOvr(p) > byPos[need] && marketValue(p) < c.budget * .4);
    if (!targets.length) continue;
    const t = pick(targets);
    const fee = marketValue(t);
    const from = t.club != null ? getClub(G, t.club) : null;
    if (from && clubPlayers(G, from.id).length <= 20) continue;
    c.budget -= fee; if (from) from.budget += fee;
    t.club = c.id; t.listed = false; t.contract = rint(2, 5);
    news(G, `${t.name} quitte ${from ? from.name : 'les agents libres'} pour ${c.name} (${money(fee)}).`, 'transfer', true);
  }
}

// Offres de l'IA sur les joueurs du joueur humain
function aiOffers(G) {
  if (!windowOpen(G)) return;
  const mine = clubPlayers(G, G.clubId);
  for (const p of mine) {
    const chance = p.listed ? .35 : .025;
    if (rnd() > chance) continue;
    const buyers = G.clubs.filter(c => c.id !== G.clubId && c.budget > marketValue(p) * .8 && c.rep >= playerOvr(p) - 25);
    if (!buyers.length) continue;
    const b = pick(buyers);
    const fee = roundMoney(marketValue(p) * (p.listed ? .75 + rnd() * .35 : .95 + rnd() * .5));
    G.offers.push({ id: Date.now() + rnd(), pid: p.id, club: b.id, fee, round: G.round });
    news(G, `${b.name} propose ${money(fee)} pour ${p.name}.`, 'offer');
  }
  G.offers = G.offers.filter(o => G.round - o.round < 3);
}

function news(G, text, type = 'info', worldOnly = false) {
  G.inbox.unshift({ text, type, round: G.round, season: G.season, read: false, world: worldOnly });
  if (G.inbox.length > 150) G.inbox.length = 150;
}

function money(v) {
  const neg = v < 0; v = Math.abs(v);
  let s;
  if (v >= 1e6) s = (v / 1e6).toFixed(v >= 1e8 ? 0 : 1).replace('.0', '') + ' M€';
  else if (v >= 1e3) s = Math.round(v / 1e3) + ' k€';
  else s = Math.round(v) + ' €';
  return (neg ? '-' : '') + s;
}

// ---------- Fin de saison ----------
function endSeason(G) {
  const table = standings(G);
  const rank = table.findIndex(t => t.id === G.clubId) + 1;
  const champion = getClub(G, table[0].id);
  // droits TV
  table.forEach((t, i) => {
    const c = getClub(G, t.id);
    const tv = roundMoney(30e6 - i * 1.2e6);
    c.budget += tv;
    if (c.id === G.clubId) G.fin.tv += tv;
    c.rep = clamp(c.rep + (10 - i) * .25, 40, 95);
  });
  G.history.push({ season: G.season, champion: champion.name, rank, pts: table[rank - 1].pts, objective: G.objective });
  const scorers = topScorers(G, 1)[0];
  const summary = { rank, champion: champion.name, scorer: scorers ? `${scorers.name} (${scorers.stats.goals} buts)` : '-', objective: G.objective, met: rank <= G.objective };

  // évolution des joueurs, contrats, retraites, jeunes
  const retired = [];
  for (const p of G.players) {
    p.age++;
    const o = playerOvr(p);
    let delta = 0;
    if (p.age <= 21) delta = rint(1, 4); else if (p.age <= 24) delta = rint(0, 3);
    else if (p.age <= 29) delta = rint(-1, 1); else if (p.age <= 32) delta = rint(-3, 0); else delta = rint(-5, -1);
    if (delta > 0 && o >= p.pot) delta = 0;
    for (let i = 0; i < Math.abs(delta); i++) bumpAttr(p, Math.sign(delta));
    if (p.age > 31) p.attrs.vit = clamp(p.attrs.vit - rint(0, 1), 1, 20);
    p.stats = { apps: 0, goals: 0, assists: 0, rating: 0, yel: 0, red: 0 };
    p.yellow = 0; p.susp = 0; p.fit = 100; p.injury = 0;
    if (p.club != null) {
      p.contract--;
      if (p.contract <= 0) {
        if (p.club !== G.clubId && rnd() < .7) p.contract = rint(1, 3);
        else { if (p.club === G.clubId) news(G, `Fin de contrat : ${p.name} quitte le club.`, 'transfer'); p.club = null; p.contract = 0; }
      }
    }
    if (p.age >= 34 && rnd() < (p.age - 32) * .25) retired.push(p);
    p.wage = Math.max(p.wage, calcWage(p) * .8);
    p.value = calcValue(p);
  }
  const rset = new Set(retired.map(p => p.id));
  for (const p of retired) if (p.club === G.clubId) news(G, `${p.name} prend sa retraite à ${p.age} ans.`, 'info');
  G.players = G.players.filter(p => !rset.has(p.id));
  // centre de formation : chaque club reçoit 2-3 jeunes
  for (const c of G.clubs) {
    const n = rint(2, 3);
    for (let i = 0; i < n; i++) {
      const y = genPlayer(pick(SQUAD_TEMPLATE), 4 + c.rep / 14 + gauss(), { club: c.id, age: rint(16, 18), rep: c.rep });
      y.pot = clamp(y.pot + rint(0, 10), playerOvr(y), 95); y.wage = 1000; y.contract = 3;
      if (c.id === G.clubId) news(G, `Centre de formation : ${y.name} (${ROLES[y.pos].label}, ${y.age} ans, potentiel ${starsTxt(y.pot)}) intègre l'effectif.`, 'youth');
      G.players.push(y);
    }
    // l'IA complète son effectif avec des agents libres
    while (c.id !== G.clubId && clubPlayers(G, c.id).length < 22) {
      const fa = G.players.filter(p => p.club == null).sort((a, b) => playerOvr(b) - playerOvr(a))[0];
      if (!fa) break; fa.club = c.id; fa.contract = rint(1, 3);
    }
  }
  // nouveaux agents libres
  for (let i = 0; i < 15; i++) G.players.push(genPlayer(pick(SQUAD_TEMPLATE), 6 + rnd() * 7, { club: null, age: rint(20, 32) }));
  for (const p of G.players) p.value = calcValue(p);
  reindex(G);

  G.season++;
  G.round = 0;
  const ids = G.clubs.map(c => c.id).sort(() => rnd() - .5);
  G.fixtures = makeFixtures(ids);
  G.offers = [];
  G.fin = { gate: 0, wages: 0, tv: 0, transfersIn: 0, transfersOut: 0 };
  setObjective(G);
  G.tactics = { ...G.tactics, ...autoLineup(G, G.clubId, G.tactics.formation) };
  news(G, `Nouvelle saison ${G.season}/${G.season + 1} ! Objectif du président : terminer dans le top ${G.objective}.`, 'board');
  return summary;
}

function setObjective(G) {
  const sorted = [...G.clubs].sort((a, b) => b.rep - a.rep);
  const idx = sorted.findIndex(c => c.id === G.clubId);
  G.objective = idx < 2 ? 1 : idx < 4 ? 3 : idx < 7 ? 6 : idx < 12 ? 10 : idx < 16 ? 14 : 17;
}

function topScorers(G, n = 10) {
  return G.players.filter(p => p.club != null && p.stats.goals > 0).sort((a, b) => b.stats.goals - a.stats.goals || a.stats.apps - b.stats.apps).slice(0, n);
}

function starsTxt(v) { return (Math.round(clamp((v - 40) / 10, .5, 5) * 2) / 2).toFixed(1).replace('.0', '') + '★'; }

// ---------- Nouvelle partie ----------
function newGame(db, clubId, managerName) {
  const G = {
    version: 1, leagueName: db.leagueName || 'Ligue Élite', managerName: managerName || 'Coach',
    season: 2026, round: 0, clubId,
    clubs: JSON.parse(JSON.stringify(db.clubs)), players: JSON.parse(JSON.stringify(db.players)),
    inbox: [], offers: [], history: [], fin: { gate: 0, wages: 0, tv: 0, transfersIn: 0, transfersOut: 0 }
  };
  NEXT_PID = Math.max(...G.players.map(p => p.id)) + 1;
  reindex(G);
  G.fixtures = makeFixtures(G.clubs.map(c => c.id).sort(() => Math.random() - .5));
  setObjective(G);
  const club = getClub(G, clubId);
  const t = autoLineup(G, clubId, '4-3-3');
  G.tactics = { formation: '4-3-3', mentality: 0, lineup: t.lineup, bench: t.bench };
  news(G, `Bienvenue à ${club.name}, ${G.managerName} ! Le président attend un classement dans le top ${G.objective}. Budget transferts : ${money(club.budget)}.`, 'board');
  news(G, 'Le mercato est ouvert jusqu\'à la 5e journée, puis de la 20e à la 22e.', 'info');
  return G;
}
