// ============================================================
//  Carrière du staff : potentiel, progression, déclin, salaire du marché, staff libre
//  - Potentiel (1-5 ★) : tiré du nom et de l'âge (stable, sans toucher au hasard du jeu). Un jeune technicien progresse,
//    un technicien de 60 ans et plus décline.
//  - Progression chaque semaine de championnat : âge, écart au potentiel, entente du staff, centre d'entraînement.
//    Barre pleine : +1 niveau (le moteur l'utilise aussitôt) ; barre vide en déclin : −1 niveau.
//  - Salaire du marché pour chaque niveau : sous-payé après une progression → demande de revalorisation (question).
//  - Marchés du staff et des entraîneurs : au moins deux techniciens libres par poste (sans indemnité).
//  S'applique aussi à l'entraîneur principal (mode directeur sportif) : ses compétences montent ou baissent.
// ============================================================
const potStaff = x => {
  if (x.pot != null) return x.pot;
  const h = hashStaff((x.name || '?') + '|pot'), a = x.age ?? 45;
  const bonus = a < 40 ? 1 + (h % 2) : a < 50 ? (h % 3 === 0 ? 0 : 1) : a < 56 ? h % 2 : 0;
  return x.pot = clamp((x.lvl || 1) + bonus, x.lvl || 1, 5);
};
const salaireMarche = (lvl, coach) => roundMoney(staffWage(lvl, G) * (coach ? 3 + lvl * .6 : 1));
function rythmeStaff(x, mod = 0) {
  const a = x.age ?? 45, pot = potStaff(x);
  let r = x.lvl < pot ? (a < 40 ? 1.6 : a < 50 ? 1.1 : a < 58 ? .6 : 0) : 0;
  if (r > 0) r += mod * .25 + ((G?.fac?.training || 2) - 2) * .08;
  if (a >= 60) r -= .35 + (a - 60) * .08;
  return Math.round(r * 100) / 100;
}
// sérieux au travail (1-20, caché tant qu'il n'a pas fait une saison au club) et accompagnement
const travailStaff = x => x.trav ??= 4 + Math.floor(hashStaff((x.name || '?') + '|trav') % 17);
const motTravail = t => t >= 16 ? 'Bourreau de travail' : t >= 12 ? 'Sérieux' : t >= 8 ? 'Correct' : 'Irrégulier';
function accompagnement(G, k) {
  if (k === 'head') return 0;
  const chef = typeof isDS === 'function' && isDS(G) && G.coach ? G.coach.lvl : (G.staff?.assistant || 2);
  return (chef - 3) * .12;
}
// estimation du potentiel : ±1 étoile au recrutement et la première saison, exacte après deux saisons au club
function estimPotStaff(x, auClub) {
  const pot = potStaff(x), anc = auClub ? Math.max(0, G.season - (x.since ?? G.season)) : 0, err = anc >= 2 ? 0 : 1;
  const b = err ? Math.round(hashStaff((x.name || '?') + '|biais') % 3) - 1 : 0;
  const lo = clamp(pot + b - err, x.lvl, 5), hi = clamp(pot + b + err, Math.max(lo, x.lvl), 5);
  return { lo, hi, sur: !err };
}
const txtPotStaff = e => e.lo === e.hi ? etoiles(e.lo) : `${e.lo} à ${e.hi} ★`;
const etoiles = (l, max = 5) => '★'.repeat(Math.max(0, l)) + '☆'.repeat(Math.max(0, max - l));

