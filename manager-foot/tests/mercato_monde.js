window.__T = (async () => {
  const out = {};
  const p = G.players.find(x => x.club != null && x.club !== G.clubId && !getClub(G, x.club).foreign && x.value < 5e6);
  const seller = getClub(G, p.club);
  createDeal(p, seller, { fee: p.value, plan: 'cash' }); const d = G.deals.find(x => x.pid === p.id);
  d.terms = { wageM: 50000, yrs: 3, status: 'rot', signOn: 100000, agentFee: 200000, clause: 0, goalBonus: 0, appBonus: 0 };
  d.status = 'medical'; dealComplete(d);
  out.apresVisite = d.status; out.joueurChezMoi = p.club === G.clubId;
  openDeal(d.id); out.boutons = !!document.querySelector('#dSigne') && !!document.querySelector('#dRenonce');
  document.querySelector('#dSigne').click(); await new Promise(r => setTimeout(r, 50));
  out.apresSignature = d.status; out.signe = p.club === G.clubId;
  // filtre championnat
  show('transfers'); out.optionsLigues = document.querySelectorAll('#flg option').length;
  const etr = [...document.querySelectorAll('#flg option')].find(o => o.value.startsWith('P:'));
  document.querySelector('#flg').value = etr.value; document.querySelector('#flg').dispatchEvent(new Event('change'));
  const lignes = [...document.querySelectorAll('#main tbody tr[data-pid]')];
  out.filtreEtranger = lignes.length > 0 && lignes.every(tr => ligueDe(G, getPlayer(G, +tr.dataset.pid)) === etr.value);
  TF.lg = '';
  // onglet Monde
  COMP_TAB = 'MONDE'; show('comps'); out.monde = document.querySelectorAll('.monde-pays').length; out.ongletOn = !!document.querySelector('[data-c="MONDE"].on');
  return out;
})();
