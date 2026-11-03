// ============================================================
//  Attributs détaillés (37, notés 1-20) + note de poste (moyenne pondérée) + percentiles + 30 statistiques
//  Modèle original du jeu (liste, regroupement et pondérations propres) : le moteur de match garde ses 9 attributs
//  de base ; les 37 attributs en dérivent avec un profil stable propre à chaque joueur, ou viennent des sous-notes
//  réelles (sur 99) du pack Football_Monde quand elles existent. Une progression des 9 attributs de base se répercute
//  sur les attributs détaillés qui en dépendent.
// ============================================================
// [clé, libellé, famille, parents {attribut de base: poids}, sous-notes réelles (sur 99) utilisées]
const ATTR_DETAIL = [
  // Technique (12)
  ['finition', 'Finition', 'tech', { fin: 1 }, ['attacking_finishing']],
  ['frappe', 'Frappe lointaine', 'tech', { fin: .6, tec: .4 }, ['power_long_shots', 'power_shot_power']],
  ['tete', 'Jeu de tête', 'tech', { phy: .6, fin: .4 }, ['attacking_heading_accuracy']],
  ['passeC', 'Passe courte', 'tech', { pas: 1 }, ['attacking_short_passing']],
  ['passeL', 'Passe longue', 'tech', { pas: .8, tec: .2 }, ['skill_long_passing']],
  ['centre', 'Centres', 'tech', { tec: .6, pas: .4 }, ['attacking_crossing']],
  ['dribble', 'Dribble', 'tech', { dri: 1 }, ['skill_dribbling']],
  ['controle', 'Contrôle', 'tech', { tec: .7, dri: .3 }, ['skill_ball_control']],
  ['cpa', 'Coups de pied arrêtés', 'tech', { tec: 1 }, ['skill_fk_accuracy', 'skill_curve']],
  ['penalty', 'Penalty', 'tech', { fin: .7, men: .3 }, ['mentality_penalties']],
  ['tacle', 'Tacle', 'tech', { tac: 1 }, ['defending_standing_tackle', 'defending_sliding_tackle']],
  ['marquage', 'Marquage', 'tech', { tac: .7, men: .3 }, ['defending_awareness', 'defending_marking_awareness']],
  // Mental (11)
  ['placement', 'Placement', 'ment', { men: .6, tac: .4 }, ['mentality_positioning']],
  ['anticipation', 'Anticipation', 'ment', { men: .7, tac: .3 }, ['mentality_interceptions']],
  ['vision', 'Vision du jeu', 'ment', { pas: .6, men: .4 }, ['mentality_vision']],
  ['sangfroid', 'Sang-froid', 'ment', { men: 1 }, ['mentality_composure']],
  ['decision', 'Prise de décision', 'ment', { men: .6, pas: .4 }, ['movement_reactions']],
  ['concentration', 'Concentration', 'ment', { men: 1 }, ['movement_reactions', 'mentality_composure']],
  ['agressivite', 'Agressivité', 'ment', { phy: .5, men: .5 }, ['mentality_aggression']],
  ['courage', 'Courage', 'ment', { men: .6, phy: .4 }, ['mentality_aggression', 'power_strength']],
  ['leadership', 'Leadership', 'ment', { men: 1 }, []],
  ['volume', 'Volume de jeu', 'ment', { phy: .6, men: .4 }, ['power_stamina']],
  ['collectif', 'Jeu collectif', 'ment', { pas: .5, men: .5 }, ['attacking_short_passing', 'mentality_vision']],
  // Physique (8)
  ['acceleration', 'Accélération', 'phys', { vit: 1 }, ['movement_acceleration']],
  ['vitesse', 'Vitesse de pointe', 'phys', { vit: 1 }, ['movement_sprint_speed']],
  ['agilite', 'Agilité', 'phys', { dri: .5, vit: .5 }, ['movement_agility']],
  ['equilibre', 'Équilibre', 'phys', { phy: .5, dri: .5 }, ['movement_balance']],
  ['detente', 'Détente', 'phys', { phy: 1 }, ['power_jumping']],
  ['puissance', 'Puissance', 'phys', { phy: 1 }, ['power_strength']],
  ['endurance', 'Endurance', 'phys', { phy: 1 }, ['power_stamina']],
  ['resistance', 'Résistance aux chocs', 'phys', { phy: 1 }, ['power_strength', 'power_stamina']],
  // Gardien (6)
  ['reflexes', 'Réflexes', 'gb', { gar: 1 }, ['goalkeeping_reflexes']],
  ['plongeon', 'Plongeon', 'gb', { gar: 1 }, ['goalkeeping_diving']],
  ['prise', 'Prise de balle', 'gb', { gar: 1 }, ['goalkeeping_handling']],
  ['placementGB', 'Placement (gardien)', 'gb', { gar: .7, men: .3 }, ['goalkeeping_positioning']],
  ['jeuPied', 'Jeu au pied', 'gb', { gar: .5, pas: .5 }, ['goalkeeping_kicking']],
  ['sorties', 'Sorties aériennes', 'gb', { gar: .6, phy: .4 }, ['goalkeeping_positioning', 'power_jumping']]
];
const FAMILLES = { tech: 'Technique', ment: 'Mental', phys: 'Physique', gb: 'Gardien' };
// pondérations de la note de poste (somme = 1), modèle propre au jeu
const POIDS_POSTE = {
  GB: { reflexes: .2, plongeon: .15, prise: .14, placementGB: .14, sorties: .1, jeuPied: .07, sangfroid: .06, concentration: .06, decision: .04, agilite: .04 },
  DC: { marquage: .16, tacle: .15, placement: .13, tete: .11, puissance: .09, anticipation: .08, detente: .07, concentration: .06, courage: .05, vitesse: .05, passeC: .05 },
  DG: { tacle: .12, marquage: .1, vitesse: .12, acceleration: .1, centre: .11, endurance: .1, placement: .08, passeC: .08, dribble: .07, volume: .07, anticipation: .05 },
  DD: { tacle: .12, marquage: .1, vitesse: .12, acceleration: .1, centre: .11, endurance: .1, placement: .08, passeC: .08, dribble: .07, volume: .07, anticipation: .05 },
  MDC: { tacle: .14, anticipation: .12, placement: .12, passeC: .12, marquage: .08, decision: .1, volume: .09, puissance: .07, passeL: .06, sangfroid: .05, collectif: .05 },
  MC: { passeC: .15, vision: .13, decision: .12, controle: .1, passeL: .09, volume: .09, collectif: .09, sangfroid: .07, endurance: .06, tacle: .05, frappe: .05 },
  MOC: { vision: .14, passeC: .12, controle: .12, dribble: .12, decision: .1, frappe: .08, finition: .08, sangfroid: .07, agilite: .07, collectif: .05, cpa: .05 },
  AG: { dribble: .15, acceleration: .13, vitesse: .12, centre: .1, controle: .1, finition: .08, agilite: .08, passeC: .07, decision: .06, volume: .06, frappe: .05 },
  AD: { dribble: .15, acceleration: .13, vitesse: .12, centre: .1, controle: .1, finition: .08, agilite: .08, passeC: .07, decision: .06, volume: .06, frappe: .05 },
  BU: { finition: .2, placement: .12, sangfroid: .1, tete: .1, acceleration: .09, controle: .09, frappe: .07, puissance: .07, vitesse: .06, decision: .05, penalty: .05 }
};

