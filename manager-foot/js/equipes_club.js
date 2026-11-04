// ============================================================
//  Trois équipes par club : équipe première, réserve, U19
//  - Monde étendu (FM26) : l'équipe réelle de chaque joueur vient des données (« First team », « Development team »,
//    « Under-19 ») au lieu d'un seul effectif de 70 joueurs.
//  - Autres mondes : un club de plus de 34 joueurs est réparti à la création (28 meilleurs en équipe première, moins de
//    20 ans en U19, le reste en réserve).
//  - Équipe première : seule comptée dans le plafond de 32 joueurs ; les clubs (le tien et l'IA) n'alignent la réserve
//    et les U19 qu'en cas de pénurie (js/engine.js).
//  - Chaque semaine, réserve et U19 des autres clubs jouent et progressent aussi (le centre de formation de ton club
//    garde son propre suivi : js/realisme.js). Fin de saison : les clubs de l'IA font monter leurs meilleurs jeunes,
//    un U19 de 20 ans passe en réserve.
// ============================================================
function equipeDeSource(p, squad) {
  const s = String(squad || '');
  if (/under.?1[789]|u1[789]\b/i.test(s)) { p.academy = true; p.reserve = false; p.equipeSource = 'U19'; }
  else if (/development|reserve|under.?2[0-3]|u2[0-3]\b|\bB team/i.test(s)) { p.reserve = true; p.academy = false; p.equipeSource = 'Réserve'; }
  else if (s) p.equipeSource = 'Équipe première';
}
function repartirEffectif(G, clubId) {
  const sq = clubPlayers(G, clubId);
  if (sq.length <= 34 || sq.some(p => p.equipeSource)) return;
  const tri = sq.slice().sort((a, b) => playerOvr(b) - playerOvr(a));
  const gb = tri.filter(p => p.pos === 'GB').slice(0, 3), autres = tri.filter(p => p.pos !== 'GB').slice(0, 25);
  const A = new Set([...gb, ...autres]);
  for (const p of sq) {
    if (A.has(p)) continue;
    if (p.age <= 19) { p.academy = true; p.reserve = false; } else p.reserve = true;
  }
}
if (typeof newGame === 'function') {
  const __newGameEQ = newGame;
  newGame = function () {
    const g = __newGameEQ.apply(this, arguments);
    try { for (const c of g.clubs) repartirEffectif(g, c.id); } catch (e) { console.error(e); }
    return g;
  };
}
// réserve et U19 des clubs de l'IA : matchs et progression (sans toucher au suivi détaillé de ton centre)
function jeunesIAWeekly(G) {
  for (const p of G.players) {
    if (p.club == null || p.club === G.clubId || !(p.academy || p.reserve)) continue;
    if (p.injury > 0) continue;
    const o = playerOvr(p);
    if (o < p.pot && p.age <= 23 && rnd() < (p.academy ? .022 : .016)) bumpAttr(p, 1);
  }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateEQ = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdateEQ.apply(this, arguments);
    if (full) try { jeunesIAWeekly(G); } catch (e) { console.error(e); }
    return r;
  };
}
function promotionsIA(G) {
  for (const c of G.clubs) {
    if (c.id === G.clubId) continue;
    const sq = clubPlayers(G, c.id);
    for (const p of sq) if (p.academy && p.age >= 20) { p.academy = false; p.reserve = true; }
    const pro = sq.filter(p => !p.academy && !p.reserve);
    if (pro.length >= 24) continue;
    const cands = sq.filter(p => p.reserve || (p.academy && p.age >= 17)).sort((a, b) => playerOvr(b) - playerOvr(a));
    for (const p of cands.slice(0, 24 - pro.length)) { p.academy = false; p.reserve = false; }
  }
}
if (typeof endSeason === 'function') {
  const __endSeasonEQ = endSeason;
  endSeason = function (G) { const S = __endSeasonEQ.apply(this, arguments); try { promotionsIA(G); } catch (e) { console.error(e); } return S; };
}
// fiche : équipe du joueur
window.addEventListener('load', () => {
  if (typeof playerModal !== 'function') return;
  const __playerModalEQ = playerModal;
  playerModal = function (pid) {
    const r = __playerModalEQ.apply(this, arguments);
    try {
      const p = getPlayer(G, pid), h = document.querySelector('#modal h2');
      if (p && h && !h.querySelector('.eq-tag') && (p.academy || p.reserve)) h.insertAdjacentHTML('beforeend', ` <small class="vg-note eq-tag">${p.academy ? 'U19' : 'Réserve'}</small>`);
    } catch (e) { console.error(e); }
    return r;
  };
});
