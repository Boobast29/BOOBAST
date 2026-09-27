import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Avatar, Badge, Button, Card, Empty, Field, Row, Screen, Toggle, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { fmt, playerName, summarizePlayer } from '@/lib/stats';
import { View } from 'react-native';

export default function Players() {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const list = useMemo(
    () =>
      data.players
        .filter((p) => showArchived || !p.archived)
        .filter((p) => `${p.firstName} ${p.lastName} ${p.position ?? ''} ${p.number ?? ''}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.lastName.localeCompare(b.lastName))
        .map((p) => summarizePlayer(data, p)),
    [data, q, showArchived],
  );

  return (
    <Screen>
      <Button title="+ Ajouter un joueur" onPress={() => router.push('/joueur/edit')} />
      {data.players.length > 5 && <Field label="Rechercher" value={q} onChangeText={setQ} placeholder="Nom, poste, numéro…" />}
      {data.players.some((p) => p.archived) && <Toggle label="Afficher les joueurs archivés" value={showArchived} onChange={setShowArchived} />}
      {list.length === 0 && <Empty text="Aucun joueur pour le moment." />}
      {list.map((s) => {
        const p = s.player;
        const inj = s.activeInjury;
        return (
          <Card key={p.id} onPress={() => router.push(`/joueur/${p.id}`)}>
            <Row>
              <Avatar label={p.number != null ? String(p.number) : (p.firstName[0] ?? '?') + (p.lastName[0] ?? '')} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold>{playerName(p)}</Txt>
                <Txt muted size={13}>
                  {[p.position, `${s.matchesPlayed} match${s.matchesPlayed > 1 ? 's' : ''}`, `${s.minutes} min`].filter(Boolean).join(' · ')}
                </Txt>
              </View>
              {p.archived ? (
                <Badge text="Archivé" />
              ) : inj ? (
                <Badge text={inj.status === 'active' ? 'Blessé' : 'Reprise'} tone={inj.status === 'active' ? 'danger' : 'warning'} />
              ) : (
                <Badge text="Dispo" tone="success" />
              )}
            </Row>
            <Row style={{ gap: 14 }}>
              <Txt muted size={13}>⚽ {s.totals.goals}</Txt>
              <Txt muted size={13}>🅰️ {s.totals.assists}</Txt>
              <Txt muted size={13}>Note {fmt(s.avgCoachRating)}</Txt>
              <Txt muted size={13}>Forme {fmt(s.avgWellness)}/5</Txt>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