// ---------- calcul ----------
const ecartStable = (p, k) => { const h = (typeof hashTrait === 'function' ? hashTrait : s => s.length)(`attr|${p.srcId || p.id}|${p.name}|${k}`); return ((h % 1000) / 1000 + ((h >>> 10) % 1000) / 1000 + ((h >>> 20) % 1000) / 1000 - 1.5) * 2.4; }; // ~ -3,6..+3,6, centré
function moyParents(p, parents) { let s = 0, w = 0; for (const [a, x] of Object.entries(parents)) { s += (p.attrs[a] ?? 10) * x; w += x; } return s / (w || 1); }
function moyParents0(p, parents) { const b = p.attrs0 || p.attrs; let s = 0, w = 0; for (const [a, x] of Object.entries(parents)) { s += (b[a] ?? 10) * x; w += x; } return s / (w || 1); }
function attributsDetail(p) {
  const out = {};
  for (const [k, , fam, parents, srcs] of ATTR_DETAIL) {
    let v;
    const reel = p.detail99 && srcs.map(s => p.detail99[s]).filter(x => x != null);
    if (reel && reel.length) v = reel.reduce((a, b) => a + b, 0) / reel.length / 99 * 20 + (moyParents(p, parents) - moyParents0(p, parents)); // sous-note réelle + progression depuis
    else v = moyParents(p, parents) + ecartStable(p, k) * (fam === 'gb' && p.pos !== 'GB' ? .3 : 1);
    if (k === 'leadership') v += (typeof traitsDe === 'function' && traitsDe(p).includes('leader') ? 4 : 0) + (p.age >= 29 ? 1.5 : p.age <= 20 ? -2 : 0);
    if (fam === 'gb' && p.pos !== 'GB') v = Math.min(v, 6 + ecartStable(p, k));
    out[k] = Math.max(1, Math.min(20, Math.round(v)));
  }
  return out;
}
function notePoste(p, poste = p.pos, D = attributsDetail(p)) {
  const w = POIDS_POSTE[poste] || POIDS_POSTE.MC;
  let s = 0, t = 0; for (const [k, x] of Object.entries(w)) { s += (D[k] ?? 10) * x; t += x; }
  return s / t; // sur 20
}
const noteSur100 = n20 => Math.round(n20 * 5);
function meilleursPostes(p, D = attributsDetail(p)) { return Object.keys(POIDS_POSTE).map(r => [r, notePoste(p, r, D)]).sort((a, b) => b[1] - a[1]).slice(0, 3); }

