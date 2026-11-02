import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Locked } from '@/components/Locked';
import { SendPanel } from '@/components/SendPanel';
import type { RecipientGroup } from '@/components/SendPanel';
import { QuestionInput } from '@/components/QuestionInput';
import { Wizard } from '@/components/Wizard';
import type { WizardStep } from '@/components/Wizard';
import { useTheme } from '@/components/theme';
import { Badge, Card, Empty, HeaderButton, Progress, Row, Screen, Section, Title, Toggle, Txt } from '@/components/ui';
import { notify } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { avg, fmt, formatAnswer, formatDate, playerName } from '@/lib/stats';
import { surveyRequest } from '@/lib/requests';
import { surveyTargets } from '@/lib/surveys';
import type { Answer, CustomQuestion, SurveyResponse } from '@/lib/types';

export default function SurveyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, session } = useStore();
  const s = data.surveys.find((x) => x.id === id);
  if (!s) return <Empty text="Questionnaire introuvable." />;
  if (session?.role === 'coach') return <SurveyResults surveyId={s.id} />;
  if (session?.role !== 'player' || !s.dispatch || !surveyTargets(data, s).some((p) => p.id === session.playerId)) return <Locked text="Ce questionnaire ne t’est pas destiné." />;
  return <SurveyAnswer surveyId={s.id} playerId={session.playerId} />;
}

function SurveyAnswer({ surveyId, playerId }: { surveyId: string; playerId: string }) {
  const { data, saveSurveyResponse } = useStore();
  const s = data.surveys.find((x) => x.id === surveyId)!;
  const existing = data.surveyResponses.find((r) => r.surveyId === surveyId && r.playerId === playerId);
  const [answers, setAnswers] = useState<Record<string, Answer>>(existing?.answers ?? {});

  const save = () => {
    const missing = s.questions.filter((q) => q.required && answers[q.id] === undefined);
    if (missing.length) return notify('Il manque des réponses', missing.map((q) => `• ${q.label}`).join('\n'));
    saveSurveyResponse({ surveyId, playerId, answers });
    notify('Merci !', 'Tes réponses ont été envoyées au coach.');
    router.back();
  };

  if (!s.open)
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Questionnaire' }} />
        <Empty icon="lock-closed-outline" text="Ce questionnaire est fermé." />
      </Screen>
    );

  const steps: WizardStep[] = s.questions.map((q) => ({
    key: q.id,
    label: q.label,
    section: s.title,
    sectionHint: s.description,
    required: q.required,
    answered: answers[q.id] !== undefined,
    content: (
      <QuestionInput
        q={q}
        showValue={false}
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
    ),
  }));

  return (
    <>
      <Stack.Screen options={{ title: s.title }} />
      <Wizard
        steps={steps}
        finishLabel={existing ? 'Mettre à jour mes réponses' : 'Envoyer au coach'}
        header={s.dueDate ? <Badge text={`À rendre avant le ${formatDate(s.dueDate)}`} icon="calendar-outline" tone="warning" /> : undefined}
        onFinish={save}
      />
    </>
  );
}

