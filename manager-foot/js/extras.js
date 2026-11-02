// ============================================================
//  Bibliothèques tierces intégrées (vendor/, licences d'origine conservées — voir vendor/LISEZMOI.md)
//  - canvas-confetti (ISC) : confettis sur trophées, montées, qualifications
//  - uPlot (MIT) : graphiques trésorerie (Finances) et position journée par journée (Classements)
//  - Fuse.js (Apache-2.0) : recherche tolérante aux fautes dans la palette « Aller à… »
//  - fflate (MIT) : export/import de partie compressé (.mfz, ~10 fois plus léger)
//  - ZzFX (MIT) : petits effets sonores (fanfare, signature, but)
//  Chaque fonction vérifie la présence de sa bibliothèque : sans elle, le jeu se comporte comme avant.
// ============================================================
const enJeu = () => typeof G !== 'undefined' && G && !G.__harness && document.body.className === 'game';

// ---------- sons (ZzFX) ----------
const SONS = {
  fanfare: [1.4, , 523, .02, .2, .4, 1, 1.5, , , 262, .08, .1],
  signature: [1.1, , 880, .01, .05, .12, 1, 1.8, , , 440, .04],
  but: [1.2, , 330, .02, .1, .3, 2, 1.2, , , 165, .05, , .1]
};
function son(k) {
  try { if (window.zzfx && SETTINGS?.sound !== false && SONS[k]) zzfx(...SONS[k]); } catch { }
}

// ---------- confettis ----------
let dernierConfetti = 0;
function feteConfettis(couleurs) {
  if (typeof confetti !== 'function' || Date.now() - dernierConfetti < 3500) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  dernierConfetti = Date.now();
  const colors = couleurs || [getComputedStyle(document.documentElement).getPropertyValue('--club1').trim() || '#2fd27a', '#ffffff', '#f2c94c'];
  confetti({ particleCount: 140, spread: 75, origin: { y: .7 }, colors, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: .75 }, colors }), 250);
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: .75 }, colors }), 400);
  son('fanfare');
}
const __newsX = news;
news = function (g, text, type = 'info', worldOnly = false) {
  __newsX(g, text, type, worldOnly);
  if (type === 'trophy' && !worldOnly && enJeu() && g === G) feteConfettis(); // seulement la partie affichée (pas les simulations)
};
// le bilan de fin de saison et les trophées s'affichent après coup : on fête à l'ouverture si un trophée récent existe
const __seasonEndX = typeof seasonEnd === 'function' ? seasonEnd : null;
if (__seasonEndX) seasonEnd = function () { const avant = (myClub(G).trophies || []).length; const r = __seasonEndX(); if ((myClub(G)?.trophies || []).length > avant) feteConfettis(); return r; };

// ---------- suivi semaine par semaine (pour les graphiques) ----------
const __completeWeekX = completeWeek;
completeWeek = function (G, skip) {
  const e = G.schedule[G.week];
  const r = __completeWeekX(G, skip);
  if (e?.t === 'L' && G.clubId) {
    const L = clubLeague(G, G.clubId), t = L ? standings(G, L.id) : [];
    (G.suivi ||= []).push({ s: G.season, j: leagueRoundAt(G), b: Math.round(myClub(G).budget), r: t.findIndex(x => x.id === G.clubId) + 1, n: t.length });
    if (G.suivi.length > 400) G.suivi.splice(0, G.suivi.length - 400);
  }
  return r;
};

// ---------- graphiques (uPlot) ----------
function graphe(el, titre, xs, series, opts = {}) {
  if (typeof uPlot !== 'function' || !el) return;
  const w = Math.max(280, el.clientWidth - 8);
  const css = getComputedStyle(document.documentElement);
  const club = css.getPropertyValue('--club1').trim() || '#2fd27a', mut = '#7d8ea3', grille = 'rgba(125,142,163,.15)';
  const axe = { stroke: mut, grid: { stroke: grille, width: 1 }, ticks: { stroke: grille } };
  new uPlot({
    width: w, height: opts.h || 200, title: titre,
    scales: { x: { time: false }, y: opts.inverse ? { dir: -1, range: (u, a, b) => [1, Math.max(b, opts.max || b)] } : {} },
    axes: [{ ...axe, incrs: [1, 2, 5, 10], values: (u, v) => v.map(x => opts.xlab ? opts.xlab(x) : x) }, { ...axe, size: 64, ...(opts.inverse ? { incrs: [1, 2, 5, 10] } : {}), values: (u, v) => v.map(x => opts.ylab ? opts.ylab(x) : x) }],
    series: [{}, ...series.map((s, i) => ({ label: s.label, stroke: s.color || (i ? '#f2c94c' : club), width: 2, fill: s.fill ? `${s.color || club}22` : undefined, points: { show: xs.length < 40 } }))],
    legend: { show: series.length > 1 }
  }, [xs, ...series.map(s => s.data)], el);
}
const __vFinancesX = vFinances;
vFinances = function (el) {
  __vFinancesX(el);
  const S = (G.suivi || []).filter(x => x.s === G.season);
  if (typeof uPlot !== 'function') return;
  el.insertAdjacentHTML('afterbegin', `<section class="card graphe"><h2>📈 Trésorerie journée par journée</h2><div id="grTreso"></div>${S.length < 2 ? '<p class="muted">Le graphique se remplit au fil des journées.</p>' : ''}</section>`);
  if (S.length >= 2) graphe($('#grTreso'), '', S.map(x => x.j), [{ label: 'Trésorerie', data: S.map(x => x.b), fill: true }], { ylab: v => money(v), xlab: v => 'J' + v });
};
const __vCompsX = vComps;
vComps = function (el) {
  __vCompsX(el);
  const S = (G.suivi || []).filter(x => x.s === G.season && x.r > 0);
  if (typeof uPlot !== 'function' || S.length < 2) return;
  const body = $('#compBody'); if (!body || !body.querySelector('.standings')) return;
  body.insertAdjacentHTML('beforeend', `<section class="card graphe"><h2>📉 Ma position journée par journée</h2><div id="grRang"></div></section>`);
  graphe($('#grRang'), '', S.map(x => x.j), [{ label: 'Position', data: S.map(x => x.r) }], { inverse: true, max: S[S.length - 1].n, xlab: v => 'J' + v, ylab: v => Number.isInteger(v) ? v + 'e' : '', h: 180 });
};

