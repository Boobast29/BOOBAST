// Présentation commune : les pictogrammes utilisent la bibliothèque SVG déjà embarquée.
// La navigation reste produite par les modules existants ; seule sa présentation change.
const VISUAL_NAV_ICONS = {
  inbox: 'house', mail: 'mail', calendar: 'calendar', squad: 'users',
  tactics: 'clipboard-list', training: 'dumbbell', meetings: 'messages-square',
  dressing: 'handshake', medical: 'heart-pulse', youth: 'sprout',
  fixtures: 'calendar-check', comps: 'trophy', stats: 'chart-column',
  intl: 'globe', transfers: 'arrow-left-right', deals: 'file-pen-line',
  staff: 'user-cog', finances: 'wallet', club: 'shield', analysis: 'chart-line',
  base: 'search', editor: 'pencil', options: 'settings', coach: 'user-cog',
  direction: 'briefcase', compare: 'arrow-left-right'
};

function visualNavIcons(root) {
  if (!root || typeof icone !== 'function') return;
  root.querySelectorAll('button[data-v], button[data-tab]').forEach(button => {
    const key = button.dataset.v || button.dataset.tab;
    const icon = VISUAL_NAV_ICONS[key] || (key === '__menu' ? 'menu' : null);
    const target = button.querySelector(':scope > span');
    if (icon && target && target.dataset.visualIcon !== icon) {
      target.innerHTML = icone(icon);
      target.dataset.visualIcon = icon;
    }
    if (key === button.dataset.v && button.closest('#nav')) {
      button.setAttribute('aria-current', key === VIEW ? 'page' : 'false');
    }
  });
}
function visualChrome() {
  const nav = $('#nav');
  const navContent = nav?.querySelector('[data-overlayscrollbars-viewport]') || nav;
  if (navContent && !navContent.querySelector('.nav-brand')) {
    navContent.insertAdjacentHTML('afterbegin', `<div class="nav-brand" aria-label="Manager Foot"><span class="nav-monogram">MF</span><span class="nav-brand-text"><b>MANAGER FOOT</b><small>Le bureau du club</small></span></div>`);
  }
  visualNavIcons(nav);
  visualNavIcons($('#tabbar'));
}
const visualEnterGame = enterGame;
enterGame = function (...args) { const result = visualEnterGame.apply(this, args); visualChrome(); return result; };
const visualShow = show;
show = function (...args) {
  const result = visualShow.apply(this, args);
  if (args[0] === 'direction' || args[0] === 'compare') {
    if (typeof filAriane === 'function') filAriane(VIEW);
    if (typeof majBarreMobile === 'function') majBarreMobile(VIEW);
    if (typeof accessibiliserVue === 'function') accessibiliserVue($('#main'), args[0] === 'compare' ? 'Comparer les joueurs' : 'Décisions et délégation');
  }
  visualChrome();
  return result;
};
if (typeof ouvrirTiroir === 'function') {
  const visualOpenDrawer = ouvrirTiroir;
  ouvrirTiroir = function (...args) { const result = visualOpenDrawer.apply(this, args); visualNavIcons($('#tiroir')); return result; };
}
