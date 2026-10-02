import { daysBetween, formatDate, matchLabel, today } from './stats';
import type { AppData, Dispatch, ID, Match, Player, Survey, TrainingSession } from './types';

/**
 * Demandes du coach aux joueurs : questionnaire d'après-match, ressenti de séance, questionnaire ponctuel.
 * Une demande n'existe pour les joueurs qu'une fois envoyée (bouton « Envoyer »).
 */
export type RequestKind = 'match' | 'seance' | 'sondage';

export type Request = {
  kind: RequestKind;
  id: ID;
  title: string;
  subtitle: string;
  /** Date de l'événement (tri) */
  date: string;
  dispatch?: Dispatch;
  /** Joueurs concernés (envoyés, ou proposés par défaut si pas encore envoyé) */
  recipients: Player[];
  answered: Set<ID>;
  /** Encore ouverte aux réponses */
  open: boolean;
  dueDate?: string;
};

export const KIND_LABEL: Record<RequestKind, string> = {
  match: 'Après-match',
  seance: 'Ressenti séance',
  sondage: 'Questionnaire',
};

/** Durée pendant laquelle un questionnaire de match / séance reste à remplir après l'envoi. */
const OPEN_DAYS = 21;

const active = (data: AppData) => data.players.filter((p) => !p.archived);

function resolve(data: AppData, to: 'all' | ID[]) {
  return to === 'all' ? active(data) : data.players.filter((p) => to.includes(p.id));
}

/** Destinataires proposés pour un match : la compo (titulaires + remplaçants) si elle existe, sinon tout l'effectif. */
export function defaultMatchRecipients(data: AppData, m: Match): 'all' | ID[] {
  const l = data.lineups.find((x) => x.matchId === m.id);
  const ids = l ? [...l.slots.filter((x): x is ID => !!x), ...l.bench].filter((id) => data.players.some((p) => p.id === id && !p.archived)) : [];
  return ids.length ? ids : 'all';
}

/** Destinataires proposés pour une séance : les présents si l'appel est fait, sinon tout l'effectif. */
export function defaultSessionRecipients(data: AppData, x: TrainingSession): 'all' | ID[] {
  const ids = Object.entries(x.attendance)
    .filter(([id, a]) => ['present', 'retard'].includes(a) && data.players.some((p) => p.id === id && !p.archived))
    .map(([id]) => id);
  return ids.length ? ids : 'all';
}

const stillOpen = (d?: Dispatch) => !!d && daysBetween(d.sentAt.slice(0, 10), today()) <= OPEN_DAYS;

export function matchRequest(data: AppData, m: Match): Request {
  return {
    kind: 'match',
    id: m.id,
    title: 'Questionnaire d’après-match',
    subtitle: matchLabel(m),
    date: m.date,
    dispatch: m.questionnaire,
    recipients: resolve(data, m.questionnaire?.to ?? defaultMatchRecipients(data, m)),
    answered: new Set(data.reports.filter((r) => r.matchId === m.id).map((r) => r.playerId)),
    open: stillOpen(m.questionnaire),
  };
}

export function sessionRequest(data: AppData, x: TrainingSession): Request {
  return {
    kind: 'seance',
    id: x.id,
    title: 'Ressenti de l’entraînement',
    subtitle: `Séance du ${formatDate(x.date)}${x.theme ? ` · ${x.theme}` : ''}`,
    date: x.date,
    dispatch: x.feedbackRequest,
    recipients: resolve(data, x.feedbackRequest?.to ?? defaultSessionRecipients(data, x)),
    answered: new Set(Object.keys(x.feedback ?? {})),
    open: stillOpen(x.feedbackRequest),
  };
}

export function surveyRequest(data: AppData, s: Survey): Request {
  return {
    kind: 'sondage',
    id: s.id,
    title: s.title,
    subtitle: s.dueDate ? `À rendre avant le ${formatDate(s.dueDate)}` : 'Questionnaire du coach',
    date: (s.dispatch?.sentAt ?? s.createdAt).slice(0, 10),
    dispatch: s.dispatch,
    recipients: resolve(data, s.dispatch?.to ?? s.target),
    answered: new Set(data.surveyResponses.filter((r) => r.surveyId === s.id).map((r) => r.playerId)),
    open: !!s.dispatch && s.open,
    dueDate: s.dueDate,
  };
}

