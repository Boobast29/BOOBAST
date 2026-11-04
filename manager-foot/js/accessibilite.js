// ============================================================
//  Accessibilité, infobulles et tendances (bibliothèques dans vendor/, licences conservées)
//  - Micromodal (MIT) : fenêtres en vrai dialogue — focus piégé (Tab), Échap, retour du focus, rôle annoncé
//  - floating-ui (MIT) : infobulles positionnées à la place des bulles natives ; aide sur les attributs des joueurs
//  - simple-statistics (ISC) : tendances dans l'Analyse — forme (régression), projection de fin de saison,
//    régularité, efficacité devant le but, joueurs en progression ou en baisse
// ============================================================

// ---------- fenêtres accessibles (Micromodal) ----------
// Micromodal mémorise chaque fenêtre par identifiant : la boîte reçoit un identifiant unique à chaque ouverture
// (#modal garde le sien pour le reste du jeu).
let MODAL_A11Y = null, MODAL_N = 0;
const __modalA = modal;
modal = function (html, cls = '', opts = {}) {
  const m = __modalA(html, cls, opts);
  const box = m.querySelector('.mbox');
  if (!box) return m;
  box.id = 'dialogue-' + (++MODAL_N);
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  const h = box.querySelector('h2'); if (h) { h.id ||= box.id + '-titre'; box.setAttribute('aria-labelledby', h.id); }
  if (window.MicroModal && !opts.noClose) {
    try {
      MODAL_A11Y = box.id;
      MicroModal.show(box.id, { disableScroll: false, onClose: () => { if (MODAL_A11Y === box.id) MODAL_A11Y = null; setTimeout(() => { if ($('#modal') === m) m.remove(); }, 0); } });
    } catch { MODAL_A11Y = null; }
  }
  return m;
};
const __closeModalA = closeModal;
closeModal = function () {
  const id = MODAL_A11Y; MODAL_A11Y = null;
  if (id && window.MicroModal && document.getElementById(id)) { try { MicroModal.close(id); } catch { } }
  __closeModalA();
};

// ---------- infobulles (floating-ui) ----------
const AIDE_ATTRS = {
  Finition: 'Finition : qualité de frappe et sang-froid devant le but (convertit les occasions en buts).',
  Passe: 'Passe : précision et vision du jeu, courtes et longues passes.',
  Dribble: 'Dribble : capacité à éliminer un adversaire balle au pied.',
  Technique: 'Technique : contrôle, premières touches, coups de pied arrêtés.',
  Tacle: 'Tacle : récupération du ballon, interceptions, duels défensifs.',
  Vitesse: 'Vitesse : accélération et pointe ; baisse après 31 ans.',
  Physique: 'Physique : endurance, puissance, résistance aux blessures et à la fatigue.',
  Mental: 'Mental : concentration, sang-froid, influence dans les grands matchs.',
  Gardien: 'Gardien : arrêts, placement, sorties (compte surtout pour les gardiens).'
};
let BULLE = null, CIBLE = null;
function montrerBulle(el, texte) {
  if (!window.FloatingUIDOM || !texte) return;
  BULLE ||= Object.assign(document.createElement('div'), { id: 'bulle', role: 'tooltip' });
  if (!BULLE.isConnected) document.body.appendChild(BULLE);
  BULLE.textContent = texte; BULLE.classList.add('vis'); CIBLE = el;
  el.setAttribute('aria-describedby', 'bulle');
  const { computePosition, offset, flip, shift } = FloatingUIDOM;
  computePosition(el, BULLE, { placement: 'top', middleware: [offset(8), flip(), shift({ padding: 8 })] })
    .then(({ x, y }) => { if (CIBLE === el) Object.assign(BULLE.style, { left: x + 'px', top: y + 'px' }); });
}
function cacherBulle() { if (BULLE) { BULLE.classList.remove('vis'); Object.assign(BULLE.style, { left: '0px', top: '0px' }); /* cachée : ramenée à l'origine, sinon elle élargit la page */ } CIBLE?.removeAttribute('aria-describedby'); CIBLE = null; }
const pointeurFin = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
document.addEventListener('mouseover', e => {
  if (!pointeurFin() || !window.FloatingUIDOM) return;
  const el = e.target.closest?.('[title], [data-tip], .attr > span');
  if (!el || el === CIBLE) return;
  if (el.hasAttribute('title')) { const t = el.getAttribute('title'); if (t) el.dataset.tip = t; el.removeAttribute('title'); } // bulle native remplacée
  const texte = el.dataset.tip || (el.matches('.attr > span') ? AIDE_ATTRS[el.textContent.trim()] : '');
  if (texte) montrerBulle(el, texte);
});
document.addEventListener('mouseout', e => { if (CIBLE && !CIBLE.contains(e.relatedTarget)) cacherBulle(); });
document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tip]'); if (el && window.FloatingUIDOM) montrerBulle(el, el.dataset.tip); });
document.addEventListener('focusout', cacherBulle);
window.addEventListener('scroll', cacherBulle, true);
window.addEventListener('resize', cacherBulle);
document.addEventListener('keydown', e => { if (e.key === 'Escape') cacherBulle(); });

