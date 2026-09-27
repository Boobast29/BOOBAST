import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClubLogo } from '@/components/ClubLogo';
import { PinPad } from '@/components/PinPad';
import { shadow, useTheme } from '@/components/theme';
import { Avatar, Button, Card, Row, Txt } from '@/components/ui';
import { checkPin, hashPin } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { emptyData, useStore } from '@/lib/store';
import { initials, playerName } from '@/lib/stats';

type Step = { k: 'choose' } | { k: 'coach' } | { k: 'coach-create'; first?: string } | { k: 'players' } | { k: 'player-pin'; id: string };

export default function Connexion() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { data, login, setCoachPin, replaceAll } = useStore();
  const [step, setStep] = useState<Step>({ k: 'choose' });
  const [q, setQ] = useState('');

  const enterCoach = () => {
    login({ role: 'coach' });
    router.replace('/');
  };
  const enterPlayer = (playerId: string) => {
    login({ role: 'player', playerId });
    router.replace('/');
  };

  const back = step.k !== 'choose' && (
    <Pressable onPress={() => setStep({ k: 'choose' })} hitSlop={10} style={{ position: 'absolute', left: 16, top: insets.top + 12, zIndex: 2 }} accessibilityLabel="Retour">
      <Ionicons name="arrow-back" size={26} color={t.primary} />
    </Pressable>
  );

  const players = data.players
    .filter((p) => !p.archived)
    .filter((p) => playerName(p).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {back}
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 40, paddingBottom: 40, gap: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {step.k === 'choose' && (
          <>
            <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, padding: 28, alignItems: 'center', gap: 14 }}>
              <ClubLogo size={120} />
              <Text style={{ color: t.heroText, fontSize: 24, fontWeight: '900', textAlign: 'center' }}>{data.teamName}</Text>
              <Text style={{ color: t.heroMuted, fontSize: 15, textAlign: 'center' }}>Suivi des joueurs · compos · vidéos</Text>
            </LinearGradient>
            <Txt muted>Qui utilise l’appli ?</Txt>
            <RoleCard icon="clipboard" title="Je suis le coach" subtitle={data.coachPinHash ? 'Accès complet protégé par code' : 'Créer mon code d’accès'} onPress={() => setStep(data.coachPinHash ? { k: 'coach' } : { k: 'coach-create' })} />
            <RoleCard
              icon="person"
              title="Je suis joueur"
              subtitle="Mes questionnaires, ma compo, mes vidéos"
              tone="info"
              onPress={() => (data.players.length ? setStep({ k: 'players' }) : notify('Aucun joueur', 'Le coach doit d’abord créer l’effectif.'))}
            />
          </>
        )}

        {step.k === 'coach' && (
          <View style={{ alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
            <ClubLogo size={72} />
            <PinPad
              title="Accès coach"
              subtitle="Entrez votre code"
              onComplete={async (pin) => {
                if (await checkPin(pin, 'coach', data.coachPinHash)) enterCoach();
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
                      'Le code ne peut pas être récupéré. Pour éviter qu’un joueur prenne l’accès coach, la réinitialisation EFFACE toutes les données de l’appli. Vous pourrez ensuite restaurer votre dernière sauvegarde (Réglages → Restaurer).',
                      () => {
                        replaceAll({ ...emptyData(), coachPinHash: undefined });
                        setCoachPin(undefined);
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
              subtitle={step.first ? 'Saisissez-le une seconde fois' : '4 chiffres, à ne pas donner aux joueurs'}
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
                enterCoach();
              }}
            />
          </View>
        )}

        {step.k === 'players' && (
          <View style={{ gap: 12 }}>
            <Txt bold size={22}>
              Qui es-tu ?
            </Txt>
            {data.players.length > 8 && (
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Rechercher mon nom…"
                placeholderTextColor={t.muted}
                style={{ backgroundColor: t.input, borderRadius: 12, padding: 12, fontSize: 16, color: t.text, borderWidth: 1, borderColor: t.border }}
              />
            )}
            {players.map((p) => (
              <Card key={p.id} style={{ paddingVertical: 12 }} onPress={() => (p.pinHash ? setStep({ k: 'player-pin', id: p.id }) : enterPlayer(p.id))}>
                <Row style={{ gap: 12 }}>
                  <Avatar size={44} colorKey={p.id} label={initials(p)} />
                  <View style={{ flex: 1 }}>
                    <Txt bold>{playerName(p)}</Txt>
                    <Txt muted size={13}>
                      {p.position ?? ''}
                    </Txt>
                  </View>
                  <Ionicons name={p.pinHash ? 'lock-closed' : 'chevron-forward'} size={18} color={t.muted} />
                </Row>
              </Card>
            ))}
          </View>
        )}

        {step.k === 'player-pin' && (
          <View style={{ alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
            {(() => {
              const p = data.players.find((x) => x.id === step.id)!;
              return (
                <>
                  <Avatar size={72} colorKey={p.id} label={initials(p)} />
                  <PinPad
                    title={`Salut ${p.firstName} 👋`}
                    subtitle="Entre ton code joueur"
                    onComplete={async (pin) => {
                      if (await checkPin(pin, p.id, p.pinHash)) enterPlayer(p.id);
                      else return false;
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

function RoleCard({ icon, title, subtitle, onPress, tone = 'success' }: { icon: 'clipboard' | 'person'; title: string; subtitle: string; onPress: () => void; tone?: 'success' | 'info' }) {
  const t = useTheme();
  const c = tone === 'success' ? t.primary : t.info;
  const bg = tone === 'success' ? t.primarySoft : t.infoSoft;
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