function changerNiveauStaff(G, k, x, d) {
  if (k === 'head') {
    const sk = x.skills || {}, cles = Object.keys(sk).sort((a, b) => d > 0 ? sk[a] - sk[b] : sk[b] - sk[a]).slice(0, 3);
    for (const c of cles) sk[c] = clamp(sk[c] + 2 * d, 1, 20);
    if (typeof coachLevel === 'function') coachLevel(x);
  } else {
    x.lvl = clamp(x.lvl + d, 1, 5);
    if (!(k === 'scout' && G.cell)) G.staff[k] = x.lvl;
  }
  (x.hist ||= []).push({ s: G.season, l: x.lvl });
  const lab = k === 'head' ? 'entraîneur principal' : STAFF[k].label.toLowerCase();
  if (typeof news === 'function') news(G, d > 0 ? `📈 ${x.name} (${lab}) progresse : niveau ${etoiles(x.lvl)}.` : `📉 ${x.name} (${lab}) baisse de niveau avec l'âge : ${etoiles(x.lvl)}.`, 'info');
  const marche = salaireMarche(x.lvl, k === 'head');
  if (d > 0 && x.wageW < marche * .8 && typeof addDecision === 'function')
    addDecision(G, { key: `staffRaise:${k}:${x.name}:${G.season}:${x.lvl}`, kind: 'staffRaise', ref: k, blocking: false, from: x.name, icon: '💶',
      title: `${x.name} demande une revalorisation`, text: `${x.name} a progressé (niveau ${x.lvl}/5). Il touche ${wageM(x.wageW)}, le marché paie ${wageM(marche)} à ce niveau. D'autres clubs pourraient l'approcher.` });
}
function semaineCarriereStaff(G) {
  if (!G.staffPeople) return;
  const E = typeof ententeStaff === 'function' ? ententeStaff(G) : { M: [], mod: 0 };
  const membres = E.M.length ? E.M : Object.entries(G.staffPeople).map(([k, x]) => ({ k, x }));
  for (const { k, x } of membres) {
    if (x.interim || (k === 'scout' && G.cell)) continue; // le recruteur en chef suit la cellule de recrutement
    potStaff(x); x.hist ||= [{ s: G.season, l: x.lvl }];
    x.since ??= G.season; travailStaff(x);
    const base = rythmeStaff(x, E.mod);
    const alea = withSideRng(`${G.seed}|stprog|${x.name}|${G.season}|${G.week}`, () => .2 + rnd() * 1.6);
    x.prog = (x.prog || 0) + (base > 0 ? base * alea * (.5 + x.trav / 20) + accompagnement(G, k) : base * (1.4 - x.trav / 25));
    if (x.prog >= 100 && x.lvl < potStaff(x)) { x.prog = 0; changerNiveauStaff(G, k, x, 1); }
    else if (x.prog <= -100 && x.lvl > 1) { x.prog = 0; changerNiveauStaff(G, k, x, -1); }
    x.prog = clamp(x.prog, -100, 100);
  }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateCS = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdateCS.apply(this, arguments);
    if (full) try { semaineCarriereStaff(G); } catch (e) { console.error(e); }
    return r;
  };
}

function saisonPotStaff(G) {
  const E = typeof ententeStaff === 'function' && G.staffPeople ? ententeStaff(G) : { M: [], mod: 0 };
  withSideRng(`${G.seed}|stpot|${G.season}`, () => {
    for (const { k, x } of E.M) {
      if (x.interim || (k === 'scout' && G.cell)) continue;
      const t = travailStaff(x), a = x.age ?? 45, pot = potStaff(x), r = rnd();
      if (a < 56 && pot < 5 && r < .18 + (t - 10) * .02 + E.mod * .1 + accompagnement(G, k)) x.pot = pot + 1;
      else if (r > .92 - (10 - t) * .012 && pot > x.lvl) x.pot = pot - 1;
    }
  });
}
if (typeof endSeason === 'function') {
  const __endSeasonCS = endSeason;
  endSeason = function (G) { try { saisonPotStaff(G); } catch (e) { console.error(e); } return __endSeasonCS.apply(this, arguments); };
}

