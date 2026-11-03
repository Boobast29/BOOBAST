// ============================================================
//  Potentiel incertain et évolutif (joueurs)
//  - Le vrai potentiel reste caché : l'écran montre une estimation du staff (fourchette), plus ou moins juste selon
//    le niveau de l'entraîneur technique et de l'adjoint (tes joueurs, plus précise avec l'ancienneté au club) ou du
//    recruteur (autres joueurs suivis). L'estimation peut se tromper dans un sens ou dans l'autre.
//  - Le potentiel bouge chaque fin de saison pour les 23 ans et moins : part de hasard, sérieux (personnalité),
//    accompagnement (staff, centre d'entraînement, entente du staff) et temps de jeu.
//  Le hasard utilisé ici est un tirage à part (withSideRng) : il ne décale pas les matchs ni le mercato.
// ============================================================
function hashPot(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
function margePotentiel(G, p) {
  const st = G.staff || {};
  if (p.club === G.clubId || p.loan?.from === G.clubId) {
    const anc = Math.max(0, G.season - (p.joinedSeason ?? G.season));
    return clamp(12 - .9 * ((st.coach || 2) + (st.assistant || 2)) - anc * 1.5, 2, 10);
  }
  return clamp(15 - 2 * (st.scout || 2), 4, 12);
}
function estimPotentiel(G, p) {
  const err = margePotentiel(G, p), o = playerOvr(p);
  const biais = (hashPot(`${G.seed}|pot|${p.id}|${G.season}`) * 2 - 1) * err * .6; // le staff se trompe un peu, toujours dans le même sens sur une saison
  const lo = clamp(Math.round(p.pot + biais - err), o, 99), hi = clamp(Math.round(p.pot + biais + err), Math.max(lo, o), 99);
  return { lo, hi, err };
}
potCell = function (p) {
  if (!knows(G, p)) return '<span class="muted" title="Potentiel inconnu : envoie un recruteur">?</span>';
  const { lo, hi } = estimPotentiel(G, p);
  return `<span class="pot-est" title="Estimation du staff : entre ${starsTxt(lo)} et ${starsTxt(hi)}. Le vrai potentiel reste incertain et peut évoluer.">${stars(Math.round((lo + hi) / 2))}<small>${starsTxt(lo).replace('★', '')}–${starsTxt(hi)}</small></span>`;
};

// ---------- évolution en fin de saison ----------
const SERIEUX = { Professionnel: 1.6, Ambitieux: .8, Leader: .5, Loyal: .2, Discret: 0, Tempérament: -1.2 };
function evoluerPotentiels(G) {
  const st = G.staff || {}, fac = G.fac || {}, rounds = Math.max(1, typeof leagueRoundAt === 'function' ? leagueRoundAt(G) : 30);
  const ent = typeof ententeStaff === 'function' && G.staffPeople ? ententeStaff(G).mod : 0;
  const notes = [];
  withSideRng(`${G.seed}|evopot|${G.season}`, () => {
    for (const p of G.players) {
      if (p.age > 23 || p.club == null) continue;
      const o = playerOvr(p), mine = p.club === G.clubId;
      const hasard = (rnd() + rnd() + rnd() - 1.5) * 4.5;
      const serieux = SERIEUX[p.pers] ?? 0;
      const accomp = mine ? ((st.coach || 2) - 3) * .9 + ((fac.training || 2) - 2) * .6 + ent * 1.5 : 0;
      const jeu = clamp((p.stats?.min || 0) / (rounds * 90), 0, 1);
      const temps = (jeu - .35) * 4 - (p.injury > 8 ? 1.5 : 0);
      const d = Math.round(hasard + serieux + accomp + temps);
      if (!d) continue;
      const avant = p.pot;
      p.pot = clamp(p.pot + d, o, 99);
      if (mine && Math.abs(p.pot - avant) >= 4) notes.push([p, p.pot - avant]);
    }
  });
  for (const [p, d] of notes) news(G, d > 0
    ? `🌱 Le staff revoit à la hausse le potentiel de ${p.name} : son travail et son temps de jeu paient.`
    : `🔻 ${p.name} stagne : le staff revoit son potentiel à la baisse (manque de temps de jeu, de sérieux ou d'accompagnement).`, 'youth');
}
if (typeof endSeason === 'function') {
  const __endSeasonPot = endSeason;
  endSeason = function (G) { try { evoluerPotentiels(G); } catch (e) { console.error(e); } return __endSeasonPot.apply(this, arguments); };
}
