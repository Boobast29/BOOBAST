import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';
import { notify } from './confirm';
import type { MediaKind } from './types';

export type PickedMedia = { kind: 'video' | 'photo'; uri: string; thumbnail?: string; duration?: number | null };

/** Copie le fichier choisi dans le dossier de l'appli pour qu'il ne disparaisse pas du cache. */
export function persistFile(uri: string): string {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'medias');
    if (!dir.exists) dir.create({ intermediates: true });
    const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'mp4';
    const dest = new File(dir, `${Date.now().toString(36)}.${ext}`);
    new File(uri).copySync(dest);
    return dest.uri;
  } catch (e) {
    console.warn('Copie du média impossible, utilisation du fichier d’origine', e);
    return uri;
  }
}

async function thumbnailFor(uri: string): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000, quality: 0.6 });
    return persistFile(thumb);
  } catch {
    return undefined;
  }
}

async function handle(result: ImagePicker.ImagePickerResult): Promise<PickedMedia | undefined> {
  if (result.canceled || !result.assets?.length) return undefined;
  const a = result.assets[0];
  const kind = a.type === 'video' ? 'video' : 'photo';
  const uri = persistFile(a.uri);
  return { kind, uri, duration: a.duration, thumbnail: kind === 'video' ? await thumbnailFor(uri) : undefined };
}

export async function pickFromLibrary(): Promise<PickedMedia | undefined> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Accès refusé', 'Autorisez l’accès aux photos dans les réglages du téléphone.');
      return undefined;
    }
  }
  return handle(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos', 'images'], quality: 0.8 }));
}

export async function recordWithCamera(): Promise<PickedMedia | undefined> {
  if (Platform.OS === 'web') {
    notify('Non disponible', 'Filmer est possible depuis l’appli sur téléphone.');
    return undefined;
  }
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    notify('Accès refusé', 'Autorisez l’appareil photo dans les réglages du téléphone.');
    return undefined;
  }
  return handle(await ImagePicker.launchCameraAsync({ mediaTypes: ['videos', 'images'], videoMaxDuration: 600, quality: 0.8 }));
}

/** Supprime le fichier local d'un média (ignoré pour les liens et le web). */
export function deleteMediaFile(uri?: string) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith(Paths.document.uri)) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn('Suppression du fichier impossible', e);
  }
}

export function youtubeId(url: string): string | undefined {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1];
}

/** Miniature automatique pour les liens YouTube. */
export function linkThumbnail(url: string): string | undefined {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
}

/** Un lien direct vers un fichier vidéo peut être lu dans l'appli. */
export const isDirectVideo = (url: string) => /\.(mp4|mov|m4v|webm|m3u8)(\?|$)/i.test(url);

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** « 12:30 » ou « 1:02:05 » → secondes. */
export function parseTime(s: string): number | undefined {
  const parts = s.trim().split(':').map((x) => Number(x));
  if (!parts.length || parts.some((n) => isNaN(n) || n < 0)) return undefined;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export const MEDIA_KIND_ICON: Record<MediaKind, 'videocam' | 'image' | 'link'> = {
  video: 'videocam',
  photo: 'image',
  link: 'link',
};
