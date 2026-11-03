window.__T = (async () => {
  const at = (b, gb = 4) => ({ technique: { Finition: b, 'Frappe de loin': b - 2, 'Jeu de tête': b, Passes: b, Centres: b - 4, Dribble: b, Contrôle: b, 'Coups francs': b - 6, Penalty: b, Tacles: 12, Marquage: 12 },
    mental: { Placement: b, Anticipation: b - 2, 'Vision du jeu': b - 4, 'Sang-froid': b, 'Prise de décision': b, Concentration: b, Agressivité: 20, Courage: 22, Leadership: 18, 'Volume de jeu': 24, 'Jeu collectif': 20 },
    physique: { Accélération: b, Vitesse: b, Agilité: b - 4, Équilibre: 20, Détente: 26, Force: 28, Endurance: 24, 'Résistance aux chocs': 20 },
    gardien: { Réflexes: gb, Plongeon: gb, 'Prise de balle': gb, 'Placement gardien': gb, 'Jeu au pied': gb } });
  const clubs = [];
  for (let i = 0; i < 6; i++) clubs.push({ nom: 'Club ' + i, division: 1, reputation: 60 + i * 5, joueurs: [
    { nom: 'Buteur ' + i, age: 25, nationalite: 'FRA', poste: 'BU', pied: 'gauche', attributs: at(32) },
    { nom: 'Gardien ' + i, age: 29, nationalite: 'ESP', poste: 'Gardien', attributs: at(10, 33) }] });
  const raw = { echelle: 36, clubs, staff: [{ nom: 'Marc Adjoint', role: 'Adjoint', club: 'Club 0', niveau: 4 }, { nom: 'Kiné Pro', role: 'Kiné', club: 'Club 0', attributs: { soins: 34, prevention: 30 } }] };
  const W = importDatabase(raw);
  const b = W.players.find(p => p.name === 'Buteur 0'), g = W.players.find(p => p.name === 'Gardien 0');
  const Db = attributsDetail(b), Dg = attributsDetail(g);
  G = newGame(W, W.clubs[0].id, 'T', 3);
  return { clubs: W.clubs.length, posB: b.pos, posG: g.pos, pied: b.foot, finition: Db.finition, frappe: Db.frappe, force: Db.puissance, reflexesGB: Dg.reflexes, qualites: b.attrs, ovrB: playerOvr(b), ovrG: playerOvr(g),
    staff: { adjoint: [G.staff.assistant, G.staffPeople?.assistant?.name], kine: [G.staff.physio, G.staffPeople?.physio?.name] }, staffReel: W.clubs[0].staffReel };
})();
