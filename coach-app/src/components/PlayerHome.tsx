import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { visibleMedia } from '@/lib/access';
import { pendingSurveys, pendingTrainingFeedback } from '@/lib/surveys';
import { INJURY_STATUS_LABEL, INJURY_STATUS_TONE, statsForPosition } from '@/lib/constants';
import { FORMATIONS } from '@/lib/formations';
import { useStore } from '@/lib/store';
import { daysBetween, fmt, formatDate, initials, matchLabel, playerName, reportsForPlayer, sessionLoad, summarizePlayer, today, wellnessScore } from '@/lib/stats';
import { ClubLogo } from './ClubLogo';
import { PlayerFeedback } from './Feedback';
import { MediaStrip } from './Media';
import { PlayerCard } from './PlayerCard';
import { useTheme } from './theme';
import { Avatar, Badge, Button, Card, Empty, HeroStat, IconCircle, Progress, Row, Screen, Section, StatBox, Txt } from './ui';
import type { IconName, Tone } from './ui';

/** Accueil d'un joueur connecté : uniquement ses propres données. */
export function PlayerHome({ playerId }: { playerId: string }) {
  const t = useTheme();
  const { data, session } = useStore();
  const player = data.players.find((p) => p.id === playerId);
  if (!player)
    return (
      <Screen>
        <Empty icon="cloud-download-outline" text="Chargement de ton espace… (connexion internet nécessaire la première fois)" />
      </Screen>
    );

  const s = summarizePlayer(data, player);
  const reports = reportsForPlayer(data, player.id);
  const done = new Set(reports.map((r) => r.matchId));
  const matches = new Map(data.matches.map((m) => [m.id, m]));
  // Questionnaires à remplir : matchs joués depuis moins de 30 jours
  const todo = data.matches
    .filter((m) => m.scoreFor != null && !done.has(m.id) && daysBetween(m.date, today()) <= 30 && m.date <= today())
    .sort((a, b) => b.date.localeCompare(a.date));
  const trainings = pendingTrainingFeedback(data, player.id);
  const surveys = pendingSurveys(data, player.id);
  const todoCount = todo.length + trainings.length + surveys.length;
  const objectives = data.objectives.filter((o) => o.playerId === player.id && o.status !== 'abandonné').sort((a, b) => (a.status === b.status ? 0 : a.status === 'en cours' ? -1 : 1));
  const next = data.matches.filter((m) => m.scoreFor == null && m.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextLineup = next && data.lineups.find((l) => l.matchId === next.id && l.published);
  const lineupStatus = nextLineup
    ? nextLineup.slots.includes(player.id)
      ? `Titulaire · ${FORMATIONS[nextLineup.formation]?.[nextLineup.slots.indexOf(player.id)]?.role ?? ''}`
      : nextLineup.bench.includes(player.id)
        ? 'Remplaçant'
        : 'Non retenu'
    : undefined;
  const media = visibleMedia(data, session).sort((a, b) => b.date.localeCompare(a.date));
  const injuries = data.injuries.filter((i) => i.playerId === player.id && i.status !== 'guérie');
  const keeper = player.position === 'Gardien';
  const cleanSheets = reports.filter((r) => r.minutesPlayed > 0 && (r.stats.goalsConceded ?? 0) === 0 && r.stats.goalsConceded !== undefined).length;
  const statFields = statsForPosition(player.position).filter((f) => !['yellowCards', 'redCards'].includes(f.key));

  return (
    <Screen>
      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, gap: 16 }}>
        <Row style={{ gap: 14 }}>
          <Avatar size={68} colorKey={player.id} photo={player.photoUri} label={initials(player)} ring="rgba(255,255,255,0.9)" />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: t.heroMuted, fontSize: 13, fontWeight: '600' }}>Salut 👋</Text>
            <Text style={{ color: t.heroText, fontSize: 23, fontWeight: '800' }}>{playerName(player)}</Text>
            <Text style={{ color: t.heroMuted, fontSize: 14 }}>
              {[player.position, player.number != null && `n°${player.number}`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <ClubLogo size={44} />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <HeroStat value={s.matchesPlayed} label="Matchs" />
          {keeper ? <HeroStat value={s.totals.saves} label="Arrêts" /> : <HeroStat value={s.totals.goals} label="Buts" />}
          {keeper ? <HeroStat value={cleanSheets} label="Clean sheets" /> : <HeroStat value={s.totals.assists} label="Passes D." />}
          <HeroStat value={s.minutes} label="Minutes" />
        </Row>
      </LinearGradient>

      <Section icon="card-outline">Ma carte</Section>
      <PlayerCard data={data} player={player} width={230} />

      {todoCount > 0 && (
        <>
          <Section icon="alert-circle-outline">À faire ({todoCount})</Section>
          {todo.map((m) => (
            <TodoCard
              key={m.id}
              icon="football"
              tone="accent"
              title="Questionnaire d’après-match"
              subtitle={matchLabel(m)}
              onPress={() => router.push({ pathname: '/questionnaire', params: { matchId: m.id, playerId: player.id } })}
            />
          ))}
          {trainings.map((x) => (
            <TodoCard
              key={x.id}
              icon="fitness"
              tone="info"
              title="Ressenti de l’entraînement"
              subtitle={`${formatDate(x.date)}${x.theme ? ` · ${x.theme}` : ''}`}
              onPress={() => router.push({ pathname: '/ressenti-seance', params: { sessionId: x.id, playerId: player.id } })}
            />
          ))}
          {surveys.map((sv) => (
            <TodoCard
              key={sv.id}
              icon="document-text"
              tone="violet"
              title={sv.title}
              subtitle={sv.dueDate ? `À rendre avant le ${formatDate(sv.dueDate)}` : 'Questionnaire du coach'}
              onPress={() => router.push(`/sondage/${sv.id}`)}
            />
          ))}
        </>
      )}

      {next && (
        <>
          <Section icon="calendar-outline">Prochain match</Section>
          <Card onPress={nextLineup ? () => router.push({ pathname: '/compo', params: { matchId: next.id } }) : undefined}>
            <Row>
              <IconCircle icon="football" tone="success" />
              <View style={{ flex: 1 }}>
                <Txt bold size={16}>
                  {next.home ? 'vs' : '@'} {next.opponent}
                </Txt>
                <Txt muted size={13}>
                  {formatDate(next.date)}
                  {next.competition ? ` · ${next.competition}` : ''} · {next.home ? 'Domicile' : 'Extérieur'}
                </Txt>
              </View>
            </Row>
            {next.prep?.published && (
              <Button small kind="secondary" icon="clipboard-outline" title="Voir la préparation du match" onPress={() => router.push({ pathname: '/prepa', params: { matchId: next.id } })} />
            )}
            {lineupStatus ? (
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge text={lineupStatus} tone={lineupStatus.startsWith('Titulaire') ? 'success' : lineupStatus === 'Remplaçant' ? 'info' : 'neutral'} icon="shirt" />
                <Txt color={t.primary} bold size={14}>
                  Voir la compo →
                </Txt>
              </Row>
            ) : (
              <Txt muted size={13}>
                La composition n’est pas encore publiée.
              </Txt>
            )}
          </Card>
        </>
      )}

      {injuries.map((i) => (
        <Card key={i.id} stripe={i.status === 'active' ? t.danger : t.warning}>
          <Row>
            <IconCircle icon="medkit" tone={i.status === 'active' ? 'danger' : 'warning'} />
            <View style={{ flex: 1 }}>
              <Txt bold>
                {i.type} · {i.bodyZone}
              </Txt>
              <Txt muted size={13}>
                {i.expectedReturn ? `Retour prévu le ${formatDate(i.expectedReturn)}` : `Depuis le ${formatDate(i.date)}`}
              </Txt>
            </View>
            <Badge text={INJURY_STATUS_LABEL[i.status]} tone={INJURY_STATUS_TONE[i.status]} />
          </Row>
          {i.treatment ? <Txt size={13}>Soins : {i.treatment}</Txt> : null}
        </Card>
      ))}

      {objectives.length > 0 && (
        <>
          <Section icon="fitness-outline">Mes points à travailler</Section>
          {objectives.map((o) => (
            <Card key={o.id} style={{ paddingVertical: 12, gap: 8 }} stripe={o.status === 'acquis' ? t.primary : t.info} onPress={() => router.push(`/objectif/${o.id}`)}>
              <Row>
                <Txt bold>{o.title}</Txt>
                <View style={{ flex: 1 }} />
                <Badge text={o.status} tone={o.status === 'acquis' ? 'success' : 'info'} />
              </Row>
              {o.details ? (
                <Txt muted size={13} numberOfLines={2}>
                  {o.details}
                </Txt>
              ) : null}
              <Row style={{ gap: 8 }}>
                <Txt muted size={12}>
                  Ma progression
                </Txt>
                <View style={{ flex: 1 }}>
                  <Progress value={(o.playerProgress ?? 0) / 10} height={6} color={t.info} />
                </View>
                {o.playerProgress == null ? <Badge text="À évaluer" tone="accent" /> : null}
              </Row>
            </Card>
          ))}
        </>
      )}

      <Section icon="stats-chart-outline">Mes stats · {player.position ?? 'saison'}</Section>
      <Row style={{ flexWrap: 'wrap', gap: 10 }}>
        {statFields.map((f) => (
          <View key={f.key} style={{ width: '31%', flexGrow: 1, alignSelf: 'stretch' }}>
            <StatBox label={f.label} value={s.totals[f.key]} icon={f.icon} tone="success" />
          </View>
        ))}
        <View style={{ width: '31%', flexGrow: 1, alignSelf: 'stretch' }}>
          <StatBox label="Forme moy. /5" value={fmt(s.avgWellness)} icon="heart" tone="info" />
        </View>
        <View style={{ width: '31%', flexGrow: 1, alignSelf: 'stretch' }}>
          <StatBox label="RPE moyen" value={fmt(s.avgRpe)} icon="flame" tone="warning" />
        </View>
      </Row>

      {media.length > 0 && (
        <>
          <Section icon="play-circle-outline">Mes vidéos</Section>
          <MediaStrip items={media.slice(0, 10)} />
        </>
      )}

      {reports.length > 1 && (
        <>
          <Section icon="analytics-outline">Mes réponses — tendances</Section>
          <PlayerFeedback data={data} reports={reports} />
        </>
      )}

      <Section icon="time-outline">Mes questionnaires ({reports.length})</Section>
      {reports.length === 0 && <Txt muted size={14}>Pas encore de questionnaire.</Txt>}
      {reports.slice(0, 10).map((r) => (
        <Card key={r.id} style={{ paddingVertical: 12 }} onPress={() => router.push({ pathname: '/questionnaire', params: { matchId: r.matchId, playerId: player.id } })}>
          <Txt bold>{matchLabel(matches.get(r.matchId))}</Txt>
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            <Badge text={`${r.minutesPlayed}′`} icon="time-outline" />
            <Badge text={`RPE ${fmt(r.rpe)}`} tone="warning" icon="flame" />
            <Badge text={`Charge ${sessionLoad(r)}`} icon="barbell-outline" />
            <Badge text={`Forme ${fmt(wellnessScore(r))}/5`} tone="success" icon="heart" />
          </Row>
        </Card>
      ))}
      {data.matches.some((m) => m.scoreFor != null && !done.has(m.id)) && todo.length === 0 && (
        <Button small kind="ghost" title="Remplir un questionnaire plus ancien" onPress={() => {
          const m = data.matches.filter((x) => x.scoreFor != null && !done.has(x.id)).sort((a, b) => b.date.localeCompare(a.date))[0];
          if (m) router.push({ pathname: '/questionnaire', params: { matchId: m.id, playerId: player.id } });
        }} />
      )}
    </Screen>
  );
}

function TodoCard({ icon, tone, title, subtitle, onPress }: { icon: IconName; tone: Tone; title: string; subtitle: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Card stripe={t.accent} onPress={onPress}>
      <Row>
        <IconCircle icon={icon} tone={tone} />
        <View style={{ flex: 1 }}>
          <Txt bold>{title}</Txt>
          <Txt muted size={13}>
            {subtitle}
          </Txt>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.muted} />
      </Row>
    </Card>
  );
}
