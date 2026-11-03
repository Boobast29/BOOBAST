// ============================================================
//  Écrans principaux du jeu
// ============================================================
const SAVE_KEY = 'save-v2';
const DB_KEY = 'db-v2';
let VIEW = 'inbox';
let LIVE = null;
let SETTINGS = { speed: 120, show2d: true };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('mf-settings') || '{}')); } catch { }
function saveSettings() { try { localStorage.setItem('mf-settings', JSON.stringify(SETTINGS)); } catch { } }

async function save() {
  if (!G) return;
  try { if (RNGS.s != null) G.rngState = RNGS.s; const { pmap, ...rest } = G; await Store.set(SAVE_KEY, rest); }
  catch (e) { toast('Sauvegarde impossible : ' + (e?.message || e), 'err'); }
}
async function saveDB() { try { await Store.set(DB_KEY, DB); } catch (e) { toast('Base non sauvegardée : ' + (e?.message || e), 'err'); } }
function loadGame(g) { if (g.rngState != null) seedGameRng(g.rngState); else seedGameRng(g.seed ?? Math.floor(Math.random() * 4294967296)); migrateGame(g); reindex(g); NEXT_PID = Math.max(...g.players.map(p => p.id)) + 1; G = g; }

// ============================================================
//  Écran d'accueil
// ============================================================
let START_DIV = 1;
async function startScreen() {
  LIVE?.pitch?.stop(); LIVE = null; G = null;
  await migrateLegacySave();
  const ex = null; // parties : emplacements multiples (gestion.js)
  document.body.className = 'start';
  const divs = [...new Set(DB.clubs.filter(c => !c.foreign).map(c => c.div || 1))].sort();
  const exClub = ex ? ex.clubs.find(c => c.id === ex.clubId) : null;
  $('#app').innerHTML = `
  <div class="start-wrap" role="main">
    <div class="hero">
      <h1 class="logo-big">⚽ <b>Manager</b> Foot</h1>
      <p class="sub">Trois divisions, les vrais règlements de 5 pays, barrages et play-offs jouables, un mercato aux règles FIFA et des matchs en direct en 2D. À toi d'écrire l'histoire.</p>
      <div class="hero-etapes"><span><b>1</b>Reprends une partie</span><span><b>2</b>ou choisis le monde réel</span><span><b>3</b>ou un club fictif ci-dessous</span><span><kbd>Ctrl K</kbd> en jeu : aller n'importe où</span></div>
    </div>
    ${ex ? `<div class="card cont">
      ${crest(exClub, 52)}
      <div><b>${esc(exClub.name)}</b><br><small>${esc(ex.managerName)} · Saison ${ex.season}/${ex.season + 1} · ${weekLabel(ex)}</small></div>
      <button class="btn primary big" id="btnCont">▶ Continuer la partie</button>
    </div>` : ''}
    <div id="slotsCard"></div>
    <div id="mondeCard"></div>
    <div class="card">
      <div class="row gap wrap">
        <h2 class="grow">Nouvelle partie (monde fictif)</h2>
        <button class="btn" id="btnEdit">✏ Éditer la base</button>
        <button class="btn" id="btnImp">📂 Importer (JSON)</button>
        <button class="btn" id="btnExp">⬇ Exporter (JSON)</button>
        <button class="btn" id="btnReset" title="Revenir à la base fictive d'origine">↺ Base d'origine</button>
      </div>
      <div class="row gap wrap mt">
        <label>Nom de l'entraîneur <input id="mgr" value="${esc(ex?.managerName || localStorage.getItem('mf-mgr') || '')}" placeholder="Ton nom" maxlength="30"></label>
        ${typeof roleSelectHTML === 'function' ? roleSelectHTML() : ''}
        ${typeof reglesSelectHTML === 'function' ? reglesSelectHTML() : ''}
        <div class="grow"></div>
        <div class="tabs">${divs.map((d, i) => `<button class="${d === START_DIV ? 'on' : ''}" data-div="${d}">${esc((DB.leagueNames || [])[i] || 'Division ' + d)}</button>`).join('')}</div>
      </div>
      <p class="hint">${DB.clubs.filter(c => !c.foreign).length} clubs (+ ${DB.clubs.filter(c => c.foreign).length} clubs étrangers en Coupe d'Europe) · ${DB.players.length} joueurs. Clique sur un club pour commencer. Tu peux tout renommer et ajouter tes logos/photos avec l'éditeur.</p>
      <div class="club-grid">
        ${DB.clubs.filter(c => !c.foreign && (c.div || 1) === START_DIV).sort((a, b) => b.rep - a.rep).map(c => {
          const sq = DB.players.filter(p => p.club === c.id);
          const top = sq.map(playerOvr).sort((a, b) => b - a).slice(0, 11);
          const avg = top.reduce((s, v) => s + v, 0) / (top.length || 1);
          return `<button class="club-pick" data-id="${c.id}" style="--c1:${c.colors[0]};--c2:${c.colors[1]}">
            ${crest(c, 46)}<div><b>${esc(c.name)}</b><small>${stars(avg)} · ${money(c.budget)}</small></div></button>`;
        }).join('')}
      </div>
    </div>
    <div class="card row gap wrap">
      <h2 class="grow">Fichiers</h2>
      <button class="btn" id="btnLoadFile">📂 Charger un fichier de sauvegarde (nouvel emplacement)</button>
    </div>
  </div>`;
  renderSlots($('#slotsCard'));
  if (typeof bindRoleSelect === 'function') bindRoleSelect();
  renderMondeCard($('#mondeCard'));
  $('#btnCont')?.addEventListener('click', () => { loadGame(ex); enterGame(); });
  $('#btnEdit').onclick = () => editorScreen();
  $('#btnImp').onclick = () => pickFile(async raw => {
    try { DB = importDatabase(raw); await saveDB(); toast('Base importée !'); startScreen(); }
    catch (e) { toast('Import impossible : ' + e.message, 'err'); }
  });
  $('#btnExp').onclick = () => exportDatabase(DB);
  $('#btnReset').onclick = () => confirmBox('Revenir à la base d\'origine ? Tes modifications de la base (pas ta partie) seront perdues.', async () => { await Store.del(DB_KEY); DB = buildDefaultDatabase(); startScreen(); }, 'Réinitialiser', true);
  $('#btnLoadFile').onclick = () => pickFile(g => {
    if (!g.clubs || !g.players || g.version !== 2) return toast('Ce fichier n\'est pas une sauvegarde compatible.', 'err');
    g.slot = 's' + Date.now(); loadGame(g); save(); enterGame();
  });
  $$('.tabs button[data-div]').forEach(b => b.onclick = () => { START_DIV = +b.dataset.div; startScreen(); });
  $$('.club-pick').forEach(b => b.onclick = () => {
    const go = () => {
      const name = $('#mgr').value.trim() || 'Coach';
      try { localStorage.setItem('mf-mgr', name); } catch { }
      G = newGame(DB, +b.dataset.id, name);
      VIEW = 'inbox';
      save(); enterGame();
    };
    go();
  });
}

// ---------- Import / export de base ----------
function importDatabase(raw) {
  if (!raw || !Array.isArray(raw.clubs) || raw.clubs.length < 4) throw new Error('il faut au moins 4 clubs dans "clubs"');
  if (raw.players && raw.clubs[0] && raw.clubs[0].id != null && !raw.clubs[0].players) {
    // format interne (export complet)
    const W = JSON.parse(JSON.stringify(raw));
    normalizeWorld(W);
    W.players.forEach(p => { p.value = calcValue(p); });
    return { leagueNames: W.leagueNames, cupName: W.cupName, clubs: W.clubs, players: W.players };
  }
  NEXT_PID = 1;
  const clubs = [], players = [];
  const mkPlayer = (pp, clubId, rep) => {
    const pos = ROLES[pp.pos] ? pp.pos : 'MC';
    const p = genPlayer(pos, 10, { club: clubId, age: pp.age, nat: pp.nat || 'FRA', name: pp.name, photo: pp.photo, rep, num: pp.num });
    if (pp.attrs) { for (const k in ATTRS) if (pp.attrs[k] != null) p.attrs[k] = clamp(Math.round(pp.attrs[k]), 1, 20); }
    else setPlayerOvr(p, pp.ovr ?? 60);
    p.pot = pp.pot ? clamp(pp.pot, playerOvr(p), 99) : pp.paEcart != null ? clamp(playerOvr(p) + Math.round(pp.paEcart * .4), playerOvr(p), 99) : Math.max(p.pot, playerOvr(p));
    if (pp.contract) p.contract = pp.contract;
    if (pp.pers && PERSONALITIES[pp.pers]) p.pers = pp.pers;
    if (pp.foot) p.foot = pp.foot;
    if (pp.detail99 && typeof pp.detail99 === 'object') p.detail99 = pp.detail99; // sous-notes détaillées (sur 99), ex. import d'une sauvegarde FM
    if (pp.fmUid) p.fmUid = pp.fmUid;
    p.wage = pp.wage || calcWage(p);
    p.attrs0 = { ...p.attrs };
    p.value = calcValue(p);
    return p;
  };
  raw.clubs.forEach((c, i) => {
    const rep = clamp(c.rep ?? 65, 30, 99);
    const club = {
      id: i + 1, name: String(c.name || 'Club ' + (i + 1)), short: String(c.short || String(c.name || 'CLB').replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3)).toUpperCase().slice(0, 4),
      colors: Array.isArray(c.colors) && c.colors.length >= 2 ? c.colors : ['#334455', '#ffffff'], rep, div: c.div || null,
      stadium: c.stadium || 'Stade municipal', capacity: c.capacity || 20000,
      budget: c.budget ?? roundMoney(Math.pow(rep / 50, 5) * 2.2e6), logo: c.logo || null, style: clubStyle(), coh: 65, trophies: []
    };
    clubs.push(club);
    const plist = (c.players || []).map(pp => mkPlayer(pp, club.id, rep));
    const q = 8.6 + (rep - 50) / 40 * 5.2;
    for (const role of SQUAD_TEMPLATE) {
      if (plist.length >= 22) break;
      const have = plist.filter(p => p.pos === role).length, need = SQUAD_TEMPLATE.filter(r => r === role).length;
      if (have < need) { const p = genPlayer(role, q - 1, { club: club.id, rep }); p.value = calcValue(p); plist.push(p); }
    }
    assignNumbers(plist);
    players.push(...plist);
  });
  (raw.freeAgents || []).forEach(pp => players.push(mkPlayer(pp, null, 50)));
  for (let i = 0; i < 25; i++) { const p = genPlayer(pick(SQUAD_TEMPLATE), 6 + rnd() * 6, { club: null }); p.value = calcValue(p); players.push(p); }
  const W = { leagueNames: raw.leagueNames || [raw.leagueName || 'Ligue 1', 'Ligue 2'], cupName: raw.cupName || 'Coupe Nationale', clubs: clubs.map(c => { if (!c.div) delete c.div; return c; }), players };
  normalizeWorld(W);
  return W;
}

function exportDatabase(W) {
  const out = {
    leagueNames: W.leagueNames, cupName: W.cupName,
    _aide: 'Modifie puis réimporte. div = division (1, 2…). pos = GB, DC, DG, DD, MDC, MC, MOC, AG, AD, BU. attrs 1-20 (ou "ovr": 1-100 sans attrs). photo/logo = URL ou image data:. pers = Professionnel, Ambitieux, Loyal, Tempérament, Discret, Leader.',
    clubs: W.clubs.map(c => ({
      name: c.name, short: c.short, colors: c.colors, rep: Math.round(c.rep), div: c.div, budget: Math.round(c.budget), stadium: c.stadium, capacity: c.capacity, logo: c.logo,
      players: W.players.filter(p => p.club === c.id).map(p => ({ name: p.name, num: p.num, age: p.age, nat: p.nat, pos: p.pos, foot: p.foot, pers: p.pers, pot: p.pot, contract: p.contract, photo: p.photo, attrs: p.attrs }))
    })),
    freeAgents: W.players.filter(p => p.club == null).map(p => ({ name: p.name, age: p.age, nat: p.nat, pos: p.pos, pot: p.pot, attrs: p.attrs, photo: p.photo }))
  };
  download('base-manager-foot.json', out);
}

// ============================================================
//  Jeu principal
// ============================================================
const NAV = [
  ['inbox', '🏠', 'Accueil'], ['squad', '👥', 'Effectif'], ['tactics', '📋', 'Tactique'], ['training', '🏋', 'Entraînement'], ['staff', '🧑‍💼', 'Staff'], ['medical', '🏥', 'Infirmerie'], ['dressing', '🤝', 'Vestiaire'], ['youth', '🌱', 'Formation'], ['analysis', '📈', 'Analyse'],
  ['fixtures', '📅', 'Calendrier'], ['comps', '🏆', 'Compétitions'], ['intl', '🌍', 'International'], ['transfers', '💱', 'Mercato'], ['finances', '💶', 'Finances'],
  ['club', '🏟', 'Club'], ['editor', '✏', 'Éditeur'], ['options', '⚙', 'Options']
];

function enterGame() {
  document.body.className = 'game';
  const c = myClub(G);
  document.documentElement.style.setProperty('--club1', c.colors[0]);
  document.documentElement.style.setProperty('--club2', c.colors[1]);
  $('#app').innerHTML = `
    <header id="top"></header>
    <nav id="nav">${NAV.map(([k, i, l], n) => `<button data-v="${k}" title="${l}${n < 9 ? ` (touche ${n + 1})` : ''}"><span>${i}</span><em>${l}</em></button>`).join('')}</nav>
    <main id="main"></main>`;
  $$('#nav button').forEach(b => b.onclick = () => show(b.dataset.v));
  show(VIEW === 'x' ? 'inbox' : VIEW);
}

function myNextFixture() {
  for (let w = G.week; w < G.schedule.length; w++) {
    const e = G.schedule[w];
    const f = weekFixtures(G, w).find(f => f.h === G.clubId || f.a === G.clubId);
    if (f) return { f, w };
    if (e.t === 'C' && !G.comps.CUP.rounds[e.r] && G.comps.CUP.alive.includes(G.clubId) && !G.comps.CUP.winner) return { f: null, w, cupTbd: true };
    if (e.t === 'E' && e.r >= 8 && inEuroAlive(G) && !weekFixtures(G, w).length) return { f: null, w, cupTbd: true };
  }
  return null;
}

function renderTop() {
  const c = myClub(G);
  const done = G.week >= G.schedule.length;
  const thisWeek = !done ? weekFixtures(G).find(f => f.h === G.clubId || f.a === G.clubId) : null;
  const nx = myNextFixture();
  const opp = nx?.f ? getClub(G, nx.f.h === G.clubId ? nx.f.a : nx.f.h) : null;
  const unread = G.inbox.filter(m => !m.read && !m.world).length;
  const cName = nx?.f ? compName(G, nx.f) : '';
  $('#top').innerHTML = `
    <div class="tclub">${crest(c, 42)}<div><b>${esc(c.name)}</b><small>${esc(G.managerName)} · ${esc(clubLeague(G, G.clubId)?.name || '')}</small></div></div>
    <div class="tinfo"><small>Saison</small><b>${G.season}/${String(G.season + 1).slice(2)}</b></div>
    <div class="tinfo"><small>${done ? 'Statut' : fmtDate(dateOfWeek(G, G.week))}</small><b>${esc(weekLabel(G))}</b></div>
    <div class="tinfo"><small>Budget</small><b class="${c.budget < 0 ? 'neg' : ''}">${money(c.budget)}</b></div>
    <div class="tinfo" title="Confiance du président"><small>Président</small>${meter(G.board.conf, 'Confiance')}</div>
    <div class="tinfo hide-s"><small>Mercato</small><b>${windowOpen(G) ? '<span class="pos">Ouvert</span>' : 'Fermé'}</b></div>
    <div class="search hide-s"><input id="gsearch" placeholder="🔎 Joueur, club… ( / )" autocomplete="off"><div id="gres"></div></div>
    <div class="grow"></div>
    ${opp ? `<div class="tnext hide-s"><small>${esc(cName)} · ${fmtDate(dateOfWeek(G, nx.w))}</small><b>${nx.f.h === G.clubId ? 'vs' : '@'} ${esc(opp.name)}</b></div>` : ''}
    <button class="btn primary big" id="btnGo" title="Espace">${done ? 'Fin de saison ▶' : thisWeek ? 'Jouer le match ▶' : 'Continuer ▶'}</button>`;
  $('#btnGo').onclick = () => advance();
  const ib = $('#nav button[data-v=inbox] span'); if (ib) ib.dataset.n = unread || '';
  const inp = $('#gsearch');
  inp.oninput = () => globalSearch(inp.value);
  inp.onblur = () => setTimeout(() => { const r = $('#gres'); if (r) r.innerHTML = ''; }, 200);
}

function globalSearch(q) {
  const box = $('#gres'); if (!box) return;
  q = normName(q);
  if (q.length < 2) { box.innerHTML = ''; return; }
  const ps = G.players.filter(p => normName(p.name).includes(q)).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 7);
  const cs = G.clubs.filter(c => normName(c.name).includes(q) || normName(c.short).includes(q)).slice(0, 4);
  box.innerHTML = [...cs.map(c => `<div data-c="${c.id}">${crest(c, 20)} ${esc(c.name)}</div>`),
    ...ps.map(p => `<div data-p="${p.id}">${avatar(p, 22)} ${esc(p.name)} <small>${p.pos} · ${p.club != null ? esc(getClub(G, p.club).short) : 'Libre'}</small> ${ovrBadge(playerOvr(p))}</div>`)].join('') || '<div class="muted">Aucun résultat</div>';
  box.querySelectorAll('[data-p]').forEach(d => d.onmousedown = () => playerModal(+d.dataset.p));
  box.querySelectorAll('[data-c]').forEach(d => d.onmousedown = () => viewClub(+d.dataset.c));
}

function show(v) {
  if (LIVE) return;
  VIEW = v;
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  renderTop();
  const fn = { inbox: vInbox, squad: vSquad, tactics: vTactics, training: vTraining, staff: vStaff, medical: vMedical, dressing: vDressing, youth: vYouth, analysis: vAnalysis, fixtures: vFixtures, comps: vComps, intl: vIntl, transfers: vTransfers, finances: vFinances, club: vClub, editor: el => vEditor(el, G, true), options: vOptions }[v] || vInbox;
  const main = $('#main'); main.innerHTML = '';
  fn(main);
  main.scrollTop = 0;
}
function refresh() { if (VIEW === 'x') return; show(VIEW); }

// ---------- Raccourcis clavier ----------
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) { if (e.key === 'Escape') e.target.blur(); return; }
  if (e.key === 'Escape') { closeModal(); return; }
  if (!G || document.body.className !== 'game') return;
  if (LIVE) {
    if (e.key === ' ') { e.preventDefault(); $('#mPause')?.click(); }
    return;
  }
  if ($('#modal')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('#btnGo')?.click(); }
  else if (/^[1-9]$/.test(e.key)) { const n = NAV[+e.key - 1]; if (n) show(n[0]); }
  else if (e.key === '/') { e.preventDefault(); $('#gsearch')?.focus(); }
});

