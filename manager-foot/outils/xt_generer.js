// Ajuste la grille de menace attendue (xT) sur les actions du moteur du jeu, puis écrit js/xt_grille.js.
// Usage : servir le dossier manager-foot (python -m http.server 8770) puis
//   node outils/xt_generer.js [http://127.0.0.1:8770/index.html] [nombre de journées, défaut 38]
// Algorithme : portage de socceraction/xthreat.py (MIT) dans js/xthreat.js (xtAjuster).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8770/index.html', journees = +(process.argv[3] || 38);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(url); await p.waitForFunction(() => typeof DB !== 'undefined' && DB && typeof xtAjuster === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(journees => {
    const db = buildDefaultDatabase(); normalizeWorld(db);
    G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'xT', 7);
    window.XT_COLLECTE = []; let matchs = 0; const forces = [];
    for (const L of leagueComps(G)) for (let r = 0; r < Math.min(journees, L.fixtures.length); r++) for (const f of L.fixtures[r]) {
      const m = new Match(G, { ...f, res: null }, aiTactics(G, f.h, f.a), aiTactics(G, f.a, f.h), {}); m.sides[0].ai = m.sides[1].ai = true; m.auto = true;
      const dF = forceEquipe(G, m.sides[0]) - forceEquipe(G, m.sides[1]); m.runToEnd(); matchs++;
      forces.push([dF, m.score[0] > m.score[1] ? 1 : m.score[0] === m.score[1] ? .5 : 0]);
    }
    const fit = xtAjuster(window.XT_COLLECTE); window.XT_COLLECTE = null;
    // espérance de points (V = 1, N = 0,5) selon l'écart de force : logistique ajustée par descente de gradient
    let a = .3, b = .2;
    for (let it = 0; it < 4000; it++) { let ga = 0, gb = 0; for (const [d, y] of forces) { const e = 1 / (1 + Math.exp(-(a * d + b))), g = (e - y) * e * (1 - e); ga += g * d; gb += g; } a -= 2 * ga / forces.length; b -= 2 * gb / forces.length; }
    return { ...fit, matchs, cotes: { a: +a.toFixed(4), b: +b.toFixed(4), n: forces.length } };
  }, journees);
  const js = `// Généré par outils/xt_generer.js : menace attendue (xT) par zone, 16 × 12, ajustée sur ${r.matchs} matchs du moteur
// (${Math.round(r.deplacements)} déplacements, ${Math.round(r.tirs)} tirs, ${r.iterations} itérations). Ligne 0 = bord haut, colonne 15 = but adverse.
const XT_GRILLE = ${JSON.stringify(r.grille)};
`;
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'xt_grille.js'), js + `// Espérance de points du club à domicile selon l'écart de force (forceEquipe, js/avant_match.js) : 1 / (1 + e^-(a·écart + b)),
// ajustée sur les mêmes ${r.cotes.n} matchs ; b = avantage du terrain.
const COTES_MOTEUR = ${JSON.stringify(r.cotes)};
`);
  console.log('cotes', r.cotes);
  console.log(r.matchs, 'matchs', Math.round(r.deplacements), 'déplacements', Math.round(r.tirs), 'tirs', r.iterations, 'itérations');
  console.log(r.grille.map(l => l.map(v => (v * 100).toFixed(1).padStart(5)).join('')).join('\n'));
  await b.close();
})();
