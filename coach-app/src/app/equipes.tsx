import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ClubLogo } from '@/components/ClubLogo';
import { Locked } from '@/components/Locked';
import { TeamBadge } from '@/components/TeamBadge';
import { useTheme } from '@/components/theme';
import { Badge, Button, Card, Chips, Field, Row, Screen, Section, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { isCloudConfigured } from '@/lib/cloud/config';
import { TEAM_COLORS, useStore } from '@/lib/store';
import type { Team, TeamCategory } from '@/lib/types';

const CATEGORIES: TeamCategory[] = ['Seniors', 'Jeunes', 'Féminines', 'Vétérans', 'Loisir'];
/** Suggestions d'équipes d'un club amateur. */
const SUGGESTIONS: { name: string; category: TeamCategory }[] = [
  { name: 'Seniors A', category: 'Seniors' },
  { name: 'Seniors B', category: 'Seniors' },
  { name: 'Seniors C', category: 'Seniors' },
  { name: 'U19', category: 'Jeunes' },
  { name: 'U17', category: 'Jeunes' },
  { name: 'U15', category: 'Jeunes' },
  { name: 'U13', category: 'Jeunes' },
  { name: 'U11', category: 'Jeunes' },
  { name: 'Féminines', category: 'Féminines' },
  { name: 'Vétérans', category: 'Vétérans' },
];

export default function Teams() {
  const t = useTheme();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const { club, team, session, createTeam, updateTeam, deleteTeam, selectTeam, login } = useStore();
  const [editing, setEditing] = useState<Team | 'new' | null>(first ? 'new' : null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TeamCategory>('Seniors');
  const [color, setColor] = useState(TEAM_COLORS[0]);

  if (session?.role !== 'coach') return <Locked />;

  const open = (tm: Team | 'new') => {
    setEditing(tm);
    setName(tm === 'new' ? '' : tm.name);
    setCategory(tm === 'new' ? 'Seniors' : tm.category);
    setColor(tm === 'new' ? TEAM_COLORS[club.teams.length % TEAM_COLORS.length] : tm.color);
  };

  const enter = async (id: string) => {
    await selectTeam(id);
    login({ role: 'coach', teamId: id });
    router.replace('/');
  };

  const save = async () => {
    if (!name.trim()) return notify('Donnez un nom à l’équipe', 'Ex. : Seniors A, U17…');
    if (editing === 'new') {
      const created = createTeam({ name: name.trim(), category, color });
      setEditing(null);
      if (!team || first) await enter(created.id);
    } else if (editing) {
      updateTeam(editing.id, { name: name.trim(), category, color });
      setEditing(null);
    }
  };

  const available = SUGGESTIONS.filter((s) => !club.teams.some((x) => x.name.toLowerCase() === s.name.toLowerCase()));

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Équipes du club', headerBackVisible: !first }} />
      <Card style={{ alignItems: 'center' }}>
        <ClubLogo size={64} />
        <Txt bold size={18}>
          {club.name}
        </Txt>
        <Txt muted size={13}>
          Chaque équipe a son effectif, ses matchs, ses séances et son suivi. Les joueurs choisissent leur équipe à la connexion.
        </Txt>
      </Card>

      {first && isCloudConfigured() ? (
        <Card stripe={t.info}>
          <Txt bold>Tu as déjà un compte coach sur le cloud ?</Txt>
          <Txt muted size={13}>Connecte-toi pour récupérer les équipes existantes au lieu d’en créer une nouvelle sur ce téléphone.</Txt>
          <Button
            kind="secondary"
            icon="cloud"
            title="Me connecter et récupérer mes équipes"
            onPress={() => router.push({ pathname: '/cloud', params: { mode: 'coach' } })}
          />
        </Card>
      ) : null}

      {club.teams.length > 0 && <Section icon="shield-outline">Équipes ({club.teams.length})</Section>}
      {club.teams.map((tm, i) => (
        <Animated.View key={tm.id} entering={FadeInDown.delay(i * 40)}>
          <Card onPress={() => enter(tm.id)} stripe={tm.color}>
            <Row style={{ gap: 12 }}>
              <TeamBadge team={tm} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold size={17}>
                  {tm.name}
                </Txt>
                <Txt muted size={13}>
                  {tm.category}
                </Txt>
              </View>
              {team?.id === tm.id ? <Badge text="Active" tone="success" icon="checkmark" /> : null}
              <Pressable onPress={() => open(tm)} hitSlop={10} accessibilityLabel={`Modifier ${tm.name}`}>
                <Ionicons name="create-outline" size={22} color={t.primary} />
              </Pressable>
            </Row>
          </Card>
        </Animated.View>
      ))}

      {editing ? (
        <Card stripe={color}>
          <Row style={{ gap: 12 }}>
            <TeamBadge team={{ name: name || '?', color }} size={48} />
            <Txt bold size={18}>
              {editing === 'new' ? 'Nouvelle équipe' : `Modifier ${editing.name}`}
            </Txt>
          </Row>
          {editing === 'new' && available.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {available.map((s) => (
                <Pressable
                  key={s.name}
                  onPress={() => {
                    setName(s.name);
                    setCategory(s.category);
                  }}
                  style={{ backgroundColor: t.input, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}
                >
                  <Text style={{ color: t.text, fontWeight: '600', fontSize: 13 }}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Field label="Nom de l’équipe" value={name} onChangeText={setName} placeholder="Ex. : Seniors B, U15…" />
          <Chips label="Catégorie" options={CATEGORIES} value={category} onChange={(v) => v && setCategory(v)} />
          <Txt bold size={15}>
            Couleur
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {TEAM_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityLabel={`Couleur ${c}`}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: color === c ? 4 : 0, borderColor: t.text }}
              />
            ))}
          </View>
          <Row style={{ gap: 8 }}>
            {!first || club.teams.length > 0 ? (
              <View style={{ flex: 1 }}>
                <Button small kind="secondary" title="Annuler" onPress={() => setEditing(null)} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button small icon="checkmark" title={editing === 'new' ? 'Créer' : 'Enregistrer'} onPress={save} />
            </View>
          </Row>
          {editing !== 'new' && (
            <Button
              small
              kind="danger"
              icon="trash-outline"
              title="Supprimer l’équipe"
              onPress={() =>
                confirm(`Supprimer ${editing.name} ?`, 'Joueurs, matchs, séances et suivi de cette équipe seront effacés de cet appareil.', async () => {
                  await deleteTeam(editing.id);
                  setEditing(null);
                  router.replace('/connexion');
                })
              }
            />
          )}
        </Card>
      ) : (
        <Button title="Ajouter une équipe" icon="add-circle" onPress={() => open('new')} />
      )}
    </Screen>
  );
}
