import type { ReactNode } from 'react';
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
import { useTheme } from './theme';

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

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const t = useTheme();
  const s = [styles.card, { backgroundColor: t.card, borderColor: t.border }, style];
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...s, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  return <View style={s}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.title, { color: t.text }]}>{children}</Text>;
}

export function Section({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.section, { color: t.muted }]}>{children}</Text>
      {action}
    </View>
  );
}

export function Txt({ children, muted, bold, size, color }: { children: ReactNode; muted?: boolean; bold?: boolean; size?: number; color?: string }) {
  const t = useTheme();
  return (
    <Text style={{ color: color ?? (muted ? t.muted : t.text), fontWeight: bold ? '600' : '400', fontSize: size ?? 15 }}>
      {children}
    </Text>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}

type BtnKind = 'primary' | 'secondary' | 'danger';
export function Button({ title, onPress, kind = 'primary', disabled }: { title: string; onPress: () => void; kind?: BtnKind; disabled?: boolean }) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.primary : kind === 'danger' ? t.dangerSoft : t.card;
  const fg = kind === 'primary' ? t.primaryText : kind === 'danger' ? t.danger : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: kind === 'secondary' ? t.border : bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={{ color: fg, fontWeight: '600', fontSize: 16 }}>{title}</Text>
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
          props.multiline && { minHeight: 80, textAlignVertical: 'top' },
        ]}
      />
      {hint ? <Text style={{ color: t.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

/** Champ numérique avec boutons − / +. */
export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  const t = useTheme();
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <View style={styles.stepperRow}>
      <Text style={[styles.label, { color: t.text, flex: 1 }]}>{label}</Text>
      <Pressable onPress={() => onChange(clamp(value - step))} style={[styles.stepBtn, { borderColor: t.border, backgroundColor: t.input }]} accessibilityLabel={`Diminuer ${label}`}>
        <Text style={{ color: t.text, fontSize: 20 }}>−</Text>
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(s) => {
          const n = parseInt(s.replace(/\D/g, ''), 10);
          onChange(clamp(isNaN(n) ? 0 : n));
        }}
        keyboardType="number-pad"
        style={[styles.stepInput, { color: t.text, borderColor: t.border, backgroundColor: t.input }]}
      />
      <Pressable onPress={() => onChange(clamp(value + step))} style={[styles.stepBtn, { borderColor: t.border, backgroundColor: t.input }]} accessibilityLabel={`Augmenter ${label}`}>
        <Text style={{ color: t.text, fontSize: 20 }}>+</Text>
      </Pressable>
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
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
        <Text style={{ color: t.muted }}>{value ?? '–'}</Text>
      </Row>
      <View style={styles.scaleRow}>
        {values.map((v) => {
          const selected = v === value;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(selected ? undefined : v)}
              style={[styles.scaleItem, { borderColor: selected ? colorFor(v) : t.border, backgroundColor: selected ? colorFor(v) : t.input }]}
              accessibilityLabel={`${label} ${v}`}
            >
              <Text style={{ color: selected ? '#fff' : t.text, fontWeight: '600' }}>{v}</Text>
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
    <View style={{ gap: 6 }}>
      {label ? <Text style={[styles.label, { color: t.text }]}>{label}</Text> : null}
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => onChange(selected && allowEmpty ? undefined : o)}
              style={[styles.chip, { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.primarySoft : t.input }]}
            >
              <Text style={{ color: selected ? t.primary : t.text, fontWeight: selected ? '600' : '400' }}>{getLabel(o)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', minHeight: 40 }}>
      <Text style={[styles.label, { color: t.text, flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.primary }} />
    </Row>
  );
}

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export function Badge({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const t = useTheme();
  const map: Record<Tone, [string, string]> = {
    success: [t.primarySoft, t.primary],
    danger: [t.dangerSoft, t.danger],
    warning: [t.warningSoft, t.warning],
    info: [t.infoSoft, t.info],
    neutral: [t.input, t.muted],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function StatBox({ label, value }: { label: string; value: string | number }) {
  const t = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={{ color: t.text, fontSize: 22, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 16 }}>
      <Text style={{ color: t.muted, textAlign: 'center', fontSize: 15 }}>{text}</Text>
      {action}
    </View>
  );
}

export function Avatar({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: t.primarySoft }]}>
      <Text style={{ color: t.primary, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: 15, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepInput: { width: 56, height: 40, borderRadius: 10, borderWidth: 1, textAlign: 'center', fontSize: 16 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleItem: { minWidth: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  statBox: { flex: 1, minWidth: 72, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, alignItems: 'center', gap: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
