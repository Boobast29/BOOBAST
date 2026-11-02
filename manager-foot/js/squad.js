// ============================================================
//  Gestion d'effectif & dynamique de groupe
//  statuts (temps de jeu promis), confiance, hiérarchie, clans,
//  ambiance, contagion du moral, automatismes, conflits.
// ============================================================
const STATUS = {
  star: { label: 'Joueur clé', share: .85, tip: 'Doit jouer presque tous les matchs.' },
  first: { label: 'Titulaire', share: .65, tip: 'Doit être titulaire la majorité du temps.' },
  rot: { label: 'Rotation', share: .4, tip: 'Joue régulièrement, sans être indiscutable.' },
  sub: { label: 'Remplaçant', share: .15, tip: 'Quelques apparitions suffisent.' },
  youth: { label: 'Espoir', share: .05, tip: 'Jeune en formation : patience.' }
};
const STATUS_ORDER = ['star', 'first', 'rot', 'sub', 'youth'];
const LANG = {
  FRA: 'Francophones', BEL: 'Francophones', SUI: 'Francophones', CIV: 'Francophones', SEN: 'Francophones', CMR: 'Francophones', MLI: 'Francophones', MAR: 'Maghrébins', ALG: 'Maghrébins', TUN: 'Maghrébins',
  ESP: 'Hispanophones', ARG: 'Hispanophones', URU: 'Hispanophones', COL: 'Hispanophones', POR: 'Lusophones', BRA: 'Lusophones',
  ENG: 'Anglophones', USA: 'Anglophones', GHA: 'Anglophones', GER: 'Germaniques & nordiques', NED: 'Germaniques & nordiques', DEN: 'Germaniques & nordiques', NOR: 'Germaniques & nordiques',
  ITA: 'Italiens', CRO: 'Balkans & Est', SRB: 'Balkans & Est', POL: 'Balkans & Est', JPN: 'Asiatiques'
};
function langOf(p) { return LANG[p.nat] || 'Autres'; }

function defaultStatus(rank, age) {
  if (age <= 19 && rank > 13) return 'youth';
  return rank < 3 ? 'star' : rank < 11 ? 'first' : rank < 16 ? 'rot' : 'sub';
}
function assignStatuses(G, clubId, force = false) {
  const sq = clubPlayers(G, clubId).sort((a, b) => playerOvr(b) - playerOvr(a));
  sq.forEach((p, i) => { if (force || !p.status) p.status = defaultStatus(i, p.age); p.trust ??= 55; });
}
function expectedShare(p) { return STATUS[p.status || 'rot'].share; }
function playShare(p) { const r = p.recentMin || []; return r.length ? r.reduce((s, x) => s + x, 0) / (r.length * 90) : null; }

// ---------- automatismes (paires de joueurs) ----------
function bondKey(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
function bondVal(G, a, b) {
  const v = G.bonds?.[bondKey(a, b)];
  if (v != null) return v;
  const pa = G.pmap[a], pb = G.pmap[b];
  return pa && pb && langOf(pa) === langOf(pb) ? 25 : 10;
}
function growBonds(G, ids) {
  G.bonds ||= {};
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const k = bondKey(ids[i], ids[j]);
    G.bonds[k] = clamp(bondVal(G, ids[i], ids[j]) + 1.8, 0, 100);
  }
}
function decayBonds(G) {
  const mine = new Set(clubPlayers(G, G.clubId).map(p => p.id));
  for (const k in G.bonds || {}) {
    const [a, b] = k.split('-').map(Number);
    if (!mine.has(a) || !mine.has(b)) { delete G.bonds[k]; continue; }
    G.bonds[k] = Math.max(0, G.bonds[k] - .4);
  }
}
function topBonds(G, n = 8) {
  return Object.entries(G.bonds || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => { const [a, b] = k.split('-').map(Number); return { a, b, v }; }).filter(x => G.pmap[x.a] && G.pmap[x.b]);
}

