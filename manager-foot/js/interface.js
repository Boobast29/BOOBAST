// ============================================================
//  Interface v22 : navigation plus claire et plus jolie
//  - menu latéral : sections repliables (état mémorisé), section active toujours ouverte, bouton « Aller à… »
//  - palette « Aller à… » (Ctrl+K ou ⌘K) : écrans, actions, joueurs et clubs, recherche sans accents, clavier
//  - mobile : barre d'onglets en bas (Accueil, Effectif, Mercato, Classements, Menu) + tiroir avec toutes les sections
//  - notifications : en bas à droite, 3 au plus, sans doublon, fermeture au clic
//  - fil d'Ariane (section › écran) en haut de chaque écran
//  Idées reprises de jeux de gestion open source (league-manager-ui : couleurs à sens unique, bouton « Continuer » qui mène
//  à ce qui bloque ; retroFootballManager ; Hattrick « ohmyhattrick ») — aucune ligne de code copiée.
// ============================================================
const sansAccent = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const lireLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const ecrireLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

// ---------- notifications ----------
toast = function (msg, type = '') {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const last = box.lastElementChild;
  if (last && last.dataset.msg === msg) { last.dataset.n = (+last.dataset.n || 1) + 1; last.querySelector('.tn').textContent = '×' + last.dataset.n; return; }
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.dataset.msg = msg; t.title = 'Cliquer pour fermer';
  const ic = type === 'err' ? '⚠' : /^[\p{Extended_Pictographic}]/u.test(msg) ? '' : '✓';
  t.innerHTML = `${ic ? `<i class="ti">${ic}</i>` : ''}<span>${esc(msg)}</span><b class="tn"></b>`;
  const fermer = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); };
  t.onclick = fermer;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(fermer, Math.min(7000, 2600 + msg.length * 35) + (type === 'err' ? 1500 : 0));
};

// ---------- menu latéral repliable ----------
function groupeDe(v) { return NAV_GROUPS.find(g => g[1].some(x => x[0] === v))?.[0]; }
function decorerNav() {
  const nav = $('#nav'); if (!nav || nav.dataset.v22) return;
  nav.dataset.v22 = '1';
  const fermes = new Set(lireLS('mf-nav-fermes', []));
  nav.insertAdjacentHTML('afterbegin', `<button class="nav-cmd" id="navCmd" title="Aller à un écran, un joueur, un club (Ctrl+K)"><span>⌕</span><em>Aller à…</em><kbd>Ctrl K</kbd></button>`);
  $('#navCmd').onclick = () => ouvrirPalette();
  nav.querySelectorAll('.nav-g').forEach(g => {
    const h = g.querySelector('.nav-h'); if (!h) return;
    const nom = h.textContent.trim();
    h.innerHTML = `<span>${esc(nom)}</span><i class="chev">▾</i>`;
    h.setAttribute('role', 'button'); h.tabIndex = 0;
    g.classList.toggle('ferme', fermes.has(nom));
    const bascule = () => {
      g.classList.toggle('ferme');
      const f = new Set(lireLS('mf-nav-fermes', []));
      g.classList.contains('ferme') ? f.add(nom) : f.delete(nom);
      ecrireLS('mf-nav-fermes', [...f]);
    };
    h.onclick = bascule; h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bascule(); } };
  });
}
function ouvrirSectionActive(v) {
  const g = groupeDe(v); if (!g) return;
  $$('#nav .nav-g').forEach(el => { if (el.querySelector('.nav-h span')?.textContent === g) el.classList.remove('ferme'); });
}

