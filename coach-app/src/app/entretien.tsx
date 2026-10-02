import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { Locked } from '@/components/Locked';
import { useTheme } from '@/components/theme';
import { Avatar, Button, Card, Empty, Field, Row, Screen, Section, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { interviewBrief } from '@/lib/insights';
import { useStore } from '@/lib/store';
import { formatDate, initials, isValidDate, playerName, today } from '@/lib/stats';

/**
 * Entretien individuel : l'appli prépare les points à aborder à partir des réponses du joueur,
 * le coach note ce qui se dit et ce qui est décidé. Privé : jamais transmis au joueur.
 */
export default function InterviewScreen() {
  const t = useTheme();
  const { playerId, id } = useLocalSearchParams<{ playerId: string; id?: string }>();
  const { data, session, saveInterview, deleteInterview } = useStore();
  const player = data.players.find((p) => p.id === playerId);
  const existing = id ? data.interviews.find((i) => i.id === id) : undefined;
  const [date, setDate] = useState(existing?.date ?? today());
  const [playerView, setPlayerView] = useState(existing?.playerView ?? '');
  const [positives, setPositives] = useState(existing?.positives ?? '');
  const [issues, setIssues] = useState(existing?.issues ?? '');
  const [decisions, setDecisions] = useState(existing?.decisions ?? '');
  const [followUp, setFollowUp] = useState(existing?.followUp ?? '');

  if (session?.role !== 'coach') return <Locked text="Réservé au coach." />;
  if (!player) return <Empty text="Joueur introuvable." />;
  const brief = interviewBrief(data, player.id);

  const save = () => {
    if (!isValidDate(date)) return notify('Date invalide', 'Format attendu : AAAA-MM-JJ');
    if (followUp && !isValidDate(followUp)) return notify('Date du prochain point invalide', 'Format attendu : AAAA-MM-JJ');
    const clean = (v: string) => v.trim() || undefined;
    saveInterview({
      id: existing?.id,
      createdAt: existing?.createdAt,
      playerId: player.id,
      date,
      playerView: clean(playerView),
      positives: clean(positives),
      issues: clean(issues),
      decisions: clean(decisions),
      followUp: clean(followUp),
    });
    router.back();
  };

  const shareBrief = () =>
    Share.share({ message: `Entretien ${playerName(player)} — ${formatDate(date)}\n\n${brief.map((l) => `• ${l}`).join('\n')}` }).catch(() => {});

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? `Entretien du ${formatDate(existing.date)}` : 'Entretien individuel' }} />
      <Row style={{ gap: 12 }}>
        <Avatar size={48} colorKey={player.id} photo={player.photoUri} label={initials(player)} />
        <View style={{ flex: 1 }}>
          <Txt bold size={18}>
            {playerName(player)}
          </Txt>
          <Txt muted size={13}>
            {[player.position, player.number != null && `n°${player.number}`].filter(Boolean).join(' · ')}
          </Txt>
        </View>
      </Row>

      <Section action={brief.length ? <Button small kind="ghost" icon="share-outline" title="Partager" onPress={shareBrief} /> : undefined}>À aborder</Section>
      <Card>
        {brief.length === 0 ? (
          <Txt muted size={14}>
            Pas encore assez de réponses de ce joueur pour préparer l’entretien.
          </Txt>
        ) : (
          brief.map((l, i) => (
            <Row key={i} style={{ alignItems: 'flex-start', gap: 10 }}>
              <Text style={{ color: t.primary, fontSize: 15, lineHeight: 21, fontWeight: '700' }}>{i + 1}.</Text>
              <Text style={{ color: t.text, fontSize: 15, lineHeight: 21, flex: 1 }}>{l}</Text>
            </Row>
          ))
        )}
        <Row style={{ gap: 6 }}>
          <Ionicons name="lock-closed-outline" size={13} color={t.muted} />
          <Txt muted size={12}>
            Préparé à partir de ses réponses. Le joueur ne voit pas cette fiche.
          </Txt>
        </Row>
      </Card>

      <Section>Notes de l’entretien</Section>
      <Card>
        <Field label="Date" value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
        <Field label="Ce qu’il en dit" value={playerView} onChangeText={setPlayerView} multiline placeholder="Comment il se sent, ce qu’il attend…" />
        <Field label="Ce qui va bien" value={positives} onChangeText={setPositives} multiline placeholder="Attitude, progrès, points forts…" />
        <Field label="Ce qui coince" value={issues} onChangeText={setIssues} multiline placeholder="Temps de jeu, confiance, comportement…" />
        <Field label="Ce qu’on décide" value={decisions} onChangeText={setDecisions} multiline placeholder="Objectif, travail spécifique, rôle…" />
        <Field label="Prochain point" value={followUp} onChangeText={setFollowUp} placeholder="AAAA-MM-JJ (facultatif)" />
      </Card>

      <Button title="Enregistrer l’entretien" icon="checkmark" onPress={save} />
      <Button
        kind="secondary"
        icon="flag-outline"
        title="Créer un point à travailler"
        onPress={() => router.push({ pathname: '/objectif/edit', params: { playerId: player.id } })}
      />
      {existing && (
        <Button
          kind="danger"
          icon="trash-outline"
          title="Supprimer l’entretien"
          onPress={() =>
            confirm('Supprimer cet entretien ?', 'Les notes seront perdues.', () => {
              deleteInterview(existing.id);
              router.back();
            })
          }
        />
      )}
    </Screen>
  );
}
