// ============================================================
//  Harmonisation des modules ajoutés en parallèle (branche « club-interface-data-reference ») avec le jeu actuel
//  - Une seule valeur par attribut : les 41 compétences (js/competences.js) lisent les 37 attributs détaillés du jeu
//    (js/attributs.js), ceux qu'utilise le moteur de match, quand une correspondance existe. Les compétences sans
//    équivalent (détermination, discipline) gardent leur modèle d'origine.
//  - Fiche joueur : le panneau des compétences devient « Analyse du profil » (points forts, axes de travail, langues,
//    évolution) ; sa grille par familles, doublon de la grille des 37 attributs, est masquée.
// ============================================================
const CORRESP_COMPETENCES = (() => {
  const m = {};
  if (typeof ATTR_DETAIL !== 'undefined') for (const [k, , , , srcs] of ATTR_DETAIL) for (const s of srcs || []) if (!m[s]) m[s] = k;
  Object.assign(m, { decisions: 'decision', teamwork: 'collectif', leadership: 'leadership', anticipation: 'anticipation', concentration: 'concentration', attacking_volleys: 'finition' });
  return m;
})();
if (typeof skillValue === 'function' && typeof attributsDetail === 'function') {
  const __skillValueH = skillValue, cacheH = new WeakMap();
  const detail = p => { const sig = JSON.stringify(p.attrs) + (p.detail20 ? 'd20' : '') + (p.detail99 ? 'd99' : ''); let c = cacheH.get(p); if (!c || c.sig !== sig) { c = { sig, D: attributsDetail({ ...p }) }; cacheH.set(p, c); } return c.D; }; // copie : attributsDetail peut initialiser des champs (traits)
  skillValue = function (p, k) {
    const mk = CORRESP_COMPETENCES[k];
    if (!mk || !p?.attrs) return __skillValueH.apply(this, arguments);
    const v = detail(p)[mk];
    return Number.isFinite(v) ? { value: v, source: p.detail99 || p.detail20 || p.detailSource99 ? 'source' : 'simulation' } : __skillValueH.apply(this, arguments);
  };
}
if (typeof playerModal === 'function') {
  const __playerModalH = playerModal;
  playerModal = function (pid, tab = 'profil') {
    const r = __playerModalH.apply(this, arguments);
    const sec = document.querySelector('#modal .skill41');
    if (sec) {
      const h = sec.querySelector('h3'); if (h) h.textContent = 'Analyse du profil';
      sec.classList.add('skill41-analyse');
    }
    return r;
  };
}
// Studio du club : contenu rendu en différé, pluriels accordés une fois l'onglet affiché
// (branché au chargement complet : studio-club.js et design.js sont chargés après ce fichier)
window.addEventListener('load', () => {
  if (typeof s20Render !== 'function' || typeof accorderDans !== 'function') return;
  const __s20RenderH = s20Render;
  s20Render = async function (el) { const r = await __s20RenderH.apply(this, arguments); try { accorderDans(el); } catch { } return r; };
});
