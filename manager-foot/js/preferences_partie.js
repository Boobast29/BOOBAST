// ============================================================
//  Préférences de partie (choisies au début, modifiables dans Options)
//  - Championnats : garder ou retirer les championnats étrangers simulés (moins de clubs = semaines plus rapides).
//  - Joueurs non observés : fourchette pour chaque attribut, ou « ? » (rien tant que le joueur n'est pas supervisé).
//  - Note globale masquée : plus de note (niveau) à côté des joueurs, on juge sur les attributs.
//  - Messages : normal, ou peu (le reste part dans le résumé de la semaine).
// ============================================================
const PREFS_DEFAUT = { fourchette: true, noteMasquee: false, messages: 'normal' };
const prefs = () => Object.assign({}, PREFS_DEFAUT, G?.prefs || {});
function nomPaysFR(k) { return typeof nomPays === 'function' ? nomPays(k) : k; }
function championnatsEtrangers(G) {
  const m = {};
  // seulement les championnats réels ajoutés (js/ligues_completes.js) : les clubs étrangers fictifs servent aux coupes d'Europe
  for (const c of G.clubs) if (c.foreign && c.realName && !c.worldCountry && c.id !== G.clubId) (m[c.country || '?'] ||= []).push(c);
  return Object.entries(m).filter(([, l]) => l.length >= 4).map(([k, l]) => ({ k, n: l.length, nom: l.find(c => c.leagueReal)?.leagueReal || nomPaysFR(k), rep: Math.max(...l.map(c => c.rep)) }))
    .sort((a, b) => b.rep - a.rep);
}
function retirerChampionnats(G, codes) {
  if (!codes.length) return 0;
  const ids = new Set(G.clubs.filter(c => c.foreign && c.realName && !c.worldCountry && codes.includes(c.country) && c.id !== G.clubId).map(c => c.id));
  G.clubs = G.clubs.filter(c => !ids.has(c.id));
  G.players = G.players.filter(p => !ids.has(p.club) || p.loan?.from === G.clubId);
  for (const p of G.players) if (p.loan && ids.has(p.club)) p.club = p.loan.from;
  if (G.etr) G.etr = null; // ligues étrangères recalculées
  G.shortlist = (G.shortlist || []).filter(id => G.players.some(p => p.id === id));
  if (typeof reindex === 'function') reindex(G);
  return ids.size;
}
function appliquerPrefs() {
  document.body.classList.toggle('sans-note', !!(G && prefs().noteMasquee));
}
function fenetrePrefs(premiere) {
  const P = prefs(), L = championnatsEtrangers(G), exclus = new Set(G.champExclus || []);
  modal(`<h2>${premiere ? 'Préférences de la partie' : 'Préférences de partie'}</h2>
    <p class="hint">${premiere ? 'Choisis comment tu veux jouer. Tout reste modifiable dans Options.' : 'Modifiables à tout moment.'}</p>
    <div class="pp-grille">
      <section><h3>Joueurs non observés</h3>
        <label class="pp-opt"><input type="radio" name="ppF" value="1" ${P.fourchette ? 'checked' : ''}><b>Fourchette d'attributs</b><span>Chaque attribut s'affiche « 11-15 » : plus étroite avec un bon recruteur, pas toujours centrée sur la vraie valeur.</span></label>
        <label class="pp-opt"><input type="radio" name="ppF" value="0" ${!P.fourchette ? 'checked' : ''}><b>Rien avant supervision</b><span>« ? » partout tant que ta cellule ne l'a pas observé. Plus réaliste, plus exigeant.</span></label></section>
      <section><h3>Note globale</h3>
        <label class="pp-opt"><input type="radio" name="ppN" value="0" ${!P.noteMasquee ? 'checked' : ''}><b>Afficher la note</b><span>Une note de niveau à côté de chaque joueur.</span></label>
        <label class="pp-opt"><input type="radio" name="ppN" value="1" ${P.noteMasquee ? 'checked' : ''}><b>Masquer la note</b><span>Comme dans Football Manager : tu juges un joueur sur ses attributs.</span></label></section>
      <section><h3>Messages</h3>
        <label class="pp-opt"><input type="radio" name="ppM" value="normal" ${P.messages !== 'peu' ? 'checked' : ''}><b>Normal</b><span>Jusqu'à 6 messages par semaine, le reste dans le résumé.</span></label>
        <label class="pp-opt"><input type="radio" name="ppM" value="peu" ${P.messages === 'peu' ? 'checked' : ''}><b>Peu de messages</b><span>Seulement l'essentiel (3 par semaine, plus les questions) ; tout le reste dans le résumé.</span></label></section>
    </div>
    ${L.length || exclus.size ? `<section class="pp-champ"><h3>Championnats simulés</h3><p class="hint">Décoche ceux dont tu ne veux pas : moins de clubs = semaines plus rapides. Un championnat retiré l'est pour toute la partie.</p>
      <div class="row gap"><button class="btn sm" id="ppTous">Tout cocher</button><button class="btn sm" id="ppAucun">Tout décocher</button></div>
      <div class="pp-ligues">${L.map(x => `<label class="chk"><input type="checkbox" data-champ="${x.k}" checked> ${esc(nomPaysFR(x.k))} <small class="muted">${esc(x.nom)} · ${x.n} clubs</small></label>`).join('')}
      ${[...exclus].map(k => `<label class="chk off"><input type="checkbox" disabled> ${esc(nomPaysFR(k))} <small class="muted">retiré</small></label>`).join('')}</div></section>` : ''}
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="ppOk">${premiere ? 'Commencer' : 'Enregistrer'}</button></div>`, 'wide');
  $('#ppTous')?.addEventListener('click', () => document.querySelectorAll('[data-champ]').forEach(c => c.checked = true));
  $('#ppAucun')?.addEventListener('click', () => document.querySelectorAll('[data-champ]').forEach(c => c.checked = false));
  $('#ppOk').onclick = () => {
    const v = n => document.querySelector(`input[name="${n}"]:checked`)?.value;
    G.prefs = { fourchette: v('ppF') === '1', noteMasquee: v('ppN') === '1', messages: v('ppM') || 'normal' };
    const retirer = [...document.querySelectorAll('[data-champ]')].filter(c => !c.checked).map(c => c.dataset.champ);
    const n = retirerChampionnats(G, retirer);
    if (retirer.length) G.champExclus = [...new Set([...(G.champExclus || []), ...retirer])];
    G.prefsChoisies = true;
    closeModal(); appliquerPrefs(); save();
    toast(n ? `${retirer.length} championnat(s) retiré(s) (${n} clubs).` : 'Préférences enregistrées.');
    if (typeof refresh === 'function') refresh();
  };
}
window.addEventListener('load', () => {
  if (typeof enterGame === 'function') {
    const __enterGamePP = enterGame;
    enterGame = function () {
      const r = __enterGamePP.apply(this, arguments);
      try { appliquerPrefs(); if (G && !G.prefsChoisies && !G.__harness && !navigator.webdriver && (G.week || 0) === 0 && G.season === (G.startSeason ?? G.season)) setTimeout(() => !$('#modal') && fenetrePrefs(true), 400); } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof vOptions === 'function') {
    const __vOptionsPP = vOptions;
    vOptions = function (el) {
      const r = __vOptionsPP.apply(this, arguments);
      try { if (!el.querySelector('#ppOuvrir')) (el.querySelector('section.card') || el).insertAdjacentHTML('afterend', `<section class="card"><h2>Préférences de partie</h2><p class="hint">Fourchettes des joueurs non observés, note globale, nombre de messages, championnats simulés.</p><button class="btn primary" id="ppOuvrir">Modifier</button></section>`); el.querySelector('#ppOuvrir').onclick = () => fenetrePrefs(false); } catch (e) { console.error(e); }
      return r;
    };
  }
});

// ---------- note globale masquée : badges et colonnes « Note » cachés partout ----------
function masquerColonnesNote(racine) {
  if (!document.body.classList.contains('sans-note')) return;
  racine.querySelectorAll('table').forEach(t => {
    const ths = [...t.querySelectorAll('thead th, tr:first-child th')];
    ths.forEach((th, i) => {
      if (!/^(note|niv\.?|niveau|ovr)$/i.test(th.textContent.trim()) || th.dataset.sn) return;
      th.dataset.sn = 1; th.classList.add('sn-cache');
      t.querySelectorAll('tbody tr, tr').forEach(tr => { const td = tr.children[i]; if (td && td.tagName === 'TD') td.classList.add('sn-cache'); });
    });
  });
}
new MutationObserver(() => { clearTimeout(masquerColonnesNote._t); masquerColonnesNote._t = setTimeout(() => { for (const id of ['#main', '#modal']) { const e = document.querySelector(id); if (e) masquerColonnesNote(e); } }, 60); })
  .observe(document.documentElement, { childList: true, subtree: true });

// ---------- messages : nombre limité par semaine (le reste part dans le résumé de la semaine) ----------
if (typeof news === 'function') {
  const __newsPP = news;
  news = function (G, text, type = 'info', worldOnly = false) {
    if (!worldOnly && G && G.clubId != null && !G.__sansResume && !(typeof estMineur === 'function' && estMineur(G, String(text), type)) && !['inj', 'board', 'trophy', 'loss', 'win', 'cup'].includes(type) && !/^\W*📊|Résumé de la semaine|Rapport de match/.test(text)) {
      const cle = `${G.season}|${G.week}`, lim = (G.prefs?.messages === 'peu') ? 3 : 6;
      if (G.msgSemaine?.cle !== cle) G.msgSemaine = { cle, n: 0 };
      if (G.msgSemaine.n >= lim) { (G.resumeSemaine ||= []).push({ text: String(text).replace(/^[^\wÀ-ÿ«"]+/u, ''), type }); return; }
      G.msgSemaine.n++;
    }
    return __newsPP.apply(this, arguments);
  };
}
