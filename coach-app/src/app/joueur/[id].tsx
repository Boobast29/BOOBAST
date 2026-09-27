import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Empty, Row, Screen, Section, StatBox, Title, Txt } from '@/components/ui';
import { INJURY_STATUS_LABEL, INJURY_STATUS_TONE, STAT_FIELDS } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { byDateDesc, fmt, formatAnswer, formatDate, matchLabel, playerName, reportsForPlayer, sessionLoad, summarizePlayer, wellnessScore } from '@/lib/stats';

export default function PlayerDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const player = data.players.find((p) => p.id === id);
  if (!player) return <Empty text="Joueur introuvable." />;

  const s = summarizePlayer(data, player);
  const reports = reportsForPlayer(data, player.id);
  const injuries = data.injuries.filter((i) => i.playerId === player.id).sort(byDateDesc);
  const matches = new Map(data.matches.map((m) => [m.id, m]));
  // Évolution du bien-être sur les 8 derniers questionnaires (plus ancien → plus récent)
  const trend = reports.slice(0, 8).reverse();

  return (
    <Screen>
      <Stack.Screen options={{ title: playerName(player) }} />
      <Row>
        <Avatar label={player.number != null ? String(player.number) : player.firstName[0] ?? '?'} />
        <View style={{ flex: 1 }}>
          <Title>{playerName(player)}</Title>
          <Txt muted>{[player.position, player.birthDate && `né le ${formatDate(player.birthDate)}`].filter(Boolean).join(' · ')}</Txt>
        </View>
        {s.activeInjury ? (
          <Badge text={INJURY_STATUS_LABEL[s.activeInjury.status]} tone={INJURY_STATUS_TONE[s.activeInjury.status]} />
        ) : (
          <Badge text="Disponible" tone="success" />
        )}
      </Row>
      {player.notes ? <Txt muted>{player.notes}</Txt> : null}

      <Row style={{ flexWrap: 'wrap' }}>
        <StatBox label="Matchs joués" value={s.matchesPlayed} />
        <StatBox label="Titularisations" value={s.starts} />
        <StatBox label="Minutes" value={s.minutes} />
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        <StatBox label="Note coach" value={fmt(s.avgCoachRating)} />
        <StatBox label="Auto-éval." value={fmt(s.avgSelfRating)} />
        <StatBox label="RPE moyen" value={fmt(s.avgRpe)} />
        <StatBox label="Forme /5" value={fmt(s.avgWellness)} />
      </Row>

      <Section>Statistiques cumulées</Section>
      <Card>
        {STAT_FIELDS.map((f) => (
          <Row key={f.key} style={{ justifyContent: 'space-between' }}>
            <Txt>{f.label}</Txt>
            <Txt bold>{s.totals[f.key]}</Txt>
          </Row>
        ))}
        {s.minutes > 0 && (
          <Txt muted size={13}>
            {fmt((s.totals.goals + s.totals.assists) / (s.minutes / 90), 2)} but(s) + passe(s) décisive(s) par 90 min
          </Txt>
        )}
      </Card>

      {trend.length > 1 && (
        <>
          <Section>Forme (bien-être /5) — derniers matchs</Section>
          <Card>
            <Row style={{ alignItems: 'flex-end', height: 90, gap: 6 }}>
              {trend.map((r) => {
                const w = wellnessScore(r);
                const color = w == null ? t.border : w < 2.5 ? t.danger : w < 3.5 ? t.warning : t.primary;
                return (
                  <View key={r.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Txt size={11} muted>{fmt(w)}</Txt>
                    <View style={{ width: '100%', height: ((w ?? 0) / 5) * 60 + 2, backgroundColor: color, borderRadius: 4 }} />
                  </View>
                );
              })}
            </Row>
          </Card>
        </>
      )}

      <Section>Blessures ({injuries.length})</Section>
      <Button title="+ Déclarer une blessure" kind="secondary" onPress={() => router.push({ pathname: '/blessure/edit', params: { playerId: player.id } })} />
      {injuries.map((i) => (
        <Card key={i.id} onPress={() => router.push({ pathname: '/blessure/edit', params: { id: i.id } })}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt bold>
              {i.type} · {i.bodyZone}
            </Txt>
            <Badge text={INJURY_STATUS_LABEL[i.status]} tone={INJURY_STATUS_TONE[i.status]} />
          </Row>
          <Txt muted size={13}>
            {formatDate(i.date)} · {i.severity}
            {i.returnDate ? ` · retour ${formatDate(i.returnDate)}` : i.expectedReturn ? ` · retour prévu ${formatDate(i.expectedReturn)}` : ''}
          </Txt>
        </Card>
      ))}

      <Section>Questionnaires d&apos;après-match ({reports.length})</Section>
      {reports.length === 0 && <Txt muted>Aucun questionnaire pour ce joueur.</Txt>}
      {reports.map((r) => {
        const w = wellnessScore(r);
        return (
          <Card key={r.id} onPress={() => router.push({ pathname: '/questionnaire', params: { matchId: r.matchId, playerId: r.playerId } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt bold>{matchLabel(matches.get(r.matchId))}</Txt>
              {r.pain && <Badge text="Douleur" tone="danger" />}
            </Row>
            <Txt muted size={13}>
              {r.minutesPlayed} min{r.starter ? ' (titulaire)' : ''} · RPE {fmt(r.rpe)} · charge {sessionLoad(r)} · forme {fmt(w)}/5 · note {fmt(r.coachRating)}
            </Txt>
            <Txt size={13}>
              {STAT_FIELDS.filter((f) => (r.stats[f.key] ?? 0) > 0)
                .map((f) => `${r.stats[f.key]} ${f.short}`)
                .join(' · ') || '—'}
            </Txt>
            {r.playerComment ? <Txt muted size={13}>« {r.playerComment} »</Txt> : null}
            {data.questions
              .filter((q) => formatAnswer(r.answers?.[q.id]))
              .map((q) => (
                <Txt key={q.id} size={13}>
                  <Txt muted size={13}>{q.label} </Txt>
                  {formatAnswer(r.answers?.[q.id])}
                  {q.type === 'scale' ? `/${q.max ?? 5}` : ''}
                </Txt>
              ))}
          </Card>
        );
      })}

      <Button title="Modifier le joueur" kind="secondary" onPress={() => router.push({ pathname: '/joueur/edit', params: { id: player.id } })} />
    </Screen>
  );
}
