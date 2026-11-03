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
