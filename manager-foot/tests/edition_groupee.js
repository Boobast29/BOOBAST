// Édition groupée : aperçu, application, annulation. Usage : node tests/run_eval.js URL tests/edition_groupee.js
window.__T = (async () => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3);
  persistWorld = async () => {}; toast = () => {};
  const el = document.createElement('div'); document.body.appendChild(el);
  ED.club = G.clubId; EG = { ...EG, cible: 'club', pos: 'BU', action: 'attr', attr: 'fin', delta: 3 };
  vEditor(el, G, true);
  const cibles = egCibles(G), avant = cibles.map(p => p.attrs.fin);
  el.querySelector('#egV').click(); const apercu = el.querySelectorAll('#egR tbody tr').length;
  el.querySelector('#egGo').click(); await new Promise(r => setTimeout(r, 50));
  const apres = cibles.map(p => p.attrs.fin);
  el.querySelector('#egU').click(); await new Promise(r => setTimeout(r, 50));
  const retabli = cibles.map(p => p.attrs.fin);
  return { n: cibles.length, apercu, avant, apres, retabli, ok: JSON.stringify(avant) === JSON.stringify(retabli) && apres.every((v, i) => v === Math.min(20, avant[i] + 3)) };
})();
