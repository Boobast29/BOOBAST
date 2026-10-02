import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text, TextInput, View } from 'react-native';
import { ClubLogo } from '@/components/ClubLogo';
import { PinPad } from '@/components/PinPad';
import { TeamBadge } from '@/components/TeamBadge';
import { useTheme } from '@/components/theme';
import { Avatar, Badge, Button, Card, Field, IconCircle, Row, Screen, Section, Txt } from '@/components/ui';
import { coachSignIn, coachSignUp, createCloudTeam, humanError, joinAsCoach, joinAsPlayer, myTeams, signOut, teamRoster, updateCoachName, verifiedUser } from '@/lib/cloud/api';
import type { RosterRow } from '@/lib/cloud/api';
import { useCloud } from '@/lib/cloud/CloudSync';
import { isCloudConfigured } from '@/lib/cloud/config';
import { notify } from '@/lib/confirm';
import { TEAM_COLORS, useStore } from '@/lib/store';
import type { Team, TeamCategory } from '@/lib/types';

export default function CloudScreen() {
  const { session } = useStore();
  if (!isCloudConfigured()) return <NotConfigured />;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Cloud & notifications' }} />
      <SyncStatus />
      {session?.role === 'coach' ? <CoachCloud /> : <PlayerJoin />}
    </Screen>
  );
}

function NotConfigured() {
  const t = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Cloud & notifications' }} />
      <Card>
        <Row>
          <IconCircle icon="cloud-offline-outline" tone="neutral" />
          <Txt bold size={17}>
            Mode local
          </Txt>
        </Row>
        <Txt muted>Aujourd’hui, les données restent sur cet appareil. Avec le cloud :</Txt>
        {[
          ['phone-portrait-outline', 'chaque joueur a l’appli sur SON téléphone (code d’équipe + code joueur)'],
          ['refresh-circle-outline', 'un joueur qui supprime l’appli retrouve tout en se reconnectant'],
          ['notifications-outline', 'notifications : questionnaire à remplir, compo publiée, rappel à 18 h, douleur signalée au coach'],
          ['people-outline', 'plusieurs coachs par équipe, toutes les équipes du club synchronisées'],
        ].map(([icon, text]) => (
          <Row key={text} style={{ alignItems: 'flex-start' }}>
            <Ionicons name={icon as 'cloud'} size={18} color={t.primary} />
            <View style={{ flex: 1 }}>
              <Txt size={14}>{text}</Txt>
            </View>
          </Row>
        ))}
        <Txt muted size={13}>
          Activation (une seule fois, gratuit pour un club) : créer un projet Supabase, y coller le fichier SQL fourni, puis renseigner l’adresse et la clé dans
          l’appli. Le guide pas à pas est dans coach-app/docs/CLOUD.md.
        </Txt>
      </Card>
    </Screen>
  );
}

