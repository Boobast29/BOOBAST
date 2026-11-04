// ============================================================
//  Rapport de recrutement sur la fiche (façon FM) et discussions selon la personnalité
//  Rapport (joueurs des autres clubs) : points forts et points faibles pour son poste, comparaison avec ton titulaire
//  au même poste, potentiel estimé, avis (À recruter / À suivre / Pas pour nous). Fiabilité selon la connaissance du
//  joueur (js/fiche_plus.js) : sans observation, pas de rapport.
//  Discussions : la réaction d'un joueur à un entretien dépend de sa personnalité (js/notes_cachees.js) — un
//  mercenaire accepte mal qu'on lui demande de la patience, un joueur très loyal l'accepte, un friable supporte mal
//  « gagne ta place », un leader ou un résistant y répond bien.
// ============================================================
function rapportRecrutement(p) {
  const c = typeof connaissance === 'function' ? connaissance(G, p) : 100;
  if (c <= 0) return `<section class="rr" data-bloc="rapport"><h3>Rapport de recrutement</h3><p class="muted">Aucun rapport : fais-le superviser par ta cellule pour connaître ses qualités.</p></section>`;
  const D = attributsDetail(p), w = POIDS_POSTE[p.pos] || {}, est = k => (typeof attrEstime === 'function' ? attrEstime(p, k, D)?.v : D[k]) ?? D[k];
  const lab = k => (ATTR_DETAIL.find(a => a[0] === k) || [k, k])[1];
  const cles = Object.keys(w).sort((a, b) => w[b] - w[a]).slice(0, 10);
  const forts = cles.filter(k => est(k) >= 14).sort((a, b) => est(b) - est(a)).slice(0, 3);
  const faibles = cles.filter(k => est(k) <= 10).sort((a, b) => est(a) - est(b)).slice(0, 3);
  const noteP = typeof notePoste === 'function' ? notePoste(p, p.pos, D) * 5 : playerOvr(p);
  const noteEst = c >= 70 ? noteP : (estOvr(G, p) || noteP);
  const titu = (typeof effectifPro === 'function' ? effectifPro(G) : clubPlayers(G, G.clubId)).filter(x => x.pos === p.pos).sort((a, b) => playerOvr(b) - playerOvr(a))[0];
  const noteT = titu ? (typeof notePoste === 'function' ? notePoste(titu, p.pos) * 5 : playerOvr(titu)) : 0;
  const ecart = Math.round(noteEst - noteT);
  const potEst = typeof estimPotentiel === 'function' ? estimPotentiel(G, p) : { lo: p.pot, hi: p.pot };
  const prix = p.value, budget = typeof availableTransfer === 'function' ? availableTransfer(G) : (G.board?.transfer || 0);
  const avis = ecart >= 3 && (p.club == null || prix <= budget * 1.1) ? ['ok', 'À recruter', `Meilleur que ${titu ? esc(titu.name) : 'ton effectif'} à ce poste${p.club != null && prix > budget * .6 ? ', mais cher pour ton budget' : ''}.`]
    : ecart >= -3 || (p.age <= 21 && potEst.hi >= noteT + 3) ? ['suivre', 'À suivre', p.age <= 21 ? 'Jeune à fort potentiel : à surveiller.' : 'Au niveau de ton titulaire : une option, pas une priorité.']
    : ['non', 'Pas pour nous', 'En dessous de ce que tu as déjà à ce poste.'];
  const sans = G.prefs?.noteMasquee;
  return `<section class="rr" data-bloc="rapport"><h3>Rapport de recrutement <small>fiabilité ${c} %</small></h3>
    <p class="rr-avis rr-${avis[0]}"><b>${avis[1]}</b> ${avis[2]}</p>
    <div class="rr-g"><div><small>Points forts</small>${forts.length ? forts.map(k => `<span class="pos">${esc(lab(k))}</span>`).join('') : '<span class="muted">aucun marquant</span>'}</div>
      <div><small>Points faibles</small>${faibles.length ? faibles.map(k => `<span class="neg">${esc(lab(k))}</span>`).join('') : '<span class="muted">aucun marquant</span>'}</div></div>
    ${titu ? `<p class="rr-comp"><small>Face à ton titulaire</small> ${esc(titu.name)} : ${sans ? (ecart >= 3 ? 'nettement meilleur' : ecart >= -3 ? 'niveau comparable' : 'en dessous') : `${ecart > 0 ? '+' : ''}${ecart} au poste`}</p>` : ''}
    <p class="rr-comp"><small>Potentiel estimé</small> ${typeof starsTxt === 'function' ? `${starsTxt(potEst.lo)} à ${starsTxt(potEst.hi)}` : '?'}</p></section>`;
}
// ---------- discussions selon la personnalité ----------
const REACTIONS = {
  patience: { 'Mercenaire': [-6, 'Il n\'a pas l\'intention d\'attendre : il regarde ailleurs.'], 'Très ambitieux': [-4, 'Attendre ne fait pas partie de ses plans.'], 'Très loyal': [4, 'Il accepte : le club passe avant tout pour lui.'], 'Loyal': [2, 'Il fera l\'effort pour le club.'] },
  fight: { 'Friable': [-6, 'Il le vit comme une remise en cause et se renferme.'], 'Réservé': [-3, 'Il le prend mal, sans le dire.'], 'Leader né': [5, 'Le défi le motive.'], 'Leader': [4, 'Le défi le motive.'], 'Résistant': [4, 'Il va se battre pour sa place.'], 'Modèle de professionnalisme': [3, 'Il redouble d\'efforts à l\'entraînement.'] },
  promise: { 'Mercenaire': [-2, 'Il n\'y croit qu\'à moitié.'], 'Très loyal': [3, 'Ta parole compte beaucoup pour lui.'] },
  list: { 'Très loyal': [-6, 'Il est blessé qu\'on envisage son départ.'], 'Mercenaire': [5, 'Il se voit déjà ailleurs, mieux payé.'] }
};
window.addEventListener('load', () => {
  if (typeof playerMeeting === 'function') {
    const __playerMeetingRD = playerMeeting;
    playerMeeting = function (p, opt) {
      let out = __playerMeetingRD.apply(this, arguments);
      try {
        const pers = typeof personnaliteFM === 'function' ? personnaliteFM(p)[0] : null, r = REACTIONS[opt]?.[pers];
        if (r) { p.morale = clamp(p.morale + r[0], 5, 100); p.trust = clamp((p.trust ?? 55) + Math.round(r[0] / 2), 0, 100); out = `${out} ${pers} : ${r[1]}`; if (G.meetLog?.[0]) G.meetLog[0].result = out; }
      } catch (e) { console.error(e); }
      return out;
    };
  }
  if (typeof playerModal === 'function') {
    const __playerModalRD = playerModal;
    playerModal = function (pid) {
      const r = __playerModalRD.apply(this, arguments);
      try {
        const p = getPlayer(G, pid), side = document.querySelector('#modal .pmf-side');
        if (p && side && p.club !== G.clubId && !side.querySelector('.rr')) (side.querySelector('.nc') || side.querySelector('.fp'))?.insertAdjacentHTML('beforebegin', rapportRecrutement(p));
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
