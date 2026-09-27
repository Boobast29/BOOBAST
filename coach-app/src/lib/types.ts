export type ID = string;

export type Player = {
  id: ID;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  birthDate?: string; // AAAA-MM-JJ
  notes?: string;
  archived?: boolean;
  /** Code d'accès joueur (haché) ; absent = accès sans code */
  pinHash?: string;
  createdAt: string;
};

export type Match = {
  id: ID;
  date: string; // AAAA-MM-JJ
  opponent: string;
  home: boolean;
  competition?: string;
  scoreFor?: number;
  scoreAgainst?: number;
  notes?: string;
  createdAt: string;
};

/** Clés des statistiques de match. La liste affichée est dans constants.ts (STAT_FIELDS). */
export type StatKey =
  | 'goals'
  | 'assists'
  | 'shots'
  | 'shotsOnTarget'
  | 'keyPasses'
  | 'dribbles'
  | 'tackles'
  | 'interceptions'
  | 'duelsWon'
  | 'clearances'
  | 'saves'
  | 'goalsConceded'
  | 'penaltiesSaved'
  | 'highClaims'
  | 'offsides'
  | 'yellowCards'
  | 'redCards';

export type Stats = Partial<Record<StatKey, number>>;

/** Questionnaire d'après-match pour un joueur sur un match. */
export type PostMatchReport = {
  id: ID;
  matchId: ID;
  playerId: ID;
  minutesPlayed: number;
  starter: boolean;
  stats: Stats;
  /** Effort perçu (RPE, échelle de Borg CR-10) 0–10 */
  rpe?: number;
  /** Bien-être, 1 (très mauvais) à 5 (très bon) */
  fatigue?: number;
  sleep?: number;
  soreness?: number;
  stress?: number;
  mood?: number;
  /** Ressenti de sa propre performance, 1–10 */
  selfRating?: number;
  /** Note du coach, 1–10 */
  coachRating?: number;
  pain: boolean;
  painZone?: string;
  painLevel?: number; // 0–10
  playerComment?: string;
  coachComment?: string;
  /** Réponses aux questions personnalisées (clé = id de la question) */
  answers?: Record<string, Answer>;
  createdAt: string;
  updatedAt: string;
};

export type InjurySeverity = 'légère' | 'modérée' | 'grave';
export type InjuryStatus = 'active' | 'reprise' | 'guérie';

export type Injury = {
  id: ID;
  playerId: ID;
  matchId?: ID;
  date: string; // AAAA-MM-JJ
  bodyZone: string;
  type: string;
  side?: 'gauche' | 'droite' | 'les deux';
  severity: InjurySeverity;
  status: InjuryStatus;
  expectedReturn?: string; // AAAA-MM-JJ
  returnDate?: string; // AAAA-MM-JJ
  treatment?: string;
  notes?: string;
  createdAt: string;
};

export type AppData = {
  version: 1;
  teamName: string;
  /** Logo personnalisé (sinon logo du club intégré à l'appli) */
  logoUri?: string;
  /** Code d'accès coach (haché) */
  coachPinHash?: string;
  players: Player[];
  matches: Match[];
  reports: PostMatchReport[];
  injuries: Injury[];
  questions: CustomQuestion[];
  media: MediaItem[];
  lineups: Lineup[];
  sessions: TrainingSession[];
};

export type Attendance = 'present' | 'retard' | 'absent' | 'excuse' | 'blesse';

/** Séance d'entraînement avec présences et charge (RPE × durée). */
export type TrainingSession = {
  id: ID;
  date: string; // AAAA-MM-JJ
  time?: string; // HH:MM
  durationMin: number;
  theme?: string;
  notes?: string;
  /** RPE moyen de la séance, appliqué aux présents sans RPE individuel */
  rpe?: number;
  attendance: Record<ID, Attendance>;
  playerRpe: Record<ID, number>;
  createdAt: string;
};

/** Composition d'équipe pour un match. `slots` suit l'ordre des postes de la formation. */
export type Lineup = {
  matchId: ID;
  formation: string;
  slots: (ID | null)[];
  bench: ID[];
  captainId?: ID;
  notes?: string;
  /** Visible par les joueurs */
  published: boolean;
  /** Rendez-vous pour la convocation */
  meetTime?: string;
  meetPlace?: string;
  updatedAt: string;
};

export type Session = { role: 'coach' } | { role: 'player'; playerId: ID };

export type MediaKind = 'video' | 'photo' | 'link';
export type MediaCategory = 'Match' | 'Entraînement' | 'Analyse' | 'Adversaire' | 'Exercice' | 'Autre';

/** Temps fort repéré dans une vidéo (ex. 12:30 « pressing réussi »). */
export type MediaMarker = {
  id: ID;
  seconds: number;
  label: string;
  playerId?: ID;
};

/** Vidéo, photo ou lien (YouTube, Drive, Hudl…) ajouté par le coach. */
export type MediaItem = {
  id: ID;
  kind: MediaKind;
  title: string;
  uri: string;
  thumbnail?: string;
  category: MediaCategory;
  date: string; // AAAA-MM-JJ
  matchId?: ID;
  playerIds: ID[];
  notes?: string;
  /** Visible par tous les joueurs (sinon seulement par les joueurs tagués) */
  shared?: boolean;
  markers: MediaMarker[];
  createdAt: string;
};

export type QuestionType = 'scale' | 'yesno' | 'choice' | 'multi' | 'number' | 'text';

/** Question créée par le coach, posée en plus du questionnaire standard. */
export type CustomQuestion = {
  id: ID;
  label: string;
  type: QuestionType;
  help?: string;
  /** Échelle */
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  /** Choix unique / multiple */
  options?: string[];
  active: boolean;
  /** Réponse obligatoire (astérisque, comme dans Google Forms) */
  required?: boolean;
  /** Rubrique (ex. « Analyse du match ») : un titre est affiché quand elle change */
  section?: string;
};

export type Answer = number | boolean | string | string[];
