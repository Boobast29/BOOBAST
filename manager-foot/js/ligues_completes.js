// ============================================================
//  Championnats manquants dans le monde étendu (Europe, Amériques, Asie, Afrique)
//  Le monde étendu FM26 couvre 5 pays (Angleterre, France, Allemagne, Italie, Espagne), sans club étranger : pas de
//  Portugal, Pays-Bas, Belgique, Turquie, Écosse… On y ajoute les premières divisions européennes avec leurs vrais
//  clubs (js/ligues_europe_clubs.js, openfootball CC0) ; les effectifs sont générés par le jeu (niveau selon le
//  championnat et le rang du club), puisque ces sources ne donnent pas les joueurs. Ces championnats sont simulés
//  chaque semaine (js/ligues_etrangeres.js) et leurs joueurs sont recrutables.
// ============================================================
// niveau (réputation) du meilleur club de chaque championnat : échelle du jeu
const REP_TETE = { POR: 86, NED: 84, BEL: 80, TUR: 80, RUS: 76, SCO: 76, AUT: 75, GRE: 75, CZE: 73, CRO: 73, SUI: 72, DEN: 72, UKR: 72,
  NOR: 70, SRB: 71, POL: 70, SWE: 68, ROU: 67, HUN: 67, CYP: 67, BUL: 65, AZE: 64, SVK: 63, SVN: 61, BLR: 60, GEO: 60, BIH: 60,
  KVX: 58, MDA: 59, FIN: 58, ISL: 57, IRL: 57, MKD: 56, MNE: 55, LVA: 56, LTU: 54, EST: 54, NIR: 54, ARM: 56, ALB: 56,
  // hors d'Europe (football.json) : Amérique du Sud et du Nord, Asie, Afrique
  BRA: 84, ARG: 80, MEX: 78, USA: 76, JPN: 72, COL: 70, CHN: 66, EGY: 66, MAR: 65, AUS: 64, ALG: 60 };
const MONDE_ETENDU_PAYS = ['ENG', 'FRA', 'GER', 'ITA', 'ESP'];
// championnats de niveau suffisant seulement (vitesse de simulation : chaque club ajouté pèse sur chaque semaine)
// seuil 63 : avec les 18 compétitions du monde étendu (D1 à D3 des 5 grands pays), on dépasse les 40 meilleurs
// championnats du monde (classement de niveau type Opta : la League One anglaise passe devant la D1 estonienne)
const LIGUES_NIVEAU_MIN = 63;
function courtClub(nom) {
  const m = nom.replace(/\b(FC|FK|SK|SC|AC|CF|KV|AIF|IF|NK|HNK|PFC|CFR|BK|SV|KF|OFK|SP|SS|TC|AS|SL)\b/g, '').trim().split(/\s+/)[0] || nom;
  return m.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CLB';
}
function ajouterLiguesEuropeennes(W) {
  if (typeof LIGUES_EUROPE_CLUBS === 'undefined') return W;
  const pris = new Set(W.clubs.map(c => c.name));
  let id = Math.max(...W.clubs.map(c => c.id)) + 1;
  NEXT_PID = Math.max(NEXT_PID, 0, ...W.players.map(p => p.id)) + 1;
  for (const [pays, L] of Object.entries(LIGUES_EUROPE_CLUBS)) {
    const tete = REP_TETE[pays];
    if (!tete || tete < LIGUES_NIVEAU_MIN || MONDE_ETENDU_PAYS.includes(pays) || L.clubs.length < 6) continue;
    const ecart = tete >= 70 ? 24 : 16, n = L.clubs.length;
    L.clubs.forEach((nom, i) => {
      if (pris.has(nom)) return; pris.add(nom);
      const rep = Math.round(tete - ecart * Math.pow(i / Math.max(1, n - 1), .8));
      const c1 = pick(PALETTE); let c2 = pick(PALETTE); if (c2 === c1) c2 = '#ffffff';
      const club = { id: id++, name: nom, short: courtClub(nom), colors: [c1, c2], rep, div: 0, foreign: true, country: pays, realName: true,
        leagueReal: L.nom, stadium: `Stade de ${nom.split(' ').slice(-1)[0]}`, capacity: 6000 + Math.round(rep * rep * 4),
        budget: roundMoney(Math.pow(rep / 50, 5) * 2.5e6 * (typeof COUNTRY_ECO !== 'undefined' ? COUNTRY_ECO[pays] ?? .5 : .5)), logo: null, style: clubStyle(), coh: 70, trophies: [] };
      W.clubs.push(club);
      const q = 8.6 + (rep - 50) / 40 * 5.2, taille = rep >= 70 ? 20 : 18;
      const squad = SQUAD_TEMPLATE.slice(0, taille).map((role, k) => genPlayer(role, q + (k % 3 === 0 ? 1 : k % 3 === 1 ? 0 : -1.1) + gauss() * .9, { club: club.id, rep, nat: rnd() < .7 ? pays : undefined }));
      squad.forEach(p => { p.value = calcValue(p); p.wage = roundMoney(p.wage * .6); p.fictional = true; p.regenId ||= 'gen_' + p.id; });
      W.players.push(...squad);
    });
  }
  return W;
}
if (typeof construireMondeComplet === 'function') {
  const __construireMondeCompletLC = construireMondeComplet;
  construireMondeComplet = function () { return ajouterLiguesEuropeennes(__construireMondeCompletLC.apply(this, arguments)); };
}

// Vitesse : pendant le recrutement de l'IA (chaque club passe en revue tous les joueurs), le niveau et la valeur
// de chaque joueur sont calculés une seule fois (aucun attribut ne change pendant ce passage).
let MEMO_NIVEAU = null, MEMO_VALEUR = null;
if (typeof playerOvr === 'function') {
  const __playerOvrLC = playerOvr;
  playerOvr = function (p) { if (!MEMO_NIVEAU) return __playerOvrLC(p); let v = MEMO_NIVEAU.get(p); if (v === undefined) { v = __playerOvrLC(p); MEMO_NIVEAU.set(p, v); } return v; };
}
if (typeof calcValue === 'function') {
  const __calcValueLC = calcValue;
  calcValue = function (p) { if (!MEMO_VALEUR) return __calcValueLC(p); let v = MEMO_VALEUR.get(p); if (v === undefined) { v = __calcValueLC(p); MEMO_VALEUR.set(p, v); } return v; };
}
window.addEventListener('load', () => {
  if (typeof aiTransfers !== 'function') return;
  const __aiTransfersLC = aiTransfers;
  aiTransfers = function () {
    MEMO_NIVEAU = new Map(); MEMO_VALEUR = new Map();
    try { return __aiTransfersLC.apply(this, arguments); } finally { MEMO_NIVEAU = MEMO_VALEUR = null; }
  };
});
