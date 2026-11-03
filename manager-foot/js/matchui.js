let LIVE_WX = null;
// ============================================================
//  Déroulé des semaines et des matchs (avant, pendant, après)
// ============================================================
const PRESS_Q = [
  { q: 'Votre adversaire est en grande forme. Êtes-vous inquiet ?', a: [['Pas du tout, on va gagner ce match.', 'conf'], ['Ce sera difficile, nous les respectons.', 'humble'], ['La pression est sur eux, pas sur nous.', 'prov']] },
  { q: 'Les supporters attendent une réaction après les derniers résultats. Que leur dites-vous ?', a: [['Nous allons tout donner, promis.', 'conf'], ['Il faut rester patient, le travail paiera.', 'humble'], ['Je ne lis pas ce qui se dit dehors.', 'prov']] },
  { q: 'On dit que votre effectif manque de profondeur. Votre réponse ?', a: [['J\'ai pleinement confiance en mes joueurs.', 'conf'], ['Nous travaillons pour nous renforcer.', 'humble'], ['Ceux qui disent ça ne connaissent rien au football.', 'prov']] },
  { q: 'Ce match peut-il être un tournant de votre saison ?', a: [['Oui, et nous serons prêts.', 'conf'], ['Chaque match compte autant.', 'humble'], ['Je laisse les journalistes parler de tournants.', 'prov']] },
  { q: 'Votre adversaire a déclaré qu\'il allait vous battre. Un commentaire ?', a: [['Rendez-vous sur le terrain.', 'conf'], ['Chacun a le droit de s\'exprimer.', 'humble'], ['Ils parlent beaucoup pour une petite équipe.', 'prov']] }
];

function advance() {
  if (LIVE || $('#modal')) return;
  if (G.week >= G.schedule.length) return seasonEnd();
  const f = weekFixtures(G).find(f => f.h === G.clubId || f.a === G.clubId);
  if (f) return prepareMatch(f);
  // pas de match cette semaine pour nous
  const e = G.schedule[G.week];
  const label = weekLabel(G);
  const r = completeWeek(G, null);
  save();
  toast(e.t === 'C' ? `${label} : pas de match pour toi cette semaine. Semaine simulée.` : 'Semaine simulée.');
  afterWeek(r);
}

function afterWeek(r) {
  if (r === 'sacked') return sackedScreen();
  if (G.week >= G.schedule.length) return seasonEnd();
  show('inbox');
}

function validateLineup() {
  ensureSquad(G, G.clubId);
  const T = G.tactics;
  const mine = new Set(clubPlayers(G, G.clubId).map(p => p.id));
  const problems = [];
  T.lineup = T.lineup.map(id => { if (id && (!mine.has(id) || !available(getPlayer(G, id)))) { problems.push(getPlayer(G, id)?.name); return null; } return id; });
  T.bench = T.bench.filter(id => mine.has(id) && available(getPlayer(G, id)) && !T.lineup.includes(id));
  if (T.lineup.some(x => !x)) {
    FORMATIONS[T.formation].forEach((_, i) => {
      const r = slotRole(T, i);
      if (T.lineup[i]) return;
      const cands = clubPlayers(G, G.clubId).filter(p => available(p) && !T.lineup.includes(p.id)).sort((a, b) => effRating(b, r) - effRating(a, r));
      if (cands[0]) { T.lineup[i] = cands[0].id; T.bench = T.bench.filter(x => x !== cands[0].id); }
    });
  }
  for (const p of clubPlayers(G, G.clubId).sort((a, b) => playerOvr(b) - playerOvr(a))) if (T.bench.length < 9 && available(p) && !T.lineup.includes(p.id) && !T.bench.includes(p.id)) T.bench.push(p.id);
  return problems.filter(Boolean);
}

