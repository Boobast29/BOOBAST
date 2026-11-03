// ============================================================
//  Fins de carrière, retraites du staff et reconversions
//  - Joueurs (fin de saison, en plus des retraites du moteur à 34 ans et plus) : un joueur de 31 ans et plus qui n'a
//    pas joué, ou dont le niveau a trop baissé, arrête plus tôt ; une grave blessure après 30 ans peut mettre fin à
//    une carrière. Tes joueurs : annonce dans la messagerie.
//  - Reconversion : un retraité au mental solide (leader, professionnel, expérience) peut devenir entraîneur,
//    adjoint, entraîneur technique, formateur, kiné ou recruteur. Il rejoint un vivier (G.reconv) : on le retrouve,
//    libre et sans indemnité, sur les marchés du staff et des entraîneurs. D'autres sont recrutés par leur ancien
//    club (nouvelle dans le monde). Un de tes joueurs qui raccroche peut demander à rester au club (question).
//  - Staff : retraite entre 64 et 70 ans (ton staff, l'entraîneur principal en mode directeur sportif, les marchés).
//  Tirages à part (withSideRng) : le déroulé des matchs ne se décale pas.
// ============================================================
const ROLES_RECONV = { head: 'Entraîneur principal', assistant: 'Adjoint', coach: 'Entraîneur technique', youth: 'Formateur', physio: 'Kiné / préparateur physique', scout: 'Recruteur' };
function profilReconversion(p) {
  const A = p.attrs || {}, men = A.men || 10;
  let chance = .08 + (men - 10) * .025 + (p.pers === 'Leader' ? .25 : p.pers === 'Professionnel' ? .1 : 0) + Math.min(.15, (p.caps || 0) / 200) + Math.min(.1, (p.hist || []).length * .008);
  if (p.pers === 'Tempérament') chance -= .05;
  const role = p.pers === 'Leader' && men >= 13 ? 'head' : p.pos === 'GB' ? 'coach' : men >= 14 ? 'assistant' : (A.tec || 10) >= 13 ? 'coach' : p.age <= 34 && (A.phy || 10) >= 13 ? 'physio' : (A.pas || 10) >= 13 ? 'youth' : 'scout';
  const o = playerOvr(p);
  const lvl = clamp(Math.round(1 + (men - 8) / 4 + (o >= 75 ? 1 : 0)), 1, 4);
  return { chance: clamp(chance, 0, .75), role, lvl };
}
function ajouterVivier(G, p, prof, club) {
  const x = { id: 'rx' + p.id, name: p.name, age: Math.max(p.age, 33), nat: p.nat, role: prof.role, lvl: prof.lvl, exJoueur: true, exClub: club?.name || null,
    pot: clamp(prof.lvl + 1 + (p.age <= 34 ? 1 : 0), prof.lvl, 5), saison: G.season, hist: [{ s: G.season, l: prof.lvl }] };
  (G.reconv ||= []).unshift(x);
  G.reconv = G.reconv.slice(0, 60);
  return x;
}
function finsDeCarriere(G, avant) {
  const partis = [], mesRetraites = [];
  withSideRng(`${G.seed}|retraites|${G.season}`, () => {
    for (const p of G.players) {
      if (p.academy || p.age < 30) continue;
      const a = avant.get(p.id); if (!a) continue;
      const club = p.club != null ? getClub(G, p.club) : null, o = playerOvr(p);
      let ch = 0;
      if (p.age >= 31 && a.apps === 0) ch += .25 + (p.age - 31) * .08;                 // plus de temps de jeu
      if (p.age >= 32 && club && o < club.rep - 18) ch += .2;                           // niveau trop bas pour son club
      if (p.age >= 30 && (p.injury || 0) > 120) ch += .35;                              // grave blessure
      if (p.age >= 33) ch += (p.age - 32) * .06;
      if (p.club === G.clubId) ch *= .6;                                                // tes joueurs sous contrat : plus rarement
      if (ch > 0 && rnd() < ch) partis.push(p);
    }
  });
  if (!partis.length) return { partis: [], mesRetraites };
  const ids = new Set(partis.map(p => p.id));
  for (const p of partis) {
    const club = p.club != null ? getClub(G, p.club) : null;
    if (p.club === G.clubId) { mesRetraites.push(p); news(G, `👋 ${p.name} met fin à sa carrière à ${p.age} ans.`, 'info'); if (typeof removeFromTactics === 'function') removeFromTactics(p.id); }
  }
  G.players = G.players.filter(p => !ids.has(p.id));
  G.shortlist = (G.shortlist || []).filter(id => !ids.has(id));
  if (G.know) for (const id of ids) delete G.know[id];
  G.retiredCount = (G.retiredCount || 0) + ids.size;
  if (typeof reindex === 'function') reindex(G);
  return { partis, mesRetraites };
}
function reconversions(G, retraites) {
  const notes = [];
  withSideRng(`${G.seed}|reconv|${G.season}`, () => {
    for (const { p, club } of retraites) {
      const prof = profilReconversion(p);
      if (rnd() >= prof.chance) continue;
      if (club && club.id === G.clubId) { notes.push({ p, prof, club, mien: true }); continue; }
      if (club && rnd() < .45) { // recruté par son ancien club
        news(G, `🎓 ${p.name} raccroche les crampons et intègre le staff de ${club.name} (${ROLES_RECONV[prof.role].toLowerCase()}).`, 'info', true);
        continue;
      }
      ajouterVivier(G, p, prof, club);
      if (p.caps >= 20 || playerOvr(p) >= 74) news(G, `🎓 ${p.name} (ex-${club?.name || 'joueur'}) se reconvertit : il passe ses diplômes et cherche un poste de ${ROLES_RECONV[prof.role].toLowerCase()}.`, 'info', true);
    }
  });
  for (const n of notes) {
    const x = ajouterVivier(G, n.p, n.prof, n.club);
    if (n.prof.role !== 'head' && typeof addDecision === 'function')
      addDecision(G, { key: 'reconv:' + x.id, kind: 'reconv', ref: x.id, blocking: false, from: x.name, icon: '🎓',
        title: `${x.name} raccroche et voudrait rester au club`,
        text: `${x.name} met fin à sa carrière. Il souhaite rester au club comme ${ROLES_RECONV[x.role].toLowerCase()} (niveau de départ ${x.lvl}/5, potentiel estimé ${x.pot - 1} à ${Math.min(5, x.pot + 1)} ★). Le vestiaire apprécierait.` });
  }
}
// le vivier vieillit : certains trouvent un poste ailleurs chaque saison
function vivierSaison(G) {
  if (!G.reconv?.length) return;
  withSideRng(`${G.seed}|vivier|${G.season}`, () => {
    G.reconv = G.reconv.filter(x => { x.age++; return x.age < 66 && rnd() > .3; });
  });
}
// ---------- retraites du staff ----------
function retraitesStaff(G) {
  withSideRng(`${G.seed}|retraitestaff|${G.season}`, () => {
    for (const [k, x] of Object.entries(G.staffPeople || {})) {
      if (x.interim || (k === 'scout' && G.cell) || (x.age ?? 0) < 64) continue;
      if (x.age >= 70 || rnd() < (x.age - 63) * .18) {
        news(G, `🎉 ${x.name} (${STAFF[k].label.toLowerCase()}) prend sa retraite à ${x.age} ans. Un intérimaire assure le poste : recrute un remplaçant (menu Staff).`, 'board');
        G.staffPeople[k] = { ...newStaffPerson(k, 1, 'Intérimaire ' + pick(STAFF_LAST)), contract: 1, interim: true };
        G.staff[k] = 1;
      }
    }
    const c = typeof isDS === 'function' && isDS(G) ? G.coach : null;
    if (c && !c.interim && (c.age ?? 0) >= 66 && (c.age >= 72 || rnd() < (c.age - 65) * .15)) {
      (G.coachHist ||= []).unshift({ ...c, until: `fin ${G.season}/${G.season + 1}`, why: 'Retraite' });
      news(G, `🎉 ${c.name} prend sa retraite à ${c.age} ans. L'adjoint assure l'intérim : recrute un nouvel entraîneur (menu Entraîneur).`, 'board');
      G.coach = { ...newCoach(myClub(G).rep, 1), name: 'Intérim — ' + (G.staffPeople?.assistant?.name || 'adjoint'), interim: true, relation: 50, contract: 1 };
    } else if (c && !c.interim) c.age = (c.age ?? 50) + 1;
  });
}

