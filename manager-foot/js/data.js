// ============================================================
//  Données de base : clubs fictifs, génération de joueurs,
//  rôles, formations. Tout est modifiable via l'éditeur ou un import JSON.
// ============================================================

const ATTRS = {
  fin: 'Finition', pas: 'Passe', dri: 'Dribble', tec: 'Technique',
  tac: 'Tacle', vit: 'Vitesse', phy: 'Physique', men: 'Mental', gar: 'Gardien'
};

const ROLES = {
  GB:  { label: 'Gardien',           line: 'G', w: { gar: .6, men: .15, phy: .1, vit: .1, pas: .05 } },
  DC:  { label: 'Défenseur central', line: 'D', w: { tac: .35, phy: .25, men: .15, vit: .1, pas: .1, tec: .05 } },
  DG:  { label: 'Latéral gauche',    line: 'D', w: { tac: .25, vit: .25, pas: .15, phy: .1, dri: .1, men: .1, tec: .05 } },
  DD:  { label: 'Latéral droit',     line: 'D', w: { tac: .25, vit: .25, pas: .15, phy: .1, dri: .1, men: .1, tec: .05 } },
  MDC: { label: 'Milieu défensif',   line: 'M', w: { tac: .3, pas: .2, phy: .15, men: .2, tec: .1, vit: .05 } },
  MC:  { label: 'Milieu central',    line: 'M', w: { pas: .3, tec: .2, men: .2, tac: .1, dri: .1, phy: .1 } },
  MOC: { label: 'Milieu offensif',   line: 'M', w: { pas: .25, tec: .25, dri: .2, fin: .15, men: .1, vit: .05 } },
  AG:  { label: 'Ailier gauche',     line: 'A', w: { dri: .25, vit: .25, tec: .15, pas: .15, fin: .15, men: .05 } },
  AD:  { label: 'Ailier droit',      line: 'A', w: { dri: .25, vit: .25, tec: .15, pas: .15, fin: .15, men: .05 } },
  BU:  { label: 'Buteur',            line: 'A', w: { fin: .4, phy: .15, vit: .15, tec: .1, dri: .1, men: .1 } }
};

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
const WING_ROLES = new Set(['DG', 'DD', 'AG', 'AD']);
const CENTRAL_ROLES = new Set(['MC', 'MOC', 'MDC']);

const COMPAT = {
  GB: [], DC: ['MDC'], DG: ['DD', 'AG'], DD: ['DG', 'AD'],
  MDC: ['DC', 'MC'], MC: ['MDC', 'MOC'], MOC: ['MC', 'AG', 'AD', 'BU'],
  AG: ['AD', 'MOC', 'DG'], AD: ['AG', 'MOC', 'DD'], BU: ['MOC', 'AG', 'AD']
};

// rôle + position (x 0-100 gauche→droite, y 0-100 but adverse→propre but)
const FORMATIONS = {
  '4-4-2':   [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['AG',12,45],['MC',37,50],['MC',63,50],['AD',88,45],['BU',37,18],['BU',63,18]],
  '4-3-3':   [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['MDC',50,58],['MC',30,46],['MC',70,46],['AG',14,20],['BU',50,14],['AD',86,20]],
  '4-2-3-1': [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['MDC',37,58],['MDC',63,58],['AG',14,34],['MOC',50,34],['AD',86,34],['BU',50,13]],
  '4-1-4-1': [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['MDC',50,60],['AG',12,40],['MC',37,44],['MC',63,44],['AD',88,40],['BU',50,14]],
  '4-3-1-2': [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['MC',25,52],['MDC',50,58],['MC',75,52],['MOC',50,34],['BU',37,15],['BU',63,15]],
  '4-4-1-1': [['GB',50,92],['DG',12,72],['DC',37,76],['DC',63,76],['DD',88,72],['AG',12,46],['MC',37,52],['MC',63,52],['AD',88,46],['MOC',50,30],['BU',50,13]],
  '3-5-2':   [['GB',50,92],['DC',25,76],['DC',50,78],['DC',75,76],['DG',8,48],['MDC',50,58],['MC',30,44],['MC',70,44],['DD',92,48],['BU',37,16],['BU',63,16]],
  '3-4-3':   [['GB',50,92],['DC',25,76],['DC',50,78],['DC',75,76],['DG',10,50],['MC',37,52],['MC',63,52],['DD',90,50],['AG',18,20],['BU',50,14],['AD',82,20]],
  '5-3-2':   [['GB',50,92],['DG',8,66],['DC',28,76],['DC',50,78],['DC',72,76],['DD',92,66],['MC',28,48],['MDC',50,54],['MC',72,48],['BU',37,18],['BU',63,18]],
  '5-4-1':   [['GB',50,92],['DG',8,66],['DC',28,76],['DC',50,78],['DC',72,76],['DD',92,66],['AG',14,42],['MC',38,48],['MC',62,48],['AD',86,42],['BU',50,16]]
};

