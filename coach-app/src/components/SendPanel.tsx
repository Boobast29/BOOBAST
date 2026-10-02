import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { confirm } from '@/lib/confirm';
import { answeredOf, missingOf, newDispatch, remind } from '@/lib/requests';
import type { Request } from '@/lib/requests';
import { initials, playerName } from '@/lib/stats';
import { useStore } from '@/lib/store';
import type { Dispatch, ID } from '@/lib/types';
import { useTheme } from './theme';
import { Avatar, Button, Card, Progress, Row, Txt, tap } from './ui';

/** Groupe de destinataires proposé avant l'envoi (ex. « Joueurs de la compo »). */
export type RecipientGroup = { label: string; to: 'all' | ID[] };

/** Enregistre l'envoi d'une demande sur le bon objet (match, séance, questionnaire). */
export function useDispatchWriter() {
  const { data, saveMatch, saveSession, saveSurvey } = useStore();
  return (r: Pick<Request, 'kind' | 'id'>, dispatch: Dispatch | undefined) => {
    if (r.kind === 'match') {
      const m = data.matches.find((x) => x.id === r.id);
      if (m) saveMatch({ ...m, questionnaire: dispatch });
    } else if (r.kind === 'seance') {
      const x = data.sessions.find((y) => y.id === r.id);
      if (x) saveSession({ ...x, feedbackRequest: dispatch });
    } else {
      const s = data.surveys.find((y) => y.id === r.id);
      if (s) saveSurvey({ ...s, dispatch, open: dispatch ? true : s.open, target: dispatch ? dispatch.to : s.target });
    }
  };
}

const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Bloc « Envoyer aux joueurs » / suivi des réponses, commun aux matchs, séances et questionnaires.
 * Les joueurs ne voient la demande (et ne reçoivent la notification) qu'après l'envoi.
 */
export function SendPanel({ request: r, groups, title }: { request: Request; groups: RecipientGroup[]; title?: string }) {
  const t = useTheme();
  const { data } = useStore();
  const write = useDispatchWriter();
  const [groupIdx, setGroupIdx] = useState(0);
  const [picked, setPicked] = useState<ID[] | null>(null);
  const active = data.players.filter((p) => !p.archived).sort((a, b) => a.lastName.localeCompare(b.lastName));

  if (!r.dispatch) {
    const to: 'all' | ID[] = picked ?? groups[groupIdx]?.to ?? 'all';
    const count = to === 'all' ? active.length : to.length;
    return (
      <Card>
        <View style={{ gap: 2 }}>
          <Txt bold size={16}>
            {title ?? r.title}
          </Txt>
          <Text style={{ color: t.warning, fontSize: 13, fontWeight: '600' }}>Pas encore envoyé</Text>
        </View>
        <Txt muted size={14}>
          Les joueurs ne le voient pas encore. Choisissez à qui l’envoyer : ils reçoivent une notification et le questionnaire apparaît dans leur espace.
        </Txt>

        <View style={{ gap: 2 }}>
          {groups.map((g, i) => {
            const on = picked == null && i === groupIdx;
            const n = g.to === 'all' ? active.length : g.to.length;
            return (
              <Choice
                key={g.label}
                on={on}
                label={g.label}
                detail={`${n} joueur${n > 1 ? 's' : ''}`}
                onPress={() => {
                  setPicked(null);
                  setGroupIdx(i);
                }}
              />
            );
          })}
          <Choice on={picked != null} label="Choisir les joueurs" detail={picked ? `${picked.length} choisi${picked.length > 1 ? 's' : ''}` : ''} onPress={() => setPicked(picked ?? (to === 'all' ? active.map((p) => p.id) : to))} />
        </View>

        {picked != null && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {active.map((p) => {
              const on = picked.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    tap();
                    setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id]);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: on ? t.primarySoft : t.input,
                  }}
                >
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={on ? t.primary : t.muted} />
                  <Text style={{ color: on ? t.text : t.muted, fontSize: 14 }}>{playerName(p)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Button
          icon="paper-plane"
          title={`Envoyer à ${count} joueur${count > 1 ? 's' : ''}`}
          disabled={count === 0}
          onPress={() => write(r, newDispatch(to))}
        />
      </Card>
    );
  }

  const d = r.dispatch;
  const missing = missingOf(r);
  const answered = answeredOf(r);
  const total = r.recipients.length;
  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Txt bold size={16}>
          {title ?? r.title}
        </Txt>
        <Row style={{ gap: 4 }}>
          <Ionicons name="paper-plane" size={13} color={t.primary} />
          <Text style={{ color: t.primary, fontSize: 13, fontWeight: '600' }}>Envoyé le {when(d.sentAt)}</Text>
        </Row>
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt size={14}>Réponses</Txt>
        <Txt bold size={14}>
          {answered.length} / {total}
        </Txt>
      </Row>
      <Progress value={total ? answered.length / total : 0} height={6} />

      {missing.length > 0 ? (
        <>
          <Txt muted size={13}>
            En attente : {missing.map((p) => p.firstName).join(', ')}
          </Txt>
          {r.open ? (
            <>
              <Button
                kind="secondary"
                small
                icon="notifications-outline"
                title={missing.length === 1 ? `Relancer ${missing[0].firstName}` : `Relancer les ${missing.length} joueurs`}
                onPress={() => write(r, remind(d))}
              />
              {d.remindedAt ? (
                <Txt muted size={12}>
                  {d.reminders} relance{(d.reminders ?? 0) > 1 ? 's' : ''}, la dernière le {when(d.remindedAt)}.
                </Txt>
              ) : null}
            </>
          ) : (
            <Txt muted size={12}>
              Clôturé : les joueurs ne peuvent plus répondre.
            </Txt>
          )}
        </>
      ) : (
        <Row>
          <Ionicons name="checkmark-circle" size={18} color={t.primary} />
          <Txt size={14}>Tout le monde a répondu.</Txt>
        </Row>
      )}

      {answered.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {answered.map((p) => (
            <Avatar key={p.id} size={26} colorKey={p.id} photo={p.photoUri} label={initials(p)} />
          ))}
        </View>
      )}

      {answered.length === 0 && (
        <Button
          kind="ghost"
          small
          title="Annuler l’envoi"
          onPress={() => confirm('Annuler l’envoi ?', 'Le questionnaire disparaîtra de l’espace des joueurs.', () => write(r, undefined), 'Annuler l’envoi')}
        />
      )}
    </Card>
  );
}

function Choice({ on, label, detail, onPress }: { on: boolean; label: string; detail: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? t.primary : t.muted} />
      <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>{label}</Text>
      <Text style={{ color: t.muted, fontSize: 13 }}>{detail}</Text>
    </Pressable>
  );
}
