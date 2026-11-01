// ============================================================
//  Données de base : clubs fictifs, génération de joueurs,
//  rôles, formations. Tout peut être remplacé via import JSON.
// ============================================================

const ATTRS = {
  fin: 'Finition', pas: 'Passe', dri: 'Dribble', tec: 'Technique',
  tac: 'Tacle', vit: 'Vitesse', phy: 'Physique', men: 'Mental', gar: 'Gardien'
};

// Poids des attributs par rôle (somme = 1)
const ROLES = {
  GB:  { label: 'Gardien',              line: 'G', w: { gar: .6, men: .15, phy: .1, vit: .1, pas: .05 } },
  DC:  { label: 'Défenseur central',    line: 'D', w: { tac: .35, phy: .25, men: .15, vit: .1, pas: .1, tec: .05 } },
  DG:  { label: 'Latéral gauche',       line: 'D', w: { tac: .25, vit: .25, pas: .15, phy: .1, dri: .1, men: .1, tec: .05 } },
  DD:  { label: 'Latéral droit',        line: 'D', w: { tac: .25, vit: .25, pas: .15, phy: .1, dri: .1, men: .1, tec: .05 } },
  MDC: { label: 'Milieu défensif',      line: 'M', w: { tac: .3, pas: .2, phy: .15, men: .2, tec: .1, vit: .05 } },
  MC:  { label: 'Milieu central',       line: 'M', w: { pas: .3, tec: .2, men: .2, tac: .1, dri: .1, phy: .1 } },
  MOC: { label: 'Milieu offensif',      line: 'M', w: { pas: .25, tec: .25, dri: .2, fin: .15, men: .1, vit: .05 } },
  AG:  { label: 'Ailier gauche',        line: 'A', w: { dri: .25, vit: .25, tec: .15, pas: .15, fin: .15, men: .05 } },
  AD:  { label: 'Ailier droit',         line: 'A', w: { dri: .25, vit: .25, tec: .15, pas: .15, fin: .15, men: .05 } },
  BU:  { label: 'Buteur',               line: 'A', w: { fin: .4, phy: .15, vit: .15, tec: .1, dri: .1, men: .1 } }
};

// Contribution de chaque rôle aux lignes (défense / milieu / attaque)
const ROLE_LINES = {
  GB:  { gk: 1 },
  DC:  { def: 1 },
  DG:  { def: .7, mid: .1, att: .2 },
  DD:  { def: .7, mid: .1, att: .2 },
  MDC: { def: .4, mid: .6 },
  MC:  { def: .1, mid: .8, att: .1 },
  MOC: { mid: .5, att: .5 },
  AG:  { mid: .3, att: .7 },
  AD:  { mid: .3, att: .7 },
  BU:  { att: 1 }
};

// Postes "voisins" (joués à 92 %)
const COMPAT = {
  GB: [], DC: ['MDC'], DG: ['DD', 'AG'], DD: ['DG', 'AD'],
  MDC: ['DC', 'MC'], MC: ['MDC', 'MOC'], MOC: ['MC', 'AG', 'AD', 'BU'],
  AG: ['AD', 'MOC', 'DG'], AD: ['AG', 'MOC', 'DD'], BU: ['MOC', 'AG', 'AD']
};

// Formations : rôle + position sur le terrain (x 0-100 gauche→droite, y 0-100 but adverse→propre but)
const FORMATIONS = {
  '4-4-2':   [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['AG',12,45],['MC',37,50],['MC',63,50],['AD',88,45],['BU',37,18],['BU',63,18]],
  '4-3-3':   [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['MDC',50,58],['MC',30,46],['MC',70,46],['AG',14,20],['BU',50,14],['AD',86,20]],
  '4-2-3-1': [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['MDC',37,58],['MDC',63,58],['AG',14,34],['MOC',50,34],['AD',86,34],['BU',50,13]],
  '4-1-4-1': [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['MDC',50,60],['AG',12,40],['MC',37,44],['MC',63,44],['AD',88,40],['BU',50,14]],
  '3-5-2':   [['GB',50,92],['DC',25,76],['DC',50,78],['DC',75,76],['DG',8,48],['MDC',50,58],['MC',30,44],['MC',70,44],['DD',92,48],['BU',37,16],['BU',63,16]],
  '5-3-2':   [['GB',50,92],['DG',8,66],['DC',28,76],['DC',50,78],['DC',72,76],['DD',92,66],['MC',28,48],['MDC',50,54],['MC',72,48],['BU',37,18],['BU',63,18]],
  '4-3-1-2': [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['MC',25,52],['MDC',50,58],['MC',75,52],['MOC',50,34],['BU',37,15],['BU',63,15]]
};

