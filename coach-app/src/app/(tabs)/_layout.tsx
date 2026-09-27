import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/components/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.card },
        headerTitleStyle: { color: t.text },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('speedometer-outline') }} />
      <Tabs.Screen name="joueurs" options={{ title: 'Joueurs', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="matchs" options={{ title: 'Matchs', tabBarIcon: icon('football-outline') }} />
      <Tabs.Screen name="blessures" options={{ title: 'Blessures', tabBarIcon: icon('medkit-outline') }} />
      <Tabs.Screen name="reglages" options={{ title: 'Réglages', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
