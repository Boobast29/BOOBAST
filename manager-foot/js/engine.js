// ============================================================
//  Moteur v2 : compétitions (2 divisions + coupe), match minute par
//  minute avec consignes/xG/penaltys/VAR/prolongations/tirs au but,
//  entraînement, cohésion, président, récompenses, fin de saison.
// ============================================================

// ---------- Accès ----------
function reindex(G) { G.pmap = {}; for (const p of G.players) G.pmap[p.id] = p; }
function getPlayer(G, id) { return G.pmap[id]; }
function getClub(G, id) { return G.clubs.find(c => c.id === id); }
function clubPlayers(G, clubId) { return G.players.filter(p => p.club === clubId); }
function available(p) { return p.injury <= 0 && p.susp <= 0; }
function defaultInst() { return { press: 0, tempo: 0, width: 0, line: 0, pass: 0 }; }
function myClub(G) { return getClub(G, G.clubId); }

function effRating(p, role, cond = p.fit) {
  const base = playerRoleRating(p, role) * familiarity(p, role);
  return base * (.72 + .28 * cond / 100) * (.94 + .06 * p.morale / 100);
}

// ---------- Composition ----------
function autoLineup(G, clubId, formation) {
  const slots = FORMATIONS[formation];
  const pool = clubPlayers(G, clubId).filter(available);
  const used = new Set();
  const lineup = new Array(slots.length).fill(null);
  const order = slots.map((s, i) => i).sort((a, b) => (slots[a][0] === 'GB' ? -1 : 0) - (slots[b][0] === 'GB' ? -1 : 0));
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
  const bench = pool.filter(p => !used.has(p.id)).sort((a, b) => playerOvr(b) - playerOvr(a));
  const gk = bench.find(p => p.pos === 'GB');
  const others = bench.filter(p => p !== gk).slice(0, gk ? 8 : 9);
  return { lineup, bench: (gk ? [gk, ...others] : others).map(p => p.id) };
}

function autoTakers(G, ids) {
  const ps = ids.map(id => getPlayer(G, id)).filter(p => p && p.pos !== 'GB');
  if (!ps.length) return {};
  const best = f => ps.slice().sort((a, b) => f(b) - f(a))[0].id;
  return {
    pen: best(p => p.attrs.fin * 2 + p.attrs.men * 2 + p.attrs.tec),
    fk: best(p => p.attrs.tec * 2 + p.attrs.pas + p.attrs.fin),
    cap: best(p => (p.pers === 'Leader' ? 12 : 0) + p.attrs.men * 2 + Math.min(p.age, 32) * .5)
  };
}

function aiTactics(G, clubId, oppId) {
  const c = getClub(G, clubId);
  if (!c.style || !FORMATIONS[c.style.formation]) c.style = clubStyle();
  const t = autoLineup(G, clubId, c.style.formation);
  let ment = 0;
  if (oppId) { const d = c.rep - getClub(G, oppId).rep; ment = d > 12 ? 1 : d < -12 ? -1 : 0; }
  const { formation, ...inst } = c.style;
  return { formation: c.style.formation, mentality: ment, lineup: t.lineup, bench: t.bench, inst, takers: autoTakers(G, t.lineup) };
}

function makeSide(G, clubId, tac) {
  const club = getClub(G, clubId);
  const onPitch = tac.lineup.map((id, i) => ({ id, role: FORMATIONS[tac.formation][i][0], slot: i })).filter(s => s.id && getPlayer(G, s.id));
  const bench = (tac.bench || []).filter(id => getPlayer(G, id));
  const cond = {};
  for (const id of [...onPitch.map(s => s.id), ...bench]) cond[id] = getPlayer(G, id).fit;
  const ids = onPitch.map(s => s.id);
  const takers = { ...autoTakers(G, ids) };
  for (const k of ['pen', 'fk', 'cap']) if (tac.takers && ids.includes(tac.takers[k])) takers[k] = tac.takers[k];
  return {
    clubId, formation: tac.formation, mentality: tac.mentality || 0, inst: { ...defaultInst(), ...(tac.inst || {}) },
    onPitch, bench, subsLeft: 5, sentOff: [], cond, talk: 1, coh: club.coh ?? 60, takers
  };
}

function teamStrength(G, side) {
  const acc = { def: 0, mid: 0, att: 0, gk: 0, wd: 0, wm: 0, wa: 0, wg: 0, pace: 0, np: 0, dpace: 0, nd: 0 };
  const cohF = .93 + .07 * (side.coh ?? 60) / 100;
  const cap = side.takers && side.onPitch.some(x => x.id === side.takers.cap) ? getPlayer(G, side.takers.cap) : null;
  const capF = cap ? 1 + (cap.attrs.men - 10) * .002 + (cap.pers === 'Leader' ? .01 : 0) : 1;
  for (const s of side.onPitch) {
    const p = getPlayer(G, s.id); if (!p) continue;
    const c = side.cond?.[s.id] ?? p.fit;
    let r = effRating(p, s.role, c) * (side.talk || 1) * cohF * capF;
    const w = side.inst?.width || 0;
    if (WING_ROLES.has(s.role)) r *= 1 + .05 * w; else if (CENTRAL_ROLES.has(s.role)) r *= 1 - .03 * w;
    const L = ROLE_LINES[s.role];
    if (L.def) { acc.def += r * L.def; acc.wd += L.def; if (L.def >= .7) { acc.dpace += p.attrs.vit; acc.nd++; } }
    if (L.mid) { acc.mid += r * L.mid; acc.wm += L.mid; }
    if (L.att) { acc.att += r * L.att; acc.wa += L.att; if (L.att >= .5) { acc.pace += p.attrs.vit; acc.np++; } }
    if (L.gk) { acc.gk += r; acc.wg += 1; }
  }
  const line = (sum, w, exp) => w > 0 ? (sum / w) * (.8 + .2 * Math.min(w / exp, 1.5)) : 15;
  return {
    def: line(acc.def, acc.wd, 4), mid: line(acc.mid, acc.wm, 3.5), att: line(acc.att, acc.wa, 2.6),
    gk: acc.wg ? acc.gk / acc.wg : 20, pace: acc.np ? acc.pace / acc.np : 10, dpace: acc.nd ? acc.dpace / acc.nd : 10
  };
}

// ---------- Commentaires ----------
const COMM = {
  kick: ['Coup d\'envoi ! {H} reçoit {A} devant {ATT} spectateurs.', 'C\'est parti au {S} ! Ambiance électrique.'],
  calm: ['{T} fait tourner le ballon au milieu de terrain.', '{T} construit patiemment depuis l\'arrière.', 'Le pressing de {T} gêne la relance adverse.', '{T} accélère sur le côté…', 'Le public pousse derrière {T} !', 'Long ballon de {T}, la défense dégage.', '{P} récupère le ballon pour {T}.', 'Centre de {P}, repoussé par la défense.', '{P} tente un petit pont… raté !', 'Belle combinaison à une touche de balle de {T}.', '{P} demande le ballon dans l\'intervalle.', 'Le rythme baisse un peu, {T} temporise.'],
  miss: {
    open: ['{P} tente sa chance… à côté !', 'Belle action de {T}, mais {P} manque le cadre.', '{P} se présente face au but… et tire au-dessus !'],
    cross: ['Centre au deuxième poteau, {P} reprend de la tête… juste à côté !', '{P} s\'élève mais sa tête passe au-dessus.'],
    long: ['{P} arme une frappe lointaine… dans les tribunes.', 'Tentative de loin de {P}, largement à côté.'],
    counter: ['Contre éclair de {T} ! {P} file au but… mais rate le cadre !', 'Quelle occasion en contre ! {P} manque l\'immanquable !'],
    fk: ['Coup franc de {P}… dans le mur.', 'Le coup franc de {P} passe au-dessus.'],
    corner: ['Corner pour {T}… {P} reprend, à côté.', 'Sur corner, {P} manque sa reprise.'],
    pen: ['PENALTY MANQUÉ ! {P} envoie le ballon au-dessus !', 'Le penalty de {P} frappe le poteau !']
  },
  save: {
    open: ['Arrêt superbe de {G} sur la frappe de {P} !', '{P} frappe fort, {G} détourne en corner.'],
    cross: ['Tête de {P}, réflexe extraordinaire de {G} !'],
    long: ['Frappe de loin de {P}, {G} capte sans problème.'],
    counter: ['{P} seul face à {G}… qui sort parfaitement !'],
    fk: ['Coup franc enroulé de {P}, {G} s\'envole !'],
    corner: ['Corner, tête de {P}, {G} bloque.'],
    pen: ['ARRÊTÉ ! {G} repousse le penalty de {P} !']
  },
  goal: {
    open: ['BUUUT ! {P} conclut une superbe action collective ! ({SC})', 'BUT ! {P} s\'infiltre et trompe {G} ! ({SC})', 'BUT pour {T} ! {P} ne tremble pas ! ({SC})'],
    cross: ['BUT ! Centre parfait, {P} catapulte le ballon de la tête ! ({SC})', 'BUT ! Reprise acrobatique de {P} sur un centre ! ({SC})'],
    long: ['QUELLE FRAPPE ! {P} envoie un missile des 25 mètres ! ({SC})', 'BUT SPLENDIDE ! {P} lucarne de loin ! ({SC})'],
    counter: ['BUT en contre ! {P} file seul au but et crucifie {G} ! ({SC})', 'Contre fulgurant de {T}, {P} conclut ! ({SC})'],
    fk: ['COUP FRANC MAGNIFIQUE ! {P} enroule par-dessus le mur ! ({SC})'],
    corner: ['BUT sur corner ! {P} s\'élève plus haut que tout le monde ! ({SC})'],
    pen: ['{P} transforme le penalty avec sang-froid ! ({SC})', 'Penalty transformé par {P}, {G} part du mauvais côté ! ({SC})']
  },
  penAward: ['PENALTY ! Faute dans la surface sur {P} !', 'L\'arbitre désigne le point de penalty ! {P} a été fauché !'],
  fkAward: ['Coup franc dangereux pour {T}, {P} s\'avance…'],
  var: ['But refusé ! La VAR signale un hors-jeu de {P}.', 'Le but de {P} est annulé après vérification vidéo.'],
  yellow: ['Carton jaune pour {P} ({T}).', '{P} est averti après une faute grossière.', 'Tacle en retard de {P} : jaune.'],
  red: ['CARTON ROUGE ! {P} est expulsé !', 'Deuxième jaune pour {P}, c\'est le rouge !'],
  injury: ['{P} se tient la cuisse… il semble blessé.', 'Coup dur : {P} reste au sol, blessé.'],
  half: ['Mi-temps : {SC}.'],
  et: ['Égalité ! Place aux prolongations !'],
  end: ['Coup de sifflet final ! {SC}.']
};
function fmt(s, o) { return s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? ''); }

