// ============================================================
//  Moteur de match v5 : simulation ACTION PAR ACTION
//  ~10 actions par minute. Chaque action = un joueur réel avec le ballon
//  face au défenseur le plus proche. Positions dynamiques, pressing,
//  hors-jeu, contres, xG géométrique, stats individuelles.
//  Coordonnées absolues : X 0→100 (but domicile → but extérieur), Y 0→100.
// ============================================================
const ACTIONS_PER_MIN = 10;
const COMM2 = {
  through: ['Superbe ouverture de {P} dans la profondeur !', '{P} trouve un partenaire dans le dos de la défense !'],
  dribble: ['{P} élimine son vis-à-vis d\'un crochet !', 'Quel dribble de {P} ! Il s\'enfonce dans la défense.', '{P} accélère et laisse son défenseur sur place.'],
  tackle: ['Tacle parfait de {P} !', '{P} récupère le ballon avec autorité.', 'Belle interception de {P}.'],
  offside: ['Hors-jeu ! {P} était parti trop tôt.', 'Le drapeau se lève : {P} est signalé hors-jeu.'],
  counter: ['Contre-attaque de {T} !', '{T} part en contre, attention !'],
  block: ['Frappe de {P} contrée par la défense.', 'Le tir de {P} est bloqué !'],
  corner: ['Corner pour {T}.'],
  bigsave: ['Parade décisive de {G} devant {P} !', '{G} sort le grand jeu face à {P} !'],
  header: ['Tête de {P}… '],
  oneonone: ['{P} se retrouve seul face à {G} !']
};

class Match {
  constructor(G, f, homeTac, awayTac, opts = {}) {
    this.G = G; this.f = f; this.cup = !!opts.cup; this.firstLeg = opts.firstLeg || null;
    this.minute = 0; this.done = false; this.et = false; this.extra = rint(1, 5);
    this.sides = [makeSide(G, f.h, homeTac), makeSide(G, f.a, awayTac)];
    this.score = [0, 0]; this.events = []; this.log = []; this.mom = 0; this.momLog = [];
    this.stats = [0, 1].map(() => ({ shots: 0, onT: 0, poss: 0, fouls: 0, corners: 0, xg: 0, pas: 0, pasOk: 0, tkl: 0, int: 0, off: 0, saves: 0, dri: 0 }));
    this.pr = {};
    this.sides.forEach((s, i) => s.onPitch.forEach(x => this.addPR(x.id, i)));
    this.ball = { x: 50, y: 50, side: 0, ev: null };
    this.shots = []; this.xgTl = []; this.trace = []; this.traceId = 0; this.record = false;
    const H = getClub(G, f.h), A = getClub(G, f.a);
    this.names = [H.name, A.name];
    this.weather = opts.weather || pickWeather(dateOfWeek(G, G.week));
    this.wx = { fatigue: 1, fouls: 1, shot: 1, long: 1, cross: 1, contact: 1, muscle: 1, ...this.weather };
    this.att = attendanceFor(G, f, this.weather);
    this.say(fmt(pick(COMM.kick), { H: H.name, A: A.name, S: H.stadium, ATT: this.att.toLocaleString('fr-FR') }) + ` ${this.weather.icon} ${this.weather.label}, ${this.weather.temp}°C.`, 'info');
    this.mult = {};
    const mineIdx = this.sides.findIndex(s => s.clubId === G.clubId);
    if (mineIdx >= 0 && typeof bondVal === 'function') {
      const mineSet = new Set(this.sides[mineIdx].onPitch.map(x => x.id).concat(this.sides[mineIdx].bench));
      this.bondOf = (a, b) => mineSet.has(a) && mineSet.has(b) ? (bondVal(G, a, b) - 35) / 100 : 0;
    }
    this.kickoff(rnd() < .5 ? 0 : 1);
  }
  addPR(id, side) { this.pr[id] = { r: 6.6, g: 0, a: 0, min: 0, yel: 0, red: 0, side, sh: 0, shOT: 0, xg: 0, pas: 0, pasOk: 0, kp: 0, dri: 0, tkl: 0, int: 0, sav: 0, tch: 0 }; }
  scoreStr() { return `${this.names[0]} ${this.score[0]}-${this.score[1]} ${this.names[1]}`; }
  minLabel() { return !this.et && this.minute > 90 ? `90+${this.minute - 90}` : String(this.minute); }
  say(text, type = '', side = null) { this.log.push({ m: this.minLabel(), text, type, side }); }
  pname(id) { return getPlayer(this.G, id).name; }
  gkOf(side) { return this.sides[side].onPitch.find(x => x.role === 'GB'); }

