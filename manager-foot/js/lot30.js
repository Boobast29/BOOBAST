// ============================================================
//  Lot de 30 dépôts GitHub (v32) — bibliothèques et données ouvertes dans vendor/ (licences conservées),
//  faits dérivés dans js/donnees_ouvertes2.js. Chaque intégration vérifie la présence de sa bibliothèque.
// ============================================================
const a32 = (n) => typeof window[n] !== 'undefined';

// 1-3. flag-icons (MIT) + datasets/country-codes (PDDL) + mledoze/countries (ODbL) : vrais drapeaux, noms et régions
const PAYS2 = typeof DO2_PAYS !== 'undefined' ? DO2_PAYS : {};
natFlag = function (code) {
  const p = PAYS2[code], nom = natName(code);
  const reg = p?.region ? ` — ${p.region}` : '';
  return p?.iso2 ? `<span class="nat drap" data-tip="${esc(nom + reg)}"><span class="fi" style="background-image:url(vendor/flag-icons/4x3/${p.iso2}.svg)"></span>${esc(code)}</span>`
    : `<span class="nat" data-tip="${esc(nom)}">${esc(code)}</span>`;
};
// 4. i18n-iso-countries (MIT) : noms français des nationalités absentes de la liste du jeu
let NOMS_ISO = null;
if (!location.pathname.includes('/tests/')) fetch('vendor/i18n-iso-countries/fr.json').then(r => r.json()).then(j => { NOMS_ISO = j.countries; }).catch(() => { });
const __natNameL = natName;
natName = function (code) {
  const n = __natNameL(code); if (n !== code) return n;
  const p = PAYS2[code]; if (p?.nom) return p.nom;
  const iso = p?.iso2?.toUpperCase(), v = NOMS_ISO?.[iso];
  return (Array.isArray(v) ? v[0] : v) || code;
};

// 5-6. marked (MIT) + DOMPurify (Apache-2.0/MPL-2.0) : écran « Aide » (documentation du jeu)
const DOCS = [['FONCTIONNALITES.md', 'Fonctionnalités'], ['ETAT_PROJET.md', 'Journal des versions'], ['RECHERCHE.md', 'Sources et licences']];
async function vAide(el, doc = DOCS[0][0]) {
  el.innerHTML = `<section class="card"><div class="tabs">${DOCS.map(([f, l]) => `<button data-doc="${f}" class="${f === doc ? 'on' : ''}">${l}</button>`).join('')}</div><div id="aideTxt" class="aide">Chargement…</div></section>`;
  el.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => vAide(el, b.dataset.doc));
  try {
    const md = await (await fetch(doc)).text();
    const html = a32('marked') ? marked.parse(md) : `<pre>${esc(md)}</pre>`;
    $('#aideTxt').innerHTML = a32('DOMPurify') ? DOMPurify.sanitize(html) : esc(md);
  } catch { $('#aideTxt').innerHTML = '<p class="muted">Documentation disponible avec le serveur local (Lancer_Manager_Foot.bat).</p>'; }
}
const __applyRoleNavL = applyRoleNav;
applyRoleNav = function () {
  __applyRoleNavL();
  const g = NAV_GROUPS.find(x => x[1].some(y => y[0] === 'options'));
  if (g && !g[1].some(x => x[0] === 'aide')) g[1].push(['aide', '❓', 'Aide']);
  NAV_FLAT.length = 0; NAV_FLAT.push(...NAV_GROUPS.flatMap(x => x[1]));
};
if (typeof ICONE_VUE !== 'undefined') ICONE_VUE.aide = 'circle-alert';
const __showL = show;
show = function (v) {
  if (v !== 'aide') return __showL(v);
  if (LIVE) return;
  VIEW_HIST.push(VIEW); VIEW = 'aide';
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === 'aide'));
  renderTop(); const main = $('#main'); main.innerHTML = ''; vAide(main); navBadges();
  if (typeof filAriane === 'function') { ouvrirSectionActive('aide'); majBarreMobile('aide'); filAriane('aide'); }
};

