// ============================================================
//  Recherche de joueurs avancée (Mercato › Recherche)
//  Filtres : nom, postes (plusieurs), âge min/max, nationalité, pays du club, championnat, pied, fin de contrat, valeur
//  et salaire max, libres / en vente, joueurs observés ou non, jusqu'à 3 attributs avec une valeur minimale.
//  Tri : clic sur n'importe quelle colonne (âge, valeur, contrat, chaque attribut affiché…), croissant ou décroissant.
//  Joueur non observé : l'attribut est estimé (milieu de la fourchette affichée sur sa fiche) ou inconnu (« ? »)
//  selon les préférences de la partie — la recherche ne révèle jamais la vraie valeur.
// ============================================================
let RA = { q: '', postes: [], ageMin: '', ageMax: '', nat: '', pays: '', lg: '', pied: '', contrat: '', valMax: '', salMax: '', libres: false, obs: '', attrs: [['', ''], ['', ''], ['', '']], col: '', tri: { k: 'age', d: 1 } };
const RA_ATTRS = typeof ATTR_DETAIL !== 'undefined' ? ATTR_DETAIL.map(([k, l]) => [k, l]) : [];
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
  const attrsActifs = [...new Set([...RA.attrs.map(a => a[0]).filter(Boolean), RA.col].filter(Boolean))];
  const etiquette = k => RA_ATTRS.find(a => a[0] === k)?.[1] || k;
  let L = G.players.filter(p => p.club !== G.clubId && !p.loan && !p.academy && p.club !== undefined);
  const nq = RA.q && (typeof normName === 'function' ? normName(RA.q) : RA.q.toLowerCase());
  L = L.filter(p => {
    if (nq && !(typeof normName === 'function' ? normName(p.name) : p.name.toLowerCase()).includes(nq)) return false;
    if (RA.postes.length && !RA.postes.includes(p.pos)) return false;
    if (RA.ageMin && p.age < +RA.ageMin) return false;
    if (RA.ageMax && p.age > +RA.ageMax) return false;
    if (RA.nat && p.nat !== RA.nat) return false;
    if (RA.pays && (p.club == null ? 'LIBRE' : getClub(G, p.club)?.country || '?') !== RA.pays) return false;
    if (RA.lg && typeof ligueDe === 'function' && ligueDe(G, p) !== RA.lg) return false;
    if (RA.pied && (p.foot || '') !== RA.pied) return false;
    if (RA.contrat && p.club != null && finContrat(p) > +RA.contrat) return false;
    if (RA.valMax && p.value > +RA.valMax * 1e6) return false;
    if (RA.salMax && monthly(p.wage) > +RA.salMax * 1e3) return false;
    if (RA.libres && !(p.club == null || p.listed)) return false;
    if (RA.obs === 'oui' && !knows(G, p)) return false;
    if (RA.obs === 'non' && knows(G, p)) return false;
    return true;
  });
  const lignes = [];
  const filtresAttr = RA.attrs.filter(([k, m]) => k && m !== '');
  for (const p of L) {
    let D = null, est = {};
    if (attrsActifs.length) { D = attributsDetail(p); for (const k of attrsActifs) est[k] = attrEstime(p, k, D); }
    if (filtresAttr.some(([k, m]) => !est[k] || est[k].v == null || est[k].v < +m)) continue;
    lignes.push({ p, est });
  }
  const val = (r, k) => k === 'nom' ? r.p.name : k === 'pos' ? POS_ORDER.indexOf(r.p.pos) : k === 'age' ? r.p.age : k === 'val' ? r.p.value : k === 'sal' ? r.p.wage
    : k === 'contrat' ? (r.p.club == null ? 0 : finContrat(r.p)) : k === 'club' ? (getClub(G, r.p.club)?.name || '') : k === 'note' ? estOvr(G, r.p) : (r.est[k]?.v ?? -1);
  const { k: tk, d: td } = RA.tri;
  lignes.sort((a, b) => { const x = val(a, tk), y = val(b, tk); return (x > y ? 1 : x < y ? -1 : 0) * td; });
  const nats = [...new Set(G.players.filter(p => p.club !== G.clubId).map(p => p.nat).filter(n => n && n !== 'UNK'))].sort();
  const pays = [...new Set(G.clubs.filter(c => c.id !== G.clubId).map(c => c.country).filter(Boolean))].sort();
  const optA = sel => `<option value="">— Attribut —</option>${RA_ATTRS.map(([k, l]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${l}</option>`).join('')}`;
  const th = (k, l) => `<th data-tri="${k}" class="ra-th ${tk === k ? 'on' : ''}">${l}${tk === k ? (td > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  host.innerHTML = `<section class="ra">
    <div class="ra-filtres">
      <label class="ra-l2">Nom <input id="raQ" value="${esc(RA.q)}" placeholder="Nom du joueur"></label>
      <div class="ra-l2"><span>Postes</span><div class="ra-postes">${Object.keys(ROLES).map(r => `<button type="button" data-ps="${r}" class="${RA.postes.includes(r) ? 'on' : ''}" title="${esc(ROLES[r].label)}">${r}</button>`).join('')}</div></div>
      <label>Âge min <input id="raAm" type="number" min="15" max="45" value="${esc(RA.ageMin)}"></label>
      <label>Âge max <input id="raAM" type="number" min="15" max="45" value="${esc(RA.ageMax)}"></label>
      <label>Nationalité <select id="raNat"><option value="">Toutes</option>${nats.map(n => `<option ${RA.nat === n ? 'selected' : ''} value="${n}">${esc(typeof natName === 'function' ? natName(n) : n)}</option>`).join('')}</select></label>
      <label>Pays du club <select id="raPays"><option value="">Tous</option><option value="LIBRE" ${RA.pays === 'LIBRE' ? 'selected' : ''}>Sans club</option>${pays.map(n => `<option ${RA.pays === n ? 'selected' : ''} value="${n}">${esc(typeof nomPays === 'function' ? nomPays(n) : n)}</option>`).join('')}</select></label>
      ${typeof selectLigues === 'function' ? `<label>Championnat ${selectLigues(G, RA.lg).replace('id="flg"', 'id="raLg"')}</label>` : ''}
      <label>Pied <select id="raPied"><option value="">Indifférent</option>${['Droit', 'Gauche', 'Les deux'].map(x => `<option ${RA.pied === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Contrat jusqu'à <select id="raCt"><option value="">Indifférent</option>${[0, 1, 2, 3].map(i => `<option value="${G.season + i}" ${+RA.contrat === G.season + i ? 'selected' : ''}>juin ${G.season + i}${i === 0 ? ' (fin de saison)' : ''}</option>`).join('')}</select></label>
      <label>Valeur max (M€) <input id="raV" type="number" min="0" step="0.5" value="${esc(RA.valMax)}"></label>
      <label>Salaire max (k€/mois) <input id="raS" type="number" min="0" step="5" value="${esc(RA.salMax)}"></label>
      <label>Observés <select id="raObs"><option value="">Tous</option><option value="oui" ${RA.obs === 'oui' ? 'selected' : ''}>Observés seulement</option><option value="non" ${RA.obs === 'non' ? 'selected' : ''}>Non observés</option></select></label>
      <label class="chk ra-chk"><input type="checkbox" id="raLib" ${RA.libres ? 'checked' : ''}> Libres ou en vente</label>
      <div class="ra-attrs"><span>Attributs minimums</span>${RA.attrs.map(([k, m], i) => `<div class="ra-a"><select data-ak="${i}">${optA(k)}</select><input data-am="${i}" type="number" min="1" max="20" placeholder="min" value="${esc(m)}"></div>`).join('')}
        <div class="ra-a"><select id="raCol">${optA(RA.col).replace('— Attribut —', '+ Colonne d\'attribut')}</select></div></div>
      <div class="ra-act"><button class="btn primary" id="raGo">Rechercher</button><button class="btn ghost" id="raRaz">Tout effacer</button></div>
    </div>
    <p class="hint">${lignes.length} joueur${lignes.length > 1 ? 's' : ''}${lignes.length > 200 ? ' (200 affichés)' : ''} · clic sur un en-tête pour trier. Joueur non observé : attribut estimé (fourchette) ou « ? ».</p>
    <div class="tbl-wrap"><table class="tbl ra-res"><thead><tr><th></th>${th('nom', 'Joueur')}${th('pos', 'Poste')}${th('age', 'Âge')}<th>Nat.</th>${th('club', 'Club')}${attrsActifs.map(k => th(k, etiquette(k))).join('')}${th('note', 'Note')}${th('val', 'Valeur')}${th('sal', 'Salaire')}${th('contrat', 'Contrat')}</tr></thead>
    <tbody>${lignes.slice(0, 200).map(({ p, est }) => { const c = p.club != null ? getClub(G, p.club) : null;
      return `<tr data-pid="${p.id}" class="click"><td>${avatar(p, 26)}</td><td class="nm">${esc(p.name)}${p.listed ? ' <small class="warn">en vente</small>' : ''}</td><td>${p.pos}</td><td>${p.age}</td><td>${natFlag(p.nat)}</td>
        <td>${c ? `${crest(c, 16)} ${esc(c.short || c.name)}` : '<small class="muted">libre</small>'}</td>
        ${attrsActifs.map(k => { const e = est[k]; return `<td class="ra-av ${e?.exact ? (typeof couleurAttr === 'function' ? couleurAttr(e.v) : '') : 'ra-est'}">${e ? e.txt : '—'}</td>`; }).join('')}
        <td>${ovrCell(p)}</td><td>${money(p.value)}</td><td>${wageM(p.wage)}</td><td>${c ? 'juin ' + finContrat(p) : '—'}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  const lire = () => {
    RA.q = $('#raQ').value.trim(); RA.ageMin = $('#raAm').value; RA.ageMax = $('#raAM').value; RA.nat = $('#raNat').value; RA.pays = $('#raPays').value;
    RA.lg = $('#raLg')?.value || ''; RA.pied = $('#raPied').value; RA.contrat = $('#raCt').value; RA.valMax = $('#raV').value; RA.salMax = $('#raS').value;
    RA.obs = $('#raObs').value; RA.libres = $('#raLib').checked; RA.col = $('#raCol').value;
    RA.attrs = RA.attrs.map((_, i) => [host.querySelector(`[data-ak="${i}"]`).value, host.querySelector(`[data-am="${i}"]`).value]);
  };
  const relancer = () => { lire(); vRechercheAvancee(host); };
  host.querySelector('#raGo').onclick = relancer;
  host.querySelectorAll('.ra-filtres select, #raLib').forEach(s => s.addEventListener('change', relancer));
  host.querySelectorAll('.ra-filtres input:not([type=checkbox])').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') relancer(); }));
  host.querySelector('#raRaz').onclick = () => { RA = { ...RA, q: '', postes: [], ageMin: '', ageMax: '', nat: '', pays: '', lg: '', pied: '', contrat: '', valMax: '', salMax: '', libres: false, obs: '', attrs: [['', ''], ['', ''], ['', '']], col: '' }; vRechercheAvancee(host); };
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
