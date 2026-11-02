// ============================================================
//  Règlements des championnats 2026/27 — 5 pays, 3 niveaux et plus
//  - fiches par pays et par niveau : équipes, critères de départage, montées, descentes,
//    barrages, play-offs, playouts, groupes, équipes réserves, effectifs, finances
//  - chaque règle porte un statut : « officiel » (source consultée), « simplifié »
//    (format réel réduit pour le jeu) ou « à vérifier » (source non trouvée ou contradictoire)
//  - remplace : standings (départage), applyPromotions (fin de saison), promoSpots
//  - écran « Règlement » (section Compétitions) + conformité de l'effectif
//  Monde fictif : le règlement d'un pays au choix s'applique aux divisions dans l'ordre.
// ============================================================

// Critères de départage (dans l'ordre) :
//  diff = différence de buts générale · bp = buts marqués · bpExt = buts marqués à l'extérieur
//  h2hPts / h2hDiff / h2hBp / h2hBpExt = confrontations directes entre clubs à égalité
//  fairplay = classement du fair-play (non suivi par club : remplacé par le tirage) · tirage = tirage au sort
//  appui = match d'appui (titre, places décisives) joué en fin de saison
const CRIT_LABEL = {
  diff: 'différence de buts générale', bp: 'buts marqués', bpExt: 'buts marqués à l\'extérieur',
  h2hPts: 'points en confrontations directes', h2hDiff: 'différence de buts particulière', h2hBp: 'buts marqués en confrontations directes',
  h2hBpExt: 'buts à l\'extérieur en confrontations directes', fairplay: 'fair-play', tirage: 'tirage au sort', appui: 'match d\'appui'
};

