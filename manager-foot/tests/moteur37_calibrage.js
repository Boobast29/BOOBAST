// Usage : dans la console du jeu (index.html servi en local), coller ce fichier puis lire window.__T
window.__T = (() => {
  const res = {};
  for (const mode of [false, true]) {
    window.MOTEUR37 = mode;
    try { localStorage.setItem('mf-regles', 'FRA'); } catch { }
    const db = buildDefaultDatabase(); normalizeWorld(db);
    G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 7);
    const out = {};
    for (const L of leagueComps(G)) {
      let n = 0, g = 0, h = 0, d = 0, tetes = 0, loin = 0, buts = 0, pen = 0;
      for (let r = 0; r < 12; r++) { weeklyUpdate(G, true); for (const f of L.fixtures[r]) { const m = simFixture(G, f); n++; g += m.score[0] + m.score[1]; if (m.score[0] > m.score[1]) h++; if (m.score[0] === m.score[1]) d++;
        for (const s of m.shots || []) if (s.res === 'goal') { buts++; if (s.kind === 'header') tetes++; if (s.kind === 'pen') pen++; if (Math.hypot((100 - s.x) * 1.05, (s.y - 50) * .68) > 22) loin++; } } }
      out[L.name] = { n, buts: +(g / n).toFixed(2), v1: +(h / n).toFixed(2), nul: +(d / n).toFixed(2), partTete: +(tetes / Math.max(1, buts)).toFixed(2), partLoin: +(loin / Math.max(1, buts)).toFixed(2) };
    }
    res[mode ? 'avec37' : 'sans37'] = out;
  }
  // effet ciblé : un bon joueur de tête marque-t-il plus de la tête ?
  window.MOTEUR37 = true;
  return res;
})();