const MENTALITIES = [
  { v: -2, label: 'Très défensif' }, { v: -1, label: 'Défensif' }, { v: 0, label: 'Équilibré' },
  { v: 1, label: 'Offensif' }, { v: 2, label: 'Très offensif' }
];

// Consignes d'équipe (valeurs -1 / 0 / 1)
const INST = {
  press: { label: 'Pressing',        opts: ['Bas', 'Moyen', 'Haut'],       tip: 'Haut : récupère plus vite le ballon mais fatigue et fautes en plus.' },
  tempo: { label: 'Tempo',           opts: ['Lent', 'Normal', 'Rapide'],   tip: 'Rapide : plus d\'occasions des deux côtés, perte de balle plus fréquente.' },
  width: { label: 'Largeur',         opts: ['Étroit', 'Normal', 'Large'],  tip: 'Large : valorise les côtés et les centres. Étroit : valorise l\'axe.' },
  line:  { label: 'Ligne défensive', opts: ['Basse', 'Normale', 'Haute'],  tip: 'Haute : étouffe l\'adversaire mais expose aux contres rapides.' },
  pass:  { label: 'Passes',          opts: ['Courtes', 'Mixtes', 'Directes'], tip: 'Courtes : garde le ballon. Directes : attaque vite, frappes de loin.' }
};

const TRAINING = {
  equilibre: { label: 'Équilibré',  keys: null,                  tip: 'Progression générale.' },
  physique:  { label: 'Physique',   keys: ['phy', 'vit'],        tip: 'Endurance et vitesse. Risque de blessure un peu plus élevé.' },
  technique: { label: 'Technique',  keys: ['tec', 'dri', 'pas'], tip: 'Contrôle, dribble, passe.' },
  attaque:   { label: 'Attaque',    keys: ['fin', 'dri', 'tec'], tip: 'Finition et jeu offensif.' },
  defense:   { label: 'Défense',    keys: ['tac', 'phy', 'men'], tip: 'Tacle, placement, duel.' },
  tactique:  { label: 'Tactique',   keys: ['men', 'pas'],        tip: 'Mental et cohésion de groupe (+ cohésion).' },
  repos:     { label: 'Repos',      keys: [],                    tip: 'Pas de progression, mais condition et moral remontent vite.' }
};

const PERSONALITIES = {
  Professionnel: 'Régulier, progresse bien, accepte les critiques.',
  Ambitieux: 'Veut jouer et gagner, attentif à la réputation du club.',
  Loyal: 'Attaché au club, moral stable.',
  Tempérament: 'Sanguin : cartons plus fréquents, réagit fort aux critiques.',
  Discret: 'Sensible, se renferme si on le critique.',
  Leader: 'Capitaine né : tire le groupe vers le haut.'
};

