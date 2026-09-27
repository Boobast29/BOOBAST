import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Chips, Field, Screen, Stepper, Toggle } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { isValidDate, today } from '@/lib/stats';
import { View } from 'react-native';

const COMPETITIONS = ['Championnat', 'Coupe', 'Amical', 'Tournoi'];

export default function EditMatch() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveMatch, deleteMatch } = useStore();
  const existing = data.matches.find((m) => m.id === id);

  const [date, setDate] = useState(existing?.date ?? today());
  const [opponent, setOpponent] = useState(existing?.opponent ?? '');
  const [home, setHome] = useState(existing?.home ?? true);
  const [competition, setCompetition] = useState(existing?.competition);
  const [played, setPlayed] = useState(existing ? existing.scoreFor != null : true);
  const [scoreFor, setScoreFor] = useState(existing?.scoreFor ?? 0);
  const [scoreAgainst, setScoreAgainst] = useState(existing?.scoreAgainst ?? 0);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const save = () => {
    if (!opponent.trim()) return notify('Adversaire manquant');
    if (!isValidDate(date)) return notify('Date invalide', 'Format attendu : AAAA-MM-JJ');
    const m = saveMatch({
      ...existing,
      date,
      opponent: opponent.trim(),
      home,
      competition,
      scoreFor: played ? scoreFor : undefined,
      scoreAgainst: played ? scoreAgainst : undefined,
      notes: notes.trim() || undefined,
    });
    if (existing) router.back();
    else router.replace(`/match/${m.id}`);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Modifier le match' : 'Nouveau match' }} />
      <Card>
        <Field label="Adversaire" value={opponent} onChangeText={setOpponent} autoFocus={!existing} />
        <Field label="Date" value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
        <Chips label="Lieu" options={['Domicile', 'Extérieur'] as const} value={home ? 'Domicile' : 'Extérieur'} onChange={(v) => setHome(v !== 'Extérieur')} />
        <Chips label="Compétition" options={COMPETITIONS} value={competition} onChange={setCompetition} allowEmpty />
      </Card>
      <Card>
        <Toggle label="Match joué (saisir le score)" value={played} onChange={setPlayed} />
        {played && (
          <View style={{ gap: 10 }}>
            <Stepper label="Buts marqués" value={scoreFor} onChange={setScoreFor} max={99} />
            <Stepper label="Buts encaissés" value={scoreAgainst} onChange={setScoreAgainst} max={99} />
          </View>
        )}
        <Field label="Notes du match" value={notes} onChangeText={setNotes} multiline placeholder="Tactique, conditions, faits marquants…" />
      </Card>
      <Button title={existing ? 'Enregistrer' : 'Créer et remplir les questionnaires'} onPress={save} />
      {existing && (
        <Button
          title="Supprimer le match"
          kind="danger"
          onPress={() =>
            confirm('Supprimer ce match ?', 'Tous les questionnaires de ce match seront supprimés.', () => {
              deleteMatch(existing.id);
              router.dismissTo('/matchs');
            })
          }
        />
      )}
    </Screen>
  );
}
