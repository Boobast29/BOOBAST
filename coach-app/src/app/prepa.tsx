import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { ClubLogo } from '@/components/ClubLogo';
import { Locked } from '@/components/Locked';
import { useTheme } from '@/components/theme';
import { Card, Empty, Field, Row, Screen, Section, Toggle, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/stats';
import { PREP_FIELDS } from '@/lib/constants';
import type { MatchPrep } from '@/lib/types';

export default function MatchPrepScreen() {
  const t = useTheme();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { data, session, saveMatch } = useStore();
  const coach = session?.role === 'coach';
  const match = data.matches.find((m) => m.id === matchId);
  if (!match) return <Empty text="Match introuvable." />;
  const prep: MatchPrep = match.prep ?? { published: false };
  if (!coach && !prep.published) return <Locked text="La préparation de ce match n’est pas encore publiée." />;

  const set = (patch: Partial<MatchPrep>) => saveMatch({ ...match, prep: { ...prep, ...patch } });
  const filled = PREP_FIELDS.filter((f) => prep[f.key]?.trim());

  const header = (
    <View style={{ backgroundColor: t.heroSolid, borderRadius: 14, padding: 20, gap: 8 }}>
      <Row style={{ gap: 12 }}>
        <ClubLogo size={48} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.heroMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>PRÉPARATION DU MATCH</Text>
          <Text style={{ color: t.heroText, fontWeight: '800', fontSize: 22 }}>
            {match.home ? 'vs' : '@'} {match.opponent}
          </Text>
          <Text style={{ color: t.heroMuted }}>
            {formatDate(match.date)}
            {match.competition ? ` · ${match.competition}` : ''} · {match.home ? 'Domicile' : 'Extérieur'}
          </Text>
        </View>
      </Row>
    </View>
  );

  if (!coach)
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Préparation' }} />
        {header}
        {filled.length === 0 && <Empty text="Le coach n’a encore rien écrit." />}
        {(['adv', 'nous'] as const).map((g) => {
          const items = filled.filter((f) => f.group === g);
          if (!items.length) return null;
          return (
            <View key={g} style={{ gap: 10 }}>
              <Section icon={g === 'adv' ? 'eye-outline' : 'people-outline'}>{g === 'adv' ? 'L’adversaire' : 'Notre plan'}</Section>
              {items.map((f) => (
                <Card key={f.key} stripe={f.key === 'message' ? t.accent : t.primary}>
                  <Row>
                    <Ionicons name={f.icon} size={18} color={t.primary} />
                    <Txt bold>{f.label}</Txt>
                  </Row>
                  <Txt>{prep[f.key]}</Txt>
                </Card>
              ))}
            </View>
          );
        })}
      </Screen>
    );

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Préparation' }} />
      {header}
      <Card>
        <Toggle label="Visible par les joueurs" icon="eye-outline" value={prep.published} onChange={(published) => set({ published })} />
        <Txt muted size={12}>
          {prep.published ? 'Les joueurs voient cette préparation dans leur espace.' : 'Brouillon : seul le coach la voit.'} {filled.length}/{PREP_FIELDS.length} rubriques remplies.
        </Txt>
      </Card>
      {(['adv', 'nous'] as const).map((g) => (
        <View key={g} style={{ gap: 10 }}>
          <Section icon={g === 'adv' ? 'eye-outline' : 'people-outline'}>{g === 'adv' ? 'L’adversaire' : 'Notre plan'}</Section>
          <Card>
            {PREP_FIELDS.filter((f) => f.group === g).map((f) => (
              <Field key={f.key} label={f.label} value={prep[f.key] ?? ''} onChangeText={(v) => set({ [f.key]: v || undefined })} multiline placeholder={f.placeholder} />
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