  // ----- géométrie -----
  absX(side, d) { return side === 0 ? d : 100 - d; }
  absY(side, y) { return side === 0 ? y : 100 - y; }
  homeOf(side, slot) {
    const s = this.sides[side];
    const p = s.tac ? slotPos(s.tac, slot.slot) : { x: (FORMATIONS[s.formation][slot.slot] || [0, 50])[1], y: (FORMATIONS[s.formation][slot.slot] || [0, 50, 50])[2] };
    const md = slot.mods || {};
    const dep = clamp(6 + (100 - p.y) * .86 + (md.dd || 0), 3, 95);
    const lane = p.x + (50 - p.x) * (md.cy || 0);
    return { X: this.absX(side, dep), Y: this.absY(side, lane), role: slot.role };
  }
  changeFormation(side, tac) {
    const s = this.sides[side];
    const ids = s.onPitch.map(x => x.id);
    const order = remapLineup(this.G, ids, tac.formation, tac);
    const byId = Object.fromEntries(s.onPitch.map(x => [x.id, x]));
    s.onPitch = order.map((id, i) => { if (!id) return null; const x = byId[id]; x.slot = i; x.role = slotRole(tac, i); x.mods = slotMods(tac, i, x.role); x.hX = null; return x; }).filter(Boolean);
    s.formation = tac.formation; s.tac = tac;
    s.inst = { ...defaultInst(), ...(tac.inst || {}) }; s.mentality = tac.mentality ?? s.mentality;
    s.fam = side === this.my || s.clubId === this.G.clubId ? tacFam(this.G, tac.formation) : 80;
    this.say(`${this.names[side]} passe en ${tac.formation}.`, 'info', side);
  }
  // positions de toutes les joueurs (dépend du ballon et de la possession)
  positions() {
    const b = this.ball, out = this.posCache && this.posCache.length === this.sides[0].onPitch.length + this.sides[1].onPitch.length ? this.posCache : [];
    let k = 0;
    this.sides.forEach((s, i) => {
      const poss = this.st?.side === i;
      const lineShift = s.inst.line * 5 * (i === 0 ? 1 : -1);
      const ysh = .18 - s.inst.width * .05;
      s.onPitch.forEach(x => {
        if (x.hX == null || x.hF !== s.formation || x.hS !== x.slot) { const h = this.homeOf(i, x); x.hX = h.X; x.hY = h.Y; x.hF = s.formation; x.hS = x.slot; }
        let X = x.hX, Y = x.hY;
        if (x.role !== 'GB') {
          X += (b.x - 50) * .42 + (poss ? (i === 0 ? 7 : -7) : (i === 0 ? -5 : 5)) + lineShift;
          Y += (b.y - 50) * ysh;
        } else X += (b.x - 50) * .06;
        const q = out[k] || (out[k] = {});
        q.side = i; q.slot = x; q.X = X < 1 ? 1 : X > 99 ? 99 : X; q.Y = Y < 3 ? 3 : Y > 97 ? 97 : Y;
        k++;
      });
    });
    out.length = k;
    this.posCache = out;
    return out;
  }
  nearest(side, X, Y, excl = null, outfield = true) {
    let best = null, bd = 1e9;
    for (const q of this.posCache) {
      if (q.side !== side || q.slot === excl || (outfield && q.slot.role === 'GB')) continue;
      const d = (q.X - X) ** 2 + ((q.Y - Y) * .65) ** 2;
      if (d < bd) { bd = d; best = q; }
    }
    if (!best && outfield) return this.nearest(side, X, Y, excl, false);
    if (!best) { const s = this.sides[side].onPitch[0]; return s ? { side, slot: s, X, Y } : null; }
    return best;
  }
  receiver(side, X, Y, excl) {
    const pc = this.posCache, ws = this._ws || (this._ws = new Float64Array(30));
    let tot = 0;
    for (let i = 0; i < pc.length; i++) {
      const q = pc[i];
      if (q.side !== side || q.slot === excl || q.slot.role === 'GB') { ws[i] = 0; continue; }
      const dx = q.X - X, dy = (q.Y - Y) * .65;
      ws[i] = 1 / (6 + (dx * dx + dy * dy) / 30); tot += ws[i];
    }
    if (!tot) return null;
    let r = rnd() * tot;
    for (let i = 0; i < pc.length; i++) { r -= ws[i]; if (r <= 0 && ws[i] > 0) return pc[i]; }
    for (let i = pc.length - 1; i >= 0; i--) if (ws[i] > 0) return pc[i];
    return null;
  }
  // attribut effectif (forme du jour : condition, moral, poste, cohésion, causerie)
  ea(slot, k) { return this.G.pmap[slot.id].attrs[k] * (this.mult[slot.id] || 1); }
  computeMults() {
    this.defQ = [0, 0];
    this.sides.forEach((s, i) => {
      let q = 0, n = 0;
      for (const x of s.onPitch) if (x.role !== 'GB') { const p = getPlayer(this.G, x.id); q += (p.attrs.tac + p.attrs.men + p.attrs.vit) / 3; n++; }
      this.defQ[i] = n ? ((q / n) - 10) * .006 - (11 - s.onPitch.length) * .04 : 0;
    });
    this.sides.forEach((s, si) => {
      const cohF = (.93 + .07 * (s.coh ?? 60) / 100) * (si === 0 ? 1.045 : 1) * (.94 + .06 * (s.fam ?? 80) / 100) * (.97 + .03 * (s.atm ?? 60) / 100);
      for (const x of s.onPitch) {
        const p = getPlayer(this.G, x.id);
        const base = playerRoleRating(p, x.role) || 1;
        this.mult[x.id] = effRating(p, x.role, s.cond[x.id]) / base * cohF * (s.talk || 1) * (x.injured ? .7 : 1);
      }
    });
  }
  pressure(side, X, Y) {
    const D = this.sides[1 - side];
    let n = 0;
    for (const q of this.posCache) if (q.side !== side && q.slot.role !== 'GB' && Math.abs(q.X - X) < 12 && Math.abs(q.Y - Y) < 16) n++;
    const d = side === 0 ? X : 100 - X;
    let p = .1 + .09 * Math.min(n, 4) + .07 * D.inst.press * (d < 50 ? 1.5 : .6) - .03 * D.mentality + (d > 70 ? .14 : d > 55 ? .06 : 0) + this.defQ[1 - side];
    if (this.st.counter > 0) p -= .15;
    if (this.st.cp > 0) p += .15;
    if (D.mark.has(this.st.carrier?.id)) p += .12;
    return clamp(p, .03, .9);
  }

