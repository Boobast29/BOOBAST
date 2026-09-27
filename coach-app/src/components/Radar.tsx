import { Platform } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import type { Attr } from '@/lib/rating';
import { useTheme } from './theme';

/** Radar des 6 attributs (0–99). Les attributs inconnus sont tracés à 0 et affichés « – ». */
export function Radar({ attrs, size = 260, color }: { attrs: Attr[]; size?: number; color?: string }) {
  const t = useTheme();
  const c = size / 2;
  const r = size * 0.34;
  const n = attrs.length;
  const pt = (i: number, ratio: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * r * ratio, c + Math.sin(a) * r * ratio] as const;
  };
  const ring = (ratio: number) => attrs.map((_, i) => pt(i, ratio).join(',')).join(' ');
  const fill = color ?? t.primary;
  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <Polygon key={k} points={ring(k)} fill={k === 1 ? t.input : 'none'} stroke={t.border} strokeWidth={1} />
      ))}
      {attrs.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <Line key={i} x1={c} y1={c} x2={x} y2={y} stroke={t.border} strokeWidth={1} />;
      })}
      <Polygon points={attrs.map((a, i) => pt(i, (a.value ?? 0) / 99).join(',')).join(' ')} fill={fill} fillOpacity={0.28} stroke={fill} strokeWidth={2.5} />
      {attrs.map((a, i) => {
        const [x, y] = pt(i, (a.value ?? 0) / 99);
        return <Circle key={a.key} cx={x} cy={y} r={4} fill={fill} />;
      })}
      {attrs.map((a, i) => {
        const [x, y] = pt(i, 1.28);
        return (
          <SvgText key={a.key} x={x} y={y} fill={t.text} fontSize={12} fontWeight="800" textAnchor="middle" fontFamily={Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' : undefined}>
            {`${a.key} ${a.value ?? '–'}`}
          </SvgText>
        );
      })}
    </Svg>
  );
}
