// ============================================================
//  Centre de données (« Data Hub » façon FM)
//  - Joueurs : percentiles d'un joueur face aux joueurs de son championnat au même groupe de postes (gardiens,
//    défenseurs, milieux, attaquants), statistiques ramenées à 90 minutes (270 minutes jouées au moins).
//    Tableau de l'effectif avec les indicateurs clés.
//  - Équipe : rang de ton équipe dans le championnat sur les buts, xG, buts encaissés, xG contre, différence,
//    points ; forme des 10 derniers matchs.
//  - Prochain adversaire : rang, forme, style, joueurs dangereux, forces et faiblesses comparées à la moyenne du
//    championnat, avec les conseils qui en découlent (consignes adverses, coups de pied arrêtés).
//  Lecture seule : aucun tirage, aucune modification de la partie.
// ============================================================
const GROUPE_POSTE = { GB: 'gb', DC: 'def', DG: 'def', DD: 'def', MDC: 'mil', MC: 'mil', MOC: 'mil', AG: 'att', AD: 'att', BU: 'att' };
const NOM_GROUPE = { gb: 'gardiens', def: 'défenseurs', mil: 'milieux', att: 'attaquants' };
const MIN_MINUTES = 270;
const p90 = (S, k) => (S[k] || 0) / Math.max(1, S.min || 0) * 90;
const METRIQUES = {
  att: [['Buts', S => p90(S, 'goals')], ['xG', S => p90(S, 'xg')], ['Tirs', S => p90(S, 'sh')], ['Passes décisives', S => p90(S, 'assists')], ['Passes clés', S => p90(S, 'kp')], ['Dribbles réussis', S => p90(S, 'dri')], ['Menace créée (xT)', S => p90(S, 'xt')], ['Note moyenne', S => S.apps ? S.rating / S.apps : 0]],
  mil: [['Passes', S => p90(S, 'pas')], ['Passes réussies %', S => S.pas ? S.pasOk / S.pas * 100 : 0], ['Passes clés', S => p90(S, 'kp')], ['Menace créée (xT)', S => p90(S, 'xt')], ['Dribbles réussis', S => p90(S, 'dri')], ['Tacles + interceptions', S => p90(S, 'tkl') + p90(S, 'int')], ['xG', S => p90(S, 'xg')], ['Note moyenne', S => S.apps ? S.rating / S.apps : 0]],
  def: [['Tacles', S => p90(S, 'tkl')], ['Interceptions', S => p90(S, 'int')], ['Passes', S => p90(S, 'pas')], ['Passes réussies %', S => S.pas ? S.pasOk / S.pas * 100 : 0], ['Menace créée (xT)', S => p90(S, 'xt')], ['Passes clés', S => p90(S, 'kp')], ['Note moyenne', S => S.apps ? S.rating / S.apps : 0]],
  gb: [['Arrêts', S => p90(S, 'sav')], ['Passes', S => p90(S, 'pas')], ['Passes réussies %', S => S.pas ? S.pasOk / S.pas * 100 : 0], ['Note moyenne', S => S.apps ? S.rating / S.apps : 0]]
};
let DH_TAB = 'joueurs', DH_PID = null;
function clubsDeLigue(G, clubId) { const L = clubLeague(G, clubId); return L ? standings(G, L.id).map(r => r.id) : [clubId]; }
function echantillon(G, p) {
  const ids = new Set(clubsDeLigue(G, p.club ?? G.clubId)), g = GROUPE_POSTE[p.pos];
  return G.players.filter(q => ids.has(q.club) && GROUPE_POSTE[q.pos] === g && (q.stats?.min || 0) >= MIN_MINUTES);
}
function percentile(vals, v) { if (!vals.length) return null; let n = 0; for (const x of vals) if (x < v) n++; else if (x === v) n += .5; return Math.round(n / vals.length * 100); }
function profilPercentiles(G, p) {
  const g = GROUPE_POSTE[p.pos], E = echantillon(G, p), S = p.stats || {};
  return { g, n: E.length, assez: (S.min || 0) >= MIN_MINUTES, rows: METRIQUES[g].map(([lab, f]) => { const v = f(S); return { lab, v, pct: percentile(E.map(q => f(q.stats)), v) }; }) };
}
const fmtV = v => { const t = (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)).replace('.', ','); return /^-0(,0+)?$/.test(t) ? t.slice(1) : t; };
const tier = pct => pct >= 81 ? 'top' : pct >= 61 ? 'bon' : pct >= 41 ? 'moy' : pct >= 21 ? 'bas' : 'faible';
function blocPercentiles(G, p) {
  const P = profilPercentiles(G, p);
  if (!P.assez) return `<p class="muted">${esc(p.name)} n'a pas encore assez joué (${p.stats?.min || 0} min sur ${MIN_MINUTES} nécessaires).</p>`;
  return `<p class="hint">Comparé à ${P.n} ${NOM_GROUPE[P.g]} de son championnat (au moins ${MIN_MINUTES} minutes), par 90 minutes. Percentile 80 = meilleur que 80 % d'entre eux.</p>
    <ul class="dh-pct">${P.rows.map(r => `<li><span class="dh-lab">${esc(r.lab)}</span><span class="dh-bar"><i class="t-${tier(r.pct ?? 0)}" style="width:${Math.max(2, r.pct ?? 0)}%"></i></span><b>${r.pct ?? '—'}</b><small>${fmtV(r.v)}</small></li>`).join('')}</ul>
    <p class="dh-leg"><span><i class="t-top"></i>81-100</span><span><i class="t-bon"></i>61-80</span><span><i class="t-moy"></i>41-60</span><span><i class="t-bas"></i>21-40</span><span><i class="t-faible"></i>0-20</span></p>`;
}
function ongletJoueurs(G) {
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy).sort((a, b) => (b.stats?.min || 0) - (a.stats?.min || 0));
  DH_PID ??= sq[0]?.id;
  const p = getPlayer(G, DH_PID) || sq[0];
  const autres = G.players.filter(q => q.club != null && q.club !== G.clubId && (q.stats?.min || 0) >= MIN_MINUTES && knows(G, q) && clubsDeLigue(G, G.clubId).includes(q.club)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 200);
  const k90 = (S, k) => S.min ? fmtV(p90(S, k)) : '—';
  return `<div class="grid2 dh-g"><section class="card"><div class="dh-head"><h2>Percentiles</h2>
      <select id="dhP" aria-label="Joueur"><optgroup label="Mon effectif">${sq.map(q => `<option value="${q.id}" ${q.id === p?.id ? 'selected' : ''}>${esc(q.name)} (${q.pos})</option>`).join('')}</optgroup>${autres.length ? `<optgroup label="Championnat (joueurs connus)">${autres.map(q => `<option value="${q.id}" ${q.id === p?.id ? 'selected' : ''}>${esc(q.name)} (${q.pos}, ${esc(getClub(G, q.club)?.name || '')})</option>`).join('')}</optgroup>` : ''}</select></div>
      ${p ? `<p class="dh-qui"><b>${esc(p.name)}</b> · ${p.pos} · ${p.stats?.apps || 0} matchs · ${p.stats?.min || 0} min</p>${blocPercentiles(G, p)}` : ''}</section>
    <section class="card"><h2>Effectif : indicateurs par 90 minutes</h2><div class="tbl-wrap"><table class="tbl compact triable dh-tbl"><thead><tr><th>Joueur</th><th>Min</th><th>Note</th><th>Buts</th><th>xG</th><th>Passes clés</th><th>xT</th><th>Passes %</th><th>Tacles + int.</th></tr></thead><tbody>
      ${sq.filter(q => q.stats?.min).map(q => { const S = q.stats; return `<tr data-dhp="${q.id}" class="${q.id === p?.id ? 'sel' : ''}"><td class="nm">${esc(q.name)} <small class="muted">${q.pos}</small></td><td>${S.min}</td><td>${S.apps ? (S.rating / S.apps).toFixed(2).replace('.', ',') : '—'}</td><td>${k90(S, 'goals')}</td><td>${k90(S, 'xg')}</td><td>${k90(S, 'kp')}</td><td>${k90(S, 'xt')}</td><td>${S.pas ? Math.round(S.pasOk / S.pas * 100) : '—'}</td><td>${S.min ? fmtV(p90(S, 'tkl') + p90(S, 'int')) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="9" class="muted">Aucun match joué pour l\'instant.</td></tr>'}
    </tbody></table></div><p class="hint">Clique une ligne pour voir ses percentiles.</p></section></div>`;
}
// ---------- équipe ----------
function statsEquipes(G, ids) {
  const T = Object.fromEntries(ids.map(id => [id, { id, j: 0, bp: 0, bc: 0, xgp: 0, xgc: 0, pts: 0, forme: [] }]));
  const L = clubLeague(G, G.clubId);
  for (const round of L?.fixtures || []) for (const f of round) {
    if (!f.res || !T[f.h] || !T[f.a]) continue;
    const add = (id, bp, bc, xp, xc) => { const t = T[id]; t.j++; t.bp += bp; t.bc += bc; t.xgp += xp || 0; t.xgc += xc || 0; const pt = bp > bc ? 3 : bp === bc ? 1 : 0; t.pts += pt; t.forme.push({ pt, xd: (xp || 0) - (xc || 0) }); };
    add(f.h, f.res[0], f.res[1], f.xg?.[0], f.xg?.[1]); add(f.a, f.res[1], f.res[0], f.xg?.[1], f.xg?.[0]);
  }
  return Object.values(T);
}
const CRITERES_EQ = [['Points par match', t => t.pts / t.j, 1], ['Buts marqués / match', t => t.bp / t.j, 1], ['xG pour / match', t => t.xgp / t.j, 1], ['Buts encaissés / match', t => t.bc / t.j, -1], ['xG contre / match', t => t.xgc / t.j, -1], ['Différence de xG / match', t => (t.xgp - t.xgc) / t.j, 1], ['Réalisme (buts − xG)', t => (t.bp - t.xgp) / t.j, 1]];
function rangs(G, clubId) {
  const E = statsEquipes(G, clubsDeLigue(G, clubId)).filter(t => t.j > 0), me = E.find(t => t.id === clubId);
  if (!me) return null;
  return { n: E.length, me, rows: CRITERES_EQ.map(([lab, f, sens]) => { const v = f(me), moy = E.reduce((a, t) => a + f(t), 0) / E.length; const rang = E.filter(t => sens > 0 ? f(t) > v : f(t) < v).length + 1; return { lab, v, moy, rang, sens }; }) };
}
function blocRangs(G, clubId, titre) {
  const R = rangs(G, clubId);
  if (!R) return `<p class="muted">Pas encore de match de championnat joué.</p>`;
  return `<table class="tbl compact dh-rangs"><thead><tr><th>${esc(titre)}</th><th>Valeur</th><th>Moyenne</th><th>Rang</th></tr></thead><tbody>${R.rows.map(r => `<tr><td>${r.lab}</td><td><b>${fmtV(r.v)}</b></td><td class="muted">${fmtV(r.moy)}</td><td><span class="dh-rang ${r.rang <= Math.ceil(R.n / 4) ? 'haut' : r.rang > R.n - Math.ceil(R.n / 4) ? 'bas' : ''}">${r.rang}<small>/${R.n}</small></span></td></tr>`).join('')}</tbody></table>`;
}
function ongletEquipe(G) {
  const R = rangs(G, G.clubId), F = R ? R.me.forme.slice(-10) : [];
  const max = Math.max(.5, ...F.map(x => Math.abs(x.xd)));
  return `<div class="grid2 dh-g"><section class="card"><h2>${esc(myClub(G).name)} dans son championnat</h2>${blocRangs(G, G.clubId, 'Indicateur')}
      <p class="hint">Rang dans le quart supérieur en vert, quart inférieur en rouge. Un réalisme très positif finit souvent par redescendre.</p></section>
    <section class="card"><h2>Forme : 10 derniers matchs de championnat</h2>${F.length ? `<div class="dh-forme" role="img" aria-label="Différence de xG par match">${F.map((x, i) => `<div class="dh-fm" title="Différence de xG : ${fmtV(x.xd)}"><div class="dh-hp">${x.xd >= 0 ? `<span class="dh-fb p" style="height:${Math.round(x.xd / max * 100)}%"></span>` : ''}</div><div class="dh-hn">${x.xd < 0 ? `<span class="dh-fb n" style="height:${Math.round(-x.xd / max * 100)}%"></span>` : ''}</div><em class="r${x.pt}">${x.pt === 3 ? 'V' : x.pt === 1 ? 'N' : 'D'}</em></div>`).join('')}</div>
      <p class="hint">Barres : différence de xG du match (au-dessus de l'axe, tu as créé plus que l'adversaire ; en dessous, moins). Lettre : résultat.</p>` : '<p class="muted">Pas encore de match.</p>'}</section></div>`;
}
// ---------- prochain adversaire ----------
function ongletAdversaire(G) {
  let f = null, w;
  for (w = G.week; w < G.schedule.length && !f; w++) f = weekFixtures(G, w).find(x => x.h === G.clubId || x.a === G.clubId);
  if (!f) return '<section class="card"><p class="muted">Pas de prochain match connu.</p></section>';
  const opp = getClub(G, f.h === G.clubId ? f.a : f.h), memeLigue = clubsDeLigue(G, G.clubId).includes(opp.id);
  const { ot, sO, sM } = withSideRng(`${G.seed}|dh|${opp.id}|${G.week}`, () => { const ot = aiTactics(G, opp.id, G.clubId); return { ot, sO: teamStrength(G, makeSide(G, opp.id, ot)), sM: teamStrength(G, makeSide(G, G.clubId, G.tactics)) }; });
  const dang = clubPlayers(G, opp.id).filter(p => !p.academy && (p.stats?.min || 0) > 0).sort((a, b) => (p90(b.stats, 'xg') + p90(b.stats, 'kp') * .3) - (p90(a.stats, 'xg') + p90(a.stats, 'kp') * .3)).slice(0, 4);
  const conseils = [];
  if (sO.def < sM.att - 3) conseils.push('Leur défense est en dessous de ton attaque : mentalité offensive et tempo rapide pour les faire céder.');
  if (sO.att > sM.def + 3) conseils.push('Leur attaque est plus forte que ta défense : bloc plus bas, marquage serré sur leur meilleur buteur.');
  if (sO.mid > sM.mid + 3) conseils.push('Ils dominent au milieu : presse leur meneur (consignes adverses) et cherche le jeu direct.');
  if (ot.inst?.line > 0) conseils.push('Ligne défensive haute : des attaquants rapides dans leur dos peuvent les punir.');
  if (ot.inst?.press > 0) conseils.push('Ils pressent haut : passes courtes, ou ballons longs pour sauter leur pressing.');
  if (dang[0]) conseils.push(`${dang[0].name} est leur joueur le plus dangereux : pense au marquage serré ou au mauvais pied.`);
  const R = memeLigue ? rangs(G, opp.id) : null;
  const cmp = (l, a, b) => `<div class="cmp"><b>${Math.round(a)}</b><div class="cmpbar"><i style="width:${a / (a + b) * 100}%"></i></div><b>${Math.round(b)}</b><small>${l}</small></div>`;
  return `<div class="grid2 dh-g"><section class="card"><h2>${esc(opp.name)} <small class="muted">${esc(weekLabel(G, w - 1))}</small></h2>
      <p class="hint">${f.h === G.clubId ? 'À domicile' : 'À l\'extérieur'} · système ${esc(ot.formation)}</p>
      <h3>Rapport de force (toi / eux)</h3>${cmp('Défense', sM.def, sO.def)}${cmp('Milieu', sM.mid, sO.mid)}${cmp('Attaque', sM.att, sO.att)}${cmp('Gardien', sM.gk, sO.gk)}
      <h3>Conseils du centre de données</h3>${conseils.length ? `<ul class="dh-conseils">${conseils.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p class="muted">Match équilibré : pas de faiblesse nette à exploiter.</p>'}</section>
    <section class="card"><h2>Leurs chiffres</h2>${R ? blocRangs(G, opp.id, 'Indicateur') : '<p class="muted">Club d\'un autre championnat : pas de comparaison.</p>'}
      <h3>Joueurs dangereux</h3>${dang.length ? `<table class="tbl compact"><thead><tr><th>Joueur</th><th>Buts</th><th>xG / 90</th><th>Passes clés / 90</th></tr></thead><tbody>${dang.map(p => `<tr data-pid="${p.id}"><td class="nm">${esc(p.name)} <small class="muted">${p.pos}</small></td><td>${p.stats.goals}</td><td>${fmtV(p90(p.stats, 'xg'))}</td><td>${fmtV(p90(p.stats, 'kp'))}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Pas encore de données.</p>'}</section></div>`;
}
function vCentreDonnees(el) {
  el.innerHTML = `<div class="dh"><div class="dh-tabs" role="tablist">${[['joueurs', 'Joueurs'], ['equipe', 'Équipe'], ['adversaire', 'Prochain adversaire']].map(([k, l]) => `<button role="tab" aria-selected="${DH_TAB === k}" class="${DH_TAB === k ? 'on' : ''}" data-dht="${k}">${l}</button>`).join('')}</div>
    ${DH_TAB === 'joueurs' ? ongletJoueurs(G) : DH_TAB === 'equipe' ? ongletEquipe(G) : ongletAdversaire(G)}</div>`;
  el.querySelectorAll('[data-dht]').forEach(b => b.onclick = () => { DH_TAB = b.dataset.dht; vCentreDonnees(el); });
  el.querySelector('#dhP')?.addEventListener('change', e => { DH_PID = +e.target.value; vCentreDonnees(el); });
  el.querySelectorAll('[data-dhp]').forEach(r => r.onclick = () => { DH_PID = +r.dataset.dhp; vCentreDonnees(el); el.querySelector('.dh-pct')?.scrollIntoView({ block: 'nearest' }); });
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}
// ---------- navigation ----------
if (typeof ICONE_VUE !== 'undefined') ICONE_VUE.data = 'trending-up';
function navDonnees() {
  const g = NAV_GROUPS.find(x => x[0] === 'Compétitions') || NAV_GROUPS.find(x => x[0] === 'Club');
  if (g && !g[1].some(x => x[0] === 'data')) { const i = g[1].findIndex(x => x[0] === 'analysis'); g[1].splice(i >= 0 ? i + 1 : g[1].length, 0, ['data', '📈', 'Centre de données']); }
  if (!NAV_FLAT.some(x => x[0] === 'data')) NAV_FLAT.push(['data', '📈', 'Centre de données']);
}
if (typeof applyRoleNav === 'function') { const __applyRoleNavDH = applyRoleNav; applyRoleNav = function () { const r = __applyRoleNavDH.apply(this, arguments); navDonnees(); return r; }; }
navDonnees();
{
  const __showDH = show;
  show = function (v) {
    if (v !== 'data') return __showDH.apply(this, arguments);
    if (LIVE) return;
    VIEW_HIST.push(VIEW); VIEW = v; renderTop();
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    const main = document.querySelector('#main'); main.innerHTML = ''; vCentreDonnees(main);
  };
}
