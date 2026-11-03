// ============================================================
//  Cellule de recrutement (lot 2)
//  Remplace la supervision individuelle, les anciennes missions et le
//  « brouillard » fixe : la connaissance des joueurs vient de rapports
//  datés, rédigés par des personnes aux compétences différentes.
//  Séparation : infos publiques (estimOvrPublic) / connaissance du club
//  (G.know) / avis d'un recruteur (rapports) / vérité cachée (playerOvr).
// ============================================================
const ZONES = { FRA: 'France', ENG: 'Angleterre', ESP: 'Espagne', GER: 'Allemagne', ITA: 'Italie', EUR: 'Reste de l\'Europe', LIBRES: 'Joueurs libres' };
const ZONE_LANG = { FRA: 'Français', ENG: 'Anglais', ESP: 'Espagnol', GER: 'Allemand', ITA: 'Italien', EUR: 'Anglais', LIBRES: null };
const ZONE_COST = { home: 1500, big: 4000, EUR: 5500, LIBRES: 800 };
const CELL_ROLES = { chef: 'Responsable du recrutement', recruteur: 'Recruteur', analyste: 'Analyste de recrutement' };
const SCOUT_SKILLS = { niveau: 'Évaluation du niveau', potentiel: 'Évaluation du potentiel', observation: 'Capacité d\'observation', redaction: 'Rédaction et synthèse', fiabilite: 'Fiabilité' };
const SCOUT_BIAS = { aucun: 'Aucun biais marqué', jeunes: 'Surévalue les jeunes', physique: 'Aime les profils physiques', technique: 'Aime les techniciens', prudent: 'Note sévèrement', optimiste: 'Note généreusement' };
const HORIZONS = { now: 'Immédiat', next: 'Prochain mercato', succession: 'Succession (12-24 mois)' };
const AVAIL = { any: 'Toute situation', listed: 'Transférables / mécontents', endContract: 'Fin de contrat (≤ 1 an)', loan: 'Prêt possible', free: 'Libres' };
EXP_LABELS.scouting = 'Recrutement (observations)';

function absWeek(G, w = G.week) { return G.season * 100 + w; }
function weeksAgo(G, aw) { const s = Math.floor(aw / 100), w = aw % 100; return (G.season - s) * (G.schedule.length || 60) + (G.week - w); }
function homeZone(G) { return G.real?.country && ZONES[G.real.country] ? G.real.country : 'FRA'; }
function zoneOf(G, p) {
  if (p.club == null) return 'LIBRES';
  const c = getClub(G, p.club);
  if (!c?.foreign) return homeZone(G);
  return ZONES[c.country] && c.country !== 'LIBRES' ? c.country : 'EUR';
}
function zoneCost(G, z) { return z === 'LIBRES' ? ZONE_COST.LIBRES : z === homeZone(G) ? ZONE_COST.home : z === 'EUR' ? ZONE_COST.EUR : ZONE_COST.big; }
// RNG annexe déterministe : génère un marché à l'affichage sans toucher au générateur de la partie
function withSideRng(key, fn) {
  const saved = RNG; let h = 2166136261;
  for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  RNG = mulberry32(h >>> 0);
  try { return fn(); } finally { RNG = saved; }
}

// ---------- Personnel ----------
function newScout(G, role, q) {
  const z = Object.keys(ZONES), home = homeZone(G);
  const sk = {}; for (const k of Object.keys(SCOUT_SKILLS)) sk[k] = clamp(Math.round(q + gauss() * 2.6), 1, 20);
  if (role === 'analyste') { sk.redaction = clamp(sk.redaction + 3, 1, 20); sk.observation = clamp(sk.observation - 4, 1, 20); }
  const zones = {}; for (const k of z) zones[k] = clamp(Math.round((k === home ? q + 2 : q - 6) + gauss() * 4), 0, 20);
  const fav = pick(z.filter(k => k !== 'LIBRES')); zones[fav] = clamp(zones[fav] + 6, 0, 20);
  const langs = [...new Set([ZONE_LANG[home], ...(rnd() < .6 ? [ZONE_LANG[fav]] : []), ...(rnd() < .5 ? ['Anglais'] : [])].filter(Boolean))];
  const lvl = (sk.niveau + sk.potentiel + sk.observation + sk.fiabilite) / 4;
  return { id: 'sc' + (G.cell ? G.cell.seq++ : rint(1e5, 1e6)), name: pick(STAFF_FIRST) + ' ' + pick(STAFF_LAST), age: rint(27, 63), nat: home, role, skills: sk, zones, langs,
    bias: pick(Object.keys(SCOUT_BIAS)), wageW: roundMoney(400 + Math.pow(lvl, 2.1) * 16 * (role === 'chef' ? 1.6 : 1)), contract: rint(1, 3), joined: G.season, morale: 65,
    history: [pick(['Ancien joueur professionnel', 'Ancien entraîneur de jeunes', 'Analyste vidéo reconverti', 'Recruteur dans un club voisin', 'Journaliste spécialisé', 'Ancien agent'])], reports: 0, assign: [], relations: {} };
}
function cellInit(G) {
  if (G.cell) return G.cell;
  const c = myClub(G), lvl = G.staffPeople?.scout?.lvl ?? G.staff?.scout ?? 2, q = 6 + lvl * 2;
  G.cell = { v: 1, seq: 1, members: [], chiefId: null, budgetM: roundMoney(15000 + Math.pow(c.rep, 2) * 14), spent: {}, deleg: 'propose', targets: [], queue: [], raw: {}, missions: [], meetings: [], log: [], market: null };
  const size = c.rep >= 80 ? 4 : c.rep >= 65 ? 3 : c.rep >= 50 ? 2 : 1;
  const chief = newScout(G, 'chef', q); if (G.staffPeople?.scout?.name) chief.name = G.staffPeople.scout.name;
  G.cell.members.push(chief); G.cell.chiefId = chief.id;
  for (let i = 1; i < size; i++) G.cell.members.push(newScout(G, i === 3 ? 'analyste' : 'recruteur', q - 1));
  // migration des anciennes connaissances : rapports d'archive (pas de nouvelle vérité inventée)
  G.know ||= {};
  for (const id of G.known || []) { const p = getPlayer(G, id); if (p && !G.know[id]) G.know[id] = { est: playerOvr(p), err: 2, pot: p.pot, perr: 6, n: 1, last: absWeek(G), src: 'archive' }; }
  for (const s of G.scouting || []) G.cell.queue.push({ pid: s.pid, scoutId: chief.id, due: G.week + (s.left || 1) });
  G.scouting = [];
  syncScoutStaff(G);
  return G.cell;
}
function member(G, id) { return G.cell.members.find(m => m.id === id); }
function chief(G) { return member(G, G.cell.chiefId) || G.cell.members[0]; }
function scoutLevel(m) { return (m.skills.niveau + m.skills.potentiel + m.skills.observation + m.skills.fiabilite) / 4; }
// l'ancien « recruteur » du staff devient le responsable de la cellule : un seul système
function syncScoutStaff(G) {
  const ch = chief(G); if (!ch) return;
  G.staff.scout = clamp(Math.round(scoutLevel(ch) / 4), 1, 5);
  if (G.staffPeople) G.staffPeople.scout = { name: ch.name, age: ch.age, lvl: G.staff.scout, spec: 'Responsable de la cellule', wageW: 0, contract: ch.contract, cellLinked: true };
}
function load(G, m) { return m.assign.length + G.cell.queue.filter(q => q.scoutId === m.id).length * .5; }
function capacity(G, m) {
  if (m.role === 'analyste') return 0;
  const base = (.8 + m.skills.observation / 8) * (m.role === 'chef' && G.cell.members.length > 1 ? .5 : 1) * (m.morale < 35 ? .7 : 1);
  return base;
}
const __staffCostC = staffCost;
staffCost = function (G) { return __staffCostC(G) + (G.cell ? G.cell.members.reduce((s, m) => s + m.wageW, 0) : 0); };