const MENTALITIES = [
  { v: -2, label: 'Très défensif' }, { v: -1, label: 'Défensif' }, { v: 0, label: 'Équilibré' },
  { v: 1, label: 'Offensif' }, { v: 2, label: 'Très offensif' }
];

// --- Clubs fictifs (noms inventés, ressemblance fortuite) ---
const CLUB_DEFS = [
  ['Atlético Valombre', 'ATV', '#c8102e', '#ffffff', 88, 'Stade des Lumières', 62000],
  ['Real Castelmonte', 'RCM', '#ffffff', '#2b3a8c', 86, 'Arena Monte', 58000],
  ['Union Saint-Aubrac', 'USA', '#003a70', '#e30613', 84, 'Parc Aubrac', 48000],
  ['Olympique Rhodanien', 'OLR', '#1e3c96', '#e41b17', 80, 'Grand Stade du Rhône', 55000],
  ['FC Corsaires', 'FCC', '#0b2a4a', '#d4af37', 77, 'Stade de la Rade', 42000],
  ['Dynamo Bellerive', 'DYB', '#00843d', '#ffffff', 75, 'Bellerive Park', 38000],
  ['Sporting Lestrade', 'SPL', '#00a650', '#111111', 73, 'Stade Lestrade', 35000],
  ['Racing Montclair', 'RMC', '#7ab8e6', '#ffffff', 72, 'Stade Montclair', 33000],
  ['AS Vallée-Noire', 'AVN', '#111111', '#f2c300', 70, 'Fosse Noire', 30000],
  ['Girondins de l\'Estuaire', 'GDE', '#14213d', '#ffffff', 69, 'Arena Estuaire', 32000],
  ['Stade Armoricain', 'STA', '#d81e05', '#111111', 68, 'Roazhon Fields', 29000],
  ['FC Bastion', 'FCB', '#6a1b9a', '#ffffff', 66, 'Le Bastion', 27000],
  ['US Haute-Garonne', 'UHG', '#5b2c83', '#f5f5f5', 65, 'Stade des Violettes', 33000],
  ['Étoile du Littoral', 'EDL', '#0077c8', '#fdd835', 64, 'Stade de la Côte', 24000],
  ['AC Mont-Cendre', 'ACM', '#8b0000', '#f0f0f0', 62, 'Stade du Volcan', 21000],
  ['Chamois Ardennais', 'CHA', '#2e7d32', '#ffd600', 60, 'Stade des Forges', 18000],
  ['SC Pierreval', 'SCP', '#ff6f00', '#1a1a1a', 58, 'Stade Pierreval', 16000],
  ['Entente Lacustre', 'ENL', '#26a69a', '#ffffff', 56, 'Stade du Lac', 15000],
  ['FC Montagnards', 'FCM', '#455a64', '#e53935', 54, 'Altitude Arena', 14000],
  ['Red Star Faubourg', 'RSF', '#1b5e20', '#d32f2f', 52, 'Stade du Faubourg', 12000]
];