  // ----- état de jeu -----
  kickoff(side) {
    this.st = { side, d: 50, y: 50, counter: 0, oneOnOne: false, setPiece: null, carrier: null };
    this.ball = { x: 50, y: 50, side, ev: null };
    this.positions();
    const c = this.nearest(side, 50, 50);
    this.st.carrier = c ? c.slot : this.sides[side].onPitch[0];
  }
  give(side, slot, X, Y, opts = {}) {
    const st = this.st;
    const lostSide = st.side;
    st.side = side; st.carrier = slot;
    st.d = side === 0 ? X : 100 - X; st.y = side === 0 ? Y : 100 - Y;
    st.oneOnOne = false; st.setPiece = opts.setPiece || null;
    st.cp = 0;
    if (opts.turnover) {
      const L = this.sides[lostSide];
      if (L.inst.cpress) { st.cp = 2; }
      if (st.d >= 30 && st.d <= 65 && (L.inst.line > 0 || L.mentality > 0 || rnd() < .15) && rnd() < .35 + .1 * this.sides[side].inst.tempo) {
        st.counter = 3;
        if (rnd() < .4) this.say(fmt(pick(COMM2.counter), { T: this.names[side] }), 'calm', side);
      } else st.counter = 0;
    }
    this.ball = { x: clamp(X, 1, 99), y: clamp(Y, 2, 98), side, ev: opts.ev || null };
  }
  rec(ev = null) {
    if (!this.record) return;
    const pos = {};
    for (const q of this.posCache) pos[q.slot.id] = [q.X, q.Y];
    this.trace.push({ x: this.ball.x, y: this.ball.y, c: this.st.carrier?.id, side: this.st.side, pos, ev });
  }

  step() {
    if (this.done) return;
    this.minute++;
    const G = this.G;
    this.sides.forEach(s => {
      for (const x of s.onPitch) {
        const p = getPlayer(G, x.id);
        const drain = .27 * (1 + .3 * Math.max(0, s.inst.press) + .1 * Math.max(0, s.inst.tempo) + .12 * (s.inst.cpress || 0) + .1 * (x.mods?.press || 0) + (s.mark.size && ROLE_LINES[x.role].def ? .03 : 0)) * (1.3 - p.attrs.phy * .03) * (x.injured ? 2 : 1) * this.wx.fatigue;
        s.cond[x.id] = Math.max(12, s.cond[x.id] - drain);
        this.pr[x.id].min++;
      }
    });
    this.computeMults();
    this.trace = [];
    let n = ACTIONS_PER_MIN + (rnd() < .5 ? 1 : 0);
    this.sides.forEach((s, i) => {
      if (s.inst.waste && this.score[i] > this.score[1 - i]) {
        n -= 2;
        if (rnd() < .012) { const x = pick(s.onPitch); if (x) { this.say(`${this.pname(x.id)} prend son temps… l'arbitre sort le jaune pour anti-jeu.`, 'info', i); this.card(i, x); } }
      }
    });
    for (let i = 0; i < n && !this.done; i++) this.action();
    this.traceId++;
    // blessures
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
    this.xgTl.push([+this.stats[0].xg.toFixed(2), +this.stats[1].xg.toFixed(2)]);
    const m = this.minute;
    if (m === 45 && !this.et) { this.say(fmt(COMM.half[0], { SC: this.scoreStr() }), 'half'); this.kickoff(1); }
    const level = () => this.firstLeg ? this.score[0] + this.firstLeg[0] === this.score[1] + this.firstLeg[1] : this.score[0] === this.score[1];
    if (!this.et && m >= 90 + this.extra) {
      if (this.cup && level()) {
        this.et = true; this.minute = 90; this.sides.forEach(s => s.subsLeft++);
        this.say(COMM.et[0], 'half'); this.kickoff(0);
      } else this.finish();
    } else if (this.et && m >= 120) {
      if (level()) this.shootout();
      this.finish();
    }
  }