const XG = { open: .13, cross: .085, long: .035, counter: .24, fk: .065, pen: .76, corner: .055 };

// ---------- Match ----------
class Match {
  constructor(G, f, homeTac, awayTac, opts = {}) {
    this.G = G; this.f = f; this.cup = !!opts.cup;
    this.minute = 0; this.done = false; this.et = false; this.extra = rint(1, 5);
    this.sides = [makeSide(G, f.h, homeTac), makeSide(G, f.a, awayTac)];
    this.score = [0, 0]; this.events = []; this.log = []; this.mom = 0; this.momLog = [];
    this.stats = [0, 1].map(() => ({ shots: 0, onT: 0, poss: 0, fouls: 0, corners: 0, xg: 0 }));
    this.pr = {};
    this.sides.forEach((s, i) => s.onPitch.forEach(x => this.addPR(x.id, i)));
    this.ball = { x: 50, y: 50, side: 0, ev: null };
    const H = getClub(G, f.h), A = getClub(G, f.a);
    this.names = [H.name, A.name];
    this.weather = opts.weather || pickWeather(dateOfWeek(G, G.week));
    this.wx = { fatigue: 1, fouls: 1, shot: 1, long: 1, cross: 1, contact: 1, muscle: 1, ...this.weather };
    this.att = attendanceFor(G, f, this.weather);
    this.say(fmt(pick(COMM.kick), { H: H.name, A: A.name, S: H.stadium, ATT: this.att.toLocaleString('fr-FR') }) + ` ${this.weather.icon} ${this.weather.label}, ${this.weather.temp}°C.`, 'info');
  }
  addPR(id, side) { this.pr[id] = { r: 6.3, g: 0, a: 0, min: 0, yel: 0, red: 0, side, sh: 0 }; }
  scoreStr() { return `${this.names[0]} ${this.score[0]}-${this.score[1]} ${this.names[1]}`; }
  minLabel() { return !this.et && this.minute > 90 ? `90+${this.minute - 90}` : String(this.minute); }
  say(text, type = '', side = null) { this.log.push({ m: this.minLabel(), text, type, side }); }
  pname(id) { return getPlayer(this.G, id).name; }
  gkOf(side) { return this.sides[side].onPitch.find(x => x.role === 'GB'); }
  setBall(side, depth, ev = null) {
    // depth 0 = propre but, 100 = but adverse (point de vue de l'équipe "side"); l'équipe 0 attaque vers la droite
    const x = side === 0 ? depth : 100 - depth;
    this.ball = { x: clamp(x, 1, 99), y: clamp(50 + gauss() * 22, 6, 94), side, ev };
  }

  step() {
    if (this.done) return;
    this.minute++;
    const G = this.G;
    this.sides.forEach(s => {
      for (const x of s.onPitch) {
        const p = getPlayer(G, x.id);
        const drain = .27 * (1 + .3 * Math.max(0, s.inst.press) + .1 * Math.max(0, s.inst.tempo)) * (1.3 - p.attrs.phy * .03) * (x.injured ? 2 : 1) * this.wx.fatigue;
        s.cond[x.id] = Math.max(12, s.cond[x.id] - drain);
        this.pr[x.id].min++;
      }
    });
    const S = this.sides.map(s => teamStrength(G, s));
    S[0].mid *= 1.06; S[0].att *= 1.06;
    this.sides.forEach((s, i) => { const miss = 11 - s.onPitch.length; if (miss > 0) { S[i].mid *= 1 - .07 * miss; S[i].def *= 1 - .06 * miss; S[i].att *= 1 - .05 * miss; } });
    const I = this.sides.map(s => s.inst), M = this.sides.map(s => s.mentality);
    const pw = i => Math.pow(S[i].mid, 1.5) * (1 + .03 * M[i]) * (1 + .05 * I[i].press) * (1 - .04 * I[i].pass) * (1 - .03 * I[i].tempo) * (1 - .03 * I[1 - i].line);
    const p0 = pw(0), p1 = pw(1);
    const atk = rnd() < p0 / (p0 + p1) ? 0 : 1, dfn = 1 - atk;
    this.stats[atk].poss++;
    this.setBall(atk, 35 + rnd() * 35);

    const ratio = S[atk].att / (S[dfn].def * .65 + S[dfn].mid * .35);
    const pc = .185 * Math.pow(ratio, 1.1) * (1 + .12 * M[atk]) * (1 - .07 * M[dfn]) * (1 + .10 * I[atk].tempo) * (1 + .04 * I[dfn].tempo)
      * (1 - .05 * I[dfn].press) * (1 + .04 * I[atk].pass) * (I[atk].line < 0 ? .95 : 1) * (I[dfn].line < 0 ? .9 : 1);
    if (rnd() < pc) {
      const paceRatio = clamp(S[atk].pace / Math.max(S[dfn].dpace, 1), .6, 1.6);
      const types = [['open', 50], ['cross', 18 * (1 + .6 * I[atk].width)], ['long', 11 * (1 + .6 * I[atk].pass)],
        ['counter', 9 * (1 + (I[dfn].line > 0 ? 1.2 * paceRatio : 0) + Math.max(0, M[dfn]) * .4 + (I[atk].tempo > 0 ? .3 : 0))]];
      this.shot(atk, dfn, weighted(types, t => t[1])[0]);
    } else if (rnd() < .06) {
      const x = pick(this.sides[atk].onPitch);
      if (x) this.say(fmt(pick(COMM.calm), { T: this.names[atk], P: getPlayer(G, x.id).name }), 'calm', atk);
    }
    // fautes
    if (rnd() < .2 * (1 + .25 * I[dfn].press) * this.wx.fouls) {
      this.stats[dfn].fouls++;
      const r = rnd();
      if (r < .0135) {
        const v = pick(this.sides[atk].onPitch.filter(x => x.role !== 'GB')) || this.sides[atk].onPitch[0];
        if (v) { this.say(fmt(pick(COMM.penAward), { P: this.pname(v.id) }), 'pen', atk); this.shot(atk, dfn, 'pen'); }
      } else if (r < .09) {
        const tk = this.sides[atk].takers.fk;
        if (tk && this.sides[atk].onPitch.some(x => x.id === tk) && rnd() < .5) this.say(fmt(pick(COMM.fkAward), { T: this.names[atk], P: this.pname(tk) }), 'info', atk);
        this.shot(atk, dfn, 'fk');
      }
      if (rnd() < .17) this.card(dfn);
    }
    // blessures : risque individuel (fatigue, fragilité, âge, rechute, météo, pressing adverse)
    this.sides.forEach((s, i) => {
      for (const x of s.onPitch.slice()) {
        if (x.injured) continue;
        const p = getPlayer(G, x.id), c = s.cond[x.id];
        const risk = injuryRiskMult(G, p);
        const contact = .00009 * (1 + .25 * Math.max(0, this.sides[1 - i].inst.press)) * this.wx.contact;
        const muscle = .00005 * (c < 50 ? 3 : c < 65 ? 1.8 : 1) * this.wx.muscle;
        if (rnd() < contact * risk) this.injureP(i, x, 'contact');
        else if (rnd() < muscle * risk) this.injureP(i, x, 'muscle');
      }
    });

    this.mom *= .9;
    this.momLog.push(Math.round(this.mom));
    const m = this.minute;
    if (m === 45 && !this.et) this.say(fmt(COMM.half[0], { SC: this.scoreStr() }), 'half');
    if (!this.et && m >= 90 + this.extra) {
      if (this.cup && this.score[0] === this.score[1]) {
        this.et = true; this.minute = 90; this.sides.forEach(s => s.subsLeft++);
        this.say(COMM.et[0], 'half');
      } else this.finish();
    } else if (this.et && m >= 120) {
      if (this.score[0] === this.score[1]) this.shootout();
      this.finish();
    }
  }

  shooter(side) {
    return weighted(this.sides[side].onPitch, x => {
      const L = ROLE_LINES[x.role]; const p = getPlayer(this.G, x.id);
      return ((L.att || 0) * 2.2 + (L.mid || 0) * .8 + (L.def || 0) * .15) * (p.attrs.fin + 9);
    });
  }

  pickShooter(side, type) {
    const s = this.sides[side], on = s.onPitch.filter(x => x.role !== 'GB');
    if (!on.length) return s.onPitch[0];
    if (type === 'pen' || type === 'fk') { const id = s.takers[type]; const x = on.find(y => y.id === id); if (x) return x; }
    const A = x => getPlayer(this.G, x.id).attrs;
    if (type === 'cross' || type === 'corner') {
      const w = { BU: 3, DC: 1.3, MOC: .8, AG: .6, AD: .6, MC: .6, MDC: .5, DG: .35, DD: .35 };
      return weighted(on, x => (w[x.role] || .3) * (A(x).phy + A(x).fin));
    }
    if (type === 'long') return weighted(on, x => ((ROLE_LINES[x.role].mid || 0) + (ROLE_LINES[x.role].att || 0) * .6) * (A(x).tec + A(x).fin));
    return this.shooter(side);
  }

