import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { buildDemoData } from './demo';
import type { AppData, CustomQuestion, Injury, Match, Player, PostMatchReport } from './types';

const STORAGE_KEY = 'coach-suivi/data/v1';

export const emptyData = (): AppData => ({
  version: 1,
  teamName: 'Mon équipe',
  players: [],
  matches: [],
  reports: [],
  injuries: [],
  questions: [],
});

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

type Upsert<T> = Omit<T, 'id' | 'createdAt'> & Partial<Pick<T & { id: string; createdAt: string }, 'id' | 'createdAt'>>;

type Store = {
  data: AppData;
  ready: boolean;
  setTeamName: (name: string) => void;
  savePlayer: (p: Upsert<Player>) => Player;
  deletePlayer: (id: string) => void;
  saveMatch: (m: Upsert<Match>) => Match;
  deleteMatch: (id: string) => void;
  saveReport: (r: Omit<PostMatchReport, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => PostMatchReport;
  deleteReport: (id: string) => void;
  saveInjury: (i: Upsert<Injury>) => Injury;
  deleteInjury: (id: string) => void;
  saveQuestion: (q: Omit<CustomQuestion, 'id'> & { id?: string }) => void;
  deleteQuestion: (id: string) => void;
  moveQuestion: (id: string, delta: -1 | 1) => void;
  replaceAll: (d: AppData) => void;
  loadDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const dataRef = useRef(data);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setData({ ...emptyData(), ...JSON.parse(raw) });
      })
      .catch((e) => console.warn('Lecture des données impossible', e))
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    dataRef.current = data;
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) =>
      console.warn('Sauvegarde impossible', e),
    );
  }, [data]);

  const now = () => new Date().toISOString();

  const savePlayer = useCallback((p: Upsert<Player>) => {
    const player = { ...p, id: p.id ?? newId(), createdAt: p.createdAt ?? now() } as Player;
    setData((d) => ({ ...d, players: upsert(d.players, player) }));
    return player;
  }, []);

  const deletePlayer = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      players: d.players.filter((p) => p.id !== id),
      reports: d.reports.filter((r) => r.playerId !== id),
      injuries: d.injuries.filter((i) => i.playerId !== id),
    }));
  }, []);

  const saveMatch = useCallback((m: Upsert<Match>) => {
    const match = { ...m, id: m.id ?? newId(), createdAt: m.createdAt ?? now() } as Match;
    setData((d) => ({ ...d, matches: upsert(d.matches, match) }));
    return match;
  }, []);

  const deleteMatch = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      matches: d.matches.filter((m) => m.id !== id),
      reports: d.reports.filter((r) => r.matchId !== id),
      injuries: d.injuries.map((i) => (i.matchId === id ? { ...i, matchId: undefined } : i)),
    }));
  }, []);

  const saveReport: Store['saveReport'] = useCallback((r) => {
    // Un seul questionnaire par joueur et par match
    const existing = dataRef.current.reports.find(
      (x) => x.id === r.id || (x.matchId === r.matchId && x.playerId === r.playerId),
    );
    const saved: PostMatchReport = {
      ...r,
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    setData((d) => ({ ...d, reports: upsert(d.reports, saved) }));
    return saved;
  }, []);

  const deleteReport = useCallback((id: string) => {
    setData((d) => ({ ...d, reports: d.reports.filter((r) => r.id !== id) }));
  }, []);

  const saveInjury = useCallback((i: Upsert<Injury>) => {
    const injury = { ...i, id: i.id ?? newId(), createdAt: i.createdAt ?? now() } as Injury;
    setData((d) => ({ ...d, injuries: upsert(d.injuries, injury) }));
    return injury;
  }, []);

  const deleteInjury = useCallback((id: string) => {
    setData((d) => ({ ...d, injuries: d.injuries.filter((i) => i.id !== id) }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      data,
      ready,
      setTeamName: (teamName) => setData((d) => ({ ...d, teamName })),
      savePlayer,
      deletePlayer,
      saveMatch,
      deleteMatch,
      saveReport,
      deleteReport,
      saveInjury,
      deleteInjury,
      saveQuestion: (q) => setData((d) => ({ ...d, questions: upsert(d.questions, { ...q, id: q.id ?? newId() }) })),
      deleteQuestion: (id) => setData((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) })),
      moveQuestion: (id, delta) =>
        setData((d) => {
          const i = d.questions.findIndex((q) => q.id === id);
          const j = i + delta;
          if (i === -1 || j < 0 || j >= d.questions.length) return d;
          const questions = d.questions.slice();
          [questions[i], questions[j]] = [questions[j], questions[i]];
          return { ...d, questions };
        }),
      replaceAll: (d) => setData({ ...emptyData(), ...d }),
      loadDemo: () => setData(buildDemoData()),
    }),
    [data, ready, savePlayer, deletePlayer, saveMatch, deleteMatch, saveReport, deleteReport, saveInjury, deleteInjury],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore doit être utilisé dans <DataProvider>');
  return s;
}
