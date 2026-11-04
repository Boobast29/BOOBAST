// ============================================================
//  Entraînement plus visible
//  - Planning de la semaine : 7 jours, séance du jour et charge (barre) selon le programme, l'intensité et le match.
//  - Charge de la semaine (0-100) et ce qu'elle implique (récupération, progression, risque).
//  - Risque de blessure à l'entraînement par joueur : même formule que le moteur (js/world.js trainingInjuries),
//    affiché en niveau (faible / modéré / élevé) et en multiple du risque normal.
//  - Joueur ménagé : séances allégées pour lui (risque ×0,4, +6 de condition), mais pas de progression par les séances.
//  - Effet des séances : attributs gagnés ces 6 dernières semaines, chance de progresser par joueur.
//  Aucun tirage ajouté : le déroulé de la partie ne change pas tant qu'aucun joueur n'est ménagé.
// ============================================================
const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const SEANCES = {
  equilibre: ['Circuit technique', 'Jeu réduit', 'Opposition'],
  physique: ['Endurance', 'Vitesse et puissance', 'Gainage et explosivité'],
  technique: ['Conduite et contrôle', 'Passes en mouvement', 'Dribble 1 contre 1'],
  attaque: ['Finition', 'Centres et reprises', 'Combinaisons offensives'],
  defense: ['Placement défensif', 'Duels et tacles', 'Bloc et pressing'],
  tactique: ['Vidéo et placement', 'Mise en place', 'Coups de pied arrêtés'],
  repos: ['Soins et récupération', 'Footing léger', 'Repos']
};
function aMatchCetteSemaine(G) {
  return weekFixtures(G, G.week).some(f => f.h === G.clubId || f.a === G.clubId);
}
function planningSemaine(G) {
  const tr = G.training || { focus: 'equilibre', intensity: 1 }, s = SEANCES[tr.focus] || SEANCES.equilibre;
  const k = [.6, 1, 1.35][tr.intensity] * (tr.focus === 'physique' ? 1.15 : tr.focus === 'repos' ? .35 : tr.focus === 'tactique' ? .85 : 1);
  const match = aMatchCetteSemaine(G);
  const j = match
    ? [['Récupération', 25], [s[0], 70], [s[1], 80], [s[2], 60], ['Veille de match : automatismes', 35], ['Match', 100], ['Repos', 0]]
    : [['Récupération', 25], [s[0], 70], [s[1], 80], [s[2], 75], [s[0], 65], ['Opposition interne', 55], ['Repos', 0]];
  return j.map(([nom, c], i) => ({ jour: JOURS_SEMAINE[i], nom, charge: nom === 'Match' ? 100 : Math.round(clamp(c * k, 0, 100)), match: nom === 'Match' }));
}
function chargeSemaine(G) {
  const p = planningSemaine(G);
  return clamp(Math.round(p.reduce((a, d) => a + d.charge, 0) / p.length * 1.5), 0, 100);
}
// risque de blessure à l'entraînement sur la semaine (formule du moteur)
function risqueEntrainement(G, p) {
  if (p.injury > 0) return null;
  const tr = G.training || { intensity: 1, focus: 'equilibre' };
  let base = .0024 * [.5, 1, 1.7][tr.intensity] * (tr.focus === 'physique' ? 1.3 : tr.focus === 'repos' ? .4 : 1) * (1.25 - .06 * (G.staff?.physio || 2) - .04 * (G.fac?.medical || 2));
  if (p.fit < 70) base *= 1.5;
  const m = base * (typeof injuryRiskMult === 'function' ? injuryRiskMult(G, p) : 1);
  const rel = m / .0024;
  return { p: m, rel, niv: rel < 1.5 ? ['faible', 'ok'] : rel < 2.6 ? ['modéré', 'warn'] : ['élevé', 'bad'] };
}
// chance de gagner un point d'attribut par les séances cette semaine (formule du moteur)
function chanceProgres(G, p) {
  if (p.injury > 0 || p.academy || playerOvr(p) >= p.pot || p.menage) return 0;
  const tr = G.training || { intensity: 1, focus: 'equilibre' }, st = G.staff || {}, fac = G.fac || {};
  let c = p.age <= 21 ? .16 : p.age <= 24 ? .11 : p.age <= 28 ? .04 : 0;
  if (p.pers === 'Professionnel') c *= 1.25;
  const lr = Math.max(1, leagueRoundAt(G)); c *= clamp(.4 + (p.stats?.min || 0) / lr / 90 * .75, .4, 1.15);
  return c * [.6, 1, 1.4][tr.intensity] * (tr.focus === 'repos' ? 0 : 1) * (.75 + .1 * (st.coach || 2) + .07 * (fac.training || 2));
}
// joueur ménagé : moins de risque
if (typeof injuryRiskMult === 'function') {
  const __injuryRiskMultEP = injuryRiskMult;
  injuryRiskMult = function (G, p) { const m = __injuryRiskMultEP.apply(this, arguments); return p.menage && p.club === G.clubId ? m * .4 : m; };
}
window.addEventListener('load', () => {
  if (typeof weeklyUpdate !== 'function') return;
  const __weeklyUpdateEP = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdateEP.apply(this, arguments);
    if (!full || G.clubId == null) return r;
    try {
      // ménagé : condition en plus, pas de progression par les séances
      const men = new Set(G.players.filter(p => p.menage && p.club === G.clubId).map(p => p.id));
      if (men.size) {
        for (const p of G.players) if (men.has(p.id)) p.fit = clamp(p.fit + 6, 0, 100);
        G.weekProg = (G.weekProg || []).filter(x => { if (!men.has(x.pid)) return true; const p = getPlayer(G, x.pid); if (p?.attrs?.[x.k] != null) p.attrs[x.k] = clamp(p.attrs[x.k] - x.d, 1, 20); return false; });
      }
      G.progHist = [{ s: G.season, w: G.week, f: G.training?.focus, items: (G.weekProg || []).map(x => ({ ...x })) }, ...(G.progHist || [])].slice(0, 6);
    } catch (e) { console.error(e); }
    return r;
  };
});
// ---------- écran ----------
function blocPlanning() {
  const pl = planningSemaine(G), ch = chargeSemaine(G);
  const tr = G.training, t = TRAINING[tr.focus] || TRAINING.equilibre;
  const lecture = ch >= 85 ? ['bad', 'Semaine très chargée : progression rapide, mais condition basse au match et blessures plus fréquentes.']
    : ch >= 60 ? ['warn', 'Charge soutenue : bonne progression, à surveiller pour les joueurs fatigués.']
    : ch >= 35 ? ['ok', 'Charge équilibrée : les joueurs progressent et récupèrent.']
    : ['ok', 'Semaine légère : récupération maximale, peu de progression.'];
  return `<section class="card ep-plan"><div class="ep-head"><h2>Semaine d'entraînement</h2>
      <div class="ep-charge"><small>Charge</small><b class="${lecture[0]}">${ch}</b><small>/100</small></div></div>
    <p class="hint">${esc(t.label)} · intensité ${['légère', 'normale', 'intense'][tr.intensity]}${aMatchCetteSemaine(G) ? ' · match en fin de semaine' : ' · pas de match cette semaine'}</p>
    <ol class="ep-jours">${pl.map(d => `<li class="${d.match ? 'm' : d.charge === 0 ? 'z' : ''}"><small>${d.jour}</small><span class="ep-bar"><i style="height:${Math.max(4, d.charge)}%"></i></span><em>${esc(d.nom)}</em></li>`).join('')}</ol>
    <p class="ep-lect ${lecture[0]}">${esc(lecture[1])}</p></section>`;
}
function blocEffet() {
  const H = G.progHist || [], tot = {};
  for (const h of H) for (const x of h.items) tot[x.k] = (tot[x.k] || 0) + x.d;
  const lab = k => ATTRS[k] || k;
  const top = Object.entries(tot).sort((a, b) => b[1] - a[1]);
  const keys = (TRAINING[G.training.focus] || {}).keys;
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy).map(p => ({ p, c: chanceProgres(G, p) })).filter(x => x.c > 0).sort((a, b) => b.c - a.c).slice(0, 6);
  const nb = H.reduce((a, h) => a + h.items.length, 0);
  return `<section class="card ep-effet"><h2>Effet des séances</h2>
    <p class="hint">${H.length ? `${nb} point${nb > 1 ? 's' : ''} d'attribut gagné${nb > 1 ? 's' : ''} sur les ${H.length} dernière${H.length > 1 ? 's' : ''} semaine${H.length > 1 ? 's' : ''}.` : 'Les progrès apparaîtront ici après la première semaine.'}
      ${keys?.length ? `Programme actuel : travaille surtout ${keys.map(lab).join(', ')}.` : keys ? 'Programme actuel : aucune progression (repos).' : 'Programme actuel : progression répartie selon le poste.'}</p>
    ${top.length ? `<div class="ep-gains">${top.map(([k, v]) => `<span><b>+${v}</b> ${esc(lab(k))}</span>`).join('')}</div>` : ''}
    ${sq.length ? `<h3>Les plus susceptibles de progresser cette semaine</h3><table class="tbl compact"><tbody>${sq.map(({ p, c }) => `<tr data-pid="${p.id}"><td class="nm">${esc(p.name)}</td><td>${p.age} ans</td><td>${bar(c * 100, 25)}</td><td><small>${c >= .12 ? 'forte' : c >= .06 ? 'moyenne' : 'faible'}</small></td></tr>`).join('')}</tbody></table>` : ''}</section>`;
}
function blocPhysique() {
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy).map(p => ({ p, r: risqueEntrainement(G, p) })).sort((a, b) => (b.r?.rel ?? -1) - (a.r?.rel ?? -1));
  const eleves = sq.filter(x => x.r?.niv[0] === 'élevé').length;
  return `<section class="card ep-phys"><h2>État physique et risque</h2>
    <p class="hint">${eleves ? `${eleves} joueur${eleves > 1 ? 's' : ''} à risque élevé cette semaine.` : 'Aucun joueur à risque élevé cette semaine.'} Le risque dépend de la charge, de la condition, de la fragilité, de l'âge, d'une blessure récente et de ton staff médical. Ménager un joueur réduit son risque et l'aide à récupérer, mais il ne progresse pas par les séances.</p>
    <div class="scroll"><table class="tbl compact ep-tbl"><thead><tr><th>Joueur</th><th>Cond.</th><th>Moral</th><th>Risque</th><th>Ménager</th></tr></thead><tbody>
    ${sq.map(({ p, r }) => `<tr data-pid="${p.id}" class="${available(p) ? '' : 'unav'}"><td class="nm">${esc(p.name)} <small class="muted">${esc(p.pos)}</small></td>
      <td>${bar(p.fit, 100, p.fit < 70 ? 'low' : '')} ${Math.round(p.fit)}%</td><td>${bar(p.morale, 100, 'mor')}</td>
      <td>${r ? `<span class="ep-risk ${r.niv[1]}" title="×${r.rel.toFixed(1)} par rapport à un joueur normal">${r.niv[0]}</span>` : `<small class="muted">blessé ${p.injury} j</small>`}</td>
      <td><button class="ep-men ${p.menage ? 'on' : ''}" data-men="${p.id}" aria-pressed="${!!p.menage}">${p.menage ? 'Ménagé' : 'Normal'}</button></td></tr>`).join('')}
    </tbody></table></div></section>`;
}
window.addEventListener('load', () => {
  if (typeof vTraining !== 'function') return;
  const __vTrainingEP = vTraining;
  vTraining = function (el) {
    const r = __vTrainingEP.apply(this, arguments);
    try {
      const cards = el.querySelectorAll(':scope > .grid2 > section.card');
      if (cards[1]) cards[1].outerHTML = blocPhysique();
      el.insertAdjacentHTML('afterbegin', blocPlanning());
      el.insertAdjacentHTML('beforeend', blocEffet());
      el.querySelectorAll('.ep-phys tr[data-pid], .ep-effet tr[data-pid]').forEach(tr => tr.onclick = e => { if (!e.target.closest('[data-men]')) playerModal(+tr.dataset.pid); });
      el.querySelectorAll('[data-men]').forEach(b => b.onclick = e => { e.stopPropagation(); const p = getPlayer(G, +b.dataset.men); p.menage = !p.menage || undefined; save(); vTraining(el); });
    } catch (e) { console.error(e); }
    return r;
  };
});
// directeur sportif : l'entraîneur décide des séances ; le planning et leurs effets restent consultables
window.addEventListener('load', () => {
  if (typeof vCoach !== 'function') return;
  const __vCoachEP = vCoach;
  vCoach = function (el) {
    const r = __vCoachEP.apply(this, arguments);
    try {
      if (!el.querySelector('.ep-plan')) {
        el.insertAdjacentHTML('beforeend', `<div class="grid2 ep-ds">${blocPlanning().replace('<h2>Semaine d\'entraînement</h2>', '<h2>Séances décidées par l\'entraîneur</h2>')}${blocEffet()}</div>`);
        el.querySelectorAll('.ep-effet tr[data-pid]').forEach(tr => tr.onclick = () => playerModal(+tr.dataset.pid));
      }
    } catch (e) { console.error(e); }
    return r;
  };
});
