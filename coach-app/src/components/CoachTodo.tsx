import { router } from 'expo-router';
import { PREP_FIELDS } from '@/lib/constants';
import { awaiting, coachRoute, missingOf, newDispatch, remind, toSend } from '@/lib/requests';
import { formatDate, matchLabel, today } from '@/lib/stats';
import { useStore } from '@/lib/store';
import { useDispatchWriter } from './SendPanel';
import { Link, List, ListRow, Section, SmallButton, Txt } from './ui';

/** « À faire » du coach : questionnaires à envoyer, réponses manquantes, prochain match à préparer. */
export function CoachTodo() {
  const { data } = useStore();
  const write = useDispatchWriter();
  const send = toSend(data);
  const allWaiting = awaiting(data);
  const wait = allWaiting.slice(0, 2);
  const activeCount = data.players.filter((p) => !p.archived).length;
  const next = data.matches.filter((m) => m.scoreFor == null && m.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextLineup = next && data.lineups.find((l) => l.matchId === next.id);
  const prepDone = next ? PREP_FIELDS.filter((f) => next.prep?.[f.key]?.trim()).length : 0;
  const nextTodo = next && (!nextLineup?.published || !next.prep?.published);

  // Entretiens dont la date de suivi est arrivée (et pas d'entretien plus récent)
  const followUps = data.interviews.filter(
    (iv) =>
      iv.followUp &&
      iv.followUp <= today() &&
      !data.interviews.some((x) => x.playerId === iv.playerId && x.date > iv.date) &&
      data.players.some((p) => p.id === iv.playerId && !p.archived),
  );

  const rows = send.length + wait.length + (nextTodo ? 1 : 0) + followUps.length;
  let i = 0;
  return (
    <>
      <Section action={allWaiting.length > wait.length ? <Link title="Tout voir" onPress={() => router.push('/suivi')} /> : undefined}>À faire</Section>
      {rows === 0 ? (
        <Txt muted size={14}>
          Rien en attente. Après le prochain match ou la prochaine séance, le questionnaire à envoyer apparaîtra ici.
        </Txt>
      ) : (
        <List>
          {send.map((r) => (
            <ListRow
              key={`s:${r.kind}:${r.id}`}
              first={i++ === 0}
              title={r.kind === 'match' ? `Questionnaire · ${r.subtitle}` : `Ressenti · ${r.subtitle}`}
              subtitle={`Pas encore envoyé · ${r.recipients.length} joueurs`}
              chevron={false}
              right={
                <SmallButton
                  label="Envoyer"
                  icon="paper-plane"
                  onPress={() => write(r, newDispatch(r.recipients.length === activeCount ? 'all' : r.recipients.map((p) => p.id)))}
                />
              }
              onPress={() => router.push(coachRoute(r) as never)}
            />
          ))}
          {wait.map((r) => {
            const missing = missingOf(r);
            return (
              <ListRow
                key={`w:${r.kind}:${r.id}`}
                first={i++ === 0}
                title={r.kind === 'sondage' ? r.title : r.subtitle}
                subtitle={`${missing.length} réponse${missing.length > 1 ? 's' : ''} manquante${missing.length > 1 ? 's' : ''} · ${missing
                  .slice(0, 3)
                  .map((p) => p.firstName)
                  .join(', ')}${missing.length > 3 ? '…' : ''}`}
                chevron={false}
                right={<SmallButton label="Relancer" icon="notifications-outline" kind="secondary" onPress={() => r.dispatch && write(r, remind(r.dispatch))} />}
                onPress={() => router.push(coachRoute(r) as never)}
              />
            );
          })}
          {next && nextTodo && (
            <ListRow
              first={i++ === 0}
              title={`Préparer ${matchLabel(next)}`}
              subtitle={`${formatDate(next.date)} · compo ${nextLineup?.published ? 'publiée' : nextLineup ? 'non publiée' : 'à faire'} · consignes ${
                next.prep?.published ? 'publiées' : `${prepDone}/${PREP_FIELDS.length}`
              }`}
              onPress={() => router.push(`/match/${next.id}`)}
            />
          )}
          {followUps.map((iv) => {
            const p = data.players.find((x) => x.id === iv.playerId)!;
            return (
              <ListRow
                key={`i:${iv.id}`}
                first={i++ === 0}
                title={`Faire le point avec ${p.firstName}`}
                subtitle={`Prévu le ${formatDate(iv.followUp)}${iv.decisions ? ` · ${iv.decisions}` : ''}`}
                onPress={() => router.push({ pathname: '/entretien', params: { playerId: p.id } })}
              />
            );
          })}
        </List>
      )}
    </>
  );
}
