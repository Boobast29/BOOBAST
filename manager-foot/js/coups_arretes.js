// ============================================================
//  Atelier coups de pied arrêtés (comme FM), page Tactique
//  Attaque :
//  - Corners : auto (moteur), premier poteau (centre plus sûr, reprise moins appuyée), second poteau (pour le
//    meilleur joueur de tête, centre plus difficile), à la retombée (remise pour une frappe hors de la surface),
//    joué court (on garde le ballon).
//  - Coups francs proches : auto, frappe directe, centre.
//  - Défenseurs centraux qui montent : plus de têtes gagnées, mais contre-attaque possible si l'action échoue.
//  Défense : en zone (solide sur les centres, faible à la retombée), individuelle (dépend du duel physique),
//  mixte (entre les deux).
//  Bilan de la saison : buts marqués et encaissés sur coup de pied arrêté.
//  Réglage « auto » : le moteur d'origine, sans aucun changement.
// ============================================================
const CPA_OPTS = {
  corner: [['auto', 'Auto'], ['p1', 'Premier poteau'], ['p2', 'Second poteau'], ['retombee', 'À la retombée'], ['court', 'Joué court']],
  cf: [['auto', 'Auto'], ['direct', 'Frappe directe'], ['centre', 'Centre']],
  def: [['mixte', 'Mixte'], ['zone', 'En zone'], ['indiv', 'Individuelle']]
};
const CPA_AIDE = {
  p1: 'Centre plus sûr, reprise moins appuyée.', p2: 'Pour ton meilleur joueur de tête ; centre plus difficile.', retombee: 'Remise pour une frappe hors de la surface.',
  court: 'On garde le ballon, peu d\'occasions immédiates.', auto: 'Le choix habituel du tireur.', direct: 'Frappe dès que c\'est à portée.', centre: 'Toujours un centre dans la surface.',
  zone: 'Solide sur les centres, faible à la retombée.', indiv: 'Bon si tes défenseurs gagnent les duels physiques.', mixte: 'Compromis.'
};
const cpaDe = s => s?.cpa || null;
const aerien = (G, x) => { const a = getPlayer(G, x.id).attrs; return a.phy * 1.2 + a.fin * .5 + (x.mods?.air || 0) * 3; };
if (typeof makeSide === 'function') {
  const __makeSideCPA = makeSide;
  makeSide = function (G, clubId, tac) { const s = __makeSideCPA.apply(this, arguments); if (tac?.cpa) s.cpa = { ...tac.cpa }; return s; };
}
if (typeof Match === 'function') {
  const P = Match.prototype;
  const __setPieceCPA = P.setPiece, __shootCPA = P.shoot;
  P.setPiece = function (kind) {
    const side = this.st.side, s = this.sides[side], R = cpaDe(s);
    if (kind === 'pen') return __setPieceCPA.apply(this, arguments);
    const avant = this.score[side], avantC = this.score[1 - side];
    this._sp = { side, kind, R: R || {} };
    // défense adverse sur coups de pied arrêtés : moins (ou plus) de centres exploitables
    const wx0 = this.wx.cross, Dd = this.sides[1 - side].cpa?.def;
    if (Dd === 'zone') this.wx.cross = wx0 * .85;
    else if (Dd === 'indiv') { const top = (sd, n) => sd.onPitch.filter(x => x.role !== 'GB').map(x => aerien(this.G, x)).sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0) / n; this.wx.cross = wx0 * clamp(1 + (top(s, 4) - top(this.sides[1 - side], 4)) * .03, .8, 1.2); }
    try {
      if (!R) return __setPieceCPA.apply(this, arguments);
      const st = this.st, on = s.onPitch.filter(x => x.role !== 'GB');
      const tk = on.find(x => x.id === s.takers.fk) || on[0];
      const autres = on.filter(x => x !== tk && (R.monter || x.role !== 'DC'));
      if (kind === 'fk' && R.cf && R.cf !== 'auto') {
        st.setPiece = null; st.carrier = tk;
        if (R.cf === 'direct' && st.d >= 70) return this.shoot(tk, 'fk', st.d, st.y, .1);
        return this.cross(tk, true);
      }
      if (kind === 'corner' && R.corner && R.corner !== 'auto') {
        st.setPiece = null; st.carrier = tk;
        if (R.corner === 'court') {
          const r = autres.find(x => ['AG', 'AD', 'MOC', 'MC', 'DG', 'DD'].includes(x.role)) || autres[0]; if (!r) return this.cross(tk, true);
          this.pr[tk.id].pas++; this.pr[tk.id].pasOk++; this.stats[side].pas++; this.stats[side].pasOk++;
          this.give(side, r, this.absX(side, 90), this.absY(side, this.ball.y < 50 ? 12 : 88)); this.rec(); return;
        }
        if (R.corner === 'retombee' && rnd() < .5) {
          const f = autres.filter(x => x.role !== 'DC').sort((a, b) => { const A = getPlayer(this.G, a.id).attrs, B = getPlayer(this.G, b.id).attrs; return (B.fin + B.tec) - (A.fin + A.tec); })[0];
          if (f) { this.pr[tk.id].pas++; this.pr[tk.id].pasOk++; this.lastPasser = tk.id; st.carrier = f; this.ball = { x: this.absX(side, 76), y: this.absY(side, 50), side }; return this.shoot(f, 'open', 76, 50, .5); }
        }
        const wx = this.wx.cross, pick = this.pickShooter;
        this.wx.cross = wx * (R.corner === 'p1' ? 1.1 : R.corner === 'p2' ? .9 : 1);
        if (R.corner === 'p2') this.pickShooter = (sd, type) => type === 'cross' && sd === side ? (autres.slice().sort((a, b) => aerien(this.G, b) - aerien(this.G, a))[0] || pick.call(this, sd, type)) : pick.call(this, sd, type);
        try { return this.cross(tk, true); } finally { this.wx.cross = wx; this.pickShooter = pick; }
      }
      return __setPieceCPA.apply(this, arguments);
    } finally {
      this.wx.cross = wx0;
      // défenseurs montés : si l'action échoue et que l'adversaire récupère, il part en contre
      if (R?.monter && this.st.side !== side && this.score[side] === avant) this.st.counter = Math.max(this.st.counter || 0, 2);
      if (this.score[side] > avant) this._spBut(side, 1);
      if (this.score[1 - side] > avantC) this._spBut(1 - side, 0);
      this._sp = null;
    }
  };
  // la défense de l'équipe qui subit le coup de pied arrêté
  P.shoot = function (c, kind, ...rest) {
    const sp = this._sp; if (!sp || kind === 'pen') return __shootCPA.call(this, c, kind, ...rest);
    const def = this.sides[1 - sp.side], D = def.cpa?.def || 'mixte', side = sp.side;
    let f = 1;
    if (D === 'zone') f = kind === 'header' ? .85 : kind === 'open' ? 1.15 : 1;
    else if (D === 'indiv' && kind === 'header') {
      const top = (s, n) => s.onPitch.filter(x => x.role !== 'GB').map(x => aerien(this.G, x)).sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0) / n;
      f = clamp(1 + (top(this.sides[side], 4) - top(def, 4)) * .02, .8, 1.2);
    }
    if (sp.R.corner === 'p1' && kind === 'header') f *= .94;
    if (Math.abs(f - 1) < .005) return __shootCPA.call(this, c, kind, ...rest);
    const avant = this.cal;
    this.cal = [0, 1].map(i => (avant ? avant[i] : 1) * (i === side ? f : 1));
    try { return __shootCPA.call(this, c, kind, ...rest); } finally { this.cal = avant; }
  };
  P._spBut = function (side, pour) {
    const G = this.G;
    if (this.sides[side].clubId === G.clubId || this.sides[1 - side].clubId === G.clubId) {
      const mine = this.sides[side].clubId === G.clubId;
      const S = (G.cpaStats ||= {}); if (S.s !== G.season) { S.s = G.season; S.pour = 0; S.contre = 0; }
      if (mine) S.pour++; else S.contre++;
    }
  };
}
// ---------- page Tactique ----------
function carteCPA(T) {
  const R = T.cpa ||= { corner: 'auto', cf: 'auto', def: 'mixte', monter: true };
  const S = G.cpaStats?.s === G.season ? G.cpaStats : { pour: 0, contre: 0 };
  const sel = (k) => `<select data-cpa="${k}">${CPA_OPTS[k].map(([v, l]) => `<option value="${v}" ${R[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `<div class="cpa"><h3>Coups de pied arrêtés</h3>
    <div class="cpa-bilan"><span><b>${S.pour}</b> marqués</span><span><b>${S.contre}</b> encaissés</span><small>cette saison, en match joué en direct ou en résultat direct</small></div>
    <div class="form-grid cpa-g">
      <label>Corners ${sel('corner')}<small>${esc(CPA_AIDE[R.corner] || '')}</small></label>
      <label>Coups francs proches ${sel('cf')}<small>${esc(CPA_AIDE[R.cf] || '')}</small></label>
      <label>Défense ${sel('def')}<small>${esc(CPA_AIDE[R.def] || '')}</small></label>
      <label class="chk cpa-monter"><input type="checkbox" data-cpa="monter" ${R.monter ? 'checked' : ''}> Les défenseurs centraux montent <small>Plus de têtes gagnées, mais risque de contre si l'action échoue.</small></label>
    </div></div>`;
}
window.addEventListener('load', () => {
  if (typeof vTactics !== 'function') return;
  const __vTacticsCPA = vTactics;
  vTactics = function (el) {
    const r = __vTacticsCPA.apply(this, arguments);
    try {
      const ancre = el.querySelector('[data-tk="fk"]')?.closest('section, .card');
      if (ancre && !el.querySelector('.cpa')) {
        ancre.insertAdjacentHTML('beforeend', carteCPA(G.tactics));
        el.querySelectorAll('[data-cpa]').forEach(c => c.onchange = () => {
          const R = G.tactics.cpa; R[c.dataset.cpa] = c.type === 'checkbox' ? c.checked : c.value; save();
          const lab = c.closest('label')?.querySelector('small'); if (lab && c.tagName === 'SELECT') lab.textContent = CPA_AIDE[c.value] || '';
        });
      }
    } catch (e) { console.error(e); }
    return r;
  };
});
