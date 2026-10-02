import { ALERTS, STAT_FIELDS, WELLNESS_FIELDS } from './constants';
import type { Answer, AppData, Injury, Match, Player, PostMatchReport, StatKey, TrainingSession } from './types';

export const today = () => new Date().toISOString().slice(0, 10);

export const isValidDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export function formatDate(s?: string) {
  if (!isValidDate(s)) return s ?? '';
  const [y, m, d] = s!.split('-');
  return `${d}/${m}/${y}`;
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export const playerName = (p?: Player) => (p ? `${p.firstName} ${p.lastName}`.trim() : 'Joueur supprimé');

export const matchLabel = (m?: Match) =>
  m ? `${m.home ? 'vs' : '@'} ${m.opponent} · ${formatDate(m.date)}` : 'Match supprimé';

export function matchResult(m: Match): { text: string; tone: 'win' | 'draw' | 'loss' | 'none' } {
  if (m.scoreFor == null || m.scoreAgainst == null) return { text: '–', tone: 'none' };
  const tone = m.scoreFor > m.scoreAgainst ? 'win' : m.scoreFor < m.scoreAgainst ? 'loss' : 'draw';
  return { text: `${m.scoreFor} - ${m.scoreAgainst}`, tone };
}

export const byDateDesc = <T extends { date: string }>(a: T, b: T) => b.date.localeCompare(a.date);

/** Moyenne bien-être d'un questionnaire (sur 5), undefined si rien de rempli. */
export function wellnessScore(r: PostMatchReport): number | undefined {
  const vals = WELLNESS_FIELDS.map((f) => r[f.key]).filter((v): v is number => typeof v === 'number');
  if (!vals.length) return undefined;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Charge de séance (sRPE) = RPE × minutes. */
export const sessionLoad = (r: PostMatchReport) => (r.rpe ?? 0) * (r.minutesPlayed ?? 0);

export const avg = (xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
};

export const fmt = (n: number | undefined, digits = 1) =>
  n == null ? '–' : Number.isInteger(n) ? String(n) : n.toFixed(digits);

export type PlayerSummary = {
  player: Player;
  matchesPlayed: number;
  starts: number;
  minutes: number;
  totals: Record<StatKey, number>;
  avgCoachRating?: number;
  avgSelfRating?: number;
  avgRpe?: number;
  avgWellness?: number;
  lastReport?: PostMatchReport;
  activeInjury?: Injury;
  injuriesCount: number;
};

export function reportsForPlayer(data: AppData, playerId: string) {
  const matchDate = new Map(data.matches.map((m) => [m.id, m.date]));
  return data.reports
    .filter((r) => r.playerId === playerId)
    .sort((a, b) => (matchDate.get(b.matchId) ?? '').localeCompare(matchDate.get(a.matchId) ?? ''));
}

export function activeInjury(data: AppData, playerId: string) {
  return data.injuries
    .filter((i) => i.playerId === playerId && i.status !== 'guérie')
    .sort(byDateDesc)[0];
}

export function summarizePlayer(data: AppData, player: Player): PlayerSummary {
  const reports = reportsForPlayer(data, player.id);
  const played = reports.filter((r) => r.minutesPlayed > 0);
  const totals = Object.fromEntries(STAT_FIELDS.map((f) => [f.key, 0])) as Record<StatKey, number>;
  for (const r of reports) for (const f of STAT_FIELDS) totals[f.key] += r.stats[f.key] ?? 0;
  return {
    player,
    matchesPlayed: played.length,
    starts: played.filter((r) => r.starter).length,
    minutes: reports.reduce((a, r) => a + (r.minutesPlayed || 0), 0),
    totals,
    avgCoachRating: avg(reports.map((r) => r.coachRating)),
    avgSelfRating: avg(reports.map((r) => r.selfRating)),
    avgRpe: avg(played.map((r) => r.rpe)),
    avgWellness: avg(reports.map(wellnessScore)),
    lastReport: reports[0],
    activeInjury: activeInjury(data, player.id),
    injuriesCount: data.injuries.filter((i) => i.playerId === player.id).length,
  };
}

export type AlertKind = 'injury' | 'pain' | 'wellness' | 'rpe' | 'load' | 'absence' | 'decline' | 'silence';
export type Alert = { playerId: string; level: 'high' | 'medium'; text: string; kind: AlertKind };

/** Alertes basées sur le dernier questionnaire et la charge des 7 vs 28 derniers jours. */
export function computeAlerts(data: AppData): Alert[] {
  const alerts: Alert[] = [];
  const matchDate = new Map(data.matches.map((m) => [m.id, m.date]));
  const ref = today();

  for (const p of data.players.filter((x) => !x.archived)) {
    const inj = activeInjury(data, p.id);
    if (inj) {
      const back = inj.expectedReturn ? ` · retour prévu ${formatDate(inj.expectedReturn)}` : '';
      alerts.push({
        playerId: p.id,
        kind: 'injury',
        level: inj.status === 'active' ? 'high' : 'medium',
        text: `${inj.status === 'active' ? 'Blessé' : 'En reprise'} : ${inj.type} ${inj.bodyZone.toLowerCase()}${back}`,
      });
    }

    const reports = reportsForPlayer(data, p.id);
    const last = reports[0];
    if (last) {
      if (last.pain && !inj)
        alerts.push({
          playerId: p.id,
          kind: 'pain',
          level: 'high',
          text: `Douleur signalée${last.painZone ? ` (${last.painZone})` : ''}${last.painLevel != null ? ` ${last.painLevel}/10` : ''}`,
        });
      const w = wellnessScore(last);
      if (w != null && w < ALERTS.wellnessLow)
        alerts.push({ playerId: p.id, kind: 'wellness', level: 'medium', text: `Bien-être bas (${fmt(w)}/5)` });
      if ((last.rpe ?? 0) >= ALERTS.rpeHigh)
        alerts.push({ playerId: p.id, kind: 'rpe', level: 'medium', text: `Effort très élevé (RPE ${last.rpe}/10)` });
    }

    // Ratio charge aiguë (7 j) / chronique (moyenne hebdo sur 28 j)
    let acute = 0;
    let chronic = 0;
    for (const r of reports) {
      const d = matchDate.get(r.matchId);
      if (!d) continue;
      const age = daysBetween(d, ref);
      if (age < 0 || age >= 28) continue;
      const l = sessionLoad(r);
      chronic += l;
      if (age < 7) acute += l;
    }
    // Séances d'entraînement (charge = RPE × durée pour les présents)
    for (const x of data.sessions ?? []) {
      const l = trainingLoad(x, p.id);
      if (!l) continue;
      const age = daysBetween(x.date, ref);
      if (age < 0 || age >= 28) continue;
      chronic += l;
      if (age < 7) acute += l;
    }
    const recentSessions = (data.sessions ?? []).filter((x) => x.date <= ref).sort(byDateDesc).slice(0, 4);
    const unexcused = recentSessions.filter((x) => x.attendance[p.id] === 'absent').length;
    if (unexcused >= 2)
      alerts.push({ playerId: p.id, kind: 'absence', level: 'medium', text: `${unexcused} absences non excusées sur les ${recentSessions.length} dernières séances` });
    const chronicWeekly = chronic / 4;
    if (chronicWeekly > 0 && acute / chronicWeekly >= ALERTS.loadSpike)
      alerts.push({
        playerId: p.id,
        kind: 'load',
        level: 'medium',
        text: `Pic de charge (ratio ${fmt(acute / chronicWeekly, 2)})`,
      });
  }
  return alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === 'high' ? -1 : 1));
}

