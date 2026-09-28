import type { IconName } from '../components/ui';
import type { Attendance, CustomQuestion, MatchPrep, InjuryStatus, MediaCategory, QuestionType, StatKey } from './types';

export const POSITIONS = ['Gardien', 'Défenseur', 'Milieu', 'Attaquant'];
type Position = 'Gardien' | 'Défenseur' | 'Milieu' | 'Attaquant';

const FIELD: Position[] = ['Défenseur', 'Milieu', 'Attaquant'];

/**
 * Statistiques saisies après chaque match. `positions` = postes pour lesquels la stat est proposée
 * (absent = tous les postes). Modifier cette liste pour l'adapter au sport.
 */
export const STAT_FIELDS: { key: StatKey; label: string; short: string; icon: IconName; positions?: Position[]; max?: number }[] = [
  { key: 'goals', label: 'Buts', short: 'B', icon: 'football-outline', positions: FIELD },
  { key: 'assists', label: 'Passes décisives', short: 'PD', icon: 'git-branch-outline', positions: FIELD },
  { key: 'shots', label: 'Tirs', short: 'T', icon: 'locate-outline', positions: FIELD },
  { key: 'shotsOnTarget', label: 'Tirs cadrés', short: 'TC', icon: 'radio-button-on-outline', positions: ['Milieu', 'Attaquant'] },
  { key: 'keyPasses', label: 'Passes clés', short: 'PC', icon: 'key-outline', positions: ['Milieu', 'Attaquant'] },
  { key: 'dribbles', label: 'Dribbles réussis', short: 'Dr', icon: 'flash-outline', positions: ['Milieu', 'Attaquant'] },
  { key: 'offsides', label: 'Hors-jeu', short: 'HJ', icon: 'flag-outline', positions: ['Attaquant'] },
  { key: 'tackles', label: 'Tacles / récupérations', short: 'Réc', icon: 'shield-half-outline', positions: ['Défenseur', 'Milieu'] },
  { key: 'interceptions', label: 'Interceptions', short: 'Int', icon: 'hand-right-outline', positions: ['Défenseur', 'Milieu'] },
  { key: 'duelsWon', label: 'Duels gagnés', short: 'Duel', icon: 'barbell-outline', positions: FIELD },
  { key: 'clearances', label: 'Dégagements', short: 'Dég', icon: 'arrow-up-circle-outline', positions: ['Défenseur'] },
  { key: 'saves', label: 'Arrêts', short: 'Arr', icon: 'hand-left-outline', positions: ['Gardien'] },
  { key: 'goalsConceded', label: 'Buts encaissés', short: 'BE', icon: 'alert-circle-outline', positions: ['Gardien'] },
  { key: 'highClaims', label: 'Sorties aériennes', short: 'Sort', icon: 'arrow-up-outline', positions: ['Gardien'] },
  { key: 'penaltiesSaved', label: 'Penaltys arrêtés', short: 'PA', icon: 'shield-checkmark-outline', positions: ['Gardien'] },
  { key: 'yellowCards', label: 'Cartons jaunes', short: 'CJ', icon: 'square', max: 2 },
  { key: 'redCards', label: 'Cartons rouges', short: 'CR', icon: 'square', max: 1 },
];

/** Stats proposées pour un poste (toutes si le poste n'est pas renseigné). */
export const statsForPosition = (position?: string) =>
  POSITIONS.includes(position ?? '') ? STAT_FIELDS.filter((f) => !f.positions || f.positions.includes(position as Position)) : STAT_FIELDS;

export const BODY_ZONES = [
  'Tête',
  'Cou',
  'Épaule',
  'Bras / coude',
  'Poignet / main',
  'Dos',
  'Hanche / aine',
  'Ischios',
  'Quadriceps',
  'Genou',
  'Mollet',
  'Cheville',
  'Pied',
  'Autre',
];

export const INJURY_TYPES = [
  'Contusion',
  'Élongation',
  'Contracture',
  'Déchirure',
  'Entorse',
  'Tendinite',
  'Fracture',
  'Commotion',
  'Luxation',
  'Autre',
];

export const WELLNESS_FIELDS = [
  { key: 'fatigue', label: 'Fraîcheur', hint: '1 = épuisé · 5 = très frais' },
  { key: 'sleep', label: 'Sommeil', hint: '1 = très mauvais · 5 = excellent' },
  { key: 'soreness', label: 'Courbatures', hint: '1 = très douloureux · 5 = aucune' },
  { key: 'stress', label: 'Stress', hint: '1 = très stressé · 5 = détendu' },
  { key: 'mood', label: 'Moral', hint: '1 = très bas · 5 = excellent' },
] as const;

export type WellnessKey = (typeof WELLNESS_FIELDS)[number]['key'];

