// ============================================================
//  Gestion v12 : parties multiples, navigation par sections,
//  boîte mail avec décisions bloquantes, transferts en étapes,
//  contrats détaillés (salaires mensuels), staff nominatif,
//  réunions (équipe, groupes, individuelles), dynamique de groupe,
//  calendrier mensuel, statistiques détaillées.
//  Chargé en dernier : remplace certaines fonctions d'app.js.
// ============================================================

// ---------- Salaires mensuels, contrats ----------
const W2M = 52 / 12; // le moteur compte en semaines ; l'affichage et les négociations en mois
function monthly(w) { return roundMoney((w || 0) * W2M); }
function weekly(m) { return Math.round((m || 0) / W2M); }
function wageM(w) { return money(monthly(w)) + '/mois'; }
function contractEnd(p, long) {
  if (p.club == null) return 'Libre';
  const y = (G?.season ?? 2026) + Math.max(0, p.contract || 0);
  if (!long) return `06/${y}`;
  const d = p.deal || {};
  return `jusqu'au 30 juin ${y} (${p.contract} saison${p.contract > 1 ? 's' : ''})${d.signOn ? ` · prime signature ${money(d.signOn)}` : ''}${d.goalBonus ? ` · ${money(d.goalBonus)}/but` : ''}${d.appBonus ? ` · ${money(d.appBonus)}/match` : ''}${p.contractSim ? ' <small class="muted">(simulation)</small>' : ''}`;
}

// ============================================================
//  Parties multiples (emplacements) + sauvegardes de secours
// ============================================================
const SLOTS_KEY = 'save-slots';
const slotKey = id => 'save-slot-' + id;
let SAVE_COUNT = 0;
async function slotsList() { return (await Store.get(SLOTS_KEY)) || []; }
function slotMeta(g) {
  const c = g.clubs.find(x => x.id === g.clubId) || {};
  return { id: g.slot, name: g.slotName || '', club: c.name, short: c.short, colors: c.colors, logo: c.logo || null, manager: g.managerName,
    season: g.season, week: weekLabel(g), real: g.real?.countryLabel || null, saved: new Date().toISOString() };
}
async function slotIndexUpdate(g) {
  const l = await slotsList(), m = slotMeta(g), i = l.findIndex(x => x.id === g.slot);
  if (i >= 0) l[i] = { ...l[i], ...m, name: l[i].name || m.name }; else l.unshift(m);
  await Store.set(SLOTS_KEY, l);
}
async function migrateLegacySave() {
  const old = await Store.get(SAVE_KEY);
  if (old && old.version === 2 && old.clubs) {
    old.slot ||= 's' + Date.now();
    await Store.set(slotKey(old.slot), old);
    await slotIndexUpdate(old);
  }
  if (old) await Store.del(SAVE_KEY);
}
save = async function () {
  if (!G) return;
  try {
    G.slot ||= 's' + Date.now() + Math.floor(Math.random() * 1000);
    if (RNGS.s != null) G.rngState = RNGS.s;
    const { pmap, ...rest } = G;
    await Store.set(slotKey(G.slot), rest);
    if (++SAVE_COUNT % 8 === 1) {           // rotation de 3 sauvegardes de secours
      for (let i = 2; i >= 1; i--) { const b = await Store.get(slotKey(G.slot) + '-bak' + i); if (b) await Store.set(slotKey(G.slot) + '-bak' + (i + 1), b); }
      await Store.set(slotKey(G.slot) + '-bak1', rest);
    }
    await slotIndexUpdate(G);
  } catch (e) { toast('Sauvegarde impossible : ' + (e?.message || e), 'err'); }
};
async function slotDelete(id) {
  await Store.del(slotKey(id));
  for (let i = 1; i <= 3; i++) await Store.del(slotKey(id) + '-bak' + i);
  await Store.set(SLOTS_KEY, (await slotsList()).filter(x => x.id !== id));
}
function validSave(g) { return g && g.version === 2 && Array.isArray(g.clubs) && Array.isArray(g.players) && g.clubs.some(c => c.id === g.clubId) && Array.isArray(g.schedule); }
async function loadSlot(id, bak = 0) {
  const g = await Store.get(slotKey(id) + (bak ? '-bak' + bak : ''));
  if (!validSave(g)) {
    const backs = [];
    for (let i = 1; i <= 3; i++) if (validSave(await Store.get(slotKey(id) + '-bak' + i))) backs.push(i);
    return modal(`<h2>Sauvegarde illisible</h2><p>Ce fichier de partie est endommagé ou incomplet. Rien n'a été modifié.</p>
      ${backs.length ? `<p>Sauvegardes de secours disponibles :</p><div class="row gap">${backs.map(i => `<button class="btn primary" onclick="closeModal();loadSlot('${id}', ${i})">Restaurer la n°${i}</button>`).join('')}</div>` : '<p class="muted">Aucune sauvegarde de secours valide.</p>'}`);
  }
  g.slot = id;
  loadGame(g); VIEW = 'inbox'; enterGame();
  if (bak) { save(); toast('Sauvegarde de secours restaurée.'); }
}
async function renderSlots(el) {
  if (!el) return;
  const l = await slotsList();
  el.innerHTML = `<div class="card slots"><div class="row gap wrap"><h2 class="grow">💾 Mes parties <small>${l.length} sauvegarde(s)</small></h2>
      <button class="btn" id="btnLoadFile2">📂 Importer un fichier de partie</button></div>
    ${l.length ? `<div class="slot-grid">${l.sort((a, b) => b.saved.localeCompare(a.saved)).map(s => `<div class="slot" style="--c1:${s.colors?.[0] || '#345'}">
      ${crest({ name: s.club || '?', short: s.short, colors: s.colors || ['#345', '#fff'], logo: s.logo }, 46)}
      <div class="grow"><b>${esc(s.name || s.club)}</b><small>${esc(s.manager)} · ${s.season}/${String(s.season + 1).slice(2)} · ${esc(s.week)}${s.real ? ' · 🌍 ' + esc(s.real) : ' · monde fictif'}</small>
        <small class="muted">Sauvé le ${new Date(s.saved).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
      <div class="slot-act"><button class="btn primary" data-load="${s.id}">▶ Jouer</button>
        <button class="btn sm" data-ren="${s.id}" title="Renommer">✎</button><button class="btn sm" data-exp="${s.id}" title="Exporter">⬇</button><button class="btn sm danger" data-del="${s.id}" title="Supprimer">🗑</button></div></div>`).join('')}</div>`
      : '<p class="muted">Aucune partie. Choisis un club ci-dessous : chaque nouvelle partie a son propre emplacement, les autres sont conservées.</p>'}</div>`;
  el.querySelectorAll('[data-load]').forEach(b => b.onclick = () => loadSlot(b.dataset.load));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmBox('Supprimer définitivement cette partie et ses sauvegardes de secours ?', async () => { await slotDelete(b.dataset.del); renderSlots(el); }, 'Supprimer', true));
  el.querySelectorAll('[data-ren]').forEach(b => b.onclick = () => {
    const s = l.find(x => x.id === b.dataset.ren);
    modal(`<h2>Renommer la partie</h2><input id="rn" value="${esc(s.name || s.club)}" maxlength="40" style="width:100%"><div class="row gap mt"><div class="grow"></div><button class="btn primary" id="rnOk">Enregistrer</button></div>`);
    $('#rnOk').onclick = async () => { s.name = $('#rn').value.trim(); await Store.set(SLOTS_KEY, l); const g = await Store.get(slotKey(s.id)); if (g) { g.slotName = s.name; await Store.set(slotKey(s.id), g); } closeModal(); renderSlots(el); };
  });
  el.querySelectorAll('[data-exp]').forEach(b => b.onclick = async () => { const g = await Store.get(slotKey(b.dataset.exp)); if (g) download(`partie-${(g.slotName || g.managerName).replace(/\W+/g, '-')}-${g.season}.json`, g); });
  $('#btnLoadFile2').onclick = () => pickFile(g => {
    if (!validSave(g)) return toast('Ce fichier n\'est pas une sauvegarde compatible.', 'err');
    g.slot = 's' + Date.now(); loadGame(g); save(); enterGame();
  });
}

// ============================================================
//  Navigation par sections
// ============================================================
const NAV_GROUPS = [
  ['Bureau', [['inbox', '🏠', 'Tableau de bord'], ['mail', '✉', 'Boîte mail'], ['calendar', '📅', 'Calendrier']]],
  ['Équipe', [['squad', '👥', 'Effectif'], ['tactics', '📋', 'Tactique'], ['training', '🏋', 'Entraînement'], ['meetings', '🗣', 'Réunions'], ['dressing', '🤝', 'Vestiaire'], ['medical', '🏥', 'Infirmerie'], ['youth', '🌱', 'Formation']]],
  ['Compétitions', [['fixtures', '🗓', 'Résultats'], ['comps', '🏆', 'Classements'], ['stats', '📊', 'Statistiques'], ['intl', '🌍', 'International']]],
  ['Club', [['transfers', '💱', 'Mercato'], ['deals', '📝', 'Négociations'], ['staff', '🧑‍💼', 'Staff'], ['finances', '💶', 'Finances'], ['club', '🏟', 'Club'], ['analysis', '📈', 'Analyse']]],
  ['Outils', [['base', '🔎', 'Base mondiale'], ['editor', '✏', 'Éditeur'], ['options', '⚙', 'Options']]]
];
const NAV_FLAT = NAV_GROUPS.flatMap(g => g[1]);
let VIEW_HIST = [];
enterGame = function () {
  document.body.className = 'game';
  const c = myClub(G);
  document.documentElement.style.setProperty('--club1', c.colors[0]);
  document.documentElement.style.setProperty('--club2', c.colors[1]);
  migrateGestion(G);
  $('#app').innerHTML = `<header id="top"></header>
    <nav id="nav">${NAV_GROUPS.map(([g, items]) => `<div class="nav-g"><div class="nav-h">${g}</div>${items.map(([k, i, l]) => {
      const n = NAV_FLAT.findIndex(x => x[0] === k);
      return `<button data-v="${k}" title="${l}${n < 9 ? ` (touche ${n + 1})` : ''}"><span>${i}</span><em>${l}</em><i class="nb" data-nb="${k}"></i></button>`;
    }).join('')}</div>`).join('')}</nav>
    <main id="main"></main>`;
  $$('#nav button').forEach(b => b.onclick = () => show(b.dataset.v));
  VIEW_HIST = [];
  show(VIEW === 'x' ? 'inbox' : VIEW);
};
const __show = show;
const EXTRA_VIEWS = () => ({ mail: vMail, calendar: vCalendar, meetings: vMeetings, stats: vStats, deals: vDeals, staff: vStaffPeople });
show = function (v) {
  if (LIVE) return;
  if (v === 'base') { if (typeof baseScreen === 'function' && MONDE.ok) baseScreen(); else toast('Base mondiale disponible avec le serveur local.', 'err'); return; }
  if (VIEW && VIEW !== v && VIEW !== 'x') { VIEW_HIST.push(VIEW); VIEW_HIST = VIEW_HIST.slice(-20); }
  const fn = EXTRA_VIEWS()[v];
  if (!fn) { __show(v); navBadges(); return; }
  VIEW = v;
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  renderTop();
  const main = $('#main'); main.innerHTML = ''; fn(main); main.scrollTop = 0;
  navBadges();
};
function goBack() { const v = VIEW_HIST.pop(); if (v) { const h = VIEW_HIST.slice(); show(v); VIEW_HIST = h; } }
function navBadges() {
  if (!G) return;
  const set = (k, n) => { const e = $(`#nav [data-nb="${k}"]`); if (e) e.textContent = n ? n : ''; };
  set('mail', unreadMail(G) + pendingDecisions(G).length);
  set('deals', (G.deals || []).filter(d => DEAL_USER.includes(d.status)).length);
  set('meetings', meetingRequests(G).length);
}
const __renderTop = renderTop;
renderTop = function () {
  __renderTop();
  const top = $('#top'); if (!top) return;
  const blk = blockingDecisions(G);
  if (VIEW_HIST.length) top.insertAdjacentHTML('afterbegin', '<button class="btn back" id="btnBack" title="Retour (Retour arrière)">◀</button>');
  $('#btnBack')?.addEventListener('click', goBack);
  const go = $('#btnGo');
  if (go && blk.length && G.week < G.schedule.length) {
    go.textContent = `✉ ${blk.length} décision${blk.length > 1 ? 's' : ''} à prendre`;
    go.classList.add('blocked');
    go.onclick = () => { MAIL_FILTER = 'todo'; MAIL_SEL = 'd:' + blk[0].id; show('mail'); };
  }
  const ib = $('#nav button[data-v=inbox] span'); if (ib) ib.dataset.n = '';
};
document.addEventListener('keydown', e => {
  if (!G || document.body.className !== 'game' || LIVE || $('#modal') || e.target.matches('input, textarea, select')) return;
  if (e.key === 'Backspace') { e.preventDefault(); goBack(); }
  if (/^[1-9]$/.test(e.key)) { e.stopImmediatePropagation(); const n = NAV_FLAT[+e.key - 1]; if (n) show(n[0]); }
}, true);

// Impossible d'avancer tant que des décisions importantes attendent
const __advance = advance;
advance = function () {
  if (LIVE || $('#modal')) return;
  const b = blockingDecisions(G);
  if (b.length && G.week < G.schedule.length) {
    MAIL_FILTER = 'todo'; MAIL_SEL = 'd:' + b[0].id; show('mail');
    toast(`${b.length} décision(s) importante(s) à prendre avant de continuer.`, 'err');
    return;
  }
  __advance();
};

