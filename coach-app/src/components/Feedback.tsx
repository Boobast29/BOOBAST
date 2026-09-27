import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { SELF_RATING_LABEL } from '@/lib/constants';
import { avg, fmt } from '@/lib/stats';
import type { AppData, PostMatchReport } from '@/lib/types';
import { useTheme } from './theme';
import { Card, Row, Txt } from './ui';

type ScaleQ = { id: string; label: string; min: number; max: number };

/** Questions à échelle (club + « Ta performance ») présentes dans ces questionnaires. */
export function scaleQuestions(data: AppData, reports: PostMatchReport[]): ScaleQ[] {
  const custom = data.questions
    .filter((q) => q.type === 'scale' && (q.active || reports.some((r) => typeof r.answers?.[q.id] === 'number')))
    .map((q) => ({ id: q.id, label: q.label, min: q.min ?? 1, max: q.max ?? 5 }));
  return [...custom, { id: '__self', label: SELF_RATING_LABEL, min: 1, max: 10 }];
}

export const answerValue = (r: PostMatchReport, id: string): number | undefined => {
  if (id === '__self') return r.selfRating;
  const v = r.answers?.[id];
  return typeof v === 'number' ? v : undefined;
};

function useColor() {
  const t = useTheme();
  return (ratio: number) => (ratio < 0.4 ? t.danger : ratio < 0.65 ? t.warning : t.primary);
}

/** Moyenne de l'équipe par question d'analyse collective (hors « Ta performance » et questions perso). */
function teamAverages(data: AppData, reports: PostMatchReport[]) {
  return scaleQuestions(data, reports)
    .filter((q) => q.id !== '__self' && data.questions.find((x) => x.id === q.id)?.section !== 'Toi')
    .map((q) => {
      const vals = reports.map((r) => answerValue(r, q.id)).filter((v): v is number => v != null);
      const a = avg(vals);
      return { q, avg: a, ratio: a == null ? undefined : (a - q.min) / (q.max - q.min || 1), n: vals.length };
    })
    .filter((x): x is typeof x & { avg: number; ratio: number } => x.avg != null);
}

/** Points forts et axes d'amélioration de l'équipe, d'après les réponses des joueurs. */
export function StrengthsWeaknesses({ data, reports, title }: { data: AppData; reports: PostMatchReport[]; title?: string }) {
  const t = useTheme();
  const list = teamAverages(data, reports).sort((a, b) => b.ratio - a.ratio);
  if (list.length < 3) return null;
  const n = list.length >= 6 ? 3 : 2;
  const col = (items: typeof list, good: boolean) => (
    <View style={{ flex: 1, gap: 6 }}>
      <Row style={{ gap: 6 }}>
        <Ionicons name={good ? 'trending-up' : 'construct'} size={16} color={good ? t.primary : t.warning} />
        <Text style={{ color: good ? t.primary : t.warning, fontWeight: '800', fontSize: 13 }}>{good ? 'Points forts' : 'À améliorer'}</Text>
      </Row>
      {items.map((x) => (
        <View key={x.q.id} style={{ backgroundColor: good ? t.primarySoft : t.warningSoft, borderRadius: 10, padding: 8, gap: 2 }}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }} numberOfLines={2}>
            {x.q.label}
          </Text>
          <Text style={{ color: good ? t.primary : t.warning, fontWeight: '800' }}>
            {fmt(x.avg)}/{x.q.max}
          </Text>
        </View>
      ))}
    </View>
  );
  return (
    <Card>
      {title ? <Txt bold>{title}</Txt> : null}
      <Row style={{ alignItems: 'flex-start', gap: 10 }}>
        {col(list.slice(0, n), true)}
        {col(list.slice(-n).reverse(), false)}
      </Row>
    </Card>
  );
}

/** Moyennes de l'équipe pour chaque question à échelle (détail d'un match). */
export function TeamFeedback({ data, reports }: { data: AppData; reports: PostMatchReport[] }) {
  const t = useTheme();
  const color = useColor();
  const qs = scaleQuestions(data, reports).filter((q) => reports.some((r) => answerValue(r, q.id) != null));
  if (!qs.length) return null;
  return (
    <Card>
      {qs.map((q) => {
        const vals = reports.map((r) => answerValue(r, q.id)).filter((v): v is number => v != null);
        const a = avg(vals) ?? 0;
        const ratio = (a - q.min) / (q.max - q.min || 1);
        return (
          <View key={q.id} style={{ gap: 5 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt size={14} bold>
                {q.label}
              </Txt>
              <Text style={{ color: color(ratio), fontWeight: '800', fontSize: 15 }}>
                {fmt(a)}
                <Text style={{ color: t.muted, fontWeight: '400', fontSize: 12 }}>
                  /{q.max} · {vals.length} rép.
                </Text>
              </Text>
            </Row>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: t.border, overflow: 'hidden' }}>
              <View style={{ height: 10, width: `${Math.max(3, ratio * 100)}%`, backgroundColor: color(ratio), borderRadius: 5 }} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

/** Évolution d'un joueur question par question (moyenne + derniers matchs). */
export function PlayerFeedback({ data, reports }: { data: AppData; reports: PostMatchReport[] }) {
  const t = useTheme();
  const color = useColor();
  const qs = scaleQuestions(data, reports).filter((q) => reports.some((r) => answerValue(r, q.id) != null));
  if (!qs.length) return null;
  const recent = reports.slice(0, 6).reverse();
  return (
    <Card>
      {qs.map((q) => {
        const a = avg(reports.map((r) => answerValue(r, q.id)));
        return (
          <Row key={q.id} style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Txt size={14}>{q.label}</Txt>
            </View>
            <Row style={{ gap: 3, alignItems: 'flex-end', height: 26 }}>
              {recent.map((r) => {
                const v = answerValue(r, q.id);
                const ratio = v == null ? 0 : (v - q.min) / (q.max - q.min || 1);
                return <View key={r.id} style={{ width: 7, height: v == null ? 3 : 4 + ratio * 22, borderRadius: 2, backgroundColor: v == null ? t.border : color(ratio) }} />;
              })}
            </Row>
            <Text style={{ width: 40, textAlign: 'right', fontWeight: '800', color: a == null ? t.muted : color((a - q.min) / (q.max - q.min || 1)) }}>{fmt(a)}</Text>
          </Row>
        );
      })}
      <Txt muted size={12}>
        Barres : 6 derniers questionnaires (du plus ancien au plus récent) · chiffre : moyenne
      </Txt>
    </Card>
  );
}
