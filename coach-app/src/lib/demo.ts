import { QEA_QUESTIONS, QUESTION_TEMPLATES, statsForPosition } from './constants';
import { autoLineup } from './formations';
import type { AppData, Attendance, CustomQuestion, Objective, Survey, SurveyResponse, TrainingFeedback, TrainingSession, Injury, Match, MediaItem, Player, PostMatchReport } from './types';

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
    ['Maël', 'Le Gall', 16, 'Gardien'],
    ['Erwan', 'Quéré', 2, 'Défenseur'],
    ['Yann', 'Le Bihan', 3, 'Défenseur'],
    ['Gabriel', 'Tanguy', 6, 'Défenseur'],
    ['Noah', 'Kerjean', 7, 'Milieu'],
    ['Tom', 'Le Roux', 14, 'Milieu'],
    ['Mathis', 'Guéguen', 17, 'Milieu'],
    ['Arthur', 'Le Floch', 19, 'Attaquant'],
    ['Paul', 'Morvan', 20, 'Attaquant'],
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
    { id: 'm3', date: iso(-5), opponent: 'Vannes OC', home: false, competition: 'Championnat', createdAt: created },
  ];

  // Générateur pseudo-aléatoire déterministe
  let seed = 7;
  const rnd = (min: number, max: number) => {
    seed = (seed * 9301 + 49297) % 233280;
    return min + Math.floor((seed / 233280) * (max - min + 1));
  };

  const questions: CustomQuestion[] = [
    ...QEA_QUESTIONS.map((q) => ({ ...q })),
    ...[7, 8].map((i, n) => ({ ...QUESTION_TEMPLATES[i], id: `q${n}`, active: true })),
  ];

  const reports: PostMatchReport[] = [];
  for (const m of matches) {
    if (m.scoreFor == null) continue;
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
        stats: Object.fromEntries(
          statsForPosition(p.position).map((f) => {
            const v: Record<string, number> = {
              goals: attacker ? rnd(0, 1) : rnd(0, 6) === 0 ? 1 : 0,
              assists: attacker ? rnd(0, 1) : 0,
              shots,
              shotsOnTarget: Math.min(shots, rnd(0, 2)),
              keyPasses: rnd(0, 3),
              dribbles: rnd(0, 4),
              offsides: rnd(0, 2),
              tackles: rnd(1, 6),
              interceptions: rnd(0, 4),
              duelsWon: rnd(2, 9),
              clearances: rnd(1, 6),
              saves: rnd(2, 7),
              goalsConceded: m.scoreAgainst ?? 0,
              highClaims: rnd(0, 4),
              penaltiesSaved: rnd(0, 8) === 0 ? 1 : 0,
              yellowCards: rnd(0, 6) === 0 ? 1 : 0,
              redCards: 0,
            };
            return [f.key, v[f.key]];
          }),
        ),
        rpe: rnd(5, 9),
        fatigue: rnd(2, 5),
        sleep: rnd(2, 5),
        soreness: rnd(2, 5),
        stress: rnd(3, 5),
        mood: rnd(3, 5),
        selfRating: rnd(5, 8),
        coachRating: rnd(5, 8),
        pain: false,
        playerComment:
          rnd(0, 3) === 0
            ? [
                'Bonne préparation, on était prêts dès l’échauffement.',
                'On a subi en fin de match, il faut mieux gérer les temps faibles.',
                'Le plan de jeu était clair, le pressing a bien marché en 1re mi-temps.',
                'Manque de communication derrière sur les coups de pied arrêtés.',
                'Super ambiance avec le staff, on sent la confiance.',
              ][rnd(0, 4)]
            : undefined,
        answers: {
          'qea-sortie': rnd(4, 8),
          'qea-att': rnd(3, 8),
          'qea-def': rnd(5, 9),
          'qea-press': rnd(3, 7),
          'qea-to': rnd(4, 9),
          'qea-td': rnd(3, 8),
          'qea-eq': (m.scoreFor ?? 0) > (m.scoreAgainst ?? 0) ? rnd(6, 9) : rnd(3, 7),
          'qea-forme': rnd(5, 9),
          q0: ['Bonne intensité dans les duels', 'Bons appels en profondeur', 'Solide défensivement', 'Bonne relance'][rnd(0, 3)],
          q1: ['Le jeu de tête', 'La finition', 'Le placement sur coups de pied arrêtés', 'La communication'][rnd(0, 3)],
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
      shared: true,
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
      shared: true,
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

  // Séances d'entraînement des 3 dernières semaines (mardi / jeudi)
  const themes = ['Physique', 'Tactique', 'Jeu réduit', 'Finition', 'Technique', 'Veille de match'];
  const sessions: TrainingSession[] = [18, 16, 11, 9, 4, 2].map((ago, k) => {
    const attendance: Record<string, Attendance> = {};
    const playerRpe: Record<string, number> = {};
    for (const p of players) {
      const r = rnd(0, 19);
      attendance[p.id] = p.id === 'p5' && ago <= 13 ? 'blesse' : r === 0 ? 'absent' : r === 1 ? 'excuse' : r === 2 ? 'retard' : 'present';
      if (attendance[p.id] === 'present' || attendance[p.id] === 'retard') playerRpe[p.id] = rnd(4, 8);
    }
    // Un joueur souvent absent pour illustrer l'alerte
    if (ago <= 11) attendance.p6 = 'absent';
    // Ressenti des joueurs présents (sauf la dernière séance, à remplir)
    const feedback: Record<string, TrainingFeedback> = {};
    if (k < 5)
      for (const p of players)
        if (attendance[p.id] === 'present' && rnd(0, 4) > 0)
          feedback[p.id] = { quality: rnd(5, 9), selfPerf: rnd(4, 9), intensity: rnd(4, 9), updatedAt: created, comment: rnd(0, 7) === 0 ? 'Séance top, bon rythme.' : undefined };
    return { id: `s${k}`, date: iso(ago), time: '19:00', durationMin: 90, theme: themes[k], rpe: 6, attendance, playerRpe: {}, feedback, createdAt: created };
  });

  // Préparation du prochain match et débrief du dernier
  matches[3].prep = {
    published: true,
    opponentSystem: '4-2-3-1, bloc médian, latéraux très offensifs',
    keyPlayers: 'Le 10, gaucher, décroche beaucoup. Le 9, très fort de la tête sur CPA.',
    strengths: 'Transitions rapides, centres depuis les côtés.',
    weaknesses: 'Espaces dans le dos des latéraux, lents à se replacer.',
    attack: 'Sortie de balle courte par les centraux, chercher la profondeur dans le dos des latéraux.',
    defense: 'Pressing déclenché sur leur 6. Bloc compact, ne pas laisser le 10 se retourner.',
    setPieces: 'Marquage individuel sur le 9. Tireurs : Richard (droite), Kerjean (gauche).',
    objectives: 'Gagner 60 % des duels, 0 but encaissé sur coup de pied arrêté.',
    message: 'On reste solidaires 90 minutes. Allez le QEA !',
  };
  matches[2].debrief = {
    positives: 'Très bon début de match, pressing haut efficace, 2-0 à la pause.',
    problems: 'Relâchement après le 2-0, difficultés à sortir le ballon sous pression en 2e mi-temps.',
    solutions: 'Passage à 3 derrière à la relance, le 6 décroche entre les centraux.',
    toWork: 'Sortie de balle sous pression, gestion des temps faibles.',
    coachTeamRating: 7,
  };

  const objectives: Objective[] = [
    { id: 'o0', playerId: 'p1', title: 'Jeu de tête défensif', category: 'Technique', details: 'Timing du saut et orientation de la tête. 15 min de travail spécifique après les séances du jeudi.', status: 'en cours', coachProgress: 5, playerProgress: 6, playerComment: 'Je me sens plus à l’aise sur les centres.', coachNotes: [{ id: 'n0', date: iso(9), text: 'Mieux sur les duels aériens ce soir, continuer.' }], createdAt: created },
    { id: 'o1', playerId: 'p1', title: 'Communication avec le gardien', category: 'Comportement', status: 'acquis', coachProgress: 9, playerProgress: 8, coachNotes: [], createdAt: created },
    { id: 'o2', playerId: 'p5', title: 'Finition pied gauche', category: 'Technique', details: 'Frappes à ras de terre, prise d’appui.', dueDate: iso(-30), status: 'en cours', coachProgress: 4, coachNotes: [], createdAt: created },
    { id: 'o3', playerId: 'p3', title: 'Gestion des efforts sur 90 min', category: 'Physique', details: 'Travail de répétition d’efforts, récupération entre les séances.', status: 'en cours', coachProgress: 6, playerProgress: 5, coachNotes: [], createdAt: created },
    { id: 'o4', playerId: 'p4', title: 'Leadership / prise de parole', category: 'Mental', details: 'Capitaine : organiser le bloc, encourager.', status: 'en cours', coachProgress: 7, playerProgress: 7, coachNotes: [], createdAt: created },
    { id: 'o5', playerId: 'p0', title: 'Relances au pied', category: 'Tactique', status: 'en cours', coachProgress: 5, coachNotes: [], createdAt: created },
  ];

  const surveys: Survey[] = [
    {
      id: 'sv0',
      title: 'Ressenti de la semaine',
      description: 'Comment tu te sens avant le week-end ?',
      target: 'all',
      open: true,
      dueDate: iso(-2),
      createdAt: created,
      questions: [
        { id: 'sq0', label: 'Forme physique', type: 'scale', min: 1, max: 10, minLabel: 'Épuisé', maxLabel: 'Au top', required: true, active: true },
        { id: 'sq1', label: 'Moral', type: 'scale', min: 1, max: 10, minLabel: 'Très bas', maxLabel: 'Excellent', required: true, active: true },
        { id: 'sq2', label: 'Charge scolaire / pro', type: 'scale', min: 1, max: 10, minLabel: 'Légère', maxLabel: 'Très lourde', active: true },
        { id: 'sq3', label: 'As-tu une gêne ou une douleur ?', type: 'yesno', required: true, active: true },
        { id: 'sq4', label: 'Un mot pour le staff ?', type: 'text', active: true },
      ],
    },
  ];
  const surveyResponses: SurveyResponse[] = players
    .filter((_, i) => i % 3 !== 0)
    .map((p, i) => ({
      id: `sr${i}`,
      surveyId: 'sv0',
      playerId: p.id,
      answers: { sq0: rnd(4, 9), sq1: rnd(5, 10), sq2: rnd(2, 8), sq3: rnd(0, 5) === 0, ...(i % 4 === 0 ? { sq4: 'Tout va bien, motivé pour samedi !' } : {}) },
      updatedAt: created,
    }));

  const data: AppData = { version: 1, teamName: 'Quimper Ergué Armel FC', players, matches, reports, injuries, questions, media, lineups: [], sessions, objectives, surveys, surveyResponses };
  const stamp = new Date().toISOString();
  data.lineups = [
    { ...autoLineup(data, 'm2', '4-3-3'), captainId: 'p4', published: true, updatedAt: stamp },
    { ...autoLineup(data, 'm3', '4-2-3-1'), captainId: 'p4', published: true, notes: 'Bloc médian, pressing déclenché sur leur 6. Transitions rapides côté gauche.', updatedAt: stamp },
  ];
  return data;
}
