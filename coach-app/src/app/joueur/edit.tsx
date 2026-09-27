import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Chips, Field, Screen, Toggle } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { POSITIONS } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { isValidDate } from '@/lib/stats';

export default function EditPlayer() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, savePlayer, deletePlayer } = useStore();
  const existing = data.players.find((p) => p.id === id);

  const [firstName, setFirstName] = useState(existing?.firstName ?? '');
  const [lastName, setLastName] = useState(existing?.lastName ?? '');
  const [number, setNumber] = useState(existing?.number != null ? String(existing.number) : '');
  const [position, setPosition] = useState(existing?.position);
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [archived, setArchived] = useState(!!existing?.archived);

  const save = () => {
    if (!firstName.trim() && !lastName.trim()) return notify('Nom manquant', 'Indiquez au moins un prénom ou un nom.');
    if (birthDate && !isValidDate(birthDate)) return notify('Date invalide', 'Format attendu : AAAA-MM-JJ');
    const n = parseInt(number, 10);
    savePlayer({
      ...existing,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      number: isNaN(n) ? undefined : n,
      position,
      birthDate: birthDate || undefined,
      notes: notes.trim() || undefined,
      archived,
    });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Modifier le joueur' : 'Nouveau joueur' }} />
      <Card>
        <Field label="Prénom" value={firstName} onChangeText={setFirstName} autoFocus={!existing} />
        <Field label="Nom" value={lastName} onChangeText={setLastName} />
        <Field label="Numéro" value={number} onChangeText={setNumber} keyboardType="number-pad" />
        <Chips label="Poste" options={POSITIONS} value={position} onChange={setPosition} allowEmpty />
        <Field label="Date de naissance" value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-JJ" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Pied fort, antécédents, contact…" />
        {existing && <Toggle label="Archivé (n'apparaît plus dans l'effectif)" value={archived} onChange={setArchived} />}
      </Card>
      <Button title="Enregistrer" onPress={save} />
      {existing && (
        <Button
          title="Supprimer le joueur"
          kind="danger"
          onPress={() =>
            confirm('Supprimer ce joueur ?', 'Ses questionnaires et blessures seront aussi supprimés. Pour le garder dans l’historique, archivez-le plutôt.', () => {
              deletePlayer(existing.id);
              router.dismissTo('/joueurs');
            })
          }
        />
      )}
    </Screen>
  );
}
