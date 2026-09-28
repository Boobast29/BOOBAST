import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Locked } from '@/components/Locked';
import { SliderScale } from '@/components/Slider';
import { Button, Card, Chips, Field, Screen } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { OBJECTIVE_CATEGORIES } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { isValidDate, playerName } from '@/lib/stats';
import type { ObjectiveStatus } from '@/lib/types';

const STATUSES: ObjectiveStatus[] = ['en cours', 'acquis', 'abandonné'];

export default function EditObjective() {
  const params = useLocalSearchParams<{ id?: string; playerId?: string }>();
  const { data, session, saveObjective, deleteObjective } = useStore();
  const existing = data.objectives.find((o) => o.id === params.id);
  const [playerId, setPlayerId] = useState(existing?.playerId ?? params.playerId);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState(existing?.category);
  const [details, setDetails] = useState(existing?.details ?? '');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [status, setStatus] = useState<ObjectiveStatus>(existing?.status ?? 'en cours');
  const [coachProgress, setCoachProgress] = useState(existing?.coachProgress);

  if (session?.role !== 'coach') return <Locked />;
  const players = data.players.filter((p) => !p.archived || p.id === playerId);

  const save = () => {
    if (!playerId) return notify('Choisissez un joueur');
    if (!title.trim()) return notify('Écrivez le point à travailler');
    if (dueDate && !isValidDate(dueDate)) return notify('Date invalide', 'Format attendu : AAAA-MM-JJ');
    const o = saveObjective({
      ...existing,
      playerId,
      title: title.trim(),
      category,
      details: details.trim() || undefined,
      dueDate: dueDate || undefined,
      status,
      coachProgress,
      coachNotes: existing?.coachNotes ?? [],
    });
    if (existing) router.back();
    else router.replace(`/objectif/${o.id}`);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Modifier le point' : 'Nouveau point à travailler' }} />
      <Card>
        {existing || params.playerId ? null : (
          <Chips label="Joueur" options={players.map((p) => p.id)} value={playerId} onChange={setPlayerId} getLabel={(id) => playerName(data.players.find((p) => p.id === id))} />
        )}
        <Field label="Point à travailler" value={title} onChangeText={setTitle} placeholder="Ex. : jeu de tête défensif, communication, pied gauche…" autoFocus={!existing} />
        <Chips label="Catégorie" options={OBJECTIVE_CATEGORIES} value={category} onChange={setCategory} allowEmpty />
        <Field label="Détails / exercices conseillés" value={details} onChangeText={setDetails} multiline placeholder="Ce qu’on attend, comment le travailler…" />
        <Field label="Échéance (optionnel)" value={dueDate} onChangeText={setDueDate} placeholder="AAAA-MM-JJ" />
      </Card>
      {existing && (
        <Card>
          <Chips label="Statut" options={STATUSES} value={status} onChange={(v) => v && setStatus(v)} />
          <SliderScale label="Progression (évaluation du coach)" value={coachProgress} onChange={setCoachProgress} min={0} max={10} minLabel="Pas commencé" maxLabel="Maîtrisé" showValue />
        </Card>
      )}
      <Button title="Enregistrer" icon="checkmark" onPress={save} />
      {existing && (
        <Button
          title="Supprimer"
          kind="danger"
          icon="trash-outline"
          onPress={() =>
            confirm('Supprimer ce point ?', '', () => {
              deleteObjective(existing.id);
              router.dismissTo('/suivi');
            })
          }
        />
      )}
    </Screen>
  );
}
