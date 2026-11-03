// ============================================================
//  Mercato et monde
//  1. Confirmation finale d'un transfert : une fois la visite médicale passée, le transfert attend ton accord
//     (« Confirmer la signature » ou « Renoncer »), avec le récapitulatif du coût. Sans réponse en 2 semaines,
//     l'autre partie met fin aux discussions (même règle que les autres étapes).
//     En délégation complète à la cellule de recrutement (et dans les tests automatiques), la signature reste automatique.
//  2. Recherche de joueurs : filtre « Championnat » couvrant toutes les divisions du pays et tous les pays étrangers du monde.
//  3. Classements > « Monde » : tous les pays et leurs clubs (valeur, réputation, meilleur joueur), avec accès à la fiche de chaque club.
// ============================================================
// ---------- 1. confirmation finale ----------
if (typeof DEAL_USER !== 'undefined' && !DEAL_USER.includes('confirm')) DEAL_USER.push('confirm');
if (typeof DEAL_LABEL !== 'undefined') DEAL_LABEL.confirm = 'Visite médicale réussie : signature à confirmer';
function signatureAuto(G) { return !!(G.__harness || (G.cell && G.cell.deleg === 'execute')); }
function coutTotalDeal(d) {
  const t = d.terms || {}, ans = t.yrs || 1;
  return { indemnite: d.offer?.fee || 0, salaires: (t.wageM || 0) * 12 * ans, primes: (t.signOn || 0) + (t.agentFee || 0), ans };
}
if (typeof dealComplete === 'function') {
  const __dealCompleteMM = dealComplete;
  dealComplete = function (d) {
    if (d.status === 'medical' && !d.confirme && !signatureAuto(G)) {
      const p = getPlayer(G, d.pid), C = coutTotalDeal(d);
      d.status = 'confirm'; d.log.push(`${weekLabel(G)} : visite médicale réussie, signature en attente de ta confirmation.`);
      notifyDeal(d, `${p.name} : confirmer la signature ?`, `Visite médicale réussie. Coût sur ${C.ans} saison(s) : indemnité ${money(C.indemnite)}, salaires ${money(C.salaires)}, primes et agent ${money(C.primes)}.`);
      save?.(); return;
    }
    return __dealCompleteMM.apply(this, arguments);
  };
}
if (typeof dealSteps === 'function') {
  const __dealStepsMM = dealSteps;
  dealSteps = function (cur) { return __dealStepsMM(cur === 'confirm' ? 'done' : cur); };
}
if (typeof openDeal === 'function') {
  const __openDealMM = openDeal;
  openDeal = function (id) {
    const r = __openDealMM.apply(this, arguments);
    const d = (G.deals || []).find(x => x.id === id || x.id === +id);
    if (d?.status === 'confirm') {
      const p = getPlayer(G, d.pid), C = coutTotalDeal(d), z = $('#dResp');
      z?.insertAdjacentHTML('beforebegin', `<div class="confirm-deal"><p>✅ ${esc(p.name)} a passé la visite médicale. Dernière étape : tu valides ou non sa venue.</p>
        <table class="tbl kv"><tr><td>Indemnité de transfert</td><td><b>${money(C.indemnite)}</b></td></tr><tr><td>Salaires sur ${C.ans} saison(s)</td><td>${money(C.salaires)}</td></tr>
        <tr><td>Prime à la signature + agent</td><td>${money(C.primes)}</td></tr><tr><td>Coût total du contrat</td><td><b>${money(C.indemnite + C.salaires + C.primes)}</b></td></tr></table>
        <div class="row gap mt"><button class="btn danger" id="dRenonce">Renoncer au joueur</button><div class="grow"></div><button class="btn primary" id="dSigne">✍ Confirmer la signature</button></div></div>`);
      $('#dSigne').onclick = () => { d.confirme = true; d.status = 'medical'; dealComplete(d); };
      $('#dRenonce').onclick = () => confirmBox(`Renoncer à ${esc(p.name)} ? Le club vendeur et l'agent n'apprécieront pas et la négociation sera close.`, () => { dealFail(d, 'tu as renoncé à la signature après la visite médicale.'); closeModal(); refresh?.(); }, 'Renoncer', true);
    }
    return r;
  };
}

