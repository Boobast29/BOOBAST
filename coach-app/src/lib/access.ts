import type { AppData, MediaItem, Session } from './types';

/** Routes (1er segment) accessibles à un joueur. Le reste est réservé au coach. */
export const PLAYER_ROUTES = new Set(['(tabs)', 'questionnaire', 'media', 'connexion', 'prepa', 'ressenti-seance', 'sondage', 'objectif']);
/** Onglets visibles par un joueur */
export const PLAYER_TABS = new Set(['index', 'compo', 'videos']);

export const isCoach = (s: Session | null) => s?.role === 'coach';

/** Un joueur voit les vidéos partagées à tous et celles où il est tagué. */
export function canSeeMedia(s: Session | null, m: MediaItem) {
  if (!s) return false;
  if (s.role === 'coach') return true;
  return !!m.shared || m.playerIds.includes(s.playerId) || m.markers.some((k) => k.playerId === s.playerId);
}

export function visibleMedia(data: AppData, s: Session | null) {
  return data.media.filter((m) => canSeeMedia(s, m));
}
