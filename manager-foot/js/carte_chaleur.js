// ============================================================
//  Cartes de chaleur des joueurs (idée de osnsyc/FMMatchLens, MIT : aucun code repris, moteur différent)
//  Pendant les matchs de TON club, la position de chaque joueur est relevée à chaque action du moteur
//  (une dizaine par minute) sur une grille 12 × 8. Les cartes sont gardées dans le rapport du match
//  (Analyse) et affichées dans le sens d'attaque de chaque équipe (de gauche à droite).
//  Aucun tirage aléatoire : le déroulement des matchs ne change pas.
// ============================================================
const CH_L = 12, CH_H = 8;
(function () {
  if (typeof Match === 'undefined') return;
  const P = Match.prototype, __actionCH = P.action;
  P.action = function () {
    const r = __actionCH.apply(this, arguments);
    if (this._ch === undefined) this._ch = this.sides.some(s => s.clubId === this.G.clubId) ? {} : null;
    if (this._ch && this.posCache) {
      for (const q of this.posCache) {
        const id = q.slot?.id; if (id == null) continue;
        const X = q.side === 0 ? q.X : 100 - q.X, Y = q.side === 0 ? q.Y : 100 - q.Y; // sens d'attaque commun
        const c = Math.min(CH_H - 1, Math.floor(Y / 100 * CH_H)) * CH_L + Math.min(CH_L - 1, Math.floor(X / 100 * CH_L));
        (this._ch[id] ||= new Array(CH_L * CH_H).fill(0))[c]++;
      }
    }
    return r;
  };
})();
// stockage compact : 96 chiffres 0-9 par joueur (racine carrée de la fréquence), pour ne pas alourdir la sauvegarde
function chaleurCode(g) { const max = Math.max(1, ...g); return g.map(v => Math.round(Math.sqrt(v / max) * 9)).join(''); }
function chaleurGrille(x) { return typeof x === 'string' ? [...x].map(c => (+c / 9) ** 2) : x; }
function chaleurResume(mt) { return mt._ch ? Object.fromEntries(Object.entries(mt._ch).filter(([id]) => mt.pr[id]?.min > 0).map(([id, g]) => [id, chaleurCode(g)])) : null; }
if (typeof reportFromMatch === 'function') {
  const __reportFromMatchCH = reportFromMatch;
  reportFromMatch = function (mt) { const R = __reportFromMatchCH(mt); const h = chaleurResume(mt); if (h) R.heat = h; return R; };
}
if (typeof applyMatch === 'function') {
  const __applyMatchCH = applyMatch;
  applyMatch = function (G, mt, f) { const r = __applyMatchCH.apply(this, arguments); if (f?.report) { const h = chaleurResume(mt); if (h) f.report.heat = h; } return r; };
}
function carteChaleurSVG(grille, couleur = '#ffb020') {
  grille = chaleurGrille(grille);
  const max = Math.max(1, ...grille), cw = 105 / CH_L, ch = 68 / CH_H;
  return `<svg class="ch-carte" viewBox="0 0 105 68" role="img" aria-label="Carte de chaleur : zones les plus occupées en couleur vive">
    <rect width="105" height="68" fill="#1b5e33"/>
    ${grille.map((v, i) => v ? `<rect x="${((i % CH_L) * cw).toFixed(2)}" y="${(Math.floor(i / CH_L) * ch).toFixed(2)}" width="${cw.toFixed(2)}" height="${ch.toFixed(2)}" fill="${couleur}" fill-opacity="${(Math.sqrt(v / max) * .85).toFixed(2)}"/>` : '').join('')}
    <g fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".35"><rect x="0" y="0" width="105" height="68"/><line x1="52.5" y1="0" x2="52.5" y2="68"/><circle cx="52.5" cy="34" r="9.15"/><rect x="88.5" y="13.85" width="16.5" height="40.3"/><rect x="0" y="13.85" width="16.5" height="40.3"/></g>
    <path d="M44 64h17m-3-2 3 2-3 2" stroke="#fff" stroke-opacity=".7" stroke-width=".5" fill="none"/></svg>`;
}
if (typeof analysisHTML === 'function') {
  const __analysisHTMLCH = analysisHTML;
  analysisHTML = function (names, colors, R, mySide = 0) {
    const h = __analysisHTMLCH.apply(this, arguments);
    if (!R?.heat || typeof getPlayer !== 'function') return h;
    const ids = Object.keys(R.heat).filter(id => R.pr?.[id]).sort((a, b) => (R.pr[a][0] - R.pr[b][0]) || (R.pr[b][1] - R.pr[a][1]));
    if (!ids.length) return h;
    const choix = ids.find(id => R.pr[id][0] === mySide) || ids[0];
    window.__chR = R; window.__chC = colors; // rapport affiché (le sélecteur redessine sans recalcul)
    return h + `<section class="ch-bloc"><h4>Cartes de chaleur</h4>
      <label>Joueur <select class="ch-sel">${ids.map(id => `<option value="${id}" ${id === choix ? 'selected' : ''}>${esc(names[R.pr[id][0]])} — ${esc(getPlayer(G, +id)?.name || '?')}</option>`).join('')}</select></label>
      <div class="ch-zone" data-side="${R.pr[choix][0]}">${carteChaleurSVG(R.heat[choix], colors[R.pr[choix][0]])}</div>
      <p class="hint">Position relevée à chaque action du match ; l'équipe attaque vers la droite.</p></section>`;
  };
  document.addEventListener('change', e => {
    const s = e.target.closest?.('.ch-sel'); if (!s || !window.__chR) return;
    const R = window.__chR, id = s.value, z = s.closest('.ch-bloc')?.querySelector('.ch-zone');
    if (z && R.heat[id]) z.innerHTML = carteChaleurSVG(R.heat[id], (window.__chC || [])[R.pr[id][0]] || '#ffb020');
  });
}
