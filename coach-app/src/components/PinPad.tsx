import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { PIN_LENGTH } from '@/lib/auth';
import { useTheme } from './theme';
import { tap } from './ui';

/**
 * Pavé numérique pour saisir un code à 4 chiffres. `onComplete` renvoie `false` si le code est
 * refusé : les points tremblent et la saisie est effacée.
 */
export function PinPad({ title, subtitle, onComplete, footer }: { title: string; subtitle?: string; onComplete: (pin: string) => Promise<boolean | void> | boolean | void; footer?: React.ReactNode }) {
  const t = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    let cancelled = false;
    Promise.resolve(onComplete(pin)).then((ok) => {
      if (cancelled) return;
      if (ok === false) {
        setError(true);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      } else setPin('');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const press = (d: string) => {
    tap();
    setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <View style={{ alignItems: 'center', gap: 22 }}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
        {subtitle ? <Text style={{ color: error ? t.danger : t.muted, fontSize: 14, textAlign: 'center' }}>{error ? 'Code incorrect' : subtitle}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 18, transform: [{ translateX: error ? 6 : 0 }] }}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: error ? t.danger : t.primary,
              backgroundColor: i < pin.length ? (error ? t.danger : t.primary) : 'transparent',
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 288, justifyContent: 'center', gap: 16 }}>
        {keys.map((k, i) =>
          k === '' ? (
            <View key={i} style={{ width: 80, height: 64 }} />
          ) : (
            <Pressable
              key={i}
              onPress={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : press(k))}
              accessibilityLabel={k === 'del' ? 'Effacer' : k}
              style={({ pressed }) => ({
                width: 80,
                height: 64,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: k === 'del' ? 'transparent' : pressed ? t.primarySoft : t.card,
                borderWidth: k === 'del' || !t.dark ? 0 : 1,
                borderColor: t.border,
              })}
            >
              {k === 'del' ? <Ionicons name="backspace-outline" size={26} color={t.text} /> : <Text style={{ color: t.text, fontSize: 28, fontWeight: '600' }}>{k}</Text>}
            </Pressable>
          ),
        )}
      </View>
      {footer}
    </View>
  );
}
