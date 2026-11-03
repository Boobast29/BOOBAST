// ============================================================
//  Menace attendue (Expected Threat, xT) — portage JavaScript de socceraction/xthreat.py
//  (ML-KULeuven/socceraction, licence MIT, voir vendor/socceraction/LICENSE). Modèle de Karun Singh (2019).
//  Le terrain est découpé en 16 × 12 zones. Pour chaque zone : probabilité de tirer, de marquer en tirant,
//  et matrice de transition des déplacements réussis (passes, centres, dribbles). La valeur xT d'une zone
//  est obtenue par itération : xT = P(tir)·P(but) + P(déplacement)·Σ T·xT, jusqu'à précision eps.
//  Une action réussie qui déplace le ballon vaut xT(arrivée) − xT(départ) ; c'est le « xT créé » du joueur.
//  La grille XT_GRILLE (js/xt_grille.js) est ajustée sur les actions du moteur du jeu lui-même
//  (outils/xt_generer.js) : elle décrit donc où ce moteur crée réellement du danger.
// ============================================================
const XT_L = 16, XT_W = 12;
function xtCellule(x, y, l = XT_L, w = XT_W) {
  const xi = Math.min(l - 1, Math.max(0, Math.floor(x / 100 * l))), yj = Math.min(w - 1, Math.max(0, Math.floor(y / 100 * w)));
  return (w - 1 - yj) * l + xi; // même indexation « à plat » que socceraction (_get_flat_indexes)
}
// actions : [{ t: 'move'|'shot', x, y, ex, ey, ok }] en coordonnées d'attaque 0-100 (x vers le but adverse)
function xtAjuster(actions, { l = XT_L, w = XT_W, eps = 1e-5, maxIter = 200 } = {}) {
  const n = l * w, tirs = new Float64Array(n), buts = new Float64Array(n), dep = new Float64Array(n);
  const T = Array.from({ length: n }, () => new Map());
  for (const a of actions) {
    const i = xtCellule(a.x, a.y, l, w);
    if (a.t === 'shot') { tirs[i]++; if (a.ok) buts[i]++; continue; }
    dep[i]++;
    if (a.ok) { const j = xtCellule(a.ex, a.ey, l, w); T[i].set(j, (T[i].get(j) || 0) + 1); }
  }
  const div = (a, b) => b ? a / b : 0;
  const pBut = Array.from(buts, (g, i) => div(g, tirs[i]));
  const pTir = Array.from(tirs, (s, i) => div(s, s + dep[i])), pDep = Array.from(dep, (m, i) => div(m, m + tirs[i]));
  const Tn = T.map((row, i) => [...row].map(([j, c]) => [j, c / dep[i]]));
  let xT = new Float64Array(n), it = 0;
  const gs = pBut.map((p, i) => p * pTir[i]);
  for (; it < maxIter; it++) {
    const nv = new Float64Array(n); let diff = 0;
    for (let i = 0; i < n; i++) { let s = 0; for (const [j, p] of Tn[i]) s += p * xT[j]; nv[i] = gs[i] + pDep[i] * s; diff = Math.max(diff, nv[i] - xT[i]); }
    xT = nv; if (diff <= eps) break;
  }
  const grille = []; // grille[ligne y du haut][colonne x], comme socceraction
  for (let r = 0; r < w; r++) grille.push(Array.from(xT.slice(r * l, (r + 1) * l), v => +v.toFixed(5)));
  return { grille, iterations: it + 1, tirs: tirs.reduce((a, b) => a + b, 0), deplacements: dep.reduce((a, b) => a + b, 0) };
}
function xtValeur(x, y, g = typeof XT_GRILLE !== 'undefined' ? XT_GRILLE : null) {
  if (!g) return 0;
  const i = xtCellule(x, y, g[0].length, g.length), l = g[0].length;
  return g[Math.floor(i / l)][i % l];
}

// ---------- branchement sur le moteur ----------
(function () {
  if (typeof Match === 'undefined') return;
  const P = Match.prototype;
  const __addPRX = P.addPR;
  P.addPR = function (id, side) { __addPRX.call(this, id, side); this.pr[id].xt = 0; };
  // un déplacement : position avant, puis (si le ballon reste à l'équipe, hors coup de pied arrêté) position après
  const mouvement = nom => {
    const orig = P[nom]; if (typeof orig !== 'function') return;
    P[nom] = function (c, ...a) {
      if (this._xtMv) return orig.call(this, c, ...a); // action imbriquée : seule l'action externe compte
      const st = this.st, mv = this._xtMv = { side: st.side, x: st.d, y: st.y, id: c?.id, score: this.score[0] + this.score[1] };
      try { return orig.call(this, c, ...a); } finally {
        this._xtMv = null;
        let ok = false, ex = null, ey = null;
        if (mv.fin) { ok = true; [ex, ey] = mv.fin; }
        else if (!this.done && st.side === mv.side && !st.setPiece && this.score[0] + this.score[1] === mv.score) { ok = true; ex = st.d; ey = st.y; }
        if (window.XT_COLLECTE) window.XT_COLLECTE.push({ t: 'move', x: mv.x, y: mv.y, ex, ey, ok });
        if (ok && mv.id != null && this.pr[mv.id] && typeof XT_GRILLE !== 'undefined') {
          const v = xtValeur(ex, ey) - xtValeur(mv.x, mv.y);
          this.pr[mv.id].xt = (this.pr[mv.id].xt || 0) + v;
          (this.xtEq ||= [0, 0])[mv.side] += Math.max(0, v);
        }
      }
    };
  };
  ['pass', 'a_through', 'a_dribble', 'cross'].forEach(mouvement);
  const __shootX = P.shoot;
  P.shoot = function (c, kind, d, y, press) {
    if (this._xtMv && !this._xtMv.fin) this._xtMv.fin = [d, y]; // centre réussi : le ballon arrive là où part la tête
    const avant = this.score[this.st.side], side = this.st.side;
    const r = __shootX.call(this, c, kind, d, y, press);
    if (window.XT_COLLECTE && kind !== 'pen' && kind !== 'fk') window.XT_COLLECTE.push({ t: 'shot', x: d, y, ok: this.score[side] > avant });
    return r;
  };
})();

