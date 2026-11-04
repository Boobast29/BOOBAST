// ============================================================
//  Comparaison de plusieurs joueurs (jusqu'à 4)
//  - « Comparer » sur chaque fiche ajoute le joueur à la sélection ; une barre en bas d'écran montre la sélection.
//  - Fenêtre de comparaison : profil (âge, poste, club, niveau et potentiel estimés, valeur, salaire, contrat), saison
//    (matchs, buts, passes, note moyenne), radar des 9 qualités de base, tous les attributs détaillés par famille.
//    Meilleure valeur de chaque ligne mise en avant. Joueurs mal connus : fourchettes du recruteur (comme la fiche).
// ============================================================
const CMP_MAX = 4, CMP_COUL = ['#2fd27a', '#4aa3ff', '#f5b642', '#c58cff'];
const CMP_FAM = { tech: 'Technique', ment: 'Mental', phys: 'Physique', gb: 'Gardien' };
function cmpListe() { G.comparer = (G.comparer || []).filter(id => getPlayer(G, id)); return G.comparer; }
function basculerComparaison(pid) {
  const L = cmpListe(), p = getPlayer(G, pid); if (!p) return;
  const i = L.indexOf(pid);
  if (i >= 0) { L.splice(i, 1); toast(`${p.name} retiré de la comparaison.`); }
  else if (L.length >= CMP_MAX) return toast(`Comparaison limitée à ${CMP_MAX} joueurs : retire-en un d'abord.`, 'err');
  else { L.push(pid); toast(`${p.name} ajouté à la comparaison (${L.length}/${CMP_MAX}).`); }
  save(); barreComparaison();
  const b = document.querySelector('#cmpAdd'); if (b) majBoutonFiche(b, pid);
}
function majBoutonFiche(b, pid) { const on = cmpListe().includes(pid); b.textContent = on ? 'Retirer de la comparaison' : 'Comparer'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
function barreComparaison() {
  let bar = document.querySelector('#cmpBar');
  const L = typeof G !== 'undefined' && G ? cmpListe() : [];
  if (!L.length || typeof LIVE !== 'undefined' && LIVE) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'cmpBar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Joueurs à comparer'); document.body.appendChild(bar); }
  bar.innerHTML = `<span class="cmp-noms">${L.map((id, i) => `<span class="cmp-chip" style="--c:${CMP_COUL[i]}">${esc(getPlayer(G, id).name)}<button data-cmpx="${id}" aria-label="Retirer ${esc(getPlayer(G, id).name)}">×</button></span>`).join('')}</span>
    <button class="btn primary sm" id="cmpGo" ${L.length < 2 ? 'disabled title="Ajoute au moins 2 joueurs"' : ''}>Comparer ${L.length}</button>`;
  bar.querySelectorAll('[data-cmpx]').forEach(b => b.onclick = () => basculerComparaison(+b.dataset.cmpx));
  bar.querySelector('#cmpGo').onclick = () => fenetreComparaison();
}
function valeurCmp(p, k, D) {
  const e = typeof attrEstime === 'function' ? attrEstime(p, k, D) : { v: D[k], txt: String(D[k]) };
  return e ? { v: e.v, txt: e.txt } : { v: null, txt: '—' };
}
function radarCmp(ps) {
  const keys = Object.keys(ATTRS), n = keys.length, cx = 130, cy = 118, R = 88;
  const pt = (i, v) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return [cx + Math.cos(a) * R * v / 20, cy + Math.sin(a) * R * v / 20]; };
  const base = (p, k) => knows(G, p) ? p.attrs[k] : Math.round(p.attrs[k] / 2) * 2; // joueur mal connu : arrondi
  const grille = [5, 10, 15, 20].map(v => `<polygon points="${keys.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
  const polys = ps.map((p, j) => `<polygon points="${keys.map((k, i) => pt(i, base(p, k)).join(',')).join(' ')}" fill="${CMP_COUL[j]}" fill-opacity=".14" stroke="${CMP_COUL[j]}" stroke-width="2"/>`).join('');
  const lab = keys.map((k, i) => { const [x, y] = pt(i, 24); return `<text x="${x}" y="${y}" font-size="9" fill="var(--mut)" text-anchor="middle" dominant-baseline="middle">${ATTRS[k]}</text>`; }).join('');
  return `<svg viewBox="0 0 260 240" class="cmp-radar" role="img" aria-label="Radar des 9 qualités de base">${grille}${polys}${lab}</svg>`;
}
function fenetreComparaison() {
  const ps = cmpListe().map(id => getPlayer(G, id)).filter(Boolean);
  if (ps.length < 2) return toast('Ajoute au moins 2 joueurs à comparer.', 'err');
  const Ds = ps.map(p => attributsDetail(p)), sans = G.prefs?.noteMasquee;
  // ligne : valeurs [{v (pour le classement), txt}], sens : 1 = plus haut meilleur, -1 = plus bas meilleur, 0 = pas de classement
  const ligne = (lab, vals, sens = 1) => {
    const nums = vals.map(x => x.v).filter(v => v != null && Number.isFinite(v));
    const best = sens && nums.length > 1 && new Set(nums).size > 1 ? (sens > 0 ? Math.max(...nums) : Math.min(...nums)) : null;
    return `<tr><th scope="row">${lab}</th>${vals.map(x => `<td class="${best != null && x.v === best ? 'cmp-best' : ''}">${x.txt}</td>`).join('')}</tr>`;
  };
  const pot = p => typeof estimPotentiel === 'function' ? estimPotentiel(G, p) : { lo: p.pot, hi: p.pot };
  const niv = p => { const v = knows(G, p) ? playerOvr(p) : (estOvr(G, p) || playerOvr(p)); return v; };
  const s = p => p.stats || {};
  const profil = [
    ligne('Âge', ps.map(p => ({ v: p.age, txt: `${p.age} ans` })), 0),
    ligne('Poste', ps.map(p => ({ v: null, txt: esc(p.pos + (typeof postesSecondaires === 'function' && postesSecondaires(p)?.length ? ` <small class="muted">${postesSecondaires(p).slice(0, 2).join(', ')}</small>` : '')) })), 0),
    ligne('Club', ps.map(p => ({ v: null, txt: esc(p.club != null ? getClub(G, p.club)?.name || '—' : 'Libre') })), 0),
    sans ? '' : ligne('Niveau', ps.map(p => ({ v: niv(p), txt: knows(G, p) ? String(niv(p)) : `≈ ${niv(p)}` }))),
    ligne('Potentiel estimé', ps.map(p => { const e = pot(p); return { v: (e.lo + e.hi) / 2, txt: typeof starsTxt === 'function' ? (e.lo === e.hi ? starsTxt(e.lo) : `${starsTxt(e.lo)} à ${starsTxt(e.hi)}`) : '?' }; })),
    ligne('Valeur', ps.map(p => ({ v: p.value, txt: money(p.value || 0) })), 0),
    ligne('Salaire', ps.map(p => ({ v: p.wage, txt: typeof wageM === 'function' ? wageM(p.wage) : money(p.wage) })), -1),
    ligne('Contrat', ps.map(p => ({ v: null, txt: p.club == null ? '—' : typeof contractEnd === 'function' ? contractEnd(p) : `${p.contract} an(s)` })), 0)
  ].join('');
  const saison = [
    ligne('Matchs', ps.map(p => ({ v: s(p).apps || 0, txt: String(s(p).apps || 0) }))),
    ligne('Buts', ps.map(p => ({ v: s(p).goals || 0, txt: String(s(p).goals || 0) }))),
    ligne('Passes décisives', ps.map(p => ({ v: s(p).assists || 0, txt: String(s(p).assists || 0) }))),
    ligne('Note moyenne', ps.map(p => { const r = s(p).apps ? s(p).rating / s(p).apps : null; return { v: r, txt: r ? r.toFixed(2).replace('.', ',') : '—' }; }))
  ].join('');
  const avecGB = ps.some(p => p.pos === 'GB'), toutGB = ps.every(p => p.pos === 'GB');
  const familles = Object.entries(CMP_FAM).filter(([f]) => f === 'gb' ? avecGB : !(toutGB && f === 'tech')).map(([f, nom]) => {
    const rows = ATTR_DETAIL.filter(a => a[2] === f).map(([k, lab]) => { const vals = ps.map((p, i) => valeurCmp(p, k, Ds[i])); return vals.some(v => v.v != null) ? ligne(esc(lab), vals) : ''; }).join('');
    return rows ? `<tbody><tr class="cmp-sep"><th colspan="${ps.length + 1}">${nom}</th></tr>${rows}</tbody>` : '';
  }).join('');
  const tete = `<thead><tr><th></th>${ps.map((p, i) => `<th class="cmp-j" style="--c:${CMP_COUL[i]}"><button class="cmp-nom" data-cmpo="${p.id}">${typeof avatar === 'function' ? avatar(p, 36) : ''}<b>${esc(p.name)}</b></button><button class="cmp-ret" data-cmpr="${p.id}" aria-label="Retirer ${esc(p.name)}">Retirer</button></th>`).join('')}</tr></thead>`;
  modal(`<h2>Comparaison de ${ps.length} joueurs</h2>
    <div class="cmp-haut"><figure class="cmp-fig">${radarCmp(ps)}<figcaption class="cmp-leg">${ps.map((p, i) => `<span><i style="background:${CMP_COUL[i]}"></i>${esc(p.name)}</span>`).join('')}</figcaption></figure><p class="hint">En vert : le meilleur de chaque ligne. Joueurs que ton recruteur connaît mal : fourchettes et niveau approximatif (≈). Clique un nom pour ouvrir sa fiche.</p></div>
    <div class="tbl-wrap"><table class="tbl compact cmp-tbl">${tete}<tbody><tr class="cmp-sep"><th colspan="${ps.length + 1}">Profil</th></tr>${profil}<tr class="cmp-sep"><th colspan="${ps.length + 1}">Saison</th></tr>${saison}</tbody>${familles}</table></div>`, 'wide');
  document.querySelectorAll('[data-cmpo]').forEach(b => b.onclick = () => { closeModal(); playerModal(+b.dataset.cmpo); });
  document.querySelectorAll('[data-cmpr]').forEach(b => b.onclick = () => { basculerComparaison(+b.dataset.cmpr); if (cmpListe().length >= 2) fenetreComparaison(); else closeModal(); });
}
window.addEventListener('load', () => {
  if (typeof playerModal === 'function') {
    const __playerModalCMP = playerModal;
    playerModal = function (pid) {
      const r = __playerModalCMP.apply(this, arguments);
      try {
        const head = document.querySelector('#modal .pm-head');
        if (head && !head.querySelector('#cmpAdd')) {
          const b = document.createElement('button'); b.id = 'cmpAdd'; b.className = 'btn sm ghost cmp-add'; majBoutonFiche(b, +pid);
          b.onclick = e => { e.stopPropagation(); basculerComparaison(+pid); };
          const perso = head.querySelector('#pmfPerso'); perso ? perso.before(b) : head.appendChild(b);
        }
      } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof show === 'function') {
    const __showCMP = show;
    show = function () { const r = __showCMP.apply(this, arguments); try { barreComparaison(); } catch (e) { console.error(e); } return r; };
  }
  // page Analyse : entrée vers la comparaison multiple
  if (typeof vAnalysis === 'function') {
    const __vAnalysisCMP = vAnalysis;
    vAnalysis = function (el) {
      const r = __vAnalysisCMP.apply(this, arguments);
      try {
        const h = [...el.querySelectorAll('h2')].find(x => /Comparer deux joueurs/.test(x.textContent));
        if (h && !el.querySelector('#cmpMulti')) h.insertAdjacentHTML('afterend', `<p class="hint">Pour comparer jusqu'à ${CMP_MAX} joueurs, touche « Comparer » sur leurs fiches. <button class="btn sm" id="cmpMulti" ${cmpListe().length < 2 ? 'disabled' : ''}>Ouvrir la comparaison (${cmpListe().length})</button></p>`);
        el.querySelector('#cmpMulti')?.addEventListener('click', fenetreComparaison);
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