  shot(atk, dfn, type) {
    const G = this.G, s = this.sides[atk];
    if (!s.onPitch.length) return;
    const sx = this.pickShooter(atk, type); if (!sx) return;
    const p = getPlayer(G, sx.id), A = p.attrs;
    const gkSlot = this.gkOf(dfn);
    const gkP = gkSlot ? getPlayer(G, gkSlot.id) : null;
    const gkR = gkP ? effRating(gkP, 'GB', this.sides[dfn].cond[gkSlot.id]) : 25;
    let q;
    switch (type) {
      case 'pen': q = (A.fin * 2 + A.men * 2 + A.tec) / 5 * 5; break;
      case 'fk': q = (A.tec * 2 + A.fin + A.pas) / 4 * 5; break;
      case 'cross': case 'corner': q = (A.fin * 2 + A.phy * 2 + A.men) / 5 * 5; break;
      case 'long': q = (A.tec * 2 + A.fin * 2 + A.phy) / 5 * 5; break;
      default: q = (A.fin * 4 + A.tec * 1.5 + A.men + A.dri * .5) / 7 * 5;
    }
    q *= .8 + .2 * s.cond[sx.id] / 100;
    let xg = XG[type] * Math.pow(q / gkR, type === 'pen' ? .35 : .9) * (1 - .04 * s.inst.tempo)
      * (type === 'pen' ? 1 : this.wx.shot) * (type === 'long' || type === 'fk' ? this.wx.long : 1) * (type === 'cross' || type === 'corner' ? this.wx.cross : 1);
    xg = clamp(xg, .01, .95);
    const st = this.stats[atk];
    st.shots++; st.xg += xg;
    this.pr[sx.id].sh++;
    const goal = rnd() < xg;
    const onT = goal || rnd() < (type === 'pen' ? .8 : .33);
    const T = this.names[atk], Gk = gkP ? gkP.name : 'le gardien';
    const depth = type === 'long' ? 72 : type === 'pen' ? 88 : 84 + rnd() * 8;
    if (goal) {
      if (['open', 'counter', 'cross'].includes(type) && rnd() < .05) {
        st.onT++;
        this.setBall(atk, 98, 'var');
        this.say(fmt(pick(COMM.var), { P: p.name }), 'var', atk);
        return;
      }
      st.onT++;
      this.score[atk]++;
      let assist = null;
      if (!['pen', 'fk'].includes(type)) {
        const others = s.onPitch.filter(x => x.id !== sx.id && x.role !== 'GB');
        if (type === 'corner' && s.takers.fk && others.some(x => x.id === s.takers.fk)) assist = s.takers.fk;
        else if (rnd() < .78 && others.length) assist = weighted(others, x => getPlayer(G, x.id).attrs.pas + getPlayer(G, x.id).attrs.dri * .5 + (WING_ROLES.has(x.role) && type === 'cross' ? 8 : 0)).id;
      }
      if (assist) { this.pr[assist].a++; this.pr[assist].r += .6; }
      this.pr[sx.id].g++; this.pr[sx.id].r += type === 'pen' ? .7 : 1.1;
      if (gkSlot) this.pr[gkSlot.id].r -= .35;
      this.sides[dfn].onPitch.forEach(x => { if (ROLE_LINES[x.role].def) this.pr[x.id].r -= .12; });
      this.events.push({ type: 'goal', side: atk, min: this.minLabel(), pid: sx.id, assist, kind: type });
      this.mom += atk === 0 ? 35 : -35;
      this.setBall(atk, 100, 'goal');
      s.talk = Math.min(1.04, (s.talk || 1) + .005);
      const txt = fmt(pick(COMM.goal[type]), { P: p.name, T, G: Gk, SC: `${this.score[0]}-${this.score[1]}` }) + (assist ? ` Passe décisive de ${this.pname(assist)}.` : '');
      this.say(txt, 'goal', atk);
      return;
    }
    this.mom += (atk === 0 ? 1 : -1) * (onT ? 9 : 5);
    if (onT) {
      st.onT++;
      if (gkSlot) this.pr[gkSlot.id].r += type === 'pen' ? .8 : .22;
      this.pr[sx.id].r += .05;
      this.setBall(atk, depth, 'save');
      if (type === 'pen' || rnd() < .65) this.say(fmt(pick(COMM.save[type]), { P: p.name, T, G: Gk }), type === 'pen' ? 'pen' : 'save', atk);
    } else {
      this.pr[sx.id].r -= .05;
      this.setBall(atk, depth, 'miss');
      if (type === 'pen' || type === 'counter' || rnd() < .5) this.say(fmt(pick(COMM.miss[type]), { P: p.name, T }), type === 'pen' ? 'pen' : 'chance', atk);
    }
    if (type !== 'corner' && type !== 'pen' && rnd() < .3) {
      st.corners++;
      if (rnd() < .22) this.shot(atk, dfn, 'corner');
    }
  }

  card(side) {
    const s = this.sides[side]; if (!s.onPitch.length) return;
    const x = weighted(s.onPitch, x => ((ROLE_LINES[x.role].def || .2) + .1) * (getPlayer(this.G, x.id).pers === 'Tempérament' ? 1.8 : 1));
    const pr = this.pr[x.id], p = getPlayer(this.G, x.id);
    if (rnd() < .035 || pr.yel === 1) {
      pr.red = 1; pr.r -= 1.5;
      this.say(fmt(pick(COMM.red), { P: p.name, T: this.names[side] }), 'red', side);
      this.events.push({ type: 'red', side, min: this.minLabel(), pid: x.id });
      s.onPitch = s.onPitch.filter(y => y !== x); s.sentOff.push(x.id);
      if (this.pendingInjury && this.pendingInjury.id === x.id) this.pendingInjury = null;
      this.mom += side === 0 ? -20 : 20;
    } else {
      pr.yel = 1; pr.r -= .3;
      this.say(fmt(pick(COMM.yellow), { P: p.name, T: this.names[side] }), 'yellow', side);
      this.events.push({ type: 'yellow', side, min: this.minLabel(), pid: x.id });
    }
  }

  injureP(side, x, kind) {
    const s = this.sides[side];
    if (this.events.some(e => (e.type === 'inj' || e.type === 'knock') && e.pid === x.id)) return;
    const p = getPlayer(this.G, x.id);
    const inj = sampleInjury(this.G, p, kind);
    if (inj.days <= 5 && kind === 'contact') {
      this.events.push({ type: 'knock', side, min: this.minLabel(), pid: x.id, inj });
      s.cond[x.id] = Math.max(15, s.cond[x.id] - 8);
      this.say(`${fmt(PART_COMM[inj.part] || COMM.injury[0], { P: p.name })} Après des soins, il reprend sa place.`, 'info', side);
      return;
    }
    this.events.push({ type: 'inj', side, min: this.minLabel(), pid: x.id, inj });
    this.say(`${fmt(PART_COMM[inj.part] || COMM.injury[0], { P: p.name })} Il ne peut pas continuer.`, 'inj', side);
    x.injured = true;
    if (s.ai || this.auto) this.autoSub(side, x);
    else this.pendingInjury = { side, id: x.id };
  }

  sub(side, outId, inId) {
    const s = this.sides[side];
    if (s.subsLeft <= 0) return false;
    const slot = s.onPitch.find(x => x.id === outId);
    if (!slot || !s.bench.includes(inId)) return false;
    slot.id = inId; slot.fresh = true; slot.injured = false;
    s.bench = s.bench.filter(i => i !== inId); s.subsLeft--;
    this.addPR(inId, side);
    this.events.push({ type: 'sub', side, min: this.minLabel(), pid: inId, out: outId });
    this.say(`Changement ${this.names[side]} : ${this.pname(inId)} remplace ${this.pname(outId)}.`, 'sub', side);
    return true;
  }

  autoSub(side, slot) {
    const s = this.sides[side];
    if (s.subsLeft <= 0) return;
    let best = null, bv = -1;
    for (const id of s.bench) {
      const v = effRating(getPlayer(this.G, id), slot.role, s.cond[id]);
      if (v > bv) { bv = v; best = id; }
    }
    if (best) this.sub(side, slot.id, best);
  }

  aiManage() {
    this.sides.forEach((s, i) => {
      if (!s.ai) return;
      if ([58, 68, 78].includes(this.minute) && s.subsLeft > 0 && !this.et) {
        const tired = s.onPitch.filter(x => x.role !== 'GB' && !x.fresh).sort((a, b) => s.cond[a.id] - s.cond[b.id])[0];
        if (tired && (s.cond[tired.id] < 70 || rnd() < .5)) this.autoSub(i, tired);
      }
      const diff = this.score[i] - this.score[1 - i];
      if (this.minute >= 70 || this.et) s.mentality = diff < 0 ? 1 : diff > 0 ? -1 : 0;
    });
  }

  shootout() {
    const G = this.G;
    const takers = this.sides.map(s => s.onPitch.filter(x => x.role !== 'GB').map(x => getPlayer(G, x.id))
      .sort((a, b) => (b.attrs.fin + b.attrs.men) - (a.attrs.fin + a.attrs.men)));
    const gks = this.sides.map((s, i) => { const g = this.gkOf(i); return g ? getPlayer(G, g.id).attrs.gar : 6; });
    const sc = [0, 0], taken = [0, 0];
    this.pens = [[], []];
    this.say('Séance de tirs au but !', 'half');
    for (let round = 0; round < 30; round++) {
      for (const i of [0, 1]) {
        const list = takers[i]; if (!list.length) continue;
        const p = list[round % list.length];
        const ok = rnd() < clamp(.74 + (p.attrs.fin + p.attrs.men - gks[1 - i] * 2) / 90, .55, .92);
        if (ok) sc[i]++;
        taken[i]++;
        this.pens[i].push(ok);
        this.say(`${ok ? '✅' : '❌'} ${p.name} (${this.names[i]}) — TAB ${sc[0]}-${sc[1]}`, ok ? 'penok' : 'penko', i);
        if (round < 5) {
          const rem0 = 5 - taken[0], rem1 = 5 - taken[1];
          if (sc[0] > sc[1] + rem1 || sc[1] > sc[0] + rem0) { this.penScore = sc; return; }
        }
      }
      if (round >= 4 && sc[0] !== sc[1]) break;
    }
    this.penScore = sc;
  }

  winner() {
    if (this.score[0] !== this.score[1]) return this.score[0] > this.score[1] ? 0 : 1;
    if (this.penScore) return this.penScore[0] > this.penScore[1] ? 0 : 1;
    return null;
  }

  finish() {
    this.done = true;
    this.say(fmt(COMM.end[0], { SC: this.scoreStr() }) + (this.penScore ? ` (${this.penScore[0]}-${this.penScore[1]} aux tirs au but)` : ''), 'end');
    const tot = this.stats[0].poss + this.stats[1].poss || 1;
    this.possPct = [Math.round(this.stats[0].poss / tot * 100), 0]; this.possPct[1] = 100 - this.possPct[0];
    const diff = this.score[0] - this.score[1];
    for (const id in this.pr) {
      const r = this.pr[id];
      if (r.min === 0) continue;
      const d = r.side === 0 ? diff : -diff;
      r.r += d > 0 ? .5 : d < 0 ? -.4 : 0;
      const p = getPlayer(this.G, +id);
      if ((ROLE_LINES[p.pos]?.def || p.pos === 'GB') && (r.side === 0 ? this.score[1] : this.score[0]) === 0) r.r += .6;
      if (r.min < 20) r.r = 6 + (r.r - 6) * .6;
      r.r = clamp(r.r + gauss() * .35, 3, 10);
    }
    const best = Object.entries(this.pr).filter(([, r]) => r.min > 0).sort((a, b) => b[1].r - a[1].r)[0];
    this.motm = best ? +best[0] : null;
  }

