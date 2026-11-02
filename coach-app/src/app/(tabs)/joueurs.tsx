import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { InjuryList } from '@/components/InjuryList';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Empty, Link, List, ListRow, Progress, Row, Screen, SearchField, Section, Segmented, Toggle, Txt } from '@/components/ui';
import { POSITIONS } from '@/lib/constants';
import { playingTime } from '@/lib/insights';
import { useStore } from '@/lib/store';
import { fmt, initials, playerName, summarizePlayer } from '@/lib/stats';
import type { PlayerSummary } from '@/lib/stats';

export default function Players() {
  const t = useTheme();
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [tab, setTab] = useState<'effectif' | 'temps' | 'infirmerie'>('effectif');
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
          ['temps', 'Temps de jeu', 'time'],
          ['infirmerie', `Infirmerie${injuredCount ? ` (${injuredCount})` : ''}`, 'medkit'],
        ]}
      />
      {tab === 'infirmerie' ? (
        <InjuryList />
      ) : tab === 'temps' ? (
        <PlayingTimeList />
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

/** Temps de jeu cumulé : qui joue, qui joue peu. */
function PlayingTimeList() {
  const t = useTheme();
  const { data } = useStore();
  const { rows, played, available } = useMemo(() => playingTime(data), [data]);
  const players = new Map(data.players.map((p) => [p.id, p]));
  if (!played) return <Empty icon="time-outline" text="Le temps de jeu apparaîtra après le premier match joué (minutes saisies dans les questionnaires)." />;
  return (
    <>
      <Txt muted size={13}>
        {played} match{played > 1 ? 's' : ''} joué{played > 1 ? 's' : ''} · {available}′ possibles par joueur. Les 3 cases : minutes sur les 3 derniers matchs (du plus récent au plus ancien).
      </Txt>
      <List>
        {rows.map((r, i) => {
          const p = players.get(r.playerId)!;
          const low = r.share < 0.3;
          return (
            <ListRow
              key={r.playerId}
              first={i === 0}
              chevron={false}
              onPress={() => router.push(`/joueur/${p.id}`)}
              left={<Avatar label={initials(p)} colorKey={p.id} photo={p.photoUri} size={36} />}
              title={playerName(p)}
              subtitle={
                <View style={{ gap: 5, marginTop: 2 }}>
                  <Row style={{ gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Progress value={r.share} height={6} color={low ? t.warning : t.primary} />
                    </View>
                    <Text style={{ color: low ? t.warning : t.muted, fontSize: 12, fontWeight: low ? '700' : '400', width: 36, textAlign: 'right' }}>
                      {Math.round(r.share * 100)} %
                    </Text>
                  </Row>
                  <Text style={{ color: t.muted, fontSize: 12 }}>
                    {r.appearances} match{r.appearances > 1 ? 's' : ''} · {r.starts} titularisation{r.starts > 1 ? 's' : ''}
                  </Text>
                </View>
              }
              right={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>{r.minutes}′</Text>
                  <Row style={{ gap: 3 }}>
                    {r.last.map((m, k) => (
                      <View key={k} style={{ minWidth: 26, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 4, backgroundColor: m == null ? t.input : m === 0 ? t.warningSoft : t.primarySoft }}>
                        <Text style={{ color: m == null ? t.muted : m === 0 ? t.warning : t.primary, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{m == null ? '–' : m}</Text>
                      </View>
                    ))}
                  </Row>
                </View>
              }
            />
          );
        })}
      </List>
    </>
  );
}
