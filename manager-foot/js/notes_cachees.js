// ============================================================
//  Notes cachées et personnalité (idée de gilgiltsu/FMTools « Les notes cachées », sans code repris)
//  - 7 notes cachées sur 20 : professionnalisme, pression, tempérament, ambition, fidélité, fair-play, polémique.
//    Tirées du caractère du joueur (p.pers) et de son identité : stables, sans toucher au hasard du jeu.
//  - Personnalité affichée à la façon de Football Manager (Modèle de professionnalisme, Perfectionniste, Leader né,
//    Résistant, Mercenaire, Friable, Indolent, Équilibré…) et attitude face aux médias (Imperturbable, Réservé…).
//  - Effets : le professionnalisme accélère la progression des jeunes (ou la freine s'il est faible) ; l'ambition
//    augmente les exigences de salaire ; la fidélité modère l'envie de partir.
//  - Fiche : bloc « Personnalité » ; les notes cachées sont des estimations (fourchettes) qui se précisent avec la
//    connaissance du joueur — jamais la valeur exacte, comme dans FM.
// ============================================================
const NOTES_CACHEES = [['prof', 'Professionnalisme'], ['pres', 'Pression'], ['temp', 'Tempérament'], ['amb', 'Ambition'], ['fid', 'Fidélité'], ['fair', 'Fair-play'], ['pol', 'Polémique']];
const BASE_CARACTERE = {
  Professionnel: { prof: 15, pres: 12, temp: 12, amb: 11, fid: 12, fair: 13, pol: 7 },
  Ambitieux: { prof: 12, pres: 13, temp: 12, amb: 16, fid: 8, fair: 11, pol: 10 },
  Loyal: { prof: 12, pres: 11, temp: 12, amb: 9, fid: 17, fair: 13, pol: 7 },
  'Tempérament': { prof: 10, pres: 11, temp: 9, amb: 12, fid: 10, fair: 6, pol: 15 },
  Discret: { prof: 12, pres: 8, temp: 10, amb: 9, fid: 12, fair: 14, pol: 5 },
  Leader: { prof: 15, pres: 15, temp: 16, amb: 13, fid: 13, fair: 12, pol: 9 }
};
function notesCachees(p) {
  if (p.cachees) return p.cachees;
  const b = BASE_CARACTERE[p.pers] || BASE_CARACTERE.Professionnel, h = k => (typeof hashTrait === 'function' ? hashTrait(`cache|${k}|${p.id}|${p.name}`) : 0) >>> 0;
  return p.cachees = Object.fromEntries(NOTES_CACHEES.map(([k]) => [k, clamp(b[k] + (h(k) % 9) - 4, 1, 20)]));
}
function personnaliteFM(p) {
  const c = notesCachees(p), lead = typeof attributsDetail === 'function' ? (attributsDetail(p).leadership ?? 10) : 10;
  if (c.prof >= 18 && c.amb >= 14) return ['Modèle de professionnalisme', 'Irréprochable à l\'entraînement : progresse au maximum de son potentiel.'];
  if (c.prof >= 17) return ['Perfectionniste', 'Exigeant envers lui-même, très bon pour la progression.'];
  if ((lead >= 15 && c.temp >= 15) || (p.pers === 'Leader' && c.temp >= 13)) return [p.pers === 'Leader' && lead >= 15 ? 'Leader né' : 'Leader', 'Tire le groupe vers le haut dans les moments difficiles.'];
  if (c.amb >= 17 && c.fid <= 8) return ['Mercenaire', 'Suivra le meilleur salaire : difficile à retenir.'];
  if (c.fid <= 5) return ['Déloyal', 'Peu attaché au club, demandera à partir si une offre arrive.'];
  if (c.pres <= 5) return ['Friable', 'Perd ses moyens dans les grands matchs.'];
  if (c.prof <= 6) return ['Indolent', 'Peu travailleur : progresse lentement.'];
  if (c.temp >= 16) return ['Résistant', 'Ne lâche rien quand l\'équipe est menée.'];
  if (c.fid >= 17) return ['Très loyal', 'Attaché au club, refuse souvent de partir.'];
  if (c.amb >= 16) return ['Très ambitieux', 'Veut jouer le haut de tableau et être bien payé.'];
  if (c.fair >= 17) return ['Fair-play', 'Sportif exemplaire, peu de cartons.'];
  if (c.pol >= 15) return ['Effronté', 'N\'hésite pas à contester les décisions.'];
  if (c.prof >= 14 || p.pers === 'Professionnel') return ['Professionnel', 'Sérieux et régulier.'];
  if (p.pers === 'Loyal') return ['Loyal', 'Attaché à son club.'];
  if (p.pers === 'Ambitieux') return ['Ambitieux', 'Veut progresser vers un plus grand club.'];
  if (p.pers === 'Tempérament') return ['Sanguin', 'Réagit fort, cartons plus fréquents.'];
  if (p.pers === 'Discret') return ['Réservé', 'Discret, sensible aux critiques.'];
  return ['Équilibré', 'Ni défaut ni qualité marquée.'];
}
function attitudeMedias(p) {
  const c = notesCachees(p);
  const t = [c.pres >= 15 ? 'Imperturbable' : c.pres <= 7 ? 'Réservé' : null, c.pol >= 14 ? 'Conflictuel' : null, c.temp <= 7 ? 'Irascible' : null, c.fair >= 15 && c.pres >= 12 ? 'Apprécié des médias' : null].filter(Boolean);
  return t.length ? t.join(', ') : 'Équilibré';
}
// ---------- effets ----------
if (typeof demandWage === 'function') {
  const __demandWageNC = demandWage;
  demandWage = function (W, p, c) { const v = __demandWageNC.apply(this, arguments); return roundMoney(v * (1 + (notesCachees(p).amb - 10) * .015)); };
}
function progressionCachee(G) {
  withSideRng(`${G.seed}|cache|${G.season}|${G.week}`, () => {
    for (const p of G.players) {
      if (p.club == null || p.age > 24 || p.injury > 0) continue;
      const pr = notesCachees(p).prof;
      if (pr >= 14 && playerOvr(p) < p.pot && rnd() < (pr - 13) * .004) bumpAttr(p, 1);
      else if (pr <= 6 && rnd() < (7 - pr) * .003) bumpAttr(p, -1);
    }
  });
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateNC = weeklyUpdate;
  weeklyUpdate = function (G, full = true) { const r = __weeklyUpdateNC.apply(this, arguments); if (full) try { progressionCachee(G); } catch (e) { console.error(e); } return r; };
}
// ---------- fiche ----------
function blocPersonnalite(p) {
  const c = notesCachees(p), [pers, desc] = personnaliteFM(p);
  const conn = typeof connaissance === 'function' ? connaissance(G, p) : 100, mine = p.club === G.clubId;
  const e = mine ? 1 : conn >= 70 ? 2 : conn > 0 ? 3 : null; // jamais exact : estimation du staff
  const h = k => (typeof hashTrait === 'function' ? hashTrait(`cachefourch|${p.id}|${k}`) : 0) % 3 - 1;
  const val = k => e == null ? '?' : `${clamp(c[k] + h(k) - e, 1, 20)}-${clamp(c[k] + h(k) + e, 1, 20)}`;
  return `<section class="nc" data-bloc="nc"><h3>Personnalité</h3>
    <p class="nc-pers"><b>${e == null ? 'Inconnue' : esc(pers)}</b>${e == null ? '' : `<small>${esc(desc)}</small>`}</p>
    ${e == null ? '' : `<p class="nc-med"><small>Face aux médias</small> ${esc(attitudeMedias(p))}</p>`}
    <div class="nc-g">${NOTES_CACHEES.map(([k, l]) => `<span>${l}</span><b>${val(k)}</b>`).join('')}</div>
    <p class="hint">Notes cachées estimées par ton staff${mine ? '' : ' : plus précises quand ta cellule connaît mieux le joueur'}.</p></section>`;
}
window.addEventListener('load', () => {
  if (typeof playerModal !== 'function') return;
  const __playerModalNC = playerModal;
  playerModal = function (pid) {
    const r = __playerModalNC.apply(this, arguments);
    try {
      const p = getPlayer(G, pid), fp = document.querySelector('#modal .pmf-side .fp');
      if (p && fp && !document.querySelector('#modal .nc')) fp.insertAdjacentHTML('afterend', blocPersonnalite(p));
      document.querySelectorAll('#modal .pmf-side tr').forEach(tr => { if (/^Personnalité/.test(tr.children[0]?.textContent.trim() || '')) tr.remove(); }); // remplacée par le bloc Personnalité
    } catch (e) { console.error(e); }
    return r;
  };
});
