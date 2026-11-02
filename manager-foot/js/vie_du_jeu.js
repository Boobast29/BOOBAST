// ============================================================
//  Vie du jeu : événements aléatoires à choix, conférences de presse d'avant-match selon le contexte,
//  poste de sélectionneur national.
//  Idées : événements aléatoires (retroFootballManager, MIT), conférences de presse contextuelles (FMNarrative, MIT),
//  sélectionneur national (openfootmanager) — code et textes originaux.
//  Un seul sujet en attente à la fois (G.evt) : il apparaît dans « À faire » ; sans réponse, le choix par défaut
//  s'applique la semaine suivante. En simulation automatique, le choix par défaut est appliqué tout de suite.
// ============================================================
function effets(G, e = {}) {
  const me = myClub(G), out = [];
  if (e.argent) { FLOW_LABEL = e.libelle || 'Événement'; try { flow(G, me, roundMoney(e.argent), 'other'); } finally { FLOW_LABEL = null; } out.push(`${e.argent > 0 ? '+' : ''}${money(roundMoney(e.argent))}`); }
  if (e.conf) { G.board.conf = clamp(G.board.conf + e.conf, 0, 100); out.push(`président ${e.conf > 0 ? '+' : ''}${e.conf}`); }
  if (e.fans) { G.fans = clamp((G.fans ?? 60) + e.fans, 0, 100); out.push(`supporters ${e.fans > 0 ? '+' : ''}${e.fans}`); }
  if (e.moral) { for (const p of clubPlayers(G, G.clubId)) p.morale = clamp(p.morale + e.moral, 5, 100); out.push(`moral ${e.moral > 0 ? '+' : ''}${e.moral}`); }
  if (e.joueur && e.moralJ) { const p = getPlayer(G, e.joueur); if (p) { p.morale = clamp(p.morale + e.moralJ, 5, 100); out.push(`${p.name} ${e.moralJ > 0 ? '+' : ''}${e.moralJ} moral`); } }
  if (e.forme) { for (const p of clubPlayers(G, G.clubId)) p.fit = clamp(p.fit + e.forme, 20, 100); out.push(`condition ${e.forme > 0 ? '+' : ''}${e.forme}`); }
  if (e.places) { me.capacity += e.places; out.push(`+${e.places.toLocaleString('fr-FR')} places`); }
  if (e.ticket != null) { G.ticket = clamp(e.ticket, 0, 4); out.push('prix des billets revus'); }
  if (e.contrat) { const p = getPlayer(G, e.contrat); if (p) { p.contract += 2; p.wage = roundMoney(p.wage * 1.6); out.push(`${p.name} prolongé de 2 saisons`); } }
  if (e.selection) { G.selection = { nat: e.selection, depuis: G.season }; out.push(`sélectionneur : ${natName(e.selection)}`); }
  return out.join(' · ');
}

