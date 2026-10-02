// Tests de la logique cloud : confidentialité des vues joueur et fusion des réponses.
// Lancer : npx tsx tests/views.test.ts
import assert from 'node:assert/strict';
import { buildDemoData } from '../src/lib/demo';
import { buildPlayerView, mergeEntries, rosterFor } from '../src/lib/cloud/views';
import type { Entry } from '../src/lib/cloud/views';
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
test('tâches calculées (ressenti de la dernière séance)', () => assert.ok(v.todos.some((t) => t.key.startsWith('seance:'))));
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
console.log(`\n${ok} tests OK`);