// --- Clubs fictifs (noms inventés). [nom, abrégé, couleur1, couleur2, réputation, stade, capacité, division]
const CLUB_DEFS = [
  ['Atlético Valombre', 'ATV', '#c8102e', '#ffffff', 88, 'Stade des Lumières', 62000, 1],
  ['Real Castelmonte', 'RCM', '#ffffff', '#2b3a8c', 86, 'Arena Monte', 58000, 1],
  ['Union Saint-Aubrac', 'USA', '#003a70', '#e30613', 84, 'Parc Aubrac', 48000, 1],
  ['Olympique Rhodanien', 'OLR', '#1e3c96', '#e41b17', 80, 'Grand Stade du Rhône', 55000, 1],
  ['FC Corsaires', 'FCC', '#0b2a4a', '#d4af37', 77, 'Stade de la Rade', 42000, 1],
  ['Dynamo Bellerive', 'DYB', '#00843d', '#ffffff', 75, 'Bellerive Park', 38000, 1],
  ['Sporting Lestrade', 'SPL', '#00a650', '#111111', 73, 'Stade Lestrade', 35000, 1],
  ['Racing Montclair', 'RMC', '#7ab8e6', '#ffffff', 72, 'Stade Montclair', 33000, 1],
  ['AS Vallée-Noire', 'AVN', '#111111', '#f2c300', 70, 'Fosse Noire', 30000, 1],
  ['Girondins de l\'Estuaire', 'GDE', '#14213d', '#ffffff', 69, 'Arena Estuaire', 32000, 1],
  ['Stade Armoricain', 'STA', '#d81e05', '#111111', 68, 'Roazhon Fields', 29000, 1],
  ['FC Bastion', 'FCB', '#6a1b9a', '#ffffff', 66, 'Le Bastion', 27000, 1],
  ['US Haute-Garonne', 'UHG', '#5b2c83', '#f5f5f5', 65, 'Stade des Violettes', 33000, 1],
  ['Étoile du Littoral', 'EDL', '#0077c8', '#fdd835', 64, 'Stade de la Côte', 24000, 1],
  ['AC Mont-Cendre', 'ACM', '#8b0000', '#f0f0f0', 62, 'Stade du Volcan', 21000, 1],
  ['Chamois Ardennais', 'CHA', '#2e7d32', '#ffd600', 60, 'Stade des Forges', 18000, 1],
  ['SC Pierreval', 'SCP', '#ff6f00', '#1a1a1a', 58, 'Stade Pierreval', 16000, 1],
  ['Entente Lacustre', 'ENL', '#26a69a', '#ffffff', 56, 'Stade du Lac', 15000, 1],
  ['FC Montagnards', 'FCM', '#455a64', '#e53935', 54, 'Altitude Arena', 14000, 1],
  ['Red Star Faubourg', 'RSF', '#1b5e20', '#d32f2f', 52, 'Stade du Faubourg', 12000, 1],
  // Division 2
  ['US Clairvaux', 'USC', '#1565c0', '#ffeb3b', 56, 'Stade Clairvaux', 16000, 2],
  ['FC Brumeval', 'FBR', '#37474f', '#80deea', 55, 'Parc des Brumes', 14000, 2],
  ['Olympique Côte-Sauvage', 'OCS', '#00695c', '#ffffff', 54, 'Stade des Falaises', 15000, 2],
  ['Stade Lavandier', 'SLV', '#7e57c2', '#ffffff', 53, 'Stade des Lavandes', 12000, 2],
  ['AS Granitiers', 'ASG', '#616161', '#e53935', 52, 'Stade de Granit', 11000, 2],
  ['Racing Pontvieux', 'RPV', '#0d47a1', '#ffffff', 51, 'Stade du Vieux-Pont', 13000, 2],
  ['SC Marais-Blanc', 'SMB', '#ffffff', '#2e7d32', 50, 'Stade des Marais', 9000, 2],
  ['Entente Hautes-Fagnes', 'EHF', '#4e342e', '#ffcc80', 49, 'Stade des Fagnes', 8000, 2],
  ['FC Ravel-sur-Mer', 'FRM', '#0288d1', '#ff7043', 49, 'Stade de la Jetée', 10000, 2],
  ['AJ Coteaux', 'AJC', '#ad1457', '#ffffff', 48, 'Stade des Vignes', 9000, 2],
  ['Union Saint-Brévin', 'USB', '#283593', '#ffd54f', 47, 'Stade Saint-Brévin', 8500, 2],
  ['Sporting Grès-Rouge', 'SGR', '#bf360c', '#fff3e0', 46, 'Stade du Grès', 8000, 2],
  ['Étoile des Landes', 'ETL', '#33691e', '#fff176', 45, 'Stade des Pins', 7500, 2],
  ['CS Vieux-Port', 'CVP', '#01579b', '#e0e0e0', 45, 'Stade du Port', 9500, 2],
  ['FC Charbonnière', 'FCH', '#212121', '#ffb300', 44, 'Stade du Carreau', 9000, 2],
  ['AS Belvédère', 'ASB', '#00838f', '#ffffff', 43, 'Stade Belvédère', 7000, 2],
  ['Stade Givrecourt', 'SGC', '#b0bec5', '#1a237e', 42, 'Stade Givrecourt', 6000, 2],
  ['Avenir Rochefleur', 'ARF', '#c62828', '#fdd835', 41, 'Stade des Roches', 6500, 2],
  ['Club Aiglon', 'CAI', '#3e2723', '#d7ccc8', 40, 'Nid de l\'Aigle', 5500, 2],
  ['Dragons du Morvan', 'DDM', '#1b5e20', '#ffffff', 39, 'Stade du Morvan', 5000, 2]
];

