import { router } from 'expo-router';
import { Button, Empty, Screen } from './ui';

/** Écran affiché quand un joueur tente d'ouvrir une page réservée au coach. */
export function Locked({ text = 'Cette page est réservée au coach.' }: { text?: string }) {
  return (
    <Screen>
      <Empty icon="lock-closed-outline" text={text} action={<Button title="Retour à l’accueil" icon="home" onPress={() => router.replace('/')} />} />
    </Screen>
  );
}
