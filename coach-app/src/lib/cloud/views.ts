import { canSeeMedia } from '../access';
import { FORMATIONS } from '../formations';
import { daysBetween, formatDate, today } from '../stats';
import { pendingSurveys, pendingTrainingFeedback } from '../surveys';
import type { AppData, Objective, Player, PostMatchReport, SurveyResponse, TrainingFeedback } from '../types';

/** Élément de notification : clé stable (dédoublonnage côté serveur), texte, écran à ouvrir. */
export type NotifItem = { key: string; title: string; body: string; route: string };

export type PlayerViewData = AppData & { todos: NotifItem[]; news: NotifItem[] };

/** Réponse d'un joueur stockée dans le cloud (table player_entries). */
export type Entry =
  | { kind: 'report'; player_id: string; ref_id: string; payload: PostMatchReport; updated_at?: string }
  | { kind: 'training_feedback'; player_id: string; ref_id: string; payload: TrainingFeedback; updated_at?: string }
  | { kind: 'survey_response'; player_id: string; ref_id: string; payload: SurveyResponse; updated_at?: string }
  | { kind: 'objective'; player_id: string; ref_id: string; payload: Pick<Objective, 'playerProgress' | 'playerComment'>; updated_at?: string };

/** Fiche minimale des coéquipiers (compo, vidéos) : ni notes du coach, ni code. */
const publicPlayer = (p: Player): Player => ({
  id: p.id,
  firstName: p.firstName,
  lastName: p.lastName,
  number: p.number,
  position: p.position,
  photoUri: p.photoUri && /^https?:/.test(p.photoUri) ? p.photoUri : undefined,
  archived: p.archived,
  createdAt: p.createdAt,
});

/** Tâches à faire (notifiées puis rappelées chaque jour tant qu'elles ne sont pas faites). */
export function playerTodos(data: AppData, playerId: string): NotifItem[] {
  const done = new Set(data.reports.filter((r) => r.playerId === playerId).map((r) => r.matchId));
  const matches: NotifItem[] = data.matches
    .filter((m) => m.scoreFor != null && !done.has(m.id) && m.date <= today() && daysBetween(m.date, today()) <= 30)
    .map((m) => ({
      key: `match:${m.id}`,
      title: '⚽ Questionnaire d’après-match',
      body: `${m.home ? 'vs' : '@'} ${m.opponent} : donne ton ressenti au coach.`,
      route: `/questionnaire?matchId=${m.id}&playerId=${playerId}`,
    }));
  const trainings: NotifItem[] = pendingTrainingFeedback(data, playerId).map((x) => ({
    key: `seance:${x.id}`,
    title: '🏃 Ressenti de l’entraînement',
    body: `Séance du ${formatDate(x.date)}${x.theme ? ` (${x.theme})` : ''} : qualité, perf, intensité.`,
    route: `/ressenti-seance?sessionId=${x.id}&playerId=${playerId}`,
  }));
  const surveys: NotifItem[] = pendingSurveys(data, playerId).map((s) => ({
    key: `sondage:${s.id}`,
    title: `📋 ${s.title}`,
    body: s.dueDate ? `Nouveau questionnaire du coach, à rendre avant le ${formatDate(s.dueDate)}.` : 'Nouveau questionnaire du coach.',
    route: `/sondage/${s.id}`,
  }));
  const objectives: NotifItem[] = data.objectives
    .filter((o) => o.playerId === playerId && o.status === 'en cours' && o.playerProgress == null)
    .map((o) => ({ key: `objectif:${o.id}`, title: '🎯 Nouveau point à travailler', body: `${o.title} : dis au coach où tu en es.`, route: `/objectif/${o.id}` }));
  return [...matches, ...trainings, ...surveys, ...objectives];
}

/** Informations (notifiées une seule fois) : préparation et compo publiées. */
export function playerNews(data: AppData, playerId: string): NotifItem[] {
  const upcoming = data.matches.filter((m) => m.scoreFor == null && m.date >= today());
  const news: NotifItem[] = [];
  for (const m of upcoming) {
    const label = `${m.home ? 'vs' : '@'} ${m.opponent}`;
    if (m.prep?.published) news.push({ key: `prepa:${m.id}`, title: '📝 Préparation du match', body: `Le coach a publié les consignes pour ${label}.`, route: `/prepa?matchId=${m.id}` });
    const l = data.lineups.find((x) => x.matchId === m.id && x.published);
    if (l) {
      const i = l.slots.indexOf(playerId);
      const status = i >= 0 ? `Tu es titulaire (${FORMATIONS[l.formation]?.[i]?.role ?? ''})` : l.bench.includes(playerId) ? 'Tu es remplaçant' : 'Tu n’es pas retenu cette fois';
      news.push({ key: `compo:${m.id}`, title: '📣 Compo publiée', body: `${label} : ${status}.`, route: `/compo?matchId=${m.id}` });
    }
  }
  return news;
}

/**
 * Données visibles par un joueur : lui, ses coéquipiers (nom, numéro, poste), les matchs sans le débrief du coach,
 * les préparations et compos publiées, ses propres questionnaires (sans la note du coach), ses blessures,
 * ses points à travailler, les questionnaires qui lui sont destinés et les vidéos partagées avec lui.
 */
