import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs, usePathname } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { ClubLogo } from '@/components/ClubLogo';
import { TeamBadge } from '@/components/TeamBadge';
import { useTheme } from '@/components/theme';
import type { IconName } from '@/components/ui';
import type { Theme } from '@/components/theme';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/lib/store';

type NavigationItem = { key: string; label: string; path: Href; icon: IconName };

const icon = (outline: IconName, filled: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} color={color as string} size={23} />;
  };

function NavigationLink({
  item,
  active,
  theme,
  onPress,
  compact = false,
}: {
  item: NavigationItem;
  active: boolean;
  theme: Theme;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: active ? theme.primarySoft : pressed ? theme.input : 'transparent',
      })}
    >
      <Ionicons name={item.icon} size={21} color={active ? theme.primary : theme.muted} />
      <Text style={{ color: active ? theme.primary : theme.text, fontSize: 14, fontWeight: active ? '800' : '600', flex: 1 }}>
        {item.label}
      </Text>
      {active && !compact ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: theme.primary }} /> : null}
    </Pressable>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  const { session, logout, team, club } = useStore();
  const coach = session?.role === 'coach';
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 900;
  const [menuOpen, setMenuOpen] = useState(false);
  // Onglets réservés au coach : masqués pour les joueurs
  const coachOnly = coach ? {} : { href: null };

  const quit = () =>
    confirm('Changer d’utilisateur ?', coach ? 'Le code coach sera redemandé.' : 'Tu reviendras à l’écran de connexion.', () => {
      logout();
      router.replace('/connexion');
    }, 'Déconnexion');

  const navItem = (key: string, label: string, path: Href, itemIcon: IconName): NavigationItem => ({ key, label, path, icon: itemIcon });
  const navigation: NavigationItem[] = [
    navItem('index', coach ? 'Accueil' : 'Mon espace', '/', 'home-outline'),
    ...(coach ? [navItem('joueurs', 'Joueurs', '/joueurs', 'people-outline')] : []),
    ...(coach ? [navItem('matchs', 'Agenda', '/matchs', 'football-outline')] : []),
    navItem('compo', 'Composition', '/compo', 'grid-outline'),
    ...(coach ? [navItem('suivi', 'Suivi', '/suivi', 'pulse-outline')] : []),
    navItem('videos', 'Vidéos', '/videos', 'play-circle-outline'),
    ...(coach
      ? [
          navItem('blessures', 'Blessures', '/blessures', 'medkit-outline'),
          navItem('prepa', 'Préparation', '/prepa', 'clipboard-outline'),
          navItem('equipes', 'Équipes', '/equipes', 'shield-outline'),
          navItem('reglages', 'Réglages', '/reglages', 'settings-outline'),
        ]
      : []),
  ];
  const activeKey = pathname === '/' ? 'index' : pathname.split('/').filter(Boolean).at(-1);
  const goTo = (item: NavigationItem) => {
    setMenuOpen(false);
    router.navigate(item.path);
  };

  const menu = (compact = false) => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
      {navigation.map((item) => (
        <View key={item.key}>
          {coach && (item.key === 'blessures') && (
            <Text style={{ color: t.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 8, paddingHorizontal: 13 }}>
              OUTILS
            </Text>
          )}
          <NavigationLink item={item} active={activeKey === item.key} theme={t} compact={compact} onPress={() => goTo(item)} />
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.bg }}>
      {desktop && (
        <View style={{ width: 252, backgroundColor: t.card, borderRightWidth: 1, borderRightColor: t.border, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 18 }}>
          <View style={{ flex: 1, gap: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 7 }}>
              <ClubLogo size={42} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 16, fontWeight: '800' }}>QEA Coach</Text>
                <Text style={{ color: t.muted, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                  {club.name}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: 14, backgroundColor: t.cardAlt }}>
              {team ? <TeamBadge team={team} size={30} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.muted, fontSize: 10, fontWeight: '700' }}>ÉQUIPE</Text>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: '800' }} numberOfLines={1}>{team?.name ?? (coach ? 'Coach' : 'Espace joueur')}</Text>
              </View>
              {coach && club.teams.length > 1 ? (
                <Pressable onPress={() => router.push('/equipes')} accessibilityLabel="Changer d’équipe" hitSlop={8}>
                  <Ionicons name="chevron-down" size={17} color={t.muted} />
                </Pressable>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10, paddingHorizontal: 13 }}>MENU</Text>
              {menu()}
            </View>
          </View>
          <Pressable onPress={quit} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 13, borderTopWidth: 1, borderTopColor: t.border, marginTop: 12 }}>
            <Ionicons name="log-out-outline" size={21} color={t.muted} />
            <Text style={{ color: t.muted, fontSize: 14, fontWeight: '600' }}>Changer d’utilisateur</Text>
          </Pressable>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: t.primary,
            tabBarInactiveTintColor: t.muted,
            tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
            tabBarStyle: {
              display: desktop ? 'none' : 'flex',
              backgroundColor: t.card,
              borderTopColor: t.border,
              height: Platform.OS === 'ios' ? 88 : 66,
              paddingTop: 6,
              paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            },
            headerStyle: { backgroundColor: t.bg },
            headerShadowVisible: false,
            headerTitleStyle: { color: t.text, fontWeight: '700', fontSize: 20 },
            headerTitleAlign: 'left',
            headerLeft: desktop
              ? undefined
              : () => (
                  <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} accessibilityLabel="Ouvrir le menu" style={{ marginLeft: 14, marginRight: 8 }}>
                    <Ionicons name="menu" size={25} color={t.primary} />
                  </Pressable>
                ),
            sceneStyle: { backgroundColor: t.bg },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: coach ? 'Accueil' : 'Moi',
              tabBarIcon: coach ? icon('home-outline', 'home') : icon('person-circle-outline', 'person-circle'),
              headerTitle: () => (
                <Pressable
                  disabled={!coach}
                  onPress={() => router.push('/equipes')}
                  accessibilityLabel="Changer d’équipe"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <ClubLogo size={34} ring={false} />
                  {team ? <TeamBadge team={team} size={26} /> : null}
                  <Text style={{ color: t.text, fontWeight: '800', fontSize: 20 }} numberOfLines={1}>
                    {team?.name ?? (coach ? 'Coach' : 'Espace joueur')}
                  </Text>
                  {coach && club.teams.length > 1 ? <Ionicons name="chevron-down" size={18} color={t.muted} /> : null}
                </Pressable>
              ),
              headerRight: () => (
                <View style={{ flexDirection: 'row', gap: 18, marginRight: 16 }}>
                  {coach && (
                    <Pressable onPress={() => router.push('/reglages')} hitSlop={10} accessibilityLabel="Réglages">
                      <Ionicons name="settings-outline" size={24} color={t.primary} />
                    </Pressable>
                  )}
                  <Pressable onPress={quit} hitSlop={10} accessibilityLabel="Changer d’utilisateur">
                    <Ionicons name="log-out-outline" size={25} color={t.primary} />
                  </Pressable>
                </View>
              ),
            }}
          />
          <Tabs.Screen name="joueurs" options={{ title: 'Joueurs', tabBarIcon: icon('people-outline', 'people'), ...coachOnly }} />
          <Tabs.Screen name="matchs" options={{ title: 'Agenda', tabBarIcon: icon('football-outline', 'football'), ...coachOnly }} />
          <Tabs.Screen name="compo" options={{ title: 'Compo', headerTitle: 'Composition', tabBarIcon: icon('grid-outline', 'grid') }} />
          <Tabs.Screen name="suivi" options={{ title: 'Suivi', headerTitle: 'Suivi des joueurs', tabBarIcon: icon('pulse-outline', 'pulse'), ...coachOnly }} />
          <Tabs.Screen name="videos" options={{ title: 'Vidéos', tabBarIcon: icon('play-circle-outline', 'play-circle') }} />
          <Tabs.Screen name="blessures" options={{ href: null, title: 'Blessures' }} />
        </Tabs>
      </View>
      {!desktop && (
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.42)' }}>
            <View style={{ width: 310, maxWidth: '86%', backgroundColor: t.card, paddingHorizontal: 18, paddingTop: 48, paddingBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <ClubLogo size={42} />
                  <View>
                    <Text style={{ color: t.text, fontSize: 16, fontWeight: '800' }}>QEA Coach</Text>
                    <Text style={{ color: t.muted, fontSize: 11, fontWeight: '600' }}>{team?.name ?? 'Suivi d’équipe'}</Text>
                  </View>
                </View>
                <Pressable onPress={() => setMenuOpen(false)} hitSlop={10} accessibilityLabel="Fermer le menu">
                  <Ionicons name="close" size={25} color={t.muted} />
                </Pressable>
              </View>
              {menu(true)}
              <Pressable onPress={quit} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 13, borderTopWidth: 1, borderTopColor: t.border, marginTop: 10 }}>
                <Ionicons name="log-out-outline" size={21} color={t.muted} />
                <Text style={{ color: t.muted, fontSize: 14, fontWeight: '600' }}>Changer d’utilisateur</Text>
              </Pressable>
            </View>
            <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)} accessibilityLabel="Fermer le menu" />
          </View>
        </Modal>
      )}
    </View>
  );
}