// 7. dayjs (MIT) : « prochain match dans 4 jours » dans l'en-tête
if (a32('dayjs')) { try { dayjs.extend(window.dayjs_plugin_relativeTime); dayjs.locale('fr'); } catch { } }
// 8. humanize-duration (Unlicense) : durées d'indisponibilité en toutes lettres
const __fmtDaysL = fmtDays;
fmtDays = function (d) { return a32('humanizeDuration') && d > 0 ? humanizeDuration(d * 864e5, { language: 'fr', largest: 2, round: true, conjunction: ' et ', serialComma: false }) : __fmtDaysL(d); };

// 9-10. PapaParse (MIT) + FileSaver (MIT) : export CSV de l'effectif et du classement
function exportCSV(nom, lignes) {
  if (!a32('Papa')) return toast('Export CSV indisponible.', 'err');
  const csv = '﻿' + Papa.unparse(lignes, { delimiter: ';' });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  a32('saveAs') ? saveAs(blob, nom + '.csv') : download(nom + '.csv', csv);
  toast('Fichier CSV enregistré (ouvrable dans un tableur).');
}
function csvEffectif() {
  exportCSV(`effectif-${myClub(G).short}-${G.season}`, clubPlayers(G, G.clubId).map(p => ({ Nom: p.name, Poste: p.pos, Age: p.age, Nationalite: natName(p.nat), Note: playerOvr(p), Potentiel: p.pot, Valeur: Math.round(p.value), SalaireMensuel: Math.round(p.wage), Contrat: p.contract, Matchs: p.stats.apps, Buts: p.stats.goals, Passes: p.stats.assists, Traits: (p.traitsVus || []).map(t => TRAITS?.[t]?.n || t).join(', ') })));
}
function csvClassement() {
  const L = clubLeague(G, G.clubId); if (!L) return;
  exportCSV(`classement-${L.name}-${G.season}`, standings(G, L.id).map((r, i) => ({ Rang: i + 1, Club: getClub(G, r.id).name, J: r.p, G: r.w, N: r.d, P: r.l, BP: r.gf, BC: r.ga, Diff: r.gf - r.ga, Pts: r.pts })));
}

// 11-12. qrcode-generator (MIT) + lz-string (MIT) : « Défi » partageable (même monde, même club, même règlement)
function codeDefi() {
  const d = { s: G.seed, c: myClub(G).name, r: G.regles || null, m: G.real ? G.real.countrySrc : null, v: 32 };
  return a32('LZString') ? LZString.compressToEncodedURIComponent(JSON.stringify(d)) : btoa(JSON.stringify(d));
}
function partagerDefi() {
  const url = `${location.origin}${location.pathname}?defi=${codeDefi()}`;
  let qr = '';
  if (a32('qrcode')) { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2 }); }
  modal(`<h2>🎯 Lancer un défi</h2><p>Un ami qui ouvre ce lien démarre <b>le même monde</b> (même graine) avec <b>${esc(myClub(G).name)}</b> et le même règlement. Comparez vos chroniques !</p>
    <div class="defi">${qr ? `<div class="qr">${qr}</div>` : ''}<div><input id="defiUrl" value="${esc(url)}" readonly><button class="btn primary" id="defiCopie">Copier le lien</button></div></div>`);
  $('#defiCopie').onclick = () => { navigator.clipboard?.writeText(url).then(() => toast('Lien copié.')).catch(() => { $('#defiUrl').select(); }); };
}
function lireDefi() {
  const c = new URLSearchParams(location.search).get('defi'); if (!c) return null;
  try { return JSON.parse(a32('LZString') ? LZString.decompressFromEncodedURIComponent(c) : atob(c)); } catch { return null; }
}
const __startScreenL = startScreen;
startScreen = async function (...a) {
  const r = await __startScreenL(...a);
  const d = lireDefi();
  if (d && DB && !d.m) {
    const club = DB.clubs.find(c => c.name === d.c && !c.foreign);
    if (club) {
      $('.start-wrap .hero')?.insertAdjacentHTML('beforeend', `<div class="card defi-recu">🎯 <b>Défi reçu</b> : ${esc(club.name)}, graine ${d.s}${d.r ? `, règlement ${esc(REGLES[d.r]?.pays || d.r)}` : ''}. <button class="btn primary sm" id="defiGo">Relever le défi</button></div>`);
      $('#defiGo').onclick = () => { try { if (d.r) localStorage.setItem('mf-regles', d.r); } catch { } const nom = ($('#mgr')?.value || '').trim() || 'Coach'; G = newGame(DB, club.id, nom, d.s); VIEW = 'inbox'; save(); enterGame(); };
    }
  }
  vanillaTiltAccueil();
  return r;
};

