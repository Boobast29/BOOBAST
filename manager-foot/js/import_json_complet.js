// ============================================================
//  Import d'un fichier JSON complet (joueurs, staff, clubs) avec attributs sur n'importe quelle échelle
//  - Échelle : champ « echelle » / « scale » du fichier, sinon détectée (valeur maximale rencontrée : 20, 36, 99 ou 100).
//    Ex. des caractéristiques sur 36 points : 36 → 20/20, 18 → 10/20.
//  - Attributs : noms français ou anglais (Football Manager, FIFA/EA), reliés aux 37 attributs détaillés du jeu
//    (js/attributs.js). Les 9 qualités du moteur sont recalculées à partir de ces attributs.
//  - Structure acceptée : { clubs: [{ nom, ..., joueurs: [...] }] } ou { clubs: [...], joueurs: [{ ..., club: "Nom" }] },
//    clés françaises ou anglaises (name/nom, age/âge, nationalite/nationality, poste/position, attributs/attributes…).
//  - Staff : { staff: [{ nom, role, club, niveau (1-5) ou attributs }] } → adjoint, entraîneur technique, kiné, recruteur,
//    formateur du club, appliqués quand tu prends ce club.
//  Le format interne (export du jeu) et l'ancien format simple restent acceptés tels quels.
// ============================================================
const normCle = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const SYN_ATTR = (() => {
  const m = {};
  const add = (k, ...noms) => { for (const n of noms) m[normCle(n)] = k; };
  for (const [k, label] of (typeof ATTR_DETAIL !== 'undefined' ? ATTR_DETAIL : [])) add(k, k, label);
  // Football Manager (anglais) et équivalents français courants
  add('finition', 'finishing', 'finish'); add('frappe', 'longshots', 'long shots', 'frappe de loin', 'tirs de loin', 'shot power', 'puissance de frappe');
  add('tete', 'heading', 'jeu de tete', 'tete', 'heading accuracy'); add('passeC', 'passing', 'passe', 'passes', 'short passing', 'passes courtes');
  add('passeL', 'long passing', 'passes longues', 'jeu long'); add('centre', 'crossing', 'centres', 'centre');
  add('dribble', 'dribbling', 'dribbles'); add('controle', 'first touch', 'firsttouch', 'controle', 'ball control', 'controle de balle', 'technique');
  add('cpa', 'free kick taking', 'freekicks', 'coups francs', 'corners', 'coups de pied arretes', 'curve', 'fk accuracy');
  add('penalty', 'penalty taking', 'penalties', 'tirs au but', 'penaltys'); add('tacle', 'tackling', 'tacles', 'standing tackle', 'sliding tackle');
  add('marquage', 'marking', 'defensive awareness'); add('placement', 'positioning', 'off the ball', 'appels de balle', 'deplacement');
  add('anticipation', 'anticipation', 'interceptions'); add('vision', 'vision', 'vision du jeu', 'creativite');
  add('sangfroid', 'composure', 'sang froid', 'calme'); add('decision', 'decisions', 'prise de decision', 'reactions');
  add('concentration', 'concentration'); add('agressivite', 'aggression', 'agressivite'); add('courage', 'bravery', 'bravoure', 'courage');
  add('leadership', 'leadership', 'meneur', 'charisme'); add('volume', 'work rate', 'workrate', 'volume de jeu', 'activite');
  add('collectif', 'teamwork', 'jeu collectif', 'esprit d equipe'); add('acceleration', 'acceleration');
  add('vitesse', 'pace', 'sprint speed', 'vitesse de pointe', 'vitesse'); add('agilite', 'agility', 'agilite');
  add('equilibre', 'balance', 'equilibre'); add('detente', 'jumping reach', 'jumping', 'detente', 'detente verticale');
  add('puissance', 'strength', 'force', 'puissance'); add('endurance', 'stamina', 'endurance', 'natural fitness', 'condition physique naturelle');
  add('resistance', 'resistance aux chocs', 'robustesse', 'injury resistance');
  add('reflexes', 'reflexes', 'gk reflexes'); add('plongeon', 'diving', 'one on ones', 'un contre un', 'plongeon', 'gk diving');
  add('prise', 'handling', 'prise de balle', 'gk handling'); add('placementGB', 'command of area', 'gk positioning', 'placement gardien', 'autorite dans la surface');
  add('jeuPied', 'kicking', 'jeu au pied', 'gk kicking', 'degagement', 'relance');
  return m;
})();
const SYN_POSTE = { GB: ['gb', 'g', 'gk', 'gardien', 'goalkeeper'], DC: ['dc', 'cb', 'd c', 'defenseurcentral', 'centreback', 'sw', 'libero'], DG: ['dg', 'lb', 'dl', 'lateralgauche', 'leftback', 'lwb', 'wbl', 'piston gauche'],
  DD: ['dd', 'rb', 'dr', 'lateraldroit', 'rightback', 'rwb', 'wbr'], MDC: ['mdc', 'dm', 'cdm', 'milieudefensif', 'sentinelle'], MC: ['mc', 'cm', 'milieucentral', 'milieu', 'ml', 'mr', 'mg', 'md'],
  MOC: ['moc', 'am', 'cam', 'amc', 'milieuoffensif', 'meneurdejeu'], AG: ['ag', 'lw', 'aml', 'ailiergauche', 'leftwinger'], AD: ['ad', 'rw', 'amr', 'ailierdroit', 'rightwinger'],
  BU: ['bu', 'st', 'cf', 'att', 'ac', 'attaquant', 'buteur', 'avantcentre', 'striker', 'stc'] };
