// ============================================================
//  Données ouvertes intégrées au jeu (js/donnees_ouvertes.js, généré par outils/donnees_internationales.py)
//  - force des sélections : Elo calculé sur ~50 000 vrais matchs internationaux (martj42/international_results, CC0)
//  - noms des joueurs générés : prénoms et noms de vrais buteurs internationaux du pays, combinés au hasard
//  - écran International : bilan historique réel et meilleurs buteurs de chaque sélection
// ============================================================
const eloVersNiveau = e => clamp(Math.round(62 + (e - 1500) * .027), 55, 86);
if (typeof DO_ELO !== 'undefined') {
  for (const [code, e] of Object.entries(DO_ELO)) if (code in NATION_LEVEL || NATIONS.some(n => n[0] === code)) NATION_LEVEL[code] = eloVersNiveau(e);
}
if (typeof DO_NOMS !== 'undefined') {
  for (const [code, pool] of Object.entries(DO_NOMS)) {
    NAMES['N_' + code] = pool;
    // France : vrais noms de buteurs français ; on garde une part du réservoir existant pour la diversité des centres de formation
    NAT_POOL[code] = code === 'FRA' ? ['N_FRA', 'N_FRA', 'FR', 'AF', 'MA'] : ['N_' + code];
  }
}
// un joueur généré ne porte jamais le nom complet d'un vrai buteur international
const REELS = new Set(typeof DO_REELS !== 'undefined' ? DO_REELS : []);
function empreinteNom(n) {
  const s = n.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  let h = 2166136261;
  for (const b of new TextEncoder().encode(s)) h = Math.imul(h ^ b, 16777619) >>> 0;
  return h;
}
const __genNameO = genName;
genName = function (nat) {
  let n = __genNameO(nat);
  for (let i = 0; i < 8 && REELS.has(empreinteNom(n)); i++) n = __genNameO(nat);
  return n;
};
const __vIntlO = vIntl;
vIntl = function (el) {
  __vIntlO(el);
  if (INTL_TAB !== 'rank' || typeof DO_HIST === 'undefined') return;
  const rk = nationRanking(G).slice(0, 20).map(r => r.code).filter(c => DO_HIST[c]);
  $('#itBody')?.insertAdjacentHTML('beforeend', `<section class="card"><h2>📜 Histoire réelle des sélections</h2>
    <table class="tbl compact"><tr><th>Nation</th><th>Elo réel</th><th>Depuis</th><th>Matchs</th><th>V-N-D</th><th>Buts</th><th>Meilleurs buteurs</th></tr>
    ${rk.map(c => { const h = DO_HIST[c]; return `<tr><td class="nm">${natFlag(c)} ${esc(natName(c))}</td><td>${DO_ELO[c] ?? '—'}</td><td>${h.depuis || '—'}</td><td>${h.j}</td><td>${h.v}-${h.n}-${h.d}</td><td>${h.bp}-${h.bc}</td>
      <td><small>${h.buteurs.slice(0, 3).map(([n, g]) => `${esc(n)} (${g})`).join(', ')}</small></td></tr>`; }).join('')}</table>
    <p class="hint">Source : ${esc(DO_INFO.source)}, ${DO_INFO.matchs.toLocaleString('fr-FR')} matchs de 1872 à 2026. La force des sélections du jeu part de cet Elo (25 %) et de leurs joueurs (75 %).</p></section>`);
};