// ---------- barre d'onglets mobile + tiroir ----------
const ONGLETS = [['inbox', '🏠', 'Accueil'], ['squad', '👥', 'Effectif'], ['transfers', '💱', 'Mercato'], ['comps', '🏆', 'Classements'], ['__menu', '☰', 'Menu']];
function barreMobile() {
  if ($('#tabbar') || !$('#app')) return;
  const bar = document.createElement('nav'); bar.id = 'tabbar';
  bar.innerHTML = ONGLETS.map(([k, i, l]) => `<button data-tab="${k}"><span>${i}</span><em>${l}</em><i class="nb" data-tnb="${k}"></i></button>`).join('');
  document.body.appendChild(bar);
  bar.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => b.dataset.tab === '__menu' ? ouvrirTiroir() : (fermerTiroir(), show(b.dataset.tab)));
}
function majBarreMobile(v) {
  $$('#tabbar [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === v || (b.dataset.tab === '__menu' && !ONGLETS.some(o => o[0] === v))));
  const n = (k, x) => { const e = $(`#tabbar [data-tnb="${k}"]`); if (e) e.textContent = x || ''; };
  if (G) { n('inbox', (typeof unreadMail === 'function' ? unreadMail(G) : 0) + (typeof pendingDecisions === 'function' ? pendingDecisions(G).length : 0)); n('transfers', (G.deals || []).filter(d => typeof DEAL_USER !== 'undefined' && DEAL_USER.includes(d.status)).length); }
}
function ouvrirTiroir() {
  fermerTiroir();
  const s = document.createElement('div'); s.id = 'tiroir';
  s.innerHTML = `<div class="tir-fond"></div><div class="tir-boite"><div class="tir-tete"><b>Menu</b><button class="btn sm" id="tirCmd">⌕ Aller à…</button><button class="mclose" id="tirX">✕</button></div>
    ${NAV_GROUPS.map(([g, items]) => `<h4>${esc(g)}</h4><div class="tir-grille">${items.map(([k, i, l]) => `<button data-v="${k}" class="${k === VIEW ? 'on' : ''}"><span>${i}</span><em>${esc(l)}</em><i class="nb">${$(`#nav [data-nb="${k}"]`)?.textContent || ''}</i></button>`).join('')}</div>`).join('')}</div>`;
  document.body.appendChild(s);
  requestAnimationFrame(() => s.classList.add('ouvert'));
  s.querySelector('.tir-fond').onclick = fermerTiroir; $('#tirX').onclick = fermerTiroir;
  $('#tirCmd').onclick = () => { fermerTiroir(); ouvrirPalette(); };
  s.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { fermerTiroir(); show(b.dataset.v); });
}
function fermerTiroir() { $('#tiroir')?.remove(); }

// ---------- fil d'Ariane ----------
function filAriane(v) {
  const main = $('#main'); if (!main || !G) return;
  $('#ariane')?.remove();
  const g = groupeDe(v), it = NAV_FLAT.find(x => x[0] === v);
  if (!it) return;
  main.insertAdjacentHTML('afterbegin', `<div id="ariane"><span class="muted">${esc(g || '')}</span> › <b>${it[1]} ${esc(it[2])}</b><span class="grow"></span><button class="btn sm ghost" onclick="ouvrirPalette()" title="Ctrl+K">⌕ Aller à…</button></div>`);
}

// ---------- palette « Aller à… » ----------
let PAL = null;
function entreesPalette(q) {
  const n = sansAccent(q.trim()), out = [];
  const ok = s => !n || sansAccent(s).includes(n);
  for (const [g, items] of NAV_GROUPS) for (const [k, i, l] of items) if (ok(l) || ok(g)) out.push({ t: 'écran', i, l, s: g, go: () => show(k) });
  const actions = [
    ['▶', 'Continuer / jouer la semaine', () => $('#btnGo')?.click()],
    ['💾', 'Sauvegarder la partie', () => { save(); toast('Partie sauvegardée.'); }],
    ['⚖', 'Règlement du championnat', () => show('regles')],
    ['🏠', 'Retour à l\'accueil (autres parties)', () => { save(); startScreen(); }]
  ];
  for (const [i, l, go] of actions) if (ok(l)) out.push({ t: 'action', i, l, s: 'Action', go });
  if (n.length >= 2 && G) {
    for (const p of G.players.filter(p => sansAccent(p.name).includes(n)).sort((a, b) => (b.club === G.clubId) - (a.club === G.clubId) || playerOvr(b) - playerOvr(a)).slice(0, 8))
      out.push({ t: 'joueur', i: '👤', l: p.name, s: `${p.pos} · ${p.age} ans · ${p.club != null ? getClub(G, p.club)?.name : 'libre'}`, go: () => playerModal(p.id) });
    for (const c of G.clubs.filter(c => sansAccent(c.name).includes(n)).slice(0, 5)) out.push({ t: 'club', i: '🛡', l: c.name, s: clubLeague(G, c.id)?.name || 'étranger', go: () => viewClub(c.id) });
  }
  return out.slice(0, 40);
}
function ouvrirPalette() {
  if (!G || LIVE) return;
  fermerPalette();
  const el = document.createElement('div'); el.id = 'palette';
  el.innerHTML = `<div class="pal-boite"><input id="palQ" placeholder="Aller à un écran, une action, un joueur, un club…" autocomplete="off"><div id="palL"></div>
    <p class="pal-aide"><kbd>↑</kbd><kbd>↓</kbd> choisir · <kbd>Entrée</kbd> ouvrir · <kbd>Échap</kbd> fermer</p></div>`;
  document.body.appendChild(el);
  PAL = { sel: 0, items: [] };
  const rendre = () => {
    PAL.items = entreesPalette($('#palQ').value);
    PAL.sel = Math.min(PAL.sel, Math.max(0, PAL.items.length - 1));
    $('#palL').innerHTML = PAL.items.map((x, k) => `<div class="pal-it ${k === PAL.sel ? 'on' : ''}" data-k="${k}"><span class="pal-i">${x.i}</span><b>${esc(x.l)}</b><small>${esc(x.s || '')}</small><em>${x.t}</em></div>`).join('') || '<p class="muted pal-vide">Aucun résultat.</p>';
    $('#palL').querySelectorAll('.pal-it').forEach(d => { d.onclick = () => choisir(+d.dataset.k); d.onmousemove = () => { if (PAL.sel !== +d.dataset.k) { PAL.sel = +d.dataset.k; rendre(); } }; });
    $('#palL .on')?.scrollIntoView({ block: 'nearest' });
  };
  const choisir = k => { const x = PAL.items[k]; fermerPalette(); x?.go(); };
  const q = $('#palQ');
  q.oninput = () => { PAL.sel = 0; rendre(); };
  q.onkeydown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); PAL.sel = Math.min(PAL.items.length - 1, PAL.sel + 1); rendre(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); PAL.sel = Math.max(0, PAL.sel - 1); rendre(); }
    else if (e.key === 'Enter') { e.preventDefault(); choisir(PAL.sel); }
    else if (e.key === 'Escape') { e.preventDefault(); fermerPalette(); }
  };
  el.onclick = e => { if (e.target === el) fermerPalette(); };
  rendre(); q.focus();
}
function fermerPalette() { $('#palette')?.remove(); PAL = null; }
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && G && document.body.className === 'game') { e.preventDefault(); $('#palette') ? fermerPalette() : ouvrirPalette(); }
}, true);

// ---------- branchements ----------
const __enterGameI = enterGame;
enterGame = function () { __enterGameI(); decorerNav(); barreMobile(); ouvrirSectionActive(VIEW); majBarreMobile(VIEW); filAriane(VIEW); };
const __showI = show;
show = function (v) {
  __showI(v);
  if (!G || document.body.className !== 'game') return;
  decorerNav(); barreMobile(); ouvrirSectionActive(VIEW); majBarreMobile(VIEW); filAriane(VIEW);
};
// quitter la partie : on retire la barre mobile et le tiroir
const __startScreenI = startScreen;
startScreen = async function (...a) { $('#tabbar')?.remove(); fermerTiroir(); fermerPalette(); return __startScreenI(...a); };