// ---------- palette : recherche tolérante aux fautes (Fuse.js) ----------
let FUSE_CACHE = null;
function indexFuse() {
  if (!window.Fuse || !G) return null;
  const cle = G.players.length + ':' + G.season + ':' + G.week;
  if (FUSE_CACHE?.cle === cle) return FUSE_CACHE;
  const docs = [];
  for (const [g, items] of NAV_GROUPS) for (const [k, i, l] of items) docs.push({ t: 'écran', i, l, s: g, k });
  for (const p of G.players) if (p.club != null || p.age < 34) docs.push({ t: 'joueur', i: '👤', l: p.name, pid: p.id });
  for (const c of G.clubs) docs.push({ t: 'club', i: '🛡', l: c.name, cid: c.id });
  FUSE_CACHE = { cle, f: new Fuse(docs, { keys: ['l', 's'], threshold: .34, ignoreLocation: true, includeScore: true }) };
  return FUSE_CACHE;
}
if (typeof entreesPalette === 'function') {
  const __entreesX = entreesPalette;
  entreesPalette = function (q) {
    const base = __entreesX(q);
    const F = q.trim().length >= 3 && indexFuse();
    if (!F) return base;
    const vus = new Set(base.map(x => x.t + '|' + x.l));
    const plus = F.f.search(q.trim(), { limit: 14 }).map(r => r.item).filter(d => !vus.has(d.t + '|' + d.l)).map(d => {
      if (d.t === 'écran') return { t: 'écran', i: d.i, l: d.l, s: d.s + ' · approché', go: () => show(d.k) };
      if (d.t === 'joueur') { const p = getPlayer(G, d.pid); return p && { t: 'joueur', i: '👤', l: p.name, s: `${p.pos} · ${p.age} ans · ${p.club != null ? getClub(G, p.club)?.name : 'libre'} · approché`, go: () => playerModal(p.id) }; }
      return { t: 'club', i: '🛡', l: d.l, s: 'approché', go: () => viewClub(d.cid) };
    }).filter(Boolean);
    return base.concat(plus).slice(0, 40);
  };
}

// ---------- export / import compressé (fflate) ----------
function exportCompresse(g, nom) {
  if (!window.fflate) return download(nom + '.json', g);
  const data = fflate.gzipSync(fflate.strToU8(JSON.stringify(g)), { level: 9 });
  const blob = new Blob([data], { type: 'application/gzip' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom + '.mfz'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return data.length;
}
function lireFichierPartie(cb) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.mfz,.json,application/json,application/gzip';
  i.onchange = async () => {
    const f = i.files[0]; if (!f) return;
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      const txt = buf[0] === 0x1f && buf[1] === 0x8b ? fflate.strFromU8(fflate.gunzipSync(buf)) : new TextDecoder().decode(buf);
      cb(JSON.parse(txt));
    } catch (e) { toast('Fichier illisible : ' + e.message, 'err'); }
  };
  i.click();
}
// Options : bouton d'export compressé à côté de l'export JSON
const __vOptionsX = vOptions;
vOptions = function (el) {
  __vOptionsX(el);
  const o2 = $('#o2'); if (!o2 || !window.fflate) return;
  o2.insertAdjacentHTML('afterend', ' <button class="btn" id="o2z" title="Partie compressée (gzip), environ 10 fois plus légère">🗜 Exporter compressé (.mfz)</button>');
  $('#o2z').onclick = () => { G.rngState = RNGS.s; const { pmap, ...rest } = G; const n = exportCompresse(rest, `manager-foot-${G.season}-${weekLabel(G).replace(/\s+/g, '-')}`); toast(`Partie exportée (${Math.round(n / 1024)} Ko).`); };
};
// accueil : l'import de partie accepte aussi les fichiers .mfz
document.addEventListener('click', e => {
  const b = e.target.closest?.('#btnLoadFile2'); if (!b || !window.fflate) return;
  e.stopImmediatePropagation(); e.preventDefault();
  lireFichierPartie(g => { if (!validSave(g)) return toast('Ce fichier n\'est pas une sauvegarde compatible.', 'err'); g.slot = 's' + Date.now(); loadGame(g); save(); enterGame(); });
}, true);

// ---------- sons sur événements ----------
if (typeof Sound !== 'undefined' && Sound.roar) { const __roar = Sound.roar.bind(Sound); Sound.roar = function (mine) { __roar(mine); if (mine) son('but'); }; }
if (typeof dealComplete === 'function') { const __dealX = dealComplete; dealComplete = function (d) { const r = __dealX(d); if (enJeu()) son('signature'); return r; }; }