  // ----- une action -----
  action() {
    const G = this.G, st = this.st, side = st.side, A = this.sides[side], D = this.sides[1 - side];
    if (!A.onPitch.length) return this.kickoff(1 - side);
    if (!A.onPitch.includes(st.carrier)) { this.positions(); const n = this.nearest(side, this.ball.x, this.ball.y); st.carrier = n ? n.slot : A.onPitch[0]; }
    this.positions();
    const c = st.carrier, p = getPlayer(G, c.id);
    const X = this.ball.x, Y = this.ball.y;
    this.stats[side].poss++;
    this.pr[c.id].tch++;
    if (st.counter > 0) st.counter--;
    if (st.cp > 0) st.cp--;
    // coups de pied arrêtés
    if (st.setPiece) return this.setPiece(st.setPiece);
    const press = this.pressure(side, X, Y);
    const I = A.inst, M = A.mentality;
    const wide = st.y < 22 || st.y > 78, central = Math.abs(st.y - 50) < 24;
    const pa = this.ea(c, 'pas'), dr = this.ea(c, 'dri');
    const ctr = st.counter > 0 ? 1.6 : 1;
    const w = {
      shoot: st.d >= 68 ? ((st.d - 66) / 14.5) ** 2 * (central ? 1 : .3) * (1 + .2 * M) * (st.oneOnOne ? 10 : 1) * (this.ea(c, 'fin') + 6) / 16 * ({ GB: 0, BU: .58, DC: .6, DG: .7, DD: .7, MDC: .8, MC: 1, MOC: 1.15, AG: 1.05, AD: 1.05 }[c.role] ?? 1) : 0,
      cross: wide && st.d >= 62 ? 2.3 * (1 + .5 * I.width) * pa / 12 : 0,
      through: st.d >= 38 && st.d <= 78 ? .85 * (1 + .35 * I.tempo + .3 * I.pass) * pa / 12 * ctr : 0,
      dribble: c.role === 'GB' ? 0 : .75 * (dr / 11) * (1 + .25 * I.tempo) * (st.d > 55 ? 1.3 : .7) * ctr,
      fwd: 2.5 * (1 + .25 * I.tempo + .1 * M - .12 * I.pass) * ctr,
      safe: 2.7 * (1 - .25 * I.tempo) * (1 - .15 * I.pass) * (1 + press) * (1 - .1 * M) / ctr,
      long: (st.d < 45 ? .9 : .2) * (1 + .9 * I.pass) * (c.role === 'GB' ? 4 : 1)
    };
    const mw = c.mods?.w;
    if (mw) for (const k in w) if (mw[k] != null) w[k] *= mw[k];
    if (D.mark.has(c.id)) { w.shoot *= .7; w.dribble *= .7; w.safe *= 1.3; }
    let tot = 0; for (const k in w) tot += w[k];
    let r = rnd() * tot, act = 'safe';
    for (const k in w) { r -= w[k]; if (r <= 0) { act = k; break; } }
    this['a_' + act](c, p, press);
  }

  // passe générique ; renvoie true si réussie
  pass(c, kind, press) {
    const st = this.st, side = st.side, A = this.sides[side];
    const pr = this.pr[c.id];
    let dd, dy, base;
    if (kind === 'safe') { dd = rint(-10, 6); dy = rint(-22, 22); base = .96 - press * .22; }
    else if (kind === 'fwd') { dd = rint(8, 20); dy = rint(-18, 18); base = .84 - press * .3; }
    else { dd = rint(22, 42); dy = rint(-35, 35); base = .55 - press * .1; }
    const nd = clamp(st.d + dd, 3, 97), ny = clamp(st.y + dy, 3, 97);
    const TX = this.absX(side, nd), TY = this.absY(side, ny);
    const recv = this.receiver(side, TX, TY, c);
    if (!recv) return false;
    const def = this.nearest(1 - side, TX, TY);
    if (kind === 'long' && recv.slot.mods?.recv > 1 && rnd() < .4) { const t = this.posCache.find(q => q.side === side && q.slot.mods?.recv > 1); if (t) recv.slot = t.slot; }
    let prob = base + (this.ea(c, 'pas') - 10) * (kind === 'long' ? .01 : .0075) + (this.ea(c, 'tec') - 10) * .004;
    if (def) prob -= ((this.ea(def.slot, 'tac') + this.ea(def.slot, 'men')) / 2 - 10) * .008;
    if (nd > 70) prob -= .12;
    if (def?.slot.mods?.tk) prob -= def.slot.mods.tk * .02;
    if (this.sides[1 - side].mark.has(recv.slot.id)) prob -= .06;
    if (this.bondOf) prob += this.bondOf(c.id, recv.slot.id) * .045;
    prob += -.05 * A.inst.pass - .02 * A.inst.tempo;
    if (kind === 'long') { prob *= this.wx.long; if (def) prob += ((this.ea(recv.slot, 'phy') - this.ea(def.slot, 'phy')) * .015); }
    if (this.weather.key === 'rain' || this.weather.key === 'storm' || this.weather.key === 'snow') prob -= .03;
    prob = clamp(prob, .15, .97);
    pr.pas++; this.stats[side].pas++;
    if (rnd() < prob) {
      pr.pasOk++; this.stats[side].pasOk++;
      this.give(side, recv.slot, TX, TY);
      if (nd >= 70) { this.lastPasser = c.id; }
      this.rec();
      return true;
    }
    // perte de balle
    pr.r -= .03;
    if (def && rnd() < .07 * this.wx.fouls * (1 + .3 * this.sides[1 - side].inst.press)) return this.foul(1 - side, def.slot, this.ball.x, this.ball.y);
    if (def) {
      this.stats[1 - side].int++; this.pr[def.slot.id].int++; this.pr[def.slot.id].r += .02;
      this.give(1 - side, def.slot, TX, TY, { turnover: true });
    } else { const n = this.nearest(1 - side, TX, TY); this.give(1 - side, n.slot, TX, TY, { turnover: true }); }
    this.rec();
    return false;
  }
  a_safe(c, p, press) { this.pass(c, 'safe', press); }
  a_fwd(c, p, press) { this.lastPasser = null; this.pass(c, 'fwd', press); }
  a_long(c, p, press) { this.pass(c, 'long', press); }