// 13. fireworks-js (MIT) : feu d'artifice au titre de champion
function feuArtifice() {
  const F = window.Fireworks?.Fireworks || window.Fireworks?.default; if (!F || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'feu'; document.body.appendChild(box);
  const fw = new F(box, { intensity: 22, explosion: 6, traceSpeed: 3, hue: { min: 0, max: 360 }, sound: { enabled: false } });
  fw.start(); setTimeout(() => { fw.waitStop?.(); setTimeout(() => box.remove(), 1500); }, 5500);
}
if (typeof seasonEnd === 'function') { const __seasonEndL = seasonEnd; seasonEnd = function () { const L = clubLeague(G, G.clubId), t = L ? standings(G, L.id) : [], champion = t[0]?.id === G.clubId; const r = __seasonEndL(); if (champion) feuArtifice(); return r; }; }

// 14. vanilla-tilt (MIT) : cartes de club en relief à l'accueil
function vanillaTiltAccueil() {
  if (!a32('VanillaTilt') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover)').matches) return;
  VanillaTilt.init(document.querySelectorAll('.club-pick'), { max: 8, speed: 400, glare: true, 'max-glare': .18, scale: 1.02 });
}

// 15. chroma-js (BSD-3/Apache-2.0) : texte lisible sur les couleurs du club
const __enterGameL = enterGame;
enterGame = function () {
  __enterGameL();
  try {
    const C = window.chroma;
    if (C && G) {
      const c = myClub(G).colors[0];
      let lum; try { lum = C.contrast ? null : C(c).luminance(); } catch { lum = null; }
      if (lum == null && !C.contrast) { const h = c.replace('#', ''), v = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); lum = .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; }
      const clair = C.contrast ? C.contrast(c, '#ffffff') >= 3 : lum < .45;
      document.documentElement.style.setProperty('--club-ink', clair ? '#ffffff' : '#0b0f14');
    }
  } catch { }
  raccourcis();
};

// 16-17. screenfull (MIT) + NoSleep.js (MIT) : plein écran et écran allumé pendant le match en direct
let REVEIL = null;
function boutonsMatch() {
  const snd = $('#mSnd'); if (!snd || $('#mFull')) return;
  if (window.screenfull?.isEnabled) { snd.insertAdjacentHTML('afterend', ' <button class="btn" id="mFull" data-tip="Plein écran (F)">⛶</button>'); $('#mFull').onclick = () => screenfull.toggle(); }
  if (a32('NoSleep') && window.matchMedia('(pointer: coarse)').matches) { try { REVEIL ||= new NoSleep(); REVEIL.enable(); } catch { } }
}
const obsMatch = new MutationObserver(() => { if ($('#mSnd')) boutonsMatch(); else if (REVEIL?.isEnabled) { try { REVEIL.disable(); } catch { } } });
obsMatch.observe(document.body, { childList: true, subtree: true });

