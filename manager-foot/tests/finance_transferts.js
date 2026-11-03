// Test de la comptabilité des transferts (amortissement, prolongation, vente échelonnée, affacturage). Usage : node run_eval.js URL tests/finance_transferts.js
window.__T = (() => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  G = newGame(db, db.clubs.find(c => !c.foreign && c.div === 1).id, 'T', 3);
  refresh = () => {}; const me = myClub(G), out = {};
  const p = G.players.find(x => x.club !== G.clubId && x.club != null && x.value > 10e6);
  const seller = p.club;
  logTransfer(G, p, seller, G.clubId, 20e6, 'transfert'); p.club = G.clubId; p.contract = 4;
  for (let i = 0; i < G.schedule.length; i++) weeklyUpdate(G, false);
  out.apres1saison = { vnc: Math.round(vnc(G, p)), amort: Math.round(comptaSaison(G).amort), ans: p.compta.ans };
  p.contract = 5; weeklyUpdate(G, false); out.prolongation = { ans: p.compta.ans, base: Math.round(p.compta.base) };
  // offre reçue, vente en plusieurs fois
  const buyer = G.clubs.find(c => c.id !== G.clubId && !c.foreign && c.budget > 40e6) || G.clubs.find(c => c.id !== G.clubId); buyer.budget = 100e6;
  G.offers = [{ id: 999, pid: p.id, club: buyer.id, fee: 25e6, max: 26e6 }]; p.wantsOut = true;
  const b0 = me.budget; accepterOffreEchelonnee(999);
  out.vente = { club: p.club === buyer.id, encaisse: Math.round(me.budget - b0), creances: (G.payables || []).filter(x => x.to === G.clubId).length, pv: Math.round(comptaSaison(G).pv), journal: G.comptaJournal };
  const b1 = me.budget; affacturer(0); out.affacturage = { encaisse: Math.round(me.budget - b1), creances: (G.payables || []).filter(x => x.to === G.clubId).length };
  out.ratio = ratioCoutEffectif(G);
  const el = document.createElement('div'); document.body.appendChild(el); vFinances(el); out.bloc = !!el.querySelector('.compta'); out.txt = el.querySelector('.compta-kpis')?.innerText.replace(/\s+/g, ' ');
  out.plans = PAY_PLANS.map(x => x.k);
  return out;
})();
