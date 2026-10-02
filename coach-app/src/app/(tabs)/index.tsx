import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ClubLogo } from '@/components/ClubLogo';
import { StrengthsWeaknesses } from '@/components/Feedback';
import { MediaStrip } from '@/components/Media';
import { Ring } from '@/components/Ring';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PlayerHome } from '@/components/PlayerHome';
import { ScorePill } from '@/components/ScorePill';
import { useTheme } from '@/components/theme';
import { ActionTile, Avatar, HeroStat, Badge, Button, Card, Empty, IconCircle, Link, Progress, Row, Screen, Section, Txt } from '@/components/ui';
import type { IconName, Tone } from '@/components/ui';
import { PREP_FIELDS } from '@/lib/constants';
import { useStore } from '@/lib/store';
import {
  avg,
  byDateDesc,
  computeAlerts,
  isoDaysAgo,
  wellnessScore,
  fmt,
  formatDate,
  initials,
  playerName,
  seasonRecord,
  sessionPresent,
  summarizePlayer,
  today,
} from '@/lib/stats';
import type { AlertKind } from '@/lib/stats';

const ALERT_ICON: Record<AlertKind, IconName> = {
  injury: 'medkit',
  pain: 'bandage',
  wellness: 'battery-dead',
  rpe: 'flame',
  load: 'trending-up',
  absence: 'calendar-clear',
};
const FORM_LETTER = { win: 'V', draw: 'N', loss: 'D', none: '–' } as const;

export default function Home() {
  const { session } = useStore();
  if (session?.role === 'player') return <PlayerHome playerId={session.playerId} />;
  return <Dashboard />;
}