// ============================================================
//  Données de gestion (migration des anciennes parties)
// ============================================================
function migrateGestion(G) {
  G.decisions ||= []; G.deals ||= []; G.meetLog ||= []; G.meet ||= {}; G.dealSeq ||= 1; G.decSeq ||= 1;
  for (const m of G.inbox) m.id ||= 'm' + (G.decSeq++);
  if (!G.staffPeople) {
    G.staffPeople = {};
    for (const k of Object.keys(STAFF)) G.staffPeople[k] = newStaffPerson(k, G.staff[k] || 2, G.staffNames?.[k]);
  }
  for (const p of clubPlayers(G, G.clubId)) { p.joinedSeason ??= G.season - 1; p.integ ??= 100; }
}

// ============================================================
//  Décisions (questions importantes)
// ============================================================
function addDecision(G, d) {
  if (G.decisions.some(x => x.key && x.key === d.key && !x.done)) return null;
  const dec = { id: G.decSeq++, week: G.week, season: G.season, label: weekLabel(G), blocking: true, done: false, ...d };
  G.decisions.unshift(dec);
  return dec;
}
function syncDecisions(G) {
  G.decisions ||= [];
  for (const o of G.offers || []) if (!G.decisions.some(d => d.key === 'offer:' + o.id)) {
    const p = getPlayer(G, o.pid), c = getClub(G, o.club);
    if (p && c) addDecision(G, { key: 'offer:' + o.id, kind: 'offer', ref: o.id, from: 'Directeur sportif', icon: '💱',
      title: `Offre de ${c.name} pour ${p.name}`, text: `${c.name} propose ${money(o.fee)} pour ${p.name} (valeur estimée ${money(p.value)}, contrat ${contractEnd(p)}).` });
  }
  for (const d of G.decisions) {
    if (d.done) continue;
    if (d.kind === 'offer' && !G.offers.some(o => o.id === d.ref)) d.done = 'expirée';
    if (d.kind === 'sponsor' && G.sponsor) d.done = 'choisi';
    if (d.kind === 'deal') { const dl = G.deals.find(x => x.id === d.ref); if (!dl || !DEAL_USER.includes(dl.status)) d.done = 'traité'; }
    if ((d.kind === 'meet' || d.kind === 'renew') && !getPlayer(G, d.ref)) d.done = 'parti';
    if ((d.kind === 'meet' || d.kind === 'renew') && getPlayer(G, d.ref)?.club !== G.clubId) d.done = 'parti';
  }
  if (G.sponsorOffers?.length && !G.sponsor) addDecision(G, { key: 'sponsor:' + G.season, kind: 'sponsor', from: 'Direction commerciale', icon: '💼',
    title: 'Choisir le sponsor maillot', text: 'Trois sponsors attendent une réponse. Sans contrat, aucune recette de sponsoring maillot cette saison.' });
  G.decisions = G.decisions.filter(d => !d.done || G.week - d.week < 12).slice(0, 120);
}
function pendingDecisions(G) { syncDecisions(G); return G.decisions.filter(d => !d.done); }
function blockingDecisions(G) { return pendingDecisions(G).filter(d => d.blocking); }

const DECISION_OPTS = {
  offer: d => [['accept', 'Accepter l\'offre', 'primary'], ['counter', 'Faire une contre-offre'], ['reject', 'Refuser', 'danger']],
  sponsor: d => [['open', 'Choisir un sponsor (Finances)', 'primary']],
  deal: d => [['open', 'Ouvrir la négociation', 'primary'], ['cancel', 'Abandonner', 'danger']],
  meet: d => [['promise', 'Lui promettre plus de temps de jeu', 'primary'], ['patience', 'Lui demander de la patience'], ['fight', 'Lui dire de gagner sa place'], ['list', 'Accepter de le mettre sur la liste des transferts'], ['refuse', 'Refuser l\'entretien', 'danger']],
  renew: d => [['nego', 'Ouvrir les négociations', 'primary'], ['later', 'Reporter (il sera déçu)'], ['no', 'Ne pas prolonger', 'danger']],
  staffRenew: d => [['renew', 'Prolonger 2 saisons', 'primary'], ['leave', 'Le laisser partir', 'danger']],
  info: d => [['ok', 'Bien reçu', 'primary']]
};
function decide(id, opt) {
  const d = G.decisions.find(x => x.id === id); if (!d || d.done) return;
  const p = d.ref != null ? getPlayer(G, d.ref) : null;
  let msg = '', done = true;
  switch (d.kind) {
    case 'offer': {
      if (opt === 'accept') { acceptOffer(d.ref); msg = 'Offre acceptée.'; }
      else if (opt === 'counter') { counterOffer(d.ref); done = false; }
      else { const o = G.offers.find(o => o.id === d.ref); if (o) { G.offers = G.offers.filter(x => x !== o); const pl = getPlayer(G, o.pid); if (pl?.wantsOut) pl.morale = clamp(pl.morale - 10, 5, 100); } msg = 'Offre refusée.'; }
      break;
    }
    case 'sponsor': show('finances'); done = false; break;
    case 'deal': { const dl = G.deals.find(x => x.id === d.ref); if (opt === 'cancel') { dealFail(dl, 'Négociation abandonnée par le club.'); msg = 'Négociation abandonnée.'; } else { openDeal(d.ref); done = false; } break; }
    case 'meet': msg = playerMeeting(p, opt); break;
    case 'renew':
      if (opt === 'nego') { p.renewAsked = G.season; renewModal(p.id); msg = 'Négociation ouverte.'; }
      else if (opt === 'later') { p.morale = clamp(p.morale - 5, 5, 100); p.trust = clamp((p.trust ?? 55) - 4, 0, 100); p.renewLater = G.week + 8; msg = `${p.name} attendra, sans enthousiasme.`; }
      else { p.morale = clamp(p.morale - 15, 5, 100); p.noRenew = G.season; p.listed = true; msg = `${p.name} sait qu'il ne sera pas prolongé. Il est placé sur la liste des transferts.`; groupEcho(p, -2); }
      break;
    case 'staffRenew': {
      const sp = G.staffPeople[d.ref];
      if (opt === 'renew') { sp.contract = 2; sp.wageW = roundMoney(sp.wageW * 1.08); msg = `${sp.name} prolonge de 2 saisons.`; }
      else { G.staffPeople[d.ref] = newStaffPerson(d.ref, 1); G.staff[d.ref] = 1; msg = `${sp.name} quitte le club. Un intérimaire de niveau 1 assure le poste : recrute un remplaçant.`; }
      break;
    }
    default: msg = '';
  }
  if (done) { d.done = opt; d.answer = msg; news(G, `${d.icon || '✔'} ${d.title} — ${msg}`, 'info'); }
  save();
  if (msg) toast(msg);
  if (!$('#top')) return;
  if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop();
}

// Entretien individuel demandé par un joueur
function playerMeeting(p, opt) {
  const lead = (p.pers === 'Professionnel' || p.pers === 'Leader'), ambit = p.pers === 'Ambitieux' || p.pers === 'Tempérament';
  p.lastMeet = G.week;
  let out;
  if (opt === 'promise') {
    G.promises.push({ pid: p.id, until: G.week + 5, apps: p.stats.apps, kind: 'temps de jeu' });
    p.morale = clamp(p.morale + 12, 5, 100); p.trust = clamp((p.trust ?? 55) + 8, 0, 100); p.ptWarn = 0;
    out = `${p.name} est rassuré. Promesse : jouer davantage dans les 5 prochaines semaines (elle sera suivie).`;
  } else if (opt === 'patience') {
    const ok = rnd() < .35 + (p.trust ?? 55) / 200 + (lead ? .15 : 0) - (ambit ? .15 : 0);
    p.morale = clamp(p.morale + (ok ? 6 : -6), 5, 100); p.trust = clamp((p.trust ?? 55) + (ok ? 3 : -6), 0, 100); if (ok) p.ptWarn = 0;
    out = ok ? `${p.name} accepte d'être patient.` : `${p.name} n'est pas convaincu par ton discours.`;
  } else if (opt === 'fight') {
    const ok = lead || rnd() < .3;
    p.morale = clamp(p.morale + (ok ? 4 : -10), 5, 100); p.trust = clamp((p.trust ?? 55) + (ok ? 2 : -8), 0, 100);
    out = ok ? `${p.name} relève le défi : il veut te prouver qu'il mérite sa place.` : `${p.name} le prend mal et en parle à ses proches dans le vestiaire.`;
    if (!ok) groupEcho(p, -2);
  } else if (opt === 'list') {
    p.listed = true; p.wantsOut = true; p.morale = clamp(p.morale + 6, 5, 100);
    out = `${p.name} est placé sur la liste des transferts, comme il le souhaitait.`;
  } else {
    p.morale = clamp(p.morale - 12, 5, 100); p.trust = clamp((p.trust ?? 55) - 15, 0, 100);
    out = `${p.name} est vexé que tu refuses de le recevoir.`; groupEcho(p, -3);
  }
  G.meetLog.unshift({ season: G.season, week: G.week, label: weekLabel(G), kind: 'Individuelle', who: p.name, topic: opt, result: out });
  return out;
}
// Un joueur influent répercute son humeur dans ses groupes
function groupEcho(p, d) {
  const inf = influence(G, p) / 60;
  for (const g of socialGroups(G)) if (g.members.includes(p)) for (const m of g.members) if (m !== p) m.morale = clamp(m.morale + d * inf, 5, 100);
}

// ============================================================
//  Boîte mail
// ============================================================
let MAIL_FILTER = 'all', MAIL_SEL = null;
const MAIL_SENDER = { board: ['Président', '🏛'], transfer: ['Directeur sportif', '💱'], offer: ['Directeur sportif', '💱'], scout: ['Cellule de recrutement', '🔎'], inj: ['Staff médical', '🏥'],
  youth: ['Centre de formation', '🌱'], press: ['Service presse', '📰'], win: ['Adjoint', '📋'], loss: ['Adjoint', '📋'], warn: ['Adjoint', '⚠'], trophy: ['Club', '🏆'], cup: ['Fédération', '🏆'], info: ['Secrétariat', '📌'] };
