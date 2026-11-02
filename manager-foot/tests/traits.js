// Usage : dans la console du jeu (index.html servi en local), coller ce fichier puis lire window.__T
window.__T = (() => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3);
  const fr = G.players.find(x => traitsDe(x).includes('fragile')), ro = G.players.find(x => traitsDe(x).includes('robuste')), neutre = G.players.find(x => !traitsDe(x).some(t => t === 'fragile' || t === 'robuste'));
  for (const x of [fr, ro, neutre]) { x.injury = 0; applyInjury(G, x, { name: 'Test', part: 'x', days: 20 }); }
  return { fragile: fr.injury, robuste: ro.injury, neutre: neutre.injury };
})();