// 18. Choices.js (MIT) : listes déroulantes longues avec recherche (comparaison de joueurs, filtres)
function selectsRecherche(racine) {
  if (!a32('Choices') || !racine) return;
  racine.querySelectorAll('select').forEach(s => {
    if (s.dataset.choices || s.options.length < 25 || s.closest('#modal')) return;
    s.dataset.choices = '1';
    try { new Choices(s, { searchEnabled: true, itemSelectText: '', shouldSort: false, searchPlaceholderValue: 'Rechercher…', noResultsText: 'Aucun résultat', allowHTML: false }); } catch { }
  });
}
const obsSelect = new MutationObserver(() => selectsRecherche($('#main')));
obsSelect.observe(document.body, { childList: true, subtree: true });

// 19. Anime.js (MIT) : célébration du but sur le tableau d'affichage
if (typeof Sound !== 'undefined' && Sound.roar) {
  const __roarL = Sound.roar.bind(Sound);
  Sound.roar = function (mine) {
    __roarL(mine);
    const sb = document.querySelector('.scoreboard');
    if (sb && window.anime?.animate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) anime.animate(sb, { scale: [1, 1.04, 1], duration: 700, ease: 'outElastic(1, .6)' });
  };
}

// 20. minidenticons (MIT) : avatar unique pour les entraîneurs et le staff sans photo
const obsAvatars = new MutationObserver(() => {
  if (!a32('minidenticon')) return;
  document.querySelectorAll('.coach-ava:not([data-ident])').forEach(el => { el.dataset.ident = '1'; const nom = el.getAttribute('title') || el.textContent; el.innerHTML = minidenticon(nom, 70, 55); el.classList.add('ident'); });
});
obsAvatars.observe(document.body, { childList: true, subtree: true });

// 21. Bebas Neue (OFL) : police d'affichage pour les scores et grands chiffres — voir theme.css
// 22. i18next (MIT) : interface en anglais (navigation, en-tête, boutons principaux) — option dans Options
const EN = {
  'Tableau de bord': 'Dashboard', 'Boîte mail': 'Inbox', 'Calendrier': 'Calendar', 'Ma carrière': 'My career', 'Chronique': 'Chronicle',
  'Effectif': 'Squad', "Plan d'effectif": 'Squad plan', 'Entraîneur': 'Coach', 'Tactique': 'Tactics', 'Entraînement': 'Training', 'Réunions': 'Meetings',
  'Vestiaire': 'Dressing room', 'Infirmerie': 'Medical', 'Formation': 'Youth', 'Mercato': 'Transfers', 'Cellule de recrutement': 'Scouting',
  'Négociations': 'Negotiations', 'Staff': 'Staff', 'Direction': 'Board', 'Finances': 'Finances', 'Club': 'Club', 'Résultats': 'Results',
  'Classements': 'Tables', 'Règlement': 'Rules', 'Statistiques': 'Statistics', 'Analyse': 'Analysis', 'International': 'International',
  'Base mondiale': 'World database', 'Éditeur': 'Editor', 'Options': 'Settings', 'Aide': 'Help', 'Aller à…': 'Go to…', 'Continuer': 'Continue',
  'Jouer le match': 'Play match', 'Jour de match': 'Match day', 'Saison': 'Season', 'Budget': 'Budget', 'Président': 'Chairman', 'Mercato ': 'Window',
  'BUREAU': 'OFFICE', 'EFFECTIF': 'SQUAD', 'RECRUTEMENT': 'RECRUITMENT', 'CLUB': 'CLUB', 'COMPÉTITIONS': 'COMPETITIONS', 'OUTILS': 'TOOLS', 'Menu': 'Menu', 'Accueil': 'Home'
};
let LANGUE = 'fr'; try { LANGUE = localStorage.getItem('mf-langue') || 'fr'; } catch { }
if (a32('i18next')) i18next.init({ lng: LANGUE, fallbackLng: 'fr', resources: { en: { translation: EN } }, keySeparator: false, nsSeparator: false });
function traduire() {
  if (LANGUE !== 'en' || !a32('i18next')) return;
  document.querySelectorAll('#nav em, #nav .nav-h span, #tabbar em, #tiroir em, #tiroir h4, #top .tinfo small, #btnGo, #navCmd em').forEach(el => {
    for (const n of el.childNodes) if (n.nodeType === 3) { const t = n.textContent.trim(); if (t && EN[t]) n.textContent = n.textContent.replace(t, i18next.t(t)); }
  });
}
const obsLangue = new MutationObserver(() => traduire());
obsLangue.observe(document.body, { childList: true, subtree: true });

