// ============================================================
//  Recherche de joueurs avancée (Mercato › Recherche)
//  Filtres : nom, postes (plusieurs), âge min/max, nationalité, pays du club, championnat, pied, fin de contrat, valeur
//  et salaire max, libres / en vente, joueurs observés ou non, jusqu'à 3 attributs avec une valeur minimale.
//  Tri : clic sur n'importe quelle colonne (âge, valeur, contrat, chaque attribut affiché…), croissant ou décroissant.
//  Joueur non observé : l'attribut est estimé (milieu de la fourchette affichée sur sa fiche) ou inconnu (« ? »)
//  selon les préférences de la partie — la recherche ne révèle jamais la vraie valeur.
// ============================================================
let RA = { q: '', postes: [], ageMin: '', ageMax: '', tMin: '', tMax: '', nat: '', pays: '', lg: '', pied: '', contrat: '', valMax: '', salMax: '', libres: false, obs: '', attrs: [['', '', '>=']], col: '', tri: { k: 'age', d: 1 } };
const RA_ATTRS = typeof ATTR_DETAIL !== 'undefined' ? ATTR_DETAIL.map(([k, l]) => [k, l]) : [];
// critères façon Football Manager : attributs par famille, note au poste, notes cachées (estimées)
const RA_SPECIAUX = [['np', 'Note au poste (sur 20)'], ['nc_prof', 'Professionnalisme (caché)'], ['nc_pres', 'Pression (caché)'], ['nc_temp', 'Tempérament (caché)'], ['nc_amb', 'Ambition (caché)'], ['nc_fid', 'Fidélité (cachée)'], ['nc_fair', 'Fair-play (caché)'], ['nc_pol', 'Polémique (caché)']];
RA_ATTRS.push(...RA_SPECIAUX);
function valeurCritere(p, k, D) {
  if (k === 'np') { const n = typeof notePoste === 'function' ? notePoste(p, p.pos, D) : 10; return knows(G, p) ? { v: n, txt: n.toFixed(1).replace('.', ','), exact: true } : { v: (estOvr(G, p) || 50) / 5, txt: '~' + Math.round((estOvr(G, p) || 50) / 5), exact: false }; }
  if (k.startsWith('nc_')) {
    if (typeof notesCachees !== 'function') return null;
    const c = typeof connaissance === 'function' ? connaissance(G, p) : 100; if (c <= 0) return { v: null, txt: '?', exact: false };
    const v = notesCachees(p)[k.slice(3)]; return { v, txt: `~${v}`, exact: false };
  }
  return attrEstime(p, k, D);
}
function attrEstime(p, k, D) {
  const v = D[k]; if (v == null) return null;
  if (typeof knows !== 'function' || knows(G, p)) return { v, txt: String(v), exact: true };
  if (G.prefs && G.prefs.fourchette === false) return { v: null, txt: '?', exact: false };
  const e = typeof largeurFourchette === 'function' ? largeurFourchette(p) : Math.max(1, 4 - Math.floor((G?.staff?.scout || 2) / 2)), h = typeof hashTrait === 'function' ? hashTrait(`fourch|${p.id}|${k}`) : 0;
  const dec = (h % (2 * e + 1)) - e, lo = clamp(v + dec - e, 1, 20), hi = clamp(v + dec + e, 1, 20);
  return { v: (lo + hi) / 2, txt: `${lo}-${hi}`, exact: false };
}
function finContrat(p) { return G.season + (p.contract || 0); }
function vRechercheAvancee(host) {
  RA.attrs = (RA.attrs || []).map(a => [a[0] || '', a[1] ?? '', a[2] || '>=']); RA.mode ||= 'et';
  const attrsActifs = [...new Set([...RA.attrs.map(a => a[0]).filter(Boolean), RA.col].filter(Boolean))];
  const etiquette = k => RA_ATTRS.find(a => a[0] === k)?.[1] || k;
  let L = G.players.filter(p => p.club !== G.clubId && !p.loan && !p.academy && p.club !== undefined);
  const nq = RA.q && (typeof normName === 'function' ? normName(RA.q) : RA.q.toLowerCase());
  L = L.filter(p => {
    if (nq && !(typeof normName === 'function' ? normName(p.name) : p.name.toLowerCase()).includes(nq)) return false;
    if (RA.postes.length && !RA.postes.includes(p.pos)) return false;
    if (RA.ageMin && p.age < +RA.ageMin) return false;
    if (RA.ageMax && p.age > +RA.ageMax) return false;
    if (RA.tMin && typeof tailleDe === 'function' && tailleDe(p) < +RA.tMin) return false;
    if (RA.tMax && typeof tailleDe === 'function' && tailleDe(p) > +RA.tMax) return false;
    if (RA.nat && p.nat !== RA.nat) return false;
    if (RA.pays && (p.club == null ? 'LIBRE' : getClub(G, p.club)?.country || '?') !== RA.pays) return false;
    if (RA.lg && typeof ligueDe === 'function' && ligueDe(G, p) !== RA.lg) return false;
    if (RA.pied && (p.foot || '') !== RA.pied) return false;
    if (RA.contrat && p.club != null && finContrat(p) > +RA.contrat) return false;
    if (RA.valMax && p.value > +RA.valMax * 1e6) return false;
    if (RA.salMax && monthly(p.wage) > +RA.salMax * 1e3) return false;
    if (RA.libres && !(p.club == null || p.listed)) return false;
    if (RA.reels && !p.libreReel) return false;
    if (RA.obs === 'oui' && !knows(G, p)) return false;
    if (RA.obs === 'non' && knows(G, p)) return false;
    return true;
  });
  const lignes = [];
  const filtresAttr = RA.attrs.filter(([k, m]) => k && m !== '');
  const okCrit = (e, op, m) => e && e.v != null && (op === '<=' ? e.v <= +m : e.v >= +m);
  for (const p of L) {
    let D = null, est = {};
    if (attrsActifs.length) { D = attributsDetail(p); for (const k of attrsActifs) est[k] = valeurCritere(p, k, D); }
    if (filtresAttr.length && (RA.mode === 'ou' ? !filtresAttr.some(([k, m, op]) => okCrit(est[k], op, m)) : !filtresAttr.every(([k, m, op]) => okCrit(est[k], op, m)))) continue;
    if (RA.perso && typeof personnaliteFM === 'function' && (connaissance(G, p) <= 0 || personnaliteFM(p)[0] !== RA.perso)) continue;
    lignes.push({ p, est });
  }
  const val = (r, k) => k === 'nom' ? r.p.name : k === 'pos' ? POS_ORDER.indexOf(r.p.pos) : k === 'age' ? r.p.age : k === 'val' ? r.p.value : k === 'sal' ? r.p.wage
    : k === 'contrat' ? (r.p.club == null ? 0 : finContrat(r.p)) : k === 'club' ? (getClub(G, r.p.club)?.name || '') : k === 'taille' ? (typeof tailleDe === 'function' ? tailleDe(r.p) : 0) : k === 'note' ? estOvr(G, r.p) : (r.est[k]?.v ?? -1);
  const { k: tk, d: td } = RA.tri;
  lignes.sort((a, b) => { const x = val(a, tk), y = val(b, tk); return (x > y ? 1 : x < y ? -1 : 0) * td; });
  const nats = [...new Set(G.players.filter(p => p.club !== G.clubId).map(p => p.nat).filter(n => n && n !== 'UNK'))].sort();
  const pays = [...new Set(G.clubs.filter(c => c.id !== G.clubId).map(c => c.country).filter(Boolean))].sort();
  const FAM_RA = typeof FAMILLES !== 'undefined' ? FAMILLES : { tech: 'Technique', ment: 'Mental', phys: 'Physique', gb: 'Gardien' };
  const optA = sel => `<option value="">— Critère —</option>${Object.entries(FAM_RA).map(([fm, lab]) => `<optgroup label="${lab}">${ATTR_DETAIL.filter(a => a[2] === fm).map(([k, l]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${l}</option>`).join('')}</optgroup>`).join('')}<optgroup label="Poste et caractère">${RA_SPECIAUX.map(([k, l]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${l}</option>`).join('')}</optgroup>`;
  const PERSOS = ['Modèle de professionnalisme', 'Perfectionniste', 'Leader né', 'Leader', 'Résistant', 'Très loyal', 'Loyal', 'Très ambitieux', 'Ambitieux', 'Professionnel', 'Fair-play', 'Équilibré', 'Réservé', 'Sanguin', 'Effronté', 'Mercenaire', 'Déloyal', 'Friable', 'Indolent'];
  const th = (k, l) => `<th data-tri="${k}" class="ra-th ${tk === k ? 'on' : ''}">${l}${tk === k ? (td > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const nLibres = G.players.filter(p => p.club == null && !p.retired).length, nReels = G.players.filter(p => p.libreReel && p.club == null).length;
  host.innerHTML = `<section class="ra">
    <div class="ra-raccourcis"><span>Catalogue des joueurs libres</span><button class="btn sm ${RA.pays === 'LIBRE' && !RA.reels ? 'primary' : ''}" id="raTousLibres">Tous les libres (${nLibres})</button>${nReels ? `<button class="btn sm ${RA.reels ? 'primary' : ''}" id="raReels">Vrais joueurs libres (${nReels})</button>` : '<small class="muted">Vrais joueurs libres : monde réel avec les données Transfermarkt (compléments réseau facultatifs).</small>'}</div>
    <div class="ra-filtres">
      <label class="ra-l2">Nom <input id="raQ" value="${esc(RA.q)}" placeholder="Nom du joueur"></label>
      <div class="ra-l2"><span>Postes</span><div class="ra-postes">${Object.keys(ROLES).map(r => `<button type="button" data-ps="${r}" class="${RA.postes.includes(r) ? 'on' : ''}" title="${esc(ROLES[r].label)}">${r}</button>`).join('')}</div></div>
      <label>Âge min <input id="raAm" type="number" min="15" max="45" value="${esc(RA.ageMin)}"></label>
      <label>Âge max <input id="raAM" type="number" min="15" max="45" value="${esc(RA.ageMax)}"></label>
      <label>Taille min (cm) <input id="raTm" type="number" min="150" max="210" value="${esc(RA.tMin || '')}"></label>
      <label>Taille max (cm) <input id="raTM" type="number" min="150" max="210" value="${esc(RA.tMax || '')}"></label>
      <label>Nationalité <select id="raNat"><option value="">Toutes</option>${nats.map(n => `<option ${RA.nat === n ? 'selected' : ''} value="${n}">${esc(typeof natName === 'function' ? natName(n) : n)}</option>`).join('')}</select></label>
      <label>Pays du club <select id="raPays"><option value="">Tous</option><option value="LIBRE" ${RA.pays === 'LIBRE' ? 'selected' : ''}>Sans club</option>${pays.map(n => `<option ${RA.pays === n ? 'selected' : ''} value="${n}">${esc(typeof nomPays === 'function' ? nomPays(n) : n)}</option>`).join('')}</select></label>
      ${typeof selectLigues === 'function' ? `<label>Championnat ${selectLigues(G, RA.lg).replace('id="flg"', 'id="raLg"')}</label>` : ''}
      <label>Pied <select id="raPied"><option value="">Indifférent</option>${['Droit', 'Gauche', 'Les deux'].map(x => `<option ${RA.pied === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Contrat jusqu'à <select id="raCt"><option value="">Indifférent</option>${[0, 1, 2, 3].map(i => `<option value="${G.season + i}" ${+RA.contrat === G.season + i ? 'selected' : ''}>juin ${G.season + i}${i === 0 ? ' (fin de saison)' : ''}</option>`).join('')}</select></label>
      <label>Valeur max (M€) <input id="raV" type="number" min="0" step="0.5" value="${esc(RA.valMax)}"></label>
      <label>Salaire max (k€/mois) <input id="raS" type="number" min="0" step="5" value="${esc(RA.salMax)}"></label>
      <label>Observés <select id="raObs"><option value="">Tous</option><option value="oui" ${RA.obs === 'oui' ? 'selected' : ''}>Observés seulement</option><option value="non" ${RA.obs === 'non' ? 'selected' : ''}>Non observés</option></select></label>
      <label class="chk ra-chk"><input type="checkbox" id="raLib" ${RA.libres ? 'checked' : ''}> Libres ou en vente</label>
      <label title="Seulement les joueurs déjà observés par ta cellule">Personnalité (observés) <select id="raPerso"><option value="">Toutes</option>${PERSOS.map(x => `<option ${RA.perso === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <div class="ra-attrs"><div class="ra-at"><span>Critères d'attributs</span><select id="raMode"><option value="et" ${RA.mode !== 'ou' ? 'selected' : ''}>Tous les critères</option><option value="ou" ${RA.mode === 'ou' ? 'selected' : ''}>Au moins un critère</option></select></div>
        ${RA.attrs.map(([k, m, op], i) => `<div class="ra-a"><select data-ak="${i}">${optA(k)}</select><select data-ao="${i}"><option value=">=" ${op !== '<=' ? 'selected' : ''}>au moins</option><option value="<=" ${op === '<=' ? 'selected' : ''}>au plus</option></select><input data-am="${i}" type="number" min="1" max="20" step="1" placeholder="valeur" value="${esc(m)}"><button type="button" class="btn sm ghost" data-asup="${i}" aria-label="Retirer ce critère">✕</button></div>`).join('')}
        <button type="button" class="btn sm" id="raPlus">+ Ajouter un critère</button>
        <div class="ra-a"><select id="raCol">${optA(RA.col).replace('— Attribut —', '+ Colonne d\'attribut')}</select></div></div>
      <div class="ra-act"><button class="btn primary" id="raGo">Rechercher</button><button class="btn ghost" id="raRaz">Tout effacer</button></div>
    </div>
    <p class="hint">${lignes.length} joueur${lignes.length > 1 ? 's' : ''}${lignes.length > 200 ? ' (200 affichés)' : ''} · clic sur un en-tête pour trier. Joueur non observé : attribut estimé (fourchette) ou « ? ».</p>
    <div class="tbl-wrap"><table class="tbl ra-res"><thead><tr><th></th>${th('nom', 'Joueur')}${th('pos', 'Poste')}${th('age', 'Âge')}${th('taille', 'Taille')}<th>Nat.</th>${th('club', 'Club')}${attrsActifs.map(k => th(k, etiquette(k))).join('')}${th('note', 'Note')}${th('val', 'Valeur')}${th('sal', 'Salaire')}${th('contrat', 'Contrat')}</tr></thead>
    <tbody>${lignes.slice(0, 200).map(({ p, est }) => { const c = p.club != null ? getClub(G, p.club) : null;
      return `<tr data-pid="${p.id}" class="click"><td>${avatar(p, 26)}</td><td class="nm">${esc(p.name)}${p.listed ? ' <small class="warn">en vente</small>' : ''}${p.libreReel ? ' <small class="pos">libre réel</small>' : ''}</td><td>${p.pos}</td><td>${p.age}</td><td>${typeof tailleDe === 'function' ? tailleDe(p) : ''}</td><td>${natFlag(p.nat)}</td>
        <td>${c ? `${crest(c, 16)} ${esc(c.short || c.name)}` : '<small class="muted">libre</small>'}</td>
        ${attrsActifs.map(k => { const e = est[k]; return `<td class="ra-av ${e?.exact ? (typeof couleurAttr === 'function' ? couleurAttr(e.v) : '') : 'ra-est'}">${e ? e.txt : '—'}</td>`; }).join('')}
        <td>${ovrCell(p)}</td><td>${money(p.value)}</td><td>${wageM(p.wage)}</td><td>${c ? 'juin ' + finContrat(p) : '—'}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  const lire = () => {
    RA.q = $('#raQ').value.trim(); RA.ageMin = $('#raAm').value; RA.ageMax = $('#raAM').value; RA.tMin = $('#raTm').value; RA.tMax = $('#raTM').value; RA.nat = $('#raNat').value; RA.pays = $('#raPays').value;
    RA.lg = $('#raLg')?.value || ''; RA.pied = $('#raPied').value; RA.contrat = $('#raCt').value; RA.valMax = $('#raV').value; RA.salMax = $('#raS').value;
    RA.obs = $('#raObs').value; RA.libres = $('#raLib').checked; RA.col = $('#raCol').value;
    RA.attrs = RA.attrs.map((_, i) => [host.querySelector(`[data-ak="${i}"]`).value, host.querySelector(`[data-am="${i}"]`).value, host.querySelector(`[data-ao="${i}"]`).value]);
    RA.mode = $('#raMode').value; RA.perso = $('#raPerso').value;
  };
  const relancer = () => { lire(); vRechercheAvancee(host); };
  host.querySelector('#raGo').onclick = relancer;
  host.querySelector('#raTousLibres').onclick = () => { lire(); RA.pays = 'LIBRE'; RA.reels = false; vRechercheAvancee(host); };
  host.querySelector('#raReels')?.addEventListener('click', () => { lire(); RA.pays = 'LIBRE'; RA.reels = !RA.reels; vRechercheAvancee(host); });
  host.querySelector('#raPlus').onclick = () => { lire(); RA.attrs.push(['', '', '>=']); vRechercheAvancee(host); };
  host.querySelectorAll('[data-asup]').forEach(b => b.onclick = () => { lire(); RA.attrs.splice(+b.dataset.asup, 1); if (!RA.attrs.length) RA.attrs.push(['', '', '>=']); vRechercheAvancee(host); });
  host.querySelectorAll('.ra-filtres select, #raLib').forEach(s => s.addEventListener('change', relancer));
  host.querySelectorAll('.ra-filtres input:not([type=checkbox])').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') relancer(); }));
  host.querySelector('#raRaz').onclick = () => { RA = { ...RA, q: '', postes: [], ageMin: '', ageMax: '', tMin: '', tMax: '', nat: '', pays: '', lg: '', pied: '', contrat: '', valMax: '', salMax: '', libres: false, obs: '', attrs: [['', '', '>=']], perso: '', mode: 'et', reels: false, col: '' }; vRechercheAvancee(host); };
  host.querySelectorAll('[data-ps]').forEach(b => b.onclick = () => { lire(); const r = b.dataset.ps; RA.postes = RA.postes.includes(r) ? RA.postes.filter(x => x !== r) : [...RA.postes, r]; vRechercheAvancee(host); });
  host.querySelectorAll('[data-tri]').forEach(t => t.onclick = () => { lire(); const k = t.dataset.tri; RA.tri = { k, d: RA.tri.k === k ? -RA.tri.d : (['age', 'nom', 'pos', 'contrat', 'sal', 'val', 'club'].includes(k) ? 1 : -1) }; vRechercheAvancee(host); });
  host.querySelectorAll('tr[data-pid]').forEach(tr => tr.onclick = () => playerModal(+tr.dataset.pid));
}
window.addEventListener('load', () => {
  if (typeof vTransfers !== 'function') return;
  const __vTransfersRA = vTransfers;
  vTransfers = function (el) {
    const r = __vTransfersRA.apply(this, arguments);
    try {
      if (typeof TR_TAB !== 'undefined' && TR_TAB === 'search') {
        const f = el.querySelector('.filters');
        if (f) {
          const host = document.createElement('div'); host.className = 'ra-host';
          let n = f.nextSibling; while (n) { const s = n.nextSibling; n.remove(); n = s; }
          f.replaceWith(host);
          vRechercheAvancee(host);
        }
      }
    } catch (e) { console.error(e); }
    return r;
  };
});