  a_through(c, p, press) {
    const st = this.st, side = st.side, D = this.sides[1 - side];
    const nd = clamp(st.d + rint(15, 28), 3, 95), ny = clamp(50 + (st.y - 50) * .5 + rint(-12, 12), 5, 95);
    const TX = this.absX(side, nd), TY = this.absY(side, ny);
    const recv = this.receiver(side, TX, TY, c);
    if (!recv) return this.a_safe(c, p, press);
    const def = this.nearest(1 - side, TX, TY);
    this.pr[c.id].pas++; this.stats[side].pas++;
    // hors-jeu
    const offP = .1 + .09 * D.inst.line + .08 * (D.inst.trap || 0) - (this.ea(recv.slot, 'men') - 10) * .006;
    if (rnd() < offP) {
      this.stats[side].off++;
      if (rnd() < .5) this.say(fmt(pick(COMM2.offside), { P: this.pname(recv.slot.id) }), 'calm', side);
      const gk = this.gkOf(1 - side) || this.sides[1 - side].onPitch[0];
      this.give(1 - side, gk, TX, TY); this.rec('off');
      return;
    }
    let prob = .42 + (this.ea(c, 'pas') - 10) * .02 - press * .15;
    if (def) prob += (this.ea(recv.slot, 'vit') - this.ea(def.slot, 'vit')) * .018 - (this.ea(def.slot, 'men') - 10) * .01;
    prob += D.inst.line * .07 - .025 * this.sides[side].inst.tempo;
    if (rnd() < clamp(prob, .1, .85)) {
      this.pr[c.id].pasOk++; this.stats[side].pasOk++;
      this.give(side, recv.slot, TX, TY);
      this.lastPasser = c.id;
      const sweeper = (this.gkOf(1 - side)?.mods?.style === 'sweeper');
      if (rnd() < .3 + .15 * Math.max(0, D.inst.line) + .18 * (D.inst.trap || 0) - (sweeper ? .12 : 0) && nd > 70) {
        this.st.oneOnOne = true;
        if (rnd() < .5) this.say(fmt(pick(COMM2.oneonone), { P: this.pname(recv.slot.id), G: this.pname((this.gkOf(1 - side) || recv.slot).id) }), 'calm', side);
      } else if (rnd() < .15) this.say(fmt(pick(COMM2.through), { P: this.pname(c.id) }), 'calm', side);
      this.mom += side === 0 ? 3 : -3;
      this.rec();
    } else {
      this.pr[c.id].r -= .03;
      const n = def || this.nearest(1 - side, TX, TY);
      this.stats[1 - side].int++; this.pr[n.slot.id].int++;
      this.give(1 - side, n.slot, TX, TY, { turnover: true }); this.rec();
    }
  }