const NATIONS = [
  ['FRA', 'France', 30], ['ESP', 'Espagne', 7], ['POR', 'Portugal', 6], ['BRA', 'Brésil', 6],
  ['ARG', 'Argentine', 4], ['SEN', 'Sénégal', 5], ['CIV', 'Côte d\'Ivoire', 5], ['MAR', 'Maroc', 5],
  ['ALG', 'Algérie', 4], ['BEL', 'Belgique', 4], ['GER', 'Allemagne', 3], ['ITA', 'Italie', 3],
  ['NED', 'Pays-Bas', 3], ['CMR', 'Cameroun', 3], ['MLI', 'Mali', 3], ['CRO', 'Croatie', 2],
  ['SRB', 'Serbie', 2], ['ENG', 'Angleterre', 2], ['URU', 'Uruguay', 2], ['COL', 'Colombie', 2],
  ['DEN', 'Danemark', 2], ['SUI', 'Suisse', 2], ['NOR', 'Norvège', 1], ['JPN', 'Japon', 1],
  ['TUN', 'Tunisie', 2], ['GHA', 'Ghana', 2], ['USA', 'États-Unis', 1], ['POL', 'Pologne', 1],
  ['AUT', 'Autriche', 1], ['SWE', 'Suède', 1], ['TUR', 'Turquie', 1], ['CZE', 'Tchéquie', 1], ['SCO', 'Écosse', 1], ['GRE', 'Grèce', 1]
];

