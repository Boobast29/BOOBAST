// ============================================================
//  Écran de match : causeries lisibles et effet des changements en direct
//  - Causerie (mi-temps, prolongations) : après ton discours, les réactions des joueurs sur le terrain selon leur
//    caractère (pression, tempérament : js/notes_cachees.js) et l'effet sur l'équipe en pourcentage d'intensité.
//  - Discours d'avant-match : deux réactions marquantes dans le fil du match.
//  - Changements en direct (remplacement, dispositif, mentalité, consignes) : chaque changement est daté ; quelques
//    minutes après, l'écran compare la même durée avant et après (xG pour/contre, tirs, possession) et donne un
//    verdict (ça marche / sans effet net / ça ne marche pas).
//  Tirages à part (withSideRng) : le déroulé du match ne change pas.
// ============================================================
function caractereMatch(p) {
  const c = typeof notesCachees === 'function' ? notesCachees(p) : { pres: 12, temp: 12 };
  return { pres: c.pres, temp: c.temp };
}
// réaction d'un joueur : l'effet d'équipe, nuancé par son caractère (un joueur qui gère mal la pression vit mal
// « exiger plus », un tempérament fort y répond bien)
function reactionJoueur(p, delta, ton) {
  const c = caractereMatch(p);
  let r = delta * 100;
  if (ton === 'demand') r += (c.temp - 12) * .35 + (c.pres - 12) * .3;
  if (ton === 'calm' || ton === 'relax') r += (12 - c.pres) * .15;
  if (ton === 'praise' || ton === 'encourage' || ton === 'fans') r += (c.pres < 9 ? .4 : 0);
  return r >= 2.6 ? ['pos', 'motivé'] : r >= .5 ? ['pos', 'réceptif'] : r > -.4 ? ['mut', 'indifférent'] : c.pres <= 9 ? ['neg', 'nerveux'] : ['neg', 'agacé'];
}
function blocReactions(mt, delta, ton) {
  const side = mt.sides[mt.my];
  const js = side.onPitch.map(x => getPlayer(G, x.id)).filter(Boolean);
  const R = js.map(p => ({ p, r: reactionJoueur(p, delta, ton) }));
  const cpt = k => R.filter(x => x.r[1] === k).length;
  const pct = Math.round(delta * 1000) / 10;
  return `<div class="md-reac"><p class="md-impact ${pct > 0 ? 'pos' : pct < 0 ? 'neg' : ''}"><small>Effet sur l'équipe</small><b>${pct > 0 ? '+' : ''}${pct.toLocaleString('fr-FR')} %</b><span>d'intensité jusqu'à la fin du match</span></p>
    <p class="hint">${['motivé', 'réceptif', 'indifférent', 'nerveux', 'agacé'].map(k => cpt(k) ? `${cpt(k)} ${k}${cpt(k) > 1 ? 's' : ''}` : '').filter(Boolean).join(' · ')}</p>
    <ul>${R.map(({ p, r }) => `<li><span class="nm">${esc(p.name)}</span><span class="md-r ${r[0]}">${r[1]}</span></li>`).join('')}</ul></div>`;
}
window.addEventListener('load', () => {
  if (typeof teamTalk === 'function') {
    const __teamTalkMD = teamTalk;
    teamTalk = function (when) {
      const r = __teamTalkMD.apply(this, arguments);
      try {
        const mt = LIVE?.mt, my = mt?.sides[mt.my]; if (!my) return r;
        const avant = my.talk || 1;
        $$('[data-tt]').forEach(b => b.addEventListener('click', () => {
          const delta = (my.talk || 1) - avant;
          modal(`<h2>Réactions du vestiaire</h2>${blocReactions(mt, delta, b.dataset.tt)}
            <div class="row gap mt"><div class="grow"></div><button class="btn primary" id="mdGo">Reprendre le match</button></div>`);
          $('#mdGo').onclick = () => { closeModal(); setPaused(false); };
        }));
      } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof liveMatch === 'function') {
    const __liveMatchMD = liveMatch;
    liveMatch = function (mt, f) {
      const r = __liveMatchMD.apply(this, arguments);
      try {
        if (G.preTalk) withSideRng(`${G.seed}|pretalk|${G.season}|${G.week}`, () => {
          const js = mt.sides[mt.my].onPitch.map(x => getPlayer(G, x.id)).filter(Boolean);
          const R = js.map(p => ({ p, r: reactionJoueur(p, G.preTalk, '') })).filter(x => x.r[0] !== 'mut');
          for (const { p, r } of R.sort(() => rnd() - .5).slice(0, 2)) mt.say(`Vestiaire : ${p.name} semble ${r[1]} après ton discours.`, 'info', mt.my);
        });
        if (G.preTalk) renderLive();
      } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof renderLive === 'function') {
    const __renderLiveMD = renderLive;
    renderLive = function () {
      const r = __renderLiveMD.apply(this, arguments);
      try { suivreChangements(); } catch (e) { console.error(e); }
      return r;
    };
  }
});
// ---------- effet des changements ----------
function signatureCote(side) {
  return { f: side.formation, ment: side.mentality, inst: JSON.stringify(side.inst || {}), on: side.onPitch.map(x => x.id), mark: [...(side.mark || [])].join() };
}
function decrireChangement(a, b) {
  const out = [];
  const sortis = a.on.filter(id => !b.on.includes(id)), entres = b.on.filter(id => !a.on.includes(id));
  if (entres.length && entres.length === sortis.length) out.push(entres.map((id, i) => `${getPlayer(G, id)?.name} pour ${getPlayer(G, sortis[i])?.name}`).join(', '));
  if (a.f !== b.f) out.push(`passage en ${b.f}`);
  if (a.ment !== b.ment) out.push(`mentalité ${(MENTALITIES.find(m => m.v === b.ment)?.label || '').toLowerCase()}`);
  if (a.inst !== b.inst) out.push('consignes modifiées');
  if (a.mark !== b.mark) out.push(b.mark ? 'marquage individuel' : 'fin du marquage');
  return out.join(' · ');
}
function photoStats(mt) {
  const me = mt.my, op = 1 - me, s = mt.stats;
  return { m: mt.minute, xf: s[me].xg, xa: s[op].xg, tf: s[me].shots, ta: s[op].shots, pf: s[me].poss, pa: s[op].poss };
}
// une photo des stats à chaque minute du match en direct (même en vitesse instantanée)
if (typeof Match === 'function') {
  const __stepMD = Match.prototype.step;
  Match.prototype.step = function () {
    const r = __stepMD.apply(this, arguments);
    if (typeof LIVE !== 'undefined' && LIVE && LIVE.mt === this) { const X = LIVE.fx ||= { hist: [], ch: [], sig: null }; if (!X.hist.length || X.hist[X.hist.length - 1].m !== this.minute) X.hist.push(photoStats(this)); }
    return r;
  };
}
function suivreChangements() {
  const mt = LIVE?.mt; if (!mt) return;
  const side = mt.sides[mt.my], X = LIVE.fx ||= { hist: [], ch: [], sig: null };
  if (!X.hist.length || X.hist[X.hist.length - 1].m !== mt.minute) X.hist.push(photoStats(mt));
  const sig = signatureCote(side);
  if (X.sig && JSON.stringify(sig) !== JSON.stringify(X.sig) && !mt.done) {
    const lab = decrireChangement(X.sig, sig);
    const last = X.ch[X.ch.length - 1];
    if (last && last.m === mt.minute) last.lab = [last.lab, lab].filter(Boolean).join(' · '); // plusieurs retouches à la même minute
    else if (lab) X.ch.push({ m: mt.minute, lab });
  }
  X.sig = sig;
  afficherEffets(mt, X);
}
function photoA(X, m) { let r = X.hist[0]; for (const h of X.hist) { if (h.m <= m) r = h; else break; } return r; }
function fenetre(X, a, b) {
  const A = photoA(X, a), B = photoA(X, b), d = Math.max(1, B.m - A.m), pt = (B.pf - A.pf) + (B.pa - A.pa);
  return { d, xf: B.xf - A.xf, xa: B.xa - A.xa, tf: B.tf - A.tf, ta: B.ta - A.ta, poss: pt ? Math.round((B.pf - A.pf) / pt * 100) : 50 };
}
function afficherEffets(mt, X) {
  let box = $('#mdFx');
  if (!X.ch.length) { box?.remove(); return; }
  if (!box) { const st = $('#stats')?.closest('section'); if (!st) return; st.insertAdjacentHTML('afterend', '<section class="card md-fx" id="mdFx"></section>'); box = $('#mdFx'); }
  const now = mt.minute, f2 = x => x.toFixed(2).replace('.', ',');
  box.innerHTML = `<h3>Effet de tes changements</h3>${X.ch.slice(-3).reverse().map(c => {
    const apres = now - c.m;
    if (apres < 5) return `<div class="md-ch"><p><b>${c.m}'</b> ${esc(c.lab)}</p><p class="hint">Effet visible dans ${5 - apres} min.</p></div>`;
    const A = fenetre(X, c.m, now), B = fenetre(X, Math.max(0, c.m - apres), c.m);
    const net = (A.xf - A.xa) / A.d * 10 - (B.xf - B.xa) / B.d * 10;
    const v = net > .06 || (net > .02 && A.poss - B.poss >= 6) ? ['pos', 'Ça marche'] : net < -.06 ? ['neg', 'Ça ne marche pas'] : ['mut', 'Sans effet net'];
    return `<div class="md-ch"><p><b>${c.m}'</b> ${esc(c.lab)} <span class="md-v ${v[0]}">${v[1]}</span></p>
      <table class="tbl compact md-cmp"><thead><tr><th></th><th>Avant (${B.d} min)</th><th>Après (${A.d} min)</th></tr></thead><tbody>
        <tr><td>xG pour – contre</td><td>${f2(B.xf)} – ${f2(B.xa)}</td><td>${f2(A.xf)} – ${f2(A.xa)}</td></tr>
        <tr><td>Tirs pour – contre</td><td>${B.tf} – ${B.ta}</td><td>${A.tf} – ${A.ta}</td></tr>
        <tr><td>Possession</td><td>${B.poss} %</td><td>${A.poss} %</td></tr></tbody></table></div>`;
  }).join('')}`;
}