  runToEnd() { while (!this.done) { this.aiManage(); this.step(); } return this; }
}

// ---------- Application d'un résultat ----------
function applyMatch(G, mt, f) {
  f.res = [mt.score[0], mt.score[1]];
  f.pens = mt.penScore || null;
  f.et = mt.et;
  f.xg = [Math.round(mt.stats[0].xg * 10) / 10, Math.round(mt.stats[1].xg * 10) / 10];
  f.events = mt.events.filter(e => e.type === 'goal' || e.type === 'red').map(e => ({ t: e.type, s: e.side, m: e.min, p: e.pid }));
  f.motm = mt.motm;
  f.att = mt.att;
  const isLeague = String(f.comp).startsWith('L');
  const played = new Set();
  for (const id in mt.pr) {
    const r = mt.pr[id], p = getPlayer(G, +id);
    if (!p || r.min === 0) continue;
    played.add(p.id);
    p.stats.apps++; p.stats.goals += r.g; p.stats.assists += r.a;
    if (isLeague) p.stats.lg += r.g;
    p.stats.rating += r.r; p.stats.yel += r.yel; p.stats.red += r.red;
    if (mt.motm === p.id) p.stats.motm++;
    const side = mt.sides[r.side];
    p.fit = Math.round(clamp(side.cond[p.id] ?? p.fit, 20, 100));
    p.morale = clamp(p.morale + (r.r - 6.6) * 4, 5, 100);
    if (r.yel && !r.red) { p.yellow++; if (p.yellow % 5 === 0) { p.susp = 1; p.suspNew = true; } }
    if (r.red) { p.susp = Math.max(p.susp, rint(1, 3)); p.suspNew = true; }
    p.lastRating = Math.round(r.r * 10) / 10;
    p.form = [...(p.form || []), { w: G.week, s: G.season, r: p.lastRating }].slice(-10);
  }
  for (const e of mt.events) if (e.type === 'inj' || e.type === 'knock') applyInjury(G, getPlayer(G, e.pid), e.inj);
  const wnr = fixtureWinner(f);
  if (f.grp) {
    if (wnr) flow(G, getClub(G, wnr), 2.5e6, 'prize'); else { flow(G, getClub(G, f.h), .8e6, 'prize'); flow(G, getClub(G, f.a), .8e6, 'prize'); }
  }
  [f.h, f.a].forEach(id => { const c = getClub(G, id); const pts = wnr === id ? 3 : wnr == null ? 1 : 0; c.recent = [...(c.recent || []), pts].slice(-5); });
  if (wnr === G.clubId && isLeague && G.sponsor?.winBonus) flow(G, myClub(G), G.sponsor.winBonus, 'sponsor');
  if (f.a === G.clubId) flow(G, myClub(G), -(f.comp === 'EUR' ? 180000 : 25000) * clubEco(G, myClub(G)).coef, 'travel');
  const win = mt.winner();
  mt.sides.forEach((side, i) => {
    const won = win === i, lost = win === 1 - i;
    for (const p of clubPlayers(G, side.clubId)) {
      if (!played.has(p.id) && playerOvr(p) > 60) p.morale = clamp(p.morale - (p.pers === 'Ambitieux' ? 2.5 : 1.5), 5, 100);
      p.morale = clamp(p.morale + (won ? 2 : lost ? -2 : 0), 5, 100);
    }
  });
  const home = getClub(G, f.h);
  const gate = mt.att * ticketPrice(G, f);
  f.gate = Math.round(gate);
  if (f.comp === 'CUP') { flow(G, home, gate * .6, 'gate'); flow(G, getClub(G, f.a), gate * .4, 'gate'); }
  else flow(G, home, gate, 'gate');
}

function isKO(f) { return f.comp === 'CUP' || (f.comp === 'EUR' && !f.grp); }
function fixtureWinner(f) {
  if (!f.res) return null;
  if (f.res[0] !== f.res[1]) return f.res[0] > f.res[1] ? f.h : f.a;
  if (f.pens) return f.pens[0] > f.pens[1] ? f.h : f.a;
  return null;
}

// ---------- Compétitions ----------
function makeFixtures(clubIds, comp) {
  const ids = [...clubIds];
  if (ids.length % 2) ids.push(null);
  const n = ids.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i], b = ids[n - 1 - i];
      if (a == null || b == null) continue;
      round.push(r % 2 === 0 ? { h: a, a: b, res: null, comp } : { h: b, a: a, res: null, comp });
    }
    rounds.push(round);
    ids.splice(1, 0, ids.pop());
  }
  const second = rounds.map(r => r.map(f => ({ h: f.a, a: f.h, res: null, comp })));
  return [...rounds, ...second];
}

function domesticClubs(G) { return G.clubs.filter(c => !c.foreign); }
function leagueRoundAt(G, w = G.week) { let k = 0; for (let i = 0; i < Math.min(w, G.schedule.length); i++) if (G.schedule[i].t === 'L') k++; return k; }
function leagueRoundsTotal(G) { return G.schedule.filter(e => e.t === 'L').length; }
function knows(G, p) { return p.club === G.clubId || p.loan?.from === G.clubId || (G.known || []).includes(p.id); }
function estOvr(G, p) {
  const o = playerOvr(p);
  if (knows(G, p)) return o;
  const m = Math.max(1, 7 - (G.staff?.scout || 2));
  const h = ((p.id * 9301 + 49297) % 233280) / 233280 * 2 - 1;
  return Math.round(o + h * m);
}
function leagueComps(G) { return Object.values(G.comps).filter(c => c.type === 'league').sort((a, b) => a.div - b.div); }
function clubLeague(G, clubId) { return leagueComps(G).find(c => c.clubs.includes(clubId)); }

function cupRoundCount(n) { let P = 1; while (P * 2 <= n) P *= 2; return Math.log2(P) + (n > P ? 1 : 0); }
function cupRoundName(total, i, hasPrelim) {
  if (hasPrelim && i === 0) return 'Tour préliminaire';
  const rem = total - i;
  return ['Finale', 'Demi-finales', 'Quarts de finale', '8es de finale', '16es de finale', '32es de finale', '64es de finale'][rem - 1] || `Tour ${i + 1}`;
}

function setupSeason(G) {
  const dom = domesticClubs(G);
  const divs = [...new Set(dom.map(c => c.div || 1))].sort((a, b) => a - b);
  G.comps = {};
  divs.forEach((d, i) => {
    const id = 'L' + d;
    const ids = dom.filter(c => (c.div || 1) === d).map(c => c.id);
    G.comps[id] = { id, type: 'league', div: d, name: G.leagueNames[i] || `Division ${d}`, clubs: ids, fixtures: makeFixtures(shuffle([...ids]), id) };
  });
  const all = dom.map(c => c.id);
  const nCup = cupRoundCount(all.length);
  let P = 1; while (P * 2 <= all.length) P *= 2;
  G.comps.CUP = { id: 'CUP', type: 'cup', name: G.cupName || 'Coupe Nationale', rounds: [], alive: all, total: nCup, prelim: all.length > P, winner: null };
  const R = Math.max(...leagueComps(G).map(l => l.fixtures.length));
  const mid = {};
  const addMid = (r, entry) => { r = clamp(r, 0, R - 1); while ((mid[r] || []).length >= 1 && r < R - 1) r++; (mid[r] ||= []).push(entry); };
  for (let i = 0; i < nCup; i++) addMid(Math.round((i + 1) * R / (nCup + 1)) - 1, { t: 'C', r: i });
  setupEuro(G);
  if (G.comps.EUR) {
    for (let i = 0; i < 6; i++) addMid(1 + i * 3, { t: 'E', r: i });
    [.62, .76, .9].forEach((x, i) => addMid(Math.round(R * x), { t: 'E', r: 6 + i }));
  }
  G.schedule = [];
  for (let r = 0; r < R; r++) { G.schedule.push({ t: 'L', r }); for (const m of (mid[r] || []).sort((a, b) => a.t.localeCompare(b.t))) G.schedule.push(m); }
  G.week = 0;
  drawCup(G);
}

const EURO_KO = ['Quarts de finale', 'Demi-finales', 'Finale'];
function setupEuro(G) {
  const foreign = G.clubs.filter(c => c.foreign);
  const L1 = leagueComps(G)[0];
  if (foreign.length < 4 || !L1) { delete G.comps.EUR; return; }
  let dom = (G.euroQual || []).filter(id => { const c = getClub(G, id); return c && !c.foreign; });
  if (dom.length < 4) dom = L1.clubs.slice().sort((a, b) => getClub(G, b).rep - getClub(G, a).rep).slice(0, 4);
  const fr = foreign.map(c => ({ id: c.id, k: c.rep + rnd() * 14 })).sort((a, b) => b.k - a.k).slice(0, 12).map(x => x.id);
  const teams = [...dom.slice(0, 4), ...fr];
  const sorted = teams.slice().sort((a, b) => getClub(G, b).rep - getClub(G, a).rep);
  const pots = [0, 1, 2, 3].map(i => shuffle(sorted.slice(i * 4, i * 4 + 4)));
  const groups = 'ABCD'.split('').map((n, gi) => ({ name: n, clubs: pots.map(p => p[gi]).filter(x => x != null) }));
  groups.forEach(g => { g.fixtures = makeFixtures(g.clubs, 'EUR').slice(0, 6); g.fixtures.flat().forEach(f => f.grp = g.name); });
  const name = G.euroName || 'Coupe des Étoiles';
  G.comps.EUR = { id: 'EUR', type: 'euro', name, groups, ko: [], winner: null, teams };
  teams.forEach(id => flow(G, getClub(G, id), 3e6, 'prize'));
  const g = groups.find(g => g.clubs.includes(G.clubId));
  if (g) news(G, `${name} : tirage au sort ! Groupe ${g.name} avec ${g.clubs.filter(id => id !== G.clubId).map(id => getClub(G, id).name).join(', ')}. Prime de participation : 3 M€.`, 'cup');
}

