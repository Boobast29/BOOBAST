import { router, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { PLAYER_ROUTES, PLAYER_TABS } from '@/lib/access';
import { CloudSync } from '@/lib/cloud/CloudSync';
import { DataProvider, useStore } from '@/lib/store';

function RootStack() {
  const t = useTheme();
  const { ready, session, data, club, logout } = useStore();
  const segments = useSegments() as string[];

  // Contrôle d'accès : connexion obligatoire, pages coach interdites aux joueurs
  useEffect(() => {
    if (!ready) return;
    const [first, second] = segments;
    // Joueur retiré de l'effectif → déconnexion (sauf équipe cloud pas encore téléchargée)
    if (session?.role === 'player' && data.players.length > 0 && !data.players.some((p) => p.id === session.playerId && !p.archived)) {
      logout();
      return;
    }
    if (!session) {
      if (first !== 'connexion' && first !== 'cloud') router.replace('/connexion');
    } else if (session.role === 'coach' && !club.teams.some((x) => x.id === session.teamId)) {
      // Coach sans équipe (premier lancement) : création d'équipe obligatoire
      if (first !== 'equipes' && first !== 'cloud') router.replace({ pathname: '/equipes', params: { first: '1' } });
    } else if (first === 'connexion') router.replace('/');
    else if (session.role === 'player' && (!PLAYER_ROUTES.has(first ?? '(tabs)') || (first === '(tabs)' && second && !PLAYER_TABS.has(second)))) {
      router.replace('/');
    }
  }, [ready, session, segments, data.players, club.teams, logout]);

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
      <Stack.Screen name="equipes" options={{ title: 'Équipes du club' }} />
      <Stack.Screen name="cloud" options={{ title: 'Cloud & notifications' }} />
      <Stack.Screen name="prepa" options={{ title: 'Préparation' }} />
      <Stack.Screen name="ressenti-seance" options={{ presentation: 'modal', title: 'Ressenti' }} />
      <Stack.Screen name="sondage/[id]" options={{ title: 'Questionnaire' }} />
      <Stack.Screen name="sondage/edit" options={{ presentation: 'modal', title: 'Questionnaire' }} />
      <Stack.Screen name="objectif/[id]" options={{ title: 'Point à travailler' }} />
      <Stack.Screen name="objectif/edit" options={{ presentation: 'modal', title: 'Point à travailler' }} />
      <Stack.Screen name="seance/[id]" options={{ title: 'Séance' }} />
      <Stack.Screen name="seance/edit" options={{ presentation: 'modal', title: 'Séance' }} />
      <Stack.Screen name="media/[id]" options={{ title: 'Vidéo' }} />
      <Stack.Screen name="media/edit" options={{ presentation: 'modal', title: 'Média' }} />
      <Stack.Screen name="questions/edit" options={{ presentation: 'modal', title: 'Question' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <DataProvider>
      <CloudSync>
        <StatusBar style="auto" />
        <RootStack />
      </CloudSync>
    </DataProvider>
  );
}
