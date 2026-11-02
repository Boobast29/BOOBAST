// Usage : dans la console du jeu (index.html servi en local), coller ce fichier puis lire window.__T
window.__T = (() => {
  const res = {};
  const db = buildDefaultDatabase(); normalizeWorld(db);
  const base = attributsDetail;
  for (const [nom, delta] of [['tête faible', -7], ['tête forte', +7]]) {
    G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 11);
    const bu = clubPlayers(G, G.clubId).filter(p => p.pos === 'BU').sort((a, b) => playerOvr(b) - playerOvr(a))[0];
    attributsDetail = p => { const D = base(p); if (p.id === bu.id) { D.tete = Math.max(1, Math.min(20, D.tete + delta)); D.detente = Math.max(1, Math.min(20, D.detente + delta)); } return D; };
    let tetes = 0, tirsTete = 0, matchs = 0;
    const L = clubLeague(G, G.clubId);
    for (let rep = 0; rep < 3; rep++) for (let r = 0; r < L.fixtures.length; r++) for (const f of L.fixtures[r]) {
      if (f.h !== G.clubId && f.a !== G.clubId) continue;
      const copie = { ...f, res: null }; weeklyUpdate(G, false);
      const m = new Match(G, copie, aiTactics(G, copie.h, copie.a), aiTactics(G, copie.a, copie.h), {}); m.sides[0].ai = m.sides[1].ai = true; m.auto = true; m.runToEnd(); matchs++;
      for (const s of m.shots || []) if (s.pid === bu.id && s.kind === 'header') { tirsTete++; if (s.res === 'goal') tetes++; }
    }
    res[nom] = { matchs, tirsTete, butsTete: tetes, reussite: +(tetes / Math.max(1, tirsTete)).toFixed(2) };
  }
  attributsDetail = base;
  return res;
})();