// ============================================================
//  Accueil (tableau de bord)
// ============================================================
let INBOX_FILTER = 'all';
function vInbox(el) {
  const L = clubLeague(G, G.clubId);
  const tbl = standings(G, L.id);
  const myRank = tbl.findIndex(t => t.id === G.clubId) + 1;
  const me = tbl[myRank - 1];
  const nx = myNextFixture();
  const squad = clubPlayers(G, G.clubId);
  const avgMor = squad.reduce((s, p) => s + p.morale, 0) / (squad.length || 1);
  const filt = { all: m => !m.world, club: m => !m.world && ['board', 'win', 'loss', 'inj', 'warn', 'youth', 'trophy', 'info', 'cup'].includes(m.type), transfer: m => ['transfer', 'offer', 'scout'].includes(m.type), press: m => m.type === 'press', world: m => m.world }[INBOX_FILTER];
  const msgs = G.inbox.filter(filt).slice(0, 40);
  const lastRes = [];
  for (let w = G.week - 1; w >= 0 && lastRes.length < 5; w--) {
    const e = G.schedule[w];
    const f = weekFixtures(G, w).find(f => f.h === G.clubId || f.a === G.clubId);
    if (f?.res) lastRes.push(f);
  }
  const lo = Math.max(0, myRank - 4), mini = tbl.slice(lo, lo + 7);
  let nextCard = '<p class="muted">Aucun match à venir.</p>';
  if (nx?.f) {
    const f = nx.f, home = f.h === G.clubId, opp = getClub(G, home ? f.a : f.h);
    const oppL = clubLeague(G, opp.id), ot = oppL ? standings(G, oppL.id) : null, orank = ot ? ot.findIndex(t => t.id === opp.id) + 1 : 0;
    nextCard = `<div class="nextmatch">
      <div class="nm-team">${crest(getClub(G, f.h), 64)}<b>${esc(getClub(G, f.h).name)}</b></div>
      <div class="nm-mid"><small>${esc(compName(G, f) + ' · ' + weekLabel(G, nx.w))}</small><span>VS</span><small>${fmtDate(dateOfWeek(G, nx.w))}</small></div>
      <div class="nm-team">${crest(getClub(G, f.a), 64)}<b>${esc(getClub(G, f.a).name)}</b></div>
    </div>
    <p class="center hint">${oppL ? `${esc(opp.name)} : ${orank}<sup>e</sup> de ${esc(oppL.name)} · forme <span class="form">${ot[orank - 1].form.slice(-5).map(r => `<i class="f${r}">${r}</i>`).join('') || '-'}</span>` : `${esc(opp.name)} · club étranger (${esc(NATIONS.find(n => n[0] === opp.country)?.[1] || opp.country)})`}</p>`;
  } else if (nx?.cupTbd) nextCard = '<p class="muted">Prochain tour de coupe : tirage à venir.</p>';
  const prog = (G.weekProg || []).slice(0, 8);
  el.innerHTML = `
  <div class="grid3">
    <section class="card span2">
      <h2>Prochain match</h2>${nextCard}
    </section>
    <section class="card">
      <h2>Situation</h2>
      <div class="kpis">
        <div><small>${esc(L.name)}</small><b>${myRank}<sup>e</sup></b><em>${me.pts} pts</em></div>
        <div title="${esc(objectiveLabel(G))}"><small>Objectif</small><b class="sm">${esc(objectiveLabel(G))}</b></div>
      </div>
      <div class="gauges">
        <div><small>Confiance du président</small>${meter(G.board.conf)}</div>
        <div><small>Cohésion du groupe</small>${meter(myClub(G).coh ?? 60)}</div>
        <div><small>Moral moyen</small>${meter(avgMor)}</div>
        <div><small>Supporters</small>${meter(G.fans ?? 60)}</div>
      </div>
    </section>
  </div>
  <div class="grid2">
    <section class="card">
      <div class="row gap"><h2 class="grow">📨 Messages</h2>
        <div class="tabs sm">${[['all', 'Tous'], ['club', 'Club'], ['transfer', 'Mercato'], ['press', 'Presse'], ['world', 'Ligue']].map(([k, l]) => `<button data-f="${k}" class="${INBOX_FILTER === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      ${G.sponsorOffers?.length && !G.sponsor ? `<div class="alert">💼 Trois sponsors attendent ta réponse. <a href="#" onclick="show('finances');return false">Choisir</a></div>` : ''}
      ${pendingDecisions(G).length ? `<div class="alert req">❗ ${pendingDecisions(G).length} décision(s) en attente${blockingDecisions(G).length ? ' — obligatoire(s) avant de continuer' : ''}. <a href="#" onclick="MAIL_FILTER='todo';show('mail');return false">Répondre</a></div>` : ''}
      ${G.offers.length ? `<div class="alert">💱 ${G.offers.length} offre(s) de transfert en attente. <a href="#" onclick="TR_TAB='offers';show('transfers');return false">Voir</a></div>` : ''}
      <ul class="inbox">${msgs.map(m => `<li class="${m.read ? '' : 'unread'} t-${m.type}"><small>${esc(m.label || '')} · ${m.season}</small>${esc(m.text)}</li>`).join('') || '<li class="muted">Aucun message.</li>'}</ul>
    </section>
    <div class="col">
      <section class="card">
        <h2>${esc(L.name)}</h2>
        <table class="tbl standings compact">${mini.map((r, i) => { const c = getClub(G, r.id); return `<tr class="${r.id === G.clubId ? 'me' : ''}" data-c="${c.id}"><td>${lo + i + 1}</td><td class="nm">${crest(c, 18)} ${esc(c.name)}</td><td>${r.p}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`; }).join('')}</table>
        ${lastRes.length ? `<h3>Derniers résultats</h3><table class="tbl compact">${lastRes.map(f => resultRow(f)).join('')}</table>` : ''}
      </section>
      ${prog.length ? `<section class="card"><h2>🏋 Progrès à l'entraînement</h2><ul class="plain">${prog.map(x => { const p = getPlayer(G, x.pid); return p ? `<li data-pid="${p.id}">${avatar(p, 22)} <b>${esc(p.name)}</b> <span class="pos">+1 ${ATTRS[x.k]}</span></li>` : ''; }).join('')}</ul></section>` : ''}
    </div>
  </div>`;
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { INBOX_FILTER = b.dataset.f; vInbox(el); });
  el.querySelectorAll('tr[data-c]').forEach(r => r.onclick = () => viewClub(+r.dataset.c));
  el.querySelectorAll('[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
  el.querySelectorAll('tr[data-fx]').forEach(r => r.onclick = () => matchReport(r.dataset.fx));
  el.querySelectorAll('.inbox li').forEach((li, i) => li.onclick = () => { const m = msgs[i]; if (m) { MAIL_FILTER = 'all'; MAIL_SEL = m.id; show('mail'); } });
}
function fxKey(f) { return `${f.comp}|${f.h}|${f.a}`; }
function findFx(key) {
  const [comp, h, a] = key.split('|');
  const C = G.comps[comp];
  const list = !C ? [] : C.type === 'cup' ? C.rounds.flatMap(r => r.ties) : C.type === 'euro' ? [...C.league.flat(), ...C.ko.flatMap(s => s ? s.ties.flatMap(t => [t.f1, t.f2]) : [])].filter(Boolean) : C.type === 'super' ? C.ties : C.fixtures.flat();
  return list.find(f => f.h === +h && f.a === +a);
}
function resultRow(f, opts = {}) {
  const H = getClub(G, f.h), A = getClub(G, f.a);
  let cls = '';
  if (f.res && (f.h === G.clubId || f.a === G.clubId)) {
    const w = fixtureWinner(f);
    cls = w === G.clubId ? 'win' : w == null ? 'draw' : 'loss';
  }
  const sc = f.res ? `${f.res[0]} - ${f.res[1]}${f.firstRes ? `<small> (cumul ${f.res[0] + f.firstRes[0]}-${f.res[1] + f.firstRes[1]})</small>` : ''}${f.pens ? `<small> (${f.pens[0]}-${f.pens[1]} tab)</small>` : f.et ? '<small> ap</small>' : ''}` : (opts.date || '-');
  return `<tr class="${cls}" ${f.res ? `data-fx="${fxKey(f)}"` : ''}><td class="r">${esc(H.name)} ${crest(H, 18)}</td><td class="sc">${sc}</td><td>${crest(A, 18)} ${esc(A.name)}</td></tr>`;
}
function matchReport(key) {
  const f = findFx(key); if (!f || !f.res) return;
  const H = getClub(G, f.h), A = getClub(G, f.a);
  const goals = s => (f.events || []).filter(e => e.s === s).map(e => `${e.t === 'goal' ? '⚽' : '🟥'} ${esc(getPlayer(G, e.p)?.name || '?')} ${e.m}'`).join('<br>') || '<span class="muted">-</span>';
  modal(`<div class="report">
    <div class="vs">${crest(H, 56)}<b>${esc(H.name)}</b><span class="big">${f.res[0]} - ${f.res[1]}</span><b>${esc(A.name)}</b>${crest(A, 56)}</div>
    ${f.pens ? `<p class="center">Tirs au but : ${f.pens[0]} - ${f.pens[1]}</p>` : f.et ? '<p class="center">Après prolongation</p>' : ''}
    <div class="grid2"><div class="r">${goals(0)}</div><div>${goals(1)}</div></div>
    <table class="tbl kv mt">
      ${f.xg ? `<tr><td>xG (buts attendus)</td><td>${f.xg[0]} - ${f.xg[1]}</td></tr>` : ''}
      ${f.att ? `<tr><td>Affluence</td><td>${f.att.toLocaleString('fr-FR')}</td></tr>` : ''}
      ${f.motm ? `<tr><td>Homme du match</td><td>${esc(getPlayer(G, f.motm)?.name || '-')}</td></tr>` : ''}
      ${f.wx && typeof WEATHER !== 'undefined' ? `<tr><td>Météo</td><td>${WEATHER[f.wx].icon} ${WEATHER[f.wx].label}</td></tr>` : ''}
    </table>
    ${f.report ? analysisHTML([H.name, A.name], teamColors(H, A), f.report, f.a === G.clubId ? 1 : 0) : ''}</div>`, f.report ? 'wide' : '');
  bindAnalysis($('#modal'));
}