  a_dribble(c, p, press) {
    const st = this.st, side = st.side;
    const X = this.ball.x, Y = this.ball.y;
    const def = this.nearest(1 - side, X, Y);
    if (!def) return this.a_fwd(c, p, press);
    const att = this.ea(c, 'dri') + this.ea(c, 'vit') * .4 + this.ea(c, 'tec') * .3;
    const dfn = this.ea(def.slot, 'tac') + this.ea(def.slot, 'vit') * .4 + this.ea(def.slot, 'men') * .3 + (def.slot.mods?.tk || 0) * 1.2 + (this.sides[1 - side].mark.has(c.id) ? 1.5 : 0);
    const prob = clamp(.5 + (att - dfn) * .011 - press * .2, .12, .88);
    if (rnd() < prob) {
      this.pr[c.id].dri++; this.stats[side].dri++; this.pr[c.id].r += .06;
      st.d = clamp(st.d + rint(5, 12), 2, 96); st.y = clamp(st.y + rint(-10, 10), 3, 97);
      this.ball = { x: this.absX(side, st.d), y: this.absY(side, st.y), side };
      if (st.d > 70 && rnd() < .12) this.say(fmt(pick(COMM2.dribble), { P: p.name }), 'calm', side);
      this.mom += side === 0 ? 2 : -2;
      this.rec();
      return;
    }
    // tacle : faute ?
    const dp = getPlayer(this.G, def.slot.id);
    const foulP = .22 * (dp.pers === 'Tempérament' ? 1.5 : 1) * this.wx.fouls * (1 + .15 * this.sides[1 - side].inst.press) * (16 - this.ea(def.slot, 'tac') * .5) / 10;
    if (rnd() < foulP) return this.foul(1 - side, def.slot, X, Y);
    this.pr[def.slot.id].tkl++; this.stats[1 - side].tkl++; this.pr[def.slot.id].r += .05; this.pr[c.id].r -= .04;
    if (rnd() < .08) this.say(fmt(pick(COMM2.tackle), { P: dp.name }), 'calm', 1 - side);
    this.give(1 - side, def.slot, X, Y, { turnover: true }); this.rec();
  }

  foul(foulSide, slot, X, Y) {
    const victimSide = 1 - foulSide;
    this.stats[foulSide].fouls++;
    if (rnd() < .13 + (this.st.counter > 0 ? .15 : 0)) this.card(foulSide, slot);
    const d = victimSide === 0 ? X : 100 - X, y = victimSide === 0 ? Y : 100 - Y;
    const c = this.st.carrier;
    if (d >= 84 && Math.abs(y - 50) < 20 && rnd() < .55) {
      this.say(fmt(pick(COMM.penAward), { P: this.pname(c.id) }), 'pen', victimSide);
      this.give(victimSide, c, X, Y, { setPiece: 'pen' });
    } else if (d >= 66 && Math.abs(y - 50) < 32) {
      const tk = this.sides[victimSide].takers.fk;
      if (tk && this.sides[victimSide].onPitch.some(x => x.id === tk) && rnd() < .4) this.say(fmt(pick(COMM.fkAward), { T: this.names[victimSide], P: this.pname(tk) }), 'info', victimSide);
      this.give(victimSide, c, X, Y, { setPiece: 'fk' });
    } else this.give(victimSide, c, X, Y);
    this.rec('foul');
  }

  setPiece(kind) {
    const st = this.st, side = st.side, s = this.sides[side];
    st.setPiece = null;
    const on = s.onPitch.filter(x => x.role !== 'GB');
    if (kind === 'pen') {
      const tk = on.find(x => x.id === s.takers.pen) || on[0];
      return this.shoot(tk, 'pen', 89, 50, 0);
    }
    if (kind === 'fk') {
      const tk = on.find(x => x.id === s.takers.fk) || on[0];
      st.carrier = tk;
      if (rnd() < .5 && st.d >= 72) return this.shoot(tk, 'fk', st.d, st.y, .1);
      return this.cross(tk, true);
    }
    if (kind === 'corner') {
      const tk = on.find(x => x.id === s.takers.fk) || on[0];
      st.carrier = tk;
      return this.cross(tk, true);
    }
  }

  a_cross(c, p, press) { this.cross(c, false, press); }
  cross(c, setPiece, press = .3) {
    const st = this.st, side = st.side;
    this.pr[c.id].pas++; this.stats[side].pas++;
    const ny = 38 + rnd() * 24, nd = 86 + rnd() * 8;
    const TX = this.absX(side, nd), TY = this.absY(side, ny);
    const deliver = clamp((.55 + (this.ea(c, 'pas') - 10) * .025 + (this.ea(c, 'tec') - 10) * .01 - press * .2) * this.wx.cross + (setPiece ? .15 : 0), .15, .9);
    this.positions();
    const def = this.nearest(1 - side, TX, TY);
    if (rnd() > deliver) {
      const n = def || this.nearest(1 - side, TX, TY);
      this.give(1 - side, n.slot, TX, TY, { turnover: true }); this.rec();
      return;
    }
    const att = this.pickShooter(side, 'cross');
    if (!att) return;
    const aS = (this.ea(att, 'phy') + this.ea(att, 'fin')) / 2 + (setPiece ? 1 : 0) + (att.mods?.air || 0), dS = def ? (this.ea(def.slot, 'phy') + this.ea(def.slot, 'tac')) / 2 : 6;
    const gk = this.gkOf(1 - side), gkS = gk ? this.ea(gk, 'gar') : 5;
    const win = clamp(.38 + (aS - dS) * .022 - (gkS - 10) * .012, .1, .75);
    if (rnd() < win) {
      this.pr[c.id].pasOk++; this.stats[side].pasOk++;
      this.lastPasser = c.id;
      st.carrier = att;
      this.ball = { x: TX, y: TY, side };
      return this.shoot(att, 'header', nd, ny, press);
    }
    if (def) { this.pr[def.slot.id].r += .03; this.stats[1 - side].int++; this.pr[def.slot.id].int++; }
    if (rnd() < .3) { this.stats[side].corners++; this.give(side, c, this.absX(side, 99), this.absY(side, rnd() < .5 ? 2 : 98), { setPiece: 'corner' }); this.rec('corner'); return; }
    const n = def || this.nearest(1 - side, TX, TY);
    this.give(1 - side, n.slot, TX, TY, { turnover: true }); this.rec();
  }

