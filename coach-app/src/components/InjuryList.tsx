import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Chips, Empty, Progress, Row, StatBox, Txt } from '@/components/ui';
import { INJURY_STATUS_LABEL as STATUS_LABEL, INJURY_STATUS_TONE as STATUS_TONE } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { byDateDesc, daysBetween, formatDate, initials, playerName, today } from '@/lib/stats';

const FILTERS = ['En cours', 'Toutes'] as const;

export function InjuryList() {
  const t = useTheme();
  const { data } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('En cours');
  const players = new Map(data.players.map((p) => [p.id, p]));
  const list = data.injuries.filter((i) => filter === 'Toutes' || i.status !== 'guérie').sort(byDateDesc);
  const active = data.injuries.filter((i) => i.status === 'active').length;
  const rehab = data.injuries.filter((i) => i.status === 'reprise').length;
  const healed = data.injuries.filter((i) => i.returnDate);
  const avgDays = healed.length ? Math.round(healed.reduce((a, i) => a + daysBetween(i.date, i.returnDate!), 0) / healed.length) : undefined;
  const color = { active: t.danger, reprise: t.warning, guérie: t.primary };

  return (
    <>
      <Row style={{ gap: 10 }}>
        <StatBox label="Indisponibles" value={active} icon="medkit" tone="danger" />
        <StatBox label="En reprise" value={rehab} icon="walk" tone="warning" />
        <StatBox label="Durée moy." value={avgDays != null ? `${avgDays} j` : '–'} icon="hourglass" tone="info" />
      </Row>
      <Button title="Déclarer une blessure" icon="add-circle" onPress={() => router.push('/blessure/edit')} disabled={!data.players.length} />
      <Chips options={FILTERS} value={filter} onChange={(v) => v && setFilter(v)} />
      {list.length === 0 && <Empty icon="fitness-outline" text={filter === 'En cours' ? 'Aucune blessure en cours.' : 'Aucune blessure enregistrée.'} />}
      {list.map((i) => {
        const p = players.get(i.playerId);
        const end = i.returnDate ?? today();
        const days = daysBetween(i.date, end);
        const total = i.expectedReturn ? daysBetween(i.date, i.expectedReturn) : undefined;
        const left = i.expectedReturn && i.status !== 'guérie' ? daysBetween(today(), i.expectedReturn) : undefined;
        return (
          <Card key={i.id} stripe={color[i.status]} onPress={() => router.push({ pathname: '/blessure/edit', params: { id: i.id } })}>
            <Row style={{ gap: 12 }}>
              {p ? <Avatar label={initials(p)} colorKey={p.id} photo={p.photoUri} size={42} /> : null}
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold size={16}>
                  {playerName(p)}
                </Txt>
                <Txt muted size={13}>
                  {i.type} · {i.bodyZone}
                  {i.side ? ` (${i.side})` : ''}
                </Txt>
              </View>
              <Badge text={STATUS_LABEL[i.status]} tone={STATUS_TONE[i.status]} />
            </Row>
            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              <Badge text={i.severity} tone={i.severity === 'grave' ? 'danger' : i.severity === 'modérée' ? 'warning' : 'neutral'} icon="pulse" />
              <Badge text={`Depuis le ${formatDate(i.date)}`} icon="calendar-outline" />
              <Badge text={`${days} j`} icon="time-outline" />
            </Row>
            {total && total > 0 && i.status !== 'guérie' ? (
              <View style={{ gap: 6 }}>
                <Progress value={days / total} color={color[i.status]} height={6} />
                <Text style={{ color: t.muted, fontSize: 12 }}>
                  Retour prévu le {formatDate(i.expectedReturn)}
                  {left != null ? (left > 0 ? ` · dans ${left} j` : left === 0 ? " · aujourd'hui" : ` · dépassé de ${-left} j`) : ''}
                </Text>
              </View>
            ) : i.returnDate ? (
              <Text style={{ color: t.muted, fontSize: 12 }}>Revenu le {formatDate(i.returnDate)}</Text>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}
