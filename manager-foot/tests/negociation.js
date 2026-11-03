window.__T = (async () => {
  const out = {}; const att = () => new Promise(r => setTimeout(r, 40)); clubPlayers(G, G.clubId).sort((a, b) => playerOvr(a) - playerOvr(b)).slice(0, 6).forEach(x => { x.club = null; });
  const p = G.players.find(x => x.club != null && x.club !== G.clubId && !getClub(G, x.club).foreign && x.value < 6e6 && x.pos === 'BU' && x.nat === 'FRA');
  // 1. offre au club
  offerModal(p.id); await att();
  out.offreLignes = document.querySelectorAll('#negoTable tbody tr').length;
  const avant = document.querySelector('#negoBilan b').textContent;
  const f = document.querySelector('#oF'); f.value = Math.round(p.value * 2); f.dispatchEvent(new Event('input')); await att();
  out.jaugeOffre = [avant, document.querySelector('#negoBilan b').textContent];
  document.querySelector('#oB').value = Math.round(p.value * 1.5); document.querySelector('#oG').value = 500000;
  document.querySelector('#ok').click(); await att();
  const d = G.deals.find(x => x.pid === p.id); out.offreEnvoyee = !!d && d.offer.buyBack > 0 && d.offer.addOnGoals === 500000;
  // 2. contrat de la recrue
  d.status = 'terms'; dealDemands(d); d.patience = 3; openDeal(d.id); await att();
  out.contratLignes = document.querySelectorAll('#negoTable tr[data-cle]').length; out.coutAffiche = !!document.querySelector('#costBox .cost, #costBox div');
  const s0 = document.querySelector('#negoBilan b').textContent;
  document.querySelector('#nW').value = 1000; document.querySelector('#nW').dispatchEvent(new Event('input')); await att();
  out.jaugeContrat = [s0, document.querySelector('#negoBilan b').textContent];
  document.querySelector('#dTerms').click(); await att(); out.refus = document.querySelector('#dResp')?.textContent.slice(0, 90);
  document.querySelector('#negoTout').click(); await att();
  document.querySelector('#nR').value = 5; document.querySelector('#nL').value = 0;
  document.querySelector('#dTerms').click(); await att(); out.apresAccord = d.status;
  d.confirme = true; dealComplete(d); out.signe = p.club === G.clubId; out.clauses = p.deal && { raise: p.deal.raise, objBonus: p.deal.objBonus > 0, rachat: !!p.buyBack, bonusButs: !!p.addOnGoals };
  closeModal?.();
  // 3. prolongation
  const q = clubPlayers(G, G.clubId).find(x => x.id !== p.id && !x.wantsOut);
  renewModal(q.id); await att(); out.prolongationLignes = document.querySelectorAll('#negoTable tr[data-cle]').length;
  document.querySelector('#negoTout').click(); await att(); document.querySelector('#ok').click(); await att();
  out.prolonge = q.deal?.signed?.includes(String(G.season));
  return out;
})();
