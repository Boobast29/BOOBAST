import { today } from './stats';
import type { AppData, Survey } from './types';

/** Joueurs à qui s'adresse un questionnaire. */
export function surveyTargets(data: AppData, s: Survey) {
  return data.players.filter((p) => !p.archived && (s.target === 'all' || s.target.includes(p.id)));
}

/** Questionnaires ouverts auxquels le joueur n'a pas encore répondu. */
export function pendingSurveys(data: AppData, playerId: string) {
  return data.surveys.filter(
    (s) =>
      s.open &&
      (s.target === 'all' || s.target.includes(playerId)) &&
      !data.surveyResponses.some((r) => r.surveyId === s.id && r.playerId === playerId),
  );
}

/** Séances des 14 derniers jours où le joueur était présent et n'a pas encore donné son ressenti. */
export function pendingTrainingFeedback(data: AppData, playerId: string) {
  const limit = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  return data.sessions
    .filter((x) => x.date <= today() && x.date >= limit)
    .filter((x) => ['present', 'retard'].includes(x.attendance[playerId]) && !x.feedback?.[playerId])
    .sort((a, b) => b.date.localeCompare(a.date));
}
