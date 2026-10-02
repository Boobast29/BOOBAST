import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { InjuryList } from '@/components/InjuryList';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Empty, Link, List, ListRow, Row, Screen, SearchField, Section, Segmented, Toggle } from '@/components/ui';
import { POSITIONS } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { fmt, initials, playerName, summarizePlayer } from '@/lib/stats';
import type { PlayerSummary } from '@/lib/stats';

export default function Players() {
  const t = useTheme();
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [tab, setTab] = useState<'effectif' | 'infirmerie'>('effectif');
  const injuredCount = data.injuries.filter((i) => i.status !== 'guérie').length;

  const groups = useMemo(() => {
    const list = data.players
      .filter((p) => showArchived || !p.archived)
      .filter((p) => `${p.firstName} ${p.lastName} ${p.position ?? ''} ${p.number ?? ''}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.lastName.localeCompare(b.lastName))
      .map((p) => summarizePlayer(data, p));
    const order = [...POSITIONS, 'Sans poste'];
    const byPos = new Map<string, PlayerSummary[]>();
    for (const s of list) {
      const key = s.player.position && POSITIONS.includes(s.player.position) ? s.player.position : 'Sans poste';
      byPos.set(key, [...(byPos.get(key) ?? []), s]);
    }
    return order.filter((k) => byPos.has(k)).map((k) => [k, byPos.get(k)!] as const);
  }, [data, q, showArchived]);

  const total = groups.reduce((a, [, l]) => a + l.length, 0);

  return (
    <Screen>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          ['effectif', 'Effectif', 'people'],
          ['infirmerie', `Infirmerie${injuredCount ? ` (${injuredCount})` : ''}`, 'medkit'],
        ]}
      />
      {tab === 'infirmerie' ? (
        <InjuryList />
      ) : (
        <>
          {data.players.length > 5 && <SearchField value={q} onChangeText={setQ} placeholder="Rechercher : nom, poste, numéro…" />}
          {total === 0 && (
            <Empty
              icon="people-outline"
              text="Aucun joueur pour le moment. Ajoutez votre effectif pour commencer le suivi."
              action={<Button title="Ajouter un joueur" icon="person-add" onPress={() => router.push('/joueur/edit')} />}
            />
          )}

          {groups.map(([pos, list], gi) => (
            <View key={pos} style={{ gap: 8 }}>
              <Section action={gi === 0 ? <Link title="+ Ajouter un joueur" onPress={() => router.push('/joueur/edit')} /> : undefined}>
                {pos === 'Sans poste' ? pos : `${pos}s`} · {list.length}
              </Section>
              <List>
                {list.map((s, i) => {
                  const p = s.player;
                  const inj = s.activeInjury;
                  const status = p.archived ? t.muted : inj ? (inj.status === 'active' ? t.danger : t.warning) : t.primary;
                  return (
                    <ListRow
                      key={p.id}
                      first={i === 0}
                      chevron={false}
                      onPress={() => router.push(`/joueur/${p.id}`)}
                      left={
                        <View>
                          <Avatar label={initials(p)} colorKey={p.id} photo={p.photoUri} size={42} />
                          <View
                            style={{
                              position: 'absolute',
                              right: -1,
                              bottom: -1,
                              width: 14,
                              height: 14,
                              borderRadius: 7,
                              backgroundColor: status,
                              borderWidth: 2.5,
                              borderColor: t.card,
                            }}
                          />
                        </View>
                      }
                      title={playerName(p)}
                      subtitle={
                        <Row style={{ gap: 12 }}>
                          <Mini icon="football-outline" value={s.totals.goals} />
                          <Mini icon="git-branch-outline" value={s.totals.assists} />
                          <Mini icon="time-outline" value={`${s.minutes}′`} />
                          <Mini icon="star-outline" value={fmt(s.avgCoachRating)} />
                        </Row>
                      }
                      right={
                        p.archived ? (
                          <Badge text="Archivé" />
                        ) : inj ? (
                          <Badge text={inj.status === 'active' ? 'Blessé' : 'Reprise'} tone={inj.status === 'active' ? 'danger' : 'warning'} />
                        ) : s.avgWellness != null ? (
                          <FormGauge value={s.avgWellness} />
                        ) : null
                      }
                    />
                  );
                })}
              </List>
            </View>
          ))}
          {data.players.some((p) => p.archived) && (
            <Toggle label="Afficher les joueurs archivés" icon="archive-outline" value={showArchived} onChange={setShowArchived} />
          )}
        </>
      )}
    </Screen>
  );
}

function Mini({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string | number }) {
  const t = useTheme();
  return (
    <Row style={{ gap: 3 }}>
      <Ionicons name={icon} size={13} color={t.muted} />
      <Text style={{ color: t.muted, fontSize: 13, fontWeight: '600' }}>{value}</Text>
    </Row>
  );
}

/** Forme moyenne (bien-être /5), en couleur. */
function FormGauge({ value }: { value: number }) {
  const t = useTheme();
  const color = value < 2.5 ? t.danger : value < 3.5 ? t.warning : t.primary;
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ color, fontWeight: '800', fontSize: 16 }}>{fmt(value)}</Text>
      <Text style={{ color: t.muted, fontSize: 11 }}>forme</Text>
    </View>
  );
}