// ---------- cumul saison et affichage ----------
if (typeof applyMatch === 'function') {
  const __applyMatchX = applyMatch;
  applyMatch = function (G, mt, f) {
    const r = __applyMatchX.apply(this, arguments);
    for (const id in mt.pr) { const x = mt.pr[id]; if (!x.min) continue; const p = getPlayer(G, +id); if (p?.stats) p.stats.xt = (p.stats.xt || 0) + (x.xt || 0); }
    if (f?.report) f.report.xt = xtResume(mt);
    return r;
  };
}
function xtResume(mt) {
  return { eq: (mt.xtEq || [0, 0]).map(v => +v.toFixed(2)), j: Object.entries(mt.pr).filter(([, r]) => r.min > 0).map(([id, r]) => [+id, r.side, +(r.xt || 0).toFixed(3)]).sort((a, b) => b[2] - a[2]) };
}
if (typeof reportFromMatch === 'function') {
  const __reportFromMatchX = reportFromMatch;
  reportFromMatch = function (mt) { const R = __reportFromMatchX(mt); R.xt = xtResume(mt); return R; };
}
function xtCarteSVG(grille = typeof XT_GRILLE !== 'undefined' ? XT_GRILLE : null) {
  if (!grille) return '';
  const w = grille.length, l = grille[0].length, max = Math.max(...grille.flat()), cw = 105 / l, ch = 68 / w;
  return `<svg class="xt-carte" viewBox="0 0 105 68" role="img" aria-label="Carte de la menace attendue : plus la zone est claire, plus le ballon y est dangereux">
    ${grille.map((row, r) => row.map((v, c) => `<rect x="${(c * cw).toFixed(2)}" y="${(r * ch).toFixed(2)}" width="${cw.toFixed(2)}" height="${ch.toFixed(2)}" fill="hsl(${45 - 45 * Math.sqrt(v / max)} 90% ${18 + 50 * Math.sqrt(v / max)}%)"><title>${(v * 100).toFixed(1).replace('.', ',')} %</title></rect>`).join('')).join('')}
    <g fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".35"><rect x="0" y="0" width="105" height="68"/><line x1="52.5" y1="0" x2="52.5" y2="68"/><circle cx="52.5" cy="34" r="9.15"/><rect x="88.5" y="13.85" width="16.5" height="40.3"/><rect x="0" y="13.85" width="16.5" height="40.3"/></g></svg>`;
}
if (typeof analysisHTML === 'function') {
  const __analysisHTMLX = analysisHTML;
  analysisHTML = function (names, colors, R, mySide = 0) {
    const h = __analysisHTMLX.apply(this, arguments);
    if (!R?.xt || typeof getPlayer !== 'function') return h;
    const top = R.xt.j.slice(0, 5).map(([id, s, v]) => `<li><span class="dot" style="background:${colors[s]}"></span>${esc(getPlayer(G, id)?.name || '?')}<b>${v >= 0 ? '+' : ''}${v.toFixed(2).replace('.', ',')}</b></li>`).join('');
    return h + `<section class="xt-bloc"><h4>Menace attendue (xT)</h4>
      <p class="muted">Danger créé en faisant avancer le ballon (passes, centres, dribbles réussis). ${esc(names[0])} ${R.xt.eq[0].toFixed(2).replace('.', ',')} · ${esc(names[1])} ${R.xt.eq[1].toFixed(2).replace('.', ',')}</p>
      <div class="xt-deux"><ol class="xt-top">${top}</ol>${xtCarteSVG()}</div></section>`;
  };
}
if (typeof statsDetaillees === 'function') {
  const __statsDetailleesX = statsDetaillees;
  statsDetaillees = function (p) {
    const L = __statsDetailleesX(p), s = p.stats || {}, m = Math.max(1, s.min || 0);
    L.push(['Menace créée (xT)', (s.xt || 0).toFixed(2).replace('.', ',')], ['xT / 90 min', ((s.xt || 0) / m * 90).toFixed(2).replace('.', ',')]);
    return L;
  };
}
if (typeof STAT_CATS !== 'undefined') STAT_CATS.splice(5, 0, ['xt', 'Menace créée (xT)', p => p.stats.xt || 0, 2]);