// ---------- Connaissance : rapports et agrégation ----------
function hasAnalyst(G) { return G.cell?.members.some(m => m.role === 'analyste'); }
function errFactor(m, z) { return 1.4 - (m.zones[z] || 0) / 40 - (m.langs.includes(ZONE_LANG[z]) ? .1 : 0); }
function biasVal(m, p) {
  switch (m.bias) {
    case 'jeunes': return p.age <= 21 ? 2 : 0;
    case 'physique': return (p.attrs.phy + p.attrs.vit) / 2 >= 14 ? 2 : -.5;
    case 'technique': return (p.attrs.tec + p.attrs.dri) / 2 >= 14 ? 2 : -.5;
    case 'prudent': return -1.5;
    case 'optimiste': return 1.5;
    default: return 0;
  }
}
function lastContext(G, p) {
  for (let w = G.week - 1; w >= Math.max(0, G.week - 6); w--) { const f = weekFixtures(G, w).find(f => f.res && (f.h === p.club || f.a === p.club)); if (f) { const o = getClub(G, f.h === p.club ? f.a : f.h); return `${compName(G, f)} contre ${o.name} (${weekLabel(G, w)})`; } }
  return p.club == null ? 'Séance d\'essai et vidéos' : 'Vidéos et entraînement';
}
function makeReport(G, m, p, missionId) {
  const z = zoneOf(G, p), k = errFactor(m, z), s = m.skills;
  const key = m.id + ':' + p.id, raw = (G.cell.raw[key] ||= []);
  const sdO = (22 - s.niveau) / 3.2 * k, sdP = (22 - s.potentiel) / 2.2 * k * (p.age <= 21 ? 1.3 : .8);
  const miss = rnd() < (20 - s.fiabilite) / 100 ? gauss() * 4 : 0;
  raw.push({ o: gauss() * sdO + miss, p: gauss() * sdP });
  const n = raw.length, avgO = raw.reduce((a, r) => a + r.o, 0) / n, avgP = raw.reduce((a, r) => a + r.p, 0) / n;
  const trueO = playerOvr(p), b = biasVal(m, p);
  const mid = Math.round(trueO + avgO + b), half = Math.max(1, Math.round(sdO * 1.3 / Math.sqrt(n)));
  const pmid = Math.round(Math.max(mid, p.pot + avgP + b)), phalf = Math.max(2, Math.round(sdP * 1.3 / Math.sqrt(n)));
  const roleW = ROLES[p.pos].w, keys = Object.keys(roleW).sort((a, c) => roleW[c] - roleW[a]);
  const nItems = s.redaction >= 12 ? 2 : 1;
  const strengths = keys.slice().sort((a, c) => p.attrs[c] - p.attrs[a]).slice(0, nItems).map(x => ATTRS[x]);
  const reserves = keys.slice().sort((a, c) => p.attrs[a] - p.attrs[c]).slice(0, nItems).map(x => ATTRS[x]);
  const unknown = [], known = [];
  if (n >= 2 && s.redaction >= 10) known.push(`Personnalité : ${p.pers}`); else unknown.push('Personnalité');
  if (n >= 3 && s.fiabilite >= 12) known.push(`Physique : ${p.frag >= 13 ? 'fragile' : p.frag <= 5 ? 'très solide' : 'normal'}`); else unknown.push('Résistance physique');
  unknown.push('Ambitions salariales exactes');
  const feeEst = p.club == null ? 0 : roundMoney(p.value * (1 + gauss() * (s.redaction >= 12 ? .08 : .2)));
  const wageEst = roundMoney(monthly(demandWage(G, p, myClub(G))) * (1 + gauss() * .15));
  const r = { id: 'r' + G.cell.seq++, pid: p.id, by: m.id, byName: m.name, at: absWeek(G), label: `${weekLabel(G)} ${G.season}`, n, ctx: lastContext(G, p), lo: mid - half, hi: mid + half, plo: pmid - phalf, phi: pmid + phalf,
    conf: clamp(Math.round(100 - half * 9), 5, 95), strengths, reserves, known, unknown, feeEst, wageEst, zone: z, mission: missionId || null, _true: trueO };
  (G.reports ||= []).push(r);
  if (G.reports.length > 3000) G.reports.splice(0, G.reports.length - 3000);
  m.reports++;
  aggregate(G, p.id);
  return r;
}
function aggregate(G, pid) {
  const rs = (G.reports || []).filter(r => r.pid === pid), byScout = {};
  for (const r of rs) byScout[r.by] = r; // dernier rapport de chaque auteur
  let w = 0, s = 0, pw = 0, ps = 0, last = 0;
  for (const r of Object.values(byScout)) {
    const age = Math.max(0, weeksAgo(G, r.at)) / 52, half = (r.hi - r.lo) / 2 + age * 2, ph = (r.phi - r.plo) / 2 + age * 3;
    w += 1 / half ** 2; s += (r.lo + r.hi) / 2 / half ** 2; pw += 1 / ph ** 2; ps += (r.plo + r.phi) / 2 / ph ** 2; last = Math.max(last, r.at);
  }
  if (!w) return;
  const f = hasAnalyst(G) ? .85 : 1;
  G.know ||= {};
  G.know[pid] = { est: s / w, err: Math.max(1, f / Math.sqrt(w)), pot: ps / pw, perr: Math.max(2, f / Math.sqrt(pw)), n: rs.length, authors: Object.keys(byScout).length, last };
}
function publicEst(G, p) { const h = ((p.id * 9301 + 49297) % 233280) / 233280 * 2 - 1; return Math.round(playerOvr(p) + h * 8); }
function knowOf(G, p) {
  if (p.club === G.clubId || p.loan?.from === G.clubId) return { est: playerOvr(p), err: 0, own: true };
  const k = G.know?.[p.id]; if (!k) return null;
  const stale = Math.max(0, weeksAgo(G, k.last)) / 52;
  return { ...k, err: k.err + stale * 2, stale: weeksAgo(G, k.last) > 26 };
}
knows = function (G, p) { const k = knowOf(G, p); return !!k && k.err <= 2.5; };
estOvr = function (G, p) { const k = knowOf(G, p); return k ? Math.round(k.est) : publicEst(G, p); };

// ---------- Observations demandées (« Superviser ») ----------
function bestScoutFor(G, p, exclude) {
  const z = zoneOf(G, p);
  return G.cell.members.filter(m => m.role !== 'analyste' && m.id !== exclude).sort((a, b) => (b.zones[z] - load(G, b) * 4 + b.skills.observation / 2) - (a.zones[z] - load(G, a) * 4 + a.skills.observation / 2))[0];
}
function requestObservation(G, pid, opts = {}) {
  cellInit(G);
  const p = getPlayer(G, pid); if (!p) return null;
  if (G.cell.queue.some(q => q.pid === pid && (!opts.second))) return null;
  const prev = (G.reports || []).filter(r => r.pid === pid).map(r => r.by);
  const m = opts.scoutId ? member(G, opts.scoutId) : bestScoutFor(G, p, opts.second ? prev[prev.length - 1] : null);
  if (!m || m.role === 'analyste') return null;
  const z = zoneOf(G, p), delay = Math.ceil(1 + (20 - m.skills.observation) / 8 + load(G, m) * .5 + (z === homeZone(G) ? 0 : 1));
  G.cell.queue.push({ pid, scoutId: m.id, due: G.week + delay, dueSeason: G.season, remaining: clamp(Math.round(opts.observations || 1), 1, 5), second: !!opts.second });
  return { m, delay };
}
scoutPlayer = function (pid) {
  const r = requestObservation(G, pid);
  if (!r) return toast('Observation déjà prévue ou aucun recruteur disponible.', 'err');
  save(); toast(`${r.m.name} ira observer le joueur : rapport dans ~${r.delay} semaine(s).`); if ($('#modal')) closeModal(); refresh();
};