function SyncStatus() {
  const t = useTheme();
  const { status, lastSync, error, syncNow, user } = useCloud();
  const { team, club, updateTeam } = useStore();
  const [repairing, setRepairing] = useState(false);
  const lost = !!error && error.includes('plus accessible en ligne');
  // Équipe introuvable sur le serveur : on vérifie l'accès, sinon on la remet en ligne à partir de cet appareil
  const repair = async () => {
    if (!team?.cloudId) return;
    setRepairing(true);
    try {
      const u = await verifiedUser();
      if (!u || u.is_anonymous) {
        await signOut();
        notify('Session expirée', 'Reconnectez-vous avec votre e-mail et votre mot de passe de coach, puis relancez la synchronisation.');
        return;
      }
      const mine = await myTeams();
      if (mine.some((m) => m.team_id === team.cloudId && m.role === 'coach')) {
        await syncNow();
        return;
      }
      const r = await createCloudTeam(team, club.name);
      updateTeam(team.id, { cloudId: r.id, joinCode: r.join_code, coachCode: r.coach_code, cloudVersion: 0 });
      notify('Équipe remise en ligne', `Nouveau code joueurs : ${r.join_code}. Donnez-le aux joueurs pour qu’ils se reconnectent.`);
      setTimeout(syncNow, 300);
    } catch (e) {
      notify('Impossible de remettre l’équipe en ligne', humanError(e));
    } finally {
      setRepairing(false);
    }
  };
  const map = {
    off: ['cloud-offline-outline', 'Désactivé', 'neutral'],
    idle: ['cloud-done-outline', 'À jour', 'success'],
    syncing: ['sync-outline', 'Synchronisation…', 'info'],
    offline: ['wifi-outline', 'Hors connexion : vos réponses partiront plus tard', 'warning'],
    error: ['alert-circle-outline', 'Erreur de synchronisation', 'danger'],
  } as const;
  const [icon, label, tone] = map[status];
  return (
    <Card>
      <Row>
        <IconCircle icon={icon} tone={tone} />
        <View style={{ flex: 1 }}>
          <Txt bold>{team?.cloudId ? label : 'Équipe pas encore en ligne'}</Txt>
          <Txt muted size={12}>
            {user ? (user.is_anonymous ? 'Compte joueur sur cet appareil' : String(user.user_metadata?.full_name || user.email || 'Compte coach')) : 'Non connecté'}
            {lastSync ? ` · dernière synchro ${new Date(lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Txt>
        </View>
        {team?.cloudId ? (
          <Pressable onPress={syncNow} hitSlop={10} accessibilityLabel="Synchroniser maintenant">
            <Ionicons name="refresh" size={22} color={t.primary} />
          </Pressable>
        ) : null}
      </Row>
      {error ? (
        <Txt size={13} color={t.danger}>
          {error}
        </Txt>
      ) : null}
      {lost && user && !user.is_anonymous ? (
        <>
          <Txt muted size={13}>
            Les données de l’équipe sont toujours sur cet appareil. Si vous êtes bien connecté avec le bon compte coach, remettez l’équipe en ligne : un nouveau code joueurs sera
            créé.
          </Txt>
          <Button small icon="cloud-upload-outline" title={repairing ? 'En cours…' : 'Remettre l’équipe en ligne'} disabled={repairing} onPress={repair} />
        </>
      ) : null}
      {lost && (!user || user.is_anonymous) ? (
        <Txt muted size={13}>
          Reconnectez-vous avec votre compte coach (e-mail et mot de passe) ci-dessous.
        </Txt>
      ) : null}
    </Card>
  );
}

function CoachCloud() {
  const t = useTheme();
  const { club, createTeam, updateTeam, selectTeam, login } = useStore();
  const { user, syncNow } = useCloud();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const metaName = String(user?.user_metadata?.full_name ?? '');
  const [coachName, setCoachName] = useState(metaName);
  // Reprend le nom du compte quand il change (connexion, autre compte)
  const [seenName, setSeenName] = useState(metaName);
  if (metaName !== seenName) {
    setSeenName(metaName);
    setCoachName(metaName);
  }
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [coachCode, setCoachCode] = useState('');
  const coachAccount = user && !user.is_anonymous;
  const localTeams = club.teams.filter((x) => x.joinedAs !== 'player');


  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify('Oups', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const importTeams = () =>
    run(async () => {
      const remote = (await myTeams()).filter((r) => r.role === 'coach');
      let n = 0;
      for (const r of remote) {
        if (club.teams.some((x) => x.cloudId === r.team_id)) continue;
        createTeam({ name: r.team_name, category: r.team_category as TeamCategory, color: r.team_color, cloudId: r.team_id, joinCode: r.join_code ?? undefined, coachCode: r.coach_code ?? undefined, cloudVersion: 0 });
        n++;
      }
      notify(n ? `${n} équipe(s) récupérée(s)` : 'Tout est déjà là', n ? 'Leurs données se téléchargent à l’ouverture de chaque équipe.' : undefined);
    });

  const publish = (tm: Team) =>
    run(async () => {
      const r = await createCloudTeam(tm, club.name);
      updateTeam(tm.id, { cloudId: r.id, joinCode: r.join_code, coachCode: r.coach_code, cloudVersion: 0 });
      await selectTeam(tm.id);
      login({ role: 'coach', teamId: tm.id });
      setTimeout(syncNow, 300);
    });

  const shareCode = (tm: Team) =>
    Share.share({
      message: `${club.name} — ${tm.name}\nTélécharge l’appli QEA Coach, touche « J’ai un code d’équipe » et saisis :\n\n${tm.joinCode}\n\nPuis choisis ton nom (ton code joueur te sera donné par le coach).`,
    }).catch(() => {});

  if (!coachAccount)
    return (
      <>
        <Section icon="person-circle-outline">Compte coach</Section>
        <Card>
          <Txt muted size={13}>
            Chaque coach crée son compte personnel avec son nom, son e-mail et son mot de passe. Il pourra retrouver les équipes auxquelles il est autorisé sur son téléphone.
          </Txt>
          {mode === 'signup' ? <Field label="Nom du coach" value={coachName} onChangeText={setCoachName} autoCapitalize="words" placeholder="Ex. : Alex Martin" /> : null}
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="coach@qea.fr" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="8 caractères minimum" />
          <Button
            icon={mode === 'signin' ? 'log-in-outline' : 'person-add-outline'}
            title={mode === 'signin' ? 'Se connecter' : 'Créer mon compte coach'}
            disabled={busy || !email || password.length < 8 || (mode === 'signup' && !coachName.trim())}
            onPress={() =>
              run(async () => {
                if (mode === 'signin') await coachSignIn(email, password);
                else {
                  const r = await coachSignUp(email, password, coachName);
                  if (r.needsConfirmation) notify('Vérifiez vos e-mails', 'Cliquez sur le lien de confirmation, puis connectez-vous ici.');
                }
              })
            }
          />
          <Button small kind="ghost" title={mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'} onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} />
        </Card>
      </>
    );

  return (
    <>
      <Section icon="person-circle-outline">Profil coach</Section>
      <Card>
        <Txt muted size={13}>Nom associé à ce compte coach. Chaque entraîneur conserve son propre e-mail et son mot de passe sur ses appareils.</Txt>
        <Field label="Nom du coach" value={coachName} onChangeText={setCoachName} autoCapitalize="words" placeholder="Ex. : Alex Martin" />
        <Button
          small
          kind="secondary"
          icon="save-outline"
          title="Enregistrer mon profil"
          disabled={busy || !coachName.trim() || coachName.trim() === String(user?.user_metadata?.full_name ?? '')}
          onPress={() => run(async () => {
            await updateCoachName(coachName);
            notify('Profil mis à jour', `Le nom « ${coachName.trim()} » est enregistré pour ce compte coach.`);
          })}
        />
      </Card>
      <Section icon="shield-outline" action={<Button small kind="ghost" icon="download-outline" title="Récupérer" onPress={importTeams} disabled={busy} />}>
        Équipes en ligne
      </Section>
      {localTeams.map((tm, i) => (
        <View key={tm.id}>
          <Card stripe={tm.color}>
            <Row style={{ gap: 12 }}>
              <TeamBadge team={tm} size={40} />
              <View style={{ flex: 1 }}>
                <Txt bold size={16}>
                  {tm.name}
                </Txt>
                <Txt muted size={12}>
                  {tm.cloudId ? `En ligne · version ${tm.cloudVersion ?? 0}` : 'Seulement sur cet appareil'}
                </Txt>
              </View>
              {tm.cloudId ? <Badge text="En ligne" tone="success" icon="cloud-done" /> : null}
            </Row>
            {tm.cloudId && tm.joinCode ? (
              <>
                <CodeRow label="Code joueurs" code={tm.joinCode} onShare={() => shareCode(tm)} />
                {tm.coachCode ? <CodeRow label="Code coach adjoint" code={tm.coachCode} /> : null}
              </>
            ) : tm.cloudId ? (
              <Txt muted size={13}>Synchronisation en cours…</Txt>
            ) : (
              <Button small icon="cloud-upload-outline" title="Mettre l’équipe en ligne" onPress={() => publish(tm)} disabled={busy} />
            )}
          </Card>
        </View>
      ))}

      <Section icon="people-outline">Coach adjoint</Section>
      <Card>
        <Txt muted size={13}>Chaque coach utilise son compte personnel. Pour accéder à plusieurs équipes et composer avec leurs effectifs, il doit rejoindre chaque équipe avec son code coach.</Txt>
        <Field label="Rejoindre une équipe avec un code coach" value={coachCode} onChangeText={(v) => setCoachCode(v.toUpperCase())} autoCapitalize="characters" placeholder="Ex. : K7PQ2MXA" />
        <Button
          small
          kind="secondary"
          icon="enter-outline"
          title="Rejoindre"
          disabled={busy || coachCode.trim().length < 6}
          onPress={() =>
            run(async () => {
              const r = await joinAsCoach(coachCode);
              if (!club.teams.some((x) => x.cloudId === r.id))
                createTeam({ name: r.name, category: r.category as TeamCategory, color: r.color || TEAM_COLORS[0], cloudId: r.id, joinCode: r.join_code, coachCode: r.coach_code, cloudVersion: 0 });
              setCoachCode('');
              notify('Équipe ajoutée', `${r.name} apparaît dans vos équipes.`);
            })
          }
        />
      </Card>

      <Section icon="notifications-outline">Notifications envoyées aux joueurs</Section>
      <Card>
        {[
          'Questionnaire envoyé par le coach (après-match, séance, questionnaire)',
          'Relance du coach à ceux qui n’ont pas répondu',
          'Nouveau point à travailler',
          'Préparation du match et compo publiées',
          'Rappel à 18 h tant que ce n’est pas rempli',
          'Au coach : douleur signalée par un joueur',
        ].map((l) => (
          <Row key={l} style={{ alignItems: 'flex-start' }}>
            <Text style={{ color: t.muted, fontSize: 14 }}>–</Text>
            <Txt size={14}>{l}</Txt>
          </Row>
        ))}
      </Card>

      <Button
        kind="ghost"
        icon="log-out-outline"
        title={`Se déconnecter (${user.email})`}
        onPress={() =>
          run(async () => {
            await signOut();
          })
        }
      />
      <Txt muted size={12}>
        Les équipes restent sur cet appareil. Pensez à « Mettre en ligne » chaque équipe pour que les joueurs puissent la rejoindre.
      </Txt>
      <View style={{ height: 8 }} />
      <Pressable onPress={() => router.push('/equipes')}>
        <Txt color={t.primary} bold>
          Gérer les équipes du club →
        </Txt>
      </Pressable>
    </>
  );
}

function CodeRow({ label, code, onShare }: { label: string; code: string; onShare?: () => void }) {
  const t = useTheme();
  return (
    <Row style={{ backgroundColor: t.input, borderRadius: 12, padding: 10 }}>
      <View style={{ flex: 1 }}>
        <Txt muted size={12}>
          {label}
        </Txt>
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '900', letterSpacing: 4 }}>{code}</Text>
      </View>
      <Pressable onPress={() => Clipboard.setStringAsync(code).then(() => notify('Copié', code))} hitSlop={8} accessibilityLabel={`Copier ${label}`}>
        <Ionicons name="copy-outline" size={22} color={t.primary} />
      </Pressable>
      {onShare ? (
        <Pressable onPress={onShare} hitSlop={8} accessibilityLabel="Partager le code" style={{ marginLeft: 14 }}>
          <Ionicons name="share-social-outline" size={22} color={t.primary} />
        </Pressable>
      ) : null}
    </Row>
  );
}

/** Joueur : code d'équipe → « Qui es-tu ? » → code joueur. Fonctionne aussi après une réinstallation. */
function PlayerJoin() {
  const t = useTheme();
  const { club, createTeam, updateTeam, selectTeam, login, setClubName } = useStore();
  const [code, setCode] = useState('');
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [picked, setPicked] = useState<RosterRow | null>(null);
  const [busy, setBusy] = useState(false);

  const find = async () => {
    setBusy(true);
    try {
      const r = await teamRoster(code);
      if (!r.length) notify('Code inconnu', 'Vérifie le code d’équipe donné par le coach.');
      else setRoster(r);
    } catch (e) {
      notify('Oups', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const join = async (row: RosterRow, pin: string) => {
    try {
      const r = await joinAsPlayer(code, row.player_id, pin);
      const existing = club.teams.find((x) => x.cloudId === r.team_id);
      let teamId = existing?.id;
      if (existing) updateTeam(existing.id, { joinedAs: 'player', playerId: row.player_id, name: r.team_name, color: r.team_color });
      else {
        if (!club.teams.length && r.club_name) setClubName(r.club_name);
        teamId = createTeam({ name: r.team_name, category: r.team_category as TeamCategory, color: r.team_color, cloudId: r.team_id, joinedAs: 'player', playerId: row.player_id }).id;
      }
      await selectTeam(teamId!);
      login({ role: 'player', teamId: teamId!, playerId: row.player_id });
      router.replace('/');
      return true;
    } catch (e) {
      notify('Connexion impossible', humanError(e));
      return false;
    }
  };

  if (picked)
    return (
      <View style={{ alignItems: 'center', gap: 20, paddingTop: 10 }}>
        <Avatar size={80} colorKey={picked.player_id} photo={picked.photo_url ?? undefined} label={`${picked.first_name[0] ?? ''}${picked.last_name[0] ?? ''}`} />
        <PinPad title={`Bonjour ${picked.first_name}`} subtitle="Entre ton code joueur" onComplete={async (pin) => (await join(picked, pin)) ? undefined : false} />
        <Button small kind="ghost" title="Ce n’est pas moi" onPress={() => setPicked(null)} />
      </View>
    );

  if (roster)
    return (
      <>
        <Card>
          <Row style={{ gap: 12 }}>
            <TeamBadge team={{ name: roster[0].team_name, color: roster[0].team_color }} size={44} />
            <View style={{ flex: 1 }}>
              <Txt bold size={18}>
                {roster[0].team_name}
              </Txt>
              <Txt muted size={13}>
                {roster[0].club_name}
              </Txt>
            </View>
          </Row>
        </Card>
        <Section icon="person-outline">Qui es-tu ?</Section>
        {roster.map((r, i) => (
          <View key={r.player_id}>
            <Card
              style={{ paddingVertical: 12 }}
              onPress={() => {
                if (r.has_pin) setPicked(r);
                else join(r, '');
              }}
            >
              <Row style={{ gap: 12 }}>
                <Avatar size={42} colorKey={r.player_id} photo={r.photo_url ?? undefined} label={r.number != null ? String(r.number) : `${r.first_name[0] ?? ''}${r.last_name[0] ?? ''}`} />
                <View style={{ flex: 1 }}>
                  <Txt bold>
                    {r.first_name} {r.last_name}
                  </Txt>
                  <Txt muted size={13}>
                    {r.position ?? ''}
                  </Txt>
                </View>
                <Ionicons name={r.has_pin ? 'lock-closed' : 'chevron-forward'} size={18} color={t.muted} />
              </Row>
            </Card>
          </View>
        ))}
        <Button small kind="ghost" title="Changer de code" onPress={() => setRoster(null)} />
      </>
    );

  return (
    <Card style={{ alignItems: 'center', gap: 16 }}>
      <ClubLogo size={72} />
      <Txt bold size={20}>
        Rejoindre mon équipe
      </Txt>
      <Txt muted size={14}>
        Saisis le code d’équipe donné par le coach. Si tu as réinstallé l’appli, fais pareil : tu retrouveras toutes tes infos.
      </Txt>
      <TextInput
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        placeholder="CODE"
        placeholderTextColor={t.muted}
        autoCapitalize="characters"
        autoCorrect={false}
        style={{ fontSize: 34, fontWeight: '900', letterSpacing: 10, textAlign: 'center', color: t.text, backgroundColor: t.input, borderRadius: 16, paddingVertical: 14, width: '100%' }}
        accessibilityLabel="Code d’équipe"
      />
      <View style={{ alignSelf: 'stretch' }}>
        <Button icon="arrow-forward" title="Continuer" onPress={find} disabled={busy || code.length < 6} />
      </View>
    </Card>
  );
}
