// ============================================================
//  Centre « À faire » et Chronique de carrière (idées : pitch-to-glory — liste « Needs you » triée par urgence,
//  bouton Continuer qui annonce ce qu'il va faire, biographie de carrière ; aucune ligne de code reprise)
//  - Tableau de bord : ce que va faire « Continuer », puis tout ce qui attend une décision, du plus urgent au moins urgent
//  - Bureau → Chronique : ta carrière racontée saison par saison (classement, objectif, coupes, barrages, montées,
//    meilleur buteur du club, plus gros achat et plus grosse vente)
// ============================================================
function prochaineAction(G) {
  if (G.week >= G.schedule.length) return { i: '🏁', t: 'Clore la saison et voir le bilan' };
  const blk = typeof blockingDecisions === 'function' ? blockingDecisions(G) : [];
  if (blk.length) return { i: '✉', t: `Décider d'abord : ${blk[0].title || 'décision en attente'}`, v: 'mail' };
  const f = weekFixtures(G).find(f => f.h === G.clubId || f.a === G.clubId);
  if (f) {
    const opp = getClub(G, f.h === G.clubId ? f.a : f.h);
    return { i: '⚽', t: `Jouer ${weekLabel(G)} : ${f.h === G.clubId ? 'contre' : 'chez'} ${opp.name}${f.neutral ? ' (terrain neutre)' : ''}` };
  }
  return { i: '⏭', t: `Simuler la semaine (${weekLabel(G)}) : pas de match pour ton club` };
}
function aFaire(G) {
  const L = [], add = (urg, i, t, v, d) => L.push({ urg, i, t, v, d });
  const me = myClub(G), mine = clubPlayers(G, G.clubId);
  const dec = typeof pendingDecisions === 'function' ? pendingDecisions(G) : [];
  const blk = dec.filter(d => d.blocking);
  if (blk.length) add(100, '❗', `${blk.length} décision(s) obligatoire(s) avant de continuer`, 'mail', blk.map(d => d.title).slice(0, 2).join(' · '));
  if (dec.length > blk.length) add(55, '✉', `${dec.length - blk.length} décision(s) à prendre`, 'mail');
  const deals = (G.deals || []).filter(d => typeof DEAL_USER !== 'undefined' && DEAL_USER.includes(d.status));
  if (deals.length) add(80, '📝', `${deals.length} négociation(s) attendent ta réponse`, 'deals', deals.map(d => getPlayer(G, d.pid)?.name).filter(Boolean).slice(0, 3).join(', '));
  const offres = (G.offers || []).filter(o => getPlayer(G, o.pid)?.club === G.clubId);
  if (offres.length) add(75, '📩', `${offres.length} offre(s) reçue(s) pour tes joueurs`, 'transfers', offres.slice(0, 3).map(o => `${getPlayer(G, o.pid)?.name} (${money(o.fee)})`).join(', '));
  if (typeof meetingRequests === 'function') { const m = meetingRequests(G).length; if (m) add(60, '🗣', `${m} demande(s) d'entretien`, 'meetings'); }
  if (windowOpen(G)) {
    const R = leagueRoundsTotal(G), lr = leagueRoundAt(G), mid = Math.floor(R / 2), fin = lr < 6 ? 6 : mid + 4;
    if (fin - lr <= 1) add(70, '⏳', 'Dernière semaine du mercato', 'transfers', 'Après, seuls les joueurs libres pourront signer.');
  }
  const moy = mine.map(playerOvr).sort((a, b) => b - a).slice(0, 14);
  const seuil = moy.length ? moy[moy.length - 1] : 0;
  const finContrat = mine.filter(p => !p.loan && !p.academy && p.contract <= 1 && playerOvr(p) >= seuil && !p.preAgreed);
  if (finContrat.length) add(50, '✍', `${finContrat.length} cadre(s) en fin de contrat`, 'squad', finContrat.slice(0, 3).map(p => p.name).join(', ') + ' — pense à prolonger');
  const bless = mine.filter(p => p.injury > 0 && playerOvr(p) >= seuil);
  if (bless.length) add(40, '🏥', `${bless.length} titulaire(s) blessé(s)`, 'medical', bless.slice(0, 3).map(p => `${p.name} (${Math.ceil(p.injury / 7)} sem.)`).join(', '));
  if (typeof conformite === 'function' && reglesActives(G)) { const bad = conformite(G, G.clubId).filter(r => !r.ok); if (bad.length) add(65, '⚖', 'Effectif non conforme au règlement', 'regles', bad.map(b => `${b.regle} : ${b.val}`).join(' · ')); }
  const annual = typeof wageBill === 'function' ? wageBill(G) * 52 : 0;
  if (annual > 0 && -me.budget > .3 * annual) add(68, '💶', 'Déficit au-delà du seuil de sanction', 'finances', `${money(-me.budget)} de déficit (${Math.round(-me.budget / annual * 100)} % de la masse salariale)`);
  const nonLus = typeof unreadMail === 'function' ? unreadMail(G) : 0;
  if (nonLus) add(20, '📨', `${nonLus} message(s) non lu(s)`, 'mail');
  return L.sort((a, b) => b.urg - a.urg);
}
function carteAFaire(G) {
  const nx = prochaineAction(G), L = aFaire(G);
  const coul = u => u >= 90 ? 'u-rouge' : u >= 60 ? 'u-orange' : u >= 40 ? 'u-jaune' : 'u-gris';
  return `<section class="card afaire"><div class="af-next"><span class="af-i">${nx.i}</span><div><small>Prochaine étape</small><b>${esc(nx.t)}</b></div>
      ${nx.v ? `<button class="btn sm" data-af="${nx.v}">Ouvrir</button>` : `<button class="btn primary sm" id="afGo">Continuer ▶</button>`}</div>
    ${L.length ? `<h2 class="af-titre">À faire <small class="muted">${L.length}</small></h2><div class="af-liste">${L.map(x => `<button class="af-it ${coul(x.urg)}" data-af="${x.v}"><span>${x.i}</span><div><b>${esc(x.t)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</div><i>›</i></button>`).join('')}</div>`
      : '<p class="muted af-rien">✓ Rien d\'urgent : tu peux continuer.</p>'}</section>`;
}
const __vInboxH = vInbox;
vInbox = function (el) {
  __vInboxH(el);
  if (!G) return;
  el.insertAdjacentHTML('afterbegin', carteAFaire(G));
  el.querySelectorAll('[data-af]').forEach(b => b.onclick = () => { if (b.dataset.af === 'mail' && typeof MAIL_FILTER !== 'undefined') MAIL_FILTER = 'todo'; show(b.dataset.af); });
  $('#afGo')?.addEventListener('click', () => advance());
};