// ---------- tendances (simple-statistics) ----------
function tendances(G) {
  if (typeof ss === 'undefined') return null;
  const mes = [];
  for (let w = 0; w < G.week; w++) {
    const f = weekFixtures(G, w).find(x => (x.h === G.clubId || x.a === G.clubId) && x.res && String(x.comp).startsWith('L'));
    if (f) { const s = f.h === G.clubId ? 0 : 1, gf = f.res[s], ga = f.res[1 - s]; mes.push({ n: mes.length + 1, pts: gf > ga ? 3 : gf === ga ? 1 : 0, gf, ga, xg: f.xg ? f.xg[s] : null }); }
  }
  if (mes.length < 4) return { peu: true, n: mes.length };
  // forme : moyenne glissante sur 5 matchs puis droite de régression
  const glisse = mes.map((m, i) => ss.mean(mes.slice(Math.max(0, i - 4), i + 1).map(x => x.pts)));
  const reg = ss.linearRegression(mes.map((m, i) => [m.n, glisse[i]]));
  const L = clubLeague(G, G.clubId), total = L ? (L.clubs.length - 1) * 2 : mes.length;
  const ppm = ss.mean(mes.map(m => m.pts)), pts = ss.sum(mes.map(m => m.pts));
  const avecXg = mes.filter(m => m.xg != null);
  return {
    n: mes.length, pts, ppm, pente: reg.m,
    projection: Math.round(pts + ppm * Math.max(0, total - mes.length)),
    projectionTendance: Math.round(pts + Array.from({ length: Math.max(0, total - mes.length) }, (_, k) => Math.min(3, Math.max(0, ss.linearRegressionLine(reg)(mes.length + k + 1)))).reduce((a, b) => a + b, 0)),
    bp: ss.mean(mes.map(m => m.gf)), bc: ss.mean(mes.map(m => m.ga)), ecart: ss.standardDeviation(mes.map(m => m.gf - m.ga)),
    efficacite: avecXg.length ? ss.sum(avecXg.map(m => m.gf)) / Math.max(.1, ss.sum(avecXg.map(m => m.xg))) : null,
    joueurs: clubPlayers(G, G.clubId).map(p => { const r = (p.form || []).filter(x => x.s === G.season).map(x => x.r); return r.length >= 4 ? { p, pente: ss.linearRegression(r.map((v, i) => [i, v])).m, moy: ss.mean(r) } : null; }).filter(Boolean)
  };
}
const __vAnalysisA = vAnalysis;
vAnalysis = function (el) {
  __vAnalysisA(el);
  const T = tendances(G); if (!T) return;
  const fl = v => v > .03 ? '<span class="pos">↗ en hausse</span>' : v < -.03 ? '<span class="neg">↘ en baisse</span>' : '→ stable';
  const prog = T.joueurs?.slice().sort((a, b) => b.pente - a.pente) || [];
  el.insertAdjacentHTML('afterbegin', `<section class="card tendances"><h2>🧮 Tendances de la saison</h2>
    ${T.peu ? `<p class="muted">Encore ${4 - T.n} match(s) de championnat avant les premières tendances.</p>` : `
    <div class="tend-grille">
      <div><small>Forme (moyenne glissante, régression)</small><b>${fl(T.pente)}</b><em>${T.pente >= 0 ? '+' : ''}${T.pente.toFixed(2)} pt/match par match</em></div>
      <div><small>Projection de fin de saison</small><b>${T.projection} pts</b><em>au rythme actuel · ${T.projectionTendance} pts si la tendance continue</em></div>
      <div><small>Buts par match</small><b>${T.bp.toFixed(2)} – ${T.bc.toFixed(2)}</b><em>régularité : écart-type ${T.ecart.toFixed(2)} sur la différence</em></div>
      ${T.efficacite != null ? `<div><small>Efficacité devant le but</small><b>${Math.round(T.efficacite * 100)} %</b><em>buts marqués / buts attendus (xG)${T.efficacite > 1.15 ? ' — réussite au-dessus de la normale' : T.efficacite < .85 ? ' — maladresse' : ''}</em></div>` : ''}
    </div>
    ${prog.length >= 2 ? `<div class="grid2"><div><h3>En progression</h3>${prog.slice(0, 3).map(x => `<p data-pid="${x.p.id}">↗ <a href="#">${esc(x.p.name)}</a> <small class="muted">${x.moy.toFixed(2)} de moyenne, ${x.pente >= 0 ? '+' : ''}${x.pente.toFixed(2)}/match</small></p>`).join('')}</div>
      <div><h3>En baisse</h3>${prog.slice(-3).reverse().map(x => `<p data-pid="${x.p.id}">↘ <a href="#">${esc(x.p.name)}</a> <small class="muted">${x.moy.toFixed(2)} de moyenne, ${x.pente >= 0 ? '+' : ''}${x.pente.toFixed(2)}/match</small></p>`).join('')}</div></div>` : ''}
    <p class="hint">Calculs : simple-statistics (licence ISC) — moyenne, écart-type, régression linéaire sur les ${T.n} matchs de championnat joués.</p>`}</section>`);
  el.querySelectorAll('.tendances [data-pid] a').forEach(a => a.onclick = e => { e.preventDefault(); playerModal(+a.closest('[data-pid]').dataset.pid); });
};
