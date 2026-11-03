// ============================================================
//  Édition groupée dans l'éditeur, avec aperçu et annulation
//  (idée de tozmoz/FMLibreEditor, GPL-3.0 : aucun code repris)
//  1. Choisir une cible : le club affiché, une division ou toute la base, puis filtrer par poste et par âge.
//  2. Choisir une action : qualité ± N, soins, levée des suspensions, moral, forme, contrat + 1 an.
//  3. « Aperçu » montre le nombre de joueurs touchés et quelques exemples avant → après ; « Appliquer » enregistre.
//  4. « Annuler la dernière édition » rétablit exactement les valeurs d'avant (pile de 10 éditions).
// ============================================================
let EG = { cible: 'club', div: 1, pos: '', ageMin: '', ageMax: '', action: 'attr', attr: 'all', delta: 1 };
const EG_PILE = [];
const EG_ACTIONS = { attr: 'Qualités ± N', soins: 'Soigner les blessures', susp: 'Lever les suspensions', moral: 'Moral au maximum', forme: 'Forme physique à 100 %', contrat: 'Contrat + 1 an' };
function egCibles(W) {
  return W.players.filter(p => {
    if (EG.cible === 'club' && !(ED.club === 'free' ? p.club == null : p.club === ED.club)) return false;
    if (EG.cible === 'div') { const c = p.club != null && W.clubs.find(x => x.id === p.club); if (!c || c.foreign || (c.div || 1) !== +EG.div) return false; }
    if (EG.pos && p.pos !== EG.pos) return false;
    if (EG.ageMin !== '' && p.age < +EG.ageMin) return false;
    if (EG.ageMax !== '' && p.age > +EG.ageMax) return false;
    return true;
  });
}
function egAppliquer(p, simuler) {
  const q = simuler ? JSON.parse(JSON.stringify({ attrs: p.attrs, injury: p.injury, susp: p.susp, morale: p.morale, fit: p.fit, contract: p.contract })) : p;
  if (EG.action === 'attr') for (const k of EG.attr === 'all' ? Object.keys(ATTRS) : [EG.attr]) q.attrs[k] = clamp(Math.round((q.attrs[k] ?? 10) + +EG.delta), 1, 20);
  if (EG.action === 'soins') q.injury = 0;
  if (EG.action === 'susp') q.susp = 0;
  if (EG.action === 'moral') q.morale = 100;
  if (EG.action === 'forme') q.fit = 100;
  if (EG.action === 'contrat') q.contract = Math.min(6, (q.contract || 1) + 1);
  return q;
}
function egResume(p, q) {
  if (EG.action === 'attr') return `${noteSur100Safe(p)} → ${noteSur100Safe({ ...p, attrs: q.attrs })}`;
  if (EG.action === 'soins') return p.injury > 0 ? `blessé ${p.injury} sem. → apte` : 'déjà apte';
  if (EG.action === 'susp') return p.susp > 0 ? `suspendu ${p.susp} → qualifié` : 'déjà qualifié';
  if (EG.action === 'moral') return `moral ${Math.round(p.morale)} → 100`;
  if (EG.action === 'forme') return `forme ${Math.round(p.fit)} → 100`;
  return `contrat ${p.contract} → ${q.contract} an(s)`;
}
function noteSur100Safe(p) { try { return playerOvr(p); } catch { return '?'; } }
function blocEditionGroupee(W, inGame) {
  const divs = [...new Set(W.clubs.filter(c => !c.foreign).map(c => c.div || 1))].sort((a, b) => a - b);
  const n = egCibles(W).length;
  const actions = Object.entries(EG_ACTIONS).filter(([k]) => inGame || !['soins', 'susp', 'moral', 'forme'].includes(k));
  return `<details class="card mt eg" ${EG.ouvert ? 'open' : ''}><summary><b>🧰 Édition groupée</b> <small class="muted">plusieurs joueurs d'un coup, avec aperçu et annulation</small></summary>
    <div class="form-grid mt">
      <label>Cible <select id="egC"><option value="club" ${EG.cible === 'club' ? 'selected' : ''}>Club affiché</option><option value="div" ${EG.cible === 'div' ? 'selected' : ''}>Une division</option><option value="tous" ${EG.cible === 'tous' ? 'selected' : ''}>Toute la base</option></select></label>
      ${EG.cible === 'div' ? `<label>Division <select id="egD">${divs.map(d => `<option ${+EG.div === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>` : ''}
      <label>Poste <select id="egP"><option value="">Tous</option>${Object.keys(ROLES).map(r => `<option ${EG.pos === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label>Âge minimum <input id="egA1" type="number" min="14" max="45" value="${esc(EG.ageMin)}"></label>
      <label>Âge maximum <input id="egA2" type="number" min="14" max="45" value="${esc(EG.ageMax)}"></label>
      <label>Action <select id="egX">${actions.map(([k, l]) => `<option value="${k}" ${EG.action === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${EG.action === 'attr' ? `<label>Qualité <select id="egQ"><option value="all">Toutes</option>${Object.entries(ATTRS).map(([k, l]) => `<option value="${k}" ${EG.attr === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Variation (sur 20) <input id="egN" type="number" min="-10" max="10" step="1" value="${esc(EG.delta)}"></label>` : ''}
    </div>
    <div class="row gap wrap mt"><span class="grow"><b>${n}</b> joueur(s) ciblé(s)</span>
      <button class="btn" id="egV" ${n ? '' : 'disabled'}>Aperçu</button><button class="btn primary" id="egGo" ${n ? '' : 'disabled'}>Appliquer à ${n} joueur(s)</button>
      <button class="btn" id="egU" ${EG_PILE.length ? '' : 'disabled'}>Annuler la dernière édition${EG_PILE.length ? ` (${EG_PILE[EG_PILE.length - 1].n})` : ''}</button></div>
    <div id="egR"></div></details>`;
}
if (typeof vEditor === 'function') {
  const __vEditorEG = vEditor;
  vEditor = function (el, W, inGame) {
    const r = __vEditorEG.apply(this, arguments);
    const sec = el.querySelector('section.card'); if (!sec) return r;
    sec.insertAdjacentHTML('afterend', blocEditionGroupee(W, inGame));
    const re = () => { EG.ouvert = true; vEditor(el, W, inGame); };
    const lier = (id, k, f = v => v) => { const x = el.querySelector(id); if (x) x.onchange = () => { EG[k] = f(x.value); re(); }; };
    lier('#egC', 'cible'); lier('#egD', 'div', Number); lier('#egP', 'pos'); lier('#egA1', 'ageMin'); lier('#egA2', 'ageMax'); lier('#egX', 'action'); lier('#egQ', 'attr'); lier('#egN', 'delta', Number);
    el.querySelector('details.eg').ontoggle = e => { EG.ouvert = e.target.open; };
    const v = el.querySelector('#egV'); if (v) v.onclick = () => {
      const L = egCibles(W);
      el.querySelector('#egR').innerHTML = `<div class="tbl-wrap mt"><table class="tbl compact"><thead><tr><th>Joueur</th><th>Poste</th><th>Âge</th><th>Avant → après</th></tr></thead><tbody>
        ${L.slice(0, 8).map(p => `<tr><td class="nm">${esc(p.name)}</td><td>${p.pos}</td><td>${p.age}</td><td>${esc(String(egResume(p, egAppliquer(p, true))))}</td></tr>`).join('')}</tbody></table></div>${L.length > 8 ? `<p class="hint">… et ${L.length - 8} autre(s).</p>` : ''}`;
    };
    const go = el.querySelector('#egGo'); if (go) go.onclick = async () => {
      const L = egCibles(W);
      EG_PILE.push({ n: L.length, W, avant: L.map(p => [p, JSON.parse(JSON.stringify({ attrs: p.attrs, injury: p.injury, susp: p.susp, morale: p.morale, fit: p.fit, contract: p.contract, value: p.value }))]) });
      if (EG_PILE.length > 10) EG_PILE.shift();
      for (const p of L) { egAppliquer(p, false); if (typeof calcValue === 'function') p.value = calcValue(p); }
      await persistWorld(W); toast(`Édition appliquée à ${L.length} joueur(s).`); re();
    };
    const u = el.querySelector('#egU'); if (u) u.onclick = async () => {
      const e = EG_PILE.pop(); if (!e) return;
      for (const [p, v] of e.avant) Object.assign(p, v);
      await persistWorld(e.W); toast(`Édition annulée (${e.n} joueur(s) rétablis).`); re();
    };
    return r;
  };
}
