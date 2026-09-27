import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { linkThumbnail, MEDIA_KIND_ICON } from '@/lib/media';
import { formatDate } from '@/lib/stats';
import type { MediaItem } from '@/lib/types';
import { shadow, useTheme } from './theme';

const CATEGORY_GRADIENT: Record<MediaItem['category'], [string, string]> = {
  Match: ['#0B3D2E', '#1FA971'],
  Entraînement: ['#1E3A8A', '#3B82F6'],
  Analyse: ['#4C1D95', '#8B5CF6'],
  Adversaire: ['#7F1D1D', '#EF4444'],
  Exercice: ['#78350F', '#F59E0B'],
  Autre: ['#1F2937', '#6B7280'],
};

export function mediaThumb(m: MediaItem) {
  return m.thumbnail ?? (m.kind === 'photo' ? m.uri : m.kind === 'link' ? linkThumbnail(m.uri) : undefined);
}

/** Vignette 16:9 avec icône lecture, catégorie et nombre de temps forts. */
export function MediaCover({ m, height = 180, rounded = 16 }: { m: MediaItem; height?: number; rounded?: number }) {
  const thumb = mediaThumb(m);
  return (
    <View style={{ height, borderRadius: rounded, overflow: 'hidden' }}>
      <LinearGradient colors={CATEGORY_GRADIENT[m.category]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {thumb ? <Image source={thumb} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: height > 120 ? 58 : 38, height: height > 120 ? 58 : 38, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={m.kind === 'video' ? 'play' : m.kind === 'photo' ? 'expand' : 'open-outline'} size={height > 120 ? 28 : 18} color="#0B3D2E" style={m.kind === 'video' ? { marginLeft: 3 } : undefined} />
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
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
      style={({ pressed }) => [
        { backgroundColor: t.card, borderRadius: 20, overflow: 'hidden', borderWidth: t.dark ? 1 : 0, borderColor: t.border, opacity: pressed ? 0.9 : 1 },
        shadow(t),
      ]}
    >
      <MediaCover m={m} rounded={0} />
      <View style={{ padding: 14, gap: 4 }}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }} numberOfLines={2}>
          {m.title}
        </Text>
        <Text style={{ color: t.muted, fontSize: 13 }} numberOfLines={1}>
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
          <MediaCover m={m} height={112} rounded={14} />
          <Text style={{ color: t.text, fontWeight: '600', fontSize: 13 }} numberOfLines={2}>
            {m.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
