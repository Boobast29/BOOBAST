import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { QuestionInput } from '@/components/QuestionInput';
import { Button, Card, Chips, Field, Screen, Section, Stepper, Toggle } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { QUESTION_TYPE_LABEL } from '@/lib/constants';
import { useStore } from '@/lib/store';
import type { Answer, CustomQuestion, QuestionType } from '@/lib/types';

const TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[];

export default function EditQuestion() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveQuestion, deleteQuestion } = useStore();
  const existing = data.questions.find((q) => q.id === id);

  const [label, setLabel] = useState(existing?.label ?? '');
  const [help, setHelp] = useState(existing?.help ?? '');
  const [type, setType] = useState<QuestionType>(existing?.type ?? 'scale');
  const [min, setMin] = useState(existing?.min ?? 1);
  const [max, setMax] = useState(existing?.max ?? 5);
  const [minLabel, setMinLabel] = useState(existing?.minLabel ?? '');
  const [maxLabel, setMaxLabel] = useState(existing?.maxLabel ?? '');
  const [options, setOptions] = useState((existing?.options ?? []).join('\n'));
  const [active, setActive] = useState(existing?.active ?? true);
  const [preview, setPreview] = useState<Answer>();

  const optionList = options
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean);
  const hasOptions = type === 'choice' || type === 'multi';

  const draft: CustomQuestion = {
    id: existing?.id ?? 'apercu',
    label: label.trim() || 'Votre question',
    help: help.trim() || undefined,
    type,
    ...(type === 'scale' ? { min, max, minLabel: minLabel.trim() || undefined, maxLabel: maxLabel.trim() || undefined } : {}),
    ...(hasOptions ? { options: optionList } : {}),
    active,
  };

  const save = () => {
    if (!label.trim()) return notify('Question vide', 'Écrivez l’intitulé de la question.');
    if (type === 'scale' && max <= min) return notify('Échelle invalide', 'Le maximum doit être supérieur au minimum.');
    if (hasOptions && optionList.length < 2) return notify('Réponses manquantes', 'Indiquez au moins 2 réponses possibles (une par ligne).');
    saveQuestion({ ...draft, id: existing?.id, label: label.trim() });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Modifier la question' : 'Nouvelle question' }} />
      <Card>
        <Field label="Question" value={label} onChangeText={setLabel} placeholder="Ex. : Comment as-tu vécu le match ?" autoFocus={!existing} multiline />
        <Field label="Aide (optionnel)" value={help} onChangeText={setHelp} placeholder="Précision affichée sous la question" />
        <Chips label="Type de réponse" options={TYPES} value={type} getLabel={(t) => QUESTION_TYPE_LABEL[t]} onChange={(t) => { if (t) { setType(t); setPreview(undefined); } }} />
      </Card>

      {type === 'scale' && (
        <Card>
          <Stepper label="Minimum" value={min} onChange={setMin} max={10} />
          <Stepper label="Maximum" value={max} onChange={setMax} min={1} max={10} />
          <Field label={`Libellé du ${min}`} value={minLabel} onChangeText={setMinLabel} placeholder="Ex. : Pas du tout" />
          <Field label={`Libellé du ${max}`} value={maxLabel} onChangeText={setMaxLabel} placeholder="Ex. : Totalement" />
        </Card>
      )}
      {hasOptions && (
        <Card>
          <Field label="Réponses possibles (une par ligne)" value={options} onChangeText={setOptions} multiline placeholder={'Oui, à 100 %\nOui, mais fatigué\nNon'} />
        </Card>
      )}

      <Card>
        <Toggle label="Poser cette question" value={active} onChange={setActive} />
      </Card>

      <Section>Aperçu</Section>
      <Card>
        <QuestionInput q={draft} value={preview} onChange={setPreview} />
      </Card>

      <Button title="Enregistrer" onPress={save} />
      {existing && (
        <Button
          title="Supprimer la question"
          kind="danger"
          onPress={() =>
            confirm('Supprimer cette question ?', 'Les réponses déjà données restent dans les questionnaires mais ne seront plus affichées. Pour la garder, désactivez-la plutôt.', () => {
              deleteQuestion(existing.id);
              router.back();
            })
          }
        />
      )}
    </Screen>
  );
}
