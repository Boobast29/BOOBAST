// ============================================================
//  Tactique avec ballon / sans ballon (façon FM26), page Tactique
//  - Avec ballon : le dispositif et les consignes habituels.
//  - Sans ballon : une organisation défensive (ex. 4-3-3 avec ballon, 4-5-1 sans), un bloc (haut, médian, bas).
//    Chaque joueur de plus derrière le ballon rend l'équipe plus solide quand elle défend, mais laisse moins de
//    monde pour contre-attaquer à la récupération.
//  - Transitions : après la perte (contre-pressing ou se replacer), après la récupération (contre-attaque ou
//    garder le ballon).
//  Effets appliqués au moment où l'équipe défend (pendant les actions adverses) ; « selon les consignes » = moteur
//  d'origine. Pas de tirage ajouté.
// ============================================================
const BLOCS = { haut: ['Haut', 1, 1], median: ['Médian', 0, 0], bas: ['Bas', -1, -1] };
const derriereBallon = f => (FORMATIONS[f] || []).filter(s => s[0] !== 'GB' && s[2] >= 40).length;
function ecartForme(side) {
  const o = side.oop; if (!o?.forme || o.forme === side.formation) return 0;
  return derriereBallon(o.forme) - derriereBallon(side.formation);
}
if (typeof makeSide === 'function') {
  const __makeSidePJ = makeSide;
  makeSide = function (G, clubId, tac) { const s = __makeSidePJ.apply(this, arguments); if (tac?.oop) s.oop = { ...tac.oop }; return s; };
}
if (typeof Match === 'function') {
  const __actionPJ = Match.prototype.action;
  Match.prototype.action = function () {
    const side = this.st?.side, A = this.sides[side], D = this.sides[1 - side];
    if (!D?.oop && !A?.oop) return __actionPJ.apply(this, arguments);
    const instD = D.inst, instA = A.inst, dq = this.defQ ? this.defQ[1 - side] : 0;
    try {
      if (D.oop) {
        const o = D.oop, i = { ...instD };
        if (BLOCS[o.bloc]) { i.press = BLOCS[o.bloc][1]; i.line = BLOCS[o.bloc][2]; }
        const e = ecartForme(D);
        if (e && this.defQ) this.defQ[1 - side] = dq + e * .02;                 // plus compact = plus solide
        if (o.recup === 'contre') i.tempo = 1; else if (o.recup === 'garder') i.tempo = -1;
        if (e > 0 && o.recup !== 'contre') i.tempo = Math.min(i.tempo ?? 0, 0);  // moins de monde devant pour contrer
        D.inst = i;
      }
      if (A.oop?.perte) A.inst = { ...instA, cpress: A.oop.perte === 'cpress' ? 1 : 0 };
      return __actionPJ.apply(this, arguments);
    } finally {
      D.inst = instD; A.inst = instA; if (this.defQ) this.defQ[1 - side] = dq;
    }
  };
}
// ---------- page Tactique ----------
function cartePhases(T) {
  const O = T.oop ||= { forme: '', bloc: '', perte: '', recup: '' };
  const e = O.forme && O.forme !== T.formation ? derriereBallon(O.forme) - derriereBallon(T.formation) : 0;
  const sel = (k, opts) => `<select data-pj="${k}">${opts.map(([v, l]) => `<option value="${v}" ${(O[k] || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `<div class="pj"><h3>Avec ballon / sans ballon</h3>
    <div class="pj-formes"><div><small>Avec ballon</small><b>${esc(T.formation)}</b><em>${derriereBallon(T.formation)} joueurs derrière le ballon</em></div><span aria-hidden="true">→</span>
      <div><small>Sans ballon</small><b>${esc(O.forme || T.formation)}</b><em>${derriereBallon(O.forme || T.formation)} joueurs derrière le ballon</em></div></div>
    ${e ? `<p class="pj-eff ${e > 0 ? 'pos' : 'warn'}">${e > 0 ? `+${e} joueur${e > 1 ? 's' : ''} pour défendre : plus solide, moins de monde pour contre-attaquer.` : `${e} joueur${e < -1 ? 's' : ''} pour défendre : plus de présence devant, défense plus exposée.`}</p>` : ''}
    <div class="form-grid pj-g">
      <label>Organisation sans ballon ${sel('forme', [['', 'Même dispositif'], ...Object.keys(FORMATIONS).filter(f => f !== T.formation).map(f => [f, f])])}</label>
      <label>Bloc ${sel('bloc', [['', 'Selon les consignes'], ['haut', 'Haut (presse, ligne haute)'], ['median', 'Médian'], ['bas', 'Bas (attend, ligne basse)']])}</label>
      <label>Après la perte du ballon ${sel('perte', [['', 'Selon les consignes'], ['cpress', 'Contre-pressing'], ['replacer', 'Se replacer']])}</label>
      <label>Après la récupération ${sel('recup', [['', 'Selon les consignes'], ['contre', 'Contre-attaque'], ['garder', 'Garder le ballon']])}</label>
    </div><p class="hint">Le bloc remplace pressing et ligne défensive quand l'équipe défend. Les consignes de jeu (tempo, largeur, passes) restent celles avec ballon.</p></div>`;
}
window.addEventListener('load', () => {
  if (typeof vTactics !== 'function') return;
  const __vTacticsPJ = vTactics;
  vTactics = function (el) {
    const r = __vTacticsPJ.apply(this, arguments);
    try {
      const ancre = el.querySelector('[data-tk="fk"]')?.closest('section, .card');
      if (ancre && !el.querySelector('.pj')) {
        (ancre.querySelector('.cpa') || ancre.lastElementChild).insertAdjacentHTML(ancre.querySelector('.cpa') ? 'beforebegin' : 'afterend', cartePhases(G.tactics));
        el.querySelectorAll('[data-pj]').forEach(s => s.onchange = () => {
          G.tactics.oop[s.dataset.pj] = s.value; save(); vTactics(el);
        });
      }
    } catch (e) { console.error(e); }
    return r;
  };
});
