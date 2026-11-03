// ============================================================
//  Histoire réelle et vie des recrues
//  - Palmarès réel (js/palmares_reel.js, openfootball/football.json, CC0) : classements recalculés de 2010 à
//    aujourd'hui pour chaque division couverte, affichés sous les règlements du pays.
//  - Adaptation des recrues : nouvelles tirées des textes français d'open-football (Apache-2.0,
//    js/open_football.js) selon le niveau d'intégration du joueur (js/vieclub.js). Choix par empreinte
//    (hashTrait) : aucun tirage aléatoire, le futur de la partie ne change pas.
//  - Noms générés : réservoirs de prénoms/noms d'open-football ajoutés à ceux du pays (70 pays).
// ============================================================
if (typeof OF_NOMS !== 'undefined' && typeof NAMES !== 'undefined') {
  for (const [code, pool] of Object.entries(OF_NOMS)) {
    NAMES['OF_' + code] = pool;
    NAT_POOL[code] = NAT_POOL[code] ? [...NAT_POOL[code], 'OF_' + code] : ['OF_' + code];
  }
}

// ---------- adaptation des recrues ----------
function texteAdaptation(G, p) {
  if (typeof OF_ADAPT === 'undefined') return null;
  const i = p.integ ?? 100;
  let cles;
  if (i < 35) cles = ['homesickness', 'language_barrier', 'family_unsettled', 'still_struggling', 'personal_leave'];
  else if (i < 75) cles = ['lifestyle', 'local_culture', 'settling_squad', ...(p.langCourse ? ['language_milestone', 'language_milestone'] : []), ...(p.integMentor ? ['companion_support', 'companion_support'] : [])];
  else cles = ['family_settled', 'settling_squad', 'local_culture'];
  const k = cles[hashTrait(p.id + ':' + G.season + ':' + G.week) % cles.length];
  const h = OF_ADAPT['headline_' + k], r = OF_ADAPT['reason_' + k];
  return h && r ? { k, texte: `🌍 ${p.name} — ${h}. ${r}` } : null;
}
if (typeof integrationWeekly === 'function') {
  const __integrationWeeklyHR = integrationWeekly;
  integrationWeekly = function (G) {
    const r = __integrationWeeklyHR.apply(this, arguments);
    for (const p of clubPlayers(G, G.clubId)) {
      if ((p.integ ?? 100) >= 100 || p.joinedSeason !== G.season || (G.week + p.id) % 5) continue;
      const t = texteAdaptation(G, p);
      if (t && p.adaptK !== t.k) { p.adaptK = t.k; news(G, t.texte, 'info'); }
    }
    return r;
  };
}

// ---------- palmarès réel ----------
function blocPalmaresReel(code) {
  if (typeof PALMARES_REEL === 'undefined' || !PALMARES_REEL[code]) return '';
  const P = PALMARES_REEL[code];
  const niveaux = Object.keys(P).sort();
  return `<section class="card palm-reel"><h2>🏆 Palmarès réel</h2>
    <p class="hint">Classements recalculés à partir des résultats (openfootball/football.json, domaine public) : 3 points la victoire, puis différence et buts marqués. Les pénalités de points ne sont pas comptées.</p>
    ${niveaux.map(n => {
      const L = P[n].slice().reverse(), titres = {};
      for (const s of P[n]) if (s.fini) titres[s.c] = (titres[s.c] || 0) + 1;
      const rois = Object.entries(titres).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, k]) => `${esc(c)} ×${k}`).join(' · ');
      return `<h3><span class="tier">N${n}</span> ${esc(L[0].nom || '')}</h3>${rois ? `<p class="muted">Plus titrés sur la période : ${rois}</p>` : ''}
      <div class="tbl-wrap"><table class="tbl compact"><tr><th>Saison</th><th>Champion</th><th>Dauphin</th><th>Buts/m.</th><th>Vict. dom.</th></tr>
      ${L.slice(0, 12).map(s => `<tr><td>${esc(s.s)}</td><td class="nm">${esc(s.c)} <small>${s.pc} pts</small>${s.fini ? '' : ` <small class="muted">(${s.j < s.eq * (s.eq - 1) * .9 ? `en tête, ${s.j} matchs joués` : 'résultats incomplets'})</small>`}</td><td>${esc(s.d)} <small>${s.pd}</small></td><td>${s.bm.toFixed(2).replace('.', ',')}</td><td>${Math.round(s.dom * 100)} %</td></tr>`).join('')}</table></div>`;
    }).join('')}</section>`;
}
if (typeof vRegles === 'function') {
  const __vReglesHR = vRegles;
  vRegles = function (el) {
    const r = __vReglesHR.apply(this, arguments);
    const R = reglesPays(G), code = Object.keys(REGLES).find(k => REGLES[k] === R);
    el.insertAdjacentHTML('beforeend', blocPalmaresReel(RG_TAB || code));
    return r;
  };
}