// Formats de play-offs :
//  echelle : le moins bien classé affronte le suivant, le vainqueur monte d'un cran (ex. Ligue 2 : 5e-4e puis 3e)
//  demi    : demi-finales 1er-4e / 2e-3e des qualifiés puis finale
//  direct  : la place qualifiée va directement au barrage (ex. 3e de 2. Bundesliga)
//  croise  : plusieurs groupes, demi-finales croisées (Primera Federación)
//  serieC  : phase de groupe puis phase nationale (Serie C, simplifié)
//  serieB  : tour préliminaire 5-8 / 6-7, demi-finales avec 3e et 4e, finale ; nul = mieux classé
const REGLES = {
  FRA: {
    pays: 'France', saison: '2026/27', nat: 'FRA', reserveMax: 1,
    coupe: { nom: 'Coupe de France', hote: 'petit', texte: 'Match unique ; le club de division inférieure reçoit ; finale au Stade de France.', statut: 'officiel' },
    sanction: { leger: 'ban', lourd: 'retro', texte: 'DNCG : encadrement de la masse salariale (recrutement bloqué) si le déficit dépasse 30 % de la masse salariale annuelle ; rétrogradation administrative au-delà de 60 %.' },
    niveaux: [
      { niveau: 1, nom: 'Ligue 1', equipes: 18, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'h2hBp', 'fairplay', 'tirage'],
        descente: { directe: 2, barrage: { place: 16, legs: 2, note: 'le 16e affronte le vainqueur des play-offs de Ligue 2' } },
        europe: '1er à 6e (selon coefficients et coupes)', statut: { format: 'officiel', departage: 'à vérifier' },
        note: 'Critères de départage revus par la LFP en 2025/26 (buts à l\'extérieur supprimés) ; ordre exact 2026/27 non retrouvé.' },
      { niveau: 2, nom: 'Ligue 2', equipes: 18, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'h2hBp', 'fairplay', 'tirage'],
        montee: { directe: 2, playoff: { format: 'echelle', places: [3, 4, 5], vers: 'barrage', legs: 1, note: '5e-4e chez le 4e, vainqueur contre le 3e chez le 3e' } },
        descente: { directe: 2, barrage: { place: 16, legs: 2, note: 'le 16e affronte le vainqueur des play-offs de Ligue 3' } },
        statut: { format: 'officiel', departage: 'à vérifier' } },
      { niveau: 3, nom: 'Ligue 3 (ex-National)', equipes: 18, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'fairplay', 'tirage'],
        montee: { directe: 2, playoff: { format: 'demi', places: [3, 4, 5, 6], vers: 'barrage', legs: 1, note: '3e à 6e, vainqueur contre le 16e de Ligue 2' } },
        descente: { directe: 3, note: 'vers National 1 (ex-National 2), niveau non simulé' },
        statut: { format: 'officiel', playoff: 'simplifié (tableau des play-offs)', departage: 'à vérifier' },
        note: 'Création de la Ligue 3 en 2026/27 : 18 clubs, 34 journées.' }
    ],
    effectif: { nonUE: 4, feuille: '11 + 9 remplaçants', changements: 5, statut: 'à vérifier (feuille de match)',
      texte: '4 joueurs non-UE maximum sous contrat professionnel (hors accords de Cotonou et conventions).' },
    finances: { nom: 'DNCG', texte: 'Contrôle de gestion : encadrement de la masse salariale, interdiction de recruter ou rétrogradation administrative si les comptes ne sont pas couverts.', statut: 'officiel (principe)' },
    mercato: 'Été : de mi-juin au 1er septembre · Hiver : janvier',
    sources: ['https://media.fff.fr/uploads/documents/reglements-sportif-l3-saison-2026-2027.pdf', 'https://www.getfootballnewsfrance.com/2026/french-fa-president-philippe-diallo-confirms-ligue-3-launch-from-2026/', 'https://www.90min.com/fr/ligue-1-la-nouveaute-introduite-par-la-lfp-pour-2025-26-qui-concerne-les-egalites-de-points-en-fin-de-saison']
  },
  ENG: {
    pays: 'Angleterre', saison: '2026/27', nat: 'ENG', reserveMax: 1,
    coupe: { nom: 'FA Cup', hote: 'tirage', texte: 'Match unique, le premier club tiré reçoit ; plus de matchs rejoués depuis 2025/26 ; finale à Wembley.', statut: 'officiel' },
    sanction: { leger: 'ban', lourd: 'points', points: [9, 12], texte: 'Déficit au-delà de 30 % de la masse salariale : embargo sur les transferts ; au-delà de 60 % : administration, −9 points (Premier League) ou −12 points (EFL) la saison suivante.' },
    niveaux: [
      { niveau: 1, nom: 'Premier League', equipes: 20, departage: ['diff', 'bp', 'h2hPts', 'h2hBpExt', 'appui'],
        descente: { directe: 3 }, europe: '1er à 4e LdC (+ places de performance UEFA), 5e, coupes', statut: { format: 'officiel', departage: 'officiel' },
        note: 'Match d\'appui seulement si le titre, une place européenne ou la relégation reste indécis après tous les critères.' },
      { niveau: 2, nom: 'Championship', equipes: 24, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'h2hBpExt', 'tirage'],
        montee: { directe: 2, playoff: { format: 'demi', places: [3, 4, 5, 6], vers: 'montee', legs: 2, finale: 'neutre', note: 'demi-finales aller-retour (3e-6e, 4e-5e), finale à Wembley' } },
        descente: { directe: 3 }, statut: { format: 'officiel', departage: 'officiel' } },
      { niveau: 3, nom: 'League One', equipes: 24, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'h2hBpExt', 'tirage'],
        montee: { directe: 2, playoff: { format: 'demi', places: [3, 4, 5, 6], vers: 'montee', legs: 2, finale: 'neutre' } },
        descente: { directe: 4 }, statut: { format: 'officiel', departage: 'officiel' } },
      { niveau: 4, nom: 'League Two', equipes: 24, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'h2hBpExt', 'tirage'],
        montee: { directe: 3, playoff: { format: 'demi', places: [4, 5, 6, 7], vers: 'montee', legs: 2, finale: 'neutre' } },
        descente: { directe: 2, note: 'vers la National League, niveau non simulé' }, statut: { format: 'officiel', departage: 'officiel' } }
    ],
    effectif: { liste: 25, nonFormesMax: 17, libreAge: 21, feuille: '11 + 9 remplaçants', changements: 5, statut: 'officiel (Premier League)',
      texte: 'Liste de 25 joueurs de plus de 21 ans, dont au plus 17 non formés localement (3 saisons dans un club anglais ou gallois avant 21 ans). Joueurs étrangers : autorisation de travail (points GBE).' },
    finances: { nom: 'SCR / PSR', texte: 'Premier League : ratio du coût de l\'effectif (salaires + transferts ≤ 85 % des revenus) à partir de 2026/27. EFL : règles de rentabilité et de soutenabilité. Administration : −12 points (EFL), −9 (Premier League).', statut: 'à vérifier (seuils 2026/27)' },
    mercato: 'Été : de mi-juin au 1er septembre · Hiver : janvier',
    sources: ['https://www.premierleague.com/news', 'https://www.efl.com/']
  },
  GER: {
    pays: 'Allemagne', saison: '2026/27', nat: 'GER', reserveMax: 3,
    coupe: { nom: 'DFB-Pokal', hote: 'petit', texte: 'Match unique ; le club amateur ou de division inférieure reçoit ; finale à Berlin.', statut: 'officiel' },
    sanction: { leger: 'ban', lourd: 'retro', texte: 'Licence sous conditions (recrutement bloqué) au-delà de 30 % ; licence refusée (relégation) au-delà de 60 %.' },
    niveaux: [
      { niveau: 1, nom: 'Bundesliga', equipes: 18, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'h2hBpExt', 'bpExt', 'appui'],
        descente: { directe: 2, barrage: { place: 16, legs: 2, note: 'Relegation : le 16e contre le 3e de 2. Bundesliga' } },
        statut: { format: 'officiel', departage: 'officiel' } },
      { niveau: 2, nom: '2. Bundesliga', equipes: 18, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'h2hBpExt', 'bpExt', 'appui'],
        montee: { directe: 2, playoff: { format: 'direct', places: [3], vers: 'barrage' } },
        descente: { directe: 2, barrage: { place: 16, legs: 2, note: 'Relegation : le 16e contre le 3e de 3. Liga' } },
        statut: { format: 'officiel', departage: 'officiel' } },
      { niveau: 3, nom: '3. Liga', equipes: 20, departage: ['diff', 'bp', 'h2hPts', 'h2hDiff', 'h2hBpExt', 'bpExt', 'appui'],
        montee: { directe: 2, playoff: { format: 'direct', places: [3], vers: 'barrage' } },
        descente: { directe: 4, note: 'vers les Regionalligen, niveau non simulé' },
        statut: { format: 'officiel', departage: 'officiel' }, note: 'Les équipes réserves (II) ne peuvent pas monter en 2. Bundesliga.' }
    ],
    effectif: { allemandsMin: 12, formesMin: 8, feuille: '11 + 9 remplaçants', changements: 5, statut: 'officiel (DFL)',
      texte: 'Au moins 12 joueurs allemands sous contrat de licence et 8 joueurs formés localement (dont 4 au club). Règle du 50+1 : le club garde la majorité des droits de vote.' },
    finances: { nom: 'Licence DFL', texte: 'Licence accordée chaque saison sur dossier financier ; refus de licence = relégation. Règle du 50+1.', statut: 'officiel (principe)' },
    mercato: 'Été : 1er juillet au 1er septembre · Hiver : janvier',
    sources: ['https://www.dfb.de/news/detail/von-bundesliga-bis-3-liga-alle-infos-zu-den-relegationen-260997', 'https://en.wikipedia.org/wiki/2025%E2%80%9326_3._Liga']
  },
  ESP: {
    pays: 'Espagne', saison: '2026/27', nat: 'ESP', reserveMax: 2,
    coupe: { nom: 'Copa del Rey', hote: 'petit', texte: 'Match unique, le club de division inférieure reçoit ; demi-finales en aller-retour (jouées en match unique dans le jeu) ; finale sur terrain neutre.', statut: 'simplifié' },
    sanction: { leger: 'ban', lourd: 'ban', texte: 'Limite de coût d\'effectif dépassée : nouvelles recrues non inscrites (recrutement bloqué) tant que les comptes ne sont pas assainis.' },
    niveaux: [
      { niveau: 1, nom: 'LaLiga', equipes: 20, departage: ['h2hPts', 'h2hDiff', 'diff', 'bp', 'fairplay', 'tirage'],
        descente: { directe: 3 }, statut: { format: 'officiel', departage: 'officiel' } },
      { niveau: 2, nom: 'LaLiga Hypermotion', equipes: 22, departage: ['h2hPts', 'h2hDiff', 'diff', 'bp', 'fairplay', 'tirage'],
        montee: { directe: 2, playoff: { format: 'demi', places: [3, 4, 5, 6], vers: 'montee', legs: 2, egalite: 'mieuxClasse', note: 'aller-retour, à égalité le mieux classé passe' } },
        descente: { directe: 4 }, statut: { format: 'officiel', departage: 'officiel' },
        note: 'Une équipe réserve (B) ne peut pas jouer dans la même division que son équipe première ni monter en LaLiga.' },
      { niveau: 3, nom: 'Primera Federación', equipes: 40, groupes: 2, departage: ['h2hPts', 'h2hDiff', 'diff', 'bp', 'fairplay', 'tirage'],
        montee: { directe: 1, parGroupe: true, playoff: { format: 'croise', places: [2, 3, 4, 5], vers: 'montee', legs: 2, gagnants: 2, egalite: 'mieuxClasse', note: '2e à 5e de chaque groupe, tableaux croisés, 2 montées' } },
        descente: { directe: 5, parGroupe: true, note: 'vers la Segunda Federación, niveau non simulé' },
        statut: { format: 'officiel (2025/26)', departage: 'officiel' }, note: '2 groupes de 20. Réforme annoncée pour 2027/28 (non appliquée).' }
    ],
    effectif: { liste: 25, nonUE: 3, feuille: '11 + 9 remplaçants', changements: 5, statut: 'officiel (LaLiga, 3 extracommunautaires)',
      texte: '25 joueurs de l\'effectif professionnel (les moins de 23 ans issus du centre peuvent s\'y ajouter), 3 joueurs extracommunautaires au maximum.' },
    finances: { nom: 'Limite de coût d\'effectif (LCPD)', texte: 'LaLiga fixe à chaque club un plafond de coût d\'effectif (salaires + amortissements) selon ses revenus ; un club au-dessus du plafond ne peut inscrire ses recrues qu\'en partie.', statut: 'officiel (principe)' },
    mercato: 'Été : 1er juillet au 1er septembre · Hiver : janvier',
    sources: ['https://rfef.es/es/noticias/asi-es-el-sistema-de-competicion-de-primera-federacion-iberdrola', 'https://en.wikipedia.org/wiki/2025%E2%80%9326_Primera_Federaci%C3%B3n']
  },
  ITA: {
    pays: 'Italie', saison: '2026/27', nat: 'ITA', reserveMax: 3,
    coupe: { nom: 'Coppa Italia', hote: 'mieuxClasse', texte: 'Tableau à têtes de série, le mieux classé reçoit ; demi-finales en aller-retour (match unique dans le jeu) ; finale au Stadio Olimpico.', statut: 'simplifié' },
    sanction: { leger: 'ban', lourd: 'points', points: [4, 4], texte: 'Indice de liquidité non respecté : mercato bloqué ; salaires impayés (déficit au-delà de 60 %) : −4 points la saison suivante.' },
    niveaux: [
      { niveau: 1, nom: 'Serie A', equipes: 20, departage: ['h2hPts', 'h2hDiff', 'diff', 'bp', 'tirage'],
        descente: { directe: 3 }, appui: ['titre', 'maintien'], statut: { format: 'officiel', departage: 'officiel' },
        note: 'Égalité pour la 1re place ou pour la dernière place de maintien : match d\'appui unique sur terrain neutre (tirs au but sans prolongation).' },
      { niveau: 2, nom: 'Serie B', equipes: 20, departage: ['h2hPts', 'h2hDiff', 'diff', 'bp', 'tirage'],
        montee: { directe: 2, playoff: { format: 'serieB', places: [3, 4, 5, 6, 7, 8], vers: 'montee', egalite: 'mieuxClasse', ecartAnnule: 14, note: 'si le 3e a 14 points d\'avance sur le 4e, il monte sans play-offs' } },
        descente: { directe: 3, playout: { places: [16, 17], ecartMax: 4, note: '16e contre 17e aller-retour, le mieux classé se maintient à égalité ; pas de playout si plus de 4 points d\'écart' } },
        statut: { format: 'officiel', departage: 'officiel' } },
      { niveau: 3, nom: 'Serie C', equipes: 60, groupes: 3, departage: ['h2hPts', 'h2hDiff', 'diff', 'bp', 'tirage'],
        montee: { directe: 1, parGroupe: true, playoff: { format: 'serieC', places: [2, 3, 4, 5], vers: 'montee', gagnants: 1, egalite: 'mieuxClasse', note: 'réel : 28 clubs (2e à 10e + vainqueur de la Coupe) ; jeu : 2e à 5e de chaque groupe' } },
        descente: { directe: 1, parGroupe: true, playout: { places: [16, 17, 18, 19], ecartMax: 8, note: '16e-19e et 17e-18e, aller-retour' }, note: 'vers la Serie D, niveau non simulé' },
        statut: { format: 'officiel', playoff: 'simplifié', departage: 'officiel' }, note: '3 groupes de 20. Les équipes « Next Gen » ne peuvent pas monter en Serie B.' }
    ],
    effectif: { liste: 25, formesMin: 8, libreAge: 22, feuille: '11 + 12 remplaçants (à vérifier)', changements: 5, statut: 'officiel (liste de 25)',
      texte: 'Liste de 25 joueurs de plus de 22 ans, dont 4 formés au club et 4 formés en Italie. Recrutement d\'extracommunautaires limité chaque été.' },
    finances: { nom: 'Indice de liquidité / Commission indépendante', texte: 'Contrôle par indicateurs (liquidité, coût de l\'effectif) ; blocage du mercato si l\'indice n\'est pas respecté.', statut: 'à vérifier (seuils 2026/27)' },
    mercato: 'Été : 1er juillet au 1er septembre · Hiver : janvier',
    sources: ['https://www.calcioefinanza.it/2026/05/06/tabellone-e-regolamento-playoff-serie-c-secondo-turno/', 'https://www.cbssports.com/soccer/news/serie-a-introduce-scudetto-tiebreaker-one-match-playoff-to-determine-champion-if-teams-tied-at-seasons-end']
  }
};
const REGLES_ORDRE = ['FRA', 'ENG', 'GER', 'ESP', 'ITA'];
const UE_EEE = new Set(['AUT', 'BEL', 'BUL', 'CRO', 'CYP', 'CZE', 'DEN', 'EST', 'FIN', 'FRA', 'GER', 'GRE', 'HUN', 'IRL', 'IRE', 'ITA', 'LVA', 'LAT', 'LTU', 'LIT', 'LUX', 'MLT', 'MAL', 'NED', 'POL', 'POR', 'ROU', 'ROM', 'SVK', 'SVN', 'SLO', 'ESP', 'SWE', 'NOR', 'ISL', 'LIE', 'SUI']);
const UK = new Set(['ENG', 'SCO', 'WAL', 'NIR']);