function afterEuroRound(G, r) {
  const E = G.comps.EUR; if (!E) return;
  const me = G.clubId;
  if (r === 5) {
    const q = E.groups.map(g => tableOf(g.clubs, g.fixtures).map(x => x.id));
    const pairs = [[q[0]?.[0], q[1]?.[1]], [q[1]?.[0], q[0]?.[1]], [q[2]?.[0], q[3]?.[1]], [q[3]?.[0], q[2]?.[1]]].filter(p => p[0] != null && p[1] != null);
    E.ko.push({ name: EURO_KO[0], ties: pairs.map(([h, a]) => ({ h, a, res: null, comp: 'EUR' })) });
    if (E.teams.includes(me)) {
      const ok = pairs.flat().includes(me);
      news(G, ok ? `${E.name} : qualifiés pour les quarts de finale !` : `${E.name} : éliminés en phase de groupes.`, ok ? 'trophy' : 'loss');
      G.board.conf = clamp(G.board.conf + (ok ? 6 : -3), 0, 100);
    }
  } else if (r >= 6) {
    const last = E.ko[E.ko.length - 1]; if (!last) return;
    const winners = last.ties.map(fixtureWinner).filter(Boolean);
    const prize = [5e6, 8e6, 15e6][E.ko.length - 1] || 0;
    winners.forEach(id => flow(G, getClub(G, id), prize, 'prize'));
    const mineTie = last.ties.find(t => t.h === me || t.a === me);
    if (mineTie && fixtureWinner(mineTie) !== me) news(G, `${E.name} : élimination en ${last.name.toLowerCase()}.`, 'loss');
    if (winners.length === 1) {
      E.winner = winners[0];
      const wc = getClub(G, E.winner);
      wc.trophies = [...(wc.trophies || []), { season: G.season, name: E.name }];
      wc.rep = clamp(wc.rep + 3, 30, 97);
      news(G, `🏆 ${wc.name} remporte la ${E.name} !`, E.winner === me ? 'trophy' : 'info', E.winner !== me);
      if (E.winner === me) G.board.conf = clamp(G.board.conf + 20, 0, 100);
    } else {
      const ties = [];
      for (let i = 0; i + 1 < winners.length; i += 2) ties.push({ h: winners[i], a: winners[i + 1], res: null, comp: 'EUR' });
      E.ko.push({ name: EURO_KO[E.ko.length] || 'Tour', ties });
      if (winners.includes(me)) news(G, `${E.name} : qualifiés pour les ${EURO_KO[E.ko.length - 1].toLowerCase()} !`, 'trophy');
    }
  }
}

function drawCup(G) {
  const C = G.comps.CUP;
  const k = C.rounds.length;
  let alive = [...C.alive], byes = [];
  if (k === 0 && C.prelim) {
    let P = 1; while (P * 2 <= alive.length) P *= 2;
    const nPre = 2 * (alive.length - P);
    const sorted = alive.slice().sort((a, b) => getClub(G, a).rep - getClub(G, b).rep);
    const pre = sorted.slice(0, nPre);
    byes = alive.filter(id => !pre.includes(id));
    alive = pre;
  }
  shuffle(alive);
  const ties = [];
  for (let i = 0; i + 1 < alive.length; i += 2) {
    const [x, y] = [alive[i], alive[i + 1]];
    const h = getClub(G, x).rep <= getClub(G, y).rep ? x : y; // le "petit" reçoit
    ties.push({ h, a: h === x ? y : x, res: null, comp: 'CUP' });
  }
  const name = cupRoundName(C.total, k, C.prelim);
  C.rounds.push({ name, ties, byes });
  const mine = ties.find(t => t.h === G.clubId || t.a === G.clubId);
  if (mine) {
    const opp = getClub(G, mine.h === G.clubId ? mine.a : mine.h);
    news(G, `${C.name} — ${name} : tirage effectué. Vous affronterez ${opp.name} ${mine.h === G.clubId ? 'à domicile' : 'à l\'extérieur'}.`, 'cup');
  } else if (byes.includes(G.clubId)) news(G, `${C.name} — ${name} : votre club est exempté de ce tour.`, 'cup');
}

function afterCupRound(G) {
  const C = G.comps.CUP;
  const round = C.rounds[C.rounds.length - 1];
  const winners = round.ties.map(fixtureWinner).filter(Boolean);
  const mine = round.ties.find(t => t.h === G.clubId || t.a === G.clubId);
  if (mine) {
    const w = fixtureWinner(mine);
    const prize = roundMoney(150000 * Math.pow(1.7, C.rounds.length - 1));
    if (w === G.clubId) { flow(G, myClub(G), prize, 'prize'); G.board.conf = clamp(G.board.conf + 3, 0, 100); }
    else { news(G, `Élimination en ${C.name} (${round.name}).`, 'loss'); G.board.conf = clamp(G.board.conf - (getClub(G, w).div > myClub(G).div ? 8 : 3), 0, 100); }
  }
  C.alive = [...winners, ...round.byes];
  if (C.alive.length === 1) {
    C.winner = C.alive[0];
    const wc = getClub(G, C.winner);
    wc.trophies = [...(wc.trophies || []), { season: G.season, name: C.name }];
    flow(G, wc, 5e6, 'prize');
    news(G, `🏆 ${wc.name} remporte la ${C.name} ${G.season}/${G.season + 1} !`, C.winner === G.clubId ? 'trophy' : 'info', C.winner !== G.clubId);
    if (C.winner === G.clubId) { G.board.conf = clamp(G.board.conf + 15, 0, 100); }
  } else if (C.alive.length > 1) drawCup(G);
}

function weekFixtures(G, w = G.week) {
  const e = G.schedule[w];
  if (!e) return [];
  if (e.t === 'L') return leagueComps(G).flatMap(l => l.fixtures[e.r] || []);
  if (e.t === 'E') { const E = G.comps.EUR; if (!E) return []; return e.r < 6 ? E.groups.flatMap(g => g.fixtures[e.r] || []) : (E.ko[e.r - 6]?.ties || []); }
  return G.comps.CUP.rounds[e.r]?.ties || [];
}
function compName(G, f) { return f.comp === 'CUP' ? G.comps.CUP.name : f.comp === 'EUR' ? G.comps.EUR?.name : G.comps[f.comp]?.name; }
function weekLabel(G, w = G.week) {
  const e = G.schedule?.[w];
  if (!e) return 'Fin de saison';
  if (e.t === 'L') return `J${e.r + 1}`;
  if (e.t === 'E') return e.r < 6 ? `Europe J${e.r + 1}` : `Europe ${EURO_KO[e.r - 6]}`;
  return G.comps.CUP.rounds[e.r]?.name || 'Coupe';
}
function dateOfWeek(G, w) {
  const d = new Date(G.season, 7, 9);
  const k = leagueRoundAt(G, w), e = G.schedule[w];
  const R = leagueRoundsTotal(G);
  const days = e && e.t !== 'L' ? (k - 1) * 7 + 3 : k * 7;
  d.setDate(d.getDate() + Math.max(0, days) + (k >= R / 2 ? 14 : 0));
  return d;
}

function standings(G, compId) {
  const comp = G.comps[compId];
  return tableOf(comp.clubs, comp.fixtures);
}
function tableOf(clubs, fixtures) {
  const T = {};
  for (const id of clubs) T[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  for (const round of fixtures) for (const f of round) {
    if (!f.res) continue;
    const [h, a] = f.res, H = T[f.h], A = T[f.a];
    if (!H || !A) continue;
    H.p++; A.p++; H.gf += h; H.ga += a; A.gf += a; A.ga += h;
    if (h > a) { H.w++; A.l++; H.pts += 3; H.form.push('V'); A.form.push('D'); }
    else if (h < a) { A.w++; H.l++; A.pts += 3; H.form.push('D'); A.form.push('V'); }
    else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('N'); A.form.push('N'); }
  }
  return Object.values(T).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}
function promoSpots(comp) { return Math.min(3, Math.floor(comp.clubs.length / 6)); }

// ---------- Semaine ----------
function bumpAttr(p, d, keys) {
  let ks = keys && keys.length ? keys : Object.keys(ROLES[p.pos].w);
  if (p.pos === 'GB' && d > 0 && !(keys && keys.length)) ks = ['gar', 'gar', 'men', 'phy'];
  const k = keys && keys.length ? pick(ks) : weighted(ks, k => ROLES[p.pos].w[k] || .1);
  p.attrs[k] = clamp(p.attrs[k] + d, 1, 20);
  return k;
}

