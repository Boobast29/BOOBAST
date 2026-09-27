import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { InjuryList } from '@/components/InjuryList';
import { playerAttributes, tierFor } from '@/lib/rating';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Empty, Field, Row, Screen, Section, Toggle, Txt } from '@/components/ui';
import { POSITIONS } from '@/lib/constants';
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
          {data.players.length > 5 && <Field label="Rechercher" value={q} onChangeText={setQ} placeholder="Nom, poste, numéro…" />}
          {data.players.some((p) => p.archived) && (
            <Toggle label="Afficher les joueurs archivés" icon="archive-outline" value={showArchived} onChange={setShowArchived} />
          )}
          {total === 0 && <Empty icon="people-outline" text="Aucun joueur pour le moment. Ajoutez votre effectif pour commencer le suivi." />}

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
                      ) : (
                        <OverallChip value={playerAttributes(data, p).overall} />
                      )}
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

/** Note globale de la carte joueur, aux couleurs de son niveau (bronze, argent, or, QEA). */
function OverallChip({ value }: { value?: number }) {
  const tier = tierFor(value);
  return (
    <LinearGradient colors={tier.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 52, borderRadius: 12, borderTopLeftRadius: 18, borderTopRightRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: tier.text, fontWeight: '900', fontSize: 18 }}>{value ?? '–'}</Text>
      <Text style={{ color: tier.text, fontWeight: '800', fontSize: 8, opacity: 0.8 }}>{tier.name.toUpperCase()}</Text>
    </LinearGradient>
  );
}