// ---------- hiérarchie / clans / ambiance ----------
function influence(G, p) {
  const capt = G.tactics?.takers?.cap === p.id;
  const seasons = (p.hist || []).filter(h => h.club === getClub(G, p.club)?.short).length;
  return (p.pers === 'Leader' ? 30 : 0) + Math.min(p.age, 34) * 1.2 + seasons * 5 + playerOvr(p) * .35 + (capt ? 15 : 0) + (p.status === 'star' ? 8 : 0);
}
function hierarchy(G) {
  const sq = clubPlayers(G, G.clubId).filter(p => !p.loan).map(p => ({ p, inf: influence(G, p) })).sort((a, b) => b.inf - a.inf);
  return { leaders: sq.slice(0, 3).map(x => x.p), influent: sq.slice(3, 8).map(x => x.p), others: sq.slice(8).map(x => x.p), all: sq };
}
function socialGroups(G) {
  const groups = {};
  for (const p of clubPlayers(G, G.clubId)) (groups[langOf(p)] ||= []).push(p);
  const young = clubPlayers(G, G.clubId).filter(p => p.age <= 21);
  const out = Object.entries(groups).filter(([, v]) => v.length >= 2).map(([name, members]) => ({ name, members }));
  if (young.length >= 3) out.push({ name: 'Jeunes du club', members: young });
  return out.map(g => ({ ...g, mood: g.members.reduce((s, p) => s + p.morale, 0) / g.members.length }));
}
function atmosphere(G) {
  const h = hierarchy(G);
  if (!h.all.length) return 60;
  let s = 0, w = 0;
  for (const x of h.all) { const k = h.leaders.includes(x.p) ? 3 : h.influent.includes(x.p) ? 1.6 : 1; s += x.p.morale * k; w += k; }
  return clamp(s / w * .8 + (myClub(G).coh ?? 60) * .2, 0, 100);
}
function unhappyReasons(G, p) {
  const r = [];
  const sh = playShare(p);
  if (sh != null && (p.recentMin || []).length >= 3 && sh < expectedShare(p) - .25) r.push(`Temps de jeu insuffisant pour son statut (${STATUS[p.status].label})`);
  if (p.contract <= 1 && playerOvr(p) >= 65) r.push('Contrat qui arrive à échéance');
  if (p.pers === 'Ambitieux' && playerOvr(p) > myClub(G).rep + 8) r.push('Estime mériter un club plus ambitieux');
  if ((p.trust ?? 55) < 30) r.push('Ne fait plus confiance à l\'entraîneur');
  if (p.conflict) r.push(`En conflit avec ${G.pmap[p.conflict]?.name || 'un coéquipier'}`);
  if (p.wantsOut) r.push('A demandé son transfert');
  if (p.reserve && STATUS_ORDER.indexOf(p.status) <= 1) r.push('Relégué en réserve');
  return r;
}

// ---------- après chaque match du club ----------
function squadAfterMatch(G, mt) {
  const side = mt.sides.find(s => s.clubId === G.clubId);
  if (!side) return;
  const playedMin = {};
  for (const id in mt.pr) if (mt.pr[id].side === mt.sides.indexOf(side)) playedMin[id] = Math.min(90, mt.pr[id].min);
  for (const p of clubPlayers(G, G.clubId)) {
    if (p.injury > 0 && !playedMin[p.id]) continue; // un blessé ne compte pas
    p.recentMin = [...(p.recentMin || []), playedMin[p.id] || 0].slice(-6);
    p.rest = false;
  }
  growBonds(G, side.onPitch.map(x => x.id).concat(side.sentOff));
  growTacFam(G, side.formation, G.training?.focus === 'tactique');
}

