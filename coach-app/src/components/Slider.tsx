import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { useTheme } from './theme';
import { tap } from './ui';

const WORDS = ['Très mauvais', 'Mauvais', 'Moyen', 'Bien', 'Très bien', 'Excellent'];
const WORDS_INVERTED = ['Très faible', 'Faible', 'Moyenne', 'Élevée', 'Très élevée', 'Maximale'];
const COLORS = ['#C62828', '#E65100', '#B7791F', '#558B2F', '#2E7D32', '#1B5E20'] as const;

/**
 * Curseur de ressenti. Le joueur glisse, sans voir de chiffre (des mots) ;
 * le coach voit la note chiffrée (`showValue`). Valeur entière entre `min` et `max`.
 */
export function SliderScale({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  minLabel = 'Très mauvaise',
  maxLabel = 'Exceptionnel',
  showValue,
  invert,
  hint,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  /** Afficher la note (vue coach) */
  showValue?: boolean;
  /** true si une valeur haute est « mauvaise » (ex. intensité, douleur) : couleurs inversées */
  invert?: boolean;
  hint?: string;
}) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const last = useRef<number | undefined>(value);
  const ratio = value == null ? 0.5 : (value - min) / (max - min || 1);
  const good = invert ? 1 - ratio : ratio;
  const idx = Math.min(COLORS.length - 1, Math.floor(good * COLORS.length));
  const color = value == null ? t.muted : COLORS[idx];
  // Mot affiché au joueur : suit la valeur (pas le « bon / mauvais ») pour l'intensité, la douleur…
  const word = invert ? WORDS_INVERTED[Math.min(5, Math.floor(ratio * 6))] : WORDS[idx];

  const pick = (e: GestureResponderEvent) => {
    if (!w) return;
    const x = Math.max(0, Math.min(w, e.nativeEvent.locationX));
    const v = Math.round(min + (x / w) * (max - min));
    if (v !== last.current) {
      last.current = v;
      tap();
      onChange(v);
    }
  };

  const THUMB = 30;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{label}</Text>
        {value == null ? (
          <Text style={{ color: t.muted, fontSize: 12 }}>Glisse le curseur</Text>
        ) : showValue ? (
          <View style={{ backgroundColor: color, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {value}
              <Text style={{ fontWeight: '400', fontSize: 12 }}>/{max}</Text>
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 14, fontWeight: '700', color }}>{word}</Text>
        )}
      </View>
      <View
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={pick}
        onResponderMove={pick}
        style={{ height: THUMB + 8, justifyContent: 'center' }}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const base = value ?? Math.round((min + max) / 2);
          onChange(Math.max(min, Math.min(max, base + (e.nativeEvent.actionName === 'increment' ? 1 : -1))));
        }}
      >
        <View pointerEvents="none" style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: t.border }}>
          {value != null && <View style={{ width: `${ratio * 100}%`, height: 8, backgroundColor: color }} />}
        </View>
        {value != null && w > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: ratio * w - THUMB / 2,
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: '#fff',
              borderWidth: 3,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            {showValue ? <Text style={{ fontSize: 13, fontWeight: '800', color }}>{value}</Text> : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />}
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: t.muted, fontSize: 12 }}>{minLabel}</Text>
        {value != null ? (
          <Pressable onPress={() => { last.current = undefined; onChange(undefined); }} hitSlop={8}>
            <Text style={{ color: t.muted, fontSize: 12, textDecorationLine: 'underline' }}>Effacer</Text>
          </Pressable>
        ) : null}
        <Text style={{ color: t.muted, fontSize: 12 }}>{maxLabel}</Text>
      </View>
      {hint ? <Text style={{ color: t.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}
