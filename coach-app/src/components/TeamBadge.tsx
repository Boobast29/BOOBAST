import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import type { Team } from '@/lib/types';

/** Écusson coloré d'une équipe (initiales : « SA », « U17 »…). */
export function TeamBadge({ team, size = 44 }: { team: Pick<Team, 'name' | 'color'>; size?: number }) {
  const label = teamShort(team.name);
  return (
    <View style={{ width: size, height: size * 1.12, alignItems: 'center' }}>
      <LinearGradient
        colors={[team.color, shade(team.color, -0.35)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size * 1.12,
          borderTopLeftRadius: size * 0.22,
          borderTopRightRadius: size * 0.22,
          borderBottomLeftRadius: size * 0.5,
          borderBottomRightRadius: size * 0.5,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.85)',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * (label.length > 2 ? 0.3 : 0.38), letterSpacing: 0.5 }}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

/** « Seniors A » → « SA », « U17 » → « U17 », « Féminines » → « F ». */
export function teamShort(name: string) {
  const u = name.match(/U\s?\d{1,2}/i);
  if (u) return u[0].replace(/\s/, '').toUpperCase();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + c * amount)));
  const r = f(n >> 16),
    g = f((n >> 8) & 255),
    b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
