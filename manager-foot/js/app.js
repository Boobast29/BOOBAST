// ============================================================
//  Interface du jeu
// ============================================================
const SAVE_KEY = 'manager-foot-save-v1';
const DB_KEY = 'manager-foot-db-v1';
let G = null;          // partie en cours
let DB = null;         // base de données (défaut ou importée)
let VIEW = 'inbox';
let LIVE = null;       // match en direct
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Visuels générés (aucune image réelle) ----------
const SKIN = ['#f6d2b8', '#e8b48f', '#c98e66', '#a86b45', '#7a4a2c', '#4f2f1c'];
const HAIRC = ['#1b1b1b', '#3b2416', '#6b4423', '#b07a3c', '#d9b25f', '#8a8a8a'];
function faceSVG(p, size = 40, shirt = ['#345', '#fff']) {
  const f = p.face || { skin: 2, hair: 1, hairCol: 0, beard: 0 };
  const sk = SKIN[f.skin % 6], hc = HAIRC[f.hairCol % 6];
  const hairs = [
    '', // chauve
    '<path d="M14 20 Q14 7 26 7 Q38 7 38 20 Q34 13 26 13 Q18 13 14 20Z" />',
    '<path d="M13 22 Q12 5 26 5 Q40 5 39 22 Q37 12 26 11 Q16 12 13 22Z" />',
    '<circle cx="26" cy="11" r="11" /><circle cx="17" cy="15" r="6"/><circle cx="35" cy="15" r="6"/>',
    '<path d="M14 18 Q16 6 26 6 Q36 6 38 18 L36 14 L32 10 L26 12 L20 10 L16 14Z" />',
    '<path d="M24 4 Q28 4 28 14 L24 14Z" />',
    '<path d="M13 24 Q11 4 26 4 Q41 4 39 24 L39 34 Q37 18 26 12 Q15 18 13 34Z" />'
  ];
  return `<svg class="face" width="${size}" height="${size}" viewBox="0 0 52 52">
    <rect width="52" height="52" rx="8" fill="#26303d"/>
    <path d="M6 52 Q8 38 26 38 Q44 38 46 52Z" fill="${shirt[0]}"/>
    <path d="M21 38 L26 45 L31 38Z" fill="${shirt[1]}"/>
    <rect x="22" y="28" width="8" height="10" fill="${sk}"/>
    <ellipse cx="26" cy="21" rx="11" ry="13" fill="${sk}"/>
    ${f.beard ? `<path d="M15 23 Q16 35 26 35 Q36 35 37 23 Q34 31 26 31 Q18 31 15 23Z" fill="${hc}" opacity="${f.beard === 1 ? .55 : .9}"/>` : ''}
    <g fill="${hc}">${hairs[f.hair % hairs.length]}</g>
    <circle cx="22" cy="21" r="1.4" fill="#222"/><circle cx="30" cy="21" r="1.4" fill="#222"/>
    <path d="M23 28 Q26 30 29 28" stroke="#7a3b2e" stroke-width="1.2" fill="none"/>
  </svg>`;
}
function avatar(p, size = 40) {
  const club = p.club != null ? getClub(G || { clubs: DB.clubs }, p.club) : null;
  const shirt = club ? club.colors : ['#555', '#999'];
  if (p.photo) return `<span class="ph" style="width:${size}px;height:${size}px"><img src="${esc(p.photo)}" alt="" onerror="this.parentNode.innerHTML=this.parentNode.dataset.fb" referrerpolicy="no-referrer"></span>`.replace('<span class="ph"', `<span class="ph" data-fb='${faceSVG(p, size, shirt).replace(/'/g, '&#39;')}'`);
  return faceSVG(p, size, shirt);
}
function crest(c, size = 36) {
  if (!c) return '';
  if (c.logo) return `<img class="crest" src="${esc(c.logo)}" width="${size}" height="${size}" alt="" referrerpolicy="no-referrer">`;
  const [a, b] = c.colors;
  const txt = (c.short || c.name.slice(0, 3)).toUpperCase();
  return `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 40 46">
    <path d="M20 1 L38 6 L38 22 Q38 38 20 45 Q2 38 2 22 L2 6Z" fill="${a}" stroke="${b}" stroke-width="2.5"/>
    <path d="M20 3 L20 43" stroke="${b}" stroke-width="5" opacity=".35"/>
    <text x="20" y="27" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Arial" stroke="#000" stroke-opacity=".55" stroke-width="2" paint-order="stroke">${esc(txt)}</text>
  </svg>`;
}
function ovrBadge(v) {
  const cls = v >= 80 ? 'o5' : v >= 70 ? 'o4' : v >= 60 ? 'o3' : v >= 50 ? 'o2' : 'o1';
  return `<span class="ovr ${cls}">${Math.round(v)}</span>`;
}
function stars(v) {
  const s = Math.round(clamp((v - 40) / 10, .5, 5) * 2) / 2;
  let h = '';
  for (let i = 1; i <= 5; i++) h += i <= s ? '★' : (i - .5 === s ? '⯪' : '☆');
  return `<span class="stars">${h}</span>`;
}
function bar(v, max = 100, cls = '') { return `<span class="bar ${cls}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i></span>`; }
function natFlag(code) { const n = NATIONS.find(x => x[0] === code); return `<span class="nat" title="${n ? n[1] : code}">${esc(code)}</span>`; }
function status(p) {
  if (p.injury > 0) return `<span class="tag red" title="Blessé">✚ ${p.injury} sem.</span>`;
  if (p.susp > 0) return `<span class="tag red" title="Suspendu">⛔ ${p.susp}</span>`;
  if (p.listed) return `<span class="tag yel">À vendre</span>`;
  return '';
}
function dateOfRound(r) {
  const d = new Date(G.season, 7, 15); d.setDate(d.getDate() + r * 7 + (r >= 19 ? 14 : 0));
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------- Sauvegarde ----------
function save() {
  if (!G) return;
  try { const { pmap, ...rest } = G; localStorage.setItem(SAVE_KEY, JSON.stringify(rest)); } catch (e) { toast('Sauvegarde impossible : ' + e.message); }
}
function load() {
  try { const s = localStorage.getItem(SAVE_KEY); if (!s) return null; const g = JSON.parse(s); reindex(g); NEXT_PID = Math.max(...g.players.map(p => p.id)) + 1; return g; } catch { return null; }
}
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function pickFile(cb) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { cb(JSON.parse(r.result)); } catch (e) { toast('Fichier invalide : ' + e.message); } }; r.readAsText(f); };
  i.click();
}

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
}
function modal(html, cls = '') {
  closeModal();
  const m = document.createElement('div'); m.id = 'modal'; m.innerHTML = `<div class="mbox ${cls}"><button class="mclose" onclick="closeModal()">✕</button>${html}</div>`;
  m.onclick = e => { if (e.target === m) closeModal(); };
  document.body.appendChild(m);
}
function closeModal() { $('#modal')?.remove(); }

// ---------- Import base de données ----------
// Format accepté : { leagueName, clubs:[{name, short, colors:[c1,c2], rep, budget, stadium, capacity, logo, players:[{name, age, nat, pos, photo, pot, attrs:{fin,pas,dri,tec,tac,vit,phy,men,gar} | ovr }]}], freeAgents:[...] }
function importDatabase(raw) {
  if (!raw || !Array.isArray(raw.clubs) || raw.clubs.length < 4) throw new Error('il faut au moins 4 clubs dans "clubs"');
  NEXT_PID = 1;
  const clubs = [], players = [];
  const mkPlayer = (pp, clubId, rep) => {
    const pos = ROLES[pp.pos] ? pp.pos : 'MC';
    let p;
    if (pp.attrs) {
      p = genPlayer(pos, 10, { club: clubId, age: pp.age, nat: pp.nat || 'FRA', name: pp.name, photo: pp.photo, rep });
      for (const k in ATTRS) if (pp.attrs[k] != null) p.attrs[k] = clamp(Math.round(pp.attrs[k]), 1, 20);
    } else {
      // seulement une note globale (1-100) → on génère des attributs cohérents
      const q = (pp.ovr ?? 60) / 5 - 1.2;
      p = genPlayer(pos, q, { club: clubId, age: pp.age, nat: pp.nat || 'FRA', name: pp.name, photo: pp.photo, rep });
      const target = clamp(pp.ovr ?? 60, 30, 99);
      for (let i = 0; i < 200 && Math.abs(playerOvr(p) - target) > 0; i++) bumpAttr(p, playerOvr(p) < target ? 1 : -1);
    }
    if (pp.pot) p.pot = clamp(pp.pot, playerOvr(p), 99); else p.pot = Math.max(p.pot, playerOvr(p));
    if (pp.contract) p.contract = pp.contract;
    if (pp.wage) p.wage = pp.wage; else p.wage = calcWage(p);
    p.value = calcValue(p);
    return p;
  };
  raw.clubs.forEach((c, i) => {
    const rep = clamp(c.rep ?? 65, 30, 99);
    const club = {
      id: i + 1, name: String(c.name || 'Club ' + (i + 1)), short: (c.short || String(c.name || 'CLB').replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3)).toUpperCase(),
      colors: Array.isArray(c.colors) && c.colors.length >= 2 ? c.colors : ['#334', '#fff'], rep,
      stadium: c.stadium || 'Stade municipal', capacity: c.capacity || 20000,
      budget: c.budget ?? roundMoney(Math.pow(rep / 50, 5) * 2.2e6), logo: c.logo || null
    };
    clubs.push(club);
    const plist = (c.players || []).map(pp => mkPlayer(pp, club.id, rep));
    players.push(...plist);
    // complète si l'effectif est trop court
    const q = 8.6 + (rep - 50) / 40 * 5.2;
    for (const role of SQUAD_TEMPLATE) {
      if (plist.length >= 22) break;
      const have = plist.filter(p => p.pos === role).length, need = SQUAD_TEMPLATE.filter(r => r === role).length;
      if (have < need) { const p = genPlayer(role, q - 1, { club: club.id, rep }); p.value = calcValue(p); plist.push(p); players.push(p); }
    }
  });
  (raw.freeAgents || []).forEach(pp => players.push(mkPlayer(pp, null, 50)));
  for (let i = 0; i < 25; i++) { const p = genPlayer(pick(SQUAD_TEMPLATE), 6 + rnd() * 6, { club: null }); p.value = calcValue(p); players.push(p); }
  return { leagueName: raw.leagueName || 'Ligue importée', clubs, players };
}

