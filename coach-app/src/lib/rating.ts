import { attendanceRate, avg, reportsForPlayer } from './stats';
import type { AppData, Player } from './types';

export type Attr = { key: 'PER' | 'FOR' | 'ENG' | 'ASS' | 'PRO' | 'MEN'; label: string; value?: number };

const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)));

/**
 * Attributs « carte joueur » sur 99, calculés à partir du suivi :
 * PER performance (note coach, sinon auto-évaluation), FOR forme (bien-être), ENG engagement (intensité / RPE),
 * ASS assiduité, PRO progression sur les points à travailler, MEN mental (moral).
 */
export function playerAttributes(data: AppData, p: Player): { attrs: Attr[]; overall?: number } {
  const reports = reportsForPlayer(data, p.id);
  const coach = avg(reports.map((r) => r.coachRating));
  const self = avg(reports.map((r) => r.selfRating));
  const wellness = avg(reports.map((r) => avg([r.fatigue, r.sleep, r.soreness, r.stress, r.mood])));
  const mood = avg(reports.map((r) => r.mood));
  const intensity = avg([...reports.map((r) => r.rpe), ...data.sessions.map((s) => s.feedback?.[p.id]?.intensity)]);
  const att = attendanceRate(data, p.id).rate;
  const progress = avg(data.objectives.filter((o) => o.playerId === p.id && o.status !== 'abandonné').map((o) => o.coachProgress ?? o.playerProgress));
  const attrs: Attr[] = [
    { key: 'PER', label: 'Performance', value: coach != null ? clamp(coach * 10) : self != null ? clamp(self * 10) : undefined },
    { key: 'FOR', label: 'Forme', value: wellness != null ? clamp(((wellness - 1) / 4) * 99) : undefined },
    { key: 'ENG', label: 'Engagement', value: intensity != null ? clamp(intensity * 10) : undefined },
    { key: 'ASS', label: 'Assiduité', value: att != null ? clamp(att * 99) : undefined },
    { key: 'PRO', label: 'Progression', value: progress != null ? clamp(progress * 10) : undefined },
    { key: 'MEN', label: 'Mental', value: mood != null ? clamp(((mood - 1) / 4) * 99) : self != null ? clamp(self * 10) : undefined },
  ];
  const known = attrs.map((a) => a.value).filter((v): v is number => v != null);
  return { attrs, overall: known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : undefined };
}

export type Tier = { name: string; colors: [string, string, string]; text: string; accent: string };

export function tierFor(overall?: number): Tier {
  if (overall == null) return { name: 'Nouveau', colors: ['#475569', '#334155', '#1E293B'], text: '#F8FAFC', accent: '#CBD5E1' };
  if (overall >= 85) return { name: 'QEA', colors: ['#0A4A1B', '#107B2D', '#22C55E'], text: '#FFFFFF', accent: '#FACC15' };
  if (overall >= 75) return { name: 'Or', colors: ['#A16207', '#EAB308', '#FDE68A'], text: '#1C1917', accent: '#422006' };
  if (overall >= 65) return { name: 'Argent', colors: ['#64748B', '#CBD5E1', '#F1F5F9'], text: '#0F172A', accent: '#334155' };
  return { name: 'Bronze', colors: ['#7C2D12', '#C2410C', '#FDBA74'], text: '#FFF7ED', accent: '#431407' };
}

export const POSITION_SHORT: Record<string, string> = { Gardien: 'GB', Défenseur: 'DEF', Milieu: 'MIL', Attaquant: 'ATT' };
