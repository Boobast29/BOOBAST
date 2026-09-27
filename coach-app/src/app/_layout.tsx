import { router, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { PLAYER_ROUTES, PLAYER_TABS } from '@/lib/access';
import { DataProvider, useStore } from '@/lib/store';

function RootStack() {
  const t = useTheme();
  const { ready, session, data, logout } = useStore();
  const segments = useSegments() as string[];

  // Contrôle d'accès : connexion obligatoire, pages coach interdites aux joueurs
  useEffect(() => {
    if (!ready) return;
    const [first, second] = segments;
    if (session?.role === 'player' && !data.players.some((p) => p.id === session.playerId && !p.archived)) {
      logout();
      return;
    }
    if (!session) {
      if (first !== 'connexion') router.replace('/connexion');
    } else if (first === 'connexion') router.replace('/');
    else if (session.role === 'player' && (!PLAYER_ROUTES.has(first ?? '(tabs)') || (first === '(tabs)' && second && !PLAYER_TABS.has(second)))) {
      router.replace('/');
    }
  }, [ready, session, segments, data.players, logout]);

  if (!ready)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerShadowVisible: false,
        headerTintColor: t.primary,
        headerTitleStyle: { color: t.text, fontWeight: '700' },
        contentStyle: { backgroundColor: t.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="connexion" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="joueur/edit" options={{ presentation: 'modal', title: 'Joueur' }} />
      <Stack.Screen name="joueur/[id]" options={{ title: 'Fiche joueur' }} />
      <Stack.Screen name="match/edit" options={{ presentation: 'modal', title: 'Match' }} />
      <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
      <Stack.Screen name="questionnaire" options={{ presentation: 'modal', title: "Questionnaire d'après-match" }} />
      <Stack.Screen name="blessure/edit" options={{ presentation: 'modal', title: 'Blessure' }} />
      <Stack.Screen name="questions/index" options={{ title: 'Questions perso' }} />
      <Stack.Screen name="reglages" options={{ title: 'Réglages' }} />
      <Stack.Screen name="media/[id]" options={{ title: 'Vidéo' }} />
      <Stack.Screen name="media/edit" options={{ presentation: 'modal', title: 'Média' }} />
      <Stack.Screen name="questions/edit" options={{ presentation: 'modal', title: 'Question' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <DataProvider>
      <StatusBar style="auto" />
      <RootStack />
    </DataProvider>
  );
}
