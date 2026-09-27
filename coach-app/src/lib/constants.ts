import type { InjuryStatus, StatKey } from './types';

/** Statistiques saisies après chaque match. Modifier cette liste pour l'adapter au sport. */
export const STAT_FIELDS: { key: StatKey; label: string; short: string }[] = [
  { key: 'goals', label: 'Buts', short: 'B' },
  { key: 'assists', label: 'Passes décisives', short: 'PD' },
  { key: 'shots', label: 'Tirs', short: 'T' },
  { key: 'shotsOnTarget', label: 'Tirs cadrés', short: 'TC' },
  { key: 'tackles', label: 'Tacles / récupérations', short: 'Réc' },
  { key: 'saves', label: 'Arrêts (gardien)', short: 'Arr' },
  { key: 'yellowCards', label: 'Cartons jaunes', short: 'CJ' },
  { key: 'redCards', label: 'Cartons rouges', short: 'CR' },
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
