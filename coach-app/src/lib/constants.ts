import type { IconName } from '../components/ui';
import type { CustomQuestion, InjuryStatus, MediaCategory, QuestionType, StatKey } from './types';

/** Statistiques saisies après chaque match. Modifier cette liste pour l'adapter au sport. */
export const STAT_FIELDS: { key: StatKey; label: string; short: string; icon: IconName }[] = [
  { key: 'goals', label: 'Buts', short: 'B', icon: 'football-outline' },
  { key: 'assists', label: 'Passes décisives', short: 'PD', icon: 'git-branch-outline' },
  { key: 'shots', label: 'Tirs', short: 'T', icon: 'locate-outline' },
  { key: 'shotsOnTarget', label: 'Tirs cadrés', short: 'TC', icon: 'radio-button-on-outline' },
  { key: 'tackles', label: 'Tacles / récupérations', short: 'Réc', icon: 'shield-half-outline' },
  { key: 'saves', label: 'Arrêts (gardien)', short: 'Arr', icon: 'hand-left-outline' },
  { key: 'yellowCards', label: 'Cartons jaunes', short: 'CJ', icon: 'square' },
  { key: 'redCards', label: 'Cartons rouges', short: 'CR', icon: 'square' },
];

export const POSITIONS = ['Gardien', 'Défenseur', 'Milieu', 'Attaquant'];

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