// ---------- question « revalorisation » ----------
if (typeof DECISION_OPTS !== 'undefined') DECISION_OPTS.staffRaise = d => [['raise', 'Le payer au prix du marché (relation +8)', 'primary'], ['half', 'Proposer la moitié de l\'écart (relation +2)'], ['no', 'Refuser (relation −12, il peut partir)', 'danger']];
window.addEventListener('load', () => {
  const __decideCS = decide;
  decide = function (id, opt) {
    const d = G.decisions.find(x => x.id === id);
    if (!d || d.done || d.kind !== 'staffRaise') return __decideCS.apply(this, arguments);
    const k = d.ref, x = k === 'head' ? G.coach : G.staffPeople?.[k];
    let msg = 'Il ne fait plus partie du staff.';
    if (x) {
      const m = salaireMarche(x.lvl, k === 'head'), aj = (n) => typeof ajRelStaff === 'function' ? ajRelStaff(x, n) : null;
      if (opt === 'raise') { x.wageW = Math.max(x.wageW, m); aj(8); msg = `${x.name} est revalorisé : ${wageM(x.wageW)}.`; }
      else if (opt === 'half') { x.wageW = roundMoney(x.wageW + Math.max(0, m - x.wageW) / 2); aj(2); msg = `${x.name} accepte ${wageM(x.wageW)}, sans enthousiasme.`; }
      else { aj(-12); x.contract = Math.min(x.contract ?? 1, 1); msg = `${x.name} est déçu. Il ne prolongera pas sans geste de ta part.`; }
    }
    d.done = opt; d.answer = msg; news(G, `💶 ${d.title} — ${msg}`, 'info'); save(); toast(msg);
    if (!$('#top')) return; if (VIEW === 'mail' && !$('#modal')) show('mail'); else if (typeof renderTop === 'function') renderTop();
  };
});

// ---------- marchés : potentiel + au moins deux techniciens libres par poste ----------
function libererCandidats(list, parRole) {
  const groupes = {};
  for (const x of list) (groupes[parRole ? x.role : 'all'] ||= []).push(x);
  for (const g of Object.values(groupes)) {
    let libres = g.filter(x => !x.employer).length;
    for (const x of [...g].sort((a, b) => hashStaff(a.name) - hashStaff(b.name))) {
      if (libres >= 2) break;
      if (x.employer) { x.employer = null; x.comp = 0; libres++; }
    }
  }
  for (const x of list) potStaff(x);
  return list;
}
if (typeof staffMarket === 'function') { const __staffMarketCS = staffMarket; staffMarket = function (G) { return libererCandidats(__staffMarketCS(G), true); }; }
if (typeof coachMarket === 'function') { const __coachMarketCS = coachMarket; coachMarket = function (G) { return libererCandidats(__coachMarketCS(G), false); }; }

