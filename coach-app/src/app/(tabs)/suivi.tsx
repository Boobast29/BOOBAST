import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { useDispatchWriter } from '@/components/SendPanel';
import { Avatar, Badge, Button, Card, Chips, Empty, List, ListRow, Progress, Row, Screen, Section, SmallButton, Txt } from '@/components/ui';
import { OBJECTIVE_STATUS_TONE } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { formatDate, initials, playerName, today } from '@/lib/stats';
import { allRequests, awaiting, coachRoute, KIND_LABEL, newDispatch, remind, surveyRequest, toSend } from '@/lib/requests';
import type { Request } from '@/lib/requests';
import type { ObjectiveStatus } from '@/lib/types';

type View_ = 'objectifs' | 'questionnaires';

export default function Suivi() {
  const t = useTheme();
  const [view, setView] = useState<View_>('questionnaires');
  return (
    <Screen>
      <View style={{ flexDirection: 'row', backgroundColor: t.input, borderRadius: 14, padding: 4 }}>
        {(
          [
            ['questionnaires', 'Questionnaires', 'document-text'],
            ['objectifs', 'Points à travailler', 'fitness'],
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
  const write = useDispatchWriter();
  const pendingSend = toSend(data);
  const waiting = awaiting(data);
  const drafts = data.surveys.filter((s) => !s.dispatch).map((s) => surveyRequest(data, s));
  const done = allRequests(data)
    .filter((r) => r.dispatch && !waiting.some((w) => w.kind === r.kind && w.id === r.id))
    .slice(0, 12);
  const postMatchCount = data.questions.filter((q) => q.active).length;

  const rows = (list: Request[], right: (r: Request) => ReactNode) => (
    <List>
      {list.map((r, i) => (
        <ListRow
          key={`${r.kind}:${r.id}`}
          first={i === 0}
          title={r.kind === 'sondage' ? r.title : r.subtitle}
          subtitle={`${KIND_LABEL[r.kind]}${r.dispatch ? ` · ${r.answered.size >= r.recipients.length ? 'complet' : `${r.recipients.filter((p) => r.answered.has(p.id)).length}/${r.recipients.length} réponses`}` : ` · ${r.recipients.length} joueurs`}`}
          right={right(r)}
          chevron={false}
          onPress={() => router.push(coachRoute(r) as never)}
        />
      ))}
    </List>
  );

  return (
    <>
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Nouveau questionnaire" icon="add" onPress={() => router.push('/sondage/edit')} />
        </View>
      </Row>

      {pendingSend.length > 0 && (
        <>
          <Section>À envoyer</Section>
          <Txt muted size={13}>
            Matchs joués et séances passées : les joueurs ne reçoivent rien tant que vous n’avez pas envoyé.
          </Txt>
          {rows(pendingSend, (r) => (
            <SmallButton label="Envoyer" icon="paper-plane" onPress={() => write(r, newDispatch(r.recipients.length === data.players.filter((p) => !p.archived).length ? 'all' : r.recipients.map((p) => p.id)))} />
          ))}
        </>
      )}

      {waiting.length > 0 && (
        <>
          <Section>En attente de réponses</Section>
          {rows(waiting, (r) => (
            <SmallButton label="Relancer" icon="notifications-outline" kind="secondary" onPress={() => r.dispatch && write(r, remind(r.dispatch))} />
          ))}
        </>
      )}

      {drafts.length > 0 && (
        <>
          <Section>Brouillons</Section>
          {rows(drafts, () => (
            <Text style={{ color: t.muted, fontSize: 13 }}>Non envoyé</Text>
          ))}
        </>
      )}

      {pendingSend.length + waiting.length + drafts.length === 0 && (
        <Empty icon="checkmark-done-outline" text="Rien en attente. Après un match ou une séance, envoyez le questionnaire depuis sa fiche ou d’ici." />
      )}

      <Section>Modèles</Section>
      <List>
        <ListRow
          first
          title="Questions d’après-match"
          subtitle={`${postMatchCount} question${postMatchCount > 1 ? 's' : ''} · envoyées avec chaque questionnaire de match`}
          onPress={() => router.push('/questions')}
        />
        <ListRow title="Ressenti d’entraînement" subtitle="Qualité de la séance, performance perso, intensité" chevron={false} />
      </List>

      {done.length > 0 && (
        <>
          <Section>Historique</Section>
          {rows(done, (r) => (
            <Text style={{ color: t.muted, fontSize: 13 }}>{formatDate(r.date)}</Text>
          ))}
        </>
      )}
    </>
  );
}
