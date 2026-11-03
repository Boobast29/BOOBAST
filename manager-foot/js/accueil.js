// ============================================================
//  Page d'accueil réorganisée
//  1. « Continuer » : ta dernière partie en grand, un seul bouton.
//  2. « Nouvelle partie » : trois façons de jouer, côte à côte (monde étendu FM26, monde réel importé, monde fictif).
//  3. Mes parties (toutes les sauvegardes), puis le monde fictif détaillé, puis les outils (catalogue, fichiers).
//  Les blocs existants sont déplacés (leurs boutons gardent leurs actions) ; rien n'est recalculé.
//  Correction : la carte d'une sauvegarde portait la classe .slot, aussi utilisée par les postes du terrain de la
//  tactique (position absolue) → carte écrasée et sortie de sa colonne à la reprise d'une partie.
// ============================================================
async function organiserAccueil() {
  const wrap = document.querySelector('#app .start-wrap'); if (!wrap || wrap.dataset.ac) return;
  wrap.dataset.ac = '1'; wrap.classList.add('ac');
  const hero = wrap.querySelector('.hero'), slots = wrap.querySelector('#slotsCard'), fmb = wrap.querySelector('#fmbAccueil'),
    monde = wrap.querySelector('#mondeCard'), fichiers = [...wrap.children].find(e => e.querySelector?.('#btnLoadFile')),
    fictif = [...wrap.children].find(e => e.querySelector?.('.club-grid'));
  hero?.querySelector('.hero-etapes')?.remove();
  const sub = hero?.querySelector('.sub'); if (sub) sub.textContent = 'Dirige un club : effectif, staff, centre de formation, mercato et matchs en direct.';
  const l = (typeof slotsList === 'function' ? await slotsList() : []).sort((a, b) => b.saved.localeCompare(a.saved));
  const der = l[0];
  const mondeDispo = monde && !/non disponible/i.test(monde.textContent);
  const ac = document.createElement('div'); ac.className = 'ac-corps';
  ac.innerHTML = `
    ${der ? `<section class="ac-continuer" style="--c1:${der.colors?.[0] || '#2fd27a'}">
      <div class="ac-c-ecusson">${crest({ name: der.club || '?', short: der.short, colors: der.colors || ['#345', '#fff'], logo: der.logo }, 64)}</div>
      <div class="ac-c-txt"><p class="ac-eye">Continuer</p><h2>${esc(der.name || der.club)}</h2>
        <p>${esc(der.manager || '')} · saison ${der.season}/${String(der.season + 1).slice(2)} · ${esc(der.week || '')}${der.real ? ' · ' + esc(der.real) : ''}</p>
        <small>Sauvegardé le ${new Date(der.saved).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</small></div>
      <button class="btn primary ac-c-btn" id="acJouer">Reprendre la partie</button></section>` : ''}
    <section class="ac-modes"><h2 class="ac-titre">Nouvelle partie</h2><div class="ac-grille">
      <button class="ac-mode" id="acEtendu"><span class="ac-m-tag">Recommandé</span><b>Monde étendu</b>
        <span>Angleterre, France, Allemagne, Italie, Espagne (3 divisions, vrais effectifs FM26 avec réserve et U19) + 27 championnats européens.</span><em>Choisir un club →</em></button>
      <button class="ac-mode ${mondeDispo ? '' : 'off'}" id="acReel"><b>Monde réel importé</b>
        <span>${mondeDispo ? 'Ta base importée (Football Monde) : toutes ses divisions.' : 'Nécessite la base mondiale : lance <code>Tout_Installer.bat</code> une fois.'}</span><em>${mondeDispo ? 'Choisir un pays →' : 'Comment l\'installer ?'}</em></button>
      <button class="ac-mode" id="acFictif"><b>Monde fictif</b><span>58 clubs inventés sur trois divisions, éditables : idéal pour découvrir le jeu.</span><em>Choisir un club →</em></button>
    </div></section>
    <section class="ac-section" id="acParties"></section>
    <section class="ac-section" id="acFictifZone"></section>
    <section class="ac-section" id="acReelZone"></section>
    <section class="ac-outils" id="acOutils"><h2 class="ac-titre">Outils</h2><div class="ac-o-grille"></div></section>`;
  hero.after(ac);
  if (l.length > 1 || !der) ac.querySelector('#acParties').append(slots); else slots?.remove();
  if (fictif) ac.querySelector('#acFictifZone').append(fictif);
  if (monde) { if (mondeDispo) ac.querySelector('#acReelZone').append(monde); else monde.remove(); } // non installé : le message est dans la carte « Monde réel importé »
  const outils = ac.querySelector('.ac-o-grille');
  for (const e of [fmb, fichiers]) if (e) outils.append(e);
  outils.insertAdjacentHTML('afterbegin', `<div class="card ac-maj"><h2>Données du jeu</h2>
    <p>Installe ou met à jour tout en une fois : base mondiale, effectifs et contrats réels, photos, logos, maillots, palmarès, championnats européens, visages.</p>
    <button class="btn primary" id="acMaj">Tout installer / mettre à jour</button><p class="hint">Internet nécessaire. Même chose que <code>Tout_Installer.bat</code> dans le dossier du jeu.</p></div>`);
  outils.querySelector('#acMaj').onclick = suivreInstallation;
  const viser = id => ac.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  ac.querySelector('#acJouer')?.addEventListener('click', () => loadSlot(der.id));
  ac.querySelector('#acEtendu').onclick = () => typeof ouvrirMondeEtendu === 'function' ? ouvrirMondeEtendu() : toast('Monde étendu indisponible dans cette version.', 'err');
  ac.querySelector('#acReel').onclick = () => mondeDispo ? viser('#acReelZone') : modal(`<h2>Installer la base mondiale</h2>
    <p>Double-clique sur <b>Tout_Installer.bat</b> (dans le dossier du jeu) : il télécharge et prépare tout en une fois (base, données réelles, photos, logos), puis lance le jeu.</p>
    <p class="hint">Internet nécessaire, une seule fois. Ensuite le jeu fonctionne hors ligne.</p>`);
  ac.querySelector('#acFictif').onclick = () => viser('#acFictifZone');
}
async function suivreInstallation() {
  let r;
  try { r = await fetch('/api/installation', { method: 'POST' }); } catch { r = null; }
  if (!r || !r.ok) return modal(`<h2>Mise à jour depuis le jeu indisponible</h2><p>Le jeu n'est pas lancé par son serveur local. Ferme cette page et double-clique sur <b>Tout_Installer.bat</b> dans le dossier du jeu : il fait tout puis lance le jeu.</p>`);
  modal(`<h2>Installation et mise à jour</h2><div id="acEtapes" class="ac-etapes"></div><pre id="acJournal" class="ac-journal"></pre><p class="hint" id="acFin">En cours… tu peux laisser cette fenêtre ouverte.</p>`, 'wide');
  const tour = async () => {
    if (!document.querySelector('#acEtapes')) return;
    let e = {}; try { e = await (await fetch('/api/installation')).json(); } catch { }
    document.querySelector('#acEtapes').innerHTML = (e.etapes || []).map(x => `<div class="ac-et ${x.statut === 'ok' ? 'ok' : x.statut === 'échec' ? 'ko' : x.statut === 'ignorée' ? 'ig' : 'run'}"><b>${x.statut === 'ok' ? '✔' : x.statut === 'échec' ? '✘' : x.statut === 'ignorée' ? '–' : '…'}</b><span>${esc(x.nom)}</span><small>${esc(x.detail || '')}</small></div>`).join('');
    document.querySelector('#acJournal').textContent = (e.journal || []).slice(-12).join('\n');
    if (e.fini && !e.en_cours) { document.querySelector('#acFin').innerHTML = 'Terminé. <button class="btn primary" onclick="location.reload()">Recharger le jeu</button>'; return; }
    setTimeout(tour, 2000);
  };
  setTimeout(tour, 800);
}
window.addEventListener('load', () => {
  if (typeof startScreen !== 'function') return;
  const __startScreenAC = startScreen;
  startScreen = function (...a) {
    const r = __startScreenAC.apply(this, a);
    Promise.resolve(r).then(() => new Promise(res => setTimeout(res, 0))).then(organiserAccueil).catch(e => console.error(e));
    return r;
  };
  if (document.querySelector('#app .start-wrap')) organiserAccueil().catch(e => console.error(e));
});
