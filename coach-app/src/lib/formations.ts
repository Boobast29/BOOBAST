import { activeInjury, reportsForPlayer, summarizePlayer } from './stats';
import type { AppData, Lineup, Player } from './types';

export type Group = 'Gardien' | 'Défenseur' | 'Milieu' | 'Attaquant';

/** Poste sur le terrain : x de gauche à droite, y de notre but (0) au but adverse (1). */
export type Slot = { x: number; y: number; role: string; group: Group };

const GK: Slot = { x: 0.5, y: 0.08, role: 'GB', group: 'Gardien' };
const BACK4: Slot[] = [
  { x: 0.13, y: 0.3, role: 'DG', group: 'Défenseur' },
  { x: 0.38, y: 0.25, role: 'DC', group: 'Défenseur' },
  { x: 0.62, y: 0.25, role: 'DC', group: 'Défenseur' },
  { x: 0.87, y: 0.3, role: 'DD', group: 'Défenseur' },
];
const BACK3: Slot[] = [
  { x: 0.24, y: 0.26, role: 'DC', group: 'Défenseur' },
  { x: 0.5, y: 0.24, role: 'DC', group: 'Défenseur' },
  { x: 0.76, y: 0.26, role: 'DC', group: 'Défenseur' },
];

export const FORMATIONS: Record<string, Slot[]> = {
  '4-4-2': [
    GK,
    ...BACK4,
    { x: 0.13, y: 0.53, role: 'MG', group: 'Milieu' },
    { x: 0.38, y: 0.48, role: 'MC', group: 'Milieu' },
    { x: 0.62, y: 0.48, role: 'MC', group: 'Milieu' },
    { x: 0.87, y: 0.53, role: 'MD', group: 'Milieu' },
    { x: 0.36, y: 0.78, role: 'BU', group: 'Attaquant' },
    { x: 0.64, y: 0.78, role: 'BU', group: 'Attaquant' },
  ],
  '4-3-3': [
    GK,
    ...BACK4,
    { x: 0.25, y: 0.5, role: 'MC', group: 'Milieu' },
    { x: 0.5, y: 0.43, role: 'MDC', group: 'Milieu' },
    { x: 0.75, y: 0.5, role: 'MC', group: 'Milieu' },
    { x: 0.16, y: 0.76, role: 'AG', group: 'Attaquant' },
    { x: 0.5, y: 0.82, role: 'BU', group: 'Attaquant' },
    { x: 0.84, y: 0.76, role: 'AD', group: 'Attaquant' },
  ],
  '4-2-3-1': [
    GK,
    ...BACK4,
    { x: 0.35, y: 0.42, role: 'MDC', group: 'Milieu' },
    { x: 0.65, y: 0.42, role: 'MDC', group: 'Milieu' },
    { x: 0.15, y: 0.64, role: 'MOG', group: 'Milieu' },
    { x: 0.5, y: 0.62, role: 'MOC', group: 'Milieu' },
    { x: 0.85, y: 0.64, role: 'MOD', group: 'Milieu' },
    { x: 0.5, y: 0.84, role: 'BU', group: 'Attaquant' },
  ],
  '4-1-4-1': [
    GK,
    ...BACK4,
    { x: 0.5, y: 0.39, role: 'MDC', group: 'Milieu' },
    { x: 0.13, y: 0.6, role: 'MG', group: 'Milieu' },
    { x: 0.38, y: 0.57, role: 'MC', group: 'Milieu' },
    { x: 0.62, y: 0.57, role: 'MC', group: 'Milieu' },
    { x: 0.87, y: 0.6, role: 'MD', group: 'Milieu' },
    { x: 0.5, y: 0.84, role: 'BU', group: 'Attaquant' },
  ],
  '3-5-2': [
    GK,
    ...BACK3,
    { x: 0.08, y: 0.52, role: 'PG', group: 'Milieu' },
    { x: 0.3, y: 0.47, role: 'MC', group: 'Milieu' },
    { x: 0.5, y: 0.41, role: 'MDC', group: 'Milieu' },
    { x: 0.7, y: 0.47, role: 'MC', group: 'Milieu' },
    { x: 0.92, y: 0.52, role: 'PD', group: 'Milieu' },
    { x: 0.36, y: 0.8, role: 'BU', group: 'Attaquant' },
    { x: 0.64, y: 0.8, role: 'BU', group: 'Attaquant' },
  ],
  '3-4-3': [
    GK,
    ...BACK3,
    { x: 0.1, y: 0.5, role: 'MG', group: 'Milieu' },
    { x: 0.37, y: 0.46, role: 'MC', group: 'Milieu' },
    { x: 0.63, y: 0.46, role: 'MC', group: 'Milieu' },
    { x: 0.9, y: 0.5, role: 'MD', group: 'Milieu' },
    { x: 0.18, y: 0.77, role: 'AG', group: 'Attaquant' },
    { x: 0.5, y: 0.83, role: 'BU', group: 'Attaquant' },
    { x: 0.82, y: 0.77, role: 'AD', group: 'Attaquant' },
  ],
  '5-3-2': [
    GK,
    { x: 0.08, y: 0.35, role: 'DG', group: 'Défenseur' },
    { x: 0.29, y: 0.26, role: 'DC', group: 'Défenseur' },
    { x: 0.5, y: 0.24, role: 'DC', group: 'Défenseur' },
    { x: 0.71, y: 0.26, role: 'DC', group: 'Défenseur' },
    { x: 0.92, y: 0.35, role: 'DD', group: 'Défenseur' },
    { x: 0.25, y: 0.52, role: 'MC', group: 'Milieu' },
    { x: 0.5, y: 0.47, role: 'MC', group: 'Milieu' },
    { x: 0.75, y: 0.52, role: 'MC', group: 'Milieu' },
    { x: 0.36, y: 0.8, role: 'BU', group: 'Attaquant' },
    { x: 0.64, y: 0.8, role: 'BU', group: 'Attaquant' },
  ],
};