function SurveyResults({ surveyId }: { surveyId: string }) {
  const { data, saveSurvey } = useStore();
  const s = data.surveys.find((x) => x.id === surveyId)!;
  const targets = surveyRequest(data, s).recipients;
  const responses = data.surveyResponses.filter((r) => r.surveyId === s.id && targets.some((p) => p.id === r.playerId));
  const name = (pid: string) => playerName(data.players.find((p) => p.id === pid));

  const groups: RecipientGroup[] =
    s.target === 'all'
      ? [{ label: 'Tout l’effectif', to: 'all' }]
      : [
          { label: 'Joueurs choisis', to: s.target },
          { label: 'Tout l’effectif', to: 'all' },
        ];

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Résultats', headerRight: () => <HeaderButton icon="create-outline" label="Modifier" onPress={() => router.push({ pathname: '/sondage/edit', params: { id: s.id } })} /> }} />
      <Card>
        <Title>{s.title}</Title>
        {s.description ? <Txt muted>{s.description}</Txt> : null}
        <Txt muted size={13}>
          {s.questions.length} question{s.questions.length > 1 ? 's' : ''}
          {s.dueDate ? ` · à rendre avant le ${formatDate(s.dueDate)}` : ''}
        </Txt>
        {s.dispatch && <Toggle label="Ouvert aux réponses" value={s.open} onChange={(open) => saveSurvey({ ...s, open })} />}
      </Card>
      <SendPanel request={surveyRequest(data, s)} groups={groups} title="Envoi aux joueurs" />

      {responses.length === 0 ? (
        <Empty icon="hourglass-outline" text="Pas encore de réponse." />
      ) : (
        s.questions.map((q, i) => (
          <View key={q.id} style={{ gap: 8 }}>
            <Section>
              {i + 1}. {q.label}
            </Section>
            <QuestionResult q={q} responses={responses} name={name} />
          </View>
        ))
      )}

      <View style={{ height: 4 }} />
      <Txt muted size={12}>
        <Ionicons name="information-circle-outline" size={12} /> Les curseurs sont convertis en notes chiffrées : les joueurs ne voient pas les chiffres.
      </Txt>
    </Screen>
  );
}

function QuestionResult({ q, responses, name }: { q: CustomQuestion; responses: SurveyResponse[]; name: (id: string) => string }) {
  const t = useTheme();
  const vals = responses.map((r) => ({ pid: r.playerId, v: r.answers[q.id] })).filter((x) => x.v !== undefined);
  if (!vals.length) return <Txt muted size={13}>Aucune réponse.</Txt>;

  if (q.type === 'scale' || q.type === 'number') {
    const nums = vals.map((x) => x.v as number);
    const a = avg(nums) ?? 0;
    const min = q.min ?? 0;
    const max = q.max ?? Math.max(...nums, 1);
    const ratio = (a - min) / (max - min || 1);
    const c = ratio < 0.4 ? t.danger : ratio < 0.65 ? t.warning : t.primary;
    return (
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: c, fontSize: 28, fontWeight: '900' }}>
            {fmt(a)}
            <Text style={{ color: t.muted, fontSize: 14, fontWeight: '400' }}>{q.type === 'scale' ? ` /${max}` : ' en moyenne'}</Text>
          </Text>
          <Txt muted size={12}>
            min {Math.min(...nums)} · max {Math.max(...nums)}
          </Txt>
        </Row>
        {q.type === 'scale' && <Progress value={ratio} color={c} />}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[...vals]
            .sort((x, y) => (y.v as number) - (x.v as number))
            .map((x) => (
              <Badge key={x.pid} text={`${name(x.pid).split(' ')[0]} ${x.v}`} tone={q.type === 'scale' ? (((x.v as number) - min) / (max - min || 1) < 0.4 ? 'danger' : ((x.v as number) - min) / (max - min || 1) < 0.65 ? 'warning' : 'success') : 'neutral'} />
            ))}
        </View>
      </Card>
    );
  }

  if (q.type === 'yesno' || q.type === 'choice' || q.type === 'multi') {
    const opts = q.type === 'yesno' ? ['Oui', 'Non'] : q.options ?? [];
    const count = (o: string) =>
      vals.filter((x) => (q.type === 'yesno' ? (x.v ? 'Oui' : 'Non') === o : Array.isArray(x.v) ? x.v.includes(o) : x.v === o)).length;
    return (
      <Card>
        {opts.map((o) => {
          const n = count(o);
          return (
            <View key={o} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={14}>{o}</Txt>
                <Txt bold size={14}>
                  {n} · {Math.round((n / vals.length) * 100)} %
                </Txt>
              </Row>
              <Progress value={n / vals.length} />
            </View>
          );
        })}
      </Card>
    );
  }

  return (
    <Card>
      {vals.map((x) => (
        <View key={x.pid} style={{ gap: 2 }}>
          <Txt bold size={13}>
            {name(x.pid)}
          </Txt>
          <Txt muted size={14}>
            « {formatAnswer(x.v)} »
          </Txt>
        </View>
      ))}
    </Card>
  );
}
