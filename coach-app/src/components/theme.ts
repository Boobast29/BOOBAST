import { useColorScheme } from 'react-native';

const light = {
  bg: '#F2F4F7',
  card: '#FFFFFF',
  text: '#101828',
  muted: '#667085',
  border: '#E4E7EC',
  primary: '#1D6F42',
  primaryText: '#FFFFFF',
  primarySoft: '#E3F2E9',
  danger: '#D92D20',
  dangerSoft: '#FEE4E2',
  warning: '#B54708',
  warningSoft: '#FEF0C7',
  info: '#175CD3',
  infoSoft: '#D1E9FF',
  input: '#F9FAFB',
};

const dark: typeof light = {
  bg: '#0C111D',
  card: '#161B26',
  text: '#F5F5F6',
  muted: '#94969C',
  border: '#2A303C',
  primary: '#3CCB7F',
  primaryText: '#05160C',
  primarySoft: '#123524',
  danger: '#F97066',
  dangerSoft: '#3D1512',
  warning: '#FDB022',
  warningSoft: '#3A2A0A',
  info: '#53B1FD',
  infoSoft: '#0F2A4A',
  input: '#1F242F',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
