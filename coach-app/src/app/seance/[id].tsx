import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { SendPanel } from '@/components/SendPanel';
import type { RecipientGroup } from '@/components/SendPanel';
import { Avatar, Badge, Hero, Button, Card, Empty, HeaderButton, HeroStat, List, Progress, Row, Screen, Section, tap, toneColors, Txt } from '@/components/ui';
import { ATTENDANCE } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { defaultSessionRecipients, sessionRequest } from '@/lib/requests';
import { avg, fmt, formatDate, initials, playerName, sessionPresent, today, trainingLoad } from '@/lib/stats';
import type { Attendance } from '@/lib/types';

const ORDER: Attendance[] = ['present', 'retard', 'absent', 'excuse', 'blesse'];

export default function SessionDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveSession } = useStore();
  const s = data.sessions.find((x) => x.id === id);
  if (!s) return <Empty text="Séance introuvable." />;

  const players = data.players.filter((p) => !p.archived || s.attendance[p.id]).sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
  const present = sessionPresent(s);
  const counts = Object.fromEntries(ORDER.map((a) => [a, Object.values(s.attendance).filter((x) => x === a).length])) as Record<Attendance, number>;
  const load = players.reduce((a, p) => a + trainingLoad(s, p.id), 0);
  const fb = Object.entries(s.feedback ?? {});
  const presentIds = defaultSessionRecipients(data, s);
  const groups: RecipientGroup[] = [
    ...(presentIds !== 'all' ? [{ label: 'Joueurs présents', to: presentIds }] : []),
    { label: 'Tout l’effectif', to: 'all' as const },
  ];
  const edit = () => router.push({ pathname: '/seance/edit', params: { id: s.id } });

  const setAtt = (pid: string, a: Attendance) => {
    tap();
    const playerRpe = { ...s.playerRpe };
    if (a !== 'present' && a !== 'retard') delete playerRpe[pid];
    saveSession({ ...s, attendance: { ...s.attendance, [pid]: a }, playerRpe });
  };
  const setRpe = (pid: string, v: number) => {
    tap();
    saveSession({
      ...s,
      playerRpe: { ...s.playerRpe, [pid]: Math.max(0, Math.min(10, v)) },
    });
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <HeaderButton icon="create-outline" label="Modifier la séance" onPress={edit} />,
        }}
      />
      <Hero>
        <View style={{ gap: 2 }}>
          <Text style={{ color: t.heroMuted, fontSize: 13, fontWeight: '600' }}>
            Entraînement · {formatDate(s.date)}
            {s.time ? ` · ${s.time}` : ''}
          </Text>
          <Text style={{ color: t.heroText, fontSize: 24, fontWeight: '800' }}>{s.theme ?? 'Séance'}</Text>
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <HeroStat value={`${present}/${players.length}`} label="Présents" />
          <HeroStat value={`${s.durationMin}′`} label="Durée" />
          <HeroStat value={s.rpe ?? '–'} label="RPE" />
          <HeroStat value={load} label="Charge" />
        </Row>
      </Hero>

      {s.notes ? (
        <Card>
          <Row>
            <Ionicons name="document-text-outline" size={18} color={t.muted} />
            <Txt>{s.notes}</Txt>
          </Row>
        </Card>
      ) : null}

      {Object.keys(s.attendance).length > 0 && s.date <= today() ? (
        <SendPanel request={sessionRequest(data, s)} groups={groups} />
      ) : (
        <Txt muted size={13}>
          Faites l’appel : vous pourrez ensuite envoyer la demande de ressenti aux présents.
        </Txt>
      )}

      {fb.length > 0 && (
        <>
          <Section icon="chatbubbles-outline">Ressenti des joueurs</Section>
          <Card>
            {(
              [
                ['quality', 'Qualité de l’entraînement', false],
                ['selfPerf', 'Performance perso', false],
                ['intensity', 'Intensité ressentie', true],
              ] as const
            ).map(([k, label, inv]) => {
              const a = avg(fb.map(([, f]) => f[k]));
              const ratio = a == null ? 0 : (a - 1) / 9;
              const good = inv ? 1 - ratio : ratio;
              const c = inv ? t.info : good < 0.4 ? t.danger : good < 0.65 ? t.warning : t.primary;
              return (
                <View key={k} style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt size={14} bold>
                      {label}
                    </Txt>
                    <Txt bold color={c}>
                      {fmt(a)}/10
                    </Txt>
                  </Row>
                  <Progress value={ratio} color={c} />
                </View>
              );
            })}
            {fb
              .filter(([, f]) => f.comment)
              .map(([pid, f]) => (
                <Txt key={pid} muted size={13}>
                  <Txt bold size={13}>
                    {playerName(data.players.find((p) => p.id === pid))} :{' '}
                  </Txt>
                  « {f.comment} »
                </Txt>
              ))}
          </Card>
        </>
      )}

      <Section
        icon="checkbox-outline"
        action={
          <Button
            small
            kind="ghost"
            icon="checkmark-done"
            title="Tous présents"
            onPress={() =>
              saveSession({
                ...s,
                attendance: Object.fromEntries(players.map((p) => [p.id, s.attendance[p.id] === 'blesse' ? 'blesse' : 'present'])),
              })
            }
          />
        }
      >
        Appel
      </Section>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {ORDER.map((a) => {
          const [bg, fg] = toneColors(t, ATTENDANCE[a].tone);
          return (
            <View
              key={a}
              style={{
                backgroundColor: bg,
                borderRadius: 5,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: fg, fontWeight: '700', fontSize: 12 }}>
                {ATTENDANCE[a].short} = {ATTENDANCE[a].label} · {counts[a]}
              </Text>
            </View>
          );
        })}
      </Row>

      <List>
        {players.map((p, i) => {
          const a = s.attendance[p.id];
          const here = a === 'present' || a === 'retard';
          const rpe = s.playerRpe[p.id];
          return (
            <View
              key={p.id}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                gap: 8,
                borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                borderTopColor: t.border,
              }}
            >
              <Row style={{ gap: 10 }}>
                <Avatar size={36} colorKey={p.id} photo={p.photoUri} label={initials(p)} />
                <View style={{ flex: 1 }}>
                  <Txt bold>{playerName(p)}</Txt>
                </View>
                <Row style={{ gap: 5 }}>
                  {ORDER.map((opt) => {
                    const on = a === opt;
                    const [bg, fg] = toneColors(t, ATTENDANCE[opt].tone);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setAtt(p.id, opt)}
                        accessibilityLabel={`${playerName(p)} ${ATTENDANCE[opt].label}`}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: on ? fg : bg,
                          opacity: on ? 1 : 0.7,
                        }}
                      >
                        <Text style={{ color: on ? '#fff' : fg, fontWeight: '800' }}>{ATTENDANCE[opt].short}</Text>
                      </Pressable>
                    );
                  })}
                </Row>
              </Row>
              {s.feedback?.[p.id] && (
                <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                  <Badge text={`Qualité ${s.feedback[p.id].quality ?? '–'}`} tone="success" />
                  <Badge text={`Perf ${s.feedback[p.id].selfPerf ?? '–'}`} tone="accent" />
                  <Badge text={`Intensité ${s.feedback[p.id].intensity ?? '–'}`} tone="info" />
                </Row>
              )}
              {here && (
                <Row style={{ gap: 8 }}>
                  <Ionicons name="flame-outline" size={16} color={t.muted} />
                  <Txt muted size={13}>
                    RPE ressenti
                  </Txt>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => setRpe(p.id, (rpe ?? s.rpe ?? 5) - 1)} hitSlop={6} accessibilityLabel={`Diminuer RPE ${playerName(p)}`}>
                    <Ionicons name="remove-circle-outline" size={26} color={t.primary} />
                  </Pressable>
                  <Text
                    style={{
                      color: rpe != null ? t.text : t.muted,
                      fontWeight: '800',
                      fontSize: 16,
                      width: 44,
                      textAlign: 'center',
                    }}
                  >
                    {rpe ?? s.rpe ?? '–'}
                  </Text>
                  <Pressable onPress={() => setRpe(p.id, (rpe ?? s.rpe ?? 5) + 1)} hitSlop={6} accessibilityLabel={`Augmenter RPE ${playerName(p)}`}>
                    <Ionicons name="add-circle-outline" size={26} color={t.primary} />
                  </Pressable>
                </Row>
              )}
            </View>
          );
        })}
      </List>

      <Button title="Modifier la séance" icon="create-outline" kind="secondary" onPress={edit} />
    </Screen>
  );
}
