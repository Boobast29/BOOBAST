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
  try { const { pmap, ...rest } = G; await Store.set(SAVE_KEY, rest); }
  catch (e) { toast('Sauvegarde impossible : ' + (e?.message || e), 'err'); }
}
async function saveDB() { try { await Store.set(DB_KEY, DB); } catch (e) { toast('Base non sauvegardée : ' + (e?.message || e), 'err'); } }
function loadGame(g) { reindex(g); NEXT_PID = Math.max(...g.players.map(p => p.id)) + 1; G = g; }

// ============================================================
//  Écran d'accueil
// ============================================================
let START_DIV = 1;
async function startScreen() {
  LIVE?.pitch?.stop(); LIVE = null; G = null;
  const existing = await Store.get(SAVE_KEY);
  if (existing && existing.version !== 2) { await Store.del(SAVE_KEY); }
  const ex = existing?.version === 2 ? existing : null;
  document.body.className = 'start';
  const divs = [...new Set(DB.clubs.map(c => c.div || 1))].sort();
  const exClub = ex ? ex.clubs.find(c => c.id === ex.clubId) : null;
  $('#app').innerHTML = `
  <div class="start-wrap">
    <div class="hero">
      <div class="logo-big">⚽ <b>Manager</b> Foot</div>
      <p class="sub">Deux divisions, une coupe, un mercato vivant, des matchs en direct en 2D. À toi d'écrire l'histoire.</p>
    </div>
    ${ex ? `<div class="card cont">
      ${crest(exClub, 52)}
      <div><b>${esc(exClub.name)}</b><br><small>${esc(ex.managerName)} · Saison ${ex.season}/${ex.season + 1} · ${weekLabel(ex)}</small></div>
      <button class="btn primary big" id="btnCont">▶ Continuer la partie</button>
    </div>` : ''}
    <div class="card">
      <div class="row gap wrap">
        <h2 class="grow">Nouvelle partie</h2>
        <button class="btn" id="btnEdit">✏ Éditer la base</button>
        <button class="btn" id="btnImp">📂 Importer (JSON)</button>
        <button class="btn" id="btnExp">⬇ Exporter (JSON)</button>
        <button class="btn" id="btnReset" title="Revenir à la base fictive d'origine">↺ Base d'origine</button>
      </div>
      <div class="row gap wrap mt">
        <label>Nom de l'entraîneur <input id="mgr" value="${esc(ex?.managerName || localStorage.getItem('mf-mgr') || '')}" placeholder="Ton nom" maxlength="30"></label>
        <div class="grow"></div>
        <div class="tabs">${divs.map((d, i) => `<button class="${d === START_DIV ? 'on' : ''}" data-div="${d}">${esc((DB.leagueNames || [])[i] || 'Division ' + d)}</button>`).join('')}</div>
      </div>
      <p class="hint">${DB.clubs.length} clubs · ${DB.players.length} joueurs. Clique sur un club pour commencer. Tu peux tout renommer et ajouter tes logos/photos avec l'éditeur.</p>
      <div class="club-grid">
        ${DB.clubs.filter(c => (c.div || 1) === START_DIV).sort((a, b) => b.rep - a.rep).map(c => {
          const sq = DB.players.filter(p => p.club === c.id);
          const top = sq.map(playerOvr).sort((a, b) => b - a).slice(0, 11);
          const avg = top.reduce((s, v) => s + v, 0) / (top.length || 1);
          return `<button class="club-pick" data-id="${c.id}" style="--c1:${c.colors[0]};--c2:${c.colors[1]}">
            ${crest(c, 46)}<div><b>${esc(c.name)}</b><small>${stars(avg)} · ${money(c.budget)}</small></div></button>`;
        }).join('')}
      </div>
    </div>
    <div class="card row gap wrap">
      <h2 class="grow">Sauvegardes</h2>
      <button class="btn" id="btnLoadFile">📂 Charger un fichier de sauvegarde</button>
    </div>
  </div>`;
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
    loadGame(g); save(); enterGame();
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
    if (ex) confirmBox('Une partie est déjà en cours. La remplacer par une nouvelle ?', go, 'Nouvelle partie', true); else go();
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
    p.pot = pp.pot ? clamp(pp.pot, playerOvr(p), 99) : Math.max(p.pot, playerOvr(p));
    if (pp.contract) p.contract = pp.contract;
    if (pp.pers && PERSONALITIES[pp.pers]) p.pers = pp.pers;
    if (pp.foot) p.foot = pp.foot;
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
  ['inbox', '🏠', 'Accueil'], ['squad', '👥', 'Effectif'], ['tactics', '📋', 'Tactique'], ['training', '🏋', 'Entraînement'],
  ['fixtures', '📅', 'Calendrier'], ['comps', '🏆', 'Compétitions'], ['transfers', '💱', 'Mercato'], ['finances', '💶', 'Finances'],
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
    const fs = e.t === 'L' ? leagueComps(G).flatMap(l => l.fixtures[e.r] || []) : (G.comps.CUP.rounds[e.r]?.ties || []);
    const f = fs.find(f => f.h === G.clubId || f.a === G.clubId);
    if (f) return { f, w };
    if (e.t === 'C' && !G.comps.CUP.rounds[e.r] && G.comps.CUP.alive.includes(G.clubId) && !G.comps.CUP.winner) return { f: null, w, cupTbd: true };
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
  const compName = nx?.f ? (nx.f.comp === 'CUP' ? G.comps.CUP.name : G.comps[nx.f.comp].name) : '';
  $('#top').innerHTML = `
    <div class="tclub">${crest(c, 42)}<div><b>${esc(c.name)}</b><small>${esc(G.managerName)} · ${esc(clubLeague(G, G.clubId)?.name || '')}</small></div></div>
    <div class="tinfo"><small>Saison</small><b>${G.season}/${String(G.season + 1).slice(2)}</b></div>
    <div class="tinfo"><small>${done ? 'Statut' : fmtDate(dateOfWeek(G, G.week))}</small><b>${esc(weekLabel(G))}</b></div>
    <div class="tinfo"><small>Budget</small><b class="${c.budget < 0 ? 'neg' : ''}">${money(c.budget)}</b></div>
    <div class="tinfo" title="Confiance du président"><small>Président</small>${meter(G.board.conf, 'Confiance')}</div>
    <div class="tinfo hide-s"><small>Mercato</small><b>${windowOpen(G) ? '<span class="pos">Ouvert</span>' : 'Fermé'}</b></div>
    <div class="search hide-s"><input id="gsearch" placeholder="🔎 Joueur, club… ( / )" autocomplete="off"><div id="gres"></div></div>
    <div class="grow"></div>
    ${opp ? `<div class="tnext hide-s"><small>${esc(compName)} · ${fmtDate(dateOfWeek(G, nx.w))}</small><b>${nx.f.h === G.clubId ? 'vs' : '@'} ${esc(opp.name)}</b></div>` : ''}
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
  const fn = { inbox: vInbox, squad: vSquad, tactics: vTactics, training: vTraining, fixtures: vFixtures, comps: vComps, transfers: vTransfers, finances: vFinances, club: vClub, editor: el => vEditor(el, G, true), options: vOptions }[v] || vInbox;
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
  const filt = { all: m => !m.world, club: m => !m.world && ['board', 'win', 'loss', 'inj', 'warn', 'youth', 'trophy', 'info', 'cup'].includes(m.type), transfer: m => ['transfer', 'offer'].includes(m.type), world: m => m.world }[INBOX_FILTER];
  const msgs = G.inbox.filter(filt).slice(0, 40);
  const lastRes = [];
  for (let w = G.week - 1; w >= 0 && lastRes.length < 5; w--) {
    const e = G.schedule[w];
    const fs = e.t === 'L' ? leagueComps(G).flatMap(l => l.fixtures[e.r] || []) : (G.comps.CUP.rounds[e.r]?.ties || []);
    const f = fs.find(f => f.h === G.clubId || f.a === G.clubId);
    if (f?.res) lastRes.push(f);
  }
  const lo = Math.max(0, myRank - 4), mini = tbl.slice(lo, lo + 7);
  let nextCard = '<p class="muted">Aucun match à venir.</p>';
  if (nx?.f) {
    const f = nx.f, home = f.h === G.clubId, opp = getClub(G, home ? f.a : f.h);
    const oppL = clubLeague(G, opp.id), ot = standings(G, oppL.id), orank = ot.findIndex(t => t.id === opp.id) + 1;
    nextCard = `<div class="nextmatch">
      <div class="nm-team">${crest(getClub(G, f.h), 64)}<b>${esc(getClub(G, f.h).name)}</b></div>
      <div class="nm-mid"><small>${esc(f.comp === 'CUP' ? G.comps.CUP.name + ' · ' + weekLabel(G, nx.w) : G.comps[f.comp].name + ' · ' + weekLabel(G, nx.w))}</small><span>VS</span><small>${fmtDate(dateOfWeek(G, nx.w))}</small></div>
      <div class="nm-team">${crest(getClub(G, f.a), 64)}<b>${esc(getClub(G, f.a).name)}</b></div>
    </div>
    <p class="center hint">${esc(opp.name)} : ${orank}<sup>e</sup> de ${esc(oppL.name)} · forme <span class="form">${ot[orank - 1].form.slice(-5).map(r => `<i class="f${r}">${r}</i>`).join('') || '-'}</span></p>`;
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
      </div>
    </section>
  </div>
  <div class="grid2">
    <section class="card">
      <div class="row gap"><h2 class="grow">📨 Messages</h2>
        <div class="tabs sm">${[['all', 'Tous'], ['club', 'Club'], ['transfer', 'Mercato'], ['world', 'Ligue']].map(([k, l]) => `<button data-f="${k}" class="${INBOX_FILTER === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
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
  G.inbox.forEach(m => m.read = true);
  setTimeout(() => { const s = $('#nav button[data-v=inbox] span'); if (s) s.dataset.n = ''; }, 0);
}
function fxKey(f) { return `${f.comp}|${f.h}|${f.a}`; }
function findFx(key) {
  const [comp, h, a] = key.split('|');
  const list = comp === 'CUP' ? G.comps.CUP.rounds.flatMap(r => r.ties) : G.comps[comp].fixtures.flat();
  return list.find(f => f.h === +h && f.a === +a);
}
function resultRow(f, opts = {}) {
  const H = getClub(G, f.h), A = getClub(G, f.a);
  let cls = '';
  if (f.res && (f.h === G.clubId || f.a === G.clubId)) {
    const w = fixtureWinner(f);
    cls = w === G.clubId ? 'win' : w == null ? 'draw' : 'loss';
  }
  const sc = f.res ? `${f.res[0]} - ${f.res[1]}${f.pens ? `<small> (${f.pens[0]}-${f.pens[1]} tab)</small>` : f.et ? '<small> ap</small>' : ''}` : (opts.date || '-');
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
    </table></div>`);
}

// ============================================================
//  Effectif
// ============================================================
let SQUAD_SORT = { k: 'pos', d: 1 };
let SQUAD_LINE = '';
const POS_ORDER = Object.keys(ROLES);
function vSquad(el, clubId = G.clubId) {
  const mine = clubId === G.clubId;
  const club = getClub(G, clubId);
  let list = clubPlayers(G, clubId);
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
    <div class="scroll"><table class="tbl players">
      <thead><tr>${th('num', '#')}<th></th>${th('name', 'Joueur')}${th('pos', 'Poste')}${th('age', 'Âge')}<th>Nat.</th>${th('ovr', 'Note')}${th('pot', 'Pot.', 'Potentiel')}<th>Forme</th>${th('fit', 'Cond.', 'Condition physique')}${th('mor', 'Moral')}${th('apps', 'MJ')}${th('goals', 'Buts')}${th('rat', 'Moy.')}${th('val', 'Valeur')}${th('wage', 'Salaire')}${th('con', 'Contrat')}<th></th></tr></thead>
      <tbody>${list.map(p => `<tr data-pid="${p.id}" class="${inXI.has(p.id) ? 'xi' : inB.has(p.id) ? 'bn' : ''} ${available(p) ? '' : 'unav'}">
        <td class="muted">${p.num ?? ''}</td><td>${avatar(p, 32)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${p.age}</td><td>${natFlag(p.nat)}</td>
        <td>${ovrBadge(playerOvr(p))}</td><td>${stars(p.pot)}</td><td>${formDots(p)}</td><td>${bar(p.fit, 100, p.fit < 70 ? 'low' : '')}</td><td>${bar(p.morale, 100, 'mor')}</td>
        <td>${p.stats.apps}</td><td>${p.stats.goals}</td><td>${p.stats.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '-'}</td>
        <td>${money(p.value)}</td><td>${money(p.wage)}</td><td>${p.contract} an${p.contract > 1 ? 's' : ''}</td><td>${status(p)}</td></tr>`).join('')}</tbody>
    </table></div></section>`;
  el.querySelectorAll('th[data-k]').forEach(t => t.onclick = () => { SQUAD_SORT = { k: t.dataset.k, d: SQUAD_SORT.k === t.dataset.k ? -SQUAD_SORT.d : (['name', 'pos', 'age', 'num'].includes(t.dataset.k) ? 1 : -1) }; vSquad(el, clubId); });
  el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { SQUAD_LINE = b.dataset.l; vSquad(el, clubId); });
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}