// ---------- événements aléatoires ----------
function evenementsPossibles(G) {
  const me = myClub(G), b = Math.max(2e5, Math.abs(baseSponsor(G, me)) * 6), mine = clubPlayers(G, G.clubId).filter(p => !p.academy);
  const star = mine.slice().sort((a, b2) => playerOvr(b2) - playerOvr(a))[0], fetard = mine[(G.week * 7) % Math.max(1, mine.length)];
  const jeune = clubPlayers(G, G.clubId).filter(p => p.age <= 20).sort((a, b2) => (b2.pot || 0) - (a.pot || 0))[0];
  const L = [
    { titre: 'Un bienfaiteur se manifeste', texte: `Un entrepreneur de la région propose un don de ${money(roundMoney(b * 2))} au club, à condition de siéger aux réunions de la direction.`,
      opts: [{ l: 'Accepter le don', e: { argent: b * 2, conf: -3, libelle: 'Don d\'un bienfaiteur' }, m: 'L\'argent est le bienvenu, la direction grince un peu des dents.' },
        { l: 'Accepter, sans siège à la direction', e: { argent: b, conf: 1, libelle: 'Don d\'un bienfaiteur' }, m: 'Il accepte de donner moitié moins, sans contrepartie.' },
        { l: 'Refuser poliment', e: { conf: 2 }, m: 'La direction apprécie ton indépendance.' }], d: 1 },
    fetard && { titre: 'Photo embarrassante', texte: `${fetard.name} a été photographié en soirée à 3 h du matin, deux jours avant un match. Les réseaux sociaux s'enflamment.`,
      opts: [{ l: 'Amende et explication publique', e: { joueur: fetard.id, moralJ: -12, conf: 2 }, m: 'Le vestiaire comprend le message.' },
        { l: 'Le défendre en public', e: { joueur: fetard.id, moralJ: 8, conf: -3, fans: -2 }, m: 'Le joueur t\'en est reconnaissant ; la direction un peu moins.' },
        { l: 'Régler ça en privé', e: { joueur: fetard.id, moralJ: -4 }, m: 'L\'affaire retombe doucement.' }], d: 2 },
    { titre: 'Pelouse abîmée', texte: 'Après de fortes pluies, la pelouse du stade est en mauvais état. Le jardinier demande un remplacement partiel.',
      opts: [{ l: `Remplacer la pelouse (${money(roundMoney(b * .6))})`, e: { argent: -b * .6, forme: 3, libelle: 'Remplacement de la pelouse' }, m: 'Les joueurs retrouvent un terrain impeccable.' },
        { l: 'Attendre la trêve', e: { forme: -4 }, m: 'Le terrain fatigue les organismes en attendant.' }], d: 1 },
    { titre: 'Visite à l\'hôpital pédiatrique', texte: 'Une association demande à l\'équipe de rendre visite aux enfants hospitalisés cette semaine.',
      opts: [{ l: 'Toute l\'équipe y va', e: { fans: 4, moral: 2, forme: -2 }, m: 'Un beau moment, largement relayé par la presse locale.' },
        { l: 'Une délégation de cadres', e: { fans: 2, moral: 1 }, m: 'La visite est appréciée.' },
        { l: 'Pas cette semaine', e: { fans: -2 }, m: 'L\'association est déçue.' }], d: 1 },
    { titre: 'Match amical à l\'étranger', texte: `Un organisateur propose ${money(roundMoney(b * 1.5))} pour un match amical exhibition pendant la prochaine trêve.`,
      opts: [{ l: 'Accepter', e: { argent: b * 1.5, forme: -6, libelle: 'Match amical exhibition' }, m: 'La caisse sourit, les jambes beaucoup moins.' },
        { l: 'Refuser pour préserver l\'effectif', e: { moral: 1 }, m: 'Les joueurs profitent du repos.' }], d: 1 },
    { titre: 'Colère des supporters', texte: 'Les groupes de supporters protestent contre le prix des billets et menacent de boycotter le prochain match.',
      opts: [{ l: 'Baisser les prix', e: { ticket: (G.ticket ?? 2) - 1, fans: 6 }, m: 'Les tribunes saluent le geste.' },
        { l: 'Maintenir les prix', e: { fans: -6, conf: 1 }, m: 'Une banderole hostile est déployée.' },
        { l: 'Rencontrer les groupes', e: { fans: 2 }, m: 'Le dialogue apaise la situation.' }], d: 2 },
    jeune && { titre: 'Un grand club rôde', texte: `${jeune.name} (${jeune.age} ans) est approché par un grand club étranger. Son entourage attend un geste.`,
      opts: [{ l: 'Prolonger et augmenter son salaire', e: { contrat: jeune.id, joueur: jeune.id, moralJ: 10 }, m: 'Il s\'engage pour la suite.' },
        { l: 'Le rassurer sur son temps de jeu', e: { joueur: jeune.id, moralJ: 4 }, m: 'Il reste attentif à tes promesses.' },
        { l: 'Ne rien faire', e: { joueur: jeune.id, moralJ: -10 }, m: 'Il se sent négligé.' }], d: 1 },
    { titre: 'Tournage au centre d\'entraînement', texte: 'Un créateur de vidéos très suivi veut filmer une semaine au centre d\'entraînement.',
      opts: [{ l: 'Accepter (droits partagés)', e: { argent: b * .5, fans: 3, moral: -2, libelle: 'Droits de tournage' }, m: 'Visibilité garantie, concentration un peu moins.' },
        { l: 'Refuser', e: { moral: 1 }, m: 'L\'équipe reste concentrée.' }], d: 1 },
    { titre: 'Rénovation cofinancée', texte: `La mairie propose de cofinancer 2 000 places supplémentaires si le club apporte ${money(roundMoney(b * 3))}.`,
      opts: [{ l: 'Signer', e: { argent: -b * 3, places: 2000, fans: 3, libelle: 'Rénovation du stade' }, m: 'Les travaux commencent cet été.' },
        { l: 'Décliner', e: {}, m: 'Le projet est repoussé.' }], d: 1 },
    star && { titre: 'Proposition publicitaire', texte: `Une marque veut faire de ${star.name} l'égérie de sa campagne nationale.`,
      opts: [{ l: 'Accepter (part pour le club)', e: { argent: b * .8, joueur: star.id, moralJ: 6, libelle: 'Campagne publicitaire' }, m: 'Le joueur est ravi, le club aussi.' },
        { l: 'Refuser pour qu\'il reste concentré', e: { joueur: star.id, moralJ: -6 }, m: 'Il n\'apprécie pas beaucoup.' }], d: 0 }
  ];
  return L.filter(Boolean);
}

