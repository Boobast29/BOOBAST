// ============================================================
//  Données réelles complémentaires (imports reep / transfermarkt-datasets / Wikidata)
//  - clubs : vrai stade et capacité, année de fondation, entraîneur actuel (nom, âge, nationalité, photo libre)
//  - joueurs : valeur marchande, fin de contrat (→ durée du contrat en jeu), pied fort, agent
//  - entraîneur réel du club choisi : repris comme entraîneur (mode directeur sportif) ou remplacé par toi (mode entraîneur)
//  Sans import complémentaire, rien ne change.
// ============================================================
const NAT_EN = { France: 'FRA', Spain: 'ESP', Italy: 'ITA', Germany: 'GER', England: 'ENG', 'United Kingdom': 'ENG', Portugal: 'POR', Netherlands: 'NED',
  Belgium: 'BEL', Argentina: 'ARG', Brazil: 'BRA', Croatia: 'CRO', Serbia: 'SRB', Switzerland: 'SUI', Austria: 'AUT', Denmark: 'DEN', Norway: 'NOR',
  Sweden: 'SWE', Poland: 'POL', Uruguay: 'URU', Scotland: 'SCO', Wales: 'WAL', 'Republic of Ireland': 'IRL', Ireland: 'IRL', Turkey: 'TUR', Greece: 'GRE',
  Czechia: 'CZE', 'Czech Republic': 'CZE', Morocco: 'MAR', Algeria: 'ALG', Tunisia: 'TUN', Senegal: 'SEN', Cameroon: 'CMR', 'United States': 'USA', Japan: 'JPN' };
const natCode = l => NAT_EN[l] || (l ? l.slice(0, 3).toUpperCase() : null);

const __buildRealWorldX = buildRealWorld;
buildRealWorld = function (scn) {
  const W = __buildRealWorldX(scn);
  const bySrc = new Map(scn.clubs.map(c => [c.srcId, c]));
  for (const c of W.clubs) {
    const sc = bySrc.get(c.srcId); if (!sc) continue;
    if (sc.stadium) c.stadium = sc.stadium;
    if (sc.capacity) { c.capacity = sc.capacity; c.capacitySim = false; }
    if (sc.founded) c.founded = sc.founded;
    if (sc.marketValue) c.marketValueReal = sc.marketValue;
    if (sc.coach) c.coachReal = { ...sc.coach, nat: natCode(sc.coach.natLabel) };
    if (sc.sources) c.sourcesReal = sc.sources;
  }
  const bySp = new Map(scn.players.map(p => [p.srcId, p]));
  for (const p of W.players) {
    const sp = p.srcId && bySp.get(p.srcId); if (!sp) continue;
    if (sp.marketValue) p.marketValueReal = sp.marketValue;
    if (sp.foot) p.footReal = sp.foot;
    if (sp.agent) p.agentReal = sp.agent;
    if (sp.contractEnd) { // saison 2026/27 : contrat jusqu'en juin 2027 = 1 an
      const y = +sp.contractEnd.slice(0, 4), m = +sp.contractEnd.slice(5, 7);
      if (y) { p.contract = Math.max(1, Math.min(6, y - 2026 + (m > 6 ? 1 : 0))); p.contractSim = false; p.contractEnd = sp.contractEnd; }
    }
    if (sp.source === 'Wikidata') p.sourceReal = 'Wikidata';
    if (sp.posGuessed) p.posGuessed = true;
  }
  return W;
};

// entraîneur réel du club du joueur
const __newGameX = newGame;
newGame = function (...a) {
  const g = __newGameX(...a);
  const club = g.clubs.find(c => c.id === g.clubId), cr = club?.coachReal;
  if (cr) {
    const ancien = g.coach?.name;
    if (ancien) for (const n of g.inbox || []) if (n.text.includes(ancien)) n.text = n.text.split(ancien).join(cr.name);
    if (g.coach) Object.assign(g.coach, { name: cr.name, real: true, photo: cr.photo || null, ...(cr.age ? { age: cr.age } : {}), ...(cr.nat ? { nat: cr.nat } : {}), source: cr.source });
    const prev = G; G = g;
    try { news(g, g.coach ? `Ton entraîneur : ${cr.name}${cr.age ? `, ${cr.age} ans` : ''} (${cr.source}). Ses compétences de jeu sont estimées.` : `Tu prends la place de ${cr.name} à la tête de ${club.name}.`, 'info'); }
    finally { G = prev; }
  }
  return g;
};

// fiche club : entraîneur, stade, fondation, valeur de l'effectif
function blocReelClub(c) {
  if (!c || !(c.coachReal || c.founded || c.marketValueReal || c.capacitySim === false)) return '';
  const cr = c.coachReal;
  const ph = cr?.photo ? `<span class="ph" style="width:44px;height:44px"><img src="${esc(cr.photo)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></span>` : '';
  return `<div class="row gap reel-club">${ph}<div>${cr ? `<b>Entraîneur : ${esc(cr.name)}</b>${cr.age ? ` · ${cr.age} ans` : ''}${cr.natLabel ? ` · ${esc(cr.natLabel)}` : ''}${cr.since ? ` · en poste depuis ${esc(cr.since.slice(0, 4))}` : ''}<br>` : ''}
    <small class="muted">${c.capacitySim === false ? `${esc(c.stadium)} : ${c.capacity.toLocaleString('fr-FR')} places (réel)` : ''}${c.founded ? ` · fondé en ${esc(String(c.founded))}` : ''}${c.marketValueReal ? ` · valeur de l'effectif ${money(c.marketValueReal)} (Transfermarkt)` : ''}
    ${c.sourcesReal ? ` · sources : ${c.sourcesReal.map(esc).join(', ')}` : ''}</small></div></div>`;
}
const __viewClubX = viewClub;
viewClub = function (id) {
  __viewClubX(id);
  const c = getClub(G, id), box = $('#main section.card .grow');
  if (box && c) box.insertAdjacentHTML('beforeend', blocReelClub(c));
};
// fiche joueur : données réelles
const __playerModalX = playerModal;
playerModal = function (pid, tab = 'profil') {
  __playerModalX(pid, tab);
  const p = getPlayer(G, pid);
  if (!p || tab !== 'profil' || !(p.marketValueReal || p.contractEnd || p.footReal || p.agentReal || p.sourceReal)) return;
  const pied = { right: 'droit', left: 'gauche', both: 'les deux' }[p.footReal] || p.footReal;
  const html = `<p class="hint reel-j">Données réelles : ${[p.marketValueReal ? `valeur ${money(p.marketValueReal)}` : '', p.contractEnd ? `contrat jusqu'au ${new Date(p.contractEnd).toLocaleDateString('fr-FR')}` : '',
    pied ? `pied ${esc(pied)}` : '', p.agentReal ? `agent ${esc(p.agentReal)}` : '', p.sourceReal ? `identité : ${esc(p.sourceReal)}${p.posGuessed ? ' (poste non renseigné)' : ''}` : ''].filter(Boolean).join(' · ')}${p.marketValueReal ? ' (transfermarkt-datasets)' : ''}</p>`;
  const tabs = $('#modal .tabs'); if (tabs) tabs.insertAdjacentHTML('afterend', html);
};
