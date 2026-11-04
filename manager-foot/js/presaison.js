// ============================================================
//  Présaison planifiée (comme FM)
//  En début de saison, une question « Préparer la présaison » : un stage et jusqu'à 3 matchs amicaux.
//  - Stage au centre (gratuit, cohésion +3), en altitude (coût, cohésion +5, condition entretenue sur les 6
//    premières semaines), à l'étranger (coût, cohésion +9, familiarité tactique +4), tournée commerciale (recette,
//    cohésion +2, joueurs fatigués au départ).
//  - Amicaux contre un adversaire faible, moyen ou fort : familiarité tactique avec le dispositif actuel, recette au
//    guichet, un peu de fatigue ; le résultat compte pour le moral (surtout face à un gros).
//  « Laisser l'adjoint » : stage au centre et deux amicaux (faible, moyen). Tirages à part (withSideRng).
// ============================================================
const STAGES = {
  maison: { label: 'Stage au centre d\'entraînement', aide: 'Gratuit. Cohésion +3.', coh: 3, fam: 0, cout: () => 0, recette: () => 0, fit: 0 },
  montagne: { label: 'Stage en altitude', aide: 'Cohésion +5. Condition entretenue sur les 6 premières semaines.', coh: 5, fam: 0, cout: c => roundMoney(c.rep * 9000), recette: () => 0, fit: 0, altitude: true },
  etranger: { label: 'Stage à l\'étranger', aide: 'Cohésion +9, familiarité tactique +4 : le groupe vit ensemble.', coh: 9, fam: 4, cout: c => roundMoney(c.rep * 14000), recette: () => 0, fit: 0 },
  tournee: { label: 'Tournée commerciale (Asie, États-Unis)', aide: 'Grosse recette, cohésion +2, mais joueurs fatigués au départ.', coh: 2, fam: 0, cout: () => 0, recette: c => roundMoney(Math.pow(c.rep, 2) * 450), fit: -12 }
};
const NIVEAUX_AMICAL = { faible: ['Adversaire faible', -14, 2, 40000], moyen: ['Adversaire moyen', -4, 3, 120000], fort: ['Grand club', 7, 3, 350000] };
const PLAN_ADJOINT = { stage: 'maison', amicaux: ['faible', 'moyen', ''] };
function bilanPresaison(c, plan) {
  const S = STAGES[plan.stage] || STAGES.maison, am = plan.amicaux.filter(Boolean);
  const fam = S.fam + am.reduce((a, k) => a + NIVEAUX_AMICAL[k][2], 0);
  const argent = S.recette(c) - S.cout(c) + am.reduce((a, k) => a + roundMoney(NIVEAUX_AMICAL[k][3] * (k === 'fort' ? 1 : (c.rep / 70))), 0);
  return { coh: S.coh + am.length, fam, argent, fatigue: S.fit - am.length * 3 };
}
function appliquerPresaison(G, plan) {
  const c = myClub(G), S = STAGES[plan.stage] || STAGES.maison, B = bilanPresaison(c, plan);
  c.coh = clamp((c.coh ?? 60) + B.coh, 0, 100);
  if (B.fam && typeof growTacFam === 'function') { G.tacFam ||= {}; G.tacFam[G.tactics.formation] = clamp((G.tacFam[G.tactics.formation] ?? 40) + B.fam, 0, 100); }
  if (B.argent) { FLOW_LABEL = 'Présaison'; flow(G, c, B.argent, B.argent > 0 ? 'other' : 'other'); FLOW_LABEL = null; }
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy);
  // amicaux : résultats et moral
  const res = withSideRng(`${G.seed}|presaison|${G.season}`, () => plan.amicaux.filter(Boolean).map(k => {
    const [, ecart] = NIVEAUX_AMICAL[k], moi = typeof clubPower === 'function' ? clubPower(G, G.clubId) : 65;
    const pool = G.clubs.filter(x => x.id !== G.clubId && Math.abs((x.rep ?? 50) - (c.rep + ecart)) <= 6);
    const adv = pool.length ? pick(pool) : null, sc = quickScore(moi, moi + ecart * .8, true).s;
    return { k, nom: adv?.name || NIVEAUX_AMICAL[k][0], sc };
  }));
  let moral = 0;
  for (const r of res) moral += r.sc[0] > r.sc[1] ? (r.k === 'fort' ? 3 : 1) : r.sc[0] < r.sc[1] ? (r.k === 'faible' ? -3 : -1) : 0;
  for (const p of sq) { p.fit = clamp(p.fit + B.fatigue, 40, 100); p.morale = clamp(p.morale + moral, 5, 100); }
  G.presaison = { s: G.season, plan, altitude: !!S.altitude, res };
  const txt = `${S.label}${res.length ? ` · amicaux : ${res.map(r => `${c.name} ${r.sc[0]}-${r.sc[1]} ${r.nom}`).join(', ')}` : ''}. Cohésion +${B.coh}, familiarité tactique +${B.fam}, ${B.argent >= 0 ? 'recette' : 'coût'} ${money(Math.abs(B.argent))}.`;
  news(G, `☀ Présaison : ${txt}`, 'info', true);
  return txt;
}
// altitude : condition entretenue sur les 6 premières semaines
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdatePS = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdatePS.apply(this, arguments);
    if (full && G.presaison?.altitude && G.presaison.s === G.season && G.week < 6) for (const p of clubPlayers(G, G.clubId)) p.fit = clamp(p.fit + 3, 0, 100);
    return r;
  };
}
// ---------- question de début de saison ----------
function demanderPresaison(G) {
  if (G.clubId == null || G.presaison?.s === G.season || (G.decisions || []).some(d => d.kind === 'presaison' && !d.done)) return;
  addDecision(G, { key: 'presaison:' + G.season, kind: 'presaison', from: 'Adjoint', icon: '☀', blocking: true,
    title: `Préparer la présaison ${G.season}/${String(G.season + 1).slice(2)}`,
    text: 'Choisis un stage et jusqu\'à trois matchs amicaux avant la reprise. Cohésion, familiarité tactique, condition et finances en dépendent.' });
}
DECISION_OPTS.presaison = d => [['plan', 'Planifier la présaison', 'primary'], ['adjoint', 'Laisser l\'adjoint organiser']];
if (typeof AUTO_POLICY !== 'undefined') AUTO_POLICY.presaison = 'adjoint';
window.addEventListener('load', () => {
  const __decidePS = decide;
  decide = function (id, opt) {
    const d = G.decisions.find(x => x.id === id);
    if (!d || d.done || d.kind !== 'presaison') return __decidePS.apply(this, arguments);
    if (opt === 'adjoint') { const t = appliquerPresaison(G, PLAN_ADJOINT); d.done = opt; d.answer = `L'adjoint a organisé : ${t}`; save(); if ($('#top')) { toast('Présaison organisée par ton adjoint.'); if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); } return; }
    if (!$('#top')) { decide(id, 'adjoint'); return; }
    fenetrePresaison(d);
  };
  if (typeof newGame === 'function') { const __newGamePS = newGame; newGame = function () { const g = __newGamePS.apply(this, arguments); try { demanderPresaison(g); } catch (e) { console.error(e); } return g; }; }
  if (typeof endSeason === 'function') { const __endSeasonPS = endSeason; endSeason = function (G) { const S = __endSeasonPS.apply(this, arguments); try { demanderPresaison(G); } catch (e) { console.error(e); } return S; }; }
  if (typeof G !== 'undefined' && G && G.week === 0) try { demanderPresaison(G); } catch (e) { console.error(e); }
});
function fenetrePresaison(d) {
  const c = myClub(G), plan = { stage: 'maison', amicaux: ['faible', 'moyen', ''] };
  const rendre = () => {
    const B = bilanPresaison(c, plan);
    modal(`<h2>Présaison ${G.season}/${String(G.season + 1).slice(2)}</h2>
      <h3>Stage</h3><div class="ps-stages">${Object.entries(STAGES).map(([k, s]) => `<button class="ps-st ${plan.stage === k ? 'on' : ''}" data-st="${k}" aria-pressed="${plan.stage === k}"><b>${s.label}</b><small>${s.aide}</small><em>${s.cout(c) ? `Coût ${money(s.cout(c))}` : s.recette(c) ? `Recette ${money(s.recette(c))}` : 'Gratuit'}</em></button>`).join('')}</div>
      <h3>Matchs amicaux</h3><div class="ps-am">${plan.amicaux.map((v, i) => `<label>Amical ${i + 1}<select data-am="${i}"><option value="">— Aucun —</option>${Object.entries(NIVEAUX_AMICAL).map(([k, n]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${n[0]}</option>`).join('')}</select></label>`).join('')}</div>
      <p class="hint">Faible : on travaille les automatismes et on gagne en confiance. Grand club : belle recette, test sérieux… et moral en jeu.</p>
      <div class="ps-bilan"><div><small>Cohésion</small><b>+${B.coh}</b></div><div><small>Familiarité tactique (${esc(G.tactics.formation)})</small><b>+${B.fam}</b></div><div><small>Condition au départ</small><b class="${B.fatigue < -6 ? 'neg' : ''}">${B.fatigue}</b></div><div><small>Finances</small><b class="${B.argent >= 0 ? 'pos' : 'neg'}">${B.argent >= 0 ? '+' : '−'}${money(Math.abs(B.argent))}</b></div></div>
      <div class="row gap mt"><div class="grow"></div><button class="btn" id="psAdj">Laisser l'adjoint</button><button class="btn primary" id="psOk">Valider la présaison</button></div>`, 'wide');
    $$('[data-st]').forEach(b => b.onclick = () => { plan.stage = b.dataset.st; rendre(); });
    $$('[data-am]').forEach(s => s.onchange = () => { plan.amicaux[+s.dataset.am] = s.value; rendre(); });
    $('#psAdj').onclick = () => { closeModal(); decide(d.id, 'adjoint'); };
    $('#psOk').onclick = () => { const t = appliquerPresaison(G, plan); d.done = 'plan'; d.answer = t; save(); closeModal(); toast('Présaison validée.'); if (VIEW === 'mail') show('mail'); else renderTop(); };
  };
  rendre();
}