// ---------- conférence de presse d'avant-match ----------
function conferencePresse(G) {
  const f = weekFixtures(G).find(x => x.h === G.clubId || x.a === G.clubId); if (!f) return null;
  const opp = getClub(G, f.h === G.clubId ? f.a : f.h), L = clubLeague(G, G.clubId), t = L ? standings(G, L.id) : [], rang = t.findIndex(r => r.id === G.clubId) + 1;
  const forme = (myClub(G).recent || []).slice(-3), serieD = forme.length === 3 && forme.every(x => x === 0);
  const mine = clubPlayers(G, G.clubId), star = mine.filter(p => p.wantsOut || (G.offers || []).some(o => o.pid === p.id)).sort((a, b) => playerOvr(b) - playerOvr(a))[0];
  const blesses = mine.filter(p => p.injury > 0 && playerOvr(p) >= 70).length;
  const ctx = grandMatch(f) ? 'grand' : serieD ? 'crise' : rang === 1 && leagueRoundAt(G) >= 5 ? 'leader' : star ? 'depart' : blesses >= 3 ? 'blesses' : rang >= t.length - 2 && leagueRoundAt(G) >= 8 ? 'maintien' : null;
  if (!ctx) return null;
  const Q = {
    grand: { q: `Avant d'affronter ${opp.name} dans un match à enjeu (${compName(G, f)}), ressentez-vous la pression ?`,
      opts: [{ l: '« Ce sont ces matchs qu\'on rêve de jouer. »', e: { moral: 3, fans: 2 } }, { l: '« L\'adversaire est favori, on n\'a rien à perdre. »', e: { moral: 1 } }, { l: '« Si on perd, ce sera un échec. »', e: { moral: -2, conf: 2 } }] },
    crise: { q: 'Trois défaites de suite : votre poste est-il menacé ?',
      opts: [{ l: '« Je reste calme, le travail paiera. »', e: { conf: 3 } }, { l: '« Je n\'ai rien à prouver à personne. »', e: { fans: 3, conf: -3 } }, { l: '« Certains joueurs doivent se remettre en question. »', e: { moral: -4, conf: 1 } }] },
    leader: { q: 'Vous êtes en tête : êtes-vous désormais favori pour le titre ?',
      opts: [{ l: '« On prend match après match. »', e: { moral: 2 } }, { l: '« Oui, et on va le prouver. »', e: { fans: 4, moral: 2, conf: -1 } }, { l: '« Il est trop tôt pour en parler. »', e: { conf: 1 } }] },
    depart: { q: `${star?.name} va-t-il quitter le club ?`,
      opts: [{ l: '« Il n\'est pas à vendre. »', e: { joueur: star?.id, moralJ: 5, fans: 2 } }, { l: '« Tout le monde a un prix. »', e: { joueur: star?.id, moralJ: -5, conf: 2 } }, { l: '« Je ne commente pas les rumeurs. »', e: {} }] },
    blesses: { q: `${blesses} cadres à l'infirmerie : comment faire face ?`,
      opts: [{ l: '« C\'est l\'occasion pour d\'autres de se montrer. »', e: { moral: 2 } }, { l: '« Le calendrier est inhumain. »', e: { fans: 2, conf: -1 } }, { l: '« Le staff médical doit faire mieux. »', e: { moral: -1, conf: 1 } }] },
    maintien: { q: 'Le club est dans la zone rouge : croyez-vous encore au maintien ?',
      opts: [{ l: '« Absolument, on va se battre. »', e: { moral: 3, fans: 2 } }, { l: '« Ce sera très difficile. »', e: { moral: -2, conf: 1 } }, { l: '« Je demande le soutien de nos supporters. »', e: { fans: 4 } }] }
  }[ctx];
  return { type: 'presse', titre: `🎤 Conférence de presse — avant ${opp.name}`, texte: Q.q, opts: Q.opts.map(o => ({ ...o, m: 'Ta réponse fait le tour des médias.' })), d: 0 };
}

