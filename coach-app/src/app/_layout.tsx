import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { DataProvider, useStore } from '@/lib/store';

function RootStack() {
  const t = useTheme();
  const { ready } = useStore();
  if (!ready)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.card },
        headerTintColor: t.primary,
        headerTitleStyle: { color: t.text },
        contentStyle: { backgroundColor: t.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="joueur/edit" options={{ presentation: 'modal', title: 'Joueur' }} />
      <Stack.Screen name="joueur/[id]" options={{ title: 'Fiche joueur' }} />
      <Stack.Screen name="match/edit" options={{ presentation: 'modal', title: 'Match' }} />
      <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
      <Stack.Screen name="questionnaire" options={{ presentation: 'modal', title: "Questionnaire d'après-match" }} />
      <Stack.Screen name="blessure/edit" options={{ presentation: 'modal', title: 'Blessure' }} />
      <Stack.Screen name="questions/index" options={{ title: 'Questions perso' }} />
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
