import { Text, View } from 'react-native';
import { matchResult } from '@/lib/stats';
import type { Match } from '@/lib/types';
import { useTheme } from './theme';

export function ScorePill({ m, size = 20 }: { m: Match; size?: number }) {
  const t = useTheme();
  const r = matchResult(m);
  const bg = r.tone === 'win' ? t.primarySoft : r.tone === 'loss' ? t.dangerSoft : t.input;
  const fg = r.tone === 'win' ? t.primary : r.tone === 'loss' ? t.danger : t.text;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ color: fg, fontSize: size, fontWeight: '800' }}>{r.text}</Text>
    </View>
  );
}

