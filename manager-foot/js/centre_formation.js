// ============================================================
//  Fin de formation des U19 et responsable du centre de formation
//  - Nouveau membre du staff : « Responsable du centre de formation » (marché, entente, carrière comme les autres).
//  - Six semaines avant la fin de saison, il présente les U19 en fin de formation (18 ans et plus) avec son avis pour
//    chacun : contrat pro (équipe première), contrat réserve, ou ne pas garder. Son avis est plus ou moins juste selon
//    son niveau (il estime le potentiel, il ne le connaît pas).
//  - Toi, directeur, tu décides : suivre ses recommandations, ou décider joueur par joueur dans Formation › U19.
//  - Sans décision à la fin de la saison, le joueur n'est pas conservé (il quitte le club, libre).
// ============================================================
if (typeof STAFF !== 'undefined' && !STAFF.academy) STAFF.academy = { label: 'Responsable du centre de formation', tip: 'Évalue les U19, recommande qui garder en fin de formation (pro, réserve ou départ).' };
if (typeof STAFF_SPEC !== 'undefined' && !STAFF_SPEC.academy) STAFF_SPEC.academy = ['Détection des talents', 'Formation mentale', 'Passage chez les pros', 'Gestion des contrats jeunes'];

function migrerCentre(G) {
  if (!G) return;
  G.staff ||= {}; G.staff.academy ??= 2;
  if (G.staffPeople && !G.staffPeople.academy && typeof newStaffPerson === 'function')
    G.staffPeople.academy = withSideRng(`${G.seed}|respcf`, () => newStaffPerson('academy', G.staff.academy));
}
const respCentre = G => G?.staffPeople?.academy || { name: 'le responsable du centre', lvl: G?.staff?.academy || 2 };
const finFormation = (G, p) => p.club === G.clubId && p.academy && p.age >= 18;
const CHOIX_FIN = { pro: 'Contrat pro (équipe première)', res: 'Contrat réserve', non: 'Ne pas garder' };

// avis du responsable : potentiel estimé avec une marge d'erreur qui dépend de son niveau
function avisCentre(G, p) {
  const r = respCentre(G), err = (6 - (r.lvl || 2)) * 3;
  const biais = ((typeof hashPot === 'function' ? hashPot(`avis|${p.id}|${r.name}`) : .5) * 2 - 1) * err;
  const est = Math.round(p.pot + biais);
  const A = (typeof effectifPro === 'function' ? effectifPro(G) : clubPlayers(G, G.clubId)).map(playerOvr).sort((a, b) => b - a).slice(0, 16);
  const niveau = A.length ? A.reduce((a, b) => a + b, 0) / A.length : 65;
  const choix = est >= niveau - 2 ? 'pro' : est >= niveau - 12 ? 'res' : 'non';
  const pourquoi = choix === 'pro' ? `potentiel estimé ${est}, au niveau de l'équipe première (${Math.round(niveau)})`
    : choix === 'res' ? `potentiel estimé ${est} : à faire progresser en réserve`
    : `potentiel estimé ${est}, loin du niveau de l'équipe (${Math.round(niveau)})`;
  return { choix, est, pourquoi };
}
function contratsFin(G, p, choix) {
  const me = myClub(G), d = typeof demandWage === 'function' ? demandWage(G, p, me) : p.wage;
  if (choix === 'pro') { p.academy = false; p.reserve = false; p.wage = Math.max(p.wage || 0, roundMoney(d * .7)); p.contract = 3; p.status ||= 'youth'; }
  else if (choix === 'res') { p.academy = false; p.reserve = true; p.wage = Math.max(p.wage || 0, roundMoney(d * .4)); p.contract = 2; }
  p.joinedSeason ??= G.season;
}

