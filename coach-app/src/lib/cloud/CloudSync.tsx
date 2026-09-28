import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { notify } from '../confirm';
import { getPushToken, onNotificationTap, setBadge } from '../notifications';
import { normalizeData, useStore } from '../store';
import type { PlayerWrite } from '../store';
import { coachPull, coachPush, humanError, playerPull, pushEntry, savePushToken, uploadImage } from './api';
import { supabase } from './client';
import { isCloudConfigured } from './config';
import { mergeEntries } from './views';
import type { Entry } from './views';

type Status = 'off' | 'idle' | 'syncing' | 'offline' | 'error';
type CloudState = { enabled: boolean; status: Status; lastSync?: string; error?: string; user: User | null; syncNow: () => Promise<void> };

const Ctx = createContext<CloudState>({ enabled: false, status: 'off', user: null, syncNow: async () => {} });
export const useCloud = () => useContext(Ctx);

const OUTBOX_KEY = 'qea/outbox/v1';
type OutboxItem = { teamCloudId: string; playerId: string; kind: Entry['kind']; refId: string; payload: unknown };

/**
 * Synchronisation avec Supabase (si configuré) :
 *  - coach : récupère le document de l'équipe et les réponses des joueurs, fusionne, puis renvoie
 *    le document + une vue filtrée par joueur (contrôle de version) ;
 *  - joueur : récupère SA vue + ses envois ; ses réponses partent dans une file d'attente (hors connexion OK).
 */
