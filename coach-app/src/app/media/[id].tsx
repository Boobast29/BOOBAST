import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoPlayer } from 'expo-video';
import { useState } from 'react';
import { Linking, Platform, Pressable, Share, View } from 'react-native';
import { MediaCover } from '@/components/Media';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Chips, Empty, Field, HeaderButton, Row, Screen, Section, Title, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { Locked } from '@/components/Locked';
import { canSeeMedia } from '@/lib/access';
import { formatTime, parseTime, youtubeId } from '@/lib/media';
import { newId, useStore } from '@/lib/store';
import { formatDate, matchLabel, playerName } from '@/lib/stats';
import type { MediaItem } from '@/lib/types';

/** Place la lecture à un instant donné puis lance la vidéo. */
function playFrom(player: VideoPlayer, seconds: number) {
  player.currentTime = seconds;
  player.play();
}

export default function MediaViewer() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, session, saveMedia } = useStore();
  const coach = session?.role === 'coach';
  const m = data.media.find((x) => x.id === id);
  const player = useVideoPlayer(m?.kind === 'video' ? m.uri : null);

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('');
  const [markerPlayer, setMarkerPlayer] = useState<string>();

  if (!m) return <Empty text="Média introuvable." />;
  if (!canSeeMedia(session, m)) return <Locked text="Cette vidéo n’est pas partagée avec toi." />;

  const players = new Map(data.players.map((p) => [p.id, p]));
  const match = data.matches.find((x) => x.id === m.matchId);
  const markers = [...m.markers].sort((a, b) => a.seconds - b.seconds);

  const open = (seconds?: number) => {
    let url = m.uri;
    if (seconds != null && youtubeId(url)) url = `https://www.youtube.com/watch?v=${youtubeId(url)}&t=${Math.floor(seconds)}s`;
    Linking.openURL(url).catch(() => notify('Impossible d’ouvrir le lien'));
  };

  const seek = (seconds: number) => {
    if (m.kind === 'video') {
      playFrom(player, seconds);
    } else if (m.kind === 'link') open(seconds);
  };

  const startAdding = () => {
    setAdding(true);
    setLabel('');
    setMarkerPlayer(undefined);
    setTime(m.kind === 'video' ? formatTime(player.currentTime) : '');
    if (m.kind === 'video') player.pause();
  };

  const addMarker = () => {
    const seconds = parseTime(time || '0');
    if (seconds == null) return notify('Temps invalide', 'Format attendu : 12:30');
    if (!label.trim()) return notify('Décrivez le temps fort');
    saveMedia({ ...m, markers: [...m.markers, { id: newId(), seconds, label: label.trim(), playerId: markerPlayer }] });
    setAdding(false);
  };

  const removeMarker = (markerId: string) =>
    confirm('Supprimer ce temps fort ?', '', () => saveMedia({ ...m, markers: m.markers.filter((k) => k.id !== markerId) }));

  const share = async () => {
    try {
      if (m.kind === 'link' || /^https?:/.test(m.uri) || Platform.OS === 'web') await Share.share({ message: `${m.title}\n${m.uri}` });
      else if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(m.uri, { dialogTitle: m.title });
    } catch (e) {
      notify('Partage impossible', String((e as Error)?.message ?? e));
    }
  };

  const markerPlayers = (m.playerIds.length ? m.playerIds : data.players.filter((p) => !p.archived).map((p) => p.id)).filter((pid) => players.has(pid));

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: m.category,
          headerRight: !coach ? undefined : () => <HeaderButton icon="create-outline" label="Modifier" onPress={() => router.push({ pathname: '/media/edit', params: { id: m.id } })} />,
        }}
      />

      <Viewer m={m} player={player} onOpen={() => open()} />

      <View style={{ gap: 6 }}>
        <Title>{m.title}</Title>
        <Row style={{ flexWrap: 'wrap' }}>
          <Badge text={m.category} tone="success" icon="pricetag" />
          <Badge text={formatDate(m.date)} icon="calendar-outline" />
          {m.kind === 'link' && <Badge text="Lien externe" tone="info" icon="link" />}
        </Row>
      </View>

      {m.kind === 'link' && <Button title="Ouvrir la vidéo" icon="open-outline" onPress={() => open()} />}

      {match && (
        <Card onPress={coach ? () => router.push(`/match/${match.id}`) : undefined}>
          <Row>
            <Ionicons name="football" size={20} color={t.primary} />
            <Txt bold>{matchLabel(match)}</Txt>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={18} color={t.muted} />
          </Row>
        </Card>
      )}

      {m.notes ? (
        <Card>
          <Row>
            <Ionicons name="document-text-outline" size={18} color={t.muted} />
            <Txt bold>Notes du coach</Txt>
          </Row>
          <Txt>{m.notes}</Txt>
        </Card>
      ) : null}

      {m.kind !== 'photo' && (
        <>
          <Section icon="flag-outline" action={coach && !adding ? <Button small kind="ghost" icon="add" title="Temps fort" onPress={startAdding} /> : undefined}>
            Temps forts ({markers.length})
          </Section>
          {adding && (
            <Card stripe={t.accent}>
              <Field label="Temps" value={time} onChangeText={setTime} placeholder="12:30" keyboardType="numbers-and-punctuation" hint={m.kind === 'video' ? 'Pré-rempli avec la position de lecture' : undefined} />
              <Field label="Description" value={label} onChangeText={setLabel} placeholder="Ex. : pressing réussi, but, erreur de placement…" autoFocus />
              {markerPlayers.length > 0 && (
                <Chips label="Joueur (optionnel)" options={markerPlayers} value={markerPlayer} onChange={setMarkerPlayer} getLabel={(pid) => playerName(players.get(pid))} allowEmpty />
              )}
              <Row>
                <View style={{ flex: 1 }}>
                  <Button small kind="secondary" title="Annuler" onPress={() => setAdding(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button small title="Ajouter" icon="checkmark" onPress={addMarker} />
                </View>
              </Row>
            </Card>
          )}
          {coach && markers.length === 0 && !adding && (
            <Txt muted size={14}>
              Repérez les actions clés (buts, erreurs, bons placements) pour y revenir en un appui pendant la séance vidéo.
            </Txt>
          )}
          {markers.map((k) => (
            <Card key={k.id} onPress={() => seek(k.seconds)} style={{ paddingVertical: 12 }}>
              <Row>
                <View style={{ backgroundColor: t.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, minWidth: 58, alignItems: 'center' }}>
                  <Txt bold color={t.dark ? t.accent : '#8A6500'}>
                    {formatTime(k.seconds)}
                  </Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt bold>{k.label}</Txt>
                  {k.playerId && players.has(k.playerId) ? <Txt muted size={13}>{playerName(players.get(k.playerId))}</Txt> : null}
                </View>
                {coach ? (
                  <Pressable onPress={() => removeMarker(k.id)} hitSlop={10} accessibilityLabel="Supprimer le temps fort">
                    <Ionicons name="close-circle-outline" size={22} color={t.muted} />
                  </Pressable>
                ) : (
                  <Ionicons name="play-circle" size={24} color={t.primary} />
                )}
              </Row>
            </Card>
          ))}
        </>
      )}

      {coach && m.playerIds.length > 0 && (
        <>
          <Section icon="people-outline">Joueurs concernés</Section>
          <Card>
            {m.playerIds
              .filter((pid) => players.has(pid))
              .map((pid) => {
                const p = players.get(pid)!;
                return (
                  <Pressable key={pid} onPress={() => router.push(`/joueur/${pid}`)}>
                    <Row>
                      <Avatar size={34} colorKey={p.id} photo={p.photoUri} label={p.number != null ? String(p.number) : p.firstName[0] ?? '?'} />
                      <Txt bold>{playerName(p)}</Txt>
                      <View style={{ flex: 1 }} />
                      <Txt muted size={13}>
                        {m.markers.filter((k) => k.playerId === pid).length || ''}
                      </Txt>
                      <Ionicons name="chevron-forward" size={18} color={t.muted} />
                    </Row>
                  </Pressable>
                );
              })}
          </Card>
        </>
      )}

      <Row>
        <View style={{ flex: 1 }}>
          <Button kind="secondary" icon="share-outline" title="Partager" onPress={share} />
        </View>
        {coach && (
          <View style={{ flex: 1 }}>
            <Button kind="secondary" icon="create-outline" title="Modifier" onPress={() => router.push({ pathname: '/media/edit', params: { id: m.id } })} />
          </View>
        )}
      </Row>
    </Screen>
  );
}

function Viewer({ m, player, onOpen }: { m: MediaItem; player: VideoPlayer; onOpen: () => void }) {
  if (m.kind === 'video')
    return (
      <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 16 / 9 }}>
        <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} allowsPictureInPicture />
      </View>
    );
  if (m.kind === 'photo')
    return (
      <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' }}>
        <Image source={m.uri} style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="contain" />
      </View>
    );
  return (
    <Pressable onPress={onOpen}>
      <MediaCover m={m} height={200} />
    </Pressable>
  );
}
