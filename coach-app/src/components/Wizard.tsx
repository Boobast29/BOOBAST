import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from './theme';
import { Button, Card, Row, Screen, Txt } from './ui';

export type WizardStep = {
  key: string;
  /** Nom court (liste des réponses manquantes) */
  label: string;
  /** Rubrique affichée au-dessus (ex. « Analyse du match ») */
  section?: string;
  /** Description de la rubrique (affichée sur la première question de la rubrique) */
  sectionHint?: string;
  required?: boolean;
  answered?: boolean;
  content: ReactNode;
};

/**
 * Questionnaire « une question par écran » pour les joueurs : gros curseur, Précédent / Suivant,
 * barre d'avancement. Une question obligatoire sans réponse bloque le passage à la suivante.
 */
export function Wizard({ header, steps, onFinish, finishLabel = 'Envoyer au coach' }: { header?: ReactNode; steps: WizardStep[]; onFinish: () => void; finishLabel?: string }) {
  const t = useTheme();
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const blocked = !!step.required && !step.answered;
  const missing = steps.filter((s) => s.required && !s.answered);
  const firstOfSection = step.section && steps[i - 1]?.section !== step.section;

  return (
    <Screen>
      {header}
      <View style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: t.muted, fontSize: 13, fontWeight: '600' }}>{step.section ?? ' '}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            {i + 1} / {steps.length}
          </Text>
        </Row>
        {/* Avancement : une case par question, pleine si répondue */}
        <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={`Question ${i + 1} sur ${steps.length}`}>
          {steps.map((s, k) => (
            <View
              key={s.key}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                backgroundColor: k === i ? t.text : s.answered || (!s.required && k < i) ? t.primary : t.border,
              }}
            />
          ))}
        </View>
      </View>

      {firstOfSection && step.sectionHint ? (
        <Txt muted size={14}>
          {step.sectionHint}
        </Txt>
      ) : null}

      <Card style={{ paddingVertical: 22, gap: 16 }}>{step.content}</Card>

      {blocked ? (
        <Row style={{ gap: 6 }}>
          <Ionicons name="information-circle-outline" size={16} color={t.muted} />
          <Txt muted size={13}>
            Réponse obligatoire pour continuer.
          </Txt>
        </Row>
      ) : null}

      <Row style={{ gap: 10 }}>
        {i > 0 && (
          <View style={{ flex: 1 }}>
            <Button kind="secondary" icon="arrow-back" title="Précédent" onPress={() => setI(i - 1)} />
          </View>
        )}
        <View style={{ flex: 2 }}>
          {last ? (
            <Button icon="send" title={finishLabel} disabled={missing.length > 0} onPress={onFinish} />
          ) : (
            <Button icon="arrow-forward" title={step.answered || !step.required ? 'Suivant' : 'Répondre pour continuer'} disabled={blocked} onPress={() => setI(i + 1)} />
          )}
        </View>
      </Row>
      {last && missing.length > 0 ? (
        <Txt muted size={13}>
          Il manque : {missing.map((s) => s.label).join(', ')}.
        </Txt>
      ) : null}
    </Screen>
  );
}
