import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Chips, Field, Screen, Section, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { BODY_ZONES, INJURY_STATUS_LABEL, INJURY_TYPES } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { byDateDesc, isValidDate, matchLabel, playerName, today } from '@/lib/stats';
import type { Injury, InjurySeverity, InjuryStatus } from '@/lib/types';

const SEVERITIES: InjurySeverity[] = ['légère', 'modérée', 'grave'];
const SIDES: NonNullable<Injury['side']>[] = ['gauche', 'droite', 'les deux'];
const STATUSES = Object.keys(INJURY_STATUS_LABEL) as InjuryStatus[];

export default function EditInjury() {
  const params = useLocalSearchParams<{ id?: string; playerId?: string; matchId?: string; zone?: string }>();
  const { data, saveInjury, deleteInjury } = useStore();
  const existing = data.injuries.find((i) => i.id === params.id);
  const initialMatch = data.matches.find((m) => m.id === (existing?.matchId ?? params.matchId));

  const players = data.players.filter((p) => !p.archived || p.id === existing?.playerId);
  const [playerId, setPlayerId] = useState(existing?.playerId ?? params.playerId);
  const [matchId, setMatchId] = useState(existing?.matchId ?? params.matchId);
  const [date, setDate] = useState(existing?.date ?? initialMatch?.date ?? today());
  const [bodyZone, setBodyZone] = useState(existing?.bodyZone ?? (params.zone || undefined));
  const [type, setType] = useState(existing?.type);
  const [side, setSide] = useState(existing?.side);
  const [severity, setSeverity] = useState<InjurySeverity>(existing?.severity ?? 'légère');
  const [status, setStatus] = useState<InjuryStatus>(existing?.status ?? 'active');
  const [expectedReturn, setExpectedReturn] = useState(existing?.expectedReturn ?? '');
  const [returnDate, setReturnDate] = useState(existing?.returnDate ?? '');
  const [treatment, setTreatment] = useState(existing?.treatment ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const nameOf = (id: string) => playerName(data.players.find((p) => p.id === id));
  const recentMatches = [...data.matches].sort(byDateDesc).slice(0, 6);

  const save = () => {
    if (!playerId) return notify('Choisissez un joueur');
    if (!bodyZone) return notify('Choisissez la zone touchée');
    if (!type) return notify('Choisissez le type de blessure');
    for (const [label, d] of [['Date', date], ['Retour prévu', expectedReturn], ['Retour effectif', returnDate]] as const)
      if (d && !isValidDate(d)) return notify(`${label} invalide`, 'Format attendu : AAAA-MM-JJ');
    saveInjury({
      ...existing,
      playerId,
      matchId,
      date,
      bodyZone,
      type,
      side,
      severity,
      status,
      expectedReturn: expectedReturn || undefined,
      returnDate: status === 'guérie' ? returnDate || today() : returnDate || undefined,
      treatment: treatment.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Modifier la blessure' : 'Nouvelle blessure' }} />
      <Card>
        {params.playerId || existing ? (
          <Txt bold size={17}>{nameOf(playerId!)}</Txt>
        ) : (
          <Chips label="Joueur" options={players.map((p) => p.id)} value={playerId} onChange={setPlayerId} getLabel={nameOf} />
        )}
        <Field label="Date de la blessure" value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
        {recentMatches.length > 0 && (
          <Chips
            label="Survenue pendant le match (optionnel)"
            options={recentMatches.map((m) => m.id)}
            value={matchId}
            getLabel={(id) => matchLabel(data.matches.find((m) => m.id === id))}
            onChange={(id) => {
              setMatchId(id);
              const m = data.matches.find((x) => x.id === id);
              if (m) setDate(m.date);
            }}
            allowEmpty
          />
        )}
      </Card>

      <Section>Diagnostic</Section>
      <Card>
        <Chips label="Zone" options={BODY_ZONES} value={bodyZone} onChange={setBodyZone} />
        <Chips label="Côté" options={SIDES} value={side} onChange={setSide} allowEmpty />
        <Chips label="Type" options={INJURY_TYPES} value={type} onChange={setType} />
        <Chips label="Gravité" options={SEVERITIES} value={severity} onChange={(v) => v && setSeverity(v)} />
      </Card>

      <Section>Suivi</Section>
      <Card>
        <Chips
          label="Statut"
          options={STATUSES}
          value={status}
          getLabel={(s) => INJURY_STATUS_LABEL[s]}
          onChange={(s) => {
            if (!s) return;
            setStatus(s);
            if (s === 'guérie' && !returnDate) setReturnDate(today());
          }}
        />
        <Field label="Retour prévu" value={expectedReturn} onChangeText={setExpectedReturn} placeholder="AAAA-MM-JJ" />
        {status === 'guérie' && <Field label="Retour effectif" value={returnDate} onChangeText={setReturnDate} placeholder="AAAA-MM-JJ" />}
        <Field label="Traitement / soins" value={treatment} onChangeText={setTreatment} multiline placeholder="Kiné, glace, repos, examens…" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      </Card>

      <Button title="Enregistrer" onPress={save} />
      {existing && (
        <Button
          title="Supprimer la blessure"
          kind="danger"
          onPress={() =>
            confirm('Supprimer cette blessure ?', 'Cette action est définitive.', () => {
              deleteInjury(existing.id);
              router.back();
            })
          }
        />
      )}
    </Screen>
  );
}
