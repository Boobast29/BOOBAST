import { router } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { Badge, Button, Card, Row, Screen, Section, Txt } from '@/components/ui';
import { QEA_QUESTIONS, QUESTION_TEMPLATES, QUESTION_TYPE_LABEL } from '@/lib/constants';
import { ClubLogo } from '@/components/ClubLogo';
import { useStore } from '@/lib/store';

export default function Questions() {
  const t = useTheme();
  const { data, saveQuestion, moveQuestion } = useStore();
  const existingLabels = new Set(data.questions.map((q) => q.label));
  const templates = QUESTION_TEMPLATES.filter((q) => !existingLabels.has(q.label));
  const missingQea = QEA_QUESTIONS.filter((q) => !data.questions.some((x) => x.id === q.id || x.label === q.label));

  const arrow = (label: string, onPress: () => void, disabled: boolean) => (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={{ opacity: disabled ? 0.25 : 1, padding: 4 }} accessibilityLabel={label}>
      <Text style={{ color: t.primary, fontSize: 18 }}>{label === 'Monter' ? '▲' : '▼'}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <Txt muted>
        Ces questions s’ajoutent au questionnaire d’après-match de chaque joueur (comme un Google Forms). Les réponses apparaissent
        dans la fiche joueur et dans l’export CSV.
      </Txt>
      <Button title="+ Créer une question" onPress={() => router.push('/questions/edit')} />

      {missingQea.length > 0 && (
        <Card stripe={t.primary} onPress={() => missingQea.forEach((q) => saveQuestion({ ...q }))}>
          <Row>
            <ClubLogo size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt bold>Questionnaire QEA</Txt>
              <Txt muted size={13}>
                Ajouter les questions du Google Forms du club : {missingQea.map((q) => q.label).join(', ')}
              </Txt>
            </View>
            <Txt color={t.primary} bold size={22}>
              +
            </Txt>
          </Row>
        </Card>
      )}

      <Section>Mes questions ({data.questions.length})</Section>
      {data.questions.length === 0 && <Txt muted>Aucune question perso. Créez-en une ou piochez dans les modèles ci-dessous.</Txt>}
      {data.questions.map((q, i) => (
        <Card key={q.id} onPress={() => router.push({ pathname: '/questions/edit', params: { id: q.id } })}>
          <Row>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt bold>{q.label}</Txt>
              <Row>
                <Badge text={QUESTION_TYPE_LABEL[q.type]} tone="info" />
                {q.type === 'scale' && <Txt muted size={12}>{`${q.min ?? 1} → ${q.max ?? 5}`}</Txt>}
                {q.required && <Badge text="Obligatoire" tone="danger" />}
                {!q.active && <Badge text="Masquée" />}
              </Row>
            </View>
            <View>
              {arrow('Monter', () => moveQuestion(q.id, -1), i === 0)}
              {arrow('Descendre', () => moveQuestion(q.id, 1), i === data.questions.length - 1)}
            </View>
            <Switch value={q.active} onValueChange={(active) => saveQuestion({ ...q, active })} trackColor={{ true: t.primary }} />
          </Row>
        </Card>
      ))}

      {templates.length > 0 && <Section>Modèles (appuyer pour ajouter)</Section>}
      {templates.map((q) => (
        <Card key={q.label} onPress={() => saveQuestion({ ...q, active: true })}>
          <Row>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt>{q.label}</Txt>
              <Badge text={QUESTION_TYPE_LABEL[q.type]} />
            </View>
            <Txt color={t.primary} bold size={22}>
              +
            </Txt>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
