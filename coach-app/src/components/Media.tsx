import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { linkThumbnail, MEDIA_KIND_ICON } from '@/lib/media';
import { formatDate } from '@/lib/stats';
import type { MediaItem } from '@/lib/types';
import { useTheme } from './theme';

/** Fond uni (sobre) quand la vidéo n'a pas de vignette. */
const CATEGORY_BG: Record<MediaItem['category'], string> = {
  Match: '#14452A',
  Entraînement: '#1D3557',
  Analyse: '#33294F',
  Adversaire: '#4E2323',
  Exercice: '#4A3418',
  Autre: '#2A2F33',
};

export function mediaThumb(m: MediaItem) {
  return m.thumbnail ?? (m.kind === 'photo' ? m.uri : m.kind === 'link' ? linkThumbnail(m.uri) : undefined);
}

/** Vignette 16:9 avec icône lecture, catégorie et nombre de temps forts. */
export function MediaCover({ m, height = 180, rounded = 12 }: { m: MediaItem; height?: number; rounded?: number }) {
  const thumb = mediaThumb(m);
  return (
    <View style={{ height, borderRadius: rounded, overflow: 'hidden', backgroundColor: CATEGORY_BG[m.category] }}>
      {thumb ? <Image source={thumb} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      {thumb ? <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} /> : null}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: height > 140 ? 52 : 36, height: height > 140 ? 52 : 36, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={m.kind === 'video' ? 'play' : m.kind === 'photo' ? 'expand' : 'open-outline'} size={height > 140 ? 24 : 17} color="#14452A" style={m.kind === 'video' ? { marginLeft: 2 } : undefined} />
        </View>
      </View>
      <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 6 }}>
        <Pill icon={MEDIA_KIND_ICON[m.kind]} text={m.category} />
      </View>
      {m.markers.length > 0 && (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <Pill icon="flag" text={String(m.markers.length)} />
        </View>
      )}
    </View>
  );
}

function Pill({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
      <Ionicons name={icon} size={12} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

/** Carte vidéo pleine largeur (vidéothèque). */
export function MediaCard({ m, subtitle }: { m: MediaItem; subtitle?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.push(`/media/${m.id}`)}
      style={({ pressed }) => ({ gap: 6, opacity: pressed ? 0.8 : 1 })}
    >
      <MediaCover m={m} height={118} />
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>
          {m.title}
        </Text>
        <Text style={{ color: t.muted, fontSize: 12 }} numberOfLines={1}>
          {[formatDate(m.date), subtitle].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

/** Bandeau horizontal de vignettes (fiche joueur, match). */
export function MediaStrip({ items }: { items: MediaItem[] }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 2 }}>
      {items.map((m) => (
        <Pressable key={m.id} onPress={() => router.push(`/media/${m.id}`)} style={{ width: 200, gap: 6 }}>
          <MediaCover m={m} height={112} />
          <Text style={{ color: t.text, fontWeight: '600', fontSize: 13 }} numberOfLines={2}>
            {m.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
