// ============================================================
//  Confort de jeu
//  - Notifications : deux au plus à l'écran, regroupées si identiques, en bas à gauche (elles ne couvrent plus les
//    boutons de réponse de la messagerie ni les fiches).
//  - Messagerie : les nouvelles de faible importance (traits découverts, rumeurs, crises et tensions dans d'autres clubs,
//    succès) sont regroupées en un « Résumé de la semaine » au lieu d'un message chacune.
// ============================================================
const RESUME_MOTIFS = [/Trait découvert/i, /Rumeur/i, /Succès débloqué/i, /^\W*Crise à /i, /^\W*Tensions? dans le vestiaire d(?:e|u|es) (?!ton)/i, /^\W*(?:Le mercato d'été|Le mercato d'hiver)/i, /déjà \d+ buts en /i];
function estMineur(G, text, type) {
  if (/Succès débloqué/i.test(text)) return true;
  if (!['info', 'press', 'warn'].includes(type)) return false;
  if (RESUME_MOTIFS.some(r => r.test(text))) return true;
  // nouvelle d'un autre club (son nom en tête, pas le tien)
  const me = myClub(G);
  if (type !== 'warn' && /^\W*🔥/u.test(text) && me && !text.includes(me.name)) return true;
  return false;
}
if (typeof news === 'function') {
  const __newsCF = news;
  news = function (G, text, type = 'info', worldOnly = false) {
    if (!worldOnly && G && G.clubId != null && !G.__sansResume && estMineur(G, String(text), type)) {
      (G.resumeSemaine ||= []).push({ text: String(text).replace(/^[^\wÀ-ÿ«"]+/u, ''), type });
      return;
    }
    return __newsCF.apply(this, arguments);
  };
}
function publierResume(G) {
  const R = G.resumeSemaine; if (!R?.length) return;
  G.resumeSemaine = [];
  G.__sansResume = true;
  try {
    news(G, `📰 Résumé de la semaine — ${R.length} nouvelle${R.length > 1 ? 's' : ''} : traits découverts, rumeurs, autres clubs.`, 'info');
    if (G.inbox[0]) { G.inbox[0].items = R.map(x => x.text); G.inbox[0].resume = true; }
  } finally { G.__sansResume = false; }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateCF = weeklyUpdate;
  weeklyUpdate = function (G) { const r = __weeklyUpdateCF.apply(this, arguments); try { publierResume(G); } catch (e) { console.error(e); } return r; };
}

window.addEventListener('load', () => {
  // ---------- notifications ----------
  if (typeof toast === 'function') {
    const __toastCF = toast, recents = new Map();
    toast = function (msg, ...a) {
      const k = String(msg), t = performance.now();
      if (recents.has(k) && t - recents.get(k) < 4000) return; // même message en rafale : une seule fois
      recents.set(k, t); if (recents.size > 30) recents.delete(recents.keys().next().value);
      const r = __toastCF.call(this, msg, ...a);
      const garder = (sel, n) => { const L = [...document.querySelectorAll(sel)]; L.slice(0, Math.max(0, L.length - n)).forEach(e => e.remove()); };
      garder('.notyf__toast', 2); garder('#toasts .toast', 2);
      return r;
    };
  }
  // ---------- messagerie : affichage du résumé ----------
  if (typeof vMail === 'function') {
    const __vMailCF = vMail;
    vMail = function (el) {
      const r = __vMailCF.apply(this, arguments);
      try {
        const sel = typeof MAIL_SEL !== 'undefined' ? G.inbox.find(m => m.id === MAIL_SEL) : null;
        const corps = el.querySelector('.mx-msg .mx-corps');
        if (sel?.items?.length && corps) corps.innerHTML = `<ul class="mx-resume">${sel.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
