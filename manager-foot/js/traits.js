// ============================================================
//  Traits cachés des joueurs + Records et Panthéon du club
//  Idées : traits révélés avec le temps (pitch-to-glory), traits de joueurs (League-Soccer / GameplayFootball),
//  records et Hall of Fame (pitch-to-glory) — code original.
//  - Chaque joueur a 0 à 2 traits, tirés de façon stable depuis son identifiant (ne consomme pas l'aléatoire de la partie).
//  - Un trait se révèle avec le temps passé chez toi (matchs joués), ou par un rapport de recrutement complet.
//  - Effets réels : durée des blessures, progression de fin de saison, moral du vestiaire, notes dans les grands matchs.
//  - Records du club (plus larges victoires/défaites, record d'achat et de vente, meilleure saison) et Panthéon
//    (joueurs marquants de l'histoire du club) dans la Chronique.
// ============================================================
const TRAITS = {
  fragile: { n: 'Fragile', i: '🩹', d: 'Blessures 50 % plus longues.', neg: true },
  robuste: { n: 'Robuste', i: '🛡', d: 'Blessures 30 % plus courtes.' },
  bosseur: { n: 'Bosseur', i: '💪', d: 'Progresse davantage en fin de saison (jusqu\'à 30 ans).' },
  dilettante: { n: 'Dilettante', i: '😴', d: 'Peut stagner, voire régresser, en fin de saison.', neg: true },
  leader: { n: 'Leader', i: '🎖', d: 'Remonte le moral du vestiaire chaque semaine quand il est titulaire.' },
  grands: { n: 'Joueur de grands matchs', i: '🌟', d: 'Meilleures notes en coupe, en Europe et en barrages.' },
  nerveux: { n: 'Nerveux', i: '😰', d: 'Moins bon dans les grands matchs.', neg: true },
  fidele: { n: 'Fidèle', i: '🤝', d: 'Moral plus stable, se plaint rarement de son temps de jeu.' }
};
const TRAITS_LISTE = Object.keys(TRAITS);
const INCOMPATIBLES = [['fragile', 'robuste'], ['bosseur', 'dilettante'], ['grands', 'nerveux']];
function hashTrait(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function traitsDe(p) {
  if (p.traits) return p.traits;
  const h = hashTrait('traits|' + (p.srcId || p.id) + '|' + p.name);
  const n = h % 100 < 45 ? 0 : h % 100 < 85 ? 1 : 2;
  const t = [];
  for (let k = 0; t.length < n && k < 6; k++) {
    const c = TRAITS_LISTE[hashTrait(h + ':' + k) % TRAITS_LISTE.length];
    if (!t.includes(c) && !INCOMPATIBLES.some(([a, b]) => (c === a && t.includes(b)) || (c === b && t.includes(a)))) t.push(c);
  }
  p.traits = t;
  return t;
}
const traitVu = (p, t) => (p.traitsVus || []).includes(t);
function reveler(G, p, t, raison) {
  if (traitVu(p, t)) return;
  (p.traitsVus ||= []).push(t);
  if (p.club === G.clubId) news(G, `${TRAITS[t].i} Trait découvert : ${p.name} est « ${TRAITS[t].n} » (${raison}). ${TRAITS[t].d}`, 'info');
}
// révélation : 6 matchs avec toi → 1er trait, 15 → 2e ; rapport de recrutement complet → tous
function revelations(G) {
  for (const p of clubPlayers(G, G.clubId)) {
    const t = traitsDe(p), apps = (p.appsClub ||= 0);
    if (t[0] && apps >= 6) reveler(G, p, t[0], `${apps} matchs avec toi`);
    if (t[1] && apps >= 15) reveler(G, p, t[1], `${apps} matchs avec toi`);
  }
}

// ---------- effets ----------
const __applyInjuryT = applyInjury;
applyInjury = function (G, p, inj) {
  const t = traitsDe(p);
  if (inj && (t.includes('fragile') || t.includes('robuste'))) inj = { ...inj, days: Math.max(1, Math.round(inj.days * (t.includes('fragile') ? 1.5 : .7))) };
  return __applyInjuryT(G, p, inj);
};
const grandMatch = f => f && (isKO(f) || isEuroComp(f.comp) || f.comp === 'PO' || f.comp === 'SUP');
const __applyMatchT = applyMatch;
applyMatch = function (G, mt, f) {
  __applyMatchT(G, mt, f);
  for (const id in mt.pr) {
    const p = getPlayer(G, +id), r = mt.pr[id]; if (!p || !r.min) continue;
    if (p.club === G.clubId) p.appsClub = (p.appsClub || 0) + 1;
    if (grandMatch(f)) {
      const t = traitsDe(p), b = t.includes('grands') ? .4 : t.includes('nerveux') ? -.4 : 0;
      if (b) { p.stats.rating += b; p.lastRating = Math.round((p.lastRating + b) * 10) / 10; }
    }
  }
  // records du club
  if (f.h === G.clubId || f.a === G.clubId) {
    const s = f.h === G.clubId ? 0 : 1, gf = f.res[s], ga = f.res[1 - s], opp = getClub(G, s ? f.h : f.a)?.name, R = (G.records ||= {});
    const ligne = { gf, ga, opp, label: `${weekLabel(G)} ${G.season}/${String(G.season + 1).slice(2)}`, comp: compName(G, f) };
    if (gf - ga > 0 && (!R.victoire || gf - ga > R.victoire.gf - R.victoire.ga || (gf - ga === R.victoire.gf - R.victoire.ga && gf > R.victoire.gf))) R.victoire = ligne;
    if (ga - gf > 0 && (!R.defaite || ga - gf > R.defaite.ga - R.defaite.gf)) R.defaite = ligne;
    if (!R.buts || gf > R.buts.gf) R.buts = ligne;
  }
};
const __completeWeekT2 = completeWeek;
completeWeek = function (G, skip) {
  const e = G.schedule[G.week];
  const r = __completeWeekT2(G, skip);
  if (e?.t === 'L' && G.clubId) {
    const mine = clubPlayers(G, G.clubId), leaders = mine.filter(p => traitsDe(p).includes('leader') && (G.tactics?.lineup || []).includes(p.id) && p.injury <= 0);
    if (leaders.length) for (const p of mine) p.morale = clamp(p.morale + .6 * Math.min(2, leaders.length), 5, 100);
    for (const p of mine) if (traitsDe(p).includes('fidele') && p.morale < 45) p.morale = clamp(p.morale + 1.5, 5, 100);
    revelations(G);
  }
  return r;
};
const __endSeasonT = endSeason;
endSeason = function (G) {
  const S = __endSeasonT(G);
  for (const p of G.players) {
    if (p.club == null) continue;
    const t = traitsDe(p);
    if (t.includes('bosseur') && p.age <= 31) bumpAttr(p, 1);
    if (t.includes('dilettante') && hashTrait(p.id + ':' + G.season) % 2) bumpAttr(p, -1);
  }
  return S;
};
// rapport de recrutement complet → traits connus
if (typeof knows === 'function') {
  const __knowsT = knows;
  knows = function (G, p) { const k = __knowsT(G, p); if (k && p && p.club !== G.clubId) for (const t of traitsDe(p)) if (!traitVu(p, t)) (p.traitsVus ||= []).push(t); return k; };
}

// ---------- fiche joueur ----------
const __playerModalT = playerModal;
playerModal = function (pid, tab = 'profil') {
  __playerModalT(pid, tab);
  const p = getPlayer(G, pid); if (!p || tab !== 'profil') return;
  const t = traitsDe(p), caches = t.filter(x => !traitVu(p, x)).length;
  const html = `<div class="traits">${t.filter(x => traitVu(p, x)).map(x => `<span class="trait ${TRAITS[x].neg ? 'neg' : ''}" data-tip="${esc(TRAITS[x].d)}">${TRAITS[x].i} ${esc(TRAITS[x].n)}</span>`).join('')}
    ${caches ? `<span class="trait inconnu" data-tip="Se révèle après plusieurs matchs avec toi, ou avec un rapport complet de ta cellule de recrutement.">❔ ${caches} trait(s) à découvrir</span>` : ''}
    ${!t.length ? '<span class="trait inconnu" data-tip="Aucun trait particulier.">Aucun trait particulier connu</span>' : ''}</div>`;
  const zone = $('#modal .reel-plus') || $('#modal .reel-j') || $('#modal .tabs');
  zone?.insertAdjacentHTML('afterend', html);
};

// ---------- Records et Panthéon (Chronique) ----------
function pantheon(G) {
  const me = myClub(G), out = [];
  for (const p of G.players) {
    const h = (p.hist || []).filter(x => x.cid === me.id || x.club === me.short);
    let apps = h.reduce((s, x) => s + (x.apps || 0), 0), buts = h.reduce((s, x) => s + (x.goals || 0), 0);
    if (p.club === me.id) { apps += p.stats.apps; buts += p.stats.goals; }
    if (apps >= 60 || buts >= 25) out.push({ p, apps, buts, saisons: h.length + (p.club === me.id ? 1 : 0) });
  }
  return out.sort((a, b) => (b.buts * 3 + b.apps) - (a.buts * 3 + a.apps)).slice(0, 10);
}
if (typeof vChronique === 'function') {
  const __vChroniqueT = vChronique;
  vChronique = function (el) {
    __vChroniqueT(el);
    const R = G.records || {}, tr = G.transfers || [];
    const achat = tr.filter(t => t.to === G.clubId && t.fee > 0).sort((a, b) => b.fee - a.fee)[0], vente = tr.filter(t => t.from === G.clubId && t.fee > 0).sort((a, b) => b.fee - a.fee)[0];
    const best = (G.history || []).slice().sort((a, b) => a.rank - b.rank || b.pts - a.pts)[0];
    const m = x => x ? `${x.gf}-${x.ga} contre ${esc(x.opp || '?')} <small class="muted">(${esc(x.comp || '')}, ${esc(x.label)})</small>` : '<span class="muted">—</span>';
    const P = pantheon(G);
    el.insertAdjacentHTML('beforeend', `<div class="grid2"><section class="card"><h2>🏅 Records du club (depuis ton arrivée)</h2>
      <table class="tbl compact"><tr><td>Plus large victoire</td><td>${m(R.victoire)}</td></tr><tr><td>Plus lourde défaite</td><td>${m(R.defaite)}</td></tr>
      <tr><td>Plus de buts en un match</td><td>${m(R.buts)}</td></tr>
      <tr><td>Record d'achat</td><td>${achat ? `${esc(achat.name)} — ${money(achat.fee)} <small class="muted">(${achat.season})</small>` : '<span class="muted">—</span>'}</td></tr>
      <tr><td>Record de vente</td><td>${vente ? `${esc(vente.name)} — ${money(vente.fee)} <small class="muted">(${vente.season})</small>` : '<span class="muted">—</span>'}</td></tr>
      <tr><td>Meilleure saison</td><td>${best ? `${best.rank}<sup>e</sup> de ${esc(best.comp)}, ${best.pts} pts <small class="muted">(${best.season})</small>` : '<span class="muted">—</span>'}</td></tr></table></section>
      <section class="card"><h2>🏛 Panthéon</h2>${P.length ? `<table class="tbl compact"><tr><th>Joueur</th><th>Saisons</th><th>Matchs</th><th>Buts</th></tr>${P.map(x => `<tr data-pid="${x.p.id}"><td class="nm">${esc(x.p.name)}${x.p.club === G.clubId ? '' : ' <small class="muted">(parti)</small>'}</td><td>${x.saisons}</td><td>${x.apps}</td><td>${x.buts}</td></tr>`).join('')}</table>`
        : '<p class="muted">Entrent au Panthéon les joueurs qui atteignent 60 matchs ou 25 buts avec le club.</p>'}</section></div>`);
    el.querySelectorAll('[data-pid]').forEach(r => r.onclick = () => playerModal(+r.dataset.pid));
  };
}
