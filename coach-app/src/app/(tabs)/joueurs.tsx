import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { InjuryList } from '@/components/InjuryList';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Empty, Field, Row, Screen, Section, Toggle, Txt } from '@/components/ui';
import { POSITIONS } from '@/lib/constants';
import { normalizeSearchText } from '@/lib/search';
import { useStore } from '@/lib/store';
import { fmt, initials, playerName, summarizePlayer } from '@/lib/stats';
import type { PlayerSummary } from '@/lib/stats';

const POSITION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Gardien: 'hand-left-outline',
  Défenseur: 'shield-outline',
  Milieu: 'swap-horizontal-outline',
  Attaquant: 'flash-outline',
};

export default function Players() {
  const t = useTheme();
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [tab, setTab] = useState<'effectif' | 'infirmerie'>('effectif');
  const [positionFilter, setPositionFilter] = useState('Tous');
  const injuredCount = data.injuries.filter((i) => i.status !== 'guérie').length;
  const normalizedQuery = normalizeSearchText(q);
  const matchingPlayers = useMemo(
    () =>
      data.players.filter(
        (p) =>
          (showArchived || !p.archived) &&
          (!normalizedQuery || normalizeSearchText(`${p.firstName} ${p.lastName} ${p.position ?? ''} ${p.number ?? ''}`).includes(normalizedQuery)),
      ),
    [data.players, normalizedQuery, showArchived],
  );

  const groups = useMemo(() => {
    const list = matchingPlayers
      .filter((p) => positionFilter === 'Tous' || (p.position ?? 'Sans poste') === positionFilter)
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.lastName.localeCompare(b.lastName))
      .map((p) => summarizePlayer(data, p));
    const order = [...POSITIONS, 'Sans poste'];
    const byPos = new Map<string, PlayerSummary[]>();
    for (const s of list) {
      const key = s.player.position && POSITIONS.includes(s.player.position) ? s.player.position : 'Sans poste';
      byPos.set(key, [...(byPos.get(key) ?? []), s]);
    }
    return order.filter((k) => byPos.has(k)).map((k) => [k, byPos.get(k)!] as const);
  }, [data, matchingPlayers, positionFilter]);

  const total = groups.reduce((a, [, l]) => a + l.length, 0);
  const positionCount = (position: string) =>
    position === 'Tous' ? matchingPlayers.length : matchingPlayers.filter((p) => (p.position ?? 'Sans poste') === position).length;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', backgroundColor: t.input, borderRadius: 14, padding: 4 }}>
        {(
          [
            ['effectif', 'Effectif', 'people'],
            ['infirmerie', `Infirmerie${injuredCount ? ` (${injuredCount})` : ''}`, 'medkit'],
          ] as const
        ).map(([k, label, icon]) => {
          const on = tab === k;
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
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
      {tab === 'infirmerie' ? (
        <InjuryList />
      ) : (
        <>
          <Button title="Ajouter un joueur" icon="person-add" onPress={() => router.push('/joueur/edit')} />
          {data.players.length > 0 && <Field label="Rechercher dans l’effectif" value={q} onChangeText={setQ} placeholder="Nom, poste ou numéro…" />}
          {data.players.some((p) => p.archived) && (
            <Toggle label="Afficher les joueurs archivés" icon="archive-outline" value={showArchived} onChange={setShowArchived} />
          )}
          {data.players.length > 0 && (
            <View style={{ gap: 8 }}>
              <Txt muted size={12}>{total} joueur{total === 1 ? '' : 's'} affiché{total === 1 ? '' : 's'}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {['Tous', ...POSITIONS, 'Sans poste'].map((position) => {
                  const count = positionCount(position);
                  if (position !== 'Tous' && count === 0) return null;
                  const selected = positionFilter === position;
                  return (
                    <Pressable
                      key={position}
                      onPress={() => setPositionFilter(position)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 11,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: selected ? t.primary : t.card,
                        borderWidth: 1,
                        borderColor: selected ? t.primary : t.border,
                      }}
                    >
                      <Text style={{ color: selected ? t.primaryText : t.text, fontWeight: selected ? '800' : '600', fontSize: 12 }}>{position}</Text>
                      <Text style={{ color: selected ? t.primaryText : t.muted, fontWeight: '700', fontSize: 11 }}>{count}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          {total === 0 && (
            <Empty
              icon="people-outline"
              text={
                data.players.length === 0
                  ? 'Aucun joueur pour le moment. Ajoutez votre effectif pour commencer le suivi.'
                  : normalizedQuery
                    ? 'Aucun joueur ne correspond à cette recherche.'
                    : 'Aucun joueur dans ce filtre. Essayez une autre position ou affichez les joueurs archivés.'
              }
            />
          )}

          {groups.map(([pos, list]) => (
            <View key={pos} style={{ gap: 10 }}>
              <Section icon={POSITION_ICON[pos] ?? 'person-outline'}>
                {pos === 'Sans poste' ? pos : `${pos}s`} · {list.length}
              </Section>
              {list.map((s) => {
                const p = s.player;
                const inj = s.activeInjury;
                const status = p.archived ? t.muted : inj ? (inj.status === 'active' ? t.danger : t.warning) : t.primary;
                return (
                  <Card key={p.id} onPress={() => router.push(`/joueur/${p.id}`)} style={{ paddingVertical: 14 }}>
                    <Row style={{ gap: 12 }}>
                      <View>
                        <Avatar label={initials(p)} colorKey={p.id} photo={p.photoUri} size={48} />
                        <View
                          style={{
                            position: 'absolute',
                            right: -1,
                            bottom: -1,
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: status,
                            borderWidth: 3,
                            borderColor: t.card,
                          }}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Txt bold size={16}>
                          {playerName(p)}
                        </Txt>
                        <Row style={{ gap: 12 }}>
                          <Mini icon="football-outline" value={s.totals.goals} />
                          <Mini icon="git-branch-outline" value={s.totals.assists} />
                          <Mini icon="time-outline" value={`${s.minutes}′`} />
                          <Mini icon="star-outline" value={fmt(s.avgCoachRating)} />
                        </Row>
                      </View>
                      {p.archived ? (
                        <Badge text="Archivé" />
                      ) : inj ? (
                        <Badge text={inj.status === 'active' ? 'Blessé' : 'Reprise'} tone={inj.status === 'active' ? 'danger' : 'warning'} icon="medkit" />
                      ) : s.avgWellness != null ? (
                        <FormGauge value={s.avgWellness} />
                      ) : null}
                    </Row>
                  </Card>
                );
              })}
            </View>
          ))}
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
      <Text style={{ color: t.muted, fontSize: 10, fontWeight: '600' }}>FORME</Text>
    </View>
  );
}