function weeklyUpdate(G, full = true) {
  const tr = G.training || { focus: 'equilibre', intensity: 1 };
  const focus = TRAINING[tr.focus] || TRAINING.equilibre;
  const st = G.staff || {}, fac = G.fac || {};
  if (full) G.weekProg = [];
  for (const p of G.players) {
    const mine = p.club === G.clubId;
    let rec = 22 + p.attrs.phy * .4;
    if (mine) rec += (st.physio || 2) * 1.5 + (full ? [8, 0, -8][tr.intensity] + (tr.focus === 'repos' ? 15 : 0) : 0);
    p.fit = clamp(p.fit + rec * (full ? 1 : .45), 0, 100);
    if (p.suspNew) p.suspNew = false; else if (p.susp > 0) p.susp--;
    if (!full) continue;
    tickMedical(G, p, 7);
    trainingInjuries(G, p);
    const target = p.pers === 'Loyal' ? 72 : 66;
    p.morale = clamp(p.morale + (target - p.morale) * .05 + (mine && tr.focus === 'repos' ? 3 : 0), 5, 100);
    if (p.club == null) continue;
    const o = playerOvr(p);
    let chance = p.age <= 21 ? .16 : p.age <= 24 ? .11 : p.age <= 28 ? .04 : 0;
    if (p.pers === 'Professionnel') chance *= 1.25;
    if (p.loan) chance *= 1.15;
    if (mine) chance *= [.6, 1, 1.4][tr.intensity] * (tr.focus === 'repos' ? 0 : 1) * (.75 + .1 * (st.coach || 2) + .07 * (fac.training || 2));
    if (o < p.pot && rnd() < chance) {
      const k = bumpAttr(p, 1, mine ? focus.keys : null);
      if (mine) G.weekProg.push({ pid: p.id, k, d: 1 });
    }
    if (p.age >= 31 && rnd() < .035 * (p.age - 29) / 2) bumpAttr(p, -1, rnd() < .6 ? ['vit', 'phy'] : null);
  }
  if (!full) return;
  for (const c of G.clubs) c.coh = clamp((c.coh ?? 60) + 1.2 + (c.id === G.clubId && tr.focus === 'tactique' ? 2.5 : 0), 0, 100);
  weeklyFinances(G);
  G.promises = (G.promises || []).filter(pr => {
    const p = getPlayer(G, pr.pid);
    if (!p || p.club !== G.clubId) return false;
    if (p.stats.apps > pr.apps) { p.morale = clamp(p.morale + 5, 0, 100); return false; }
    if (G.week >= pr.until) { p.morale = clamp(p.morale - 25, 0, 100); news(G, `${p.name} est furieux : tu n'as pas tenu ta promesse de temps de jeu.`, 'warn'); return false; }
    return true;
  });
  // chantiers
  if (fac.build && leagueRoundAt(G) + 1 >= fac.build.done) {
    const b = fac.build; delete fac.build;
    if (b.type === 'stadium') { myClub(G).capacity += 5000; news(G, `🏗 Travaux terminés : le stade compte désormais ${myClub(G).capacity.toLocaleString('fr-FR')} places !`, 'board'); }
    else { fac[b.type] = (fac[b.type] || 2) + 1; news(G, `🏗 Travaux terminés : ${FACILITIES[b.type].label} niveau ${fac[b.type]} !`, 'board'); }
  }
  // recrutement
  G.scouting = (G.scouting || []).filter(sc => {
    sc.left--;
    if (sc.left > 0) return true;
    const p = getPlayer(G, sc.pid);
    if (p) {
      (G.known ||= []).push(p.id);
      const o = playerOvr(p), grade = o >= myClub(G).rep + 5 ? 'A — un renfort majeur' : o >= myClub(G).rep - 3 ? 'B — un bon élément' : 'C — pas au niveau de l\'équipe type';
      news(G, `🔎 Rapport de recrutement : ${p.name} (${p.pos}, ${p.age} ans) — note ${o}, potentiel ${starsTxt(p.pot)}. Avis : ${grade}.`, 'scout');
    }
    return false;
  });
  // humeur des joueurs
  for (const p of clubPlayers(G, G.clubId)) {
    p.sad = p.morale < 30 ? (p.sad || 0) + 1 : 0;
    if (p.sad >= 4 && !p.wantsOut) {
      p.wantsOut = true; p.listed = true;
      myClub(G).coh = clamp((myClub(G).coh ?? 60) - 4, 0, 100);
      news(G, `😤 ${p.name} demande officiellement à être transféré. Il est placé sur la liste des transferts.`, 'warn');
    } else if (p.wantsOut && p.morale > 55) {
      p.wantsOut = false;
      news(G, `${p.name} a retrouvé le sourire et retire sa demande de transfert.`, 'info');
    }
  }
  const club = myClub(G);
  if (club.budget < -5e6) G.board.conf = clamp(G.board.conf - 1.5, 0, 100);
  G.fin.hist = [...(G.fin.hist || []), Math.round(club.budget)].slice(-120);
  G.talked = {};
}

function windowOpen(G) {
  const R = leagueRoundsTotal(G), lr = leagueRoundAt(G), mid = Math.floor(R / 2);
  return lr < 6 || (lr >= mid && lr < mid + 4);
}

function marketValue(p) { return calcValue(p); }

function aiTransfers(G) {
  if (!windowOpen(G)) return;
  for (const c of G.clubs) {
    if (c.id === G.clubId || rnd() > .1) continue;
    const squad = clubPlayers(G, c.id);
    if (squad.length >= 28) continue;
    const byPos = {};
    for (const r of Object.keys(ROLES)) byPos[r] = squad.filter(p => p.pos === r).map(playerOvr).sort((a, b) => b - a)[0] || 0;
    const need = Object.keys(byPos).sort((a, b) => byPos[a] - byPos[b])[0];
    const targets = G.players.filter(p => p.pos === need && !p.loan && p.club !== c.id && p.club !== G.clubId && playerOvr(p) > byPos[need] && marketValue(p) < c.budget * .4 && playerOvr(p) < c.rep + 18);
    if (!targets.length) continue;
    const t = pick(targets);
    const fee = t.club != null ? marketValue(t) : 0;
    const from = t.club != null ? getClub(G, t.club) : null;
    if (from && clubPlayers(G, from.id).length <= 20) continue;
    flow(G, c, -fee, 'transfers'); if (from) flow(G, from, fee, 'sales');
    t.wage = Math.max(roundMoney(t.wage * .9), demandWage(G, t, c));
    t.club = c.id; t.listed = false; t.contract = rint(2, 5); t.num = null; assignNumbers(clubPlayers(G, c.id));
    c.coh = clamp((c.coh ?? 60) - 3, 0, 100);
    news(G, `${t.name} quitte ${from ? from.name : 'les agents libres'} pour ${c.name}${fee ? ` (${money(fee)})` : ''}.`, 'transfer', true);
  }
}

function aiOffers(G) {
  if (!windowOpen(G)) return;
  const me = myClub(G);
  for (const p of clubPlayers(G, G.clubId)) {
    if (p.loan || G.offers.some(o => o.pid === p.id)) continue;
    const ovr = playerOvr(p);
    if (ovr >= me.rep + 4 && p.age <= 29 && rnd() < .035) {
      const big = G.clubs.filter(c => c.id !== G.clubId && c.rep >= me.rep + 6 && c.budget > marketValue(p) * 1.2);
      if (big.length) {
        const b = pick(big);
        const fee = roundMoney(marketValue(p) * (1.3 + rnd() * .4));
        G.offers.push({ id: Date.now() + Math.floor(rnd() * 1e6), pid: p.id, club: b.id, fee, week: G.week, max: roundMoney(fee * 1.15), star: true });
        p.morale = clamp(p.morale + 5, 0, 100);
        news(G, `📰 ${b.name} veut ${p.name} ! Offre de ${money(fee)}. Le joueur est flatté… attention à sa réaction si tu refuses.`, 'offer');
        continue;
      }
    }
    const chance = p.listed ? .35 : .02;
    if (rnd() > chance) continue;
    const buyers = G.clubs.filter(c => c.id !== G.clubId && c.budget > marketValue(p) * .8 && c.rep >= playerOvr(p) - 25);
    if (!buyers.length) continue;
    const b = pick(buyers);
    const fee = roundMoney(marketValue(p) * (p.listed ? .75 + rnd() * .35 : .95 + rnd() * .5));
    G.offers.push({ id: Date.now() + Math.floor(rnd() * 1e6), pid: p.id, club: b.id, fee, week: G.week, max: roundMoney(fee * (1.05 + rnd() * .25)) });
    news(G, `${b.name} propose ${money(fee)} pour ${p.name}.`, 'offer');
  }
  G.offers = G.offers.filter(o => {
    if (G.week - o.week < 5) return true;
    if (o.star) { const p = getPlayer(G, o.pid); if (p && p.club === G.clubId) { p.morale = clamp(p.morale - 12, 5, 100); news(G, `${p.name} est déçu que son transfert vers ${getClub(G, o.club).name} n'ait pas abouti.`, 'warn'); } }
    return false;
  });
}

// ---------- Journal ----------
function pressHeadlines(G) {
  const items = [];
  for (const L of leagueComps(G)) {
    for (const r of standings(G, L.id)) {
      const f = r.form; if (f.length < 4) continue;
      let n = 0; const last = f[f.length - 1];
      for (let i = f.length - 1; i >= 0 && f[i] === last; i--) n++;
      const c = getClub(G, r.id);
      if (![4, 6, 8, 10, 12, 15].includes(n)) continue;
      if (last === 'V' && n >= 4) items.push({ w: n + (c.id === G.clubId ? 4 : 0), t: `🔥 ${c.name} enchaîne ${n} victoires consécutives en ${L.name} !` });
      if (last === 'D' && n >= 4) items.push({ w: n + (c.id === G.clubId ? 4 : 0), t: `😰 Crise à ${c.name} : ${n} défaites de suite. ${c.id === G.clubId ? 'La presse s\'interroge sur l\'avenir de l\'entraîneur.' : ''}` });
    }
    const top = topScorers(G, L.id, 1)[0];
    if (top && top.stats.lg >= 5 && top.stats.lg % 5 === 0 && top.lastPressGoals !== top.stats.lg) {
      top.lastPressGoals = top.stats.lg;
      items.push({ w: 5, t: `⚽ ${top.name} (${getClub(G, top.club).name}) déjà ${top.stats.lg} buts en ${L.name} !` });
    }
  }
  if (windowOpen(G) && rnd() < .7) {
    const stars = G.players.filter(p => p.club != null && !getClub(G, p.club).foreign && playerOvr(p) >= 74 && !p.loan);
    const p = stars.length ? pick(stars) : null;
    if (p) {
      const from = getClub(G, p.club);
      const bigs = G.clubs.filter(c => c.rep > from.rep + 3 && c.id !== p.club);
      if (bigs.length) {
        const b = pick(bigs);
        items.push({ w: p.club === G.clubId ? 7 : 3, t: `🗞 Rumeur : ${b.name} suivrait de près ${p.name} (${from.name}).` });
        if (p.club === G.clubId) p.morale = clamp(p.morale - 2, 5, 100);
      }
    }
  }
  if (!items.length) return;
  items.sort((a, b) => b.w - a.w);
  items.slice(0, rnd() < .5 ? 1 : 2).forEach(i => news(G, i.t, 'press'));
}

function news(G, text, type = 'info', worldOnly = false) {
  G.inbox.unshift({ text, type, week: G.week, season: G.season, read: false, world: worldOnly, label: weekLabel(G) });
  if (G.inbox.length > 200) G.inbox.length = 200;
}

function money(v) {
  const neg = v < 0; v = Math.abs(v);
  let s;
  if (v >= 1e6) s = (v / 1e6).toFixed(v >= 1e8 ? 0 : 1).replace('.0', '') + ' M€';
  else if (v >= 1e3) s = Math.round(v / 1e3) + ' k€';
  else s = Math.round(v) + ' €';
  return (neg ? '-' : '') + s;
}

// ---------- Président ----------
function boardAfterMatch(G, f) {
  if (!f.res) return;
  const home = f.h === G.clubId;
  const me = myClub(G), opp = getClub(G, home ? f.a : f.h);
  const exp = clamp(.5 + (me.rep - opp.rep) / 60 + (home ? .06 : -.06), .1, .9);
  const w = fixtureWinner(f);
  const actual = w === G.clubId ? 1 : w == null ? .5 : 0;
  G.board.conf = clamp(G.board.conf + (actual - exp) * 5 + (55 - G.board.conf) * .04, 0, 100);
}

