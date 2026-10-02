import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import type { AppData, Team } from '../types';
import { supabase } from './client';
import type { Entry } from './views';
import { buildPlayerView, rosterFor } from './views';

export class CloudError extends Error {}

const sb = () => {
  const c = supabase();
  if (!c) throw new CloudError('Le cloud n’est pas configuré.');
  return c;
};

/** Messages lisibles pour les erreurs renvoyées par le serveur */
export function humanError(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  const map: Record<string, string> = {
    invalid_code: 'Code d’équipe inconnu. Vérifie auprès du coach.',
    unknown_player: 'Ce joueur n’existe plus dans l’équipe.',
    wrong_pin: 'Code joueur incorrect.',
    too_many_attempts: 'Trop d’essais. Réessaie dans 15 minutes.',
    coach_account_required: 'Un compte coach (e-mail) est nécessaire.',
    forbidden: 'Accès refusé.',
    conflict: 'Un autre coach a modifié l’équipe entre-temps.',
    'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
    'User already registered': 'Un compte existe déjà avec cet e-mail : connectez-vous.',
    'Email not confirmed': 'Adresse e-mail non confirmée. Ouvre le lien reçu par e-mail avant de te connecter.',
    email_not_confirmed: 'Adresse e-mail non confirmée. Ouvre le lien reçu par e-mail avant de te connecter.',
    'Failed to fetch': 'Connexion au service cloud impossible. Vérifie ta connexion Internet puis réessaie.',
    'Network request failed': 'Connexion au service cloud impossible. Vérifie ta connexion Internet puis réessaie.',
    'Load failed': 'Connexion au service cloud impossible. Vérifie ta connexion Internet puis réessaie.',
  };
  const key = Object.keys(map).find((k) => m.includes(k));
  return key ? map[key] : m;
}

// ---------- Comptes ----------

export async function currentUser() {
  const { data } = await sb().auth.getSession();
  return data.session?.user ?? null;
}