export function buildPlayerView(data: AppData, playerId: string): PlayerViewData {
  const session = { role: 'player' as const, teamId: '', playerId };
  const me = data.players.find((p) => p.id === playerId);
  return {
    version: data.version,
    teamName: data.teamName,
    players: data.players.filter((p) => !p.archived || p.id === playerId).map((p) => (p.id === playerId && me ? { ...publicPlayer(me) } : publicPlayer(p))),
    matches: data.matches.map(({ debrief: _debrief, prep, notes: _notes, ...m }) => ({ ...m, prep: prep?.published ? prep : undefined })),
    reports: data.reports.filter((r) => r.playerId === playerId).map(({ coachRating: _cr, coachComment: _cc, ...r }) => r),
    injuries: data.injuries.filter((i) => i.playerId === playerId),
    questions: data.questions,
    media: data.media.filter((m) => canSeeMedia(session, m)),
    lineups: data.lineups
      .filter((l) => l.published)
      .map((l) => ({
        ...l,
        guestPlayers: l.guestPlayers
          ?.filter((p) => l.slots.includes(p.id) || l.bench.includes(p.id))
          .map((p) => ({ ...p, photoUri: p.photoUri && /^https?:/.test(p.photoUri) ? p.photoUri : undefined })),
      })),
    sessions: data.sessions.map((x) => ({
      id: x.id,
      date: x.date,
      time: x.time,
      durationMin: x.durationMin,
      theme: x.theme,
      rpe: x.rpe,
      attendance: x.attendance[playerId] ? { [playerId]: x.attendance[playerId] } : {},
      playerRpe: x.playerRpe[playerId] != null ? { [playerId]: x.playerRpe[playerId] } : {},
      feedback: x.feedback?.[playerId] ? { [playerId]: x.feedback[playerId] } : {},
      createdAt: x.createdAt,
    })),
    objectives: data.objectives.filter((o) => o.playerId === playerId),
    surveys: data.surveys.filter((s) => s.target === 'all' || s.target.includes(playerId)),
    surveyResponses: data.surveyResponses.filter((r) => r.playerId === playerId),
    todos: playerTodos(data, playerId),
    news: playerNews(data, playerId),
  };
}

const newer = (a?: string, b?: string) => !b || (a ?? '') >= b;

/** Intègre les réponses des joueurs dans les données (appli du coach, ou vue du joueur + ses envois). */
export function mergeEntries(data: AppData, entries: Entry[]): { data: AppData; changed: boolean } {
  let changed = false;
  let d = data;
  for (const e of entries) {
    if (!d.players.some((p) => p.id === e.player_id)) continue;
    if (e.kind === 'report') {
      const cur = d.reports.find((r) => r.matchId === e.ref_id && r.playerId === e.player_id);
      if (cur && !newer(e.payload.updatedAt, cur.updatedAt)) continue;
      if (cur && JSON.stringify({ ...cur, coachRating: undefined, coachComment: undefined, id: undefined }) === JSON.stringify({ ...e.payload, coachRating: undefined, coachComment: undefined, id: undefined })) continue;
      // Les champs du coach (note, commentaire) sont conservés
      const merged: PostMatchReport = { ...e.payload, id: cur?.id ?? e.payload.id, playerId: e.player_id, matchId: e.ref_id, coachRating: cur?.coachRating, coachComment: cur?.coachComment };
      d = { ...d, reports: cur ? d.reports.map((r) => (r === cur ? merged : r)) : [...d.reports, merged] };
      changed = true;
    } else if (e.kind === 'training_feedback') {
      const s = d.sessions.find((x) => x.id === e.ref_id);
      if (!s) continue;
      const cur = s.feedback?.[e.player_id];
      if (cur && (!newer(e.payload.updatedAt, cur.updatedAt) || JSON.stringify(cur) === JSON.stringify(e.payload))) continue;
      d = { ...d, sessions: d.sessions.map((x) => (x.id === s.id ? { ...x, feedback: { ...x.feedback, [e.player_id]: e.payload } } : x)) };
      changed = true;
    } else if (e.kind === 'survey_response') {
      const cur = d.surveyResponses.find((r) => r.surveyId === e.ref_id && r.playerId === e.player_id);
      if (cur && (!newer(e.payload.updatedAt, cur.updatedAt) || JSON.stringify(cur.answers) === JSON.stringify(e.payload.answers))) continue;
      const merged: SurveyResponse = { ...e.payload, id: cur?.id ?? e.payload.id, surveyId: e.ref_id, playerId: e.player_id };
      d = { ...d, surveyResponses: cur ? d.surveyResponses.map((r) => (r === cur ? merged : r)) : [...d.surveyResponses, merged] };
      changed = true;
    } else if (e.kind === 'objective') {
      const o = d.objectives.find((x) => x.id === e.ref_id && x.playerId === e.player_id);
      if (!o || (o.playerProgress === e.payload.playerProgress && o.playerComment === e.payload.playerComment)) continue;
      d = { ...d, objectives: d.objectives.map((x) => (x === o ? { ...x, playerProgress: e.payload.playerProgress, playerComment: e.payload.playerComment } : x)) };
      changed = true;
    }
  }
  return { data: d, changed };
}

/** Données envoyées au serveur pour l'écran « Qui es-tu ? » (noms + code haché). */
export function rosterFor(data: AppData) {
  return data.players.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    number: p.number ?? null,
    position: p.position ?? null,
    photoUrl: p.photoUri && /^https?:/.test(p.photoUri) ? p.photoUri : null,
    pinHash: p.pinHash ?? null,
    archived: !!p.archived,
  }));
}
