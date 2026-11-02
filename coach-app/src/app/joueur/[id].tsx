import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { PlayerFeedback } from '@/components/Feedback';
import { MediaStrip } from '@/components/Media';
import { useTheme } from '@/components/theme';
import { TrendChart } from '@/components/TrendChart';
import { Hero, Avatar, Badge, Button, Card, Empty, HeaderButton, HeroStat, Link, List, ListRow, Progress, Row, Screen, Section, StatBox, Txt } from '@/components/ui';
import { INJURY_STATUS_LABEL, INJURY_STATUS_TONE, STAT_FIELDS, statsForPosition } from '@/lib/constants';
import { coachAlerts, playerTimeline, playingTime } from '@/lib/insights';
import { notify } from '@/lib/confirm';
import { sharePlayerReport } from '@/lib/report';
import { useStore } from '@/lib/store';
import { attendanceRate, byDateDesc, fmt, formatAnswer, formatDate, initials, matchLabel, playerName, reportsForPlayer, sessionLoad, summarizePlayer, wellnessScore } from '@/lib/stats';

export default function PlayerDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, club } = useStore();
  const player = data.players.find((p) => p.id === id);
  if (!player) return <Empty text="Joueur introuvable." />;

  const s = summarizePlayer(data, player);
  const att = attendanceRate(data, player.id);
  const objectives = data.objectives.filter((o) => o.playerId === player.id);
  const reports = reportsForPlayer(data, player.id);
  const injuries = data.injuries.filter((i) => i.playerId === player.id).sort(byDateDesc);
  const matches = new Map(data.matches.map((m) => [m.id, m]));
  const media = data.media
    .filter((m) => m.playerIds.includes(player.id) || m.markers.some((k) => k.playerId === player.id))
    .sort((a, b) => b.date.localeCompare(a.date));
  const tl = playerTimeline(data, player.id);
  const pt = playingTime(data);
  const myTime = pt.rows.find((r) => r.playerId === player.id);
  const signals = coachAlerts(data).filter((a) => a.playerId === player.id);
  const interviews = data.interviews.filter((i) => i.playerId === player.id).sort(byDateDesc);
  const edit = () => router.push({ pathname: '/joueur/edit', params: { id: player.id } });

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <HeaderButton icon="create-outline" label="Modifier le joueur" onPress={edit} />,
        }}
      />

      <Hero style={{ padding: 20, gap: 16 }}>
        <Row style={{ gap: 14 }}>
          <Avatar label={initials(player)} colorKey={player.id} photo={player.photoUri} size={72} ring="rgba(255,255,255,0.9)" />
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
      </Hero>

      {player.notes ? (
        <Card>
          <Row>
            <Ionicons name="document-text-outline" size={18} color={t.muted} />
            <Txt muted>{player.notes}</Txt>
          </Row>
        </Card>
      ) : null}

      {signals.length > 0 && (
        <List>
          {signals.map((a, i) => (
            <ListRow
              key={i}
              first={i === 0}
              left={<Ionicons name={a.level === 'high' ? 'alert-circle' : 'information-circle'} size={22} color={a.level === 'high' ? t.danger : t.warning} />}
              title={a.text}
            />
          ))}
        </List>
      )}

      <Row style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button small icon="chatbubbles-outline" title="Entretien" onPress={() => router.push({ pathname: '/entretien', params: { playerId: player.id } })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button small kind="secondary" icon="flag-outline" title="Objectif" onPress={() => router.push({ pathname: '/objectif/edit', params: { playerId: player.id } })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            small
            kind="secondary"
            icon="document-text-outline"
            title="Bilan PDF"
            onPress={() => sharePlayerReport(data, player.id, club.name).catch((e) => notify('Bilan impossible', String((e as Error)?.message ?? e)))}
          />
        </View>
      </Row>

      {(tl.form.length > 1 || tl.trainingPerf.length > 1) && (
        <>
          <Section>Évolution</Section>
          <Card style={{ gap: 18 }}>
            {tl.form.length > 1 && <TrendChart title="Forme après match" points={tl.form} min={1} max={5} unit="/5" />}
            {tl.selfRating.some((p) => p.value != null) && <TrendChart title="Sa perf perso (match)" points={tl.selfRating} min={1} max={10} unit="/10" />}
            {tl.coachRating.some((p) => p.value != null) && <TrendChart title="Votre note (match)" points={tl.coachRating} min={1} max={10} unit="/10" />}
            {tl.trainingPerf.length > 1 && <TrendChart title="Sa perf perso (entraînement)" points={tl.trainingPerf} min={1} max={10} unit="/10" />}
          </Card>
        </>
      )}

      <Row style={{ flexWrap: 'wrap', gap: 10 }}>
        <StatBox label="Note coach" value={fmt(s.avgCoachRating)} icon="star" tone="accent" />
        <StatBox label="Auto-éval." value={fmt(s.avgSelfRating)} icon="person" tone="info" />
        <StatBox label="RPE moyen" value={fmt(s.avgRpe)} icon="flame" tone="warning" />
        <StatBox label="Forme /5" value={fmt(s.avgWellness)} icon="heart" tone="success" />
      </Row>
      {myTime && pt.played > 0 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt bold>Temps de jeu</Txt>
            <Txt bold color={myTime.share < 0.3 ? t.warning : t.primary}>
              {Math.round(myTime.share * 100)} %
            </Txt>
          </Row>
          <Progress value={myTime.share} color={myTime.share < 0.3 ? t.warning : t.primary} />
          <Txt muted size={12}>
            {myTime.minutes}′ sur {pt.available}′ possibles · {myTime.starts} titularisation{myTime.starts > 1 ? 's' : ''} · derniers matchs :{' '}
            {myTime.last.map((m) => (m == null ? '–' : `${m}′`)).join(', ')}
          </Txt>
        </Card>
      )}
      {att.total > 0 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <Ionicons name="fitness-outline" size={18} color={t.primary} />
              <Txt bold>Assiduité à l’entraînement</Txt>
            </Row>
            <Txt bold color={att.rate! < 0.7 ? t.danger : att.rate! < 0.85 ? t.warning : t.primary}>
              {Math.round(att.rate! * 100)} %
            </Txt>
          </Row>
          <Progress value={att.rate!} color={att.rate! < 0.7 ? t.danger : att.rate! < 0.85 ? t.warning : t.primary} />
          <Txt muted size={12}>
            {att.present} présence{att.present > 1 ? 's' : ''} sur {att.total} séance{att.total > 1 ? 's' : ''} (hors blessure)
          </Txt>
        </Card>
      )}

      <Section icon="fitness-outline" action={<Link title="+ Ajouter" onPress={() => router.push({ pathname: '/objectif/edit', params: { playerId: player.id } })} />}>
        Points à travailler ({objectives.length})
      </Section>
      {objectives.length === 0 && <Txt muted size={14}>Aucun point à travailler.</Txt>}
      {objectives.map((o) => (
        <Card key={o.id} style={{ paddingVertical: 12, gap: 6 }} stripe={o.status === 'acquis' ? t.primary : t.info} onPress={() => router.push(`/objectif/${o.id}`)}>
          <Row>
            <Txt bold>{o.title}</Txt>
            <View style={{ flex: 1 }} />
            <Badge text={o.status} tone={o.status === 'acquis' ? 'success' : o.status === 'en cours' ? 'info' : 'neutral'} />
          </Row>
          <Row style={{ gap: 8 }}>
            <Txt muted size={12}>
              Coach {o.coachProgress ?? '–'}/10
            </Txt>
            <View style={{ flex: 1 }}>
              <Progress value={(o.coachProgress ?? 0) / 10} height={6} />
            </View>
            <Txt muted size={12}>
              Joueur {o.playerProgress ?? '–'}/10
            </Txt>
          </Row>
        </Card>
      ))}

      {interviews.length > 0 && (
        <>
          <Section action={<Link title="+ Nouveau" onPress={() => router.push({ pathname: '/entretien', params: { playerId: player.id } })} />}>Entretiens</Section>
          <List>
            {interviews.map((iv, i) => (
              <ListRow
                key={iv.id}
                first={i === 0}
                title={`Entretien du ${formatDate(iv.date)}`}
                subtitle={iv.decisions || iv.issues || iv.positives || 'Sans notes'}
                onPress={() => router.push({ pathname: '/entretien', params: { playerId: player.id, id: iv.id } })}
              />
            ))}
          </List>
        </>
      )}

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

      {reports.length > 1 && (
        <>
          <Section>Questionnaire du club, tendances</Section>
          <PlayerFeedback data={data} reports={reports} />
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
