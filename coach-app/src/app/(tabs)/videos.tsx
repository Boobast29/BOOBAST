import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { MediaCard } from '@/components/Media';
import { ActionTile, Chips, Empty, Field, Row, Screen, Section } from '@/components/ui';
import { MEDIA_CATEGORIES } from '@/lib/constants';
import { visibleMedia } from '@/lib/access';
import { useStore } from '@/lib/store';
import { matchLabel, playerName } from '@/lib/stats';
import type { MediaCategory } from '@/lib/types';

const ALL = 'Toutes';

export default function Videos() {
  const { data, session } = useStore();
  const coach = session?.role === 'coach';
  const media = useMemo(() => visibleMedia(data, session), [data, session]);
  const [cat, setCat] = useState<MediaCategory | typeof ALL>(ALL);
  const [q, setQ] = useState('');
  const matches = useMemo(() => new Map(data.matches.map((m) => [m.id, m])), [data.matches]);
  const players = useMemo(() => new Map(data.players.map((p) => [p.id, p])), [data.players]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return media
      .filter((m) => cat === ALL || m.category === cat)
      .filter((m) => {
        if (!needle) return true;
        const hay = [
          m.title,
          m.notes,
          m.matchId && matches.get(m.matchId)?.opponent,
          ...m.playerIds.map((id) => playerName(players.get(id))),
          ...m.markers.map((k) => k.label),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [media, cat, q, matches, players]);

  const usedCats = MEDIA_CATEGORIES.filter((c) => media.some((m) => m.category === c));
  const add = (source: 'library' | 'camera' | 'link') => router.push({ pathname: '/media/edit', params: { source } });

  return (
    <Screen>
      {coach && (
        <Row style={{ gap: 10 }}>
          <ActionTile icon="images" label="Depuis la galerie" onPress={() => add('library')} />
          <ActionTile icon="videocam" label="Filmer" tone="danger" onPress={() => add('camera')} />
          <ActionTile icon="link" label="Lien YouTube, Drive…" tone="info" onPress={() => add('link')} />
        </Row>
      )}

      {media.length > 3 && <Field label="Rechercher" value={q} onChangeText={setQ} placeholder="Titre, joueur, adversaire, temps fort…" />}
      {usedCats.length > 1 && <Chips options={[ALL, ...usedCats] as const} value={cat} onChange={(v) => v && setCat(v)} />}

      {media.length === 0 ? (
        <Empty
          icon="play-circle-outline"
          text={
            coach
              ? 'Ajoutez vos vidéos de match, séances, exercices ou analyses d’adversaire. Taguez les joueurs et marquez les temps forts pour les retrouver en un clic.'
              : 'Le coach n’a pas encore partagé de vidéo avec toi.'
          }
        />
      ) : list.length === 0 ? (
        <Empty icon="search" text="Aucun résultat." />
      ) : (
        <>
          <Section icon="film-outline">
            {list.length} média{list.length > 1 ? 's' : ''}
          </Section>
          <View style={{ gap: 16 }}>
            {list.map((m) => (
              <MediaCard
                key={m.id}
                m={m}
                subtitle={[
                  m.matchId ? matchLabel(matches.get(m.matchId)).split(' · ')[0] : undefined,
                  m.playerIds.length ? `${m.playerIds.length} joueur${m.playerIds.length > 1 ? 's' : ''}` : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
