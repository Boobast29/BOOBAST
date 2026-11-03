// ============================================================
//  Championnats étrangers simulés
//  Chaque pays étranger du monde du jeu a son championnat : calendrier aller-retour (méthode du cercle), une
//  journée jouée au rythme du championnat de ton pays, classement, champion et palmarès d'une saison à l'autre.
//  Les scores viennent du modèle de Poisson corrigé de Dixon-Coles (js/previsions.js), avec la force des effectifs
//  (recalculée toutes les 6 journées). Générateur pseudo-aléatoire séparé : le hasard de ta partie ne change pas.
//  Les matchs étrangers ne modifient pas les joueurs (ni stats, ni fatigue) : c'est un résultat de championnat.
// ============================================================
function calendrierAllerRetour(ids) {
  const L = ids.slice(); if (L.length % 2) L.push(null);
  const n = L.length, tours = [];
  for (let r = 0; r < n - 1; r++) {
    const t = [];
    for (let i = 0; i < n / 2; i++) { const a = L[i], b = L[n - 1 - i]; if (a != null && b != null) t.push(r % 2 ? { h: b, a } : { h: a, a: b }); }
    tours.push(t); L.splice(1, 0, L.pop());
  }
  return [...tours, ...tours.map(t => t.map(f => ({ h: f.a, a: f.h })))];
}
function initLiguesEtrangeres(G) {
  const parPays = {};
  for (const c of G.clubs) if (c.foreign && !c.worldCountry) (parPays[c.country || '?'] ||= []).push(c.id); // les pays du monde étendu ont leur propre simulation (js/monde_multinational.js)
  const ligues = {};
  for (const [k, ids] of Object.entries(parPays)) if (ids.length >= 4) ligues[k] = { clubs: ids, fixtures: calendrierAllerRetour(ids), joue: 0 };
  G.etr = { season: G.season, ligues };
}
function forcesEtrangeres(G, L) {
  const F = {};
  for (const id of L.clubs) { try { F[id] = forceEquipe(G, makeSide(G, id, tactiqueSansHasard(G, id, id))); } catch { F[id] = 60; } }
  return F;
}
// Calibrage par pays d'après les résultats réels (PALMARES_REEL : football.json + openfootball/europe, saisons complètes) :
// buts par match et avantage du terrain propres à chaque championnat (Norvège plus prolifique, Grèce plus fermée…).
function calibragePays(pays) {
  const L = (typeof PALMARES_REEL !== 'undefined' && PALMARES_REEL[pays]?.[1] || []).filter(s => s.fini || s.j >= 150).slice(-6); // saisons complètes ou assez fournies (formats à play-offs)
  if (!L.length) return { buts: 1, dom: 1 };
  const bm = L.reduce((a, s) => a + s.bm, 0) / L.length, dom = L.reduce((a, s) => a + s.dom, 0) / L.length;
  return { buts: clamp(bm / 2.75, .82, 1.2), dom: clamp(1 + (dom - .45) * .9, .9, 1.12), bm, domR: dom };
}
function jouerJourneeEtrangere(G, pays, L) {
  if (L.joue >= L.fixtures.length) return;
  if (!L._F || L.joue % 6 === 0) Object.defineProperty(L, '_F', { value: forcesEtrangeres(G, L), writable: true, configurable: true, enumerable: false });
  const rng = mulberry32((G.season * 97 + L.joue) * 7919 + [...pays].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7));
  const cal = calibragePays(pays);
  for (const f of L.fixtures[L.joue]) {
    let [l, m] = butsAttendus((L._F[f.h] ?? 60) - (L._F[f.a] ?? 60));
    l *= cal.buts * cal.dom; m *= cal.buts / cal.dom;
    f.res = [poissonSample(l, rng), poissonSample(m, rng)];
  }
  L.joue++;
}
function avancerLiguesEtrangeres(G) {
  if (!G.etr || G.etr.season !== G.season) initLiguesEtrangeres(G);
  const e = G.schedule[G.week]; if (!e || e.t !== 'L') return;
  const R = leagueRoundsTotal(G) || 1;
  for (const [pays, L] of Object.entries(G.etr.ligues)) {
    const cible = Math.min(L.fixtures.length, Math.ceil((e.r + 1) * L.fixtures.length / R));
    while (L.joue < cible) jouerJourneeEtrangere(G, pays, L);
  }
}
function cloreLiguesEtrangeres(G) {
  if (!G.etr || G.etr.season !== G.season) return;
  G.etrPalmares ||= {};
  for (const [pays, L] of Object.entries(G.etr.ligues)) {
    while (L.joue < L.fixtures.length) jouerJourneeEtrangere(G, pays, L);
    const t = tableOf(L.clubs, L.fixtures), ch = t[0] && getClub(G, t[0].id);
    if (!ch) continue;
    (G.etrPalmares[pays] ||= []).push({ s: G.season, c: ch.id, pts: t[0].pts });
    if (G.etrPalmares[pays].length > 30) G.etrPalmares[pays].shift();
    (ch.trophies ||= []).push({ season: G.season, name: `Championnat (${typeof nomPays === 'function' ? nomPays(pays) : pays})` });
    news(G, `🌍 ${ch.name} est champion ${typeof nomPays === 'function' ? `(${nomPays(pays)})` : ''} avec ${t[0].pts} points.`, 'info', true);
  }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateLE = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdateLE.apply(this, arguments);
    if (full && G.clubId != null) { try { avancerLiguesEtrangeres(G); } catch (e) { console.error(e); } }
    return r;
  };
}
if (typeof endSeason === 'function') {
  const __endSeasonLE = endSeason;
  endSeason = function (G) { try { cloreLiguesEtrangeres(G); } catch (e) { console.error(e); } return __endSeasonLE.apply(this, arguments); };
}
// ---------- affichage : Classements > Monde ----------
function blocLigueEtrangere(G, pays) {
  const L = G.etr?.season === G.season ? G.etr.ligues[pays] : null;
  if (!L) return '';
  const t = tableOf(L.clubs, L.fixtures), prec = (G.etrPalmares?.[pays] || []).slice(-1)[0];
  const derniere = L.joue ? L.fixtures[L.joue - 1] : null;
  const reels = (typeof PALMARES_REEL !== 'undefined' && PALMARES_REEL[pays]?.[1] || []).filter(s => s.fini).slice(-4).reverse(), cal = calibragePays(pays);
  return `<div class="etr-ligue"><p class="hint">Journée ${L.joue} sur ${L.fixtures.length}${prec ? ` · champion ${prec.s}/${String(prec.s + 1).slice(2)} : <b>${esc(getClub(G, prec.c)?.name || '?')}</b>` : ''}</p>
    ${reels.length ? `<p class="hint">Champions réels : ${reels.map(s => `${esc(s.s)} <b>${esc(s.c)}</b>`).join(' · ')}${cal.bm ? ` · calibrage réel : ${cal.bm.toFixed(2).replace('.', ',')} buts par match, ${Math.round(cal.domR * 100)} % de victoires à domicile` : ''}</p>` : ''}
    <div class="tbl-wrap"><table class="tbl compact standings"><thead><tr><th>#</th><th>Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>Diff</th><th>Pts</th><th>Forme</th></tr></thead><tbody>
    ${t.map((r, i) => { const c = getClub(G, r.id); return `<tr class="click" data-mc="${c.id}"><td>${i + 1}</td><td class="nm">${crest(c, 18)} ${esc(c.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td><td class="form">${r.form.slice(-5).map(x => `<i class="f${x}">${x}</i>`).join('')}</td></tr>`; }).join('')}</tbody></table></div>
    ${derniere ? `<details class="mt"><summary>Derniers résultats</summary><div class="etr-res">${derniere.map(f => `<span>${esc(getClub(G, f.h)?.short || '?')} <b>${f.res[0]}-${f.res[1]}</b> ${esc(getClub(G, f.a)?.short || '?')}</span>`).join('')}</div></details>` : ''}</div>`;
}
if (typeof blocMonde === 'function') {
  const __blocMondeLE = blocMonde;
  blocMonde = function (G) {
    if (!G.etr || G.etr.season !== G.season) initLiguesEtrangeres(G);
    const h = __blocMondeLE.apply(this, arguments);
    const d = document.createElement('div'); d.innerHTML = h;
    // pour chaque pays étranger, le classement remplace la simple liste de clubs (la liste reste accessible)
    d.querySelectorAll('.monde-pays').forEach(sec => {
      const code = sec.querySelector('h2')?.textContent || '';
      const pays = Object.keys(G.etr.ligues).find(k => code.includes(nomPays(k)));
      if (!pays) return;
      const liste = sec.querySelector('.tbl-wrap');
      liste.insertAdjacentHTML('beforebegin', blocLigueEtrangere(G, pays));
      const det = document.createElement('details'); det.innerHTML = '<summary>Effectifs : valeur et meilleur joueur</summary>';
      liste.replaceWith(det); det.appendChild(liste);
    });
    return d.innerHTML.replace("Les clubs étrangers ne disputent pas de championnat simulé : ils jouent les coupes d'Europe et alimentent le mercato.", "Les championnats étrangers sont simulés au rythme du tien (scores calculés, sans fatigue ni statistiques de joueurs).");
  };
}
