// ============================================================
//  Mode Directeur sportif : tu gères le club, pas les matchs.
//  L'entraîneur (IA) compose l'équipe et dirige les rencontres ;
//  toi tu gères l'effectif, les transferts, les contrats, le staff,
//  et tu réponds à ses demandes. Il peut être licencié et remplacé.
// ============================================================
const COACH_STYLES = [
  { k: 'possession', label: 'Jeu de possession', f: '4-3-3', likes: ['MC', 'MOC', 'DC'], tip: 'Veut des milieux techniques et des défenseurs relanceurs.' },
  { k: 'pressing', label: 'Pressing haut', f: '4-2-3-1', likes: ['AG', 'AD', 'MDC'], tip: 'Veut des joueurs rapides et endurants.' },
  { k: 'contre', label: 'Contre-attaque', f: '4-4-2', likes: ['BU', 'AG', 'AD'], tip: 'Veut des attaquants rapides et un bloc solide.' },
  { k: 'bloc', label: 'Bloc défensif', f: '5-3-2', likes: ['DC', 'MDC', 'GB'], tip: 'Veut de la solidité défensive et de l\'expérience.' },
  { k: 'jeunes', label: 'Formateur', f: '4-3-3', likes: ['MC', 'AG', 'BU'], tip: 'Aime lancer les jeunes et les faire progresser.' }
];
const LINE_OF = { GB: 'Gardien', DC: 'Défense centrale', DG: 'Côté gauche', DD: 'Côté droit', MDC: 'Milieu défensif', MC: 'Milieu', MOC: 'Milieu offensif', AG: 'Ailier', AD: 'Ailier', BU: 'Attaque' };
function isDS(g = G) { return g?.role === 'ds'; }
const COACH_SKILLS = { tac: 'Tactique', mot: 'Motivation', hum: 'Gestion humaine', jeu: 'Formation des jeunes', dis: 'Discipline', phy: 'Préparation physique', adapt: 'Adaptabilité' };
const COACH_SKILL_TIP = { tac: 'Familiarité tactique plus rapide, meilleure préparation des matchs.', mot: 'Moral du groupe chaque semaine.', hum: 'Moins de joueurs frustrés ; sous 8, des conflits éclatent.', jeu: 'Progression des joueurs de 21 ans et moins.', dis: 'Apaise les conflits ; sous 8, écarts de conduite.', phy: 'Retour plus rapide des blessés.', adapt: 'Tire le meilleur d\'un effectif qui ne correspond pas à son style.' };
const STYLE_BIAS = { possession: { tac: 2, adapt: -1 }, pressing: { phy: 3, mot: 1 }, contre: { tac: 1, dis: 2 }, bloc: { dis: 3, jeu: -2 }, jeunes: { jeu: 4, mot: 1 } };
const PERSO_COACH = ['Exigeant', 'Paternel', 'Ambitieux', 'Pragmatique', 'Caractériel', 'Discret'];
function newCoach(rep, lvl) {
  const st = pick(COACH_STYLES);
  lvl ??= clamp(Math.round(rep / 20 + gauss() * .7), 1, 5);
  const fm = typeof FORMATIONS !== 'undefined' && !FORMATIONS[st.f] ? Object.keys(FORMATIONS)[0] : st.f;
  const base = 5 + lvl * 2.6, sk = {};
  for (const k of Object.keys(COACH_SKILLS)) sk[k] = clamp(Math.round(base + gauss() * 2.2 + (STYLE_BIAS[st.k]?.[k] || 0)), 1, 20);
  const perso = pick(PERSO_COACH);
  if (perso === 'Caractériel') { sk.hum = clamp(sk.hum - 4, 1, 20); sk.mot = clamp(sk.mot + 2, 1, 20); }
  if (perso === 'Paternel') { sk.hum = clamp(sk.hum + 3, 1, 20); sk.dis = clamp(sk.dis - 2, 1, 20); }
  if (perso === 'Exigeant') { sk.dis = clamp(sk.dis + 3, 1, 20); sk.hum = clamp(sk.hum - 1, 1, 20); }
  const c = { name: pick(STAFF_FIRST) + ' ' + pick(STAFF_LAST), age: rint(38, 66), nat: pick(['FRA', 'ESP', 'ITA', 'GER', 'POR', 'ENG', 'NED', 'ARG', 'BEL']), style: st.k, formation: fm, skills: sk, perso,
    contract: rint(1, 3), relation: 60, since: G?.season ?? 2026, w: 0, d: 0, l: 0 };
  coachLevel(c);
  c.wageW = roundMoney(staffWage(c.lvl, G) * (3 + c.lvl * .6) * (.85 + rnd() * .3));
  c.rep = clamp(c.lvl * 17 + rint(-8, 10), 5, 99);
  c.history = Array.from({ length: rint(1, 4) }, () => pick(['Promotion obtenue', 'Maintien assuré', 'Licencié en cours de saison', 'Milieu de tableau', 'Qualification européenne', 'Titre de champion'].slice(0, 3 + c.lvl)));
  return c;
}
function coachLevel(c) {
  if (!c.skills) { const b = 5 + (c.lvl || 2) * 2.6; c.skills = Object.fromEntries(Object.keys(COACH_SKILLS).map(k => [k, clamp(Math.round(b), 1, 20)])); c.perso ||= 'Pragmatique'; }
  const s = c.skills, avg = (s.tac * 1.4 + s.mot + s.hum + s.jeu * .6 + s.dis * .8 + s.phy * .7 + s.adapt * .5) / 6;
  c.lvl = clamp(Math.round((avg - 4) / 2.6), 1, 5);
  return c.lvl;
}
// Adéquation entre le style de l'entraîneur et l'effectif
function coachFit(G, c) {
  const st = coachStyle(c), sq = clubPlayers(G, G.clubId).filter(p => !p.academy);
  const mean = Object.keys(ROLES).reduce((a, pos) => a + lineStrength(G, pos), 0) / Object.keys(ROLES).length;
  const liked = st.likes.reduce((a, pos) => a + lineStrength(G, pos), 0) / st.likes.length;
  let f = 60 + (liked - mean) * 3 + ((c.skills?.adapt ?? 10) - 10) * 2;
  if (st.k === 'jeunes') f += (sq.filter(p => p.age <= 21).length - 4) * 3;
  if (st.k === 'bloc') f += (sq.filter(p => p.age >= 29).length - 5) * 2;
  return clamp(Math.round(f), 0, 100);
}
function coachStyle(c) { return COACH_STYLES.find(s => s.k === c.style) || COACH_STYLES[0]; }

