import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { MediaCover } from '@/components/Media';
import { Button, Card, Chips, Empty, Field, MultiChips, Row, Screen, Section } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { MEDIA_CATEGORIES } from '@/lib/constants';
import { deleteMediaFile, isDirectVideo, linkThumbnail, pickFromLibrary, recordWithCamera } from '@/lib/media';
import type { PickedMedia } from '@/lib/media';
import { useStore } from '@/lib/store';
import { byDateDesc, isValidDate, matchLabel, playerName, today } from '@/lib/stats';
import type { MediaCategory, MediaItem, MediaKind } from '@/lib/types';
import { View } from 'react-native';

export default function EditMedia() {
  const params = useLocalSearchParams<{ id?: string; source?: 'library' | 'camera' | 'link'; matchId?: string; playerId?: string }>();
  const { data, saveMedia, deleteMedia } = useStore();
  const existing = data.media.find((m) => m.id === params.id);
  const initialMatch = data.matches.find((m) => m.id === params.matchId);

  const [kind, setKind] = useState<MediaKind | undefined>(existing?.kind ?? (params.source === 'link' ? 'link' : undefined));
  const [uri, setUri] = useState(existing?.uri ?? '');
  const [thumbnail, setThumbnail] = useState(existing?.thumbnail);
  const [title, setTitle] = useState(existing?.title ?? (initialMatch ? `${initialMatch.home ? 'vs' : '@'} ${initialMatch.opponent}` : ''));
  const [category, setCategory] = useState<MediaCategory>(existing?.category ?? (initialMatch ? 'Match' : 'Entraînement'));
  const [date, setDate] = useState(existing?.date ?? initialMatch?.date ?? today());
  const [matchId, setMatchId] = useState(existing?.matchId ?? params.matchId);
  const [playerIds, setPlayerIds] = useState<string[]>(existing?.playerIds ?? (params.playerId ? [params.playerId] : []));
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const apply = (p?: PickedMedia) => {
    if (!p) return;
    setKind(p.kind);
    setUri(p.uri);
    setThumbnail(p.thumbnail);
  };
  const pick = (source: 'library' | 'camera') =>
    (source === 'camera' ? recordWithCamera() : pickFromLibrary()).then(apply).catch((e) => notify('Erreur', String(e?.message ?? e)));

  // Ouvre directement la galerie / la caméra à l'arrivée sur l'écran
  const launched = useRef(false);
  useEffect(() => {
    if (existing || launched.current) return;
    launched.current = true;
    if (params.source === 'library' || params.source === 'camera') pick(params.source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentMatches = [...data.matches].sort(byDateDesc).slice(0, 8);
  const activePlayers = data.players.filter((p) => !p.archived || playerIds.includes(p.id));

  const save = () => {
    const url = uri.trim();
    if (!url) return notify(kind === 'link' ? 'Lien manquant' : 'Aucun fichier', kind === 'link' ? 'Collez l’adresse de la vidéo.' : 'Choisissez une vidéo ou une photo.');
    if (kind === 'link' && !/^https?:\/\//i.test(url)) return notify('Lien invalide', 'Le lien doit commencer par http:// ou https://');
    if (!title.trim()) return notify('Titre manquant');
    if (!isValidDate(date)) return notify('Date invalide', 'Format attendu : AAAA-MM-JJ');
    const finalKind: MediaKind = kind === 'link' && isDirectVideo(url) ? 'video' : kind ?? 'video';
    const item = saveMedia({
      ...existing,
      kind: finalKind,
      uri: url,
      thumbnail: finalKind === 'link' ? linkThumbnail(url) : thumbnail,
      title: title.trim(),
      category,
      date,
      matchId,
      playerIds,
      notes: notes.trim() || undefined,
      markers: existing?.markers ?? [],
    });
    if (existing) router.back();
    else router.replace(`/media/${item.id}`);
  };

  const preview: MediaItem | undefined = uri
    ? { id: 'apercu', kind: kind ?? 'video', uri, thumbnail: kind === 'link' ? linkThumbnail(uri) : thumbnail, title, category, date, playerIds, markers: existing?.markers ?? [], createdAt: '' }
    : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Modifier le média' : 'Ajouter un média' }} />

      {preview ? (
        <MediaCover m={preview} height={190} />
      ) : kind !== 'link' ? (
        <Card>
          <Empty icon="cloud-upload-outline" text="Choisissez une vidéo ou une photo, filmez directement, ou collez un lien." />
        </Card>
      ) : null}

      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button small kind="secondary" icon="images-outline" title="Galerie" onPress={() => pick('library')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button small kind="secondary" icon="videocam-outline" title="Filmer" onPress={() => pick('camera')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            small
            kind={kind === 'link' ? 'primary' : 'secondary'}
            icon="link-outline"
            title="Lien"
            onPress={() => {
              setKind('link');
              if (kind !== 'link') setUri('');
            }}
          />
        </View>
      </Row>

      {kind === 'link' && (
        <Card>
          <Field
            label="Adresse de la vidéo"
            value={uri}
            onChangeText={setUri}
            placeholder="https://youtu.be/… · Drive · Hudl · Veo · .mp4"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="Les liens directs .mp4 se lisent dans l’appli ; les autres s’ouvrent dans le navigateur ou l’appli concernée."
          />
        </Card>
      )}

      <Card>
        <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Ex. : Résumé vs US Quimper, exercice de pressing…" />
        <Chips label="Catégorie" options={MEDIA_CATEGORIES} value={category} onChange={(v) => v && setCategory(v)} />
        <Field label="Date" value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
      </Card>

      {recentMatches.length > 0 && (
        <>
          <Section icon="football-outline">Match lié (optionnel)</Section>
          <Card>
            <Chips
              options={recentMatches.map((m) => m.id)}
              value={matchId}
              getLabel={(id) => matchLabel(data.matches.find((m) => m.id === id))}
              onChange={(id) => {
                setMatchId(id);
                const m = data.matches.find((x) => x.id === id);
                if (m && !existing) setDate(m.date);
              }}
              allowEmpty
            />
          </Card>
        </>
      )}

      {activePlayers.length > 0 && (
        <>
          <Section icon="people-outline">Joueurs concernés</Section>
          <Card>
            <MultiChips options={activePlayers.map((p) => p.id)} values={playerIds} onChange={setPlayerIds} getLabel={(id) => playerName(data.players.find((p) => p.id === id))} />
          </Card>
        </>
      )}

      <Card>
        <Field label="Notes / consignes" value={notes} onChangeText={setNotes} multiline placeholder="Ce qu’il faut regarder, les points à corriger…" />
      </Card>

      <Button title="Enregistrer" icon="checkmark" onPress={save} />
      {existing && (
        <Button
          title="Supprimer le média"
          kind="danger"
          icon="trash-outline"
          onPress={() =>
            confirm('Supprimer ce média ?', 'Le fichier et ses temps forts seront supprimés de l’appli (pas de votre galerie).', () => {
              deleteMedia(existing.id);
              deleteMediaFile(existing.uri);
              deleteMediaFile(existing.thumbnail);
              router.dismissTo('/videos');
            })
          }
        />
      )}
    </Screen>
  );
}