/** Seuils d'alerte */
export const ALERTS = {
  wellnessLow: 2.5, // moyenne bien-être (sur 5) en dessous de laquelle on alerte
  rpeHigh: 8,
  loadSpike: 1.5, // ratio charge aiguë / chronique
};

export const INJURY_STATUS_LABEL: Record<InjuryStatus, string> = {
  active: 'Indisponible',
  reprise: 'En reprise',
  guérie: 'Guérie',
};

export const INJURY_STATUS_TONE: Record<InjuryStatus, 'danger' | 'warning' | 'success'> = {
  active: 'danger',
  reprise: 'warning',
  guérie: 'success',
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  scale: 'Échelle',
  yesno: 'Oui / Non',
  choice: 'Choix unique',
  multi: 'Choix multiples',
  number: 'Nombre',
  text: 'Texte libre',
};

/** Modèles de questions d'après-match, ajoutables en un appui dans Réglages → Questions. */
export const QUESTION_TEMPLATES: Omit<CustomQuestion, 'id' | 'active'>[] = [
  { label: 'Comment as-tu vécu le match ?', type: 'scale', min: 1, max: 5, minLabel: 'Très mal', maxLabel: 'Très bien' },
  { label: 'Es-tu satisfait de ton temps de jeu ?', type: 'scale', min: 1, max: 5, minLabel: 'Pas du tout', maxLabel: 'Totalement' },
  { label: 'Niveau de confiance pendant le match', type: 'scale', min: 1, max: 10, minLabel: 'Aucune', maxLabel: 'Totale' },
  { label: 'As-tu compris les consignes tactiques ?', type: 'scale', min: 1, max: 5, minLabel: 'Pas du tout', maxLabel: 'Parfaitement' },
  { label: 'As-tu respecté ton rôle / ton poste ?', type: 'yesno' },
  { label: 'Qualité de la communication avec tes coéquipiers', type: 'scale', min: 1, max: 5, minLabel: 'Mauvaise', maxLabel: 'Excellente' },
  { label: 'Ton niveau d’engagement', type: 'scale', min: 1, max: 10, minLabel: 'Faible', maxLabel: 'Maximal' },
  { label: 'Qu’est-ce qui a bien fonctionné pour toi ?', type: 'text' },
  { label: 'Qu’est-ce que tu dois améliorer ?', type: 'text' },
  { label: 'Tes points forts sur ce match', type: 'multi', options: ['Technique', 'Physique', 'Placement', 'Duels', 'Jeu de tête', 'Vitesse', 'Mental', 'Communication'] },
  { label: 'Points à travailler', type: 'multi', options: ['Technique', 'Physique', 'Placement', 'Duels', 'Jeu de tête', 'Vitesse', 'Mental', 'Communication'] },
  { label: 'Comment évalues-tu la performance de l’équipe ?', type: 'scale', min: 1, max: 10, minLabel: 'Très mauvaise', maxLabel: 'Excellente' },
  { label: 'Moment le plus difficile du match', type: 'choice', options: ['Début de match', 'Fin de 1re mi-temps', 'Début de 2e mi-temps', 'Fin de match', 'Aucun'] },
  { label: 'Heures de sommeil la nuit d’avant', type: 'number' },
  { label: 'As-tu bien mangé et bu avant le match ?', type: 'yesno' },
  { label: 'As-tu fait tes étirements / ta récupération après le match ?', type: 'yesno' },
  { label: 'As-tu reçu un coup ou un choc ?', type: 'yesno' },
  { label: 'Te sens-tu prêt pour le prochain entraînement ?', type: 'choice', options: ['Oui, à 100 %', 'Oui, mais fatigué', 'Pas sûr', 'Non'] },
  { label: 'Un message pour le coach ?', type: 'text' },
];

export const MEDIA_CATEGORIES: MediaCategory[] = ['Match', 'Entraînement', 'Analyse', 'Adversaire', 'Exercice', 'Autre'];

const QEA_SCALE = { type: 'scale' as const, min: 1, max: 10, minLabel: 'Très mauvaise', maxLabel: 'Exceptionnel', required: true, active: true };

/**
 * Questionnaire d'après-match du Quimper Ergué Armel FC (repris du Google Forms du club).
 * « Ta performance » et « Commentaires divers » sont les questions intégrées (auto-évaluation et commentaire du joueur).
 */
export const QEA_QUESTIONS: CustomQuestion[] = [
  { id: 'qea-sortie', label: 'Sortie de balle', section: 'Analyse du match', ...QEA_SCALE },
  { id: 'qea-att', label: 'Attaque de la surface', section: 'Analyse du match', ...QEA_SCALE },
  { id: 'qea-def', label: 'Défendre sa surface', section: 'Analyse du match', ...QEA_SCALE },
  { id: 'qea-press', label: 'Qualité du pressing', section: 'Analyse du match', ...QEA_SCALE },
  { id: 'qea-to', label: 'Transition offensive', section: 'Analyse du match', ...QEA_SCALE },
  { id: 'qea-td', label: 'Transition défensive', section: 'Analyse du match', ...QEA_SCALE },
  { id: 'qea-eq', label: 'La performance de l’équipe ?', section: 'Analyse du match', ...QEA_SCALE },
  { id: 'qea-forme', label: 'État de forme physique', section: 'Toi', ...QEA_SCALE },
];

