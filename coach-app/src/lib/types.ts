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
  | 'tackles'
  | 'saves'
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
  players: Player[];
  matches: Match[];
  reports: PostMatchReport[];
  injuries: Injury[];
  questions: CustomQuestion[];
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
};

export type Answer = number | boolean | string | string[];
