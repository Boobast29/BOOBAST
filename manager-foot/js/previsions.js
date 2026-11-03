// ============================================================
//  Prévisions : scores probables (Dixon-Coles) et fin de saison simulée (Monte-Carlo)
//  - dcTau, poissonPmf, poissonSample : repris de Hicruben/world-cup-2026-prediction-model (MIT,
//    vendor/world-cup-2026-prediction-model/LICENSE). Modèle de Poisson bivarié corrigé de Dixon & Coles (1997),
//    rho = -0,13, qui corrige la sous-estimation des 0-0 et 1-1 par un Poisson simple.
//  - Simulation de la fin de saison : méthode de vickyfriss/football-league-predictions (MIT), réécrite pour le jeu.
//    On tire 2 000 fois les matchs restants avec les probabilités des forces actuelles, puis on compte les titres,
//    les podiums et les places de relégation.
//  Générateur pseudo-aléatoire séparé (mulberry32) : ne touche pas au hasard de la partie, qui reste identique.
// ============================================================
const DC_RHO = -0.13;
function dcTau(a, b, lambda, mu, rho) {
  if (a === 0 && b === 0) return 1 - lambda * mu * rho;
  if (a === 0 && b === 1) return 1 + lambda * rho;
  if (a === 1 && b === 0) return 1 + mu * rho;
  if (a === 1 && b === 1) return 1 - rho;
  return 1;
}
function poissonPmf(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}
function poissonSample(lambda, rng) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// buts attendus des deux équipes à partir de l'écart de force (même logistique que les cotes, js/avant_match.js)
function butsAttendus(dForce, neutre = false) {
  const C = typeof COTES_MOTEUR !== 'undefined' ? COTES_MOTEUR : { a: .09, b: .34 };
  const E = 1 / (1 + Math.exp(-(C.a * dForce + (neutre ? 0 : C.b)))), d = 2 * E - 1;
  return [Math.max(.25, Math.min(3.8, 1.38 * Math.exp(1.05 * d))), Math.max(.25, Math.min(3.8, 1.18 * Math.exp(-1.05 * d)))];
}
function scoresProbables(dForce, neutre = false, n = 3) {
  const [l, m] = butsAttendus(dForce, neutre), L = [];
  let tot = 0;
  for (let a = 0; a <= 7; a++) for (let b = 0; b <= 7; b++) { const p = poissonPmf(a, l) * poissonPmf(b, m) * dcTau(a, b, l, m, DC_RHO); tot += p; L.push([a, b, p]); }
  return { l, m, top: L.map(([a, b, p]) => [a, b, p / tot]).sort((x, y) => y[2] - x[2]).slice(0, n) };
}

// ---------- avant-match : scores probables ----------
if (typeof blocAvantMatch === 'function') {
  const __blocAvantMatchPV = blocAvantMatch;
  blocAvantMatch = function (G, f) {
    const h = __blocAvantMatchPV.apply(this, arguments);
    try {
      const sH = makeSide(G, f.h, f.h === G.clubId ? G.tactics : aiTactics(G, f.h, f.a)), sA = makeSide(G, f.a, f.a === G.clubId ? G.tactics : aiTactics(G, f.a, f.h));
      const S = scoresProbables(forceEquipe(G, sH) - forceEquipe(G, sA), !!f.neutral);
      return h + `<p class="center hint">Scores les plus probables : ${S.top.map(([a, b, p]) => `<b>${a}-${b}</b> (${Math.round(p * 100)} %)`).join(' · ')} · buts attendus ${S.l.toFixed(1).replace('.', ',')} – ${S.m.toFixed(1).replace('.', ',')}</p>`;
    } catch { return h; }
  };
}

