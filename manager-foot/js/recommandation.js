// ============================================================
//  Recommandations de recrutement selon les besoins du club
//  Méthode adaptée de tonyz0x0/football-manager (MIT, « Parallel Weighted Matrix Recommendation ») : les secteurs
//  du club reçoivent un poids inverse de leur force (fonction réciproque), puis chaque joueur reçoit un score
//  = amélioration qu'il apporte au titulaire le plus faible de son poste × poids du secteur, borné par le budget.
//  Les données du dépôt (notes FIFA de sofifa) ne sont pas reprises. Brouillard respecté : note estimée (estOvr).
// ============================================================
function besoinsClub(G) {
  const T = G.tactics, f = T.formation, roles = FORMATIONS[f].map((s, i) => slotRole({ ...T, formation: f }, i));
  const titulaires = T.lineup.map((id, i) => ({ p: id && getPlayer(G, id), role: roles[i] }));
  const ligne = r => ROLES[r]?.line || 'M', parLigne = {};
  for (const t of titulaires) (parLigne[ligne(t.role)] ||= []).push(t.p ? playerOvr(t.p) : 40);
  const moy = Object.fromEntries(Object.entries(parLigne).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
  const inv = Object.fromEntries(Object.entries(moy).map(([k, v]) => [k, 1 / Math.max(30, v)]));
  const s = Object.values(inv).reduce((a, b) => a + b, 0) || 1;
  const poids = Object.fromEntries(Object.entries(inv).map(([k, v]) => [k, v / s * Object.keys(inv).length])); // moyenne 1
  // titulaire le plus faible par poste
  const faible = {};
  for (const t of titulaires) { const o = t.p ? playerOvr(t.p) : 40; if (!(t.role in faible) || o < faible[t.role].o) faible[t.role] = { o, p: t.p }; }
  return { faible, poids, ligne, moy };
}
function recommandations(G, n = 8) {
  const B = besoinsClub(G), budget = Math.max(0, availableTransfer ? availableTransfer(G) : G.board.transfer);
  const res = [];
  for (const x of G.players) {
    if (x.club === G.clubId || x.loan || x.retired) continue;
    const cible = B.faible[x.pos]; if (!cible) continue;
    const prix = x.club == null ? 0 : x.value;
    if (prix > budget * 1.15) continue;
    const gain = estOvr(G, x) - cible.o; if (gain < 2) continue;
    const age = x.age <= 23 ? 1.1 : x.age >= 31 ? .85 : 1;
    res.push({ x, gain, cible, score: gain * B.poids[B.ligne(x.pos)] * age / (1 + prix / Math.max(1e6, budget)) });
  }
  return { liste: res.sort((a, b) => b.score - a.score).slice(0, n), B, budget };
}
function blocRecommandations(G) {
  const { liste, B, budget } = recommandations(G);
  const lignes = { G: 'Gardien', D: 'Défense', M: 'Milieu', A: 'Attaque' };
  const prio = Object.entries(B.poids).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${lignes[k] || k} ${Math.round(B.moy[k])}`).join(' · ');
  return `<section class="reco"><h3>Recommandés pour ton club</h3>
    <p class="hint">Note moyenne des titulaires par secteur : ${prio} (le plus faible pèse le plus). Budget disponible ${money(budget)}.</p>
    ${liste.length ? `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Joueur</th><th>Poste</th><th>Âge</th><th>Note</th><th>Remplacerait</th><th>Apport</th><th>Valeur</th></tr></thead><tbody>
      ${liste.map(({ x, gain, cible }) => `<tr><td class="nm"><a href="#" data-reco="${x.id}">${esc(x.name)}</a></td><td>${x.pos}</td><td>${x.age}</td><td>${ovrCell(x)}</td>
        <td>${cible.p ? esc(cible.p.name) : '<span class="muted">poste vide</span>'} <small class="muted">${cible.o}</small></td><td class="pos">+${Math.round(gain)}${knows(G, x) ? '' : ' ~'}</td><td>${x.club == null ? 'libre' : money(x.value)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="muted">Aucun joueur abordable n\'améliore nettement ton onze. Supervise plus de joueurs avec la cellule de recrutement.</p>'}</section>`;
}
if (typeof vTransfers === 'function') {
  const __vTransfersRC = vTransfers;
  vTransfers = function (el) {
    const r = __vTransfersRC.apply(this, arguments);
    if (typeof TR_TAB !== 'undefined' && TR_TAB === 'search' && !(TF.q || TF.pos || TF.maxv || TF.maxage || TF.minovr || TF.free || TF.lg)) {
      const f = el.querySelector('.filters');
      if (f) {
        f.insertAdjacentHTML('beforebegin', blocRecommandations(G));
        el.querySelectorAll('[data-reco]').forEach(a => a.onclick = e => { e.preventDefault(); playerModal(+a.dataset.reco); });
      }
    }
    return r;
  };
}
