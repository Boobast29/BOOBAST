import { Platform, useColorScheme } from 'react-native';
import type { ViewStyle } from 'react-native';

const light = {
  dark: false,
  bg: '#F3F5F4',
  card: '#FFFFFF',
  cardAlt: '#F8FAF9',
  text: '#0F1B17',
  muted: '#6B7A74',
  border: '#E3E8E6',
  primary: '#107B2D',
  primaryText: '#FFFFFF',
  primarySoft: '#DCF2E1',
  accent: '#F5B400',
  accentSoft: '#FFF4CC',
  danger: '#DC3B2F',
  dangerSoft: '#FDE6E3',
  warning: '#C2610C',
  warningSoft: '#FEEFD9',
  info: '#2563EB',
  infoSoft: '#DDE8FE',
  violet: '#7C3AED',
  violetSoft: '#EDE4FE',
  input: '#F4F7F6',
  /** Dégradé du bandeau d'accueil */
  hero: ['#0A4A1B', '#107B2D', '#1E9A45'] as readonly [string, string, ...string[]],
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.75)',
};

const dark: typeof light = {
  dark: true,
  bg: '#0A0F0D',
  card: '#141C19',
  cardAlt: '#18221E',
  text: '#EEF3F1',
  muted: '#8FA19A',
  border: '#24302B',
  primary: '#3DCB6B',
  primaryText: '#04130A',
  primarySoft: '#0E2E17',
  accent: '#FACC15',
  accentSoft: '#332A08',
  danger: '#F87171',
  dangerSoft: '#3A1614',
  warning: '#FB923C',
  warningSoft: '#3A230D',
  info: '#60A5FA',
  infoSoft: '#12254A',
  violet: '#A78BFA',
  violetSoft: '#241A40',
  input: '#1B2521',
  hero: ['#062A10', '#0B5A22', '#107B2D'],
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.7)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Ombre douce multi-plateforme */
export function shadow(t: Theme, level: 1 | 2 = 1): ViewStyle {
  if (t.dark) return {};
  if (Platform.OS === 'android') return { elevation: level * 2 };
  return {
    shadowColor: '#0A4A1B',
    shadowOpacity: level === 1 ? 0.06 : 0.12,
    shadowRadius: level === 1 ? 10 : 18,
    shadowOffset: { width: 0, height: level === 1 ? 3 : 8 },
  };
}

const AVATAR_COLORS = ['#107B2D', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#0891B2', '#65A30D', '#CA8A04', '#DC2626', '#4F46E5'];

/** Couleur stable par joueur */
export function colorFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
