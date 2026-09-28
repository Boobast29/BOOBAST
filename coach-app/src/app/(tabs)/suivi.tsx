import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Chips, Empty, IconCircle, Progress, Row, Screen, Section, Txt } from '@/components/ui';
import { OBJECTIVE_STATUS_TONE } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { formatDate, initials, playerName, today } from '@/lib/stats';
import { surveyTargets } from '@/lib/surveys';
import type { ObjectiveStatus } from '@/lib/types';

type View_ = 'objectifs' | 'questionnaires';

export default function Suivi() {
  const t = useTheme();
  const [view, setView] = useState<View_>('objectifs');
  return (
    <Screen>
      <View style={{ flexDirection: 'row', backgroundColor: t.input, borderRadius: 14, padding: 4 }}>
        {(
          [
            ['objectifs', 'Points à travailler', 'fitness'],
            ['questionnaires', 'Questionnaires', 'document-text'],
          ] as const
        ).map(([k, label, icon]) => {
          const on = view === k;
          return (
            <Pressable
              key={k}
              onPress={() => setView(k)}
              style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: on ? t.card : 'transparent' }}
            >
              <Ionicons name={icon} size={16} color={on ? t.primary : t.muted} />
              <Text style={{ color: on ? t.text : t.muted, fontWeight: on ? '800' : '600', fontSize: 13 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {view === 'objectifs' ? <Objectives /> : <Surveys />}
    </Screen>
  );
}

const FILTERS = ['En cours', 'Acquis', 'Tous'] as const;

function Objectives() {
  const t = useTheme();
  const { data } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('En cours');
  const want: Record<(typeof FILTERS)[number], ObjectiveStatus[] | null> = { 'En cours': ['en cours'], Acquis: ['acquis'], Tous: null };
  const list = data.objectives.filter((o) => !want[filter] || want[filter]!.includes(o.status));
  const players = data.players.filter((p) => list.some((o) => o.playerId === p.id)).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const withoutGoal = data.players.filter((p) => !p.archived && !data.objectives.some((o) => o.playerId === p.id && o.status === 'en cours'));

  return (
    <>
      <Button title="Nouveau point à travailler" icon="add-circle" onPress={() => router.push('/objectif/edit')} />
      <Chips options={FILTERS} value={filter} onChange={(v) => v && setFilter(v)} />
      {list.length === 0 && (
        <Empty icon="fitness-outline" text="Fixez à chaque joueur ses points à travailler : il les voit dans son espace, indique où il en est, et vous suivez sa progression." />
      )}
      {players.map((p) => (
        <View key={p.id} style={{ gap: 8 }}>
          <Pressable onPress={() => router.push(`/joueur/${p.id}`)}>
            <Row style={{ marginTop: 6 }}>
              <Avatar size={30} colorKey={p.id} photo={p.photoUri} label={initials(p)} />
              <Txt bold>{playerName(p)}</Txt>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => router.push({ pathname: '/objectif/edit', params: { playerId: p.id } })} hitSlop={8} accessibilityLabel={`Ajouter un point pour ${playerName(p)}`}>
                <Ionicons name="add-circle-outline" size={24} color={t.primary} />
              </Pressable>
            </Row>
          </Pressable>
          {list
            .filter((o) => o.playerId === p.id)
            .map((o) => (
              <Card key={o.id} style={{ paddingVertical: 12, gap: 8 }} onPress={() => router.push(`/objectif/${o.id}`)} stripe={o.status === 'acquis' ? t.primary : t.info}>
                <Row>
                  <Txt bold>{o.title}</Txt>
                  <View style={{ flex: 1 }} />
                  <Badge text={o.status} tone={OBJECTIVE_STATUS_TONE[o.status]} />
                </Row>
                <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                  {o.category ? <Badge text={o.category} tone="violet" /> : null}
                  {o.dueDate ? <Badge text={formatDate(o.dueDate)} icon="calendar-outline" tone={o.dueDate < today() && o.status === 'en cours' ? 'danger' : 'neutral'} /> : null}
                  {o.coachNotes.length ? <Badge text={`${o.coachNotes.length} note${o.coachNotes.length > 1 ? 's' : ''}`} icon="chatbubble-ellipses-outline" /> : null}
                </Row>
                <Row style={{ gap: 8 }}>
                  <Txt muted size={12}>
                    Coach
                  </Txt>
                  <View style={{ flex: 1 }}>
                    <Progress value={(o.coachProgress ?? 0) / 10} height={6} />
                  </View>
                  <Txt muted size={12}>
                    Joueur
                  </Txt>
                  <View style={{ flex: 1 }}>
                    <Progress value={(o.playerProgress ?? 0) / 10} height={6} color={t.info} />
                  </View>
                </Row>
              </Card>
            ))}
        </View>
      ))}
      {filter === 'En cours' && withoutGoal.length > 0 && data.objectives.length > 0 && (
        <Card>
          <Txt muted size={13}>
            Sans point en cours : {withoutGoal.map((p) => p.firstName).join(', ')}
          </Txt>
        </Card>
      )}
    </>
  );
}

function Surveys() {
  const t = useTheme();
  const { data } = useStore();
  const list = [...data.surveys].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const postMatchCount = data.questions.filter((q) => q.active).length;
  return (
    <>
      <Button title="Nouveau questionnaire" icon="add-circle" onPress={() => router.push('/sondage/edit')} />
      <Card onPress={() => router.push('/questions')}>
        <Row style={{ gap: 12 }}>
          <IconCircle icon="football" tone="success" />
          <View style={{ flex: 1 }}>
            <Txt bold>Questionnaire d’après-match</Txt>
            <Txt muted size={13}>
              Envoyé automatiquement après chaque match · {postMatchCount} question{postMatchCount > 1 ? 's' : ''} du club
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.muted} />
        </Row>
      </Card>
      <Card>
        <Row style={{ gap: 12 }}>
          <IconCircle icon="fitness" tone="info" />
          <View style={{ flex: 1 }}>
            <Txt bold>Ressenti d’entraînement</Txt>
            <Txt muted size={13}>
              Qualité de la séance, performance perso, intensité : proposé aux présents après chaque séance.
            </Txt>
          </View>
        </Row>
      </Card>
      <Section icon="document-text-outline">Questionnaires ponctuels ({list.length})</Section>
      {list.length === 0 && <Empty icon="document-text-outline" text="Bilan mi-saison, ressenti de la semaine, vie de groupe… Créez vos questionnaires : les joueurs répondent au curseur, vous obtenez des notes chiffrées." />}
      {list.map((s) => {
        const targets = surveyTargets(data, s);
        const n = data.surveyResponses.filter((r) => r.surveyId === s.id && targets.some((p) => p.id === r.playerId)).length;
        return (
          <Card key={s.id} onPress={() => router.push(`/sondage/${s.id}`)} stripe={s.open ? t.primary : t.border}>
            <Row>
              <Txt bold size={16}>
                {s.title}
              </Txt>
              <View style={{ flex: 1 }} />
              <Badge text={s.open ? 'Ouvert' : 'Fermé'} tone={s.open ? 'success' : 'neutral'} />
            </Row>
            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
              <Badge text={`${s.questions.length} questions`} icon="list" />
              <Badge text={s.target === 'all' ? 'Tous' : `${targets.length} joueurs`} icon="people" />
              {s.dueDate ? <Badge text={`Avant le ${formatDate(s.dueDate)}`} icon="calendar-outline" tone="warning" /> : null}
            </Row>
            <Row style={{ gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Progress value={targets.length ? n / targets.length : 0} height={6} />
              </View>
              <Txt muted size={12}>
                {n}/{targets.length} réponses
              </Txt>
            </Row>
          </Card>
        );
      })}
    </>
  );
}
