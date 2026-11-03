// ============================================================
//  Relations avec les agences d'agents
//  Chaque agence (js/realisme.js) a une relation avec ton club (0-100, 50 au départ). Elle facilite ou complique :
//  - négociations : salaire et commission demandés (−20 % à +20 %), patience de l'agent (+1 / −1) ;
//  Évolution : transfert conclu avec un de ses joueurs (+6), vente d'un de ses joueurs à un autre club (+3),
//  négociation rompue (−5), joueur libéré ou non conservé (−4), lent retour vers 50 hors saison.
//  Affichage : relation sur la fiche joueur (ligne Agent) ; tableau des agences dans Négociations.
// ============================================================
const relAgence = a => (a ? (a.rel ??= 50) : 50);
const motRel = v => v >= 75 ? 'excellente' : v >= 60 ? 'bonne' : v >= 40 ? 'neutre' : v >= 25 ? 'tendue' : 'mauvaise';
function changerRelAgence(a, d, pourquoi) {
  if (!a) return;
  const avant = relAgence(a); a.rel = clamp(avant + d, 0, 100);
  if (Math.abs(a.rel - avant) >= 1) (a.journal ||= []).unshift(`${G.season} ${weekLabel(G)} : ${d > 0 ? '+' : ''}${d} (${pourquoi})`), a.journal.length = Math.min(a.journal.length, 8);
}
// négociations
if (typeof dealDemands === 'function') {
  const __dealDemandsAR = dealDemands;
  dealDemands = function (d) {
    const r = __dealDemandsAR.apply(this, arguments);
    try {
      const p = getPlayer(G, d.pid), a = typeof agentOf === 'function' ? agentOf(p) : null, rel = relAgence(a), f = 1 - (rel - 50) / 250;
      d.demand.wageM = roundMoney(d.demand.wageM * f); d.demand.agentFee = roundMoney(d.demand.agentFee * f);
      if (rel >= 70) d.patience = (d.patience || 2) + 1; else if (rel <= 30) d.patience = Math.max(1, (d.patience || 2) - 1);
      d.log.push(`Relation avec l'agence : ${motRel(rel)} (${rel}/100)${f < 1 ? ' : exigences revues à la baisse' : f > 1 ? ' : exigences revues à la hausse' : ''}.`);
    } catch (e) { console.error(e); }
    return r;
  };
}
// évolution selon les transferts (chaque semaine)
function semaineAgences(G) {
  if (!G.agents) return;
  for (const d of G.deals || []) {
    if (d.relAg || !['done', 'failed'].includes(d.status)) continue;
    d.relAg = true;
    const p = getPlayer(G, d.pid), a = p && p.agent ? G.agents[p.agent] : null;
    if (d.status === 'done') changerRelAgence(a, 6, `transfert de ${p?.name}`);
    else changerRelAgence(a, -5, `négociation rompue pour ${p?.name}`);
  }
  for (const t of (G.transfers || []).slice(0, 30)) { // plus récents en tête ; chaque transfert compté une fois
    if (t.agVu) continue; t.agVu = true;
    if (t.from !== G.clubId || t.to == null) continue;
    const p = getPlayer(G, t.pid), a = p && p.agent ? G.agents[p.agent] : null;
    changerRelAgence(a, 3, `vente de ${t.name}`);
  }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateAR = weeklyUpdate;
  weeklyUpdate = function (G, full = true) { const r = __weeklyUpdateAR.apply(this, arguments); if (full) try { semaineAgences(G); } catch (e) { console.error(e); } return r; };
}
// joueurs libérés / non conservés par ton club
if (typeof endSeason === 'function') {
  const __endSeasonAR = endSeason;
  endSeason = function (G) {
    const avant = new Map(G.players.filter(p => p.club === G.clubId).map(p => [p.id, p.agent]));
    const S = __endSeasonAR.apply(this, arguments);
    try { for (const a of Object.values(G.agents || {})) a.rel = Math.round(relAgence(a) + (50 - relAgence(a)) * .15); // lent retour vers 50 chaque saison
      for (const p of G.players) if (avant.has(p.id) && p.club == null && p.agent && G.agents?.[p.agent]) changerRelAgence(G.agents[p.agent], -4, `${p.name} non conservé`); } catch (e) { console.error(e); }
    return S;
  };
}
// affichage : fiche joueur et tableau des agences
window.addEventListener('load', () => {
  if (typeof playerModal === 'function') {
    const __playerModalAR = playerModal;
    playerModal = function (pid) {
      const r = __playerModalAR.apply(this, arguments);
      try {
        const p = getPlayer(G, pid), a = p?.agent ? G.agents?.[p.agent] : null;
        const ligne = [...document.querySelectorAll('#modal .pm-head small, #modal .pm-head p')].find(e => /Agent/.test(e.textContent));
        if (a && ligne && !ligne.querySelector('.ag-rel')) { const v = relAgence(a); ligne.insertAdjacentHTML('beforeend', ` · <span class="ag-rel ag-${v >= 60 ? 'bon' : v < 40 ? 'mau' : 'neu'}" title="Relation avec l'agence : facilite ou complique les négociations">relation ${motRel(v)}</span>`); }
      } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof vDeals === 'function') {
    const __vDealsAR = vDeals;
    vDeals = function (el) {
      const r = __vDealsAR.apply(this, arguments);
      try {
        const L = Object.values(G.agents || {}).sort((a, b) => relAgence(b) - relAgence(a));
        if (L.length && !el.querySelector('.ag-tab')) el.insertAdjacentHTML('beforeend', `<section class="card ag-tab"><h2>Agences d'agents</h2>
          <p class="hint">Une bonne relation baisse le salaire et la commission demandés et rend l'agent plus patient ; une mauvaise les augmente. Elle monte quand tu conclus un transfert avec un de leurs joueurs ou que tu vends un de leurs joueurs, elle baisse quand une négociation est rompue ou qu'un de leurs joueurs n'est pas conservé.</p>
          <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Agence</th><th>Style</th><th>Joueurs chez toi</th><th>Relation</th><th>Dernier changement</th></tr></thead><tbody>
          ${L.map(a => { const v = relAgence(a), n = clubPlayers(G, G.clubId).filter(p => p.agent === a.id).length; return `<tr><td class="nm">${esc(a.name)}</td><td>${esc(AGENT_TYPES[a.type]?.label || '')}</td><td>${n}</td><td><span class="ag-rel ag-${v >= 60 ? 'bon' : v < 40 ? 'mau' : 'neu'}">${motRel(v)} · ${v}</span></td><td><small class="muted">${esc(a.journal?.[0] || '—')}</small></td></tr>`; }).join('')}</tbody></table></div></section>`);
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