  a_shoot(c, p, press) { this.shoot(c, this.st.oneOnOne ? 'oneonone' : 'open', this.st.d, this.st.y, press); }

  shoot(c, kind, d, y, press) {
    const G = this.G, side = this.st.side, s = this.sides[side], D = this.sides[1 - side];
    const p = getPlayer(G, c.id);
    const gk = this.gkOf(1 - side);
    const gkS = gk ? this.ea(gk, 'gar') : 4;
    const dist = Math.hypot((100 - d) * 1.05, (y - 50) * .68);
    let xg;
    if (kind === 'pen') xg = clamp(.77 + (this.ea(c, 'fin') + this.ea(c, 'men') - 20) * .006 - (gkS - 10) * .008, .55, .9);
    else {
      xg = 1.03 * Math.exp(-.112 * dist) * clamp(1 - Math.abs(y - 50) * .68 / (dist + 4), .25, 1);
      const fin = kind === 'header' ? (this.ea(c, 'fin') + this.ea(c, 'phy')) / 2 : this.ea(c, 'fin') * .75 + this.ea(c, 'tec') * .25;
      xg *= clamp(.65 + (fin - 10) * .045 - (gkS - 10) * .035, .3, 1.7);
      if (kind === 'header') xg *= .6;
      if (kind === 'fk') xg = clamp(.075 * (1 + (this.ea(c, 'tec') - 12) * .06), .02, .14);
      if (kind === 'oneonone') xg = Math.max(xg * 1.5, .28 + (fin - 10) * .015);
      else if (kind !== 'fk') xg *= 1 - press * .35;
      xg *= this.wx.shot * (dist > 22 ? this.wx.long : 1);
    }
    xg = clamp(xg, .01, .95);
    const st = this.stats[side], pr = this.pr[c.id];
    st.shots++; st.xg += xg; pr.sh++; pr.xg += xg;
    if (this.lastPasser && this.lastPasser !== c.id && this.pr[this.lastPasser]) this.pr[this.lastPasser].kp++;
    const X = this.absX(side, d), Y = this.absY(side, y);
    const shot = { side, m: this.minute, x: +X.toFixed(1), y: +Y.toFixed(1), xg: +xg.toFixed(3), pid: c.id, kind, res: 'miss' };
    this.shots.push(shot);
    const T = this.names[side], Gk = gk ? this.pname(gk.id) : 'le gardien';
    const ckind = kind === 'header' ? 'cross' : kind === 'oneonone' ? 'counter' : kind === 'fk' ? 'fk' : kind === 'pen' ? 'pen' : dist > 21 ? 'long' : 'open';
    const gx = side === 0 ? 100 : 0;
    if (rnd() < xg) {
      if (kind !== 'pen' && kind !== 'fk' && rnd() < .035) {
        st.onT++; shot.res = 'var';
        this.say(fmt(pick(COMM.var), { P: p.name }), 'var', side);
        const g = gk || D.onPitch[0]; this.give(1 - side, g, gx, 50); this.rec('var');
        return;
      }
      st.onT++; pr.shOT++; shot.res = 'goal';
      this.score[side]++;
      let assist = null;
      if (kind !== 'pen' && kind !== 'fk' && this.lastPasser && this.lastPasser !== c.id && this.pr[this.lastPasser] && this.pr[this.lastPasser].side === side) assist = this.lastPasser;
      if (assist) { this.pr[assist].a++; this.pr[assist].r += .6; }
      pr.g++; pr.r += kind === 'pen' ? .7 : 1.1;
      if (gk) this.pr[gk.id].r -= .35;
      D.onPitch.forEach(x => { if (ROLE_LINES[x.role].def) this.pr[x.id].r -= .12; });
      this.events.push({ type: 'goal', side, min: this.minLabel(), pid: c.id, assist, kind: ckind });
      this.mom += side === 0 ? 35 : -35;
      s.talk = Math.min(1.04, (s.talk || 1) + .005);
      this.ball = { x: gx, y: 50, side, ev: 'goal' };
      this.rec('goal');
      const txt = fmt(pick(COMM.goal[ckind]), { P: p.name, T, G: Gk, SC: `${this.score[0]}-${this.score[1]}` }) + (assist ? ` Passe décisive de ${this.pname(assist)}.` : '');
      this.say(txt, 'goal', side);
      this.lastPasser = null;
      this.kickoff(1 - side);
      return;
    }
    this.lastPasser = null;
    this.mom += (side === 0 ? 1 : -1) * 7;
    // bloqué / cadré / à côté
    if (kind !== 'pen' && kind !== 'fk' && dist > 11 && rnd() < .24) {
      shot.res = 'block';
      if (rnd() < .3) this.say(fmt(pick(COMM2.block), { P: p.name }), 'chance', side);
      if (rnd() < .4) { st.corners++; this.give(side, c, this.absX(side, 99), this.absY(side, rnd() < .5 ? 2 : 98), { setPiece: 'corner' }); this.rec('corner'); return; }
      const n = this.nearest(1 - side, X, Y); this.give(1 - side, n.slot, X, Y, { turnover: true }); this.rec(); return;
    }
    const onT = rnd() < (kind === 'pen' ? .8 : .45 + (this.ea(c, 'fin') - 10) * .015);
    if (onT && gk) {
      st.onT++; pr.shOT++; shot.res = 'save';
      this.stats[1 - side].saves++; this.pr[gk.id].sav++; this.pr[gk.id].r += xg > .25 ? .45 : .2;
      if (xg > .25 || kind === 'pen') this.say(fmt(pick(kind === 'pen' ? COMM.save.pen : COMM2.bigsave), { P: p.name, G: Gk }), kind === 'pen' ? 'pen' : 'save', side);
      else if (rnd() < .4) this.say(fmt(pick(COMM.save[ckind]), { P: p.name, T, G: Gk }), 'save', side);
      if (rnd() < .32) { st.corners++; this.give(side, c, this.absX(side, 99), this.absY(side, rnd() < .5 ? 2 : 98), { setPiece: 'corner' }); this.rec('save'); return; }
      this.give(1 - side, gk, gx, 50); this.rec('save');
      return;
    }
    pr.r -= .05;
    if (kind === 'pen' || xg > .15 || rnd() < .35) this.say(fmt(pick(COMM.miss[ckind]), { P: p.name, T }), kind === 'pen' ? 'pen' : 'chance', side);
    const g = gk || D.onPitch[0];
    this.give(1 - side, g, side === 0 ? 95 : 5, 50); this.rec('miss');
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
    const A = x => getPlayer(this.G, x.id).attrs;
    if (type === 'cross') {
      const w = { BU: 2, DC: 1.5, MOC: .9, AG: .7, AD: .7, MC: .7, MDC: .6, DG: .4, DD: .4 };
      return weighted(on, x => (w[x.role] || .3) * (A(x).phy + A(x).fin) * (1 + (x.mods?.air || 0) * .3) * (x.mods?.duty === 1 ? 1.25 : x.mods?.duty === -1 ? .7 : 1));
    }
    return this.shooter(side);
  }

