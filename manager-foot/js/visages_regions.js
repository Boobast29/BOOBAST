// ============================================================
//  Avatars cohérents avec l'origine (idée des packs de visages par région, cf. emilmirzayev/fm-ai-face-generator,
//  MIT, et les groupes « NewGAN » de la communauté FM ; aucun code repris, pas d'appel à une IA)
//  Avant : la teinte de peau d'un joueur généré était tirée au hasard, sans lien avec sa nationalité.
//  Maintenant : elle suit une répartition large par grande région (table des pays déjà intégrée,
//  js/donnees_ouvertes2.js), avec de la diversité partout (binationaux, diasporas).
//  Le choix se fait par empreinte du joueur (hashTrait), sans tirage : le hasard de la partie ne change pas.
// ============================================================
const TEINTES_REGION = { // poids des 6 teintes (claire -> foncée) de SKIN (js/ui.js)
  'Northern Europe': [5, 4, 1, .5, .3, .2], 'Western Europe': [3, 4, 2, 1, 1, 1], 'Eastern Europe': [4, 4, 1.5, .3, .1, .1],
  'Southern Europe': [1.5, 3, 4, 1, .4, .3], 'Central Europe': [4, 4, 1.5, .4, .2, .2],
  'Western Africa': [0, 0, .2, 1, 4, 5], 'Middle Africa': [0, 0, .2, 1, 4, 5], 'Eastern Africa': [0, 0, .3, 1.5, 4, 4], 'Southern Africa': [.5, .5, 1, 2, 3, 3],
  'Northern Africa': [0, 1, 4, 3, 1, .3], 'Western Asia': [.3, 1.5, 4, 2.5, .7, .2], 'Central Asia': [1, 3, 3, 1, .2, 0],
  'Southern Asia': [0, .5, 2, 4, 2, .5], 'Eastern Asia': [1, 4, 3, .5, 0, 0], 'South-Eastern Asia': [0, 1, 3, 3, 1, .2],
  'South America': [.7, 2, 3, 2, 1.5, 1], 'Central America': [.3, 1.5, 3, 3, 1, .5], 'Caribbean': [0, .5, 1, 2, 3, 3],
  'Northern America': [2, 3, 2, 1, 1, 1], 'Australia and New Zealand': [3, 4, 2, 1, .5, .5], 'Melanesia': [0, 0, .5, 2, 4, 3], 'Polynesia': [0, .5, 2, 4, 2, .5],
};
const SOUS_REGION_MANUEL = { ENG: 'Northern Europe', SCO: 'Northern Europe', WAL: 'Northern Europe', NIR: 'Northern Europe', IRL: 'Northern Europe', KVX: 'Southern Europe' };
function teintePour(p) {
  const sous = SOUS_REGION_MANUEL[p.nat] || (typeof DO2_PAYS !== 'undefined' ? DO2_PAYS[p.nat]?.sous : null);
  const w = TEINTES_REGION[sous]; if (!w) return null;
  const tot = w.reduce((a, b) => a + b, 0);
  let r = (hashTrait(`teinte|${p.id}|${p.name}`) % 10000) / 10000 * tot;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
  return w.length - 1;
}
if (typeof genPlayer === 'function' && typeof hashTrait === 'function') {
  const __genPlayerVR = genPlayer;
  genPlayer = function () {
    const p = __genPlayerVR.apply(this, arguments);
    try { if (p?.face && !p.photo) { const t = teintePour(p); if (t != null) p.face.skin = t; } } catch { }
    return p;
  };
}
