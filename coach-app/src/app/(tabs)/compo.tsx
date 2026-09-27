import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ClubLogo } from '@/components/ClubLogo';
import { Pitch } from '@/components/Pitch';
import type { TokenInfo } from '@/components/Pitch';
import { shadow, useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Empty, Field, IconCircle, Row, Screen, Section, StatBox, tap, Toggle, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { autoLineup, DEFAULT_FORMATION, emptyLineup, FORMATION_KEYS, FORMATIONS, MAX_BENCH, remapFormation, selectionScore } from '@/lib/formations';
import { useStore } from '@/lib/store';
import { activeInjury, avg, byDateDesc, fmt, formatDate, initials, playerName, reportsForPlayer, summarizePlayer, today } from '@/lib/stats';
import type { Lineup, Match } from '@/lib/types';

type Draft = Omit<Lineup, 'updatedAt'>;
type Sel = { kind: 'slot'; index: number } | { kind: 'bench'; id: string } | null;

export default function Compo() {
  const t = useTheme();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const { data, session, saveLineup } = useStore();
  const isCoach = session?.role === 'coach';
  const me = session?.role === 'player' ? session.playerId : undefined;
  const pitchRef = useRef<View>(null);

  // Matchs proposés : à venir d'abord (le plus proche), puis joués (le plus récent)
  const matches = useMemo(() => {
    const upcoming = data.matches.filter((m) => m.date >= today() && m.scoreFor == null).sort((a, b) => a.date.localeCompare(b.date));
    const past = data.matches.filter((m) => !upcoming.includes(m)).sort(byDateDesc);
    const all = [...upcoming, ...past];
    return isCoach ? all : all.filter((m) => data.lineups.some((l) => l.matchId === m.id && l.published));
  }, [data.matches, data.lineups, isCoach]);

  const [picked, setPicked] = useState<string | undefined>(params.matchId);
  const matchId = picked && matches.some((m) => m.id === picked) ? picked : matches[0]?.id;
  const match = data.matches.find((m) => m.id === matchId);
  const stored = data.lineups.find((l) => l.matchId === matchId);
  const lineup: Draft | undefined = match ? stored ?? emptyLineup(match.id) : undefined;

  const [sel, setSel] = useState<Sel>(null);
  const [pickerFor, setPickerFor] = useState<number | 'bench' | null>(null);

  const info = useMemo(() => {
    const m = new Map<string, TokenInfo>();
    for (const p of data.players) {
      const inj = activeInjury(data, p.id);
      m.set(p.id, {
        player: p,
        form: summarizePlayer(data, p).avgWellness,
        injured: inj?.status === 'active' ? 'active' : inj?.status === 'reprise' ? 'reprise' : undefined,
        pain: reportsForPlayer(data, p.id)[0]?.pain,
      });
    }
    return m;
  }, [data]);

  if (!match || !lineup)
    return (
      <Screen>
        <Empty
          icon="grid-outline"
          text={isCoach ? 'Créez un match pour préparer sa composition.' : 'Aucune composition publiée par le coach pour le moment.'}
          action={isCoach ? <Button title="Nouveau match" icon="add-circle" onPress={() => router.push('/match/edit')} /> : undefined}
        />
      </Screen>
    );

  const def = FORMATIONS[lineup.formation] ?? FORMATIONS[DEFAULT_FORMATION];
  const update = (l: Draft) => {
    saveLineup(l);
  };
  const players = new Map(data.players.map((p) => [p.id, p]));
  const inXI = new Set(lineup.slots.filter(Boolean) as string[]);
  const inBench = new Set(lineup.bench);
  const notCalled = data.players.filter((p) => !p.archived && !inXI.has(p.id) && !inBench.has(p.id));

  // ---------- Actions coach ----------
  const placeInSlot = (index: number, id: string) => {
    const slots = [...lineup.slots];
    const prev = slots[index];
    const from = slots.indexOf(id);
    if (from !== -1) slots[from] = prev ?? null; // échange si déjà sur le terrain
    slots[index] = id;
    let bench = lineup.bench.filter((b) => b !== id);
    if (prev && from === -1) bench = [...bench, prev];
    update({ ...lineup, slots, bench });
  };

  const onSlotPress = (i: number) => {
    tap();
    if (!sel) {
      if (lineup.slots[i]) setSel({ kind: 'slot', index: i });
      else setPickerFor(i);
      return;
    }
    if (sel.kind === 'slot') {
      if (sel.index !== i) {
        const slots = [...lineup.slots];
        [slots[i], slots[sel.index]] = [slots[sel.index], slots[i]];
        update({ ...lineup, slots });
      }
    } else placeInSlot(i, sel.id);
    setSel(null);
  };

  const onBenchPress = (id: string) => {
    tap();
    if (sel?.kind === 'slot') {
      placeInSlot(sel.index, id);
      setSel(null);
    } else setSel(sel?.kind === 'bench' && sel.id === id ? null : { kind: 'bench', id });
  };

  const selectedId = sel?.kind === 'slot' ? lineup.slots[sel.index] : sel?.kind === 'bench' ? sel.id : undefined;
  const removeSelected = () => {
    if (!sel) return;
    if (sel.kind === 'slot') {
      const slots = [...lineup.slots];
      slots[sel.index] = null;
      update({ ...lineup, slots, captainId: lineup.captainId === selectedId ? undefined : lineup.captainId });
    } else update({ ...lineup, bench: lineup.bench.filter((b) => b !== sel.id) });
    setSel(null);
  };
  const toBench = () => {
    if (sel?.kind !== 'slot' || !selectedId) return;
    const slots = [...lineup.slots];
    slots[sel.index] = null;
    update({ ...lineup, slots, bench: [...lineup.bench, selectedId], captainId: lineup.captainId === selectedId ? undefined : lineup.captainId });
    setSel(null);
  };

  const share = async () => {
    try {
      if (Platform.OS === 'web') return notify('Partage', 'Le partage en image est disponible dans l’appli sur téléphone.');
      const uri = await captureRef(pitchRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Composition' });
    } catch (e) {
      notify('Partage impossible', String((e as Error)?.message ?? e));
    }
  };

  // ---------- Indicateurs ----------
  const xi = lineup.slots.filter(Boolean) as string[];
  const avgNote = avg(xi.map((id) => summarizePlayer(data, players.get(id)!).avgCoachRating));
  const avgForm = avg(xi.map((id) => info.get(id)?.form));
  const warnings: string[] = [];
  lineup.slots.forEach((id, i) => {
    if (!id) return;
    const p = players.get(id);
    const ti = info.get(id);
    if (ti?.injured === 'active') warnings.push(`${playerName(p)} est blessé (indisponible)`);
    else if (ti?.injured === 'reprise') warnings.push(`${playerName(p)} est en reprise`);
    else if (ti?.pain) warnings.push(`${playerName(p)} a signalé une douleur`);
    if (p?.position && p.position !== def[i].group) warnings.push(`${playerName(p)} (${p.position.toLowerCase()}) joue ${def[i].role}`);
  });

  const myStatus = me
    ? lineup.slots.includes(me)
      ? { tone: 'success' as const, icon: 'star' as const, text: `Titulaire · ${def[lineup.slots.indexOf(me)].role}${lineup.captainId === me ? ' · Capitaine' : ''}` }
      : lineup.bench.includes(me)
        ? { tone: 'info' as const, icon: 'people' as const, text: 'Remplaçant' }
        : { tone: 'neutral' as const, icon: 'remove-circle' as const, text: 'Non retenu pour ce match' }
    : undefined;

  return (
    <Screen>
      {/* Choix du match */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {matches.map((m) => (
          <MatchChip key={m.id} m={m} active={m.id === matchId} hasLineup={data.lineups.some((l) => l.matchId === m.id)} onPress={() => { setSel(null); setPicked(m.id); }} />
        ))}
      </ScrollView>

      {myStatus && (
        <Card>
          <Row>
            <IconCircle icon={myStatus.icon} tone={myStatus.tone} />
            <View style={{ flex: 1 }}>
              <Txt bold size={16}>
                {myStatus.text}
              </Txt>
              <Txt muted size={13}>
                {match.home ? 'vs' : '@'} {match.opponent} · {formatDate(match.date)}
              </Txt>
            </View>
          </Row>
        </Card>
      )}

      {/* Formation */}
      {isCoach && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FORMATION_KEYS.map((f) => {
            const on = f === lineup.formation;
            return (
              <Pressable
                key={f}
                onPress={() => {
                  tap();
                  setSel(null);
                  update(remapFormation(lineup, f));
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: on ? t.primary : t.card, borderWidth: t.dark ? 1 : 0, borderColor: t.border, ...shadow(t) }}
              >
                <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '800', fontSize: 15 }}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Terrain */}
      <View style={[{ borderRadius: 22 }, shadow(t, 2)]}>
        <Pitch
          ref={pitchRef}
          formation={lineup.formation}
          slots={lineup.slots}
          info={info}
          captainId={lineup.captainId}
          selectedIndex={sel?.kind === 'slot' ? sel.index : null}
          highlightId={me}
          onSlotPress={isCoach ? onSlotPress : undefined}
          onSlotLongPress={isCoach ? (i) => lineup.slots[i] && setSel({ kind: 'slot', index: i }) : undefined}
          caption={`${lineup.formation} · ${match.home ? 'vs' : '@'} ${match.opponent} · ${formatDate(match.date).slice(0, 5)}`}
          logo={<ClubLogo size={30} />}
        />
      </View>

      {/* Barre d'action sur la sélection */}
      {isCoach && sel && selectedId && (
        <Card stripe="#FACC15">
          <Row>
            <Avatar size={36} colorKey={selectedId} label={initials(players.get(selectedId)!)} photo={players.get(selectedId)?.photoUri} />
            <View style={{ flex: 1 }}>
              <Txt bold>{playerName(players.get(selectedId))}</Txt>
              <Txt muted size={12}>
                {sel.kind === 'slot' ? 'Touchez un autre poste ou un remplaçant pour échanger' : 'Touchez un poste pour le faire entrer'}
              </Txt>
            </View>
            <Pressable onPress={() => setSel(null)} hitSlop={10}>
              <Ionicons name="close" size={22} color={t.muted} />
            </Pressable>
          </Row>
          <Row style={{ flexWrap: 'wrap', gap: 8 }}>
            {sel.kind === 'slot' && (
              <>
                <Button small kind="secondary" icon="ribbon-outline" title={lineup.captainId === selectedId ? 'Retirer capitanat' : 'Capitaine'} onPress={() => { update({ ...lineup, captainId: lineup.captainId === selectedId ? undefined : selectedId }); setSel(null); }} />
                <Button small kind="secondary" icon="arrow-down-circle-outline" title="Sur le banc" onPress={toBench} />
              </>
            )}
            <Button small kind="danger" icon="close-circle-outline" title={sel.kind === 'slot' ? 'Retirer' : 'Retirer du groupe'} onPress={removeSelected} />
          </Row>
        </Card>
      )}

      {/* Indicateurs */}
      <Row style={{ gap: 10 }}>
        <StatBox label="Titulaires" value={`${xi.length}/${def.length}`} icon="people" tone={xi.length === def.length ? 'success' : 'warning'} />
        <StatBox label="Note moy." value={fmt(avgNote)} icon="star" tone="accent" />
        <StatBox label="Forme /5" value={fmt(avgForm)} icon="heart" tone="info" />
      </Row>

      {isCoach && warnings.length > 0 && (
        <Card stripe={t.warning}>
          <Row>
            <Ionicons name="warning" size={18} color={t.warning} />
            <Txt bold>À vérifier</Txt>
          </Row>
          {warnings.map((w) => (
            <Txt key={w} muted size={13}>
              • {w}
            </Txt>
          ))}
        </Card>
      )}

      {/* Banc */}
      <Section icon="people-outline" action={isCoach && lineup.bench.length < MAX_BENCH ? <Button small kind="ghost" icon="add" title="Ajouter" onPress={() => setPickerFor('bench')} /> : undefined}>
        Remplaçants ({lineup.bench.length}/{MAX_BENCH})
      </Section>
      {lineup.bench.length === 0 ? (
        <Txt muted size={14}>
          Aucun remplaçant.
        </Txt>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
          {lineup.bench.map((id) => {
            const p = players.get(id);
            if (!p) return null;
            const on = sel?.kind === 'bench' && sel.id === id;
            return (
              <Pressable key={id} onPress={isCoach ? () => onBenchPress(id) : undefined} style={{ alignItems: 'center', width: 72, gap: 4 }}>
                <Avatar size={52} colorKey={id} photo={p.photoUri} label={initials(p)} ring={on ? '#FACC15' : me === id ? '#38BDF8' : undefined} />
                <Text style={{ color: t.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                  {p.lastName || p.firstName}
                </Text>
                {info.get(id)?.injured ? <Badge text={info.get(id)?.injured === 'active' ? 'Blessé' : 'Reprise'} tone={info.get(id)?.injured === 'active' ? 'danger' : 'warning'} /> : <Text style={{ color: t.muted, fontSize: 11 }}>{p.position ?? '—'}</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Non convoqués */}
      {isCoach && notCalled.length > 0 && (
        <>
          <Section icon="person-remove-outline">Non convoqués ({notCalled.length})</Section>
          <Card style={{ paddingVertical: 10 }}>
            {notCalled.map((p) => {
              const ti = info.get(p.id);
              return (
                <Row key={p.id} style={{ paddingVertical: 4 }}>
                  <Avatar size={32} colorKey={p.id} photo={p.photoUri} label={initials(p)} />
                  <View style={{ flex: 1 }}>
                    <Txt>{playerName(p)}</Txt>
                    <Txt muted size={12}>
                      {p.position ?? 'Sans poste'}
                      {ti?.injured === 'active' ? ' · blessé' : ti?.injured === 'reprise' ? ' · en reprise' : ''}
                    </Txt>
                  </View>
                  {lineup.bench.length < MAX_BENCH && (
                    <Button small kind="ghost" icon="add-circle-outline" title="Banc" onPress={() => update({ ...lineup, bench: [...lineup.bench, p.id] })} />
                  )}
                </Row>
              );
            })}
          </Card>
        </>
      )}

      {/* Consignes */}
      {isCoach ? (
        <Card>
          <Field
            label="Consignes tactiques"
            value={lineup.notes ?? ''}
            onChangeText={(notes) => update({ ...lineup, notes: notes || undefined })}
            multiline
            placeholder="Bloc, pressing, coups de pied arrêtés, marquages…"
          />
          <Toggle label="Visible par les joueurs" icon="eye-outline" value={lineup.published} onChange={(published) => update({ ...lineup, published })} />
        </Card>
      ) : lineup.notes ? (
        <Card>
          <Row>
            <Ionicons name="clipboard-outline" size={18} color={t.primary} />
            <Txt bold>Consignes du coach</Txt>
          </Row>
          <Txt>{lineup.notes}</Txt>
        </Card>
      ) : null}

      {isCoach && (
        <>
          <Row style={{ gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button
                icon="sparkles"
                title="Compo auto"
                onPress={() => {
                  const go = () => {
                    setSel(null);
                    update(autoLineup(data, match.id, lineup.formation, stored));
                  };
                  if (xi.length) confirm('Compo automatique ?', 'La composition actuelle sera remplacée par les meilleurs joueurs disponibles (note, forme, blessures).', go, 'Remplacer');
                  else go();
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button icon="share-social-outline" kind="secondary" title="Partager" onPress={share} />
            </View>
          </Row>
          <Button
            small
            kind="ghost"
            icon="trash-outline"
            title="Vider la composition"
            onPress={() => confirm('Vider la composition ?', '', () => { setSel(null); update({ ...emptyLineup(match.id, lineup.formation), notes: lineup.notes, published: lineup.published }); }, 'Vider')}
          />
        </>
      )}

      <PlayerPicker
        visible={pickerFor !== null}
        title={pickerFor === 'bench' ? 'Ajouter au banc' : pickerFor !== null ? `Poste ${def[pickerFor]?.role ?? ''}` : ''}
        group={typeof pickerFor === 'number' ? def[pickerFor]?.group : undefined}
        exclude={pickerFor === 'bench' ? new Set([...inXI, ...inBench]) : new Set(inXI)}
        bench={inBench}
        info={info}
        onClose={() => setPickerFor(null)}
        onPick={(id) => {
          if (pickerFor === 'bench') update({ ...lineup, bench: [...lineup.bench, id] });
          else if (typeof pickerFor === 'number') placeInSlot(pickerFor, id);
          setPickerFor(null);
        }}
      />
    </Screen>
  );
}

function MatchChip({ m, active, hasLineup, onPress }: { m: Match; active: boolean; hasLineup: boolean; onPress: () => void }) {
  const t = useTheme();
  const upcoming = m.scoreFor == null;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        minWidth: 120,
        backgroundColor: active ? t.primary : t.card,
        borderWidth: t.dark ? 1 : 0,
        borderColor: t.border,
        gap: 2,
        ...shadow(t),
      }}
    >
      <Row style={{ gap: 6 }}>
        <Text style={{ color: active ? t.primaryText : t.text, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
          {m.home ? 'vs' : '@'} {m.opponent}
        </Text>
        {hasLineup ? <Ionicons name="checkmark-circle" size={14} color={active ? t.primaryText : t.primary} /> : null}
      </Row>
      <Text style={{ color: active ? t.primaryText : t.muted, fontSize: 12, opacity: active ? 0.85 : 1 }}>
        {formatDate(m.date)} · {upcoming ? 'à venir' : `${m.scoreFor}-${m.scoreAgainst}`}
      </Text>
    </Pressable>
  );
}

/** Feuille de choix d'un joueur, triée par pertinence pour le poste. */
function PlayerPicker({
  visible,
  title,
  group,
  exclude,
  bench,
  info,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  group?: string;
  exclude: Set<string>;
  bench: Set<string>;
  info: Map<string, TokenInfo>;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const t = useTheme();
  const { data } = useStore();
  const list = data.players
    .filter((p) => !p.archived && !exclude.has(p.id))
    .map((p) => ({ p, score: selectionScore(data, p), s: summarizePlayer(data, p) }))
    .sort((a, b) => Number(b.p.position === group) - Number(a.p.position === group) || b.score - a.score);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent={Platform.OS === 'web'} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg, marginTop: Platform.OS === 'web' ? 60 : 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
        <Row style={{ justifyContent: 'space-between', padding: 16, paddingBottom: 8 }}>
          <View>
            <Txt bold size={20}>
              {title}
            </Txt>
            {group ? <Txt muted size={13}>Suggestions : {group.toLowerCase()}s en premier</Txt> : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
            <Ionicons name="close-circle" size={30} color={t.muted} />
          </Pressable>
        </Row>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
          {list.length === 0 && <Empty text="Tous les joueurs sont déjà placés." />}
          {list.map(({ p, s }) => {
            const ti = info.get(p.id);
            const match = p.position === group;
            return (
              <Card key={p.id} onPress={() => onPick(p.id)} style={{ paddingVertical: 12 }} stripe={ti?.injured === 'active' ? t.danger : match ? t.primary : undefined}>
                <Row style={{ gap: 12 }}>
                  <Avatar size={42} colorKey={p.id} photo={p.photoUri} label={initials(p)} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt bold>{playerName(p)}</Txt>
                    <Row style={{ flexWrap: 'wrap', gap: 6 }}>
                      <Badge text={p.position ?? 'Sans poste'} tone={match ? 'success' : 'neutral'} />
                      {s.avgCoachRating != null && <Badge text={`Note ${fmt(s.avgCoachRating)}`} tone="accent" icon="star" />}
                      {s.avgWellness != null && <Badge text={`Forme ${fmt(s.avgWellness)}`} tone="info" icon="heart" />}
                      {bench.has(p.id) && <Badge text="Remplaçant" icon="people" />}
                      {ti?.injured && <Badge text={ti.injured === 'active' ? 'Blessé' : 'Reprise'} tone={ti.injured === 'active' ? 'danger' : 'warning'} icon="medkit" />}
                      {!ti?.injured && ti?.pain && <Badge text="Douleur" tone="warning" icon="bandage" />}
                    </Row>
                  </View>
                  <Ionicons name="add-circle" size={26} color={t.primary} />
                </Row>
              </Card>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
