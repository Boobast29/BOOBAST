import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Locked } from '@/components/Locked';
import { QuestionInput } from '@/components/QuestionInput';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Chips, Empty, Field, Progress, Row, Scale, Screen, Section, Stepper, Toggle, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { BODY_ZONES, PLAYER_COMMENT_LABEL, SECTION_DESCRIPTIONS, SELF_RATING_LABEL, STAT_FIELDS, statsForPosition, WELLNESS_FIELDS } from '@/lib/constants';
import type { WellnessKey } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { initials, matchLabel, playerName } from '@/lib/stats';
import type { Answer, Stats } from '@/lib/types';

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
  const { data, session, saveReport, deleteReport } = useStore();
  const coach = session?.role === 'coach';
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
  const [answers, setAnswers] = useState<Record<string, Answer>>(existing?.answers ?? {});
  const [allStats, setAllStats] = useState(false);

  if (!coach && session?.playerId !== playerId) return <Locked text="Tu ne peux remplir que ton propre questionnaire." />;
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
      answers,
    });

  // Stats du poste + stats déjà saisies hors poste
  const posFields = statsForPosition(player.position);
  const statFields = allStats ? STAT_FIELDS : STAT_FIELDS.filter((f) => posFields.includes(f) || (stats[f.key] ?? 0) > 0);

  // Questions actives + questions désactivées auxquelles ce joueur a déjà répondu
  const customQuestions = data.questions.filter((q) => q.active || answers[q.id] !== undefined);

  // Questions obligatoires (*) : bloquant pour le joueur, simple avertissement pour le coach
  const trySave = (go: () => void) => {
    const missing = [
      ...customQuestions.filter((q) => q.required && answers[q.id] === undefined).map((q) => q.label),
      ...(selfRating == null ? [SELF_RATING_LABEL] : []),
    ];
    if (!missing.length) return go();
    const list = missing.map((m) => `• ${m}`).join('\n');
    if (coach) confirm('Questions obligatoires sans réponse', `${list}\n\nEnregistrer quand même ?`, go, 'Enregistrer');
    else notify('Il manque des réponses', list);
  };

  // Joueur suivant sans questionnaire pour ce match
  const done = new Set(data.reports.filter((r) => r.matchId === match.id).map((r) => r.playerId));
  const activeCount = data.players.filter((p) => !p.archived).length;
  const next = data.players.filter((p) => !p.archived && p.id !== player.id && !done.has(p.id)).sort((a, b) => (a.number ?? 999) - (b.number ?? 999))[0];

  return (
    <Screen>
      <Stack.Screen options={{ title: playerName(player) }} />
      <Card>
        <Row style={{ gap: 12 }}>
          <Avatar label={initials(player)} colorKey={player.id} size={52} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt bold size={18}>
              {playerName(player)}
            </Txt>
            <Txt muted size={13}>
              {matchLabel(match)}
            </Txt>
          </View>
          {existing ? <Badge text="Rempli" tone="success" icon="checkmark" /> : null}
        </Row>
        {coach && (
          <View style={{ gap: 4 }}>
            <Progress value={activeCount ? done.size / activeCount : 0} height={6} />
            <Txt muted size={12}>
              {done.size}/{activeCount} questionnaires remplis pour ce match
            </Txt>
          </View>
        )}
      </Card>

      <Section icon="time-outline">Temps de jeu</Section>
      <Card>
        <Stepper label="Minutes jouées" icon="stopwatch-outline" value={minutes} onChange={setMinutes} step={5} max={130} />
        {minutes > 0 && <Toggle label="Titulaire" icon="shirt-outline" value={starter} onChange={setStarter} />}
      </Card>

      <Section icon="chatbubbles-outline">Questionnaire du club</Section>
      <Card>
        {customQuestions.map((q, i) => (
          <View key={q.id} style={{ gap: 12 }}>
            {q.section && q.section !== customQuestions[i - 1]?.section ? <SectionBanner title={q.section} /> : null}
            <QuestionInput
              q={q}
              value={answers[q.id]}
              onChange={(v) =>
                setAnswers((a) => {
                  const next = { ...a };
                  if (v === undefined) delete next[q.id];
                  else next[q.id] = v;
                  return next;
                })
              }
            />
          </View>
        ))}
        {customQuestions.some((q) => q.section) && !customQuestions.some((q) => q.section === 'Toi') ? <SectionBanner title="Toi" /> : null}
        <Scale label={`${SELF_RATING_LABEL} *`} hint="1 = Très mauvaise · 10 = Exceptionnel" value={selfRating} onChange={setSelfRating} min={1} max={10} />
        <Field label={PLAYER_COMMENT_LABEL} value={playerComment} onChangeText={setPlayerComment} multiline placeholder="Votre réponse" />
      </Card>

      {minutes > 0 && (
        <>
          <Section icon="stats-chart-outline">Statistiques</Section>
          <Card>
            {player.position ? <Badge text={`Stats ${player.position.toLowerCase()}`} tone="success" icon="shirt-outline" /> : null}
            {statFields.map((f) => (
              <Stepper
                key={f.key}
                icon={f.icon}
                label={f.label}
                value={stats[f.key] ?? 0}
                onChange={(v) => setStats((s) => ({ ...s, [f.key]: v }))}
                max={f.max ?? 99}
              />
            ))}
            {statFields.length < STAT_FIELDS.length && (
              <Button
                small
                kind="ghost"
                icon={allStats ? 'chevron-up' : 'chevron-down'}
                title={allStats ? 'Stats du poste uniquement' : 'Toutes les stats'}
                onPress={() => setAllStats((v) => !v)}
              />
            )}
          </Card>
        </>
      )}

      <Section icon="flame-outline">Effort du match (RPE)</Section>
      <Card>
        <Scale
          label="Effort perçu (RPE)"
          hint={rpe != null ? `${rpeLabel(rpe)} — charge = ${rpe * minutes} UA` : 'Dureté de la séance/du match, 0 = repos · 10 = maximal'}
          value={rpe}
          onChange={setRpe}
          min={0}
          max={10}
          invertColors
        />
      </Card>

      <Section icon="heart-outline">Bien-être</Section>
      <Card>
        {WELLNESS_FIELDS.map((f) => (
          <Scale
            key={f.key}
            label={f.label}
            hint={f.hint}
            value={wellness[f.key]}
            onChange={(v) => setWellness((w) => ({ ...w, [f.key]: v }))}
            min={1}
            max={5}
          />
        ))}
      </Card>

      <Section icon="bandage-outline">Douleur / blessure</Section>
      <Card>
        <Toggle label="Ressent une douleur ou une gêne" icon="alert-circle-outline" value={pain} onChange={setPain} />
        {pain && (
          <View style={{ gap: 12 }}>
            <Chips label="Zone" options={BODY_ZONES} value={painZone} onChange={setPainZone} allowEmpty />
            <Scale
              label="Intensité de la douleur"
              hint="0 = aucune · 10 = insupportable"
              value={painLevel}
              onChange={setPainLevel}
              min={0}
              max={10}
              invertColors
            />
            {coach ? (
              <Button
                title="Déclarer une blessure"
                kind="secondary"
                onPress={() => {
                  persist();
                  router.push({ pathname: '/blessure/edit', params: { playerId: player.id, matchId: match.id, zone: painZone ?? '' } });
                }}
              />
            ) : (
              <Txt muted size={13}>
                Le coach sera prévenu de ta douleur dès l’enregistrement.
              </Txt>
            )}
          </View>
        )}
      </Card>

      {coach && (
        <>
          <Section icon="star-outline">Évaluation du coach</Section>
          <Card>
            <Scale label="Note du coach" value={coachRating} onChange={setCoachRating} min={1} max={10} />
            <Field label="Commentaire du coach" value={coachComment} onChangeText={setCoachComment} multiline placeholder="Points forts, axes de progrès…" />
          </Card>
        </>
      )}

      <Button
        title="Enregistrer"
        icon="checkmark"
        onPress={() =>
          trySave(() => {
            persist();
            router.back();
          })
        }
      />
      {coach && next && (
        <Button
          title={`Suivant : ${playerName(next)}`}
          icon="arrow-forward"
          kind="secondary"
          onPress={() =>
            trySave(() => {
              persist();
              router.replace({ pathname: '/questionnaire', params: { matchId: match.id, playerId: next.id } });
            })
          }
        />
      )}
      {coach && existing && (
        <Button
          title="Supprimer ce questionnaire"
          icon="trash-outline"
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

/** Titre de rubrique façon Google Forms (bandeau vert + description). */
function SectionBanner({ title }: { title: string }) {
  const t = useTheme();
  const desc = SECTION_DESCRIPTIONS[title];
  return (
    <View style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: t.primarySoft, marginTop: 4 }}>
      <View style={{ backgroundColor: t.primary, height: 5 }} />
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ color: t.primary, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>{title}</Text>
        {desc ? <Text style={{ color: t.text, fontSize: 13, lineHeight: 18 }}>{desc}</Text> : null}
      </View>
    </View>
  );
}
