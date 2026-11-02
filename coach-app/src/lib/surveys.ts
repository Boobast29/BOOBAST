import type { AppData, Survey } from './types';

/** Joueurs à qui s'adresse un questionnaire. */
export function surveyTargets(data: AppData, s: Survey) {
  return data.players.filter((p) => !p.archived && (s.target === 'all' || s.target.includes(p.id)));
}
