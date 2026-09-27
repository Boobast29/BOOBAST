import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chips, Empty, Field, Scale, Screen, Section, Stepper, Toggle, Txt } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { BODY_ZONES, STAT_FIELDS, WELLNESS_FIELDS } from '@/lib/constants';
import type { WellnessKey } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { matchLabel, playerName } from '@/lib/stats';
import type { Stats } from '@/lib/types';

const RPE_LABELS: Record<number, string> = {
  0: 'Repos',
  1: 'Très, très facile',
  2: 'Facile',
  3: 'Modéré',
  4: 'Un peu dur',
  5: 'Dur',
  7: 'Très dur',
  9: 'Presque maximal',
  10: 'Maximal',
};
const rpeLabel = (v?: number) => {
  if (v == null) return undefined;
  for (let i = v; i >= 0; i--) if (RPE_LABELS[i]) return RPE_LABELS[i];
};

export default function Questionnaire() {
  const { matchId, playerId } = useLocalSearchParams<{ matchId: string; playerId: string }>();
  const { data, saveReport, deleteReport } = useStore();
  const match = data.matches.find((m) => m.id === matchId);
  const player = data.players.find((p) => p.id === playerId);
  const existing = data.reports.find((r) => r.matchId === matchId && r.playerId === playerId);

  const [starter, setStarter] = useState(existing?.starter ?? true);
  const [minutes, setMinutes] = useState(existing?.minutesPlayed ?? 90);
  const [stats, setStats] = useState<Stats>(existing?.stats ?? {});
  const [rpe, setRpe] = useState(existing?.rpe);
  const [wellness, setWellness] = useState<Partial<Record<WellnessKey, number>>>(
    existing ? Object.fromEntries(WELLNESS_FIELDS.map((f) => [f.key, existing[f.key]])) : {},
  );
  const [selfRating, setSelfRating] = useState(existing?.selfRating);
  const [coachRating, setCoachRating] = useState(existing?.coachRating);
  const [pain, setPain] = useState(existing?.pain ?? false);
  const [painZone, setPainZone] = useState(existing?.painZone);
  const [painLevel, setPainLevel] = useState(existing?.painLevel);
  const [playerComment, setPlayerComment] = useState(existing?.playerComment ?? '');
  const [coachComment, setCoachComment] = useState(existing?.coachComment ?? '');

  if (!match || !player) return <Empty text="Match ou joueur introuvable." />;

  const persist = () =>
    saveReport({
      id: existing?.id,
      matchId: match.id,
      playerId: player.id,
      starter: minutes > 0 && starter,
      minutesPlayed: minutes,
      stats,
      rpe,
      ...wellness,
      selfRating,
      coachRating,
      pain,
      painZone: pain ? painZone : undefined,
      painLevel: pain ? painLevel : undefined,
      playerComment: playerComment.trim() || undefined,
      coachComment: coachComment.trim() || undefined,
    });

  // Joueur suivant sans questionnaire pour ce match
  const done = new Set(data.reports.filter((r) => r.matchId === match.id).map((r) => r.playerId));
  const next = data.players
    .filter((p) => !p.archived && p.id !== player.id && !done.has(p.id))
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))[0];

  return (
    <Screen>
      <Stack.Screen options={{ title: playerName(player) }} />
      <Txt muted>{matchLabel(match)}</Txt>

      <Section>Temps de jeu</Section>
      <Card>
        <Stepper label="Minutes jouées" value={minutes} onChange={setMinutes} step={5} max={130} />
        {minutes > 0 && <Toggle label="Titulaire" value={starter} onChange={setStarter} />}
      </Card>

      {minutes > 0 && (
        <>
          <Section>Statistiques</Section>
          <Card>
            {STAT_FIELDS.map((f) => (
              <Stepper key={f.key} label={f.label} value={stats[f.key] ?? 0} onChange={(v) => setStats((s) => ({ ...s, [f.key]: v }))} max={f.key === 'redCards' ? 1 : f.key === 'yellowCards' ? 2 : 99} />
            ))}
          </Card>
        </>
      )}

      <Section>Ressenti du joueur</Section>
      <Card>
        <Scale
          label="Effort perçu (RPE)"
          hint={rpe != null ? `${rpeLabel(rpe)} — charge = ${rpe * minutes} UA` : "Dureté de la séance/du match, 0 = repos · 10 = maximal"}
          value={rpe}
          onChange={setRpe}
          min={0}
          max={10}
          invertColors
        />
        <Scale label="Auto-évaluation de sa performance" hint="1 = très mauvais match · 10 = match parfait" value={selfRating} onChange={setSelfRating} min={1} max={10} />
      </Card>

      <Section>Bien-être</Section>
      <Card>
        {WELLNESS_FIELDS.map((f) => (
          <Scale key={f.key} label={f.label} hint={f.hint} value={wellness[f.key]} onChange={(v) => setWellness((w) => ({ ...w, [f.key]: v }))} min={1} max={5} />
        ))}
      </Card>

      <Section>Douleur / blessure</Section>
      <Card>
        <Toggle label="Ressent une douleur ou une gêne" value={pain} onChange={setPain} />
        {pain && (
          <View style={{ gap: 12 }}>
            <Chips label="Zone" options={BODY_ZONES} value={painZone} onChange={setPainZone} allowEmpty />
            <Scale label="Intensité de la douleur" hint="0 = aucune · 10 = insupportable" value={painLevel} onChange={setPainLevel} min={0} max={10} invertColors />
            <Button
              title="Déclarer une blessure"
              kind="secondary"
              onPress={() => {
                persist();
                router.push({ pathname: '/blessure/edit', params: { playerId: player.id, matchId: match.id, zone: painZone ?? '' } });
              }}
            />
          </View>
        )}
        <Field label="Commentaire du joueur" value={playerComment} onChangeText={setPlayerComment} multiline placeholder="Ce qu'il a ressenti, ce qui a marché ou pas…" />
      </Card>

      <Section>Évaluation du coach</Section>
      <Card>
        <Scale label="Note du coach" value={coachRating} onChange={setCoachRating} min={1} max={10} />
        <Field label="Commentaire du coach" value={coachComment} onChangeText={setCoachComment} multiline placeholder="Points forts, axes de progrès…" />
      </Card>

      <Button
        title="Enregistrer"
        onPress={() => {
          persist();
          router.back();
        }}
      />
      {next && (
        <Button
          title={`Enregistrer et passer à ${playerName(next)}`}
          kind="secondary"
          onPress={() => {
            persist();
            router.replace({ pathname: '/questionnaire', params: { matchId: match.id, playerId: next.id } });
          }}
        />
      )}
      {existing && (
        <Button
          title="Supprimer ce questionnaire"
          kind="danger"
          onPress={() =>
            confirm('Supprimer le questionnaire ?', 'Cette action est définitive.', () => {
              deleteReport(existing.id);
              router.back();
            })
          }
        />
      )}
    </Screen>
  );
}