// ---------- fin de saison simulée ----------
function forcesClubs(G, ids) {
  const k = `${G.season}|${G.week}|${ids.length}`;
  if (G._forcesK === k && G._forces) return G._forces;
  const F = {};
  for (const id of ids) { try { F[id] = forceEquipe(G, makeSide(G, id, id === G.clubId ? G.tactics : aiTactics(G, id, id))); } catch { F[id] = 60; } }
  Object.defineProperty(G, '_forces', { value: F, writable: true, configurable: true, enumerable: false });
  Object.defineProperty(G, '_forcesK', { value: k, writable: true, configurable: true, enumerable: false });
  return F;
}
function simulerFinSaison(G, comp, n = 2000) {
  const ids = comp.clubs, F = forcesClubs(G, ids), base = {};
  for (const r of tableOf(ids, comp.fixtures)) base[r.id] = r;
  const restants = comp.fixtures.flat().filter(f => !f.res).map(f => ({ h: f.h, a: f.a, ba: butsAttendus((F[f.h] ?? 60) - (F[f.a] ?? 60)) }));
  const rng = mulberry32((G.season * 1000 + G.week) * 7919 + ids.length);
  const cpt = Object.fromEntries(ids.map(id => [id, { pos: new Array(ids.length).fill(0), pts: 0 }]));
  for (let s = 0; s < n; s++) {
    const T = Object.fromEntries(ids.map(id => [id, { id, pts: base[id].pts, gd: base[id].gf - base[id].ga, gf: base[id].gf }]));
    for (const m of restants) {
      const a = poissonSample(m.ba[0], rng), b = poissonSample(m.ba[1], rng), H = T[m.h], A = T[m.a];
      if (!H || !A) continue;
      H.gf += a; A.gf += b; H.gd += a - b; A.gd += b - a;
      if (a > b) H.pts += 3; else if (b > a) A.pts += 3; else { H.pts++; A.pts++; }
    }
    Object.values(T).sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || rng() - .5).forEach((t, i) => { cpt[t.id].pos[i]++; cpt[t.id].pts += t.pts; });
  }
  return { n, restants: restants.length, res: ids.map(id => ({ id, pts: base[id].pts, ptsProj: cpt[id].pts / n, pos: cpt[id].pos.map(x => x / n) })).sort((a, b) => b.ptsProj - a.ptsProj) };
}
function blocPrevisions(G, comp) {
  const L = leagueComps(G), li = L.findIndex(l => l.id === comp.id), hasUp = li > 0, hasDown = li < L.length - 1, ps = promoSpots(comp);
  const S = simulerFinSaison(G, comp), N = comp.clubs.length;
  if (!S.restants) return '<p class="muted">Saison terminée : plus de matchs à simuler.</p>';
  const pc = x => x >= .995 ? '100 %' : x < .005 ? '—' : Math.round(x * 100) + ' %';
  const somme = (pos, a, b) => pos.slice(a, b).reduce((s, x) => s + x, 0);
  return `<p class="hint">${S.n.toLocaleString('fr-FR')} fins de saison simulées (${S.restants} matchs restants), d'après la force actuelle des effectifs. Une estimation, pas une certitude.</p>
    <div class="tbl-wrap"><table class="tbl compact prev"><thead><tr><th>Club</th><th>Pts</th><th>Pts projetés</th><th>Titre</th><th>Top 4</th>${hasUp ? `<th>Montée (${ps})</th>` : ''}${hasDown ? `<th>Relégation (${ps})</th>` : ''}</tr></thead><tbody>
    ${S.res.map(r => { const c = getClub(G, r.id); return `<tr class="${r.id === G.clubId ? 'me' : ''}"><td class="nm">${crest(c, 18)} ${esc(c.name)}</td><td>${r.pts}</td><td>${Math.round(r.ptsProj)}</td><td>${pc(r.pos[0])}</td><td>${pc(somme(r.pos, 0, 4))}</td>${hasUp ? `<td>${pc(somme(r.pos, 0, ps))}</td>` : ''}${hasDown ? `<td class="${somme(r.pos, N - ps, N) > .3 ? 'neg' : ''}">${pc(somme(r.pos, N - ps, N))}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`;
}
if (typeof vComps === 'function') {
  const __vCompsPV = vComps;
  vComps = function (el) {
    const r = __vCompsPV.apply(this, arguments);
    const comp = G.comps[COMP_TAB];
    if (comp && comp.type !== 'cup' && comp.type !== 'euro' && COMP_TAB !== 'AW') {
      const grid = el.querySelector('#compBody > .grid2');
      if (grid) {
        grid.insertAdjacentHTML('afterend', `<section class="card mt prev-carte"><h2>🔮 Prévisions de fin de saison</h2><div id="prevZone"><button class="btn" id="prevGo">Simuler 2 000 fins de saison</button></div></section>`);
        el.querySelector('#prevGo').onclick = () => { const z = el.querySelector('#prevZone'); z.innerHTML = '<p class="muted">Calcul…</p>'; setTimeout(() => { z.innerHTML = blocPrevisions(G, comp); }, 20); };
      }
    }
    return r;
  };
}