const NAMES = {
  FR: { f: ['Lucas','Hugo','Théo','Nathan','Enzo','Louis','Mathis','Maxime','Antoine','Julien','Baptiste','Yanis','Kylian','Romain','Clément','Adrien','Quentin','Bastien','Corentin','Valentin','Samuel','Noé','Raphaël','Florian','Kévin','Dylan','Malo','Gabin','Timothée','Axel','Jules','Arthur','Tom','Evan','Léo','Sacha'],
        l: ['Martin','Bernard','Dubois','Moreau','Laurent','Garnier','Fontaine','Rousseau','Blanchard','Mercier','Lefèvre','Girard','Bonnet','Lambert','Perrin','Chevalier','Marchand','Robin','Guérin','Faure','Gauthier','Boyer','Leclerc','Picard','Roche','Aubert','Barbier','Carpentier','Hamel','Tessier','Delmas','Cordier','Vasseur','Lemoine','Brunet','Collin','Renaud','Maillard','Besson','Joly'] },
  ES: { f: ['Pablo','Javier','Álvaro','Sergio','Diego','Iker','Rubén','Adrián','Marcos','Hugo','Mario','Daniel','Raúl','Unai','Aitor'],
        l: ['García','Navarro','Ortega','Romero','Castillo','Herrera','Molina','Serrano','Domínguez','Vidal','Iglesias','Cabrera','Prieto','Medina','Arenas','Soler'] },
  PT: { f: ['João','Tiago','Rúben','Diogo','André','Gonçalo','Rafael','Nuno','Bernardo','Vitor','Rodrigo','Miguel'],
        l: ['Ferreira','Carvalho','Mendes','Moreira','Lopes','Pinto','Teixeira','Correia','Rocha','Neves','Fonseca','Barros'] },
  BR: { f: ['Gabriel','Matheus','Thiago','Vinícius','Caio','Felipe','Bruno','Renan','Igor','Wesley','Danilo','Leandro'],
        l: ['Souza','Oliveira','Santos','Costa','Almeida','Ribeiro','Nascimento','Araújo','Barbosa','Cardoso','Moraes','Teixeira'] },
  AR: { f: ['Facundo','Nicolás','Matías','Santiago','Joaquín','Agustín','Lautaro','Tomás','Franco','Emiliano'],
        l: ['Fernández','González','Acosta','Benítez','Sosa','Medina','Ríos','Aguirre','Ledesma','Quiroga','Villalba'] },
  AF: { f: ['Moussa','Ibrahima','Cheikh','Mamadou','Seydou','Abdoulaye','Ousmane','Lamine','Yaya','Serge','Wilfried','Junior','Christian','Didier','Brice','Aliou','Bakary','Souleymane','Kwame','Kofi'],
        l: ['Diallo','Traoré','Koné','Ndiaye','Coulibaly','Camara','Sissoko','Bamba','Touré','Diop','Kouassi','Mbaye','Sow','Keita','Doumbia','Fofana','Gueye','Zahoui','Ekambi','Nkoulou','Mensah','Owusu'] },
  MA: { f: ['Youssef','Amine','Hakim','Bilal','Ayoub','Sofiane','Ilyes','Riyad','Nabil','Karim','Mehdi','Rayan','Walid','Anis'],
        l: ['Benali','El Idrissi','Bouzid','Haddad','Mansouri','Amrani','Belkacem','Saidi','Ziani','Rahmani','Bensaïd','Cherki','Lahlou','Kaddour','Jaziri','Trabelsi'] },
  EU: { f: ['Jonas','Lukas','Niklas','Matteo','Lorenzo','Federico','Daan','Jesse','Milan','Luka','Nikola','Stefan','Oliver','Harry','Jack','Mads','Rasmus','Erling','Kasper','Noah','Leon','Elias','Jakub','Piotr'],
        l: ['Weber','Schulz','Hoffmann','Rossi','Bianchi','Colombo','De Vries','Van Dijkhuis','Bakker','Horvat','Kovačić','Petrović','Jovanović','Walker','Hughes','Fletcher','Nielsen','Larsen','Andersen','Meier','Keller','Peeters','Janssens','Nowak','Kowalski'] },
  LA: { f: ['Federico','Rodrigo','Juan','Camilo','Andrés','Sebastián','Luis','Darwin','Mauricio','Tyler','Christian'],
        l: ['Álvarez','Pereira','Rodríguez','Cuesta','Mosquera','Vargas','Suárez','Torres','Ramírez','Miller','Adams'] },
  TR: { f: ['Emre','Burak','Arda','Kerem','Cengiz','Hakan','Ozan','Yusuf','Mert','Kaan'],
        l: ['Yılmaz','Kaya','Demir','Şahin','Çelik','Aydın','Öztürk','Arslan','Doğan','Kılıç'] },
  JP: { f: ['Takumi','Kaoru','Daichi','Ritsu','Wataru','Ko'],
        l: ['Tanaka','Suzuki','Nakamura','Watanabe','Itō','Kubota'] }
};
const NAT_POOL = {
  FRA: ['FR','FR','FR','AF','MA'], ESP: ['ES'], POR: ['PT'], BRA: ['BR'], ARG: ['AR'], SEN: ['AF'], CIV: ['AF'],
  MAR: ['MA'], ALG: ['MA'], TUN: ['MA'], BEL: ['EU','FR'], GER: ['EU'], ITA: ['EU'], NED: ['EU'], CMR: ['AF'], MLI: ['AF'], GHA: ['AF'],
  CRO: ['EU'], SRB: ['EU'], ENG: ['EU'], URU: ['LA'], COL: ['LA'], USA: ['LA'], DEN: ['EU'], SUI: ['EU','FR'], NOR: ['EU'], POL: ['EU'], JPN: ['JP'], AUT: ['EU'], SWE: ['EU'], TUR: ['TR'], CZE: ['EU'], SCO: ['EU'], GRE: ['EU']
};

const SQUAD_TEMPLATE = ['GB','GB','GB','DC','DC','DC','DC','DG','DG','DD','DD','MDC','MDC','MC','MC','MC','MOC','MOC','AG','AG','AD','AD','BU','BU','BU'];

// ---------- Aléatoire ----------
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
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weighted(items, wf) {
  let tot = 0; for (const it of items) tot += Math.max(0, wf(it));
  let r = rnd() * tot;
  for (const it of items) { r -= Math.max(0, wf(it)); if (r <= 0) return it; }
  return items[items.length - 1];
}

