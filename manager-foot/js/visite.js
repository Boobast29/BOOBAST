// ============================================================
//  Visite guidée (driver.js, MIT), export en image (html-to-image, MIT), application installable hors ligne
//  - visite proposée à la première partie ; relançable depuis la palette Ctrl+K ou les Options
//  - « 📷 Image » sur la Chronique et les Classements : PNG à partager
//  - manifest.webmanifest + sw.js : le jeu s'installe sur téléphone/ordinateur et reste jouable hors ligne
//    (réseau d'abord, copie locale en secours : jamais de vieille version servie quand le serveur répond)
// ============================================================
const estMobile = () => window.matchMedia('(max-width: 900px)').matches;
function etapesVisite() {
  const m = estMobile();
  const e = [
    { element: '#top', popover: { title: 'Bienvenue, ' + esc(G.managerName) + ' !', description: 'En haut : ton club, la date, le budget, la confiance du président et le prochain match.' } },
    { element: '#btnGo', popover: { title: 'Le bouton principal', description: 'Il fait avancer le temps : jouer le match, simuler la semaine… S\'il devient orange, une décision t\'attend d\'abord. Raccourci : Espace.' } },
    { element: '.afaire', popover: { title: 'Ce que tu dois faire', description: '« Continuer va… » te dit ce qui va se passer ; dessous, tout ce qui attend une décision, du plus urgent au moins urgent. Un clic ouvre le bon écran.' } },
    m ? { element: '#tabbar', popover: { title: 'Navigation', description: 'Les écrans principaux en bas ; « Menu » ouvre toutes les sections.' } }
      : { element: '#nav', popover: { title: 'Le menu', description: 'Les écrans sont rangés par section ; clique sur un titre de section pour la replier.' } },
    { element: m ? '#ariane' : '#navCmd', popover: { title: 'Aller n\'importe où', description: 'Ctrl+K (ou ce bouton) : tape un écran, une action, un joueur ou un club — même avec une faute de frappe.' } },
    { popover: { title: 'À toi de jouer', description: 'Règlements réels, barrages jouables, mercato aux règles FIFA, sponsors de tribunes… La visite se relance depuis Ctrl+K → « Visite guidée ». Bonne saison !' } }
  ];
  return e.filter(x => !x.element || document.querySelector(x.element));
}
function lancerVisite() {
  const D = window.driver?.js?.driver;
  if (!D || !G) return toast('Visite guidée indisponible.', 'err');
  if (VIEW !== 'inbox') show('inbox');
  setTimeout(() => {
    const d = D({ showProgress: true, progressText: '{{current}} / {{total}}', nextBtnText: 'Suivant ›', prevBtnText: '‹ Précédent', doneBtnText: 'C\'est parti !',
      allowClose: true, overlayOpacity: .65, stagePadding: 6, popoverClass: 'mf-visite', steps: etapesVisite() });
    d.drive();
    try { localStorage.setItem('mf-visite', '1'); } catch { }
  }, 250);
}
const __enterGameV = enterGame;
enterGame = function () {
  __enterGameV();
  let vue = '1'; try { vue = localStorage.getItem('mf-visite'); } catch { }
  if (!vue && G && !G.__harness && window.driver?.js) setTimeout(() => { if (!$('#modal') && !LIVE) lancerVisite(); }, 900);
};
if (typeof entreesPalette === 'function') {
  const __entreesV = entreesPalette;
  entreesPalette = function (q) {
    const r = __entreesV(q), n = sansAccent(q.trim());
    if (!n || 'visite guidee aide tutoriel'.includes(n) || sansAccent('Visite guidée du jeu').includes(n)) r.unshift({ t: 'action', i: '🧭', l: 'Visite guidée du jeu', s: 'Action', go: lancerVisite });
    return r;
  };
}
const __vOptionsV = vOptions;
vOptions = function (el) {
  __vOptionsV(el);
  el.querySelector('section.card h2')?.insertAdjacentHTML('afterend', '<p><button class="btn" id="oVisite">🧭 Revoir la visite guidée</button></p>');
  $('#oVisite')?.addEventListener('click', lancerVisite);
};

// ---------- export en image ----------
async function exporterImage(node, nom) {
  if (!window.htmlToImage || !node) return toast('Export en image indisponible.', 'err');
  try {
    const fond = getComputedStyle(document.body).backgroundColor || '#0b0f14';
    const url = await htmlToImage.toPng(node, { backgroundColor: fond, pixelRatio: 2, cacheBust: true,
      filter: n => !(n.classList && (n.classList.contains('no-capture') || n.id === 'toasts')) });
    const a = document.createElement('a'); a.href = url; a.download = nom + '.png'; a.click();
    toast('Image enregistrée.');
  } catch (e) { toast('Export impossible : ' + e.message, 'err'); }
}
const boutonImage = id => `<button class="btn sm ghost no-capture" id="${id}" title="Enregistrer en image (PNG)">📷 Image</button>`;
if (typeof vChronique === 'function') {
  const __vChroniqueV = vChronique;
  vChronique = function (el) {
    __vChroniqueV(el);
    const card = el.querySelector('section.card'); if (!card) return;
    card.querySelector('h2')?.insertAdjacentHTML('beforeend', ' ' + boutonImage('imgChro'));
    $('#imgChro').onclick = () => exporterImage(card, `chronique-${G.managerName}-${G.season}`.replace(/\W+/g, '-'));
  };
}
const __vCompsV = vComps;
vComps = function (el) {
  __vCompsV(el);
  const card = $('#compBody .standings')?.closest('section.card'); if (!card) return;
  card.querySelector('h2')?.insertAdjacentHTML('beforeend', ' ' + boutonImage('imgClass'));
  const titre = (card.querySelector('h2')?.firstChild?.textContent || 'ligue').trim();
  $('#imgClass').onclick = () => exporterImage(card, `classement-${titre}`.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, '-').replace(/^-|-$/g, ''));
};

// ---------- application installable / hors ligne ----------
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.pathname.includes('/tests/')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
