import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Jauge circulaire animée (0–1), valeur au centre. */
export function Ring({ value, label, display, color, size = 92, stroke = 10 }: { value?: number; label: string; display: string; color?: string; size?: number; stroke?: number }) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, value ?? 0)), { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [value, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - progress.value) }));
  const c = color ?? ((value ?? 0) < 0.4 ? t.danger : (value ?? 0) < 0.65 ? t.warning : t.primary);
  return (
    <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.border} strokeWidth={stroke} fill="none" />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={c} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} animatedProps={animatedProps} />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Text style={{ color: t.text, fontWeight: '900', fontSize: size * 0.22 }}>{display}</Text>
        </View>
      </View>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