/** Toutes les demandes de l'équipe (envoyées ou non), les plus récentes d'abord. */
export function allRequests(data: AppData): Request[] {
  return [
    ...data.matches.map((m) => matchRequest(data, m)),
    ...data.sessions.map((x) => sessionRequest(data, x)),
    ...data.surveys.map((s) => surveyRequest(data, s)),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export const missingOf = (r: Request) => r.recipients.filter((p) => !r.answered.has(p.id));
export const answeredOf = (r: Request) => r.recipients.filter((p) => r.answered.has(p.id));

/**
 * Ce qui attend le coach : matchs joués et séances passées dont le questionnaire n'est pas encore parti
 * (10 derniers jours).
 */
export function toSend(data: AppData): Request[] {
  const recent = (d: string) => d <= today() && daysBetween(d, today()) <= 10;
  return [
    ...data.matches.filter((m) => !m.questionnaire && (m.scoreFor != null || m.date < today()) && recent(m.date)).map((m) => matchRequest(data, m)),
    ...data.sessions.filter((x) => !x.feedbackRequest && recent(x.date) && Object.keys(x.attendance).length > 0).map((x) => sessionRequest(data, x)),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/** Demandes envoyées, encore ouvertes, avec des réponses manquantes. */
export function awaiting(data: AppData): Request[] {
  return allRequests(data).filter((r) => r.dispatch && r.open && missingOf(r).length > 0);
}

/** Ce que le joueur doit remplir. */
export function playerPending(data: AppData, playerId: ID): Request[] {
  return allRequests(data).filter((r) => r.dispatch && r.open && r.recipients.some((p) => p.id === playerId) && !r.answered.has(playerId));
}

/** Écran de réponse d'une demande, pour un joueur. */
export function answerRoute(r: Pick<Request, 'kind' | 'id'>, playerId: ID) {
  if (r.kind === 'match') return `/questionnaire?matchId=${r.id}&playerId=${playerId}`;
  if (r.kind === 'seance') return `/ressenti-seance?sessionId=${r.id}&playerId=${playerId}`;
  return `/sondage/${r.id}`;
}

/** Écran de suivi d'une demande, pour le coach. */
export function coachRoute(r: Pick<Request, 'kind' | 'id'>) {
  if (r.kind === 'match') return `/match/${r.id}`;
  if (r.kind === 'seance') return `/seance/${r.id}`;
  return `/sondage/${r.id}`;
}

/** Clé de notification : change à chaque relance pour renvoyer une notification. */
export function notifKey(r: Request) {
  const n = r.dispatch?.reminders ?? 0;
  return `${r.kind}:${r.id}${n ? `:r${n}` : ''}`;
}

/** Nouvel envoi. */
export const newDispatch = (to: 'all' | ID[]): Dispatch => ({ sentAt: new Date().toISOString(), to });

/** Relance : nouvelle notification pour ceux qui n'ont pas répondu. */
export const remind = (d: Dispatch): Dispatch => ({ ...d, reminders: (d.reminders ?? 0) + 1, remindedAt: new Date().toISOString() });

/**
 * Anciennes données (avant le bouton « Envoyer ») : ce qui était déjà proposé aux joueurs
 * est considéré comme envoyé, pour ne rien faire disparaître de leur côté.
 */
export function migrateToSendModel(d: AppData): AppData {
  if (d.sendModel === 1) return d;
  const now = new Date().toISOString();
  const recent = (date: string, days: number) => date <= today() && daysBetween(date, today()) <= days;
  return {
    ...d,
    sendModel: 1,
    matches: d.matches.map((m) => (m.questionnaire || m.scoreFor == null || !recent(m.date, 30) ? m : { ...m, questionnaire: { sentAt: now, to: 'all' } })),
    sessions: d.sessions.map((x) => {
      if (x.feedbackRequest || !recent(x.date, 14)) return x;
      const present = Object.entries(x.attendance).filter(([, a]) => a === 'present' || a === 'retard').map(([id]) => id);
      return present.length ? { ...x, feedbackRequest: { sentAt: now, to: present } } : x;
    }),
    surveys: d.surveys.map((s) => (s.dispatch || !s.open ? s : { ...s, dispatch: { sentAt: s.createdAt, to: s.target } })),
  };
}