let NEXT_PID = 1;

function pickNation(clubRep) {
  return weighted(NATIONS, n => n[0] === 'FRA' ? n[2] * (1.5 - clubRep / 180) : n[2]);
}
function genName(nat) {
  const pool = NAMES[pick(NAT_POOL[nat] || ['FR'])];
  return pick(pool.f) + ' ' + pick(pool.l);
}
function randomFace() { return { skin: rint(0, 5), hair: rint(0, 6), hairCol: rint(0, 5), beard: rnd() < .3 ? rint(1, 2) : 0 }; }
function emptyStats() { return { apps: 0, goals: 0, assists: 0, rating: 0, yel: 0, red: 0, lg: 0, motm: 0, min: 0, pas: 0, pasOk: 0, kp: 0, dri: 0, tkl: 0, int: 0, sh: 0, xg: 0, sav: 0 }; }

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
    if (role === 'GB' && !['gar', 'men', 'phy', 'vit', 'pas'].includes(k)) base = rint(2, 8);
    if (age < 21 && k === 'men') base -= 1.5;
    if (age > 31 && k === 'vit') base -= (age - 31) * .6;
    attrs[k] = clamp(Math.round(base), 1, 20);
  }
  const p = {
    id: NEXT_PID++, name: opts.name || genName(nat), nat, age, pos: role, attrs,
    club: opts.club ?? null, foot: rnd() < .25 ? 'Gauche' : (rnd() < .07 ? 'Les deux' : 'Droit'),
    frag: clamp(Math.round(8 + gauss() * 3.5), 1, 20),
    pers: opts.pers || weighted(Object.keys(PERSONALITIES), k => k === 'Leader' ? .5 : k === 'Professionnel' ? 2 : 1),
    morale: 70 + rint(0, 20), fit: 100, injury: 0, susp: 0, yellow: 0,
    face: randomFace(), num: opts.num || null,
    stats: emptyStats(), form: [], hist: [],
    contract: opts.contract || rint(1, 5), photo: opts.photo || null, listed: false
  };
  const ovr = playerOvr(p);
  const growth = age <= 18 ? rint(8, 25) : age <= 21 ? rint(4, 18) : age <= 24 ? rint(0, 9) : 0;
  p.pot = clamp(ovr + growth, ovr, 96);
  p.wage = calcWage(p);
  p.attrs0 = { ...p.attrs };
  return p;
}

function playerRoleRating(p, role) {
  const w = ROLES[role].w; let s = 0;
  for (const k in w) s += w[k] * p.attrs[k];
  return s * 5;
}
function playerOvr(p) { return Math.round(playerRoleRating(p, p.pos)); }

function familiarity(p, role) {
  if (p.pos === role) return 1;
  if (p.posFam && p.posFam[role] != null && (p.pos === 'GB') === (role === 'GB')) return famFromValue(p.posFam[role]);
  if ((p.pos === 'GB') !== (role === 'GB')) return .35;
  if ((COMPAT[p.pos] || []).includes(role)) return .92;
  return .78;
}

function calcValue(p) {
  const o = playerOvr(p);
  let v = Math.pow(Math.max(o - 35, 1) / 10, 3.6) * 140000;
  const ageF = p.age <= 21 ? 1.6 : p.age <= 24 ? 1.35 : p.age <= 28 ? 1 : p.age <= 31 ? .65 : .3;
  v *= ageF;
  v *= 1 + Math.max(0, (p.pot || o) - o) / 40;
  v *= .7 + .1 * Math.min(p.contract || 1, 4);
  return roundMoney(v);
}
function calcWage(p) {
  const o = playerOvr(p);
  return roundMoney(Math.pow(Math.max(o - 35, 1) / 10, 3) * 900 + 1000);
}
function roundMoney(v) {
  if (v >= 1e6) return Math.round(v / 1e5) * 1e5;
  if (v >= 1e5) return Math.round(v / 1e4) * 1e4;
  return Math.round(v / 1e3) * 1e3;
}