// ---------- affichage ----------
function blocCarriere(x, coach) {
  const e = estimPotStaff(x, true), r = rythmeStaff(x, typeof ententeStaff === 'function' && G.staffPeople ? ententeStaff(G).mod : 0), p = x.prog || 0;
  const connu = G.season - (x.since ?? G.season) >= 1, t = travailStaff(x);
  const tend = r > 0 ? `↗ progresse${r >= 1.2 ? ' vite' : r >= .7 ? '' : ' lentement'}` : r < 0 ? '↘ en déclin (âge)' : 'semble plafonner';
  const ev = (x.hist || []).length > 1 ? ` · ${x.hist.map(h => `${h.s} ${h.l}★`).join(' → ')}` : '';
  return `<div class="cs-car"><span class="cs-pot" title="${e.sur ? 'Potentiel connu après deux saisons au club' : 'Estimation : le vrai potentiel se précise avec le temps et peut évoluer'}">Potentiel ${e.sur ? '' : 'estimé '}<b>${txtPotStaff(e)}</b></span>
    <span class="cs-barre ${p < 0 ? 'neg' : ''}"><i style="width:${Math.abs(Math.round(p))}%"></i></span><small class="${r < 0 ? 'neg' : r > 0 ? 'pos' : 'muted'}">${tend}${ev}</small>
    <small class="muted">Travail : ${connu ? motTravail(t) : 'à découvrir (1re saison)'}</small></div>`;
}
function blocSalaire(x, coach) {
  const m = salaireMarche(x.lvl, coach), q = x.wageW / m;
  const t = q < .8 ? ['neg', 'sous-payé'] : q > 1.25 ? ['warn', 'au-dessus du marché'] : ['muted', 'au prix du marché'];
  return `<small class="cs-sal ${t[0]}">Marché niv. ${x.lvl} : ${wageM(m)} · ${t[1]}</small>`;
}
if (typeof vStaffPeople === 'function') {
  const __vStaffPeopleCS = vStaffPeople;
  vStaffPeople = vStaff = function (el) {
    const r = __vStaffPeopleCS.apply(this, arguments);
    try {
      el.querySelectorAll('[data-fire]').forEach(b => {
        const k = b.dataset.fire, x = G.staffPeople?.[k], tr = b.closest('tr'); if (!x || !tr || tr.dataset.cs || (k === 'scout' && G.cell)) return; tr.dataset.cs = 1;
        tr.children[2]?.insertAdjacentHTML('beforeend', blocCarriere(x));
        tr.children[5]?.insertAdjacentHTML('beforeend', '<br>' + blocSalaire(x));
      });
      const marquer = () => {
        el.querySelectorAll('#stList [data-hire]').forEach(b => {
          const x = G.staffMarket?.list.find(s => s.id === b.dataset.hire), tr = b.closest('tr'); if (!x || !tr || tr.dataset.cs) return; tr.dataset.cs = 1;
          tr.dataset.libre = x.employer ? '0' : '1';
          tr.children[1]?.insertAdjacentHTML('beforeend', `<br><small title="Estimation du recruteur">Potentiel estimé ${txtPotStaff(estimPotStaff(x, false))}</small>`);
          tr.children[5]?.insertAdjacentHTML('beforeend', '<br>' + blocSalaire(x));
        });
        const t = el.querySelector('#stList table');
        if (t && !el.querySelector('#stLibres')) t.insertAdjacentHTML('beforebegin', `<label class="chk cs-libres"><input type="checkbox" id="stLibres"> Libres seulement (aucune indemnité à payer)</label>`);
        const cb = el.querySelector('#stLibres');
        if (cb) { const app = () => el.querySelectorAll('#stList tr[data-libre]').forEach(tr => tr.hidden = cb.checked && tr.dataset.libre !== '1'); cb.onchange = app; app(); }
      };
      marquer();
      el.querySelectorAll('#stTabs button').forEach(b => b.addEventListener('click', () => { el.querySelector('#stLibres')?.closest('label')?.remove(); marquer(); }));
    } catch (e) { console.error(e); }
    return r;
  };
}
if (typeof vCoach === 'function') {
  const __vCoachCS = vCoach;
  vCoach = function (el) {
    const r = __vCoachCS.apply(this, arguments);
    try {
      const c = G.coach, sec = el.querySelector('section.card');
      if (c && sec && !sec.querySelector('.cs-car')) sec.querySelector('.gauges')?.insertAdjacentHTML('beforebegin', blocCarriere(c, true) + blocSalaire(c, true));
      el.querySelectorAll('[data-hc]').forEach(b => {
        const x = G.coachMarket?.list.find(m => m.id === b.dataset.hc), card = b.closest('.coach-card'); if (!x || !card || card.dataset.cs) return; card.dataset.cs = 1;
        card.querySelector('.skills')?.insertAdjacentHTML('beforebegin', `<small>Potentiel estimé <b>${txtPotStaff(estimPotStaff(x, false))}</b> · ${x.employer ? 'en poste' : '<b class="pos">libre, sans indemnité</b>'}</small>${blocSalaire(x, true)}`);
      });
    } catch (e) { console.error(e); }
    return r;
  };
}