function playerModal(pid, tab = 'profil') {
  const p = getPlayer(G, pid); if (!p) return;
  const club = p.club != null ? getClub(G, p.club) : null;
  const mine = p.club === G.clubId;
  const ovr = playerOvr(p);
  const best = Object.keys(ROLES).map(r => [r, playerRoleRating(p, r) * familiarity(p, r)]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const shortlisted = G.shortlist.includes(p.id);
  const form = (p.form || []).filter(x => x.s === G.season).map(x => x.r);
  const tabs = `<div class="tabs">${[['profil', 'Profil'], ['stats', 'Statistiques'], ...(mine ? [['talk', 'Discuter']] : [])].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'profil') {
    body = `<div class="grid2">
      <div><h3>Attributs</h3>${Object.entries(ATTRS).filter(([k]) => p.pos === 'GB' || k !== 'gar').map(([k, l]) => {
        const d = p.attrs[k] - (p.attrs0?.[k] ?? p.attrs[k]);
        return `<div class="attr"><span>${l}</span>${bar(p.attrs[k], 20, 'a' + Math.ceil(p.attrs[k] / 5))}<b>${p.attrs[k]}${d ? `<sup class="${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</sup>` : ''}</b></div>`;
      }).join('')}
      <p class="hint">▲▼ : évolution depuis le début de saison.</p></div>
      <div><h3>Infos</h3>
        <table class="tbl kv">
          <tr><td>Personnalité</td><td title="${esc(PERSONALITIES[p.pers] || '')}">${esc(p.pers)} <span class="muted">ⓘ</span></td></tr>
          <tr><td>Valeur</td><td>${money(p.value)}</td></tr>
          <tr><td>Salaire</td><td>${money(p.wage)} / sem.</td></tr>
          <tr><td>Contrat</td><td>${p.contract} saison(s)</td></tr>
          <tr><td>Condition</td><td>${bar(p.fit)} ${Math.round(p.fit)}%</td></tr>
          <tr><td>Moral</td><td>${bar(p.morale, 100, 'mor')} ${Math.round(p.morale)}%</td></tr>
          <tr><td>Postes</td><td>${best.map(([r, v]) => `${r} ${ovrBadge(v)}`).join(' ')}</td></tr>
        </table>
      </div></div>`;
  } else if (tab === 'stats') {
    body = `<div class="grid2"><div>
      <h3>Saison ${G.season}/${G.season + 1}</h3>
      <table class="tbl kv">
        <tr><td>Matchs</td><td>${p.stats.apps}</td></tr><tr><td>Buts (dont championnat)</td><td>${p.stats.goals} (${p.stats.lg})</td></tr>
        <tr><td>Passes décisives</td><td>${p.stats.assists}</td></tr><tr><td>Note moyenne</td><td>${p.stats.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '-'}</td></tr>
        <tr><td>Homme du match</td><td>${p.stats.motm}</td></tr><tr><td>Cartons</td><td>🟨 ${p.stats.yel} · 🟥 ${p.stats.red}</td></tr>
      </table>
      <h3>Forme (notes)</h3>${sparkline(form, 300, 60, { min: 4, max: 10 })}
    </div><div>
      <h3>Carrière</h3>
      <table class="tbl compact"><tr><th>Saison</th><th>Club</th><th>MJ</th><th>Buts</th><th>PD</th><th>Moy.</th></tr>
      ${(p.hist || []).slice().reverse().map(h => `<tr><td>${h.season}/${String(h.season + 1).slice(2)}</td><td>${esc(h.club)}</td><td>${h.apps}</td><td>${h.goals}</td><td>${h.assists}</td><td>${h.avg}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Pas encore d\'historique.</td></tr>'}</table>
    </div></div>`;
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
      <button class="btn danger" onclick="releasePlayer(${p.id})">Libérer</button>`
    : `<button class="btn primary" onclick="offerModal(${p.id})">${club ? 'Faire une offre' : 'Proposer un contrat'}</button>
       <button class="btn" onclick="toggleShortlist(${p.id})">${shortlisted ? '👁 Retirer du suivi' : '👁 Suivre'}</button>
       ${club ? `<button class="btn" onclick="closeModal();viewClub(${club.id})">Voir le club</button>` : ''}`;
  modal(`
  <div class="pm-head">${avatar(p, 100)}
    <div><h2>${p.num ? `<span class="num">${p.num}</span>` : ''}${esc(p.name)}</h2>
      <p>${ROLES[p.pos].label} · ${p.age} ans · ${natFlag(p.nat)} ${esc(NATIONS.find(n => n[0] === p.nat)?.[1] || p.nat)} · Pied ${esc(p.foot.toLowerCase())}</p>
      <p>${club ? crest(club, 20) + ' ' + esc(club.name) : '<i>Agent libre</i>'} ${status(p)} ${formDots(p)}</p>
    </div>
    <div class="pm-ovr">${ovrBadge(ovr)}<small>Potentiel</small>${stars(p.pot)}</div>
  </div>
  ${tabs}
  <div class="pm-body">${body}</div>
  <div class="row gap wrap mt">${actions}<div class="grow"></div><button class="btn" onclick="editPlayerModal(${p.id}, G, () => playerModal(${p.id}))" title="Modifier dans l'éditeur">✏ Éditer</button></div>`, 'wide');
  $$('#modal [data-t]').forEach(b => b.onclick = () => playerModal(pid, b.dataset.t));
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
    myClub(G).budget -= cost; p.club = null; p.listed = false; p.contract = 0;
    removeFromTactics(pid); save(); refresh();
  }, 'Libérer', true);
}
function renewModal(pid) {
  const p = getPlayer(G, pid);
  const ask = roundMoney(calcWage(p) * (1.05 + (p.morale < 50 ? .3 : 0) + (p.pers === 'Ambitieux' ? .15 : 0)));
  modal(`<h2>Prolonger ${esc(p.name)}</h2>
    <p>Il demande environ <b>${money(ask)}</b>/sem. (actuel ${money(p.wage)}).</p>
    <label>Durée <select id="yrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === 3 ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
    <label>Salaire proposé (€/sem.) <input id="wg" type="number" step="1000" value="${ask}"></label>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ok">Proposer</button></div><p id="resp" class="hint"></p>`);
  $('#ok').onclick = () => {
    const w = +$('#wg').value, y = +$('#yrs').value;
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
function vTactics(el) {
  const T = G.tactics;
  T.inst ||= defaultInst(); T.takers ||= {};
  const slots = FORMATIONS[T.formation];
  const squad = clubPlayers(G, G.clubId).sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || playerOvr(b) - playerOvr(a));
  const side = makeSide(G, G.clubId, T);
  const S = teamStrength(G, side);
  const selRole = SEL?.type === 'xi' ? slots[SEL.idx][0] : null;
  const xiPlayers = T.lineup.filter(Boolean).map(id => getPlayer(G, id));
  const opt = (k) => `<option value="">Auto (${esc(getPlayer(G, side.takers[k])?.name || '-')})</option>` + xiPlayers.map(p => `<option value="${p.id}" ${T.takers[k] === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  el.innerHTML = `
  <div class="tac-wrap">
    <section class="card">
      <div class="row gap wrap">
        <label>Formation <select id="form">${Object.keys(FORMATIONS).map(f => `<option ${f === T.formation ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>Mentalité <select id="ment">${MENTALITIES.map(m => `<option value="${m.v}" ${m.v === T.mentality ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
        <div class="grow"></div>
        <button class="btn" id="auto" title="Meilleure composition selon les notes et la condition">⚡ Composition auto</button>
      </div>
      <div class="pitch">
        <div class="lines"></div>
        ${slots.map(([role, x, y], i) => {
          const p = T.lineup[i] ? getPlayer(G, T.lineup[i]) : null;
          const r = p ? effRating(p, role) : 0;
          const bad = p && (!available(p) || familiarity(p, role) < .9);
          return `<div class="slot ${SEL?.type === 'xi' && SEL.idx === i ? 'sel' : ''} ${bad ? 'bad' : ''}" data-i="${i}" style="left:${x}%;top:${y}%" ${p ? `draggable="true" data-pid="${p.id}"` : ''} title="${p ? esc(p.name) + (familiarity(p, role) < 1 ? ' — hors de son poste (' + p.pos + ')' : '') : 'Place libre'}">
            ${p ? avatar(p, 42) : '<div class="empty">+</div>'}
            <div class="sl-role">${role}${p ? ' ' + ovrBadge(r) : ''}</div>
            <div class="sl-name">${p ? esc(p.name.split(' ').slice(-1)[0]) : '—'}${p && T.takers.cap === p.id ? ' ©' : ''}</div>
            ${p ? bar(p.fit, 100, p.fit < 70 ? 'low' : '') : ''}
          </div>`;
        }).join('')}
      </div>
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
      <p class="hint">Glisse un joueur sur une place, ou clique une place puis un joueur. Rouge = hors poste ou indisponible.</p>
    </section>
    <div class="col">
      <section class="card">
        <h2>Consignes d'équipe</h2>
        <div class="inst">${Object.entries(INST).map(([k, d]) => `<div class="inst-row" title="${esc(d.tip)}"><span>${d.label}</span>${seg(k, d.opts, T.inst[k] ?? 0)}</div>`).join('')}</div>
        <div class="row gap wrap mt">
          <label>Capitaine <select data-tk="cap">${opt('cap')}</select></label>
          <label>Penaltys <select data-tk="pen">${opt('pen')}</select></label>
          <label>Coups francs <select data-tk="fk">${opt('fk')}</select></label>
        </div>
        <p class="hint">Survole une consigne pour voir son effet. Elles influencent vraiment le moteur : possession, occasions, contres, fatigue, cartons.</p>
      </section>
      <section class="card">
        <h2>Joueurs ${selRole ? `<small>— note au poste ${selRole}</small>` : ''}</h2>
        <div class="scroll short"><table class="tbl players compact">
          <thead><tr><th></th><th>Joueur</th><th>Poste</th><th>Note</th>${selRole ? `<th>${selRole}</th>` : ''}<th>Cond.</th><th>Forme</th><th></th></tr></thead>
          <tbody>${squad.map(p => `<tr data-pid="${p.id}" draggable="true" class="${T.lineup.includes(p.id) ? 'xi' : T.bench.includes(p.id) ? 'bn' : ''} ${available(p) ? '' : 'unav'}">
            <td>${avatar(p, 26)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${ovrBadge(playerOvr(p))}</td>
            ${selRole ? `<td>${ovrBadge(effRating(p, selRole))}</td>` : ''}
            <td>${bar(p.fit, 100, p.fit < 70 ? 'low' : '')}</td><td>${formDots(p, 3)}</td><td>${T.lineup.includes(p.id) ? '<span class="tag grn">XI</span>' : T.bench.includes(p.id) ? '<span class="tag">Banc</span>' : ''} ${status(p)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>
    </div>
  </div>`;
  const rerender = () => { save(); vTactics(el); };
  $('#form').onchange = e => {
    const nw = FORMATIONS[e.target.value];
    const left = T.lineup.filter(Boolean);
    const newL = new Array(nw.length).fill(null);
    nw.forEach(([r], i) => { const j = left.findIndex(id => getPlayer(G, id).pos === r); if (j >= 0) newL[i] = left.splice(j, 1)[0]; });
    nw.forEach(([r], i) => { if (!newL[i] && left.length) { let bj = 0, bv = -1; left.forEach((id, j) => { const v = effRating(getPlayer(G, id), r); if (v > bv) { bv = v; bj = j; } }); newL[i] = left.splice(bj, 1)[0]; } });
    T.formation = e.target.value; T.lineup = newL; SEL = null; rerender();
  };
  $('#ment').onchange = e => { T.mentality = +e.target.value; save(); };
  $('#auto').onclick = () => { Object.assign(T, autoLineup(G, G.clubId, T.formation)); SEL = null; rerender(); };
  el.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => { T.inst[s.dataset.name] = +b.dataset.v; rerender(); }));
  el.querySelectorAll('[data-tk]').forEach(s => s.onchange = () => { T.takers[s.dataset.tk] = s.value ? +s.value : undefined; rerender(); });
  const target = elx => elx.dataset.i != null ? { type: 'xi', idx: +elx.dataset.i } : { type: 'bench', idx: Math.min(+elx.dataset.b, T.bench.length) };
  const clickSlot = elx => {
    const cur = target(elx);
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
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => {
    const pid = +r.dataset.pid;
    if (!SEL) return playerModal(pid);
    placePlayer(T, pid, SEL); SEL = null; rerender();
  });
}

// ============================================================
//  Entraînement
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
  const rows = G.schedule.map((e, w) => {
    const fs = e.t === 'L' ? leagueComps(G).flatMap(l => l.fixtures[e.r] || []) : (G.comps.CUP.rounds[e.r]?.ties || []);
    return { w, e, f: fs.find(f => f.h === G.clubId || f.a === G.clubId) };
  });
  const week = rows[FIX_WEEK];
  const fsAll = week.e.t === 'L' ? leagueComps(G).map(l => ({ name: l.name, fs: l.fixtures[week.e.r] || [] })) : [{ name: G.comps.CUP.name + ' — ' + (G.comps.CUP.rounds[week.e.r]?.name || 'à venir'), fs: G.comps.CUP.rounds[week.e.r]?.ties || [] }];
  el.innerHTML = `<div class="grid2">
    <section class="card"><h2>📅 Mon calendrier</h2><div class="scroll"><table class="tbl">
      ${rows.map(({ w, e, f }) => {
        if (!f) return `<tr class="muted ${w === G.week ? 'next' : ''}" data-w="${w}"><td>${esc(weekLabel(G, w))}</td><td>${fmtDate(dateOfWeek(G, w))}</td><td colspan="3">${e.t === 'C' ? (G.comps.CUP.rounds[e.r] ? 'Pas de match (éliminé/exempté)' : 'Coupe — tirage à venir') : '-'}</td></tr>`;
        const home = f.h === G.clubId, o = getClub(G, home ? f.a : f.h);
        const w2 = fixtureWinner(f); const cls = f.res ? (w2 === G.clubId ? 'win' : w2 == null ? 'draw' : 'loss') : '';
        return `<tr class="${cls} ${w === G.week ? 'next' : ''} ${e.t === 'C' ? 'cup' : ''}" data-w="${w}" ${f.res ? `data-fx="${fxKey(f)}"` : ''}><td>${esc(weekLabel(G, w))}</td><td>${fmtDate(dateOfWeek(G, w))}</td><td>${home ? 'Dom.' : 'Ext.'}</td><td>${crest(o, 20)} ${esc(o.name)}</td><td class="sc">${f.res ? (home ? f.res.join('-') : f.res.slice().reverse().join('-')) + (f.pens ? ' tab' : '') : ''}</td></tr>`;
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
  const tabs = `<div class="tabs">${[...leagueComps(G), G.comps.CUP].map(c => `<button data-c="${c.id}" class="${c.id === COMP_TAB ? 'on' : ''}">${esc(c.name)}</button>`).join('')}<button data-c="AW" class="${COMP_TAB === 'AW' ? 'on' : ''}">🏅 Récompenses</button></div>`;
  el.innerHTML = `<section class="card">${tabs}</section><div id="compBody"></div>`;
  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { COMP_TAB = b.dataset.c; vComps(el); });
  const body = $('#compBody');
  if (COMP_TAB === 'AW') return vAwards(body);
  if (comp.type === 'cup') return vCup(body, comp);
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
      const zone = i === 0 ? 'z-cl' : (hasUp && i < ps) ? 'z-el' : (hasDown && i >= n - ps) ? 'z-rel' : '';
      return `<tr class="${zone} ${r.id === G.clubId ? 'me' : ''}" data-c="${c.id}"><td>${i + 1}</td><td class="nm">${crest(c, 20)} ${esc(c.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td><td class="form">${r.form.slice(-5).map(x => `<i class="f${x}">${x}</i>`).join('')}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint"><span class="lg z-cl"></span> Champion ${hasUp ? '<span class="lg z-el"></span> Montée' : ''} ${hasDown ? '<span class="lg z-rel"></span> Relégation' : ''}</p>
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
  const L = clubLeague(G, id), t = standings(G, L.id), rank = t.findIndex(r => r.id === id) + 1;
  const info = document.createElement('div');
  info.innerHTML = `<section class="card row gap wrap">${crest(c, 72)}<div class="grow"><h2>${esc(c.name)}</h2>
    <p>${esc(L.name)} : <b>${rank}<sup>e</sup></b> · ${esc(c.stadium)} (${c.capacity.toLocaleString('fr-FR')} places) · Réputation ${stars(c.rep)} · Budget ${money(c.budget)}</p>
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
  const tabs = [['search', '🔎 Recherche'], ['shortlist', `👁 Suivi (${G.shortlist.length})`], ['offers', `📩 Offres reçues (${G.offers.length})`], ['selling', '🏷 Mes joueurs en vente']];
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
        <td>${avatar(p, 30)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${p.age}</td><td>${natFlag(p.nat)}</td><td>${ovrBadge(playerOvr(p))}</td><td>${stars(p.pot)}</td>
        <td>${c ? crest(c, 18) + ' ' + esc(c.short) : '<i>Libre</i>'}</td><td>${c ? money(p.value) : '-'}</td><td>${money(p.wage)}</td><td>${status(p)}</td></tr>`; }).join('') || '<tr><td colspan="11" class="muted">Aucun joueur.</td></tr>'}</tbody>
    </table></div>`;
  if (TR_TAB === 'search') {
    let list = G.players.filter(p => p.club !== G.clubId);
    if (TF.q) list = list.filter(p => normName(p.name).includes(normName(TF.q)));
    if (TF.pos) list = list.filter(p => p.pos === TF.pos);
    if (TF.maxv) list = list.filter(p => p.value <= +TF.maxv * 1e6);
    if (TF.maxage) list = list.filter(p => p.age <= +TF.maxage);
    if (TF.minovr) list = list.filter(p => playerOvr(p) >= +TF.minovr);
    if (TF.free) list = list.filter(p => p.club == null || p.listed);
    list.sort((a, b) => playerOvr(b) - playerOvr(a));
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
  } else if (TR_TAB === 'shortlist') {
    body.innerHTML = table(G.shortlist.map(id => getPlayer(G, id)).filter(p => p && p.club !== G.clubId));
  } else if (TR_TAB === 'offers') {
    body.innerHTML = G.offers.length ? `<table class="tbl">${G.offers.map(o => { const p = getPlayer(G, o.pid), c = getClub(G, o.club); return `<tr><td>${avatar(p, 30)}</td><td class="nm">${esc(p.name)}</td><td>${ovrBadge(playerOvr(p))}</td><td>${crest(c, 20)} ${esc(c.name)}</td><td><b>${money(o.fee)}</b> <small class="muted">(valeur ${money(p.value)})</small></td><td class="row gap"><button class="btn primary sm" data-acc="${o.id}">Accepter</button><button class="btn sm" data-ctr="${o.id}">Contre-offre</button><button class="btn sm" data-rej="${o.id}">Refuser</button></td></tr>`; }).join('')}</table>` : '<p class="muted">Aucune offre. Mets des joueurs en vente pour attirer des acheteurs.</p>';
    body.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => acceptOffer(+b.dataset.acc));
    body.querySelectorAll('[data-rej]').forEach(b => b.onclick = () => { G.offers = G.offers.filter(o => o.id !== +b.dataset.rej); save(); vTransfers(el); });
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
  buyer.budget -= o.fee; me.budget += o.fee; G.fin.transfersOut += o.fee;
  p.club = buyer.id; p.listed = false; p.contract = rint(2, 5); p.num = null; assignNumbers(clubPlayers(G, buyer.id));
  removeFromTactics(p.id);
  G.offers = G.offers.filter(x => x.pid !== p.id);
  news(G, `${p.name} est transféré à ${buyer.name} pour ${money(o.fee)}.`, 'transfer');
  save(); toast(`${p.name} vendu ${money(o.fee)} !`); refresh();
}
function offerModal(pid) {
  const p = getPlayer(G, pid);
  const seller = p.club != null ? getClub(G, p.club) : null;
  const me = myClub(G);
  if (seller && !windowOpen(G)) return toast('Mercato fermé : seuls les agents libres peuvent signer.', 'err');
  if (clubPlayers(G, G.clubId).length >= 32) return toast('Effectif complet (32 max). Vends ou libère quelqu\'un.', 'err');
  const wageAsk = roundMoney(calcWage(p) * (1.1 + Math.max(0, playerOvr(p) - me.rep) / 40) * (p.pers === 'Ambitieux' ? 1.1 : 1));
  const sq = seller ? clubPlayers(G, seller.id) : [];
  const rank = seller ? sq.map(playerOvr).sort((a, b) => b - a).indexOf(playerOvr(p)) : 99;
  const key = rank < 11 ? .35 : rank < 16 ? .12 : 0;
  const ask = seller ? roundMoney(p.value * (p.listed ? .85 : 1.05 + key) * (seller.rep > me.rep + 10 ? 1.25 : 1)) : 0;
  let stage = seller ? 'fee' : 'wage';
  let agreedFee = 0;
  const render = (msg = '') => {
    modal(`<h2>${seller ? 'Transfert' : 'Contrat'} : ${esc(p.name)}</h2>
      <div class="row gap">${avatar(p, 56)}<div><p>${ROLES[p.pos].label} · ${p.age} ans · ${ovrBadge(playerOvr(p))} ${stars(p.pot)}</p>
      <p>${seller ? `${crest(seller, 18)} ${esc(seller.name)} · valeur estimée <b>${money(p.value)}</b>` : 'Agent libre — pas d\'indemnité.'}</p></div></div>
      <p>Ton budget : <b>${money(me.budget)}</b></p>
      <div class="steps"><span class="${stage === 'fee' ? 'on' : 'done'}">${seller ? '1. Accord avec le club' : ''}</span><span class="${stage === 'wage' ? 'on' : ''}">${seller ? '2. ' : ''}Contrat du joueur</span></div>
      ${stage === 'fee' ? `<label>Indemnité proposée (€) <input id="fee" type="number" step="100000" value="${roundMoney(p.value * .9)}"></label>
        <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ok">Envoyer l'offre</button></div>`
        : `<p>${seller ? `✅ Accord trouvé avec ${esc(seller.name)} : <b>${money(agreedFee)}</b>.` : ''}</p>
        <label>Salaire (€/sem.) — il demande ~${money(wageAsk)} <input id="wg" type="number" step="1000" value="${roundMoney(wageAsk * .9)}"></label>
        <label>Durée <select id="yrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === 3 ? 'selected' : ''}>${y}</option>`).join('')}</select> saison(s)</label>
        <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ok">Proposer le contrat</button></div>`}
      <p class="hint" id="resp">${msg}</p>`);
    $('#ok').onclick = () => {
      if (stage === 'fee') {
        const fee = +$('#fee').value;
        if (fee > me.budget) return render('❌ Budget insuffisant.');
        if (sq.length <= 18) return render(`❌ ${esc(seller.name)} refuse : effectif trop court.`);
        if (fee >= ask) { agreedFee = fee; stage = 'wage'; return render(); }
        if (fee >= ask * .85) {
          const counter = roundMoney((fee + ask) / 2 + ask * .03);
          modal(`<h2>Contre-offre de ${esc(seller.name)}</h2><p>Ils refusent ${money(fee)} mais accepteraient <b>${money(counter)}</b>.</p>
            <div class="row gap mt"><div class="grow"></div><button class="btn" id="no">Abandonner</button><button class="btn primary" id="yes">Accepter ${money(counter)}</button></div>`);
          $('#no').onclick = closeModal;
          $('#yes').onclick = () => { if (counter > me.budget) return toast('Budget insuffisant.', 'err'); agreedFee = counter; stage = 'wage'; render(); };
          return;
        }
        return render(`❌ Offre rejetée. ${esc(seller.name)} veut au moins ~<b>${money(roundMoney(ask * .9))}</b>.`);
      }
      const w = +$('#wg').value, y = +$('#yrs').value;
      const repGap = playerOvr(p) - me.rep;
      if (repGap > 18 && rnd() < .7) { closeModal(); return toast(`${p.name} ne veut pas rejoindre un club de ce niveau.`, 'err'); }
      if (w < wageAsk * .9) return render(`❌ ${esc(p.name)} refuse ce salaire. Il veut au moins ~<b>${money(roundMoney(wageAsk * .9))}</b>.`);
      me.budget -= agreedFee; if (seller) seller.budget += agreedFee;
      G.fin.transfersIn += agreedFee;
      p.club = G.clubId; p.wage = w; p.contract = y; p.listed = false; p.morale = 85; p.num = null;
      assignNumbers(clubPlayers(G, G.clubId));
      me.coh = clamp((me.coh ?? 60) - 4, 0, 100);
      G.shortlist = G.shortlist.filter(id => id !== p.id);
      if (G.tactics.bench.length < 9) G.tactics.bench.push(p.id);
      news(G, `Officiel : ${p.name} signe pour ${y} saison(s)${seller ? ` en provenance de ${seller.name} (${money(agreedFee)})` : ''} !`, 'transfer');
      save(); closeModal(); toast(`${p.name} a signé ! 🎉`); refresh();
    };
  };
  render();
}

// ============================================================
//  Finances
// ============================================================
function vFinances(el) {
  const c = myClub(G);
  const squad = clubPlayers(G, G.clubId);
  const wages = squad.reduce((s, p) => s + p.wage, 0);
  const sqVal = squad.reduce((s, p) => s + p.value, 0);
  const f = G.fin;
  const top = [...squad].sort((a, b) => b.wage - a.wage).slice(0, 12);
  const inc = f.gate + f.tv + f.sponsor + f.prize + f.transfersOut, out = f.wages + f.transfersIn;
  el.innerHTML = `<div class="grid2">
    <section class="card"><h2>💶 Finances</h2>
      <div class="kpis"><div><small>Budget</small><b class="${c.budget < 0 ? 'neg' : ''}">${money(c.budget)}</b></div><div><small>Salaires / sem.</small><b>${money(wages)}</b></div><div><small>Valeur effectif</small><b>${money(sqVal)}</b></div></div>
      <h3>Évolution du budget</h3>${sparkline(f.hist, 420, 80, { zero: true })}
      <h3>Saison en cours</h3>
      <table class="tbl kv">
        <tr><td>Billetterie</td><td class="pos">+${money(f.gate)}</td></tr>
        <tr><td>Sponsors</td><td class="pos">+${money(f.sponsor)}</td></tr>
        <tr><td>Primes (coupe)</td><td class="pos">+${money(f.prize)}</td></tr>
        <tr><td>Droits TV (fin de saison)</td><td class="pos">+${money(f.tv)}</td></tr>
        <tr><td>Ventes de joueurs</td><td class="pos">+${money(f.transfersOut)}</td></tr>
        <tr><td>Salaires</td><td class="neg">-${money(f.wages)}</td></tr>
        <tr><td>Achats de joueurs</td><td class="neg">-${money(f.transfersIn)}</td></tr>
        <tr><td><b>Solde</b></td><td><b class="${inc - out < 0 ? 'neg' : 'pos'}">${money(inc - out)}</b></td></tr>
      </table>
    </section>
    <section class="card"><h2>Masse salariale</h2><table class="tbl compact">${top.map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 24)}</td><td class="nm">${esc(p.name)}</td><td>${money(p.wage)}/sem.</td><td>${p.contract} an(s)</td></tr>`).join('')}</table>
    <p class="hint">Un budget durablement négatif fait chuter la confiance du président.</p></section>
  </div>`;
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
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
      <p class="hint mt">Logo, couleurs, nom, stade : menu ✏ Éditeur.</p>
    </section>
    <section class="card"><h2>📜 Ma carrière</h2>
      <table class="tbl compact"><tr><th>Saison</th><th>Club</th><th>Championnat</th><th>Rang</th><th>Coupe</th><th>Objectif</th></tr>
      ${G.history.slice().reverse().map(h => `<tr><td>${h.season}/${String(h.season + 1).slice(2)}</td><td>${esc(h.club || '')}</td><td>${esc(h.comp)}</td><td>${h.rank}<sup>e</sup> (${h.pts} pts)</td><td>${esc(h.cup)}</td><td>${h.met ? '✅' : '❌'} ${esc(h.objLabel || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Première saison en cours.</td></tr>'}</table>
    </section></div>`;
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
    </div>
    <h3>Raccourcis</h3>
    <p class="hint">Espace / Entrée : continuer · 1 à 9 : menus · / : recherche · Échap : fermer · Espace en match : pause.</p>
    <p class="hint">La partie est sauvegardée automatiquement dans le navigateur (IndexedDB) après chaque action importante.</p>
  </section>`;
  $('#sp').value = String(SETTINGS.speed);
  $('#sp').onchange = e => { SETTINGS.speed = +e.target.value; saveSettings(); };
  $('#s2d').onchange = e => { SETTINGS.show2d = e.target.checked; saveSettings(); };
  $('#o1').onclick = async () => { await save(); toast('Partie sauvegardée.'); };
  $('#o2').onclick = () => { const { pmap, ...rest } = G; download(`manager-foot-${G.season}-${weekLabel(G).replace(/\s+/g, '-')}.json`, rest); };
  $('#o5').onclick = () => exportDatabase(G);
  $('#o3').onclick = async () => { await save(); startScreen(); };
  $('#o4').onclick = () => confirmBox('Supprimer définitivement la partie ?', async () => { await Store.del(SAVE_KEY); startScreen(); }, 'Supprimer', true);
}

// ---------- Démarrage ----------
(async function init() {
  await Store.open();
  DB = await Store.get(DB_KEY);
  if (!DB || !DB.clubs) DB = buildDefaultDatabase();
  normalizeWorld(DB);
  startScreen();
})();