// ---------- Récompenses ----------
function monthlyAwards(G) {
  for (const L of leagueComps(G)) {
    let best = null, bv = 0;
    for (const p of G.players) {
      if (!L.clubs.includes(p.club)) continue;
      const recent = (p.form || []).filter(x => x.s === G.season && x.w > G.week - 7);
      if (recent.length < 3) continue;
      const avg = recent.reduce((s, x) => s + x.r, 0) / recent.length;
      if (avg > bv) { bv = avg; best = p; }
    }
    if (best) {
      G.awards.monthly.unshift({ season: G.season, week: G.week, comp: L.name, pid: best.id, avg: Math.round(bv * 100) / 100 });
      const mine = best.club === G.clubId;
      news(G, `⭐ Joueur du mois en ${L.name} : ${best.name} (${getClub(G, best.club).name}, ${bv.toFixed(2)} de moyenne).`, mine ? 'trophy' : 'info', !mine);
      if (mine) best.morale = clamp(best.morale + 10, 0, 100);
    }
  }
  G.awards.monthly.length = Math.min(G.awards.monthly.length, 60);
}

function seasonAwards(G) {
  const L = leagueComps(G)[0];
  const ps = G.players.filter(p => L.clubs.includes(p.club) && p.stats.apps >= 10);
  const avg = p => p.stats.rating / p.stats.apps;
  const score = p => avg(p) * 10 + p.stats.goals * .4 + p.stats.assists * .25 + p.stats.motm * .5;
  const best = ps.slice().sort((a, b) => score(b) - score(a))[0];
  const young = ps.filter(p => p.age <= 21).sort((a, b) => score(b) - score(a))[0];
  const scorer = G.players.filter(p => L.clubs.includes(p.club)).sort((a, b) => b.stats.lg - a.stats.lg)[0];
  const gk = ps.filter(p => p.pos === 'GB').sort((a, b) => avg(b) - avg(a))[0];
  const team = [], used = new Set();
  for (const [role] of FORMATIONS['4-3-3']) {
    const c = ps.filter(p => !used.has(p.id) && (p.pos === role || (role === 'MDC' && p.pos === 'MC') || (role === 'MC' && p.pos === 'MOC'))).sort((a, b) => avg(b) - avg(a))[0];
    if (c) { team.push({ role, pid: c.id }); used.add(c.id); }
  }
  const out = { season: G.season, comp: L.name, best: best?.id, young: young?.id, scorer: scorer?.id, scorerGoals: scorer?.stats.lg, gk: gk?.id, team };
  G.awards.seasons.unshift(out);
  return out;
}

// ---------- Fin de saison ----------
function objectiveLabel(G, obj = G.objective, comp = clubLeague(G, G.clubId)) {
  if (!comp) return '-';
  const n = comp.clubs.length;
  if (obj === 1) return 'Être champion';
  if (comp.div > 1 && obj <= promoSpots(comp)) return 'Monter en division supérieure';
  if (obj >= n - promoSpots(comp)) return 'Se maintenir';
  return `Finir dans le top ${obj}`;
}
function setObjective(G) {
  const L = clubLeague(G, G.clubId);
  const n = L.clubs.length, ps = promoSpots(L);
  const sorted = L.clubs.slice().sort((a, b) => getClub(G, b).rep - getClub(G, a).rep);
  const idx = sorted.indexOf(G.clubId);
  let obj;
  if (L.div === leagueComps(G)[0].div) obj = idx < 2 ? 1 : idx < 4 ? 3 : idx < 7 ? 6 : idx < 11 ? 10 : n - ps;
  else obj = idx < 3 ? Math.max(ps, 1) : idx < 8 ? 8 : n - ps;
  G.objective = Math.max(1, Math.min(obj, n));
}

function endSeason(G) {
  const S = { season: G.season, leagues: [], offers: [], promoted: [], relegated: [] };
  const L = leagueComps(G);
  const me = myClub(G);
  const myL = clubLeague(G, G.clubId);
  for (const comp of L) {
    const t = standings(G, comp.id);
    const champ = getClub(G, t[0].id);
    champ.trophies = [...(champ.trophies || []), { season: G.season, name: comp.name }];
    S.leagues.push({ name: comp.name, champion: champ.name });
    const top = comp.div === L[0].div;
    t.forEach((r, i) => {
      const c = getClub(G, r.id);
      if (c.id === G.clubId) { S.rank = i + 1; S.pts = r.pts; }
      c.rep = clamp(c.rep + (t.length / 2 - i) * .25 * (top ? 1 : .6), 30, 95);
    });
    if (champ.id === G.clubId) news(G, `🏆 CHAMPIONS ! ${me.name} remporte la ${comp.name} !`, 'trophy');
  }
  S.objective = G.objective; S.objLabel = objectiveLabel(G, G.objective, myL);
  S.met = S.rank <= G.objective;
  S.cupWinner = G.comps.CUP.winner ? getClub(G, G.comps.CUP.winner).name : null;
  S.awards = seasonAwards(G);
  S.euroWinner = G.comps.EUR?.winner ? getClub(G, G.comps.EUR.winner).name : null;
  G.euroQual = standings(G, L[0].id).slice(0, 4).map(r => r.id);
  S.met = S.rank <= G.objective;
  seasonEndFinances(G, S, L);
  const relegatedTop = L.length > 1 ? standings(G, L[0].id).slice(-Math.min(promoSpots(L[0]), promoSpots(L[1]))).map(r => r.id) : [];

  for (let i = 0; i + 1 < L.length; i++) {
    const down = L[i], up = L[i + 1];
    const n = Math.min(promoSpots(up), promoSpots(down));
    const tu = standings(G, up.id), td = standings(G, down.id);
    tu.slice(0, n).forEach(r => { const c = getClub(G, r.id); c.div = down.div; c.rep = Math.max(c.rep, 50); S.promoted.push(c.name); if (c.id === G.clubId) news(G, `🎉 PROMOTION ! ${c.name} monte en ${down.name} !`, 'trophy'); });
    td.slice(-n).forEach(r => { const c = getClub(G, r.id); c.div = up.div; S.relegated.push(c.name); if (c.id === G.clubId) news(G, `😞 Relégation : ${c.name} descend en ${up.name}.`, 'loss'); });
  }

  parachutes(G, relegatedTop, L[0]);
  S.control = financialControl(G);
  const cupRounds = G.comps.CUP.rounds.filter(r => r.ties.some(t => t.h === G.clubId || t.a === G.clubId));
  G.history.push({ season: G.season, comp: myL.name, rank: S.rank, pts: S.pts, objective: G.objective, objLabel: S.objLabel, met: S.met, cup: G.comps.CUP.winner === G.clubId ? 'Vainqueur' : (cupRounds.length ? cupRounds[cupRounds.length - 1].name : '-'), club: me.name });

  const relegated = S.relegated.includes(me.name);
  const delta = S.met ? 15 : S.rank <= G.objective + 2 ? -5 : -18;
  G.board.conf = clamp(G.board.conf + delta + (S.rank === 1 ? 10 : 0) - (relegated ? 25 : 0), 0, 100);
  S.sacked = G.board.conf < 20;
  if (S.met || S.rank <= 3) {
    const cands = G.clubs.filter(c => !c.foreign && c.id !== G.clubId && c.rep > me.rep + 2 && c.rep < me.rep + 16);
    shuffle(cands).slice(0, rint(1, 2)).forEach(c => S.offers.push(c.id));
  }

  for (const p of G.players) if (p.loan) {
    const back = p.loan.from;
    if (back === G.clubId) news(G, `Retour de prêt : ${p.name} (${p.stats.apps} matchs, ${p.stats.goals} buts chez ${getClub(G, p.club)?.name}).`, 'transfer');
    p.club = back; p.num = null; delete p.loan;
  }
  const retired = [];
  for (const p of G.players) {
    if (p.club != null && p.stats.apps > 0) {
      const c = getClub(G, p.club);
      p.hist = [...(p.hist || []), { season: G.season, club: c?.short || '?', apps: p.stats.apps, goals: p.stats.goals, assists: p.stats.assists, avg: Math.round(p.stats.rating / p.stats.apps * 100) / 100 }];
    }
    p.age++;
    const o = playerOvr(p);
    let delta = p.age <= 21 ? rint(1, 4) : p.age <= 24 ? rint(0, 3) : p.age <= 29 ? rint(-1, 1) : p.age <= 32 ? rint(-3, 0) : rint(-5, -1);
    if (delta > 0 && o >= p.pot) delta = 0;
    for (let i = 0; i < Math.abs(delta); i++) bumpAttr(p, Math.sign(delta));
    if (p.age > 31) p.attrs.vit = clamp(p.attrs.vit - rint(0, 1), 1, 20);
    p.stats = emptyStats(); p.yellow = 0; p.susp = 0; if (p.injury <= 0) p.fit = 100; else tickMedical(G, p, 35);
    p.attrs0 = { ...p.attrs };
    if (p.club != null) {
      p.contract--;
      if (p.contract <= 0) {
        if (p.club !== G.clubId && rnd() < .7) p.contract = rint(1, 3);
        else { if (p.club === G.clubId) news(G, `Fin de contrat : ${p.name} quitte le club.`, 'transfer'); p.club = null; p.contract = 0; }
      }
    }
    if (p.age >= 34 && rnd() < (p.age - 32) * .25) retired.push(p);
    if (p.club != null) p.wage = Math.max(p.wage, demandWage(G, p, getClub(G, p.club)) * .8);
  }
  const rset = new Set(retired.map(p => p.id));
  for (const p of retired) if (p.club === G.clubId) news(G, `${p.name} prend sa retraite à ${p.age} ans.`, 'info');
  G.players = G.players.filter(p => !rset.has(p.id));
  G.shortlist = (G.shortlist || []).filter(id => !rset.has(id));
  for (const c of G.clubs) {
    const mineC = c.id === G.clubId;
    const yb = mineC ? ((G.staff?.youth || 2) + (G.fac?.youth || 2) - 4) : 0;
    const n = rint(2, 3) + (mineC && (G.fac?.youth || 2) >= 4 ? 1 : 0);
    if (c.foreign) c.rep = clamp(c.rep + rint(-1, 1), 65, 95);
    for (let i = 0; i < n; i++) {
      const y = genPlayer(pick(SQUAD_TEMPLATE), 4 + c.rep / 14 + gauss() + yb * .3, { club: c.id, age: rint(16, 18), rep: c.rep });
      y.pot = clamp(y.pot + rint(0, 10) + yb * 2, playerOvr(y), 95); y.wage = 1000; y.contract = 3;
      if (c.id === G.clubId) news(G, `Centre de formation : ${y.name} (${ROLES[y.pos].label}, ${y.age} ans, potentiel ${starsTxt(y.pot)}) intègre l'effectif.`, 'youth');
      G.players.push(y);
    }
    while (c.id !== G.clubId && clubPlayers(G, c.id).length < 22) {
      const fa = G.players.filter(p => p.club == null).sort((a, b) => playerOvr(b) - playerOvr(a))[0];
      if (!fa) break; fa.club = c.id; fa.contract = rint(1, 3); fa.num = null;
    }
    assignNumbers(clubPlayers(G, c.id));
    c.coh = clamp((c.coh ?? 60) * .8 + 10, 0, 100);
  }
  for (let i = 0; i < 20; i++) G.players.push(genPlayer(pick(SQUAD_TEMPLATE), 6 + rnd() * 7, { club: null, age: rint(20, 32) }));
  for (const p of G.players) p.value = calcValue(p);
  reindex(G);

  G.season++;
  G.offers = []; G.promises = [];
  G.finPrev = G.fin;
  G.fin = emptyFin(G.fin.hist || []);
  G.medLog = (G.medLog || []).filter(x => x.season >= G.season - 1);
  setupSeason(G);
  if (!S.sacked) startClubSeason(G);
  return S;
}