// ---------- chaque semaine ----------
function squadWeekly(G) {
  const sq = clubPlayers(G, G.clubId);
  if (!sq.length) return;
  assignStatuses(G, G.clubId);
  // temps de jeu vs statut
  for (const p of sq) {
    if (p.loan?.from === G.clubId) continue;
    const sh = playShare(p);
    if (sh == null || (p.recentMin || []).length < 3 || p.injury > 0) continue;
    const gap = sh - expectedShare(p);
    if (gap < -.25) {
      p.morale = clamp(p.morale - (p.pers === 'Ambitieux' ? 4 : 2.5), 5, 100); p.trust = clamp((p.trust ?? 55) - 2, 0, 100);
      p.ptWarn = (p.ptWarn || 0) + 1;
      if (p.ptWarn === 3) news(G, `🗣 ${p.name} se plaint de son temps de jeu : il est « ${STATUS[p.status].label} » mais joue peu.`, 'warn');
    } else { p.ptWarn = 0; if (gap > .1) p.trust = clamp((p.trust ?? 55) + .8, 0, 100); }
    if (p.reserve && STATUS_ORDER.indexOf(p.status) <= 2) p.morale = clamp(p.morale - 2, 5, 100);
    if ((p.trust ?? 55) < 20 && !p.wantsOut && rnd() < .25) { p.wantsOut = true; p.listed = true; news(G, `😤 ${p.name} a perdu toute confiance en toi et réclame son départ.`, 'warn'); }
  }
  // contagion du moral : clans + leaders
  const h = hierarchy(G);
  const leadMood = h.leaders.length ? h.leaders.reduce((s, p) => s + p.morale, 0) / h.leaders.length : 65;
  for (const g of socialGroups(G)) for (const p of g.members) p.morale = clamp(p.morale + (g.mood - p.morale) * .08 + (leadMood - p.morale) * .05, 5, 100);
  // conflits
  const hot = sq.filter(p => p.pers === 'Tempérament' && !p.conflict);
  const atm = atmosphere(G);
  if (hot.length && atm < 55 && rnd() < .08) {
    const a = pick(hot), b = pick(sq.filter(p => p !== a && !p.conflict));
    if (b) { a.conflict = b.id; b.conflict = a.id; a.morale -= 8; b.morale -= 6; myClub(G).coh = clamp((myClub(G).coh ?? 60) - 5, 0, 100); news(G, `💢 Altercation à l'entraînement entre ${a.name} et ${b.name}. Le vestiaire est tendu.`, 'warn'); }
  }
  for (const p of sq) if (p.conflict && rnd() < .06) { const o = G.pmap[p.conflict]; p.conflict = null; if (o) o.conflict = null; }
  decayBonds(G);
  myClub(G).atm = Math.round(atmosphere(G));
}

// ---------- actions du manager ----------
function resolveConflict(G, p) {
  const o = G.pmap[p.conflict]; if (!o) { p.conflict = null; return 'Le conflit est déjà réglé.'; }
  const lead = hierarchy(G).leaders[0];
  const chance = .45 + ((p.trust ?? 55) + (o.trust ?? 55)) / 400 + (lead && lead.pers === 'Leader' ? .1 : 0);
  if (rnd() < chance) { p.conflict = null; o.conflict = null; p.morale += 5; o.morale += 5; return `Réconciliation : ${p.name} et ${o.name} se serrent la main.`; }
  p.trust = clamp((p.trust ?? 55) - 5, 0, 100); o.trust = clamp((o.trust ?? 55) - 5, 0, 100);
  return `La réunion tourne mal : ${p.name} et ${o.name} restent fâchés.`;
}
function setStatus(G, p, st) {
  const old = STATUS_ORDER.indexOf(p.status || 'rot'), nw = STATUS_ORDER.indexOf(st);
  p.status = st;
  if (nw > old) { const d = (nw - old) * (p.age <= 20 ? 3 : 7); p.morale = clamp(p.morale - d, 5, 100); p.trust = clamp((p.trust ?? 55) - d, 0, 100); return `${p.name} n'apprécie pas d'être rétrogradé (${STATUS[st].label}).`; }
  if (nw < old) { p.morale = clamp(p.morale + 6, 5, 100); p.trust = clamp((p.trust ?? 55) + 5, 0, 100); return `${p.name} est ravi de sa nouvelle importance (${STATUS[st].label}).`; }
  return '';
}
