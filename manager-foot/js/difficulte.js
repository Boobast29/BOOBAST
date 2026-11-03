// ============================================================
//  Difficulté (Options) : Découverte · Normal · Exigeant · Réaliste
//  Le moteur de match ne triche jamais : la difficulté joue sur ton environnement, comme dans la réalité.
//  - Patience du président : la confiance baisse plus ou moins vite après une défaite.
//  - Recettes de ton club (billetterie, droits TV, sponsors, merchandising, primes).
//  - Exigences salariales des joueurs qui négocient avec toi.
//  - Brouillard sur le potentiel : estimation du staff plus ou moins large.
//  Normal = comportement d'origine. Modifiable à tout moment (G.diff).
// ============================================================
const DIFFICULTES = {
  facile: { label: 'Découverte', tip: 'Président patient, recettes +15 %, joueurs moins gourmands, potentiel bien estimé.', conf: .55, confPlus: 1.2, recettes: 1.15, salaires: .9, brouillard: .6 },
  normal: { label: 'Normal', tip: 'Réglage d\'origine.', conf: 1, confPlus: 1, recettes: 1, salaires: 1, brouillard: 1 },
  exigeant: { label: 'Exigeant', tip: 'Président plus impatient, recettes −8 %, salaires +8 %, potentiel plus flou.', conf: 1.3, confPlus: .9, recettes: .92, salaires: 1.08, brouillard: 1.25 },
  realiste: { label: 'Réaliste', tip: 'Comme un vrai poste : président impatient, recettes −12 %, salaires +12 %, potentiel très incertain.', conf: 1.55, confPlus: .8, recettes: .88, salaires: 1.12, brouillard: 1.5 }
};
const diff = () => DIFFICULTES[G?.diff] || DIFFICULTES.normal;

if (typeof boardAfterMatch === 'function') {
  const __boardAfterMatchD = boardAfterMatch;
  boardAfterMatch = function (G, f) {
    const avant = G.board?.conf;
    const r = __boardAfterMatchD.apply(this, arguments);
    if (avant != null && G.board) { const d = G.board.conf - avant, D = diff(); G.board.conf = clamp(avant + d * (d < 0 ? D.conf : D.confPlus), 0, 100); }
    return r;
  };
}
if (typeof flow === 'function') {
  const __flowD = flow, RECETTES = ['tv', 'gate', 'merch', 'sponsor', 'prize'];
  flow = function (G, club, v, cat) {
    if (club && G && club.id === G.clubId && v > 0 && RECETTES.includes(cat)) v = Math.round(v * diff().recettes);
    return __flowD.call(this, G, club, v, cat);
  };
}
if (typeof demandWage === 'function') {
  const __demandWageD = demandWage;
  demandWage = function (W, p, c) { const v = __demandWageD.apply(this, arguments); return c && G && c.id === G.clubId ? roundMoney(v * diff().salaires) : v; };
}
if (typeof margePotentiel === 'function') {
  const __margePotentielD = margePotentiel;
  margePotentiel = function (G, p) { return __margePotentielD.apply(this, arguments) * diff().brouillard; };
}
// Options : choix de la difficulté (branché au chargement : d'autres modules redéfinissent vOptions)
window.addEventListener('load', () => {
  if (typeof vOptions !== 'function') return;
  const __vOptionsD = vOptions;
  vOptions = function (el) {
    const r = __vOptionsD.apply(this, arguments);
    try {
      if (!G || el.querySelector('#diffSel')) return r;
      const cur = G.diff || 'normal';
      const html = `<section class="card diff-card"><h2>Difficulté</h2>
        <div class="diff-choix" role="radiogroup" aria-label="Difficulté">${Object.entries(DIFFICULTES).map(([k, d]) => `<label class="diff-opt ${k === cur ? 'on' : ''}"><input type="radio" name="diffSel" id="${k === cur ? 'diffSel' : ''}" value="${k}" ${k === cur ? 'checked' : ''}><b>${d.label}</b><small>${esc(d.tip)}</small></label>`).join('')}</div>
        <p class="hint">Le moteur de match ne triche jamais : la difficulté agit sur la patience du président, les recettes, les exigences salariales et la précision des estimations. Modifiable à tout moment.</p></section>`;
      (el.querySelector('section.card') || el).insertAdjacentHTML('afterend', html);
      el.querySelectorAll('input[name="diffSel"]').forEach(i => i.onchange = () => { G.diff = i.value; save(); toast(`Difficulté : ${DIFFICULTES[i.value].label}.`); vOptions(el); });
    } catch (e) { console.error(e); }
    return r;
  };
});