// ============================================================
//  Effectif
// ============================================================
let SQUAD_SORT = { k: 'pos', d: 1 };
let SQUAD_LINE = '';
let SQUAD_VIEW = 'gen';
const POS_ORDER = Object.keys(ROLES);
function vSquad(el, clubId = G.clubId) {
  const mine = clubId === G.clubId;
  const club = getClub(G, clubId);
  let list = clubPlayers(G, clubId).filter(p => !p.academy);
  if (SQUAD_LINE) list = list.filter(p => ROLES[p.pos].line === SQUAD_LINE);
  const key = SQUAD_SORT.k, d = SQUAD_SORT.d;
  const val = p => ({ num: p.num || 99, pos: POS_ORDER.indexOf(p.pos) * 1000 - playerOvr(p), name: p.name, age: p.age, ovr: playerOvr(p), pot: p.pot, fit: p.fit, mor: p.morale, val: p.value, wage: p.wage, apps: p.stats.apps, goals: p.stats.goals, rat: p.stats.apps ? p.stats.rating / p.stats.apps : 0, con: p.contract })[key];
  list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * d);
  const inXI = new Set(mine ? G.tactics.lineup : []);
  const inB = new Set(mine ? G.tactics.bench : []);
  const th = (k, l, t = '') => `<th data-k="${k}" class="${key === k ? 'sorted' : ''}" title="${t}">${l}</th>`;
  const all = clubPlayers(G, clubId);
  el.innerHTML = `<section class="card">
    <div class="row gap wrap"><h2 class="grow">${crest(club, 30)} ${esc(club.name)} <small>${all.length} joueurs · âge moyen ${(all.reduce((s, p) => s + p.age, 0) / (all.length || 1)).toFixed(1)} · valeur ${money(all.reduce((s, p) => s + p.value, 0))}</small></h2>
      <div class="tabs sm">${[['', 'Tous'], ['G', 'Gardiens'], ['D', 'Défenseurs'], ['M', 'Milieux'], ['A', 'Attaquants']].map(([k, l]) => `<button data-l="${k}" class="${SQUAD_LINE === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    </div>
    <div class="tabs sm mt">${[['gen', 'Général'], ['stats', 'Statistiques de la saison']].map(([k, l]) => `<button data-vw="${k}" class="${SQUAD_VIEW === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${SQUAD_VIEW === 'stats' ? squadStatsTable(list) : `<div class="scroll"><table class="tbl players">
      <thead><tr>${th('num', '#')}<th></th>${th('name', 'Joueur')}${th('pos', 'Poste')}${th('age', 'Âge')}<th>Nat.</th>${th('ovr', 'Note')}${th('pot', 'Pot.', 'Potentiel')}<th>Forme</th>${th('fit', 'Cond.', 'Condition physique')}${th('mor', 'Moral')}${th('apps', 'MJ')}${th('goals', 'Buts')}${th('rat', 'Moy.')}${th('val', 'Valeur')}${th('wage', 'Salaire')}${th('con', 'Contrat')}<th></th></tr></thead>
      <tbody>${list.map(p => `<tr data-pid="${p.id}" class="${inXI.has(p.id) ? 'xi' : inB.has(p.id) ? 'bn' : ''} ${available(p) ? '' : 'unav'}">
        <td class="muted">${p.num ?? ''}</td><td>${avatar(p, 32)}</td><td class="nm">${esc(p.name)}${fictionalTag(p)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${p.age}</td><td>${natFlag(p.nat)}</td>
        <td>${ovrCell(p)}</td><td>${potCell(p)}</td><td>${formDots(p)}</td><td>${bar(p.fit, 100, p.fit < 70 ? 'low' : '')}</td><td>${bar(p.morale, 100, 'mor')}</td>
        <td>${p.stats.apps}</td><td>${p.stats.goals}</td><td>${p.stats.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '-'}</td>
        <td>${money(p.value)}</td><td>${wageM(p.wage)}</td><td>${contractEnd(p)}</td><td>${status(p)}</td></tr>`).join('')}</tbody>
    </table></div>`}</section>
    ${mine ? (() => { const ln = G.players.filter(p => p.loan?.from === G.clubId); return ln.length ? `<section class="card"><h2>🔁 Joueurs prêtés</h2><table class="tbl compact">${ln.map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 26)}</td><td class="nm">${esc(p.name)}</td><td>${p.pos}</td><td>${ovrBadge(playerOvr(p))}</td><td>${crest(getClub(G, p.club), 18)} ${esc(getClub(G, p.club).name)}</td><td>${p.stats.apps} MJ · ${p.stats.goals} buts · ${p.stats.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '-'}</td></tr>`).join('')}</table></section>` : ''; })() : ''}`;
  el.querySelectorAll('th[data-k]').forEach(t => t.onclick = () => { SQUAD_SORT = { k: t.dataset.k, d: SQUAD_SORT.k === t.dataset.k ? -SQUAD_SORT.d : (['name', 'pos', 'age', 'num'].includes(t.dataset.k) ? 1 : -1) }; vSquad(el, clubId); });
  el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { SQUAD_LINE = b.dataset.l; vSquad(el, clubId); });
  el.querySelectorAll('[data-vw]').forEach(b => b.onclick = () => { SQUAD_VIEW = b.dataset.vw; vSquad(el, clubId); });
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}

function squadStatsTable(list) {
  const per90 = (v, p) => p.stats.min ? (v / p.stats.min * 90).toFixed(1) : '-';
  return `<div class="scroll"><table class="tbl players compact">
    <thead><tr><th></th><th>Joueur</th><th>Poste</th><th>MJ</th><th>Min</th><th>Note</th><th>Buts</th><th>PD</th><th title="Buts attendus">xG</th><th>Tirs</th><th title="% passes réussies">Passes</th><th title="Passes clés / 90 min">PC/90</th><th title="Dribbles réussis / 90">Drib/90</th><th title="Tacles / 90">Tac/90</th><th title="Ballons récupérés / 90">Récup/90</th><th title="Arrêts (gardiens)">Arrêts</th><th>⭐</th></tr></thead>
    <tbody>${list.slice().sort((a, b) => (b.stats.min || 0) - (a.stats.min || 0)).map(p => { const s = p.stats; return `<tr data-pid="${p.id}"><td>${avatar(p, 26)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td>
      <td>${s.apps}</td><td>${s.min || 0}</td><td>${s.apps ? (s.rating / s.apps).toFixed(2) : '-'}</td><td>${s.goals}</td><td>${s.assists}</td><td>${(s.xg || 0).toFixed(1)}</td><td>${s.sh || 0}</td>
      <td>${s.pas ? Math.round(s.pasOk / s.pas * 100) + ' %' : '-'}</td><td>${per90(s.kp || 0, p)}</td><td>${per90(s.dri || 0, p)}</td><td>${per90(s.tkl || 0, p)}</td><td>${per90(s.int || 0, p)}</td><td>${p.pos === 'GB' ? s.sav || 0 : ''}</td><td>${s.motm || ''}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint">Statistiques réelles issues de la simulation action par action (toutes compétitions).</p>`;
}
function playerModal(pid, tab = 'profil') {
  const p = getPlayer(G, pid); if (!p) return;
  const club = p.club != null ? getClub(G, p.club) : null;
  const mine = p.club === G.clubId;
  const known = knows(G, p);
  const ovr = playerOvr(p);
  const scouting = G.scouting.some(s => s.pid === p.id);
  const fogM = Math.max(1, 7 - G.staff.scout);
  const best = Object.keys(ROLES).map(r => [r, playerRoleRating(p, r) * familiarity(p, r)]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const shortlisted = G.shortlist.includes(p.id);
  const form = (p.form || []).filter(x => x.s === G.season).map(x => x.r);
  const tabs = `<div class="tabs">${[['profil', 'Profil'], ['stats', 'Statistiques'], ...(mine ? [['dev', 'Développement'], ['talk', 'Discuter']] : []), ...(p.srcId && MONDE.ok ? [['base', 'Base réelle']] : [])].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'profil') {
    body = `<div class="grid2">
      <div><h3>Attributs ${known ? '' : '<small class="muted">(estimés)</small>'}</h3>${!known ? Object.entries(ATTRS).filter(([k]) => p.pos === 'GB' || k !== 'gar').map(([k, l]) => {
        const h = (((p.id * 31 + k.charCodeAt(0) * 17) % 97) / 97) * 2 - 1, est = clamp(Math.round(p.attrs[k] + h * fogM / 3), 1, 20), r = Math.ceil(fogM / 3);
        return `<div class="attr"><span>${l}</span>${bar(est, 20, 'fog')}<b class="muted">${clamp(est - r, 1, 20)}-${clamp(est + r, 1, 20)}</b></div>`;
      }).join('') + `<p class="hint">${scouting ? '🔎 Rapport du recruteur en cours…' : 'Envoie ton recruteur pour connaître ses vraies qualités.'}</p>` : Object.entries(ATTRS).filter(([k]) => p.pos === 'GB' || k !== 'gar').map(([k, l]) => {
        const d = p.attrs[k] - (p.attrs0?.[k] ?? p.attrs[k]);
        return `<div class="attr"><span>${l}</span>${bar(p.attrs[k], 20, 'a' + Math.ceil(p.attrs[k] / 5))}<b>${p.attrs[k]}${d ? `<sup class="${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</sup>` : ''}</b></div>`;
      }).join('') + '<p class="hint">▲▼ : évolution depuis le début de saison.</p>'}</div>
      <div><h3>Infos</h3>
        <table class="tbl kv">
          <tr><td>Personnalité</td><td title="${esc(PERSONALITIES[p.pers] || '')}">${esc(p.pers)} <span class="muted">ⓘ</span></td></tr>
          ${mine ? `<tr><td>Statut</td><td><select id="pmStatus">${STATUS_ORDER.map(k => `<option value="${k}" ${k === (p.status || 'rot') ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}</select> <small class="muted">${(() => { const sh = playShare(p); return sh == null ? '' : `joue ${Math.round(sh * 100)} % du temps (attendu ${Math.round(expectedShare(p) * 100)} %)`; })()}</small></td></tr>
          <tr><td>Confiance en toi</td><td>${meter(p.trust ?? 55)}</td></tr>
          <tr><td>Disponibilité</td><td><label class="chk"><input type="checkbox" id="pmRest" ${p.rest ? 'checked' : ''}> Repos au prochain match</label> <label class="chk"><input type="checkbox" id="pmRes" ${p.reserve ? 'checked' : ''}> En réserve</label></td></tr>
          ${unhappyReasons(G, p).length ? `<tr><td>Préoccupations</td><td class="neg"><small>${unhappyReasons(G, p).map(esc).join('<br>')}</small></td></tr>` : ''}` : ''}
          ${p.clause && (mine || known) ? `<tr><td>Clause libératoire</td><td>${money(p.clause)}</td></tr>` : ''}
          ${p.loan?.inLoan ? `<tr><td>Prêt</td><td>De ${esc(getClub(G, p.loan.from).name)} · tu paies ${Math.round((p.loan.share ?? 1) * 100)} % du salaire${p.loan.option ? ` · option ${money(p.loan.option)}` : ''}</td></tr>` : ''}
          <tr><td>Valeur</td><td>${money(p.value)}</td></tr>
          <tr><td>Salaire</td><td>${wageM(p.wage)}</td></tr>
          <tr><td>Contrat</td><td>${contractEnd(p, true)}</td></tr>
          <tr><td>Condition</td><td>${bar(p.fit)} ${Math.round(p.fit)}%</td></tr>
          <tr><td>Moral</td><td>${bar(p.morale, 100, 'mor')} ${Math.round(p.morale)}%</td></tr>
          ${known ? `<tr><td>Postes</td><td>${best.map(([r, v]) => `${r} ${ovrBadge(v)}`).join(' ')}</td></tr>` : ''}
          ${p.loan ? `<tr><td>Prêt</td><td>Prêté par ${esc(getClub(G, p.loan.from).name)} jusqu'à la fin de saison</td></tr>` : ''}
          ${p.wantsOut ? '<tr><td>Situation</td><td class="neg">Demande à être transféré</td></tr>' : ''}
          ${p.injury > 0 ? `<tr><td>Blessure</td><td class="neg">${esc(p.inj?.name || 'Blessé')} — reste ${fmtDays(p.injury)}</td></tr>` : p.returnRisk > 0 ? '<tr><td>Médical</td><td>Convalescence : risque de rechute</td></tr>' : ''}
          ${mine && G.staff.physio >= 3 ? `<tr><td>Fragilité</td><td>${p.frag >= 13 ? '<span class="neg">Fragile</span>' : p.frag <= 5 ? '<span class="pos">Très solide</span>' : 'Normale'}</td></tr>` : ''}
          ${(p.injHist || []).length ? `<tr><td>Antécédents</td><td><small>${p.injHist.slice(-4).reverse().map(h => `${esc(h.name)} (${fmtDays(h.days)}, ${h.season})`).join('<br>')}</small></td></tr>` : ''}
        </table>
      </div></div>`;
  } else if (tab === 'stats') {
    body = `<div class="grid2"><div>
      <h3>Saison ${G.season}/${G.season + 1}</h3>
      <table class="tbl kv">
        <tr><td>Matchs</td><td>${p.stats.apps}</td></tr><tr><td>Buts (dont championnat)</td><td>${p.stats.goals} (${p.stats.lg})</td></tr>
        <tr><td>Passes décisives</td><td>${p.stats.assists}</td></tr><tr><td>Note moyenne</td><td>${p.stats.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '-'}</td></tr>
        <tr><td>Homme du match</td><td>${p.stats.motm}</td></tr><tr><td>Cartons</td><td>🟨 ${p.stats.yel} · 🟥 ${p.stats.red}</td></tr>
        <tr><td>Minutes</td><td>${p.stats.min || 0}</td></tr>
        <tr><td>Sélections (${esc(natName(p.nat))})</td><td>${p.caps || 0} · ${p.intlGoals || 0} but(s)${p.intlTitles ? ` · ${'🏆'.repeat(p.intlTitles)}` : ''}${p.ballons ? ` · 🌟×${p.ballons}` : ''}</td></tr>
        <tr><td>Tirs · xG</td><td>${p.stats.sh || 0} · ${(p.stats.xg || 0).toFixed(2)} (${p.stats.goals - (p.stats.xg || 0) >= 0 ? '+' : ''}${(p.stats.goals - (p.stats.xg || 0)).toFixed(1)})</td></tr>
        <tr><td>Passes réussies</td><td>${p.stats.pas ? Math.round(p.stats.pasOk / p.stats.pas * 100) + ' %' : '-'} (${p.stats.pas || 0})</td></tr>
        <tr><td>Passes clés · dribbles</td><td>${p.stats.kp || 0} · ${p.stats.dri || 0}</td></tr>
        <tr><td>Tacles · récupérations</td><td>${p.stats.tkl || 0} · ${p.stats.int || 0}</td></tr>
        ${p.pos === 'GB' ? `<tr><td>Arrêts</td><td>${p.stats.sav || 0}</td></tr>` : ''}
      </table>
      <h3>Forme (notes)</h3>${sparkline(form, 300, 60, { min: 4, max: 10 })}
    </div><div>
      <h3>Carrière</h3>
      <table class="tbl compact"><tr><th>Saison</th><th>Club</th><th>MJ</th><th>Buts</th><th>PD</th><th>Moy.</th></tr>
      ${(p.hist || []).slice().reverse().map(h => `<tr><td>${h.season}/${String(h.season + 1).slice(2)}</td><td>${esc(h.club)}</td><td>${h.apps}</td><td>${h.goals}</td><td>${h.assists}</td><td>${h.avg}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Pas encore d\'historique.</td></tr>'}</table>
    </div></div>`;
  } else if (tab === 'dev') {
    initPosFam(p); p.train ||= {};
    const seniors = clubPlayers(G, G.clubId).filter(x => x.id !== p.id && x.age >= 27 && !x.academy).sort((a, b) => influence(G, b) - influence(G, a));
    body = `<div class="grid2"><div>
      <h3>Entraînement individuel</h3>
      <label>Attribut à travailler <select id="dvAttr">${Object.entries(TRAIN_ATTRS).map(([k, l]) => `<option value="${k}" ${(p.train.attr || '') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Apprendre un nouveau poste <select id="dvLearn"><option value="">— Aucun —</option>${Object.keys(ROLES).filter(r => r !== p.pos && (r === 'GB') === (p.pos === 'GB')).map(r => `<option value="${r}" ${p.train.learn === r ? 'selected' : ''}>${r} — ${ROLES[r].label}</option>`).join('')}</select></label>
      <label>Parrain (joueur expérimenté) <select id="dvMentor"><option value="">— Aucun —</option>${seniors.map(x => `<option value="${x.id}" ${p.mentor === x.id ? 'selected' : ''}>${esc(x.name)} (${x.age} ans, ${esc(x.pers)})</option>`).join('')}</select></label>
      <p class="hint">Un parrain Professionnel, Leader ou Loyal peut transmettre sa personnalité à un jeune. L'apprentissage d'un poste avance aussi quand le joueur y est aligné en match.</p>
      <h3>Progression cette saison</h3>
      <p>${Object.keys(ATTRS).map(k => { const d = p.attrs[k] - (p.attrs0?.[k] ?? p.attrs[k]); return d ? `<span class="${d > 0 ? 'pos' : 'neg'}">${ATTRS[k]} ${d > 0 ? '+' : ''}${d}</span>` : ''; }).filter(Boolean).join(' · ') || '<span class="muted">Pas encore d\'évolution.</span>'}</p>
      </div><div>
      <h3>Polyvalence</h3>
      ${Object.keys(ROLES).filter(r => (r === 'GB') === (p.pos === 'GB')).map(r => `<div class="attr"><span>${r}</span>${bar(posFamOf(p, r), 100, posFamOf(p, r) >= 90 ? '' : posFamOf(p, r) >= 60 ? 'a3' : 'low')}<b>${Math.round(posFamOf(p, r))}</b></div>`).join('')}
      <p class="hint">≥ 90 : poste maîtrisé (aucun malus).</p></div></div>`;
  } else if (tab === 'talk') {
    const done = G.talked[p.id];
    const promised = G.promises.some(x => x.pid === p.id);
    body = `<p>Une discussion par semaine et par joueur. La réaction dépend de sa forme, de son moral et de sa personnalité (<b>${esc(p.pers)}</b> : ${esc(PERSONALITIES[p.pers] || '')}).</p>
      ${done ? `<div class="alert">Déjà discuté cette semaine : « ${esc(done)} »</div>` : `<div class="talk-opts">
        <button class="btn" data-talk="praise">👏 Féliciter pour ses performances</button>
        <button class="btn" data-talk="encourage">💪 L'encourager</button>
        <button class="btn" data-talk="criticize">😠 Critiquer ses performances</button>
        <button class="btn" data-talk="role">📋 Lui expliquer son rôle dans l'équipe</button>
        ${promised ? '' : '<button class="btn" data-talk="promise">🤝 Promettre du temps de jeu (4 semaines)</button>'}
      </div>`}`;
  }
  const actions = mine ? `
      <button class="btn" onclick="toggleList(${p.id})">${p.listed ? 'Retirer de la liste' : 'Mettre en vente'}</button>
      <button class="btn" onclick="renewModal(${p.id})">Prolonger</button>
      ${p.age <= 23 && !p.loan ? `<button class="btn" onclick="loanModal(${p.id})">Prêter</button>` : ''}
      ${p.loan?.inLoan && p.loan.option ? `<button class="btn primary" onclick="(()=>{const m=exerciseOption(G,getPlayer(G,${p.id}));if(m)return toast(m,'err');save();closeModal();refresh();})()">Lever l'option (${money(p.loan.option)})</button>` : ''}
      ${p.loan?.inLoan ? '' : `<button class="btn danger" onclick="releasePlayer(${p.id})">Libérer</button>`}`
    : p.loan?.from === G.clubId ? '<span class="muted">Joueur prêté — il reviendra en fin de saison.</span>'
    : `${known || scouting ? '' : `<button class="btn" onclick="scoutPlayer(${p.id})">🔎 Superviser</button>`}<button class="btn primary" onclick="offerModal(${p.id})">${club ? 'Faire une offre' : 'Proposer un contrat'}</button>
       ${club && canLoanIn(G, p) ? `<button class="btn" onclick="loanInModal(${p.id})">Demander un prêt</button>` : ''}
       <button class="btn" onclick="toggleShortlist(${p.id})">${shortlisted ? '👁 Retirer du suivi' : '👁 Suivre'}</button>
       ${club ? `<button class="btn" onclick="closeModal();viewClub(${club.id})">Voir le club</button>` : ''}`;
  modal(`
  <div class="pm-head">${avatar(p, 100)}
    <div><h2>${p.num ? `<span class="num">${p.num}</span>` : ''}${esc(p.name)}${fictionalTag(p)}</h2>
      <p>${ROLES[p.pos].label} · ${p.ageKnown === false ? 'âge inconnu' : p.age + ' ans'} · ${natFlag(p.nat)} ${esc(NATIONS.find(n => n[0] === p.nat)?.[1] || p.nat)} · Pied ${esc(p.foot.toLowerCase())}</p>
      <p>${club ? crest(club, 20) + ' ' + esc(club.name) : '<i>Agent libre</i>'} ${status(p)} ${formDots(p)}</p>
    </div>
    <div class="pm-ovr">${known ? ovrBadge(ovr) : `<span class="ovr o2 fogo" title="Estimation">~${estOvr(G, p)}</span>`}<small>Potentiel</small>${known ? stars(p.pot) : '<span class="muted">?</span>'}</div>
  </div>
  ${tabs}
  <div class="pm-body">${body}</div>
  <div class="row gap wrap mt">${actions}<div class="grow"></div>${p.srcId && MONDE.ok ? `<button class="btn" onclick="portraitManuel('joueur', '${esc(p.srcId)}', () => playerModal(${p.id}))" title="Associer un portrait à l'identifiant ${esc(p.srcId)}">🖼 Portrait</button>` : ''}<button class="btn" onclick="editPlayerModal(${p.id}, G, () => playerModal(${p.id}))" title="Modifier dans l'éditeur">✏ Éditer</button></div>`, 'wide');
  $$('#modal [data-t]').forEach(b => b.onclick = () => b.dataset.t === 'base' ? ficheBase(p.srcId, 'gen', false) : playerModal(pid, b.dataset.t));
  $('#dvAttr')?.addEventListener('change', e => { p.train = { ...(p.train || {}), attr: e.target.value || null }; save(); toast('Programme individuel mis à jour.'); });
  $('#dvLearn')?.addEventListener('change', e => { p.train = { ...(p.train || {}), learn: e.target.value || null, done: false }; save(); toast(e.target.value ? `${p.name} commence à apprendre le poste ${e.target.value}.` : 'Apprentissage arrêté.'); });
  $('#dvMentor')?.addEventListener('change', e => { p.mentor = e.target.value ? +e.target.value : null; save(); toast(p.mentor ? `${getPlayer(G, p.mentor).name} prend ${p.name} sous son aile.` : 'Parrainage arrêté.'); });
  $('#pmStatus')?.addEventListener('change', e => { const m = setStatus(G, p, e.target.value); if (m) toast(m, m.includes('ravi') ? '' : 'err'); save(); playerModal(pid); });
  $('#pmRest')?.addEventListener('change', e => { p.rest = e.target.checked; if (p.rest) removeFromTactics(p.id); save(); toast(p.rest ? `${p.name} sera au repos au prochain match.` : `${p.name} est de nouveau disponible.`); });
  $('#pmRes')?.addEventListener('change', e => { p.reserve = e.target.checked; if (p.reserve) { removeFromTactics(p.id); if (STATUS_ORDER.indexOf(p.status) <= 2) { p.morale = clamp(p.morale - 10, 5, 100); p.trust = clamp((p.trust ?? 55) - 10, 0, 100); } } save(); toast(p.reserve ? `${p.name} rejoint l'équipe réserve.` : `${p.name} réintègre le groupe pro.`); });
  $$('#modal [data-talk]').forEach(b => b.onclick = () => talkTo(p, b.dataset.talk));
}

function talkTo(p, kind) {
  const recent = (p.form || []).filter(x => x.s === G.season).slice(-3);
  const avg = recent.length ? recent.reduce((s, x) => s + x.r, 0) / recent.length : 6.6;
  const sens = { Discret: 1.5, Tempérament: 1.4, Professionnel: .7, Leader: .8, Loyal: .9, Ambitieux: 1.1 }[p.pers] || 1;
  let d = 0, txt = '';
  switch (kind) {
    case 'praise':
      if (avg >= 7) { d = 8; txt = `${p.name} est ravi que son travail soit reconnu.`; }
      else if (avg >= 6.5) { d = 3; txt = `${p.name} apprécie, même s'il sait pouvoir faire mieux.`; }
      else { d = -3; txt = `${p.name} trouve tes compliments peu sincères vu ses dernières prestations.`; }
      break;
    case 'encourage': d = rnd() < .8 ? 5 : 1; txt = d > 2 ? `${p.name} se sent soutenu et motivé.` : `${p.name} hoche la tête, sans plus.`; break;
    case 'criticize':
      if (avg < 6.4 && (p.pers === 'Professionnel' || p.pers === 'Leader' || rnd() < .4)) { d = 4; txt = `${p.name} accepte la critique et promet de réagir.`; }
      else { d = -10 * sens; txt = `${p.name} le prend très mal.`; }
      break;
    case 'role': d = rnd() < .7 ? 4 : -1; txt = d > 0 ? `${p.name} comprend mieux ce que tu attends de lui.` : `${p.name} n'est pas convaincu par son rôle.`; break;
    case 'promise':
      d = 15; txt = `${p.name} attend désormais du temps de jeu dans les 4 prochaines semaines.`;
      G.promises.push({ pid: p.id, until: G.week + 4, apps: p.stats.apps });
      break;
  }
  p.morale = clamp(p.morale + d, 5, 100);
  p.trust = clamp((p.trust ?? 55) + d * .5, 0, 100);
  G.talked[p.id] = txt;
  save();
  toast(txt, d >= 0 ? '' : 'err');
  playerModal(p.id, 'talk');
}
function toggleShortlist(pid) {
  const i = G.shortlist.indexOf(pid);
  if (i >= 0) G.shortlist.splice(i, 1); else G.shortlist.push(pid);
  save(); playerModal(pid); toast(i >= 0 ? 'Retiré de la liste de suivi.' : 'Ajouté à la liste de suivi.');
}
function toggleList(pid) { const p = getPlayer(G, pid); p.listed = !p.listed; save(); closeModal(); refresh(); toast(p.listed ? `${p.name} est mis en vente.` : `${p.name} n'est plus en vente.`); }
function releasePlayer(pid) {
  const p = getPlayer(G, pid);
  const cost = roundMoney(p.wage * 52 * p.contract * .5);
  confirmBox(`Libérer ${esc(p.name)} ? Indemnité à payer : <b>${money(cost)}</b>.`, () => {
    flow(G, myClub(G), -cost, 'wages'); p.club = null; p.listed = false; p.contract = 0;
    removeFromTactics(pid); save(); refresh();
  }, 'Libérer', true);
}
function renewModal(pid) {
  const p = getPlayer(G, pid);
  const ask = roundMoney(Math.max(p.wage, demandWage(G, p, myClub(G))) * (1.05 + (p.morale < 50 ? .3 : 0) + (p.pers === 'Ambitieux' ? .15 : 0)));
  modal(`<h2>Prolonger ${esc(p.name)}</h2>
    <p>Il demande environ <b>${money(ask)}</b>/sem. (actuel ${money(p.wage)}).</p>
    <label>Durée <select id="yrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === 3 ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
    <label>Salaire proposé (€/sem.) <input id="wg" type="number" step="1000" value="${ask}"></label>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ok">Proposer</button></div><p id="resp" class="hint"></p>`);
  $('#ok').onclick = () => {
    const w = +$('#wg').value, y = +$('#yrs').value;
    if (wageBill(G) - p.wage + w > G.board.wageCap) { $('#resp').innerHTML = `❌ Le président refuse : plafond salarial (${wageM(G.board.wageCap)}) dépassé.`; return; }
    if (w >= ask * .92 || (w >= ask * .8 && rnd() < .5)) {
      p.wage = w; p.contract = y; p.morale = clamp(p.morale + 10, 0, 100); save(); closeModal(); toast(`${p.name} prolonge de ${y} saison(s) !`); refresh();
    } else { p.morale = clamp(p.morale - 4, 0, 100); $('#resp').innerHTML = `❌ ${esc(p.name)} refuse. Il veut au moins ~${money(roundMoney(ask * .92))}.`; }
  };
}
function removeFromTactics(pid) {
  G.tactics.lineup = G.tactics.lineup.map(id => id === pid ? null : id);
  G.tactics.bench = G.tactics.bench.filter(id => id !== pid);
}

// ============================================================
//  Tactique (clic ou glisser-déposer)
// ============================================================
let SEL = null;
function placePlayer(T, pid, target) {
  const curXI = T.lineup.indexOf(pid), curB = T.bench.indexOf(pid);
  if (target.type === 'bench' && curB >= 0) {
    const occ = T.bench[target.idx];
    if (occ != null) { T.bench[curB] = occ; T.bench[target.idx] = pid; }
    return;
  }
  const occupant = target.type === 'xi' ? T.lineup[target.idx] : T.bench[target.idx];
  if (curXI >= 0) T.lineup[curXI] = occupant ?? null;
  if (curB >= 0) { if (occupant != null) T.bench[curB] = occupant; else T.bench[curB] = null; }
  if (target.type === 'xi') T.lineup[target.idx] = pid;
  else if (target.idx < T.bench.length) T.bench[target.idx] = pid; else T.bench.push(pid);
  T.bench = T.bench.filter((x, i, a) => x != null && a.indexOf(x) === i && !T.lineup.includes(x)).slice(0, 9);
}
let TAC_MOVE = false, TAC_SLOT = null;
function vTactics(el) {
  const T = G.tactics;
  T.inst = { ...defaultInst(), ...(T.inst || {}) }; T.takers ||= {}; T.pos ||= {}; T.styles ||= {}; T.duties ||= {};
  G.tacPresets ||= [null, null, null];
  const nSlots = FORMATIONS[T.formation].length;
  const squad = clubPlayers(G, G.clubId).filter(p => !p.academy).sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || playerOvr(b) - playerOvr(a));
  const side = makeSide(G, G.clubId, T);
  const S = teamStrength(G, side);
  const fam = tacFam(G, T.formation);
  if (TAC_SLOT != null && TAC_SLOT >= nSlots) TAC_SLOT = null;
  const selRole = SEL?.type === 'xi' ? slotRole(T, SEL.idx) : null;
  const xiPlayers = T.lineup.filter(Boolean).map(id => getPlayer(G, id));
  const opt = (k) => `<option value="">Auto (${esc(getPlayer(G, side.takers[k])?.name || '-')})</option>` + xiPlayers.map(p => `<option value="${p.id}" ${T.takers[k] === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  const dutyIcon = d => d === 1 ? '⚔' : d === -1 ? '🛡' : '';
  const slotHTML = Array.from({ length: nSlots }, (_, i) => {
    const pos = slotPos(T, i), role = slotRole(T, i);
    const p = T.lineup[i] ? getPlayer(G, T.lineup[i]) : null;
    const r = p ? effRating(p, role) : 0;
    const bad = p && (!available(p) || familiarity(p, role) < .9);
    const st = ROLE_STYLES[role]?.[slotStyle(T, i, role)];
    return `<div class="slot ${SEL?.type === 'xi' && SEL.idx === i ? 'sel' : ''} ${TAC_SLOT === i ? 'focus' : ''} ${bad ? 'bad' : ''} ${T.pos[i] ? 'moved' : ''}" data-i="${i}" style="left:${pos.x}%;top:${pos.y}%" ${p && !TAC_MOVE ? `draggable="true" data-pid="${p.id}"` : ''} title="${p ? esc(p.name) + ' — ' : ''}${esc(st?.label || ROLES[role].label)}${p && familiarity(p, role) < 1 ? ' (hors de son poste : ' + p.pos + ')' : ''}">
      ${p ? avatar(p, 40) : '<div class="empty">+</div>'}
      <div class="sl-role">${role}${p ? ' ' + ovrBadge(r) : ''}${dutyIcon(T.duties[i] ?? 0)}</div>
      <div class="sl-name">${p ? esc(p.name.split(' ').slice(-1)[0]) : '—'}${p && T.takers.cap === p.id ? ' ©' : ''}</div>
      <div class="sl-style">${esc(st?.label || '')}</div>
    </div>`;
  }).join('');
  let focusHTML = '<p class="hint">Clique un joueur sur le terrain pour régler son rôle et sa mission.</p>';
  if (TAC_SLOT != null) {
    const i = TAC_SLOT, role = slotRole(T, i), p = T.lineup[i] ? getPlayer(G, T.lineup[i]) : null;
    const styles = ROLE_STYLES[role] || {}, cur = slotStyle(T, i, role);
    focusHTML = `<div class="focus-box"><h3>${ROLES[role].label}${p ? ` — ${esc(p.name)} ${ovrBadge(effRating(p, role))}` : ''}</h3>
      <label>Rôle <select id="fStyle">${Object.entries(styles).map(([k, s]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>
      <p class="hint">${esc(styles[cur]?.tip || '')}</p>
      ${role !== 'GB' ? `<div class="inst-row"><span>Mission</span>${seg('duty', ['Défense', 'Soutien', 'Attaque'], T.duties[i] ?? 0)}</div>` : ''}
      ${T.pos[i] ? '<button class="btn sm mt" id="fReset">↺ Position par défaut</button>' : ''}</div>`;
  }
  el.innerHTML = `
  <div class="tac-wrap">
    <section class="card">
      <div class="row gap wrap">
        <label>Formation <select id="form">${Object.keys(FORMATIONS).map(f => `<option ${f === T.formation ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>Mentalité <select id="ment">${MENTALITIES.map(m => `<option value="${m.v}" ${m.v === T.mentality ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
        <div class="grow"></div>
        <button class="btn ${TAC_MOVE ? 'primary' : ''}" id="moveMode" title="Déplace librement les joueurs sur le terrain : leur poste s'adapte à la zone">✥ ${TAC_MOVE ? 'Placement : ON' : 'Placement libre'}</button>
        <button class="btn" id="auto" title="Meilleure composition">⚡ Auto</button>
      </div>
      <div class="pitch ${TAC_MOVE ? 'moving' : ''}" id="tpitch">
        <div class="lines"></div>
        ${TAC_MOVE ? '<div class="zones"><span style="top:6%">ATTAQUE</span><span style="top:30%">MILIEU OFFENSIF</span><span style="top:46%">MILIEU</span><span style="top:59%">MILIEU DÉFENSIF</span><span style="top:74%">DÉFENSE</span></div>' : ''}
        ${slotHTML}
      </div>
      <div class="row gap mt"><small class="muted">Familiarité ${esc(T.formation)}</small>${meter(fam, 'Familiarité tactique')}<small class="muted">${fam < 50 ? 'Les joueurs découvrent ce système (malus).' : fam < 80 ? 'En cours d\'assimilation.' : 'Parfaitement maîtrisé.'}</small>
        ${Object.keys(T.pos).length ? '<div class="grow"></div><button class="btn sm" id="resetAll">↺ Positions par défaut</button>' : ''}</div>
      <div class="strength">
        <div><small>Défense</small>${bar(S.def)}<b>${Math.round(S.def)}</b></div>
        <div><small>Milieu</small>${bar(S.mid)}<b>${Math.round(S.mid)}</b></div>
        <div><small>Attaque</small>${bar(S.att)}<b>${Math.round(S.att)}</b></div>
        <div><small>Gardien</small>${bar(S.gk)}<b>${Math.round(S.gk)}</b></div>
      </div>
      <h3>Remplaçants</h3>
      <div class="bench">${Array.from({ length: 9 }, (_, i) => {
        const p = T.bench[i] ? getPlayer(G, T.bench[i]) : null;
        return `<div class="bslot ${SEL?.type === 'bench' && SEL.idx === i ? 'sel' : ''}" data-b="${i}" ${p ? `draggable="true" data-pid="${p.id}"` : ''}>${p ? avatar(p, 30) + `<span>${p.pos} ${esc(p.name.split(' ').slice(-1)[0])}</span>${ovrBadge(playerOvr(p))}` : '<span class="muted">+ vide</span>'}</div>`;
      }).join('')}</div>
      <p class="hint">${TAC_MOVE ? 'Mode placement : fais glisser un joueur où tu veux, son poste change selon la zone (ex. un milieu axial avancé devient meneur offensif).' : 'Glisse un joueur sur une place, ou clique une place puis un joueur. Rouge = hors poste ou indisponible.'}</p>
    </section>
    <div class="col">
      <section class="card"><h2>🎯 Poste sélectionné</h2>${focusHTML}</section>
      <section class="card">
        <h2>Consignes d'équipe</h2>
        <div class="inst">${Object.entries(INST).map(([k, d]) => `<div class="inst-row" title="${esc(d.tip)}"><span>${d.label}</span>${seg(k, d.opts, T.inst[k] ?? 0)}</div>`).join('')}
          ${Object.entries(EXTRA_INST).map(([k, d]) => `<div class="inst-row" title="${esc(d.tip)}"><span>${d.label}</span><div class="seg"><button data-x="${k}" data-v="0" class="${!T.inst[k] ? 'on' : ''}">Non</button><button data-x="${k}" data-v="1" class="${T.inst[k] ? 'on' : ''}">Oui</button></div></div>`).join('')}</div>
        <div class="row gap wrap mt">
          <label>Capitaine <select data-tk="cap">${opt('cap')}</select></label>
          <label>Penaltys <select data-tk="pen">${opt('pen')}</select></label>
          <label>Coups francs <select data-tk="fk">${opt('fk')}</select></label>
        </div>
      </section>
      <section class="card"><h2>💾 Tactiques enregistrées</h2>
        <div class="presets">${G.tacPresets.map((pr, i) => `<div class="preset"><b>${pr ? esc(pr.name) : `Tactique ${'ABC'[i]}`}</b><small>${pr ? `${pr.formation} · ${MENTALITIES.find(m => m.v === pr.mentality)?.label || ''}` : 'vide'}</small>
          <div class="row gap"><button class="btn sm" data-psave="${i}">Enregistrer</button>${pr ? `<button class="btn sm primary" data-pload="${i}">Charger</button>` : ''}</div></div>`).join('')}</div>
        <p class="hint">Change de plan en un clic : avant le match ou en plein match (bouton 📋 Tactique).</p>
      </section>
      <section class="card">
        <h2>Joueurs ${selRole ? `<small>— note au poste ${selRole}</small>` : ''}</h2>
        <div class="scroll short"><table class="tbl players compact">
          <thead><tr><th></th><th>Joueur</th><th>Poste</th><th>Note</th>${selRole ? `<th>${selRole}</th>` : ''}<th>Cond.</th><th>Statut</th><th></th></tr></thead>
          <tbody>${squad.map(p => `<tr data-pid="${p.id}" draggable="true" class="${T.lineup.includes(p.id) ? 'xi' : T.bench.includes(p.id) ? 'bn' : ''} ${available(p) && !p.rest && !p.reserve ? '' : 'unav'}">
            <td>${avatar(p, 26)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${ovrBadge(playerOvr(p))}</td>
            ${selRole ? `<td>${ovrBadge(effRating(p, selRole))}</td>` : ''}
            <td>${bar(p.fit, 100, p.fit < 70 ? 'low' : '')}</td><td><small>${esc(STATUS[p.status || 'rot'].label)}</small></td><td>${T.lineup.includes(p.id) ? '<span class="tag grn">XI</span>' : T.bench.includes(p.id) ? '<span class="tag">Banc</span>' : ''} ${p.rest ? '<span class="tag">Repos</span>' : ''}${p.reserve ? '<span class="tag">Réserve</span>' : ''} ${status(p)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>
    </div>
  </div>`;
  const rerender = () => { save(); vTactics(el); };
  $('#form').onchange = e => {
    const nf = e.target.value;
    T.pos = {}; T.styles = {}; T.duties = {};
    T.lineup = remapLineup(G, T.lineup, nf, { ...T, formation: nf });
    T.formation = nf; SEL = null; TAC_SLOT = null; rerender();
    if (tacFam(G, nf) < 50) toast('Nouveau système : tes joueurs vont devoir l\'assimiler (familiarité basse).', 'err');
  };
  $('#ment').onchange = e => { T.mentality = +e.target.value; save(); };
  $('#auto').onclick = () => { Object.assign(T, autoLineup(G, G.clubId, T.formation, T)); SEL = null; rerender(); };
  $('#moveMode').onclick = () => { TAC_MOVE = !TAC_MOVE; SEL = null; vTactics(el); };
  $('#resetAll')?.addEventListener('click', () => { T.pos = {}; rerender(); });
  $('#fReset')?.addEventListener('click', () => { delete T.pos[TAC_SLOT]; rerender(); });
  $('#fStyle')?.addEventListener('change', e => { T.styles[TAC_SLOT] = e.target.value; rerender(); });
  el.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button[data-v]').forEach(b => b.onclick = () => {
    if (b.dataset.x) { T.inst[b.dataset.x] = +b.dataset.v; return rerender(); }
    if (s.dataset.name === 'duty') { T.duties[TAC_SLOT] = +b.dataset.v; return rerender(); }
    T.inst[s.dataset.name] = +b.dataset.v; rerender();
  }));
  el.querySelectorAll('[data-tk]').forEach(s => s.onchange = () => { T.takers[s.dataset.tk] = s.value ? +s.value : undefined; rerender(); });
  el.querySelectorAll('[data-psave]').forEach(b => b.onclick = () => {
    const i = +b.dataset.psave;
    const name = prompt('Nom de la tactique :', G.tacPresets[i]?.name || `Tactique ${'ABC'[i]}`);
    if (name === null) return;
    G.tacPresets[i] = newPreset(T, name.trim() || `Tactique ${'ABC'[i]}`); toast('Tactique enregistrée.'); rerender();
  });
  el.querySelectorAll('[data-pload]').forEach(b => b.onclick = () => { applyPreset(G, G.tacPresets[+b.dataset.pload]); SEL = null; TAC_SLOT = null; toast(`Tactique « ${G.tacPresets[+b.dataset.pload].name} » chargée.`); rerender(); });
  const pitch = $('#tpitch');
  if (TAC_MOVE) {
    el.querySelectorAll('.slot').forEach(s => {
      const i = +s.dataset.i;
      s.onclick = () => { TAC_SLOT = i; vTactics(el); };
      if (i === 0) return;
      s.onpointerdown = ev => {
        ev.preventDefault(); s.setPointerCapture(ev.pointerId); let moved = false;
        const rect = pitch.getBoundingClientRect();
        const at = e2 => [clamp((e2.clientX - rect.left) / rect.width * 100, 4, 96), clamp((e2.clientY - rect.top) / rect.height * 100, 8, 84)];
        s.onpointermove = e2 => { moved = true; const [x, y] = at(e2); s.style.left = x + '%'; s.style.top = y + '%'; s.querySelector('.sl-role').firstChild.textContent = roleAt(x, y, false) + ' '; };
        s.onpointerup = e2 => { s.onpointermove = null; s.onpointerup = null; if (!moved) { TAC_SLOT = i; return vTactics(el); } const [x, y] = at(e2); T.pos[i] = [Math.round(x), Math.round(y)]; TAC_SLOT = i; rerender(); };
      };
    });
  } else {
    const target = elx => elx.dataset.i != null ? { type: 'xi', idx: +elx.dataset.i } : { type: 'bench', idx: Math.min(+elx.dataset.b, T.bench.length) };
    const clickSlot = elx => {
      const cur = target(elx);
      if (cur.type === 'xi') TAC_SLOT = cur.idx;
      const curId = cur.type === 'xi' ? T.lineup[cur.idx] : T.bench[cur.idx];
      if (SEL && !(SEL.type === cur.type && SEL.idx === cur.idx)) {
        const selId = SEL.type === 'xi' ? T.lineup[SEL.idx] : T.bench[SEL.idx];
        if (selId != null) placePlayer(T, selId, cur); else if (curId != null) placePlayer(T, curId, SEL);
        SEL = null; rerender();
      } else { SEL = SEL ? null : cur; vTactics(el); }
    };
    el.querySelectorAll('.slot, .bslot').forEach(s => {
      s.onclick = () => clickSlot(s);
      s.ondragover = e => { e.preventDefault(); s.classList.add('over'); };
      s.ondragleave = () => s.classList.remove('over');
      s.ondrop = e => { e.preventDefault(); const pid = +e.dataTransfer.getData('text/plain'); if (pid) { placePlayer(T, pid, target(s)); SEL = null; rerender(); } };
    });
    el.querySelectorAll('[draggable=true]').forEach(d => d.ondragstart = e => { e.dataTransfer.setData('text/plain', d.dataset.pid); e.dataTransfer.effectAllowed = 'move'; });
  }
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => {
    const pid = +r.dataset.pid;
    if (!SEL) return playerModal(pid);
    placePlayer(T, pid, SEL); SEL = null; rerender();
  });
}

// ============================================================
function vTraining(el) {
  const tr = G.training;
  const squad = clubPlayers(G, G.clubId).sort((a, b) => a.fit - b.fit);
  const meetingDone = G.talked.__team;
  el.innerHTML = `<div class="grid2">
    <section class="card">
      <h2>🏋 Programme de la semaine</h2>
      <div class="train-grid">${Object.entries(TRAINING).map(([k, t]) => `<button class="train ${tr.focus === k ? 'on' : ''}" data-f="${k}"><b>${t.label}</b><small>${esc(t.tip)}</small></button>`).join('')}</div>
      <h3>Intensité</h3>
      <div class="seg wide">${['Légère', 'Normale', 'Intense'].map((l, i) => `<button data-i="${i}" class="${tr.intensity === i ? 'on' : ''}">${l}</button>`).join('')}</div>
      <p class="hint">Intense = progression plus rapide, mais condition plus basse et risque de blessure. Légère = récupération.</p>
      <h3>Cohésion du groupe</h3>${meter(myClub(G).coh ?? 60)} <span class="hint">Augmente chaque semaine (plus vite avec « Tactique »), baisse avec les recrues. Une équipe soudée joue mieux.</span>
      <h3>Réunion d'équipe</h3>
      ${meetingDone ? `<div class="alert">${esc(meetingDone)}</div>` : `<div class="talk-opts">
        <button class="btn" data-m="praise">👏 Féliciter le groupe</button>
        <button class="btn" data-m="demand">📣 Exiger plus d'efforts</button>
        <button class="btn" data-m="calm">🧘 Calmer la pression</button>
      </div>`}
    </section>
    <section class="card">
      <h2>État physique</h2>
      <div class="scroll"><table class="tbl compact">
        <tr><th></th><th>Joueur</th><th>Cond.</th><th>Moral</th><th></th></tr>
        ${squad.map(p => `<tr data-pid="${p.id}" class="${available(p) ? '' : 'unav'}"><td>${avatar(p, 24)}</td><td class="nm">${esc(p.name)}</td><td>${bar(p.fit, 100, p.fit < 70 ? 'low' : '')} ${Math.round(p.fit)}%</td><td>${bar(p.morale, 100, 'mor')}</td><td>${status(p)}</td></tr>`).join('')}
      </table></div>
    </section></div>`;
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { tr.focus = b.dataset.f; save(); vTraining(el); });
  el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { tr.intensity = +b.dataset.i; save(); vTraining(el); });
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    const L = clubLeague(G, G.clubId), t = standings(G, L.id);
    const rank = t.findIndex(r => r.id === G.clubId) + 1;
    const good = rank <= G.objective;
    let d, txt;
    if (b.dataset.m === 'praise') { d = good ? 5 : -2; txt = good ? 'Le groupe apprécie tes félicitations. Ambiance au beau fixe.' : 'Les joueurs trouvent les félicitations déplacées vu les résultats.'; }
    else if (b.dataset.m === 'demand') { d = good ? -3 : 4; txt = good ? 'Certains joueurs trouvent ton discours injuste.' : 'Message reçu : les joueurs veulent se racheter !'; }
    else { d = myClub(G).coh < 50 || !good ? 4 : 1; txt = 'Le vestiaire se détend.'; }
    clubPlayers(G, G.clubId).forEach(p => p.morale = clamp(p.morale + d * ({ Discret: .7, Leader: 1.2 }[p.pers] || 1), 5, 100));
    G.talked.__team = txt; save(); toast(txt, d >= 0 ? '' : 'err'); vTraining(el);
  });
}

// ============================================================
//  Calendrier
// ============================================================
let FIX_WEEK = null;
function vFixtures(el) {
  if (FIX_WEEK == null || FIX_WEEK >= G.schedule.length) FIX_WEEK = Math.max(0, Math.min(G.week - 1, G.schedule.length - 1));
  const rows = G.schedule.map((e, w) => ({ w, e, f: weekFixtures(G, w).find(f => f.h === G.clubId || f.a === G.clubId) }));
  const week = rows[FIX_WEEK];
  const fsAll = week.e.t === 'L' ? leagueComps(G).map(l => ({ name: l.name, fs: l.fixtures[week.e.r] || [] }))
    : week.e.t === 'E' ? euroComps(G).map(C => ({ name: `${C.name} — ${weekLabel(G, week.w).replace('Europe · ', '')}`, fs: weekFixtures(G, week.w).filter(f => f.comp === C.id) }))
    : week.e.t === 'S' ? [{ name: G.comps[week.e.r === 0 ? 'SUP' : 'ESUP']?.name || 'Supercoupe', fs: weekFixtures(G, week.w) }]
    : week.e.t === 'P' ? [{ name: weekLabel(G, week.w), fs: weekFixtures(G, week.w) }]
    : [{ name: G.comps.CUP.name + ' — ' + (G.comps.CUP.rounds[week.e.r]?.name || 'à venir'), fs: G.comps.CUP.rounds[week.e.r]?.ties || [] }];
  el.innerHTML = `<div class="grid2">
    <section class="card"><h2>📅 Mon calendrier</h2><div class="scroll"><table class="tbl">
      ${rows.map(({ w, e, f }) => {
        if (!f) { if ((e.t === 'E' || e.t === 'S') && !(e.t === 'E' && euroComps(G).some(C => C.teams.includes(G.clubId)))) return ''; return `<tr class="muted ${w === G.week ? 'next' : ''}" data-w="${w}"><td>${esc(weekLabel(G, w))}</td><td>${fmtDate(dateOfWeek(G, w))}</td><td colspan="3">${e.t === 'C' ? (G.comps.CUP.rounds[e.r] ? 'Pas de match (éliminé/exempté)' : 'Coupe — tirage à venir') : e.t === 'E' ? 'Europe — pas de match' : '-'}</td></tr>`; }
        const home = f.h === G.clubId, o = getClub(G, home ? f.a : f.h);
        const w2 = fixtureWinner(f); const cls = f.res ? (w2 === G.clubId ? 'win' : w2 == null ? 'draw' : 'loss') : '';
        return `<tr class="${cls} ${w === G.week ? 'next' : ''} ${e.t === 'C' ? 'cup' : e.t === 'E' || e.t === 'S' ? 'euro' : ''}" data-w="${w}" ${f.res ? `data-fx="${fxKey(f)}"` : ''}><td>${esc(weekLabel(G, w))}</td><td>${fmtDate(dateOfWeek(G, w))}</td><td>${home ? 'Dom.' : 'Ext.'}</td><td>${crest(o, 20)} ${esc(o.name)}</td><td class="sc">${f.res ? (home ? f.res.join('-') : f.res.slice().reverse().join('-')) + (f.pens ? ' tab' : '') : ''}</td></tr>`;
      }).join('')}
    </table></div></section>
    <section class="card"><h2>Semaine <select id="wsel">${G.schedule.map((_, w) => `<option value="${w}" ${w === FIX_WEEK ? 'selected' : ''}>${esc(weekLabel(G, w))}</option>`).join('')}</select></h2>
      ${fsAll.map(g => `<h3>${esc(g.name)}</h3><table class="tbl compact">${g.fs.map(f => resultRow(f) + (f.events?.length ? `<tr class="ev"><td colspan="3">${f.events.filter(e => e.t === 'goal').map(e => `⚽ ${e.m}' ${esc(getPlayer(G, e.p)?.name || '?')}`).join(' · ')}</td></tr>` : '')).join('') || '<tr><td class="muted">Aucun match</td></tr>'}</table>`).join('')}
    </section></div>`;
  $('#wsel').onchange = e => { FIX_WEEK = +e.target.value; vFixtures(el); };
  el.querySelectorAll('tr[data-w]').forEach(r => r.onclick = () => { if (r.dataset.fx && +r.dataset.w === FIX_WEEK) return matchReport(r.dataset.fx); FIX_WEEK = +r.dataset.w; vFixtures(el); });
  el.querySelectorAll('tr[data-fx]').forEach(r => { if (!r.dataset.w) r.onclick = () => matchReport(r.dataset.fx); });
}

// ============================================================
//  Compétitions
// ============================================================
let COMP_TAB = null;
function vComps(el) {
  if (!COMP_TAB || !G.comps[COMP_TAB]) COMP_TAB = clubLeague(G, G.clubId).id;
  const comp = G.comps[COMP_TAB];
  const tabs = `<div class="tabs">${[...leagueComps(G), G.comps.CUP, ...euroComps(G)].map(c => `<button data-c="${c.id}" class="${c.id === COMP_TAB ? 'on' : ''}">${esc(c.name)}</button>`).join('')}<button data-c="AW" class="${COMP_TAB === 'AW' ? 'on' : ''}">🏅 Récompenses</button></div>`;
  el.innerHTML = `<section class="card">${tabs}</section><div id="compBody"></div>`;
  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { COMP_TAB = b.dataset.c; vComps(el); });
  const body = $('#compBody');
  if (COMP_TAB === 'AW') return vAwards(body);
  if (comp.type === 'cup') return vCup(body, comp);
  if (comp.type === 'euro') return vEuro(body, comp);
  const t = standings(G, comp.id), n = t.length, ps = promoSpots(comp);
  const L = leagueComps(G), li = L.findIndex(l => l.id === comp.id);
  const hasUp = li > 0, hasDown = li < L.length - 1;
  const scorers = topScorers(G, comp.id, 12);
  const inComp = p => comp.clubs.includes(p.club);
  const assists = G.players.filter(p => inComp(p) && p.stats.assists > 0).sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 8);
  const rated = G.players.filter(p => inComp(p) && p.stats.apps >= Math.max(3, G.week / 4)).sort((a, b) => b.stats.rating / b.stats.apps - a.stats.rating / a.stats.apps).slice(0, 8);
  body.innerHTML = `<div class="grid2 wide-left">
  <section class="card"><h2>🏆 ${esc(comp.name)} ${G.season}/${G.season + 1}</h2>
    <div class="scroll"><table class="tbl standings"><thead><tr><th>#</th><th>Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>BP</th><th>BC</th><th>Diff</th><th>Pts</th><th>Forme</th></tr></thead>
    <tbody>${t.map((r, i) => { const c = getClub(G, r.id);
      const zr = typeof zoneRegle === 'function' ? zoneRegle(G, comp, i, n, hasUp, hasDown) : null;
      const zone = zr ?? (i === 0 ? 'z-cl' : (hasUp && i < ps) ? 'z-el' : (hasDown && i >= n - ps) ? 'z-rel' : '');
      return `<tr class="${zone} ${r.id === G.clubId ? 'me' : ''}" data-c="${c.id}"><td>${i + 1}</td><td class="nm">${crest(c, 20)} ${esc(c.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td><td class="form">${r.form.slice(-5).map(x => `<i class="f${x}">${x}</i>`).join('')}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint"><span class="lg z-cl"></span> Champion ${hasUp ? '<span class="lg z-el"></span> Montée' : ''} ${hasUp && typeof zoneRegle === 'function' ? '<span class="lg z-po"></span> Play-offs / barrage d\'accession' : ''} ${hasDown && typeof zoneRegle === 'function' ? '<span class="lg z-bar"></span> Barrage / playout' : ''} ${hasDown ? '<span class="lg z-rel"></span> Relégation' : ''}${typeof regleComp === 'function' && reglesActives(G) && regleComp(G, comp) ? ` · <a href="#" onclick="show('regles');return false">règlement ${esc(regleComp(G, comp).nom)}</a>` : ''}</p>
  </section>
  <div class="col">
    <section class="card"><h2>⚽ Buteurs</h2><table class="tbl compact">${scorers.map((p, i) => `<tr data-pid="${p.id}"><td>${i + 1}</td><td>${avatar(p, 22)}</td><td class="nm">${esc(p.name)}</td><td>${crest(getClub(G, p.club), 16)}</td><td><b>${p.stats.lg}</b></td></tr>`).join('') || '<tr><td class="muted">-</td></tr>'}</table></section>
    <section class="card"><h2>🅰 Passeurs</h2><table class="tbl compact">${assists.map((p, i) => `<tr data-pid="${p.id}"><td>${i + 1}</td><td class="nm">${esc(p.name)}</td><td>${crest(getClub(G, p.club), 16)}</td><td><b>${p.stats.assists}</b></td></tr>`).join('') || '<tr><td class="muted">-</td></tr>'}</table></section>
    <section class="card"><h2>⭐ Meilleures notes</h2><table class="tbl compact">${rated.map((p, i) => `<tr data-pid="${p.id}"><td>${i + 1}</td><td class="nm">${esc(p.name)}</td><td>${crest(getClub(G, p.club), 16)}</td><td><b>${(p.stats.rating / p.stats.apps).toFixed(2)}</b></td></tr>`).join('') || '<tr><td class="muted">-</td></tr>'}</table></section>
  </div></div>`;
  body.querySelectorAll('tr[data-c]').forEach(r => r.onclick = () => viewClub(+r.dataset.c));
  body.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}
function vCup(body, C) {
  const scorers = topScorers(G, 'CUP', 8);
  body.innerHTML = `<section class="card"><h2>🏆 ${esc(C.name)} ${C.winner ? `— vainqueur : ${crest(getClub(G, C.winner), 24)} ${esc(getClub(G, C.winner).name)}` : ''}</h2>
    <div class="bracket">${C.rounds.map(r => `<div class="bround"><h3>${esc(r.name)}</h3>${r.ties.map(f => {
      const w = fixtureWinner(f);
      const line = id => `<div class="${w === id ? 'bw' : w ? 'bl' : ''} ${id === G.clubId ? 'me' : ''}">${crest(getClub(G, id), 16)} <span>${esc(getClub(G, id).short)}</span><b>${f.res ? f.res[id === f.h ? 0 : 1] : ''}</b></div>`;
      return `<div class="btie" ${f.res ? `data-fx="${fxKey(f)}"` : ''}>${line(f.h)}${line(f.a)}${f.pens ? `<small>tab ${f.pens[0]}-${f.pens[1]}</small>` : f.et ? '<small>a.p.</small>' : ''}</div>`;
    }).join('')}${r.byes.length ? `<p class="hint">${r.byes.length} clubs exemptés</p>` : ''}</div>`).join('')}
    ${Array.from({ length: C.total - C.rounds.length }, (_, i) => `<div class="bround"><h3>${esc(cupRoundName(C.total, C.rounds.length + i, C.prelim))}</h3><p class="muted">À venir</p></div>`).join('')}</div>
  </section>
  <section class="card"><h2>⚽ Buteurs (toutes compétitions)</h2><table class="tbl compact">${scorers.map((p, i) => `<tr data-pid="${p.id}"><td>${i + 1}</td><td class="nm">${esc(p.name)}</td><td>${crest(getClub(G, p.club), 16)}</td><td><b>${p.stats.goals}</b></td></tr>`).join('')}</table></section>`;
  body.querySelectorAll('[data-fx]').forEach(r => r.onclick = () => matchReport(r.dataset.fx));
  body.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}
function vAwards(body) {
  const name = id => { const p = getPlayer(G, id); return p ? `<a href="#" data-pid="${p.id}">${esc(p.name)}</a>` : '<span class="muted">(retraité)</span>'; };
  body.innerHTML = `<div class="grid2">
    <section class="card"><h2>⭐ Joueurs du mois</h2><table class="tbl compact">${G.awards.monthly.slice(0, 20).map(a => `<tr><td>${a.season} · ${esc(weekLabel(G, a.week)) || ''}</td><td>${esc(a.comp)}</td><td>${name(a.pid)}</td><td>${a.avg}</td></tr>`).join('') || '<tr><td class="muted">Attribués toutes les 4 semaines.</td></tr>'}</table></section>
    <section class="card"><h2>🏅 Palmarès des saisons</h2>${G.awards.seasons.map(a => `<div class="award"><h3>${a.season}/${a.season + 1} — ${esc(a.comp)}</h3>
      <p>Joueur de l'année : ${name(a.best)} · Espoir : ${name(a.young)} · Meilleur buteur : ${name(a.scorer)} (${a.scorerGoals ?? '-'}) · Gardien : ${name(a.gk)}</p>
      <p class="hint">Équipe type : ${a.team.map(t => `${t.role} ${name(t.pid)}`).join(', ')}</p></div>`).join('') || '<p class="muted">Remis en fin de saison.</p>'}</section></div>`;
  body.querySelectorAll('[data-pid]').forEach(a => a.onclick = e => { e.preventDefault(); playerModal(+a.dataset.pid); });
}
function viewClub(id) {
  if (id === G.clubId) return show('squad');
  if (LIVE) return;
  closeModal();
  VIEW = 'x';
  $$('#nav button').forEach(b => b.classList.remove('on'));
  renderTop();
  const el = $('#main'); el.innerHTML = '';
  const c = getClub(G, id);
  const L = clubLeague(G, id), t = L ? standings(G, L.id) : [], rank = t.findIndex(r => r.id === id) + 1;
  const info = document.createElement('div');
  info.innerHTML = `<section class="card row gap wrap">${crest(c, 72)}<div class="grow"><h2>${esc(c.name)}</h2>
    <p>${L ? `${esc(L.name)} : <b>${rank}<sup>e</sup></b>` : `Club étranger (${esc(NATIONS.find(n => n[0] === c.country)?.[1] || c.country || '?')})`} · ${esc(c.stadium)} (${c.capacity.toLocaleString('fr-FR')} places) · Réputation ${stars(c.rep)} · Budget ${money(c.budget)}</p>
    <p class="hint">Style : ${c.style?.formation || '?'} · pressing ${INST.press.opts[(c.style?.press ?? 0) + 1].toLowerCase()} · tempo ${INST.tempo.opts[(c.style?.tempo ?? 0) + 1].toLowerCase()} · ligne ${INST.line.opts[(c.style?.line ?? 0) + 1].toLowerCase()}</p>
    <p>${(c.trophies || []).map(t => `🏆 ${esc(t.name)} ${t.season}`).join(' · ') || '<span class="muted">Aucun trophée récent</span>'}</p></div></section>`;
  el.appendChild(info);
  const sq = document.createElement('div'); el.appendChild(sq);
  vSquad(sq, id);
}

// ============================================================
//  Mercato
// ============================================================
let TF = { q: '', pos: '', maxv: '', maxage: '', minovr: '', free: false };
let TR_TAB = 'search';
function vTransfers(el) {
  const club = myClub(G);
  const tabs = [['search', '🔎 Recherche'], ['shortlist', `👁 Suivi (${G.shortlist.length})`], ['scout', `🔎 Recrutement (${G.scouting.length + (G.missions || []).filter(m => m.left > 0).length})`], ['offers', `📩 Offres reçues (${G.offers.length})`], ['selling', '🏷 Mes joueurs en vente'], ['history', '📜 Historique']];
  el.innerHTML = `<section class="card">
    <div class="row gap wrap"><h2 class="grow">💱 Mercato ${windowOpen(G) ? '<span class="tag grn">Ouvert</span>' : '<span class="tag red">Fermé — agents libres uniquement</span>'}</h2>
    <span>Budget : <b>${money(club.budget)}</b> · Effectif : ${clubPlayers(G, G.clubId).length}/32</span></div>
    <div class="tabs mt">${tabs.map(([k, l]) => `<button data-tt="${k}" class="${TR_TAB === k ? 'on' : ''}">${l}</button>`).join('')}</div>
  </section><section class="card" id="trBody"></section>`;
  el.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { TR_TAB = b.dataset.tt; vTransfers(el); });
  const body = $('#trBody');
  const table = list => `<div class="scroll"><table class="tbl players">
      <thead><tr><th></th><th>Joueur</th><th>Poste</th><th>Âge</th><th>Nat.</th><th>Note</th><th>Pot.</th><th>Club</th><th>Valeur</th><th>Salaire</th><th></th></tr></thead>
      <tbody>${list.map(p => { const c = p.club != null ? getClub(G, p.club) : null; return `<tr data-pid="${p.id}">
        <td>${avatar(p, 30)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${p.age}</td><td>${natFlag(p.nat)}</td><td>${ovrCell(p)}</td><td>${potCell(p)}</td>
        <td>${c ? crest(c, 18) + ' ' + esc(c.short) : '<i>Libre</i>'}</td><td>${c ? money(p.value) : '-'}</td><td>${wageM(p.wage)}</td><td>${status(p)}</td></tr>`; }).join('') || '<tr><td colspan="11" class="muted">Aucun joueur.</td></tr>'}</tbody>
    </table></div>`;
  if (TR_TAB === 'search') {
    let list = G.players.filter(p => p.club !== G.clubId && !p.loan);
    if (TF.q) list = list.filter(p => normName(p.name).includes(normName(TF.q)));
    if (TF.pos) list = list.filter(p => p.pos === TF.pos);
    if (TF.maxv) list = list.filter(p => p.value <= +TF.maxv * 1e6);
    if (TF.maxage) list = list.filter(p => p.age <= +TF.maxage);
    if (TF.minovr) list = list.filter(p => estOvr(G, p) >= +TF.minovr);
    if (TF.free) list = list.filter(p => p.club == null || p.listed);
    list.sort((a, b) => estOvr(G, b) - estOvr(G, a));
    body.innerHTML = `<div class="row gap wrap filters">
      <input id="fq" placeholder="Nom…" value="${esc(TF.q)}">
      <select id="fpos"><option value="">Tous postes</option>${Object.keys(ROLES).map(r => `<option ${r === TF.pos ? 'selected' : ''} value="${r}">${r} — ${ROLES[r].label}</option>`).join('')}</select>
      <input id="fmo" type="number" placeholder="Note min." value="${esc(TF.minovr)}">
      <input id="fmv" type="number" placeholder="Valeur max (M€)" value="${esc(TF.maxv)}">
      <input id="fage" type="number" placeholder="Âge max" value="${esc(TF.maxage)}">
      <label class="chk"><input type="checkbox" id="ffree" ${TF.free ? 'checked' : ''}> Libres / en vente</label>
    </div>${table(list.slice(0, 150))}<p class="hint">${list.length} joueurs${list.length > 150 ? ' (150 affichés)' : ''}.</p>`;
    const upd = () => { TF = { q: $('#fq').value, pos: $('#fpos').value, maxv: $('#fmv').value, maxage: $('#fage').value, minovr: $('#fmo').value, free: $('#ffree').checked }; vTransfers(el); };
    ['#fq', '#fpos', '#fmv', '#fage', '#fmo', '#ffree'].forEach(s => $(s).onchange = upd);
  } else if (TR_TAB === 'history') {
    const all = G.transfers || [];
    const mine = all.filter(t => t.from === G.clubId || t.to === G.clubId);
    const top = all.filter(t => t.season === G.season && t.fee > 0).sort((a, b) => b.fee - a.fee).slice(0, 10);
    const cl = id => id == null ? '<i>Libre</i>' : `${crest(getClub(G, id), 16)} ${esc(getClub(G, id)?.short || '?')}`;
    const row = t => `<tr ${G.pmap[t.pid] ? `data-pid="${t.pid}"` : ''}><td>${t.season} · ${esc(t.label)}</td><td class="nm">${esc(t.name)}</td><td>${t.pos}</td><td>${cl(t.from)}</td><td>→</td><td>${cl(t.to)}</td><td>${t.fee ? money(t.fee) : '-'}</td><td><span class="tag">${esc(t.type)}</span></td></tr>`;
    body.innerHTML = `<div class="grid2"><div><h3>Mes mouvements</h3><table class="tbl compact">${mine.slice(0, 40).map(row).join('') || '<tr><td class="muted">Aucun.</td></tr>'}</table></div>
      <div><h3>Plus gros transferts de la saison</h3><table class="tbl compact">${top.map(row).join('') || '<tr><td class="muted">Aucun.</td></tr>'}</table>
      <h3>Engagements financiers</h3><p>À payer (échéancier) : <b class="neg">${money(payablesOwed(G))}</b> · À recevoir : <b class="pos">${money(receivablesDue(G))}</b></p></div></div>`;
  } else if (TR_TAB === 'scout') {
    const ms = G.missions || [];
    body.innerHTML = `<h3>🧭 Missions de recrutement (${ms.filter(m => m.left > 0).length}/${maxMissions(G)})</h3>
      <div class="row gap wrap filters">
        <select id="msPos"><option value="">Tous postes</option>${Object.keys(ROLES).map(r => `<option value="${r}">${r} — ${ROLES[r].label}</option>`).join('')}</select>
        <select id="msAge">${[19, 21, 23, 26, 30].map(v => `<option value="${v}" ${v === 23 ? 'selected' : ''}>≤ ${v} ans</option>`).join('')}</select>
        <select id="msPot">${[60, 70, 75, 80, 85].map(v => `<option value="${v}" ${v === 75 ? 'selected' : ''}>Potentiel ≥ ${v}</option>`).join('')}</select>
        <select id="msReg">${Object.entries(REGIONS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
        <button class="btn primary" id="msGo">Lancer la mission</button>
      </div>
      ${ms.length ? `<table class="tbl compact">${ms.slice().reverse().slice(0, 8).map(m => `<tr><td>${m.pos || 'Tous'} · ≤ ${m.maxAge} ans · pot ≥ ${m.minPot}</td><td>${esc(REGIONS[m.region])}</td><td>${m.left > 0 ? `<span class="tag yel">${m.left} sem.</span>` : `<span class="tag grn">${m.found.length} trouvé(s)</span>`}</td><td>${m.found.map(id => { const p = getPlayer(G, id); return p ? `<a href="#" data-pid="${id}">${esc(p.name)}</a> (${p.age})` : ''; }).join(', ')}</td></tr>`).join('')}</table>` : '<p class="muted">Aucune mission. Les missions « Monde » peuvent dénicher des pépites inconnues.</p>'}
      <p>Recruteur : <b>niveau ${G.staff.scout}/5</b>. Un rapport individuel prend ${Math.max(1, 4 - Math.floor(G.staff.scout / 2))} semaine(s). Les joueurs non supervisés affichent une note <b>estimée (~)</b> et un potentiel inconnu.</p>
      <h3>En cours</h3>${table(G.scouting.map(s => getPlayer(G, s.pid)).filter(Boolean))}
      <h3>Joueurs connus (${G.known.length})</h3>${table(G.known.map(id => getPlayer(G, id)).filter(p => p && p.club !== G.clubId).slice(-40).reverse())}`;
    $('#msGo').onclick = () => {
      if ((G.missions || []).filter(m => m.left > 0).length >= maxMissions(G)) return toast('Tous tes recruteurs sont occupés (améliore le recruteur dans Staff).', 'err');
      startMission(G, { pos: $('#msPos').value || null, maxAge: +$('#msAge').value, minPot: +$('#msPot').value, region: $('#msReg').value });
      save(); toast('Mission lancée !'); vTransfers(el);
    };
    body.querySelectorAll('a[data-pid]').forEach(x => x.onclick = e => { e.preventDefault(); playerModal(+x.dataset.pid); });
  } else if (TR_TAB === 'shortlist') {
    body.innerHTML = table(G.shortlist.map(id => getPlayer(G, id)).filter(p => p && p.club !== G.clubId));
  } else if (TR_TAB === 'offers') {
    body.innerHTML = G.offers.length ? `<table class="tbl">${G.offers.map(o => { const p = getPlayer(G, o.pid), c = getClub(G, o.club); return `<tr><td>${avatar(p, 30)}</td><td class="nm">${esc(p.name)}</td><td>${ovrBadge(playerOvr(p))}</td><td>${crest(c, 20)} ${esc(c.name)}</td><td><b>${money(o.fee)}</b> <small class="muted">(valeur ${money(p.value)})</small></td><td class="row gap"><button class="btn primary sm" data-acc="${o.id}">Accepter</button><button class="btn sm" data-ctr="${o.id}">Contre-offre</button><button class="btn sm" data-rej="${o.id}">Refuser</button></td></tr>`; }).join('')}</table>` : '<p class="muted">Aucune offre. Mets des joueurs en vente pour attirer des acheteurs.</p>';
    body.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => acceptOffer(+b.dataset.acc));
    body.querySelectorAll('[data-rej]').forEach(b => b.onclick = () => {
      const o = G.offers.find(o => o.id === +b.dataset.rej);
      if (o?.star) { const p = getPlayer(G, o.pid); p.morale = clamp(p.morale - 15, 5, 100); news(G, `${p.name} n'apprécie pas que tu aies refusé l'offre de ${getClub(G, o.club).name}.`, 'warn'); toast(`${p.name} est déçu…`, 'err'); }
      if (o) (G.rejected ||= []).push({ pid: o.pid, club: o.club, fee: o.fee, week: G.week, star: o.star });
      G.offers = G.offers.filter(x => x !== o); save(); vTransfers(el);
    });
    body.querySelectorAll('[data-ctr]').forEach(b => b.onclick = () => counterOffer(+b.dataset.ctr));
  } else {
    body.innerHTML = table(clubPlayers(G, G.clubId).filter(p => p.listed)) + '<p class="hint">Mets un joueur en vente depuis sa fiche. Les offres arrivent pendant les fenêtres de mercato.</p>';
  }
  body.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}
function counterOffer(oid) {
  const o = G.offers.find(o => o.id === oid); if (!o) return;
  const p = getPlayer(G, o.pid), c = getClub(G, o.club);
  modal(`<h2>Contre-offre à ${esc(c.name)}</h2><p>Offre actuelle pour ${esc(p.name)} : <b>${money(o.fee)}</b></p>
    <label>Montant demandé (€) <input type="number" id="cf" step="100000" value="${roundMoney(o.fee * 1.2)}"></label>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ok">Envoyer</button></div><p id="resp" class="hint"></p>`);
  $('#ok').onclick = () => {
    const v = +$('#cf').value;
    if (v <= o.max && c.budget >= v) { o.fee = roundMoney(v); toast(`${c.name} accepte ${money(o.fee)} !`); closeModal(); acceptOffer(o.id); }
    else if (v <= o.max * 1.15 && rnd() < .5) { o.fee = o.max; $('#resp').innerHTML = `${esc(c.name)} propose un compromis à <b>${money(o.max)}</b>. <button class="btn sm primary" onclick="closeModal();acceptOffer(${o.id})">Accepter</button>`; }
    else { G.offers = G.offers.filter(x => x !== o); save(); closeModal(); toast(`${c.name} retire son offre.`, 'err'); refresh(); }
  };
}
function acceptOffer(oid) {
  const o = G.offers.find(o => o.id === oid); if (!o) return;
  const p = getPlayer(G, o.pid), buyer = getClub(G, o.club), me = myClub(G);
  if (buyer.budget < o.fee) { toast(`${buyer.name} n'a plus les fonds.`, 'err'); G.offers = G.offers.filter(x => x !== o); return refresh(); }
  flow(G, buyer, -o.fee, 'transfers'); flow(G, me, o.fee, 'sales');
  paySellOn(G, p, o.fee, me);
  logTransfer(G, p, me.id, buyer.id, o.fee, 'transfert');
  G.board.transfer = roundMoney((G.board.transfer || 0) + o.fee * .6);
  p.club = buyer.id; p.listed = false; p.contract = rint(2, 5); p.num = null; assignNumbers(clubPlayers(G, buyer.id));
  removeFromTactics(p.id);
  G.offers = G.offers.filter(x => x.pid !== p.id);
  news(G, `${p.name} est transféré à ${buyer.name} pour ${money(o.fee)}.`, 'transfer');
  if (o.fee >= 30e6) unlock(G, 'bigSale');
  save(); toast(`${p.name} vendu ${money(o.fee)} !`); refresh();
}
function offerModal(pid) {
  const p = getPlayer(G, pid);
  const seller = p.club != null ? getClub(G, p.club) : null;
  const me = myClub(G);
  if (seller && !windowOpen(G)) return toast('Mercato fermé : seuls les agents libres peuvent signer.', 'err');
  if (seller && G.board.ban) return toast('Interdiction de recruter (contrôle de gestion) : seuls les agents libres sont autorisés.', 'err');
  if (clubPlayers(G, G.clubId).length >= 32) return toast('Effectif complet (32 max). Vends ou libère quelqu\'un.', 'err');
  const myRankIfSigned = clubPlayers(G, G.clubId).filter(x => playerOvr(x) > playerOvr(p)).length;
  const wantStatus = defaultStatus(myRankIfSigned, p.age);
  const baseWage = roundMoney(Math.max(demandWage(G, p, me), p.wage * (seller ? 1.1 : .9)) * (1.1 + Math.max(0, playerOvr(p) - me.rep) / 40) * (p.pers === 'Ambitieux' ? 1.1 : 1));
  const room = () => G.board.wageCap - wageBill(G);
  const ask = seller ? sellerAsk(G, p, me) : 0;
  const known = knows(G, p);
  let stage = seller ? 'fee' : 'wage';
  const deal = { fee: roundMoney(p.value * .9), plan: 'cash', addOn: 0, sellOn: 0, swap: null };
  const myPlayers = clubPlayers(G, G.clubId).filter(x => !x.loan).sort((a, b) => b.value - a.value);
  const render = (msg = '') => {
    const st = deal.status || wantStatus;
    modal(`<h2>${seller ? 'Transfert' : 'Contrat'} : ${esc(p.name)}</h2>
      <div class="row gap">${avatar(p, 56)}<div><p>${ROLES[p.pos].label} · ${p.age} ans · ${ovrCell(p)} ${potCell(p)}</p>
      <p>${seller ? `${crest(seller, 18)} ${esc(seller.name)} · valeur estimée <b>${money(p.value)}</b>${p.clause && known ? ` · clause libératoire <b>${money(p.clause)}</b>` : p.clause ? ' · clause libératoire (montant inconnu, supervise-le)' : ''}` : 'Agent libre — pas d\'indemnité.'}</p></div></div>
      <p>Budget transferts : <b>${money(G.board.transfer)}</b> · Marge salariale : <b class="${room() < baseWage ? 'neg' : ''}">${wageM(room())}</b></p>
      <div class="steps"><span class="${stage === 'fee' ? 'on' : 'done'}">${seller ? '1. Accord avec le club' : ''}</span><span class="${stage === 'wage' ? 'on' : ''}">${seller ? '2. ' : ''}Contrat du joueur</span></div>
      ${stage === 'fee' ? `<div class="form-grid">
          <label>Indemnité (€) <input id="fee" type="number" step="100000" value="${deal.fee}"></label>
          <label>Paiement <select id="plan">${PAY_PLANS.map(x => `<option value="${x.k}" ${deal.plan === x.k ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
          <label>Bonus après 25 matchs (€) <input id="addon" type="number" step="100000" value="${deal.addOn}"></label>
          <label>% à la revente pour eux <select id="sellon">${[0, 10, 20, 30].map(v => `<option ${deal.sellOn === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label>Échange (joueur inclus) <select id="swap"><option value="">— Aucun —</option>${myPlayers.map(x => `<option value="${x.id}" ${deal.swap === x.id ? 'selected' : ''}>${esc(x.name)} (${x.pos}, ${money(x.value)})</option>`).join('')}</select></label>
        </div>
        <p class="hint">Un paiement échelonné, un bonus ou un % à la revente rendent l'offre plus attractive sans tout payer tout de suite.</p>
        <div class="row gap mt">${p.clause && known ? `<button class="btn" id="payClause">💥 Payer la clause (${money(p.clause)})</button>` : ''}<div class="grow"></div><button class="btn primary" id="ok">Envoyer l'offre</button></div>`
        : `<p>${seller ? `✅ Accord avec ${esc(seller.name)} : <b>${money(deal.fee)}</b> (${PAY_PLANS.find(x => x.k === deal.plan).label})${deal.addOn ? ` + bonus ${money(deal.addOn)}` : ''}${deal.sellOn ? ` + ${deal.sellOn} % à la revente` : ''}${deal.swap ? ` + ${esc(getPlayer(G, deal.swap).name)}` : ''}.` : ''}</p>
        <p>Il demande environ <b>${money(baseWage)}</b>/sem. et le statut « <b>${STATUS[wantStatus].label}</b> ».</p>
        <div class="form-grid">
          <label>Salaire (€/sem.) <input id="wg" type="number" step="1000" value="${deal.wage ?? roundMoney(baseWage * .9)}"></label>
          <label>Durée <select id="yrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === (deal.yrs || 3) ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
          <label>Statut promis <select id="stt">${STATUS_ORDER.map(k => `<option value="${k}" ${k === st ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}</select></label>
          <label>Clause libératoire (€, 0 = aucune) <input id="cls" type="number" step="500000" value="${deal.clause ?? 0}"></label>
        </div>
        <p class="hint">Promettre un statut élevé aide à le convaincre, mais il faudra le faire jouer. Une clause libératoire rassure le joueur (salaire un peu moins élevé).</p>
        <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ok">Proposer le contrat</button></div>`}
      <p class="hint" id="resp">${msg}</p>`, 'wide');
    $('#payClause')?.addEventListener('click', () => {
      if (p.clause > G.board.transfer || p.clause > me.budget) return render('❌ Budget transferts insuffisant pour la clause.');
      Object.assign(deal, { fee: p.clause, plan: 'cash', addOn: 0, sellOn: 0, swap: null, viaClause: true }); stage = 'wage'; render('💥 Clause payée : le club ne peut pas refuser. Reste à convaincre le joueur.');
    });
    $('#ok').onclick = () => {
      if (stage === 'fee') {
        Object.assign(deal, { fee: +$('#fee').value, plan: $('#plan').value, addOn: +$('#addon').value || 0, sellOn: +$('#sellon').value || 0, swap: $('#swap').value ? +$('#swap').value : null });
        const nowPay = deal.fee * PAY_PLANS.find(x => x.k === deal.plan).now;
        if (deal.fee > G.board.transfer + 1 || nowPay > me.budget) return render('❌ Le président refuse : budget transferts insuffisant. (Ajuste la répartition dans Finances.)');
        if (clubPlayers(G, seller.id).length <= 18 && !deal.swap) return render(`❌ ${esc(seller.name)} refuse : effectif trop court. Propose un échange ?`);
        if (deal.swap) { const sp = getPlayer(G, deal.swap); if (playerOvr(sp) < seller.rep - 15) return render(`❌ ${esc(seller.name)} ne veut pas de ${esc(sp.name)}.`); if (sp.pers === 'Loyal' && rnd() < .5) return render(`❌ ${esc(sp.name)} refuse de partir dans l'échange.`); }
        if (p.clause && deal.fee >= p.clause) { stage = 'wage'; return render('💥 Ton offre atteint la clause libératoire : le club doit accepter.'); }
        const v = dealValue(G, deal, p);
        if (v >= ask) { stage = 'wage'; return render(); }
        if (v >= ask * .85) {
          const counter = roundMoney(deal.fee + (ask - v) / (PAY_PLANS.find(x => x.k === deal.plan).f) + ask * .02);
          modal(`<h2>Contre-offre de ${esc(seller.name)}</h2><p>Ils refusent cette structure mais accepteraient <b>${money(counter)}</b> avec les mêmes conditions.</p>
            <div class="row gap mt"><div class="grow"></div><button class="btn" id="no">Revoir l'offre</button><button class="btn primary" id="yes">Accepter ${money(counter)}</button></div>`);
          $('#no').onclick = () => render();
          $('#yes').onclick = () => { if (counter > G.board.transfer) return toast('Budget transferts insuffisant.', 'err'); deal.fee = counter; stage = 'wage'; render(); };
          return;
        }
        return render(`❌ Offre rejetée. ${esc(seller.name)} veut au moins ~<b>${money(roundMoney(ask * .9))}</b> (valeur perçue de ton offre : ${money(roundMoney(v))}).`);
      }
      deal.wage = +$('#wg').value; deal.yrs = +$('#yrs').value; deal.status = $('#stt').value; deal.clause = +$('#cls').value || 0;
      const repGap = playerOvr(p) - me.rep - (G.mgr.rep - 50) * .15;
      if (repGap > 18 && rnd() < .7) { closeModal(); return toast(`${p.name} ne veut pas rejoindre un club de ce niveau.`, 'err'); }
      const sGap = STATUS_ORDER.indexOf(deal.status) - STATUS_ORDER.indexOf(wantStatus);
      let need = baseWage * .9 * (1 + Math.max(0, sGap) * .12) * (deal.clause ? .95 : 1) * (deal.clause && deal.clause < p.value * 1.2 ? .93 : 1);
      if (sGap >= 2 && (p.pers === 'Ambitieux' || playerOvr(p) > me.rep)) return render(`❌ ${esc(p.name)} refuse d'être « ${STATUS[deal.status].label} ». Il veut être au moins « ${STATUS[STATUS_ORDER[STATUS_ORDER.indexOf(wantStatus) + 1]].label} ».`);
      if (deal.wage < need) return render(`❌ ${esc(p.name)} refuse ce salaire. Pour ce statut, il veut au moins ~<b>${money(roundMoney(need))}</b>.`);
      if (wageBill(G) + deal.wage > G.board.wageCap) return render(`❌ Le président bloque : la masse salariale dépasserait le plafond (${wageM(G.board.wageCap)}).`);
      const plan = PAY_PLANS.find(x => x.k === deal.plan);
      const nowPay = roundMoney(deal.fee * plan.now);
      const agent = roundMoney(seller ? deal.fee * .08 : deal.wage * 4);
      flow(G, me, -nowPay, 'transfers'); if (seller) flow(G, seller, nowPay, 'sales');
      if (seller) scheduleRest(G, me.id, seller.id, deal.fee - nowPay, plan.weeks);
      flow(G, me, -agent, 'agents');
      G.board.transfer = roundMoney(G.board.transfer - deal.fee);
      if (deal.swap) { const sp = getPlayer(G, deal.swap); removeFromTactics(sp.id); sp.club = seller.id; sp.num = null; sp.status = null; sp.listed = false; assignNumbers(clubPlayers(G, seller.id)); logTransfer(G, sp, me.id, seller.id, 0, 'échange'); }
      if (seller && p.sellOn) paySellOn(G, p, deal.fee, seller);
      if (seller) logTransfer(G, p, seller.id, me.id, deal.fee, deal.viaClause || (p.clause && deal.fee >= p.clause) ? 'clause' : 'transfert'); else logTransfer(G, p, null, me.id, 0, 'libre');
      p.club = G.clubId; p.wage = deal.wage; p.contract = deal.yrs; p.listed = false; p.morale = 85; p.num = null; p.status = deal.status; p.trust = 60; p.clause = deal.clause; p.recentMin = [];
      if (seller && deal.addOn) p.addOn = { club: seller.id, amount: deal.addOn, need: 25, count: 0 };
      if (seller && deal.sellOn) p.sellOn = { club: seller.id, pct: deal.sellOn };
      assignNumbers(clubPlayers(G, G.clubId));
      me.coh = clamp((me.coh ?? 60) - 4, 0, 100);
      G.shortlist = G.shortlist.filter(id => id !== p.id);
      if (G.tactics.bench.length < 9) G.tactics.bench.push(p.id);
      news(G, `Officiel : ${p.name} signe pour ${deal.yrs} saison(s)${seller ? ` en provenance de ${seller.name} (${money(deal.fee)}${plan.k !== 'cash' ? ', paiement échelonné' : ''})` : ''} ! Statut : ${STATUS[deal.status].label}. ${seller ? 'Commission d\'agent' : 'Prime à la signature'} : ${money(agent)}.`, 'transfer');
      save(); closeModal(); toast(`${p.name} a signé ! 🎉`); refresh();
    };
  };
  render();
}
function loanInModal(pid) {
  const p = getPlayer(G, pid), seller = getClub(G, p.club);
  if (!windowOpen(G)) return toast('Les prêts se font pendant le mercato.', 'err');
  modal(`<h2>Demande de prêt : ${esc(p.name)}</h2><p>${crest(seller, 18)} ${esc(seller.name)} · salaire ${wageM(p.wage)} · jusqu'à la fin de saison.</p>
    <div class="form-grid"><label>Part du salaire payée par toi <select id="ls">${[1, .75, .5, .25].map(v => `<option value="${v}">${v * 100} %</option>`).join('')}</select></label>
    <label>Option d'achat (€, 0 = aucune) <input id="lo" type="number" step="500000" value="0"></label></div>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ok">Proposer</button></div><p class="hint" id="resp"></p>`);
  $('#ok').onclick = () => {
    const share = +$('#ls').value, option = +$('#lo').value || 0;
    const r = loanInEval(G, p, share, option);
    if (!r.ok) return $('#resp').innerHTML = '❌ ' + esc(r.msg);
    doLoanIn(G, p, share, option); save(); closeModal(); toast(`${p.name} arrive en prêt !`); refresh();
  };
}

// ============================================================
//  Finances
// ============================================================
function vFinances(el) {
  const c = myClub(G);
  const squad = clubPlayers(G, G.clubId);
  const wages = wageBill(G);
  const sqVal = squad.reduce((s, p) => s + p.value, 0);
  const f = G.fin;
  const top = [...squad].sort((a, b) => b.wage - a.wage).slice(0, 10);
  const incT = Object.values(f.inc).reduce((s, v) => s + v, 0), expT = Object.values(f.exp).reduce((s, v) => s + v, 0);
  const maxV = Math.max(1, ...Object.values(f.inc), ...Object.values(f.exp));
  const row = (label, v, cls) => `<div class="finrow"><span>${label}</span><div class="finbar ${cls}"><i style="width:${v / maxV * 100}%"></i></div><b class="${cls}">${cls === 'neg' ? '-' : '+'}${money(v)}</b></div>`;
  const eco = clubEco(G, c), L = clubLeague(G, c.id);
  const lvl = G.ticket ?? 2;
  const nextHome = (() => { for (let w = G.week; w < G.schedule.length; w++) { const fx = weekFixtures(G, w).find(x => x.h === G.clubId); if (fx) return fx; } return null; })();
  const capPct = clamp(wages / G.board.wageCap * 100, 0, 150);
  el.innerHTML = `
  <div class="kpis card">
    <div><small>Trésorerie</small><b class="${c.budget < 0 ? 'neg' : ''}">${money(c.budget)}</b></div>
    <div><small>Budget transferts</small><b>${G.board.ban ? '<span class="neg">Interdit</span>' : money(G.board.transfer)}</b></div>
    <div><small>Masse salariale</small><b>${wageM(wages)}</b><em>plafond ${money(G.board.wageCap)} ${bar(capPct, 100, capPct > 98 ? 'low' : '')}</em></div>
    <div><small>Valeur de l'effectif</small><b>${money(sqVal)}</b></div>
    <div><small>Solde de la saison</small><b class="${incT - expT < 0 ? 'neg' : 'pos'}">${money(incT - expT)}</b></div>
  </div>
  ${G.sponsorOffers?.length && !G.sponsor ? `<section class="card sponsor-pick"><h2>💼 Choisis ton sponsor maillot</h2><div class="sp-grid">${G.sponsorOffers.map((o, i) => `<div class="sp">
      <h3>${esc(o.name)}</h3><span class="tag">${o.kind}</span>
      <p><b>${wageM(o.weekly)}</b> · ${o.seasons} saison(s)</p>
      <p class="hint">${o.objBonus ? `Prime objectif : ${money(o.objBonus)}` : 'Aucune prime : revenu garanti'}${o.winBonus ? ` · ${money(o.winBonus)} par victoire en championnat` : ''}</p>
      <button class="btn primary" data-sp="${i}">Signer</button></div>`).join('')}</div></section>` : ''}
  <div class="grid2">
    <section class="card"><h2>📊 Saison ${G.season}/${String(G.season + 1).slice(2)}</h2>
      <h3>Recettes</h3>${Object.entries(INC_LABELS).map(([k, l]) => row(l, f.inc[k] || 0, 'pos')).join('')}
      <h3>Dépenses</h3>${Object.entries(EXP_LABELS).map(([k, l]) => row(l, f.exp[k] || 0, 'neg')).join('')}
      <h3>Évolution de la trésorerie</h3>${sparkline(f.hist, 460, 80, { zero: true })}
    </section>
    <div class="col">
      <section class="card"><h2>🎟 Billetterie</h2>
        <div class="seg wide">${TICKET_LEVELS.map((t, i) => `<button data-tk="${i}" class="${lvl === i ? 'on' : ''}">${t.label}</button>`).join('')}</div>
        ${nextHome ? (() => { const p = ticketPrice(G, nextHome); const att = Math.round(attendanceFor(G, nextHome, { att: 0 })); return `<p>Prochain match à domicile (vs ${esc(getClub(G, nextHome.a).name)}) : billet moyen <b>${Math.round(p)} €</b>, affluence estimée <b>${att.toLocaleString('fr-FR')}</b> / ${c.capacity.toLocaleString('fr-FR')} → recette ~<b>${money(att * p)}</b></p>`; })() : ''}
        <p class="hint">Billets chers = plus de recette par fan, mais moins de spectateurs. L'affluence dépend aussi de la forme de l'équipe, de l'adversaire, de la compétition et de la météo.</p>
      </section>
      <section class="card"><h2>🏛 Répartition du président</h2>
        <p>Transfère du budget vers les salaires ou l'inverse (1 € de salaire hebdo = ${leagueRoundsTotal(G)} € de budget transferts).</p>
        <div class="row gap wrap"><button class="btn" data-sw="-1" ${G.board.ban ? 'disabled' : ''}>− 10 k€ salaires / + transferts</button><button class="btn" data-sw="1" ${G.board.ban ? 'disabled' : ''}>+ 10 k€ salaires / − transferts</button></div>
        <h3>Sponsor maillot</h3>${G.sponsor ? `<p><b>${esc(G.sponsor.name)}</b> (${G.sponsor.kind}) : ${wageM(G.sponsor.weekly)} · encore ${G.sponsor.seasons} saison(s)${G.sponsor.objBonus ? ` · prime objectif ${money(G.sponsor.objBonus)}` : ''}${G.sponsor.winBonus ? ` · ${money(G.sponsor.winBonus)}/victoire` : ''}</p>` : '<p class="muted">Aucun sponsor signé.</p>'}
        <h3>Économie de ${esc(L?.name || 'ton championnat')}</h3>
        <table class="tbl kv compact"><tr><td>Droits TV (total ligue)</td><td>${money(eco.tv)} / saison</td></tr><tr><td>Répartition</td><td>50 % égalitaire · 25 % notoriété · 25 % classement</td></tr><tr><td>Prix moyen du billet</td><td>${Math.round(eco.ticket)} €</td></tr><tr><td>Niveau des salaires</td><td>×${wageFactor(G, c).toFixed(2)}</td></tr></table>
        <p class="hint">Dette : intérêts de ~8 %/an. Sous -25 M€ en fin de saison : interdiction de recruter (contrôle de gestion).</p>
      </section>
      <section class="card"><h2>Plus gros salaires</h2><table class="tbl compact">${top.map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 24)}</td><td class="nm">${esc(p.name)}</td><td>${wageM(p.wage)}</td><td>${p.contract} an(s)</td></tr>`).join('')}</table></section>
    </div>
  </div>`;
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
  el.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { G.ticket = +b.dataset.tk; save(); vFinances(el); });
  el.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => {
    G.sponsor = { ...G.sponsorOffers[+b.dataset.sp] }; G.sponsorOffers = null;
    news(G, `💼 Contrat signé avec ${G.sponsor.name} : ${wageM(G.sponsor.weekly)} pendant ${G.sponsor.seasons} saison(s).`, 'board');
    save(); toast(`Sponsor : ${G.sponsor.name} !`); vFinances(el);
  });
  el.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => {
    const d = +b.dataset.sw * 10000, R = leagueRoundsTotal(G);
    if (d > 0 && G.board.transfer < d * R) return toast('Plus assez de budget transferts.', 'err');
    if (d < 0 && G.board.wageCap + d < wages) return toast('Le plafond ne peut pas descendre sous la masse salariale actuelle.', 'err');
    G.board.wageCap += d; G.board.transfer = roundMoney(G.board.transfer - d * R); save(); vFinances(el);
  });
}

// ============================================================
//  International
// ============================================================
let INTL_TAB = 'rank';
function vIntl(el) {
  const tabs = [['rank', '🌍 Sélections'], ['mine', '🎽 Mes internationaux'], ['tourn', '🏆 Tournois'], ['ballon', '🌟 Ballon d\'or']];
  el.innerHTML = `<section class="card"><div class="tabs">${tabs.map(([k, l]) => `<button data-it="${k}" class="${INTL_TAB === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <p class="hint mt">Prochains grands tournois : ${compNameOf(G, 'EURO')} en ${G.season + 1 + ((4 - (G.season + 1) % 4) % 4 || 0)} · ${compNameOf(G, 'WC')} en ${(() => { let y = G.season + 1; while (y % 4 !== 2) y++; return y; })()} (simulés à la fin de la saison). Trêves internationales en cours de saison.</p></section><div id="itBody"></div>`;
  el.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { INTL_TAB = b.dataset.it; vIntl(el); });
  const body = $('#itBody');
  const plink = id => { const p = G.pmap[id]; return p ? `<a href="#" data-pid="${id}">${esc(p.name)}</a>` : '<span class="muted">?</span>'; };
  if (INTL_TAB === 'rank') {
    const rk = nationRanking(G);
    body.innerHTML = `<section class="card"><h2>Classement des sélections</h2><table class="tbl compact"><tr><th>#</th><th>Nation</th><th>Force</th><th>Meilleurs joueurs</th><th>Dont chez toi</th></tr>
      ${rk.map((r, i) => { const sq = nationSquad(G, r.code); const mine = sq.filter(p => p.club === G.clubId); return `<tr><td>${i + 1}</td><td class="nm">${natFlag(r.code)} ${esc(natName(r.code))}</td><td>${ovrBadge(r.pow)}</td><td><small>${sq.slice(0, 3).map(p => plink(p.id)).join(', ')}</small></td><td>${mine.length ? `<b class="pos">${mine.length}</b>` : ''}</td></tr>`; }).join('')}</table></section>`;
  } else if (INTL_TAB === 'mine') {
    const mine = clubPlayers(G, G.clubId).filter(p => !p.academy).sort((a, b) => (b.caps || 0) - (a.caps || 0));
    body.innerHTML = `<section class="card"><h2>Mes internationaux</h2><table class="tbl compact"><tr><th>Joueur</th><th>Nation</th><th>Statut</th><th>Sélections</th><th>Buts</th><th>Titres</th></tr>
      ${mine.map(p => { const sel = nationSquad(G, p.nat).includes(p); return `<tr data-pid="${p.id}"><td class="nm">${esc(p.name)}</td><td>${natFlag(p.nat)} ${esc(natName(p.nat))}</td><td>${sel ? '<span class="tag grn">Sélectionné</span>' : '<span class="muted">-</span>'}</td><td>${p.caps || 0}</td><td>${p.intlGoals || 0}</td><td>${p.intlTitles ? '🏆'.repeat(p.intlTitles) : ''}</td></tr>`; }).join('')}</table>
      <p class="hint">Les sélectionnés reviennent de trêve avec un peu de fatigue (et parfois une blessure), mais le moral gonflé.</p></section>`;
  } else if (INTL_TAB === 'tourn') {
    const T = (G.intlHistory || [])[0];
    if (!T) body.innerHTML = '<section class="card"><p class="muted">Aucun tournoi disputé pour l\'instant. Ils se jouent l\'été (fin de saison).</p></section>';
    else body.innerHTML = `<section class="card"><h2>🏆 ${esc(T.name)} ${T.year} — vainqueur : ${natFlag(T.winner)} ${esc(natName(T.winner))}</h2>
      ${T.scorer ? `<p>Meilleur buteur : ${plink(T.scorer.pid)} (${T.scorer.n} buts)</p>` : ''}
      <div class="egroups">${T.groups.map(g => `<div class="card egroup"><h3>Groupe ${g.name}</h3><table class="tbl compact">${g.table.map((r, i) => `<tr class="${i < 2 ? 'z-el' : ''}"><td>${natFlag(r.code)} ${esc(natName(r.code))}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table></div>`).join('')}</div>
      <div class="bracket">${T.rounds.map(r => `<div class="bround"><h3>${r.name}</h3>${r.matches.map(m => { const w = intlWinner(m); return `<div class="btie"><div class="${w === m.a ? 'bw' : 'bl'}">${natFlag(m.a)} <span>${esc(natName(m.a))}</span><b>${m.s[0]}</b></div><div class="${w === m.b ? 'bw' : 'bl'}">${natFlag(m.b)} <span>${esc(natName(m.b))}</span><b>${m.s[1]}</b></div>${m.pens ? `<small>tab ${m.pens[0]}-${m.pens[1]}</small>` : ''}</div>`; }).join('')}</div>`).join('')}</div>
      ${(G.intlHistory || []).length > 1 ? `<h3>Palmarès</h3><p>${G.intlHistory.map(x => `${esc(x.name)} ${x.year} : <b>${esc(natName(x.winner))}</b>`).join(' · ')}</p>` : ''}</section>`;
  } else {
    body.innerHTML = `<section class="card"><h2>🌟 Ballon d'or</h2>${(G.ballon || []).map(b => `<h3>${b.season + 1}</h3><ol>${b.list.map((x, i) => `<li>${i === 0 ? '🌟 ' : ''}${plink(x.pid)} <small class="muted">${esc(x.club || '')} · ${esc(natName(x.nat))}</small></li>`).join('')}</ol>`).join('') || '<p class="muted">Décerné à la fin de chaque saison.</p>'}</section>`;
  }
  body.querySelectorAll('a[data-pid]').forEach(x => x.onclick = e => { e.preventDefault(); playerModal(+x.dataset.pid); });
  body.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}

// ============================================================
//  Centre de formation
// ============================================================
function vYouth(el) {
  const ac = G.players.filter(p => p.academy && p.club === G.clubId).sort((a, b) => youthPotEstimate(G, b) - youthPotEstimate(G, a));
  const young = clubPlayers(G, G.clubId).filter(p => !p.academy && p.age <= 21);
  el.innerHTML = `
  <div class="kpis card"><div><small>Joueurs à l'académie</small><b>${ac.length}</b></div><div><small>Formateur</small><b class="stars">${'★'.repeat(G.staff.youth)}${'☆'.repeat(5 - G.staff.youth)}</b></div><div><small>Académie</small><b class="stars">${'★'.repeat(G.fac.youth || 2)}${'☆'.repeat(5 - (G.fac.youth || 2))}</b></div>
    <div><small>Recrutement des jeunes</small><b><select id="yFocus"><option value="">Tous postes</option>${Object.keys(ROLES).map(r => `<option value="${r}" ${G.youthFocus === r ? 'selected' : ''}>${ROLES[r].label}</option>`).join('')}</select></b></div></div>
  <div class="grid2">
    <section class="card"><h2>🌱 Académie</h2>
      ${ac.length ? `<table class="tbl wrap">${ac.map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 30)}</td><td class="nm">${esc(p.name)}${p.gem ? ' 💎' : ''}<br><small class="muted">${p.pos} · ${p.age} ans · ${esc(p.pers)} · promo ${p.intake || '-'}</small></td><td>${ovrBadge(playerOvr(p))}</td><td title="Estimation du formateur">${stars(youthPotEstimate(G, p))}</td>
        <td class="row gap"><button class="btn sm primary" data-prom="${p.id}">Promouvoir</button><button class="btn sm danger" data-rel="${p.id}">Libérer</button></td></tr>`).join('')}</table>` : '<p class="muted">Académie vide. Une nouvelle promotion arrive chaque été.</p>'}
      <p class="hint">Le potentiel affiché est une estimation de ton formateur (plus il est bon, plus elle est précise). 💎 = pépite repérée. À 20 ans, un joueur non promu quitte l'académie.</p>
    </section>
    <section class="card"><h2>⭐ Jeunes de l'équipe première</h2>
      ${young.length ? `<table class="tbl compact">${young.map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 26)}</td><td class="nm">${esc(p.name)}</td><td>${p.pos}</td><td>${p.age}</td><td>${ovrBadge(playerOvr(p))}</td><td>${stars(p.pot)}</td><td>${p.stats.apps} MJ</td><td>${p.mentor ? '🧑‍🏫' : ''}${p.loan ? '🔁' : ''}</td></tr>`).join('')}</table>` : '<p class="muted">Aucun.</p>'}
      <p class="hint">Fais-les jouer, donne-leur un parrain (fiche joueur › Développement) ou prête-les pour accélérer leur progression.</p>
    </section>
  </div>`;
  $('#yFocus').onchange = e => { G.youthFocus = e.target.value || null; save(); toast('Les recruteurs jeunes ciblent ce poste.'); };
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = e => { if (e.target.closest('button')) return; playerModal(+r.dataset.pid); });
  el.querySelectorAll('[data-prom]').forEach(b => b.onclick = () => { promoteYouth(G, getPlayer(G, +b.dataset.prom)); save(); vYouth(el); });
  el.querySelectorAll('[data-rel]').forEach(b => b.onclick = () => { const p = getPlayer(G, +b.dataset.rel); p.academy = false; p.club = null; news(G, `${p.name} est libéré de l'académie.`, 'youth'); save(); vYouth(el); });
}

// ============================================================
//  Analyse
// ============================================================
let CMP = [null, null];
function vAnalysis(el) {
  const myF = [];
  for (let w = 0; w < G.week; w++) { const f = weekFixtures(G, w).find(x => (x.h === G.clubId || x.a === G.clubId) && x.res); if (f) myF.push(f); }
  const side = f => f.h === G.clubId ? 0 : 1;
  const xgF = myF.filter(f => f.xg).map(f => f.xg[side(f)]), xgA = myF.filter(f => f.xg).map(f => f.xg[1 - side(f)]);
  const gf = myF.map(f => f.res[side(f)]), ga = myF.map(f => f.res[1 - side(f)]);
  const poss = myF.filter(f => f.report).map(f => f.report.poss[side(f)]);
  const avg = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length) : 0;
  const roll = (a, n = 5) => a.map((_, i) => avg(a.slice(Math.max(0, i - n + 1), i + 1)));
  const L = clubLeague(G, G.clubId);
  const tbl = L.clubs.map(id => { let xf = 0, xa = 0, n = 0; for (const r of G.comps[L.id].fixtures) for (const f of r) if (f.res && f.xg && (f.h === id || f.a === id)) { const s = f.h === id ? 0 : 1; xf += f.xg[s]; xa += f.xg[1 - s]; n++; } const st = standings(G, L.id).find(x => x.id === id); return { id, xf, xa, n, gf: st.gf, ga: st.ga, pts: st.pts }; }).sort((a, b) => (b.xf - b.xa) - (a.xf - a.xa));
  const squad = clubPlayers(G, G.clubId).filter(p => !p.academy);
  CMP[0] ??= squad[0]?.id; CMP[1] ??= squad[1]?.id;
  const radar = () => {
    const ps = CMP.map(id => getPlayer(G, id)).filter(Boolean);
    const keys = Object.keys(ATTRS).filter(k => k !== 'gar' || ps.some(p => p.pos === 'GB'));
    const R = 90, cx = 120, cy = 110, n = keys.length;
    const pt = (i, v) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return [cx + Math.cos(a) * R * v / 20, cy + Math.sin(a) * R * v / 20]; };
    const grid = [5, 10, 15, 20].map(v => `<polygon points="${keys.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="#33404f" stroke-width="1"/>`).join('');
    const cols = ['#2fd27a', '#4aa3ff'];
    const polys = ps.map((p, j) => `<polygon points="${keys.map((k, i) => pt(i, knows(G, p) ? p.attrs[k] : clamp(p.attrs[k], 1, 20)).join(',')).join(' ')}" fill="${cols[j]}" fill-opacity=".22" stroke="${cols[j]}" stroke-width="2"/>`).join('');
    const labels = keys.map((k, i) => { const [x, y] = pt(i, 23.5); return `<text x="${x}" y="${y}" font-size="9" fill="#8a99ab" text-anchor="middle" dominant-baseline="middle">${ATTRS[k]}</text>`; }).join('');
    return `<svg viewBox="0 0 240 225" class="radar">${grid}${polys}${labels}</svg>`;
  };
  const pick2 = i => `<select data-cmp="${i}">${G.players.filter(p => p.club != null && (p.club === G.clubId || knows(G, p))).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 300).map(p => `<option value="${p.id}" ${CMP[i] === p.id ? 'selected' : ''}>${esc(p.name)} (${p.pos}, ${esc(getClub(G, p.club)?.short || '')})</option>`).join('')}</select>`;
  el.innerHTML = `
  <div class="kpis card"><div><small>Matchs</small><b>${myF.length}</b></div><div><small>Buts / match</small><b>${avg(gf).toFixed(2)}</b><em>xG ${avg(xgF).toFixed(2)}</em></div><div><small>Encaissés / match</small><b>${avg(ga).toFixed(2)}</b><em>xG contre ${avg(xgA).toFixed(2)}</em></div><div><small>Possession moyenne</small><b>${poss.length ? Math.round(avg(poss)) : '-'} %</b></div>
    <div><small>Efficacité</small><b class="${avg(gf) - avg(xgF) >= 0 ? 'pos' : 'neg'}">${(avg(gf) - avg(xgF) >= 0 ? '+' : '') + (avg(gf) - avg(xgF)).toFixed(2)}</b><em>buts − xG / match</em></div></div>
  <div class="grid2">
    <section class="card"><h2>📈 Tendance (moyenne sur 5 matchs)</h2>
      ${xgF.length > 1 ? `<svg viewBox="0 0 400 120" class="trend"><polyline fill="none" stroke="#2fd27a" stroke-width="2.5" points="${roll(xgF).map((v, i, a) => `${i / Math.max(1, a.length - 1) * 400},${115 - v / 3 * 110}`).join(' ')}"/><polyline fill="none" stroke="#ef4f5a" stroke-width="2.5" points="${roll(xgA).map((v, i, a) => `${i / Math.max(1, a.length - 1) * 400},${115 - v / 3 * 110}`).join(' ')}"/></svg>
      <p class="legend"><span><i style="background:#2fd27a"></i>xG pour</span><span><i style="background:#ef4f5a"></i>xG contre</span></p>` : '<p class="muted">Joue quelques matchs pour voir les tendances.</p>'}
      <h3>Classement xG (${esc(L.name)})</h3>
      <table class="tbl compact"><tr><th>Club</th><th>xG pour</th><th>xG contre</th><th>Diff.</th><th title="Buts marqués − xG">Réal.</th><th>Pts</th></tr>${tbl.map(r => `<tr class="${r.id === G.clubId ? 'me' : ''}"><td class="nm">${crest(getClub(G, r.id), 16)} ${esc(getClub(G, r.id).short)}</td><td>${r.xf.toFixed(1)}</td><td>${r.xa.toFixed(1)}</td><td class="${r.xf - r.xa >= 0 ? 'pos' : 'neg'}">${(r.xf - r.xa).toFixed(1)}</td><td>${(r.gf - r.xf >= 0 ? '+' : '') + (r.gf - r.xf).toFixed(1)}</td><td>${r.pts}</td></tr>`).join('')}</table>
      <p class="hint">Un club qui marque bien plus que ses xG surperforme (chance ou finisseurs d'élite) : attention au retour sur terre.</p>
    </section>
    <section class="card"><h2>🆚 Comparer deux joueurs</h2>
      <div class="row gap wrap">${pick2(0)}${pick2(1)}</div>
      ${radar()}
      <table class="tbl compact">${(() => { const [a, b] = CMP.map(id => getPlayer(G, id)); if (!a || !b) return ''; const r = (l, x, y) => `<tr><td>${l}</td><td class="pos">${x}</td><td style="color:#4aa3ff">${y}</td></tr>`; const s = p => p.stats; return r('Note', knows(G, a) ? playerOvr(a) : '~' + estOvr(G, a), knows(G, b) ? playerOvr(b) : '~' + estOvr(G, b)) + r('Âge', a.age, b.age) + r('Valeur', money(a.value), money(b.value)) + r('Matchs', s(a).apps, s(b).apps) + r('Buts / xG', `${s(a).goals} / ${(s(a).xg || 0).toFixed(1)}`, `${s(b).goals} / ${(s(b).xg || 0).toFixed(1)}`) + r('Passes réussies', s(a).pas ? Math.round(s(a).pasOk / s(a).pas * 100) + ' %' : '-', s(b).pas ? Math.round(s(b).pasOk / s(b).pas * 100) + ' %' : '-') + r('Note moyenne', s(a).apps ? (s(a).rating / s(a).apps).toFixed(2) : '-', s(b).apps ? (s(b).rating / s(b).apps).toFixed(2) : '-'); })()}</table>
      <p class="hint">Seuls tes joueurs et les joueurs connus de ton recruteur sont comparables.</p>
    </section>
  </div>`;
  el.querySelectorAll('[data-cmp]').forEach(s => s.onchange = () => { CMP[+s.dataset.cmp] = +s.value; vAnalysis(el); });
}

// ============================================================
//  Vestiaire (dynamique de groupe)
// ============================================================
function vDressing(el) {
  assignStatuses(G, G.clubId);
  const h = hierarchy(G), groups = socialGroups(G), atm = atmosphere(G);
  const sq = clubPlayers(G, G.clubId);
  const unhappy = sq.map(p => ({ p, r: unhappyReasons(G, p) })).filter(x => x.r.length || x.p.morale < 40).sort((a, b) => a.p.morale - b.p.morale);
  const bonds = topBonds(G, 10);
  const card = p => `<div class="mini" data-pid="${p.id}">${avatar(p, 30)}<div><b>${esc(p.name)}</b><small>${esc(STATUS[p.status || 'rot'].label)} · ${esc(p.pers)}</small></div>${meter(p.morale, 'Moral')}</div>`;
  el.innerHTML = `
  <div class="kpis card"><div><small>Ambiance du vestiaire</small><b>${Math.round(atm)}/100</b><em>${meter(atm)}</em></div><div><small>Cohésion</small><b>${Math.round(myClub(G).coh ?? 60)}</b></div>
    <div><small>Joueurs mécontents</small><b class="${unhappy.length > 3 ? 'neg' : ''}">${unhappy.length}</b></div><div><small>Familiarité tactique (${esc(G.tactics.formation)})</small><b>${Math.round(tacFam(G, G.tactics.formation))}</b></div></div>
  <div class="grid2">
    <section class="card"><h2>👑 Hiérarchie</h2>
      <h3>Leaders</h3><div class="minis">${h.leaders.map(card).join('')}</div>
      <h3>Joueurs influents</h3><div class="minis">${h.influent.map(card).join('')}</div>
      <p class="hint">Les leaders donnent le ton : leur moral se propage au groupe. Un leader mécontent peut faire basculer le vestiaire.</p>
      <h3>🤝 Automatismes</h3>
      ${bonds.length ? `<table class="tbl compact">${bonds.map(b => `<tr><td class="nm">${esc(getPlayer(G, b.a).name)}</td><td>+</td><td class="nm">${esc(getPlayer(G, b.b).name)}</td><td>${meter(b.v, 'Entente')}</td></tr>`).join('')}</table>` : '<p class="muted">Les automatismes naissent en jouant ensemble.</p>'}
      <p class="hint">Les joueurs qui jouent souvent ensemble (ou parlent la même langue) se trouvent mieux : passes plus réussies dans le moteur de match.</p>
    </section>
    <div class="col">
      <section class="card"><h2>👥 Clans</h2>${groups.map(g => `<div class="clan"><div class="row gap"><b class="grow">${esc(g.name)}</b><small>${g.members.length} joueurs</small>${meter(g.mood, 'Moral du clan')}</div><small class="muted">${g.members.map(p => esc(p.name.split(' ').slice(-1)[0])).join(', ')}</small></div>`).join('') || '<p class="muted">Pas de clan marqué.</p>'}</section>
      <section class="card"><h2>😟 Joueurs à gérer</h2>
        ${unhappy.length ? `<table class="tbl wrap">${unhappy.slice(0, 10).map(({ p, r }) => `<tr data-pid="${p.id}"><td>${avatar(p, 28)}</td><td class="nm">${esc(p.name)}<br><small class="muted">${esc(STATUS[p.status || 'rot'].label)}</small></td><td>${meter(p.morale)}</td><td><small>${r.map(esc).join('<br>') || 'Moral en berne'}</small></td><td>${p.conflict ? `<button class="btn sm" data-resolve="${p.id}">Réunir</button>` : ''}</td></tr>`).join('')}</table>` : '<p class="muted">Tout le monde est content. 👍</p>'}
      </section>
      <section class="card"><h2>⏱ Statuts et temps de jeu</h2>
        <table class="tbl compact">${sq.filter(p => !p.loan || p.loan.inLoan).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)).map(p => { const sh = playShare(p), ex = expectedShare(p); return `<tr data-pid="${p.id}"><td class="nm">${esc(p.name)}</td><td><small>${esc(STATUS[p.status || 'rot'].label)}</small></td><td>${sh == null ? '<span class="muted">-</span>' : `<span class="${sh < ex - .25 ? 'neg' : sh >= ex ? 'pos' : ''}">${Math.round(sh * 100)} %</span>`}<small class="muted"> / ${Math.round(ex * 100)} %</small></td><td>${meter(p.trust ?? 55, 'Confiance')}</td></tr>`; }).join('')}</table>
        <p class="hint">Change le statut d'un joueur depuis sa fiche. Rétrograder fâche, promouvoir motive… mais il faudra tenir parole.</p>
      </section>
    </div>
  </div>`;
  el.querySelectorAll('[data-pid]').forEach(r => r.onclick = e => { if (e.target.closest('[data-resolve]')) return; playerModal(+r.dataset.pid); });
  el.querySelectorAll('[data-resolve]').forEach(b => b.onclick = () => { const p = getPlayer(G, +b.dataset.resolve); const m = resolveConflict(G, p); toast(m, m.includes('Réconciliation') ? '' : 'err'); save(); vDressing(el); });
}

// ============================================================
//  Infirmerie
// ============================================================
function vMedical(el) {
  const squad = clubPlayers(G, G.clubId);
  const inj = squad.filter(p => p.injury > 0).sort((a, b) => b.injury - a.injury);
  const physio = G.staff.physio, med = G.fac.medical || 2;
  const risk = squad.filter(p => p.injury <= 0 && (p.returnRisk > 0 || p.fit < 65 || (physio >= 3 && p.frag >= 13))).sort((a, b) => injuryRiskMult(G, b) - injuryRiskMult(G, a));
  const log = (G.medLog || []).filter(x => x.season === G.season);
  const lost = log.reduce((s, x) => s + x.days, 0);
  const R = leagueRoundsTotal(G);
  const ret = p => { const w = Math.ceil(p.injury / 7); const target = G.week + w; return target >= G.schedule.length ? '<span class="neg">Saison terminée</span>' : fmtDate(dateOfWeek(G, Math.min(target, G.schedule.length - 1))); };
  el.innerHTML = `
  <div class="kpis card"><div><small>Blessés</small><b>${inj.length}</b></div><div><small>Blessures cette saison</small><b>${log.length}</b></div><div><small>Jours perdus</small><b>${lost}</b></div><div><small>Kiné</small><b class="stars">${'★'.repeat(physio)}${'☆'.repeat(5 - physio)}</b></div><div><small>Centre médical</small><b class="stars">${'★'.repeat(med)}${'☆'.repeat(5 - med)}</b></div></div>
  <div class="grid2">
    <section class="card"><h2>🏥 Infirmerie</h2>
      ${inj.length ? `<table class="tbl wrap">${inj.map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 30)}</td><td class="nm">${esc(p.name)}<br><small class="muted">${p.pos}</small></td>
        <td><b>${esc(p.inj?.name || 'Blessure')}</b>${p.inj?.recur ? ' <span class="tag red">rechute</span>' : ''}<br><small class="muted">${esc(p.inj?.part || '')} · durée totale ${fmtDays(p.inj?.total || p.injury)}</small></td>
        <td>${bar(100 - p.injury / (p.inj?.total || p.injury) * 100, 100)}<br><small>reste ${fmtDays(p.injury)}</small></td><td>${ret(p)}</td>
        <td>${canRushBack(p) ? `<button class="btn sm" data-rush="${p.id}" title="Infiltration : il peut jouer tout de suite, mais le risque de rechute est élevé">💉 Reprise anticipée</button>` : ''}</td></tr>`).join('')}</table>` : '<p class="muted">Aucun blessé. 👍</p>'}
      <h3>Joueurs à surveiller</h3>
      ${risk.length ? `<table class="tbl compact">${risk.slice(0, 10).map(p => `<tr data-pid="${p.id}"><td class="nm">${esc(p.name)}</td><td>${p.returnRisk > 0 ? `<span class="tag yel">${p.rushed ? 'reprise forcée' : 'convalescence'}</span>` : ''}${p.fit < 65 ? '<span class="tag red">fatigué</span>' : ''}${physio >= 3 && p.frag >= 13 ? '<span class="tag">fragile</span>' : ''}</td><td>${bar(p.fit, 100, p.fit < 65 ? 'low' : '')}</td><td>risque ×${injuryRiskMult(G, p).toFixed(1)}</td></tr>`).join('')}</table>` : '<p class="muted">Rien à signaler.</p>'}
      <p class="hint">Le risque augmente avec la fatigue, l'âge, la fragilité du joueur, un retour de blessure récent, l'entraînement intensif, le pressing adverse et la météo (froid, pluie). Un meilleur kiné (niveau 3+) détecte les joueurs fragiles.</p>
    </section>
    <section class="card"><h2>📋 Historique de la saison</h2>
      <table class="tbl compact">${log.slice().reverse().slice(0, 30).map(x => { const p = getPlayer(G, x.pid); return `<tr ${p ? `data-pid="${p.id}"` : ''}><td>${esc(weekLabel(G, x.week))}</td><td class="nm">${esc(p?.name || '?')}</td><td>${esc(x.name)}</td><td>${fmtDays(x.days)}</td></tr>`; }).join('') || '<tr><td class="muted">Aucune blessure pour l\'instant.</td></tr>'}</table>
      <p class="hint">Améliore le kiné (Staff) et le centre médical (Staff › Infrastructures) pour réduire la durée et le nombre de blessures.</p>
    </section>
  </div>`;
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = e => { if (e.target.closest('[data-rush]')) return; playerModal(+r.dataset.pid); });
  el.querySelectorAll('[data-rush]').forEach(b => b.onclick = () => { const p = getPlayer(G, +b.dataset.rush); confirmBox(`Faire reprendre ${esc(p.name)} avec une infiltration ? Il sera disponible, mais avec un risque de rechute triplé pendant 5 semaines.`, () => { rushBack(G, p); save(); vMedical(el); }, 'Reprise anticipée', true); });
}

// ============================================================
//  Club
// ============================================================
function vClub(el) {
  const c = myClub(G);
  const conf = G.board.conf;
  const mood = conf >= 70 ? 'Le président est ravi de ton travail.' : conf >= 45 ? 'Le président est satisfait.' : conf >= 25 ? 'Le président commence à douter.' : 'Ta place est clairement menacée !';
  el.innerHTML = `<div class="grid2">
    <section class="card"><div class="row gap">${crest(c, 84)}<div><h2>${esc(c.name)}</h2><p>${esc(c.stadium)} · ${c.capacity.toLocaleString('fr-FR')} places</p><p>Réputation ${stars(c.rep)} · ${esc(clubLeague(G, c.id).name)}</p></div></div>
      <h3>Président</h3>
      <p>Objectif : <b>${esc(objectiveLabel(G))}</b></p>
      <div class="row gap">${meter(conf)} <b>${Math.round(conf)}/100</b></div>
      <p class="${conf < 25 ? 'neg' : ''}">${mood}</p>
      <h3>Armoire à trophées</h3>
      <div class="trophies">${(c.trophies || []).map(t => `<div class="trophy">🏆<b>${esc(t.name)}</b><small>${t.season}/${t.season + 1}</small></div>`).join('') || '<p class="muted">Vide pour l\'instant… à toi de la remplir !</p>'}</div>
      <h3>Demandes au président</h3>
      <div class="row gap wrap"><button class="btn" data-req="transfer">💰 Plus de budget transferts</button><button class="btn" data-req="wage">📈 Relever le plafond salarial</button><button class="btn" data-req="facility">🏗 Financer les installations</button></div>
      <p class="hint">Le président accepte plus facilement quand il a confiance. Une demande toutes les 6 semaines au maximum.</p>
      <h3>Supporters</h3><div class="row gap">${meter(G.fans ?? 60)} <b>${Math.round(G.fans ?? 60)}/100</b></div>
      <p class="hint">L'humeur des supporters dépend des résultats et de tes déclarations ; elle influe sur l'affluence.</p>
      <p class="hint mt">Logo, couleurs, nom, stade : menu ✏ Éditeur.</p>
    </section>
    <div class="col">
    <section class="card"><h2>🧑‍💼 ${esc(G.managerName)}</h2>
      <div class="kpis"><div><small>Réputation</small><b>${Math.round(G.mgr.rep)}</b><em>${meter(G.mgr.rep)}</em></div><div><small>Matchs</small><b>${G.mgr.matches}</b><em>${G.mgr.w} V · ${G.mgr.d} N · ${G.mgr.l} D</em></div><div><small>% victoires</small><b>${G.mgr.matches ? Math.round(G.mgr.w / G.mgr.matches * 100) : 0} %</b></div></div>
      <h3>🏅 Succès (${Object.keys(G.ach || {}).length}/${Object.keys(ACHIEVEMENTS).length})</h3>
      <div class="achs">${Object.entries(ACHIEVEMENTS).map(([k, l]) => `<span class="ach ${G.ach?.[k] ? 'on' : ''}" title="${G.ach?.[k] ? 'Obtenu en ' + G.ach[k].season : 'À débloquer'}">${G.ach?.[k] ? '🏅' : '🔒'} ${esc(l)}</span>`).join('')}</div>
      <h3>🪑 Postes vacants</h3>
      ${(G.vacancies || []).length ? `<table class="tbl compact">${G.vacancies.map(v => { const vc = getClub(G, v.club); return `<tr><td>${crest(vc, 22)} <b>${esc(vc.name)}</b></td><td>${esc(clubLeague(G, vc.id)?.name || '')}</td><td>${stars(vc.rep)}</td><td><button class="btn sm" data-apply="${vc.id}">Postuler</button></td></tr>`; }).join('')}</table>` : '<p class="muted">Aucun poste vacant pour l\'instant.</p>'}
      <p class="hint">Ta réputation augmente avec les résultats et les succès : elle attire les joueurs et ouvre les portes des grands clubs.</p>
    </section>
    <section class="card"><h2>📜 Ma carrière</h2>
      <table class="tbl compact"><tr><th>Saison</th><th>Club</th><th>Championnat</th><th>Rang</th><th>Coupe</th><th>Objectif</th></tr>
      ${G.history.slice().reverse().map(h => `<tr><td>${h.season}/${String(h.season + 1).slice(2)}</td><td>${esc(h.club || '')}</td><td>${esc(h.comp)}</td><td>${h.rank}<sup>e</sup> (${h.pts} pts)</td><td>${esc(h.cup)}</td><td>${h.met ? '✅' : '❌'} ${esc(h.objLabel || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Première saison en cours.</td></tr>'}</table>
    </section></div></div>`;
  el.querySelectorAll('[data-req]').forEach(b => b.onclick = () => { const r = boardRequest(G, b.dataset.req); save(); toast(r.msg, r.ok ? '' : 'err'); vClub(el); });
  el.querySelectorAll('[data-apply]').forEach(b => b.onclick = () => {
    const vc = getClub(G, +b.dataset.apply);
    confirmBox(`Postuler à ${esc(vc.name)} ? Si tu es retenu, tu quittes ${esc(c.name)} immédiatement.`, () => {
      if (applyForJob(G, vc.id)) { takeJob(G, vc.id); save(); enterGame(); toast(`Tu es le nouvel entraîneur de ${vc.name} !`); }
      else { save(); toast(`${vc.name} a choisi un autre candidat.`, 'err'); vClub(el); }
    }, 'Postuler');
  });
}

function ovrCell(p) { return knows(G, p) ? ovrBadge(playerOvr(p)) : `<span class="ovr o2 fogo" title="Note estimée — supervise le joueur pour la connaître">~${estOvr(G, p)}</span>`; }
function potCell(p) { return knows(G, p) ? stars(p.pot) : '<span class="muted" title="Potentiel inconnu">?</span>'; }
function scoutPlayer(pid) {
  if (G.scouting.length >= 6) return toast('Ton recruteur suit déjà 6 joueurs. Attends ses rapports.', 'err');
  G.scouting.push({ pid, left: Math.max(1, 4 - Math.floor(G.staff.scout / 2)) });
  save(); toast('Recruteur envoyé. Rapport dans quelques semaines.'); playerModal(pid);
}
function loanModal(pid) {
  const p = getPlayer(G, pid);
  if (!windowOpen(G)) return toast('Les prêts se font pendant le mercato.', 'err');
  const o = playerOvr(p);
  const clubs = G.clubs.filter(c => c.id !== G.clubId && !c.foreign).map(c => {
    const better = clubPlayers(G, c.id).filter(x => x.pos === p.pos && playerOvr(x) > o).length;
    return { c, better };
  }).filter(x => x.better <= 1 && clubPlayers(G, x.c.id).length < 30).sort((a, b) => b.c.rep - a.c.rep).slice(0, 8);
  modal(`<h2>Prêter ${esc(p.name)}</h2><p>Un prêt d'une saison permet à un jeune de jouer et de progresser plus vite. Le club prêteur paie son salaire.</p>
    ${clubs.length ? clubs.map(({ c, better }) => `<div class="row gap offer-row">${crest(c, 28)}<b class="grow">${esc(c.name)}</b><small>${esc(clubLeague(G, c.id).name)} · ${better ? 'remplaçant probable' : 'titulaire probable'}</small><button class="btn sm primary" data-loan="${c.id}">Prêter</button></div>`).join('') : '<p class="muted">Aucun club intéressé pour l\'instant.</p>'}`);
  $$('[data-loan]').forEach(b => b.onclick = () => {
    const c = getClub(G, +b.dataset.loan);
    p.loan = { from: G.clubId }; p.club = c.id; p.num = null; p.listed = false;
    assignNumbers(clubPlayers(G, c.id)); removeFromTactics(p.id);
    news(G, `${p.name} est prêté à ${c.name} jusqu'à la fin de la saison.`, 'transfer');
    save(); closeModal(); toast(`${p.name} prêté à ${c.name}.`); refresh();
  });
}

// ============================================================
//  Staff & infrastructures
// ============================================================
function vStaff(el) {
  const st = G.staff, fac = G.fac, c = myClub(G);
  const total = staffCost(G);
  const lvl = l => '★'.repeat(l) + '☆'.repeat(5 - l);
  el.innerHTML = `<div class="grid2">
    <section class="card"><h2>🧑‍💼 Staff technique</h2>
      <table class="tbl wrap">${Object.entries(STAFF).map(([k, s]) => `<tr><td><b>${s.label}</b><br><small class="muted">${esc(G.staffNames?.[k] || '')} — ${esc(s.tip)}</small></td>
        <td class="stars">${lvl(st[k])}</td><td>${wageM(staffWage(st[k], G))}</td>
        <td class="row gap"><button class="btn sm" data-dn="${k}" ${st[k] <= 1 ? 'disabled' : ''} title="Remplacer par moins cher">−</button><button class="btn sm primary" data-up="${k}" ${st[k] >= 5 ? 'disabled' : ''} title="Recruter un meilleur profil">+</button></td></tr>`).join('')}</table>
      <p>Masse salariale du staff : <b>${money(total)}</b>/sem.</p>
      <p class="hint">Recruter un meilleur membre coûte une prime de signature (8 semaines de son nouveau salaire).</p>
    </section>
    <section class="card"><h2>🏗 Infrastructures</h2>
      ${fac.build ? `<div class="alert">Chantier en cours : ${esc(FACILITIES[fac.build.type].label)} — fin dans ${Math.max(0, fac.build.done - leagueRoundAt(G) - 1)} semaine(s).</div>` : ''}
      <table class="tbl wrap">${Object.entries(FACILITIES).map(([k, f]) => {
        const cur = k === 'stadium' ? `${c.capacity.toLocaleString('fr-FR')} places` : lvl(fac[k] || 2);
        const l = fac[k] || 2, cost = f.cost(l), canMax = k === 'stadium' ? c.capacity < 100000 : l < f.max;
        return `<tr><td><b>${f.label}</b><br><small class="muted">${esc(f.tip)}</small></td><td>${k === 'stadium' ? cur : `<span class="stars">${cur}</span>`}</td>
          <td>${canMax ? money(cost) : 'Max'}</td><td>${canMax ? `<button class="btn sm primary" data-build="${k}" ${fac.build ? 'disabled' : ''}>Construire</button>` : ''}</td></tr>`;
      }).join('')}</table>
      <p class="hint">Les travaux durent 8 semaines. Un seul chantier à la fois. Budget : <b>${money(c.budget)}</b>.</p>
    </section></div>`;
  el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
    const k = b.dataset.up, nl = st[k] + 1, fee = staffWage(nl, G) * 8;
    confirmBox(`Recruter un ${STAFF[k].label.toLowerCase()} de niveau ${nl} ? Prime : <b>${money(fee)}</b>, salaire ${wageM(staffWage(nl, G))}`, () => {
      if (c.budget < fee) return toast('Budget insuffisant.', 'err');
      flow(G, c, -fee, 'staff'); st[k] = nl; G.staffNames[k] = pick(STAFF_NAMES.filter(n => !Object.values(G.staffNames).includes(n)));
      news(G, `${G.staffNames[k]} rejoint le staff (${STAFF[k].label}, niveau ${nl}).`, 'board'); save(); vStaff(el);
    }, 'Recruter');
  });
  el.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { const k = b.dataset.dn; st[k]--; G.staffNames[k] = pick(STAFF_NAMES.filter(n => !Object.values(G.staffNames).includes(n))); save(); vStaff(el); toast('Staff remplacé par un profil moins cher.'); });
  el.querySelectorAll('[data-build]').forEach(b => b.onclick = () => {
    const k = b.dataset.build, f = FACILITIES[k], cost = f.cost(fac[k] || 2);
    confirmBox(`Lancer les travaux : ${esc(f.label)} pour <b>${money(cost)}</b> ?`, () => {
      if (c.budget < cost) return toast('Budget insuffisant.', 'err');
      flow(G, c, -cost, 'build'); fac.build = { type: k, done: leagueRoundAt(G) + 8 };
      G.board.conf = clamp(G.board.conf + 2, 0, 100);
      news(G, `🏗 Début des travaux : ${f.label}.`, 'board'); save(); vStaff(el); renderTop();
    }, 'Construire');
  });
}

function vEuro(body, C) {
  const t = euroTable(C), me = G.clubId;
  const ES = G.comps.ESUP;
  const tie = tt => {
    const w = tieWinner(tt);
    const line = id => `<div class="${w === id ? 'bw' : w ? 'bl' : ''} ${id === me ? 'me' : ''}">${crest(getClub(G, id), 16)} <span>${esc(getClub(G, id).short)}</span><b>${tt.f1.res ? [tt.f1, tt.f2].filter(f => f && f.res).reduce((s, f) => s + f.res[id === f.h ? 0 : 1], 0) : ''}</b></div>`;
    const last = tt.f2 || tt.f1;
    return `<div class="btie" ${tt.f1.res ? `data-fx="${fxKey(last.res ? last : tt.f1)}"` : ''}>${line(tt.b)}${line(tt.a)}${last.pens ? `<small>tab ${last.pens[0]}-${last.pens[1]}</small>` : tt.f2 ? '<small>aller-retour</small>' : ''}</div>`;
  };
  body.innerHTML = `<section class="card"><h2>⭐ ${esc(C.name)} ${C.winner ? `— vainqueur : ${crest(getClub(G, C.winner), 24)} ${esc(getClub(G, C.winner).name)}` : ''}</h2>
    <p class="hint">36 clubs, phase de ligue en 8 matchs. 1er-8e : qualifiés pour les 8es · 9e-24e : barrages · 25e-36e : éliminés. Matchs à élimination aller-retour, finale sur terrain neutre.${ES && C.id === 'C1' && ES.winner ? ` · ${esc(ES.name)} : ${esc(getClub(G, ES.winner).name)}` : ''}</p>
    <div class="grid2 wide-left"><div class="scroll"><table class="tbl standings compact"><thead><tr><th>#</th><th>Club</th><th>Pays</th><th>J</th><th>Diff</th><th>Pts</th></tr></thead>
      <tbody>${t.map((r, i) => { const c = getClub(G, r.id); return `<tr class="${i < 8 ? 'z-cl' : i < 24 ? 'z-el' : 'z-rel'} ${r.id === me ? 'me' : ''}" data-c="${c.id}"><td>${i + 1}</td><td class="nm">${crest(c, 16)} ${esc(c.name)}</td><td><small>${c.foreign ? esc(c.country) : 'FRA'}</small></td><td>${r.p}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`; }).join('')}</tbody></table></div>
    <div><h3>Phase finale</h3><div class="bracket vert">${KO_NAMES.map((n, i) => { const s = C.ko[i]; return `<div class="bround"><h3>${n}</h3>${s ? s.ties.map(tie).join('') : '<p class="muted">À venir</p>'}</div>`; }).join('')}</div></div></div>
  </section>`;
  body.querySelectorAll('tr[data-c]').forEach(r => r.onclick = () => viewClub(+r.dataset.c));
  body.querySelectorAll('[data-fx]').forEach(r => r.onclick = () => matchReport(r.dataset.fx));
}

// ============================================================
//  Options
// ============================================================
function vOptions(el) {
  el.innerHTML = `<section class="card"><h2>⚙ Options</h2>
    <div class="row gap wrap">
      <button class="btn" id="o1">💾 Sauvegarder</button>
      <button class="btn" id="o2">⬇ Exporter la sauvegarde</button>
      <button class="btn" id="o5">⬇ Exporter le monde actuel comme base</button>
      <button class="btn" id="o3">🏠 Menu principal</button>
      <button class="btn danger" id="o4">🗑 Supprimer la partie</button>
    </div>
    <h3>Match</h3>
    <div class="row gap wrap">
      <label>Vitesse par défaut <select id="sp"><option value="400">Lente</option><option value="120">Normale</option><option value="35">Rapide</option></select></label>
      <label class="chk"><input type="checkbox" id="s2d" ${SETTINGS.show2d ? 'checked' : ''}> Afficher la vue 2D</label>
      <label class="chk"><input type="checkbox" id="snd" ${SETTINGS.sound !== false ? 'checked' : ''}> Ambiance sonore</label>
    </div>
    <h3>🏖 Vacances</h3>
    <div class="row gap wrap"><label>Simuler <select id="hol">${[1, 2, 4, 8, 99].map(n => `<option value="${n}">${n === 99 ? 'jusqu\'à la fin de saison' : n + ' semaine(s)'}</option>`).join('')}</select></label>
      <button class="btn" id="holGo">Partir en vacances</button></div>
    <p class="hint">Ton adjoint dirige l'équipe (composition auto) pendant ton absence. Le mercato et les offres restent en attente.</p>
    ${G.real ? `<h3>🌍 Monde réel — ${esc(G.real.countryLabel)} ${esc(G.real.season)}</h3>
    <p class="hint">${esc(G.real.notice)} Conversion des attributs : ${esc(G.real.conversion)}. Import de la base : ${esc(G.real.imported || '?')}.</p>
    <div class="row gap wrap"><span class="muted">Montées, descentes, barrages et play-offs : ${typeof reglesActives === 'function' && reglesActives(G) ? 'règlement officiel appliqué' : 'désactivés'} (</span><a href="#" onclick="show('regles');return false">Compétitions → Règlement</a><span class="muted">)</span>
      <button class="btn" id="rInc">Effectifs incomplets (${G.real.incomplete.length})</button>
      ${MONDE.ok ? '<button class="btn" id="rBase">🔎 Base mondiale</button><button class="btn" id="rRes">🖼 Ressources</button>' : ''}</div>` : ''}
    <h3>Affichage</h3>
    <div class="row gap wrap"><label class="chk"><input type="checkbox" id="sEd" ${SETTINGS.editorMode ? 'checked' : ''}> Mode éditeur : afficher les potentiels source exacts dans la base</label></div>
    <h3>Raccourcis</h3>
    <p class="hint">Espace / Entrée : continuer · 1 à 9 : menus · / : recherche · Échap : fermer · Espace en match : pause.</p>
    <p class="hint">La partie est sauvegardée automatiquement dans le navigateur (IndexedDB) après chaque action importante.</p>
  </section>`;
  $('#sp').value = String(SETTINGS.speed);
  $('#sp').onchange = e => { SETTINGS.speed = +e.target.value; saveSettings(); };
  $('#s2d').onchange = e => { SETTINGS.show2d = e.target.checked; saveSettings(); };
  $('#snd').onchange = e => { SETTINGS.sound = e.target.checked; Sound.on = e.target.checked; saveSettings(); };
  $('#holGo').onclick = () => holiday(+$('#hol').value);
  $('#sEd').onchange = e => { SETTINGS.editorMode = e.target.checked; saveSettings(); };
  $('#rPromo')?.addEventListener('change', e => { G.real.promoValidated = e.target.checked; save(); toast(e.target.checked ? 'Montées/descentes activées pour ce scénario (choix de l’utilisateur).' : 'Montées/descentes désactivées.'); });
  $('#rBase')?.addEventListener('click', () => baseScreen());
  $('#rRes')?.addEventListener('click', () => ressourcesModal());
  $('#rInc')?.addEventListener('click', () => modal(`<h2>Effectifs incomplets</h2><p class="hint">Clubs comptant moins de 18 joueurs notés dans le snapshot. Le jeu les a complétés par des joueurs fictifs (marqués F). Pour valider un effectif : recrute ou édite les joueurs, ou complète la base source.</p><table class="tbl"><thead><tr><th>Club</th><th>Compétition</th><th>Joueurs notés</th><th>Autres fiches (non jouables)</th><th>Fictifs ajoutés</th></tr></thead><tbody>${G.real.incomplete.map(x => { const c = G.clubs.find(c => c.srcId === x.srcId); return `<tr><td>${esc(x.club)}</td><td>${esc(x.competition)}</td><td>${x.joueurs_notes}</td><td>${x.autres_fiches}</td><td>${c ? G.real.fill[c.id] || 0 : '?'}</td></tr>`; }).join('')}</tbody></table>`, 'wide'));
  $('#o1').onclick = async () => { await save(); toast('Partie sauvegardée.'); };
  $('#o2').onclick = () => { G.rngState = RNGS.s; const { pmap, ...rest } = G; download(`manager-foot-${G.season}-${weekLabel(G).replace(/\s+/g, '-')}.json`, rest); };
  $('#o5').onclick = () => exportDatabase(G);
  $('#o3').onclick = async () => { await save(); startScreen(); };
  $('#o4').onclick = () => confirmBox('Supprimer définitivement cette partie (les autres parties sont conservées) ?', async () => { await slotDelete(G.slot); G = null; startScreen(); }, 'Supprimer', true);
}

// ---------- Démarrage ----------
(async function init() {
  // attendre que tous les scripts (modules de gestion) soient chargés avant d'afficher l'accueil
  if (document.readyState !== 'complete') await new Promise(r => addEventListener('load', r, { once: true }));
  await Store.open();
  DB = await Store.get(DB_KEY);
  if (!DB || !DB.clubs) DB = buildDefaultDatabase();
  normalizeWorld(DB);
  Sound.on = SETTINGS.sound !== false;
  startScreen();
})();
