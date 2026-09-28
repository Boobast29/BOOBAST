import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { FORMATIONS } from '@/lib/formations';
import type { Player } from '@/lib/types';

export type TokenInfo = {
  player: Player;
  /** Forme moyenne /5 */
  form?: number;
  injured?: 'active' | 'reprise';
  pain?: boolean;
};

type Props = {
  formation: string;
  slots: (string | null)[];
  info: Map<string, TokenInfo>;
  captainId?: string;
  selectedIndex?: number | null;
  highlightId?: string;
  onSlotPress?: (index: number) => void;
  onSlotLongPress?: (index: number) => void;
  /** Bandeau affiché en haut du terrain (ex. adversaire) */
  caption?: string;
  logo?: React.ReactNode;
};

const LINE = 'rgba(255,255,255,0.55)';

/** Terrain de foot vu de dessus avec les joueurs placés selon la formation. */
export const Pitch = forwardRef<View, Props>(function Pitch(
  { formation, slots, info, captainId, selectedIndex, highlightId, onSlotPress, onSlotLongPress, caption, logo },
  ref,
) {
  const [w, setW] = useState(0);
  const h = w * 1.42;
  const def = FORMATIONS[formation] ?? [];
  const token = Math.max(40, Math.min(54, w / 7.4));

  return (
    <View ref={ref} collapsable={false} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', borderRadius: 22, overflow: 'hidden', backgroundColor: '#0C4A1C' }}>
      {caption || logo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
          {logo}
          {caption ? (
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3, flex: 1 }} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
      ) : null}
      <LinearGradient colors={['#1F8A3B', '#15692C']} style={{ height: h || 480 }}>
        {/* Bandes de tonte */}
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: (i * (h || 480)) / 10, height: (h || 480) / 10, backgroundColor: i % 2 ? 'rgba(255,255,255,0.045)' : 'transparent' }} />
        ))}
        {w > 0 && (
          <>
            {/* Lignes */}
            <View style={[styles.line, { left: 10, right: 10, top: 10, bottom: 10, borderWidth: 2 }]} />
            <View style={[styles.line, { left: 10, right: 10, top: h / 2 - 1, height: 2, backgroundColor: LINE }]} />
            <View style={[styles.line, { width: w * 0.28, height: w * 0.28, borderRadius: w, borderWidth: 2, left: w * 0.36, top: h / 2 - w * 0.14 }]} />
            <View style={{ position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: LINE, left: w / 2 - 3.5, top: h / 2 - 3.5 }} />
            {[0, 1].map((top) => (
              <View key={top}>
                <View style={[styles.line, { width: w * 0.58, height: h * 0.15, left: w * 0.21, borderWidth: 2, ...(top ? { top: 10 } : { top: h - 10 - h * 0.15 }) }]} />
                <View style={[styles.line, { width: w * 0.28, height: h * 0.055, left: w * 0.36, borderWidth: 2, ...(top ? { top: 10 } : { top: h - 10 - h * 0.055 }) }]} />
                <View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: LINE, left: w / 2 - 3, top: top ? 10 + h * 0.105 : h - 10 - h * 0.105 - 6 }} />
                <View style={{ position: 'absolute', width: w * 0.18, height: 5, left: w * 0.41, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 2, top: top ? 5 : h - 10 }} />
              </View>
            ))}

            {/* Joueurs */}
            {def.map((s, i) => {
              const id = slots[i];
              const ti = id ? info.get(id) : undefined;
              const left = s.x * (w - 20) + 10;
              const top = (1 - s.y) * (h - 20) + 10;
              return (
                <Pressable
                  key={i}
                  onPress={onSlotPress ? () => onSlotPress(i) : undefined}
                  onLongPress={onSlotLongPress ? () => onSlotLongPress(i) : undefined}
                  disabled={!onSlotPress}
                  style={{ position: 'absolute', left: left - 45, top: top - token / 2 - 4, width: 90, alignItems: 'center' }}
                  accessibilityLabel={ti ? `${s.role} ${ti.player.firstName} ${ti.player.lastName}` : `Poste ${s.role} libre`}
                >
                  {ti ? (
                    <Token
                      ti={ti}
                      role={s.role}
                      size={token}
                      captain={captainId === id}
                      selected={selectedIndex === i}
                      highlight={highlightId === id}
                      keeper={s.group === 'Gardien'}
                    />
                  ) : (
                    <EmptySlot role={s.role} size={token} selected={selectedIndex === i} editable={!!onSlotPress} />
                  )}
                </Pressable>
              );
            })}
          </>
        )}
      </LinearGradient>
    </View>
  );
});

function formColor(f?: number) {
  if (f == null) return 'rgba(255,255,255,0.6)';
  return f < 2.5 ? '#EF4444' : f < 3.5 ? '#F59E0B' : '#22C55E';
}

function Token({ ti, role, size, captain, selected, highlight, keeper }: { ti: TokenInfo; role: string; size: number; captain: boolean; selected: boolean; highlight: boolean; keeper: boolean }) {
  const shirt = keeper ? '#FACC15' : '#FFFFFF';
  const numberColor = keeper ? '#1F2937' : '#107B2D';
  const glow = selected ? '#FACC15' : highlight ? '#38BDF8' : undefined;
  return (
    <View style={{ alignItems: 'center', transform: [{ scale: selected ? 1.12 : 1 }] }}>
      <View
        style={{
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: glow ? glow + '55' : 'transparent',
          borderWidth: glow ? 2 : 0,
          borderColor: glow,
        }}
      >
        <Ionicons name="shirt" size={size} color={shirt} style={styles.shirtShadow} />
        <Text style={{ position: 'absolute', color: numberColor, fontWeight: '900', fontSize: size * 0.34, top: (size + 8) * 0.36 }}>{ti.player.number ?? role}</Text>
        {/* Forme */}
        <View style={[styles.dot, { left: 2, top: 2, backgroundColor: formColor(ti.form) }]} />
        {captain && (
          <View style={[styles.badge, { right: -2, top: -2, backgroundColor: '#FACC15' }]}>
            <Text style={{ color: '#1F2937', fontSize: 10, fontWeight: '900' }}>C</Text>
          </View>
        )}
        {(ti.injured || ti.pain) && (
          <View style={[styles.badge, { right: -2, bottom: 2, backgroundColor: ti.injured === 'active' ? '#EF4444' : '#F59E0B' }]}>
            <Ionicons name="medical" size={10} color="#fff" />
          </View>
        )}
      </View>
      <View style={[styles.name, highlight && { backgroundColor: '#0284C7' }]}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
          {ti.player.lastName || ti.player.firstName}
        </Text>
      </View>
    </View>
  );
}

function EmptySlot({ role, size, selected, editable }: { role: string; size: number; selected: boolean; editable: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: selected ? '#FACC15' : 'rgba(255,255,255,0.75)',
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 4,
          marginBottom: 4,
        }}
      >
        {editable ? <Ionicons name="add" size={size * 0.45} color="#fff" /> : null}
      </View>
      <View style={styles.name}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{role}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', borderColor: LINE },
  dot: { position: 'absolute', width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  badge: { position: 'absolute', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  name: { marginTop: 1, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, maxWidth: 88 },
  shirtShadow: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
});
