import { allRequests } from './requests';
import { avg, byDateDesc, computeAlerts, daysBetween, fmt, formatDate, today, wellnessScore } from './stats';
import type { Alert } from './stats';
import type { AppData, ID } from './types';

/** Un point d'une courbe : une date, une valeur (absente si non renseignée). */
export type Point = { date: string; label: string; value?: number };

export type Timeline = {
  /** Bien-être après match, /5 */
  form: Point[];
  /** Perf perso ressentie après match, /10 */
  selfRating: Point[];
  /** Note du coach, /10 (jamais montrée au joueur) */
  coachRating: Point[];
  /** Qualité de séance ressentie, /10 */
  trainingQuality: Point[];
  /** Perf perso à l'entraînement, /10 */
  trainingPerf: Point[];
};

/** Évolution d'un joueur, du plus ancien au plus récent (12 derniers points maximum par courbe). */
export function playerTimeline(data: AppData, playerId: ID, max = 12): Timeline {
  const matches = new Map(data.matches.map((m) => [m.id, m]));
  const reports = data.reports
    .filter((r) => r.playerId === playerId && matches.has(r.matchId))
    .map((r) => ({ r, m: matches.get(r.matchId)! }))
    .sort((a, b) => a.m.date.localeCompare(b.m.date))
    .slice(-max);
  const label = (m: { opponent: string; home: boolean }) => `${m.home ? 'vs' : '@'} ${m.opponent}`;
  const sessions = data.sessions
    .filter((x) => x.feedback?.[playerId])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-max);
  return {
    form: reports.map(({ r, m }) => ({ date: m.date, label: label(m), value: wellnessScore(r) })),
    selfRating: reports.map(({ r, m }) => ({ date: m.date, label: label(m), value: r.selfRating })),
    coachRating: reports.map(({ r, m }) => ({ date: m.date, label: label(m), value: r.coachRating })),
    trainingQuality: sessions.map((x) => ({ date: x.date, label: x.theme ?? 'Séance', value: x.feedback![playerId].quality })),
    trainingPerf: sessions.map((x) => ({ date: x.date, label: x.theme ?? 'Séance', value: x.feedback![playerId].selfPerf })),
  };
}

/** Moyenne des `recent` derniers points comparée aux `before` précédents. */
export function trend(points: Point[], recent = 2, before = 3) {
  const vals = points.map((p) => p.value).filter((v): v is number => typeof v === 'number');
  if (vals.length < recent + 2) return undefined;
  const now = avg(vals.slice(-recent))!;
  const prev = avg(vals.slice(-(recent + before), -recent))!;
  return { now, prev, delta: now - prev };
}

/**
 * Signaux faibles que le coach doit voir avant qu'ils deviennent un problème :
 * ressenti en baisse sur les derniers matchs / séances, ou joueur qui ne répond plus.
 */
export function insightAlerts(data: AppData): Alert[] {
  const out: Alert[] = [];
  const requests = allRequests(data).filter((r) => r.dispatch && daysBetween(r.dispatch.sentAt.slice(0, 10), today()) >= 2);
  for (const p of data.players.filter((x) => !x.archived)) {
    const tl = playerTimeline(data, p.id);
    // Perf perso : matchs et séances mélangés, dans l'ordre chronologique (même échelle /10)
    const perf = [...tl.selfRating, ...tl.trainingPerf].sort((a, b) => a.date.localeCompare(b.date));
    const tp = trend(perf);
    const tf = trend(tl.form);
    if (tp && tp.delta <= -1.5)
      out.push({ playerId: p.id, kind: 'decline', level: 'medium', text: `Ressenti en baisse : perf perso ${fmt(tp.prev)} → ${fmt(tp.now)} /10` });
    else if (tf && tf.delta <= -0.8)
      out.push({ playerId: p.id, kind: 'decline', level: 'medium', text: `Forme en baisse : ${fmt(tf.prev)} → ${fmt(tf.now)} /5` });

    // Ne répond plus : au moins 2 des 3 dernières demandes sans réponse
    const mine = requests.filter((r) => r.recipients.some((x) => x.id === p.id)).slice(0, 3);
    const silent = mine.filter((r) => !r.answered.has(p.id));
    if (mine.length >= 2 && silent.length >= 2)
      out.push({
        playerId: p.id,
        kind: 'silence',
        level: 'medium',
        text: `N’a pas répondu à ${silent.length} des ${mine.length} derniers questionnaires`,
      });
  }
  return out;
}