export const FORMATION_KEYS = Object.keys(FORMATIONS);
export const DEFAULT_FORMATION = '4-3-3';
export const MAX_BENCH = 7;

export const emptyLineup = (matchId: string, formation = DEFAULT_FORMATION): Omit<Lineup, 'updatedAt'> => ({
  matchId,
  formation,
  slots: FORMATIONS[formation].map(() => null),
  bench: [],
  published: false,
});

/** Change de formation en gardant chaque joueur sur un poste du même type quand c'est possible. */
export function remapFormation(l: Omit<Lineup, 'updatedAt'>, formation: string): Omit<Lineup, 'updatedAt'> {
  const from = FORMATIONS[l.formation] ?? FORMATIONS[DEFAULT_FORMATION];
  const to = FORMATIONS[formation];
  const placed = l.slots.map((id, i) => ({ id, group: from[i]?.group })).filter((x): x is { id: string; group: Group } => !!x.id);
  const slots: (string | null)[] = to.map(() => null);
  const left = [...placed];
  to.forEach((s, i) => {
    const k = left.findIndex((p) => p.group === s.group);
    if (k !== -1) slots[i] = left.splice(k, 1)[0].id;
  });
  to.forEach((_, i) => {
    if (!slots[i] && left.length) slots[i] = left.shift()!.id;
  });
  // Joueurs en trop (ex. 11 → formation identique en nombre, jamais le cas ici) : sur le banc
  return { ...l, formation, slots, bench: [...l.bench, ...left.map((p) => p.id)] };
}

/** Indice de sélection : note coach, forme et état physique. */
export function selectionScore(data: AppData, p: Player) {
  const s = summarizePlayer(data, p);
  const inj = activeInjury(data, p.id);
  const last = reportsForPlayer(data, p.id)[0];
  let score = (s.avgCoachRating ?? 5.5) + (s.avgWellness ?? 3) * 0.6 + Math.min(s.matchesPlayed, 5) * 0.1;
  if (inj?.status === 'active') score -= 100;
  else if (inj?.status === 'reprise') score -= 2;
  if (last?.pain) score -= 1.5;
  return score;
}

/** Compo automatique : les meilleurs disponibles à chaque poste, puis le banc. */
export function autoLineup(data: AppData, matchId: string, formation: string, keep?: Lineup): Omit<Lineup, 'updatedAt'> {
  const slotsDef = FORMATIONS[formation];
  const pool = data.players
    .filter((p) => !p.archived && activeInjury(data, p.id)?.status !== 'active')
    .map((p) => ({ p, score: selectionScore(data, p) }))
    .sort((a, b) => b.score - a.score);
  const slots: (string | null)[] = slotsDef.map(() => null);
  const used = new Set<string>();
  // 1) joueurs du bon poste
  slotsDef.forEach((s, i) => {
    const c = pool.find((x) => !used.has(x.p.id) && x.p.position === s.group);
    if (c) {
      slots[i] = c.p.id;
      used.add(c.p.id);
    }
  });
  // 2) postes restants : meilleurs joueurs de champ restants (jamais un gardien hors des buts)
  slotsDef.forEach((s, i) => {
    if (slots[i]) return;
    const c = pool.find((x) => !used.has(x.p.id) && (s.group === 'Gardien' || x.p.position !== 'Gardien'));
    if (c) {
      slots[i] = c.p.id;
      used.add(c.p.id);
    }
  });
  const bench = pool.filter((x) => !used.has(x.p.id)).slice(0, MAX_BENCH).map((x) => x.p.id);
  const captainId = keep?.captainId && slots.includes(keep.captainId) ? keep.captainId : undefined;
  return { matchId, formation, slots, bench, captainId, notes: keep?.notes, published: keep?.published ?? false };
}
