import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { QEA_QUESTIONS } from './constants';
import { buildDemoData } from './demo';
import type {
  AppData,
  Club,
  CustomQuestion,
  Injury,
  Lineup,
  Match,
  MediaItem,
  Objective,
  Player,
  PostMatchReport,
  Session,
  Survey,
  SurveyResponse,
  Team,
  TrainingFeedback,
  TrainingSession,
} from './types';

// Clés de stockage (v2 : multi-équipes). La v1 (une seule équipe) est migrée automatiquement.
const CLUB_KEY = 'qea/club/v2';
const SESSION_KEY = 'qea/session/v2';
const teamKey = (id: string) => `qea/team/${id}/v2`;
const LEGACY_DATA_KEY = 'coach-suivi/data/v1';

export const DEFAULT_CLUB_NAME = 'Quimper Ergué Armel FC';

export const TEAM_COLORS = ['#107B2D', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#0891B2', '#CA8A04', '#DC2626', '#4F46E5', '#65A30D'];

export const emptyData = (teamName = 'Seniors A'): AppData => ({
  version: 1,
  teamName,
  players: [],
  matches: [],
  reports: [],
  injuries: [],
  questions: QEA_QUESTIONS.map((q) => ({ ...q })),
  media: [],
  lineups: [],
  sessions: [],
  objectives: [],
  surveys: [],
  surveyResponses: [],
});

const emptyClub = (): Club => ({ name: DEFAULT_CLUB_NAME, teams: [] });

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const now = () => new Date().toISOString();

type Upsert<T> = Omit<T, 'id' | 'createdAt'> & Partial<Pick<T & { id: string; createdAt: string }, 'id' | 'createdAt'>>;

/** Écriture faite par un joueur, à envoyer au cloud (questionnaire, ressenti…). */
export type PlayerWrite =
  | { kind: 'report'; refId: string; payload: PostMatchReport }
  | { kind: 'training_feedback'; refId: string; payload: TrainingFeedback }
  | { kind: 'survey_response'; refId: string; payload: SurveyResponse }
  | { kind: 'objective'; refId: string; payload: Pick<Objective, 'playerProgress' | 'playerComment'> };

type Store = {
  data: AppData;
  ready: boolean;
  session: Session | null;
  club: Club;
  team?: Team;
  login: (s: Session) => void;
  logout: () => void;
  /** Coach : change d'équipe (charge ses données) */
  selectTeam: (teamId: string) => Promise<void>;
  createTeam: (t: Omit<Team, 'id' | 'createdAt'>) => Team;
  updateTeam: (id: string, patch: Partial<Team>) => void;
  deleteTeam: (id: string) => Promise<void>;
  setClubName: (name: string) => void;
  setCoachPin: (hash: string | undefined) => void;
  setLogo: (uri: string | undefined) => void;
  /** Remplace toutes les données de l'équipe courante (restauration, synchro) */
  replaceAll: (d: AppData) => void;
  loadDemo: () => void;
  resetEverything: () => Promise<void>;
  /** Écoute les écritures des joueurs (utilisé par la synchro cloud) */
  onPlayerWrite: (fn: (w: PlayerWrite) => void) => () => void;
  saveLineup: (l: Omit<Lineup, 'updatedAt'>) => void;
  deleteLineup: (matchId: string) => void;
  saveSession: (s: Upsert<TrainingSession>) => TrainingSession;
  saveTrainingFeedback: (sessionId: string, playerId: string, f: Omit<TrainingFeedback, 'updatedAt'>) => void;
  saveObjective: (o: Upsert<Objective>) => Objective;
  deleteObjective: (id: string) => void;
  saveSurvey: (s: Upsert<Survey>) => Survey;
  deleteSurvey: (id: string) => void;
  saveSurveyResponse: (r: Omit<SurveyResponse, 'id' | 'updatedAt'>) => void;
  deleteSession: (id: string) => void;
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
  saveMedia: (m: Upsert<MediaItem>) => MediaItem;
  deleteMedia: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

async function readJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

/** Charge le club ; migre l'ancienne version mono-équipe si besoin. */
async function loadClub(): Promise<Club> {
  const club = await readJSON<Club>(CLUB_KEY);
  if (club) return { ...emptyClub(), ...club };
  const legacy = await readJSON<AppData & { coachPinHash?: string; logoUri?: string }>(LEGACY_DATA_KEY);
  if (!legacy) return emptyClub();
  const team: Team = { id: newId(), name: 'Seniors A', category: 'Seniors', color: TEAM_COLORS[0], createdAt: now() };
  const { coachPinHash, logoUri, ...rest } = legacy;
  const migrated: Club = { name: DEFAULT_CLUB_NAME, coachPinHash, logoUri, teams: [team] };
  await AsyncStorage.setItem(teamKey(team.id), JSON.stringify({ ...emptyData(team.name), ...rest, teamName: team.name }));
  await AsyncStorage.setItem(CLUB_KEY, JSON.stringify(migrated));
  return migrated;
}

async function loadTeamData(team: Team): Promise<AppData> {
  const d = await readJSON<AppData>(teamKey(team.id));
  return { ...emptyData(team.name), ...d, teamName: team.name };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [club, setClub] = useState<Club>(emptyClub);
  const [teamId, setTeamId] = useState<string>();
  const [data, setData] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const loaded = useRef(false);
  const dataRef = useRef(data);
  const teamIdRef = useRef<string | undefined>(undefined);
  const writeListeners = useRef(new Set<(w: PlayerWrite) => void>());
  const clubRef = useRef(club);
  useEffect(() => {
    clubRef.current = club;
  }, [club]);

  const emit = (w: PlayerWrite) => writeListeners.current.forEach((fn) => fn(w));

  // Chargement initial : club, session, équipe courante
  useEffect(() => {
    (async () => {
      try {
        const c = await loadClub();
        const s = await readJSON<Session>(SESSION_KEY);
        setClub(c);
        const team = c.teams.find((x) => x.id === s?.teamId) ?? c.teams[0];
        if (team) {
          const d = await loadTeamData(team);
          teamIdRef.current = team.id;
          setTeamId(team.id);
          setData(d);
        }
        if (s && c.teams.some((x) => x.id === s.teamId)) setSession(s);
      } catch (e) {
        console.warn('Lecture des données impossible', e);
      } finally {
        loaded.current = true;
        setReady(true);
      }
    })();
  }, []);

  // Sauvegarde automatique
  useEffect(() => {
    dataRef.current = data;
    if (!loaded.current || !teamIdRef.current) return;
    AsyncStorage.setItem(teamKey(teamIdRef.current), JSON.stringify(data)).catch((e) => console.warn('Sauvegarde impossible', e));
  }, [data]);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(CLUB_KEY, JSON.stringify(club)).catch(() => {});
  }, [club]);

  const persistSession = useCallback((s: Session | null) => {
    setSession(s);
    (s ? AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s)) : AsyncStorage.removeItem(SESSION_KEY)).catch(() => {});
  }, []);

  const switchTo = useCallback(
    async (id: string, teams: Team[]) => {
      const team = teams.find((x) => x.id === id);
      if (!team) return;
      // Sauvegarde l'équipe quittée avant de charger la nouvelle
      if (teamIdRef.current && teamIdRef.current !== id) await AsyncStorage.setItem(teamKey(teamIdRef.current), JSON.stringify(dataRef.current));
      const d = await loadTeamData(team);
      teamIdRef.current = id;
      setTeamId(id);
      setData(d);
    },
    [],
  );

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
      media: d.media.map((m) => ({ ...m, playerIds: m.playerIds.filter((p) => p !== id) })),
      objectives: d.objectives.filter((o) => o.playerId !== id),
      surveyResponses: d.surveyResponses.filter((r) => r.playerId !== id),
      lineups: d.lineups.map((l) => ({
        ...l,
        slots: l.slots.map((s) => (s === id ? null : s)),
        bench: l.bench.filter((b) => b !== id),
        captainId: l.captainId === id ? undefined : l.captainId,
      })),
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
      media: d.media.map((m) => (m.matchId === id ? { ...m, matchId: undefined } : m)),
      lineups: d.lineups.filter((l) => l.matchId !== id),
    }));
  }, []);

  const saveReport: Store['saveReport'] = useCallback((r) => {
    // Un seul questionnaire par joueur et par match
    const existing = dataRef.current.reports.find((x) => x.id === r.id || (x.matchId === r.matchId && x.playerId === r.playerId));
    const saved: PostMatchReport = { ...r, id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    setData((d) => ({ ...d, reports: upsert(d.reports, saved) }));
    emit({ kind: 'report', refId: saved.matchId, payload: saved });
    return saved;
  }, []);

  const saveSession = useCallback((x: Upsert<TrainingSession>) => {
    const item = { ...x, id: x.id ?? newId(), createdAt: x.createdAt ?? now() } as TrainingSession;
    setData((d) => ({ ...d, sessions: upsert(d.sessions, item) }));
    return item;
  }, []);

  const saveMedia = useCallback((m: Upsert<MediaItem>) => {
    const item = { ...m, id: m.id ?? newId(), createdAt: m.createdAt ?? now() } as MediaItem;
    setData((d) => ({ ...d, media: upsert(d.media, item) }));
    return item;
  }, []);

  const team = club.teams.find((x) => x.id === teamId);

  const value = useMemo<Store>(
    () => ({
      data,
      ready,
      session,
      club,
      team,
      login: persistSession,
      logout: () => persistSession(null),
      selectTeam: async (id) => {
        await switchTo(id, clubRef.current.teams);
        if (session?.role === 'coach') persistSession({ role: 'coach', teamId: id });
      },
      createTeam: (t) => {
        const created: Team = { ...t, id: newId(), createdAt: now() };
        const next = { ...clubRef.current, teams: [...clubRef.current.teams, created] };
        clubRef.current = next;
        setClub(next);
        AsyncStorage.setItem(teamKey(created.id), JSON.stringify(emptyData(created.name))).catch(() => {});
        return created;
      },
      updateTeam: (id, patch) => {
        setClub((c) => ({ ...c, teams: c.teams.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        if (patch.name && id === teamIdRef.current) setData((d) => ({ ...d, teamName: patch.name! }));
      },
      deleteTeam: async (id) => {
        const rest = club.teams.filter((x) => x.id !== id);
        setClub((c) => ({ ...c, teams: c.teams.filter((x) => x.id !== id) }));
        await AsyncStorage.removeItem(teamKey(id));
        if (id === teamIdRef.current) {
          teamIdRef.current = undefined;
          if (rest[0]) await switchTo(rest[0].id, rest);
          else {
            setTeamId(undefined);
            setData(emptyData());
          }
          persistSession(null);
        }
      },
      setClubName: (name) => setClub((c) => ({ ...c, name })),
      setCoachPin: (coachPinHash) => setClub((c) => ({ ...c, coachPinHash })),
      setLogo: (logoUri) => setClub((c) => ({ ...c, logoUri })),
      replaceAll: (d) => setData({ ...emptyData(team?.name), ...d, teamName: team?.name ?? d.teamName }),
      loadDemo: () => setData({ ...buildDemoData(), teamName: team?.name ?? 'Seniors A' }),
      resetEverything: async () => {
        const keys = [CLUB_KEY, SESSION_KEY, LEGACY_DATA_KEY, ...club.teams.map((x) => teamKey(x.id))];
        await AsyncStorage.multiRemove(keys);
        teamIdRef.current = undefined;
        setTeamId(undefined);
        setClub(emptyClub());
        setData(emptyData());
        setSession(null);
      },
      onPlayerWrite: (fn) => {
        writeListeners.current.add(fn);
        return () => writeListeners.current.delete(fn);
      },
      saveLineup: (l) => setData((d) => ({ ...d, lineups: [...d.lineups.filter((x) => x.matchId !== l.matchId), { ...l, updatedAt: now() }] })),
      saveSession,
      saveTrainingFeedback: (sessionId, playerId, f) => {
        const fb = { ...f, updatedAt: now() };
        setData((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === sessionId ? { ...x, feedback: { ...x.feedback, [playerId]: fb } } : x)) }));
        emit({ kind: 'training_feedback', refId: sessionId, payload: fb });
      },
      saveObjective: (o) => {
        const item = { ...o, id: o.id ?? newId(), createdAt: o.createdAt ?? now() } as Objective;
        setData((d) => ({ ...d, objectives: upsert(d.objectives, item) }));
        emit({ kind: 'objective', refId: item.id, payload: { playerProgress: item.playerProgress, playerComment: item.playerComment } });
        return item;
      },
      deleteObjective: (id) => setData((d) => ({ ...d, objectives: d.objectives.filter((x) => x.id !== id) })),
      saveSurvey: (x) => {
        const item = { ...x, id: x.id ?? newId(), createdAt: x.createdAt ?? now() } as Survey;
        setData((d) => ({ ...d, surveys: upsert(d.surveys, item) }));
        return item;
      },
      deleteSurvey: (id) => setData((d) => ({ ...d, surveys: d.surveys.filter((x) => x.id !== id), surveyResponses: d.surveyResponses.filter((r) => r.surveyId !== id) })),
      saveSurveyResponse: (r) => {
        const existing = dataRef.current.surveyResponses.find((x) => x.surveyId === r.surveyId && x.playerId === r.playerId);
        const item: SurveyResponse = { ...r, id: existing?.id ?? newId(), updatedAt: now() };
        setData((d) => ({ ...d, surveyResponses: upsert(d.surveyResponses, item) }));
        emit({ kind: 'survey_response', refId: r.surveyId, payload: item });
      },
      deleteSession: (id) => setData((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== id) })),
      deleteLineup: (matchId) => setData((d) => ({ ...d, lineups: d.lineups.filter((x) => x.matchId !== matchId) })),
      setTeamName: (teamName) => {
        setData((d) => ({ ...d, teamName }));
        if (teamIdRef.current) setClub((c) => ({ ...c, teams: c.teams.map((x) => (x.id === teamIdRef.current ? { ...x, name: teamName } : x)) }));
      },
      savePlayer,
      deletePlayer,
      saveMatch,
      deleteMatch,
      saveReport,
      deleteReport: (id) => setData((d) => ({ ...d, reports: d.reports.filter((r) => r.id !== id) })),
      saveInjury: (i) => {
        const injury = { ...i, id: i.id ?? newId(), createdAt: i.createdAt ?? now() } as Injury;
        setData((d) => ({ ...d, injuries: upsert(d.injuries, injury) }));
        return injury;
      },
      deleteInjury: (id) => setData((d) => ({ ...d, injuries: d.injuries.filter((i) => i.id !== id) })),
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
      saveMedia,
      deleteMedia: (id) => setData((d) => ({ ...d, media: d.media.filter((m) => m.id !== id) })),
    }),
    [data, ready, session, club, team, persistSession, switchTo, saveSession, saveMedia, savePlayer, deletePlayer, saveMatch, deleteMatch, saveReport],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore doit être utilisé dans <DataProvider>');
  return s;
}
