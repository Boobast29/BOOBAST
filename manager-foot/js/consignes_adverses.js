// ============================================================
//  Consignes adverses (comme FM) : une consigne par joueur adverse, réglée avant le match.
//  - Presser : on lui saute dessus dès qu'il touche le ballon (pression +).
//  - Marquage serré : le marquage individuel du moteur (moins de tirs et de dribbles pour lui, passes vers lui
//    plus difficiles), 2 joueurs au plus ; un peu de fatigue pour tes défenseurs.
//  - Tacle : « dur » (il dribble moins bien, mais plus de fautes et de cartons) ou « prudent » (moins de fautes,
//    mais il passe plus facilement).
//  - Mauvais pied : on le pousse sur son mauvais pied, ses tirs sont moins dangereux.
//  Suggestions de l'adjoint selon le profil des adversaires. L'adversaire en pose aussi sur ton joueur le plus
//  dangereux (son plan est visible dans le rapport avec un adjoint compétent).
//  Pas de tirage ajouté : les consignes modulent les probabilités existantes du moteur.
// ============================================================
const CONSIGNES = {
  press: ['Presser', 'On lui saute dessus dès qu\'il touche le ballon.'],
  serre: ['Marquage serré', 'Un défenseur le suit partout (2 joueurs au plus).'],
  tacle: ['Tacle', '« Dur » : il dribble moins bien, plus de fautes. « Prudent » : moins de fautes, il passe plus.'],
  pied: ['Mauvais pied', 'Le pousser sur son mauvais pied : tirs moins dangereux.']
};
const oiDe = (side, id) => side?.oi?.[id];
// ---------- moteur ----------
if (typeof makeSide === 'function') {
  const __makeSideCA = makeSide;
  makeSide = function (G, clubId, tac) { const s = __makeSideCA.apply(this, arguments); s.oi = { ...(tac?.oi || {}) }; return s; };
}
if (typeof Match === 'function') {
  const P = Match.prototype;
  const __pressureCA = P.pressure;
  P.pressure = function (side, X, Y) {
    const r = __pressureCA.apply(this, arguments);
    return oiDe(this.sides[1 - side], this.st?.carrier?.id)?.press ? clamp(r + .1, .03, .9) : r;
  };
  const __dribbleCA = P.a_dribble;
  P.a_dribble = function (c, p, press) {
    const o = oiDe(this.sides[1 - this.st.side], c.id);
    if (!o?.tacle) return __dribbleCA.apply(this, arguments);
    const D = this.sides[1 - this.st.side], fouls = this.wx.fouls, ajout = o.tacle === 'dur' && !D.mark.has(c.id);
    if (o.tacle === 'dur') { this.wx.fouls = fouls * 1.2; if (ajout) D.mark.add(c.id); }
    else this.wx.fouls = fouls * .55;
    try { return __dribbleCA.call(this, c, p, o.tacle === 'prudent' ? press * .7 : press); }
    finally { this.wx.fouls = fouls; if (ajout) D.mark.delete(c.id); }
  };
  const __shootCA = P.shoot;
  P.shoot = function (c, ...rest) {
    const side = this.pr[c.id]?.side ?? 0;
    if (!oiDe(this.sides[1 - side], c.id)?.pied) return __shootCA.call(this, c, ...rest);
    const avant = this.cal;
    this.cal = [0, 1].map(i => (avant ? avant[i] : 1) * (i === side ? .8 : 1));
    try { return __shootCA.call(this, c, ...rest); } finally { this.cal = avant; }
  };
}
// l'adversaire presse et tacle dur ton joueur le plus dangereux
if (typeof aiTactics === 'function') {
  const __aiTacticsCA = aiTactics;
  aiTactics = function (G, clubId, oppId) {
    const t = __aiTacticsCA.apply(this, arguments);
    try {
      if (oppId === G.clubId && G.tactics?.lineup?.length) {
        const cible = G.tactics.lineup.map(id => getPlayer(G, id)).filter(p => p && p.pos !== 'GB').sort((a, b) => (b.attrs.fin + b.attrs.dri) - (a.attrs.fin + a.attrs.dri))[0];
        t.oi = cible ? { [cible.id]: { press: 1, tacle: 'dur' } } : {};
      }
    } catch (e) { console.error(e); }
    return t;
  };
}
// ---------- suggestions de l'adjoint ----------
function suggestionsAdjoint(js) {
  const S = {}, set = (p, k, v) => { if (p) (S[p.id] ||= {})[k] = v; };
  const a = (p, k) => p.attrs[k] || 10;
  const dribbleur = js.slice().sort((x, y) => a(y, 'dri') + a(y, 'vit') - a(x, 'dri') - a(x, 'vit'))[0];
  const meneur = js.filter(p => ['MC', 'MOC', 'MDC'].includes(p.pos)).sort((x, y) => a(y, 'pas') - a(x, 'pas'))[0];
  const buteur = js.slice().sort((x, y) => a(y, 'fin') - a(x, 'fin'))[0];
  if (dribbleur && a(dribbleur, 'dri') >= 13) { set(dribbleur, 'tacle', 'prudent'); set(dribbleur, 'serre', 1); }
  if (meneur) set(meneur, 'press', 1);
  if (buteur && a(buteur, 'fin') >= 12) { set(buteur, 'pied', 1); if (buteur !== dribbleur) set(buteur, 'serre', 1); }
  for (const p of js) if (a(p, 'men') <= 9) { set(p, 'press', 1); set(p, 'tacle', 'dur'); }
  return S;
}
// ---------- écran d'avant-match ----------
function tableauConsignes(js, oi) {
  const sel = (id, v) => `<select data-oit="${id}" aria-label="Tacle"><option value="">Normal</option><option value="dur" ${v === 'dur' ? 'selected' : ''}>Dur</option><option value="prudent" ${v === 'prudent' ? 'selected' : ''}>Prudent</option></select>`;
  const chk = (id, k, v) => `<input type="checkbox" data-oi="${id}" data-k="${k}" ${v ? 'checked' : ''} aria-label="${CONSIGNES[k][0]}">`;
  return `<table class="tbl compact ca-tbl"><thead><tr><th>Joueur</th>${['press', 'serre', 'tacle', 'pied'].map(k => `<th title="${esc(CONSIGNES[k][1])}">${CONSIGNES[k][0]}</th>`).join('')}</tr></thead><tbody>
    ${js.map(p => { const o = oi[p.id] || {}; return `<tr class="${Object.keys(o).length ? 'on' : ''}"><td class="nm">${esc(p.name)} <small class="muted">${p.pos}</small></td><td>${chk(p.id, 'press', o.press)}</td><td>${chk(p.id, 'serre', o.serre)}</td><td>${sel(p.id, o.tacle)}</td><td>${chk(p.id, 'pied', o.pied)}</td></tr>`; }).join('')}</tbody></table>`;
}
window.addEventListener('load', () => {
  if (typeof prepareMatch !== 'function') return;
  const __prepareMatchCA = prepareMatch;
  prepareMatch = function (f) {
    const r = __prepareMatchCA.apply(this, arguments);
    try {
      const home = f.h === G.clubId, opp = getClub(G, home ? f.a : f.h);
      const oppTac = withSideRng(`${G.seed}|oi|${G.season}|${G.week}`, () => aiTactics(G, opp.id, G.clubId)); // même onze que le rapport, sans toucher au hasard du jeu
      const js = oppTac.lineup.map(id => getPlayer(G, id)).filter(p => p && p.pos !== 'GB');
      G.tactics.oi = {};
      const marks = $$('.pmMark'); if (!marks.length) return r;
      const box = marks[0].closest('.form-grid');
      marks.forEach(s => s.closest('label').hidden = true);
      box.nextElementSibling?.classList.contains('hint') && (box.nextElementSibling.hidden = true);
      const cible = Object.keys(oppTac.oi || {}).map(id => getPlayer(G, +id)).filter(Boolean)[0];
      box.insertAdjacentHTML('afterend', `<div class="ca"><div class="ca-head"><h3>Consignes adverses</h3><button class="btn sm" id="caSugg">Suggestions de l'adjoint</button></div>
        <div id="caTbl" class="tbl-wrap">${tableauConsignes(js, G.tactics.oi)}</div>
        <p class="hint">Survole un en-tête pour voir l'effet. Marquage serré : 2 joueurs au plus, un peu de fatigue pour tes défenseurs.${cible && (G.staff?.assistant || 2) >= 2 ? ` <b>Ton adjoint prévient :</b> ${esc(opp.name)} va presser et tacler dur ${esc(cible.name)}.` : ''}</p></div>`);
      const sync = () => {
        const ids = Object.entries(G.tactics.oi).filter(([, o]) => o.serre).map(([id]) => id).slice(0, 2);
        marks.forEach((s, i) => { s.value = ids[i] || ''; });
      };
      const brancher = () => {
        $$('#caTbl [data-oi]').forEach(c => c.onchange = () => {
          const o = G.tactics.oi[c.dataset.oi] ||= {};
          if (c.dataset.k === 'serre' && c.checked && Object.values(G.tactics.oi).filter(x => x.serre).length >= 2) { c.checked = false; return toast('Marquage serré : 2 joueurs au plus.', 'err'); }
          if (c.checked) o[c.dataset.k] = 1; else delete o[c.dataset.k];
          c.closest('tr').classList.toggle('on', Object.keys(o).length > 0); sync();
        });
        $$('#caTbl [data-oit]').forEach(s => s.onchange = () => { const o = G.tactics.oi[s.dataset.oit] ||= {}; if (s.value) o.tacle = s.value; else delete o.tacle; s.closest('tr').classList.toggle('on', Object.keys(o).length > 0); });
      };
      brancher();
      $('#caSugg').onclick = () => { G.tactics.oi = suggestionsAdjoint(js); $('#caTbl').innerHTML = tableauConsignes(js, G.tactics.oi); brancher(); sync(); toast('Consignes proposées par ton adjoint : ajuste si besoin.'); };
    } catch (e) { console.error(e); }
    return r;
  };
  if (typeof finishMatch === 'function') {
    const __finishMatchCA = finishMatch;
    finishMatch = function () { const r = __finishMatchCA.apply(this, arguments); if (G?.tactics) G.tactics.oi = {}; return r; };
  }
});
