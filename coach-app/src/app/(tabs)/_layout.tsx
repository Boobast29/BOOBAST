import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/components/theme';
import type { IconName } from '@/components/ui';

const icon = (outline: IconName, filled: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} color={color as string} size={24} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
          title: 'Accueil',
          headerTitle: 'Coach Suivi',
          tabBarIcon: icon('home-outline', 'home'),
          headerRight: () => (
            <Pressable onPress={() => router.push('/reglages')} hitSlop={10} style={{ marginRight: 16 }} accessibilityLabel="Réglages">
              <Ionicons name="settings-outline" size={24} color={t.primary} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="joueurs" options={{ title: 'Joueurs', tabBarIcon: icon('people-outline', 'people') }} />
      <Tabs.Screen name="matchs" options={{ title: 'Matchs', tabBarIcon: icon('football-outline', 'football') }} />
      <Tabs.Screen name="videos" options={{ title: 'Vidéos', tabBarIcon: icon('play-circle-outline', 'play-circle') }} />
      <Tabs.Screen name="blessures" options={{ title: 'Blessures', tabBarIcon: icon('medkit-outline', 'medkit') }} />
    </Tabs>
  );
}