// 23. tinykeys (MIT) : raccourcis « aller à » au clavier (g puis m = mail, g e = effectif…)
let RACC = false;
function raccourcis() {
  if (RACC || !a32('tinykeys')) return; RACC = true;
  const go = v => e => { if (!G || LIVE || $('#modal') || e.target.matches?.('input, textarea, select')) return; e.preventDefault(); show(v); };
  const tk = typeof tinykeys === 'function' ? tinykeys : tinykeys.tinykeys; // le paquet UMD expose un objet
  tk(window, { 'g m': go('mail'), 'g e': go('squad'), 'g t': go('transfers'), 'g c': go('comps'), 'g f': go('finances'), 'g a': go('inbox'), 'g r': go('regles'), 'g h': go('chronique'), 'Shift+?': e => { if (!$('#modal') && G) aideRaccourcis(); } });
}
function aideRaccourcis() {
  modal(`<h2>⌨ Raccourcis clavier</h2><table class="tbl compact">${[['Espace / Entrée', 'Continuer'], ['Ctrl K', 'Aller à… (palette)'], ['g puis a', 'Tableau de bord'], ['g puis m', 'Boîte mail'], ['g puis e', 'Effectif'], ['g puis t', 'Mercato'], ['g puis c', 'Classements'], ['g puis f', 'Finances'], ['g puis r', 'Règlement'], ['g puis h', 'Chronique'], ['1 à 9', 'Écrans du menu'], ['Échap', 'Fermer'], ['?', 'Cette aide']].map(([k, l]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(l)}</td></tr>`).join('')}</table>`);
}

// 24. NProgress (MIT) : barre de progression pendant les simulations longues (vacances)
if (typeof holiday === 'function' && a32('NProgress')) {
  const __holidayL = holiday;
  holiday = function (n) { NProgress.configure({ showSpinner: false }); NProgress.start(); try { return __holidayL(n); } finally { setTimeout(() => NProgress.done(), 200); } };
}

// 25. AutoAnimate (MIT) : listes animées (À faire, notifications)
const obsAnim = new MutationObserver(() => {
  if (!a32('autoAnimate') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.af-liste:not([data-aa]), #toasts:not([data-aa])').forEach(el => { el.dataset.aa = '1'; try { autoAnimate(el, { duration: 220 }); } catch { } });
});
obsAnim.observe(document.body, { childList: true, subtree: true });

// 26-28. openfootball worldcup.json / euro.json / champions-league (CC0) : palmarès réels
const __vIntlL = vIntl;
vIntl = function (el) {
  __vIntlL(el);
  if (INTL_TAB !== 'tourn' || typeof DO2_CDM === 'undefined') return;
  const lst = (o) => Object.entries(o).reverse().map(([a, w]) => `<tr><td>${esc(a)}</td><td>${esc(w)}</td></tr>`).join('');
  $('#itBody')?.insertAdjacentHTML('beforeend', `<div class="grid2"><section class="card"><h2>${gi('trophy-cup')} Palmarès réel — Coupe du monde</h2><table class="tbl compact">${lst(DO2_CDM)}</table></section>
    <section class="card"><h2>${gi('laurels-trophy')} Palmarès réel — Euro et Ligue des champions</h2><table class="tbl compact">${lst(DO2_EURO)}</table><h3>Ligue des champions</h3><table class="tbl compact">${lst(DO2_LDC)}</table>
    <p class="hint">Source : openfootball (domaine public).</p></section></div>`);
};
// 29. SkillCorner/opendata (MIT) : profil physique estimé sur la fiche joueur
const GROUPE_SC = { GB: null, DC: 'Central Defender', DG: 'Full Back', DD: 'Full Back', MDC: 'Midfield', MC: 'Midfield', MOC: 'Midfield', AG: 'Wide Attacker', AD: 'Wide Attacker', BU: 'Center Forward' };
const __playerModalL = playerModal;
playerModal = function (pid, tab = 'profil') {
  __playerModalL(pid, tab);
  const p = getPlayer(G, pid), g = p && GROUPE_SC[p.pos], ref = g && typeof DO2_PHYSIQUE !== 'undefined' && DO2_PHYSIQUE[g];
  if (!ref || tab !== 'profil') return;
  const k = .9 + (p.attrs.phy - 10) * .012 + (p.attrs.vit - 10) * .006;
  const km = (ref.mpm * 90 * k / 1000).toFixed(1), sp = Math.round(ref.sprints * (.85 + (p.attrs.vit - 10) * .03));
  ($('#modal .traits') || $('#modal .tabs'))?.insertAdjacentHTML('afterend', `<p class="hint phys">🏃 Profil physique estimé : <b>${km.replace('.', ',')} km</b> par match, ~${sp} sprints — référence SkillCorner (${g}, ${ref.n} joueurs).</p>`);
};
// 30. game-icons.net (CC BY 3.0) : trophées illustrés — Delapouite et Lorc, https://game-icons.net
function gi(nom) { return `<img class="gi" src="vendor/game-icons/${nom}.svg" alt="" width="20" height="20">`; }

// boutons d'export / défi / raccourcis dans les écrans concernés
const __vSquadL = vSquad;
vSquad = function (el, id) { __vSquadL(el, id); if (id == null || id === G.clubId) el.querySelector('section.card h2')?.insertAdjacentHTML('beforeend', ' <button class="btn sm ghost no-capture" id="csvEff" data-tip="Exporter l\'effectif en CSV (tableur)">⬇ CSV</button>'); $('#csvEff')?.addEventListener('click', csvEffectif); };
const __vOptionsL = vOptions;
vOptions = function (el) {
  __vOptionsL(el);
  el.querySelector('section.card h2')?.insertAdjacentHTML('afterend', `<p class="row gap wrap"><button class="btn" id="oDefi">🎯 Lancer un défi (lien / QR code)</button><button class="btn" id="oCsv">⬇ Classement en CSV</button><button class="btn" id="oKeys">⌨ Raccourcis</button>
    <label class="chk">Langue de l'interface <select id="oLang"><option value="fr" ${LANGUE === 'fr' ? 'selected' : ''}>Français</option><option value="en" ${LANGUE === 'en' ? 'selected' : ''}>English (partiel)</option></select></label></p>`);
  $('#oDefi').onclick = partagerDefi; $('#oCsv').onclick = csvClassement; $('#oKeys').onclick = aideRaccourcis;
  $('#oLang').onchange = e => { try { localStorage.setItem('mf-langue', e.target.value); } catch { } location.reload(); };
};
if (typeof entreesPalette === 'function') {
  const __entreesL = entreesPalette;
  entreesPalette = function (q) {
    const r = __entreesL(q), n = sansAccent(q.trim());
    for (const [l, i, go] of [['Lancer un défi (lien, QR code)', '🎯', partagerDefi], ['Exporter l\'effectif en CSV', '⬇', csvEffectif], ['Raccourcis clavier', '⌨', aideRaccourcis], ['Aide et documentation', '❓', () => show('aide')]])
      if (n && sansAccent(l).includes(n)) r.unshift({ t: 'action', i, l, s: 'Action', go });
    return r;
  };
}
