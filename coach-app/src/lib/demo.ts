import { QUESTION_TEMPLATES } from './constants';
import type { AppData, CustomQuestion, Injury, Match, MediaItem, Player, PostMatchReport } from './types';

const iso = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

/** Petit jeu de données pour découvrir l'application. */
export function buildDemoData(): AppData {
  const created = new Date().toISOString();
  const names: [string, string, number, string][] = [
    ['Lucas', 'Martin', 1, 'Gardien'],
    ['Hugo', 'Bernard', 4, 'Défenseur'],
    ['Nathan', 'Petit', 5, 'Défenseur'],
    ['Théo', 'Robert', 8, 'Milieu'],
    ['Enzo', 'Richard', 10, 'Milieu'],
    ['Louis', 'Durand', 9, 'Attaquant'],
    ['Jules', 'Leroy', 11, 'Attaquant'],
  ];
  const players: Player[] = names.map(([firstName, lastName, number, position], i) => ({
    id: `p${i}`,
    firstName,
    lastName,
    number,
    position,
    createdAt: created,
  }));

  const matches: Match[] = [
    { id: 'm0', date: iso(20), opponent: 'US Quimper', home: true, competition: 'Championnat', scoreFor: 2, scoreAgainst: 1, createdAt: created },
    { id: 'm1', date: iso(13), opponent: 'Stade Brestois B', home: false, competition: 'Championnat', scoreFor: 0, scoreAgainst: 0, createdAt: created },
    { id: 'm2', date: iso(6), opponent: 'FC Lorient U19', home: true, competition: 'Coupe', scoreFor: 3, scoreAgainst: 2, createdAt: created },
  ];

  // Générateur pseudo-aléatoire déterministe
  let seed = 7;
  const rnd = (min: number, max: number) => {
    seed = (seed * 9301 + 49297) % 233280;
    return min + Math.floor((seed / 233280) * (max - min + 1));
  };

  const questions: CustomQuestion[] = [0, 1, 4, 7, 8, 17].map((i, n) => ({ ...QUESTION_TEMPLATES[i], id: `q${n}`, active: true }));

  const reports: PostMatchReport[] = [];
  for (const m of matches) {
    for (const p of players) {
      const starter = rnd(0, 4) > 0;
      const minutesPlayed = starter ? rnd(60, 90) : rnd(10, 30);
      const attacker = p.position === 'Attaquant' || p.position === 'Milieu';
      const shots = attacker ? rnd(0, 4) : rnd(0, 1);
      reports.push({
        id: `r-${m.id}-${p.id}`,
        matchId: m.id,
        playerId: p.id,
        starter,
        minutesPlayed,
        stats: {
          goals: attacker ? rnd(0, 1) : 0,
          assists: attacker ? rnd(0, 1) : 0,
          shots,
          shotsOnTarget: attacker ? Math.min(shots, rnd(0, 2)) : 0,
          tackles: rnd(0, 6),
          saves: p.position === 'Gardien' ? rnd(2, 7) : 0,
          yellowCards: rnd(0, 6) === 0 ? 1 : 0,
          redCards: 0,
        },
        rpe: rnd(5, 9),
        fatigue: rnd(2, 5),
        sleep: rnd(2, 5),
        soreness: rnd(2, 5),
        stress: rnd(3, 5),
        mood: rnd(3, 5),
        selfRating: rnd(5, 8),
        coachRating: rnd(5, 8),
        pain: false,
        answers: {
          q0: rnd(2, 5),
          q1: starter ? rnd(3, 5) : rnd(1, 3),
          q2: rnd(0, 3) > 0,
          q3: ['Bonne intensité dans les duels', 'Bons appels en profondeur', 'Solide défensivement', 'Bonne relance'][rnd(0, 3)],
          q4: ['Le jeu de tête', 'La finition', 'Le placement sur coups de pied arrêtés', 'La communication'][rnd(0, 3)],
          q5: questions[5].options![rnd(0, 2)],
        },
        createdAt: created,
        updatedAt: created,
      });
    }
  }
  // Un joueur fatigué avec douleur sur le dernier match
  const r = reports.find((x) => x.matchId === 'm2' && x.playerId === 'p3')!;
  Object.assign(r, { pain: true, painZone: 'Ischios', painLevel: 4, fatigue: 2, soreness: 1, sleep: 2, rpe: 9 });

  const injuries: Injury[] = [
    {
      id: 'i0',
      playerId: 'p5',
      matchId: 'm1',
      date: iso(13),
      bodyZone: 'Cheville',
      type: 'Entorse',
      side: 'droite',
      severity: 'modérée',
      status: 'reprise',
      expectedReturn: iso(-3),
      treatment: 'Kiné 2×/semaine, renforcement proprioceptif',
      createdAt: created,
    },
  ];

  // Vidéos d'exemple (échantillons publics) pour découvrir la vidéothèque
  const sample = (name: string) => `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;
  const media: MediaItem[] = [
    {
      id: 'v0',
      kind: 'video',
      title: 'Résumé vs FC Lorient U19',
      uri: sample('ForBiggerBlazes'),
      category: 'Match',
      date: iso(6),
      matchId: 'm2',
      playerIds: ['p4', 'p5', 'p6'],
      notes: 'Bon pressing haut en 1re période, relâchement après le 2-0.',
      markers: [
        { id: 'k0', seconds: 3, label: 'Récupération haute', playerId: 'p4' },
        { id: 'k1', seconds: 7, label: 'But — appel en profondeur', playerId: 'p5' },
        { id: 'k2', seconds: 11, label: 'Mauvais repli défensif' },
      ],
      createdAt: created,
    },
    {
      id: 'v1',
      kind: 'video',
      title: 'Exercice : conservation 4c4 + 2 jokers',
      uri: sample('ForBiggerEscapes'),
      category: 'Exercice',
      date: iso(3),
      playerIds: [],
      notes: 'Terrain 30×25 m, 2 touches max. 4 × 3 min, récup 1 min.',
      markers: [],
      createdAt: created,
    },
    {
      id: 'v2',
      kind: 'video',
      title: 'Analyse : sorties de balle',
      uri: sample('ForBiggerJoyrides'),
      category: 'Analyse',
      date: iso(12),
      matchId: 'm1',
      playerIds: ['p1', 'p2', 'p0'],
      markers: [{ id: 'k3', seconds: 5, label: 'Relance courte gardien', playerId: 'p0' }],
      createdAt: created,
    },
    {
      id: 'v3',
      kind: 'link',
      title: 'Idées d’exercices de pressing (YouTube)',
      uri: 'https://www.youtube.com/results?search_query=exercice+pressing+football',
      category: 'Exercice',
      date: iso(1),
      playerIds: [],
      markers: [],
      createdAt: created,
    },
  ];

  return { version: 1, teamName: 'Équipe démo', players, matches, reports, injuries, questions, media };
}
