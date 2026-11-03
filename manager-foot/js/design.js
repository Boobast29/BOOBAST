// ============================================================
//  Design v39 — retouches d'ergonomie et d'accessibilité (voir design.css)
//  - montants au format français partout (59,1 M€ et non 59.1 M€)
//  - changement d'écran : entrée douce (CSS, coupée si le système demande moins d'animations)
//  - accessibilité de chaque écran : titre de niveau 1 invisible (lecteurs d'écran), champs sans libellé
//    nommés d'après leur texte indicatif, en-têtes de colonne vides nommés, zones défilantes atteignables au clavier
// ============================================================
if (typeof money === 'function') {
  money = function (v) {
    const neg = v < 0; v = Math.abs(v);
    const nf = (x, d) => x.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d });
    const s = v >= 1e6 ? nf(v / 1e6, v >= 1e8 ? 0 : 1) + ' M€' : v >= 1e3 ? Math.round(v / 1e3) + ' k€' : Math.round(v) + ' €';
    return (neg ? '-' : '') + s;
  };
}
function accessibiliserVue(root, titre) {
  if (!root) return;
  if (titre && !root.querySelector(':scope > h1.sr-only')) root.insertAdjacentHTML('afterbegin', `<h1 class="sr-only">${esc(titre)}</h1>`);
  root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea').forEach(el => {
    if (el.getAttribute('aria-label') || el.labels?.length || el.getAttribute('aria-labelledby')) return;
    const t = el.placeholder || el.title || (el.tagName === 'SELECT' ? el.options[0]?.textContent : '');
    if (t) el.setAttribute('aria-label', t.replace(/[🔎…]/gu, '').trim());
  });
  root.querySelectorAll('th').forEach(th => { if (!th.textContent.trim() && !th.querySelector('.sr-only')) th.insertAdjacentHTML('beforeend', '<span class="sr-only">Détail</span>'); });
  // onglets segmentés : texte seul (les émojis de tête brouillaient la lecture et juraient avec les icônes du menu)
  root.querySelectorAll('.tabs > button').forEach(b => { const n = b.firstChild; if (n?.nodeType === 3) { const t = n.textContent.replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, ''); if (t !== n.textContent) n.textContent = t; } });
  root.querySelectorAll('.inbox, .scroll').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
}
if (typeof show === 'function') {
  const __showD = show;
  show = function (v) {
    const change = v !== VIEW;
    const r = __showD.apply(this, arguments);
    const main = $('#main');
    if (main) {
      const titre = document.querySelector(`#nav button[data-v="${v}"]`)?.textContent.trim() || '';
      accessibiliserVue(main, titre);
      if (change) { main.classList.remove('vue-entree'); void main.offsetWidth; main.classList.add('vue-entree'); }
    }
    return r;
  };
}
// fenêtres : mêmes retouches d'accessibilité à l'ouverture
if (typeof modal === 'function') {
  const __modalD = modal;
  modal = function () { const m = __modalD.apply(this, arguments); try { accessibiliserVue(m.querySelector('.mbox')); m.querySelector('.mbox')?.setAttribute('role', 'dialog'); m.querySelector('.mbox')?.setAttribute('aria-modal', 'true'); } catch { } return m; };
}
// notifications : zone annoncée poliment par les lecteurs d'écran
if (typeof toast === 'function') {
  const __toastD = toast;
  toast = function () { const r = __toastD.apply(this, arguments); const b = document.getElementById('toasts'); if (b && !b.getAttribute('role')) { b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Notifications'); b.setAttribute('aria-live', 'polite'); } return r; };
}
// ============================================================
//  v48 — ergonomie à la manière des jeux de gestion de football
//  - barre de section : le groupe du menu, ses écrans en sous-onglets, précédent / suivant, « Aller à… »
//  - fiche joueur : bandeau aux couleurs du club du joueur
// ============================================================
let NAV_SUIV = [], NAV_INTERNE = false;
if (typeof goBack === 'function') {
  const __goBackD = goBack;
  goBack = function () { const cur = VIEW; NAV_INTERNE = true; try { __goBackD.apply(this, arguments); } finally { NAV_INTERNE = false; } if (VIEW !== cur) NAV_SUIV.push(cur); };
}
function goForward() { const v = NAV_SUIV.pop(); if (!v) return; NAV_INTERNE = true; try { show(v); } finally { NAV_INTERNE = false; } }
if (typeof show === 'function') {
  const __showNav = show;
  show = function (v) { if (!NAV_INTERNE && v !== VIEW) NAV_SUIV = []; return __showNav.apply(this, arguments); };
}
if (typeof filAriane === 'function') {
  filAriane = function (v) {
    const main = $('#main'); if (!main || !G) return;
    $('#ariane')?.remove();
    const grp = NAV_GROUPS.find(g => g[1].some(x => x[0] === v)); if (!grp) return;
    const [nomG, items] = grp;
    main.insertAdjacentHTML('afterbegin', `<div id="ariane" class="sect-bar">
      <div class="sect-nav"><button class="btn sm" id="navPrec" title="Écran précédent (Alt+←)" aria-label="Écran précédent" ${VIEW_HIST.length ? '' : 'disabled'}>‹</button><button class="btn sm" id="navSuiv" title="Écran suivant (Alt+→)" aria-label="Écran suivant" ${NAV_SUIV.length ? '' : 'disabled'}>›</button></div>
      <span class="sect-nom">${esc(nomG)}</span>
      <nav class="sect-tabs" aria-label="${esc(nomG)}">${items.map(([k, , l]) => `<button data-sv="${k}" class="${k === v ? 'on' : ''}" ${k === v ? 'aria-current="page"' : ''}>${esc(l)}<i class="nb">${$(`#nav [data-nb="${k}"]`)?.textContent || ''}</i></button>`).join('')}</nav>
      <span class="grow"></span><button class="btn sm ghost" onclick="ouvrirPalette()" title="Ctrl+K">⌕ Aller à…</button></div>`);
    main.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => show(b.dataset.sv));
    $('#navPrec').onclick = () => goBack(); $('#navSuiv').onclick = () => goForward();
  };
}
document.addEventListener('keydown', e => {
  if (!e.altKey || !G || document.body.className !== 'game' || e.target.matches?.('input, textarea, select')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); } else if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
});
if (typeof playerModal === 'function') {
  const __playerModalD = playerModal;
  playerModal = function (pid) {
    const r = __playerModalD.apply(this, arguments);
    try { const p = getPlayer(G, pid), c = p?.club != null ? getClub(G, p.club) : null, h = $('#modal .pm-head');
      if (h && c?.colors) { h.style.setProperty('--pc1', c.colors[0]); h.style.setProperty('--pc2', c.colors[1] || '#fff'); h.classList.add('pm-club'); } } catch { }
    return r;
  };
}
