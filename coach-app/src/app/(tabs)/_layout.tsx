import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { ClubLogo } from '@/components/ClubLogo';
import { useTheme } from '@/components/theme';
import type { IconName } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/lib/store';

const icon = (outline: IconName, filled: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} color={color as string} size={23} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  const { session, logout } = useStore();
  const coach = session?.role === 'coach';
  // Onglets réservés au coach : masqués pour les joueurs
  const coachOnly = coach ? {} : { href: null };

  const quit = () =>
    confirm('Changer d’utilisateur ?', coach ? 'Le code coach sera redemandé.' : 'Tu reviendras à l’écran de connexion.', () => {
      logout();
      router.replace('/connexion');
    }, 'Déconnexion');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        headerStyle: { backgroundColor: t.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: t.text, fontWeight: '800', fontSize: 20 },
        headerTitleAlign: 'left',
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: coach ? 'Accueil' : 'Moi',
          tabBarIcon: coach ? icon('home-outline', 'home') : icon('person-circle-outline', 'person-circle'),
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ClubLogo size={34} ring={false} />
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 20 }}>{coach ? 'Coach' : 'Espace joueur'}</Text>
            </View>
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
      <Tabs.Screen name="videos" options={{ title: 'Vidéos', tabBarIcon: icon('play-circle-outline', 'play-circle') }} />
      <Tabs.Screen name="blessures" options={{ title: 'Blessés', headerTitle: 'Blessures', tabBarIcon: icon('medkit-outline', 'medkit'), ...coachOnly }} />
    </Tabs>
  );
}