/** Toutes les alertes du coach : santé et charge, puis signaux faibles. */
export function coachAlerts(data: AppData): Alert[] {
  return [...computeAlerts(data), ...insightAlerts(data)].sort((a, b) => (a.level === b.level ? 0 : a.level === 'high' ? -1 : 1));
}

/** Points de discussion préparés automatiquement pour un entretien individuel. */
export function interviewBrief(data: AppData, playerId: ID): string[] {
  const lines: string[] = [];
  const tl = playerTimeline(data, playerId);
  const tp = trend([...tl.selfRating, ...tl.trainingPerf].sort((a, b) => a.date.localeCompare(b.date)));
  if (tp) lines.push(`Perf perso ressentie : ${fmt(tp.prev)} → ${fmt(tp.now)} /10 sur les derniers questionnaires.`);
  const tf = trend(tl.form);
  if (tf) lines.push(`Forme après match : ${fmt(tf.prev)} → ${fmt(tf.now)} /5.`);
  const coach = avg(tl.coachRating.slice(-3).map((x) => x.value));
  const self = avg(tl.selfRating.slice(-3).map((x) => x.value));
  if (coach != null && self != null && Math.abs(coach - self) >= 1.5)
    lines.push(
      self > coach
        ? `Il se note plus haut que vous (${fmt(self)} contre ${fmt(coach)} /10) : à aligner.`
        : `Il se note plus bas que vous (${fmt(self)} contre ${fmt(coach)} /10) : manque de confiance ?`,
    );
  const recentSessions = data.sessions.filter((x) => x.date <= today()).sort(byDateDesc).slice(0, 6);
  const absent = recentSessions.filter((x) => x.attendance[playerId] === 'absent').length;
  if (absent) lines.push(`${absent} absence${absent > 1 ? 's' : ''} non excusée${absent > 1 ? 's' : ''} sur les ${recentSessions.length} dernières séances.`);
  const minutes = data.reports
    .filter((r) => r.playerId === playerId)
    .map((r) => ({ r, d: data.matches.find((m) => m.id === r.matchId)?.date ?? '' }))
    .sort((a, b) => b.d.localeCompare(a.d))
    .slice(0, 3)
    .map((x) => x.r.minutesPlayed);
  if (minutes.length) lines.push(`Temps de jeu sur les ${minutes.length} derniers matchs : ${minutes.map((m) => `${m}′`).join(', ')}.`);
  const objectives = data.objectives.filter((o) => o.playerId === playerId && o.status === 'en cours');
  for (const o of objectives) lines.push(`Point à travailler « ${o.title} » : coach ${o.coachProgress ?? '–'}/10, joueur ${o.playerProgress ?? '–'}/10.`);
  const comments = data.reports
    .filter((r) => r.playerId === playerId && r.playerComment)
    .map((r) => ({ c: r.playerComment!, d: data.matches.find((m) => m.id === r.matchId)?.date ?? '' }))
    .sort((a, b) => b.d.localeCompare(a.d))
    .slice(0, 2);
  for (const c of comments) lines.push(`Il a écrit le ${formatDate(c.d)} : « ${c.c} »`);
  const inj = data.injuries.find((i) => i.playerId === playerId && i.status !== 'guérie');
  if (inj) lines.push(`${inj.status === 'active' ? 'Blessé' : 'En reprise'} : ${inj.type} ${inj.bodyZone.toLowerCase()}.`);
  const last = data.interviews.filter((i) => i.playerId === playerId).sort(byDateDesc)[0];
  if (last?.decisions) lines.push(`Décidé au dernier entretien (${formatDate(last.date)}) : ${last.decisions}`);
  return lines;
}
