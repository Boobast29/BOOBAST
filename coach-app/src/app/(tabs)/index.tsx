import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/components/theme';
import { Badge, Button, Card, Empty, Row, Screen, Section, StatBox, Title, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { byDateDesc, computeAlerts, fmt, matchLabel, matchResult, playerName, summarizePlayer } from '@/lib/stats';

export default function Dashboard() {
  const t = useTheme();
  const { data, loadDemo } = useStore();
  const active = useMemo(() => data.players.filter((p) => !p.archived), [data.players]);
  const alerts = useMemo(() => computeAlerts(data), [data]);
  const summaries = useMemo(() => active.map((p) => summarizePlayer(data, p)), [data, active]);
  const injured = summaries.filter((s) => s.activeInjury?.status === 'active').length;
  const lastMatch = [...data.matches].sort(byDateDesc)[0];
  const players = new Map(data.players.map((p) => [p.id, p]));

  if (!data.players.length && !data.matches.length)
    return (
      <Screen>
        <Title>Bienvenue coach 👋</Title>
        <Txt muted>
          Suivez vos joueurs après chaque match : questionnaire de ressenti, charge (RPE), statistiques et blessures.
        </Txt>
        <Empty
          text="Commencez par ajouter vos joueurs, ou chargez des données de démonstration pour découvrir l'appli."
          action={
            <View style={{ gap: 10, alignSelf: 'stretch' }}>
              <Button title="Ajouter un joueur" onPress={() => router.push('/joueur/edit')} />
              <Button title="Charger la démo" kind="secondary" onPress={loadDemo} />
            </View>
          }
        />
      </Screen>
    );

  const lastMatchReports = lastMatch ? data.reports.filter((r) => r.matchId === lastMatch.id).length : 0;
  const top = (key: 'goals' | 'assists') =>
    summaries
      .filter((s) => s.totals[key] > 0)
      .sort((a, b) => b.totals[key] - a.totals[key])
      .slice(0, 3);
  const topRated = summaries
    .filter((s) => s.avgCoachRating != null)
    .sort((a, b) => (b.avgCoachRating ?? 0) - (a.avgCoachRating ?? 0))
    .slice(0, 3);

  return (
    <Screen>
      <Title>{data.teamName}</Title>
      <Row style={{ flexWrap: 'wrap' }}>
        <StatBox label="Joueurs" value={active.length} />
        <StatBox label="Disponibles" value={active.length - injured} />
        <StatBox label="Blessés" value={injured} />
        <StatBox label="Matchs" value={data.matches.length} />
      </Row>

      {lastMatch && (
        <>
          <Section>Dernier match</Section>
          <Card onPress={() => router.push(`/match/${lastMatch.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt bold>{matchLabel(lastMatch)}</Txt>
              <Txt bold>{matchResult(lastMatch).text}</Txt>
            </Row>
            <Txt muted>
              Questionnaires remplis : {lastMatchReports} / {active.length}
            </Txt>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
              <View
                style={{
                  height: 6,
                  width: `${active.length ? Math.min(100, (lastMatchReports / active.length) * 100) : 0}%`,
                  backgroundColor: t.primary,
                }}
              />
            </View>
          </Card>
        </>
      )}
      <Button title="+ Nouveau match" onPress={() => router.push('/match/edit')} />

      <Section>Alertes ({alerts.length})</Section>
      {alerts.length === 0 ? (
        <Card>
          <Txt muted>Aucune alerte. Tout le monde est opérationnel ✅</Txt>
        </Card>
      ) : (
        alerts.map((a, i) => (
          <Card key={i} onPress={() => router.push(`/joueur/${a.playerId}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt bold>{playerName(players.get(a.playerId))}</Txt>
              <Badge text={a.level === 'high' ? 'Prioritaire' : 'À surveiller'} tone={a.level === 'high' ? 'danger' : 'warning'} />
            </Row>
            <Txt muted>{a.text}</Txt>
          </Card>
        ))
      )}

      {(top('goals').length > 0 || topRated.length > 0) && <Section>Classements</Section>}
      {top('goals').length > 0 && (
        <Leaderboard title="Buteurs" rows={top('goals').map((s) => [s.player.id, playerName(s.player), String(s.totals.goals)])} />
      )}
      {top('assists').length > 0 && (
        <Leaderboard title="Passeurs" rows={top('assists').map((s) => [s.player.id, playerName(s.player), String(s.totals.assists)])} />
      )}
      {topRated.length > 0 && (
        <Leaderboard title="Meilleure note coach (moy.)" rows={topRated.map((s) => [s.player.id, playerName(s.player), fmt(s.avgCoachRating)])} />
      )}
    </Screen>
  );
}

function Leaderboard({ title, rows }: { title: string; rows: [string, string, string][] }) {
  return (
    <Card>
      <Txt bold>{title}</Txt>
      {rows.map(([id, name, value], i) => (
        <Row key={id} style={{ justifyContent: 'space-between' }}>
          <Txt>
            {i + 1}. {name}
          </Txt>
          <Txt bold>{value}</Txt>
        </Row>
      ))}
    </Card>
  );
}