const POSTE_DE = Object.fromEntries(Object.entries(SYN_POSTE).flatMap(([k, L]) => L.map(x => [normCle(x), k])));
const SYN_STAFF = { assistant: ['adjoint', 'assistant', 'entraineur adjoint', 'assistant manager'], coach: ['entraineur technique', 'coach', 'entraineur', 'technical coach', 'entraineur des attaquants', 'entraineur des defenseurs'],
  physio: ['kine', 'kinesitherapeute', 'physio', 'physiotherapist', 'preparateur physique', 'fitness coach', 'medecin'], scout: ['recruteur', 'scout', 'superviseur', 'chief scout'],
  youth: ['formateur', 'youth', 'entraineur des jeunes', 'responsable du centre de formation', 'head of youth development'] };
const STAFF_DE = Object.fromEntries(Object.entries(SYN_STAFF).flatMap(([k, L]) => L.map(x => [normCle(x), k])));

const champ = (o, ...noms) => { for (const n of noms) for (const k of Object.keys(o || {})) if (normCle(k) === normCle(n)) return o[k]; return undefined; };
function attributsBruts(j) {
  const a = champ(j, 'attributs', 'attributes', 'caracteristiques', 'stats', 'notes');
  if (a && typeof a === 'object' && !Array.isArray(a)) {
    const plat = {};
    for (const [k, v] of Object.entries(a)) { if (v && typeof v === 'object') Object.assign(plat, v); else plat[k] = v; } // familles imbriquées (technique, mental…)
    return plat;
  }
  return Object.fromEntries(Object.entries(j).filter(([k, v]) => typeof v === 'number' && SYN_ATTR[normCle(k)]));
}
function detecterEchelle(raw, joueurs) {
  const e = +champ(raw, 'echelle', 'scale', 'echelleattributs');
  if (e > 0) return e;
  let max = 0;
  for (const j of joueurs) for (const [k, v] of Object.entries(attributsBruts(j))) if (SYN_ATTR[normCle(k)] && typeof v === 'number') max = Math.max(max, v);
  return max <= 20 ? 20 : max <= 36 ? 36 : max <= 99 ? 99 : 100;
}
function convertirJoueur(j, echelle) {
  const detail20 = {}, inconnus = [];
  for (const [k, v] of Object.entries(attributsBruts(j))) {
    const cle = SYN_ATTR[normCle(k)];
    if (cle && typeof v === 'number') detail20[cle] = Math.max(1, Math.min(20, Math.round(v / echelle * 20 * 10) / 10));
    else if (typeof v === 'number') inconnus.push(k);
  }
  // 9 qualités du moteur : moyenne pondérée des attributs détaillés qui en dépendent
  const attrs = {};
  for (const q of Object.keys(ATTRS)) {
    let s = 0, w = 0;
    for (const [k, , , parents] of ATTR_DETAIL) if (parents[q] && detail20[k] != null) { s += detail20[k] * parents[q]; w += parents[q]; }
    if (w) attrs[q] = Math.round(s / w);
  }
  const posBrut = String(champ(j, 'poste', 'position', 'pos', 'postes', 'positions') || '').split(/[,/;]/)[0];
  const age = +champ(j, 'age', 'âge') || (champ(j, 'naissance', 'datedenaissance', 'birthdate', 'dob') ? new Date().getFullYear() - +String(champ(j, 'naissance', 'datedenaissance', 'birthdate', 'dob')).slice(0, 4) : null);
  const pied = String(champ(j, 'pied', 'piedfort', 'foot', 'preferredfoot') || '').toLowerCase();
  const pot = +champ(j, 'potentiel', 'potential', 'pot');
  return {
    name: champ(j, 'nom', 'name', 'nomcomplet', 'fullname') || [champ(j, 'prenom', 'firstname'), champ(j, 'nomdefamille', 'lastname')].filter(Boolean).join(' ') || 'Joueur',
    age: age || 24, nat: String(champ(j, 'nationalite', 'nationality', 'nat', 'pays') || 'FRA').slice(0, 3).toUpperCase(),
    pos: POSTE_DE[normCle(posBrut)] || 'MC', foot: pied.startsWith('g') || pied.startsWith('l') ? 'Gauche' : pied.includes('deux') || pied.includes('both') ? 'Les deux' : 'Droit',
    contract: +champ(j, 'contrat', 'contract', 'anneesdecontrat') || undefined, photo: champ(j, 'photo', 'image', 'portrait') || undefined, num: +champ(j, 'numero', 'number', 'num') || undefined,
    attrs: Object.keys(attrs).length ? attrs : undefined, detail20, pot: pot ? Math.round(pot <= echelle ? pot / echelle * 99 : pot) : undefined, _inconnus: inconnus
  };
}
function convertirJsonComplet(raw) {
  const clubsBruts = champ(raw, 'clubs', 'equipes', 'teams') || [];
  const plats = champ(raw, 'joueurs', 'players') || [];
  const tous = [...plats, ...clubsBruts.flatMap(c => champ(c, 'joueurs', 'players', 'effectif', 'squad') || [])];
  const echelle = detecterEchelle(raw, tous);
  const parClub = new Map(), inconnus = new Set();
  const clubs = clubsBruts.map((c, i) => {
    const nom = champ(c, 'nom', 'name') || `Club ${i + 1}`;
    const o = { name: nom, short: champ(c, 'abreviation', 'court', 'short', 'shortname'), div: +champ(c, 'division', 'div', 'niveau') || undefined, rep: +champ(c, 'reputation', 'rep') || undefined,
      stadium: champ(c, 'stade', 'stadium'), capacity: +champ(c, 'capacite', 'capacity') || undefined, budget: +champ(c, 'budget') || undefined, logo: champ(c, 'logo', 'blason'),
      colors: champ(c, 'couleurs', 'colors'), players: [] };
    for (const j of champ(c, 'joueurs', 'players', 'effectif', 'squad') || []) { const p = convertirJoueur(j, echelle); p._inconnus.forEach(x => inconnus.add(x)); delete p._inconnus; o.players.push(p); }
    parClub.set(normCle(nom), o); return o;
  });
  const libres = [];
  for (const j of plats) {
    const p = convertirJoueur(j, echelle); p._inconnus.forEach(x => inconnus.add(x)); delete p._inconnus;
    const c = parClub.get(normCle(champ(j, 'club', 'equipe', 'team')));
    (c ? c.players : libres).push(p);
  }
  // staff : niveau 1-5 (donné, ou moyenne des attributs sur l'échelle)
  for (const s of champ(raw, 'staff', 'encadrement') || []) {
    const role = STAFF_DE[normCle(champ(s, 'role', 'poste', 'fonction', 'job'))]; const c = parClub.get(normCle(champ(s, 'club', 'equipe', 'team')));
    if (!role || !c) continue;
    let lvl = +champ(s, 'niveau', 'level');
    if (!lvl) { const v = Object.values(attributsBruts(s)).filter(x => typeof x === 'number'); if (v.length) lvl = 1 + Math.round(v.reduce((a, b) => a + b, 0) / v.length / echelle * 4); }
    (c.staffReel ||= {})[role] = { name: champ(s, 'nom', 'name') || STAFF[role].label, lvl: Math.max(1, Math.min(5, lvl || 2)) };
  }
  const ligues = champ(raw, 'divisions', 'championnats', 'leaguenames', 'ligues');
  return { leagueNames: Array.isArray(ligues) ? ligues.map(x => typeof x === 'string' ? x : champ(x, 'nom', 'name')) : undefined, cupName: champ(raw, 'coupe', 'cupname'),
    clubs, freeAgents: libres, _import: { echelle, joueurs: tous.length, attributsInconnus: [...inconnus].slice(0, 20) } };
}
function estJsonComplet(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (champ(raw, 'echelle', 'scale') || champ(raw, 'joueurs') || champ(raw, 'staff', 'equipes')) return true;
  const c = (raw.clubs || [])[0], j = (c && (champ(c, 'joueurs', 'effectif', 'squad') || c.players)?.[0]) || (raw.players || [])[0];
  return !!j && !!champ(j, 'attributs', 'attributes', 'caracteristiques') && !j.attrs;
}
if (typeof importDatabase === 'function') {
  const __importDatabaseJC = importDatabase;
  importDatabase = function (raw) {
    if (estJsonComplet(raw)) {
      const conv = convertirJsonComplet(raw);
      const W = __importDatabaseJC(conv);
      // staff réel gardé sur les clubs (par ordre d'import)
      conv.clubs.forEach((c, i) => { if (c.staffReel && W.clubs[i]) W.clubs[i].staffReel = c.staffReel; });
      const msg = `Import : ${conv._import.joueurs} joueurs, attributs sur ${conv._import.echelle} ramenés sur 20.${conv._import.attributsInconnus.length ? ` Attributs non reconnus : ${conv._import.attributsInconnus.join(', ')}.` : ''}`;
      setTimeout(() => typeof toast === 'function' && toast(msg), 50);
      return W;
    }
    return __importDatabaseJC.apply(this, arguments);
  };
}
// attributs détaillés fournis par le fichier : ils priment sur les valeurs dérivées (avec la progression en jeu)
if (typeof attributsDetail === 'function') {
  const __attributsDetailJC = attributsDetail;
  attributsDetail = function (p) {
    const D = __attributsDetailJC.apply(this, arguments);
    if (p?.detail20) {
      for (const [k, , , parents] of ATTR_DETAIL) if (p.detail20[k] != null) D[k] = Math.max(1, Math.min(20, Math.round(p.detail20[k] + (moyParents(p, parents) - moyParents0(p, parents)))));
    }
    return D;
  };
}
// staff du club choisi
if (typeof newGame === 'function') {
  const __newGameJC = newGame;
  newGame = function () {
    const G0 = __newGameJC.apply(this, arguments);
    try {
      const c = G0.clubs.find(x => x.id === G0.clubId);
      if (c?.staffReel) {
        G0.staffNames ||= {};
        for (const [k, s] of Object.entries(c.staffReel)) { G0.staff[k] = s.lvl; G0.staffNames[k] = s.name; if (G0.staffPeople && typeof newStaffPerson === 'function') G0.staffPeople[k] = newStaffPerson(k, s.lvl, s.name); }
      }
    } catch (e) { console.error(e); }
    return G0;
  };
}
