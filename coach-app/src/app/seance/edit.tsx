import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Chips, Field, Scale, Screen, Stepper } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { TRAINING_THEMES } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { activeInjury, isValidDate, today } from '@/lib/stats';
import type { Attendance } from '@/lib/types';

export default function EditSession() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveSession, deleteSession } = useStore();
  const existing = data.sessions.find((x) => x.id === id);

  const [date, setDate] = useState(existing?.date ?? today());
  const [time, setTime] = useState(existing?.time ?? '19:00');
  const [durationMin, setDuration] = useState(existing?.durationMin ?? 90);
  const [theme, setTheme] = useState(existing?.theme);
  const [rpe, setRpe] = useState(existing?.rpe);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const save = () => {
    if (!isValidDate(date)) return notify('Date invalide', 'Format attendu : AAAA-MM-JJ');
    if (time && !/^\d{1,2}:\d{2}$/.test(time)) return notify('Heure invalide', 'Format attendu : 19:00');
    // Nouvelle séance : tout le monde présent par défaut, les blessés marqués « blessé »
    const attendance: Record<string, Attendance> =
      existing?.attendance ??
      Object.fromEntries(data.players.filter((p) => !p.archived).map((p) => [p.id, activeInjury(data, p.id)?.status === 'active' ? 'blesse' : 'present']));
    const s = saveSession({
      ...existing,
      date,
      time: time || undefined,
      durationMin,
      theme,
      rpe,
      notes: notes.trim() || undefined,
      attendance,
      playerRpe: existing?.playerRpe ?? {},
    });
    if (existing) router.back();
    else router.replace(`/seance/${s.id}`);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Modifier la séance' : 'Nouvelle séance' }} />
      <Card>
        <Field label="Date" value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
        <Field label="Heure" value={time} onChangeText={setTime} placeholder="19:00" keyboardType="numbers-and-punctuation" />
        <Stepper label="Durée (min)" icon="time-outline" value={durationMin} onChange={setDuration} step={15} min={15} max={240} />
        <Chips label="Thème" options={TRAINING_THEMES} value={theme} onChange={setTheme} allowEmpty />
      </Card>
      <Card>
        <Scale label="Intensité prévue (RPE de la séance)" hint="Appliquée aux présents sans RPE individuel · 0 = repos · 10 = maximal" value={rpe} onChange={setRpe} min={0} max={10} invertColors />
        <Field label="Contenu / notes" value={notes} onChangeText={setNotes} multiline placeholder="Échauffement, exercices, jeu…" />
      </Card>
      <Button title={existing ? 'Enregistrer' : 'Créer et faire l’appel'} icon="checkmark" onPress={save} />
      {existing && (
        <Button
          title="Supprimer la séance"
          kind="danger"
          icon="trash-outline"
          onPress={() =>
            confirm('Supprimer cette séance ?', 'Les présences seront perdues.', () => {
              deleteSession(existing.id);
              router.dismissTo('/matchs');
            })
          }
        />
      )}
    </Screen>
  );
}
