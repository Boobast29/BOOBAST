import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Locked } from '@/components/Locked';
import { SliderScale } from '@/components/Slider';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Empty, Field, HeaderButton, Progress, Row, Screen, Section, Title, Txt } from '@/components/ui';
import { notify } from '@/lib/confirm';
import { OBJECTIVE_STATUS_TONE } from '@/lib/constants';
import { newId, useStore } from '@/lib/store';
import { formatDate, initials, playerName, today } from '@/lib/stats';

export default function ObjectiveDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, session, saveObjective } = useStore();
  const coach = session?.role === 'coach';
  const o = data.objectives.find((x) => x.id === id);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(o?.playerProgress);
  const [comment, setComment] = useState(o?.playerComment ?? '');

  if (!o) return <Empty text="Point introuvable." />;
  if (!coach && (session?.role !== 'player' || session.playerId !== o.playerId)) return <Locked />;
  const player = data.players.find((p) => p.id === o.playerId);
  const edit = () => router.push({ pathname: '/objectif/edit', params: { id: o.id } });

  return (
    <Screen>
      <Stack.Screen options={{ title: '', headerRight: coach ? () => <HeaderButton icon="create-outline" label="Modifier" onPress={edit} /> : undefined }} />
      <Card>
        {player && (
          <Row style={{ gap: 10 }}>
            <Avatar size={40} colorKey={player.id} photo={player.photoUri} label={initials(player)} />
            <Txt bold>{playerName(player)}</Txt>
          </Row>
        )}
        <Title>{o.title}</Title>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <Badge text={o.status} tone={OBJECTIVE_STATUS_TONE[o.status]} />
          {o.category ? <Badge text={o.category} tone="violet" icon="pricetag" /> : null}
          {o.dueDate ? <Badge text={`Échéance ${formatDate(o.dueDate)}`} icon="calendar-outline" tone={o.dueDate < today() && o.status === 'en cours' ? 'danger' : 'neutral'} /> : null}
        </Row>
        {o.details ? <Txt>{o.details}</Txt> : null}
      </Card>

      <Section icon="speedometer-outline">Progression</Section>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt size={14}>Selon le coach</Txt>
          <Txt bold>{o.coachProgress != null ? `${o.coachProgress}/10` : '–'}</Txt>
        </Row>
        <Progress value={(o.coachProgress ?? 0) / 10} />
        {coach && (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt size={14}>Selon le joueur</Txt>
              <Txt bold>{o.playerProgress != null ? `${o.playerProgress}/10` : 'pas encore évalué'}</Txt>
            </Row>
            <Progress value={(o.playerProgress ?? 0) / 10} color={t.info} />
            {o.playerComment ? (
              <Txt muted size={13}>
                « {o.playerComment} »
              </Txt>
            ) : null}
          </>
        )}
      </Card>

      {!coach && (
        <>
          <Section icon="person-outline">Où tu en es</Section>
          <Card>
            <SliderScale label="Ma progression sur ce point" value={progress} onChange={setProgress} min={0} max={10} minLabel="Pas commencé" maxLabel="Maîtrisé" />
            <Field label="Mon commentaire" value={comment} onChangeText={setComment} multiline placeholder="Ce que je fais pour progresser, mes difficultés…" />
            <Button
              title="Enregistrer"
              icon="checkmark"
              onPress={() => {
                saveObjective({ ...o, playerProgress: progress, playerComment: comment.trim() || undefined });
                notify('Enregistré', 'Le coach verra ta progression.');
              }}
            />
          </Card>
        </>
      )}

      <Section icon="chatbubble-ellipses-outline">Suivi du coach ({o.coachNotes.length})</Section>
      {o.coachNotes.length === 0 && <Txt muted size={14}>Pas encore de note.</Txt>}
      {[...o.coachNotes].reverse().map((n) => (
        <Card key={n.id} style={{ paddingVertical: 12 }}>
          <Row>
            <Ionicons name="time-outline" size={14} color={t.muted} />
            <Txt muted size={12}>
              {formatDate(n.date)}
            </Txt>
          </Row>
          <Txt>{n.text}</Txt>
        </Card>
      ))}
      {coach && (
        <Card>
          <Field label="Ajouter une note de suivi" value={note} onChangeText={setNote} multiline placeholder="Observé à l’entraînement, progrès, conseils…" />
          <Button
            small
            icon="add"
            title="Ajouter la note"
            disabled={!note.trim()}
            onPress={() => {
              saveObjective({ ...o, coachNotes: [...o.coachNotes, { id: newId(), date: today(), text: note.trim() }] });
              setNote('');
            }}
          />
        </Card>
      )}
      {coach && <View style={{ height: 4 }} />}
    </Screen>
  );
}
