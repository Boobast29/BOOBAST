import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps, ViewStyle } from 'react-native';
import { colorFor, shadow, useTheme } from './theme';
import type { Theme } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'violet' | 'accent' | 'neutral';

export function toneColors(t: Theme, tone: Tone): [bg: string, fg: string] {
  switch (tone) {
    case 'success':
      return [t.primarySoft, t.primary];
    case 'danger':
      return [t.dangerSoft, t.danger];
    case 'warning':
      return [t.warningSoft, t.warning];
    case 'info':
      return [t.infoSoft, t.info];
    case 'violet':
      return [t.violetSoft, t.violet];
    case 'accent':
      return [t.accentSoft, t.dark ? t.accent : '#8A6500'];
    default:
      return [t.input, t.muted];
  }
}

/** Petit retour haptique (ignoré sur le web). */
export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export function Screen({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  const t = useTheme();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[padded && { padding: 16, gap: 12 }, { paddingBottom: 48 }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, onPress, stripe }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; stripe?: string }) {
  const t = useTheme();
  const s = [
    styles.card,
    { backgroundColor: t.card, borderColor: t.border, borderWidth: t.dark ? 1 : 0 },
    shadow(t),
    stripe ? { borderLeftWidth: 4, borderLeftColor: stripe } : null,
    style,
  ];
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...s, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }]}>
        {children}
      </Pressable>
    );
  return <View style={s}>{children}</View>;
}

export function Title({ children, color }: { children: ReactNode; color?: string }) {
  const t = useTheme();
  return <Text style={[styles.title, { color: color ?? t.text }]}>{children}</Text>;
}

export function Section({ children, action, icon }: { children: ReactNode; action?: ReactNode; icon?: IconName }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        {icon ? <Ionicons name={icon} size={15} color={t.muted} /> : null}
        <Text style={[styles.section, { color: t.muted }]}>{children}</Text>
      </View>
      {action}
    </View>
  );
}

