import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ScorePill } from '@/components/ScorePill';
import { useTheme } from '@/components/theme';
import { Badge, Button, Card, Empty, Progress, Row, Screen, Section, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { byDateDesc, matchResult, today } from '@/lib/stats';
import type { Match } from '@/lib/types';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export default function Matches() {
  const t = useTheme();
  const { data } = useStore();
  const matches = [...data.matches].sort(byDateDesc);
  const upcoming = matches.filter((m) => m.scoreFor == null && m.date >= today()).reverse();
  const past = matches.filter((m) => !upcoming.includes(m));
  const activeCount = data.players.filter((p) => !p.archived).length;

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
      <Button title="Nouveau match" icon="add-circle" onPress={() => router.push('/match/edit')} />
      {matches.length === 0 && <Empty icon="football-outline" text="Aucun match enregistré. Créez votre premier match pour lancer les questionnaires." />}
      {upcoming.length > 0 && <Section icon="calendar-outline">À venir</Section>}
      {upcoming.map(renderMatch)}
      {past.length > 0 && <Section icon="checkmark-done-outline">Joués · {past.length}</Section>}
      {past.map(renderMatch)}
    </Screen>
  );
}