function prepareMatch(f) {
  const probs = validateLineup();
  const home = f.h === G.clubId;
  const opp = getClub(G, home ? f.a : f.h);
  const oppTac = aiTactics(G, opp.id, G.clubId);
  const oppS = teamStrength(G, makeSide(G, opp.id, oppTac)), myS = teamStrength(G, makeSide(G, G.clubId, G.tactics));
  const oppTop = oppTac.lineup.map(id => getPlayer(G, id)).filter(Boolean).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 3);
  const comp = compName(G, f) + ' — ' + weekLabel(G);
  const oppL = clubLeague(G, opp.id), ot = oppL ? standings(G, oppL.id) : null, orank = ot ? ot.findIndex(t => t.id === opp.id) + 1 : 0;
  const asl = G.staff.assistant;
  const cmp = (l, a, b) => `<div class="cmp"><b>${Math.round(a)}</b><div class="cmpbar"><i style="width:${a / (a + b) * 100}%"></i></div><b>${Math.round(b)}</b><small>${l}</small></div>`;
  const press = rnd() < .4 && !G.pressDone ? pick(PRESS_Q) : null;
  const wx = pickWeather(dateOfWeek(G, G.week));
  LIVE_WX = wx;
  const estAtt = attendanceFor(G, f, wx);
  G.pressMod = null;
  modal(`<h2>Avant-match · ${esc(comp)}</h2>
    <div class="vs">${crest(getClub(G, f.h), 60)}<b>${esc(getClub(G, f.h).name)}</b><span>vs</span><b>${esc(getClub(G, f.a).name)}</b>${crest(getClub(G, f.a), 60)}</div>
    <p class="center wxline">${wx.icon} ${wx.label}, ${wx.temp}°C · ${esc(getClub(G, f.h).stadium)} · ~${estAtt.toLocaleString('fr-FR')} spectateurs attendus${wx.fatigue > 1 ? ' · ⚠ fatigue accrue' : ''}${wx.muscle > 1 ? ' · ⚠ risque de blessure musculaire' : ''}${wx.long < 1 ? ' · frappes de loin difficiles' : ''}${wx.fouls > 1 ? ' · terrain glissant' : ''}</p>
    ${probs.length ? `<div class="alert">Remplacés automatiquement (blessés/suspendus) : ${probs.map(esc).join(', ')}</div>` : ''}
    <div class="grid2">
      <div><h3>Rapport de l'adversaire</h3>
        <table class="tbl kv">
          <tr><td>${oppL ? 'Classement' : 'Origine'}</td><td>${oppL ? `${orank}<sup>e</sup> de ${esc(oppL.name)} · ${ot[orank - 1].form.slice(-5).join(' ') || '-'}` : `Club étranger (${esc(NATIONS.find(n => n[0] === opp.country)?.[1] || opp.country || '?')})`}</td></tr>
          <tr><td>Système</td><td>${oppTac.formation}${asl >= 2 ? ` · pressing ${INST.press.opts[oppTac.inst.press + 1].toLowerCase()} · ligne ${INST.line.opts[oppTac.inst.line + 1].toLowerCase()}` : ''}${asl >= 4 ? ` · tempo ${INST.tempo.opts[oppTac.inst.tempo + 1].toLowerCase()} · passes ${INST.pass.opts[oppTac.inst.pass + 1].toLowerCase()}` : ''}</td></tr>
          <tr><td>Joueurs clés</td><td>${oppTop.map(p => `${esc(p.name)} ${ovrBadge(playerOvr(p))}`).join('<br>')}</td></tr>
        </table>
        ${asl < 2 ? '<p class="hint">Un meilleur adjoint (menu Staff) t\'en dirait plus sur leur style de jeu.</p>' : ''}
        ${asl >= 2 && oppTac.inst.line > 0 ? '<p class="hint">💡 Ligne haute : des attaquants rapides et un tempo rapide peuvent les punir en contre.</p>' : ''}
        ${asl >= 2 && oppTac.inst.press > 0 ? '<p class="hint">💡 Pressing haut : des passes courtes aident à garder le ballon.</p>' : ''}
      </div>
      <div><h3>Comparaison (toi / eux)</h3>
        ${cmp('Défense', myS.def, oppS.def)}${cmp('Milieu', myS.mid, oppS.mid)}${cmp('Attaque', myS.att, oppS.att)}${cmp('Gardien', myS.gk, oppS.gk)}
        <p class="hint">Ta tactique : ${G.tactics.formation} · ${MENTALITIES.find(m => m.v === G.tactics.mentality).label}</p>
      </div>
    </div>
    <div class="press"><h3>🎯 Plan de match</h3><div class="form-grid">
      <label>Discours d'avant-match <select id="pmTalk">${PRE_TALKS.map(t => `<option value="${t.k}">${t.label}</option>`).join('')}</select></label>
      ${(G.tacPresets || []).some(Boolean) ? `<label>Tactique <select id="pmPreset"><option value="">Actuelle (${G.tactics.formation})</option>${G.tacPresets.map((pr, i) => pr ? `<option value="${i}">${esc(pr.name)} (${pr.formation})</option>` : '').join('')}</select></label>` : ''}
      ${[0, 1].map(k => `<label>Marquage individuel ${k + 1} <select class="pmMark"><option value="">— Aucun —</option>${oppTac.lineup.map(id => getPlayer(G, id)).filter(p => p && p.pos !== 'GB').sort((a, b) => playerOvr(b) - playerOvr(a)).map(p => `<option value="${p.id}">${esc(p.name)} (${p.pos} ${playerOvr(p)})</option>`).join('')}</select></label>`).join('')}
    </div><p class="hint">Un marquage individuel gêne le joueur ciblé (dribbles, passes reçues), au prix d'un peu de fatigue pour tes défenseurs.</p></div>
    ${press ? `<div class="press"><h3>🎤 Conférence de presse</h3><p>« ${esc(press.q)} »</p><div class="talk-opts">${press.a.map(([t, k]) => `<button class="btn" data-press="${k}">${esc(t)}</button>`).join('')}</div></div>` : ''}
    <div class="row gap mt wrap"><button class="btn" id="pmT">📋 Tactique</button><div class="grow"></div>
      <button class="btn" id="pmS" title="Simuler sans regarder">⏩ Résultat direct</button><button class="btn primary big" id="pmP">▶ Jouer le match</button></div>`, 'wide');
  $$('[data-press]').forEach(b => b.onclick = () => {
    const k = b.dataset.press;
    G.pressMod = k;
    const d = k === 'conf' ? 3 : k === 'prov' ? 4 : 0;
    clubPlayers(G, G.clubId).forEach(p => p.morale = clamp(p.morale + d, 5, 100));
    if (k === 'humble') G.board.conf = clamp(G.board.conf + 1, 0, 100);
    const txt = { conf: 'Tes joueurs apprécient ta confiance.', humble: 'Discours mesuré, le président apprécie.', prov: 'Tes mots font le buzz… le vestiaire est remonté à bloc !' }[k];
    $('.press').innerHTML = `<h3>🎤 Conférence de presse</h3><p class="pos">${txt}</p>`;
  });
  $('#pmT').onclick = () => { closeModal(); show('tactics'); };
  const start = instant => {
    const pi = $('#pmPreset')?.value;
    if (pi) applyPreset(G, G.tacPresets[+pi]);
    G.tactics.mark = [...new Set($$('.pmMark').map(s => +s.value).filter(Boolean))];
    const talkK = $('#pmTalk')?.value;
    const sMy = teamStrength(G, makeSide(G, G.clubId, G.tactics)), sOp = teamStrength(G, makeSide(G, opp.id, oppTac));
    const diff = (sMy.def + sMy.mid + sMy.att) / 3 - (sOp.def + sOp.mid + sOp.att) / 3;
    G.preTalk = talkK ? preTalkEffect(talkK, { diff, home }) : 0;
    validateLineup();
    closeModal();
    const ht = home ? G.tactics : oppTac, at = home ? oppTac : G.tactics;
    const mt = new Match(G, f, ht, at, { cup: isKO(f), weather: LIVE_WX, firstLeg: f.firstRes });
    mt.my = home ? 0 : 1;
    mt.sides[1 - mt.my].ai = true;
    if (G.pressMod === 'conf') mt.sides[mt.my].talk = 1.01;
    mt.sides[mt.my].talk = clamp((mt.sides[mt.my].talk || 1) + (G.preTalk || 0), .95, 1.06);
    if (G.preTalk) mt.say(`Vestiaire : ${G.preTalk > .012 ? 'les joueurs entrent sur le terrain gonflés à bloc !' : G.preTalk > 0 ? 'discours bien reçu.' : 'le discours n\'a pas pris…'}`, 'info', mt.my);
    if (G.pressMod === 'prov') mt.sides[1 - mt.my].talk = 1.01;
    if (instant) { mt.auto = true; mt.sides[mt.my].ai = true; mt.runToEnd(); finishMatch(mt, f); }
    else liveMatch(mt, f);
  };
  $('#pmS').onclick = () => start(true);
  $('#pmP').onclick = () => start(false);
}