// ---------- Accès aux règles ----------
function reglesPays(G) {
  if (G.real?.country && REGLES[G.real.country]) return REGLES[G.real.country];
  return REGLES[G.regles] || REGLES.FRA;
}
function compTier(G, comp) {
  if (comp.tier) return comp.tier;
  const L = leagueComps(G);
  if (G.real) { const c = getClub(G, comp.clubs[0]); return c?.tier || 1; }
  return L.indexOf(comp) + 1 || 1;
}
function regleComp(G, comp) {
  const R = reglesPays(G);
  const t = compTier(G, comp);
  return R.niveaux.find(n => n.niveau === t) || null;
}
function reglesActives(G) { return G.reglesOn !== false; }

// ---------- Départage ----------
function h2hTable(ids, fixtures) {
  const S = new Set(ids), T = {};
  for (const id of ids) T[id] = { pts: 0, gf: 0, ga: 0, gfExt: 0 };
  for (const round of fixtures) for (const f of round) {
    if (!f.res || !S.has(f.h) || !S.has(f.a)) continue;
    const [h, a] = f.res, H = T[f.h], A = T[f.a];
    H.gf += h; H.ga += a; A.gf += a; A.ga += h; A.gfExt += a;
    if (h > a) H.pts += 3; else if (h < a) A.pts += 3; else { H.pts++; A.pts++; }
  }
  return T;
}
function awayGoals(fixtures) {
  const out = {};
  for (const round of fixtures) for (const f of round) if (f.res) out[f.a] = (out[f.a] || 0) + f.res[1];
  return out;
}
// Tirage au sort stable : ne consomme pas l'aléatoire de la partie (les écrans ne changent pas le futur)
const tirageCle = (G, id) => { let h = 2166136261 ^ (G.seed || 1) ^ (G.season || 0); for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

function sortWithRules(G, rows, fixtures, crit) {
  const groups = [];
  const byPts = rows.slice().sort((x, y) => y.pts - x.pts);
  for (const r of byPts) { const g = groups[groups.length - 1]; if (g && g[0].pts === r.pts) g.push(r); else groups.push([r]); }
  let ext = null;
  const out = [];
  for (const g of groups) {
    if (g.length === 1) { out.push(g[0]); continue; }
    const H = crit.some(c => c.startsWith('h2h')) ? h2hTable(g.map(r => r.id), fixtures) : null;
    if (crit.includes('bpExt') && !ext) ext = awayGoals(fixtures);
    const key = (r, c) => {
      switch (c) {
        case 'diff': return r.gf - r.ga;
        case 'bp': return r.gf;
        case 'bpExt': return ext[r.id] || 0;
        case 'h2hPts': return H[r.id].pts;
        case 'h2hDiff': return H[r.id].gf - H[r.id].ga;
        case 'h2hBp': return H[r.id].gf;
        case 'h2hBpExt': return H[r.id].gfExt;
        default: return 0; // fair-play non suivi, appui joué en fin de saison
      }
    };
    g.sort((x, y) => { for (const c of crit) { if (c === 'tirage' || c === 'appui' || c === 'fairplay') continue; const d = key(y, c) - key(x, c); if (d) return d; } return tirageCle(G, x.id) - tirageCle(G, y.id); });
    out.push(...g);
  }
  return out;
}
const __standingsR = standings;
standings = function (G, compId) {
  const comp = G.comps[compId];
  const t = __standingsR(G, compId);
  if (!comp || comp.type !== 'league' || !reglesActives(G)) return t;
  const rule = regleComp(G, comp);
  if (!rule) return t;
  let out = sortWithRules(G, t, comp.fixtures, rule.departage);
  if (comp.appuis) for (const a of comp.appuis) { // résultat d'un match d'appui déjà joué
    const iw = out.findIndex(r => r.id === a.winner), il = out.findIndex(r => r.id === a.loser);
    if (iw > il && il >= 0) { const w = out[iw]; out.splice(iw, 1); out.splice(il, 0, w); }
  }
  return out;
};
const __promoSpotsR = promoSpots;
promoSpots = function (comp) {
  if (!G || !reglesActives(G) || !comp) return __promoSpotsR(comp);
  const r = regleComp(G, comp);
  if (!r) return __promoSpotsR(comp);
  const n = comp.div === leagueComps(G)[0]?.div ? r.descente?.directe : r.montee?.directe;
  return n || __promoSpotsR(comp);
};

// ---------- Matchs de barrage / play-offs (simulation rapide) ----------
// score de barrage : écart de niveau amorti (matchs à enjeu, souvent fermés), environ 2,4 buts par match
function rgScore(pA, pB, home) {
  const lA = clamp(1.25 * Math.exp((pA - pB) / 18) * (home ? 1.1 : 1), .3, 3), lB = clamp(1.25 * Math.exp((pB - pA) / 18) / (home ? 1.1 : 1), .3, 3);
  return { s: [poisson(lA), poisson(lB)] };
}
let RG_LBL = '';
function rgDuel(G, a, b, o = {}) {
  // a = mieux classé (reçoit au retour ou le match unique), b = moins bien classé
  const key = a + '-' + b, P = G.post?.season === G.season ? G.post : null;
  if (P?.res[key]) return P.res[key];
  if (P?.live && (a === G.clubId || b === G.clubId)) throw { pendingDuel: true, a, b, o: { ...o, lbl: o.lbl || RG_LBL } };
  const pa = clubPower(G, a), pb = clubPower(G, b);
  const legs = o.legs || 1, neutral = !!o.neutral;
  let ga = 0, gb = 0; const parts = [];
  const A = getClub(G, a).name, B = getClub(G, b).name;
  if (legs === 2) {
    const r1 = rgScore(pb, pa, true); gb += r1.s[0]; ga += r1.s[1]; parts.push(`aller ${B} ${r1.s[0]}-${r1.s[1]} ${A}`);
    const r2 = rgScore(pa, pb, true); ga += r2.s[0]; gb += r2.s[1]; parts.push(`retour ${A} ${r2.s[0]}-${r2.s[1]} ${B}`);
  } else { const r = rgScore(pa, pb, !neutral); ga = r.s[0]; gb = r.s[1]; parts.push(`${A} ${ga}-${gb} ${B}${neutral ? ' (terrain neutre)' : ''}`); }
  let w, extra = '';
  if (ga !== gb) w = ga > gb ? a : b;
  else if (o.egalite === 'mieuxClasse') { w = a; extra = ' (le mieux classé passe à égalité)'; }
  else if (!o.noET && rnd() < .4) { const s = rnd() < .5 + (pa - pb) / 40 ? a : b; w = s; extra = ' a.p.'; }
  else { w = rnd() < .5 + (pa - pb) / 60 ? a : b; extra = ' (t.a.b.)'; }
  const res = { w, l: w === a ? b : a, txt: `${parts.join(' · ')}${legs === 2 ? ` (cumul ${A} ${ga}-${gb} ${B})` : ''}${extra} → ${getClub(G, w).name}` };
  if (P) P.res[key] = res;
  return res;
}

function isReserve(c) { return /(\sII|\sB|\sU2[123]|Next ?Gen|Castilla|Atlético\sB|Futuro)$/i.test(c.name.trim()); }

// Play-offs d'un niveau : renvoie { gagnants: [ids], log: [] }
function playoffNiveau(G, rule, tables) {
  const P = rule.montee?.playoff; if (!P) return { gagnants: [], log: [] };
  RG_LBL = rule.nom + ' — play-offs d\'accession';
  const log = [], o = { legs: P.legs || 1, egalite: P.egalite };
  // les tableaux reçus excluent déjà les équipes réserves non autorisées à monter
  const pickPlaces = (t) => P.places.map(p => t[p - 1]).filter(Boolean).map(r => r.id);
  if (P.format === 'direct') return { gagnants: tables.map(t => pickPlaces(t)[0]).filter(x => x != null), log: [] };
  if (P.format === 'echelle') {
    const q = pickPlaces(tables[0]); if (!q.length) return { gagnants: [], log };
    let cur = q[q.length - 1];
    for (let i = q.length - 2; i >= 0; i--) { const d = rgDuel(G, q[i], cur, o); log.push(d.txt); cur = d.w; }
    return { gagnants: [cur], log };
  }
  if (P.format === 'demi') {
    const q = pickPlaces(tables[0]); if (q.length < 4) return { gagnants: q.slice(0, 1), log };
    const s1 = rgDuel(G, q[0], q[3], o), s2 = rgDuel(G, q[1], q[2], o); log.push('Demi-finale : ' + s1.txt, 'Demi-finale : ' + s2.txt);
    const ordre = [s1.w, s2.w].sort((x, y) => q.indexOf(x) - q.indexOf(y));
    const f = rgDuel(G, ordre[0], ordre[1], { legs: P.finale === 'neutre' ? 1 : o.legs, neutral: P.finale === 'neutre', egalite: P.finale === 'neutre' ? null : o.egalite });
    log.push('Finale : ' + f.txt);
    return { gagnants: [f.w], log };
  }
  if (P.format === 'croise') { // 2 groupes : 2e A-5e B, 3e A-4e B, 2e B-5e A, 3e B-4e A ; puis 2 finales
    const [A, B] = tables.map(pickPlaces);
    if (!A || !B || A.length < 4 || B.length < 4) return { gagnants: [], log };
    const rang = id => A.includes(id) ? A.indexOf(id) : B.indexOf(id);
    const d = [[A[0], B[3]], [A[1], B[2]], [B[0], A[3]], [B[1], A[2]]].map(([x, y]) => { const r = rgDuel(G, x, y, o); log.push('Demi-finale : ' + r.txt); return r.w; });
    const fin = [[d[0], d[3]], [d[2], d[1]]].map(([x, y]) => { const [a, b] = rang(x) <= rang(y) ? [x, y] : [y, x]; const r = rgDuel(G, a, b, o); log.push('Finale : ' + r.txt); return r.w; });
    return { gagnants: fin.slice(0, P.gagnants || 2), log };
  }
  if (P.format === 'serieB') {
    const t = tables[0], q = pickPlaces(t);
    if (q.length < 6) return { gagnants: q.slice(0, 1), log };
    const pts = id => t.find(r => r.id === id).pts;
    if (P.ecartAnnule && pts(q[0]) - pts(q[1]) >= P.ecartAnnule) { log.push(`${getClub(G, q[0]).name} monte sans play-offs (${P.ecartAnnule} points d'avance ou plus sur le 4e).`); return { gagnants: [q[0]], log }; }
    const p1 = rgDuel(G, q[2], q[5], { egalite: 'mieuxClasse' }), p2 = rgDuel(G, q[3], q[4], { egalite: 'mieuxClasse' });
    log.push('Tour préliminaire : ' + p1.txt, 'Tour préliminaire : ' + p2.txt);
    const surv = [p1.w, p2.w].sort((x, y) => q.indexOf(x) - q.indexOf(y));
    const s1 = rgDuel(G, q[0], surv[1], { legs: 2, egalite: 'mieuxClasse' }), s2 = rgDuel(G, q[1], surv[0], { legs: 2, egalite: 'mieuxClasse' });
    log.push('Demi-finale : ' + s1.txt, 'Demi-finale : ' + s2.txt);
    const fo = [s1.w, s2.w].sort((x, y) => q.indexOf(x) - q.indexOf(y));
    const f = rgDuel(G, fo[0], fo[1], { legs: 2, egalite: 'mieuxClasse' }); log.push('Finale : ' + f.txt);
    return { gagnants: [f.w], log };
  }
  if (P.format === 'serieC') { // jeu : échelle 5e→2e dans chaque groupe, puis phase nationale (3 qualifiés + meilleur finaliste battu)
    const quals = [], battus = [];
    tables.forEach(t => {
      const q = pickPlaces(t); if (!q.length) return;
      let cur = q[q.length - 1];
      for (let i = q.length - 2; i >= 0; i--) { const d = rgDuel(G, q[i], cur, { egalite: 'mieuxClasse' }); log.push('Phase de groupe : ' + d.txt); if (i === 0) battus.push(d.l); cur = d.w; }
      quals.push(cur);
    });
    const ptsOf = id => { for (const t of tables) { const r = t.find(x => x.id === id); if (r) return r.pts; } return 0; };
    const best = battus.sort((a, b) => ptsOf(b) - ptsOf(a))[0];
    const f4 = [...quals, best].filter(x => x != null).sort((a, b) => ptsOf(b) - ptsOf(a));
    if (f4.length < 4) return { gagnants: f4.slice(0, 1), log };
    const s1 = rgDuel(G, f4[0], f4[3], { legs: 2, egalite: 'mieuxClasse' }), s2 = rgDuel(G, f4[1], f4[2], { legs: 2, egalite: 'mieuxClasse' });
    log.push('Final Four : ' + s1.txt, 'Final Four : ' + s2.txt);
    const fo = [s1.w, s2.w].sort((a, b) => ptsOf(b) - ptsOf(a));
    const f = rgDuel(G, fo[0], fo[1], { legs: 2 }); log.push('Finale : ' + f.txt);
    return { gagnants: [f.w], log };
  }
  return { gagnants: [], log };
}

// Playouts : renvoie les relégués (par groupe)
function playoutNiveau(G, rule, t, log) {
  const P = rule.descente?.playout; if (!P) return [];
  RG_LBL = rule.nom + ' — playout';
  const n = t.length, out = [];
  // places du règlement adaptées à la taille effective du groupe : comptées depuis le bas
  const fromBottom = p => t[n - (rule.equipes / (rule.groupes || 1) - p) - 1];
  const pairs = [];
  for (let i = 0; i < P.places.length / 2; i++) pairs.push([fromBottom(P.places[i]), fromBottom(P.places[P.places.length - 1 - i])]);
  for (const [a, b] of pairs) {
    if (!a || !b) continue;
    if (a.pts - b.pts > P.ecartMax) { out.push(b.id); log.push(`${getClub(G, b.id).name} relégué sans playout (${a.pts - b.pts} points de retard sur ${getClub(G, a.id).name}).`); continue; }
    const d = rgDuel(G, a.id, b.id, { legs: 2, egalite: 'mieuxClasse' });
    log.push('Playout : ' + d.txt); out.push(d.l);
  }
  return out;
}

// Match d'appui (Serie A : titre / maintien ; ailleurs : égalité parfaite décisive)
function matchsAppui(G, comp, rule, log) {
  const t = standings(G, comp.id);
  const places = [];
  if (rule.appui?.includes('titre')) places.push(0);
  if (rule.appui?.includes('maintien') && rule.descente?.directe) places.push(t.length - rule.descente.directe - 1);
  for (const i of places) {
    const a = t[i], b = t[i + 1];
    if (!a || !b || a.pts !== b.pts) continue;
    RG_LBL = `${comp.name} — match d'appui (${i === 0 ? 'titre' : 'maintien'})`;
    const d = rgDuel(G, a.id, b.id, { neutral: true, noET: true });
    (comp.appuis ||= []).push({ winner: d.w, loser: d.l });
    log.push(`Match d'appui (${i === 0 ? 'titre' : 'maintien'}) : ${d.txt}`);
  }
}

// ---------- Montées et descentes selon les règlements ----------
const __applyPromotionsR = applyPromotions;
applyPromotions = function (G, S, L) {
  if (!reglesActives(G)) return __applyPromotionsR(G, S, L);
  const R = reglesPays(G);
  const tiers = {};
  for (const c of L) { c.tier = compTier(G, c); (tiers[c.tier] ||= []).push(c); }
  const tierNums = Object.keys(tiers).map(Number).sort((a, b) => a - b);
  S.barrages = [];
  const log = (t) => S.barrages.push(t);
  // matchs d'appui avant de figer les classements
  for (const c of L) { const r = regleComp(G, c); if (r) { const l = []; matchsAppui(G, c, r, l); l.forEach(x => log(`${c.name} — ${x}`)); } }
  const tables = {}; for (const c of L) tables[c.id] = standings(G, c.id);
  const moves = []; // { id, to: tier }
  let relegatedTop = [];
  for (let k = 0; k + 1 < tierNums.length; k++) {
    const tu = tierNums[k], td = tierNums[k + 1];
    if (td !== tu + 1) continue;
    const U = tiers[tu], D = tiers[td];
    const ru = regleComp(G, U[0]), rd = regleComp(G, D[0]);
    if (!ru || !rd) continue;
    const down = [], up = [];
    // descentes directes + playouts du niveau supérieur
    for (const c of U) {
      const t = tables[c.id];
      const nD = ru.descente?.directe || 0;
      t.slice(t.length - nD).forEach(r => down.push(r.id));
      const lg = []; playoutNiveau(G, ru, t, lg).forEach(id => down.push(id)); lg.forEach(x => log(`${c.name} — ${x}`));
    }
    // montées directes du niveau inférieur (équipes réserves exclues au-delà du niveau autorisé)
    // reserveMax = niveau le plus élevé qu'une équipe réserve peut atteindre (1 = aucune restriction)
    const reserveOk = id => !isReserve(getClub(G, id)) || tu >= (R.reserveMax || 1);
    for (const c of D) {
      const t = tables[c.id].filter(r => reserveOk(r.id));
      t.slice(0, rd.montee?.directe || 0).forEach(r => up.push(r.id));
    }
    // play-offs du niveau inférieur
    const po = rd.montee?.playoff ? playoffNiveau(G, rd, D.map(c => tables[c.id].filter(r => reserveOk(r.id)))) : { gagnants: [], log: [] };
    po.log.forEach(x => log(`${rd.nom} — ${x}`));
    // barrage entre niveaux (le club du haut défend sa place)
    if (ru.descente?.barrage && po.gagnants.length && rd.montee.playoff.vers === 'barrage') {
      const t = tables[U[0].id];
      const pos = t.length - (ru.equipes - ru.descente.barrage.place) - 1;
      const def = t[pos];
      if (def) {
        RG_LBL = `Barrage ${ru.nom} / ${rd.nom}`;
        const d = rgDuel(G, def.id, po.gagnants[0], { legs: ru.descente.barrage.legs || 2 });
        log(`Barrage ${ru.nom} / ${rd.nom} — ${d.txt}`);
        if (d.w !== def.id) { down.push(def.id); up.push(d.w); }
        if (def.id === G.clubId || po.gagnants[0] === G.clubId) news(G, `Barrage : ${d.txt}. ${d.w === G.clubId ? 'Ton club l\'emporte !' : 'Ton club est battu.'}`, d.w === G.clubId ? 'trophy' : 'loss');
      }
    } else po.gagnants.forEach(id => up.push(id));
    // équilibre : autant de montées que de descentes (tailles réelles parfois différentes des règlements)
    const n = Math.min(down.length, up.length);
    if (down.length !== up.length) log(`${ru.nom} / ${rd.nom} : ${down.length} relégué(s) pour ${up.length} promu(s), ajusté à ${n} échange(s) pour garder la taille des championnats.`);
    // on garde les plus mal classés parmi les relégués et les mieux placés (directs d'abord) parmi les promus
    const placeOf = id => { for (const c of U) { const i = tables[c.id].findIndex(r => r.id === id); if (i >= 0) return i - tables[c.id].length; } return 0; };
    const downKeep = [...new Set(down)].sort((a, b) => placeOf(b) - placeOf(a)).slice(0, n);
    up.slice(0, n).forEach(id => moves.push({ id, to: tu }));
    downKeep.forEach(id => moves.push({ id, to: td }));
    if (tu === tierNums[0]) relegatedTop = downKeep.slice();
  }
  // niveau le plus bas : relégations hors du jeu non appliquées
  const last = tiers[tierNums[tierNums.length - 1]];
  const rl = regleComp(G, last[0]);
  if (rl?.descente?.directe && tierNums.length > 1) log(`${rl.nom} : ${rl.descente.note || 'niveau inférieur non simulé'} — relégations hors du jeu non appliquées.`);
  // application : répartition dans le groupe le moins rempli du niveau d'arrivée
  const sizes = {}; for (const c of L) sizes[c.div] = c.clubs.length;
  for (const m of moves) { const c = getClub(G, m.id); sizes[c.div]--; }
  for (const m of moves) {
    const c = getClub(G, m.id), from = compTier(G, L.find(x => x.div === c.div) || L[0]);
    const target = tiers[m.to].slice().sort((a, b) => sizes[a.div] - sizes[b.div])[0];
    sizes[target.div]++;
    c.div = target.div;
    if (G.real) { const d = (G.real.divisions || []).find(x => x.div === target.div); if (d) { c.tier = d.tier; c.group = d.group; c.compSrc = d.srcId; } }
    if (m.to < from) { c.rep = Math.max(c.rep, 50 - (m.to - 1) * 6); S.promoted.push(c.name); if (c.id === G.clubId) news(G, `🎉 PROMOTION ! ${c.name} monte en ${target.name} !`, 'trophy'); }
    else { S.relegated.push(c.name); if (c.id === G.clubId) news(G, `😞 Relégation : ${c.name} descend en ${target.name}.`, 'loss'); }
  }
  if (S.barrages.length) news(G, `Fin de saison (${R.pays}, règlement ${R.saison}) : ${S.barrages.length} décision(s) de barrages, play-offs et playouts. Détail dans Compétitions → Règlement.`, 'info');
  G.lastBarrages = { season: G.season, log: S.barrages.slice() };
  return relegatedTop;
};

// ---------- Conformité de l'effectif ----------
function formeLocal(p, R) { return p.intake != null || p.academyOrigin != null || p.nat === R.nat || (R.nat === 'ENG' && UK.has(p.nat)); }
function conformite(G, clubId) {
  const R = reglesPays(G), E = R.effectif, ps = clubPlayers(G, clubId).filter(p => !p.academy);
  const out = [];
  if (E.nonUE) {
    const n = ps.filter(p => !UE_EEE.has(p.nat) && !(R.nat === 'ENG')).length;
    out.push({ regle: `Joueurs non-UE (max ${E.nonUE})`, val: n, ok: n <= E.nonUE });
  }
  if (E.liste) {
    const senior = ps.filter(p => p.age > (E.libreAge || 23));
    out.push({ regle: `Liste de ${E.liste} (hors moins de ${(E.libreAge || 23) + 1} ans)`, val: senior.length, ok: senior.length <= E.liste });
    if (E.nonFormesMax) { const nf = senior.filter(p => !formeLocal(p, R)).length; out.push({ regle: `Non formés localement (max ${E.nonFormesMax}, approx.)`, val: nf, ok: nf <= E.nonFormesMax }); }
    if (E.formesMin && !E.allemandsMin) { const f = ps.filter(p => formeLocal(p, R)).length; out.push({ regle: `Formés localement (min ${E.formesMin}, approx.)`, val: f, ok: f >= E.formesMin }); }
  }
  if (E.allemandsMin) {
    const n = ps.filter(p => p.nat === 'GER').length; out.push({ regle: `Joueurs allemands (min ${E.allemandsMin})`, val: n, ok: n >= E.allemandsMin });
    const f = ps.filter(p => formeLocal(p, R)).length; out.push({ regle: `Formés localement (min ${E.formesMin}, approx.)`, val: f, ok: f >= E.formesMin });
  }
  return out;
}
function nonUEApres(G, clubId, p) {
  const R = reglesPays(G); if (!R.effectif.nonUE || R.nat === 'ENG' || UE_EEE.has(p.nat)) return null;
  const n = clubPlayers(G, clubId).filter(x => !x.academy && !UE_EEE.has(x.nat)).length + 1;
  return n > R.effectif.nonUE ? n : null;
}
// contrôle au début de saison et à la fermeture des mercatos
function controleConformite(G) {
  if (!reglesActives(G) || !G.clubId) return;
  const bad = conformite(G, G.clubId).filter(r => !r.ok);
  const key = G.season + ':' + leagueRoundAt(G);
  if (!bad.length || G._confKey === key) return;
  G._confKey = key;
  news(G, `⚖ Règlement ${reglesPays(G).pays} : effectif non conforme — ${bad.map(b => `${b.regle} : ${b.val}`).join(' · ')}. Corrige-le avant la fin du mercato (Compétitions → Règlement).`, 'warn');
}
const __completeWeekR = completeWeek;
completeWeek = function (G, skip) {
  const r = __completeWeekR(G, skip);
  const lr = leagueRoundAt(G), R2 = leagueRoundsTotal(G), mid = Math.floor(R2 / 2);
  if (G.schedule[G.week - 1]?.t === 'L' && (lr === 6 || lr === mid + 4)) controleConformite(G);
  return r;
};

// ---------- Écran « Règlement » ----------
let RG_TAB = null;
function vRegles(el) {
  const R = reglesPays(G), code = Object.keys(REGLES).find(k => REGLES[k] === R);
  const tab = RG_TAB || code;
  const V = REGLES[tab];
  const st = s => `<span class="rg-st ${/officiel/.test(s) ? 'ok' : /simplifi/.test(s) ? 'mid' : 'warn'}">${esc(s)}</span>`;
  const conf = conformite(G, G.clubId);
  const zone = (n) => [n.montee ? `⬆ ${n.montee.directe} montée(s) directe(s)${n.montee.parGroupe ? ' par groupe' : ''}` : '', n.montee?.playoff ? `play-offs ${n.montee.playoff.places.join('-')}e${n.montee.playoff.vers === 'barrage' ? ' → barrage' : ''}` : '',
    n.descente?.directe ? `⬇ ${n.descente.directe} descente(s) directe(s)${n.descente.parGroupe ? ' par groupe' : ''}` : '', n.descente?.barrage ? `barrage du ${n.descente.barrage.place}e` : '', n.descente?.playout ? `playouts ${n.descente.playout.places.join('-')}e` : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<section class="card"><div class="row gap wrap"><h2 class="grow">⚖ Règlements ${esc(V.saison)}</h2>
      <label class="chk"><input type="checkbox" id="rgOn" ${reglesActives(G) ? 'checked' : ''}> Appliquer le règlement ${esc(R.pays)} à ma partie</label></div>
    <p class="hint">${G.real ? `Monde réel : règlement ${esc(R.pays)} appliqué automatiquement.` : `Monde fictif : le règlement choisi s'applique aux divisions dans l'ordre (division 1 = niveau 1).`}
      Statuts : ${st('officiel')} source consultée · ${st('simplifié')} format réduit pour le jeu · ${st('à vérifier')} source absente ou contradictoire.</p>
    ${!G.real ? `<div class="row gap wrap"><label>Règlement de ma partie <select id="rgPays">${REGLES_ORDRE.map(k => `<option value="${k}" ${k === code ? 'selected' : ''}>${REGLES[k].pays}</option>`).join('')}</select></label></div>` : ''}
    <div class="tabs">${REGLES_ORDRE.map(k => `<button class="${k === tab ? 'on' : ''}" data-rg="${k}">${REGLES[k].pays}</button>`).join('')}</div>
    ${V.niveaux.map(n => `<div class="rg-niv"><h3><span class="tier">N${n.niveau}</span> ${esc(n.nom)} <small class="muted">${n.equipes} clubs${n.groupes ? ` en ${n.groupes} groupes` : ''}</small></h3>
      <p>${esc(zone(n))}</p>
      ${n.montee?.playoff?.note ? `<p class="hint">Play-offs : ${esc(n.montee.playoff.note)}</p>` : ''}${n.descente?.barrage?.note ? `<p class="hint">Barrage : ${esc(n.descente.barrage.note)}</p>` : ''}${n.descente?.playout?.note ? `<p class="hint">Playouts : ${esc(n.descente.playout.note)}</p>` : ''}${n.descente?.note ? `<p class="hint">${esc(n.descente.note)}</p>` : ''}
      <p><b>Départage :</b> points, puis ${n.departage.map(c => CRIT_LABEL[c]).join(', ')}.</p>
      ${n.europe ? `<p><b>Europe :</b> ${esc(n.europe)}</p>` : ''}${n.note ? `<p class="hint">${esc(n.note)}</p>` : ''}
      <p>${Object.entries(n.statut).map(([k, v]) => `${k} ${st(v)}`).join(' ')}</p></div>`).join('')}
    <h3>Effectif</h3><p>${esc(V.effectif.texte)} Feuille de match : ${esc(V.effectif.feuille)}, ${V.effectif.changements} changements. ${st(V.effectif.statut)}</p>
    <h3>Contrôle financier — ${esc(V.finances.nom)}</h3><p>${esc(V.finances.texte)} ${st(V.finances.statut)}</p>
    <p class="hint">Dans le jeu : ${esc(V.sanction.texte)}</p>
    <h3>Coupe nationale — ${esc(V.coupe.nom)}</h3><p>${esc(V.coupe.texte)} ${st(V.coupe.statut)}</p>
    <h3>Barrages et play-offs</h3><p class="hint">Si ton club est concerné, ses barrages, play-offs, playouts et matchs d'appui s'ajoutent au calendrier après la dernière journée et se jouent comme de vrais matchs. Les autres sont simulés.</p>
    <h3>Mercato</h3><p>${esc(V.mercato)} <span class="muted">(dans le jeu : 6 premières journées + 4 journées à la mi-saison)</span></p>
    <p class="hint">Sources : ${V.sources.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(' · ')}</p>
  </section>
  <section class="card"><h2>Mon effectif face au règlement ${esc(R.pays)}</h2>
    <table class="tbl"><tr><th>Règle</th><th>Mon club</th><th></th></tr>${conf.map(c => `<tr><td>${esc(c.regle)}</td><td>${c.val}</td><td class="${c.ok ? 'pos' : 'neg'}">${c.ok ? 'conforme' : 'non conforme'}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aucune limite chiffrée dans ce règlement.</td></tr>'}</table>
    ${(() => { const annual = wageBill(G) * 52, me = myClub(G); return annual > 0 ? `<p>Trésorerie : <b class="${me.budget < 0 ? 'neg' : 'pos'}">${money(me.budget)}</b> · masse salariale annuelle ${money(annual)} · ${me.budget < -.3 * annual ? `<span class="neg">au-delà du seuil de sanction (${Math.round(-me.budget / annual * 100)} %)</span>` : 'sous le seuil de sanction (déficit < 30 % de la masse salariale)'}</p>` : ''; })()}
    ${G.penalty?.season === G.season ? `<p class="neg">Pénalité en cours : −${G.penalty.pts} points (${esc(G.penalty.motif)}).</p>` : ''}
    <p class="hint">« Formé localement » est approché par la nationalité du pays ou un passage par le centre de formation (le parcours exact des joueurs n'est pas dans la base).</p></section>
  ${G.lastBarrages?.log?.length ? `<section class="card"><h2>Barrages, play-offs et playouts ${G.lastBarrages.season}/${G.lastBarrages.season + 1}</h2><ul>${G.lastBarrages.log.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}`;
  el.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => { RG_TAB = b.dataset.rg; vRegles(el); });
  $('#rgOn').onchange = e => { G.reglesOn = e.target.checked; save(); toast(e.target.checked ? 'Règlement appliqué : départages, barrages et play-offs actifs.' : 'Règlement désactivé : montées/descentes simples.'); vRegles(el); };
  $('#rgPays')?.addEventListener('change', e => { G.regles = e.target.value; RG_TAB = null; save(); toast(`Règlement ${REGLES[G.regles].pays} appliqué à la partie (effet complet en fin de saison).`); vRegles(el); });
}
const __applyRoleNavR = applyRoleNav;
applyRoleNav = function () {
  __applyRoleNavR();
  const g = NAV_GROUPS.find(x => x[1].some(y => y[0] === 'comps'));
  if (g && !g[1].some(x => x[0] === 'regles')) g[1].splice(g[1].findIndex(y => y[0] === 'comps') + 1, 0, ['regles', '⚖', 'Règlement']);
  NAV_FLAT.length = 0; NAV_FLAT.push(...NAV_GROUPS.flatMap(x => x[1]));
};
const __showR = show;
show = function (v) {
  if (v !== 'regles') return __showR(v);
  if (LIVE) return;
  VIEW_HIST.push(VIEW); VIEW = 'regles';
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === 'regles'));
  renderTop(); const main = $('#main'); main.innerHTML = ''; vRegles(main); navBadges();
};
// nouvelle partie : règlement actif par défaut ; monde fictif = règlement choisi à l'accueil (France par défaut)
const __newGameR = newGame;
newGame = function (...a) {
  const g = __newGameR(...a);
  g.reglesOn = true;
  if (!g.real) { let k = 'FRA'; try { k = localStorage.getItem('mf-regles') || 'FRA'; } catch { } g.regles = REGLES[k] ? k : 'FRA'; }
  return g;
};
// choix du règlement pour une partie en monde fictif (accueil)
function reglesSelectHTML() {
  let k = 'FRA'; try { k = localStorage.getItem('mf-regles') || 'FRA'; } catch { }
  return `<label title="Règlement appliqué aux divisions fictives (départages, montées, barrages, play-offs)">Règlement <select id="reglesSel" onchange="try{localStorage.setItem('mf-regles',this.value)}catch(e){}">${REGLES_ORDRE.map(c => `<option value="${c}" ${c === k ? 'selected' : ''}>${REGLES[c].pays} ${REGLES[c].saison}</option>`).join('')}</select></label>`;
}
// zones colorées du classement selon le règlement (null = zones par défaut)
function zoneRegle(G, comp, i, n, hasUp, hasDown) {
  if (!reglesActives(G)) return null;
  const r = regleComp(G, comp); if (!r) return null;
  const tiers = leagueComps(G).map(c => compTier(G, c)), t = compTier(G, comp);
  hasUp = t > Math.min(...tiers); hasDown = t < Math.max(...tiers);
  const size = r.equipes / (r.groupes || 1), fromTop = i + 1, fromBottomPlace = size - (n - 1 - i); // place réglementaire comptée depuis le bas
  if (i === 0 && !hasUp) return 'z-cl';
  if (hasUp && r.montee) { if (fromTop <= r.montee.directe) return 'z-el'; if (r.montee.playoff?.places.includes(fromTop)) return 'z-po'; }
  if (hasDown && r.descente) {
    if (n - i <= r.descente.directe) return 'z-rel';
    if (r.descente.barrage?.place === fromBottomPlace || r.descente.playout?.places.includes(fromBottomPlace)) return 'z-bar';
  }
  return i === 0 ? 'z-cl' : '';
}

// ---------- Calibrage des matchs de championnat par division ----------
// Cibles : buts par match à domicile / à l'extérieur, saisons 2014/15 à 2025/26,
// calculées depuis openfootball/football.json (domaine public, CC0) — voir RECHERCHE.md.
const CALIB_REEL = {
  ENG: [[1.543, 1.259], [1.408, 1.133], [1.423, 1.186], [1.360, 1.136]],
  GER: [[1.704, 1.348], [1.552, 1.282], [1.452, 1.182]],
  ESP: [[1.504, 1.134], [1.330, 0.965]],
  FRA: [[1.498, 1.192], [1.335, 1.066]],
  ITA: [[1.483, 1.243], [1.393, 1.040]]
};
// Moteur sans correction (monde fictif, graine 7, 20 journées) : buts dom / ext par niveau
const CALIB_MOTEUR = [[1.40, 1.23], [0.91, 0.81], [0.89, 0.71]];
function calibCible(pays, tier) {
  const t = CALIB_REEL[pays] || CALIB_REEL.FRA;
  if (t[tier - 1]) return t[tier - 1];
  // niveau sans données (Ligue 3, 3e niveau espagnol/italien) : moyenne des 3e niveaux anglais et allemand, ajustée au pays
  const ref = [CALIB_REEL.ENG[2], CALIB_REEL.GER[2]], b = t[t.length - 1], r2 = [CALIB_REEL.ENG[1], CALIB_REEL.GER[1]];
  return [0, 1].map(i => b[i] * (ref[0][i] + ref[1][i]) / (r2[0][i] + r2[1][i]));
}
function matchCalib(G, f) {
  if (!G || !f || G.calibOff || !reglesActives(G)) return null;
  const comp = G.comps?.[f.comp];
  if (!comp || comp.type !== 'league') return null;
  const tier = compTier(G, comp), code = Object.keys(REGLES).find(k => REGLES[k] === reglesPays(G));
  const cible = calibCible(code, tier), base = CALIB_MOTEUR[Math.min(tier, CALIB_MOTEUR.length) - 1];
  return [clamp(cible[0] / base[0], .7, 1.9), clamp(cible[1] / base[1], .7, 1.9)];
}

// ============================================================
//  Post-saison jouable : barrages, play-offs, playouts, matchs d'appui
//  Quand ton club est concerné, ses matchs deviennent des semaines du calendrier (type 'P')
//  jouées avec le vrai moteur ; les autres duels restent simulés. Tous les résultats sont
//  mémorisés (G.post.res) : la fin de saison réutilise exactement les mêmes vainqueurs.
// ============================================================
function postDryRun(G) {
  // exécute la résolution des montées/descentes sans rien modifier ; renvoie le duel de mon club en attente
  const snap = G.clubs.map(c => [c, c.div, c.tier, c.group, c.compSrc, c.rep]);
  const inbox = G.inbox.slice(), lastB = G.lastBarrages;
  const appuis = leagueComps(G).map(c => [c, c.appuis ? c.appuis.slice() : undefined]);
  let pending = null;
  try { applyPromotions(G, { promoted: [], relegated: [] }, leagueComps(G)); }
  catch (e) { if (e && e.pendingDuel) pending = e; else throw e; }
  finally {
    for (const [c, d, t, g, s, r] of snap) { c.div = d; c.tier = t; c.group = g; c.compSrc = s; c.rep = r; }
    G.inbox = inbox; G.lastBarrages = lastB;
    for (const [c, a] of appuis) { if (a === undefined) delete c.appuis; else c.appuis = a; }
  }
  return pending;
}
function postSeasonPlan(G) {
  if (!reglesActives(G) || G.ds?.status === 'unemployed') return;
  if (!G.post || G.post.season !== G.season) G.post = { season: G.season, res: {}, live: true, weeks: [] };
  if (!G.post.live) return;
  const p = postDryRun(G);
  if (!p) { G.post.live = false; return; }
  G.comps.PO ||= { id: 'PO', type: 'post', name: 'Barrages et play-offs' };
  const { a, b, o } = p, base = { comp: 'PO', res: null, pkey: a + '-' + b, pname: o.lbl || 'Barrage', egalite: o.egalite || null, a1: a };
  if ((o.legs || 1) === 2) {
    G.post.weeks.push([{ ...base, h: b, a, leg: 1 }], [{ ...base, h: a, a: b, leg: 2, ko: true }]);
    G.schedule.push({ t: 'P', r: G.post.weeks.length - 2 }, { t: 'P', r: G.post.weeks.length - 1 });
  } else {
    G.post.weeks.push([{ ...base, h: a, a: b, ko: true, neutral: !!o.neutral }]);
    G.schedule.push({ t: 'P', r: G.post.weeks.length - 1 });
  }
  const opp = getClub(G, a === G.clubId ? b : a);
  news(G, `🔥 ${o.lbl || 'Barrage'} : ton club affronte ${opp.name}${(o.legs || 1) === 2 ? ' en aller-retour' : o.neutral ? ' sur terrain neutre' : ''}. ${o.egalite === 'mieuxClasse' ? 'À égalité, le mieux classé passe.' : ''}`, 'cup');
}
function postAfterWeek(G, e) {
  const fs = G.post?.weeks[e.r] || [];
  for (const f of fs) {
    if (!f.res) continue;
    if (f.leg === 1) { const f2 = G.post.weeks[e.r + 1]?.find(x => x.pkey === f.pkey); if (f2) f2.firstRes = [f.res[1], f.res[0]]; continue; }
    const [a, b] = f.pkey.split('-').map(Number);
    let ga, gb;
    if (f.firstRes) { ga = (f.h === a ? f.res[0] : f.res[1]) + (f.h === a ? f.firstRes[0] : f.firstRes[1]); gb = (f.h === b ? f.res[0] : f.res[1]) + (f.h === b ? f.firstRes[0] : f.firstRes[1]); }
    else { ga = f.h === a ? f.res[0] : f.res[1]; gb = f.h === b ? f.res[0] : f.res[1]; }
    let w = fixtureWinner(f), extra = f.pens ? ' (t.a.b.)' : f.et ? ' a.p.' : '';
    if (f.egalite === 'mieuxClasse' && ga === gb) { w = a; extra = ' (le mieux classé passe à égalité)'; }
    if (w == null) w = a;
    const A = getClub(G, a).name, B = getClub(G, b).name;
    G.post.res[f.pkey] = { w, l: w === a ? b : a, txt: `${f.firstRes ? `cumul ${A} ${ga}-${gb} ${B}` : `${A} ${ga}-${gb} ${B}`}${extra} → ${getClub(G, w).name}` };
    news(G, `${f.pname} : ${G.post.res[f.pkey].txt}. ${w === G.clubId ? '✅ Qualifié !' : '❌ Éliminé.'}`, w === G.clubId ? 'trophy' : 'loss');
  }
}
// calendrier : semaines de post-saison
const __weekFixturesR = weekFixtures;
weekFixtures = function (G, w = G.week) { const e = G.schedule[w]; if (e?.t === 'P') return G.post?.weeks[e.r] || []; return __weekFixturesR(G, w); };
const __weekLabelR = weekLabel;
weekLabel = function (G, w = G.week) {
  const e = G.schedule?.[w]; if (e?.t !== 'P') return __weekLabelR(G, w);
  const f = G.post?.weeks[e.r]?.[0]; return f ? f.pname + (f.leg === 1 ? ' (aller)' : f.leg === 2 ? ' (retour)' : '') : 'Barrages';
};
const __dateOfWeekR = dateOfWeek;
dateOfWeek = function (G, w) {
  if (G.schedule[w]?.t !== 'P') return __dateOfWeekR(G, w);
  let wl = w; while (wl > 0 && G.schedule[wl].t === 'P') wl--;
  const d = __dateOfWeekR(G, wl); d.setDate(d.getDate() + (w - wl) * 4); return d;
};
const __completeWeekP = completeWeek;
completeWeek = function (G, skip) {
  const e = G.schedule[G.week];
  const r = __completeWeekP(G, skip);
  if (e?.t === 'P') postAfterWeek(G, e);
  if (r !== 'sacked' && G.week >= G.schedule.length) postSeasonPlan(G);
  return r;
};

// ============================================================
//  Coupes nationales, mercato et sanctions financières selon le pays
// ============================================================
function reglesCoupe(G) { return reglesPays(G).coupe; }
const __newGameC2 = newGame;
newGame = function (...a) {
  const g = __newGameC2(...a);
  const prev = G; G = g;
  try { const cp = reglesCoupe(g); if (cp && (!g.real || /format de jeu/i.test(g.cupName || ''))) { g.cupName = cp.nom; if (g.comps.CUP) g.comps.CUP.name = cp.nom; } hotesCoupe(g); }
  finally { G = prev; }
  return g;
};
const __setupSeasonR = setupSeason;
setupSeason = function (G) {
  __setupSeasonR(G);
  // pénalité de points décidée la saison précédente
  if (G.penalty && G.penalty.season === G.season) for (const c of leagueComps(G)) if (c.clubs.includes(G.penalty.club)) { c.pen = { [G.penalty.club]: G.penalty.pts }; news(G, `⚖ ${G.penalty.motif} : ${getClub(G, G.penalty.club).name} commence la saison avec −${G.penalty.pts} points.`, 'board'); }
};
const __standingsPen = standings;
standings = function (G, compId) {
  const t = __standingsPen(G, compId), pen = G.comps[compId]?.pen;
  if (!pen) return t;
  for (const r of t) if (pen[r.id]) { r.pts -= pen[r.id]; r.pen = pen[r.id]; }
  const comp = G.comps[compId], rule = reglesActives(G) && regleComp(G, comp);
  return rule ? sortWithRules(G, t, comp.fixtures, rule.departage) : t.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
};
function hotesCoupe(G) {
  const cp = reglesActives(G) && reglesCoupe(G); if (!cp) return;
  const C = G.comps.CUP, round = C.rounds[C.rounds.length - 1]; if (!round) return;
  const finale = C.alive.length === 2;
  const tier = id => { const L = clubLeague(G, id); return L ? compTier(G, L) : 9; };
  for (const t of round.ties) {
    if (t.res) continue;
    if (finale) { t.neutral = true; continue; }
    let h = t.h, a = t.a;
    if (cp.hote === 'mieuxClasse') { if (tier(h) > tier(a) || (tier(h) === tier(a) && getClub(G, h).rep < getClub(G, a).rep)) [h, a] = [a, h]; }
    else if (cp.hote === 'tirage') { if (rnd() < .5) [h, a] = [a, h]; }
    else if (tier(h) < tier(a)) [h, a] = [a, h]; // le club de division inférieure reçoit
    t.h = h; t.a = a;
  }
  if (finale) news(G, `${C.name} : finale sur terrain neutre.`, 'cup');
}
const __drawCupR = drawCup;
drawCup = function (G) { __drawCupR(G); hotesCoupe(G); };
// mercato : limite de joueurs non-UE à la signature
function blocageNonUE(pid) {
  if (!G || !reglesActives(G)) return false;
  const p = getPlayer(G, pid); if (!p) return false;
  const n = nonUEApres(G, G.clubId, p);
  if (n) { toast(`Règlement ${reglesPays(G).pays} : ${p.name} serait ton ${n}e joueur non-UE (maximum ${reglesPays(G).effectif.nonUE}). Libère ou vends un joueur non-UE d'abord.`, 'err'); return true; }
  return false;
}
if (typeof offerModal === 'function') { const __offerModalR = offerModal; offerModal = function (pid) { if (getPlayer(G, pid)?.club !== G.clubId && blocageNonUE(pid)) return; return __offerModalR(pid); }; }
if (typeof loanInModal === 'function') { const __loanInR = loanInModal; loanInModal = function (pid) { if (blocageNonUE(pid)) return; return __loanInR(pid); }; }
// contrôle financier de fin de saison (club du joueur)
function controleFinancier(G, S) {
  const R = reglesPays(G), san = R.sanction; if (!san || !reglesActives(G)) return;
  const me = myClub(G), annual = wageBill(G) * 52, deficit = -me.budget;
  if (annual <= 0 || deficit <= .3 * annual) { if (G.board.ban && G.banReason === 'regles' && me.budget >= 0) { G.board.ban = false; G.banReason = null; news(G, `⚖ ${R.finances.nom} : comptes assainis, recrutement de nouveau autorisé.`, 'board'); } return; }
  const lourd = deficit > .6 * annual, type = lourd ? san.lourd : san.leger;
  const pct = Math.round(deficit / annual * 100);
  (S.sanctions ||= []).push(`${R.finances.nom} : déficit = ${pct} % de la masse salariale annuelle`);
  if (type === 'ban') { G.board.ban = true; G.banReason = 'regles'; news(G, `⚖ ${R.finances.nom} : déficit de ${money(deficit)} (${pct} % de la masse salariale). Recrutement bloqué jusqu'à l'assainissement des comptes.`, 'board'); }
  else if (type === 'points') {
    const L = clubLeague(G, me.id), pts = (L && compTier(G, L) === 1 ? san.points[0] : san.points[1]);
    G.penalty = { season: G.season + 1, club: me.id, pts, motif: R.finances.nom };
    G.board.ban = true; G.banReason = 'regles';
    news(G, `⚖ ${R.finances.nom} : déficit de ${money(deficit)} (${pct} %). Sanction : −${pts} points la saison prochaine et recrutement bloqué.`, 'loss');
  } else if (type === 'retro') {
    const L = leagueComps(G), tiers = [...new Set(L.map(c => compTier(G, c)))].sort((a, b) => a - b);
    const cur = compTier(G, L.find(c => c.div === me.div) || clubLeague(G, me.id)), next = tiers.find(t => t > cur);
    if (next == null) { G.board.ban = true; G.banReason = 'regles'; news(G, `⚖ ${R.finances.nom} : déficit de ${money(deficit)} (${pct} %). Recrutement bloqué (pas de division inférieure simulée).`, 'loss'); return; }
    // échange avec le meilleur club non promu du niveau inférieur
    const down = L.filter(c => compTier(G, c) === next);
    const target = down[0], cand = standings(G, target.id).map(r => getClub(G, r.id)).find(c => c.div === target.div && !S.promoted.includes(c.name));
    const from = me.div;
    me.div = target.div; if (G.real) { const d = G.real.divisions.find(x => x.div === target.div); if (d) { me.tier = d.tier; me.group = d.group; me.compSrc = d.srcId; } }
    if (cand) { cand.div = from; if (G.real) { const d = G.real.divisions.find(x => x.div === from); if (d) { cand.tier = d.tier; cand.group = d.group; cand.compSrc = d.srcId; } } S.promoted.push(cand.name + ' (repêché)'); }
    S.relegated.push(me.name + ' (rétrogradation administrative)');
    G.board.ban = true; G.banReason = 'regles';
    news(G, `⚖ ${R.finances.nom} : déficit de ${money(deficit)} (${pct} %). Rétrogradation administrative en ${target.name}${cand ? ` ; ${cand.name} est repêché` : ''}.`, 'loss');
  }
}
const __applyPromotionsF = applyPromotions;
applyPromotions = function (G, S, L) {
  const r = __applyPromotionsF(G, S, L);
  if (!(G.post?.live)) controleFinancier(G, S); // pas pendant les simulations de post-saison
  return r;
};
// avertissement à mi-saison
const __completeWeekF = completeWeek;
completeWeek = function (G, skip) {
  const r = __completeWeekF(G, skip);
  const R2 = leagueRoundsTotal(G), lr = leagueRoundAt(G);
  if (reglesActives(G) && G.schedule[G.week - 1]?.t === 'L' && lr === Math.floor(R2 * .66)) {
    const me = myClub(G), annual = wageBill(G) * 52;
    if (annual > 0 && -me.budget > .3 * annual) news(G, `⚖ Alerte ${reglesPays(G).finances.nom} : déficit de ${money(-me.budget)} (${Math.round(-me.budget / annual * 100)} % de la masse salariale). Sanction en fin de saison si rien ne change : ${reglesPays(G).sanction.texte}`, 'warn');
  }
  return r;
};
