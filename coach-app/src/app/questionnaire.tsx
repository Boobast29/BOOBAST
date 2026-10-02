import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Locked } from '@/components/Locked';
import { QuestionInput } from '@/components/QuestionInput';
import { SliderScale } from '@/components/Slider';
import { useTheme } from '@/components/theme';
import { Wizard } from '@/components/Wizard';
import type { WizardStep } from '@/components/Wizard';
import { Avatar, Badge, Button, Card, Chips, Empty, Field, Progress, Row, Scale, Screen, Section, Stepper, Toggle, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { BODY_ZONES, PLAYER_COMMENT_LABEL, SECTION_DESCRIPTIONS, SELF_RATING_LABEL, STAT_FIELDS, statsForPosition, WELLNESS_FIELDS } from '@/lib/constants';
import type { WellnessKey } from '@/lib/constants';
import { matchRequest } from '@/lib/requests';
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

  // Joueur suivant sans questionnaire pour ce match (parmi les joueurs concernés)
  const req = matchRequest(data, match);
  const done = req.answered;
  const activeCount = req.recipients.length;
  const next = req.recipients.filter((p) => p.id !== player.id && !done.has(p.id)).sort((a, b) => (a.number ?? 999) - (b.number ?? 999))[0];
  // Avancement du joueur : questions obligatoires (*) + sa note perso
  const requiredTotal = customQuestions.filter((q) => q.required).length + 1;
  const requiredDone = customQuestions.filter((q) => q.required && answers[q.id] !== undefined).length + (selfRating != null ? 1 : 0);

  const setAnswer = (id: string, v: Answer | undefined) =>
    setAnswers((a) => {
      const next = { ...a };
      if (v === undefined) delete next[id];
      else next[id] = v;
      return next;
    });

  // Joueur : une question par écran
  if (!coach) {
    const steps: WizardStep[] = [
      {
        key: 'time',
        label: 'Temps de jeu',
        section: 'Ton match',
        answered: true,
        content: (
          <>
            <Txt bold size={17}>
              Combien de temps as-tu joué ?
            </Txt>
            <Stepper label="Minutes jouées" icon="stopwatch-outline" value={minutes} onChange={setMinutes} step={5} max={130} />
            {minutes > 0 && <Toggle label="Titulaire" icon="shirt-outline" value={starter} onChange={setStarter} />}
          </>
        ),
      },
      ...customQuestions.map((q) => ({
        key: q.id,
        label: q.label,
        section: q.section,
        sectionHint: q.section ? SECTION_DESCRIPTIONS[q.section] : undefined,
        required: q.required,
        answered: answers[q.id] !== undefined,
        content: <QuestionInput q={q} showValue={false} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />,
      })),
      {
        key: 'self',
        label: SELF_RATING_LABEL,
        section: 'Toi',
        required: true,
        answered: selfRating != null,
        content: <SliderScale label={`${SELF_RATING_LABEL} *`} value={selfRating} onChange={setSelfRating} min={1} max={10} />,
      },
      ...(minutes > 0
        ? [
            {
              key: 'stats',
              label: 'Statistiques',
              section: 'Tes stats',
              answered: true,
              content: (
                <>
                  {statFields.map((f) => (
                    <Stepper key={f.key} icon={f.icon} label={f.label} value={stats[f.key] ?? 0} onChange={(v) => setStats((x) => ({ ...x, [f.key]: v }))} max={f.max ?? 99} />
                  ))}
                </>
              ),
            },
          ]
        : []),
      {
        key: 'rpe',
        label: 'Effort du match',
        section: 'Effort',
        answered: rpe != null,
        content: (
          <SliderScale
            label="À quel point le match a été dur ?"
            hint={rpe != null ? rpeLabel(rpe) : undefined}
            value={rpe}
            onChange={setRpe}
            min={0}
            max={10}
            minLabel="Repos"
            maxLabel="Maximal"
            invert
          />
        ),
      },
      {
        key: 'wellness',
        label: 'Bien-être',
        section: 'Bien-être',
        answered: WELLNESS_FIELDS.some((f) => wellness[f.key] != null),
        content: (
          <>
            {WELLNESS_FIELDS.map((f) => (
              <SliderScale
                key={f.key}
                label={f.label}
                value={wellness[f.key]}
                onChange={(v) => setWellness((w) => ({ ...w, [f.key]: v }))}
                min={1}
                max={5}
                minLabel={f.hint.split('·')[0].replace(/^1 = /, '').trim()}
                maxLabel={f.hint.split('·')[1].replace(/^\s*5 = /, '').trim()}
              />
            ))}
          </>
        ),
      },
      {
        key: 'pain',
        label: 'Douleur',
        section: 'Douleur',
        answered: true,
        content: (
          <>
            <Toggle label="J’ai une douleur ou une gêne" icon="alert-circle-outline" value={pain} onChange={setPain} />
            {pain && (
              <>
                <Chips label="Où ?" options={BODY_ZONES} value={painZone} onChange={setPainZone} allowEmpty />
                <SliderScale label="Intensité" value={painLevel} onChange={setPainLevel} min={0} max={10} minLabel="Aucune" maxLabel="Insupportable" invert />
                <Txt muted size={13}>
                  Le coach sera prévenu dès l’envoi.
                </Txt>
              </>
            )}
          </>
        ),
      },
      {
        key: 'comment',
        label: 'Commentaire',
        section: 'Pour finir',
        answered: !!playerComment.trim(),
        content: <Field label={PLAYER_COMMENT_LABEL} value={playerComment} onChangeText={setPlayerComment} multiline placeholder="Facultatif" />,
      },
    ];
    return (
      <>
        <Stack.Screen options={{ title: matchLabel(match) }} />
        <Wizard
          steps={steps}
          finishLabel={existing ? 'Mettre à jour mes réponses' : 'Envoyer au coach'}
          onFinish={() =>
            trySave(() => {
              persist();
              notify('Merci !', 'Tes réponses sont envoyées au coach.');
              router.back();
            })
          }
        />
      </>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: playerName(player) }} />
      <Card>
        <Row style={{ gap: 12 }}>
          <Avatar label={initials(player)} colorKey={player.id} photo={player.photoUri} size={52} />
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
        {coach ? (
          <View style={{ gap: 4 }}>
            <Progress value={activeCount ? done.size / activeCount : 0} height={6} />
            <Txt muted size={12}>
              {done.size}/{activeCount} questionnaires remplis pour ce match
            </Txt>
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <Progress value={requiredDone / requiredTotal} height={6} />
            <Txt muted size={12}>
              {requiredDone === requiredTotal ? 'Tout est rempli, tu peux envoyer.' : `${requiredDone}/${requiredTotal} réponses obligatoires`}
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
              showValue={coach}
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
        <SliderScale label={`${SELF_RATING_LABEL} *`} value={selfRating} onChange={setSelfRating} min={1} max={10} showValue={coach} />
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
        <SliderScale
          label="Effort perçu (RPE)"
          hint={rpe != null ? (coach ? `${rpeLabel(rpe)} — charge = ${rpe * minutes} UA` : rpeLabel(rpe)) : 'À quel point le match a été dur pour toi'}
          value={rpe}
          onChange={setRpe}
          min={0}
          max={10}
          minLabel="Repos"
          maxLabel="Maximal"
          showValue={coach}
          invert
        />
      </Card>

      <Section icon="heart-outline">Bien-être</Section>
      <Card>
        {WELLNESS_FIELDS.map((f) => (
          <SliderScale
            key={f.key}
            label={f.label}
            value={wellness[f.key]}
            onChange={(v) => setWellness((w) => ({ ...w, [f.key]: v }))}
            min={1}
            max={5}
            minLabel={f.hint.split('·')[0].replace(/^1 = /, '').trim()}
            maxLabel={f.hint.split('·')[1].replace(/^\s*5 = /, '').trim()}
            showValue={coach}
          />
        ))}
      </Card>

      <Section icon="bandage-outline">Douleur / blessure</Section>
      <Card>
        <Toggle label="Ressent une douleur ou une gêne" icon="alert-circle-outline" value={pain} onChange={setPain} />
        {pain && (
          <View style={{ gap: 12 }}>
            <Chips label="Zone" options={BODY_ZONES} value={painZone} onChange={setPainZone} allowEmpty />
            <SliderScale
              label="Intensité de la douleur"
              value={painLevel}
              onChange={setPainLevel}
              min={0}
              max={10}
              minLabel="Aucune"
              maxLabel="Insupportable"
              showValue={coach}
              invert
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