// ---------- 2. championnat du joueur (filtre de recherche) ----------
function ligueDe(G, p) {
  if (p.club == null) return 'libre';
  const c = getClub(G, p.club); if (!c) return '';
  if (c.foreign) return 'P:' + (c.country || '?');
  return clubLeague(G, c.id)?.id || 'P:?';
}
function nomPays(code) { return (typeof NATIONS !== 'undefined' && NATIONS.find(n => n[0] === code)?.[1]) || (typeof DO2_PAYS !== 'undefined' && DO2_PAYS[code]?.nom) || code; }
function paysEtrangers(G) {
  const m = {};
  for (const c of G.clubs) if (c.foreign) (m[c.country || '?'] ||= []).push(c);
  return Object.entries(m).sort((a, b) => b[1].length - a[1].length || nomPays(a[0]).localeCompare(nomPays(b[0])));
}
function selectLigues(G, val = '') {
  const doms = leagueComps(G).map(l => `<option value="${l.id}" ${val === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
  const etr = paysEtrangers(G).map(([k, cs]) => `<option value="P:${esc(k)}" ${val === 'P:' + k ? 'selected' : ''}>${esc(nomPays(k))} (${cs.length} club${cs.length > 1 ? 's' : ''})</option>`).join('');
  return `<select id="flg" aria-label="Championnat"><option value="">Tous les championnats du monde</option><optgroup label="Mon pays">${doms}</optgroup><optgroup label="Étranger">${etr}</optgroup><option value="libre" ${val === 'libre' ? 'selected' : ''}>Joueurs libres</option></select>`;
}

// ---------- 3. Classements > Monde ----------
function blocMonde(G) {
  const doms = leagueComps(G);
  const carte = (titre, clubs, sous) => {
    const L = clubs.map(c => { const ps = clubPlayers(G, c.id); return { c, val: ps.reduce((s, p) => s + p.value, 0), top: ps.sort((a, b) => playerOvr(b) - playerOvr(a))[0] }; }).sort((a, b) => b.c.rep - a.c.rep);
    return `<section class="card monde-pays"><h2>${titre} <small>${sous}</small></h2><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Club</th><th>Réputation</th><th>Valeur de l'effectif</th><th>Meilleur joueur</th></tr></thead><tbody>
      ${L.map(({ c, val, top }) => `<tr class="click ${c.id === G.clubId ? 'me' : ''}" data-mc="${c.id}"><td class="nm">${crest(c, 20)} ${esc(c.name)}</td><td>${stars ? stars(Math.round(c.rep)) : Math.round(c.rep)}</td><td>${money(val)}</td><td>${top ? `${esc(top.name)} <small class="muted">${top.pos}</small> ${knows(G, top) ? ovrBadge(playerOvr(top)) : `<span class="muted">~${estOvr(G, top)}</span>`}` : '—'}</td></tr>`).join('')}</tbody></table></div></section>`;
  };
  return `<p class="hint">Toutes les divisions de ton pays et tous les clubs étrangers du monde du jeu. Les clubs étrangers ne disputent pas de championnat simulé : ils jouent les coupes d'Europe et alimentent le mercato. Clique sur un club pour voir son effectif.</p>
    ${doms.map(l => carte('🏆 ' + esc(l.name), l.clubs.map(id => getClub(G, id)).filter(Boolean), `${l.clubs.length} clubs · division ${l.div}`)).join('')}
    ${paysEtrangers(G).map(([k, cs]) => carte(`${typeof natFlag === 'function' ? natFlag(k) : ''} ${esc(nomPays(k))}`, cs, `${cs.length} club${cs.length > 1 ? 's' : ''} · étranger`)).join('')}`;
}
if (typeof vComps === 'function') {
  const __vCompsMM = vComps;
  vComps = function (el) {
    if (COMP_TAB === 'MONDE') {
      COMP_TAB = null; __vCompsMM.apply(this, arguments); COMP_TAB = 'MONDE';
      el.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === 'MONDE'));
      const body = el.querySelector('#compBody'); if (body) body.innerHTML = blocMonde(G);
    } else __vCompsMM.apply(this, arguments);
    const tabs = el.querySelector('section.card .tabs');
    if (tabs && !tabs.querySelector('[data-c="MONDE"]')) tabs.insertAdjacentHTML('beforeend', `<button data-c="MONDE" class="${COMP_TAB === 'MONDE' ? 'on' : ''}">🌍 Monde</button>`);
    el.querySelectorAll('section.card .tabs [data-c]').forEach(b => b.onclick = () => { COMP_TAB = b.dataset.c; vComps(el); });
    el.querySelectorAll('[data-mc]').forEach(tr => tr.onclick = () => viewClub(+tr.dataset.mc));
  };
}