const MAIL_CATS = [['todo', 'À traiter'], ['all', 'Tous'], ['unread', 'Non lus'], ['club', 'Club & direction'], ['team', 'Équipe'], ['transfer', 'Mercato'], ['press', 'Presse'], ['world', 'Autres clubs'], ['done', 'Décisions prises']];
function mailCat(m) { return m.world ? 'world' : ['transfer', 'offer', 'scout'].includes(m.type) ? 'transfer' : m.type === 'press' ? 'press' : ['inj', 'youth', 'win', 'loss', 'warn'].includes(m.type) ? 'team' : 'club'; }
function mailSubject(m) { const t = m.text.replace(/^[^\wÀ-ÿ]+/u, ''); const s = t.split(/(?<=[.!?:])\s/)[0]; return s.length > 70 ? s.slice(0, 68) + '…' : s; }
function unreadMail(G) { return G.inbox.filter(m => !m.read && !m.world).length; }
function vMail(el) {
  migrateGestion(G);
  const decs = pendingDecisions(G), done = G.decisions.filter(d => d.done);
  for (const m of G.inbox) m.id ||= 'm' + (G.decSeq++);
  const items = [];
  if (['todo', 'all', 'unread'].includes(MAIL_FILTER)) decs.forEach(d => items.push({ id: 'd:' + d.id, dec: d }));
  if (MAIL_FILTER === 'done') done.forEach(d => items.push({ id: 'd:' + d.id, dec: d }));
  if (!['todo', 'done'].includes(MAIL_FILTER)) G.inbox.filter(m => MAIL_FILTER === 'all' ? !m.world : MAIL_FILTER === 'unread' ? !m.read && !m.world : mailCat(m) === MAIL_FILTER).slice(0, 150).forEach(m => items.push({ id: m.id, m }));
  if (!MAIL_SEL || !items.some(i => i.id === MAIL_SEL)) MAIL_SEL = items[0]?.id || null;
  const sel = items.find(i => i.id === MAIL_SEL);
  if (sel?.m) sel.m.read = true;
  const cnt = k => k === 'todo' ? decs.length : k === 'unread' ? unreadMail(G) : k === 'done' ? done.length : k === 'all' ? '' : G.inbox.filter(m => mailCat(m) === k && !m.read).length || '';
  const row = i => {
    if (i.dec) { const d = i.dec; return `<li data-id="${i.id}" class="${i.id === MAIL_SEL ? 'sel' : ''} ${d.done ? '' : 'todo'}"><span class="mi">${d.icon || '❗'}</span><div><b>${esc(d.title)}</b><small>${esc(d.from || 'Club')} · ${esc(d.label)}${d.done ? ' · ' + esc(d.answer || 'traité') : d.blocking ? ' · <em class="req">Réponse requise</em>' : ''}</small></div></li>`; }
    const [from, ic] = i.m.world ? ['Ligue', '🌐'] : MAIL_SENDER[i.m.type] || ['Club', '📌'];
    return `<li data-id="${i.id}" class="${i.id === MAIL_SEL ? 'sel' : ''} ${i.m.read ? '' : 'unread'}"><span class="mi">${ic}</span><div><b>${esc(mailSubject(i.m))}</b><small>${from} · ${esc(i.m.label || '')} · ${i.m.season}</small></div></li>`;
  };
  let read = '<div class="mail-empty">Aucun message sélectionné.</div>';
  if (sel?.dec) {
    const d = sel.dec, p = d.ref != null && ['meet', 'renew'].includes(d.kind) ? getPlayer(G, d.ref) : null;
    read = `<div class="mail-h"><span class="mi big">${d.icon || '❗'}</span><div><h2>${esc(d.title)}</h2><small>De : <b>${esc(d.from || 'Club')}</b> · ${esc(d.label)} ${d.season}/${d.season + 1}</small></div></div>
      ${p ? `<div class="row gap mail-p">${avatar(p, 56)}<div><b>${esc(p.name)}</b>${fictionalTag(p)}<br><small>${ROLES[p.pos].label} · ${p.age} ans · ${STATUS[p.status || 'rot'].label} · moral ${Math.round(p.morale)} % · confiance ${Math.round(p.trust ?? 55)} %</small><br><small>Contrat ${contractEnd(p)} · ${wageM(p.wage)}</small></div><button class="btn sm" onclick="playerModal(${p.id})">Fiche</button></div>` : ''}
      <div class="mail-b">${d.html || `<p>${esc(d.text)}</p>`}</div>
      ${d.done ? `<p class="hint">Décision prise : ${esc(d.answer || d.done)}</p>` : `<div class="mail-act">${(DECISION_OPTS[d.kind] || DECISION_OPTS.info)(d).map(([k, l, cls]) => `<button class="btn ${cls || ''}" data-dec="${k}">${esc(l)}</button>`).join('')}</div>
      ${d.blocking ? '<p class="hint">⛔ Tu ne peux pas avancer dans le calendrier tant que tu n\'as pas répondu.</p>' : ''}`}`;
  } else if (sel?.m) {
    const [from, ic] = sel.m.world ? ['Ligue', '🌐'] : MAIL_SENDER[sel.m.type] || ['Club', '📌'];
    const link = { transfer: ['transfers', 'Ouvrir le mercato'], offer: ['transfers', 'Ouvrir le mercato'], scout: ['transfers', 'Voir les rapports'], inj: ['medical', 'Ouvrir l\'infirmerie'], youth: ['youth', 'Centre de formation'], board: ['finances', 'Finances'], warn: ['dressing', 'Vestiaire'], press: ['meetings', 'Réunions'] }[sel.m.type];
    read = `<div class="mail-h"><span class="mi big">${ic}</span><div><h2>${esc(mailSubject(sel.m))}</h2><small>De : <b>${from}</b> · ${esc(sel.m.label || '')} ${sel.m.season}/${sel.m.season + 1}</small></div></div>
      <div class="mail-b"><p>${esc(sel.m.text)}</p></div>
      <div class="mail-act">${link ? `<button class="btn primary" onclick="show('${link[0]}')">${link[1]}</button>` : ''}<button class="btn" id="mDel">Supprimer</button></div>`;
  }
  el.innerHTML = `<section class="card mail">
    <div class="mail-top"><h2 class="grow">✉ Boîte mail</h2><button class="btn sm" id="mAll">Tout marquer comme lu</button></div>
    <div class="mail-cats">${MAIL_CATS.map(([k, l]) => `<button data-mf="${k}" class="${MAIL_FILTER === k ? 'on' : ''} ${k === 'todo' && decs.length ? 'alert' : ''}">${l}${cnt(k) ? ` <i>${cnt(k)}</i>` : ''}</button>`).join('')}</div>
    <div class="mail-grid"><ul class="mail-list">${items.map(row).join('') || '<li class="muted">Rien ici.</li>'}</ul><div class="mail-read">${read}</div></div></section>`;
  el.querySelectorAll('[data-mf]').forEach(b => b.onclick = () => { MAIL_FILTER = b.dataset.mf; MAIL_SEL = null; vMail(el); navBadges(); });
  el.querySelectorAll('.mail-list [data-id]').forEach(li => li.onclick = () => { MAIL_SEL = li.dataset.id; vMail(el); navBadges(); });
  el.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => decide(sel.dec.id, b.dataset.dec));
  $('#mAll').onclick = () => { G.inbox.forEach(m => m.read = true); vMail(el); navBadges(); };
  $('#mDel')?.addEventListener('click', () => { G.inbox = G.inbox.filter(m => m !== sel.m); MAIL_SEL = null; save(); vMail(el); });
}