// Choix du rôle à la création (mémorisé)
function chosenRole() { try { return localStorage.getItem('mf-role') || 'ds'; } catch { return 'ds'; } }
const __newGame2 = newGame;
newGame = function (db, clubId, managerName, seed) {
  const g = __newGame2(db, clubId, managerName, seed);
  if (chosenRole() === 'ds') initDS(g);
  return g;
};
function initDS(g) {
  g.role = 'ds';
  const prevG = G; G = g;
  g.coach = newCoach(myClub(g).rep);
  g.coach.contract = 2;
  g.coachReqs = [];
  g.tactics.formation = g.coach.formation;
  Object.assign(g.tactics, autoLineup(g, g.clubId, g.coach.formation));
  news(g, `Tu prends tes fonctions de directeur sportif. L'entraîneur en place est ${g.coach.name} (${coachStyle(g.coach).label}, ${'★'.repeat(g.coach.lvl)}). Il compose l'équipe et dirige les matchs ; toi, tu construis l'effectif, gères les contrats, le staff et réponds à ses demandes.`, 'board');
  G = prevG;
}
function roleSelectHTML() {
  const r = chosenRole();
  return `<label>Ton rôle <select id="roleSel"><option value="ds" ${r === 'ds' ? 'selected' : ''}>Directeur sportif — gestion du club</option><option value="coach" ${r === 'coach' ? 'selected' : ''}>Entraîneur — tactique et matchs</option></select></label>`;
}
function bindRoleSelect() { $('#roleSel')?.addEventListener('change', e => { try { localStorage.setItem('mf-role', e.target.value); } catch { } }); }

// Navigation propre au directeur sportif
const __navGroupsCoach = NAV_GROUPS.map(g => [g[0], g[1].slice()]);
function applyRoleNav() {
  NAV_GROUPS.length = 0;
  if (isDS()) {
    NAV_GROUPS.push(
      ['Bureau', [['inbox', '🏠', 'Tableau de bord'], ['mail', '✉', 'Boîte mail'], ['calendar', '📅', 'Calendrier']]],
      ['Effectif', [['squad', '👥', 'Effectif'], ['coach', '🧢', 'Entraîneur'], ['meetings', '🗣', 'Réunions'], ['dressing', '🤝', 'Vestiaire'], ['medical', '🏥', 'Infirmerie'], ['youth', '🌱', 'Formation']]],
      ['Recrutement', [['transfers', '💱', 'Mercato'], ['deals', '📝', 'Négociations'], ['staff', '🧑‍💼', 'Staff']]],
      ['Club', [['finances', '💶', 'Finances'], ['club', '🏟', 'Club'], ['fixtures', '🗓', 'Résultats'], ['comps', '🏆', 'Classements'], ['stats', '📊', 'Statistiques'], ['analysis', '📈', 'Analyse']]],
      ['Outils', [['base', '🔎', 'Base mondiale'], ['editor', '✏', 'Éditeur'], ['options', '⚙', 'Options']]]);
  } else __navGroupsCoach.forEach(g => NAV_GROUPS.push([g[0], g[1].slice()]));
  NAV_FLAT.length = 0; NAV_FLAT.push(...NAV_GROUPS.flatMap(g => g[1]));
}
const __enterGame2 = enterGame;
enterGame = function () {
  applyRoleNav();
  if (isDS() && ['tactics', 'training'].includes(VIEW)) VIEW = 'inbox';
  __enterGame2();
};
const __show2 = show;
show = function (v) {
  if (isDS() && (v === 'tactics' || v === 'training')) v = 'coach';
  if (v === 'coach') {
    if (LIVE) return;
    VIEW_HIST.push(VIEW); VIEW = 'coach';
    $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === 'coach'));
    renderTop();
    const main = $('#main'); main.innerHTML = ''; vCoach(main); main.scrollTop = 0; navBadges();
    return;
  }
  __show2(v);
};

// Le directeur sportif ne dirige pas les matchs : l'entraîneur s'en charge
const __advance2 = advance;
advance = function () {
  if (!isDS()) return __advance2();
  if (LIVE || $('#modal')) return;
  if (blockingDecisions(G).length && G.week < G.schedule.length) return __advance2(); // renvoie vers les décisions
  if (G.week >= G.schedule.length) return seasonEnd();
  const f = weekFixtures(G).find(f => f.h === G.clubId || f.a === G.clubId);
  let line = '';
  if (f) {
    ensureSquad(G, G.clubId);
    const c = G.coach;
    G.tactics.formation = c.formation;
    Object.assign(G.tactics, autoLineup(G, G.clubId, c.formation, G.tactics));
    const home = f.h === G.clubId, opp = home ? f.a : f.h, oppTac = aiTactics(G, opp, G.clubId);
    const mt = new Match(G, f, home ? G.tactics : oppTac, home ? oppTac : G.tactics, { cup: isKO(f), firstLeg: f.firstRes });
    mt.my = home ? 0 : 1; mt.sides[0].ai = mt.sides[1].ai = true; mt.auto = true;
    mt.runToEnd(); applyMatch(G, mt, f); boardAfterMatch(G, f);
    const w = mt.winner(), res = w === mt.my ? 'w' : w == null ? 'd' : 'l';
    c[res]++;
    c.relation = clamp(c.relation + (res === 'w' ? .5 : res === 'l' ? -.3 : 0), 0, 100);
    line = `${mt.names[0]} ${mt.score[0]}-${mt.score[1]} ${mt.names[1]}`;
    news(G, `${weekLabel(G)} : ${line} — ${res === 'w' ? 'victoire' : res === 'd' ? 'match nul' : 'défaite'} (équipe dirigée par ${c.name}).`, res === 'w' ? 'win' : res === 'd' ? 'info' : 'loss');
    for (const e of mt.events) if (e.type === 'inj' && e.side === mt.my) news(G, `Blessure : ${getPlayer(G, e.pid).name} absent ~${e.weeks} semaine(s).`, 'inj');
    G.lastDSMatch = fxKey(f);
  }
  const r = completeWeek(G, f);
  save();
  toast(line ? `Résultat : ${line}` : 'Semaine simulée.');
  afterWeek(r);
};

