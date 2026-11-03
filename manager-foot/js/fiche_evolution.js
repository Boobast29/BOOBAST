// ============================================================
//  Fiche joueur : évolution, avis du staff, apprentissage d'un poste ; retraites annoncées à l'avance
//  - Courbe du niveau saison par saison (p.evo, js/evolution.js) + niveau actuel, avis du staff : progresse, stagne,
//    décline (selon la tendance, l'âge et le potentiel estimé).
//  - Apprentissage d'un poste (onglet Développement) : jauge de familiarité et note au poste aujourd'hui → une fois
//    maîtrisé.
//  - Retraites : à la mi-saison (mercato d'hiver), les joueurs qui arrêteront en fin de saison l'annoncent ; tes
//    joueurs concernés te préviennent (le temps de les remplacer). Une retraite non annoncée reste possible, plus rare.
// ============================================================
function avisStaff(p) {
  const evo = p.evo || [], o = playerOvr(p);
  const pts = [...evo.map(e => e.o), o];
  const tend = pts.length >= 2 ? pts[pts.length - 1] - pts[Math.max(0, pts.length - 3)] : 0;
  const est = typeof estimPotentiel === 'function' && typeof G !== 'undefined' ? estimPotentiel(G, p) : { lo: p.pot, hi: p.pot };
  if (p.age >= 31 && tend <= 0) return ['neg', 'Décline avec l\'âge : son niveau va baisser petit à petit.'];
  if (tend >= 3) return ['pos', 'Progresse bien.' + (est.hi > o + 3 ? ' Le staff pense qu\'il peut encore aller plus haut.' : '')];
  if (tend >= 1 && p.age <= 28) return ['pos', 'Progresse doucement.' + (est.hi > o + 3 ? ' Marge de progression encore réelle.' : '')];
  if (tend <= -3) return ['neg', 'En recul cette saison (temps de jeu, blessures, forme ?).'];
  if (o >= 85 && tend >= -1) return ['pos', 'Au sommet de son art : niveau stable.'];
  if (est.hi <= o + 2) return ['', 'Semble avoir atteint son plafond.'];
  return ['', p.age <= 23 ? 'Stagne pour l\'instant : il lui faut du temps de jeu et un bon encadrement.' : 'Niveau stable.'];
}
function courbeNiveau(p) {
  const evo = (p.evo || []).filter(e => e.s < G.season);
  const pts = [...evo.map(e => [e.s, e.o]), [G.season, playerOvr(p)]].slice(-10);
  if (pts.length < 2) return '<p class="muted">Pas encore d\'historique : la courbe se remplit à chaque fin de saison.</p>';
  const W = 320, H = 80, mn = Math.min(...pts.map(x => x[1])) - 3, mx = Math.max(...pts.map(x => x[1])) + 3;
  const xy = pts.map(([, o], i) => [Math.round(i / (pts.length - 1) * (W - 20) + 10), Math.round(H - 14 - (o - mn) / Math.max(1, mx - mn) * (H - 28))]);
  return `<svg class="fe-courbe" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution du niveau">
    <polyline points="${xy.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2"/>
    ${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3" fill="var(--acc)"/><text x="${x}" y="${y - 7}" text-anchor="middle">${pts[i][1]}</text><text x="${x}" y="${H - 2}" text-anchor="middle" class="fe-an">${i === pts.length - 1 ? 'auj.' : `${String(pts[i][0]).slice(-2)}/${String(pts[i][0] + 1).slice(-2)}`}</text>`).join('')}</svg>`;
}
function blocApprentissage(p) {
  const t = p.train?.learn; if (!t || t === p.pos || typeof notePoste !== 'function') return '';
  const fam = Math.round(p.posFam?.[t] ?? 30), D = attributsDetail(p);
  const maint = Math.round(notePoste(p, t, D) * 5);
  const sauve = p.posFam[t]; p.posFam[t] = 100; const apres = Math.round(notePoste(p, t, D) * 5); p.posFam[t] = sauve;
  return `<div class="fe-app"><b>Apprend le poste ${esc(ROLES[t]?.label || t)}</b>
    <span class="fe-jauge"><i style="width:${fam}%"></i></span><small>Familiarité ${fam} % · maîtrisé à 90 % · note au poste aujourd'hui <b>${maint}</b> → <b>${apres}</b> une fois maîtrisé</small></div>`;
}
window.addEventListener('load', () => {
  if (typeof playerModal !== 'function') return;
  const __playerModalFE = playerModal;
  playerModal = function (pid, tab = 'profil') {
    const r = __playerModalFE.apply(this, arguments);
    try {
      const p = getPlayer(G, pid); if (!p) return r;
      const connu = typeof knows !== 'function' || knows(G, p);
      if (tab === 'profil' && connu && !document.querySelector('#modal .fe-evo')) {
        const [cls, avis] = avisStaff(p);
        const ret = p.retraiteAnnoncee === G.season ? '<p class="fe-ret">👋 A annoncé sa retraite à la fin de la saison.</p>' : '';
        const html = `<section class="fe-evo"><h3>Évolution du niveau</h3>${courbeNiveau(p)}<p class="fe-avis ${cls}">Avis du staff : ${avis}</p>${ret}${blocApprentissage(p)}</section>`;
        const ancre = document.querySelector('#modal .attr36') || document.querySelector('#modal .reel-plus') || document.querySelector('#modal .tabs');
        ancre?.insertAdjacentHTML(ancre.classList.contains('tabs') ? 'afterend' : 'beforebegin', html);
      }
      if (tab === 'dev' && !document.querySelector('#modal .fe-app')) {
        const b = blocApprentissage(p), lab = document.querySelector('#dvLearn')?.closest('label');
        if (b && lab) lab.insertAdjacentHTML('afterend', b);
      }
    } catch (e) { console.error(e); }
    return r;
  };
});

// ---------- retraites annoncées à la mi-saison ----------
function annoncerRetraites(G) {
  const mi = Math.floor(G.schedule.length / 2);
  if (G.week !== mi || G.retraitesAnnoncees === G.season) return;
  G.retraitesAnnoncees = G.season;
  const mes = [];
  withSideRng(`${G.seed}|annonce|${G.season}`, () => {
    for (const p of G.players) {
      if (p.academy || p.age < 32 || p.club == null) continue;
      const lr = Math.max(1, leagueRoundAt(G)), jeu = (p.stats?.min || 0) / (lr * 90);
      const ch = (p.age - 31) * .12 + (jeu < .15 ? .15 : 0) + ((p.injury || 0) > 60 ? .2 : 0) - (p.club === G.clubId ? .05 : 0);
      if (rnd() < ch) { p.retraiteAnnoncee = G.season; if (p.club === G.clubId) mes.push(p); }
    }
  });
  for (const p of mes) news(G, `👋 ${p.name} (${p.age} ans) annonce qu'il mettra fin à sa carrière à l'issue de la saison. Pense à préparer sa succession.`, 'warn');
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateFE = weeklyUpdate;
  weeklyUpdate = function (G) { const r = __weeklyUpdateFE.apply(this, arguments); try { annoncerRetraites(G); } catch (e) { console.error(e); } return r; };
}