export function formatAnswer(a: Answer | undefined): string {
  if (a === undefined || a === '') return '';
  if (typeof a === 'boolean') return a ? 'Oui' : 'Non';
  if (Array.isArray(a)) return a.join(', ');
  return String(a);
}

/** Bilan de la saison : victoires, nuls, défaites, buts, 5 derniers résultats (du plus récent au plus ancien). */
export function seasonRecord(data: AppData) {
  const played = data.matches.filter((m) => m.scoreFor != null && m.scoreAgainst != null).sort(byDateDesc);
  const res = played.map((m) => matchResult(m).tone);
  return {
    played: played.length,
    wins: res.filter((r) => r === 'win').length,
    draws: res.filter((r) => r === 'draw').length,
    losses: res.filter((r) => r === 'loss').length,
    goalsFor: played.reduce((a, m) => a + (m.scoreFor ?? 0), 0),
    goalsAgainst: played.reduce((a, m) => a + (m.scoreAgainst ?? 0), 0),
    form: played.slice(0, 5).map((m) => ({ id: m.id, tone: matchResult(m).tone })),
  };
}

export const initials = (p: Player) => (p.number != null ? String(p.number) : `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase() || '?');

/** Charge d'entraînement d'un joueur sur une séance (0 s'il n'était pas là). */
export function trainingLoad(x: TrainingSession, playerId: string) {
  const a = x.attendance[playerId];
  if (a !== 'present' && a !== 'retard') return 0;
  return (x.playerRpe[playerId] ?? x.feedback?.[playerId]?.intensity ?? x.rpe ?? 0) * x.durationMin;
}

/** Assiduité : séances où le joueur était présent (ou en retard) parmi celles où il était attendu (hors blessé). */
export function attendanceRate(data: AppData, playerId: string, lastN = 12) {
  const list = (data.sessions ?? [])
    .filter((x) => x.date <= today() && x.attendance[playerId] && x.attendance[playerId] !== 'blesse')
    .sort(byDateDesc)
    .slice(0, lastN);
  const present = list.filter((x) => x.attendance[playerId] === 'present' || x.attendance[playerId] === 'retard').length;
  return { present, total: list.length, rate: list.length ? present / list.length : undefined };
}

export const sessionPresent = (x: TrainingSession) => Object.values(x.attendance).filter((a) => a === 'present' || a === 'retard').length;

/** Date AAAA-MM-JJ d'il y a `n` jours. */
export function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
