import { Image } from 'expo-image';
import { View } from 'react-native';
import { useStore } from '@/lib/store';

export const DEFAULT_LOGO = require('../../assets/club-logo.png');

/** Logo du club (personnalisable dans Réglages), dans un disque blanc. */
export function ClubLogo({ size = 48, ring = true }: { size?: number; ring?: boolean }) {
  const { data } = useStore();
  const pad = ring ? Math.max(2, size * 0.05) : 0;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: ring ? '#fff' : 'transparent', padding: pad, overflow: 'hidden' }}>
      <Image source={data.logoUri ?? DEFAULT_LOGO} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} contentFit="contain" accessibilityLabel="Logo du club" />
    </View>
  );
}