/** Descriptions affichées sous le titre des rubriques du questionnaire. */
export const SECTION_DESCRIPTIONS: Record<string, string> = {
  'Analyse du match': 'L’objectif est de dresser les points forts et les axes d’amélioration de l’équipe sur ce match.',
};

export const SELF_RATING_LABEL = 'Ta performance';
export const PLAYER_COMMENT_LABEL = 'Commentaires divers (préparation du match, intention de jeu sur le match, attitude coach, staff, etc.)';

export const ATTENDANCE: Record<Attendance, { label: string; short: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  present: { label: 'Présent', short: 'P', tone: 'success' },
  retard: { label: 'En retard', short: 'R', tone: 'warning' },
  absent: { label: 'Absent', short: 'A', tone: 'danger' },
  excuse: { label: 'Excusé', short: 'E', tone: 'info' },
  blesse: { label: 'Blessé', short: 'B', tone: 'neutral' },
};

export const TRAINING_THEMES = ['Physique', 'Technique', 'Tactique', 'Jeu réduit', 'Finition', 'Coups de pied arrêtés', 'Récupération', 'Veille de match'];

type PrepKey = Exclude<keyof MatchPrep, 'published'>;

/** Rubriques de la préparation de match. */
export const PREP_FIELDS: { key: PrepKey; label: string; icon: IconName; placeholder: string; group: 'adv' | 'nous' }[] = [
  { key: 'opponentSystem', label: 'Système adverse', icon: 'grid-outline', placeholder: 'Ex. : 4-4-2 à plat, bloc bas', group: 'adv' },
  { key: 'keyPlayers', label: 'Joueurs clés adverses', icon: 'person-outline', placeholder: 'Ex. : le 9 très fort de la tête, le 10 gaucher…', group: 'adv' },
  { key: 'strengths', label: 'Leurs forces', icon: 'trending-up-outline', placeholder: 'Transitions rapides, coups de pied arrêtés…', group: 'adv' },
  { key: 'weaknesses', label: 'Leurs faiblesses', icon: 'trending-down-outline', placeholder: 'Lents derrière, dans le dos des latéraux…', group: 'adv' },
  { key: 'attack', label: 'Consignes offensives', icon: 'flash-outline', placeholder: 'Sortie de balle, attaque de la surface…', group: 'nous' },
  { key: 'defense', label: 'Consignes défensives', icon: 'shield-outline', placeholder: 'Pressing, bloc, défendre sa surface…', group: 'nous' },
  { key: 'setPieces', label: 'Coups de pied arrêtés', icon: 'flag-outline', placeholder: 'Qui tire, placements, marquages…', group: 'nous' },
  { key: 'objectives', label: 'Objectifs du match', icon: 'trophy-outline', placeholder: 'Ex. : gagner 60 % des duels, 0 but encaissé sur CPA…', group: 'nous' },
  { key: 'message', label: 'Message au groupe', icon: 'megaphone-outline', placeholder: 'Le mot du coach…', group: 'nous' },
];


/** Rubriques du débrief d'après-match (coach). */
export const DEBRIEF_FIELDS: { key: 'positives' | 'problems' | 'solutions' | 'toWork'; label: string; icon: IconName; placeholder: string; tone: 'success' | 'danger' | 'info' | 'warning' }[] = [
  { key: 'positives', label: 'Points positifs', icon: 'thumbs-up-outline', placeholder: 'Ce qui a bien marché…', tone: 'success' },
  { key: 'problems', label: 'Problématiques rencontrées', icon: 'alert-circle-outline', placeholder: 'Ex. : difficultés à sortir le ballon sous pression…', tone: 'danger' },
  { key: 'solutions', label: 'Solutions trouvées / à tester', icon: 'bulb-outline', placeholder: 'Ex. : passage à 3 derrière à la relance, 6 qui décroche…', tone: 'info' },
  { key: 'toWork', label: 'À retravailler à l’entraînement', icon: 'construct-outline', placeholder: 'Ex. : jeu court en sortie de balle, repli défensif…', tone: 'warning' },
];

export const OBJECTIVE_CATEGORIES = ['Technique', 'Tactique', 'Physique', 'Mental', 'Comportement'];

export const OBJECTIVE_STATUS_TONE = { 'en cours': 'info', acquis: 'success', abandonné: 'neutral' } as const;