// ---------- gestion du sujet en attente ----------
function ouvrirSujet() {
  const E = G.evt; if (!E) return;
  modal(`<h2>${esc(E.titre)}</h2><p>${esc(E.texte)}</p><div class="evt-opts">${E.opts.map((o, i) => `<button class="btn ${i === E.d ? '' : ''}" data-evt="${i}">${esc(o.l)}</button>`).join('')}</div>
    <p class="hint">Sans réponse d'ici la semaine prochaine : « ${esc(E.opts[E.d].l)} ».</p>`);
  $$('#modal [data-evt]').forEach(b => b.onclick = () => { const r = resoudre(G, +b.dataset.evt); closeModal(); toast(r); save?.(); show(VIEW && VIEW !== 'x' ? VIEW : 'inbox'); });
}
function resoudre(G, i, auto = false) {
  const E = G.evt; if (!E) return '';
  const o = E.opts[i] ?? E.opts[E.d];
  const fx = effets(G, o.e);
  news(G, `${E.type === 'presse' ? '🎤' : '📌'} ${E.titre.replace(/^(🎤|📌) /u, '')} : ${auto ? 'sans réponse, ' : ''}« ${o.l} ». ${o.m || ''}${fx ? ` (${fx})` : ''}`, E.type === 'presse' ? 'press' : 'info');
  (G.evtHist ||= []).unshift({ season: G.season, label: weekLabel(G), titre: E.titre, choix: o.l }); if (G.evtHist.length > 60) G.evtHist.length = 60;
  G.evt = null;
  return `${o.m || 'C\'est noté.'}${fx ? ' — ' + fx : ''}`;
}
const __completeWeekVJ = completeWeek;
completeWeek = function (G, skip) {
  const e = G.schedule[G.week];
  const r = __completeWeekVJ(G, skip);
  if (!G.clubId || r === 'sacked') return r;
  if (G.evt && G.evt.week < G.week) resoudre(G, G.evt.d, true); // sans réponse : choix par défaut
  if (!G.evt && e?.t === 'L' && G.week < G.schedule.length) {
    const h = hashTrait(`${G.seed}|evt|${G.season}|${G.week}`) % 100;
    let sujet = h < 45 ? conferencePresse(G) : null; // avant-match : environ un match sur deux quand le contexte s'y prête
    if (!sujet && h >= 45 && h < 55) { const L = evenementsPossibles(G); sujet = L[hashTrait(`${G.seed}|quel|${G.week}`) % L.length]; sujet = sujet && { ...sujet, type: 'evenement', titre: '📌 ' + sujet.titre }; }
    if (sujet) { G.evt = { ...sujet, week: G.week }; if (G.__harness) resoudre(G, G.evt.d, true); }
  }
  return r;
};
// « À faire » : le sujet en attente
if (typeof aFaire === 'function') {
  const __aFaireVJ = aFaire;
  aFaire = function (G) { const L = __aFaireVJ(G); if (G.evt) L.unshift({ urg: 74, i: G.evt.type === 'presse' ? '🎤' : '📌', t: G.evt.titre.replace(/^(🎤|📌) /, ''), v: '__evt', d: G.evt.texte }); if (G.offreSelection) L.unshift({ urg: 73, i: '🌍', t: `Offre : sélectionneur de ${natName(G.offreSelection)}`, v: '__sel', d: 'Poste à cumuler avec ton club' }); return L.sort((a, b) => b.urg - a.urg); };
}
const __showVJ = show;
show = function (v) {
  if (v === '__evt') return ouvrirSujet();
  if (v === '__sel') return ouvrirSelection();
  return __showVJ(v);
};

