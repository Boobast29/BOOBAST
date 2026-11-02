import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import type { Point } from '@/lib/insights';
import { trend } from '@/lib/insights';
import { fmt, formatDate } from '@/lib/stats';
import { useTheme } from './theme';
import { tap } from './ui';

const H = 72;
const PAD = 8;

/**
 * Petite courbe d'évolution d'un indicateur (une seule série, une seule échelle).
 * Toucher la courbe affiche la valeur du point le plus proche.
 */
export function TrendChart({ title, points, min, max, unit, color }: { title: string; points: Point[]; min: number; max: number; unit: string; color?: string }) {
  const t = useTheme();
  const c = color ?? t.primary;
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const valued = points.map((p, i) => ({ ...p, i })).filter((p): p is Point & { i: number; value: number } => typeof p.value === 'number');
  const tr = trend(points);
  const last = valued[valued.length - 1];

  const x = (i: number) => PAD + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - PAD * 2));
  const y = (v: number) => PAD + (1 - (v - min) / (max - min || 1)) * (H - PAD * 2);
  const shown = sel != null ? valued.find((p) => p.i === sel) : undefined;

  const pick = (lx: number) => {
    if (!valued.length || !w) return;
    let best = valued[0];
    for (const p of valued) if (Math.abs(x(p.i) - lx) < Math.abs(x(best.i) - lx)) best = p;
    if (best.i !== sel) tap();
    setSel(best.i);
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>{title}</Text>
          <Text style={{ color: t.muted, fontSize: 12 }} numberOfLines={1}>
            {shown ? `${shown.label} · ${formatDate(shown.date)}` : valued.length >= 2 ? `${valued.length} derniers` : 'Pas encore assez de réponses'}
          </Text>
        </View>
        {(shown ?? last) && (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            {!shown && tr && Math.abs(tr.delta) >= 0.3 ? (
              <Ionicons name={tr.delta > 0 ? 'arrow-up' : 'arrow-down'} size={14} color={t.muted} accessibilityLabel={tr.delta > 0 ? 'en hausse' : 'en baisse'} />
            ) : null}
            <Text style={{ color: t.text, fontSize: 20, fontWeight: '700' }}>{fmt((shown ?? last)!.value)}</Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>{unit}</Text>
          </View>
        )}
      </View>
      {valued.length >= 2 && (
        <Pressable
          onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
          onPressIn={(e) => pick(e.nativeEvent.locationX)}
          onPressOut={() => setTimeout(() => setSel(null), 2500)}
          accessibilityRole="image"
          accessibilityLabel={`${title} : ${valued.map((p) => fmt(p.value)).join(', ')} ${unit}`}
          style={{ height: H }}
        >
          {w > 0 && (
            <Svg width={w} height={H}>
              {/* Repère discret au milieu de l'échelle */}
              <Line x1={PAD} x2={w - PAD} y1={y((min + max) / 2)} y2={y((min + max) / 2)} stroke={t.border} strokeWidth={1} strokeDasharray="3 4" />
              <Polyline points={valued.map((p) => `${x(p.i)},${y(p.value)}`).join(' ')} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {valued.map((p) => {
                const isLast = p === last;
                const on = p.i === sel;
                return (
                  <Circle
                    key={p.i}
                    cx={x(p.i)}
                    cy={y(p.value)}
                    r={on || isLast ? 5 : 3.5}
                    fill={on || isLast ? c : t.card}
                    stroke={on || isLast ? t.card : c}
                    strokeWidth={2}
                  />
                );
              })}
              {shown && <Line x1={x(shown.i)} x2={x(shown.i)} y1={PAD} y2={H - PAD} stroke={t.muted} strokeWidth={1} opacity={0.4} />}
            </Svg>
          )}
        </Pressable>
      )}
    </View>
  );
}
