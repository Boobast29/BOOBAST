import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Locked } from '@/components/Locked';
import { SliderScale } from '@/components/Slider';
import { Avatar, Button, Card, Empty, Field, Row, Screen, Txt } from '@/components/ui';
import { notify } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { formatDate, initials, playerName } from '@/lib/stats';

/** Ressenti d'un joueur après un entraînement : qualité, performance perso, intensité. */
export default function TrainingFeedbackScreen() {
  const { sessionId, playerId } = useLocalSearchParams<{ sessionId: string; playerId: string }>();
  const { data, session, saveTrainingFeedback } = useStore();
  const coach = session?.role === 'coach';
  const s = data.sessions.find((x) => x.id === sessionId);
  const player = data.players.find((p) => p.id === playerId);
  const existing = s?.feedback?.[playerId];
  const [quality, setQuality] = useState(existing?.quality);
  const [selfPerf, setSelfPerf] = useState(existing?.selfPerf);
  const [intensity, setIntensity] = useState(existing?.intensity);
  const [comment, setComment] = useState(existing?.comment ?? '');

  if (!coach && (session?.role !== 'player' || session.playerId !== playerId)) return <Locked text="Tu ne peux remplir que ton propre ressenti." />;
  if (!s || !player) return <Empty text="Séance introuvable." />;

  const save = () => {
    if (quality == null || selfPerf == null || intensity == null) return notify('Il manque des réponses', 'Glisse les 3 curseurs.');
    saveTrainingFeedback(s.id, player.id, { quality, selfPerf, intensity, comment: comment.trim() || undefined });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Ressenti de la séance' }} />
      <Card>
        <Row style={{ gap: 12 }}>
          <Avatar size={48} colorKey={player.id} photo={player.photoUri} label={initials(player)} />
          <View style={{ flex: 1 }}>
            <Txt bold size={17}>
              {playerName(player)}
            </Txt>
            <Txt muted size={13}>
              Entraînement du {formatDate(s.date)}
              {s.theme ? ` · ${s.theme}` : ''}
            </Txt>
          </View>
        </Row>
      </Card>
      <Card>
        <SliderScale label="Qualité de l’entraînement *" value={quality} onChange={setQuality} showValue={coach} />
        <SliderScale label="Ta performance à l’entraînement *" value={selfPerf} onChange={setSelfPerf} showValue={coach} />
        <SliderScale
          label="Intensité ressentie *"
          value={intensity}
          onChange={setIntensity}
          minLabel="Très facile"
          maxLabel="Très intense"
          showValue={coach}
          invert
        />
        <Field label="Un commentaire ? (optionnel)" value={comment} onChangeText={setComment} multiline placeholder="Exercices, ambiance, ce que tu as appris…" />
      </Card>
      <Button title="Enregistrer" icon="checkmark" onPress={save} />
    </Screen>
  );
}