// ---------- Match en direct ----------
function liveMatch(mt, f) {
  LIVE = { mt, f, speed: SETTINGS.speed, timer: null, paused: false, shown: 0 };
  mt.record = true;
  document.body.classList.add('live');
  $$('#nav button').forEach(b => b.disabled = true);
  $('#btnGo').disabled = true;
  const H = getClub(G, f.h), A = getClub(G, f.a);
  const comp = compName(G, f) + ' · ' + weekLabel(G);
  const my = mt.sides[mt.my];
  $('#main').innerHTML = `
  <div class="match">
    <section class="card scoreboard" style="--h1:${H.colors[0]};--a1:${A.colors[0]}">
      <div class="tm">${crest(H, 56)}<b>${esc(H.name)}</b></div>
      <div class="sc"><small class="comp">${esc(comp)} · ${mt.weather.icon} ${mt.weather.temp}°C · ${mt.att.toLocaleString('fr-FR')} spect.</small><span id="score">0 - 0</span><small id="min">0'</small><small id="xg" class="muted"></small></div>
      <div class="tm">${crest(A, 56)}<b>${esc(A.name)}</b></div>
    </section>
    <div class="match-grid">
      <div class="col">
        ${SETTINGS.show2d ? '<section class="card pitchcard"><canvas id="pitch2d"></canvas><div id="mom" class="mom"></div></section>' : '<section class="card"><div id="mom" class="mom"></div></section>'}
        <section class="card"><h3>Commentaires</h3><ul id="feed" class="feed"></ul></section>
      </div>
      <div class="col">
        <section class="card"><h3>Contrôles</h3>
          <div class="row gap wrap">
            <button class="btn" id="mPause">⏸ Pause</button>
            <select id="mSpeed"><option value="400">Lent</option><option value="120">Normal</option><option value="35">Rapide</option><option value="0">Instantané</option></select>
            <button class="btn" id="mSub">🔁 Changement</button>
            <button class="btn" id="mTac">📋 Tactique</button>
            <button class="btn" id="mSnd" title="Son">${Sound.on ? '🔊' : '🔇'}</button>
          </div>
          <label class="mt">Mentalité <select id="mMent">${MENTALITIES.map(m => `<option value="${m.v}" ${m.v === my.mentality ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
          <div class="inst sm">${Object.entries(INST).map(([k, d]) => `<div class="inst-row" title="${esc(d.tip)}"><span>${d.label}</span>${seg(k, d.opts, my.inst[k] ?? 0)}</div>`).join('')}</div>
          <div id="subs" class="hint"></div>
        </section>
        <section class="card"><h3>Statistiques</h3><div id="stats"></div></section>
        <section class="card"><h3>Mes joueurs</h3><div id="myp"></div></section>
      </div>
    </div>
    <div id="mEnd"></div>
  </div>`;
  $('#mSpeed').value = String(LIVE.speed);
  if (SETTINGS.show2d) { LIVE.pitch = new Pitch2D($('#pitch2d'), mt); LIVE.pitch.start(); }
  $('#mPause').onclick = () => setPaused(!LIVE.paused);
  $('#mSpeed').onchange = e => { LIVE.speed = +e.target.value; };
  $('#mMent').onchange = e => { my.mentality = +e.target.value; mt.say(`Consigne : ${MENTALITIES.find(m => m.v === +e.target.value).label.toLowerCase()}.`, 'info', mt.my); renderLive(); };
  $$('.match .seg').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => {
    my.inst[s.dataset.name] = +b.dataset.v;
    s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mt.say(`Consigne : ${INST[s.dataset.name].label.toLowerCase()} ${b.textContent.toLowerCase()}.`, 'info', mt.my); renderLive();
  }));
  $('#mSub').onclick = () => subModal();
  $('#mTac').onclick = () => liveTacticsModal();
  $('#mSnd').onclick = () => { Sound.on = !Sound.on; SETTINGS.sound = Sound.on; saveSettings(); $('#mSnd').textContent = Sound.on ? '🔊' : '🔇'; if (Sound.on) Sound.startCrowd(); else Sound.stopCrowd(); };
  Sound.startCrowd(); Sound.whistle(1);
  renderLive();
  tick();
}
function setPaused(v) {
  if (!LIVE) return;
  LIVE.paused = v;
  const b = $('#mPause'); if (b) b.textContent = v ? '▶ Reprendre' : '⏸ Pause';
  if (!v) tick();
}
function tick() {
  if (!LIVE || LIVE.paused) return;
  const { mt } = LIVE;
  clearTimeout(LIVE.timer);
  if (mt.done) return endLive();
  let n = LIVE.speed === 0 ? 300 : 1;
  const wasEt = mt.et;
  let halfNow = false;
  while (n-- > 0 && !mt.done) {
    mt.aiManage();
    mt.step();
    if (mt.pendingInjury) break;
    if (mt.minute === 45 && !mt.et && !LIVE.htShown) { halfNow = true; break; }
    if (mt.et !== wasEt) break;
  }
  const newLogs = mt.log.slice(LIVE.shown);
  LIVE.shown = mt.log.length;
  const big = newLogs.find(l => ['goal', 'red', 'pen', 'var'].includes(l.type));
  for (const l of newLogs) {
    if (l.type === 'goal') Sound.roar(l.side === mt.my);
    else if (l.type === 'half' || l.type === 'end') Sound.whistle(l.type === 'end' ? 3 : 2, true);
    else if (l.type === 'chance' || l.type === 'save') { if (rnd() < .5) Sound.groan(); }
  }
  Sound.intensity(Math.abs(mt.mom) / 60 + (mt.minute > 80 && Math.abs(mt.score[0] - mt.score[1]) <= 1 ? .3 : 0));
  assistantTip(mt);
  if (big && LIVE.pitch) {
    const lab = { goal: 'BUT !', red: 'CARTON ROUGE', pen: 'PENALTY', var: 'VAR : BUT REFUSÉ' }[big.type];
    LIVE.pitch.event(big.type === 'goal' ? `BUT ! ${mt.names[big.side]}` : lab, big.type);
  }
  renderLive();
  if (mt.pendingInjury) {
    const p = getPlayer(G, mt.pendingInjury.id);
    setPaused(true);
    if (mt.sides[mt.my].subsLeft > 0) subModal(`${p.name} est blessé ! Choisis un remplaçant.`, mt.pendingInjury.id);
    mt.pendingInjury = null;
    return;
  }
  if (halfNow) { LIVE.htShown = true; setPaused(true); return teamTalk('half'); }
  if (mt.et !== wasEt) { setPaused(true); return teamTalk('et'); }
  if (mt.done) return endLive();
  LIVE.timer = setTimeout(tick, LIVE.speed * (big?.type === 'goal' ? 10 : 1));
}
function teamTalk(when) {
  const { mt } = LIVE;
  const my = mt.sides[mt.my];
  const d = mt.score[mt.my] - mt.score[1 - mt.my];
  const sit = d > 0 ? 'Tu mènes' : d < 0 ? 'Tu es mené' : 'Le score est nul';
  modal(`<h2>${when === 'half' ? 'Mi-temps' : 'Avant les prolongations'} · ${mt.score[0]}-${mt.score[1]}</h2>
    <p>${sit}. Que dis-tu à tes joueurs dans le vestiaire ?</p>
    <div class="talk-opts">
      <button class="btn" data-tt="calm">🧘 Rester calme, continuer comme ça</button>
      <button class="btn" data-tt="encourage">💪 Encourager : « On peut le faire ! »</button>
      <button class="btn" data-tt="demand">📣 Exiger beaucoup plus</button>
      <button class="btn" data-tt="praise">👏 Féliciter</button>
    </div>
    <p class="hint">Tu peux aussi changer la tactique et faire des remplacements avant de reprendre.</p>`, '', { noClose: true });
  $$('[data-tt]').forEach(b => b.onclick = () => {
    const k = b.dataset.tt;
    const good = { calm: d >= 0 ? .015 : -.005, encourage: d <= 0 ? .02 : .005, demand: d < 0 ? .025 : d > 0 ? -.015 : .01, praise: d > 0 ? .02 : -.02 }[k] + (rnd() - .5) * .01;
    my.talk = clamp((my.talk || 1) + good, .95, 1.06);
    const txt = good > .012 ? 'Les joueurs repartent gonflés à bloc !' : good > 0 ? 'Les joueurs semblent réceptifs.' : 'Ton discours n\'a pas convaincu…';
    mt.say(`Causerie : ${txt}`, 'info', mt.my);
    closeModal(); toast(txt, good > 0 ? '' : 'err'); renderLive();
  });
}
function renderLive() {
  const { mt } = LIVE;
  $('#score').textContent = `${mt.score[0]} - ${mt.score[1]}${mt.penScore ? ` (${mt.penScore[0]}-${mt.penScore[1]} tab)` : ''}`;
  $('#min').textContent = mt.done ? 'Terminé' : (mt.et ? 'Prol. ' : '') + mt.minLabel() + "'";
  $('#xg').textContent = `xG ${mt.stats[0].xg.toFixed(1)} - ${mt.stats[1].xg.toFixed(1)}`;
  const icon = { calm: '·', goal: '⚽', yellow: '🟨', red: '🟥', inj: '✚', sub: '🔁', save: '🧤', chance: '💨', half: '⏱', end: '🏁', info: 'ℹ', pen: '🎯', var: '📺', penok: '🎯', penko: '🎯' };
  $('#feed').innerHTML = mt.log.slice().reverse().slice(0, 120).map(l => `<li class="ev-${l.type} ${l.side === mt.my ? 'mine' : l.side != null ? 'opp' : ''}"><b>${l.m}'</b> ${icon[l.type] || ''} ${esc(l.text)}</li>`).join('');
  const s = mt.stats, tot = s[0].poss + s[1].poss || 1, ph = Math.round(s[0].poss / tot * 100);
  const row = (l, a, b, fmtv = x => x) => `<div class="srow"><b>${fmtv(a)}</b><span>${l}</span><b>${fmtv(b)}</b></div><div class="sbar"><i style="width:${(a + b) ? a / (a + b) * 100 : 50}%"></i></div>`;
  const pp = i => s[i].pas ? Math.round(s[i].pasOk / s[i].pas * 100) : 0;
  $('#stats').innerHTML = row('Possession %', ph, 100 - ph) + row('xG', s[0].xg, s[1].xg, x => x.toFixed(2)) + row('Tirs', s[0].shots, s[1].shots) + row('Cadrés', s[0].onT, s[1].onT) + row('Passes réussies %', pp(0), pp(1)) + row('Tacles', s[0].tkl, s[1].tkl) + row('Corners', s[0].corners, s[1].corners) + row('Fautes', s[0].fouls, s[1].fouls) + row('Hors-jeu', s[0].off, s[1].off);
  const ml = mt.momLog.slice(-60);
  $('#mom').innerHTML = `<div class="momlbl"><span>${esc(mt.names[0])}</span><small>Dynamique du match</small><span>${esc(mt.names[1])}</span></div>
    <svg viewBox="0 0 120 30" preserveAspectRatio="none">${ml.map((v, i) => { const h = clamp(Math.abs(v) / 60, 0, 1) * 14; return `<rect x="${i * 2}" y="${v >= 0 ? 15 - h : 15}" width="1.6" height="${h}" fill="${v >= 0 ? 'var(--acc)' : 'var(--red)'}"/>`; }).join('')}<line x1="0" x2="120" y1="15" y2="15" stroke="#556" stroke-width=".3"/></svg>`;
  const side = mt.sides[mt.my];
  $('#myp').innerHTML = `<table class="tbl compact">${side.onPitch.map(x => { const p = getPlayer(G, x.id), r = mt.pr[x.id]; return `<tr class="${x.injured ? 'unav' : ''}"><td>${x.role}</td><td class="nm">${esc(p.name)} ${r.g ? '⚽'.repeat(r.g) : ''}${r.a ? '🅰' : ''}${r.yel ? '🟨' : ''}${x.injured ? '✚' : ''}</td><td>${bar(side.cond[x.id], 100, side.cond[x.id] < 60 ? 'low' : '')}</td><td><b>${r.r.toFixed(1)}</b></td></tr>`; }).join('')}
    ${side.sentOff.map(id => `<tr class="unav"><td>🟥</td><td colspan="3">${esc(getPlayer(G, id).name)}</td></tr>`).join('')}</table>`;
  $('#subs').textContent = `Changements restants : ${side.subsLeft}`;
}
function subModal(msg = '', outPre = null) {
  const { mt } = LIVE;
  const side = mt.sides[mt.my];
  if (side.subsLeft <= 0) return toast('Plus de changement possible.', 'err');
  if (mt.done) return;
  setPaused(true);
  modal(`<h2>Changement</h2>${msg ? `<div class="alert">${esc(msg)}</div>` : ''}
    <div class="grid2"><div><h3>Sortant</h3>${side.onPitch.map(x => { const p = getPlayer(G, x.id); return `<label class="opt"><input type="radio" name="out" value="${x.id}" ${x.id === outPre ? 'checked' : ''}> <b>${x.role}</b> ${esc(p.name)} ${bar(side.cond[x.id], 100, side.cond[x.id] < 60 ? 'low' : '')} <small>${mt.pr[x.id].r.toFixed(1)}</small> ${x.injured ? '✚' : ''}</label>`; }).join('')}</div>
    <div><h3>Entrant</h3>${side.bench.map(id => { const p = getPlayer(G, id); return `<label class="opt"><input type="radio" name="in" value="${id}"> <b>${p.pos}</b> ${esc(p.name)} ${ovrBadge(playerOvr(p))}</label>`; }).join('') || '<p class="muted">Banc vide.</p>'}</div></div>
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="doSub">Faire le changement</button></div>`);
  $('#doSub').onclick = () => {
    const o = $('input[name=out]:checked'), i = $('input[name=in]:checked');
    if (!o || !i) return toast('Choisis un sortant et un entrant.', 'err');
    mt.sub(mt.my, +o.value, +i.value); LIVE.shown = mt.log.length; closeModal(); renderLive();
  };
}
function assistantTip(mt) {
  const lvl = G.staff.assistant, m = mt.minute;
  if (mt.done || m < 15 || m === LIVE.lastTip || m % 15 !== 0 || rnd() > .35 + lvl * .13) return;
  LIVE.lastTip = m;
  const me = mt.my, op = 1 - me, s = mt.stats, side = mt.sides[me];
  const tot = s[0].poss + s[1].poss || 1, myPoss = s[me].poss / tot;
  const d = mt.score[me] - mt.score[op];
  const tips = [];
  const tired = side.onPitch.filter(x => x.role !== 'GB').sort((a, b) => side.cond[a.id] - side.cond[b.id])[0];
  if (tired && side.cond[tired.id] < 55 && side.subsLeft > 0) tips.push(`${getPlayer(G, tired.id).name} est à bout de forces, pense à le remplacer.`);
  if (myPoss < .4) tips.push('On subit au milieu. Un pressing plus haut ou des passes courtes nous aideraient à garder le ballon.');
  if (s[op].xg - s[me].xg > .8) tips.push('Ils se créent trop d\'occasions. Baisse la ligne défensive ou passe en défensif.');
  if (d < 0 && m >= 65) tips.push('Il faut prendre plus de risques : passe en offensif et accélère le tempo.');
  if (d > 0 && m >= 75) tips.push('On mène : on peut fermer le jeu (défensif, tempo lent).');
  if (s[me].shots >= 6 && s[me].onT <= 1) tips.push('Beaucoup de tirs mais peu cadrés. Essaie des passes plus courtes pour mieux construire.');
  const oppS = mt.sides[op].inst;
  if (lvl >= 3 && oppS.line > 0) tips.push('Leur ligne défensive est haute : un tempo rapide peut les surprendre en contre.');
  if (!tips.length) {
    if (myPoss > .58) tips.push(`On a le ballon (${Math.round(myPoss * 100)} %). Sois patient, écarte le jeu sur les côtés.`);
    else if (s[me].xg > s[op].xg + .5) tips.push('On se crée les meilleures occasions, continue comme ça !');
    else if (lvl >= 3) tips.push(`Match équilibré. Leur point fort : ${['la défense', 'le milieu', 'l\'attaque'][rint(0, 2)]}. Reste concentré.`);
  }
  LIVE.said ||= new Set();
  const fresh = tips.filter(t => !LIVE.said.has(t.replace(/\d+/g, '')));
  if (!fresh.length) return;
  const t = pick(fresh);
  LIVE.said.add(t.replace(/\d+/g, ''));
  mt.say(`💬 ${G.staffNames?.assistant || 'Ton adjoint'} : ${t}`, 'tip', me);
  LIVE.shown = mt.log.length;
  renderLive();
}
function endLive() {
  const { mt, f } = LIVE;
  clearTimeout(LIVE.timer);
  Sound.stopCrowd();
  renderLive();
  ['#mPause', '#mSub', '#mSpeed', '#mMent'].forEach(s => { const e = $(s); if (e) e.disabled = true; });
  $('#mEnd').innerHTML = postMatchHTML(mt) + `<div class="center mt"><button class="btn primary big" id="mDone">Continuer ▶</button></div>`;
  bindAnalysis($('#mEnd'));
  $('#mDone').onclick = () => finishMatch(mt, f);
  $('#mEnd').scrollIntoView({ behavior: 'smooth' });
}
function postMatchHTML(mt) {
  const my = mt.my, w = mt.winner();
  const title = w === my ? '🎉 Victoire !' : w == null ? '🤝 Match nul' : '😞 Défaite';
  const motm = mt.motm ? getPlayer(G, mt.motm) : null;
  const ratings = side => Object.entries(mt.pr).filter(([, r]) => r.side === side && r.min > 0).sort((a, b) => b[1].r - a[1].r)
    .map(([id, r]) => `<tr><td class="nm">${esc(getPlayer(G, +id).name)}</td><td>${r.g ? '⚽' + (r.g > 1 ? r.g : '') : ''}${r.a ? ' 🅰' : ''}</td><td>${mt.et ? r.min : Math.min(r.min, 90)}'</td><td><b class="${r.r >= 7.5 ? 'pos' : r.r < 6 ? 'neg' : ''}">${r.r.toFixed(1)}</b></td></tr>`).join('');
  return `<section class="card endbox"><h2>${title}</h2>
    <p>${esc(mt.scoreStr())}${mt.penScore ? ` (${mt.penScore[0]}-${mt.penScore[1]} aux tirs au but)` : mt.et ? ' (a.p.)' : ''} · xG ${mt.stats[0].xg.toFixed(2)} - ${mt.stats[1].xg.toFixed(2)}</p>
    ${motm ? `<p>⭐ Homme du match : <b>${esc(motm.name)}</b> (${mt.pr[motm.id].r.toFixed(1)})</p>` : ''}
    ${analysisHTML(mt.names, teamColors(getClub(G, mt.f.h), getClub(G, mt.f.a)), reportFromMatch(mt), mt.my)}
  </section>`;
}

function finishMatch(mt, f) {
  Sound.stopCrowd();
  LIVE?.pitch?.stop();
  clearTimeout(LIVE?.timer);
  LIVE = null;
  document.body.classList.remove('live');
  applyMatch(G, mt, f);
  boardAfterMatch(G, f);
  G.tactics.mark = [];
  const my = mt.my, w = mt.winner();
  const opp = getClub(G, my === 0 ? f.a : f.h);
  const motm = mt.motm ? getPlayer(G, mt.motm) : null;
  news(G, `${weekLabel(G)} : ${mt.names[0]} ${mt.score[0]}-${mt.score[1]} ${mt.names[1]}${mt.penScore ? ` (${mt.penScore[0]}-${mt.penScore[1]} tab)` : ''}. ${w === my ? 'Victoire' : w == null ? 'Nul' : 'Défaite'} face à ${opp.name}.${motm ? ` Homme du match : ${motm.name}.` : ''}`, w === my ? 'win' : w == null ? 'info' : 'loss');
  for (const e of mt.events) if (e.type === 'inj' && e.side === my) news(G, `Blessure : ${getPlayer(G, e.pid).name} absent ~${e.weeks} semaine(s).`, 'inj');
  for (const e of mt.events) if (e.type === 'red' && e.side === my) news(G, `${getPlayer(G, e.pid).name} est suspendu après son carton rouge.`, 'warn');
  G.pressDone = false;
  const r = completeWeek(G, f);
  save();
  $$('#nav button').forEach(b => b.disabled = false);
  enterGame();
  afterWeek(r);
  if (!$('#modal') && r !== 'sacked' && G.week < G.schedule.length && rnd() < .45) {
    const res = w === my ? 'win' : w == null ? 'draw' : 'loss', Q = POST_PRESS[res];
    modal(`<h2>🎤 Conférence de presse d'après-match</h2><p>« ${esc(Q.q)} »</p><div class="talk-opts">${Q.a.map(([t, k]) => `<button class="btn" data-pp="${k}">${esc(t)}</button>`).join('')}</div><p class="hint mt">Tes mots comptent pour le vestiaire, le président et les supporters.</p>`);
    $$('[data-pp]').forEach(b => b.onclick = () => { const t = postPressEffect(G, b.dataset.pp); save(); closeModal(); toast(t); });
  }
}

// ---------- Fin de saison / licenciement ----------
function seasonEnd() {
  const S = endSeason(G);
  save();
  if (S.sacked) return sackedScreen(S);
  enterGame();
  const name = id => getPlayer(G, id)?.name || '-';
  modal(`<h2>🏁 Bilan de la saison ${S.season}/${S.season + 1}</h2>
    <div class="grid2">
      <div>
        <h3>Ton club</h3>
        <p>Classement : <b>${S.rank}<sup>e</sup></b> (${S.pts} pts)</p>
        <p>Objectif : ${esc(S.objLabel)} — ${S.met ? '<b class="pos">✅ atteint !</b>' : '<b class="neg">❌ manqué</b>'}</p>
        <p>Confiance du président : ${meter(G.board.conf)}</p>
        <h3>Champions</h3>
        ${S.leagues.map(l => `<p>🏆 ${esc(l.name)} : <b>${esc(l.champion)}</b></p>`).join('')}
        ${S.cupWinner ? `<p>🏆 ${esc(G.cupName)} : <b>${esc(S.cupWinner)}</b></p>` : ''}
        ${(S.euroWinners || []).map(x => `<p>⭐ ${esc(x.name)} : <b>${esc(x.club)}</b></p>`).join('')}
        ${S.intl ? `<p>🌍 ${esc(S.intl.name)} ${S.intl.year} : <b>${esc(natName(S.intl.winner))}</b></p>` : ''}
        ${S.ballon?.list?.[0] ? `<p>🌟 Ballon d'or : <b>${esc(S.ballon.list[0].name)}</b> (${esc(S.ballon.list[0].club || '')})</p>` : ''}
      </div>
      <div>
        <h3>Récompenses</h3>
        <p>Joueur de l'année : <b>${esc(name(S.awards.best))}</b></p>
        <p>Espoir de l'année : <b>${esc(name(S.awards.young))}</b></p>
        <p>Meilleur buteur : <b>${esc(name(S.awards.scorer))}</b> (${S.awards.scorerGoals ?? '-'})</p>
        ${S.promoted.length ? `<h3>Montées / descentes</h3><p class="pos">⬆ ${S.promoted.map(esc).join(', ')}</p><p class="neg">⬇ ${S.relegated.map(esc).join(', ')}</p>` : ''}
        ${(S.barrages || []).length ? `<h3>Barrages et play-offs</h3><ul class="compact">${S.barrages.slice(0, 12).map(x => `<li><small>${esc(x)}</small></li>`).join('')}</ul>` : ''}
      </div>
    </div>
    ${S.offers.length ? `<div class="press"><h3>📞 Offres d'emploi</h3><p>Tes résultats ont attiré l'attention :</p>
      ${S.offers.map(id => { const c = getClub(G, id); return `<div class="row gap offer-row">${crest(c, 32)}<b class="grow">${esc(c.name)}</b><small>${esc(clubLeague(G, id).name)} · ${stars(c.rep)}</small><button class="btn primary sm" data-job="${id}">Accepter</button></div>`; }).join('')}
    </div>` : ''}
    <div class="row gap mt"><div class="grow"></div><button class="btn primary" onclick="closeModal()">${S.offers.length ? 'Rester' : 'C\'est parti'} pour ${G.season}/${G.season + 1} ▶</button></div>`, 'wide');
  $$('[data-job]').forEach(b => b.onclick = () => { takeJob(G, +b.dataset.job); save(); closeModal(); enterGame(); toast(`Bienvenue à ${myClub(G).name} !`); });
}

function sackedScreen(S) {
  const me = myClub(G);
  const offers = shuffle(G.clubs.filter(c => !c.foreign && c.id !== G.clubId && c.rep < me.rep - 3)).slice(0, 3);
  enterGame();
  modal(`<h2>📰 Licencié !</h2>
    <p>Le président de <b>${esc(me.name)}</b> a perdu patience. Tu es démis de tes fonctions.</p>
    ${offers.length ? `<h3>Des clubs plus modestes te proposent un poste :</h3>
      ${offers.map(c => `<div class="row gap offer-row">${crest(c, 32)}<b class="grow">${esc(c.name)}</b><small>${esc(clubLeague(G, c.id).name)}</small><button class="btn primary sm" data-job="${c.id}">Accepter</button></div>`).join('')}` : ''}
    <div class="row gap mt"><div class="grow"></div><button class="btn" id="quit">Retour au menu</button></div>`, '', { noClose: true });
  $$('[data-job]').forEach(b => b.onclick = () => {
    takeJob(G, +b.dataset.job);
    if (S) startClubSeason(G);
    save(); closeModal(); enterGame(); toast('Nouveau départ !');
  });
  $('#quit').onclick = async () => { closeModal(); await slotDelete(G.slot); G = null; startScreen(); };
}

// ---------- Vacances : l'adjoint gère l'équipe ----------
function holiday(n) {
  if (LIVE) return;
  let weeks = 0, r = null;
  const start = G.season;
  while (weeks < n && G.week < G.schedule.length) {
    const f = weekFixtures(G).find(f => f.h === G.clubId || f.a === G.clubId);
    if (f) {
      validateLineup();
      Object.assign(G.tactics, autoLineup(G, G.clubId, G.tactics.formation, G.tactics));
      const home = f.h === G.clubId, opp = home ? f.a : f.h;
      const oppTac = aiTactics(G, opp, G.clubId);
      const mt = new Match(G, f, home ? G.tactics : oppTac, home ? oppTac : G.tactics, { cup: isKO(f), firstLeg: f.firstRes });
      mt.my = home ? 0 : 1; mt.sides[0].ai = mt.sides[1].ai = true; mt.auto = true;
      mt.runToEnd(); applyMatch(G, mt, f); boardAfterMatch(G, f);
      const w = mt.winner();
      news(G, `${weekLabel(G)} : ${mt.names[0]} ${mt.score[0]}-${mt.score[1]} ${mt.names[1]} (${w === mt.my ? 'victoire' : w == null ? 'nul' : 'défaite'}, match dirigé par ton adjoint).`, w === mt.my ? 'win' : w == null ? 'info' : 'loss');
    }
    r = completeWeek(G, f);
    if (G.schedule[G.week - 1]?.t === 'L') weeks++;
    if (r === 'sacked') break;
  }
  save();
  toast(`Retour de vacances : ${weeks} semaine(s) simulée(s).`);
  afterWeek(r);
}

// ---------- Tactique en plein match ----------
function liveTacticsModal() {
  if (!LIVE || LIVE.mt.done) return;
  const { mt } = LIVE, side = mt.sides[mt.my], opp = mt.sides[1 - mt.my];
  setPaused(true);
  const tac = JSON.parse(JSON.stringify({ ...side.tac, inst: side.inst, mentality: side.mentality }));
  tac.duties ||= {}; tac.styles ||= {};
  const presets = (G.tacPresets || []);
  const rowsFor = () => {
    if (tac.formation === side.formation && JSON.stringify(tac.pos || {}) === JSON.stringify(side.tac.pos || {})) return side.onPitch.filter(x => x.role !== 'GB').map(x => ({ id: x.id, slot: x.slot, role: x.role }));
    return remapLineup(G, side.onPitch.map(x => x.id), tac.formation, tac).map((id, i) => ({ id, slot: i, role: slotRole(tac, i) })).filter(x => x.id && x.role !== 'GB');
  };
  const render = () => {
    modal(`<h2>📋 Tactique en cours de match · ${mt.minLabel()}'</h2>
      <div class="form-grid">
        <label>Dispositif <select id="ltForm">${Object.keys(FORMATIONS).map(f => `<option ${f === tac.formation ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>Mentalité <select id="ltMent">${MENTALITIES.map(x => `<option value="${x.v}" ${x.v === tac.mentality ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
        ${presets.some(Boolean) ? `<label>Charger <select id="ltPreset"><option value="">—</option>${presets.map((pr, i) => pr ? `<option value="${i}">${esc(pr.name)} (${pr.formation})</option>` : '').join('')}</select></label>` : ''}
        <label>Marquage individuel <select id="ltMark"><option value="">— Aucun —</option>${opp.onPitch.filter(x => x.role !== 'GB').map(x => `<option value="${x.id}" ${side.mark.has(x.id) ? 'selected' : ''}>${esc(getPlayer(G, x.id).name)} (${x.role}) — note ${mt.pr[x.id]?.r.toFixed(1)}</option>`).join('')}</select></label>
      </div>
      <div class="inst sm mt">${Object.entries(EXTRA_INST).map(([k, d]) => `<div class="inst-row" title="${esc(d.tip)}"><span>${d.label}</span><div class="seg"><button data-x="${k}" data-v="0" class="${!tac.inst[k] ? 'on' : ''}">Non</button><button data-x="${k}" data-v="1" class="${tac.inst[k] ? 'on' : ''}">Oui</button></div></div>`).join('')}</div>
      <h3>Missions des joueurs</h3>
      <table class="tbl compact">${rowsFor().map(x => `<tr><td>${x.role}</td><td class="nm">${esc(getPlayer(G, x.id).name)}</td><td>${bar(side.cond[x.id], 100, side.cond[x.id] < 60 ? 'low' : '')}</td><td>${seg('d' + x.slot, ['Défense', 'Soutien', 'Attaque'], tac.duties[x.slot] ?? 0)}</td></tr>`).join('')}</table>
      <div class="row gap mt"><div class="grow"></div><button class="btn" onclick="closeModal()">Annuler</button><button class="btn primary" id="ltOk">Appliquer</button></div>`, 'wide');
    $('#ltPreset')?.addEventListener('change', e => { const pr = presets[+e.target.value]; if (!pr) return; Object.assign(tac, JSON.parse(JSON.stringify(pr))); render(); });
    $('#ltForm').onchange = e => { tac.formation = e.target.value; tac.pos = {}; tac.styles = {}; tac.duties = {}; render(); };
    $('#ltMent').onchange = e => { tac.mentality = +e.target.value; };
    $$('#modal .seg').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => {
      if (b.dataset.x) tac.inst[b.dataset.x] = +b.dataset.v; else tac.duties[+s.dataset.name.slice(1)] = +b.dataset.v;
      s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    }));
    $('#ltOk').onclick = () => {
      const formChanged = tac.formation !== side.formation || JSON.stringify(tac.pos || {}) !== JSON.stringify(side.tac.pos || {});
      if (formChanged) mt.changeFormation(mt.my, tac);
      else { side.tac = tac; side.inst = { ...defaultInst(), ...tac.inst }; side.onPitch.forEach(x => { x.mods = slotMods(tac, x.slot, x.role); x.hX = null; }); }
      side.mentality = tac.mentality;
      const mk = +$('#ltMark').value;
      side.mark = new Set(mk ? [mk] : []);
      if (mk) mt.say(`Consigne : marquage individuel sur ${getPlayer(G, mk).name}.`, 'info', mt.my);
      $('#mMent') && ($('#mMent').value = String(side.mentality));
      LIVE.shown = mt.log.length - 1;
      closeModal(); renderLive();
    };
  };
  render();
}