// ---------- Chronique de carrière ----------
const __endSeasonH = endSeason;
endSeason = function (G) {
  const me = myClub(G), saison = G.season;
  const b0 = clubPlayers(G, G.clubId).filter(p => p.stats.goals > 0).sort((a, b) => b.stats.goals - a.stats.goals)[0];
  const buteur = b0 && { name: b0.name, g: b0.stats.goals }; // copié avant la remise à zéro des statistiques
  const tr = (G.transfers || []).filter(t => t.season === saison && t.fee > 0);
  const achat = tr.filter(t => t.to === G.clubId).sort((a, b) => b.fee - a.fee)[0], vente = tr.filter(t => t.from === G.clubId).sort((a, b) => b.fee - a.fee)[0];
  const S = __endSeasonH(G);
  try {
    const mesBarrages = (S.barrages || []).filter(x => x.includes(me.name));
    (G.chronique ||= []).push({ season: saison, club: me.name, rank: S.rank, comp: G.history?.[G.history.length - 1]?.comp, obj: S.objLabel, met: S.met,
      cup: G.history?.[G.history.length - 1]?.cup, promu: S.promoted.some(n => n.startsWith(me.name)), relegue: S.relegated.some(n => n.startsWith(me.name)),
      euro: (S.euroWinners || []).filter(x => x.club === me.name).map(x => x.name), barrages: mesBarrages.slice(0, 3),
      buteur, achat: achat && { name: achat.name, fee: achat.fee }, vente: vente && { name: vente.name, fee: vente.fee },
      sanction: (S.sanctions || [])[0] || null, sacked: !!S.sacked });
  } catch (e) { console.error('chronique', e); }
  return S;
};
function texteSaison(c) {
  const p = [];
  p.push(`${c.club} termine ${c.rank === 1 ? '<b>champion</b>' : `<b>${c.rank}<sup>e</sup></b>`} de ${esc(c.comp || 'son championnat')}`);
  p.push(c.met ? `l'objectif (${esc((c.obj || '').toLowerCase())}) est atteint` : `l'objectif (${esc((c.obj || '').toLowerCase())}) est manqué`);
  let t = p.join(' ; ') + '.';
  if (c.promu) t += ' 🎉 Le club monte en division supérieure.';
  if (c.relegue) t += ' 😞 Le club descend.';
  if (c.barrages?.length) t += ` Barrages : ${c.barrages.map(esc).join(' ; ')}.`;
  if (c.cup && c.cup !== '-') t += c.cup === 'Vainqueur' ? ' 🏆 La coupe nationale est remportée.' : c.cup === 'Finale' ? ' En coupe : finaliste.' : ` En coupe : élimination en ${esc(c.cup.toLowerCase())}.`;
  if (c.euro?.length) t += ` ⭐ Sacre européen : ${c.euro.map(esc).join(', ')}.`;
  if (c.buteur) t += ` Meilleur buteur : ${esc(c.buteur.name)} (${c.buteur.g} buts).`;
  if (c.achat) t += ` Plus gros achat : ${esc(c.achat.name)} (${money(c.achat.fee)}).`;
  if (c.vente) t += ` Plus grosse vente : ${esc(c.vente.name)} (${money(c.vente.fee)}).`;
  if (c.sanction) t += ` ⚖ ${esc(c.sanction)}.`;
  if (c.sacked) t += ' La direction met fin à ta mission.';
  return t;
}
function vChronique(el) {
  const C = (G.chronique || []).slice();
  // saisons jouées avant l'arrivée de la chronique : reconstruites depuis l'historique
  for (const h of G.history || []) if (!C.some(c => c.season === h.season)) C.push({ season: h.season, club: h.club, rank: h.rank, comp: h.comp, obj: h.objLabel, met: h.met, cup: h.cup });
  C.sort((a, b) => b.season - a.season);
  const titres = (myClub(G).trophies || []).filter(t => C.some(c => c.season === t.season));
  el.innerHTML = `<section class="card"><h2>📖 Chronique de ta carrière</h2>
    <p class="hint">${esc(G.managerName)} · ${C.length} saison(s) terminée(s) · ${titres.length} trophée(s) avec ${esc(myClub(G).name)}</p>
    ${C.length ? `<div class="chrono">${C.map(c => `<article class="chr-s ${c.rank === 1 ? 'or' : c.promu ? 'vert' : c.relegue ? 'rouge' : ''}"><div class="chr-a">${c.season}<small>/${String(c.season + 1).slice(2)}</small></div><p>${texteSaison(c)}</p></article>`).join('')}</div>`
      : '<p class="muted">La chronique s\'écrit à la fin de chaque saison. Joue ta première saison !</p>'}
    <p class="hint">Saison en cours : ${esc(myClub(G).name)}, ${(() => { const L = clubLeague(G, G.clubId), t = L ? standings(G, L.id) : [], r = t.findIndex(x => x.id === G.clubId) + 1; return r ? `${r}<sup>e</sup> de ${esc(L.name)} après ${leagueRoundAt(G)} journée(s)` : '—'; })()}.</p></section>`;
}
const __applyRoleNavH = applyRoleNav;
applyRoleNav = function () {
  __applyRoleNavH();
  const g = NAV_GROUPS.find(x => x[0] === 'Bureau');
  if (g && !g[1].some(x => x[0] === 'chronique')) g[1].push(['chronique', '📖', 'Chronique']);
  NAV_FLAT.length = 0; NAV_FLAT.push(...NAV_GROUPS.flatMap(x => x[1]));
};
const __showH = show;
show = function (v) {
  if (v !== 'chronique') return __showH(v);
  if (LIVE) return;
  VIEW_HIST.push(VIEW); VIEW = 'chronique';
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === 'chronique'));
  renderTop(); const main = $('#main'); main.innerHTML = ''; vChronique(main); navBadges();
  if (typeof filAriane === 'function') { decorerNav(); barreMobile(); ouvrirSectionActive('chronique'); majBarreMobile('chronique'); filAriane('chronique'); }
};
