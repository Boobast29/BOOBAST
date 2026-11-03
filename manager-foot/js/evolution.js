// ============================================================
//  Évolution de tout le monde au fil du temps (fin de saison)
//  - Chaque joueur a un âge de déclin propre (29 à 34 ans, plus tard pour les professionnels) : déclin précoce pour
//    certains, deuxième souffle pour d'autres (le moteur fait déjà baisser tout le monde après 31 ans).
//  - 24-28 ans : le potentiel peut encore bouger un peu (temps de jeu, sérieux, hasard) — éclosions tardives ou stagnation.
//  - Historique du niveau saison par saison (p.evo) et bilan d'intersaison de ton effectif dans la messagerie :
//    qui progresse, qui stagne, qui régresse.
//  Tirages à part (withSideRng) : le déroulé des matchs et du mercato ne se décale pas.
// ============================================================
// Environnement de progression d'un club (-1 à +1) : ton club → staff réel (entraîneur technique, adjoint, entraîneur
// principal), centre d'entraînement, entente du staff, cohésion ; autres clubs → réputation, qualité d'encadrement
// propre au club (varie lentement d'une saison à l'autre) et cohésion du groupe.
function envClub(G, id) {
  const c = getClub(G, id); if (!c) return 0;
  const coh = ((c.coh ?? 60) - 60) / 40;
  if (id === G.clubId) {
    const st = G.staff || {}, fac = G.fac || {};
    const ent = typeof ententeStaff === 'function' && G.staffPeople ? ententeStaff(G).mod : 0;
    const chef = typeof isDS === 'function' && isDS(G) && G.coach ? (G.coach.lvl - 3) / 2 * .15 : 0;
    return clamp(((st.coach || 2) + (st.assistant || 2) - 6) / 4 * .35 + ((fac.training || 2) - 3) / 2 * .3 + ent * .2 + chef + coh * .1, -1, 1);
  }
  const encad = hashPot(`encadrement|${id}|${Math.floor(G.season / 3)}`) * 2 - 1;
  return clamp((c.rep - 55) / 30 * .55 + encad * .3 + coh * .15, -1, 1);
}
const motEnv = v => v >= .45 ? 'excellent' : v >= .15 ? 'bon' : v > -.15 ? 'moyen' : v > -.45 ? 'faible' : 'mauvais';
const ageDeclin = p => p.declin ??= 29 + Math.floor(hashPot(`declin|${p.id}|${p.name}`) * 6) + (p.pers === 'Professionnel' ? 1 : 0) - (p.pers === 'Tempérament' ? 1 : 0);
function evoluerTout(G) {
  const rounds = Math.max(1, typeof leagueRoundAt === 'function' ? leagueRoundAt(G) : 30);
  withSideRng(`${G.seed}|evotout|${G.season}`, () => {
    for (const p of G.players) {
      if (p.club == null || p.retired) continue;
      const env = envClub(G, p.club), a = p.age, onset = ageDeclin(p) + Math.round(env), o = playerOvr(p); // bon suivi médical et physique : déclin retardé
      if (a <= 23 && o < p.pot) { // jeunes : un bon environnement accélère, un mauvais freine
        if (env > 0 && rnd() < env * .7) bumpAttr(p, 1, null);
        else if (env < 0 && rnd() < -env * .5) bumpAttr(p, -1, null);
      }
      if (a >= onset && a < 31) { // déclin précoce
        const n = rnd() < .45 + (a - onset) * .15 ? 1 + (rnd() < .3 ? 1 : 0) : 0;
        for (let i = 0; i < n; i++) bumpAttr(p, -1, rnd() < .6 ? ['vit', 'phy'] : null);
      } else if (a >= 31 && onset >= 33 && rnd() < .55) bumpAttr(p, 1, ['men', 'pas']); // deuxième souffle : compense en partie le déclin du moteur
      if (a >= 24 && a <= 28) {
        const jeu = clamp((p.stats?.min || 0) / (rounds * 90), 0, 1);
        const d = Math.round((rnd() + rnd() - 1) * 2.2 + (SERIEUX[p.pers] ?? 0) * .5 + (jeu - .4) * 2.5 + env * 1.5);
        if (d) p.pot = clamp(p.pot + d, o, 99);
      }
    }
  });
}
function bilanSaison(G) {
  const lignes = { up: [], flat: [], down: [] };
  for (const p of G.players) {
    if (p.club == null) continue;
    const o = playerOvr(p); p.evo ||= [];
    const prev = p.evo.length ? p.evo[p.evo.length - 1].o : null;
    p.evo.push({ s: G.season, o, a: p.age });
    if (p.evo.length > 20) p.evo.shift();
    if (p.club !== G.clubId || prev == null) continue;
    const d = o - prev;
    (d >= 2 ? lignes.up : d <= -2 ? lignes.down : lignes.flat).push([p, d]);
  }
  if (!lignes.up.length && !lignes.down.length) return;
  const nom = ([p, d]) => `${p.name} (${d > 0 ? '+' : ''}${d})`;
  lignes.up.sort((a, b) => b[1] - a[1]); lignes.down.sort((a, b) => a[1] - b[1]);
  const env = envClub(G, G.clubId);
  news(G, `📊 Bilan de la saison ${G.season}/${G.season + 1} (environnement de progression ${motEnv(env)}) : ${lignes.up.length} joueur(s) en progrès${lignes.up.length ? ' — ' + lignes.up.slice(0, 5).map(nom).join(', ') : ''}. ${lignes.flat.length} stable(s). ${lignes.down.length} en recul${lignes.down.length ? ' — ' + lignes.down.slice(0, 5).map(nom).join(', ') : ''}.`, 'info');
}
if (typeof endSeason === 'function') {
  const __endSeasonEvo = endSeason;
  endSeason = function (G) {
    try { evoluerTout(G); bilanSaison(G); } catch (e) { console.error(e); }
    return __endSeasonEvo.apply(this, arguments);
  };
}
// Écran Staff : environnement de progression du club
if (typeof vStaffPeople === 'function') {
  const __vStaffPeopleEvo = vStaffPeople;
  vStaffPeople = vStaff = function (el) {
    const r = __vStaffPeopleEvo.apply(this, arguments);
    try {
      const t = el.querySelector('.es-tete > div:last-child');
      if (t && !t.querySelector('.evo-env')) {
        const v = envClub(G, G.clubId);
        t.insertAdjacentHTML('beforeend', `<p class="evo-env">Environnement de progression : <b class="${v >= .15 ? 'pos' : v <= -.15 ? 'neg' : ''}">${motEnv(v)}</b> <small class="muted">(entraîneur technique, adjoint, centre d'entraînement, entente du staff, cohésion). Il pèse chaque fin de saison sur la progression, le potentiel et le déclin de tes joueurs.</small></p>`);
      }
    } catch (e) { console.error(e); }
    return r;
  };
}