function startClubSeason(G) {
  setObjective(G);
  setBoardBudgets(G);
  if (!G.sponsor) makeSponsorOffers(G);
  G.board.conf = clamp(G.board.conf * .6 + 25, 0, 100);
  G.tactics = { ...G.tactics, ...autoLineup(G, G.clubId, G.tactics.formation), takers: {} };
  news(G, `Nouvelle saison ${G.season}/${G.season + 1} ! Objectif du président : ${objectiveLabel(G).toLowerCase()} en ${clubLeague(G, G.clubId).name}.`, 'board');
}

function takeJob(G, clubId) {
  const old = myClub(G);
  G.clubId = clubId;
  const c = myClub(G);
  G.board = { conf: 60 };
  G.offers = []; G.promises = [];
  const f = c.style?.formation || '4-3-3';
  G.tactics = { formation: f, mentality: 0, inst: defaultInst(), takers: {}, ...autoLineup(G, clubId, f) };
  setObjective(G);
  G.sponsor = null; G.ticket = 2;
  setBoardBudgets(G); makeSponsorOffers(G);
  news(G, `${G.managerName} quitte ${old.name} et devient le nouvel entraîneur de ${c.name} ! Objectif : ${objectiveLabel(G).toLowerCase()}.`, 'board');
}

function topScorers(G, compId, n = 10) {
  const comp = G.comps[compId];
  const key = comp.type === 'league' ? 'lg' : 'goals';
  return G.players.filter(p => p.club != null && (comp.type !== 'league' || comp.clubs.includes(p.club)) && p.stats[key] > 0)
    .sort((a, b) => b.stats[key] - a.stats[key] || a.stats.apps - b.stats.apps).slice(0, n);
}

function starsTxt(v) { return (Math.round(clamp((v - 40) / 10, .5, 5) * 2) / 2).toFixed(1).replace('.0', '') + '★'; }

// ---------- Nouvelle partie ----------
function normalizeWorld(W) {
  W.leagueNames = W.leagueNames || [W.leagueName || 'Ligue Élite', 'Ligue Pro 2'];
  W.cupName = W.cupName || 'Coupe Nationale';
  W.euroName = W.euroName || 'Coupe des Étoiles';
  if (!W.clubs.some(c => c.foreign) && !W.noForeign) {
    const fr = genForeignClubs(Math.max(...W.clubs.map(c => c.id)) + 1, Math.max(0, ...W.players.map(p => p.id)) + 1);
    W.clubs.push(...fr.clubs); W.players.push(...fr.players);
  }
  const hasDiv = W.clubs.some(c => c.div && !c.foreign);
  const byRep = W.clubs.slice().sort((a, b) => b.rep - a.rep);
  W.clubs.forEach(c => {
    if (c.foreign) { c.div = 0; }
    else if (!hasDiv) { const dom = byRep.filter(x => !x.foreign); c.div = dom.length >= 24 && dom.indexOf(c) >= Math.ceil(dom.length / 2) ? 2 : 1; }
    c.style ||= clubStyle(); c.coh ??= 65; c.trophies ||= [];
  });
  W.players.forEach(p => {
    p.stats = { ...emptyStats(), ...(p.stats || {}) };
    p.form ||= []; p.hist ||= []; p.pers ||= 'Professionnel'; p.attrs0 ||= { ...p.attrs }; p.face ||= randomFace();
    p.frag ??= clamp(Math.round(8 + gauss() * 3.5), 1, 20);
  });
  if (!W.wagesScaled) {
    W.wagesScaled = true;
    for (const p of W.players) { const c = p.club != null ? W.clubs.find(x => x.id === p.club) : null; if (c) p.wage = roundMoney(p.wage * wageFactor(W, c)); }
  }
  for (const c of W.clubs) assignNumbers(W.players.filter(p => p.club === c.id));
}

function migrateGame(G) {
  G.staff ||= { assistant: 2, coach: 2, physio: 2, scout: 2, youth: 2 };
  G.staffNames ||= (() => { const n = shuffle(STAFF_NAMES.slice()); return Object.fromEntries(Object.keys(STAFF).map((k, i) => [k, n[i]])); })();
  G.fac ||= { training: 2, youth: 2 };
  G.known ||= []; G.scouting ||= []; G.euroName ||= 'Coupe des Étoiles';
  if (!G.fin?.inc) G.fin = emptyFin(G.fin?.hist || []);
  G.fac.medical ??= 2;
  G.ticket ??= 2;
  G.medLog ||= [];
  for (const p of G.players) {
    p.frag ??= clamp(Math.round(8 + gauss() * 3.5), 1, 20);
    if (p.injury > 0 && !p.inj) { p.injury *= 7; p.inj = { name: 'Blessure', part: '', kind: 'contact', days: p.injury, total: p.injury }; }
  }
  if (!G.clubs.some(c => c.foreign)) {
    const fr = genForeignClubs(Math.max(...G.clubs.map(c => c.id)) + 1, Math.max(...G.players.map(p => p.id)) + 1);
    G.clubs.push(...fr.clubs); G.players.push(...fr.players);
  }
  if (G.board && G.comps && G.board.wageCap == null) { reindex(G); setBoardBudgets(G); }
  if (G.comps && !G.sponsor && !G.sponsorOffers) makeSponsorOffers(G);
  return G;
}

function newGame(db, clubId, managerName) {
  const G = {
    version: 2, managerName: managerName || 'Coach', season: 2026, clubId,
    leagueNames: [...(db.leagueNames || [db.leagueName || 'Ligue Élite', 'Ligue Pro 2'])], cupName: db.cupName || 'Coupe Nationale',
    clubs: JSON.parse(JSON.stringify(db.clubs)), players: JSON.parse(JSON.stringify(db.players)),
    inbox: [], offers: [], history: [], shortlist: [], promises: [], awards: { monthly: [], seasons: [] },
    fin: emptyFin(),
    board: { conf: 60 }, training: { focus: 'equilibre', intensity: 1 }, talked: {}, euroName: db.euroName || 'Coupe des Étoiles',
    eco: JSON.parse(JSON.stringify(db.eco || {})), wagesScaled: !!db.wagesScaled
  };
  migrateGame(G);
  normalizeWorld(G);
  NEXT_PID = Math.max(...G.players.map(p => p.id)) + 1;
  reindex(G);
  setupSeason(G);
  setObjective(G);
  const club = myClub(G);
  const f = club.style?.formation || '4-3-3';
  G.tactics = { formation: f, mentality: 0, inst: defaultInst(), takers: {}, ...autoLineup(G, clubId, f) };
  setBoardBudgets(G);
  news(G, `Bienvenue à ${club.name}, ${G.managerName} ! Objectif du président : ${objectiveLabel(G).toLowerCase()}. Budget : ${money(club.budget)}.`, 'board');
  news(G, 'Le mercato d\'été est ouvert pendant les 6 premières semaines. Raccourcis : Espace = continuer, 1-9 = menus, / = recherche.', 'info');
  makeSponsorOffers(G);
  return G;
}

// ---------- Simulation d'une semaine (hors match du joueur) ----------
function simFixture(G, f) {
  const m = new Match(G, f, aiTactics(G, f.h, f.a), aiTactics(G, f.a, f.h), { cup: isKO(f) });
  m.sides[0].ai = m.sides[1].ai = true; m.auto = true;
  m.runToEnd(); applyMatch(G, m, f);
  return m;
}

// Termine la semaine : simule les autres matchs et fait avancer le monde
function completeWeek(G, skipFixture) {
  const e = G.schedule[G.week];
  for (const f of weekFixtures(G)) if (f !== skipFixture && !f.res) simFixture(G, f);
  if (e.t === 'C') afterCupRound(G);
  if (e.t === 'E') afterEuroRound(G, e.r);
  const full = e.t === 'L';
  weeklyUpdate(G, full);
  if (full) { aiTransfers(G); aiOffers(G); }
  for (const p of G.players) p.value = calcValue(p);
  G.week++;
  if (!full) return G.week > 10 && G.board.conf < 10 ? 'sacked' : null;
  const lr = leagueRoundAt(G), R = leagueRoundsTotal(G), mid = Math.floor(R / 2);
  if (lr % 4 === 0 && lr < R) monthlyAwards(G);
  pressHeadlines(G);
  if (lr === 6) news(G, 'Le mercato d\'été est fermé.', 'info');
  if (lr === mid) news(G, 'Le mercato d\'hiver ouvre pour 4 semaines !', 'info');
  if (lr === mid + 4) news(G, 'Le mercato d\'hiver est fermé.', 'info');
  if (lr === mid - 2 || lr === R - 6) {
    const exp = clubPlayers(G, G.clubId).filter(p => p.contract <= 1 && !p.loan);
    if (exp.length) news(G, `Contrats qui expirent en fin de saison : ${exp.map(p => p.name).join(', ')}. Prolonge-les ou ils partiront libres.`, 'warn');
  }
  const conf = G.board.conf;
  if (lr > 8 && conf < 10) return 'sacked';
  if (conf < 25 && lr % 3 === 0) news(G, 'Le président est très inquiet. Les résultats doivent s\'améliorer rapidement, sinon…', 'board');
  return null;
}
