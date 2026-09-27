import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Empty, Row, Screen, Section, StatBox, Title, Txt } from '@/components/ui';
import { STAT_FIELDS } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { activeInjury, avg, fmt, formatDate, matchResult, playerName, sessionLoad, wellnessScore } from '@/lib/stats';

export default function MatchDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const match = data.matches.find((m) => m.id === id);
  if (!match) return <Empty text="Match introuvable." />;

  const reports = data.reports.filter((r) => r.matchId === match.id);
  const byPlayer = new Map(reports.map((r) => [r.playerId, r]));
  // Joueurs actifs + joueurs archivés ayant un questionnaire sur ce match
  const players = data.players
    .filter((p) => !p.archived || byPlayer.has(p.id))
    .sort((a, b) => Number(byPlayer.has(a.id)) - Number(byPlayer.has(b.id)) || (a.number ?? 999) - (b.number ?? 999));
  const played = reports.filter((r) => r.minutesPlayed > 0);
  const res = matchResult(match);

  return (
    <Screen>
      <Stack.Screen options={{ title: `${match.home ? 'vs' : '@'} ${match.opponent}` }} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title>
            {match.home ? 'vs' : '@'} {match.opponent}
          </Title>
          <Title>{res.text}</Title>
        </Row>
        <Txt muted>
          {formatDate(match.date)}
          {match.competition ? ` · ${match.competition}` : ''} · {match.home ? 'Domicile' : 'Extérieur'}
        </Txt>
        {match.notes ? <Txt>{match.notes}</Txt> : null}
      </Card>

      {reports.length > 0 && (
        <Row style={{ flexWrap: 'wrap' }}>
          <StatBox label="RPE moyen" value={fmt(avg(played.map((r) => r.rpe)))} />
          <StatBox label="Forme /5" value={fmt(avg(reports.map(wellnessScore)))} />
          <StatBox label="Charge totale" value={played.reduce((a, r) => a + sessionLoad(r), 0)} />
          <StatBox label="Douleurs" value={reports.filter((r) => r.pain).length} />
        </Row>
      )}

      <Section>
        Questionnaires ({reports.length}/{players.length})
      </Section>
      {players.length === 0 && (
        <Empty text="Ajoutez d'abord des joueurs à l'effectif." action={<Button title="Ajouter un joueur" onPress={() => router.push('/joueur/edit')} />} />
      )}
      {players.map((p) => {
        const r = byPlayer.get(p.id);
        const inj = activeInjury(data, p.id);
        return (
          <Card key={p.id} onPress={() => router.push({ pathname: '/questionnaire', params: { matchId: match.id, playerId: p.id } })}>
            <Row>
              <Avatar label={p.number != null ? String(p.number) : p.firstName[0] ?? '?'} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold>{playerName(p)}</Txt>
                {r ? (
                  <Txt muted size={13}>
                    {r.minutesPlayed} min · RPE {fmt(r.rpe)} · note {fmt(r.coachRating)}
                    {STAT_FIELDS.filter((f) => (r.stats[f.key] ?? 0) > 0)
                      .map((f) => ` · ${r.stats[f.key]} ${f.short}`)
                      .join('')}
                  </Txt>
                ) : (
                  <Txt color={t.primary} size={13}>
                    Remplir le questionnaire →
                  </Txt>
                )}
              </View>
              {r?.pain ? <Badge text="Douleur" tone="danger" /> : r ? <Badge text="✓" tone="success" /> : inj ? <Badge text="Blessé" tone="warning" /> : null}
            </Row>
          </Card>
        );
      })}

      <Button title="Modifier le match" kind="secondary" onPress={() => router.push({ pathname: '/match/edit', params: { id: match.id } })} />
    </Screen>
  );
}