// ---------- question six semaines avant la fin ----------
function questionFinFormation(G) {
  migrerCentre(G);
  if (!G.schedule || G.week !== G.schedule.length - 6 || G.finFormationPosee === G.season) return;
  const cands = G.players.filter(p => finFormation(G, p));
  if (!cands.length) return;
  G.finFormationPosee = G.season;
  const r = respCentre(G);
  const lignes = cands.map(p => { const a = avisCentre(G, p); p.avisFin = a.choix; return `${p.name} (${p.pos}, ${p.age} ans) : ${CHOIX_FIN[a.choix].toLowerCase()} — ${a.pourquoi}`; });
  addDecision(G, { key: 'u19fin:' + G.season, kind: 'u19fin', blocking: false, from: r.name, icon: '🎓',
    title: `Fin de formation : ${cands.length} U19 à décider`,
    html: `<p>${esc(r.name)} (responsable du centre de formation, ${'★'.repeat(r.lvl || 2)}) a évalué les U19 qui terminent leur formation. Sans décision de ta part avant la fin de la saison, ils ne sont pas conservés.</p><ul>${lignes.map(l => `<li>${esc(l)}</li>`).join('')}</ul><p class="hint">Son avis repose sur une estimation du potentiel : un responsable mieux noté se trompe moins.</p>`,
    text: '' });
}
if (typeof DECISION_OPTS !== 'undefined') DECISION_OPTS.u19fin = d => [['suivre', `Suivre les recommandations de ${respCentre(G).name}`, 'primary'], ['ecran', 'Décider joueur par joueur (Formation › U19)'], ['aucun', 'Ne garder aucun de ces joueurs', 'danger']];
window.addEventListener('load', () => {
  const __decideCF = decide;
  decide = function (id, opt) {
    const d = G.decisions.find(x => x.id === id);
    if (!d || d.done || d.kind !== 'u19fin') return __decideCF.apply(this, arguments);
    const cands = G.players.filter(p => finFormation(G, p));
    let msg;
    if (opt === 'suivre') { for (const p of cands) p.choixFin = p.avisFin || avisCentre(G, p).choix; msg = `Recommandations suivies : ${cands.filter(p => p.choixFin === 'pro').length} contrat(s) pro, ${cands.filter(p => p.choixFin === 'res').length} en réserve, ${cands.filter(p => p.choixFin === 'non').length} départ(s) en fin de saison.`; }
    else if (opt === 'aucun') { for (const p of cands) p.choixFin = 'non'; msg = 'Aucun de ces U19 ne sera conservé.'; }
    else { msg = 'Décide pour chaque joueur dans Formation › U19 (colonne « Fin de formation »).'; }
    d.done = opt; d.answer = msg; save(); toast(msg);
    if (!$('#top')) return;
    if (opt === 'ecran') { YOUTH_TAB = 'U19'; show('youth'); } else if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop();
  };
  // ---------- Formation › U19 : choix joueur par joueur ----------
  if (typeof vYouth === 'function') {
    const __vYouthCF = vYouth;
    vYouth = function (el) {
      migrerCentre(G);
      const r = __vYouthCF.apply(this, arguments);
      try {
        if (YOUTH_TAB !== 'U19' && YOUTH_TAB !== 'U17') return r;
        const resp = respCentre(G);
        el.querySelector('.card h2')?.insertAdjacentHTML('afterend', `<p class="hint cf-resp">Responsable du centre de formation : <b>${esc(resp.name)}</b> ${'★'.repeat(resp.lvl || 2)}${'☆'.repeat(5 - (resp.lvl || 2))}. Les U19 de 18 ans et plus terminent leur formation : choisis contrat pro, contrat réserve ou départ avant la fin de saison (sans choix : non conservé).</p>`);
        el.querySelectorAll('tr[data-pid]').forEach(tr => {
          const p = getPlayer(G, +tr.dataset.pid); if (!p || !finFormation(G, p)) return;
          const a = avisCentre(G, p);
          tr.lastElementChild.insertAdjacentHTML('beforebegin', `<td class="cf-fin"><select data-fin="${p.id}" aria-label="Fin de formation de ${esc(p.name)}"><option value="">— À décider —</option>${Object.entries(CHOIX_FIN).map(([k, l]) => `<option value="${k}" ${p.choixFin === k ? 'selected' : ''}>${l}</option>`).join('')}</select><small>Avis : ${CHOIX_FIN[a.choix].toLowerCase()}</small></td>`);
        });
        const th = el.querySelector('thead tr'); if (th && el.querySelector('.cf-fin')) th.lastElementChild.insertAdjacentHTML('beforebegin', '<th>Fin de formation</th>');
        el.querySelectorAll('tbody tr[data-pid]').forEach(tr => { if (el.querySelector('.cf-fin') && !tr.querySelector('.cf-fin')) tr.lastElementChild.insertAdjacentHTML('beforebegin', '<td></td>'); });
        el.querySelectorAll('[data-fin]').forEach(s => s.onchange = () => { getPlayer(G, +s.dataset.fin).choixFin = s.value || undefined; save(); toast(s.value ? `${getPlayer(G, +s.dataset.fin).name} : ${CHOIX_FIN[s.value].toLowerCase()}.` : 'Décision retirée.'); });
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateCF = weeklyUpdate;
  weeklyUpdate = function (G) { const r = __weeklyUpdateCF.apply(this, arguments); try { questionFinFormation(G); } catch (e) { console.error(e); } return r; };
}
// ---------- fin de saison : contrats ou départ ----------
if (typeof endSeason === 'function') {
  const __endSeasonCF = endSeason;
  endSeason = function (G) {
    try {
      migrerCentre(G);
      const pro = [], res = [], partis = [];
      for (const p of G.players.filter(x => finFormation(G, x))) {
        const c = p.choixFin;
        if (c === 'pro' || c === 'res') { contratsFin(G, p, c); (c === 'pro' ? pro : res).push(p.name); }
        else { p.club = null; p.academy = false; p.contract = 0; partis.push(p.name); if (typeof removeFromTactics === 'function') removeFromTactics(p.id); }
        delete p.choixFin; delete p.avisFin;
      }
      if (pro.length + res.length + partis.length) news(G, `🎓 Fin de formation : ${pro.length ? `contrat pro pour ${pro.join(', ')}. ` : ''}${res.length ? `Contrat réserve pour ${res.join(', ')}. ` : ''}${partis.length ? `Non conservés : ${partis.join(', ')}.` : ''}`, 'youth');
    } catch (e) { console.error(e); }
    return __endSeasonCF.apply(this, arguments);
  };
}
// anciennes parties : le responsable est créé au chargement (avant tout affichage du staff)
if (typeof loadGame === 'function') {
  const __loadGameCF = loadGame;
  loadGame = function (g) { const r = __loadGameCF.apply(this, arguments); try { migrerCentre(G || g); } catch (e) { console.error(e); } return r; };
}
if (typeof newGame === 'function') {
  const __newGameCF = newGame;
  newGame = function () { const g = __newGameCF.apply(this, arguments); try { const prev = G; G = g; try { migrateGestion?.(g); migrerCentre(g); } finally { G = prev; } } catch (e) { console.error(e); } return g; };
}