  card(side, slot = null) {
    const s = this.sides[side]; if (!s.onPitch.length) return;
    const x = slot && s.onPitch.includes(slot) ? slot : weighted(s.onPitch, x => ((ROLE_LINES[x.role].def || .2) + .1) * (getPlayer(this.G, x.id).pers === 'Tempérament' ? 1.8 : 1));
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
    this.bondCache = null;
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
      // l'IA adapte son pressing quand elle est menée
      if (this.minute === 75 && diff < 0) s.inst.press = Math.max(s.inst.press, 1);
    });
  }
  shootout() {
    const G = this.G;
    const takers = this.sides.map(s => s.onPitch.filter(x => x.role !== 'GB').map(x => getPlayer(G, x.id)).sort((a, b) => (b.attrs.fin + b.attrs.men) - (a.attrs.fin + a.attrs.men)));
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
        if (round < 5) { const r0 = 5 - taken[0], r1 = 5 - taken[1]; if (sc[0] > sc[1] + r1 || sc[1] > sc[0] + r0) { this.penScore = sc; return; } }
      }
      if (round >= 4 && sc[0] !== sc[1]) break;
    }
    this.penScore = sc;
  }
  winner() {
    if (this.firstLeg) { const A = this.score[0] + this.firstLeg[0], B = this.score[1] + this.firstLeg[1]; if (A !== B) return A > B ? 0 : 1; if (this.penScore) return this.penScore[0] > this.penScore[1] ? 0 : 1; return this.done && !this.cup ? null : null; }
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
      r.r += d > 0 ? .45 : d < 0 ? -.35 : 0;
      r.r += r.kp * .12 + (r.pas >= 15 ? (r.pasOk / r.pas - .8) * 1.5 : 0) - Math.max(0, (r.int + r.tkl) - 6) * .03;
      const p = getPlayer(this.G, +id);
      if ((ROLE_LINES[p.pos]?.def || p.pos === 'GB') && (r.side === 0 ? this.score[1] : this.score[0]) === 0) r.r += .6;
      if (r.min < 20) r.r = 6 + (r.r - 6) * .6;
      r.r = clamp(r.r + gauss() * .25, 3, 10);
    }
    const best = Object.entries(this.pr).filter(([, r]) => r.min > 0).sort((a, b) => b[1].r - a[1].r)[0];
    this.motm = best ? +best[0] : null;
  }
  runToEnd() { while (!this.done) { this.aiManage(); this.step(); } return this; }
}