// percentiles par poste (calculés à la demande, en cache par semaine)
let CACHE_PCT = null;
function percentile(p, k) {
  const cle = `${G.season}|${G.week}|${p.pos}`;
  if (!CACHE_PCT || CACHE_PCT.cle !== cle) {
    const pairs = G.players.filter(x => x.pos === p.pos && x.club != null && !x.academy);
    const tab = {}; for (const x of pairs) { const D = attributsDetail(x); for (const [a] of ATTR_DETAIL) (tab[a] ||= []).push(D[a]); }
    for (const a in tab) tab[a].sort((u, v) => u - v);
    CACHE_PCT = { cle, tab, n: pairs.length };
  }
  const arr = CACHE_PCT.tab[k] || [], v = attributsDetail(p)[k];
  let n = 0; for (const x of arr) if (x < v) n++; else break;
  return Math.round(n / Math.max(1, arr.length) * 100);
}

// ---------- 30 statistiques de saison ----------
function statsDetaillees(p) {
  const s = p.stats || {}, m = Math.max(1, s.min || 0), p90 = x => (x || 0) / m * 90, apps = s.apps || 0;
  const f = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('fr-FR');
  const tirs = s.sh || 0, xg = s.xg || 0;
  return [
    ['Matchs joués', apps], ['Minutes', s.min || 0], ['Minutes par match', apps ? Math.round(m / apps) : 0], ['Note moyenne', apps ? f(s.rating / apps) : '—'],
    ['Homme du match', s.motm || 0], ['Buts', s.goals || 0], ['Buts en championnat', s.lg || 0], ['Passes décisives', s.assists || 0],
    ['Buts + passes', (s.goals || 0) + (s.assists || 0)], ['Buts / 90 min', f(p90(s.goals))], ['Passes déc. / 90 min', f(p90(s.assists))],
    ['Contributions / 90 min', f(p90((s.goals || 0) + (s.assists || 0)))], ['Tirs', tirs], ['Tirs / 90 min', f(p90(tirs))],
    ['Buts attendus (xG)', f(xg)], ['xG / 90 min', f(p90(xg))], ['Buts − xG', f((s.goals || 0) - xg)], ['Conversion des tirs', tirs ? Math.round((s.goals || 0) / tirs * 100) + ' %' : '—'],
    ['Passes tentées', s.pas || 0], ['Passes réussies', s.pasOk || 0], ['Réussite des passes', s.pas ? Math.round(s.pasOk / s.pas * 100) + ' %' : '—'],
    ['Passes / 90 min', f(p90(s.pas), 1)], ['Passes clés', s.kp || 0], ['Passes clés / 90 min', f(p90(s.kp))],
    ['Dribbles réussis', s.dri || 0], ['Dribbles / 90 min', f(p90(s.dri))], ['Tacles', s.tkl || 0], ['Interceptions', s.int || 0],
    ['Actions défensives / 90 min', f(p90((s.tkl || 0) + (s.int || 0)))], ['Arrêts', s.sav || 0], ['Arrêts / 90 min', f(p90(s.sav))],
    ['Cartons jaunes', s.yel || 0], ['Cartons rouges', s.red || 0], ['Cartons / 90 min', f(p90((s.yel || 0) + (s.red || 0)))]
  ];
}

