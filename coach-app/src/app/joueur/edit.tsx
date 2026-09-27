import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Badge, Button, Card, Chips, Field, Row, Screen, Section, Toggle, Txt } from '@/components/ui';
import { hashPin, PIN_LENGTH } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { POSITIONS } from '@/lib/constants';
import { newId, useStore } from '@/lib/store';
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
  const [pin, setPin] = useState('');
  const [removePin, setRemovePin] = useState(false);

  const save = async () => {
    if (!firstName.trim() && !lastName.trim()) return notify('Nom manquant', 'Indiquez au moins un prénom ou un nom.');
    if (birthDate && !isValidDate(birthDate)) return notify('Date invalide', 'Format attendu : AAAA-MM-JJ');
    if (pin && !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return notify('Code invalide', `Le code joueur doit faire ${PIN_LENGTH} chiffres.`);
    const n = parseInt(number, 10);
    const playerId = existing?.id ?? newId();
    const pinHash = pin ? await hashPin(pin, playerId) : removePin ? undefined : existing?.pinHash;
    savePlayer({
      ...existing,
      id: playerId,
      pinHash,
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

      <Section icon="lock-closed-outline">Accès joueur</Section>
      <Card>
        <Row>
          <Txt bold>Code personnel</Txt>
          {existing?.pinHash && !removePin ? <Badge text="Défini" tone="success" icon="lock-closed" /> : <Badge text="Aucun code" icon="lock-open" />}
        </Row>
        <Txt muted size={13}>
          Avec un code, seul ce joueur peut ouvrir son espace (ses questionnaires, sa compo, ses vidéos). Sans code, il suffit de choisir son nom.
        </Txt>
        <Field
          label={existing?.pinHash ? 'Nouveau code (4 chiffres)' : 'Code (4 chiffres)'}
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, PIN_LENGTH))}
          keyboardType="number-pad"
          secureTextEntry
          placeholder="••••"
          maxLength={PIN_LENGTH}
        />
        <Button small kind="ghost" icon="dice-outline" title="Générer un code" onPress={() => { const c = String(Math.floor(1000 + Math.random() * 9000)); setPin(c); notify('Code généré', `Code de ${firstName || 'ce joueur'} : ${c}\n\nNotez-le et transmettez-le au joueur : il ne sera plus affiché après l’enregistrement.`); }} />
        {existing?.pinHash && !pin && (
          <Toggle label="Supprimer le code" value={removePin} onChange={setRemovePin} />
        )}
      </Card>
      <Button title="Enregistrer" icon="checkmark" onPress={save} />
      {existing && (
        <Button
          title="Supprimer le joueur"
          kind="danger"
          icon="trash-outline"
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
