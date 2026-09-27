import { router } from 'expo-router';
import { Badge, Button, Card, Empty, Row, Screen, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { byDateDesc, formatDate, matchResult } from '@/lib/stats';

const TONE = { win: 'success', draw: 'info', loss: 'danger', none: 'neutral' } as const;
const LABEL = { win: 'Victoire', draw: 'Nul', loss: 'Défaite', none: 'À jouer' } as const;

export default function Matches() {
  const { data } = useStore();
  const matches = [...data.matches].sort(byDateDesc);
  const activeCount = data.players.filter((p) => !p.archived).length;

  return (
    <Screen>
      <Button title="+ Nouveau match" onPress={() => router.push('/match/edit')} />
      {matches.length === 0 && <Empty text="Aucun match enregistré." />}
      {matches.map((m) => {
        const res = matchResult(m);
        const filled = data.reports.filter((r) => r.matchId === m.id).length;
        return (
          <Card key={m.id} onPress={() => router.push(`/match/${m.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt bold>
                {m.home ? 'vs' : '@'} {m.opponent}
              </Txt>
              <Txt bold size={17}>{res.text}</Txt>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt muted size={13}>
                {formatDate(m.date)}
                {m.competition ? ` · ${m.competition}` : ''} · {m.home ? 'Domicile' : 'Extérieur'}
              </Txt>
              <Badge text={LABEL[res.tone]} tone={TONE[res.tone]} />
            </Row>
            <Txt muted size={13}>
              Questionnaires : {filled}/{activeCount}
            </Txt>
          </Card>
        );
      })}
    </Screen>
  );
}