// ---------- affichage (fiche joueur) ----------
const POSTES_PLURIEL = { GB: 'gardiens', DC: 'défenseurs centraux', DG: 'latéraux gauches', DD: 'latéraux droits', MDC: 'milieux défensifs', MC: 'milieux centraux', MOC: 'milieux offensifs', AG: 'ailiers gauches', AD: 'ailiers droits', BU: 'buteurs' };
const posteAuPluriel = pos => POSTES_PLURIEL[pos] || (ROLES[pos]?.label || pos).toLowerCase() + 's';
const couleurAttr = v => v >= 16 ? 'a-top' : v >= 13 ? 'a-bon' : v >= 9 ? 'a-moy' : v >= 6 ? 'a-faible' : 'a-tres';
function blocAttributs(p) {
  const D = attributsDetail(p), n20 = notePoste(p, p.pos, D), connu = typeof knows !== 'function' || knows(G, p);
  const flou = v => connu ? v : `${Math.max(1, v - 2)}-${Math.min(20, v + 2)}`;
  const fams = ['tech', 'ment', 'phys', ...(p.pos === 'GB' ? ['gb'] : [])];
  const bp = meilleursPostes(p, D).map(([r, n]) => `${r} ${noteSur100(n)}`).join(' · ');
  return `<section class="attr36"><div class="a36-tete"><div class="a36-note" style="--n:${n20 / 20}"><b>${connu ? noteSur100(n20) : '?'}</b><small>/100</small></div>
      <div><b>Note de poste (${esc(ROLES[p.pos]?.label || p.pos)})</b><small>moyenne pondérée de ${Object.keys(POIDS_POSTE[p.pos] || {}).length} attributs clés · ${connu ? n20.toFixed(1).replace('.', ',') : '?'} sur 20</small><small>Meilleurs postes : ${connu ? bp : 'à découvrir'}</small></div></div>
    <div class="a36-grille">${fams.map(fm => `<div class="a36-fam"><h4>${FAMILLES[fm]}</h4>${ATTR_DETAIL.filter(a => a[2] === fm).map(([k, l]) => {
      const v = D[k], cle = (POIDS_POSTE[p.pos] || {})[k];
      return `<div class="a36-l ${cle ? 'cle' : ''}" data-tip="${esc(l)}${connu ? ` : ${v}/20, mieux que ${percentile(p, k)} % des ${esc(posteAuPluriel(p.pos))}` : ''}${cle ? ` · compte pour ${Math.round(cle * 100)} % de la note de poste` : ''}"><span>${esc(l)}</span><b class="${connu ? couleurAttr(v) : 'a-flou'}">${flou(v)}</b></div>`;
    }).join('')}</div>`).join('')}</div>
    <p class="hint">${p.detail99 ? 'Attributs issus des sous-notes réelles du pack (sur 99, ramenées sur 20), plus la progression en jeu.' : 'Attributs dérivés des 9 qualités du moteur de match, avec un profil propre au joueur.'} En gras : attributs clés du poste.${connu ? '' : ' Envoie ta cellule de recrutement pour connaître les valeurs exactes.'}</p></section>`;
}
const __playerModalA = playerModal;
playerModal = function (pid, tab = 'profil') {
  __playerModalA(pid, tab);
  const p = getPlayer(G, pid); if (!p) return;
  if (tab === 'profil') {
    const zone = $('#modal .phys') || $('#modal .traits') || $('#modal .tabs');
    zone?.insertAdjacentHTML('afterend', blocAttributs(p));
  }
  if (tab === 'stats') {
    const S = statsDetaillees(p);
    ($('#modal .tabs'))?.insertAdjacentHTML('afterend', `<section class="stats30"><h3>Statistiques détaillées de la saison (${S.length})</h3><div class="s30-grille">${S.map(([l, v]) => `<div><small>${esc(l)}</small><b>${esc(String(v))}</b></div>`).join('')}</div></section>`);
  }
};