// ---------- sélectionneur national ----------
const __endSeasonVJ = endSeason;
endSeason = function (G) {
  const S = __endSeasonVJ(G);
  try {
    if (!G.selection && !G.offreSelection && S.rank <= 2 && S.met && !S.sacked) {
      const cand = (typeof nationRanking === 'function' ? nationRanking(G) : []).slice(8, 30).map(x => x.code);
      if (cand.length) { G.offreSelection = cand[hashTrait(`${G.seed}|sel|${G.season}`) % cand.length]; news(G, `🌍 La fédération de ${natName(G.offreSelection)} te propose le poste de sélectionneur, en plus de ton club.`, 'board'); }
    }
    if (G.selection && S.intl) {
      const T = S.intl, nat = G.selection.nat, gagne = T.winner === nat;
      news(G, gagne ? `🏆 Sélectionneur : ${natName(nat)} remporte ${T.name} ${T.year} sous tes ordres !` : `🌍 Sélectionneur : ${natName(nat)} ${T.groups?.some(g => g.teams.includes(nat)) ? 'a disputé' : 'n\'était pas qualifiée pour'} ${T.name} ${T.year}.`, gagne ? 'trophy' : 'info');
      if (gagne) { G.board.conf = clamp(G.board.conf + 8, 0, 100); G.fans = clamp((G.fans ?? 60) + 5, 0, 100); (G.titresSelection ||= []).push(`${T.name} ${T.year}`); }
    }
  } catch (e) { console.error('sélection', e); }
  return S;
};
function ouvrirSelection() {
  const n = G.offreSelection; if (!n) return;
  modal(`<h2>🌍 Sélectionneur de ${esc(natName(n))}</h2><p>La fédération te propose de diriger la sélection lors des trêves et des grands tournois, tout en gardant ton club.</p>
    <ul><li>Ta sélection gagne en force grâce à ton travail (+2 de niveau).</li><li>Un titre international renforce ta position au club (président et supporters).</li></ul>
    <div class="evt-opts"><button class="btn primary" data-sel="1">Accepter</button><button class="btn" data-sel="0">Refuser</button></div>`);
  $$('#modal [data-sel]').forEach(b => b.onclick = () => {
    if (b.dataset.sel === '1') { effets(G, { selection: n }); news(G, `🌍 Tu deviens sélectionneur de ${natName(n)}.`, 'board'); }
    else news(G, `Tu déclines l'offre de ${natName(n)}.`, 'info');
    G.offreSelection = null; closeModal(); save?.(); show('inbox');
  });
}
if (typeof nationPower === 'function') { const __npVJ = nationPower; nationPower = function (G, code) { return __npVJ(G, code) + (G?.selection?.nat === code ? 2 : 0); }; }