// ---------- Missions ----------
function missionPool(G, ms) {
  const z = ms.zone;
  return G.players.filter(p => p.club !== G.clubId && !p.academy && !p.retired && (!ms.pos || p.pos === ms.pos) && p.age >= ms.ageMin && p.age <= ms.ageMax
    && (!z || z === 'ALL' || zoneOf(G, p) === z)
    && (ms.avail === 'any' || (ms.avail === 'listed' && (p.listed || p.wantsOut)) || (ms.avail === 'endContract' && p.contract <= 1 && p.club != null) || (ms.avail === 'free' && p.club == null)
      || (ms.avail === 'loan' && p.club != null && STATUS_ORDER.indexOf(p.status || 'rot') >= 2)));
}
function createMission(G, o) {
  cellInit(G);
  const ms = { id: 'm' + G.cell.seq++, title: o.title || `${o.pos ? ROLES[o.pos].label : 'Tous postes'} — ${ZONES[o.zone] || 'Toutes zones'}`, pos: o.pos || null, ageMin: o.ageMin ?? 16, ageMax: o.ageMax ?? 34,
    zone: o.zone || 'ALL', avail: o.avail || 'any', horizon: o.horizon || 'now', minLevel: o.minLevel ?? 0, feeMax: o.feeMax ?? Infinity, wageMaxM: o.wageMaxM ?? Infinity, statusTarget: o.statusTarget || 'first',
    budget: o.budget ?? 60000, spent: 0, scouts: o.scouts || [], deadline: G.week + (o.weeks ?? 8), created: absWeek(G), seen: [], found: [], status: 'active', reasons: [], carry: 0, origin: o.origin || 'manuel' };
  for (const id of ms.scouts) { const m = member(G, id); if (m && !m.assign.includes(ms.id)) m.assign.push(ms.id); }
  G.cell.missions.unshift(ms);
  return ms;
}
// ancienne API (onglet mercato, demandes du coach) → missions de la cellule
startMission = function (G, m) {
  const zone = m.region === 'free' ? 'LIBRES' : m.region === 'dom' ? homeZone(G) : m.region === 'eur' ? 'EUR' : 'ALL';
  const ms = createMission(G, { pos: m.pos, ageMax: m.maxAge ?? 30, zone, minLevel: m.minPot ? m.minPot - 10 : 0, weeks: 8, origin: m.origin || 'demande' });
  const free = G.cell.members.filter(x => x.role !== 'analyste').sort((a, b) => load(G, a) - load(G, b))[0];
  if (free) { ms.scouts.push(free.id); free.assign.push(ms.id); }
  return ms;
};
missionsWeekly = function () { };
function closeMission(G, ms, why) {
  ms.status = why === 'closed' ? 'closed' : 'done';
  for (const m of G.cell.members) m.assign = m.assign.filter(x => x !== ms.id);
  if (why !== 'closed') {
    if (!ms.found.length) {
      const pool = missionPool(G, ms).length;
      ms.reasons = pool === 0 ? ['Critères trop restrictifs : aucun joueur ne correspond.'] : !ms.seen.length ? ['Aucun recruteur affecté ou budget épuisé.'] : [`Couverture ${Math.round(ms.seen.length / pool * 100)} % : joueurs observés en dessous du niveau visé ou hors budget.`];
    }
    addDecision(G, { key: 'mission:' + ms.id, kind: 'cellMeeting', ref: ms.id, blocking: false, from: chief(G).name, icon: '🔎', title: `Mission terminée : ${ms.title} — ${ms.found.length} piste(s)`,
      text: ms.found.length ? `${ms.found.length} joueur(s) correspondent au besoin. Le responsable propose une réunion de recrutement pour présenter les options.` : `Aucune piste : ${ms.reasons.join(' ')}` });
  }
}
function monthSpent(G) { return G.cell.spent[curMonthKey(G)] || 0; }
function cellWeekly(G) {
  cellInit(G);
  const C = G.cell;
  // observations individuelles arrivées à échéance
  C.queue = C.queue.filter(q => {
    if ((q.dueSeason ?? G.season) === G.season && G.week < q.due) return true;
    const p = getPlayer(G, q.pid), m = member(G, q.scoutId) || (p && bestScoutFor(G, p));
    if (!p || !m) return false;
    const cost = zoneCost(G, zoneOf(G, p));
    if (monthSpent(G) + cost > C.budgetM) { q.due = G.week + 1; q.dueSeason = G.season; q.waiting = 'budget'; return true; }
    FLOW_LABEL = `Observation de ${p.name}`; flow(G, myClub(G), -cost, 'scouting'); FLOW_LABEL = null;
    C.spent[curMonthKey(G)] = monthSpent(G) + cost;
    const r = makeReport(G, m, p);
    news(G, `🔎 Rapport de ${m.name} sur ${p.name} (${p.pos}, ${p.age} ans) : niveau estimé ${r.lo}-${r.hi}, confiance ${r.conf} %.`, 'scout');
    if ((q.remaining || 1) > 1) { q.remaining--; q.due = G.week + 3; q.dueSeason = G.season; delete q.waiting; return true; }
    return false;
  });
  // missions
  for (const ms of C.missions.filter(x => x.status === 'active')) {
    const pool = missionPool(G, ms), seen = new Set(ms.seen);
    ms.poolSize = pool.length;
    let cap = ms.carry;
    for (const id of ms.scouts) { const m = member(G, id); if (m) cap += capacity(G, m) / Math.max(1, m.assign.length) * (m.assign.length > 2 ? .8 : 1); }
    let k = Math.floor(cap); ms.carry = cap - k;
    // ordre d'observation : réputation publique (et statistiques si un analyste filtre en amont)
    const score = p => -Math.abs(publicEst(G, p) - Math.max(ms.minLevel, myClub(G).rep - 4)) + (hasAnalyst(G) ? (p.stats.apps ? p.stats.rating / p.stats.apps * 2 : 0) + Math.min(10, p.stats.min / 200) : 0);
    const todo = pool.filter(p => !seen.has(p.id)).sort((a, b) => score(b) - score(a) || a.id - b.id);
    for (const p of todo) {
      if (k <= 0) break;
      const cost = zoneCost(G, zoneOf(G, p));
      if (ms.spent + cost > ms.budget || monthSpent(G) + cost > C.budgetM) { ms.blocked = ms.spent + cost > ms.budget ? 'budget de la mission épuisé' : 'budget mensuel de la cellule atteint'; break; }
      const scouts = ms.scouts.map(id => member(G, id)).filter(Boolean); if (!scouts.length) break;
      const m = scouts.sort((a, b) => (b.zones[zoneOf(G, p)] || 0) - (a.zones[zoneOf(G, p)] || 0))[0];
      FLOW_LABEL = `Mission ${ms.title}`; flow(G, myClub(G), -cost, 'scouting'); FLOW_LABEL = null;
      ms.spent += cost; C.spent[curMonthKey(G)] = monthSpent(G) + cost;
      const r = makeReport(G, m, p, ms.id); ms.seen.push(p.id); k--; delete ms.blocked;
      const mid = (r.lo + r.hi) / 2;
      if (mid >= ms.minLevel && r.feeEst <= ms.feeMax && r.wageEst <= ms.wageMaxM && !ms.found.includes(p.id)) ms.found.push(p.id);
    }
    ms.found = ms.found.filter(id => getPlayer(G, id)?.club !== G.clubId).sort((a, b) => (G.know[b]?.est || 0) - (G.know[a]?.est || 0)).slice(0, 12);
    if (G.week >= ms.deadline) closeMission(G, ms);
  }
}
function cellStaffWeekly(G) {
  const C = G.cell;
  for (const m of C.members) {
    const l = load(G, m);
    m.morale = clamp(m.morale + (l > 3 ? -1.5 : l === 0 ? -.08 : .4) + (monthSpent(G) >= C.budgetM ? -.2 : 0) + (65 - m.morale) * .02, 0, 100);
    // offre extérieure pour un bon élément peu satisfait
    if (scoutLevel(m) >= 12 && m.morale < 55 && rnd() < .025 && !G.decisions.some(d => d.kind === 'scoutOffer' && d.ref === m.id && !d.done)) {
      const club = pick(G.clubs.filter(c => c.id !== G.clubId && c.rep >= myClub(G).rep - 5));
      addDecision(G, { key: 'scoutOffer:' + m.id + ':' + G.week, kind: 'scoutOffer', ref: m.id, data: club.id, from: m.name, icon: '📨', title: `${m.name} a reçu une offre de ${club.name}`,
        text: `${club.name} propose à ${m.name} (${CELL_ROLES[m.role]}) un poste mieux payé. Il hésite (moral ${Math.round(m.morale)} %). Une contre-proposition de +20 % peut le retenir, sans garantie.` });
    }
  }
  syncScoutStaff(G);
  // délégation : le responsable remplace les départs dans la limite de la taille habituelle de la cellule et de la trésorerie
  const target = myClub(G).rep >= 80 ? 4 : myClub(G).rep >= 65 ? 3 : myClub(G).rep >= 50 ? 2 : 1;
  if (C.members.length < target || C.members.some(m => m.name.startsWith('Intérim'))) {
    const mk = cellMarket(G).filter(s => !s.comp || s.comp < myClub(G).budget * .02).sort((a, b) => scoutLevel(b) - scoutLevel(a));
    const s = mk[0];
    if (s && C.deleg === 'execute' && myClub(G).budget > s.comp + monthly(s.wageW)) {
      FLOW_LABEL = `Arrivée de ${s.name} (recrutement)`; flow(G, myClub(G), -(s.comp + monthly(s.wageW)), 'staff'); FLOW_LABEL = null;
      const interim = C.members.find(m => m.name.startsWith('Intérim'));
      const m = { ...s, id: 'sc' + C.seq++, wageW: s.wageW, contract: 2, joined: G.season, morale: 70, assign: [], reports: 0 }; delete m.employer; delete m.comp;
      if (interim) { C.members = C.members.filter(x => x !== interim); m.role = 'chef'; C.chiefId = m.id; } else if (m.role === 'chef') m.role = 'recruteur';
      C.members.push(m); C.market.list = C.market.list.filter(x => x !== s);
      C.log.unshift(`${weekLabel(G)} ${G.season} : ${m.name} recruté (${CELL_ROLES[m.role]}) par délégation.`);
      syncScoutStaff(G);
    } else if (C.deleg === 'propose' && s) addDecision(G, { key: 'cellhire:' + G.season + ':' + Math.floor(G.week / 4), kind: 'info', blocking: false, from: chief(G).name, icon: '🔭', title: 'La cellule est en sous-effectif', text: `La cellule compte ${C.members.length} personne(s) pour ${target} habituellement. ${s.name} (${CELL_ROLES[s.role]}) est disponible dans « Recruter du personnel ».` });
  }
  // délégation : le responsable affecte les recruteurs libres aux missions sans personne
  if (C.deleg === 'execute') for (const ms of C.missions.filter(x => x.status === 'active' && !x.scouts.length)) {
    const free = C.members.filter(m => m.role !== 'analyste' && load(G, m) < 2).sort((a, b) => load(G, a) - load(G, b))[0];
    if (free) { ms.scouts.push(free.id); free.assign.push(ms.id); C.log.unshift(`${weekLabel(G)} : ${chief(G).name} affecte ${free.name} à « ${ms.title} » (délégation).`); }
  }
  // réunion avant chaque mercato
  const R = leagueRoundsTotal(G), lr = leagueRoundAt(G), mid = Math.floor(R / 2);
  // délégation : avant chaque mercato, le responsable propose (ou lance) une mission sur le besoin prioritaire
  if ((lr === mid - 3 || lr === 0) && C.deleg !== 'decide' && !C.missions.some(m => m.status === 'active' && m.origin === 'délégation')) {
    const n = needs(G)[0];
    if (n) {
      const spec = { title: `${ROLES[n.pos].label} (proposé par ${chief(G).name})`, pos: n.pos, ageMin: 18, ageMax: 30, zone: 'ALL', minLevel: Math.round(n.st), weeks: 8, budget: roundMoney(C.budgetM * .3), origin: 'délégation',
        feeMax: G.board.transfer, wageMaxM: monthly(Math.max(0, G.board.wageCap - wageBill(G))) };
      if (C.deleg === 'execute') {
        const free = C.members.filter(m => m.role !== 'analyste').sort((a, b) => load(G, a) - load(G, b))[0];
        const ms = createMission(G, { ...spec, scouts: free ? [free.id] : [] });
        C.log.unshift(`${weekLabel(G)} ${G.season} : ${chief(G).name} lance « ${ms.title} » (délégation, budget ${money(spec.budget)}).`);
      } else addDecision(G, { key: 'cellprop:' + G.season + ':' + lr, kind: 'cellProposal', data: spec, blocking: false, from: chief(G).name, icon: '🔭', title: `Proposition de mission : ${spec.title}`,
        text: `Le responsable propose une mission de 8 semaines sur le poste ${ROLES[n.pos].label} (niveau visé ≥ ${spec.minLevel}, budget ${money(spec.budget)}). Sans réponse avant le mercato, rien n'est lancé.` });
    }
  }
  if (lr === mid - 2 || (lr === 0 && G.week > 0)) addDecision(G, { key: 'precell:' + G.season + ':' + lr, kind: 'cellMeeting', ref: null, blocking: false, from: chief(G).name, icon: '🔎', title: 'Réunion de recrutement avant le mercato', text: 'Le responsable du recrutement souhaite présenter les besoins prioritaires et les options identifiées.' });
}
DECISION_OPTS.cellProposal = d => [['go', 'Lancer la mission', 'primary'], ['no', 'Refuser']];
DECISION_OPTS.cellMeeting = d => [['open', 'Ouvrir la réunion de recrutement', 'primary'], ['later', 'Plus tard']];
DECISION_OPTS.scoutOffer = d => [['counter', 'Contre-proposition (+20 % de salaire, +1 an)', 'primary'], ['let', 'Le laisser partir (indemnité reçue)']];
const __decideC = decide;
decide = function (id, opt) {
  const d = G.decisions.find(x => x.id === id);
  if (!d || d.done || !['cellMeeting', 'scoutOffer', 'cellProposal'].includes(d.kind)) return __decideC(id, opt);
  let msg = '';
  if (d.kind === 'cellProposal') { if (opt === 'go') { const free = G.cell.members.filter(m => m.role !== 'analyste').sort((a, b) => load(G, a) - load(G, b))[0]; createMission(G, { ...d.data, scouts: free ? [free.id] : [] }); } d.done = opt; d.answer = opt === 'go' ? 'mission lancée' : 'refusée'; save(); if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); } return; }
  if (d.kind === 'cellMeeting') { d.done = opt; d.answer = opt === 'open' ? 'réunion tenue' : 'reportée'; save(); if (opt === 'open') return cellMeeting(d.ref); }
  else {
    const m = member(G, d.ref), club = getClub(G, d.data);
    if (!m) { d.done = 'parti'; return; }
    if (opt === 'counter') {
      const ok = rnd() < .45 + (m.relations.dir || 0) / 200 + (G.cell.chiefId === m.id ? .1 : 0);
      if (ok) { m.wageW = roundMoney(m.wageW * 1.2); m.contract++; m.morale = clamp(m.morale + 15, 0, 100); msg = `${m.name} reste au club.`; }
      else { scoutLeaves(G, m, `parti à ${club.name}`, roundMoney(m.wageW * 8)); msg = `${m.name} part malgré tout à ${club.name}.`; }
    } else { scoutLeaves(G, m, `parti à ${club.name}`, roundMoney(m.wageW * 8)); msg = `${m.name} rejoint ${club.name}. Le club perçoit une indemnité.`; }
    d.done = opt; d.answer = msg; news(G, `📨 ${msg}`, 'board'); save(); toast(msg);
  }
  if ($('#top')) { if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
};
// départ : les rapports restent au club, les connaissances de terrain de la personne partent avec elle
function scoutLeaves(G, m, why, indemn) {
  const C = G.cell;
  if (indemn) { FLOW_LABEL = `Départ de ${m.name}`; flow(G, myClub(G), indemn, indemn > 0 ? 'other' : 'staff'); FLOW_LABEL = null; }
  for (const ms of C.missions) ms.scouts = ms.scouts.filter(x => x !== m.id);
  C.queue = C.queue.map(q => q.scoutId === m.id ? { ...q, scoutId: null } : q); // réattribuées à la semaine suivante
  C.members = C.members.filter(x => x !== m);
  (C.alumni ||= []).push({ name: m.name, role: m.role, until: `${weekLabel(G)} ${G.season}`, why, reports: m.reports });
  if (C.chiefId === m.id) { const nx = C.members.slice().sort((a, b) => scoutLevel(b) - scoutLevel(a))[0]; C.chiefId = nx?.id || null; if (nx) { nx.role = 'chef'; news(G, `${nx.name} assure l'intérim à la tête du recrutement.`, 'board'); } }
  if (!C.members.length) { const t = newScout(G, 'chef', 5); t.name = 'Intérim — ' + t.name; t.contract = 1; C.members.push(t); C.chiefId = t.id; }
  C.log.unshift(`${weekLabel(G)} ${G.season} : départ de ${m.name} (${why}). ${m.reports} rapports restent la propriété du club.`);
  syncScoutStaff(G);
}