export function CloudSync({ children }: { children: ReactNode }) {
  const enabled = isCloudConfigured();
  const { data, session, team, replaceAll, updateTeam, onPlayerWrite, savePlayer } = useStore();
  const [status, setStatus] = useState<Status>(enabled ? 'idle' : 'off');
  const [error, setError] = useState<string>();
  const [lastSync, setLastSync] = useState<string>();
  const [user, setUser] = useState<User | null>(null);

  const dataRef = useRef(data);
  const teamRef = useRef(team);
  const sessionRef = useRef(session);
  const lastSynced = useRef<Record<string, string>>({});
  const busy = useRef(false);
  const again = useRef(false);
  const tokenSaved = useRef<string | null>(null);
  const syncRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    dataRef.current = data;
    teamRef.current = team;
    sessionRef.current = session;
  });

  // Compte Supabase courant
  useEffect(() => {
    const c = supabase();
    if (!c) return;
    c.auth.getSession().then(({ data: d }) => setUser(d.session?.user ?? null));
    const { data: sub } = c.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const flushOutbox = useCallback(async () => {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const items: OutboxItem[] = raw ? JSON.parse(raw) : [];
    const left: OutboxItem[] = [];
    for (const it of items) {
      try {
        await pushEntry(it.teamCloudId, it.playerId, it.kind, it.refId, it.payload);
      } catch {
        left.push(it);
      }
    }
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(left));
    return left.length;
  }, []);

  /** Met en ligne les photos locales des joueurs (coach) pour qu'elles s'affichent chez tout le monde. */
  const uploadPhotos = useCallback(async (cloudId: string) => {
    for (const p of dataRef.current.players) {
      if (!p.photoUri || /^https?:/.test(p.photoUri)) continue;
      try {
        const url = await uploadImage(p.photoUri, `${cloudId}/players/${p.id}.jpg`);
        savePlayer({ ...p, photoUri: url });
      } catch (e) {
        console.warn('Photo non envoyée', e);
      }
    }
  }, [savePlayer]);

  const registerPush = useCallback(async (cloudId: string, role: 'coach' | 'player', playerId?: string) => {
    const key = `${cloudId}:${role}:${playerId ?? ''}`;
    if (tokenSaved.current === key) return;
    const token = await getPushToken();
    if (!token) return;
    await savePushToken(token, cloudId, role, playerId);
    tokenSaved.current = key;
  }, []);

  const sync = useCallback(async () => {
    const tm = teamRef.current;
    const s = sessionRef.current;
    if (!enabled || !tm?.cloudId || !s || s.teamId !== tm.id) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    setStatus('syncing');
    try {
      if (s.role === 'coach') {
        await uploadPhotos(tm.cloudId);
        const { team: remote, entries } = await coachPull(tm.cloudId);
        const localVersion = tm.cloudVersion ?? 0;
        const current = normalizeData(dataRef.current, tm.name);
        const dirty = JSON.stringify(current) !== lastSynced.current[tm.id];
        let base = current;
        if (remote.version > localVersion) {
          // Un autre appareil (ou coach) a publié : on repart de la version en ligne
          if (dirty && lastSynced.current[tm.id]) notify('Équipe mise à jour', 'Un autre coach a modifié l’équipe : vos dernières modifications sur cet appareil peuvent être à refaire.');
          base = normalizeData(remote.data && Object.keys(remote.data).length ? remote.data : current, tm.name);
        }
        const merged = mergeEntries(base, entries);
        let version = remote.version;
        const mustPush = remote.version === 0 || (remote.version <= localVersion && dirty) || merged.changed;
        if (mustPush) version = await coachPush(tm.cloudId, remote.version, merged.data);
        lastSynced.current[tm.id] = JSON.stringify(merged.data);
        if (JSON.stringify(merged.data) !== JSON.stringify(current)) replaceAll(merged.data);
        if (version !== tm.cloudVersion || remote.join_code !== tm.joinCode || remote.coach_code !== tm.coachCode)
          updateTeam(tm.id, { cloudVersion: version, joinCode: remote.join_code, coachCode: remote.coach_code });
        registerPush(tm.cloudId, 'coach').catch(() => {});
      } else {
        await flushOutbox();
        const { view, entries } = await playerPull(tm.cloudId, s.playerId);
        if (view) {
          const merged = mergeEntries(normalizeData(view, tm.name), entries).data;
          if (JSON.stringify(merged) !== JSON.stringify(normalizeData(dataRef.current, tm.name))) replaceAll(merged);
          setBadge(((view as { todos?: unknown[] }).todos ?? []).length);
        }
        registerPush(tm.cloudId, 'player', s.playerId).catch(() => {});
      }
      setError(undefined);
      setStatus('idle');
      setLastSync(new Date().toISOString());
    } catch (e) {
      const msg = humanError(e);
      if (msg.includes('conflit') || msg.includes('conflict')) again.current = true;
      setError(msg);
      setStatus(/network|fetch|Failed/i.test(msg) ? 'offline' : 'error');
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(() => syncRef.current?.(), 300);
      }
    }
  }, [enabled, uploadPhotos, replaceAll, updateTeam, registerPush, flushOutbox]);

  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  // Synchro à l'ouverture, au changement d'équipe/utilisateur, au retour au premier plan et toutes les minutes
  useEffect(() => {
    if (!enabled) return;
    const first = setTimeout(sync, 0);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && sync());
    const timer = setInterval(sync, 60_000);
    return () => {
      clearTimeout(first);
      sub.remove();
      clearInterval(timer);
    };
  }, [enabled, sync, team?.id, team?.cloudId, session?.role, user?.id]);

  // Coach : envoi 2,5 s après la dernière modification
  useEffect(() => {
    if (!enabled || session?.role !== 'coach' || !team?.cloudId) return;
    if (JSON.stringify(normalizeData(data, team.name)) === lastSynced.current[team.id]) return;
    const timer = setTimeout(sync, 2500);
    return () => clearTimeout(timer);
  }, [enabled, data, session?.role, team?.cloudId, team?.id, team?.name, sync]);

  // Joueur : chaque réponse part dans la file d'attente puis vers le serveur
  useEffect(() => {
    if (!enabled) return;
    return onPlayerWrite(async (w: PlayerWrite) => {
      const s = sessionRef.current;
      const tm = teamRef.current;
      if (s?.role !== 'player' || !tm?.cloudId) return;
      const raw = await AsyncStorage.getItem(OUTBOX_KEY);
      const items: OutboxItem[] = raw ? JSON.parse(raw) : [];
      items.push({ teamCloudId: tm.cloudId, playerId: s.playerId, kind: w.kind, refId: w.refId, payload: w.payload });
      await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
      flushOutbox().catch(() => {});
    });
  }, [enabled, onPlayerWrite, flushOutbox]);

  // Toucher une notification ouvre le bon écran
  useEffect(() => onNotificationTap((route) => router.push(route as never)), []);

  return <Ctx.Provider value={{ enabled, status, error, lastSync, user, syncNow: sync }}>{children}</Ctx.Provider>;
}
