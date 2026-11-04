// ============================================================
//  Actions du manager
//  - Sur la fiche d'un joueur de l'effectif (menu « Actions ») : coup de pression en privé, félicitations ou critique
//    dans la presse, amende. Effet selon son caractère (pression, tempérament : js/notes_cachees.js), une action par
//    joueur toutes les 3 semaines. Un joueur influent répercute une critique publique sur ses proches.
//  - Page Réunions, carte « Actions du manager » :
//    · Sortie dans la presse (une par semaine) : défendre le groupe, viser l'adversaire du prochain match, critiquer
//      l'arbitrage (risque de passer en commission de discipline), réclamer des renforts au président.
//    · Entraîneur (mode directeur sportif) : le soutenir publiquement ou lui mettre la pression.
//    · Commission de la ligue : faire appel d'une suspension après un carton rouge (frais de dossier, réduction
//      possible, aggravation possible), déposer une réclamation sur l'arbitrage du dernier match.
//  - Fin de match en direct : « Entrer dans le vestiaire » (féliciter, rester calme, coup de gueule, ne rien dire).
//  Tirages à part (withSideRng) : le déroulé des matchs ne change pas.
// ============================================================
const semAM = () => G.season * 100 + G.week;
function caracJoueur(p) { const c = typeof notesCachees === 'function' ? notesCachees(p) : {}; return { pres: c.pres ?? 12, temp: c.temp ?? 12, prof: c.prof ?? 12 }; }
function journalAction(qui, sujet, res) { (G.meetLog ||= []).unshift({ season: G.season, week: G.week, label: weekLabel(G), kind: 'Action', who: qui, topic: sujet, result: res }); }
const tirageAM = (cle, f) => withSideRng(`${G.seed}|act|${cle}|${semAM()}`, f);
// ---------- joueur ----------
const ACTIONS_JOUEUR = {
  pression: ['Coup de pression en privé', 'Exiger plus, entre quatre yeux.'],
  feliciter: ['Le féliciter dans la presse', 'Le mettre en valeur publiquement.'],
  critiquer: ['Le critiquer dans la presse', 'Message public : risqué avec un joueur influent.'],
  amende: ['Lui infliger une amende', 'Une semaine de salaire, après un écart (carton rouge, comportement).']
};
function actionJoueur(p, k) {
  if ((p.lastAct ?? -99) + 3 > G.week && p.lastActS === G.season) return `Tu es déjà intervenu auprès de ${p.name} récemment : attends quelques semaines.`;
  const c = caracJoueur(p), lead = influence(G, p) >= 60;
  let d = 0, t = 0, txt;
  if (k === 'pression') {
    const s = (c.temp - 12) * .6 + (c.pres - 12) * .5 + (p.morale >= 60 ? 1 : -1);
    if (s >= 1) { d = 5; t = 2; txt = `${p.name} encaisse et promet de réagir : il veut te prouver que tu as tort.`; }
    else if (s >= -2) { d = -2; t = -1; txt = `${p.name} t'écoute sans rien dire. Difficile de savoir s'il a compris.`; }
    else { d = -9; t = -6; txt = `${p.name} vit mal ce coup de pression et se renferme.`; }
  } else if (k === 'feliciter') {
    d = 7; t = 4; txt = `${p.name} apprécie. Il se sent soutenu.`;
    if (p.status === 'rot' || p.status === 'sub') { const jaloux = clubPlayers(G, G.clubId).filter(x => x !== p && x.pos === p.pos && (x.status === 'first' || x.status === 'star')); for (const x of jaloux) x.morale = clamp(x.morale - 2, 5, 100); if (jaloux.length) txt += ` Ses concurrents au poste un peu moins.`; }
  } else if (k === 'critiquer') {
    const s = (c.temp - 12) * .5 + (c.pres - 12) * .4 - (lead ? 2 : 0);
    d = s >= 2 ? 2 : -10; t = s >= 2 ? -2 : -10;
    txt = s >= 2 ? `${p.name} répond sur le terrain plutôt que dans les journaux.` : `${p.name} est touché par tes déclarations publiques.`;
    if (s < 2 && lead && typeof groupEcho === 'function') { groupEcho(p, -3); txt += ' Ses proches dans le vestiaire prennent sa défense.'; }
  } else if (k === 'amende') {
    const motif = p.susp > 0 || p.morale < 45;
    flow(G, myClub(G), p.wage, 'other');
    d = -6; t = motif ? -2 : -8;
    if (motif) { const c2 = myClub(G); c2.coh = clamp((c2.coh ?? 60) + 1, 0, 100); txt = `${p.name} paie l'amende. Le groupe voit que les règles s'appliquent à tous.`; }
    else txt = `${p.name} ne comprend pas cette amende : il n'a rien fait de grave.`;
  }
  p.morale = clamp(p.morale + d, 5, 100); p.trust = clamp((p.trust ?? 55) + t, 0, 100); p.lastAct = G.week; p.lastActS = G.season;
  journalAction(p.name, ACTIONS_JOUEUR[k][0], txt); save();
  return txt;
}
// ---------- presse, entraîneur, commission ----------
function prochainAdversaire() {
  for (let w = G.week; w < G.schedule.length; w++) { const f = weekFixtures(G, w).find(x => x.h === G.clubId || x.a === G.clubId); if (f) return getClub(G, f.h === G.clubId ? f.a : f.h); }
  return null;
}
function sortiePresse(k) {
  G.actions ||= {};
  if (G.actions.presse === semAM()) return 'Tu t\'es déjà exprimé dans la presse cette semaine.';
  G.actions.presse = semAM();
  const sq = clubPlayers(G, G.clubId), mauvaisePasse = typeof recentPts === 'function' && recentPts(G) < 1.2;
  let txt;
  if (k === 'defendre') {
    sq.forEach(p => p.morale = clamp(p.morale + (mauvaisePasse ? 4 : 1), 5, 100));
    txt = mauvaisePasse ? 'Le vestiaire apprécie que tu fasses bloc dans la tempête.' : 'Discours bien reçu, sans plus : tout va bien.';
  } else if (k === 'adversaire') {
    const o = prochainAdversaire(); if (!o) return 'Pas de prochain adversaire connu.';
    const marche = tirageAM('mind', () => rnd() < .55);
    const eux = clubPlayers(G, o.id).filter(p => !p.academy);
    eux.forEach(p => p.morale = clamp(p.morale + (marche ? -4 : 4), 5, 100));
    txt = marche ? `Tes piques touchent ${o.name} : leur vestiaire est nerveux avant le match.` : `${o.name} se sert de tes déclarations pour se motiver. Raté.`;
  } else if (k === 'arbitrage') {
    sq.forEach(p => p.morale = clamp(p.morale + 2, 5, 100));
    const sanction = tirageAM('arb', () => rnd() < .45);
    txt = 'Tes joueurs se sentent défendus.';
    if (sanction) { const a = roundMoney(20000 + myClub(G).rep * 800); flow(G, myClub(G), -a, 'other'); G.board.conf = clamp(G.board.conf - 1, 0, 100); txt += ` Mais la commission de discipline te sanctionne : ${money(a)} d'amende.`; news(G, `⚖ Commission de discipline : ${myClub(G).name} sanctionné de ${money(a)} pour des propos sur l'arbitrage.`, 'warn'); }
  } else if (k === 'renforts') {
    const ok = G.board.conf >= 60 && tirageAM('renf', () => rnd() < .5);
    if (ok) { const plus = roundMoney((G.board.transfer || 0) * .1 + 500000); G.board.transfer = (G.board.transfer || 0) + plus; G.board.conf = clamp(G.board.conf - 2, 0, 100); txt = `Le président cède : ${money(plus)} de plus pour le mercato. Il n'a pas aimé l'apprendre par la presse.`; }
    else { G.board.conf = clamp(G.board.conf - 5, 0, 100); txt = 'Le président n\'apprécie pas d\'être mis devant le fait accompli. Pas un euro de plus.'; }
  }
  journalAction('Presse', { defendre: 'Défendre le groupe', adversaire: 'Viser l\'adversaire', arbitrage: 'Critiquer l\'arbitrage', renforts: 'Réclamer des renforts' }[k], txt);
  news(G, `🎤 ${txt}`, 'press'); save();
  return txt;
}
function actionEntraineur(k) {
  if (!G.coach || typeof coachAxes !== 'function') return 'Pas d\'entraîneur en poste.';
  G.actions ||= {};
  if ((G.actions.coach ?? -99) + 3 > semAM() && Math.floor((G.actions.coach ?? 0) / 100) === G.season) return 'Tu lui as déjà parlé récemment.';
  G.actions.coach = semAM();
  const ax = coachAxes(G.coach); let txt;
  if (k === 'soutien') { ax.confiance = clamp(ax.confiance + 6, 0, 100); G.coach.relation = clamp((G.coach.relation ?? 60) + 5, 0, 100); txt = `${G.coach.name} apprécie ton soutien public.`; }
  else {
    const ok = tirageAM('coachp', () => rnd() < .5 + ((G.coach.ax?.autorite ?? 50) - 50) / 200);
    ax.confiance = clamp(ax.confiance - 6, 0, 100); G.coach.relation = clamp((G.coach.relation ?? 60) - 4, 0, 100);
    if (ok) { ax.autorite = clamp(ax.autorite + 4, 0, 100); clubPlayers(G, G.clubId).forEach(p => p.morale = clamp(p.morale + 2, 5, 100)); txt = `${G.coach.name} a compris le message et resserre les boulons.`; }
    else txt = `${G.coach.name} le prend mal : il se sent lâché.`;
  }
  journalAction(G.coach.name, k === 'soutien' ? 'Soutien à l\'entraîneur' : 'Pression sur l\'entraîneur', txt); save();
  return txt;
}
function appelsPossibles() { return clubPlayers(G, G.clubId).filter(p => p.rougeSem && p.rougeSem.s === G.season && G.week - p.rougeSem.w <= 2 && p.susp > 0 && !p.rougeSem.appel); }
function faireAppel(p) {
  const frais = 15000; flow(G, myClub(G), -frais, 'other'); p.rougeSem.appel = true;
  const r = tirageAM('appel|' + p.id, () => rnd());
  let txt;
  if (r < .3) { p.susp = Math.max(0, p.susp - 1); txt = `Appel accepté : la suspension de ${p.name} est réduite d'un match.`; }
  else if (r < .85) txt = `Appel rejeté : la suspension de ${p.name} est confirmée.`;
  else { p.susp += 1; txt = `Appel jugé abusif : un match de suspension en plus pour ${p.name}.`; }
  journalAction('Commission de la ligue', `Appel pour ${p.name}`, txt); news(G, `⚖ ${txt} (frais de dossier ${money(frais)})`, 'warn'); save();
  return txt;
}
function reclamationArbitrage() {
  G.actions ||= {};
  const f = G.lastMyFixture; if (!f || G.actions.reclam === f) return 'Aucun match récent à contester.';
  G.actions.reclam = f;
  const ok = tirageAM('reclam', () => rnd() < .25);
  const txt = ok ? 'La commission reconnaît une erreur d\'arbitrage. Pas de changement au résultat, mais tes joueurs se sentent écoutés.' : 'Réclamation classée sans suite.';
  if (ok) clubPlayers(G, G.clubId).forEach(p => p.morale = clamp(p.morale + 3, 5, 100));
  journalAction('Commission de la ligue', 'Réclamation sur l\'arbitrage', txt); save();
  return txt;
}
// cartons rouges : date pour l'appel ; dernier match joué (réclamation)
if (typeof applyMatch === 'function') {
  const __applyMatchAM = applyMatch;
  applyMatch = function (G, mt, f) {
    const r = __applyMatchAM.apply(this, arguments);
    try {
      const me = mt.sides?.findIndex(s => s.clubId === G.clubId);
      if (me >= 0) {
        G.lastMyFixture = `${G.season}|${G.week}|${f.h}|${f.a}`;
        for (const e of mt.events || []) if (e.type === 'red' && e.side === me) { const p = getPlayer(G, e.pid); if (p) p.rougeSem = { s: G.season, w: G.week }; }
      }
    } catch (e) { console.error(e); }
    return r;
  };
}
// ---------- écran Réunions ----------
function carteActions() {
  const presseFaite = G.actions?.presse === semAM(), ap = appelsPossibles(), o = prochainAdversaire();
  const ds = typeof isDS === 'function' && isDS() && G.coach;
  const b = (attr, k, l, s, dis) => `<button class="am-act" ${attr}="${k}" ${dis ? 'disabled' : ''}><b>${l}</b><small>${s}</small></button>`;
  return `<section class="card am-card"><h2>Actions du manager</h2>
    <h3>Sortie dans la presse ${presseFaite ? '<small class="muted">faite cette semaine</small>' : ''}</h3>
    <div class="am-grid">${b('data-amp', 'defendre', 'Défendre le groupe', 'Utile dans une mauvaise passe.', presseFaite)}${b('data-amp', 'adversaire', 'Viser l\'adversaire', o ? `Déstabiliser ${esc(o.name)}… ou les motiver.` : 'Pas de match à venir.', presseFaite || !o)}
      ${b('data-amp', 'arbitrage', 'Critiquer l\'arbitrage', 'Tes joueurs aiment, la commission de discipline moins.', presseFaite)}${b('data-amp', 'renforts', 'Réclamer des renforts', 'Le président peut céder… ou se vexer.', presseFaite)}</div>
    ${ds ? `<h3>Entraîneur : ${esc(G.coach.name)}</h3><div class="am-grid">${b('data-amc', 'soutien', 'Le soutenir publiquement', 'Confiance et relation en hausse.')}${b('data-amc', 'pression', 'Lui mettre la pression', 'Peut le piquer au vif… ou le braquer.')}</div>` : ''}
    <h3>Commission de la ligue</h3>
    <div class="am-grid">${ap.map(p => b('data-ama', p.id, `Faire appel pour ${esc(p.name)}`, `Suspendu ${p.susp} match${p.susp > 1 ? 's' : ''} · frais 15 000 € · réduction ou aggravation possible.`)).join('')}
      ${b('data-amr', '1', 'Réclamation sur l\'arbitrage', 'Contester l\'arbitrage du dernier match.', !G.lastMyFixture || G.actions?.reclam === G.lastMyFixture)}</div>
    ${ap.length ? '' : '<p class="hint">Aucune suspension récente à contester. Un appel n\'est possible que dans les deux semaines après un carton rouge.</p>'}
    <p class="hint">Les actions sur un joueur (coup de pression, félicitations ou critique dans la presse, amende) sont dans le menu « Actions » de sa fiche.</p></section>`;
}
function brancherActions(el, refaire) {
  const res = t => { toast(t); refaire(); };
  el.querySelectorAll('[data-amp]').forEach(x => x.onclick = () => res(sortiePresse(x.dataset.amp)));
  el.querySelectorAll('[data-amc]').forEach(x => x.onclick = () => res(actionEntraineur(x.dataset.amc)));
  el.querySelectorAll('[data-ama]').forEach(x => x.onclick = () => confirmBox(`Faire appel de la suspension de ${getPlayer(G, +x.dataset.ama).name} (15 000 € de frais) ?`, () => res(faireAppel(getPlayer(G, +x.dataset.ama)))));
  el.querySelectorAll('[data-amr]').forEach(x => x.onclick = () => res(reclamationArbitrage()));
}
// ---------- vestiaire après le match (match en direct) ----------
const VESTIAIRE = { feliciter: 'Féliciter', calme: 'Rester calme, analyser', gueule: 'Coup de gueule', rien: 'Ne rien dire' };
function entrerVestiaire(mt, k) {
  const me = mt.my, d = mt.score[me] - mt.score[1 - me], joueurs = Object.entries(mt.pr).filter(([, r]) => r.side === me && r.min > 0).map(([id]) => getPlayer(G, +id)).filter(Boolean);
  const base = { feliciter: d > 0 ? 4 : d === 0 ? 0 : -4, calme: d < 0 ? 2 : 1, gueule: d < 0 ? 3 : d === 0 ? 0 : -5, rien: d < 0 ? -1 : 0 }[k];
  let pos = 0, neg = 0;
  for (const p of joueurs) {
    const c = caracJoueur(p), r = base + (k === 'gueule' ? (c.temp - 12) * .3 + (c.pres - 12) * .25 : 0);
    p.morale = clamp(p.morale + r, 5, 100); if (r > .5) pos++; else if (r < -.5) neg++;
  }
  const txt = `${VESTIAIRE[k]} : ${pos} joueur${pos > 1 ? 's' : ''} réceptif${pos > 1 ? 's' : ''}${neg ? `, ${neg} agacé${neg > 1 ? 's' : ''}` : ''}.`;
  journalAction('Vestiaire', `Après le match : ${VESTIAIRE[k].toLowerCase()}`, txt);
  return txt;
}
window.addEventListener('load', () => {
  if (typeof vMeetings === 'function') {
    const __vMeetingsAM = vMeetings;
    vMeetings = function (el) {
      const r = __vMeetingsAM.apply(this, arguments);
      try { el.insertAdjacentHTML('afterbegin', carteActions()); brancherActions(el, () => vMeetings(el)); } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof endLive === 'function') {
    const __endLiveAM = endLive;
    endLive = function () {
      const mt = LIVE?.mt;
      const r = __endLiveAM.apply(this, arguments);
      try {
        const fin = $('#mDone')?.parentElement; if (!mt || !fin) return r;
        fin.insertAdjacentHTML('beforebegin', `<section class="card am-vest"><h2>Entrer dans le vestiaire</h2><p class="hint">Un mot à chaud avant de quitter le stade ? Chaque joueur réagit selon son caractère.</p>
          <div class="am-grid">${Object.entries(VESTIAIRE).map(([k, l]) => `<button class="am-act" data-vest="${k}"><b>${l}</b></button>`).join('')}</div><p id="vestRes" class="am-res"></p></section>`);
        $$('[data-vest]').forEach(b => b.onclick = () => { const t = entrerVestiaire(mt, b.dataset.vest); $$('[data-vest]').forEach(x => x.disabled = true); $('#vestRes').textContent = t; });
      } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof playerModal === 'function') {
    const __playerModalAM = playerModal;
    playerModal = function (pid) {
      const r = __playerModalAM.apply(this, arguments);
      try {
        const p = getPlayer(G, +pid), head = document.querySelector('#modal .pm-head');
        if (p && head && p.club === G.clubId && !head.querySelector('.am-menu')) {
          const recent = (p.lastAct ?? -99) + 3 > G.week && p.lastActS === G.season;
          head.querySelector('#cmpAdd, #pmfPerso')?.insertAdjacentHTML('beforebegin', `<details class="am-menu"><summary class="btn sm ghost">Actions</summary><div class="am-pop" role="menu">${recent ? '<p class="hint">Déjà intervenu récemment : attends quelques semaines.</p>' : ''}${Object.entries(ACTIONS_JOUEUR).map(([k, [l, s]]) => `<button role="menuitem" data-amj="${k}" ${recent ? 'disabled' : ''}><b>${l}</b><small>${s}</small></button>`).join('')}</div></details>`);
          head.querySelectorAll('[data-amj]').forEach(b => b.onclick = e => { e.stopPropagation(); const t = actionJoueur(p, b.dataset.amj); closeModal(); playerModal(p.id); toast(t); });
        }
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
