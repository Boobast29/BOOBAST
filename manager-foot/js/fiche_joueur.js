// ============================================================
//  Fiche joueur compacte (façon Football Manager) et personnalisable
//  - Onglet Profil : attributs détaillés à gauche (bloc principal), informations à droite, texte plus petit.
//  - « Personnaliser » : chaque bloc peut être affiché ou masqué (choix mémorisé dans ce navigateur).
//  Les blocs sont déplacés (leurs boutons et menus gardent leurs actions), rien n'est recalculé.
// ============================================================
const BLOCS_FICHE = [
  ['infos', 'Informations (personnalité, statut, contrat)', true, 'side', b => b.querySelector('.pm-body .grid2 > div:nth-child(2)')],
  ['traits', 'Traits', true, 'side', b => b.querySelector('.traits')],
  ['phys', 'Profil physique', true, 'side', b => b.querySelector('p.phys')],
  ['evo', 'Évolution du niveau et avis du staff', true, 'side', b => b.querySelector('.fe-evo')],
  ['reel', 'Données réelles (saisons, transferts, valeur)', true, 'side', b => b.querySelector('.reel-plus')],
  ['parcours', 'Parcours de progression', false, 'side', b => [...b.querySelectorAll('section.card')].find(s => /Parcours de progression/.test(s.querySelector('h2,h3')?.textContent || ''))],
  ['analyse', 'Analyse du profil (compétences, langues)', false, 'main', b => b.querySelector('.skill41')],
  ['base', 'Les 9 qualités de base', false, 'main', b => b.querySelector('.pm-body .grid2 > div:nth-child(1)')]
];
const lireBlocs = () => { try { return JSON.parse(localStorage.getItem('mf-fiche-blocs')) || {}; } catch { return {}; } };
const blocVisible = (k, def) => { const v = lireBlocs()[k]; return v === undefined ? def : v; };
function organiserFiche() {
  const box = document.querySelector('#modal .mbox'); if (!box || box.dataset.pmf) return;
  const tabs = box.querySelector(':scope > .tabs'), attr = box.querySelector('.attr36');
  if (!tabs || !attr) return; // onglet autre que Profil
  box.dataset.pmf = '1'; box.classList.add('pmf');
  const g = document.createElement('div'); g.className = 'pmf-g';
  g.innerHTML = '<div class="pmf-main"></div><div class="pmf-side"></div>';
  tabs.after(g);
  const main = g.firstChild, side = g.lastChild;
  main.append(attr);
  for (const [k, , def, col, trouver] of BLOCS_FICHE) {
    const e = trouver(box); if (!e) continue;
    e.dataset.bloc = k; e.classList.add('pmf-bloc');
    (col === 'main' ? main : side).append(e);
    e.hidden = !blocVisible(k, def);
  }
  const reste = box.querySelector('.pm-body'); if (reste && !reste.textContent.trim()) reste.remove();
  // bouton « Personnaliser » dans l'en-tête
  const tete = box.querySelector('.pm-head');
  tete?.insertAdjacentHTML('beforeend', '<button class="btn sm ghost pmf-perso" id="pmfPerso" title="Choisir les blocs affichés">Personnaliser</button>');
  // « Chercher un remplaçant de ce profil » (js/profils-similaires.js) : toujours visible, même si le bloc Analyse est masqué
  const sim = box.querySelector('#simFromPlayer'); if (sim && tete) { sim.classList.add('sm', 'ghost'); tete.querySelector('#pmfPerso')?.before(sim); }
  box.querySelector('#pmfPerso')?.addEventListener('click', e => {
    e.stopPropagation();
    let menu = box.querySelector('.pmf-menu'); if (menu) return menu.remove();
    box.querySelector('.pm-head').insertAdjacentHTML('afterend', `<div class="pmf-menu" role="group" aria-label="Blocs affichés"><b>Blocs affichés</b>${BLOCS_FICHE.filter(([, , , , t]) => t(box) || box.querySelector(`[data-bloc]`)).map(([k, l, def]) => `<label class="chk"><input type="checkbox" data-pmf="${k}" ${blocVisible(k, def) ? 'checked' : ''}> ${l}</label>`).join('')}<small class="muted">Mémorisé pour toutes les fiches.</small></div>`);
    box.querySelectorAll('[data-pmf]').forEach(c => c.onchange = () => {
      const v = lireBlocs(); v[c.dataset.pmf] = c.checked; try { localStorage.setItem('mf-fiche-blocs', JSON.stringify(v)); } catch { }
      const b = box.querySelector(`[data-bloc="${c.dataset.pmf}"]`); if (b) b.hidden = !c.checked;
    });
  });
}
window.addEventListener('load', () => {
  if (typeof playerModal !== 'function') return;
  const __playerModalPF = playerModal;
  playerModal = function () {
    const r = __playerModalPF.apply(this, arguments);
    try { organiserFiche(); } catch (e) { console.error(e); }
    return r;
  };
});
