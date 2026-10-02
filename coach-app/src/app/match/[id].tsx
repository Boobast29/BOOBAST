import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { StrengthsWeaknesses, TeamFeedback } from '@/components/Feedback';
import { ClubLogo } from '@/components/ClubLogo';
import { MediaStrip } from '@/components/Media';
import { useTheme } from '@/components/theme';
import { SendPanel } from '@/components/SendPanel';
import type { RecipientGroup } from '@/components/SendPanel';
import { Avatar, Badge, Button, Card, Empty, Field, HeaderButton, HeroStat, IconCircle, Link, List, ListRow, Row, Screen, Section, Txt } from '@/components/ui';
import { DEBRIEF_FIELDS, PREP_FIELDS, STAT_FIELDS } from '@/lib/constants';
import { SliderScale } from '@/components/Slider';
import { useStore } from '@/lib/store';
import { defaultMatchRecipients, matchRequest } from '@/lib/requests';
import { activeInjury, avg, fmt, formatDate, initials, matchResult, playerName, sessionLoad, today, wellnessScore } from '@/lib/stats';

const RESULT_LABEL = { win: 'Victoire', draw: 'Match nul', loss: 'Défaite', none: 'À jouer' } as const;

export default function MatchDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveMatch } = useStore();
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
  const request = matchRequest(data, match);
  const lineup = data.lineups.find((x) => x.matchId === match.id);
  const lineupIds = defaultMatchRecipients(data, match);
  const groups: RecipientGroup[] = [
    ...(lineup && lineupIds !== 'all' ? [{ label: 'Joueurs de la compo', to: lineupIds }] : []),
    { label: 'Tout l’effectif', to: 'all' as const },
  ];
  const played_ = match.scoreFor != null || match.date <= today();

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <HeaderButton icon="create-outline" label="Modifier le match" onPress={edit} />,
        }}
      />

      <View style={{ backgroundColor: t.heroSolid, borderRadius: 14, padding: 20, gap: 14 }}>
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
      </View>

      {match.notes ? (
        <Card>
          <Row>
            <Ionicons name="document-text-outline" size={18} color={t.muted} />
            <Txt>{match.notes}</Txt>
          </Row>
        </Card>
      ) : null}

      {played_ && <SendPanel request={request} groups={groups} />}

      <List>
        <ListRow
          first
          left={<IconCircle icon="grid" tone="accent" size={34} />}
          title="Composition"
          subtitle={lineup ? `${lineup.formation} · ${lineup.slots.filter(Boolean).length}/${lineup.slots.length} titulaires · ${lineup.bench.length} remplaçants` : 'Pas encore préparée'}
          right={lineup?.published ? <Badge text="Publiée" tone="success" /> : null}
          onPress={() => router.push({ pathname: '/compo', params: { matchId: match.id } })}
        />
        <ListRow
          left={<IconCircle icon="clipboard" tone="info" size={34} />}
          title="Préparation du match"
          subtitle={`${PREP_FIELDS.filter((f) => match.prep?.[f.key]?.trim()).length}/${PREP_FIELDS.length} rubriques · adversaire, consignes`}
          right={match.prep?.published ? <Badge text="Publiée" tone="success" /> : null}
          onPress={() => router.push({ pathname: '/prepa', params: { matchId: match.id } })}
        />
      </List>

      {match.scoreFor != null && (
        <>
          <Section icon="create-outline">Débrief du coach</Section>
          <Card stripe={t.primary}>
            <Txt muted size={12}>
              Privé : les joueurs ne voient pas ce débrief.
            </Txt>
            {DEBRIEF_FIELDS.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={match.debrief?.[f.key] ?? ''}
                onChangeText={(v) => saveMatch({ ...match, debrief: { ...match.debrief, [f.key]: v || undefined } })}
                multiline
                placeholder={f.placeholder}
              />
            ))}
            <SliderScale
              label="Note collective du coach"
              value={match.debrief?.coachTeamRating}
              onChange={(v) => saveMatch({ ...match, debrief: { ...match.debrief, coachTeamRating: v } })}
              showValue
            />
          </Card>
        </>
      )}

      <Section icon="play-circle-outline" action={<Link title="+ Ajouter" onPress={() => router.push({ pathname: '/media/edit', params: { source: 'library', matchId: match.id } })} />}>
        Vidéos du match ({media.length})
      </Section>
      {media.length ? <MediaStrip items={media} /> : <Txt muted size={14}>Ajoutez le résumé ou des extraits pour la séance vidéo.</Txt>}

      {reports.length > 0 && (
        <>
          <Section icon="analytics-outline">Ressenti de l’équipe</Section>
          <StrengthsWeaknesses data={data} reports={reports} />
          <TeamFeedback data={data} reports={reports} />
          {reports.some((r) => r.playerComment) && (
            <Card>
              <Row>
                <Ionicons name="chatbubbles-outline" size={18} color={t.primary} />
                <Txt bold>Ce que disent les joueurs</Txt>
              </Row>
              {reports
                .filter((r) => r.playerComment)
                .map((r) => (
                  <View key={r.id} style={{ gap: 2 }}>
                    <Txt size={13} bold>
                      {playerName(data.players.find((p) => p.id === r.playerId))}
                    </Txt>
                    <Txt muted size={14}>
                      « {r.playerComment} »
                    </Txt>
                  </View>
                ))}
            </Card>
          )}
        </>
      )}

      {played_ && players.length > 0 && (
        <>
          <Section>Réponses joueur par joueur</Section>
          <Txt muted size={13}>
            Touchez un joueur pour voir ses réponses, ou les saisir à sa place.
          </Txt>
          <List>
            {players.map((p, i) => {
              const r = byPlayer.get(p.id);
              const inj = activeInjury(data, p.id);
              return (
                <ListRow
                  key={p.id}
                  first={i === 0}
                  left={<Avatar label={initials(p)} colorKey={p.id} photo={p.photoUri} size={34} />}
                  title={playerName(p)}
                  subtitle={
                    r
                      ? `${r.minutesPlayed}′ · RPE ${fmt(r.rpe)}${r.coachRating != null ? ` · note ${fmt(r.coachRating)}` : ''}${STAT_FIELDS.filter((f) => (r.stats[f.key] ?? 0) > 0)
                          .map((f) => ` · ${r.stats[f.key]} ${f.short}`)
                          .join('')}`
                      : request.recipients.some((x) => x.id === p.id)
                        ? request.dispatch
                          ? 'En attente de sa réponse'
                          : 'Pas encore envoyé'
                        : 'Non concerné'
                  }
                  right={
                    r?.pain ? (
                      <Badge text="Douleur" tone="danger" />
                    ) : r ? (
                      <Ionicons name="checkmark-circle" size={22} color={t.primary} />
                    ) : inj ? (
                      <Badge text="Blessé" tone="warning" />
                    ) : null
                  }
                  onPress={() => router.push({ pathname: '/questionnaire', params: { matchId: match.id, playerId: p.id } })}
                />
              );
            })}
          </List>
        </>
      )}
      {players.length === 0 && (
        <Empty text="Ajoutez d'abord des joueurs à l'effectif." action={<Button title="Ajouter un joueur" icon="person-add" onPress={() => router.push('/joueur/edit')} />} />
      )}

      <Button title="Modifier le match" icon="create-outline" kind="secondary" onPress={edit} />
    </Screen>
  );
}

function Team({ name, us }: { name: string; us: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      {us ? (
        <ClubLogo size={56} />
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="shield-outline" size={26} color="#fff" />
        </View>
      )}
      <Text style={{ color: t.heroText, fontWeight: '700', textAlign: 'center', fontSize: 13 }} numberOfLines={2}>
        {name}
      </Text>
    </View>
  );
}