// ---------- Marché du personnel ----------
function cellMarket(G) {
  const C = cellInit(G);
  if (!C.market || C.market.season !== G.season || G.week - C.market.week >= 4) {
    const seq = C.seq; // les candidats ne consomment ni le générateur ni les numéros de la partie
    C.market = withSideRng(`${G.seed}|cell|${G.season}|${Math.floor(G.week / 4)}`, () => {
      const rep = myClub(G).rep, q = 5 + rep / 10;
      return { week: G.week, season: G.season, list: Array.from({ length: 7 }, (_, i) => { const s = newScout(G, i === 6 ? 'analyste' : i === 0 ? 'chef' : 'recruteur', q + gauss() * 2); s.id = `cand_${G.season}_${Math.floor(G.week / 4)}_${i}`; s.employer = rnd() < .5 ? pick(G.clubs.filter(c => c.id !== G.clubId)).name : null; s.comp = s.employer ? s.wageW * rint(4, 12) : 0; return s; }) };
    });
    C.seq = seq;
  }
  return C.market.list;
}

// ---------- Réunion de recrutement ----------
function needs(G) {
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy && !(p.loan && !p.loan.inLoan));
  const out = Object.keys(ROLES).map(pos => {
    const st = typeof lineStrength === 'function' ? lineStrength(G, pos) : 0;
    const exp = sq.filter(p => p.pos === pos && (p.contract <= 1 || p.age >= 32)).length;
    return { pos, st, exp };
  });
  const mean = out.reduce((a, x) => a + x.st, 0) / out.length;
  const coachAsk = (G.coachReqs || []).filter(q => q.kind === 'reinforce' && ['open', 'accepted'].includes(q.status)).map(q => q.pos);
  return out.map(x => ({ ...x, score: (mean - x.st) + x.exp * 3 + (coachAsk.includes(x.pos) ? 6 : 0), coach: coachAsk.includes(x.pos) })).sort((a, b) => b.score - a.score).slice(0, 3);
}
function cellOptions(G, pos) {
  const cands = Object.keys(G.know || {}).map(Number).map(id => getPlayer(G, id)).filter(p => p && p.pos === pos && p.club !== G.clubId && !p.retired);
  return cands.map(p => { const k = knowOf(G, p), last = (G.reports || []).filter(r => r.pid === p.id).slice(-1)[0];
    const fee = last?.feeEst ?? p.value, wage = last?.wageEst ?? monthly(p.wage);
    const afford = (fee <= G.board.transfer + 1) && (weekly(wage) + wageBill(G) <= G.board.wageCap);
    return { p, k, last, fee, wage, afford, score: k.est - k.err * .8 - (afford ? 0 : 6) };
  }).sort((a, b) => b.score - a.score).slice(0, 5);
}
function cellMeeting(missionId) {
  cellInit(G);
  const ms = missionId ? G.cell.missions.find(x => x.id === missionId) : null;
  const ns = ms?.pos ? [{ pos: ms.pos, coach: false, st: lineStrength(G, ms.pos) }] : needs(G);
  const ch = chief(G);
  const coachTxt = pos => { if (!G.coach) return 'Ton adjoint juge ce poste prioritaire.'; const st = coachStyle(G.coach); return st.likes.includes(pos) ? `${G.coach.name} : « C'est un poste clé dans mon système. »` : `${G.coach.name} : « Utile, mais pas ma priorité. »`; };
  const sections = ns.map(n => {
    const opts = cellOptions(G, n.pos);
    const rec = opts.find(o => o.afford) || opts[0], alt = opts.find(o => o !== rec && o.afford) || opts.find(o => o !== rec);
    return `<div class="card sub"><h3>${ROLES[n.pos].label}${n.coach ? ' · demandé par le coach' : ''} <small class="muted">niveau actuel du poste ≈ ${Math.round(n.st)}</small></h3><p class="hint">${esc(coachTxt(n.pos))}</p>
      ${opts.length ? `<table class="tbl compact"><thead><tr><th>Joueur</th><th>Âge</th><th>Club</th><th>Niveau estimé</th><th>Confiance</th><th>Coût estimé</th><th>Salaire estimé</th><th>Rapports</th><th></th></tr></thead><tbody>
        ${opts.map(o => { const div = divergence(G, o.p.id); return `<tr class="${o === rec ? 'me' : ''}"><td class="nm">${esc(o.p.name)}${o === rec ? ' <b class="pos">recommandé</b>' : o === alt ? ' <small>alternative</small>' : ''}</td><td>${o.p.age}</td><td>${o.p.club != null ? esc(getClub(G, o.p.club).name) : 'Libre'}</td>
          <td>${Math.round(o.k.est - o.k.err)}–${Math.round(o.k.est + o.k.err)}${o.k.stale ? ' <small class="warn">ancien</small>' : ''}</td><td>${clamp(Math.round(100 - o.k.err * 9), 5, 95)} %${div ? ` <small class="warn" title="${esc(div)}">avis divergents</small>` : ''}</td>
          <td class="${o.fee > G.board.transfer ? 'neg' : ''}">${money(o.fee)}</td><td>${money(o.wage)}/mois</td><td>${o.k.n}</td>
          <td class="row gap"><button class="btn sm" data-ob="${o.p.id}" title="Nouvelle observation">👁</button><button class="btn sm" data-se="${o.p.id}" title="Second avis par un autre recruteur">2ᵉ avis</button><button class="btn sm primary" data-ct="${o.p.id}" title="Prise de contact">Contacter</button><button class="btn sm danger" data-dr="${o.p.id}" title="Abandonner la piste">✕</button></td></tr>`; }).join('')}</tbody></table>`
        : '<p class="muted">Aucun joueur suivi à ce poste. Lance une mission pour constituer des options.</p>'}
      <div class="row gap"><button class="btn sm" data-nm="${n.pos}">Lancer une mission sur ce poste</button><button class="btn sm" data-cmp="${n.pos}">Comparer</button></div></div>`;
  }).join('');
  modal(`<h2>🔎 Réunion de recrutement</h2><p>${esc(ch.name)} (responsable) présente ${ms ? `les résultats de la mission « ${esc(ms.title)} »` : 'les besoins prioritaires'}. Budget transferts ${money(G.board.transfer)} · marge salariale ${wageM(Math.max(0, G.board.wageCap - wageBill(G)))}.</p>
    ${sections}<p class="hint">Les fourchettes viennent des rapports de la cellule : elles peuvent être fausses. Plusieurs observations réduisent l'incertitude sans la supprimer. Aucun avis n'est régénéré à l'ouverture.</p>`, 'wide');
  G.cell.meetings.unshift({ at: absWeek(G), label: `${weekLabel(G)} ${G.season}`, mission: ms?.title || null, needs: ns.map(n => n.pos) });
  const reopen = () => cellMeeting(missionId);
  $$('#modal [data-ob]').forEach(b => b.onclick = () => { const r = requestObservation(G, +b.dataset.ob); toast(r ? `${r.m.name} y retourne (~${r.delay} sem.).` : 'Observation déjà prévue.'); save(); });
  $$('#modal [data-se]').forEach(b => b.onclick = () => { const r = requestObservation(G, +b.dataset.se, { second: true }); toast(r ? `Second avis confié à ${r.m.name}.` : 'Impossible.'); save(); });
  $$('#modal [data-ct]').forEach(b => b.onclick = () => { closeModal(); offerModal(+b.dataset.ct); });
  $$('#modal [data-dr]').forEach(b => b.onclick = () => { const id = +b.dataset.dr; G.cell.targets = G.cell.targets.filter(t => t.pid !== id); delete G.know[id]; save(); reopen(); });
  $$('#modal [data-nm]').forEach(b => b.onclick = () => { closeModal(); CELL_TAB = 'missions'; CELL_NEWPOS = b.dataset.nm; show('cell'); });
  $$('#modal [data-cmp]').forEach(b => b.onclick = () => { closeModal(); CELL_TAB = 'compare'; CELL_CMP = b.dataset.cmp; show('cell'); });
}
function divergence(G, pid) {
  const byScout = {}; for (const r of (G.reports || []).filter(r => r.pid === pid)) byScout[r.byName] = (r.lo + r.hi) / 2;
  const v = Object.entries(byScout); if (v.length < 2) return '';
  const mn = Math.min(...v.map(x => x[1])), mx = Math.max(...v.map(x => x[1]));
  return mx - mn >= 5 ? v.map(([n, x]) => `${n} : ${Math.round(x)}`).join(' · ') : '';
}

