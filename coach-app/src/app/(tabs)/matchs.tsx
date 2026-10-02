import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScorePill } from '@/components/ScorePill';
import { useTheme } from '@/components/theme';
import { Badge, Button, Card, Empty, Field, Progress, Row, Screen, Section, Txt } from '@/components/ui';
import { ATTENDANCE } from '@/lib/constants';
import { normalizeSearchText } from '@/lib/search';
import { useStore } from '@/lib/store';
import { byDateDesc, formatDate, matchResult, sessionPresent, today, trainingLoad } from '@/lib/stats';
import type { Match } from '@/lib/types';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export default function Matches() {
  const t = useTheme();
  const { data } = useStore();
  const matches = [...data.matches].sort(byDateDesc);
  const upcoming = matches.filter((m) => m.scoreFor == null && m.date >= today()).reverse();
  const past = matches.filter((m) => !upcoming.includes(m));
  const activeCount = data.players.filter((p) => !p.archived).length;
  const [view, setView] = useState<'matchs' | 'seances'>('matchs');
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeSearchText(query);
  const matchesSearch = (m: Match) =>
    !normalizedQuery || normalizeSearchText(`${m.opponent} ${m.competition ?? ''}`).includes(normalizedQuery);
  const filteredUpcoming = upcoming.filter(matchesSearch);
  const filteredPast = past.filter(matchesSearch);

  const stripe = (m: Match) => {
    const tone = matchResult(m).tone;
    return tone === 'win' ? t.primary : tone === 'loss' ? t.danger : tone === 'draw' ? t.muted : t.info;
  };

  const renderMatch = (m: Match) => {
    const filled = data.reports.filter((r) => r.matchId === m.id).length;
    const videos = data.media.filter((x) => x.matchId === m.id).length;
    const [, mo, d] = m.date.split('-');
    return (
      <Card key={m.id} onPress={() => router.push(`/match/${m.id}`)} stripe={stripe(m)}>
        <Row style={{ gap: 12 }}>
          <View style={{ alignItems: 'center', width: 44 }}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{d}</Text>
            <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>{MONTHS[Number(mo) - 1]}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt bold size={16} numberOfLines={1}>
              {m.opponent}
            </Txt>
            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              <Badge text={m.home ? 'Domicile' : 'Extérieur'} icon={m.home ? 'home' : 'airplane'} />
              {m.competition ? <Badge text={m.competition} tone="info" /> : null}
              {videos > 0 ? <Badge text={String(videos)} tone="violet" icon="videocam" /> : null}
            </Row>
          </View>
          {m.scoreFor != null ? <ScorePill m={m} /> : <Badge text="À jouer" tone="info" icon="calendar" />}
        </Row>
        {m.scoreFor != null && activeCount > 0 && (
          <Row style={{ gap: 10 }}>
            <Ionicons name="clipboard-outline" size={15} color={t.muted} />
            <View style={{ flex: 1 }}>
              <Progress value={filled / activeCount} height={6} />
            </View>
            <Txt muted size={12}>
              {filled}/{activeCount}
            </Txt>
          </Row>
        )}
      </Card>
    );
  };

  return (
    <Screen>
      <Segmented value={view} onChange={setView} />
      {view === 'seances' ? (
        <Sessions />
      ) : (
        <>
          <Button title="Nouveau match" icon="add-circle" onPress={() => router.push('/match/edit')} />
          {matches.length > 0 && <Field label="Rechercher un match" value={query} onChangeText={setQuery} placeholder="Adversaire ou compétition…" />}
          {matches.length === 0 && <Empty icon="football-outline" text="Aucun match enregistré. Créez votre premier match pour lancer les questionnaires." />}
          {filteredUpcoming.length > 0 && <Section icon="calendar-outline">À venir · {filteredUpcoming.length}</Section>}
          {filteredUpcoming.map(renderMatch)}
          {filteredPast.length > 0 && <Section icon="checkmark-done-outline">Joués · {filteredPast.length}</Section>}
          {filteredPast.map(renderMatch)}
          {matches.length > 0 && filteredUpcoming.length + filteredPast.length === 0 && (
            <Empty icon="search-outline" text="Aucun match ne correspond à cette recherche." />
          )}
        </>
      )}
    </Screen>
  );
}

function Segmented({ value, onChange }: { value: 'matchs' | 'seances'; onChange: (v: 'matchs' | 'seances') => void }) {
  const t = useTheme();
  const opts = [
    ['matchs', 'Matchs', 'football'],
    ['seances', 'Entraînements', 'fitness'],
  ] as const;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.input, borderRadius: 14, padding: 4 }}>
      {opts.map(([k, label, icon]) => {
        const on = value === k;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 11,
              backgroundColor: on ? t.card : 'transparent',
            }}
          >
            <Ionicons name={icon} size={16} color={on ? t.primary : t.muted} />
            <Text style={{ color: on ? t.text : t.muted, fontWeight: on ? '800' : '600' }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Sessions() {
  const t = useTheme();
  const { data } = useStore();
  const list = [...data.sessions].sort(byDateDesc);
  const past = list.filter((x) => x.date <= today());
  const avgRate = past.length ? past.reduce((a, x) => a + sessionPresent(x) / Math.max(1, Object.keys(x.attendance).length), 0) / past.length : undefined;
  return (
    <>
      <Button title="Nouvelle séance" icon="add-circle" onPress={() => router.push('/seance/edit')} />
      {avgRate != null && (
        <Card>
          <Row>
            <Ionicons name="stats-chart" size={18} color={t.primary} />
            <Txt bold>Assiduité moyenne : {Math.round(avgRate * 100)} %</Txt>
          </Row>
          <Progress value={avgRate} />
          <Txt muted size={12}>
            Sur {past.length} séance{past.length > 1 ? 's' : ''}
          </Txt>
        </Card>
      )}
      {list.length === 0 && <Empty icon="fitness-outline" text="Aucune séance. Créez vos entraînements pour faire l’appel et suivre la charge de travail." />}
      {list.map((x) => {
        const total = Object.keys(x.attendance).length;
        const present = sessionPresent(x);
        const absent = Object.values(x.attendance).filter((a) => a === 'absent').length;
        const load = Object.keys(x.attendance).reduce((a, pid) => a + trainingLoad(x, pid), 0);
        const [, mo, d] = x.date.split('-');
        return (
          <Card key={x.id} stripe={x.date > today() ? t.info : t.primary} onPress={() => router.push(`/seance/${x.id}`)}>
            <Row style={{ gap: 12 }}>
              <View style={{ alignItems: 'center', width: 44 }}>
                <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{d}</Text>
                <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>{MONTHS[Number(mo) - 1]}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt bold size={16}>
                  {x.theme ?? 'Entraînement'}
                </Txt>
                <Row style={{ flexWrap: 'wrap', gap: 6 }}>
                  <Badge text={`${x.time ?? ''}${x.time ? ' · ' : ''}${x.durationMin}′`} icon="time-outline" />
                  {x.rpe != null && <Badge text={`RPE ${x.rpe}`} tone="warning" icon="flame" />}
                  {absent > 0 && <Badge text={`${absent} ${ATTENDANCE.absent.label.toLowerCase()}${absent > 1 ? 's' : ''}`} tone="danger" />}
                </Row>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: t.primary, fontSize: 18, fontWeight: '800' }}>
                  {present}/{total}
                </Text>
                <Text style={{ color: t.muted, fontSize: 11 }}>{load ? `charge ${load}` : formatDate(x.date).slice(0, 5)}</Text>
              </View>
            </Row>
          </Card>
        );
      })}
    </>
  );
}