// Ajuste les attributs d'un joueur pour atteindre une note globale précise
function setPlayerOvr(p, target) {
  target = clamp(Math.round(target), 20, 99);
  for (let i = 0; i < 400 && playerOvr(p) !== target; i++) {
    const keys = Object.keys(ROLES[p.pos].w);
    const d = playerOvr(p) < target ? 1 : -1;
    const k = weighted(keys, k => ROLES[p.pos].w[k] * ((d > 0 ? 20 - p.attrs[k] : p.attrs[k] - 1) + .01));
    p.attrs[k] = clamp(p.attrs[k] + d, 1, 20);
  }
}

function assignNumbers(players) {
  const used = new Set(players.filter(p => p.num).map(p => p.num));
  const pref = { GB: [1, 16, 30], DC: [4, 5, 3, 15, 22], DG: [3, 12, 23], DD: [2, 20, 24], MDC: [6, 18, 14], MC: [8, 6, 14, 17], MOC: [10, 21], AG: [11, 7, 19], AD: [7, 11, 27], BU: [9, 19, 13] };
  for (const p of players) {
    if (p.num) continue;
    let n = (pref[p.pos] || []).find(x => !used.has(x));
    if (!n) { n = 2; while (used.has(n)) n++; }
    p.num = n; used.add(n);
  }
}

function clubStyle() {
  return { formation: pick(['4-4-2', '4-3-3', '4-2-3-1', '4-1-4-1', '3-5-2', '4-3-1-2', '4-4-1-1', '3-4-3']), press: rint(-1, 1), tempo: rint(-1, 1), width: rint(-1, 1), line: rint(-1, 1), pass: rint(-1, 1) };
}


// --- Clubs étrangers fictifs (Coupe d'Europe) : [nom, abrégé, c1, c2, réputation, pays, stade, capacité]
const FOREIGN_DEFS = [
  ['Westhaven City', 'WHC', '#81d4fa', '#0d47a1', 91, 'ENG', 'Harbour Stadium', 55000],
  ['Real Valdemora', 'RVD', '#f5f5f5', '#6a1b9a', 90, 'ESP', 'Estadio Valdemora', 80000],
  ['FC Isartal', 'FCI', '#c62828', '#ffffff', 89, 'GER', 'Isartal Arena', 75000],
  ['Northbridge United', 'NBU', '#c62828', '#111111', 88, 'ENG', 'Bridge Park', 74000],
  ['Inter Navigli', 'INV', '#0d47a1', '#111111', 87, 'ITA', 'Stadio dei Navigli', 76000],
  ['Borussia Rheinfeld', 'BRF', '#fdd835', '#111111', 86, 'GER', 'Rheinfeld Stadion', 81000],
  ['Atlético Serranía', 'ASR', '#b71c1c', '#ffffff', 85, 'ESP', 'Estadio Serranía', 68000],
  ['AC Lagunare', 'ACL', '#880e4f', '#ffd54f', 82, 'ITA', 'Stadio Laguna', 50000],
  ['SL Tejo', 'SLT', '#2e7d32', '#ffffff', 81, 'POR', 'Estádio do Tejo', 50000],
  ['Amstel Rovers', 'AMR', '#ffffff', '#d32f2f', 80, 'NED', 'Amstelveld', 54000],
  ['Dragões do Douro', 'DDD', '#1565c0', '#ffffff', 80, 'POR', 'Estádio do Douro', 50000],
  ['Club Brugenaar', 'CBG', '#0d47a1', '#111111', 76, 'BEL', 'Jan Breydelpark', 29000],
  ['Dinamo Savograd', 'DSV', '#1565c0', '#e0e0e0', 74, 'CRO', 'Stadion Sava', 35000],
  ['FK Morava', 'FKM', '#d32f2f', '#ffffff', 73, 'SRB', 'Stadion Morava', 50000],
  ['FC Alpenrose', 'FCA', '#e53935', '#ffffff', 72, 'SUI', 'Alpenrose Park', 30000],
  ['Nordhavn BK', 'NHB', '#0d47a1', '#ffffff', 71, 'DEN', 'Nordhavn Stadion', 38000]
];

