import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { View } from 'react-native';
import { ClubLogo } from '@/components/ClubLogo';
import { useState } from 'react';
import { Button, Card, Field, Row, Screen, Section, Txt } from '@/components/ui';
import { hashPin, PIN_LENGTH } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { attendanceCsv, injuriesCsv, reportsCsv, shareText } from '@/lib/export';
import { persistFile } from '@/lib/media';
import { DEFAULT_CLUB_NAME, emptyData, useStore } from '@/lib/store';
import { isCloudConfigured } from '@/lib/cloud/config';
import { useTheme } from '@/components/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { today } from '@/lib/stats';
import type { AppData } from '@/lib/types';

const DEFAULT_TEAM = 'Seniors A';

export default function Settings() {
  const { data, club, team: currentTeam, setTeamName, setClubName, setLogo, replaceAll, loadDemo, setCoachPin, logout } = useStore();
  const [clubName, setClubNameInput] = useState(club.name);
  const t = useTheme();
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [team, setTeam] = useState(data.teamName);
  const [backup, setBackup] = useState('');

  const run = (fn: () => Promise<void>) => fn().catch((e) => notify('Erreur', String(e?.message ?? e)));

  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (res.canceled || !res.assets?.length) return;
    setLogo(persistFile(res.assets[0].uri));
  };

  const changePin = async () => {
    if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin1)) return notify('Code invalide', `Le code doit faire ${PIN_LENGTH} chiffres.`);
    if (pin1 !== pin2) return notify('Les deux codes ne correspondent pas');
    setCoachPin(await hashPin(pin1, 'coach'));
    setPin1('');
    setPin2('');
    notify('Code coach modifié');
  };

  const importBackup = () => {
    try {
      const parsed = JSON.parse(backup) as AppData;
      if (!Array.isArray(parsed.players) || !Array.isArray(parsed.matches)) throw new Error('format');
      confirm('Restaurer la sauvegarde ?', 'Les données actuelles seront remplacées.', () => {
        replaceAll(parsed);
        setBackup('');
        setTeam(parsed.teamName ?? '');
        notify('Sauvegarde restaurée');
      }, 'Restaurer');
    } catch {
      notify('Sauvegarde invalide', 'Collez le contenu complet du fichier .json exporté.');
    }
  };

  return (
    <Screen>
      <Section icon="shield-outline">Club</Section>
      <Card>
        <Row style={{ gap: 14 }}>
          <ClubLogo size={72} />
          <View style={{ flex: 1, gap: 8 }}>
            <Button small kind="secondary" icon="image-outline" title="Changer le logo" onPress={() => run(pickLogo)} />
            {club.logoUri ? <Button small kind="ghost" title="Logo du club par défaut" onPress={() => setLogo(undefined)} /> : null}
          </View>
        </Row>
        <Field label="Nom du club" value={clubName} onChangeText={setClubNameInput} onBlur={() => setClubName(clubName.trim() || DEFAULT_CLUB_NAME)} onEndEditing={() => setClubName(clubName.trim() || DEFAULT_CLUB_NAME)} />
        <Button small kind="secondary" icon="shield-half-outline" title={`Gérer les équipes (${club.teams.length})`} onPress={() => router.push('/equipes')} />
      </Card>

      <Section icon="people-outline">Équipe active{currentTeam ? ` · ${currentTeam.name}` : ''}</Section>
      <Card>
        <Field label="Nom de l'équipe" value={team} onChangeText={setTeam} onEndEditing={() => setTeamName(team.trim() || DEFAULT_TEAM)} onBlur={() => setTeamName(team.trim() || DEFAULT_TEAM)} />
      </Card>

      <Section icon="cloud-outline">Cloud & notifications</Section>
      <Card onPress={() => router.push('/cloud')}>
        <Row>
          <Ionicons name={isCloudConfigured() ? 'cloud-done' : 'cloud-offline-outline'} size={22} color={isCloudConfigured() ? t.primary : t.muted} />
          <View style={{ flex: 1 }}>
            <Txt bold>{isCloudConfigured() ? 'Synchronisation en ligne' : 'Mode local (sur cet appareil)'}</Txt>
            <Txt muted size={13}>
              {isCloudConfigured()
                ? 'Chaque joueur sur son téléphone, données sauvegardées en ligne, notifications.'
                : 'Activez le cloud pour que chaque joueur ait l’appli sur son téléphone et retrouve ses données.'}
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.muted} />
        </Row>
      </Card>

      <Section icon="lock-closed-outline">Accès & sécurité</Section>
      <Card>
        <Txt muted size={13}>
          Le coach voit tout. Les joueurs n’ont accès qu’à leur espace : leurs questionnaires, leurs stats, les compos publiées et les vidéos
          partagées. Les codes joueurs se règlent dans la fiche de chaque joueur ({data.players.filter((p) => p.pinHash).length}/{data.players.length} avec code).
        </Txt>
        <Field label="Nouveau code coach" value={pin1} onChangeText={(v) => setPin1(v.replace(/\D/g, '').slice(0, PIN_LENGTH))} keyboardType="number-pad" secureTextEntry maxLength={PIN_LENGTH} placeholder="••••" />
        <Field label="Confirmer le code" value={pin2} onChangeText={(v) => setPin2(v.replace(/\D/g, '').slice(0, PIN_LENGTH))} keyboardType="number-pad" secureTextEntry maxLength={PIN_LENGTH} placeholder="••••" />
        <Button small kind="secondary" icon="key-outline" title="Changer le code coach" onPress={() => run(changePin)} disabled={pin1.length < PIN_LENGTH} />
        <Button
          small
          kind="ghost"
          icon="log-out-outline"
          title="Se déconnecter / passer la main à un joueur"
          onPress={() => {
            logout();
            router.replace('/connexion');
          }}
        />
      </Card>

      <Section icon="clipboard-outline">Questionnaire d’après-match</Section>
      <Card>
        <Txt muted size={13}>
          Ajoutez vos propres questions (échelle, oui/non, choix, texte…) ou piochez dans les modèles.{' '}
          {data.questions.filter((q) => q.active).length} question(s) perso active(s).
        </Txt>
        <Button title="Gérer les questions" icon="list-outline" kind="secondary" onPress={() => router.push('/questions')} />
      </Card>

      <Section icon="download-outline">Exporter (Excel / Numbers / Sheets)</Section>
      <Card>
        <Txt muted size={13}>Fichiers CSV à envoyer par mail, Drive, WhatsApp… ou à ouvrir dans un tableur.</Txt>
        <Button title="Questionnaires & stats (CSV)" icon="document-text-outline" kind="secondary" onPress={() => run(() => shareText(`questionnaires-${today()}.csv`, reportsCsv(data), 'text/csv'))} />
        <Button title="Présences entraînement (CSV)" icon="fitness-outline" kind="secondary" onPress={() => run(() => shareText(`presences-${today()}.csv`, attendanceCsv(data), 'text/csv'))} />
        <Button title="Blessures (CSV)" icon="medkit-outline" kind="secondary" onPress={() => run(() => shareText(`blessures-${today()}.csv`, injuriesCsv(data), 'text/csv'))} />
      </Card>

      <Section icon="cloud-upload-outline">Sauvegarde</Section>
      <Card>
        <Txt muted size={13}>
          Les données sont stockées uniquement sur ce téléphone. Exportez une sauvegarde régulièrement pour ne rien perdre ou pour
          changer d’appareil. Les fichiers vidéo restent dans la galerie du téléphone : seuls leurs titres, tags et temps forts sont sauvegardés.
        </Txt>
        <Button
          title="Exporter une sauvegarde (.json)"
          icon="save-outline"
          kind="secondary"
          onPress={() => run(() => shareText(`coach-suivi-sauvegarde-${today()}.json`, JSON.stringify(data, null, 2), 'application/json'))}
        />
        <Field label="Restaurer : coller le contenu de la sauvegarde" value={backup} onChangeText={setBackup} multiline placeholder='{"version":1,...}' autoCapitalize="none" autoCorrect={false} />
        <Button title="Restaurer" icon="refresh" kind="secondary" onPress={importBackup} disabled={!backup.trim()} />
      </Card>

      <Section icon="server-outline">Données</Section>
      <Card>
        <Button
          title="Charger les données de démo"
          icon="sparkles-outline"
          kind="secondary"
          onPress={() => confirm('Charger la démo ?', 'Les données actuelles seront remplacées.', () => { loadDemo(); setTeam(currentTeam?.name ?? DEFAULT_TEAM); }, 'Charger')}
        />
        <Button
          title="Tout effacer"
          icon="trash-outline"
          kind="danger"
          onPress={() => confirm('Tout effacer ?', 'Joueurs, matchs, questionnaires et blessures seront supprimés définitivement.', () => { replaceAll(emptyData(currentTeam?.name)); setTeam(currentTeam?.name ?? DEFAULT_TEAM); })}
        />
      </Card>
    </Screen>
  );
}