const NATIONS = [
  ['FRA', 'France', 30], ['ESP', 'Espagne', 7], ['POR', 'Portugal', 6], ['BRA', 'Brésil', 6],
  ['ARG', 'Argentine', 4], ['SEN', 'Sénégal', 5], ['CIV', 'Côte d\'Ivoire', 5], ['MAR', 'Maroc', 5],
  ['ALG', 'Algérie', 4], ['BEL', 'Belgique', 4], ['GER', 'Allemagne', 3], ['ITA', 'Italie', 3],
  ['NED', 'Pays-Bas', 3], ['CMR', 'Cameroun', 3], ['MLI', 'Mali', 3], ['CRO', 'Croatie', 2],
  ['SRB', 'Serbie', 2], ['ENG', 'Angleterre', 2], ['URU', 'Uruguay', 2], ['COL', 'Colombie', 2],
  ['DEN', 'Danemark', 2], ['SUI', 'Suisse', 2], ['NOR', 'Norvège', 1], ['JPN', 'Japon', 1]
];

const NAMES = {
  FR: { f: ['Lucas','Hugo','Théo','Nathan','Enzo','Louis','Mathis','Maxime','Antoine','Julien','Baptiste','Yanis','Kylian','Romain','Clément','Adrien','Quentin','Bastien','Corentin','Valentin','Samuel','Noé','Raphaël','Florian','Kévin','Dylan','Malo','Gabin','Timothée','Axel'],
        l: ['Martin','Bernard','Dubois','Moreau','Laurent','Garnier','Fontaine','Rousseau','Blanchard','Mercier','Lefèvre','Girard','Bonnet','Lambert','Perrin','Chevalier','Marchand','Robin','Guérin','Faure','Gauthier','Boyer','Leclerc','Picard','Roche','Aubert','Barbier','Carpentier','Hamel','Tessier','Delmas','Cordier','Vasseur','Lemoine','Brunet'] },
  ES: { f: ['Pablo','Javier','Álvaro','Sergio','Diego','Iker','Rubén','Adrián','Marcos','Hugo','Mario','Daniel','Raúl','Unai','Aitor'],
        l: ['García','Navarro','Ortega','Romero','Castillo','Herrera','Molina','Serrano','Domínguez','Vidal','Iglesias','Cabrera','Prieto','Medina','Arenas','Soler'] },
  PT: { f: ['João','Tiago','Rúben','Diogo','André','Gonçalo','Rafael','Nuno','Bernardo','Vitor','Rodrigo','Miguel'],
        l: ['Ferreira','Carvalho','Mendes','Moreira','Lopes','Pinto','Teixeira','Correia','Rocha','Neves','Fonseca','Barros'] },
  BR: { f: ['Gabriel','Matheus','Thiago','Vinícius','Caio','Felipe','Bruno','Renan','Igor','Wesley','Danilo','Leandro'],
        l: ['Souza','Oliveira','Santos','Costa','Almeida','Ribeiro','Nascimento','Araújo','Barbosa','Cardoso','Moraes','Teixeira'] },
  AR: { f: ['Facundo','Nicolás','Matías','Santiago','Joaquín','Agustín','Lautaro','Tomás','Franco','Emiliano'],
        l: ['Fernández','González','Acosta','Benítez','Sosa','Medina','Ríos','Aguirre','Ledesma','Quiroga','Villalba'] },
  AF: { f: ['Moussa','Ibrahima','Cheikh','Mamadou','Seydou','Abdoulaye','Ousmane','Lamine','Yaya','Serge','Wilfried','Junior','Christian','Didier','Brice','Aliou','Bakary','Souleymane'],
        l: ['Diallo','Traoré','Koné','Ndiaye','Coulibaly','Camara','Sissoko','Bamba','Touré','Diop','Kouassi','Mbaye','Sow','Keita','Doumbia','Fofana','Gueye','Zahoui','Ekambi','Nkoulou'] },
  MA: { f: ['Youssef','Amine','Hakim','Bilal','Ayoub','Sofiane','Ilyes','Riyad','Nabil','Karim','Mehdi','Rayan','Walid','Anis'],
        l: ['Benali','El Idrissi','Bouzid','Haddad','Mansouri','Amrani','Belkacem','Saidi','Ziani','Rahmani','Bensaïd','Cherki','Lahlou','Kaddour'] },
  EU: { f: ['Jonas','Lukas','Niklas','Matteo','Lorenzo','Federico','Daan','Jesse','Milan','Luka','Nikola','Stefan','Oliver','Harry','Jack','Mads','Rasmus','Erling','Kasper','Noah','Leon','Elias'],
        l: ['Weber','Schulz','Hoffmann','Rossi','Bianchi','Colombo','De Vries','Van Dijkhuis','Bakker','Horvat','Kovačić','Petrović','Jovanović','Walker','Hughes','Fletcher','Nielsen','Larsen','Andersen','Meier','Keller','Peeters','Janssens'] },
  LA: { f: ['Federico','Rodrigo','Juan','Camilo','Andrés','Sebastián','Luis','Darwin','Mauricio'],
        l: ['Álvarez','Pereira','Rodríguez','Cuesta','Mosquera','Vargas','Suárez','Torres','Ramírez'] },
  JP: { f: ['Takumi','Kaoru','Daichi','Ritsu','Wataru','Ko'],
        l: ['Tanaka','Suzuki','Nakamura','Watanabe','Itō','Kubota'] }
};
const NAT_POOL = {
  FRA: ['FR','FR','FR','AF','MA'], ESP: ['ES'], POR: ['PT'], BRA: ['BR'], ARG: ['AR'], SEN: ['AF'], CIV: ['AF'],
  MAR: ['MA'], ALG: ['MA'], BEL: ['EU','FR'], GER: ['EU'], ITA: ['EU'], NED: ['EU'], CMR: ['AF'], MLI: ['AF'],
  CRO: ['EU'], SRB: ['EU'], ENG: ['EU'], URU: ['LA'], COL: ['LA'], DEN: ['EU'], SUI: ['EU','FR'], NOR: ['EU'], JPN: ['JP']
};

