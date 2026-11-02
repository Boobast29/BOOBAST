// ============================================================
//  Thème v29 : icônes Lucide (ISC) à la place des émojis de navigation, police Inter (OFL),
//  jetons d'animation et d'ombre Open Props (MIT) — fichiers et licences dans vendor/.
// ============================================================
const ICONE_VUE = {
  inbox: 'house', mail: 'mail', calendar: 'calendar', career: 'briefcase', chronique: 'book-open',
  squad: 'users', plan: 'clipboard-list', coach: 'user-cog', tactics: 'clipboard', training: 'dumbbell', meetings: 'messages-square',
  dressing: 'handshake', medical: 'heart-pulse', youth: 'sprout',
  transfers: 'arrow-left-right', cell: 'binoculars', deals: 'file-pen-line', staff: 'id-card',
  board: 'landmark', finances: 'wallet', club: 'shield', fixtures: 'calendar-check', comps: 'trophy', regles: 'scale',
  stats: 'chart-column', analysis: 'chart-line', intl: 'globe', base: 'search', editor: 'pencil', options: 'settings', __menu: 'menu'
};
function iconifier(racine = document) {
  if (typeof icone !== 'function') return;
  racine.querySelectorAll('#nav button[data-v] > span, #tiroir button[data-v] > span, #tabbar button[data-tab] > span').forEach(s => {
    const b = s.parentElement, k = b.dataset.v || b.dataset.tab, nom = ICONE_VUE[k];
    if (!nom || s.dataset.ico === nom) return;
    s.dataset.ico = nom; s.innerHTML = icone(nom);
  });
  const cmd = racine.querySelector?.('#navCmd > span');
  if (cmd && !cmd.dataset.ico) { cmd.dataset.ico = 'search'; cmd.innerHTML = icone('search'); }
  const ar = document.querySelector('#ariane b');
  if (ar && !ar.dataset.ico && typeof VIEW !== 'undefined' && ICONE_VUE[VIEW]) {
    ar.dataset.ico = '1';
    ar.innerHTML = icone(ICONE_VUE[VIEW]) + ' ' + esc(NAV_FLAT.find(x => x[0] === VIEW)?.[2] || ar.textContent);
  }
  const go = document.getElementById('btnGo');
  if (go && !go.querySelector('.ico') && !go.classList.contains('blocked')) {
    go.textContent = go.textContent.replace(/\s*▶\s*$/, ''); // la flèche texte est remplacée par l'icône
    go.insertAdjacentHTML('afterbegin', icone('play', 'ico-go'));
  }
}
const obsIcones = new MutationObserver(() => iconifier());
const lancerObs = () => obsIcones.observe(document.body, { childList: true, subtree: true });
if (document.body) lancerObs(); else document.addEventListener('DOMContentLoaded', lancerObs);