// ---------- Écran « Cellule de recrutement » ----------
let CELL_TAB = 'dash', CELL_NEWPOS = '', CELL_CMP = 'DC';
function vCell(el) {
  cellInit(G);
  const C = G.cell, tabs = [['dash', 'Tableau de bord'], ['staff', 'Équipe'], ['missions', 'Missions'], ['reports', 'Rapports'], ['compare', 'Comparer'], ['similar', 'Profils similaires'], ['market', 'Recruter du personnel'], ['eval', 'Évaluation']];
  el.innerHTML = `<section class="card"><div class="row gap wrap"><h2 class="grow">🔎 Cellule de recrutement</h2><button class="btn primary" id="cMeet">Réunion de recrutement</button></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button data-ct2="${k}" class="${CELL_TAB === k ? 'on' : ''}">${l}</button>`).join('')}</div></section><div id="cellBody" class="col"></div>`;
  el.querySelectorAll('[data-ct2]').forEach(b => b.onclick = () => { CELL_TAB = b.dataset.ct2; vCell(el); });
  $('#cMeet').onclick = () => cellMeeting(null);
  const box = $('#cellBody');
  ({ dash: cellDash, staff: cellStaff, missions: cellMissions, reports: cellReports, compare: cellCompare, similar: cellSimilar, market: cellHire, eval: cellEval })[CELL_TAB](box, el);
}
function cellDash(box) {
  const C = G.cell, act = C.missions.filter(m => m.status === 'active');
  const stale = Object.keys(G.know || {}).map(Number).filter(id => { const p = getPlayer(G, id); return p && G.cell.targets.some(t => t.pid === id) && knowOf(G, p)?.stale; });
  const zoneCov = Object.keys(ZONES).map(z => ({ z, best: Math.max(0, ...C.members.map(m => m.role === 'analyste' ? 0 : m.zones[z] || 0)), busy: act.filter(m => m.zone === z).length }));
  const urgent = act.filter(m => m.deadline - G.week <= 2);
  box.innerHTML = `<div class="kpis card"><div><small>Missions actives</small><b>${act.length}</b></div><div><small>Personnes</small><b>${C.members.length}</b><em>${C.members.map(m => esc(m.name.split(' ')[0])).join(', ')}</em></div>
      <div><small>Budget du mois</small><b>${money(monthSpent(G))} / ${money(C.budgetM)}</b></div><div><small>Joueurs suivis par le club</small><b>${Object.keys(G.know || {}).length}</b></div><div><small>Délégation</small><b>${{ decide: 'Je décide', propose: 'Le staff propose', execute: 'Le staff exécute' }[C.deleg]}</b></div></div>
    <div class="grid2"><section class="card"><h2>Disponibilité</h2><table class="tbl compact">${C.members.map(m => { const l = load(G, m); return `<tr><td class="nm">${esc(m.name)}<br><small>${CELL_ROLES[m.role]}${C.chiefId === m.id ? ' · responsable' : ''}</small></td><td>${l.toFixed(1)} charge</td><td>${bar(clamp(100 - l * 25, 0, 100), 100, l > 3 ? 'low' : '')}</td><td>moral ${meter(m.morale)}</td></tr>`; }).join('')}</table>
      <h3>Couverture géographique</h3><table class="tbl compact">${zoneCov.map(x => `<tr><td>${ZONES[x.z]}</td><td>${bar(x.best * 5, 100)} meilleure connaissance ${x.best}/20</td><td>${x.busy} mission(s)</td></tr>`).join('')}</table></section>
    <section class="card"><h2>À traiter</h2>${urgent.length ? urgent.map(m => `<p class="warn">⏰ « ${esc(m.title)} » se termine dans ${Math.max(0, m.deadline - G.week)} semaine(s) — ${m.found.length} piste(s).</p>`).join('') : '<p class="muted">Aucune échéance proche.</p>'}
      ${stale.length ? `<p class="warn">📅 ${stale.length} cible(s) avec un rapport de plus de 6 mois : à actualiser.</p>` : ''}
      ${act.filter(m => m.blocked).map(m => `<p class="neg">⛔ « ${esc(m.title)} » à l'arrêt : ${esc(m.blocked)}.</p>`).join('')}
      <h3>Cibles par besoin</h3>${Object.keys(ROLES).map(pos => { const t = C.targets.filter(x => getPlayer(G, x.pid)?.pos === pos); return t.length ? `<p><b>${pos}</b> : ${t.map(x => esc(getPlayer(G, x.pid).name)).join(', ')}</p>` : ''; }).join('') || '<p class="muted">Aucune cible : ajoute des joueurs depuis les rapports.</p>'}
      <h3>Organisation</h3><div class="row gap wrap"><label>Budget mensuel (€) <input id="cBud" type="number" step="5000" value="${C.budgetM}"></label>
      <label>Délégation <select id="cDel"><option value="decide" ${C.deleg === 'decide' ? 'selected' : ''}>Je décide</option><option value="propose" ${C.deleg === 'propose' ? 'selected' : ''}>Le staff propose</option><option value="execute" ${C.deleg === 'execute' ? 'selected' : ''}>Le staff exécute (affectations)</option></select></label></div>
      <p class="hint">Chaque observation coûte un déplacement (${money(ZONE_COST.home)} en ${ZONES[homeZone(G)]}, ${money(ZONE_COST.big)} dans les grands championnats, ${money(ZONE_COST.EUR)} ailleurs en Europe). Le budget est pris sur la trésorerie du club.</p>
      <h3>Journal</h3><small>${C.log.slice(0, 6).map(esc).join('<br>') || '—'}</small></section></div>`;
  $('#cBud').onchange = e => { const v = Math.max(0, +e.target.value); const cut = v < C.budgetM * .8; C.budgetM = roundMoney(v); if (cut) C.members.forEach(m => m.morale = clamp(m.morale - 5, 0, 100)); C.log.unshift(`${weekLabel(G)} : budget mensuel fixé à ${money(C.budgetM)}.`); save(); };
  $('#cDel').onchange = e => { C.deleg = e.target.value; save(); };
}
function cellStaff(box, root) {
  const C = G.cell, act = C.missions.filter(m => m.status === 'active');
  box.innerHTML = `<section class="card"><h2>Équipe de recrutement <small>masse salariale ${wageM(C.members.reduce((s, m) => s + m.wageW, 0))}</small></h2>
    <div class="coach-grid">${C.members.map(m => `<div class="coach-card"><div class="row gap"><div class="coach-ava sm">${esc(m.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</div><div class="grow"><b>${esc(m.name)}</b><br><small>${CELL_ROLES[m.role]}${C.chiefId === m.id ? ' · <b>responsable</b>' : ''} · ${m.age} ans · ${esc(m.history[0])}</small></div></div>
      <div class="skills sm">${Object.entries(SCOUT_SKILLS).map(([k, l]) => `<div class="attr"><span>${l}</span>${bar(m.skills[k], 20, 'a' + Math.ceil(m.skills[k] / 5))}<b>${m.skills[k]}</b></div>`).join('')}</div>
      <small>Zones fortes : ${Object.entries(m.zones).filter(([, v]) => v >= 12).map(([z]) => ZONES[z]).join(', ') || 'aucune'} · langues : ${m.langs.join(', ')}<br>Biais : ${SCOUT_BIAS[m.bias]} · moral ${Math.round(m.morale)} % · ${m.reports} rapports<br>${wageM(m.wageW)} · contrat jusqu'en juin ${G.season + m.contract}</small>
      <label class="mt">Affectations <select multiple data-as="${m.id}" size="3" ${m.role === 'analyste' ? 'disabled' : ''}>${act.map(ms => `<option value="${ms.id}" ${m.assign.includes(ms.id) ? 'selected' : ''}>${esc(ms.title)}</option>`).join('')}</select></label>
      <div class="row gap wrap mt">${C.chiefId !== m.id ? `<button class="btn sm" data-chief="${m.id}">Nommer responsable</button>` : ''}<button class="btn sm" data-ext="${m.id}">Prolonger</button><button class="btn sm danger" data-fire="${m.id}">Licencier</button></div></div>`).join('')}</div>
    <p class="hint">Charge : chaque mission partage la capacité d'observation de la personne ; au-delà de 3 dossiers, elle travaille moins bien et son moral baisse. L'analyste n'observe pas mais filtre les candidats par les statistiques et réduit l'incertitude des synthèses.</p></section>`;
  box.querySelectorAll('[data-as]').forEach(s => s.onchange = () => {
    const m = member(G, s.dataset.as), sel = [...s.selectedOptions].map(o => o.value);
    for (const ms of C.missions) { ms.scouts = ms.scouts.filter(x => x !== m.id); if (sel.includes(ms.id)) ms.scouts.push(m.id); }
    m.assign = sel; C.log.unshift(`${weekLabel(G)} : ${m.name} affecté à ${sel.length} mission(s).`); save();
  });
  box.querySelectorAll('[data-chief]').forEach(b => b.onclick = () => { const m = member(G, b.dataset.chief), old = chief(G); if (old && old !== m) { old.role = 'recruteur'; old.morale = clamp(old.morale - 12, 0, 100); } m.role = 'chef'; C.chiefId = m.id; m.wageW = roundMoney(m.wageW * 1.15); m.morale = clamp(m.morale + 10, 0, 100); syncScoutStaff(G); C.log.unshift(`${weekLabel(G)} : ${m.name} nommé responsable du recrutement.`); save(); vCell(root); });
  box.querySelectorAll('[data-ext]').forEach(b => b.onclick = () => { const m = member(G, b.dataset.ext); if (m.morale < 40 && rnd() < .6) { toast(`${m.name} refuse de prolonger : il ne se sent pas considéré.`, 'err'); save(); return; } m.contract++; m.wageW = roundMoney(m.wageW * 1.06); m.morale = clamp(m.morale + 6, 0, 100); save(); vCell(root); toast(`${m.name} prolonge jusqu'en juin ${G.season + m.contract}.`); });
  box.querySelectorAll('[data-fire]').forEach(b => b.onclick = () => { const m = member(G, b.dataset.fire), sev = roundMoney(m.wageW * 52 * m.contract * .5);
    confirmBox(`Licencier ${esc(m.name)} ? Indemnité ${money(sev)}. Ses rapports restent au club, mais sa connaissance du terrain part avec lui.`, () => { scoutLeaves(G, m, 'licencié', -sev); save(); vCell(root); }, 'Licencier', true); });
}
function cellMissions(box, root) {
  const C = G.cell;
  box.innerHTML = `<section class="card"><h2>Nouvelle mission</h2><div class="form-grid">
      <label>Intitulé <input id="nmT" placeholder="ex. Défenseur central titulaire"></label>
      <label>Poste <select id="nmP"><option value="">Tous</option>${Object.keys(ROLES).map(r => `<option value="${r}" ${CELL_NEWPOS === r ? 'selected' : ''}>${r} — ${ROLES[r].label}</option>`).join('')}</select></label>
      <label>Âge min / max <span class="row gap"><input id="nmA1" type="number" value="18" style="width:60px"><input id="nmA2" type="number" value="30" style="width:60px"></span></label>
      <label>Zone <select id="nmZ"><option value="ALL">Toutes</option>${Object.entries(ZONES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label>Disponibilité <select id="nmAv">${Object.entries(AVAIL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label>Horizon <select id="nmH">${Object.entries(HORIZONS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label>Niveau minimum visé <input id="nmL" type="number" value="${Math.max(40, myClub(G).rep - 8)}"></label>
      <label>Indemnité max (€) <input id="nmF" type="number" step="500000" value="${Math.round(G.board.transfer)}"></label>
      <label>Salaire max (€/mois) <input id="nmW" type="number" step="5000" value="${monthly(Math.max(0, G.board.wageCap - wageBill(G)))}"></label>
      <label>Statut envisagé <select id="nmS">${STATUS_ORDER.map(k => `<option value="${k}" ${k === 'first' ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}</select></label>
      <label>Durée (semaines) <input id="nmD" type="number" value="8"></label>
      <label>Budget de la mission (€) <input id="nmB" type="number" step="10000" value="60000"></label>
      <label>Recruteurs <select id="nmR" multiple size="3">${C.members.filter(m => m.role !== 'analyste').map(m => `<option value="${m.id}">${esc(m.name)} (charge ${load(G, m).toFixed(1)})</option>`).join('')}</select></label>
    </div><div class="row gap mt"><span class="hint grow" id="nmInfo"></span><button class="btn" id="nmPrev">Estimer la couverture</button><button class="btn primary" id="nmGo">Créer la mission</button></div></section>
    <section class="card"><h2>Missions</h2><table class="tbl">${C.missions.slice(0, 30).map(ms => `<tr><td class="nm"><b>${esc(ms.title)}</b><br><small>${ms.pos || 'Tous'} · ${ms.ageMin}-${ms.ageMax} ans · ${esc(ZONES[ms.zone] || 'Toutes zones')} · ${AVAIL[ms.avail]} · ${HORIZONS[ms.horizon]}</small></td>
      <td><small>${ms.scouts.map(id => esc(member(G, id)?.name || '?')).join(', ') || '<span class="neg">personne</span>'}</small></td>
      <td>${ms.status === 'active' ? `fin ${weekLabel(G, Math.min(ms.deadline, G.schedule.length - 1))}` : ms.status === 'closed' ? 'fermée' : 'terminée'}</td>
      <td>couverture ${ms.poolSize ? Math.round(ms.seen.length / ms.poolSize * 100) : 0} % (${ms.seen.length}/${ms.poolSize ?? '?'})<br><small>dépensé ${money(ms.spent)} / ${money(ms.budget)}</small></td>
      <td>${ms.found.length} piste(s)${ms.blocked ? `<br><small class="neg">${esc(ms.blocked)}</small>` : ''}${ms.reasons.length ? `<br><small class="warn">${esc(ms.reasons.join(' '))}</small>` : ''}</td>
      <td class="row gap">${ms.found.length ? `<button class="btn sm" data-mm="${ms.id}">Réunion</button>` : ''}${ms.status === 'active' ? `<button class="btn sm" data-mb="${ms.id}">+ budget</button><button class="btn sm danger" data-mc="${ms.id}">Fermer</button>` : ''}</td></tr>`).join('') || '<tr><td class="muted">Aucune mission.</td></tr>'}</table>
      <p class="hint">Une mission large ou sous-financée couvre une petite partie des joueurs possibles : elle ne trouvera pas toutes les pépites. Les pistes respectent le niveau, l'indemnité et le salaire visés, d'après les estimations des rapports.</p></section>`;
  const read = () => ({ title: $('#nmT').value.trim() || undefined, pos: $('#nmP').value || null, ageMin: +$('#nmA1').value, ageMax: +$('#nmA2').value, zone: $('#nmZ').value, avail: $('#nmAv').value, horizon: $('#nmH').value,
    minLevel: +$('#nmL').value, feeMax: +$('#nmF').value, wageMaxM: +$('#nmW').value, statusTarget: $('#nmS').value, weeks: Math.max(2, +$('#nmD').value), budget: +$('#nmB').value, scouts: [...$('#nmR').selectedOptions].map(o => o.value) });
  $('#nmPrev').onclick = () => { const o = read(); const pool = missionPool(G, { ...o, zone: o.zone }).length; const cap = o.scouts.reduce((s, id) => { const m = member(G, id); return s + capacity(G, m) / (m.assign.length + 1); }, 0);
    const obs = Math.min(pool, Math.floor(cap * o.weeks), Math.floor(o.budget / zoneCost(G, o.zone === 'ALL' ? homeZone(G) : o.zone)));
    $('#nmInfo').textContent = `${pool} joueurs correspondent · environ ${obs} observations possibles (${pool ? Math.round(obs / pool * 100) : 0} % de couverture).`; };
  $('#nmGo').onclick = () => { const ms = createMission(G, read()); C.log.unshift(`${weekLabel(G)} : mission « ${ms.title} » créée.`); CELL_NEWPOS = ''; save(); vCell(root); toast('Mission créée.'); };
  box.querySelectorAll('[data-mc]').forEach(b => b.onclick = () => { closeMission(G, C.missions.find(m => m.id === b.dataset.mc), 'closed'); save(); vCell(root); });
  box.querySelectorAll('[data-mb]').forEach(b => b.onclick = () => { const ms = C.missions.find(m => m.id === b.dataset.mb); ms.budget += 30000; delete ms.blocked; save(); vCell(root); });
  box.querySelectorAll('[data-mm]').forEach(b => b.onclick = () => cellMeeting(b.dataset.mm));
}
function cellReports(box, root) {
  const rs = (G.reports || []).slice(-80).reverse();
  box.innerHTML = `<section class="card"><h2>Rapports <small>${(G.reports || []).length} au total, propriété du club</small></h2>${rs.length ? `<table class="tbl"><thead><tr><th>Joueur</th><th>Auteur</th><th>Date</th><th>Contexte</th><th>Niveau</th><th>Potentiel</th><th>Confiance</th><th>Points forts / réserves</th><th>Encore inconnu</th><th></th></tr></thead><tbody>
    ${rs.map(r => { const p = getPlayer(G, r.pid); if (!p) return ''; const old = weeksAgo(G, r.at) > 26; const tgt = G.cell.targets.some(t => t.pid === p.id);
      return `<tr><td class="nm"><a href="#" data-pid="${p.id}">${esc(p.name)}</a><br><small>${p.pos} · ${p.age} ans · ${p.club != null ? esc(getClub(G, p.club).short) : 'libre'}</small></td><td>${esc(r.byName)}<br><small>obs. n°${r.n}</small></td><td>${esc(r.label)}${old ? '<br><small class="warn">à actualiser</small>' : ''}</td><td><small>${esc(r.ctx)}</small></td>
        <td>${r.lo}–${r.hi}</td><td>${r.plo}–${r.phi}</td><td>${r.conf} %</td><td><small class="pos">${r.strengths.map(esc).join(', ')}</small><br><small class="neg">${r.reserves.map(esc).join(', ')}</small>${r.known.length ? `<br><small>${r.known.map(esc).join(' · ')}</small>` : ''}</td><td><small class="muted">${r.unknown.map(esc).join(', ')}</small></td>
        <td><button class="btn sm ${tgt ? '' : 'primary'}" data-tg="${p.id}">${tgt ? 'Cible ✔' : '+ Cible'}</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">Aucun rapport. Lance une mission ou demande une observation depuis la fiche d\'un joueur.</p>'}</section>`;
  box.querySelectorAll('[data-pid]').forEach(a => a.onclick = e => { e.preventDefault(); playerModal(+a.dataset.pid); });
  box.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const id = +b.dataset.tg; if (G.cell.targets.some(t => t.pid === id)) G.cell.targets = G.cell.targets.filter(t => t.pid !== id); else G.cell.targets.push({ pid: id, added: absWeek(G) }); save(); vCell(root); });
}
function cellCompare(box, root) {
  const opts = cellOptions(G, CELL_CMP).slice(0, 5);
  const mine = clubPlayers(G, G.clubId).filter(p => p.pos === CELL_CMP).sort((a, b) => playerOvr(b) - playerOvr(a))[0];
  box.innerHTML = `<section class="card"><div class="row gap"><h2 class="grow">Comparer les candidats</h2><label>Poste <select id="cmpP">${Object.keys(ROLES).map(r => `<option value="${r}" ${r === CELL_CMP ? 'selected' : ''}>${ROLES[r].label}</option>`).join('')}</select></label></div>
    ${opts.length ? `<table class="tbl"><thead><tr><th></th>${opts.map(o => `<th>${esc(o.p.name)}</th>`).join('')}${mine ? `<th>Ton titulaire : ${esc(mine.name)}</th>` : ''}</tr></thead><tbody>
      ${[['Âge', o => o.p.age, p => p.age], ['Club', o => o.p.club != null ? esc(getClub(G, o.p.club).name) : 'Libre', () => esc(myClub(G).name)], ['Niveau estimé', o => `${Math.round(o.k.est - o.k.err)}–${Math.round(o.k.est + o.k.err)}`, p => playerOvr(p)],
        ['Potentiel estimé', o => o.k.pot ? `${Math.round(o.k.pot - o.k.perr)}–${Math.round(o.k.pot + o.k.perr)}` : 'Inconnu', p => stars(p.pot)], ['Confiance', o => clamp(Math.round(100 - o.k.err * 9), 5, 95) + ' %', () => 'certain'],
        ['Rapports / auteurs', o => `${o.k.n} / ${o.k.authors}`, () => '—'], ['Contrat', o => contractEnd(o.p), p => contractEnd(p)], ['Coût estimé', o => money(o.fee), () => '—'], ['Salaire estimé', o => money(o.wage) + '/mois', p => wageM(p.wage)],
        ['Accessible', o => o.afford ? '<span class="pos">oui</span>' : '<span class="neg">hors budget</span>', () => '—'], ['Avis divergents', o => divergence(G, o.p.id) || '—', () => '—']]
        .map(([l, f, g]) => `<tr><td>${l}</td>${opts.map(o => `<td>${f(o)}</td>`).join('')}${mine ? `<td>${g(mine)}</td>` : ''}</tr>`).join('')}</tbody></table>` : '<p class="muted">Aucun joueur suivi à ce poste.</p>'}</section>`;
  $('#cmpP').onchange = e => { CELL_CMP = e.target.value; vCell(root); };
}
function cellHire(box, root) {
  const mk = cellMarket(G);
  box.innerHTML = `<section class="card"><h2>Candidats</h2><div class="coach-grid">${mk.map(s => `<div class="coach-card"><b>${esc(s.name)}</b> <small>${CELL_ROLES[s.role]} · ${s.age} ans</small><br><small>${esc(s.history[0])} · ${s.employer ? 'en poste à ' + esc(s.employer) : 'libre'}</small>
      <div class="skills sm">${Object.entries(SCOUT_SKILLS).map(([k, l]) => `<div class="attr"><span>${l}</span>${bar(s.skills[k], 20, 'a' + Math.ceil(s.skills[k] / 5))}<b>${s.skills[k]}</b></div>`).join('')}</div>
      <small>Zones fortes : ${Object.entries(s.zones).filter(([, v]) => v >= 12).map(([z]) => ZONES[z]).join(', ') || 'aucune'} · ${s.langs.join(', ')} · ${SCOUT_BIAS[s.bias]}</small><br>
      <small>Demande ${wageM(s.wageW)}${s.comp ? ` · indemnité ${money(s.comp)}` : ''}</small><div class="row gap mt"><button class="btn sm primary" data-hire="${s.id}">Négocier</button></div></div>`).join('')}</div>
    <p class="hint">Liste renouvelée toutes les 4 semaines. Consulter cette liste ne change rien au déroulement de la partie.</p></section>`;
  box.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => {
    const s = mk.find(x => x.id === b.dataset.hire), c = myClub(G);
    modal(`<h2>Recruter ${esc(s.name)}</h2><div class="form-grid"><label>Salaire (€/mois) <input id="hsW" type="number" step="500" value="${monthly(s.wageW)}"></label><label>Durée <select id="hsY">${[1, 2, 3].map(y => `<option ${y === 2 ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
      <label>Fonction <select id="hsR">${Object.entries(CELL_ROLES).map(([k, l]) => `<option value="${k}" ${k === s.role ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <p>Coût immédiat : ${s.comp ? `indemnité ${money(s.comp)} + ` : ''}prime ${money(monthly(s.wageW))}</p><div class="row gap mt"><div class="grow"></div><button class="btn primary" id="hsOk">Proposer</button></div><p class="hint" id="hsRes"></p>`);
    $('#hsOk').onclick = () => {
      const w = +$('#hsW').value, y = +$('#hsY').value, role = $('#hsR').value, cost = s.comp + w;
      if (cost > c.budget) return $('#hsRes').textContent = '❌ Trésorerie insuffisante.';
      if (weekly(w) < s.wageW * .92) return $('#hsRes').textContent = `❌ ${s.name} attend au moins ${wageM(s.wageW * .92)}.`;
      if (scoutLevel(s) > c.rep / 5 + 4 && rnd() < .4) { G.cell.market.list = mk.filter(x => x !== s); closeModal(); vCell(root); return toast(`${s.name} préfère un club plus réputé.`, 'err'); }
      FLOW_LABEL = `Arrivée de ${s.name} (recrutement)`; flow(G, c, -cost, 'staff'); FLOW_LABEL = null;
      const m = { ...s, id: 'sc' + G.cell.seq++, role: role === 'chef' ? 'recruteur' : role, wageW: weekly(w), contract: y, joined: G.season, morale: 70, assign: [], reports: 0 };
      delete m.employer; delete m.comp;
      G.cell.members.push(m); G.cell.market.list = mk.filter(x => x !== s);
      if (role === 'chef') { const old = chief(G); if (old) { old.role = 'recruteur'; old.morale = clamp(old.morale - 15, 0, 100); } m.role = 'chef'; G.cell.chiefId = m.id; syncScoutStaff(G); }
      G.cell.log.unshift(`${weekLabel(G)} ${G.season} : arrivée de ${m.name} (${CELL_ROLES[m.role]}).`);
      closeModal(); save(); vCell(root); toast(`${m.name} rejoint la cellule.`);
    };
  });
}
// Évaluation : calibration mesurée seulement quand la vérité est connue du club (joueur arrivé au club)
function cellEval(box) {
  const rows = G.cell.members.concat([]).map(m => {
    const rs = (G.reports || []).filter(r => r.by === m.id), checked = rs.filter(r => getPlayer(G, r.pid)?.club === G.clubId);
    const calib = checked.length ? checked.reduce((s, r) => s + Math.abs((r.lo + r.hi) / 2 - r._true), 0) / checked.length : null;
    const useful = rs.filter(r => G.cell.targets.some(t => t.pid === r.pid) || G.cell.missions.some(ms => ms.found.includes(r.pid))).length;
    return { m, n: rs.length, checked: checked.length, calib, useful, load: load(G, m) };
  });
  box.innerHTML = `<section class="card"><h2>Évaluation de la cellule</h2><table class="tbl"><thead><tr><th>Personne</th><th>Rapports</th><th>Dossiers retenus (pertinence)</th><th>Écart moyen vérifié</th><th>Moyens (charge)</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td>${esc(x.m.name)}<br><small>${CELL_ROLES[x.m.role]}</small></td><td>${x.n}</td><td>${x.n ? Math.round(x.useful / x.n * 100) + ' %' : '—'}</td><td>${x.calib == null ? '<span class="muted">pas encore vérifiable</span>' : x.calib.toFixed(1) + ` pts sur ${x.checked} joueur(s) arrivé(s)`}</td><td>${x.load.toFixed(1)}</td></tr>`).join('')}</tbody></table>
    <p class="hint">Le jugement porte sur la qualité des dossiers et leur calibration, pas sur la réussite finale d'une recrue. L'écart n'est mesurable que pour des joueurs que le club connaît désormais vraiment (arrivés au club).</p></section>
    ${(G.cell.alumni || []).length ? `<section class="card"><h2>Anciens membres</h2>${G.cell.alumni.map(a => `<p>${esc(a.name)} (${CELL_ROLES[a.role]}) — ${esc(a.until)}, ${esc(a.why)} · ${a.reports} rapports conservés</p>`).join('')}</section>` : ''}`;
}

// ---------- Clubs IA : version adaptée (perception imparfaite, budget autorisé, masse salariale) ----------
function aiPerceived(G, c, p) {
  const q = clamp((c.rep - 30) / 60, .1, 1); // qualité de leur recrutement selon leurs moyens
  let h = (c.id * 73856093) ^ (p.id * 19349663) ^ (G.season * 83492791);
  h = ((h >>> 0) % 10000) / 10000 * 2 - 1;
  return playerOvr(p) + h * (1 + (1 - q) * 7);
}
aiTransfers = function (G) {
  if (!windowOpen(G)) return;
  G.aiSpend ||= {};
  for (const c of G.clubs) {
    if (c.id === G.clubId || rnd() > .1) continue;
    const plan = G.aiPlans?.[c.id + ':' + G.season];
    if (plan && plan.week === G.week && plan.choice !== 'achat') continue; // formation ou prêt retenu cette semaine
    const squad = clubPlayers(G, c.id);
    if (squad.length >= 28) continue;
    const spentKey = c.id + ':' + G.season;
    // enveloppe fixée au début de la saison (40 % de la trésorerie d'alors), sommes engagées déduites intégralement
    G.aiStart ||= {}; G.aiStart[spentKey] ??= Math.max(0, c.budget);
    const authorized = Math.min(G.aiStart[spentKey] * .4 - (G.aiSpend[spentKey] || 0), Math.max(0, c.budget - squad.reduce((s,p) => s + p.wage, 0) * 8));
    const wages = squad.reduce((s, p) => s + p.wage, 0), income = c.foreign ? wages * 1.05 : (weeklyMerch(G, c) + baseSponsor(G, c) + c.capacity * .75 * clubEco(G, c).ticket * .5 + leagueEcoByDiv(G, c.div || 1).tv / 38 / 20);
    const byPos = {};
    for (const r of Object.keys(ROLES)) byPos[r] = squad.filter(p => p.pos === r).map(p => aiPerceived(G, c, p)).sort((a, b) => b - a)[0] || 0;
    const need = aiPriorityRole(squad, byPos);
    const requiredLevel = squad.filter(p => p.pos === need).length < (AI_ROLE_DEPTH[need] || 1) ? byPos[need] - 12 : byPos[need];
    const targets = G.players.filter(p => p.pos === need && !p.loan && !p.academy && p.club !== c.id && p.club !== G.clubId && aiPerceived(G, c, p) > requiredLevel && (p.club == null ? 0 : marketValue(p)) <= authorized && playerOvr(p) < c.rep + 18
      && wages + Math.max(p.wage, demandWage(G, p, c)) <= income * .85);
    if (!targets.length) continue;
    const t = targets.sort((a, b) => aiPerceived(G, c, b) - aiPerceived(G, c, a))[Math.min(targets.length - 1, rint(0, 2))];
    const fee = t.club != null ? marketValue(t) : 0;
    const from = t.club != null ? getClub(G, t.club) : null;
    if (from && clubPlayers(G, from.id).length <= 20) continue;
    flow(G, c, -fee, 'transfers'); if (from) flow(G, from, fee, 'sales');
    G.aiSpend[spentKey] = (G.aiSpend[spentKey] || 0) + fee;
    t.wage = Math.max(roundMoney(t.wage * .9), demandWage(G, t, c));
    if (from) paySellOn(G, t, fee, from);
    logTransfer(G, t, from?.id, c.id, fee, from ? 'transfert' : 'libre');
    t.club = c.id; t.listed = false; t.contract = rint(2, 5); t.num = null; assignNumbers(clubPlayers(G, c.id));
    c.coh = clamp((c.coh ?? 60) - 3, 0, 100);
    news(G, `${t.name} quitte ${from ? from.name : 'les agents libres'} pour ${c.name}${fee ? ` (${money(fee)})` : ''}.`, 'transfer', true);
  }
};

// ---------- Branchements ----------
const __gestionWeeklyC = gestionWeekly;
gestionWeekly = function (G, full) {
  __gestionWeeklyC(G, full);
  try { cellWeekly(G); if (full) cellStaffWeekly(G); } catch (e) { console.error(e); }
};
const __endSeasonC = endSeason;
endSeason = function (G) {
  const S = __endSeasonC(G);
  if (G.cell) for (const m of G.cell.members.slice()) {
    m.contract--; m.age++;
    if (m.contract <= 0) { if (m.morale < 40) scoutLeaves(G, m, 'fin de contrat, non prolongé (mécontent)', 0); else { m.contract = 1; addDecision(G, { key: 'cellEnd:' + m.id + ':' + G.season, kind: 'info', blocking: false, from: m.name, icon: '🔎', title: `${m.name} : contrat prolongé d'office d'un an`, text: `Le contrat de ${m.name} arrivait à terme ; il est reconduit pour une saison. Tu peux le licencier ou le prolonger plus longtemps dans la cellule.` }); } }
  }
  return S;
};
// navigation : la cellule dans la section recrutement / club, l'ancien onglet du mercato y renvoie
const __applyRoleNavC = applyRoleNav;
applyRoleNav = function () {
  __applyRoleNavC();
  const g = NAV_GROUPS.find(x => x[0] === 'Recrutement') || NAV_GROUPS.find(x => x[0] === 'Club');
  if (g && !g[1].some(x => x[0] === 'cell')) g[1].splice(1, 0, ['cell', '🔭', 'Cellule de recrutement']);
  NAV_FLAT.length = 0; NAV_FLAT.push(...NAV_GROUPS.flatMap(x => x[1]));
};
const __showC = show;
show = function (v) {
  if (v === 'transfers' && typeof TR_TAB !== 'undefined' && TR_TAB === 'scout') { TR_TAB = 'search'; v = 'cell'; }
  if (v !== 'cell') return __showC(v);
  if (LIVE) return;
  VIEW_HIST.push(VIEW); VIEW = 'cell';
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === 'cell'));
  renderTop(); const main = $('#main'); main.innerHTML = ''; vCell(main); navBadges();
};
const __enterGameC = enterGame;
enterGame = function () { if (G) cellInit(G); __enterGameC(); };

const __staffMarketC = staffMarket;
staffMarket = function (G) { return withSideRng(`${G.seed}|staff|${G.season}|${Math.floor(G.week / 4)}`, () => __staffMarketC(G)); };
if (typeof coachMarket === 'function') { const __coachMarketC = coachMarket; coachMarket = function (G) { return withSideRng(`${G.seed}|coach|${G.season}|${Math.floor(G.week / 4)}`, () => __coachMarketC(G)); }; }
// la cellule est créée avec la partie (déterministe, indépendant de l'interface)
const __newGameC = newGame;
newGame = function (...a) { const g = __newGameC(...a); const prev = G; G = g; try { migrateGestion(g); cellInit(g); } finally { G = prev; } return g; };

