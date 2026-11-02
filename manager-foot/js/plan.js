// ============================================================
//  Plan d'effectif sur trois saisons (lot 4)
//  Projection déterministe et documentée, calculée sur une copie légère :
//  elle ne touche ni la partie ni le générateur aléatoire.
// ============================================================
// Modèle de projection (hypothèse de planification, pas une prévision) :
// ≤ 21 ans : +3/an vers le potentiel estimé · 22-24 : +1,5 · 25-29 : 0 · 30-31 : -1 · ≥ 32 : -2,5/an
function projLevel(level, age, potEst) {
  const d = age <= 21 ? 3 : age <= 24 ? 1.5 : age <= 29 ? 0 : age <= 31 ? -1 : -2.5;
  return Math.round(potEst != null && d > 0 ? Math.min(potEst, level + d) : level + d);
}
const PLAN_LINES = { GB: ['GB'], DC: ['DC'], LAT: ['DG', 'DD'], MIL: ['MDC', 'MC', 'MOC'], ATT: ['AG', 'AD', 'BU'] };
const PLAN_LABEL = { GB: 'Gardiens', DC: 'Défense centrale', LAT: 'Latéraux', MIL: 'Milieux', ATT: 'Attaque' };
const PLAN_NEED = { GB: 2, DC: 4, LAT: 4, MIL: 6, ATT: 5 };
function planBase(G) {
  const rows = [];
  for (const p of G.players) {
    const own = p.club === G.clubId || p.loan?.from === G.clubId;
    if (!own) continue;
    const k = knowOf(G, p);
    rows.push({ id: p.id, name: p.name, pos: p.pos, age: p.age, level: playerOvr(p), pot: p.pot, contract: p.academy ? 0 : p.contract, wage: p.wage, status: p.status || 'rot',
      academy: !!p.academy, loanOut: p.loan?.from === G.clubId && p.club !== G.clubId, loanIn: !!p.loan?.inLoan, promised: !!p.statusPromised, mins: p.stats.min || 0, real: !!k });
  }
  return rows;
}
// applique des scénarios à la copie : aucune écriture dans G
function applyScenario(rows, sc, G) {
  let r = rows.map(x => ({ ...x }));
  for (const a of sc) {
    if (a.type === 'extend') { const x = r.find(y => y.id === a.id); if (x) { x.contract += a.yrs; x.wage = Math.round(x.wage * 1.1); x.tag = 'prolongé'; } }
    if (a.type === 'sell') r = r.filter(y => y.id !== a.id);
    if (a.type === 'promote') { const x = r.find(y => y.id === a.id); if (x) { x.academy = false; x.contract = 3; x.wage = Math.max(x.wage, 1500); x.tag = 'promu'; } }
    if (a.type === 'loanIn' || a.type === 'buy') r.push({ id: 'virt' + r.length, name: `${a.type === 'loanIn' ? 'Prêt' : 'Recrue'} ${a.pos} (hypothèse)`, pos: a.pos, age: a.age, level: a.level, pot: a.level + 2, contract: a.type === 'loanIn' ? 1 : 4, wage: weekly(a.wageM), status: 'first', virtual: true, tag: 'hypothèse' });
  }
  return r;
}
function planProject(rows, G) {
  const out = [];
  for (let y = 0; y < 3; y++) {
    const season = G.season + y;
    const inSquad = rows.filter(x => !x.loanOut || y >= 1).filter(x => x.academy || x.contract > y).map(x => ({ ...x, ageY: x.age + y, levelY: Array.from({ length: y }).reduce((l, _, i) => projLevel(l, x.age + i, x.pot), x.level) }));
    const lines = {};
    for (const [k, poss] of Object.entries(PLAN_LINES)) {
      const ps = inSquad.filter(x => poss.includes(x.pos) && !x.academy).sort((a, b) => b.levelY - a.levelY);
      const youth = inSquad.filter(x => poss.includes(x.pos) && x.academy).sort((a, b) => b.levelY - a.levelY);
      lines[k] = { ps, youth, top: ps.slice(0, PLAN_NEED[k]), n: ps.length, avg: ps.length ? Math.round(ps.slice(0, PLAN_NEED[k]).reduce((s, x) => s + x.levelY, 0) / Math.min(PLAN_NEED[k], ps.length)) : 0 };
    }
    const wages = inSquad.filter(x => !x.academy).reduce((s, x) => s + monthly(x.wage) * 12, 0);
    out.push({ y, season, lines, wages, n: inSquad.filter(x => !x.academy).length });
  }
  return out;
}
function planAlerts(proj, rows) {
  const al = [];
  for (const k of Object.keys(PLAN_LINES)) {
    const y0 = proj[0].lines[k], y1 = proj[1].lines[k], y2 = proj[2].lines[k];
    if (y1.n < PLAN_NEED[k]) al.push({ k, lvl: 'warn', txt: `${PLAN_LABEL[k]} : ${y1.n} joueur(s) sous contrat la saison prochaine pour ${PLAN_NEED[k]} nécessaires (fins de contrat).` });
    if (y2.avg && y0.avg && y2.avg < y0.avg - 4) al.push({ k, lvl: 'warn', txt: `${PLAN_LABEL[k]} : niveau projeté en baisse (${y0.avg} → ${y2.avg}) avec le vieillissement — préparer la succession.` });
    const best = y0.ps[0], second = y0.ps[1];
    if (best && (!second || best.levelY - second.levelY >= 8)) al.push({ k, lvl: 'dep', txt: `Dépendance : ${best.name} (${best.levelY}) n'a pas de remplaçant de niveau proche en ${PLAN_LABEL[k].toLowerCase()}.` });
    const old = y0.top.filter(x => x.ageY >= 32).length; if (old >= 2) al.push({ k, lvl: 'warn', txt: `${PLAN_LABEL[k]} : ${old} titulaires de 32 ans ou plus.` });
  }
  for (const x of rows.filter(r => r.promised && r.contract <= 1)) al.push({ k: 'x', lvl: 'warn', txt: `${x.name} a un statut promis et son contrat se termine : décision à prendre.` });
  return al;
}
let PLAN_SC = [];
function vPlan(el) {
  const base = planBase(G), rows = applyScenario(base, PLAN_SC, G), proj = planProject(rows, G), projBase = planProject(base, G), al = planAlerts(proj, rows);
  const cell = (x, y) => `<span class="pl ${x.virtual ? 'virt' : ''} ${x.contract <= y + 1 && !x.academy ? 'exp' : ''}" title="${esc(x.name)} — ${x.ageY} ans, niveau projeté ${x.levelY}, contrat jusqu'en juin ${G.season + x.contract}${x.tag ? ' · ' + x.tag : ''}">${esc(x.name.split(' ').slice(-1)[0])} <b>${x.levelY}</b><small>${x.ageY}a</small></span>`;
  el.innerHTML = `<section class="card"><h2>🗂 Plan d'effectif ${G.season}–${G.season + 3}</h2>
    <p class="hint">Projection de planification (hypothèse documentée : progression jusqu'au potentiel avant 24 ans, stabilité 25-29, déclin après 30). Elle n'est pas une prévision et ne modifie pas la partie. Rouge : dernière année de contrat.</p>
    <div class="scroll-x"><table class="tbl plan"><thead><tr><th>Ligne</th>${proj.map(p => `<th>${p.season}/${String(p.season + 1).slice(2)}</th>`).join('')}</tr></thead><tbody>
    ${Object.keys(PLAN_LINES).map(k => `<tr><td><b>${PLAN_LABEL[k]}</b><br><small>besoin ${PLAN_NEED[k]}</small></td>${proj.map((p, i) => { const L = p.lines[k], b = projBase[i].lines[k]; return `<td><div class="pls">${L.top.map(x => cell(x, p.y)).join('')}</div><small>${L.n} joueur(s) · niveau ${L.avg}${PLAN_SC.length && b.avg !== L.avg ? ` <b class="${L.avg > b.avg ? 'pos' : 'neg'}">(${L.avg > b.avg ? '+' : ''}${L.avg - b.avg})</b>` : ''}${L.youth.length ? ` · jeunes : ${L.youth.slice(0, 2).map(x => esc(x.name.split(' ').slice(-1)[0]) + ' ' + x.levelY).join(', ')}` : ''}</small></td>`; }).join('')}</tr>`).join('')}
    <tr><td><b>Masse salariale</b></td>${proj.map((p, i) => `<td>${money(p.wages)}/an${PLAN_SC.length ? ` <small>(${p.wages >= projBase[i].wages ? '+' : ''}${money(p.wages - projBase[i].wages)})</small>` : ''}<br><small>${p.n} joueurs sous contrat</small></td>`).join('')}</tr></tbody></table></div></section>
  <div class="grid2"><section class="card"><h2>⚠ Alertes</h2>${al.length ? al.map(a => `<p class="${a.lvl === 'dep' ? 'neg' : 'warn'}">${esc(a.txt)}</p>`).join('') : '<p class="pos">Aucune alerte de succession ou de dépendance.</p>'}</section>
    <section class="card"><h2>🧪 Scénarios (copie, sans effet sur la partie)</h2>
      <div class="row gap wrap"><select id="scT"><option value="extend">Prolonger (+2 ans)</option><option value="sell">Vendre / laisser partir</option><option value="promote">Promouvoir un jeune</option><option value="loanIn">Recruter en prêt</option><option value="buy">Acheter</option></select>
        <select id="scP">${base.filter(x => !x.loanOut).sort((a, b) => a.pos.localeCompare(b.pos)).map(x => `<option value="${x.id}">${x.pos} · ${esc(x.name)}${x.academy ? ' (centre)' : ''}</option>`).join('')}</select>
        <select id="scPos">${Object.keys(ROLES).map(r => `<option>${r}</option>`).join('')}</select><input id="scL" type="number" value="${Math.max(50, myClub(G).rep - 5)}" style="width:70px" title="niveau"><input id="scA" type="number" value="25" style="width:60px" title="âge"><input id="scW" type="number" step="5000" value="${monthly(wageBill(G) / Math.max(1, clubPlayers(G, G.clubId).length))}" style="width:100px" title="salaire €/mois">
        <button class="btn primary" id="scAdd">Ajouter</button><button class="btn" id="scClr">Réinitialiser</button></div>
      <ul>${PLAN_SC.map((a, i) => `<li>${esc({ extend: 'Prolonger', sell: 'Vendre', promote: 'Promouvoir', loanIn: 'Prêt', buy: 'Achat' }[a.type])} ${a.id ? esc(base.find(x => x.id === a.id)?.name || '') : `${a.pos} niveau ${a.level}, ${a.age} ans, ${money(a.wageM)}/mois`} <a href="#" data-rm="${i}">retirer</a></li>`).join('') || '<li class="muted">Aucune hypothèse.</li>'}</ul>
      <p class="hint">Les écarts entre parenthèses comparent le scénario à la situation actuelle.</p></section></div>`;
  $('#scAdd').onclick = () => {
    const t = $('#scT').value;
    if (['extend', 'sell', 'promote'].includes(t)) PLAN_SC.push({ type: t, id: +$('#scP').value, yrs: 2 });
    else PLAN_SC.push({ type: t, pos: $('#scPos').value, level: +$('#scL').value, age: +$('#scA').value, wageM: +$('#scW').value });
    vPlan(el);
  };
  $('#scClr').onclick = () => { PLAN_SC = []; vPlan(el); };
  el.querySelectorAll('[data-rm]').forEach(a => a.onclick = e => { e.preventDefault(); PLAN_SC.splice(+a.dataset.rm, 1); vPlan(el); });
}
const __applyRoleNavP = applyRoleNav;
applyRoleNav = function () {
  __applyRoleNavP();
  const g = NAV_GROUPS.find(x => x[0] === 'Effectif') || NAV_GROUPS.find(x => x[0] === 'Équipe');
  if (g && !g[1].some(x => x[0] === 'plan')) g[1].splice(1, 0, ['plan', '🗂', 'Plan d\'effectif']);
  NAV_FLAT.length = 0; NAV_FLAT.push(...NAV_GROUPS.flatMap(x => x[1]));
};
const __showP = show;
show = function (v) {
  if (v !== 'plan') return __showP(v);
  if (LIVE || G?.ds?.status === 'unemployed') return __showP('career');
  VIEW_HIST.push(VIEW); VIEW = 'plan';
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === 'plan'));
  renderTop(); const main = $('#main'); main.innerHTML = ''; vPlan(main); navBadges();
};
