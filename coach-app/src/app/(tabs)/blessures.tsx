import { router } from 'expo-router';
import { useState } from 'react';
import { Badge, Button, Card, Chips, Empty, Row, Screen, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { byDateDesc, daysBetween, formatDate, playerName, today } from '@/lib/stats';
import { INJURY_STATUS_LABEL as STATUS_LABEL, INJURY_STATUS_TONE as STATUS_TONE } from '@/lib/constants';

const FILTERS = ['En cours', 'Toutes'] as const;

export default function Injuries() {
  const { data } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('En cours');
  const players = new Map(data.players.map((p) => [p.id, p]));
  const list = data.injuries.filter((i) => filter === 'Toutes' || i.status !== 'guérie').sort(byDateDesc);

  return (
    <Screen>
      <Button title="+ Déclarer une blessure" onPress={() => router.push('/blessure/edit')} disabled={!data.players.length} />
      <Chips options={FILTERS} value={filter} onChange={(v) => v && setFilter(v)} />
      {list.length === 0 && <Empty text={filter === 'En cours' ? 'Aucune blessure en cours 💪' : 'Aucune blessure enregistrée.'} />}
      {list.map((i) => {
        const end = i.returnDate ?? today();
        const days = daysBetween(i.date, end);
        return (
          <Card key={i.id} onPress={() => router.push({ pathname: '/blessure/edit', params: { id: i.id } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt bold>{playerName(players.get(i.playerId))}</Txt>
              <Badge text={STATUS_LABEL[i.status]} tone={STATUS_TONE[i.status]} />
            </Row>
            <Txt>
              {i.type} · {i.bodyZone}
              {i.side ? ` (${i.side})` : ''} · {i.severity}
            </Txt>
            <Txt muted size={13}>
              Depuis le {formatDate(i.date)} ({days} j)
              {i.expectedReturn && i.status !== 'guérie' ? ` · retour prévu ${formatDate(i.expectedReturn)}` : ''}
              {i.returnDate ? ` · revenu le ${formatDate(i.returnDate)}` : ''}
            </Txt>
          </Card>
        );
      })}
    </Screen>
  );
}
