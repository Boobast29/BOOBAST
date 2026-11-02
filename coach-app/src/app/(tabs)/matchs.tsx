import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ScorePill } from '@/components/ScorePill';
import { useTheme } from '@/components/theme';
import { Button, Empty, List, ListRow, Progress, Row, Screen, Section, Segmented, Txt } from '@/components/ui';
import { matchRequest, sessionRequest } from '@/lib/requests';
import { useStore } from '@/lib/store';
import { byDateDesc, sessionPresent, today } from '@/lib/stats';
import type { Match, TrainingSession } from '@/lib/types';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Bloc date (jour + mois) en tête de ligne. */
function DateBlock({ date, muted }: { date: string; muted?: boolean }) {
  const t = useTheme();
  const [, mo, d] = date.split('-');
  return (
    <View style={{ alignItems: 'center', width: 40 }}>
      <Text style={{ color: muted ? t.muted : t.text, fontSize: 20, fontWeight: '700' }}>{d}</Text>
      <Text style={{ color: t.muted, fontSize: 11, fontWeight: '600' }}>{MONTHS[Number(mo) - 1]}</Text>
    </View>
  );
}

export default function Agenda() {
  const [view, setView] = useState<'matchs' | 'seances'>('matchs');
  return (
    <Screen>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          ['matchs', 'Matchs', 'football'],
          ['seances', 'Entraînements', 'fitness'],
        ]}
      />
      {view === 'seances' ? <Sessions /> : <Matches />}
    </Screen>
  );
}

function Matches() {
  const t = useTheme();
  const { data } = useStore();
  const matches = [...data.matches].sort(byDateDesc);
  const upcoming = matches.filter((m) => m.scoreFor == null && m.date >= today()).reverse();
  const past = matches.filter((m) => !upcoming.includes(m));

  const status = (m: Match) => {
    const r = matchRequest(data, m);
    if (!r.dispatch) return m.scoreFor != null || m.date < today() ? 'Questionnaire à envoyer' : undefined;
    return `Questionnaires ${r.answered.size}/${r.recipients.length}`;
  };

  const rows = (list: Match[]) => (
    <List>
      {list.map((m, i) => {
        const videos = data.media.filter((x) => x.matchId === m.id).length;
        const lineup = data.lineups.find((l) => l.matchId === m.id);
        const st = status(m);
        const sub = [
          m.home ? 'Domicile' : 'Extérieur',
          m.competition,
          videos ? `${videos} vidéo${videos > 1 ? 's' : ''}` : undefined,
          m.scoreFor == null ? (lineup?.published ? 'compo publiée' : lineup ? 'compo en cours' : 'compo à faire') : undefined,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <ListRow
            key={m.id}
            first={i === 0}
            left={<DateBlock date={m.date} />}
            title={`${m.home ? 'vs' : '@'} ${m.opponent}`}
            subtitle={
              <View style={{ gap: 2 }}>
                <Text style={{ color: t.muted, fontSize: 13 }} numberOfLines={1}>
                  {sub}
                </Text>
                {st ? <Text style={{ color: st.endsWith('envoyer') ? t.warning : t.muted, fontSize: 12, fontWeight: st.endsWith('envoyer') ? '600' : '400' }}>{st}</Text> : null}
              </View>
            }
            right={m.scoreFor != null ? <ScorePill m={m} /> : null}
            onPress={() => router.push(`/match/${m.id}`)}
          />
        );
      })}
    </List>
  );

  return (
    <>
      <Button title="Nouveau match" icon="add" onPress={() => router.push('/match/edit')} />
      {matches.length === 0 && <Empty icon="football-outline" text="Aucun match enregistré. Créez votre premier match pour lancer les questionnaires." />}
      {upcoming.length > 0 && (
        <>
          <Section>À venir</Section>
          {rows(upcoming)}
        </>
      )}
      {past.length > 0 && (
        <>
          <Section>Joués · {past.length}</Section>
          {rows(past)}
        </>
      )}
    </>
  );
}

function Sessions() {
  const t = useTheme();
  const { data } = useStore();
  const list = [...data.sessions].sort(byDateDesc);
  const past = list.filter((x) => x.date <= today());
  const upcoming = list.filter((x) => x.date > today()).reverse();
  const avgRate = past.length ? past.reduce((a, x) => a + sessionPresent(x) / Math.max(1, Object.keys(x.attendance).length), 0) / past.length : undefined;

  const rows = (items: TrainingSession[]) => (
    <List>
      {items.map((x, i) => {
        const total = Object.keys(x.attendance).length;
        const r = sessionRequest(data, x);
        const st = !total
          ? x.date <= today()
            ? 'Appel à faire'
            : undefined
          : !r.dispatch
            ? 'Ressenti à envoyer'
            : `Ressentis ${r.answered.size}/${r.recipients.length}`;
        return (
          <ListRow
            key={x.id}
            first={i === 0}
            left={<DateBlock date={x.date} muted={x.date > today()} />}
            title={x.theme ?? 'Entraînement'}
            subtitle={
              <View style={{ gap: 2 }}>
                <Text style={{ color: t.muted, fontSize: 13 }}>{[x.time, `${x.durationMin}′`, x.rpe != null ? `RPE ${x.rpe}` : undefined].filter(Boolean).join(' · ')}</Text>
                {st ? <Text style={{ color: st.includes('à ') ? t.warning : t.muted, fontSize: 12, fontWeight: st.includes('à ') ? '600' : '400' }}>{st}</Text> : null}
              </View>
            }
            right={
              total ? (
                <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>
                  {sessionPresent(x)}
                  <Text style={{ color: t.muted, fontWeight: '400' }}>/{total}</Text>
                </Text>
              ) : null
            }
            onPress={() => router.push(`/seance/${x.id}`)}
          />
        );
      })}
    </List>
  );

  return (
    <>
      <Button title="Nouvelle séance" icon="add" onPress={() => router.push('/seance/edit')} />
      {avgRate != null && (
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={14}>Assiduité moyenne</Txt>
            <Txt bold size={14}>
              {Math.round(avgRate * 100)} % · {past.length} séance{past.length > 1 ? 's' : ''}
            </Txt>
          </Row>
          <Progress value={avgRate} height={6} />
        </View>
      )}
      {list.length === 0 && <Empty icon="fitness-outline" text="Aucune séance. Créez vos entraînements pour faire l’appel et suivre la charge de travail." />}
      {upcoming.length > 0 && (
        <>
          <Section>À venir</Section>
          {rows(upcoming)}
        </>
      )}
      {past.length > 0 && (
        <>
          <Section>Passées · {past.length}</Section>
          {rows(past)}
        </>
      )}
    </>
  );
}
