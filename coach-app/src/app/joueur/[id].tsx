import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { MediaStrip } from '@/components/Media';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Empty, HeaderButton, HeroStat, Link, Row, Screen, Section, StatBox, Txt } from '@/components/ui';
import { INJURY_STATUS_LABEL, INJURY_STATUS_TONE, STAT_FIELDS, statsForPosition } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { byDateDesc, fmt, formatAnswer, formatDate, initials, matchLabel, playerName, reportsForPlayer, sessionLoad, summarizePlayer, wellnessScore } from '@/lib/stats';

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
  const media = data.media
    .filter((m) => m.playerIds.includes(player.id) || m.markers.some((k) => k.playerId === player.id))
    .sort((a, b) => b.date.localeCompare(a.date));
  // Évolution du bien-être sur les 8 derniers questionnaires (plus ancien → plus récent)
  const trend = reports.slice(0, 8).reverse();
  const edit = () => router.push({ pathname: '/joueur/edit', params: { id: player.id } });

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <HeaderButton icon="create-outline" label="Modifier le joueur" onPress={edit} />,
        }}
      />

      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, gap: 16 }}>
        <Row style={{ gap: 14 }}>
          <Avatar label={initials(player)} colorKey={player.id} size={72} ring="rgba(255,255,255,0.9)" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: t.heroText, fontSize: 24, fontWeight: '800' }}>{playerName(player)}</Text>
            <Text style={{ color: t.heroMuted, fontSize: 14 }}>
              {[player.position, player.birthDate && `né le ${formatDate(player.birthDate)}`].filter(Boolean).join(' · ') || 'Poste non renseigné'}
            </Text>
            <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
              {s.activeInjury ? (
                <Badge text={INJURY_STATUS_LABEL[s.activeInjury.status]} tone={INJURY_STATUS_TONE[s.activeInjury.status]} icon="medkit" />
              ) : (
                <Badge text="Disponible" tone="success" icon="checkmark-circle" />
              )}
            </View>
          </View>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <HeroStat value={s.matchesPlayed} label="Matchs" />
          <HeroStat value={s.totals.goals} label="Buts" />
          <HeroStat value={s.totals.assists} label="Passes D." />
          <HeroStat value={s.minutes} label="Minutes" />
        </Row>
      </LinearGradient>

      {player.notes ? (
        <Card>
          <Row>
            <Ionicons name="document-text-outline" size={18} color={t.muted} />
            <Txt muted>{player.notes}</Txt>
          </Row>
        </Card>
      ) : null}

      <Row style={{ flexWrap: 'wrap', gap: 10 }}>
        <StatBox label="Note coach" value={fmt(s.avgCoachRating)} icon="star" tone="accent" />
        <StatBox label="Auto-éval." value={fmt(s.avgSelfRating)} icon="person" tone="info" />
        <StatBox label="RPE moyen" value={fmt(s.avgRpe)} icon="flame" tone="warning" />
        <StatBox label="Forme /5" value={fmt(s.avgWellness)} icon="heart" tone="success" />
      </Row>

      <Section icon="play-circle-outline" action={<Link title="+ Ajouter" onPress={() => router.push({ pathname: '/media/edit', params: { source: 'library', playerId: player.id } })} />}>
        Vidéos ({media.length})
      </Section>
      {media.length ? <MediaStrip items={media} /> : <Txt muted size={14}>Aucune vidéo où ce joueur est tagué.</Txt>}

      <Section icon="stats-chart-outline">Statistiques cumulées</Section>
      <Card>
        {STAT_FIELDS.filter((f) => statsForPosition(player.position).includes(f) || s.totals[f.key] > 0).map((f) => (
          <Row key={f.key} style={{ justifyContent: 'space-between' }}>
            <Txt>{f.label}</Txt>
            <Txt bold>{s.totals[f.key]}</Txt>
          </Row>
        ))}
        {s.minutes > 0 && (
          <Badge text={`${fmt((s.totals.goals + s.totals.assists) / (s.minutes / 90), 2)} B+PD / 90 min · ${s.starts} titularisation${s.starts > 1 ? 's' : ''}`} tone="success" icon="speedometer" />
        )}
      </Card>

      {trend.length > 1 && (
        <>
          <Section icon="pulse-outline">Forme — derniers matchs</Section>
          <Card>
            <Row style={{ alignItems: 'flex-end', height: 110, gap: 8 }}>
              {trend.map((r) => {
                const w = wellnessScore(r);
                const color = w == null ? t.border : w < 2.5 ? t.danger : w < 3.5 ? t.warning : t.primary;
                const m = matches.get(r.matchId);
                return (
                  <View key={r.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Txt size={11} bold color={color}>
                      {fmt(w)}
                    </Txt>
                    <View style={{ width: '100%', height: ((w ?? 0) / 5) * 64 + 4, backgroundColor: color, borderRadius: 8 }} />
                    <Txt size={10} muted numberOfLines={1}>
                      {m ? formatDate(m.date).slice(0, 5) : ''}
                    </Txt>
                  </View>
                );
              })}
            </Row>
          </Card>
        </>
      )}

      <Section icon="medkit-outline" action={<Link title="+ Déclarer" onPress={() => router.push({ pathname: '/blessure/edit', params: { playerId: player.id } })} />}>
        Blessures ({injuries.length})
      </Section>
      {injuries.length === 0 && <Txt muted size={14}>Aucune blessure enregistrée.</Txt>}
      {injuries.map((i) => (
        <Card key={i.id} stripe={i.status === 'active' ? t.danger : i.status === 'reprise' ? t.warning : t.primary} onPress={() => router.push({ pathname: '/blessure/edit', params: { id: i.id } })}>
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

      <Section icon="clipboard-outline">Questionnaires ({reports.length})</Section>
      {reports.length === 0 && <Txt muted size={14}>Aucun questionnaire pour ce joueur.</Txt>}
      {reports.map((r) => {
        const w = wellnessScore(r);
        const statLine = STAT_FIELDS.filter((f) => (r.stats[f.key] ?? 0) > 0)
          .map((f) => `${r.stats[f.key]} ${f.short}`)
          .join(' · ');
        return (
          <Card key={r.id} onPress={() => router.push({ pathname: '/questionnaire', params: { matchId: r.matchId, playerId: r.playerId } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt bold>{matchLabel(matches.get(r.matchId))}</Txt>
              {r.pain && <Badge text="Douleur" tone="danger" icon="bandage" />}
            </Row>
            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              <Badge text={`${r.minutesPlayed}′${r.starter ? ' · titulaire' : ''}`} icon="time-outline" />
              <Badge text={`RPE ${fmt(r.rpe)}`} tone="warning" icon="flame" />
              <Badge text={`Charge ${sessionLoad(r)}`} icon="barbell-outline" />
              <Badge text={`Forme ${fmt(w)}/5`} tone="success" icon="heart" />
              {r.coachRating != null && <Badge text={`Note ${r.coachRating}`} tone="accent" icon="star" />}
            </Row>
            {statLine ? <Txt size={13}>{statLine}</Txt> : null}
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

      <Button title="Modifier le joueur" icon="create-outline" kind="secondary" onPress={edit} />
    </Screen>
  );
}
