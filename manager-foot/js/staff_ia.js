// ============================================================
//  Staff des autres clubs et vivier d'entraîneurs persistant
//  - Chaque club de l'IA a un entraîneur et un formateur (niveau 1-5 selon sa réputation, nom, âge, carrière). Leur
//    niveau remplace la « qualité d'encadrement » tirée au hasard dans l'environnement de progression (js/evolution.js).
//  - Vivier d'entraîneurs sans club, persistant : un entraîneur limogé y entre (carrière conservée), un poste vacant est
//    pourvu en y piochant le profil le plus adapté ; les anciens joueurs reconvertis entraîneurs (js/retraites.js) y
//    entrent aussi. Le marché des entraîneurs (mode directeur sportif) propose ces vrais candidats.
//  - Écran Staff : « Entraîneurs sans club » avec leur parcours.
//  Tirages à part (withSideRng) : le déroulé des matchs ne change pas.
// ============================================================
function staffClubIA(G, c) {
  G.staffIA ||= {};
  return G.staffIA[c.id] ||= withSideRng(`${G.seed}|staffia|${c.id}`, () => {
    const lvl = () => clamp(Math.round(c.rep / 20 + (rnd() - .5) * 1.6), 1, 5);
    const nom = () => (typeof aiManagerName === 'function' ? aiManagerName() : `${pick(STAFF_FIRST)} ${pick(STAFF_LAST)}`);
    return { coach: { name: c.mgrName || nom(), lvl: lvl(), age: rint(38, 64), hist: [{ s: G.season, club: c.name, ev: 'en poste' }] }, formateur: { name: nom(), lvl: lvl(), age: rint(35, 66) } };
  });
}
function vivierCoachs(G) {
  if (!G.vivierCoachs) G.vivierCoachs = withSideRng(`${G.seed}|vivier0`, () => Array.from({ length: 24 }, () => ({ name: typeof aiManagerName === 'function' ? aiManagerName() : pick(STAFF_LAST), lvl: clamp(Math.round(1 + rnd() * 4), 1, 5), age: rint(36, 66), hist: [{ s: G.season, ev: 'sans club' }] })));
  return G.vivierCoachs;
}
// environnement de progression : encadrement réel des clubs de l'IA
if (typeof envClub === 'function') {
  const __envClubSI = envClub;
  envClub = function (G, id) {
    const c = getClub(G, id); if (!c || id === G.clubId || c.worldCountry === undefined && false) return __envClubSI.apply(this, arguments);
    if (id === G.clubId) return __envClubSI.apply(this, arguments);
    const s = staffClubIA(G, c), coh = ((c.coh ?? 60) - 60) / 40;
    return clamp((c.rep - 55) / 30 * .55 + ((s.coach.lvl + s.formateur.lvl) / 2 - 3) / 2 * .3 + coh * .15, -1, 1);
  };
}
// limogeages et nominations : le vivier vit
function syncEntraineurs(G) {
  const viv = vivierCoachs(G);
  for (const c of G.clubs) {
    if (c.id === G.clubId) continue;
    const s = staffClubIA(G, c);
    if (!c.mgrName && s.coach && !s.coach.parti) { // limogé cette semaine
      s.coach.hist = [...(s.coach.hist || []), { s: G.season, club: c.name, ev: 'limogé' }];
      viv.push({ ...s.coach, parti: undefined }); s.coach.parti = true;
    } else if (c.mgrName && s.coach.parti) { // poste pourvu par le moteur : on choisit dans le vivier le profil le plus adapté
      const cible = clamp(Math.round(c.rep / 20), 1, 5);
      viv.sort((a, b) => Math.abs(a.lvl - cible) - Math.abs(b.lvl - cible));
      const n = viv.shift();
      if (n) {
        const tire = c.mgrName; n.hist = [...(n.hist || []), { s: G.season, club: c.name, ev: 'nommé' }]; s.coach = n; c.mgrName = n.name;
        const m = (G.inbox || []).slice(0, 40).find(x => x.text.includes(`${c.name} nomme ${tire}`)); if (m) m.text = m.text.replace(tire, n.name); // nouvelle alignée sur le vrai choix
      }
      else { s.coach = { name: c.mgrName, lvl: cible, age: 50, hist: [{ s: G.season, club: c.name, ev: 'nommé' }] }; }
    }
  }
  // anciens joueurs reconvertis entraîneurs principaux
  for (const r of (G.reconv || []).filter(x => x.role === 'head' && !x.dansVivier)) { r.dansVivier = true; viv.push({ name: r.name, lvl: r.lvl, age: r.age, exJoueur: true, hist: [{ s: r.saison, ev: `ancien joueur${r.exClub ? ' de ' + r.exClub : ''}, diplômé` }] }); }
  if (viv.length > 60) viv.splice(0, viv.length - 60);
}
if (typeof aiManagersWeekly === 'function') {
  const __aiManagersWeeklySI = aiManagersWeekly;
  aiManagersWeekly = function (G) { const r = __aiManagersWeeklySI.apply(this, arguments); try { syncEntraineurs(G); } catch (e) { console.error(e); } return r; };
}
if (typeof endSeason === 'function') {
  const __endSeasonSI = endSeason;
  endSeason = function (G) {
    const S = __endSeasonSI.apply(this, arguments);
    try { for (const x of vivierCoachs(G)) x.age++; G.vivierCoachs = vivierCoachs(G).filter(x => x.age < 70); for (const s of Object.values(G.staffIA || {})) { if (s.coach) s.coach.age++; if (s.formateur) s.formateur.age++; } } catch (e) { console.error(e); }
    return S;
  };
}
// marché des entraîneurs (mode directeur sportif) : de vrais candidats du vivier
if (typeof coachMarket === 'function') {
  const __coachMarketSI = coachMarket;
  coachMarket = function (G) {
    const list = __coachMarketSI.apply(this, arguments);
    try {
      const pris = new Set(list.map(x => x.name));
      for (const v of vivierCoachs(G).slice().sort((a, b) => b.lvl - a.lvl).slice(0, 3)) {
        if (pris.has(v.name)) continue;
        const base = withSideRng(`${G.seed}|vivc|${v.name}`, () => newCoach(30 + v.lvl * 13, v.lvl));
        list.push({ ...base, id: 'vv' + hashStaff(v.name), name: v.name, age: v.age, employer: null, comp: 0, history: (v.hist || []).map(h => `${h.s} ${h.club ? h.club + ' : ' : ''}${h.ev}`), duVivier: true });
      }
    } catch (e) { console.error(e); }
    return list;
  };
}
// écran Staff : entraîneurs sans club
window.addEventListener('load', () => {
  if (typeof vStaffPeople !== 'function') return;
  const __vStaffPeopleSI = vStaffPeople;
  vStaffPeople = vStaff = function (el) {
    const r = __vStaffPeopleSI.apply(this, arguments);
    try {
      const v = vivierCoachs(G).slice().sort((a, b) => b.lvl - a.lvl).slice(0, 15);
      if (v.length && !el.querySelector('.vv-tab')) el.insertAdjacentHTML('beforeend', `<section class="card vv-tab"><h2>Entraîneurs sans club</h2>
        <p class="hint">Les entraîneurs limogés et les anciens joueurs reconvertis attendent un poste. Les clubs qui limogent piochent ici le profil le plus adapté.</p>
        <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Entraîneur</th><th>Niveau</th><th>Âge</th><th>Parcours</th></tr></thead><tbody>${v.map(x => `<tr><td class="nm">${esc(x.name)}${x.exJoueur ? ' <small class="muted">ancien joueur</small>' : ''}</td><td class="stars">${'★'.repeat(x.lvl)}${'☆'.repeat(5 - x.lvl)}</td><td>${x.age}</td><td><small>${esc((x.hist || []).slice(-3).map(h => `${h.s} ${h.club ? h.club + ' : ' : ''}${h.ev}`).join(' · '))}</small></td></tr>`).join('')}</tbody></table></div></section>`);
    } catch (e) { console.error(e); }
    return r;
  };
});