function exportTemplate() {
  const db = DB;
  const out = {
    leagueName: db.leagueName,
    _aide: 'Modifie ce fichier puis importe-le. pos = GB, DC, DG, DD, MDC, MC, MOC, AG, AD, BU. Attributs 1-20 (ou mets juste "ovr": 1-100). photo/logo = URL ou image data:. nat = code pays 3 lettres.',
    clubs: db.clubs.map(c => ({
      name: c.name, short: c.short, colors: c.colors, rep: c.rep, budget: c.budget, stadium: c.stadium, capacity: c.capacity, logo: c.logo,
      players: db.players.filter(p => p.club === c.id).map(p => ({ name: p.name, age: p.age, nat: p.nat, pos: p.pos, pot: p.pot, contract: p.contract, photo: p.photo, attrs: p.attrs }))
    }))
  };
  download('base-ligue.json', out);
}

// ============================================================
//  Écran d'accueil
// ============================================================
function startScreen() {
  LIVE = null;
  const existing = load();
  document.body.className = 'start';
  $('#app').innerHTML = `
  <div class="start-wrap">
    <div class="logo-big">⚽ <b>Manager</b> Foot</div>
    <p class="sub">Prends les commandes d'un club. Effectif, tactique, mercato, matchs en direct.</p>
    ${existing ? `<div class="card cont">
      ${crest(getClub(existing, existing.clubId), 48)}
      <div><b>${esc(getClub(existing, existing.clubId).name)}</b><br><small>Saison ${existing.season}/${existing.season + 1} · Journée ${existing.round + 1}</small></div>
      <button class="btn primary" id="btnCont">Continuer la partie</button>
    </div>` : ''}
    <div class="card">
      <h2>Nouvelle partie</h2>
      <div class="row gap">
        <label>Nom de l'entraîneur <input id="mgr" value="${esc(existing?.managerName || '')}" placeholder="Ton nom"></label>
        <div class="grow"></div>
        <button class="btn" id="btnImp">📂 Importer une base (JSON)</button>
        <button class="btn" id="btnExp">⬇ Exporter la base (modèle)</button>
        ${localStorage.getItem(DB_KEY) ? '<button class="btn" id="btnReset">↺ Base par défaut</button>' : ''}
      </div>
      <p class="hint">Base actuelle : <b>${esc(DB.leagueName)}</b> — ${DB.clubs.length} clubs, ${DB.players.length} joueurs. Clique sur un club pour commencer.</p>
      <div class="club-grid">
        ${[...DB.clubs].sort((a, b) => b.rep - a.rep).map(c => {
          const sq = DB.players.filter(p => p.club === c.id);
          const top = sq.map(playerOvr).sort((a, b) => b - a).slice(0, 11);
          const avg = top.reduce((s, v) => s + v, 0) / (top.length || 1);
          return `<button class="club-pick" data-id="${c.id}" style="--c1:${c.colors[0]};--c2:${c.colors[1]}">
            ${crest(c, 44)}<div><b>${esc(c.name)}</b><small>${stars(avg)} · ${money(c.budget)}</small></div></button>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <h2>Sauvegardes</h2>
      <div class="row gap"><button class="btn" id="btnLoadFile">📂 Charger une sauvegarde (fichier)</button></div>
    </div>
  </div>`;
  $('#btnCont')?.addEventListener('click', () => { G = existing; enterGame(); });
  $('#btnImp').onclick = () => pickFile(raw => {
    try { DB = importDatabase(raw); localStorage.setItem(DB_KEY, JSON.stringify(DB)); toast('Base importée !'); startScreen(); }
    catch (e) { toast('Import impossible : ' + e.message); }
  });
  $('#btnExp').onclick = exportTemplate;
  $('#btnReset')?.addEventListener('click', () => { localStorage.removeItem(DB_KEY); DB = buildDefaultDatabase(); startScreen(); });
  $('#btnLoadFile').onclick = () => pickFile(g => { if (!g.clubs || !g.players) return toast('Ce n\'est pas une sauvegarde.'); reindex(g); NEXT_PID = Math.max(...g.players.map(p => p.id)) + 1; G = g; save(); enterGame(); });
  document.querySelectorAll('.club-pick').forEach(b => b.onclick = () => {
    const id = +b.dataset.id;
    if (existing && !confirm('Une partie existe déjà. L\'écraser ?')) return;
    G = newGame(DB, id, $('#mgr').value.trim() || 'Coach');
    save(); enterGame();
  });
}

// ============================================================
//  Jeu principal
// ============================================================
const NAV = [
  ['inbox', '📨', 'Accueil'], ['squad', '👥', 'Effectif'], ['tactics', '📋', 'Tactique'],
  ['fixtures', '📅', 'Calendrier'], ['table', '🏆', 'Classement'], ['transfers', '💱', 'Transferts'],
  ['finances', '💶', 'Finances'], ['club', '🏟', 'Club'], ['options', '⚙', 'Options']
];

function enterGame() {
  document.body.className = 'game';
  const c = getClub(G, G.clubId);
  document.documentElement.style.setProperty('--club1', c.colors[0]);
  document.documentElement.style.setProperty('--club2', c.colors[1]);
  $('#app').innerHTML = `
    <header id="top"></header>
    <nav id="nav">${NAV.map(([k, i, l]) => `<button data-v="${k}"><span>${i}</span><em>${l}</em></button>`).join('')}</nav>
    <main id="main"></main>`;
  document.querySelectorAll('#nav button').forEach(b => b.onclick = () => show(b.dataset.v));
  show(VIEW);
}

function renderTop() {
  const c = getClub(G, G.clubId);
  const done = G.round >= G.fixtures.length;
  const next = !done ? G.fixtures[G.round].find(f => f.h === G.clubId || f.a === G.clubId) : null;
  const opp = next ? getClub(G, next.h === G.clubId ? next.a : next.h) : null;
  const unread = G.inbox.filter(m => !m.read && !m.world).length;
  $('#top').innerHTML = `
    <div class="tclub">${crest(c, 40)}<div><b>${esc(c.name)}</b><small>${esc(G.managerName)} · ${esc(G.leagueName)}</small></div></div>
    <div class="tinfo"><small>Saison</small><b>${G.season}/${String(G.season + 1).slice(2)}</b></div>
    <div class="tinfo"><small>Journée</small><b>${Math.min(G.round + 1, G.fixtures.length)}/${G.fixtures.length}</b></div>
    <div class="tinfo"><small>Budget</small><b class="${c.budget < 0 ? 'neg' : ''}">${money(c.budget)}</b></div>
    <div class="tinfo"><small>Mercato</small><b>${windowOpen(G) ? '<span class="pos">Ouvert</span>' : 'Fermé'}</b></div>
    <div class="grow"></div>
    ${opp ? `<div class="tnext"><small>Prochain match · ${dateOfRound(G.round)}</small><b>${next.h === G.clubId ? 'vs' : '@'} ${esc(opp.name)}</b></div>` : ''}
    <button class="btn primary big" id="btnGo">${done ? 'Fin de saison ▶' : 'Continuer ▶'}</button>`;
  $('#btnGo').onclick = () => done ? seasonEnd() : prepareMatch();
  const ib = document.querySelector('#nav button[data-v=inbox] span');
  ib.dataset.n = unread || '';
}

function show(v) {
  VIEW = v;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  renderTop();
  const fn = { inbox: vInbox, squad: vSquad, tactics: vTactics, fixtures: vFixtures, table: vTable, transfers: vTransfers, finances: vFinances, club: vClub, options: vOptions }[v];
  $('#main').innerHTML = '';
  fn($('#main'));
  $('#main').scrollTop = 0;
}

// ---------- Accueil / boîte de réception ----------
function vInbox(el) {
  const tbl = standings(G);
  const myRank = tbl.findIndex(t => t.id === G.clubId) + 1;
  const me = tbl[myRank - 1];
  const last = [...G.fixtures].slice(0, G.round).map(r => r.find(f => f.h === G.clubId || f.a === G.clubId)).filter(Boolean).slice(-5);
  const nextFs = G.fixtures.slice(G.round, G.round + 5).map((r, i) => ({ f: r.find(f => f.h === G.clubId || f.a === G.clubId), r: G.round + i })).filter(x => x.f);
  const msgs = G.inbox.filter(m => !m.world).slice(0, 30);
  const world = G.inbox.filter(m => m.world).slice(0, 12);
  el.innerHTML = `
  <div class="grid2">
    <section class="card">
      <h2>📨 Messages</h2>
      ${G.offers.length ? `<div class="alert">💱 ${G.offers.length} offre(s) de transfert en attente. <a href="#" onclick="show('transfers');return false">Voir</a></div>` : ''}
      <ul class="inbox">${msgs.map(m => `<li class="${m.read ? '' : 'unread'} t-${m.type}"><small>${m.round >= G.fixtures.length ? 'Fin de saison' : 'J' + (m.round + 1)} · ${m.season}</small>${esc(m.text)}</li>`).join('') || '<li>Aucun message.</li>'}</ul>
    </section>
    <div class="col">
      <section class="card">
        <h2>Situation</h2>
        <div class="kpis">
          <div><small>Classement</small><b>${myRank}<sup>e</sup></b></div>
          <div><small>Points</small><b>${me.pts}</b></div>
          <div><small>Objectif</small><b>Top ${G.objective}</b></div>
          <div><small>Forme</small><b class="form">${me.form.slice(-5).map(r => `<i class="f${r}">${r}</i>`).join('') || '-'}</b></div>
        </div>
      </section>
      <section class="card">
        <h2>Prochains matchs</h2>
        <table class="tbl">${nextFs.map(({ f, r }) => { const home = f.h === G.clubId; const o = getClub(G, home ? f.a : f.h); return `<tr><td>J${r + 1}</td><td>${dateOfRound(r)}</td><td>${home ? 'Dom.' : 'Ext.'}</td><td>${crest(o, 20)} ${esc(o.name)}</td></tr>`; }).join('') || '<tr><td>Saison terminée</td></tr>'}</table>
        ${last.length ? `<h3>Derniers résultats</h3><table class="tbl">${last.map(f => resultRow(f)).join('')}</table>` : ''}
      </section>
      <section class="card">
        <h2>🌍 Actualité de la ligue</h2>
        <ul class="inbox small">${world.map(m => `<li><small>${m.round >= G.fixtures.length ? 'Fin de saison' : 'J' + (m.round + 1)}</small>${esc(m.text)}</li>`).join('') || '<li>Rien pour l\'instant.</li>'}</ul>
      </section>
    </div>
  </div>`;
  G.inbox.forEach(m => m.read = true);
  setTimeout(() => { const s = document.querySelector('#nav button[data-v=inbox] span'); if (s) s.dataset.n = ''; }, 0);
}
function resultRow(f) {
  const H = getClub(G, f.h), A = getClub(G, f.a);
  let cls = '';
  if (f.res && (f.h === G.clubId || f.a === G.clubId)) {
    const d = (f.h === G.clubId ? 1 : -1) * (f.res[0] - f.res[1]);
    cls = d > 0 ? 'win' : d < 0 ? 'loss' : 'draw';
  }
  return `<tr class="${cls}"><td class="r">${esc(H.name)} ${crest(H, 18)}</td><td class="sc">${f.res ? f.res.join(' - ') : '-'}</td><td>${crest(A, 18)} ${esc(A.name)}</td></tr>`;
}

// ---------- Effectif ----------
let SQUAD_SORT = { k: 'pos', d: 1 };
const POS_ORDER = Object.keys(ROLES);
function vSquad(el, clubId = G.clubId) {
  const mine = clubId === G.clubId;
  const club = getClub(G, clubId);
  let list = clubPlayers(G, clubId);
  const key = SQUAD_SORT.k, d = SQUAD_SORT.d;
  const val = p => ({ pos: POS_ORDER.indexOf(p.pos) * 1000 - playerOvr(p), name: p.name, age: p.age, ovr: playerOvr(p), pot: p.pot, fit: p.fit, mor: p.morale, val: p.value, wage: p.wage, apps: p.stats.apps, goals: p.stats.goals, rat: p.stats.apps ? p.stats.rating / p.stats.apps : 0 })[key];
  list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * d);
  const inXI = new Set(mine ? G.tactics.lineup : []);
  const th = (k, l) => `<th data-k="${k}" class="${key === k ? 'sorted' : ''}">${l}</th>`;
  el.innerHTML = `<section class="card">
    <h2>${crest(club, 28)} Effectif — ${esc(club.name)} <small>(${list.length} joueurs)</small></h2>
    <div class="scroll"><table class="tbl players">
      <thead><tr><th></th>${th('name', 'Joueur')}${th('pos', 'Poste')}${th('age', 'Âge')}<th>Nat.</th>${th('ovr', 'Note')}${th('pot', 'Potentiel')}${th('fit', 'Condition')}${th('mor', 'Moral')}${th('apps', 'MJ')}${th('goals', 'Buts')}${th('rat', 'Moy.')}${th('val', 'Valeur')}${th('wage', 'Salaire/sem')}<th>Contrat</th><th></th></tr></thead>
      <tbody>${list.map(p => `<tr data-pid="${p.id}" class="${inXI.has(p.id) ? 'xi' : ''}">
        <td>${avatar(p, 32)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${p.age}</td><td>${natFlag(p.nat)}</td>
        <td>${ovrBadge(playerOvr(p))}</td><td>${stars(p.pot)}</td><td>${bar(p.fit, 100, p.fit < 70 ? 'low' : '')}</td><td>${bar(p.morale, 100, 'mor')}</td>
        <td>${p.stats.apps}</td><td>${p.stats.goals}</td><td>${p.stats.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '-'}</td>
        <td>${money(p.value)}</td><td>${money(p.wage)}</td><td>${p.contract} an${p.contract > 1 ? 's' : ''}</td><td>${status(p)}</td></tr>`).join('')}</tbody>
    </table></div></section>`;
  el.querySelectorAll('th[data-k]').forEach(t => t.onclick = () => { SQUAD_SORT = { k: t.dataset.k, d: SQUAD_SORT.k === t.dataset.k ? -SQUAD_SORT.d : (['name', 'pos', 'age'].includes(t.dataset.k) ? 1 : -1) }; vSquad(el, clubId); });
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}

function playerModal(pid) {
  const p = getPlayer(G, pid);
  const club = p.club != null ? getClub(G, p.club) : null;
  const mine = p.club === G.clubId;
  const ovr = playerOvr(p);
  const best = Object.keys(ROLES).map(r => [r, playerRoleRating(p, r) * familiarity(p, r)]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  modal(`
  <div class="pm-head">${avatar(p, 96)}
    <div><h2>${esc(p.name)}</h2>
      <p>${ROLES[p.pos].label} · ${p.age} ans · ${natFlag(p.nat)} ${esc(NATIONS.find(n => n[0] === p.nat)?.[1] || p.nat)} · Pied ${p.foot.toLowerCase()}</p>
      <p>${club ? crest(club, 20) + ' ' + esc(club.name) : '<i>Agent libre</i>'} ${status(p)}</p>
    </div>
    <div class="pm-ovr">${ovrBadge(ovr)}<small>Potentiel</small>${stars(p.pot)}</div>
  </div>
  <div class="grid2">
    <div><h3>Attributs</h3>${Object.entries(ATTRS).filter(([k]) => p.pos === 'GB' || k !== 'gar').map(([k, l]) => `<div class="attr"><span>${l}</span>${bar(p.attrs[k], 20, 'a' + Math.ceil(p.attrs[k] / 5))}<b>${p.attrs[k]}</b></div>`).join('')}</div>
    <div><h3>Infos</h3>
      <table class="tbl kv">
        <tr><td>Valeur</td><td>${money(p.value)}</td></tr>
        <tr><td>Salaire</td><td>${money(p.wage)} / sem.</td></tr>
        <tr><td>Contrat</td><td>${p.contract} saison(s)</td></tr>
        <tr><td>Condition</td><td>${bar(p.fit)} ${Math.round(p.fit)}%</td></tr>
        <tr><td>Moral</td><td>${bar(p.morale, 100, 'mor')} ${Math.round(p.morale)}%</td></tr>
        <tr><td>Saison</td><td>${p.stats.apps} MJ · ${p.stats.goals} buts · ${p.stats.assists} passes · ${p.stats.apps ? (p.stats.rating / p.stats.apps).toFixed(2) : '-'} moy.</td></tr>
        <tr><td>Meilleurs postes</td><td>${best.map(([r, v]) => `${r} ${ovrBadge(v)}`).join(' ')}</td></tr>
      </table>
      <div class="row gap wrap mt">
        ${mine ? `
          <button class="btn" onclick="toggleList(${p.id})">${p.listed ? 'Retirer de la liste' : 'Mettre sur la liste des transferts'}</button>
          <button class="btn" onclick="renewModal(${p.id})">Prolonger le contrat</button>
          <button class="btn danger" onclick="releasePlayer(${p.id})">Libérer</button>` :
          `<button class="btn primary" onclick="offerModal(${p.id})">${club ? 'Faire une offre' : 'Proposer un contrat'}</button>
           ${club ? `<button class="btn" onclick="closeModal();VIEW='x';viewClub(${club.id})">Voir le club</button>` : ''}`}
      </div>
    </div>
  </div>`, 'wide');
}
function toggleList(pid) { const p = getPlayer(G, pid); p.listed = !p.listed; save(); closeModal(); show(VIEW); toast(p.listed ? `${p.name} est sur la liste des transferts.` : `${p.name} retiré de la liste.`); }
function releasePlayer(pid) {
  const p = getPlayer(G, pid);
  const cost = p.wage * 52 * p.contract * .5;
  if (!confirm(`Libérer ${p.name} ? Indemnité : ${money(cost)}.`)) return;
  const c = getClub(G, G.clubId); c.budget -= cost; p.club = null; p.listed = false; p.contract = 0;
  removeFromTactics(pid); save(); closeModal(); show(VIEW);
}
function renewModal(pid) {
  const p = getPlayer(G, pid);
  const ask = roundMoney(calcWage(p) * (1.05 + (p.morale < 50 ? .3 : 0)));
  modal(`<h2>Prolonger ${esc(p.name)}</h2>
    <p>Demande : <b>${money(ask)}</b>/sem. (actuel ${money(p.wage)})</p>
    <label>Durée <select id="yrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === 3 ? 'selected' : ''}>${y}</option>`).join('')}</select> saison(s)</label>
    <label>Salaire proposé (€/sem.) <input id="wg" type="number" step="1000" value="${ask}"></label>
    <div class="row gap mt"><button class="btn primary" id="ok">Proposer</button></div>`);
  $('#ok').onclick = () => {
    const w = +$('#wg').value, y = +$('#yrs').value;
    if (w >= ask * .92 || (w >= ask * .8 && rnd() < .5)) {
      p.wage = w; p.contract = y; p.morale = clamp(p.morale + 10, 0, 100); save(); closeModal(); toast(`${p.name} prolonge de ${y} saison(s) !`); show(VIEW);
    } else { p.morale = clamp(p.morale - 5, 0, 100); toast(`${p.name} refuse ton offre.`); }
  };
}
function removeFromTactics(pid) {
  G.tactics.lineup = G.tactics.lineup.map(id => id === pid ? null : id);
  G.tactics.bench = G.tactics.bench.filter(id => id !== pid);
}

// ---------- Tactique ----------
let SEL = null; // {type:'xi'|'bench', idx}
function vTactics(el) {
  const T = G.tactics;
  const slots = FORMATIONS[T.formation];
  const squad = clubPlayers(G, G.clubId).sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || playerOvr(b) - playerOvr(a));
  const used = new Set([...T.lineup, ...T.bench]);
  const side = makeSide(G, G.clubId, T);
  const S = teamStrength(G, side);
  const selRole = SEL?.type === 'xi' ? slots[SEL.idx][0] : null;
  el.innerHTML = `
  <div class="tac-wrap">
    <section class="card">
      <div class="row gap wrap">
        <label>Formation <select id="form">${Object.keys(FORMATIONS).map(f => `<option ${f === T.formation ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>Mentalité <select id="ment">${MENTALITIES.map(m => `<option value="${m.v}" ${m.v === T.mentality ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
        <div class="grow"></div>
        <button class="btn" id="auto">⚡ Composition auto</button>
      </div>
      <div class="pitch">
        <div class="lines"></div>
        ${slots.map(([role, x, y], i) => {
          const p = T.lineup[i] ? getPlayer(G, T.lineup[i]) : null;
          const r = p ? effRating(p, role) : 0;
          const bad = p && (!available(p) || familiarity(p, role) < .9);
          return `<div class="slot ${SEL?.type === 'xi' && SEL.idx === i ? 'sel' : ''} ${bad ? 'bad' : ''}" data-i="${i}" style="left:${x}%;top:${y}%">
            ${p ? avatar(p, 42) : '<div class="empty">+</div>'}
            <div class="sl-role">${role}${p ? ' ' + ovrBadge(r) : ''}</div>
            <div class="sl-name">${p ? esc(p.name.split(' ').slice(-1)[0]) : '—'}</div>
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
        return `<div class="bslot ${SEL?.type === 'bench' && SEL.idx === i ? 'sel' : ''}" data-b="${i}">${p ? avatar(p, 30) + `<span>${p.pos} ${esc(p.name.split(' ').slice(-1)[0])}</span>${ovrBadge(playerOvr(p))}` : '<span class="muted">+ vide</span>'}</div>`;
      }).join('')}</div>
      <p class="hint">Clique une place (terrain ou banc), puis un joueur à droite. Clique deux places pour les échanger.</p>
    </section>
    <section class="card">
      <h2>Joueurs ${selRole ? `<small>— note au poste ${selRole}</small>` : ''}</h2>
      <div class="scroll"><table class="tbl players compact">
        <thead><tr><th></th><th>Joueur</th><th>Poste</th><th>Note</th>${selRole ? `<th>${selRole}</th>` : ''}<th>Cond.</th><th></th></tr></thead>
        <tbody>${squad.map(p => `<tr data-pid="${p.id}" class="${T.lineup.includes(p.id) ? 'xi' : T.bench.includes(p.id) ? 'bn' : ''} ${available(p) ? '' : 'unav'}">
          <td>${avatar(p, 26)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${ovrBadge(playerOvr(p))}</td>
          ${selRole ? `<td>${ovrBadge(effRating(p, selRole))}</td>` : ''}
          <td>${bar(p.fit, 100, p.fit < 70 ? 'low' : '')}</td><td>${T.lineup.includes(p.id) ? '<span class="tag grn">Titulaire</span>' : T.bench.includes(p.id) ? '<span class="tag">Banc</span>' : ''} ${status(p)}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>
  </div>`;
  $('#form').onchange = e => {
    const old = FORMATIONS[T.formation], nw = FORMATIONS[e.target.value];
    // essaie de garder les joueurs aux postes équivalents
    const pool = T.lineup.filter(Boolean);
    const newL = new Array(nw.length).fill(null);
    const left = [...pool];
    nw.forEach(([r], i) => { const j = left.findIndex(id => getPlayer(G, id).pos === r); if (j >= 0) { newL[i] = left[j]; left.splice(j, 1); } });
    nw.forEach(([r], i) => { if (!newL[i] && left.length) { let bj = 0, bv = -1; left.forEach((id, j) => { const v = effRating(getPlayer(G, id), r); if (v > bv) { bv = v; bj = j; } }); newL[i] = left.splice(bj, 1)[0]; } });
    T.formation = e.target.value; T.lineup = newL; SEL = null; save(); vTactics(el);
  };
  $('#ment').onchange = e => { T.mentality = +e.target.value; save(); };
  $('#auto').onclick = () => { Object.assign(T, autoLineup(G, G.clubId, T.formation)); SEL = null; save(); vTactics(el); };
  const swap = (a, b) => {
    const get = s => s.type === 'xi' ? T.lineup[s.idx] : T.bench[s.idx] ?? null;
    const set = (s, v) => { if (s.type === 'xi') T.lineup[s.idx] = v; else T.bench[s.idx] = v; };
    const va = get(a), vb = get(b); set(a, vb); set(b, va);
    T.bench = T.bench.filter(x => x != null);
  };
  el.querySelectorAll('.slot').forEach(s => s.onclick = () => {
    const cur = { type: 'xi', idx: +s.dataset.i };
    if (SEL && !(SEL.type === cur.type && SEL.idx === cur.idx)) { swap(SEL, cur); SEL = null; save(); }
    else SEL = SEL ? null : cur;
    vTactics(el);
  });
  el.querySelectorAll('.bslot').forEach(s => s.onclick = () => {
    const cur = { type: 'bench', idx: Math.min(+s.dataset.b, T.bench.length) };
    if (SEL && !(SEL.type === cur.type && SEL.idx === cur.idx)) { swap(SEL, cur); SEL = null; save(); }
    else SEL = SEL ? null : cur;
    vTactics(el);
  });
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => {
    const pid = +r.dataset.pid;
    if (!SEL) return playerModal(pid);
    // retire le joueur de son ancienne place
    const oldXI = T.lineup.indexOf(pid), oldB = T.bench.indexOf(pid);
    const target = SEL.type === 'xi' ? T.lineup[SEL.idx] : T.bench[SEL.idx];
    if (oldXI >= 0) T.lineup[oldXI] = target ?? null;
    if (oldB >= 0) { if (target != null) T.bench[oldB] = target; else T.bench.splice(oldB, 1); }
    if (SEL.type === 'xi') T.lineup[SEL.idx] = pid;
    else { if (SEL.idx < T.bench.length && oldB < 0) T.bench[SEL.idx] = pid; else if (oldB < 0) { if (T.bench.length < 9) T.bench.push(pid); } }
    T.bench = T.bench.filter((x, i, a) => x != null && a.indexOf(x) === i && !T.lineup.includes(x)).slice(0, 9);
    SEL = null; save(); vTactics(el);
  });
}

// ---------- Calendrier ----------
let FIX_ROUND = null;
function vFixtures(el) {
  if (FIX_ROUND == null) FIX_ROUND = Math.max(0, Math.min(G.round - 1, G.fixtures.length - 1));
  const mine = G.fixtures.map((r, i) => ({ f: r.find(f => f.h === G.clubId || f.a === G.clubId), i }));
  el.innerHTML = `<div class="grid2">
    <section class="card"><h2>📅 Mes matchs</h2><div class="scroll"><table class="tbl">
      ${mine.map(({ f, i }) => { const home = f.h === G.clubId; const o = getClub(G, home ? f.a : f.h); let cls = ''; if (f.res) { const d = (home ? 1 : -1) * (f.res[0] - f.res[1]); cls = d > 0 ? 'win' : d < 0 ? 'loss' : 'draw'; }
        return `<tr class="${cls} ${i === G.round ? 'next' : ''}" data-r="${i}"><td>J${i + 1}</td><td>${dateOfRound(i)}</td><td>${home ? 'Dom.' : 'Ext.'}</td><td>${crest(o, 20)} ${esc(o.name)}</td><td class="sc">${f.res ? (home ? f.res.join('-') : f.res.slice().reverse().join('-')) : ''}</td></tr>`; }).join('')}
    </table></div></section>
    <section class="card"><h2>Journée <select id="rsel">${G.fixtures.map((_, i) => `<option value="${i}" ${i === FIX_ROUND ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></h2>
      <table class="tbl">${G.fixtures[FIX_ROUND].map(f => resultRow(f) + (f.events?.length ? `<tr class="ev"><td colspan="3">${f.events.filter(e => e.t === 'goal').map(e => `⚽ ${e.m}' ${esc(getPlayer(G, e.p)?.name || '?')}`).join(' · ')}</td></tr>` : '')).join('')}</table>
    </section></div>`;
  $('#rsel').onchange = e => { FIX_ROUND = +e.target.value; vFixtures(el); };
  el.querySelectorAll('tr[data-r]').forEach(r => r.onclick = () => { FIX_ROUND = +r.dataset.r; vFixtures(el); });
}

// ---------- Classement ----------
function vTable(el) {
  const t = standings(G);
  const n = t.length;
  const scorers = topScorers(G, 15);
  const assists = G.players.filter(p => p.club != null && p.stats.assists > 0).sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 10);
  const rated = G.players.filter(p => p.club != null && p.stats.apps >= Math.max(3, G.round / 3)).sort((a, b) => b.stats.rating / b.stats.apps - a.stats.rating / a.stats.apps).slice(0, 10);
  el.innerHTML = `<div class="grid2 wide-left">
  <section class="card"><h2>🏆 ${esc(G.leagueName)} ${G.season}/${G.season + 1}</h2>
    <div class="scroll"><table class="tbl standings"><thead><tr><th>#</th><th>Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>BP</th><th>BC</th><th>Diff</th><th>Pts</th><th>Forme</th></tr></thead>
    <tbody>${t.map((r, i) => { const c = getClub(G, r.id); const zone = i < 3 ? 'z-cl' : i < 5 ? 'z-el' : i >= n - 3 ? 'z-rel' : '';
      return `<tr class="${zone} ${r.id === G.clubId ? 'me' : ''}" data-c="${c.id}"><td>${i + 1}</td><td class="nm">${crest(c, 20)} ${esc(c.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td><td class="form">${r.form.slice(-5).map(x => `<i class="f${x}">${x}</i>`).join('')}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint"><span class="lg z-cl"></span> Coupe continentale <span class="lg z-el"></span> Coupe secondaire <span class="lg z-rel"></span> Zone rouge</p>
  </section>
  <div class="col">
    <section class="card"><h2>⚽ Buteurs</h2><table class="tbl">${scorers.map((p, i) => `<tr data-pid="${p.id}"><td>${i + 1}</td><td>${avatar(p, 22)}</td><td class="nm">${esc(p.name)}</td><td>${crest(getClub(G, p.club), 16)}</td><td><b>${p.stats.goals}</b></td></tr>`).join('') || '<tr><td>-</td></tr>'}</table></section>
    <section class="card"><h2>🅰 Passeurs</h2><table class="tbl">${assists.map((p, i) => `<tr data-pid="${p.id}"><td>${i + 1}</td><td class="nm">${esc(p.name)}</td><td>${crest(getClub(G, p.club), 16)}</td><td><b>${p.stats.assists}</b></td></tr>`).join('') || '<tr><td>-</td></tr>'}</table></section>
    <section class="card"><h2>⭐ Meilleures notes</h2><table class="tbl">${rated.map((p, i) => `<tr data-pid="${p.id}"><td>${i + 1}</td><td class="nm">${esc(p.name)}</td><td>${crest(getClub(G, p.club), 16)}</td><td><b>${(p.stats.rating / p.stats.apps).toFixed(2)}</b></td></tr>`).join('') || '<tr><td>-</td></tr>'}</table></section>
  </div></div>`;
  el.querySelectorAll('tr[data-c]').forEach(r => r.onclick = () => viewClub(+r.dataset.c));
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}
function viewClub(id) {
  if (id === G.clubId) return show('squad');
  VIEW = 'x';
  document.querySelectorAll('#nav button').forEach(b => b.classList.remove('on'));
  const el = $('#main'); el.innerHTML = '';
  const c = getClub(G, id);
  const info = document.createElement('div');
  info.innerHTML = `<section class="card row gap">${crest(c, 64)}<div><h2>${esc(c.name)}</h2><p>${esc(c.stadium)} (${c.capacity.toLocaleString('fr-FR')} places) · Réputation ${stars(c.rep)} · Budget ${money(c.budget)} · Formation ${c.formation || '?'}</p></div></section>`;
  el.appendChild(info);
  const sq = document.createElement('div'); el.appendChild(sq);
  vSquad(sq, id);
}

// ---------- Transferts ----------
let TF = { q: '', pos: '', maxv: '', maxage: '', free: false };
function vTransfers(el) {
  const club = getClub(G, G.clubId);
  let list = G.players.filter(p => p.club !== G.clubId);
  if (TF.q) list = list.filter(p => p.name.toLowerCase().includes(TF.q.toLowerCase()));
  if (TF.pos) list = list.filter(p => p.pos === TF.pos);
  if (TF.maxv) list = list.filter(p => p.value <= +TF.maxv * 1e6);
  if (TF.maxage) list = list.filter(p => p.age <= +TF.maxage);
  if (TF.free) list = list.filter(p => p.club == null || p.listed);
  list.sort((a, b) => playerOvr(b) - playerOvr(a));
  const shown = list.slice(0, 150);
  const myListed = clubPlayers(G, G.clubId).filter(p => p.listed);
  el.innerHTML = `
  ${G.offers.length ? `<section class="card"><h2>📩 Offres reçues</h2><table class="tbl">${G.offers.map(o => { const p = getPlayer(G, o.pid), c = getClub(G, o.club); return `<tr><td>${avatar(p, 28)}</td><td class="nm">${esc(p.name)}</td><td>${ovrBadge(playerOvr(p))}</td><td>${crest(c, 20)} ${esc(c.name)}</td><td><b>${money(o.fee)}</b> <small>(valeur ${money(p.value)})</small></td><td><button class="btn primary sm" data-acc="${o.id}">Accepter</button> <button class="btn sm" data-rej="${o.id}">Refuser</button></td></tr>`; }).join('')}</table></section>` : ''}
  <section class="card">
    <h2>💱 Marché des transferts ${windowOpen(G) ? '<span class="tag grn">Mercato ouvert</span>' : '<span class="tag red">Mercato fermé (agents libres seulement)</span>'}</h2>
    <p>Budget : <b>${money(club.budget)}</b> · Effectif : ${clubPlayers(G, G.clubId).length}/32 ${myListed.length ? `· Sur la liste : ${myListed.map(p => esc(p.name)).join(', ')}` : ''}</p>
    <div class="row gap wrap filters">
      <input id="fq" placeholder="Nom…" value="${esc(TF.q)}">
      <select id="fpos"><option value="">Tous postes</option>${Object.keys(ROLES).map(r => `<option ${r === TF.pos ? 'selected' : ''} value="${r}">${r} — ${ROLES[r].label}</option>`).join('')}</select>
      <input id="fmv" type="number" placeholder="Valeur max (M€)" value="${esc(TF.maxv)}">
      <input id="fage" type="number" placeholder="Âge max" value="${esc(TF.maxage)}">
      <label class="chk"><input type="checkbox" id="ffree" ${TF.free ? 'checked' : ''}> Libres / à vendre</label>
    </div>
    <div class="scroll"><table class="tbl players">
      <thead><tr><th></th><th>Joueur</th><th>Poste</th><th>Âge</th><th>Nat.</th><th>Note</th><th>Potentiel</th><th>Club</th><th>Valeur</th><th>Salaire</th><th></th></tr></thead>
      <tbody>${shown.map(p => { const c = p.club != null ? getClub(G, p.club) : null; return `<tr data-pid="${p.id}">
        <td>${avatar(p, 30)}</td><td class="nm">${esc(p.name)}</td><td><span class="pos-${ROLES[p.pos].line}">${p.pos}</span></td><td>${p.age}</td><td>${natFlag(p.nat)}</td><td>${ovrBadge(playerOvr(p))}</td><td>${stars(p.pot)}</td>
        <td>${c ? crest(c, 18) + ' ' + esc(c.short) : '<i>Libre</i>'}</td><td>${c ? money(p.value) : '-'}</td><td>${money(p.wage)}</td><td>${status(p)}</td></tr>`; }).join('')}</tbody>
    </table></div>
    <p class="hint">${list.length} joueurs trouvés${list.length > 150 ? ' (150 affichés)' : ''}. Clique un joueur pour faire une offre.</p>
  </section>`;
  const upd = () => { TF = { q: $('#fq').value, pos: $('#fpos').value, maxv: $('#fmv').value, maxage: $('#fage').value, free: $('#ffree').checked }; vTransfers(el); };
  $('#fq').onchange = upd; $('#fpos').onchange = upd; $('#fmv').onchange = upd; $('#fage').onchange = upd; $('#ffree').onchange = upd;
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
  el.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => acceptOffer(+b.dataset.acc));
  el.querySelectorAll('[data-rej]').forEach(b => b.onclick = () => { G.offers = G.offers.filter(o => o.id !== +b.dataset.rej); save(); vTransfers(el); });
}
function acceptOffer(oid) {
  const o = G.offers.find(o => o.id === oid); if (!o) return;
  const p = getPlayer(G, o.pid), buyer = getClub(G, o.club), me = getClub(G, G.clubId);
  if (buyer.budget < o.fee) { toast(`${buyer.name} n'a plus les fonds.`); G.offers = G.offers.filter(x => x !== o); return show('transfers'); }
  buyer.budget -= o.fee; me.budget += o.fee; G.fin.transfersOut += o.fee;
  p.club = buyer.id; p.listed = false; p.contract = rint(2, 5);
  removeFromTactics(p.id);
  G.offers = G.offers.filter(x => x.pid !== p.id);
  news(G, `${p.name} est transféré à ${buyer.name} pour ${money(o.fee)}.`, 'transfer');
  save(); toast(`${p.name} vendu ${money(o.fee)} !`); show('transfers');
}
function offerModal(pid) {
  const p = getPlayer(G, pid);
  const seller = p.club != null ? getClub(G, p.club) : null;
  const me = getClub(G, G.clubId);
  if (seller && !windowOpen(G)) return toast('Mercato fermé : seuls les agents libres peuvent signer.');
  if (clubPlayers(G, G.clubId).length >= 32) return toast('Effectif complet (32 joueurs max). Vends ou libère quelqu\'un.');
  const wageAsk = roundMoney(calcWage(p) * (1.1 + Math.max(0, playerOvr(p) - me.rep) / 40));
  modal(`<h2>${seller ? 'Offre pour' : 'Contrat pour'} ${esc(p.name)}</h2>
    <p>${seller ? `${crest(seller, 20)} ${esc(seller.name)} · Valeur estimée <b>${money(p.value)}</b>` : 'Agent libre — aucune indemnité.'}</p>
    <p>Budget : <b>${money(me.budget)}</b></p>
    ${seller ? `<label>Indemnité (€) <input id="fee" type="number" step="100000" value="${p.value}"></label>` : ''}
    <label>Salaire proposé (€/sem.) <input id="wg" type="number" step="1000" value="${wageAsk}"></label>
    <label>Durée <select id="yrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === 3 ? 'selected' : ''}>${y}</option>`).join('')}</select> saison(s)</label>
    <div class="row gap mt"><button class="btn primary" id="ok">Envoyer l'offre</button></div>
    <p class="hint" id="resp"></p>`);
  $('#ok').onclick = () => {
    const fee = seller ? +$('#fee').value : 0, w = +$('#wg').value, y = +$('#yrs').value;
    if (fee > me.budget) return $('#resp').textContent = 'Budget insuffisant.';
    const resp = m => $('#resp').innerHTML = m;
    if (seller) {
      const sq = clubPlayers(G, seller.id);
      const rank = sq.map(playerOvr).sort((a, b) => b - a).indexOf(playerOvr(p));
      const key = rank < 11 ? .35 : rank < 16 ? .12 : 0;
      const ask = p.value * (p.listed ? .85 : 1.05 + key) * (seller.rep > me.rep + 10 ? 1.25 : 1);
      if (sq.length <= 18) return resp(`❌ ${esc(seller.name)} refuse : effectif trop court.`);
      if (fee < ask * .85) return resp(`❌ ${esc(seller.name)} refuse. Ils veulent environ <b>${money(roundMoney(ask))}</b>.`);
      if (fee < ask && rnd() < .6) return resp(`❌ Offre jugée insuffisante. Essaie autour de <b>${money(roundMoney(ask))}</b>.`);
    }
    // le joueur accepte-t-il ?
    const repGap = playerOvr(p) - me.rep;
    if (repGap > 18 && rnd() < .7) return resp(`❌ ${esc(p.name)} ne veut pas rejoindre un club de ce niveau.`);
    if (w < wageAsk * .9) return resp(`❌ ${esc(p.name)} refuse le salaire. Il demande ~<b>${money(wageAsk)}</b>/sem.`);
    me.budget -= fee; if (seller) seller.budget += fee;
    G.fin.transfersIn += fee;
    p.club = G.clubId; p.wage = w; p.contract = y; p.listed = false; p.morale = 85;
    if (G.tactics.bench.length < 9) G.tactics.bench.push(p.id);
    news(G, `Officiel : ${p.name} signe pour ${y} saison(s)${seller ? ` en provenance de ${seller.name} (${money(fee)})` : ''} !`, 'transfer');
    save(); closeModal(); toast(`${p.name} a signé ! 🎉`); show(VIEW === 'x' ? 'transfers' : VIEW);
  };
}

// ---------- Finances ----------
function vFinances(el) {
  const c = getClub(G, G.clubId);
  const squad = clubPlayers(G, G.clubId);
  const wages = squad.reduce((s, p) => s + p.wage, 0);
  const sqVal = squad.reduce((s, p) => s + p.value, 0);
  const f = G.fin;
  const top = [...squad].sort((a, b) => b.wage - a.wage).slice(0, 10);
  el.innerHTML = `<div class="grid2">
    <section class="card"><h2>💶 Finances</h2>
      <div class="kpis"><div><small>Budget</small><b class="${c.budget < 0 ? 'neg' : ''}">${money(c.budget)}</b></div><div><small>Masse salariale / sem.</small><b>${money(wages)}</b></div><div><small>Valeur de l'effectif</small><b>${money(sqVal)}</b></div></div>
      <h3>Saison en cours</h3>
      <table class="tbl kv">
        <tr><td>Billetterie</td><td class="pos">+${money(f.gate)}</td></tr>
        <tr><td>Droits TV (fin de saison)</td><td class="pos">+${money(f.tv)}</td></tr>
        <tr><td>Ventes de joueurs</td><td class="pos">+${money(f.transfersOut)}</td></tr>
        <tr><td>Salaires versés</td><td class="neg">-${money(f.wages)}</td></tr>
        <tr><td>Achats de joueurs</td><td class="neg">-${money(f.transfersIn)}</td></tr>
        <tr><td><b>Solde</b></td><td><b>${money(f.gate + f.tv + f.transfersOut - f.wages - f.transfersIn)}</b></td></tr>
      </table>
      <p class="hint">Recettes : billetterie à chaque match à domicile (${esc(c.stadium)}, ${c.capacity.toLocaleString('fr-FR')} places) et droits TV selon le classement final. Si le budget reste négatif, le président s'impatiente…</p>
    </section>
    <section class="card"><h2>Plus gros salaires</h2><table class="tbl">${top.map(p => `<tr data-pid="${p.id}"><td>${avatar(p, 24)}</td><td class="nm">${esc(p.name)}</td><td>${money(p.wage)}/sem.</td><td>${p.contract} an(s)</td></tr>`).join('')}</table></section>
  </div>`;
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
}

// ---------- Club ----------
function vClub(el) {
  const c = getClub(G, G.clubId);
  el.innerHTML = `<div class="grid2">
    <section class="card"><div class="row gap">${crest(c, 80)}<div><h2>${esc(c.name)}</h2><p>${esc(c.stadium)} · ${c.capacity.toLocaleString('fr-FR')} places</p><p>Réputation ${stars(c.rep)}</p></div></div>
      <h3>Objectif du président</h3><p>Terminer dans le <b>top ${G.objective}</b>.</p>
      <h3>Personnaliser le club</h3>
      <div class="row gap wrap">
        <label>Couleur 1 <input type="color" id="c1" value="${c.colors[0]}"></label>
        <label>Couleur 2 <input type="color" id="c2" value="${c.colors[1]}"></label>
        <label class="grow">Logo (URL ou vide) <input id="logo" value="${esc(c.logo || '')}" placeholder="https://… ou laisser vide"></label>
        <button class="btn" id="svc">Enregistrer</button>
      </div>
    </section>
    <section class="card"><h2>📜 Palmarès / historique</h2>
      <table class="tbl">${G.history.map(h => `<tr><td>${h.season}/${h.season + 1}</td><td>${h.rank}<sup>e</sup> (${h.pts} pts)</td><td>Champion : ${esc(h.champion)}</td><td>${h.rank <= h.objective ? '✅' : '❌'} obj. top ${h.objective}</td></tr>`).join('') || '<tr><td>Première saison en cours.</td></tr>'}</table>
    </section></div>`;
  $('#svc').onclick = () => { c.colors = [$('#c1').value, $('#c2').value]; c.logo = $('#logo').value.trim() || null; save(); enterGame(); toast('Club mis à jour.'); };
}

// ---------- Options ----------
function vOptions(el) {
  el.innerHTML = `<section class="card"><h2>⚙ Options</h2>
    <div class="row gap wrap">
      <button class="btn" id="o1">💾 Sauvegarder</button>
      <button class="btn" id="o2">⬇ Exporter la sauvegarde (fichier)</button>
      <button class="btn" id="o3">🏠 Menu principal</button>
      <button class="btn danger" id="o4">🗑 Supprimer la partie</button>
    </div>
    <p class="hint">La partie est sauvegardée automatiquement dans ton navigateur après chaque match. Exporte un fichier pour la garder en sécurité ou la transférer sur un autre PC.</p>
  </section>`;
  $('#o1').onclick = () => { save(); toast('Partie sauvegardée.'); };
  $('#o2').onclick = () => { const { pmap, ...rest } = G; download(`manager-foot-${G.season}-J${G.round + 1}.json`, rest); };
  $('#o3').onclick = () => { save(); startScreen(); };
  $('#o4').onclick = () => { if (confirm('Supprimer définitivement la partie ?')) { localStorage.removeItem(SAVE_KEY); G = null; startScreen(); } };
}

// ============================================================
//  Match en direct
// ============================================================
function validateLineup() {
  const T = G.tactics;
  const mine = new Set(clubPlayers(G, G.clubId).map(p => p.id));
  const problems = [];
  T.lineup = T.lineup.map(id => { if (id && (!mine.has(id) || !available(getPlayer(G, id)))) { problems.push(getPlayer(G, id)?.name); return null; } return id; });
  T.bench = T.bench.filter(id => mine.has(id) && available(getPlayer(G, id)) && !T.lineup.includes(id));
  if (T.lineup.some(x => !x)) {
    // complète les trous avec le meilleur dispo
    const used = new Set([...T.lineup, ...T.bench]);
    FORMATIONS[T.formation].forEach(([r], i) => {
      if (T.lineup[i]) return;
      const cands = clubPlayers(G, G.clubId).filter(p => available(p) && !T.lineup.includes(p.id));
      cands.sort((a, b) => effRating(b, r) - effRating(a, r));
      if (cands[0]) { T.lineup[i] = cands[0].id; T.bench = T.bench.filter(x => x !== cands[0].id); }
    });
    for (const p of clubPlayers(G, G.clubId)) if (T.bench.length < 9 && available(p) && !T.lineup.includes(p.id) && !T.bench.includes(p.id)) T.bench.push(p.id);
  }
  return problems.filter(Boolean);
}

function prepareMatch() {
  const round = G.fixtures[G.round];
  const f = round.find(f => f.h === G.clubId || f.a === G.clubId);
  const probs = validateLineup();
  const home = f.h === G.clubId;
  const opp = getClub(G, home ? f.a : f.h);
  const oppTac = aiTactics(G, opp.id);
  const oppS = teamStrength(G, makeSide(G, opp.id, oppTac)), myS = teamStrength(G, makeSide(G, G.clubId, G.tactics));
  const oppTop = oppTac.lineup.map(id => getPlayer(G, id)).filter(Boolean).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 3);
  modal(`<h2>Avant-match — J${G.round + 1}</h2>
    <div class="vs">${crest(getClub(G, f.h), 56)}<b>${esc(getClub(G, f.h).name)}</b><span>vs</span><b>${esc(getClub(G, f.a).name)}</b>${crest(getClub(G, f.a), 56)}</div>
    ${probs.length ? `<div class="alert">Remplacés automatiquement (blessés/suspendus) : ${probs.map(esc).join(', ')}</div>` : ''}
    <table class="tbl kv">
      <tr><td>Adversaire</td><td>${esc(opp.name)} — ${oppTac.formation}</td></tr>
      <tr><td>Joueurs clés</td><td>${oppTop.map(p => `${esc(p.name)} ${ovrBadge(playerOvr(p))}`).join(', ')}</td></tr>
      <tr><td>Comparaison</td><td>Déf ${Math.round(myS.def)} / ${Math.round(oppS.def)} · Mil ${Math.round(myS.mid)} / ${Math.round(oppS.mid)} · Att ${Math.round(myS.att)} / ${Math.round(oppS.att)}</td></tr>
      <tr><td>Ta tactique</td><td>${G.tactics.formation} · ${MENTALITIES.find(m => m.v === G.tactics.mentality).label}</td></tr>
    </table>
    <div class="row gap mt"><button class="btn" id="pmT">📋 Modifier la tactique</button><div class="grow"></div>
      <button class="btn" id="pmS">⏩ Résultat direct</button><button class="btn primary big" id="pmP">▶ Jouer le match</button></div>`);
  $('#pmT').onclick = () => { closeModal(); show('tactics'); };
  const start = instant => {
    closeModal();
    const ht = home ? G.tactics : oppTac, at = home ? oppTac : G.tactics;
    const mt = new Match(G, f.h, f.a, ht, at);
    mt.sides[home ? 1 : 0].ai = true;
    mt.my = home ? 0 : 1;
    if (instant) { mt.auto = true; mt.sides[mt.my].ai = true; mt.runToEnd(); finishRound(mt, f); }
    else liveMatch(mt, f);
  };
  $('#pmS').onclick = () => start(true);
  $('#pmP').onclick = () => start(false);
}

function liveMatch(mt, f) {
  LIVE = { mt, f, speed: 120, timer: null, paused: false };
  document.body.className = 'game live';
  const H = getClub(G, f.h), A = getClub(G, f.a);
  $('#main').innerHTML = `
  <div class="match">
    <section class="card scoreboard" style="--h1:${H.colors[0]};--a1:${A.colors[0]}">
      <div class="tm">${crest(H, 56)}<b>${esc(H.name)}</b></div>
      <div class="sc"><span id="score">0 - 0</span><small id="min">0'</small></div>
      <div class="tm">${crest(A, 56)}<b>${esc(A.name)}</b></div>
    </section>
    <div class="match-grid">
      <section class="card"><h3>Commentaires</h3><ul id="feed" class="feed"></ul></section>
      <div class="col">
        <section class="card"><h3>Contrôles</h3>
          <div class="row gap wrap">
            <button class="btn" id="mPause">⏸ Pause</button>
            <select id="mSpeed"><option value="400">Lent</option><option value="120" selected>Normal</option><option value="35">Rapide</option><option value="0">Instantané</option></select>
            <select id="mMent">${MENTALITIES.map(m => `<option value="${m.v}" ${m.v === mt.sides[mt.my].mentality ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
            <button class="btn" id="mSub">🔁 Remplacement</button>
          </div>
          <div id="subs" class="hint"></div>
        </section>
        <section class="card"><h3>Statistiques</h3><div id="stats"></div></section>
        <section class="card"><h3>Mes joueurs</h3><div id="myp"></div></section>
      </div>
    </div>
    <div id="mEnd"></div>
  </div>`;
  $('#mPause').onclick = () => { LIVE.paused = !LIVE.paused; $('#mPause').textContent = LIVE.paused ? '▶ Reprendre' : '⏸ Pause'; if (!LIVE.paused) tick(); };
  $('#mSpeed').onchange = e => { LIVE.speed = +e.target.value; };
  $('#mMent').onchange = e => { mt.sides[mt.my].mentality = +e.target.value; mt.say(`Consigne : ${MENTALITIES.find(m => m.v === +e.target.value).label.toLowerCase()}.`, 'info', mt.my); renderLive(); };
  $('#mSub').onclick = () => subModal();
  renderLive();
  tick();
}
function tick() {
  if (!LIVE || LIVE.paused) return;
  const { mt } = LIVE;
  clearTimeout(LIVE.timer);
  if (mt.done) return endLive();
  let n = LIVE.speed === 0 ? 200 : 1;
  while (n-- > 0 && !mt.done) {
    mt.aiManage();
    mt.step();
    if (mt.pendingInjury) break;
  }
  renderLive();
  if (mt.pendingInjury) {
    const p = getPlayer(G, mt.pendingInjury.id);
    LIVE.paused = true; $('#mPause').textContent = '▶ Reprendre';
    if (mt.sides[mt.my].subsLeft > 0) subModal(`${p.name} est blessé ! Choisis un remplaçant.`, mt.pendingInjury.id);
    mt.pendingInjury = null;
    return;
  }
  if (mt.minute === 45 && !LIVE.htShown) { LIVE.htShown = true; LIVE.paused = true; $('#mPause').textContent = '▶ Reprendre'; toast('Mi-temps : ajuste ta tactique si besoin.'); return; }
  if (mt.done) return endLive();
  const goalNow = mt.log.length && mt.log[mt.log.length - 1].type === 'goal' && mt.log[mt.log.length - 1].m === mt.minute;
  LIVE.timer = setTimeout(tick, LIVE.speed * (goalNow ? 8 : 1));
}
function renderLive() {
  const { mt } = LIVE;
  $('#score').textContent = `${mt.score[0]} - ${mt.score[1]}`;
  $('#min').textContent = mt.done ? 'Terminé' : mt.minute + "'";
  const icon = { calm: '·', goal: '⚽', yellow: '🟨', red: '🟥', inj: '✚', sub: '🔁', save: '🧤', chance: '💨', half: '⏸', end: '🏁', info: 'ℹ' };
  $('#feed').innerHTML = mt.log.slice().reverse().map(l => `<li class="ev-${l.type} ${l.side === mt.my ? 'mine' : l.side != null ? 'opp' : ''}"><b>${l.m}'</b> ${icon[l.type] || ''} ${esc(l.text)}</li>`).join('');
  const s = mt.stats, tot = s[0].poss + s[1].poss || 1, ph = Math.round(s[0].poss / tot * 100);
  const row = (l, a, b) => `<div class="srow"><b>${a}</b><span>${l}</span><b>${b}</b></div><div class="sbar"><i style="width:${(a + b) ? a / (a + b) * 100 : 50}%"></i></div>`;
  $('#stats').innerHTML = row('Possession %', ph, 100 - ph) + row('Tirs', s[0].shots, s[1].shots) + row('Cadrés', s[0].onT, s[1].onT) + row('Corners', s[0].corners, s[1].corners) + row('Fautes', s[0].fouls, s[1].fouls);
  const side = mt.sides[mt.my];
  $('#myp').innerHTML = `<table class="tbl compact">${side.onPitch.map(x => { const p = getPlayer(G, x.id), r = mt.pr[x.id]; return `<tr class="${x.injured ? 'unav' : ''}"><td>${x.role}</td><td class="nm">${esc(p.name)} ${r.g ? '⚽'.repeat(r.g) : ''}${r.a ? '🅰' : ''}${r.yel ? '🟨' : ''}${x.injured ? '✚' : ''}</td><td>${r.r.toFixed(1)}</td></tr>`; }).join('')}</table>`;
  $('#subs').textContent = `Remplacements restants : ${side.subsLeft}`;
}
function subModal(msg = '', outPre = null) {
  const { mt } = LIVE;
  const side = mt.sides[mt.my];
  if (side.subsLeft <= 0) return toast('Plus de remplacement possible.');
  LIVE.paused = true; $('#mPause').textContent = '▶ Reprendre';
  modal(`<h2>Remplacement</h2>${msg ? `<div class="alert">${esc(msg)}</div>` : ''}
    <div class="grid2"><div><h3>Sortant</h3>${side.onPitch.map(x => { const p = getPlayer(G, x.id); return `<label class="opt"><input type="radio" name="out" value="${x.id}" ${x.id === outPre ? 'checked' : ''}> ${x.role} ${esc(p.name)} <small>(${mt.pr[x.id].r.toFixed(1)})</small> ${x.injured ? '✚' : ''}</label>`; }).join('')}</div>
    <div><h3>Entrant</h3>${side.bench.map(id => { const p = getPlayer(G, id); return `<label class="opt"><input type="radio" name="in" value="${id}"> ${p.pos} ${esc(p.name)} ${ovrBadge(playerOvr(p))}</label>`; }).join('') || '<p>Banc vide.</p>'}</div></div>
    <div class="row gap mt"><button class="btn primary" id="doSub">Valider</button></div>`);
  $('#doSub').onclick = () => {
    const o = document.querySelector('input[name=out]:checked'), i = document.querySelector('input[name=in]:checked');
    if (!o || !i) return toast('Choisis un sortant et un entrant.');
    mt.sub(mt.my, +o.value, +i.value); closeModal(); renderLive();
  };
}
function endLive() {
  const { mt, f } = LIVE;
  clearTimeout(LIVE.timer);
  renderLive();
  const my = mt.my, d = mt.score[my] - mt.score[1 - my];
  $('#mEnd').innerHTML = `<section class="card endbox"><h2>${d > 0 ? '🎉 Victoire !' : d < 0 ? '😞 Défaite' : '🤝 Match nul'}</h2>
    <button class="btn primary big" id="mDone">Continuer ▶</button></section>`;
  ['#mPause', '#mSub', '#mSpeed', '#mMent'].forEach(s => $(s).disabled = true);
  $('#mDone').onclick = () => finishRound(mt, f);
  $('#mDone').scrollIntoView({ behavior: 'smooth' });
}

function finishRound(mt, f) {
  LIVE = null;
  applyMatch(G, mt, f);
  const my = mt.my, d = mt.score[my] - mt.score[1 - my];
  const opp = getClub(G, my === 0 ? f.a : f.h);
  const best = Object.entries(mt.pr).filter(([, r]) => r.side === my && r.min > 0).sort((a, b) => b[1].r - a[1].r)[0];
  news(G, `J${G.round + 1} : ${mt.names[0]} ${mt.score[0]}-${mt.score[1]} ${mt.names[1]}. ${d > 0 ? 'Victoire' : d < 0 ? 'Défaite' : 'Nul'} face à ${opp.name}.${best ? ` Homme du match : ${getPlayer(G, +best[0]).name} (${best[1].r.toFixed(1)}).` : ''}`, d > 0 ? 'win' : d < 0 ? 'loss' : 'info');
  for (const e of mt.events) if (e.type === 'inj' && e.side === my) news(G, `Blessure : ${getPlayer(G, e.pid).name} absent ~${e.weeks} semaine(s).`, 'inj');
  // autres matchs
  for (const g of G.fixtures[G.round]) {
    if (g === f) continue;
    const m2 = new Match(G, g.h, g.a, aiTactics(G, g.h), aiTactics(G, g.a));
    m2.sides[0].ai = m2.sides[1].ai = true; m2.auto = true;
    m2.runToEnd(); applyMatch(G, m2, g);
  }
  weeklyUpdate(G);
  aiTransfers(G);
  aiOffers(G);
  for (const p of clubPlayers(G, G.clubId)) if (p.morale < 35 && rnd() < .08) news(G, `${p.name} est mécontent de son temps de jeu.`, 'warn');
  const club = getClub(G, G.clubId);
  if (club.budget < -5e6 && rnd() < .3) news(G, 'Le président s\'inquiète des finances : redresse la barre rapidement !', 'board');
  G.round++;
  if (G.round === 5) news(G, 'Le mercato d\'été est fermé.', 'info');
  if (G.round === 19) news(G, 'Le mercato d\'hiver ouvre !', 'info');
  if (G.round === 22) news(G, 'Le mercato d\'hiver est fermé.', 'info');
  if (G.round === 20 || G.round === 32) {
    const exp = clubPlayers(G, G.clubId).filter(p => p.contract <= 1);
    if (exp.length) news(G, `Contrats qui expirent en fin de saison : ${exp.map(p => p.name).join(', ')}. Prolonge-les (fiche joueur) ou ils partiront libres.`, 'warn');
  }
  for (const p of G.players) p.value = calcValue(p);
  save();
  document.body.className = 'game';
  if (G.round >= G.fixtures.length) seasonEnd();
  else show('inbox');
}

function seasonEnd() {
  const sum = endSeason(G);
  save();
  show('inbox');
  modal(`<h2>🏁 Fin de saison</h2>
    <p>Champion : <b>${esc(sum.champion)}</b></p>
    <p>Ton classement : <b>${sum.rank}<sup>e</sup></b> — objectif top ${sum.objective} ${sum.met ? '✅ atteint ! Le président est ravi.' : '❌ manqué. Le président attend mieux la saison prochaine.'}</p>
    <p>Meilleur buteur : ${esc(sum.scorer)}</p>
    <p class="hint">Les joueurs ont vieilli et progressé, des jeunes du centre de formation arrivent. Nouvelle saison ${G.season}/${G.season + 1} !</p>
    <button class="btn primary" onclick="closeModal()">C'est parti</button>`);
}

// ---------- Démarrage ----------
(function init() {
  try { const s = localStorage.getItem(DB_KEY); DB = s ? JSON.parse(s) : null; } catch { DB = null; }
  if (!DB) DB = buildDefaultDatabase();
  startScreen();
})();
