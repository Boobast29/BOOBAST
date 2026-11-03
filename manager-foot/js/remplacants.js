// ============================================================
//  Profils similaires : trouver un remplaçant (idée tirée d'assistants de recrutement pour FM, sans code repris)
//  Pour un joueur, cherche dans le monde ceux qui ont le même poste et un profil proche sur les attributs clés de ce
//  poste (poids de js/attributs.js). La distance compte d'abord les attributs clés : un remplaçant doit faire le même travail.
//  Brouillard de recrutement respecté : un joueur non supervisé n'affiche ni sa note exacte ni sa similarité précise.
// ============================================================
function profilsSimilaires(G, p, n = 8) {
  const W = POIDS_POSTE[p.pos] || {}, D = attributsDetail(p), o = playerOvr(p);
  const cands = G.players.filter(x => x.id !== p.id && x.pos === p.pos && x.club !== G.clubId && Math.abs(playerOvr(x) - o) <= 9 && !x.retired);
  const res = cands.map(x => {
    const E = attributsDetail(x); let d = 0, w = 0;
    for (const [k, poids] of Object.entries(W)) { d += poids * Math.abs((E[k] ?? 10) - (D[k] ?? 10)); w += poids; }
    const sim = Math.max(0, Math.round(100 - (d / (w || 1)) * 12)); // écart moyen de 1 point sur 20 ≈ -12 %
    return { x, sim, note: notePoste(x, x.pos, E) };
  }).sort((a, b) => b.sim - a.sim || b.note - a.note);
  return res.slice(0, n);
}
function blocSimilaires(G, p) {
  const L = profilsSimilaires(G, p);
  if (!L.length) return '<p class="muted">Aucun profil proche à ce poste.</p>';
  return `<div class="tbl-wrap"><table class="tbl compact sim-tbl"><thead><tr><th>Joueur</th><th>Club</th><th>Âge</th><th>Note de poste</th><th>Profil</th><th>Valeur</th><th><span class="sr-only">Suivre</span></th></tr></thead><tbody>
    ${L.map(({ x, sim, note }) => { const k = knows(G, x), c = x.club != null ? getClub(G, x.club) : null;
      return `<tr><td class="nm"><a href="#" data-sim="${x.id}">${esc(x.name)}</a></td><td>${c ? `${crest(c, 18)} ${esc(c.short || c.name)}` : '<span class="muted">libre</span>'}</td><td>${x.age}</td>
        <td>${k ? noteSur100(note) : '<span class="muted">à superviser</span>'}</td><td>${k ? `<b>${sim} %</b>` : `<span class="muted">${sim >= 80 ? 'très proche' : sim >= 65 ? 'proche' : 'assez proche'}</span>`}</td>
        <td>${money(x.value)}</td><td><button class="btn sm" data-simsl="${x.id}">${G.shortlist.includes(x.id) ? 'Suivi ✓' : 'Suivre'}</button></td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint">Profil : ressemblance sur les attributs clés du poste. Les joueurs non supervisés restent approximatifs.</p>`;
}
if (typeof playerModal === 'function') {
  const __playerModalRS = playerModal;
  playerModal = function (pid, tab = 'profil') {
    const r = __playerModalRS.apply(this, arguments);
    const p = getPlayer(G, pid);
    if (p && tab === 'profil' && $('#modal .attr36') && !(typeof profileSimilarity === 'function' && p.club === G.clubId)) { // pour tes joueurs : profils-similaires.js (rapports de supervision)
      $('#modal .attr36').insertAdjacentHTML('afterend', `<section class="sim"><button class="btn" id="simGo">🔍 Trouver des profils similaires</button><div id="simRes"></div></section>`);
      $('#simGo').onclick = () => {
        $('#simRes').innerHTML = blocSimilaires(G, p); $('#simGo').remove();
        $$('#simRes [data-sim]').forEach(a => a.onclick = e => { e.preventDefault(); playerModal(+a.dataset.sim); });
        $$('#simRes [data-simsl]').forEach(b => b.onclick = () => { const id = +b.dataset.simsl, i = G.shortlist.indexOf(id); if (i >= 0) G.shortlist.splice(i, 1); else G.shortlist.push(id); save(); b.textContent = G.shortlist.includes(+b.dataset.simsl) ? 'Suivi ✓' : 'Suivre'; });
      };
    }
    return r;
  };
}