export async function coachSignIn(email: string, password: string) {
  const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function coachSignUp(email: string, password: string, name: string) {
  const { data, error } = await sb().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function resendCoachConfirmation(email: string) {
  const { error } = await sb().auth.resend({ type: 'signup', email: email.trim() });
  if (error) throw error;
}

export async function updateCoachName(name: string) {
  const { error } = await sb().auth.updateUser({ data: { full_name: name.trim() } });
  if (error) throw error;
}

export async function signOut() {
  await sb().auth.signOut();
}

/** Compte anonyme pour un joueur (conservé sur le téléphone) */
export async function ensureAnonymous() {
  const u = await currentUser();
  if (u) return u;
  const { data, error } = await sb().auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

// ---------- Équipes ----------

export type CloudTeam = {
  team_id: string;
  team_name: string;
  team_color: string;
  team_category: string;
  club_name: string;
  role: 'coach' | 'player';
  player_id: string | null;
  join_code: string | null;
  coach_code: string | null;
  version: number;
};

export async function myTeams(): Promise<CloudTeam[]> {
  const { data, error } = await sb().rpc('my_teams');
  if (error) throw error;
  return data ?? [];
}

export async function createCloudTeam(team: Team, clubName: string) {
  const { data, error } = await sb().rpc('create_team', { p_name: team.name, p_category: team.category, p_color: team.color, p_club_name: clubName });
  if (error) throw error;
  return data as { id: string; join_code: string; coach_code: string; version: number };
}

export async function joinAsCoach(code: string) {
  const { data, error } = await sb().rpc('join_as_coach', { p_code: code });
  if (error) throw error;
  return data as { id: string; name: string; color: string; category: string; join_code: string; coach_code: string; version: number };
}

export type RosterRow = { team_id: string; team_name: string; team_color: string; club_name: string; player_id: string; first_name: string; last_name: string; number: number | null; position: string | null; photo_url: string | null; has_pin: boolean };

export async function teamRoster(joinCode: string): Promise<RosterRow[]> {
  await ensureAnonymous();
  const { data, error } = await sb().rpc('team_roster', { p_join_code: joinCode });
  if (error) throw error;
  return data ?? [];
}

export async function joinAsPlayer(joinCode: string, playerId: string, pin: string) {
  await ensureAnonymous();
  const { data, error } = await sb().rpc('join_as_player', { p_join_code: joinCode, p_player_id: playerId, p_pin: pin });
  if (error) throw error;
  const r = data as { ok: boolean; error?: string; remaining?: number; team_id: string; team_name: string; team_color: string; team_category: string; club_name: string };
  if (!r.ok) throw new CloudError(humanError(r.error) + (r.error === 'wrong_pin' && r.remaining != null ? ` Encore ${Math.max(0, r.remaining)} essai(s).` : ''));
  return r;
}

// ---------- Synchronisation ----------

export async function coachPull(teamCloudId: string, since?: string) {
  const c = sb();
  const [{ data: team, error: e1 }, { data: entries, error: e2 }] = await Promise.all([
    c.from('teams').select('data, version, join_code, coach_code, name, color, category').eq('id', teamCloudId).maybeSingle(),
    (since ? c.from('player_entries').select('*').eq('team_id', teamCloudId).gt('updated_at', since) : c.from('player_entries').select('*').eq('team_id', teamCloudId)),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { team: team as { data: AppData; version: number; join_code: string; coach_code: string; name: string; color: string; category: string }, entries: (entries ?? []) as Entry[] };
}

/** Envoie le document de l'équipe + effectif + une vue filtrée par joueur. Renvoie la nouvelle version. */
export async function coachPush(teamCloudId: string, expectedVersion: number, data: AppData): Promise<number> {
  const views = Object.fromEntries(data.players.filter((p) => !p.archived).map((p) => [p.id, buildPlayerView(data, p.id)]));
  const { data: v, error } = await sb().rpc('coach_push', {
    p_team: teamCloudId,
    p_expected_version: expectedVersion,
    p_data: data,
    p_roster: rosterFor(data),
    p_views: views,
  });
  if (error) throw error;
  return v as number;
}

export async function playerPull(teamCloudId: string, playerId: string) {
  const c = sb();
  const [{ data: view, error: e1 }, { data: entries, error: e2 }] = await Promise.all([
    c.from('player_views').select('data, updated_at').eq('team_id', teamCloudId).eq('player_id', playerId).maybeSingle(),
    c.from('player_entries').select('*').eq('team_id', teamCloudId).eq('player_id', playerId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { view: (view?.data ?? null) as AppData | null, entries: (entries ?? []) as Entry[] };
}

export async function pushEntry(teamCloudId: string, playerId: string, kind: Entry['kind'], refId: string, payload: unknown) {
  const { error } = await sb()
    .from('player_entries')
    .upsert({ team_id: teamCloudId, player_id: playerId, kind, ref_id: refId, payload, updated_at: new Date().toISOString() }, { onConflict: 'team_id,player_id,kind,ref_id' });
  if (error) throw error;
}

export async function savePushToken(token: string, teamCloudId: string, role: 'coach' | 'player', playerId?: string) {
  const u = await currentUser();
  if (!u) return;
  const { error } = await sb()
    .from('push_tokens')
    .upsert({ token, user_id: u.id, team_id: teamCloudId, role, player_id: playerId ?? null, updated_at: new Date().toISOString() }, { onConflict: 'token' });
  if (error) throw error;
}

/** Met en ligne une photo locale (joueur, logo) et renvoie son URL publique. */
export async function uploadImage(localUri: string, path: string): Promise<string> {
  const c = sb();
  let body: ArrayBuffer | Blob;
  if (Platform.OS === 'web') body = await (await fetch(localUri)).blob();
  else body = (await new File(localUri).bytes()).buffer as ArrayBuffer;
  const { error } = await c.storage.from('photos').upload(path, body, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;
  return `${c.storage.from('photos').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