const STAFF = {
  assistant: { label: 'Adjoint', tip: 'Conseils pendant les matchs, rapports d\'avant-match plus précis.' },
  coach: { label: 'Entraîneur technique', tip: 'Accélère la progression des joueurs.' },
  physio: { label: 'Kiné / préparateur physique', tip: 'Moins de blessures, plus courtes, meilleure récupération.' },
  scout: { label: 'Recruteur', tip: 'Rapports plus rapides et estimations plus précises des joueurs adverses.' },
  youth: { label: 'Formateur', tip: 'Jeunes du centre de formation plus talentueux.' }
};
const STAFF_NAMES = ['Didier Marchal', 'Paolo Ricci', 'Hans Vogel', 'José Almeida', 'Karim Saadi', 'Tom Baker', 'Luc Arnaud', 'Pedro Ruiz', 'Erik Lund', 'Sami Benhassi', 'Marco Testa', 'Yves Caron'];
function staffWage(l, G) { return roundMoney(1200 * l * l * (G && typeof clubEco === 'function' ? .4 + .6 * clubEco(G, G.clubs.find(c => c.id === G.clubId)).coef : 1)); }
const FACILITIES = {
  training: { label: 'Centre d\'entraînement', tip: 'Progression des joueurs plus rapide.', cost: l => 3e6 * l, max: 5 },
  youth: { label: 'Académie des jeunes', tip: 'Plus de jeunes et de meilleur potentiel.', cost: l => 2.5e6 * l, max: 5 },
  medical: { label: 'Centre médical', tip: 'Moins de blessures et rétablissement plus rapide.', cost: l => 2e6 * l, max: 5 },
  stadium: { label: 'Agrandissement du stade (+5 000 places)', tip: 'Plus de recettes de billetterie.', cost: () => 9e6, max: 99 }
};

function genForeignClubs(startId, startPid) {
  const clubs = [], players = [];
  NEXT_PID = Math.max(NEXT_PID, startPid);
  FOREIGN_DEFS.forEach((d, i) => {
    const [name, short, c1, c2, rep, country, stadium, cap] = d;
    const club = { id: startId + i, name, short, colors: [c1, c2], rep, stadium, capacity: cap, div: 0, foreign: true, country,
      budget: roundMoney(Math.pow(rep / 50, 5) * 3e6), logo: null, style: clubStyle(), coh: 70, trophies: [] };
    clubs.push(club);
    const q = 8.6 + (rep - 50) / 40 * 5.2;
    const squad = SQUAD_TEMPLATE.map((role, idx) => {
      const tier = idx % 3 === 0 ? 1 : idx % 3 === 1 ? 0 : -1.1;
      return genPlayer(role, q + tier + gauss() * .9, { club: club.id, rep, nat: rnd() < .65 ? country : undefined });
    });
    assignNumbers(squad);
    squad.forEach(p => p.value = calcValue(p));
    players.push(...squad);
  });
  return { clubs, players };
}

function buildDefaultDatabase(seed = 2026) {
  RNG = mulberry32(seed);
  NEXT_PID = 1;
  const clubs = [], players = [];
  CLUB_DEFS.forEach((d, i) => {
    const [name, short, c1, c2, rep, stadium, cap, div] = d;
    const club = {
      id: i + 1, name, short, colors: [c1, c2], rep, stadium, capacity: cap, div,
      budget: roundMoney(Math.pow(rep / 50, 5) * 2.2e6), logo: null, style: clubStyle(), coh: 60 + rint(0, 20), trophies: []
    };
    clubs.push(club);
    const q = 8.6 + (rep - 50) / 40 * 5.2;
    const squad = [];
    SQUAD_TEMPLATE.forEach((role, idx) => {
      const tier = idx % 3 === 0 ? 1 : idx % 3 === 1 ? 0 : -1.1;
      const age = rnd() < .18 ? rint(17, 20) : undefined;
      squad.push(genPlayer(role, q + tier + gauss() * .9, { club: club.id, rep, age }));
    });
    assignNumbers(squad);
    players.push(...squad);
  });
  for (let i = 0; i < 50; i++) players.push(genPlayer(pick(SQUAD_TEMPLATE), 6 + rnd() * 6, { club: null, age: rint(19, 33) }));
  const fr = genForeignClubs(clubs.length + 1, NEXT_PID);
  clubs.push(...fr.clubs); players.push(...fr.players);
  players.forEach(p => { p.value = calcValue(p); });
  RNG = Math.random;
  return { leagueNames: ['Ligue Élite', 'Ligue Pro 2'], cupName: 'Coupe Nationale', euroName: 'Coupe des Étoiles', clubs, players };
}
