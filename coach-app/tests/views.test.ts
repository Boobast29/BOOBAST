// Tests de la logique cloud : confidentialité des vues joueur et fusion des réponses.
// Lancer : npx tsx tests/views.test.ts
import assert from 'node:assert/strict';
import { buildDemoData } from '../src/lib/demo';
import { buildPlayerView, mergeEntries, rosterFor } from '../src/lib/cloud/views';
import type { Entry } from '../src/lib/cloud/views';
import { insightAlerts, interviewBrief, playerTimeline } from '../src/lib/insights';
import { newDispatch, remind } from '../src/lib/requests';
import { normalizeData } from '../src/lib/store';
import type { Lineup } from '../src/lib/types';

let ok = 0;
const test = (name: string, fn: () => void) => {
  fn();
  ok++;
  console.log('✓', name);
};

const data = buildDemoData();
data.players[1].pinHash = 'hash-secret';
data.players[1].notes = 'Note privée du coach';
const v = buildPlayerView(data, 'p1');

test('la vue ne contient que les questionnaires du joueur', () => assert.ok(v.reports.every((r) => r.playerId === 'p1') && v.reports.length > 0));
test('la note et le commentaire du coach sont retirés', () => assert.ok(v.reports.every((r) => r.coachRating === undefined && r.coachComment === undefined)));
test('pas de débrief de match', () => assert.ok(v.matches.every((m) => m.debrief === undefined)));
test('préparation seulement si publiée', () => assert.ok(v.matches.every((m) => !m.prep || m.prep.published)));
test('ni code joueur ni notes du coach', () => assert.ok(v.players.every((p) => p.pinHash === undefined && p.notes === undefined)));
test('blessures : seulement les siennes', () => assert.ok(v.injuries.every((i) => i.playerId === 'p1')));
test('présences : seulement la sienne', () => assert.ok(v.sessions.every((s) => Object.keys(s.attendance).every((k) => k === 'p1'))));
test('ressentis d’entraînement : seulement les siens', () => assert.ok(v.sessions.every((s) => Object.keys(s.feedback ?? {}).every((k) => k === 'p1'))));
test('objectifs : seulement les siens', () => assert.ok(v.objectives.every((o) => o.playerId === 'p1')));
test('réponses aux questionnaires : seulement les siennes', () => assert.ok(v.surveyResponses.every((r) => r.playerId === 'p1')));
test('compos : seulement publiées', () => assert.ok(v.lineups.every((l) => l.published)));
const guestId = 'guest-u17';
const guestPlayer = (id: string, photoUri?: string) => ({
  id,
  firstName: 'Alex',
  lastName: 'Martin',
  photoUri,
  createdAt: '2026-01-01T00:00:00.000Z',
  sourceTeamId: 'team-u17',
  sourceTeamName: 'U17',
  sourceTeamCategory: 'Jeunes' as const,
});
const guestLineup: Lineup = {
  matchId: 'm3',
  formation: '4-3-3',
  slots: [guestId],
  bench: [],
  guestPlayers: [guestPlayer(guestId, 'https://images.example.test/alex.jpg'), guestPlayer('not-selected', 'file:///private/photo.jpg')],
  published: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const guestView = buildPlayerView({ ...data, lineups: [guestLineup] }, 'p1');
test('compo publiée : seuls les joueurs invités retenus sont transmis', () => assert.deepEqual(guestView.lineups[0].guestPlayers?.map((p) => p.id), [guestId]));
test('compo publiée : photos cloud conservées et URI locales masquées', () => {
  assert.equal(guestView.lineups[0].guestPlayers?.[0].photoUri, 'https://images.example.test/alex.jpg');
  const localPhotoLineup: Lineup = { ...guestLineup, guestPlayers: [guestPlayer(guestId, 'file:///private/photo.jpg')] };
  assert.equal(buildPlayerView({ ...data, lineups: [localPhotoLineup] }, 'p1').lineups[0].guestPlayers?.[0].photoUri, undefined);
});
test('vidéos : partagées ou où il est tagué', () => assert.ok(v.media.every((m) => m.shared || m.playerIds.includes('p1') || m.markers.some((k) => k.playerId === 'p1'))));
test('la vidéo non partagée (lien d’exercice) est masquée', () => assert.ok(!v.media.some((m) => m.id === 'v3')));
test('rien n’est demandé tant que le coach n’a pas envoyé (dernière séance)', () => assert.ok(!v.todos.some((t) => t.key === 'seance:s5')));
const s5 = data.sessions.find((x) => x.id === 's5')!;
const presentIds = Object.entries(s5.attendance).filter(([, a]) => a === 'present' || a === 'retard').map(([id]) => id);
const sentData = { ...data, sessions: data.sessions.map((x) => (x.id === 's5' ? { ...x, feedbackRequest: newDispatch(presentIds) } : x)) };
const target = presentIds.find((id) => !s5.feedback?.[id])!;
test('après « Envoyer » : la tâche apparaît chez le joueur présent', () => assert.ok(buildPlayerView(sentData, target).todos.some((t) => t.key === 'seance:s5')));
const absent = data.players.find((p) => !presentIds.includes(p.id))!;
test('après « Envoyer » : rien pour un joueur non destinataire', () => assert.ok(!buildPlayerView(sentData, absent.id).todos.some((t) => t.key.startsWith('seance:s5'))));
const reminded = { ...sentData, sessions: sentData.sessions.map((x) => (x.id === 's5' ? { ...x, feedbackRequest: remind(x.feedbackRequest!) } : x)) };
test('relance : nouvelle clé de notification', () => assert.ok(buildPlayerView(reminded, target).todos.some((t) => t.key === 'seance:s5:r1')));
test('la vue joueur ne révèle pas les autres destinataires', () =>
  assert.deepEqual(buildPlayerView(sentData, target).sessions.find((x) => x.id === 's5')!.feedbackRequest!.to, [target]));
const draft = { ...data, surveys: [{ ...data.surveys[0], id: 'draft', dispatch: undefined }] };
test('questionnaire brouillon invisible pour le joueur', () => assert.ok(!buildPlayerView(draft, 'p1').surveys.some((x) => x.id === 'draft')));
test('migration : anciennes données considérées comme envoyées', () => {
  const legacy = { ...data, sendModel: undefined, sessions: data.sessions.map((x) => ({ ...x, feedbackRequest: undefined })) };
  const migrated = normalizeData(legacy, 'A');
  assert.equal(migrated.sendModel, 1);
  assert.ok(migrated.sessions.find((x) => x.id === 's5')!.feedbackRequest);
  assert.deepEqual(normalizeData(migrated, 'A'), migrated);
});
test('news : compo et préparation du prochain match', () => assert.ok(v.news.some((n) => n.key === 'compo:m3') && v.news.some((n) => n.key === 'prepa:m3')));
test('roster : code haché transmis, pas les notes', () => {
  const r = rosterFor(data).find((x) => x.id === 'p1')!;
  assert.equal(r.pinHash, 'hash-secret');
  assert.ok(!('notes' in r));
});

// Fusion côté coach
const later = new Date(Date.now() + 60_000).toISOString();
const existing = data.reports.find((r) => r.playerId === 'p1' && r.matchId === 'm2')!;
const entries: Entry[] = [
  { kind: 'report', player_id: 'p1', ref_id: 'm2', payload: { ...existing, rpe: 3, coachRating: 1, coachComment: 'piraté', updatedAt: later } },
  { kind: 'training_feedback', player_id: 'p1', ref_id: 's5', payload: { quality: 9, selfPerf: 8, intensity: 7, updatedAt: later } },
  { kind: 'objective', player_id: 'p1', ref_id: 'o0', payload: { playerProgress: 9, playerComment: 'Beaucoup mieux' } },
  { kind: 'objective', player_id: 'p1', ref_id: 'o2', payload: { playerProgress: 10 } }, // objectif d'un autre joueur
  { kind: 'report', player_id: 'inconnu', ref_id: 'm2', payload: { ...existing, playerId: 'inconnu' } },
];
const m = mergeEntries(data, entries);
const merged = m.data.reports.find((r) => r.playerId === 'p1' && r.matchId === 'm2')!;
test('fusion : réponse du joueur intégrée', () => assert.equal(merged.rpe, 3));
test('fusion : la note du coach ne peut pas être modifiée par le joueur', () => assert.equal(merged.coachRating, existing.coachRating));
test('fusion : ressenti d’entraînement intégré', () => assert.equal(m.data.sessions.find((s) => s.id === 's5')!.feedback!.p1.quality, 9));
test('fusion : progression de SON objectif', () => assert.equal(m.data.objectives.find((o) => o.id === 'o0')!.playerProgress, 9));
test('fusion : impossible de modifier l’objectif d’un autre joueur', () => assert.equal(m.data.objectives.find((o) => o.id === 'o2')!.playerProgress, undefined));
test('fusion : joueur inconnu ignoré', () => assert.ok(!m.data.reports.some((r) => r.playerId === 'inconnu')));
test('fusion idempotente (2e passage sans changement)', () => assert.equal(mergeEntries(m.data, entries).changed, false));
test('une ancienne réponse n’écrase pas une plus récente', () => {
  const old: Entry[] = [{ kind: 'report', player_id: 'p1', ref_id: 'm2', payload: { ...existing, rpe: 10, updatedAt: '2000-01-01T00:00:00Z' } }];
  assert.equal(mergeEntries(m.data, old).data.reports.find((r) => r.playerId === 'p1' && r.matchId === 'm2')!.rpe, 3);
});

// Signaux faibles et entretiens
test('les entretiens ne sont jamais transmis au joueur', () => assert.deepEqual(buildPlayerView(data, 'p9').interviews, []));
test('le mot du coach est notifié aux joueurs', () => assert.ok(v.news.some((n) => n.key.startsWith('mot:m2'))));
{
  const base = { ...data, reports: data.reports.map((r) => ({ ...r })), sessions: data.sessions.map((x) => ({ ...x, feedback: { ...x.feedback } })) };
  // p3 : perf perso en chute sur les 2 derniers matchs/séances
  const pts = playerTimeline(base, 'p3');
  const perf = [...pts.selfRating, ...pts.trainingPerf].sort((a, b) => a.date.localeCompare(b.date));
  const lastDates = perf.slice(-2).map((p) => p.date);
  for (const r of base.reports.filter((r) => r.playerId === 'p3')) {
    const d = base.matches.find((m) => m.id === r.matchId)!.date;
    r.selfRating = lastDates.includes(d) ? 3 : 8;
  }
  for (const x of base.sessions) if (x.feedback?.p3) x.feedback.p3 = { ...x.feedback.p3, selfPerf: lastDates.includes(x.date) ? 3 : 8 };
  test('alerte « ressenti en baisse »', () => assert.ok(insightAlerts(base).some((a) => a.playerId === 'p3' && a.kind === 'decline')));
  test('entretien : points à aborder préparés', () => assert.ok(interviewBrief(base, 'p3').some((l) => l.startsWith('Perf perso ressentie'))));
}
{
  const old = new Date(Date.now() - 5 * 86_400_000).toISOString();
  const silentData = {
    ...data,
    sessions: data.sessions.map((x) => ({ ...x, feedbackRequest: { sentAt: old, to: [ 'p6' ] as string[] }, feedback: { ...x.feedback, p6: undefined as never } })),
  };
  test('alerte « ne répond plus »', () => assert.ok(insightAlerts(silentData).some((a) => a.playerId === 'p6' && a.kind === 'silence')));
}
console.log(`\n${ok} tests OK`);