export function Link({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color: t.primary, fontWeight: '600', fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

export function Txt({ children, muted, bold, size, color, numberOfLines }: { children: ReactNode; muted?: boolean; bold?: boolean; size?: number; color?: string; numberOfLines?: number }) {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={{ color: color ?? (muted ? t.muted : t.text), fontWeight: bold ? '600' : '400', fontSize: size ?? 15 }}>
      {children}
    </Text>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Button({ title, onPress, kind = 'primary', disabled, icon, small }: { title: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; icon?: IconName; small?: boolean }) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.primary : kind === 'danger' ? t.dangerSoft : kind === 'ghost' ? 'transparent' : t.card;
  const fg = kind === 'primary' ? t.primaryText : kind === 'danger' ? t.danger : kind === 'ghost' ? t.primary : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        small && { paddingVertical: 9, paddingHorizontal: 14 },
        { backgroundColor: bg, borderColor: kind === 'secondary' ? t.border : 'transparent', opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        kind === 'primary' && !disabled ? shadow(t) : null,
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={t.muted}
        {...props}
        style={[
          styles.input,
          { backgroundColor: t.input, borderColor: t.border, color: t.text },
          props.multiline && { minHeight: 84, textAlignVertical: 'top' },
        ]}
      />
      {hint ? <Text style={{ color: t.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

/** Champ numérique avec boutons − / +. */
export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, icon }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; icon?: IconName }) {
  const t = useTheme();
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const btn = (delta: number, name: IconName, a11y: string) => (
    <Pressable
      onPress={() => {
        tap();
        onChange(clamp(value + delta));
      }}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: pressed ? t.primarySoft : t.input }]}
      accessibilityLabel={`${a11y} ${label}`}
    >
      <Ionicons name={name} size={20} color={t.primary} />
    </Pressable>
  );
  return (
    <View style={styles.stepperRow}>
      {icon ? <Ionicons name={icon} size={18} color={t.muted} /> : null}
      <Text style={[styles.label, { color: t.text, flex: 1 }]}>{label}</Text>
      {btn(-step, 'remove', 'Diminuer')}
      <TextInput
        value={String(value)}
        onChangeText={(s) => {
          const n = parseInt(s.replace(/\D/g, ''), 10);
          onChange(clamp(isNaN(n) ? 0 : n));
        }}
        keyboardType="number-pad"
        style={[styles.stepInput, { color: t.text }]}
      />
      {btn(step, 'add', 'Augmenter')}
    </View>
  );
}

/** Sélecteur d'échelle (ex. 1 à 5, 0 à 10). Appuyer à nouveau sur la valeur l'efface. */
export function Scale({ label, hint, value, onChange, min, max, invertColors }: { label: string; hint?: string; value?: number; onChange: (v: number | undefined) => void; min: number; max: number; invertColors?: boolean }) {
  const t = useTheme();
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const colorFor = (v: number) => {
    const ratio = (v - min) / (max - min);
    const good = invertColors ? 1 - ratio : ratio;
    return good < 0.34 ? t.danger : good < 0.67 ? t.warning : t.primary;
  };
  const compact = values.length > 6;
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[styles.label, { color: t.text, flex: 1 }]}>{label}</Text>
        {value != null ? (
          <View style={[styles.valuePill, { backgroundColor: colorFor(value) }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {value}
              <Text style={{ fontWeight: '400', fontSize: 12 }}>/{max}</Text>
            </Text>
          </View>
        ) : (
          <Text style={{ color: t.muted }}>–</Text>
        )}
      </Row>
      <View style={[styles.scaleRow, compact && { gap: 4 }]}>
        {values.map((v) => {
          const selected = v === value;
          const inRange = value != null && v <= value;
          return (
            <Pressable
              key={v}
              onPress={() => {
                tap();
                onChange(selected ? undefined : v);
              }}
              style={[
                styles.scaleItem,
                compact && { minWidth: 0, flex: 1, paddingHorizontal: 0 },
                {
                  backgroundColor: selected ? colorFor(v) : inRange ? colorFor(value!) + '33' : t.input,
                  borderColor: selected ? colorFor(v) : 'transparent',
                },
              ]}
              accessibilityLabel={`${label} ${v}`}
            >
              <Text style={{ color: selected ? '#fff' : t.text, fontWeight: selected ? '800' : '600', fontSize: compact ? 14 : 15 }}>{v}</Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={{ color: t.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({ label, options, value, onChange, allowEmpty, getLabel = (o) => o }: { label?: string; options: readonly T[]; value?: T; onChange: (v: T | undefined) => void; allowEmpty?: boolean; getLabel?: (o: T) => string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={[styles.label, { color: t.text }]}>{label}</Text> : null}
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => {
                tap();
                onChange(selected && allowEmpty ? undefined : o);
              }}
              style={[styles.chip, { borderColor: selected ? t.primary : 'transparent', backgroundColor: selected ? t.primarySoft : t.input }]}
            >
              <Text style={{ color: selected ? t.primary : t.text, fontWeight: selected ? '700' : '500' }}>{getLabel(o)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Sélection multiple sous forme de pastilles. */
export function MultiChips<T extends string>({ label, options, values, onChange, getLabel = (o) => o }: { label?: string; options: readonly T[]; values: T[]; onChange: (v: T[]) => void; getLabel?: (o: T) => string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={[styles.label, { color: t.text }]}>{label}</Text> : null}
      <View style={styles.chips}>
        {options.map((o) => {
          const on = values.includes(o);
          return (
            <Pressable
              key={o}
              onPress={() => {
                tap();
                onChange(on ? values.filter((x) => x !== o) : [...values, o]);
              }}
              style={[styles.chip, { borderColor: on ? t.primary : 'transparent', backgroundColor: on ? t.primarySoft : t.input, flexDirection: 'row', gap: 4, alignItems: 'center' }]}
            >
              {on ? <Ionicons name="checkmark" size={15} color={t.primary} /> : null}
              <Text style={{ color: on ? t.primary : t.text, fontWeight: on ? '700' : '500' }}>{getLabel(o)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange, icon }: { label: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', minHeight: 40 }}>
      {icon ? <Ionicons name={icon} size={18} color={t.muted} /> : null}
      <Text style={[styles.label, { color: t.text, flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(v) => {
          tap();
          onChange(v);
        }}
        trackColor={{ true: t.primary }}
      />
    </Row>
  );
}

export function Badge({ text, tone = 'neutral', icon }: { text: string; tone?: Tone; icon?: IconName }) {
  const t = useTheme();
  const [bg, fg] = toneColors(t, tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function IconCircle({ icon, tone = 'success', size = 40 }: { icon: IconName; tone?: Tone; size?: number }) {
  const t = useTheme();
  const [bg, fg] = toneColors(t, tone);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.5} color={fg} />
    </View>
  );
}

export function StatBox({ label, value, icon, tone = 'neutral' }: { label: string; value: string | number; icon?: IconName; tone?: Tone }) {
  const t = useTheme();
  const [, fg] = toneColors(t, tone);
  return (
    <View style={[styles.statBox, { backgroundColor: t.card, borderColor: t.border, borderWidth: t.dark ? 1 : 0 }, shadow(t)]}>
      {icon ? <IconCircle icon={icon} tone={tone} size={30} /> : null}
      <Text style={{ color: tone === 'neutral' ? t.text : fg, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function Empty({ text, action, icon = 'sparkles-outline' }: { text: string; action?: ReactNode; icon?: IconName }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 14 }}>
      <IconCircle icon={icon} tone="success" size={64} />
      <Text style={{ color: t.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 }}>{text}</Text>
      {action}
    </View>
  );
}

export function Avatar({ label, colorKey, size = 44, ring }: { label: string; colorKey?: string; size?: number; ring?: string }) {
  const c = colorFor(colorKey ?? label);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 3 : 0,
        borderColor: ring,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{label}</Text>
    </View>
  );
}

/** Bandeau en dégradé (haut de l'accueil, fiche joueur…). */
export function Hero({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow(t, 2), style]}>
      {children}
    </LinearGradient>
  );
}

/** Bouton icône pour la barre de titre. */
export function HeaderButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityLabel={label} style={{ marginHorizontal: Platform.OS === 'web' ? 16 : 0 }}>
      <Ionicons name={icon} size={24} color={t.primary} />
    </Pressable>
  );
}

/** Chiffre clé affiché sur un bandeau en dégradé. */
export function HeroStat({ value, label }: { value: string | number; label: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: t.heroText, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: t.heroMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** Raccourci carré avec icône (actions rapides). */
export function ActionTile({ icon, label, onPress, tone = 'success' }: { icon: IconName; label: string; onPress: () => void; tone?: Tone }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.card, borderColor: t.border, borderWidth: t.dark ? 1 : 0, opacity: pressed ? 0.8 : 1 },
        shadow(t),
      ]}
    >
      <IconCircle icon={icon} tone={tone} size={42} />
      <Text style={{ color: t.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Barre de progression */
export function Progress({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const t = useTheme();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: t.border, overflow: 'hidden' }}>
      <View style={{ height, width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color ?? t.primary, borderRadius: height / 2 }} />
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 2 }} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  section: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  label: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  btn: { borderRadius: 14, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexDirection: 'row', gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepInput: { width: 48, height: 40, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleItem: { minWidth: 44, height: 42, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  valuePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 },
  statBox: { flex: 1, minWidth: 72, alignSelf: 'stretch', justifyContent: 'center', borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  hero: { borderRadius: 24, padding: 20, gap: 14, overflow: 'hidden' },
  tile: { flex: 1, minWidth: 72, alignSelf: 'stretch', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 8 },
});