const SQUAD_TEMPLATE = ['GB','GB','GB','DC','DC','DC','DC','DG','DG','DD','DD','MDC','MDC','MC','MC','MC','MOC','MOC','AG','AG','AD','AD','BU','BU','BU'];

// ---------- Aléatoire déterministe ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let RNG = Math.random;
function rnd() { return RNG(); }
function rint(a, b) { return Math.floor(rnd() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function gauss() { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function weighted(items, wf) {
  let tot = 0; for (const it of items) tot += Math.max(0, wf(it));
  let r = rnd() * tot;
  for (const it of items) { r -= Math.max(0, wf(it)); if (r <= 0) return it; }
  return items[items.length - 1];
}

let NEXT_PID = 1;

function pickNation(clubRep) {
  // les grands clubs recrutent plus à l'international
  return weighted(NATIONS, n => n[0] === 'FRA' ? n[2] * (1.4 - clubRep / 200) : n[2]);
}

function genName(nat) {
  const pool = NAMES[pick(NAT_POOL[nat] || ['FR'])];
  return pick(pool.f) + ' ' + pick(pool.l);
}

// Génère un joueur pour un rôle et un niveau (q en 1-20)
function genPlayer(role, q, opts = {}) {
  const nat = opts.nat || pickNation(opts.rep || 60)[0];
  const age = opts.age || clamp(Math.round(26 + gauss() * 4.2), 17, 36);
  const attrs = {};
  const w = ROLES[role].w;
  for (const k in ATTRS) {
    let base = q + gauss() * 1.6;
    const wk = w[k] || 0;
    if (k === 'gar') base = role === 'GB' ? q + 1 + gauss() : rint(1, 4);
    else if (wk >= .2) base += 2.2;
    else if (wk >= .1) base += .8;
    else if (wk === 0) base -= 3 + rnd() * 2;
    if (role === 'GB' && k !== 'gar' && k !== 'men' && k !== 'phy' && k !== 'vit' && k !== 'pas') base = rint(2, 8);
    // jeunes : un peu moins mûrs, vieux : moins rapides
    if (age < 21 && k === 'men') base -= 1.5;
    if (age > 31 && k === 'vit') base -= (age - 31) * .6;
    attrs[k] = clamp(Math.round(base), 1, 20);
  }
  const p = {
    id: NEXT_PID++, name: opts.name || genName(nat), nat, age, pos: role, attrs,
    club: opts.club ?? null, foot: rnd() < .25 ? 'Gauche' : (rnd() < .07 ? 'Les deux' : 'Droit'),
    morale: 70 + rint(0, 20), fit: 100, injury: 0, susp: 0, yellow: 0,
    face: { skin: rint(0, 5), hair: rint(0, 6), hairCol: rint(0, 5), beard: rnd() < .3 ? rint(1, 2) : 0 },
    stats: { apps: 0, goals: 0, assists: 0, rating: 0, yel: 0, red: 0 },
    contract: opts.contract || rint(1, 5), photo: opts.photo || null, listed: false
  };
  const ovr = playerOvr(p);
  // potentiel : plus de marge chez les jeunes
  const growth = age <= 18 ? rint(8, 25) : age <= 21 ? rint(4, 18) : age <= 24 ? rint(0, 9) : 0;
  p.pot = clamp(ovr + growth, ovr, 96);
  p.wage = calcWage(p);
  return p;
}

function playerRoleRating(p, role) {
  const w = ROLES[role].w; let s = 0;
  for (const k in w) s += w[k] * p.attrs[k];
  return s * 5; // 1-20 -> 5-100
}
function playerOvr(p) { return Math.round(playerRoleRating(p, p.pos)); }

function familiarity(p, role) {
  if (p.pos === role) return 1;
  if ((p.pos === 'GB') !== (role === 'GB')) return .35;
  if ((COMPAT[p.pos] || []).includes(role)) return .92;
  return .78;
}

function calcValue(p) {
  const o = playerOvr(p);
  let v = Math.pow(Math.max(o - 35, 1) / 10, 3.6) * 140000; // en euros
  const ageF = p.age <= 21 ? 1.6 : p.age <= 24 ? 1.35 : p.age <= 28 ? 1 : p.age <= 31 ? .65 : .3;
  v *= ageF;
  v *= 1 + Math.max(0, (p.pot || o) - o) / 40;
  v *= .7 + .1 * Math.min(p.contract || 1, 4);
  return roundMoney(v);
}
function calcWage(p) {
  const o = playerOvr(p);
  return roundMoney(Math.pow(Math.max(o - 35, 1) / 10, 3) * 900 + 1000); // par semaine
}
function roundMoney(v) {
  if (v >= 1e6) return Math.round(v / 1e5) * 1e5;
  if (v >= 1e5) return Math.round(v / 1e4) * 1e4;
  return Math.round(v / 1e3) * 1e3;
}

function buildDefaultDatabase(seed = 2026) {
  RNG = mulberry32(seed);
  NEXT_PID = 1;
  const clubs = [], players = [];
  CLUB_DEFS.forEach((d, i) => {
    const [name, short, c1, c2, rep, stadium, cap] = d;
    const club = {
      id: i + 1, name, short, colors: [c1, c2], rep, stadium, capacity: cap,
      budget: roundMoney(Math.pow(rep / 50, 5) * 2.2e6),
      logo: null
    };
    clubs.push(club);
    const q = 8.6 + (rep - 50) / 40 * 5.2; // ~8.8 → 13.5 sur 20
    SQUAD_TEMPLATE.forEach((role, idx) => {
      // quelques titulaires solides, des remplaçants plus faibles, quelques jeunes
      const tier = idx % 3 === 0 ? 1 : idx % 3 === 1 ? 0 : -1.1;
      let age;
      if (rnd() < .18) age = rint(17, 20);
      const pl = genPlayer(role, q + tier + gauss() * .9, { club: club.id, rep, age });
      players.push(pl);
    });
  });
  // agents libres
  for (let i = 0; i < 40; i++) {
    players.push(genPlayer(pick(SQUAD_TEMPLATE), 6 + rnd() * 6, { club: null, age: rint(19, 33) }));
  }
  players.forEach(p => { p.value = calcValue(p); });
  RNG = Math.random;
  return { leagueName: 'Ligue Élite', clubs, players };
}
