import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Locked } from '@/components/Locked';
import { useTheme } from '@/components/theme';
import { Badge, Button, Card, Chips, Field, MultiChips, Row, Screen, Section, Stepper, Toggle, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { QUESTION_TEMPLATES, QUESTION_TYPE_LABEL } from '@/lib/constants';
import { newId, useStore } from '@/lib/store';
import { isValidDate, playerName } from '@/lib/stats';
import type { CustomQuestion, QuestionType } from '@/lib/types';

const TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[];

/** Modèles de questionnaires prêts à l'emploi. */
const PRESETS: { title: string; description: string; questions: Omit<CustomQuestion, 'id' | 'active'>[] }[] = [
  {
    title: 'Bilan mi-saison',
    description: 'Fais le point sur ta première partie de saison.',
    questions: [
      { label: 'Ta satisfaction sur ta saison', type: 'scale', min: 1, max: 10, minLabel: 'Pas du tout', maxLabel: 'Totalement', required: true },
      { label: 'Ton temps de jeu te convient-il ?', type: 'scale', min: 1, max: 10, minLabel: 'Pas du tout', maxLabel: 'Totalement', required: true },
      { label: 'Ta place dans le groupe', type: 'scale', min: 1, max: 10, minLabel: 'Isolé', maxLabel: 'Pleinement intégré' },
      { label: 'Tes points forts', type: 'multi', options: ['Technique', 'Physique', 'Tactique', 'Mental', 'Leadership', 'Vitesse', 'Jeu aérien'] },
      { label: 'Ce que tu veux améliorer pour la 2e partie', type: 'text', required: true },
      { label: 'Un message pour le staff ?', type: 'text' },
    ],
  },
  {
    title: 'Ressenti de la semaine',
    description: 'Comment tu te sens avant le week-end ?',
    questions: [
      { label: 'Forme physique', type: 'scale', min: 1, max: 10, minLabel: 'Épuisé', maxLabel: 'Au top', required: true },
      { label: 'Moral', type: 'scale', min: 1, max: 10, minLabel: 'Très bas', maxLabel: 'Excellent', required: true },
      { label: 'Qualité du sommeil', type: 'scale', min: 1, max: 10, minLabel: 'Très mauvaise', maxLabel: 'Excellente' },
      { label: 'Charge scolaire / pro', type: 'scale', min: 1, max: 10, minLabel: 'Légère', maxLabel: 'Très lourde' },
      { label: 'As-tu une gêne ou une douleur ?', type: 'yesno', required: true },
    ],
  },
  {
    title: 'Vie de groupe',
    description: 'Ton avis compte pour améliorer l’ambiance et le fonctionnement.',
    questions: [
      { label: 'Ambiance dans le groupe', type: 'scale', min: 1, max: 10, minLabel: 'Mauvaise', maxLabel: 'Excellente', required: true },
      { label: 'Communication avec le staff', type: 'scale', min: 1, max: 10, minLabel: 'Mauvaise', maxLabel: 'Excellente', required: true },
      { label: 'Clarté des consignes', type: 'scale', min: 1, max: 10, minLabel: 'Floues', maxLabel: 'Très claires' },
      { label: 'Qu’est-ce qui pourrait être amélioré ?', type: 'text' },
    ],
  },
];

export default function EditSurvey() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, session, saveSurvey, deleteSurvey } = useStore();
  const existing = data.surveys.find((s) => s.id === id);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [open, setOpen] = useState(existing?.open ?? true);
  const [all, setAll] = useState(existing ? existing.target === 'all' : true);
  const [targets, setTargets] = useState<string[]>(existing && existing.target !== 'all' ? existing.target : []);
  const [questions, setQuestions] = useState<CustomQuestion[]>(existing?.questions ?? []);
  // Nouvelle question
  const [qLabel, setQLabel] = useState('');
  const [qType, setQType] = useState<QuestionType>('scale');
  const [qMin, setQMin] = useState(1);
  const [qMax, setQMax] = useState(10);
  const [qMinLabel, setQMinLabel] = useState('Très mauvais');
  const [qMaxLabel, setQMaxLabel] = useState('Excellent');
  const [qOptions, setQOptions] = useState('');
  const [qRequired, setQRequired] = useState(true);

  if (session?.role !== 'coach') return <Locked />;

  const add = (q: Omit<CustomQuestion, 'id' | 'active'>) => setQuestions((l) => [...l, { ...q, id: newId(), active: true }]);
  const addDraft = () => {
    if (!qLabel.trim()) return notify('Écrivez la question');
    const options = qOptions.split('\n').map((o) => o.trim()).filter(Boolean);
    if ((qType === 'choice' || qType === 'multi') && options.length < 2) return notify('Au moins 2 réponses possibles (une par ligne)');
    if (qType === 'scale' && qMax <= qMin) return notify('Échelle invalide');
    add({
      label: qLabel.trim(),
      type: qType,
      required: qRequired,
      ...(qType === 'scale' ? { min: qMin, max: qMax, minLabel: qMinLabel || undefined, maxLabel: qMaxLabel || undefined } : {}),
      ...(qType === 'choice' || qType === 'multi' ? { options } : {}),
    });
    setQLabel('');
    setQOptions('');
  };
  const move = (i: number, d: -1 | 1) =>
    setQuestions((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const save = () => {
    if (!title.trim()) return notify('Donnez un titre au questionnaire');
    if (!questions.length) return notify('Ajoutez au moins une question');
    if (!all && !targets.length) return notify('Choisissez au moins un joueur');
    if (dueDate && !isValidDate(dueDate)) return notify('Date invalide', 'Format attendu : AAAA-MM-JJ');
    const s = saveSurvey({
      ...existing,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      open,
      target: all ? 'all' : targets,
      questions,
    });
    if (existing) router.back();
    else router.replace(`/sondage/${s.id}`);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Modifier le questionnaire' : 'Nouveau questionnaire' }} />
      {!existing && (
        <>
          <Section icon="sparkles-outline">Partir d’un modèle</Section>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.title}
                onPress={() => {
                  setTitle(p.title);
                  setDescription(p.description);
                  setQuestions(p.questions.map((q) => ({ ...q, id: newId(), active: true })));
                }}
                style={{ width: 170, backgroundColor: t.card, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: t.border }}
              >
                <Ionicons name="document-text" size={22} color={t.primary} />
                <Text style={{ color: t.text, fontWeight: '800' }}>{p.title}</Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>{p.questions.length} questions</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      <Card>
        <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Ex. : Bilan mi-saison" />
        <Field label="Présentation (optionnel)" value={description} onChangeText={setDescription} multiline placeholder="Pourquoi ce questionnaire, comment répondre…" />
        <Field label="À rendre avant le (optionnel)" value={dueDate} onChangeText={setDueDate} placeholder="AAAA-MM-JJ" />
        <Toggle label="Ouvert aux réponses" icon="lock-open-outline" value={open} onChange={setOpen} />
        <Toggle label="Pour tous les joueurs" icon="people-outline" value={all} onChange={setAll} />
        {!all && (
          <MultiChips
            options={data.players.filter((p) => !p.archived).map((p) => p.id)}
            values={targets}
            onChange={setTargets}
            getLabel={(pid) => playerName(data.players.find((p) => p.id === pid))}
          />
        )}
      </Card>

      <Section icon="list-outline">Questions ({questions.length})</Section>
      {questions.map((q, i) => (
        <Card key={q.id} style={{ paddingVertical: 12 }}>
          <Row>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt bold>
                {i + 1}. {q.label}
              </Txt>
              <Row style={{ gap: 6 }}>
                <Badge text={QUESTION_TYPE_LABEL[q.type]} tone="info" />
                {q.type === 'scale' && <Txt muted size={12}>{`${q.min}–${q.max}`}</Txt>}
                {q.required && <Badge text="Obligatoire" tone="danger" />}
              </Row>
            </View>
            <Pressable onPress={() => move(i, -1)} hitSlop={6} accessibilityLabel="Monter">
              <Ionicons name="chevron-up" size={22} color={i === 0 ? t.border : t.primary} />
            </Pressable>
            <Pressable onPress={() => move(i, 1)} hitSlop={6} accessibilityLabel="Descendre">
              <Ionicons name="chevron-down" size={22} color={i === questions.length - 1 ? t.border : t.primary} />
            </Pressable>
            <Pressable onPress={() => setQuestions((l) => l.filter((x) => x.id !== q.id))} hitSlop={6} accessibilityLabel="Supprimer la question">
              <Ionicons name="trash-outline" size={20} color={t.danger} />
            </Pressable>
          </Row>
        </Card>
      ))}

      <Card stripe={t.primary}>
        <Txt bold>Ajouter une question</Txt>
        <Field label="Question" value={qLabel} onChangeText={setQLabel} multiline placeholder="Ex. : Comment évalues-tu ton intégration ?" />
        <Chips label="Type de réponse" options={TYPES} value={qType} getLabel={(x) => (x === 'scale' ? 'Curseur' : QUESTION_TYPE_LABEL[x])} onChange={(v) => v && setQType(v)} />
        {qType === 'scale' && (
          <>
            <Stepper label="Minimum" value={qMin} onChange={setQMin} max={10} />
            <Stepper label="Maximum" value={qMax} onChange={setQMax} min={1} max={10} />
            <Row style={{ gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Libellé gauche" value={qMinLabel} onChangeText={setQMinLabel} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Libellé droite" value={qMaxLabel} onChangeText={setQMaxLabel} />
              </View>
            </Row>
          </>
        )}
        {(qType === 'choice' || qType === 'multi') && (
          <Field label="Réponses possibles (une par ligne)" value={qOptions} onChangeText={setQOptions} multiline placeholder={'Oui\nNon\nPeut-être'} />
        )}
        <Toggle label="Obligatoire" value={qRequired} onChange={setQRequired} />
        <Button small icon="add" title="Ajouter" onPress={addDraft} />
        <Txt muted size={12}>
          Ou piochez une question type :
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {QUESTION_TEMPLATES.filter((q) => !questions.some((x) => x.label === q.label))
            .slice(0, 10)
            .map((q) => (
              <Pressable key={q.label} onPress={() => add(q)} style={{ backgroundColor: t.input, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: t.text, fontSize: 12 }}>+ {q.label}</Text>
              </Pressable>
            ))}
        </View>
      </Card>

      <Button title="Enregistrer" icon="checkmark" onPress={save} />
      {existing && (
        <Button
          title="Supprimer le questionnaire"
          kind="danger"
          icon="trash-outline"
          onPress={() =>
            confirm('Supprimer ce questionnaire ?', 'Toutes les réponses seront supprimées.', () => {
              deleteSurvey(existing.id);
              router.dismissTo('/suivi');
            })
          }
        />
      )}
    </Screen>
  );
}