// ============================================================
//  Transferts en étapes : club → conditions personnelles → visite médicale → signature
// ============================================================
const DEAL_STAGES = [['club_wait', 'Offre au club'], ['terms', 'Conditions du joueur'], ['medical', 'Visite médicale'], ['done', 'Signature']];
const DEAL_USER = ['club_counter', 'terms', 'medical_fail'];
const DEAL_LABEL = { club_wait: 'Offre envoyée — réponse du club attendue', club_counter: 'Contre-offre du club', terms: 'Conditions personnelles à négocier', medical: 'Visite médicale programmée', medical_fail: 'Problème à la visite médicale', done: 'Transfert officiel', failed: 'Échec' };
offerModal = function (pid) {
  const p = getPlayer(G, pid); if (!p) return;
  const ex = G.deals.find(d => d.pid === pid && !['done', 'failed'].includes(d.status));
  if (ex) return openDeal(ex.id);
  if (p.club === G.clubId) return toast('Ce joueur est déjà dans ton effectif.', 'err');
  const seller = p.club != null ? getClub(G, p.club) : null, me = myClub(G), known = knows(G, p);
  if (seller && !windowOpen(G)) return toast('Mercato fermé : seuls les joueurs libres peuvent signer. Prépare tes cibles dans le suivi.', 'err');
  if (seller && G.board.ban) return toast('Interdiction de recruter (contrôle de gestion) : seuls les joueurs libres sont autorisés.', 'err');
  if (clubPlayers(G, G.clubId).length >= 32) return toast('Effectif complet (32 max). Vends ou libère quelqu\'un.', 'err');
  if (!seller) return createDeal(p, null, { fee: 0, plan: 'cash', addOn: 0, sellOn: 0, swap: null });
  const myPlayers = clubPlayers(G, G.clubId).filter(x => !x.loan).sort((a, b) => b.value - a.value);
  const o = { fee: roundMoney(p.value * .9), plan: 'cash', addOn: 0, sellOn: 0, swap: null };
  modal(`<h2>Offre de transfert : ${esc(p.name)}</h2>
    <div class="row gap">${avatar(p, 56)}<div><p>${ROLES[p.pos].label} · ${p.age} ans · ${ovrCell(p)} ${potCell(p)}</p>
      <p>${crest(seller, 18)} ${esc(seller.name)} · valeur estimée <b>${money(p.value)}</b> · contrat ${contractEnd(p)}${p.clause && known ? ` · clause <b>${money(p.clause)}</b>` : ''}</p></div></div>
    ${dealSteps('club_wait')}
    <p>${typeof transferBudgetLine === 'function' ? transferBudgetLine(G) : `Budget transferts : <b>${money(G.board.transfer)}</b>`} · trésorerie ${money(me.budget)}</p>
    <div class="form-grid">
      <label>Indemnité (€) <input id="fee" type="number" step="100000" value="${o.fee}"></label>
      <label>Paiement <select id="plan">${PAY_PLANS.map(x => `<option value="${x.k}">${x.label}</option>`).join('')}</select></label>
      <label>Bonus après 25 matchs (€) <input id="addon" type="number" step="100000" value="0"></label>
      <label>% à la revente pour eux <select id="sellon">${[0, 10, 15, 20, 30].map(v => `<option>${v}</option>`).join('')}</select></label>
      <label>Joueur inclus dans l'échange <select id="swap"><option value="">— Aucun —</option>${myPlayers.map(x => `<option value="${x.id}">${esc(x.name)} (${x.pos}, ${money(x.value)})</option>`).join('')}</select></label>
    </div>
    <p class="hint">L'offre est envoyée au club : sa réponse arrive la semaine suivante (acceptation, contre-offre ou refus motivé). Ensuite seulement viennent les conditions du joueur et la visite médicale. Le transfert doit être bouclé avant la fermeture du mercato.</p>
    <div class="row gap mt">${p.clause && known ? `<button class="btn" id="clz">💥 Payer la clause (${money(p.clause)})</button>` : ''}<div class="grow"></div><button class="btn primary" id="ok">Envoyer l'offre</button></div><p id="resp" class="hint"></p>`, 'wide');
  const read = () => ({ fee: +$('#fee').value, plan: $('#plan').value, addOn: +$('#addon').value || 0, sellOn: +$('#sellon').value || 0, swap: $('#swap').value ? +$('#swap').value : null });
  const check = x => {
    const nowPay = x.fee * PAY_PLANS.find(k => k.k === x.plan).now;
    if (x.fee > availableTransfer(G) + 1 || nowPay > me.budget) return `Le président refuse : budget transferts disponible insuffisant (${money(availableTransfer(G))} après les négociations en cours) ou trésorerie insuffisante.`;
    return '';
  };
  $('#ok').onclick = () => { const x = read(), e = check(x); if (e) return $('#resp').innerHTML = '❌ ' + esc(e); createDeal(p, seller, x); };
  $('#clz')?.addEventListener('click', () => { const x = { fee: p.clause, plan: 'cash', addOn: 0, sellOn: 0, swap: null, viaClause: true }, e = check(x); if (e) return $('#resp').innerHTML = '❌ ' + esc(e); createDeal(p, seller, x); });
};
function dealSteps(cur) {
  const order = ['club_wait', 'terms', 'medical', 'done'], map = { club_counter: 'club_wait', medical_fail: 'medical', failed: null };
  const i = order.indexOf(map[cur] !== undefined ? map[cur] : cur);
  return `<div class="steps">${DEAL_STAGES.map(([k, l], n) => `<span class="${n < i ? 'done' : n === i ? 'on' : ''}">${n + 1}. ${l}</span>`).join('')}</div>`;
}
function createDeal(p, seller, offer) {
  const d = { id: G.dealSeq++, pid: p.id, from: seller?.id ?? null, offer, status: seller ? 'club_wait' : 'terms', week: G.week, respond: G.week + 1, rounds: 0, log: [] };
  d.log.push(`${weekLabel(G)} : ${seller ? `offre de ${money(offer.fee)} envoyée à ${seller.name}` : 'contact avec l\'agent du joueur libre'}.`);
  if (!seller) dealDemands(d);
  if (seller && offer.viaClause) { d.status = 'terms'; d.log.push('Clause libératoire activée : le club vendeur ne peut pas refuser.'); dealDemands(d); }
  G.deals.unshift(d);
  closeModal(); save();
  toast(seller && !offer.viaClause ? `Offre envoyée à ${seller.name}. Réponse la semaine prochaine.` : 'Place aux conditions personnelles.');
  if (d.status === 'terms') openDeal(d.id); else refresh();
}
// Demandes de l'agent (salaire mensuel, durée, primes, statut)
function dealDemands(d) {
  const p = getPlayer(G, d.pid), me = myClub(G);
  const rank = clubPlayers(G, G.clubId).filter(x => playerOvr(x) > playerOvr(p)).length;
  const want = defaultStatus(rank, p.age);
  const base = Math.max(demandWage(G, p, me), p.wage * (d.from != null ? 1.12 : .95)) * (1.08 + Math.max(0, playerOvr(p) - me.rep) / 40) * (p.pers === 'Ambitieux' ? 1.12 : 1);
  d.demand = { wageM: monthly(base), yrs: p.age >= 31 ? 2 : p.age <= 23 ? 5 : 4, status: want, signOn: roundMoney(monthly(base) * (d.from != null ? 2 : 6)),
    agentFee: roundMoney(d.from != null ? Math.max(d.offer.fee * .06, monthly(base) * 2) : monthly(base) * 4), clauseMin: p.pers === 'Ambitieux' && playerOvr(p) >= 72 ? roundMoney(p.value * 1.6) : 0 };
  d.patience = 3 + (p.pers === 'Professionnel' ? 1 : 0) - (p.pers === 'Tempérament' ? 1 : 0);
}
function openDeal(id) {
  const d = G.deals.find(x => x.id === id); if (!d) return;
  const p = getPlayer(G, d.pid), seller = d.from != null ? getClub(G, d.from) : null;
  let body = '';
  if (d.status === 'club_counter') {
    body = `<p>${esc(seller.name)} répond : ${esc(d.reason || '')} Ils accepteraient <b>${money(d.counter)}</b> (mêmes modalités).</p>
      <div class="row gap mt"><div class="grow"></div><button class="btn danger" id="dNo">Retirer l'offre</button><button class="btn" id="dRe">Faire une nouvelle offre</button><button class="btn primary" id="dYes">Accepter ${money(d.counter)}</button></div>`;
  } else if (d.status === 'terms') {
    const t = d.terms || { ...d.demand, wageM: roundMoney(d.demand.wageM * .9), clause: d.demand.clauseMin, goalBonus: 0, appBonus: 0 };
    body = `<p>L'agent de ${esc(p.name)} demande : <b>${money(d.demand.wageM)}/mois</b> sur ${d.demand.yrs} saisons, statut « <b>${STATUS[d.demand.status].label}</b> », prime à la signature ${money(d.demand.signOn)}, commission d'agent ${money(d.demand.agentFee)}${d.demand.clauseMin ? `, clause libératoire d'au moins ${money(d.demand.clauseMin)}` : ''}.</p>
      <p class="hint">Masse salariale : ${wageM(wageBill(G))} sur un plafond de ${wageM(G.board.wageCap)} · patience de l'agent : ${'●'.repeat(Math.max(0, d.patience))}${'○'.repeat(Math.max(0, 4 - d.patience))}</p>
      <div class="form-grid">
        <label>Salaire (€/mois) <input id="tW" type="number" step="5000" value="${t.wageM}"></label>
        <label>Durée (saisons) <select id="tY">${[1, 2, 3, 4, 5].map(y => `<option ${y === t.yrs ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
        <label>Statut promis <select id="tS">${STATUS_ORDER.map(k => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}</select></label>
        <label>Prime à la signature (€) <input id="tB" type="number" step="10000" value="${t.signOn}"></label>
        <label>Commission d'agent (€) <input id="tA" type="number" step="10000" value="${t.agentFee}"></label>
        <label>Clause libératoire (€, 0 = aucune) <input id="tC" type="number" step="500000" value="${t.clause || 0}"></label>
        <label>Prime par but (€) <input id="tG" type="number" step="1000" value="${t.goalBonus || 0}"></label>
        <label>Prime par match joué (€) <input id="tM" type="number" step="1000" value="${t.appBonus || 0}"></label>
      </div>
      <div class="row gap mt"><button class="btn danger" id="dNo">Rompre les discussions</button><div class="grow"></div><button class="btn primary" id="dTerms">Proposer ces conditions</button></div>`;
  } else if (d.status === 'medical_fail') {
    body = `<p>⚕ ${esc(d.reason)}</p><div class="row gap mt"><div class="grow"></div><button class="btn danger" id="dNo">Annuler le transfert</button>${seller ? '<button class="btn" id="dDisc">Demander une baisse de 25 %</button>' : ''}<button class="btn primary" id="dSign">Signer quand même</button></div>`;
  } else {
    body = `<p>${esc(DEAL_LABEL[d.status] || d.status)}${d.status === 'club_wait' ? ` — réponse attendue ${d.respond <= G.week ? 'cette semaine' : 'la semaine prochaine'}.` : d.status === 'medical' ? ' — résultat la semaine prochaine.' : ''}</p>`;
  }
  modal(`<h2>${seller ? 'Transfert' : 'Signature'} : ${esc(p.name)}</h2>
    <div class="row gap">${avatar(p, 50)}<div><small>${ROLES[p.pos].label} · ${p.age} ans · ${seller ? esc(seller.name) : 'joueur libre'}</small><br>${seller ? `Offre : <b>${money(d.offer.fee)}</b> (${PAY_PLANS.find(x => x.k === d.offer.plan).label})${d.offer.addOn ? ` + bonus ${money(d.offer.addOn)}` : ''}${d.offer.sellOn ? ` + ${d.offer.sellOn} % revente` : ''}` : 'Pas d\'indemnité de transfert'}</div></div>
    ${dealSteps(d.status)}${body}<p class="hint" id="dResp"></p>
    <details class="mt"><summary>Historique de la négociation</summary><small>${d.log.map(esc).join('<br>')}</small></details>`, 'wide');
  $('#dNo')?.addEventListener('click', () => { dealFail(d, 'Négociation interrompue par ton club.'); closeModal(); refresh(); });
  $('#dYes')?.addEventListener('click', () => {
    if (d.counter > availableTransfer(G, d.id) + 1) return $('#dResp').innerHTML = `❌ Budget transferts disponible insuffisant (${money(availableTransfer(G, d.id))} hors cette négociation).`;
    d.offer.fee = d.counter; d.status = 'terms'; d.log.push(`${weekLabel(G)} : accord avec ${seller.name} à ${money(d.counter)}.`); dealDemands(d); save(); openDeal(d.id);
  });
  $('#dRe')?.addEventListener('click', () => { G.deals = G.deals.filter(x => x !== d); offerModal(p.id); });
  $('#dTerms')?.addEventListener('click', () => {
    d.terms = { wageM: +$('#tW').value, yrs: +$('#tY').value, status: $('#tS').value, signOn: +$('#tB').value || 0, agentFee: +$('#tA').value || 0, clause: +$('#tC').value || 0, goalBonus: +$('#tG').value || 0, appBonus: +$('#tM').value || 0 };
    const r = evalTerms(d); d.log.push(`${weekLabel(G)} : conditions proposées (${money(d.terms.wageM)}/mois, ${d.terms.yrs} ans) → ${r.txt}`);
    if (r.ok) { d.status = 'medical'; d.respond = G.week + 1; save(); closeModal(); toast(`Accord personnel avec ${p.name} ! Visite médicale la semaine prochaine.`); refresh(); return; }
    d.patience--;
    if (d.patience <= 0) { dealFail(d, `L'agent de ${p.name} rompt les discussions : ${r.txt}`); closeModal(); refresh(); return; }
    save(); openDeal(d.id); $('#dResp').innerHTML = '❌ ' + esc(r.txt);
  });
  $('#dDisc')?.addEventListener('click', () => {
    if (rnd() < .55) { d.offer.fee = roundMoney(d.offer.fee * .75); d.log.push('Indemnité réduite de 25 % après la visite médicale.'); dealComplete(d); }
    else { d.log.push('Le club vendeur refuse de baisser le prix.'); save(); openDeal(d.id); $('#dResp').textContent = `${seller.name} refuse de baisser son prix.`; }
  });
  $('#dSign')?.addEventListener('click', () => dealComplete(d));
}
function evalTerms(d) {
  const p = getPlayer(G, d.pid), me = myClub(G), t = d.terms, dm = d.demand;
  const sGap = STATUS_ORDER.indexOf(t.status) - STATUS_ORDER.indexOf(dm.status);
  if (playerOvr(p) - me.rep - (G.mgr.rep - 50) * .15 > 18 && !d.repChecked) { d.repChecked = true; if (rnd() < .6) return { ok: false, txt: `${p.name} ne veut pas rejoindre un club de ce niveau.` }; }
  if (sGap >= 2) return { ok: false, txt: `il refuse le statut « ${STATUS[t.status].label} ».` };
  if (dm.clauseMin && (!t.clause || t.clause > dm.clauseMin * 1.5)) return { ok: false, txt: `il exige une clause libératoire autour de ${money(dm.clauseMin)}.` };
  if (wageBill(G) + weekly(t.wageM) > G.board.wageCap) return { ok: false, txt: `le président bloque : plafond salarial (${wageM(G.board.wageCap)}) dépassé.` };
  if (t.signOn + t.agentFee > me.budget) return { ok: false, txt: 'trésorerie insuffisante pour la prime et la commission.' };
  // valeur globale du paquet vs demande (sur la durée)
  const pkg = t.wageM * 12 * t.yrs + t.signOn + t.agentFee * .6 + (t.goalBonus * (p.pos === 'BU' ? 12 : 4) + t.appBonus * 25) * t.yrs - Math.max(0, sGap) * dm.wageM * 6 + Math.max(0, -sGap) * dm.wageM * 3 + (t.clause && !dm.clauseMin ? dm.wageM * 2 : 0);
  const ask = dm.wageM * 12 * dm.yrs * (t.yrs < dm.yrs - 1 ? 1.1 : 1) + dm.signOn + dm.agentFee * .6;
  if (t.agentFee < dm.agentFee * .6) return { ok: false, txt: 'l\'agent juge sa commission insultante.' };
  if (pkg >= ask * .93) return { ok: true, txt: 'accepté' };
  return { ok: false, txt: `trop loin des demandes (environ ${Math.round(pkg / ask * 100)} %). Il attend ~${money(roundMoney(dm.wageM * (ask * .95 / Math.max(1, pkg)) * t.wageM / dm.wageM))}/mois.` };
}
function dealFail(d, why) {
  if (!d) return;
  d.status = 'failed'; d.log.push(why);
  const p = getPlayer(G, d.pid);
  news(G, `❌ Transfert avorté : ${p?.name || 'joueur'} — ${why}`, 'transfer');
  save();
}
function dealComplete(d) {
  const p = getPlayer(G, d.pid), me = myClub(G), seller = d.from != null ? getClub(G, d.from) : null, t = d.terms;
  const plan = PAY_PLANS.find(x => x.k === d.offer.plan) || PAY_PLANS[0];
  const nowPay = roundMoney(d.offer.fee * plan.now);
  if (seller) { flow(G, me, -nowPay, 'transfers'); flow(G, seller, nowPay, 'sales'); scheduleRest(G, me.id, seller.id, d.offer.fee - nowPay, plan.weeks); G.board.transfer = roundMoney(G.board.transfer - d.offer.fee); }
  flow(G, me, -t.signOn, 'agents'); flow(G, me, -t.agentFee, 'agents');
  if (d.offer.swap) { const sp = getPlayer(G, d.offer.swap); if (sp && sp.club === G.clubId) { removeFromTactics(sp.id); sp.club = seller.id; sp.num = null; sp.status = null; sp.listed = false; assignNumbers(clubPlayers(G, seller.id)); logTransfer(G, sp, me.id, seller.id, 0, 'échange'); } }
  if (seller && p.sellOn) paySellOn(G, p, d.offer.fee, seller);
  logTransfer(G, p, seller?.id ?? null, me.id, d.offer.fee, seller ? (d.offer.viaClause ? 'clause' : 'transfert') : 'libre');
  p.club = G.clubId; p.wage = weekly(t.wageM); p.contract = t.yrs; p.contractSim = false; p.listed = false; p.morale = 82; p.num = null; p.status = t.status; p.trust = 60; p.clause = t.clause || 0; p.recentMin = [];
  p.deal = { signOn: t.signOn, goalBonus: t.goalBonus, appBonus: t.appBonus, agentFee: t.agentFee, signed: `${weekLabel(G)} ${G.season}` };
  p.statusPromised = STATUS_ORDER.indexOf(t.status) <= 1;
  p.joinedSeason = G.season; p.integ = 20;
  if (seller && d.offer.addOn) p.addOn = { club: seller.id, amount: d.offer.addOn, need: 25, count: 0 };
  if (seller && d.offer.sellOn) p.sellOn = { club: seller.id, pct: d.offer.sellOn };
  assignNumbers(clubPlayers(G, G.clubId));
  me.coh = clamp((me.coh ?? 60) - 3, 0, 100);
  G.shortlist = G.shortlist.filter(id => id !== p.id);
  if (G.tactics.bench.length < 9) G.tactics.bench.push(p.id);
  d.status = 'done'; d.log.push(`${weekLabel(G)} : signature officielle.`);
  news(G, `✍ Officiel : ${p.name} signe jusqu'en juin ${G.season + t.yrs}${seller ? ` en provenance de ${seller.name} (${money(d.offer.fee)})` : ' (joueur libre)'}. Salaire ${money(t.wageM)}/mois, statut ${STATUS[t.status].label}.`, 'transfer');
  closeModal(); save(); toast(`${p.name} a signé ! 🎉`); refresh();
}
function dealsWeekly(G) {
  for (const d of G.deals) {
    if (['done', 'failed'].includes(d.status)) continue;
    const p = getPlayer(G, d.pid), seller = d.from != null ? getClub(G, d.from) : null;
    if (!p) { d.status = 'failed'; continue; }
    if (seller && p.club !== seller.id) { dealFail(d, `${p.name} a rejoint un autre club entre-temps.`); continue; }
    if (seller && !windowOpen(G) && d.status !== 'medical') { dealFail(d, 'le mercato a fermé avant la fin des négociations.'); continue; }
    if (d.status === 'club_wait' && G.week >= d.respond) {
      const ask = sellerAsk(G, p, myClub(G)), v = dealValue(G, d.offer, p);
      const key = clubPlayers(G, seller.id).sort((a, b) => playerOvr(b) - playerOvr(a)).indexOf(p) < 3;
      if (clubPlayers(G, seller.id).length <= 18 && !d.offer.swap) { dealFail(d, `${seller.name} refuse : effectif trop court pour vendre.`); continue; }
      if (key && seller.rep >= myClub(G).rep + 6 && !p.listed && rnd() < .6) { dealFail(d, `${seller.name} répond que ${p.name} n'est pas à vendre.`); continue; }
      if (v >= ask) { d.status = 'terms'; d.log.push(`${weekLabel(G)} : ${seller.name} accepte l'offre.`); dealDemands(d); notifyDeal(d, `${seller.name} accepte ton offre pour ${p.name}`, `Accord entre les clubs à ${money(d.offer.fee)}. Négocie maintenant le contrat avec l'agent du joueur.`); }
      else if (v >= ask * .78) { d.status = 'club_counter'; d.counter = roundMoney(d.offer.fee + (ask - v) / (PAY_PLANS.find(x => x.k === d.offer.plan).f || 1) + ask * .02); d.reason = 'offre jugée insuffisante.'; d.log.push(`${weekLabel(G)} : contre-offre à ${money(d.counter)}.`); notifyDeal(d, `Contre-offre de ${seller.name} pour ${p.name}`, `${seller.name} demande ${money(d.counter)} au lieu de ${money(d.offer.fee)}.`); }
      else dealFail(d, `${seller.name} rejette l'offre (valeur perçue ${money(roundMoney(v))}, attente ~${money(roundMoney(ask))}).`);
    } else if (d.status === 'medical' && G.week >= d.respond) {
      const risk = (p.injury > 30 ? .7 : p.injury > 0 ? .3 : 0) + (p.frag >= 16 ? .12 : 0);
      if (rnd() < risk) { d.status = 'medical_fail'; d.reason = `La visite médicale de ${p.name} révèle ${p.injury > 0 ? `une blessure en cours (${fmtDays(p.injury)})` : 'une fragilité musculaire importante'}.`; notifyDeal(d, `Visite médicale : problème pour ${p.name}`, d.reason); }
      else dealComplete(d);
    } else if (DEAL_USER.includes(d.status) && G.week - (d.userSince ?? G.week) > 2) {
      dealFail(d, 'sans réponse de ta part, l\'autre partie a mis fin aux discussions.');
    }
    if (DEAL_USER.includes(d.status)) d.userSince ??= G.week; else delete d.userSince;
  }
}
function notifyDeal(d, title, text) {
  addDecision(G, { key: `deal:${d.id}:${d.status}:${G.week}`, kind: 'deal', ref: d.id, from: 'Directeur sportif', icon: '📝', title, text });
}
function vDeals(el) {
  const act = G.deals.filter(d => !['done', 'failed'].includes(d.status)), past = G.deals.filter(d => ['done', 'failed'].includes(d.status)).slice(0, 20);
  const row = d => { const p = getPlayer(G, d.pid), s = d.from != null ? getClub(G, d.from) : null; return p ? `<tr class="click" data-d="${d.id}"><td>${avatar(p, 30)}</td><td class="nm"><b>${esc(p.name)}</b><br><small>${p.pos} · ${p.age} ans</small></td><td>${s ? crest(s, 18) + ' ' + esc(s.name) : 'Libre'}</td><td>${s ? money(d.offer.fee) : '—'}</td><td>${dealSteps(d.status)}</td><td class="${DEAL_USER.includes(d.status) ? 'warn' : d.status === 'failed' ? 'neg' : ''}">${esc(DEAL_LABEL[d.status])}${d.status === 'failed' ? `<br><small>${esc(d.log[d.log.length - 1] || '')}</small>` : ''}</td></tr>` : ''; };
  el.innerHTML = `<section class="card"><h2>📝 Négociations en cours <small>${act.length}</small></h2>
    ${act.length ? `<table class="tbl deals">${act.map(row).join('')}</table>` : '<p class="muted">Aucune. Fais une offre depuis la fiche d\'un joueur (Mercato → Recherche ou Suivi).</p>'}
    <p class="hint">Étapes : offre au club (réponse la semaine suivante) → conditions personnelles avec l'agent (3 à 4 tentatives) → visite médicale → signature. Sans réponse de ta part pendant 2 semaines, la négociation est abandonnée. Le mercato doit être ouvert, sauf pour les joueurs libres.</p></section>
    <section class="card"><h2>Historique récent</h2>${past.length ? `<table class="tbl deals">${past.map(row).join('')}</table>` : '<p class="muted">—</p>'}</section>`;
  el.querySelectorAll('[data-d]').forEach(r => r.onclick = () => openDeal(+r.dataset.d));
}

// Vente : le joueur doit aussi accepter le club acheteur
const __acceptOffer = acceptOffer;
acceptOffer = function (oid) {
  const o = G.offers.find(o => o.id === oid); if (!o) return;
  const p = getPlayer(G, o.pid), buyer = getClub(G, o.club);
  if (!p.wantsOut && buyer.rep < myClub(G).rep - 4 && (p.pers === 'Ambitieux' || rnd() < .4)) {
    G.offers = G.offers.filter(x => x !== o);
    news(G, `🙅 ${p.name} refuse de rejoindre ${buyer.name} : il ne veut pas d'un club moins ambitieux. Le transfert ne se fait pas.`, 'transfer');
    save(); refresh(); return toast(`${p.name} refuse de partir à ${buyer.name}.`, 'err');
  }
  __acceptOffer(oid);
};

// Prolongation : négociation avec l'agent, salaires mensuels
renewModal = function (pid) {
  const p = getPlayer(G, pid);
  const askW = Math.max(p.wage, demandWage(G, p, myClub(G))) * (1.05 + (p.morale < 50 ? .3 : 0) + (p.pers === 'Ambitieux' ? .15 : 0) + (p.contract <= 1 ? .08 : 0));
  const askM = monthly(askW), yrsW = p.age >= 31 ? 1 : p.age <= 23 ? 5 : 3;
  p.renewPatience ??= 3;
  if (p.noRenew === G.season || p.wantsOut) return toast(`${p.name} ne veut pas discuter de prolongation.`, 'err');
  modal(`<h2>Prolonger ${esc(p.name)}</h2>
    <p>Contrat actuel : ${contractEnd(p, true)} · ${wageM(p.wage)}</p>
    <p>Son agent demande environ <b>${money(askM)}/mois</b> sur ${yrsW} saison(s) et une prime à la signature de ${money(askM * 2)}.</p>
    <div class="form-grid">
      <label>Salaire (€/mois) <input id="wg" type="number" step="5000" value="${askM}"></label>
      <label>Durée <select id="yrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === yrsW ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
      <label>Prime à la signature (€) <input id="sb" type="number" step="10000" value="${roundMoney(askM * 2)}"></label>
      <label>Clause libératoire (€, 0 = aucune) <input id="cl" type="number" step="500000" value="${p.clause || 0}"></label>
    </div>
    <p class="hint">Patience de l'agent : ${'●'.repeat(p.renewPatience)}. Un joueur en fin de contrat peut partir libre le 30 juin.</p>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ok">Proposer</button></div><p id="resp" class="hint"></p>`);
  $('#ok').onclick = () => {
    const m = +$('#wg').value, y = +$('#yrs').value, sb = +$('#sb').value || 0, cl = +$('#cl').value || 0;
    if (wageBill(G) - p.wage + weekly(m) > G.board.wageCap) { $('#resp').innerHTML = `❌ Le président refuse : plafond salarial (${wageM(G.board.wageCap)}) dépassé.`; return; }
    if (sb > myClub(G).budget) { $('#resp').innerHTML = '❌ Trésorerie insuffisante pour la prime.'; return; }
    const val = m * 12 * y + sb - (cl && cl < p.value ? m * 3 : 0), ask = askM * 12 * y * (Math.abs(y - yrsW) > 1 ? 1.08 : 1) + askM * 2;
    if (val >= ask * .94) {
      flow(G, myClub(G), -sb, 'agents');
      p.wage = weekly(m); p.contract = y; p.clause = cl; p.contractSim = false; p.morale = clamp(p.morale + 10, 0, 100); p.renewPatience = 3; p.deal = { ...(p.deal || {}), signOn: sb, signed: `${weekLabel(G)} ${G.season}` };
      news(G, `✍ ${p.name} prolonge jusqu'en juin ${G.season + y} (${money(m)}/mois).`, 'transfer');
      save(); closeModal(); toast(`${p.name} prolonge !`); refresh();
    } else {
      p.renewPatience--; p.morale = clamp(p.morale - 3, 0, 100);
      if (p.renewPatience <= 0) { p.noRenew = G.season; closeModal(); news(G, `${p.name} rompt les discussions de prolongation. Il partira libre en fin de contrat si rien ne change.`, 'warn'); save(); return toast(`${p.name} met fin aux discussions.`, 'err'); }
      $('#resp').innerHTML = `❌ Refusé (offre à ${Math.round(val / ask * 100)} % de ses attentes). Patience restante : ${p.renewPatience}.`;
    }
  };
};

// ============================================================
//  Staff nominatif : recrutement, contrats, licenciements
// ============================================================
const STAFF_FIRST = ['Marc', 'Julien', 'Stéphane', 'Nicolas', 'Olivier', 'Franck', 'Laurent', 'David', 'Paolo', 'Javier', 'Thomas', 'Mehdi', 'Sven', 'Rui', 'Karim', 'Bruno', 'Éric', 'Sébastien', 'Gianluca', 'Andreas'];
const STAFF_LAST = ['Lemaire', 'Garcia', 'Rossi', 'Müller', 'Ferreira', 'Benali', 'Durand', 'Petit', 'Moreau', 'Schmidt', 'Costa', 'Santos', 'Fabre', 'Klein', 'Navarro', 'Bianchi', 'Weber', 'Roux', 'Lopes', 'Haddad'];
const STAFF_SPEC = { assistant: ['Analyse des adversaires', 'Gestion humaine', 'Animation offensive', 'Organisation défensive'], coach: ['Technique', 'Physique', 'Jeunes joueurs', 'Coups de pied arrêtés'],
  physio: ['Prévention', 'Rééducation', 'Préparation athlétique'], scout: ['Amérique du Sud', 'Afrique', 'Europe du Nord', 'Jeunes talents', 'Marché français'], youth: ['Détection', 'Formation technique', 'Mental des jeunes'] };
function newStaffPerson(role, lvl, name) {
  return { name: name || pick(STAFF_FIRST) + ' ' + pick(STAFF_LAST), age: rint(32, 64), lvl, spec: pick(STAFF_SPEC[role]), wageW: G ? staffWage(lvl, G) : 1200 * lvl * lvl, contract: rint(1, 3), rep: clamp(lvl * 18 + rint(-8, 8), 5, 99) };
}
function staffMarket(G) {
  if (!G.staffMarket || G.week - (G.staffMarket.week ?? -99) >= 4 || G.staffMarket.season !== G.season) {
    const rep = myClub(G).rep, top = clamp(Math.round(rep / 18), 2, 5);
    G.staffMarket = { week: G.week, season: G.season, list: Object.keys(STAFF).flatMap(role => Array.from({ length: 4 }, () => {
      const lvl = clamp(top + rint(-2, 1), 1, 5), s = newStaffPerson(role, lvl);
      const employed = rnd() < .55;
      return { ...s, role, id: role + rint(1e5, 1e6), employer: employed ? pick(G.clubs.filter(c => c.id !== G.clubId)).name : null, comp: employed ? s.wageW * rint(8, 20) : 0, wageW: roundMoney(s.wageW * (.85 + rnd() * .4)), wants: lvl > top ? 'Hésite : préfère un club plus réputé' : '' };
    })) };
  }
  return G.staffMarket.list;
}
function vStaffPeople(el) {
  if (!el.isConnected) { refresh(); return; }
  migrateGestion(G);
  const c = myClub(G), sp = G.staffPeople, mk = staffMarket(G);
  const lvl = l => '★'.repeat(l) + '☆'.repeat(5 - l);
  const total = Object.values(sp).reduce((s, x) => s + x.wageW, 0);
  el.innerHTML = `<section class="card"><h2>🧑‍💼 Staff technique <small>masse salariale ${wageM(total)}</small></h2>
    <table class="tbl wrap staff"><thead><tr><th>Poste</th><th>Nom</th><th>Niveau</th><th>Spécialité</th><th>Âge</th><th>Salaire</th><th>Contrat</th><th></th></tr></thead><tbody>
    ${Object.entries(STAFF).map(([k, s]) => { const x = sp[k]; if (k === 'scout' && G.cell) return `<tr><td><b>${s.label}</b></td><td colspan="7">Géré dans la <a href="#" onclick="show('cell');return false">Cellule de recrutement</a> (responsable : ${esc(x.name)})</td></tr>`; return `<tr><td><b>${s.label}</b><br><small class="muted">${esc(s.tip)}</small></td><td>${esc(x.name)}</td><td class="stars">${lvl(x.lvl)}</td><td>${esc(x.spec)}</td><td>${x.age}</td><td>${wageM(x.wageW)}</td><td>06/${G.season + x.contract}</td>
      <td><button class="btn sm danger" data-fire="${k}">Licencier</button></td></tr>`; }).join('')}</tbody></table>
    <p class="hint">Licencier coûte une indemnité égale à 50 % du salaire restant dû. Le niveau du staff agit réellement sur le moteur (progression, blessures, rapports, jeunes, conseils).</p></section>
    <section class="card"><div class="row gap"><h2 class="grow">📋 Candidats disponibles</h2><small class="muted">liste renouvelée toutes les 4 semaines</small></div>
    <div class="tabs sm" id="stTabs">${Object.entries(STAFF).filter(([k]) => k !== 'scout' || !G.cell).map(([k, s], i) => `<button data-r="${k}" class="${i === 0 ? 'on' : ''}">${s.label}</button>`).join('')}</div>
    <div id="stList" class="mt"></div></section>
    <div id="facBox"></div>`;
  const list = role => {
    $('#stList').innerHTML = `<table class="tbl wrap"><thead><tr><th>Nom</th><th>Niveau</th><th>Spécialité</th><th>Âge</th><th>Situation</th><th>Salaire demandé</th><th>Coût d'arrivée</th><th></th></tr></thead><tbody>
      ${mk.filter(x => x.role === role).map(x => `<tr><td>${esc(x.name)}</td><td class="stars">${lvl(x.lvl)}</td><td>${esc(x.spec)}</td><td>${x.age}</td><td>${x.employer ? 'Sous contrat à ' + esc(x.employer) : 'Libre'}${x.wants ? `<br><small class="warn">${esc(x.wants)}</small>` : ''}</td><td>${wageM(x.wageW)}</td><td>${x.comp ? money(x.comp) + ' (indemnité)' : '—'}</td>
        <td><button class="btn sm primary" data-hire="${x.id}">Négocier</button></td></tr>`).join('')}</tbody></table>
      <p class="hint">Poste actuel : ${esc(sp[role].name)} (${lvl(sp[role].lvl)}). L'embauche remplace le titulaire actuel (indemnité de départ).</p>`;
    $$('#stList [data-hire]').forEach(b => b.onclick = () => hireStaff(b.dataset.hire, el));
  };
  $$('#stTabs button').forEach(b => b.onclick = () => { $$('#stTabs button').forEach(x => x.classList.toggle('on', x === b)); list(b.dataset.r); });
  list(Object.keys(STAFF)[0]);
  el.querySelectorAll('[data-fire]').forEach(b => b.onclick = () => {
    const k = b.dataset.fire, x = sp[k], sev = roundMoney(x.wageW * 52 * x.contract * .5);
    confirmBox(`Licencier ${esc(x.name)} (${STAFF[k].label}) ? Indemnité : <b>${money(sev)}</b>. Un intérimaire de niveau 1 assurera le poste.`, () => {
      flow(G, c, -sev, 'staff'); news(G, `${x.name} (${STAFF[k].label}) quitte le club. Indemnité ${money(sev)}.`, 'board');
      sp[k] = newStaffPerson(k, 1, 'Intérimaire ' + pick(STAFF_LAST)); sp[k].contract = 1; G.staff[k] = 1; save(); vStaffPeople(el);
    }, 'Licencier', true);
  });
  // infrastructures (écran existant)
  const box = document.createElement('div'); __vStaff(box);
  const secs = box.querySelectorAll('section'); if (secs[1]) $('#facBox').appendChild(secs[1]);
}
const __vStaff = vStaff;
vStaff = vStaffPeople;
function hireStaff(id, el) {
  const x = G.staffMarket.list.find(s => s.id === id), c = myClub(G);
  if (!x) return;
  const cur = G.staffPeople[x.role], sev = roundMoney(cur.wageW * 52 * cur.contract * .5), sign = roundMoney(x.wageW * 4);
  modal(`<h2>Recruter ${esc(x.name)}</h2><p>${STAFF[x.role].label} · ${'★'.repeat(x.lvl)} · ${esc(x.spec)} · ${x.age} ans</p>
    <div class="form-grid"><label>Salaire proposé (€/mois) <input id="hW" type="number" step="1000" value="${monthly(x.wageW)}"></label>
      <label>Durée <select id="hY">${[1, 2, 3, 4].map(y => `<option ${y === 2 ? 'selected' : ''}>${y}</option>`).join('')}</select></label></div>
    <p>Coûts immédiats : prime ${money(sign)}${x.comp ? ` + indemnité à ${esc(x.employer)} ${money(x.comp)}` : ''} + départ de ${esc(cur.name)} ${money(sev)} = <b>${money(sign + x.comp + sev)}</b> (trésorerie ${money(c.budget)}).</p>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="hOk">Proposer le contrat</button></div><p class="hint" id="hR"></p>`);
  $('#hOk').onclick = () => {
    const m = +$('#hW').value, y = +$('#hY').value, cost = sign + x.comp + sev;
    if (cost > c.budget) return $('#hR').textContent = '❌ Trésorerie insuffisante.';
    if (x.wants && rnd() < .5) { G.staffMarket.list = G.staffMarket.list.filter(s => s !== x); closeModal(); vStaffPeople(el); return toast(`${x.name} préfère attendre une offre d'un club plus réputé.`, 'err'); }
    if (weekly(m) < x.wageW * .9) return $('#hR').textContent = `❌ ${x.name} attend au moins ${wageM(x.wageW * .9)}.`;
    flow(G, c, -cost, 'staff');
    news(G, `🤝 ${x.name} est le nouveau ${STAFF[x.role].label.toLowerCase()} (${'★'.repeat(x.lvl)}, ${x.spec}). ${cur.name} quitte le club.`, 'board');
    G.staffPeople[x.role] = { name: x.name, age: x.age, lvl: x.lvl, spec: x.spec, wageW: weekly(m), contract: y, rep: x.rep };
    G.staff[x.role] = x.lvl; G.staffNames[x.role] = x.name;
    G.staffMarket.list = G.staffMarket.list.filter(s => s !== x);
    closeModal(); save(); vStaffPeople(el); toast(`${x.name} rejoint le staff.`);
  };
}
// coût réel du staff = salaires des personnes
staffCost = function (G) { return G.staffPeople ? Object.values(G.staffPeople).reduce((s, x) => s + x.wageW, 0) : Object.values(G.staff || {}).reduce((s, l) => s + staffWage(l, G), 0); };

// ============================================================
//  Dynamique de groupe (plus proche de la réalité)
// ============================================================
socialGroups = function (G) {
  const ft = firstTeam(G).filter(p => !p.loan || p.loan.inLoan);
  const groups = {};
  for (const p of ft) (groups[langOf(p)] ||= []).push(p);
  const h = hierarchy(G);
  const out = Object.entries(groups).filter(([k, v]) => v.length >= 2 && k !== 'Autres').map(([name, members]) => ({ name, kind: 'langue', members }));
  const core = [...h.leaders, ...h.influent].filter(p => (G.season - (p.joinedSeason ?? G.season - 2)) >= 2);
  if (core.length >= 3) out.unshift({ name: 'Cadres du vestiaire', kind: 'cadres', members: core });
  const young = ft.filter(p => p.age <= 21); if (young.length >= 3) out.push({ name: 'Jeunes', kind: 'jeunes', members: young });
  const fresh = ft.filter(p => p.joinedSeason === G.season); if (fresh.length >= 2) out.push({ name: 'Nouvelles recrues', kind: 'recrues', members: fresh });
  const sad = ft.filter(p => unhappyReasons(G, p).length); if (sad.length >= 2) out.push({ name: 'Mécontents', kind: 'mecontents', members: sad });
  return out.map(g => {
    let s = 0, w = 0; for (const p of g.members) { const k = influence(G, p); s += p.morale * k; w += k; }
    const lead = g.members.slice().sort((a, b) => influence(G, b) - influence(G, a))[0];
    return { ...g, mood: w ? s / w : 60, leader: lead, weight: g.members.reduce((a, p) => a + influence(G, p), 0) / g.members.length };
  });
};
function groupDynamicsWeekly(G) {
  const ft = firstTeam(G); if (!ft.length) return;
  const h = hierarchy(G), groups = socialGroups(G);
  for (const g of groups) {
    // l'humeur d'un groupe suit celle de son meneur (pondérée par son influence)
    const lead = g.leader; if (!lead) continue;
    const pull = clamp(influence(G, lead) / 120, .03, .12);
    for (const p of g.members) if (p !== lead) p.morale = clamp(p.morale + (lead.morale - p.morale) * pull, 5, 100);
    // un cadre qui ne te fait plus confiance fait baisser la confiance de son groupe
    if ((lead.trust ?? 55) < 35) for (const p of g.members) p.trust = clamp((p.trust ?? 55) - .6, 0, 100);
    if ((lead.trust ?? 55) > 70) for (const p of g.members) p.trust = clamp((p.trust ?? 55) + .3, 0, 100);
  }
  // capitaine : son état pèse sur la cohésion
  const cap = getPlayer(G, G.tactics?.takers?.cap);
  if (cap && cap.club === G.clubId) myClub(G).coh = clamp((myClub(G).coh ?? 60) + (cap.morale - 60) / 60, 0, 100);
  // intégration des recrues : plus rapide si un groupe de même langue existe
  for (const p of ft) if ((p.integ ?? 100) < 100) {
    const mates = ft.filter(x => x !== p && (typeof sharedLanguage === 'function' ? sharedLanguage(x, p) : langOf(x) === langOf(p))).length;
    p.integ = clamp(p.integ + 8 + Math.min(3, mates) * 3 + (p.pers === 'Discret' ? -3 : 0), 0, 100);
    if (p.integ < 50) p.morale = clamp(p.morale - .8, 5, 100);
    if (p.integ >= 100) news(G, `🤝 ${p.name} est désormais bien intégré au groupe.`, 'info');
  }
  // un groupe de mécontents influent crée une crise de vestiaire
  const sad = groups.find(g => g.kind === 'mecontents');
  if (sad && sad.members.length >= 4 && sad.weight > 45 && G.week - (G.meet.crisisWeek ?? -99) > 10) {
    G.meet.crisisWeek = G.week;
    addDecision(G, { key: 'crisis:' + G.week, kind: 'info', from: 'Adjoint', icon: '🔥', title: 'Tensions dans le vestiaire',
      text: `${sad.members.length} joueurs se plaignent (${sad.members.slice(0, 4).map(p => p.name).join(', ')}…). Organise une réunion de groupe ou des entretiens individuels (menu Réunions) avant que l'ambiance ne se dégrade.` });
  }
}
function meetingRequests(G) {
  return clubPlayers(G, G.clubId).filter(p => !p.academy && (p.ptWarn >= 3 || p.wantsOut || (p.trust ?? 55) < 30) && G.week - (p.lastMeet ?? -99) >= 4);
}

// ============================================================
//  Réunions : équipe, groupes, individuelles, capitaines
// ============================================================
const TEAM_TOPICS = [
  ['praise', 'Féliciter le groupe', 'Efficace après de bons résultats, contre-productif après une série noire.'],
  ['demand', 'Exiger davantage', 'Peut créer un électrochoc si les cadres te suivent ; sinon braque le vestiaire.'],
  ['calm', 'Enlever la pression', 'Rassure un groupe fragile, mais peut endormir un groupe trop sûr de lui.'],
  ['goals', 'Fixer l\'objectif de la saison', 'Aligne le groupe si l\'objectif est cohérent avec la valeur de l\'effectif.'],
  ['unity', 'Appeler à l\'unité', 'Apaise les conflits et renforce la cohésion quand l\'ambiance est mauvaise.']
];
const GROUP_TOPICS = [
  ['listen', 'Écouter leurs préoccupations', 'Utile si le groupe est mécontent.'],
  ['resp', 'Les responsabiliser', 'Fonctionne avec des cadres respectés.'],
  ['integrate', 'Aider l\'intégration', 'Accélère l\'intégration des recrues et les automatismes.'],
  ['warn', 'Les mettre en garde', 'Rappel à l\'ordre : risqué avec des caractères difficiles.']
];
function recentPts(G) {
  let pts = 0, n = 0;
  for (let w = G.week - 1; w >= 0 && n < 5; w--) { const f = weekFixtures(G, w).find(f => (f.h === G.clubId || f.a === G.clubId) && f.res); if (f) { const [a, b] = f.h === G.clubId ? [f.res[0], f.res[1]] : [f.res[1], f.res[0]]; pts += a > b ? 3 : a === b ? 1 : 0; n++; } }
  return n ? pts / n : 1.4;
}
function teamMeeting(topic) {
  if (G.week - (G.meet.team ?? -99) < 2) return toast('Une réunion d\'équipe a déjà eu lieu ces deux dernières semaines.', 'err');
  const sq = firstTeam(G), form = recentPts(G), atm = atmosphere(G), h = hierarchy(G);
  const leadTrust = h.leaders.length ? h.leaders.reduce((s, p) => s + (p.trust ?? 55), 0) / h.leaders.length : 55;
  let d = 0, coh = 0, txt;
  if (topic === 'praise') { d = form >= 1.8 ? 6 : form >= 1.2 ? 2 : -5; txt = d > 0 ? 'Le groupe apprécie la reconnaissance.' : 'Les joueurs trouvent les félicitations déplacées vu les résultats.'; }
  else if (topic === 'demand') { const ok = leadTrust > 55 && rnd() < .45 + (leadTrust - 55) / 80; d = ok ? 5 : -7; coh = ok ? 2 : -3; txt = ok ? 'Électrochoc : les cadres relaient ton message.' : 'Le vestiaire se braque : les cadres ne te suivent pas.'; }
  else if (topic === 'calm') { d = atm < 55 || form < 1.2 ? 5 : -1; txt = d > 0 ? 'La pression retombe, le groupe respire.' : 'Le groupe était déjà détendu : peu d\'effet.'; }
  else if (topic === 'goals') {
    const L = clubLeague(G, G.clubId), rank = standings(G, L.id).findIndex(r => r.id === G.clubId) + 1;
    const ok = rank <= G.objective + 3; d = ok ? 4 : -3; coh = ok ? 3 : 0; txt = ok ? 'L\'objectif est jugé réaliste : tout le monde tire dans le même sens.' : 'Les joueurs doutent de l\'objectif fixé.';
  } else { const conf = sq.filter(p => p.conflict); d = atm < 60 ? 4 : 1; coh = atm < 60 ? 4 : 1; if (conf.length && rnd() < .5) { const a = conf[0], b = getPlayer(G, a.conflict); a.conflict = null; if (b) b.conflict = null; } txt = conf.length ? 'Les tensions s\'apaisent.' : 'Message reçu, le groupe est soudé.'; }
  for (const p of sq) { const k = h.leaders.includes(p) ? 1.3 : 1; p.morale = clamp(p.morale + d * k * (p.pers === 'Discret' ? .7 : 1), 5, 100); p.trust = clamp((p.trust ?? 55) + d * .4, 0, 100); }
  myClub(G).coh = clamp((myClub(G).coh ?? 60) + coh, 0, 100);
  G.meet.team = G.week;
  const t = TEAM_TOPICS.find(x => x[0] === topic)[1];
  G.meetLog.unshift({ season: G.season, week: G.week, label: weekLabel(G), kind: 'Équipe', who: 'Tout le groupe', topic: t, result: `${txt} (moral ${d >= 0 ? '+' : ''}${d})` });
  news(G, `🗣 Réunion d'équipe (« ${t} ») : ${txt}`, d >= 0 ? 'info' : 'warn');
  save(); show('meetings'); toast(txt, d >= 0 ? '' : 'err');
}
function groupMeeting(name, topic) {
  const g = socialGroups(G).find(x => x.name === name); if (!g) return;
  G.meet.groups ||= {};
  if (G.week - (G.meet.groups[name] ?? -99) < 3) return toast('Ce groupe a déjà été réuni récemment.', 'err');
  let d = 0, txt;
  if (topic === 'listen') { d = g.mood < 55 ? 6 : 1; txt = d > 2 ? 'Ils se sentent écoutés.' : 'Ils n\'avaient pas grand-chose à dire.'; }
  else if (topic === 'resp') { const ok = g.leader && (g.leader.pers === 'Leader' || g.leader.pers === 'Professionnel' || influence(G, g.leader) > 55); d = ok ? 4 : -2; txt = ok ? `${g.leader.name} prend ses responsabilités.` : 'Personne ne prend le relais.'; if (ok) myClub(G).coh = clamp((myClub(G).coh ?? 60) + 2, 0, 100); }
  else if (topic === 'integrate') { d = 2; for (const p of g.members) p.integ = clamp((p.integ ?? 100) + 20, 0, 100); growBonds(G, g.members.map(p => p.id)); txt = 'Les liens se resserrent.'; }
  else { const hot = g.members.some(p => p.pers === 'Tempérament'); d = hot ? -6 : 3; txt = hot ? 'Certains caractères le prennent très mal.' : 'Le rappel à l\'ordre est entendu.'; }
  for (const p of g.members) { p.morale = clamp(p.morale + d, 5, 100); p.trust = clamp((p.trust ?? 55) + d * .5, 0, 100); }
  G.meet.groups[name] = G.week;
  const t = GROUP_TOPICS.find(x => x[0] === topic)[1];
  G.meetLog.unshift({ season: G.season, week: G.week, label: weekLabel(G), kind: 'Groupe', who: name, topic: t, result: `${txt} (moral ${d >= 0 ? '+' : ''}${d})` });
  save(); show('meetings'); toast(txt, d >= 0 ? '' : 'err');
}
function vMeetings(el) {
  migrateGestion(G);
  const groups = socialGroups(G), req = meetingRequests(G), h = hierarchy(G), T = G.tactics.takers || (G.tactics.takers = {});
  const cd = Math.max(0, 2 - (G.week - (G.meet.team ?? -99)));
  const sq = firstTeam(G).sort((a, b) => influence(G, b) - influence(G, a));
  el.innerHTML = `<div class="grid2">
    <section class="card"><h2>🗣 Réunion d'équipe</h2>
      <p class="hint">Forme récente : ${recentPts(G).toFixed(1)} pt/match · ambiance ${Math.round(atmosphere(G))} % · confiance des cadres ${Math.round(h.leaders.reduce((s, p) => s + (p.trust ?? 55), 0) / (h.leaders.length || 1))} %${cd ? ` · prochaine réunion possible dans ${cd} semaine(s)` : ''}</p>
      <div class="topics">${TEAM_TOPICS.map(([k, l, tip]) => `<button class="topic" data-tt="${k}" ${cd ? 'disabled' : ''}><b>${l}</b><small>${tip}</small></button>`).join('')}</div></section>
    <section class="card"><h2>🙋 Demandes d'entretien <small>${req.length}</small></h2>
      ${req.length ? `<table class="tbl compact">${req.map(p => `<tr><td>${avatar(p, 28)}</td><td class="nm">${esc(p.name)}<br><small class="warn">${unhappyReasons(G, p).map(esc).join(' · ') || 'Veut te parler'}</small></td><td><button class="btn sm primary" data-talk="${p.id}">Recevoir</button></td></tr>`).join('')}</table>` : '<p class="muted">Aucun joueur ne demande à te voir.</p>'}
      <h3>Capitanat</h3>
      <div class="row gap wrap"><label>Capitaine <select id="capS">${sq.map(p => `<option value="${p.id}" ${T.cap === p.id ? 'selected' : ''}>${esc(p.name)} (influence ${Math.round(influence(G, p))})</option>`).join('')}</select></label>
        <label>Vice-capitaine <select id="vcapS"><option value="">—</option>${sq.map(p => `<option value="${p.id}" ${G.vice === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label></div>
      <p class="hint">Retirer le brassard à un cadre le vexe. Le moral du capitaine pèse sur la cohésion.</p></section>
  </div>
  <section class="card"><h2>👥 Groupes du vestiaire</h2>
    <div class="groups">${groups.map(g => `<div class="grp k-${g.kind}"><div class="row gap"><b class="grow">${esc(g.name)}</b><small>${g.members.length} joueurs</small></div>
      <small>Meneur : ${g.leader ? esc(g.leader.name) : '—'} · humeur ${meter(g.mood)}</small>
      <div class="grp-m">${g.members.slice(0, 10).map(p => `<span title="${esc(p.name)} — moral ${Math.round(p.morale)} %, confiance ${Math.round(p.trust ?? 55)} %${p.integ < 100 ? `, intégration ${Math.round(p.integ)} %` : ''}" data-pid="${p.id}">${avatar(p, 26)}</span>`).join('')}</div>
      <div class="row gap wrap mt">${GROUP_TOPICS.map(([k, l, tip]) => `<button class="btn sm" data-gm="${esc(g.name)}" data-gt="${k}" title="${esc(tip)}">${l}</button>`).join('')}</div></div>`).join('') || '<p class="muted">Pas encore de groupe identifiable.</p>'}</div>
    <p class="hint">Chaque groupe suit l'humeur de son meneur, selon son influence (âge, ancienneté, statut, personnalité, brassard). Un cadre qui perd confiance en toi entraîne son groupe. Les recrues s'intègrent plus vite si des joueurs parlent leur langue.</p></section>
  <section class="card"><h2>📜 Historique des réunions</h2>${G.meetLog.length ? `<table class="tbl compact">${G.meetLog.slice(0, 25).map(m => `<tr><td>${m.season} · ${esc(m.label)}</td><td>${esc(m.kind)}</td><td>${esc(m.who)}</td><td>${esc(m.topic)}</td><td>${esc(m.result)}</td></tr>`).join('')}</table>` : '<p class="muted">Aucune réunion.</p>'}</section>`;
  el.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => teamMeeting(b.dataset.tt));
  el.querySelectorAll('[data-gm]').forEach(b => b.onclick = () => groupMeeting(b.dataset.gm, b.dataset.gt));
  el.querySelectorAll('[data-talk]').forEach(b => b.onclick = () => { const p = getPlayer(G, +b.dataset.talk); const d = addDecision(G, { key: 'meet:' + p.id + ':' + G.week, kind: 'meet', ref: p.id, from: p.name, icon: '🙋', title: `Entretien avec ${p.name}`, text: `${p.name} : « ${unhappyReasons(G, p)[0] || 'Je voudrais parler de ma situation.'} »`, blocking: false }) || G.decisions.find(x => x.key === 'meet:' + p.id + ':' + G.week); MAIL_FILTER = 'todo'; MAIL_SEL = 'd:' + d.id; show('mail'); });
  el.querySelectorAll('[data-pid]').forEach(s => s.onclick = () => playerModal(+s.dataset.pid));
  $('#capS').onchange = e => { const old = getPlayer(G, T.cap), nw = +e.target.value; if (old && old.id !== nw) { old.morale = clamp(old.morale - (influence(G, old) > 60 ? 12 : 5), 5, 100); old.trust = clamp((old.trust ?? 55) - 6, 0, 100); groupEcho(old, -1); } T.cap = nw; const p = getPlayer(G, nw); p.morale = clamp(p.morale + 6, 5, 100); news(G, `©️ ${p.name} est le nouveau capitaine.`, 'info'); save(); show('meetings'); };
  $('#vcapS').onchange = e => { G.vice = e.target.value ? +e.target.value : null; save(); };
}

// ============================================================
//  Calendrier mensuel
// ============================================================
let CAL_MONTH = null;
function vCalendar(el) {
  const weeks = G.schedule.map((e, w) => ({ w, e, d: dateOfWeek(G, w), f: weekFixtures(G, w).find(f => f.h === G.clubId || f.a === G.clubId) }));
  const months = [...new Set(weeks.map(x => x.d.getFullYear() * 12 + x.d.getMonth()))].sort((a, b) => a - b);
  const cur = dateOfWeek(G, Math.min(G.week, G.schedule.length - 1));
  CAL_MONTH ??= cur.getFullYear() * 12 + cur.getMonth();
  if (!months.includes(CAL_MONTH)) CAL_MONTH = months[0];
  const y = Math.floor(CAL_MONTH / 12), m = CAL_MONTH % 12, first = new Date(y, m, 1), start = (first.getDay() + 6) % 7, nd = new Date(y, m + 1, 0).getDate();
  const R = leagueRoundsTotal(G), mid = Math.floor(R / 2), intl = [9, 20, 30].map(x => Math.round(x * R / 38));
  const cells = [];
  for (let i = 0; i < start; i++) cells.push('<div class="cd off"></div>');
  for (let day = 1; day <= nd; day++) {
    const date = new Date(y, m, day), ev = weeks.filter(x => x.d.toDateString() === date.toDateString());
    const lr = ev.length ? leagueRoundAt(G, ev[0].w) : null;
    const win = ev.length && (lr < 6 || (lr >= mid && lr < mid + 4));
    const today = G.week < G.schedule.length && ev.some(x => x.w === G.week);
    cells.push(`<div class="cd ${today ? 'today' : ''} ${win ? 'win' : ''}"><span class="dn">${day}</span>${ev.map(x => {
      if (x.f) { const home = x.f.h === G.clubId, opp = getClub(G, home ? x.f.a : x.f.h); let res = ''; if (x.f.res) { const [a, b] = home ? x.f.res : [x.f.res[1], x.f.res[0]]; res = `<b class="r${a > b ? 'W' : a === b ? 'D' : 'L'}">${a}-${b}</b>`; }
        return `<div class="ev c-${x.e.t}" data-fx="${x.f.res ? fxKey(x.f) : ''}" data-c="${opp.id}">${crest(opp, 16)}<span>${home ? 'vs' : '@'} ${esc(opp.short || opp.name)}</span>${res}<small>${esc(compName(G, x.f))}</small></div>`; }
      if (x.e.t === 'C' && G.comps.CUP.alive.includes(G.clubId) && !G.comps.CUP.winner) return `<div class="ev c-C tbd"><span>Coupe : ${esc(weekLabel(G, x.w))}</span><small>tirage à venir</small></div>`;
      if (x.e.t === 'L' && intl.includes(lr)) return '<div class="ev intl"><small>Trêve internationale</small></div>';
      return x.e.t === 'L' ? `<div class="ev rest"><small>${esc(weekLabel(G, x.w))} · pas de match</small></div>` : '';
    }).join('')}</div>`);
  }
  const mName = d => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const upcoming = weeks.filter(x => x.w >= G.week && x.f).slice(0, 8);
  el.innerHTML = `<div class="grid2 wide-left"><section class="card cal">
    <div class="row gap"><button class="btn" id="cPrev" ${months.indexOf(CAL_MONTH) <= 0 ? 'disabled' : ''}>◀</button><h2 class="grow center">${mName(first)}</h2><button class="btn" id="cNext" ${months.indexOf(CAL_MONTH) >= months.length - 1 ? 'disabled' : ''}>▶</button></div>
    <div class="cal-g">${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => `<div class="ch">${d}</div>`).join('')}${cells.join('')}</div>
    <p class="hint"><span class="lg win"></span> mercato ouvert · <span class="lg today"></span> semaine en cours · couleurs : <span class="ev c-L lg2">championnat</span> <span class="ev c-C lg2">coupe</span> <span class="ev c-E lg2">Europe</span> <span class="ev c-S lg2">supercoupe</span></p></section>
    <section class="card"><h2>Prochains matchs</h2><table class="tbl compact">${upcoming.map(x => { const home = x.f.h === G.clubId, opp = getClub(G, home ? x.f.a : x.f.h); return `<tr data-c="${opp.id}"><td>${fmtDate(x.d)}</td><td>${home ? 'Dom.' : 'Ext.'}</td><td class="nm">${crest(opp, 18)} ${esc(opp.name)}</td><td><small>${esc(compName(G, x.f))}</small></td></tr>`; }).join('') || '<tr><td class="muted">Aucun match programmé.</td></tr>'}</table>
    <h3>Mois de la saison</h3><div class="row gap wrap">${months.map(k => `<button class="btn sm ${k === CAL_MONTH ? 'primary' : ''}" data-m="${k}">${new Date(Math.floor(k / 12), k % 12, 1).toLocaleDateString('fr-FR', { month: 'short' })}</button>`).join('')}</div></section></div>`;
  $('#cPrev').onclick = () => { CAL_MONTH = months[months.indexOf(CAL_MONTH) - 1]; vCalendar(el); };
  $('#cNext').onclick = () => { CAL_MONTH = months[months.indexOf(CAL_MONTH) + 1]; vCalendar(el); };
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { CAL_MONTH = +b.dataset.m; vCalendar(el); });
  el.querySelectorAll('[data-fx]').forEach(e => e.onclick = () => e.dataset.fx ? matchReport(e.dataset.fx) : viewClub(+e.dataset.c));
  el.querySelectorAll('tr[data-c]').forEach(e => e.onclick = () => viewClub(+e.dataset.c));
}

// ============================================================
//  Statistiques détaillées
// ============================================================
let STATS_TAB = 'leaders', STATS_COMP = null, STATS_SORT = 'min';
const STAT_CATS = [
  ['goals', 'Buteurs', p => p.stats.goals], ['assists', 'Passeurs', p => p.stats.assists], ['ga', 'Buts + passes', p => p.stats.goals + p.stats.assists],
  ['rating', 'Note moyenne (5 matchs min.)', p => p.stats.apps >= 5 ? p.stats.rating / p.stats.apps : null, 2], ['xg', 'xG (modèle du jeu)', p => p.stats.xg, 1],
  ['kp', 'Passes clés', p => p.stats.kp], ['dri', 'Dribbles réussis', p => p.stats.dri], ['def', 'Tacles + interceptions', p => p.stats.tkl + p.stats.int],
  ['sav', 'Arrêts', p => p.stats.sav], ['motm', 'Homme du match', p => p.stats.motm], ['cards', 'Cartons (🟨 + 3×🟥)', p => p.stats.yel + 3 * p.stats.red], ['min', 'Minutes', p => p.stats.min]
];
function vStats(el) {
  const L = leagueComps(G);
  STATS_COMP ??= clubLeague(G, G.clubId).id;
  const comp = G.comps[STATS_COMP] || L[0];
  const tabs = [['leaders', 'Classements individuels'], ['teams', 'Équipes'], ['squad', 'Mon effectif'], ['career', 'Carrière']];
  let body = '';
  const inComp = p => p.club != null && (comp.clubs || []).includes(p.club);
  if (STATS_TAB === 'leaders') {
    const pool = G.players.filter(inComp);
    body = `<div class="row gap wrap"><label>Championnat <select id="stC">${L.map(c => `<option value="${c.id}" ${c.id === comp.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div>
      <div class="leaders">${STAT_CATS.map(([k, l, f, dec]) => { const top = pool.map(p => [p, f(p)]).filter(x => x[1] != null && x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return `<div class="ld"><h3>${l}</h3>${top.map(([p, v], i) => `<div class="ldr ${p.club === G.clubId ? 'me' : ''}" data-pid="${p.id}"><i>${i + 1}</i>${avatar(p, 24)}<span>${esc(p.name)}<small>${esc(getClub(G, p.club).short)}</small></span><b>${dec ? v.toFixed(dec) : Math.round(v)}</b></div>`).join('') || '<small class="muted">—</small>'}</div>`; }).join('')}</div>
      <p class="hint">Statistiques de la saison en cours dans ta partie, toutes compétitions confondues (sauf « Buteurs du championnat » dans Classements). Elles ne s'additionnent jamais aux statistiques historiques réelles de la base.</p>`;
  } else if (STATS_TAB === 'teams') {
    const t = standings(G, comp.id);
    const agg = id => { const ps = clubPlayers(G, id), s = k => ps.reduce((a, p) => a + (p.stats[k] || 0), 0); const apps = s('apps'); return { xg: s('xg'), sh: s('sh'), pas: s('pas'), ok: s('pasOk'), tkl: s('tkl'), int: s('int'), yel: s('yel'), red: s('red'), rat: apps ? s('rating') / apps : 0 }; };
    body = `<div class="row gap wrap"><label>Championnat <select id="stC">${L.map(c => `<option value="${c.id}" ${c.id === comp.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>#</th><th>Club</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>xG</th><th>Tirs</th><th>Passes %</th><th>Tacles</th><th>Interc.</th><th>🟨</th><th>🟥</th><th>Note moy.</th><th>Pts</th></tr></thead><tbody>
      ${t.map((r, i) => { const c = getClub(G, r.id), a = agg(r.id); return `<tr class="${r.id === G.clubId ? 'me' : ''}" data-c="${c.id}"><td>${i + 1}</td><td class="nm">${crest(c, 18)} ${esc(c.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${a.xg.toFixed(1)}</td><td>${a.sh}</td><td>${a.pas ? Math.round(a.ok / a.pas * 100) : '-'}</td><td>${a.tkl}</td><td>${a.int}</td><td>${a.yel}</td><td>${a.red}</td><td>${a.rat ? a.rat.toFixed(2) : '-'}</td><td><b>${r.pts}</b></td></tr>`; }).join('')}</tbody></table></div>
      <p class="hint">Tirs, passes, tacles : totaux des joueurs de l'effectif actuel, toutes compétitions.</p>`;
  } else if (STATS_TAB === 'squad') {
    const per = (p, k) => p.stats.min ? p.stats[k] / p.stats.min * 90 : 0;
    const cols = [['min', 'Min.', p => p.stats.min], ['apps', 'MJ', p => p.stats.apps], ['goals', 'Buts', p => p.stats.goals], ['assists', 'PD', p => p.stats.assists], ['xg', 'xG', p => p.stats.xg, 1], ['xg90', 'xG/90', p => per(p, 'xg'), 2],
      ['sh', 'Tirs', p => p.stats.sh], ['pasp', 'Passes %', p => p.stats.pas ? p.stats.pasOk / p.stats.pas * 100 : 0, 0], ['kp90', 'P. clés/90', p => per(p, 'kp'), 1], ['dri90', 'Dribbles/90', p => per(p, 'dri'), 1],
      ['tkl90', 'Tacles/90', p => per(p, 'tkl'), 1], ['int90', 'Interc./90', p => per(p, 'int'), 1], ['sav', 'Arrêts', p => p.stats.sav], ['rat', 'Note', p => p.stats.apps ? p.stats.rating / p.stats.apps : 0, 2], ['motm', 'HdM', p => p.stats.motm]];
    const col = cols.find(c => c[0] === STATS_SORT) || cols[0];
    const sq = clubPlayers(G, G.clubId).sort((a, b) => col[2](b) - col[2](a));
    body = `<div class="scroll-x"><table class="tbl sortable"><thead><tr><th></th><th>Joueur</th><th>Poste</th>${cols.map(c => `<th data-s="${c[0]}" class="${c[0] === STATS_SORT ? 'on' : ''}">${c[1]}</th>`).join('')}</tr></thead><tbody>
      ${sq.map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 24)}</td><td class="nm">${esc(p.name)}${fictionalTag(p)}</td><td>${p.pos}</td>${cols.map(c => { const v = c[2](p); return `<td>${c[3] != null ? v.toFixed(c[3]) : Math.round(v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="hint">Clique sur un en-tête pour trier. Valeurs « /90 » : par 90 minutes jouées. xG : estimation du modèle de jeu, pas une donnée de fournisseur professionnel.</p>`;
  } else {
    body = `<table class="tbl"><thead><tr><th>Saison</th><th>Club</th><th>Compétition</th><th>Classement</th><th>Points</th><th>Objectif</th><th>Coupe</th></tr></thead><tbody>
      ${G.history.slice().reverse().map(h => `<tr><td>${h.season}/${h.season + 1}</td><td>${esc(h.club)}</td><td>${esc(h.comp)}</td><td>${h.rank}<sup>e</sup></td><td>${h.pts}</td><td class="${h.met ? 'pos' : 'neg'}">${esc(h.objLabel)} ${h.met ? '✔' : '✘'}</td><td>${esc(h.cup)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Première saison en cours.</td></tr>'}</tbody></table>
      <p>Bilan de l'entraîneur : ${G.mgr.matches} matchs · ${G.mgr.w} V · ${G.mgr.d} N · ${G.mgr.l} D · réputation ${Math.round(G.mgr.rep)}/100</p>`;
  }
  el.innerHTML = `<section class="card"><h2>📊 Statistiques</h2><div class="tabs">${tabs.map(([k, l]) => `<button data-st="${k}" class="${STATS_TAB === k ? 'on' : ''}">${l}</button>`).join('')}</div><div class="mt">${body}</div></section>`;
  el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { STATS_TAB = b.dataset.st; vStats(el); });
  $('#stC')?.addEventListener('change', e => { STATS_COMP = e.target.value; vStats(el); });
  el.querySelectorAll('th[data-s]').forEach(t => t.onclick = () => { STATS_SORT = t.dataset.s; vStats(el); });
  el.querySelectorAll('[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
  el.querySelectorAll('tr[data-c]').forEach(r => r.onclick = () => viewClub(+r.dataset.c));
}

// ============================================================
//  Hebdomadaire : décisions, négociations, contrats, groupe, staff
// ============================================================
function gestionWeekly(G, full) {
  migrateGestion(G);
  dealsWeekly(G);
  if (!full) return;
  groupDynamicsWeekly(G);
  const R = leagueRoundsTotal(G), lr = leagueRoundAt(G), mid = Math.floor(R / 2);
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy && !(p.loan && !p.loan.inLoan));
  const ranked = sq.slice().sort((a, b) => playerOvr(b) - playerOvr(a));
  let newMeets = 0;
  for (const p of sq) {
    // demande d'entretien d'un joueur mécontent (importante) : 2 nouvelles par semaine au plus, 6 semaines entre deux demandes
    if (newMeets < 1 && (STATUS_ORDER.indexOf(p.status || "rot") <= 2 || p.wantsOut) && (p.ptWarn >= 3 || (p.trust ?? 55) < 30 || (p.wantsOut && !p.listed)) && G.week - (p.lastMeet ?? -99) >= 6 && (newMeets++, p.lastMeet = G.week, true))
      addDecision(G, { key: 'meet:' + p.id + ':' + Math.floor(G.week / 4), kind: 'meet', ref: p.id, from: p.name, icon: '🙋', title: `${p.name} demande un entretien`,
        text: `${p.name} veut te voir : ${unhappyReasons(G, p).join(' ; ') || 'il n\'est pas satisfait de sa situation'}. Ta réponse aura un effet sur son moral et sur son entourage dans le vestiaire.` });
    // demande de prolongation d'un joueur important
    const important = ranked.indexOf(p) < 14 || ['star', 'first'].includes(p.status);
    if (important && p.contract <= 1 && lr >= 8 && p.noRenew !== G.season && !p.wantsOut && !p.loan && (p.renewAsked !== G.season || (p.renewLater != null && G.week >= p.renewLater)) && (p.renewAsked = G.season, p.renewLater = null, true))
      addDecision(G, { key: 'renew:' + p.id + ':' + G.season + ':' + (p.renewLater ?? 0), kind: 'renew', ref: p.id, from: `Agent de ${p.name}`, icon: '✍', title: `Avenir de ${p.name} (contrat jusqu'en juin ${G.season + p.contract})`,
        text: `L'agent de ${p.name} souhaite connaître tes intentions. Sans prolongation, il pourra s'engager librement ailleurs à partir de janvier et partir gratuitement le 30 juin.` });
    // pré-contrat (arrêt Bosman) en seconde partie de saison
    if (p.contract <= 1 && lr >= mid && p.noRenew !== G.season + 100 && !p.preAgreed && rnd() < (p.noRenew === G.season ? .12 : .03) * (playerOvr(p) > 70 ? 1.5 : 1)) {
      const c = pick(G.clubs.filter(c => c.id !== G.clubId && c.rep >= myClub(G).rep - 6));
      if (c) { p.preAgreed = c.id; news(G, `📄 ${p.name} a signé un pré-contrat avec ${c.name} : il les rejoindra libre le 30 juin, sauf s'il prolonge d'ici là.`, 'transfer'); }
    }
  }
  if (lr === 0 && !G.meet.boardIntro) { G.meet.boardIntro = G.season; }
}
const __completeWeek = completeWeek;
completeWeek = function (G, skip) {
  const full = G.schedule[G.week]?.t === 'L';
  const r = __completeWeek(G, skip);
  try { gestionWeekly(G, full); } catch (e) { console.error(e); }
  return r;
};
// Pré-contrats appliqués en fin de saison ; contrats du staff
const __endSeason = endSeason;
endSeason = function (G) {
  const pre = clubPlayers(G, G.clubId).filter(p => p.preAgreed && p.contract <= 1);
  const S = __endSeason(G);
  for (const p of pre) if (G.players.includes(p) && (p.club == null || p.club === G.clubId) && p.contract <= 1) { const c = getClub(G, p.preAgreed); if (c) { p.club = c.id; p.contract = rint(2, 4); p.num = null; logTransfer(G, p, G.clubId, c.id, 0, 'libre (pré-contrat)'); news(G, `${p.name} rejoint ${c.name} libre (pré-contrat).`, 'transfer'); } }
  for (const p of G.players) delete p.preAgreed;
  if (G.staffPeople) for (const [k, s] of Object.entries(G.staffPeople)) {
    s.contract--; s.age++;
    if (s.contract <= 0) addDecision(G, { key: 'staff:' + k + ':' + G.season, kind: 'staffRenew', ref: k, from: s.name, icon: '🧑‍💼', title: `Fin de contrat : ${s.name} (${STAFF[k].label})`, text: `Le contrat de ${s.name} est terminé. Le prolonger (salaire +8 %) ou le laisser partir ?` });
  }
  G.deals = (G.deals || []).filter(d => ['done', 'failed'].includes(d.status)).slice(0, 30);
  return S;
};

// Chaque message reçoit un identifiant (lien direct depuis le tableau de bord)
const __news = news;
news = function (G, text, type = 'info', worldOnly = false) { __news(G, text, type, worldOnly); if (G.inbox[0]) G.inbox[0].id ||= 'm' + (G.decSeq = (G.decSeq || 1) + 1); };