if (typeof endSeason === 'function') {
  const __endSeasonRT = endSeason;
  endSeason = function (G) {
    const avant = new Map(G.players.map(p => [p.id, { apps: p.stats?.apps || 0, club: p.club }]));
    const ids0 = new Set(G.players.map(p => p.id)), copie = new Map(G.players.map(p => [p.id, p]));
    const S = __endSeasonRT.apply(this, arguments);
    try {
      // retraites du moteur (34 ans et plus) : candidats à la reconversion eux aussi
      const presents = new Set(G.players.map(p => p.id));
      const retraites = [];
      for (const id of ids0) if (!presents.has(id)) { const p = copie.get(id); if (p && !p.academy && p.age >= 32) retraites.push({ p, club: avant.get(id)?.club != null ? getClub(G, avant.get(id).club) : null }); }
      const { partis } = finsDeCarriere(G, avant);
      for (const p of partis) retraites.push({ p, club: avant.get(p.id)?.club != null ? getClub(G, avant.get(p.id).club) : null });
      vivierSaison(G);
      reconversions(G, retraites);
      retraitesStaff(G);
    } catch (e) { console.error(e); }
    return S;
  };
}

// ---------- question « il veut rester au club » ----------
if (typeof DECISION_OPTS !== 'undefined') DECISION_OPTS.reconv = d => {
  const x = G.reconv?.find(r => r.id === d.ref); if (!x) return [['no', 'Lui souhaiter bonne chance', 'primary']];
  const cur = G.staffPeople?.[x.role];
  return [['hire', `L'engager comme ${ROLES_RECONV[x.role].toLowerCase()} (remplace ${cur?.name || 'le titulaire'})`, 'primary'], ['no', 'Lui souhaiter bonne chance (il reste dans le vivier)']];
};
window.addEventListener('load', () => {
  const __decideRT = decide;
  decide = function (id, opt) {
    const d = G.decisions.find(x => x.id === id);
    if (!d || d.done || d.kind !== 'reconv') return __decideRT.apply(this, arguments);
    const x = G.reconv?.find(r => r.id === d.ref);
    let msg = 'Il a déjà trouvé un autre poste.';
    if (x && opt === 'hire' && G.staffPeople) {
      const cur = G.staffPeople[x.role], sev = cur && !cur.interim ? roundMoney(cur.wageW * 52 * Math.max(0, cur.contract) * .5) : 0;
      if (sev) flow(G, myClub(G), -sev, 'staff');
      G.staffPeople[x.role] = { name: x.name, age: x.age, lvl: x.lvl, pot: x.pot, spec: 'Ancien joueur du club', wageW: staffWage(x.lvl, G), contract: 2, rep: x.lvl * 15, since: G.season, exJoueur: true, rel: 75, hist: x.hist };
      G.staff[x.role] = x.lvl;
      G.reconv = G.reconv.filter(r => r !== x);
      msg = `${x.name} rejoint le staff (${ROLES_RECONV[x.role].toLowerCase()}).${sev ? ` Indemnité de départ de ${cur.name} : ${money(sev)}.` : ''}`;
    } else if (x) msg = `${x.name} part passer ses diplômes. On le retrouvera peut-être sur le marché du staff.`;
    d.done = opt; d.answer = msg; news(G, `🎓 ${d.title} — ${msg}`, 'info'); save(); toast(msg);
    if (!$('#top')) return; if (VIEW === 'mail' && !$('#modal')) show('mail'); else if (typeof renderTop === 'function') renderTop();
  };
});

