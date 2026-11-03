// ============================================================
//  Avant-match : cotes 1N2 et distance du déplacement
//  - Cotes : l'écart de force des deux onze donne l'espérance de points E du club recevant (logistique ajustée
//    sur le moteur, COTES_MOTEUR dans js/xt_grille.js). Comme E = P(V) + P(N)/2, l'écart d = P(V) − P(D) vaut
//    2E − 1 ; la probabilité de nul pour cet écart vient des cotes Pinnacle réelles de ~86 000 matchs
//    (js/cotes_reelles.js, jokecamp/FootballData, MIT), puis on applique la marge médiane du marché.
//  - Déplacement : distance à vol d'oiseau entre les deux stades quand ils sont connus (js/stades_gps.js,
//    136 stades d'Angleterre, d'Écosse, de France, d'Allemagne et d'Espagne) : mode « vrais clubs » surtout.
//  Purement informatif : ne tire aucun nombre aléatoire et ne change pas le match.
// ============================================================
function forceEquipe(G, side) { const s = teamStrength(G, side); return s.def * .3 + s.mid * .3 + s.att * .3 + s.gk * .1; }
function probas1N2(dForce, neutre = false) {
  const C = typeof COTES_MOTEUR !== 'undefined' ? COTES_MOTEUR : { a: .3, b: .2 };
  const E = 1 / (1 + Math.exp(-(C.a * dForce + (neutre ? 0 : C.b)))), d = 2 * E - 1;
  const T = typeof COTES_REELLES !== 'undefined' ? COTES_REELLES.table : [[0, .28]];
  // interpolation linéaire de P(nul) dans la table réelle
  let pn = T[0][1];
  if (d >= T[T.length - 1][0]) pn = T[T.length - 1][1];
  else for (let i = 0; i < T.length - 1; i++) if (d >= T[i][0] && d < T[i + 1][0]) { const t = (d - T[i][0]) / (T[i + 1][0] - T[i][0]); pn = T[i][1] + t * (T[i + 1][1] - T[i][1]); break; }
  pn = Math.min(pn, 1 - Math.abs(d) - .005);
  return [(1 + d - pn) / 2, pn, (1 - d - pn) / 2].map(x => Math.max(.005, x));
}
function cotes1N2(p) { const m = typeof COTES_REELLES !== 'undefined' ? COTES_REELLES.marge : .03; return p.map(x => Math.max(1.01, 1 / (x * (1 + m)))); }

// ---------- stades ----------
const normNomClub = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/munchen/g, 'munich').replace(/koln/g, 'cologne')
  .replace(/\b(fc|afc|cf|sc|ac|as|sv|vfb|vfl|tsg|club|football|futbol|de|del|la|le|the|olympique|1\.)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
let __indexStades = null;
function stadeGPS(c) {
  if (!c || typeof STADES_GPS === 'undefined') return null;
  if (!__indexStades) { __indexStades = []; for (const [n, v] of Object.entries(STADES_GPS)) __indexStades.push([normNomClub(n), normNomClub(v[3]), v]); }
  const n = normNomClub(c.name), st = normNomClub(c.stadium);
  if (!n) return null;
  let r = __indexStades.find(x => x[0] === n) || (st && __indexStades.find(x => x[1] === st));
  if (!r) r = __indexStades.find(x => x[0].length >= 5 && n.length >= 5 && (n.startsWith(x[0] + ' ') || x[0].startsWith(n + ' ')));
  return r ? r[2] : null;
}
function distanceKm(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180, dl = rad(b[0] - a[0]), dg = rad(b[1] - a[1]);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function deplacementKm(G, f) { const a = stadeGPS(getClub(G, f.a)), h = stadeGPS(getClub(G, f.h)); return a && h ? Math.round(distanceKm(a, h)) : null; }

function blocAvantMatch(G, f) {
  try {
    const tac = id => typeof tactiqueSansHasard === 'function' ? tactiqueSansHasard(G, id) : aiTactics(G, id, id); // lecture seule
    const sH = makeSide(G, f.h, f.h === G.clubId ? G.tactics : tac(f.h, f.a)), sA = makeSide(G, f.a, f.a === G.clubId ? G.tactics : tac(f.a, f.h));
    const p = probas1N2(forceEquipe(G, sH) - forceEquipe(G, sA), !!f.neutral), c = cotes1N2(p);
    const km = deplacementKm(G, f), fr = x => x.toFixed(2).replace('.', ',');
    const lab = [getClub(G, f.h).name, 'Nul', getClub(G, f.a).name];
    return `<div class="cotes1n2" data-tip="Probabilités tirées de la force des deux onze ; forme du nul et marge (${((typeof COTES_REELLES !== 'undefined' ? COTES_REELLES.marge : .03) * 100).toFixed(1).replace('.', ',')} %) reprises de vraies cotes Pinnacle (jokecamp/FootballData)">
      ${[0, 1, 2].map(i => `<div class="c1n2"><small>${i === 1 ? 'N' : i === 0 ? '1' : '2'} · ${esc(lab[i])}</small><b>${fr(c[i])}</b><i style="width:${Math.round(p[i] * 100)}%"></i><small>${Math.round(p[i] * 100)} %</small></div>`).join('')}
    </div>${km != null ? `<p class="center hint">🚌 Déplacement de ${esc(getClub(G, f.a).name)} : ${km.toLocaleString('fr-FR')} km à vol d'oiseau</p>` : ''}`;
  } catch (e) { return ''; }
}
if (typeof prepareMatch === 'function') {
  const __prepareMatchAM = prepareMatch;
  prepareMatch = function (f) {
    const r = __prepareMatchAM.apply(this, arguments);
    const wx = document.querySelector('.mbox .wxline, .modal .wxline, .wxline');
    if (wx && !wx.parentNode.querySelector('.cotes1n2')) wx.insertAdjacentHTML('afterend', blocAvantMatch(G, f));
    return r;
  };
}
