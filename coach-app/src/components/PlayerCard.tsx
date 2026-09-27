import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { playerAttributes, POSITION_SHORT, tierFor } from '@/lib/rating';
import type { AppData, Player } from '@/lib/types';
import { ClubLogo } from './ClubLogo';
import { colorFor } from './theme';

/** Carte joueur façon « Ultimate Team » : note globale, poste, photo, 6 attributs. */
export function PlayerCard({ data, player, width = 230 }: { data: AppData; player: Player; width?: number }) {
  const { attrs, overall } = playerAttributes(data, player);
  const tier = tierFor(overall);
  const h = width * 1.42;
  const photo = player.photoUri;
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={{ width, height: h, alignSelf: 'center' }}>
      <LinearGradient
        colors={tier.colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          flex: 1,
          borderRadius: width * 0.12,
          borderTopLeftRadius: width * 0.3,
          borderTopRightRadius: width * 0.3,
          padding: width * 0.07,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        {/* Reflet */}
        <View style={{ position: 'absolute', width: width * 1.4, height: width * 0.5, backgroundColor: 'rgba(255,255,255,0.14)', transform: [{ rotate: '-28deg' }], top: width * 0.15, left: -width * 0.3 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ alignItems: 'center', marginTop: width * 0.08 }}>
            <Text style={{ color: tier.text, fontSize: width * 0.2, fontWeight: '900', lineHeight: width * 0.22 }}>{overall ?? '–'}</Text>
            <Text style={{ color: tier.text, fontSize: width * 0.075, fontWeight: '800' }}>{POSITION_SHORT[player.position ?? ''] ?? '—'}</Text>
            <View style={{ marginTop: 6 }}>
              <ClubLogo size={width * 0.15} />
            </View>
            {player.number != null && <Text style={{ color: tier.text, fontSize: width * 0.07, fontWeight: '900', marginTop: 4 }}>#{player.number}</Text>}
          </View>
          <Animated.View entering={FadeIn.delay(250)} style={{ marginTop: width * 0.04 }}>
            {photo ? (
              <Image source={photo} contentFit="cover" style={{ width: width * 0.56, height: width * 0.56, borderRadius: width * 0.28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' }} />
            ) : (
              <View style={{ width: width * 0.56, height: width * 0.56, borderRadius: width * 0.28, backgroundColor: colorFor(player.id), alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: width * 0.2 }}>{`${player.firstName[0] ?? ''}${player.lastName[0] ?? ''}`.toUpperCase()}</Text>
              </View>
            )}
          </Animated.View>
        </View>
        <Text style={{ color: tier.text, textAlign: 'center', fontSize: width * 0.1, fontWeight: '900', marginTop: width * 0.04, letterSpacing: 0.5 }} numberOfLines={1}>
          {(player.lastName || player.firstName).toUpperCase()}
        </Text>
        <View style={{ height: 1.5, backgroundColor: tier.text, opacity: 0.35, marginVertical: width * 0.03, marginHorizontal: width * 0.06 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: width * 0.04 }}>
          {attrs.map((a) => (
            <View key={a.key} style={{ width: '48%', flexDirection: 'row', gap: 6, alignItems: 'baseline', marginBottom: 2 }}>
              <Text style={{ color: tier.text, fontWeight: '900', fontSize: width * 0.085, width: width * 0.14, textAlign: 'right' }}>{a.value ?? '–'}</Text>
              <Text style={{ color: tier.text, fontWeight: '700', fontSize: width * 0.065, opacity: 0.85 }}>{a.key}</Text>
            </View>
          ))}
        </View>
        <Text style={{ position: 'absolute', bottom: width * 0.05, alignSelf: 'center', color: tier.text, opacity: 0.6, fontSize: width * 0.045, fontWeight: '800', letterSpacing: 2 }}>
          {tier.name.toUpperCase()}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}