// ---------- Demandes de l'entraîneur ----------
function lineStrength(G, pos) {
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy && !(p.loan && !p.loan.inLoan));
  const r = sq.map(p => playerRoleRating(p, pos) * familiarity(p, pos)).sort((a, b) => b - a);
  return r.slice(0, pos === 'GB' ? 1 : 2).reduce((a, b) => a + b, 0) / (pos === 'GB' ? 1 : 2);
}
function coachWeekly(G) {
  if (!isDS(G) || !G.coach) return;
  const c = G.coach, st = coachStyle(c), sq = clubPlayers(G, G.clubId).filter(p => !p.academy);
  // le niveau de l'entraîneur agit : familiarité tactique et moral
  if (!c.skills) coachLevel(c);
  const k = c.skills, fit = coachFit(G, c);
  G.tacFam ||= {}; G.tacFam[c.formation] = clamp((G.tacFam[c.formation] || 50) + k.tac / 20 * 1.4 * (.5 + fit / 100), 0, 100 - Math.max(0, 50 - fit) / 2);
  for (const p of sq) {
    p.morale = clamp(p.morale + (k.mot - 10) * .05 + (c.relation < 30 ? -.4 : 0) + ((c.respect ?? 60) < 40 ? -.4 : 0), 5, 100);
    if (k.hum >= 14 && p.ptWarn) p.ptWarn = Math.max(0, p.ptWarn - 1);
    if (p.age <= 21 && k.jeu >= 13 && playerOvr(p) < p.pot && rnd() < (k.jeu - 12) * .015) bumpAttr(p, 1);
    if (p.injury > 0 && k.phy > 10) p.injury = Math.max(1, p.injury - (k.phy - 10) * .4);
  }
  G.staff.assistant = clamp(Math.round(k.tac / 4), 1, 5);
  // en mode directeur sportif, c'est l'entraîneur qui hiérarchise le groupe (sauf statut promis dans un contrat)
  const promised = new Map(sq.filter(p => p.statusPromised).map(p => [p.id, p.status]));
  assignStatuses(G, G.clubId, true);
  for (const [id, st] of promised) { const p = getPlayer(G, id); if (p) p.status = st; }
  // respect du vestiaire envers l'entraîneur : réputation, résultats, gestion humaine
  c.respect = clamp((c.respect ?? clamp(c.rep + 10, 20, 90)) + (recentPts(G) - 1.35) * 1.5 + (k.hum - 10) * .15, 0, 100);
  if (k.hum < 8 && rnd() < .07) { const a = pick(sq), b = pick(sq.filter(x => x !== a)); if (a && b && !a.conflict) { a.conflict = b.id; b.conflict = a.id; a.morale -= 6; news(G, `💢 ${c.name} s'est accroché avec ${a.name} à l'entraînement. Sa gestion humaine pose question.`, 'warn'); } }
  if (k.dis >= 14) for (const p of sq) if (p.conflict && rnd() < .12) { const o = getPlayer(G, p.conflict); p.conflict = null; if (o) o.conflict = null; }
  if (k.dis < 8 && rnd() < .05) { const p = pick(sq); if (p) { p.morale -= 4; news(G, `⚠ Écart de conduite de ${p.name} (retard, sortie nocturne). Le cadre fixé par ${c.name} est jugé trop laxiste.`, 'warn'); } }
  if ((c.respect ?? 60) < 30 && !(G.consqDone ||= {})['lostRoom:' + G.season]) { G.consqDone['lostRoom:' + G.season] = 1; news(G, `📰 Le vestiaire ne suit plus ${c.name} : plusieurs cadres remettent en cause ses choix.`, 'warn'); G.board.conf = clamp(G.board.conf - 5, 0, 100); }
  // demandes en retard
  for (const q of G.coachReqs || []) if (q.status === 'open' && G.week > q.deadline) {
    q.status = 'failed'; c.relation = clamp(c.relation - q.weight, 0, 100);
    news(G, `🧢 ${c.name} est mécontent : sa demande (« ${q.title} ») n'a pas été satisfaite.`, 'warn');
  }
  // relation dégradée : menace puis démission
  if (c.relation < 20 && !G.coachThreat) { G.coachThreat = G.week; addDecision(G, { key: 'coachThreat:' + G.season, kind: 'coachThreat', from: c.name, icon: '🧢', title: `${c.name} menace de démissionner`, text: `${c.name} estime ne pas être soutenu par la direction sportive (relation ${Math.round(c.relation)} %). Il demande un geste fort.` }); }
  if (c.relation < 8 && G.week - (G.coachThreat ?? G.week) > 3) { coachLeaves(G, `${c.name} démissionne : il ne se sent plus soutenu.`, 0); return; }
  // nouvelle demande : au plus une ouverte à la fois, toutes les 3 semaines environ
  if ((G.coachReqs || []).some(q => q.status === 'open') || G.week - (G.lastCoachReq ?? -99) < 3 || rnd() < .35) return;
  const lr = leagueRoundAt(G), R = leagueRoundsTotal(G), mid = Math.floor(R / 2), win = windowOpen(G);
  const avg = Object.keys(ROLES).map(pos => lineStrength(G, pos));
  const mean = avg.reduce((a, b) => a + b, 0) / avg.length;
  const weakest = Object.keys(ROLES).map((pos, i) => [pos, avg[i] - (st.likes.includes(pos) ? 4 : 0)]).sort((a, b) => a[1] - b[1])[0];
  const opts = [];
  if (win && weakest[1] < mean - 2) opts.push(() => {
    const pos = weakest[0], min = Math.round(Math.max(mean, lineStrength(G, pos) + 3));
    return { kind: 'reinforce', pos, min, weight: 12, deadline: G.week + (lr < 6 ? 6 - lr : mid + 4 - lr) + 1, title: `Recruter un ${ROLES[pos].label.toLowerCase()} (niveau ≥ ${min})`,
      text: `${c.name} : « Il me manque un ${ROLES[pos].label.toLowerCase()}. Ce poste (${LINE_OF[pos]}) est notre point faible. Il me faut un joueur d'un niveau d'au moins ${min} avant la fin du mercato. » Style ${st.label} : ${st.tip}` };
  });
  const surplus = sq.filter(p => !p.listed && !p.loan && p.age >= 24 && STATUS_ORDER.indexOf(p.status || 'rot') >= 3 && p.wage > 0).sort((a, b) => b.wage - a.wage)[0];
  if (win && surplus) opts.push(() => ({ kind: 'sell', pid: surplus.id, weight: 6, deadline: G.week + 4, title: `Se séparer de ${surplus.name}`,
    text: `${c.name} : « ${surplus.name} ne rentre pas dans mes plans (${STATUS[surplus.status].label}, ${wageM(surplus.wage)}). Je préfère libérer de la masse salariale et une place dans le groupe. »` }));
  const key = sq.filter(p => p.contract <= 1 && STATUS_ORDER.indexOf(p.status || 'rot') <= 1 && !p.noRenew).sort((a, b) => playerOvr(b) - playerOvr(a))[0];
  if (key && lr >= 6) opts.push(() => ({ kind: 'extend', pid: key.id, weight: 10, deadline: G.week + 8, title: `Prolonger ${key.name}`,
    text: `${c.name} : « ${key.name} est essentiel pour moi et son contrat se termine en juin ${G.season + key.contract}. Il faut le prolonger. »` }));
  const prospect = G.players.filter(p => p.academy && p.club === G.clubId).sort((a, b) => b.pot - a.pot)[0];
  if (prospect && st.k === 'jeunes') opts.push(() => ({ kind: 'promote', pid: prospect.id, weight: 5, deadline: G.week + 3, title: `Promouvoir ${prospect.name} en équipe première`,
    text: `${c.name} : « J'ai vu ${prospect.name} (${prospect.age} ans) à l'entraînement. Je veux l'intégrer au groupe professionnel. »` }));
  const lowStaff = Object.entries(G.staffPeople || {}).filter(([k]) => ['physio', 'coach'].includes(k)).sort((a, b) => a[1].lvl - b[1].lvl)[0];
  if (lowStaff && lowStaff[1].lvl <= 2) opts.push(() => ({ kind: 'staff', role: lowStaff[0], weight: 5, deadline: G.week + 6, title: `Recruter un meilleur ${STAFF[lowStaff[0]].label.toLowerCase()}`,
    text: `${c.name} : « Notre ${STAFF[lowStaff[0]].label.toLowerCase()} (${lowStaff[1].name}, ${'★'.repeat(lowStaff[1].lvl)}) n'est pas au niveau. J'ai besoin d'un meilleur profil (au moins ★★★). »` }));
  if (!opts.length) return;
  const already = q => (G.coachReqs || []).some(x => x.season === G.season && x.kind === q.kind && (x.pid ?? x.pos ?? x.role) === (q.pid ?? q.pos ?? q.role));
  const fresh = opts.map(f => f()).filter(q => !already(q));
  if (!fresh.length) return;
  const q = { id: G.decSeq++, status: 'open', week: G.week, season: G.season, ...pick(fresh) };
  (G.coachReqs ||= []).unshift(q);
  G.lastCoachReq = G.week;
  addDecision(G, { key: 'coachReq:' + q.id, kind: 'coachReq', ref: q.id, from: c.name + ' (entraîneur)', icon: '🧢', title: 'Demande de l\'entraîneur : ' + q.title, text: q.text + ` (réponse attendue, échéance : ${weekLabel(G, Math.min(q.deadline, G.schedule.length - 1))})` });
}
// Une demande acceptée doit ensuite être réellement satisfaite
function coachReqCheck(G) {
  if (!isDS(G)) return;
  for (const q of G.coachReqs || []) {
    if (q.status !== 'accepted') continue;
    let ok = false;
    if (q.kind === 'reinforce') ok = clubPlayers(G, G.clubId).some(p => p.joinedSeason === G.season && (p.joinWeek ?? 0) >= q.week && playerRoleRating(p, q.pos) * familiarity(p, q.pos) >= q.min);
    if (q.kind === 'sell') ok = getPlayer(G, q.pid)?.club !== G.clubId;
    if (q.kind === 'extend') { const p = getPlayer(G, q.pid); ok = p && p.club === G.clubId && p.contract >= 2; }
    if (q.kind === 'staff') ok = (G.staffPeople?.[q.role]?.lvl || 0) >= 3;
    if (q.kind === 'promote') ok = !getPlayer(G, q.pid)?.academy;
    if (ok) { q.status = 'done'; G.coach.relation = clamp(G.coach.relation + q.weight, 0, 100); news(G, `🧢 ${G.coach.name} est satisfait : « ${q.title} » ✔`, 'info'); }
    else if (G.week > q.deadline) { q.status = 'failed'; G.coach.relation = clamp(G.coach.relation - q.weight * 1.3, 0, 100); news(G, `🧢 ${G.coach.name} : tu avais promis « ${q.title} », ce n'est pas fait. Sa confiance en toi baisse.`, 'warn'); }
  }
}
DECISION_OPTS.coachReq = d => {
  const q = G.coachReqs?.find(x => x.id === d.ref);
  const extra = { reinforce: [['scout', 'Lancer une mission de recrutement et accepter', 'primary']], sell: [['list', 'Le placer sur la liste des transferts', 'primary']], extend: [['nego', 'Ouvrir la négociation de prolongation', 'primary']],
    staff: [['go', 'Accepter (ouvrir le staff)', 'primary']], promote: [['promote', 'Le promouvoir maintenant', 'primary']] }[q?.kind] || [];
  return [...extra, ['accept', 'Accepter, je m\'en occupe'], ['refuse', 'Refuser', 'danger']];
};
DECISION_OPTS.coachThreat = d => [['support', 'Lui renouveler publiquement ta confiance', 'primary'], ['budget', 'Lui accorder un renfort (budget transferts +10 %)'], ['fire', 'Le licencier', 'danger']];
const __decide = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || !['coachReq', 'coachThreat'].includes(d.kind)) return __decide(id, opt);
  const c = G.coach; let msg = '';
  if (d.kind === 'coachReq') {
    const q = G.coachReqs.find(x => x.id === d.ref);
    if (opt === 'refuse') { q.status = 'refused'; c.relation = clamp(c.relation - q.weight * .8, 0, 100); msg = `${c.name} prend acte de ton refus, sans plaisir.`; c.refused = (c.refused || 0) + 1; if (c.refused >= 2 && (c.skills?.hum ?? 10) < 12) scheduleConsq(G, rint(1, 3), 'pressLeak', {}); }
    else {
      q.status = 'accepted'; c.relation = clamp(c.relation + 2, 0, 100); msg = 'Demande acceptée : elle sera vérifiée avant l\'échéance.';
      if (opt === 'scout' && typeof startMission === 'function') { startMission(G, { pos: q.pos, maxAge: 30, minPot: Math.max(40, q.min - 5), region: 'europe' }); msg += ' Mission de recrutement lancée.'; }
      if (opt === 'list') { const p = getPlayer(G, q.pid); if (p) p.listed = true; }
      if (opt === 'nego') renewModal(q.pid);
      if (opt === 'staff' || opt === 'go') setTimeout(() => show('staff'), 0);
      if (opt === 'promote') { const p = getPlayer(G, q.pid); if (p?.academy) promoteYouth(G, p); }
    }
  } else {
    if (opt === 'support') { const ok = rnd() < .6; c.relation = clamp(c.relation + (ok ? 15 : 4), 0, 100); msg = ok ? `${c.name} se sent soutenu et reste.` : `${c.name} reste, mais doute encore.`; }
    else if (opt === 'budget') { G.board.transfer = roundMoney(G.board.transfer * 1.1); c.relation = clamp(c.relation + 18, 0, 100); msg = `${c.name} apprécie le geste.`; }
    else { fireCoach(); msg = 'Entraîneur licencié.'; }
    G.coachThreat = null;
  }
  d.done = opt; d.answer = msg; news(G, `🧢 ${d.title} — ${msg}`, 'info');
  save(); toast(msg); if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
};
// Conséquences différées de tes choix
function scheduleConsq(G, weeks, kind, data) { (G.consq ||= []).push({ week: G.week + weeks, kind, data }); }
function consqWeekly(G) {
  const due = (G.consq || []).filter(x => G.week >= x.week);
  G.consq = (G.consq || []).filter(x => G.week < x.week);
  for (const x of due) {
    if (x.kind === 'fireBacklash') {
      const cadres = hierarchy(G).leaders.filter(p => (p.trust ?? 55) > 55);
      if (x.data.popular) { G.fans = clamp((G.fans ?? 60) - 6, 0, 100); for (const p of cadres) { p.morale = clamp(p.morale - 7, 5, 100); p.trust = clamp((p.trust ?? 55) - 5, 0, 100); } news(G, `📰 Le départ de ${x.data.name} passe mal : les supporters et les cadres (${cadres.map(p => p.name).join(', ') || 'aucun'}) le regrettent.`, 'warn'); }
      else { G.fans = clamp((G.fans ?? 60) + 2, 0, 100); news(G, `📰 Les supporters approuvent le départ de ${x.data.name}.`, 'info'); }
    }
    if (x.kind === 'pressLeak' && G.coach && G.coach.relation < 35) {
      G.fans = clamp((G.fans ?? 60) - 3, 0, 100); G.board.conf = clamp(G.board.conf - 3, 0, 100);
      news(G, `📰 ${G.coach.name} dans la presse : « La direction sportive ne m'écoute pas. » Le président n'apprécie pas.`, 'press');
    }
    if (x.kind === 'leaderSold') {
      for (const p of clubPlayers(G, G.clubId)) if (x.data.mates.includes(p.id)) p.morale = clamp(p.morale - 5, 5, 100);
      news(G, `🤝 Le départ de ${x.data.name}, cadre du vestiaire, laisse un vide : ses proches sont affectés.`, 'warn');
    }
    if (x.kind === 'signingFlop') {
      const p = getPlayer(G, x.data.pid);
      if (p && p.club === G.clubId && (p.recentMin || []).reduce((a, b) => a + b, 0) < 90 && G.coach) { p.morale = clamp(p.morale - 10, 5, 100); if (rnd() < .4) p.wantsOut = true; news(G, `🧢 ${G.coach.name} ne fait pas jouer ${p.name}, recruté sans son accord : « Ce n'est pas le profil que je voulais. »`, 'warn'); }
    }
  }
  // départ d'un cadre : effet sur ses proches
  const now = new Set(hierarchy(G).leaders.map(p => p.id));
  for (const id of G.lastLeaders || []) if (!now.has(id)) { const p = getPlayer(G, id); if (p && p.club !== G.clubId) scheduleConsq(G, 0, 'leaderSold', { name: p.name, mates: clubPlayers(G, G.clubId).filter(m => langOf(m) === langOf(p)).map(m => m.id) }); }
  G.lastLeaders = [...now];
}
function coachLeaves(G, why, indemn) {
  const c = G.coach;
  if (!c.interim) scheduleConsq(G, 1, 'fireBacklash', { name: c.name, popular: (c.respect ?? 60) > 60 || c.w > c.l * 1.5 });
  if (indemn) flow(G, myClub(G), -indemn, 'staff');
  (G.coachHist ||= []).unshift({ ...c, until: `${weekLabel(G)} ${G.season}`, why });
  news(G, `🧢 ${why}${indemn ? ` Indemnité : ${money(indemn)}.` : ''} L'adjoint assure l'intérim : recrute un nouvel entraîneur (menu Entraîneur).`, 'board');
  G.coach = { ...newCoach(myClub(G).rep, 1), name: 'Intérim — ' + (G.staffPeople?.assistant?.name || 'adjoint'), interim: true, relation: 50, contract: 1 };
  for (const q of G.coachReqs || []) if (q.status === 'open' || q.status === 'accepted') q.status = 'cancelled';
  G.coachThreat = null;
  G.board.conf = clamp(G.board.conf - 4, 0, 100);
}
function fireCoach() { const c = G.coach; coachLeaves(G, `${c.name} est démis de ses fonctions.`, c.interim ? 0 : roundMoney(c.wageW * 52 * c.contract * .6)); }
function coachMarket(G) {
  if (!G.coachMarket || G.week - G.coachMarket.week >= 4 || G.coachMarket.season !== G.season) {
    const rep = myClub(G).rep;
    G.coachMarket = { week: G.week, season: G.season, list: Array.from({ length: 5 }, () => { const x = newCoach(rep + rint(-20, 15)); x.id = 'c' + rint(1e5, 1e6); x.employer = rnd() < .5 ? pick(G.clubs.filter(c => c.id !== G.clubId)).name : null; x.comp = x.employer ? x.wageW * rint(10, 30) : 0; return x; }) };
  }
  return G.coachMarket.list;
}
function vCoach(el) {
  if (!G.coach) { G.coach = newCoach(myClub(G).rep); G.coachReqs ||= []; }
  const c = G.coach, st = coachStyle(c), mk = coachMarket(G), lvl = l => '★'.repeat(l) + '☆'.repeat(5 - l);
  const reqs = (G.coachReqs || []).slice(0, 12);
  const SL = { open: 'En attente de ta réponse', accepted: 'Acceptée — à réaliser', done: 'Satisfaite ✔', failed: 'Non tenue ✘', refused: 'Refusée', cancelled: 'Annulée' };
  el.innerHTML = `<div class="grid2">
    <section class="card"><h2>🧢 Entraîneur principal</h2>
      <div class="row gap"><div class="coach-ava">${esc(c.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</div>
        <div class="grow"><b class="big">${esc(c.name)}</b>${c.interim ? ' <span class="tag-f">Intérim</span>' : ''}<br><small>${c.age} ans · ${esc(c.nat)} · ${lvl(c.lvl)} · ${esc(st.label)} · système ${esc(c.formation)}</small><br><small>Contrat jusqu'en juin ${G.season + c.contract} · ${wageM(c.wageW)}</small></div></div>
      <div class="gauges mt"><div><small>Relation avec toi</small>${meter(c.relation)}</div><div><small>Confiance du président</small>${meter(G.board.conf)}</div></div>
      <p>Bilan cette saison : ${c.w} V · ${c.d} N · ${c.l} D. ${esc(st.tip)} Personnalité : <b>${esc(c.perso || '—')}</b>.</p>
      <div class="skills">${skillBars(c)}</div>
      <p>Adéquation style / effectif : ${meter(coachFit(G, c))} · Respect du vestiaire : ${meter(c.respect ?? 60)}</p>
      <p class="hint">Il compose l'équipe et dirige les matchs avec son système. Son niveau améliore la familiarité tactique et le moral. Ignorer ses demandes dégrade votre relation ; sous 20 %, il menace de partir.</p>
      <div class="row gap wrap"><button class="btn" id="cExt" ${c.interim ? 'disabled' : ''}>Prolonger (+1 saison, +10 %)</button><button class="btn danger" id="cFire" ${c.interim ? 'disabled' : ''}>Licencier (${money(c.interim ? 0 : roundMoney(c.wageW * 52 * c.contract * .6))})</button></div></section>
    <section class="card"><h2>📋 Ses demandes</h2>${reqs.length ? `<table class="tbl compact">${reqs.map(q => `<tr><td>${q.season} · ${esc(weekLabel(G, Math.min(q.week, G.schedule.length - 1)))}</td><td>${esc(q.title)}</td><td class="${q.status === 'done' ? 'pos' : ['failed', 'refused'].includes(q.status) ? 'neg' : 'warn'}">${SL[q.status]}</td></tr>`).join('')}</table>` : '<p class="muted">Aucune demande pour l\'instant.</p>'}</section></div>
  <section class="card"><div class="row gap wrap"><h2 class="grow">🔁 Mercato des entraîneurs</h2><label>Style <select id="cmF"><option value="">Tous</option>${COACH_STYLES.map(s => `<option value="${s.k}" ${CM_FILTER === s.k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label><label>Tri <select id="cmS"><option value="lvl">Niveau</option><option value="fit" ${CM_SORT === 'fit' ? 'selected' : ''}>Adéquation à l'effectif</option><option value="wage" ${CM_SORT === 'wage' ? 'selected' : ''}>Salaire</option></select></label></div>
    <div class="coach-grid">${mk.filter(x => !CM_FILTER || x.style === CM_FILTER).map(x => ({ x, fit: coachFit(G, x) })).sort((a, b) => CM_SORT === 'fit' ? b.fit - a.fit : CM_SORT === 'wage' ? a.x.wageW - b.x.wageW : b.x.lvl - a.x.lvl).map(({ x, fit }) => `<div class="coach-card">
      <div class="row gap"><div class="coach-ava sm">${esc(x.name.split(' ').map(w => w[0]).join(''))}</div><div class="grow"><b>${esc(x.name)}</b><br><small>${x.age} ans · ${esc(x.nat)} · ${esc(x.perso)} · ${lvl(x.lvl)}</small></div></div>
      <small>${esc(coachStyle(x).label)} (${esc(x.formation)}) · ${x.employer ? 'en poste à ' + esc(x.employer) : 'libre'}</small>
      <div class="skills sm">${skillBars(x)}</div>
      <small>Adéquation à ton effectif : <b class="${fit >= 60 ? 'pos' : fit < 45 ? 'neg' : ''}">${fit} %</b> · demande ${wageM(x.wageW)}${x.comp ? ` · indemnité ${money(x.comp)}` : ''}</small><br>
      <small class="muted">Parcours : ${x.history.map(esc).join(', ')}</small>
      <div class="row gap mt"><button class="btn sm" data-iv="${x.id}">Entretien</button><button class="btn sm primary" data-hc="${x.id}">Négocier</button></div></div>`).join('')}</div>
    <p class="hint">L'entretien révèle ses exigences (budget, adjoint) avant de négocier. Une adéquation faible ralentit l'apprentissage tactique ; une gestion humaine ou une discipline faible créent des problèmes dans le vestiaire. Liste renouvelée toutes les 4 semaines.</p></section>
  ${(G.coachHist || []).length ? `<section class="card"><h2>Historique</h2><table class="tbl compact">${G.coachHist.map(h => `<tr><td>${esc(h.name)}</td><td>${h.since} → ${esc(h.until)}</td><td>${h.w} V · ${h.d} N · ${h.l} D</td><td>${esc(h.why)}</td></tr>`).join('')}</table></section>` : ''}`;
  $('#cExt').onclick = () => { c.contract++; c.wageW = roundMoney(c.wageW * 1.1); c.relation = clamp(c.relation + 8, 0, 100); news(G, `🧢 ${c.name} prolonge jusqu'en juin ${G.season + c.contract}.`, 'board'); save(); vCoach(el); };
  $('#cFire').onclick = () => confirmBox(`Licencier ${esc(c.name)} ? Indemnité ${money(roundMoney(c.wageW * 52 * c.contract * .6))}. Le président et les joueurs proches de lui réagiront.`, () => { fireCoach(); save(); vCoach(el); }, 'Licencier', true);
  $('#cmF').onchange = e => { CM_FILTER = e.target.value; vCoach(el); };
  $('#cmS').onchange = e => { CM_SORT = e.target.value; vCoach(el); };
  el.querySelectorAll('[data-iv]').forEach(b => b.onclick = () => coachInterview(mk.find(m => m.id === b.dataset.iv)));
  el.querySelectorAll('[data-hc]').forEach(b => b.onclick = () => coachNegotiate(mk.find(m => m.id === b.dataset.hc), el));
  el.querySelectorAll('[data-hcOld]').forEach(b => b.onclick = () => {
    const x = mk.find(m => m.id === b.dataset.hc), sev = c.interim ? 0 : roundMoney(c.wageW * 52 * c.contract * .6), cost = x.comp + sev + x.wageW * 4;
    confirmBox(`Engager ${esc(x.name)} (${lvl(x.lvl)}, ${esc(coachStyle(x).label)}) pour ${x.contract + 1} saison(s) à ${wageM(x.wageW)} ? Coût immédiat : <b>${money(cost)}</b> (indemnités et prime).`, () => {
      if (myClub(G).budget < cost) return toast('Trésorerie insuffisante.', 'err');
      if (x.lvl * 18 > myClub(G).rep + 20 && rnd() < .5) { G.coachMarket.list = mk.filter(m => m !== x); vCoach(el); return toast(`${x.name} décline : le projet n'est pas assez ambitieux.`, 'err'); }
      if (!c.interim) (G.coachHist ||= []).unshift({ ...c, until: `${weekLabel(G)} ${G.season}`, why: 'Remplacé' });
      flow(G, myClub(G), -cost, 'staff');
      G.coach = { ...x, contract: x.contract + 1, relation: 65, since: G.season, w: 0, d: 0, l: 0 };
      G.coachMarket.list = mk.filter(m => m !== x);
      G.tactics.formation = x.formation; G.tacFam[x.formation] ??= 40;
      news(G, `🧢 ${x.name} est le nouvel entraîneur (${coachStyle(x).label}, système ${x.formation}).`, 'board');
      save(); vCoach(el);
    }, 'Engager');
  });
}
// Branchements hebdomadaires et saison
const __gestionWeekly = gestionWeekly;
gestionWeekly = function (G, full) { __gestionWeekly(G, full); if (full) { try { consqWeekly(G); coachReqCheck(G); coachWeekly(G); } catch (e) { console.error(e); } } };
const __endSeason2 = endSeason;
endSeason = function (G) {
  const S = __endSeason2(G);
  if (isDS(G) && G.coach) {
    const c = G.coach; c.contract--; c.w = c.d = c.l = 0;
    if (c.contract <= 0 && !c.interim) addDecision(G, { key: 'coachEnd:' + G.season, kind: 'coachThreat', from: c.name, icon: '🧢', title: `Contrat de ${c.name} terminé`, text: `Le contrat de ${c.name} arrive à son terme. Lui renouveler ta confiance le prolonge d'une saison ; sinon, licencie-le et engage un remplaçant.` });
    if (c.contract <= 0) c.contract = 1;
  }
  return S;
};
// Date d'arrivée des recrues (pour vérifier les demandes de renfort)
const __dealComplete = dealComplete;
dealComplete = function (d) {
  const p = getPlayer(G, d.pid); if (p) p.joinWeek = G.week;
  __dealComplete(d);
  if (isDS() && p && G.coach && !G.coach.interim) {
    const asked = (G.coachReqs || []).some(q => q.kind === 'reinforce' && ['open', 'accepted'].includes(q.status) && playerRoleRating(p, q.pos) * familiarity(p, q.pos) >= q.min - 3);
    const liked = coachStyle(G.coach).likes.includes(p.pos);
    if (!asked && !liked && (G.coach.skills?.adapt ?? 10) < 12) { G.coach.relation = clamp(G.coach.relation - 4, 0, 100); scheduleConsq(G, 6, 'signingFlop', { pid: p.id }); news(G, `🧢 ${G.coach.name} n'a pas été consulté pour le recrutement de ${p.name}. Il le fait savoir.`, 'warn'); }
    else G.coach.relation = clamp(G.coach.relation + 3, 0, 100);
  }
};

let CM_FILTER = '', CM_SORT = 'lvl';
function skillBars(c) {
  if (!c.skills) coachLevel(c);
  return Object.entries(COACH_SKILLS).map(([k, l]) => `<div class="attr" title="${esc(COACH_SKILL_TIP[k])}"><span>${l}</span>${bar(c.skills[k], 20, 'a' + Math.ceil(c.skills[k] / 5))}<b>${c.skills[k]}</b></div>`).join('');
}
function coachDemands(x) {
  x.dem ||= { wageM: monthly(x.wageW), yrs: x.lvl >= 4 ? 3 : 2, budget: x.lvl >= 4 ? 1.15 : x.perso === 'Ambitieux' ? 1.1 : 1, assistant: rnd() < .45, patience: x.perso === 'Caractériel' ? 1 : 2 };
  return x.dem;
}
function coachInterview(x) {
  const d = coachDemands(x), me = myClub(G);
  const ambition = x.rep > me.rep + 12 ? 'Il hésite : le club lui paraît en dessous de son niveau.' : x.rep < me.rep - 20 ? 'Il est très motivé par ce défi.' : 'Le projet l\'intéresse.';
  modal(`<h2>Entretien avec ${esc(x.name)}</h2><p>« Je joue en ${esc(x.formation)}, ${esc(coachStyle(x).label.toLowerCase())}. ${esc(coachStyle(x).tip)} »</p>
    <ul><li>Salaire attendu : <b>${money(d.wageM)}/mois</b> sur ${d.yrs} saisons</li>
    <li>Budget transferts : ${d.budget > 1 ? `veut une hausse de <b>${Math.round((d.budget - 1) * 100)} %</b>` : 'fera avec les moyens actuels'}</li>
    <li>${d.assistant ? 'Veut venir avec <b>son propre adjoint</b> (coût supplémentaire, ton adjoint actuel partirait)' : 'Accepte de travailler avec le staff en place'}</li>
    <li>Personnalité : ${esc(x.perso)} · ${ambition}</li></ul>
    <p class="hint">Points faibles visibles : ${Object.entries(x.skills).filter(([, v]) => v < 9).map(([k]) => COACH_SKILLS[k]).join(', ') || 'aucun'}.</p>`);
}
function coachNegotiate(x, el) {
  const d = coachDemands(x), c = G.coach, me = myClub(G);
  const sev = c.interim ? 0 : roundMoney(c.wageW * 52 * c.contract * .6);
  modal(`<h2>Négocier avec ${esc(x.name)}</h2><p>Demandes : ${money(d.wageM)}/mois, ${d.yrs} saisons${d.budget > 1 ? `, budget transferts +${Math.round((d.budget - 1) * 100)} %` : ''}${d.assistant ? ', venir avec son adjoint' : ''}.</p>
    <div class="form-grid"><label>Salaire (€/mois) <input id="nW" type="number" step="5000" value="${d.wageM}"></label>
      <label>Durée <select id="nY">${[1, 2, 3, 4].map(y => `<option ${y === d.yrs ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" id="nB" ${d.budget > 1 ? 'checked' : ''}> Promettre la hausse du budget transferts</label>
      <label class="chk"><input type="checkbox" id="nA" ${d.assistant ? 'checked' : ''}> Accepter son adjoint</label></div>
    <p>Coûts immédiats : ${x.comp ? `indemnité ${money(x.comp)} + ` : ''}${sev ? `départ de ${esc(c.name)} ${money(sev)} + ` : ''}prime ${money(d.wageM)} · trésorerie ${money(me.budget)}</p>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="nOk">Proposer</button></div><p class="hint" id="nR"></p>`, 'wide');
  $('#nOk').onclick = () => {
    const w = +$('#nW').value, y = +$('#nY').value, bud = $('#nB').checked, asst = $('#nA').checked;
    const cost = x.comp + sev + w + (asst ? monthly(staffWage(3, G)) * 2 : 0);
    if (cost > me.budget) return $('#nR').textContent = '❌ Trésorerie insuffisante.';
    let score = w / d.wageM - (d.budget > 1 && !bud ? .12 : 0) - (d.assistant && !asst ? .1 : 0) - (Math.abs(y - d.yrs) > 1 ? .05 : 0) - Math.max(0, x.rep - me.rep - 12) / 100;
    if (score < .95) {
      d.patience--;
      if (d.patience < 0) { G.coachMarket.list = G.coachMarket.list.filter(m => m !== x); closeModal(); vCoach(el); return toast(`${x.name} met fin aux discussions.`, 'err'); }
      return $('#nR').textContent = `❌ ${x.name} refuse (proposition à ${Math.round(score * 100)} % de ses attentes). ${d.patience ? 'Dernière chance.' : ''}`;
    }
    if (!c.interim) (G.coachHist ||= []).unshift({ ...c, until: `${weekLabel(G)} ${G.season}`, why: 'Remplacé' });
    if (!c.interim) scheduleConsq(G, 1, 'fireBacklash', { name: c.name, popular: (c.respect ?? 60) > 60 || c.w > c.l * 1.5 });
    flow(G, me, -cost, 'staff');
    if (bud) { G.board.transfer = roundMoney(G.board.transfer * d.budget); G.board.conf = clamp(G.board.conf - 3, 0, 100); }
    if (asst && G.staffPeople) { const a = newStaffPerson('assistant', clamp(Math.round(x.skills.tac / 5), 2, 5)); a.name = 'Adjoint de ' + x.name.split(' ').pop(); G.staffPeople.assistant = a; }
    G.coach = { ...x, wageW: weekly(w), contract: y, relation: 65 + (bud ? 8 : 0), since: G.season, w: 0, d: 0, l: 0, respect: clamp(x.rep + 10, 20, 90) };
    delete G.coach.dem; delete G.coach.employer; delete G.coach.comp;
    G.coachMarket.list = G.coachMarket.list.filter(m => m !== x);
    G.tactics.formation = x.formation; G.tacFam[x.formation] ??= 40;
    (G.coachReqs || []).forEach(q => { if (['open', 'accepted'].includes(q.status)) q.status = 'cancelled'; });
    news(G, `🧢 ${x.name} est le nouvel entraîneur (${coachStyle(x).label}, ${x.formation}) jusqu'en juin ${G.season + y}, ${money(w)}/mois.${bud ? ' Le budget transferts est relevé, à la demande du coach.' : ''}`, 'board');
    closeModal(); save(); vCoach(el);
  };
}

// Bouton principal : le directeur sportif ne joue pas les matchs
const __renderTop2 = renderTop;
renderTop = function () {
  __renderTop2();
  const go = $('#btnGo');
  if (isDS() && go && !go.classList.contains('blocked') && G.week < G.schedule.length) go.textContent = weekFixtures(G).some(f => f.h === G.clubId || f.a === G.clubId) ? 'Jour de match ▶' : 'Continuer ▶';
};
