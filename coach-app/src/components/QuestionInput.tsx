import { Pressable, Text, View } from 'react-native';
import { useTheme } from './theme';
import { Chips, Field, Scale, Stepper } from './ui';
import type { Answer, CustomQuestion } from '@/lib/types';

/** Champ de réponse adapté au type de la question personnalisée. */
export function QuestionInput({ q: raw, value, onChange }: { q: CustomQuestion; value?: Answer; onChange: (v: Answer | undefined) => void }) {
  const t = useTheme();
  const q = raw.required ? { ...raw, label: `${raw.label} *` } : raw;
  switch (q.type) {
    case 'scale': {
      const min = q.min ?? 1;
      const max = q.max ?? 5;
      const hint = [q.minLabel && `${min} = ${q.minLabel}`, q.maxLabel && `${max} = ${q.maxLabel}`, q.help].filter(Boolean).join(' · ');
      return <Scale label={q.label} hint={hint || undefined} value={typeof value === 'number' ? value : undefined} onChange={onChange} min={min} max={max} />;
    }
    case 'yesno':
      return (
        <View style={{ gap: 6 }}>
          <Chips
            label={q.label}
            options={['Oui', 'Non'] as const}
            value={value === true ? 'Oui' : value === false ? 'Non' : undefined}
            onChange={(v) => onChange(v === undefined ? undefined : v === 'Oui')}
            allowEmpty
          />
          {q.help ? <Text style={{ color: t.muted, fontSize: 12 }}>{q.help}</Text> : null}
        </View>
      );
    case 'choice':
      return (
        <View style={{ gap: 6 }}>
          <Chips label={q.label} options={q.options ?? []} value={typeof value === 'string' ? value : undefined} onChange={onChange} allowEmpty />
          {q.help ? <Text style={{ color: t.muted, fontSize: 12 }}>{q.help}</Text> : null}
        </View>
      );
    case 'multi': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <View style={{ gap: 6 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '500' }}>{q.label}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(q.options ?? []).map((o) => {
              const on = selected.includes(o);
              return (
                <Pressable
                  key={o}
                  onPress={() => {
                    const next = on ? selected.filter((x) => x !== o) : [...selected, o];
                    onChange(next.length ? next : undefined);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: on ? t.primary : t.border, backgroundColor: on ? t.primarySoft : t.input }}
                >
                  <Text style={{ color: on ? t.primary : t.text, fontWeight: on ? '600' : '400' }}>
                    {on ? '✓ ' : ''}
                    {o}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: t.muted, fontSize: 12 }}>{q.help ?? 'Plusieurs réponses possibles'}</Text>
        </View>
      );
    }
    case 'number':
      return <Stepper label={q.label} value={typeof value === 'number' ? value : 0} onChange={onChange} max={999} />;
    case 'text':
      return <Field label={q.label} hint={q.help} value={typeof value === 'string' ? value : ''} onChangeText={(s) => onChange(s || undefined)} multiline />;
  }
}