// ---------- marchés : retraités du marché, anciens joueurs reconvertis ----------
function injecterVivier(list, parRole) {
  const pris = new Set([...Object.values(G.staffPeople || {}).map(x => x.name), G.coach?.name]);
  const out = list.filter(x => (x.age ?? 0) < 66);
  for (const r of G.reconv || []) {
    if (pris.has(r.name) || out.some(x => x.id === r.id)) continue;
    if (parRole ? r.role === 'head' : r.role !== 'head') continue;
    if (parRole && out.filter(x => x.role === r.role && x.exJoueur).length >= 1) continue;
    if (!parRole && out.filter(x => x.exJoueur).length >= 2) continue;
    const base = withSideRng(`${G.seed}|vivx|${r.id}`, () => parRole ? newStaffPerson(r.role, r.lvl, r.name) : newCoach(40 + r.lvl * 12, r.lvl));
    out.push({ ...base, id: r.id, name: r.name, age: r.age, nat: r.nat || base.nat, lvl: parRole ? r.lvl : base.lvl, pot: r.pot, role: parRole ? r.role : undefined,
      employer: null, comp: 0, exJoueur: true, spec: parRole ? `Ancien joueur${r.exClub ? ' (' + r.exClub + ')' : ''}` : base.spec,
      history: parRole ? base.history : [`Ancien joueur${r.exClub ? ' de ' + r.exClub : ''}`, 'Diplômes d\'entraîneur'], wants: '' });
  }
  list.length = 0; list.push(...out);
  return list;
}
if (typeof staffMarket === 'function') { const __staffMarketRT = staffMarket; staffMarket = function (G) { return injecterVivier(__staffMarketRT(G), true); }; }
if (typeof coachMarket === 'function') { const __coachMarketRT = coachMarket; coachMarket = function (G) { return injecterVivier(__coachMarketRT(G), false); }; }