function Dashboard() {
  const t = useTheme();
  const { data, club, loadDemo } = useStore();
  const active = useMemo(() => data.players.filter((p) => !p.archived), [data.players]);
  const alerts = useMemo(() => computeAlerts(data), [data]);
  const summaries = useMemo(() => active.map((p) => summarizePlayer(data, p)), [data, active]);
  const record = useMemo(() => seasonRecord(data), [data]);
  const [showAll, setShowAll] = useState(false);
  const injured = summaries.filter((s) => s.activeInjury?.status === 'active').length;
  const lastMatch = [...data.matches].filter((m) => m.scoreFor != null).sort(byDateDesc)[0];
  const nextMatch = data.matches.filter((m) => m.scoreFor == null && m.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const since = isoDaysAgo(14);
  const recentFb = data.sessions.filter((x) => x.date >= since).flatMap((x) => Object.values(x.feedback ?? {}));
  const recentSessions = data.sessions.filter((x) => x.date >= since && x.date <= today());
  const recentMatchIds = new Set(data.matches.filter((m) => m.date >= since).map((m) => m.id));
  const weather = {
    form: avg(data.reports.filter((r) => recentMatchIds.has(r.matchId)).map(wellnessScore)),
    quality: avg(recentFb.map((f) => f.quality)),
    attendance: recentSessions.length
      ? recentSessions.reduce((a, x) => a + sessionPresent(x) / Math.max(1, Object.values(x.attendance).filter((v) => v !== 'blesse').length), 0) /
        recentSessions.length
      : undefined,
  };
  const lastSession = [...data.sessions].sort(byDateDesc).find((x) => x.date <= today()) ?? [...data.sessions].sort((a, b) => a.date.localeCompare(b.date))[0];
  const players = new Map(data.players.map((p) => [p.id, p]));
  const recentMedia = [...data.media].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const formColor = { win: '#22C55E', draw: '#94A3B8', loss: '#EF4444', none: '#94A3B8' };

  if (!data.players.length && !data.matches.length)
    return (
      <Screen>
        <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 24, gap: 12 }}>
          <ClubLogo size={84} />
          <Text style={{ color: t.heroText, fontSize: 26, fontWeight: '800' }}>Bienvenue coach 👋</Text>
          <Text style={{ color: t.heroMuted, fontSize: 15, lineHeight: 22 }}>
            Suivez vos joueurs après chaque match : ressenti, charge (RPE), statistiques, blessures et vidéos — tout au même endroit.
          </Text>
        </LinearGradient>
        <Empty
          icon="people-outline"
          text="Commencez par ajouter vos joueurs, ou chargez des données de démonstration pour découvrir l'appli."
          action={
            <View style={{ gap: 10, alignSelf: 'stretch' }}>
              <Button title="Ajouter un joueur" icon="person-add" onPress={() => router.push('/joueur/edit')} />
              <Button title="Charger la démo" icon="sparkles" kind="secondary" onPress={loadDemo} />
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
      {/* Bandeau équipe */}
      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, gap: 16 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <ClubLogo size={60} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: t.heroMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }} numberOfLines={1}>
              {club.name}
            </Text>
            <Text style={{ color: t.heroText, fontSize: 26, fontWeight: '900' }} numberOfLines={1}>
              {data.teamName}
            </Text>
          </View>
          {record.form.length > 0 && (
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ color: t.heroMuted, fontSize: 11, fontWeight: '600' }}>FORME</Text>
              <Row style={{ gap: 4 }}>
                {[...record.form].reverse().map((f) => (
                  <View
                    key={f.id}
                    style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: formColor[f.tone], alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{FORM_LETTER[f.tone]}</Text>
                  </View>
                ))}
              </Row>
            </View>
          )}
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <HeroStat value={record.wins} label="Victoires" />
          <HeroStat value={record.draws} label="Nuls" />
          <HeroStat value={record.losses} label="Défaites" />
          <HeroStat value={`${record.goalsFor}:${record.goalsAgainst}`} label="Buts" />
        </Row>
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: t.heroText, fontWeight: '700' }}>
              <Ionicons name="people" size={14} color={t.heroText} /> {active.length - injured}/{active.length} disponibles
            </Text>
            {injured > 0 && (
              <Text style={{ color: t.heroMuted, fontWeight: '600' }}>
                {injured} blessé{injured > 1 ? 's' : ''}
              </Text>
            )}
          </Row>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#fff',
                width: `${active.length ? ((active.length - injured) / active.length) * 100 : 0}%`,
              }}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Météo du groupe */}
      {(weather.form != null || weather.quality != null || weather.attendance != null) && (
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Card>
            <Row>
              <Ionicons name="partly-sunny" size={18} color={t.accent} />
              <Txt bold>Météo du groupe · 14 derniers jours</Txt>
            </Row>
            <Row style={{ justifyContent: 'space-around', alignItems: 'flex-start' }}>
              <Ring
                value={weather.form != null ? (weather.form - 1) / 4 : undefined}
                display={weather.form != null ? fmt(weather.form) : '–'}
                label="Forme /5"
              />
              <Ring
                value={weather.quality != null ? weather.quality / 10 : undefined}
                display={weather.quality != null ? fmt(weather.quality) : '–'}
                label="Qualité séances /10"
              />
              <Ring value={weather.attendance} display={weather.attendance != null ? `${Math.round(weather.attendance * 100)}%` : '–'} label="Assiduité" />
            </Row>
          </Card>
        </Animated.View>
      )}

      {/* Actions rapides */}
      <Row style={{ gap: 10 }}>
        <ActionTile icon="add-circle" label="Nouveau match" onPress={() => router.push('/match/edit')} />
        <ActionTile
          icon="clipboard"
          label="Suivi du match"
          tone="info"
          onPress={() => (lastMatch ? router.push(`/match/${lastMatch.id}`) : router.push('/match/edit'))}
        />
        <ActionTile icon="grid" label="Compo" tone="accent" onPress={() => router.push('/compo')} />
        <ActionTile icon="videocam" label="Vidéo" tone="violet" onPress={() => router.push({ pathname: '/media/edit', params: { source: 'library' } })} />
      </Row>

      {lastMatch && (
        <>
          <Section icon="time-outline" action={<Link title="Tous les matchs" onPress={() => router.push('/matchs')} />}>
            Dernier match
          </Section>
          <Card onPress={() => router.push(`/match/${lastMatch.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold size={17}>
                  {lastMatch.home ? 'vs' : '@'} {lastMatch.opponent}
                </Txt>
                <Txt muted size={13}>
                  {formatDate(lastMatch.date)}
                  {lastMatch.competition ? ` · ${lastMatch.competition}` : ''}
                </Txt>
              </View>
              <ScorePill m={lastMatch} />
            </Row>
            <View style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt muted size={13}>
                  Questionnaires remplis
                </Txt>
                <Txt bold size={13}>
                  {lastMatchReports}/{active.length}
                </Txt>
              </Row>
              <Progress value={active.length ? lastMatchReports / active.length : 0} />
            </View>
          </Card>
        </>
      )}

      {nextMatch && (
        <Card onPress={() => router.push({ pathname: '/prepa', params: { matchId: nextMatch.id } })} stripe={t.info}>
          <Row style={{ gap: 12 }}>
            <IconCircle icon="clipboard" tone="info" />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt bold>
                Préparer {nextMatch.home ? 'vs' : '@'} {nextMatch.opponent}
              </Txt>
              <Txt muted size={13}>
                {formatDate(nextMatch.date)} · préparation {PREP_FIELDS.filter((f) => nextMatch.prep?.[f.key]?.trim()).length}/{PREP_FIELDS.length}
                {nextMatch.prep?.published ? ' · publiée' : ''} · compo {data.lineups.some((l) => l.matchId === nextMatch.id) ? '✓' : 'à faire'}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.muted} />
          </Row>
        </Card>
      )}

      {recentFb.length > 0 && (
        <Card>
          <Row>
            <Ionicons name="pulse" size={18} color={t.primary} />
            <Txt bold>Ressenti des séances · 14 derniers jours</Txt>
          </Row>
          <Row style={{ gap: 8 }}>
            {(
              [
                ['Qualité', avg(recentFb.map((f) => f.quality)), 'success'],
                ['Perf perso', avg(recentFb.map((f) => f.selfPerf)), 'accent'],
                ['Intensité', avg(recentFb.map((f) => f.intensity)), 'warning'],
              ] as const
            ).map(([label, v, tone]) => (
              <View key={label} style={{ flex: 1 }}>
                <Badge text={`${label} ${fmt(v)}/10`} tone={tone} />
              </View>
            ))}
          </Row>
          <Txt muted size={12}>
            {recentFb.length} réponses de joueurs
          </Txt>
        </Card>
      )}

      {lastSession && (
        <Card onPress={() => router.push(`/seance/${lastSession.id}`)}>
          <Row style={{ gap: 12 }}>
            <IconCircle icon="fitness" tone="info" />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt bold>
                {lastSession.date > today() ? 'Prochaine séance' : 'Dernière séance'} · {lastSession.theme ?? 'Entraînement'}
              </Txt>
              <Txt muted size={13}>
                {formatDate(lastSession.date)}
                {lastSession.time ? ` · ${lastSession.time}` : ''} · {sessionPresent(lastSession)}/{Object.keys(lastSession.attendance).length} présents
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.muted} />
          </Row>
        </Card>
      )}

      {lastMatch && data.reports.some((r) => r.matchId === lastMatch.id) && (
        <StrengthsWeaknesses
          data={data}
          reports={data.reports.filter((r) => r.matchId === lastMatch.id)}
          title={`Analyse des joueurs · ${lastMatch.home ? 'vs' : '@'} ${lastMatch.opponent}`}
        />
      )}

      <Section icon="notifications-outline">Alertes ({alerts.length})</Section>
      {alerts.length === 0 ? (
        <Card>
          <Row>
            <IconCircle icon="checkmark-done" tone="success" />
            <Txt>Aucune alerte. Tout le monde est opérationnel.</Txt>
          </Row>
        </Card>
      ) : (
        alerts.slice(0, showAll ? alerts.length : 5).map((a, i) => {
          const p = players.get(a.playerId);
          const tone: Tone = a.level === 'high' ? 'danger' : 'warning';
          return (
            <Animated.View key={i} entering={FadeInDown.delay(120 + i * 50).springify()}>
              <Card onPress={() => router.push(`/joueur/${a.playerId}`)} style={{ paddingVertical: 12 }}>
                <Row>
                  <IconCircle icon={ALERT_ICON[a.kind]} tone={tone} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt bold>{playerName(p)}</Txt>
                    <Txt muted size={13}>
                      {a.text}
                    </Txt>
                  </View>
                  <Badge text={a.level === 'high' ? 'Prioritaire' : 'À surveiller'} tone={tone} />
                </Row>
              </Card>
            </Animated.View>
          );
        })
      )}

      {alerts.length > 5 && (
        <Button
          small
          kind="ghost"
          icon={showAll ? 'chevron-up' : 'chevron-down'}
          title={showAll ? 'Réduire' : `Voir les ${alerts.length} alertes`}
          onPress={() => setShowAll((v) => !v)}
        />
      )}

      {recentMedia.length > 0 && (
        <>
          <Section icon="play-circle-outline" action={<Link title="Vidéothèque" onPress={() => router.push('/videos')} />}>
            Dernières vidéos
          </Section>
          <MediaStrip items={recentMedia} />
        </>
      )}

      {(top('goals').length > 0 || topRated.length > 0) && <Section icon="trophy-outline">Classements</Section>}
      <View style={{ gap: 12 }}>
        {top('goals').length > 0 && (
          <Leaderboard title="Buteurs" icon="football" rows={top('goals').map((s) => [s.player.id, s.player, String(s.totals.goals)])} />
        )}
        {top('assists').length > 0 && (
          <Leaderboard title="Passeurs" icon="git-branch" rows={top('assists').map((s) => [s.player.id, s.player, String(s.totals.assists)])} />
        )}
        {topRated.length > 0 && (
          <Leaderboard title="Note coach (moyenne)" icon="star" rows={topRated.map((s) => [s.player.id, s.player, fmt(s.avgCoachRating)])} />
        )}
      </View>
    </Screen>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];
function Leaderboard({ title, icon, rows }: { title: string; icon: IconName; rows: [string, Parameters<typeof initials>[0], string][] }) {
  const t = useTheme();
  return (
    <Card>
      <Row>
        <Ionicons name={icon} size={18} color={t.primary} />
        <Txt bold>{title}</Txt>
      </Row>
      {rows.map(([id, p, value], i) => (
        <Pressable key={id} onPress={() => router.push(`/joueur/${id}`)}>
          <Row>
            <Text style={{ fontSize: 18, width: 26 }}>{MEDALS[i]}</Text>
            <Avatar size={32} colorKey={p.id} photo={p.photoUri} label={initials(p)} />
            <View style={{ flex: 1 }}>
              <Txt>{playerName(p)}</Txt>
            </View>
            <Txt bold size={17}>
              {value}
            </Txt>
          </Row>
        </Pressable>
      ))}
    </Card>
  );
}
