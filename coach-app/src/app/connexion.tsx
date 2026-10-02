import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClubLogo } from '@/components/ClubLogo';
import { PinPad } from '@/components/PinPad';
import { TeamBadge } from '@/components/TeamBadge';
import { shadow, useTheme } from '@/components/theme';
import { Avatar, Button, Card, Row, Txt } from '@/components/ui';
import { checkPin, hashPin } from '@/lib/auth';
import { isCloudConfigured } from '@/lib/cloud/config';
import { confirm, notify } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { initials, playerName } from '@/lib/stats';
import type { Team } from '@/lib/types';

type Step =
  | { k: 'home' }
  | { k: 'coach' }
  | { k: 'coach-create'; first?: string }
  | { k: 'coach-teams' }
  | { k: 'player-teams' }
  | { k: 'players' }
  | { k: 'player-pin'; id: string };

export default function Connexion() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { data, club, team, login, setCoachPin, selectTeam, resetEverything } = useStore();
  const [step, setStep] = useState<Step>({ k: 'home' });
  const [q, setQ] = useState('');

  const enterCoach = async (teamId: string) => {
    await selectTeam(teamId);
    login({ role: 'coach', teamId });
    router.replace('/');
  };
  const coachTeams = club.teams.filter((x) => x.joinedAs !== 'player');
  const afterCoachAuth = () => {
    if (coachTeams.length === 0) openTeamCreation();
    else if (coachTeams.length === 1) enterCoach(coachTeams[0].id);
    else setStep({ k: 'coach-teams' });
  };
  // Session coach sans équipe : donne accès à la création de la première équipe
  const openTeamCreation = () => {
    login({ role: 'coach', teamId: '' });
    router.replace({ pathname: '/equipes', params: { first: '1' } });
  };

  const back = step.k !== 'home' && (
    <Pressable
      onPress={() => setStep(step.k === 'players' ? { k: 'player-teams' } : step.k === 'player-pin' ? { k: 'players' } : { k: 'home' })}
      hitSlop={10}
      style={{ position: 'absolute', left: 16, top: insets.top + 12, zIndex: 2 }}
      accessibilityLabel="Retour"
    >
      <Ionicons name="arrow-back" size={26} color={t.primary} />
    </Pressable>
  );

  const players = data.players
    .filter((p) => !p.archived)
    .filter((p) => playerName(p).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  const teamGrid = (onPick: (tm: Team) => void, teams: Team[] = club.teams) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {teams.map((tm, i) => (
        <Animated.View key={tm.id} entering={FadeInDown.delay(i * 50).springify()} style={{ width: '47%', flexGrow: 1 }}>
          <Pressable
            onPress={() => onPick(tm)}
            accessibilityLabel={`Équipe ${tm.name}`}
            style={({ pressed }) => [
              { backgroundColor: t.card, borderRadius: 20, padding: 16, gap: 10, alignItems: 'center', opacity: pressed ? 0.85 : 1, borderWidth: t.dark ? 1 : 0, borderColor: t.border },
              shadow(t),
            ]}
          >
            <TeamBadge team={tm} size={56} />
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 16, textAlign: 'center' }} numberOfLines={1}>
              {tm.name}
            </Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>{tm.category}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {back}
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 40, paddingBottom: 40, gap: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {step.k === 'home' && (
          <>
            <Animated.View entering={FadeInUp.duration(500)}>
              <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 32, padding: 28, alignItems: 'center', gap: 14, overflow: 'hidden' }}>
                {/* Cercles décoratifs */}
                <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.06)', top: -90, right: -80 }} />
                <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -70, left: -50 }} />
                <Animated.View entering={ZoomIn.delay(150).springify()}>
                  <ClubLogo size={130} />
                </Animated.View>
                <Text style={{ color: t.heroText, fontSize: 25, fontWeight: '900', textAlign: 'center' }}>{club.name}</Text>
                <Text style={{ color: t.heroMuted, fontSize: 15, textAlign: 'center' }}>Ressenti · suivi · compos · vidéos</Text>
                {club.teams.length > 0 && (
                  <Text style={{ color: t.heroMuted, fontSize: 13 }}>
                    {club.teams.length} équipe{club.teams.length > 1 ? 's' : ''}
                  </Text>
                )}
              </LinearGradient>
            </Animated.View>
            <Txt muted>Qui utilise l’appli ?</Txt>
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <RoleCard
                icon="clipboard"
                title="Je suis coach"
                subtitle={club.coachPinHash ? 'Accès coach sur cet appareil' : 'Créer le code coach de cet appareil'}
                onPress={() => setStep(club.coachPinHash ? { k: 'coach' } : { k: 'coach-create' })}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <RoleCard
                icon="person"
                title="Je suis joueur"
                subtitle="Mes questionnaires, ma compo, mes objectifs"
                tone="info"
                onPress={() => (club.teams.length ? setStep({ k: 'player-teams' }) : notify('Aucune équipe', 'Le coach doit d’abord créer son équipe.'))}
              />
            </Animated.View>
            {isCloudConfigured() && (
              <Animated.View entering={FadeInDown.delay(400).springify()}>
                <RoleCard icon="cloud" title="J’ai un code d’équipe" subtitle="Retrouver mon compte sur ce téléphone" tone="violet" onPress={() => router.push('/cloud')} />
              </Animated.View>
            )}
          </>
        )}

        {step.k === 'coach' && (
          <View style={{ alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
            <ClubLogo size={72} />
            <PinPad
              title="Accès coach"
              subtitle="Code coach de cet appareil"
              onComplete={async (pin) => {
                if (await checkPin(pin, 'coach', club.coachPinHash)) afterCoachAuth();
                else return false;
              }}
              footer={
                <Button
                  small
                  kind="ghost"
                  title="Code oublié ?"
                  onPress={() =>
                    confirm(
                      'Code coach oublié',
                      'Le code ne peut pas être récupéré. Pour éviter qu’un joueur prenne l’accès coach, la réinitialisation EFFACE toutes les données de l’appli sur cet appareil (toutes les équipes). Vous pourrez ensuite restaurer une sauvegarde ou resynchroniser depuis le cloud.',
                      async () => {
                        await resetEverything();
                        setStep({ k: 'coach-create' });
                      },
                      'Tout effacer',
                    )
                  }
                />
              }
            />
          </View>
        )}

        {step.k === 'coach-create' && (
          <View style={{ alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
            <ClubLogo size={72} />
            <PinPad
              key={step.first ? 'confirm' : 'new'}
              title={step.first ? 'Confirmez le code' : 'Créez votre code coach'}
              subtitle={step.first ? 'Saisissez-le une seconde fois' : '4 chiffres pour protéger cet appareil'}
              onComplete={async (pin) => {
                if (!step.first) {
                  setStep({ k: 'coach-create', first: pin });
                  return;
                }
                if (pin !== step.first) {
                  setStep({ k: 'coach-create' });
                  notify('Les codes ne correspondent pas', 'Recommencez.');
                  return false;
                }
                setCoachPin(await hashPin(pin, 'coach'));
                afterCoachAuth();
              }}
            />
          </View>
        )}

        {step.k === 'coach-teams' && (
          <View style={{ gap: 16 }}>
            <Txt bold size={24}>
              Quelle équipe ?
            </Txt>
            {teamGrid((tm) => enterCoach(tm.id), coachTeams)}
          </View>
        )}

        {step.k === 'player-teams' && (
          <View style={{ gap: 16 }}>
            <Txt bold size={24}>
              Ton équipe
            </Txt>
            {teamGrid(async (tm) => {
              await selectTeam(tm.id);
              // Équipe rejointe via le cloud sur ce téléphone : connexion directe
              if (tm.joinedAs === 'player' && tm.playerId) {
                login({ role: 'player', teamId: tm.id, playerId: tm.playerId });
                router.replace('/');
              } else setStep({ k: 'players' });
            })}
          </View>
        )}

        {step.k === 'players' && (
          <View style={{ gap: 12 }}>
            <Row>
              {team ? <TeamBadge team={team} size={36} /> : null}
              <Txt bold size={22}>
                Qui es-tu ?
              </Txt>
            </Row>
            {data.players.length > 8 && (
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Rechercher mon nom…"
                placeholderTextColor={t.muted}
                style={{ backgroundColor: t.input, borderRadius: 12, padding: 12, fontSize: 16, color: t.text, borderWidth: 1, borderColor: t.border }}
              />
            )}
            {players.length === 0 && <Txt muted>Aucun joueur dans cette équipe pour le moment.</Txt>}
            {players.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(Math.min(i, 10) * 30)}>
                <Card
                  style={{ paddingVertical: 12 }}
                  onPress={() => {
                    if (p.pinHash) setStep({ k: 'player-pin', id: p.id });
                    else if (team) {
                      login({ role: 'player', teamId: team.id, playerId: p.id });
                      router.replace('/');
                    }
                  }}
                >
                  <Row style={{ gap: 12 }}>
                    <Avatar size={44} colorKey={p.id} photo={p.photoUri} label={initials(p)} />
                    <View style={{ flex: 1 }}>
                      <Txt bold>{playerName(p)}</Txt>
                      <Txt muted size={13}>
                        {p.position ?? ''}
                      </Txt>
                    </View>
                    <Ionicons name={p.pinHash ? 'lock-closed' : 'chevron-forward'} size={18} color={t.muted} />
                  </Row>
                </Card>
              </Animated.View>
            ))}
          </View>
        )}

        {step.k === 'player-pin' && (
          <View style={{ alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
            {(() => {
              const p = data.players.find((x) => x.id === step.id)!;
              return (
                <>
                  <Avatar size={80} colorKey={p.id} photo={p.photoUri} label={initials(p)} />
                  <PinPad
                    title={`Salut ${p.firstName} 👋`}
                    subtitle="Entre ton code joueur"
                    onComplete={async (pin) => {
                      if (!(await checkPin(pin, p.id, p.pinHash))) return false;
                      if (team) {
                        login({ role: 'player', teamId: team.id, playerId: p.id });
                        router.replace('/');
                      }
                    }}
                    footer={<Txt muted size={13}>Code oublié ? Demande au coach.</Txt>}
                  />
                </>
              );
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RoleCard({ icon, title, subtitle, onPress, tone = 'success' }: { icon: 'clipboard' | 'person' | 'cloud'; title: string; subtitle: string; onPress: () => void; tone?: 'success' | 'info' | 'violet' }) {
  const t = useTheme();
  const c = tone === 'success' ? t.primary : tone === 'info' ? t.info : t.violet;
  const bg = tone === 'success' ? t.primarySoft : tone === 'info' ? t.infoSoft : t.violetSoft;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: t.card, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: pressed ? 0.85 : 1, borderWidth: t.dark ? 1 : 0, borderColor: t.border },
        shadow(t),
      ]}
    >
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={28} color={c} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: t.muted, fontSize: 14 }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={t.muted} />
    </Pressable>
  );
}
