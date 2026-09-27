import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { MediaStrip } from '@/components/Media';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Empty, HeaderButton, HeroStat, Link, Progress, Row, Screen, Section, Txt } from '@/components/ui';
import { STAT_FIELDS } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { activeInjury, avg, fmt, formatDate, initials, matchResult, playerName, sessionLoad, wellnessScore } from '@/lib/stats';

const RESULT_LABEL = { win: 'Victoire', draw: 'Match nul', loss: 'Défaite', none: 'À jouer' } as const;

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
  const media = data.media.filter((m) => m.matchId === match.id);
  const edit = () => router.push({ pathname: '/match/edit', params: { id: match.id } });
  const firstMissing = players.find((p) => !byPlayer.has(p.id));

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <HeaderButton icon="create-outline" label="Modifier le match" onPress={edit} />,
        }}
      />

      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: t.heroMuted, fontSize: 13, fontWeight: '600' }}>
            {formatDate(match.date)}
            {match.competition ? ` · ${match.competition}` : ''}
          </Text>
          <Text style={{ color: t.heroText, fontSize: 12, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' }}>
            {RESULT_LABEL[res.tone]}
          </Text>
        </Row>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Team name={match.home ? data.teamName : match.opponent} us={match.home} />
          <Text style={{ color: t.heroText, fontSize: 40, fontWeight: '900', letterSpacing: 1 }}>
            {match.scoreFor == null ? 'vs' : match.home ? `${match.scoreFor} - ${match.scoreAgainst}` : `${match.scoreAgainst} - ${match.scoreFor}`}
          </Text>
          <Team name={match.home ? match.opponent : data.teamName} us={!match.home} />
        </Row>
        {reports.length > 0 && (
          <Row style={{ justifyContent: 'space-between' }}>
            <HeroStat value={fmt(avg(played.map((r) => r.rpe)))} label="RPE moy." />
            <HeroStat value={fmt(avg(reports.map(wellnessScore)))} label="Forme /5" />
            <HeroStat value={played.reduce((a, r) => a + sessionLoad(r), 0)} label="Charge" />
            <HeroStat value={reports.filter((r) => r.pain).length} label="Douleurs" />
          </Row>
        )}
      </LinearGradient>

      {match.notes ? (
        <Card>
          <Row>
            <Ionicons name="document-text-outline" size={18} color={t.muted} />
            <Txt>{match.notes}</Txt>
          </Row>
        </Card>
      ) : null}

      <Section icon="play-circle-outline" action={<Link title="+ Ajouter" onPress={() => router.push({ pathname: '/media/edit', params: { source: 'library', matchId: match.id } })} />}>
        Vidéos du match ({media.length})
      </Section>
      {media.length ? <MediaStrip items={media} /> : <Txt muted size={14}>Ajoutez le résumé ou des extraits pour la séance vidéo.</Txt>}

      <Section icon="clipboard-outline">
        Questionnaires ({reports.length}/{players.length})
      </Section>
      {players.length > 0 && <Progress value={players.length ? reports.length / players.length : 0} />}
      {firstMissing && (
        <Button
          title={reports.length ? 'Continuer les questionnaires' : 'Commencer les questionnaires'}
          icon="play"
          onPress={() => router.push({ pathname: '/questionnaire', params: { matchId: match.id, playerId: firstMissing.id } })}
        />
      )}
      {players.length === 0 && (
        <Empty text="Ajoutez d'abord des joueurs à l'effectif." action={<Button title="Ajouter un joueur" icon="person-add" onPress={() => router.push('/joueur/edit')} />} />
      )}
      {players.map((p) => {
        const r = byPlayer.get(p.id);
        const inj = activeInjury(data, p.id);
        return (
          <Card key={p.id} style={{ paddingVertical: 12 }} onPress={() => router.push({ pathname: '/questionnaire', params: { matchId: match.id, playerId: p.id } })}>
            <Row style={{ gap: 12 }}>
              <Avatar label={initials(p)} colorKey={p.id} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold>{playerName(p)}</Txt>
                {r ? (
                  <Txt muted size={13}>
                    {r.minutesPlayed}′ · RPE {fmt(r.rpe)} · note {fmt(r.coachRating)}
                    {STAT_FIELDS.filter((f) => (r.stats[f.key] ?? 0) > 0)
                      .map((f) => ` · ${r.stats[f.key]} ${f.short}`)
                      .join('')}
                  </Txt>
                ) : (
                  <Txt color={t.primary} size={13} bold>
                    Remplir le questionnaire →
                  </Txt>
                )}
              </View>
              {r?.pain ? (
                <Badge text="Douleur" tone="danger" icon="bandage" />
              ) : r ? (
                <Ionicons name="checkmark-circle" size={24} color={t.primary} />
              ) : inj ? (
                <Badge text="Blessé" tone="warning" icon="medkit" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color={t.border} />
              )}
            </Row>
          </Card>
        );
      })}

      <Button title="Modifier le match" icon="create-outline" kind="secondary" onPress={edit} />
    </Screen>
  );
}

function Team({ name, us }: { name: string; us: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: us ? '#fff' : 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={us ? 'shield' : 'shield-outline'} size={24} color={us ? '#12805C' : '#fff'} />
      </View>
      <Text style={{ color: t.heroText, fontWeight: '700', textAlign: 'center', fontSize: 13 }} numberOfLines={2}>
        {name}
      </Text>
    </View>
  );
}
