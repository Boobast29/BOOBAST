import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Field, Screen, Section, Txt } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { injuriesCsv, reportsCsv, shareText } from '@/lib/export';
import { emptyData, useStore } from '@/lib/store';
import { today } from '@/lib/stats';
import type { AppData } from '@/lib/types';

export default function Settings() {
  const { data, setTeamName, replaceAll, loadDemo } = useStore();
  const [team, setTeam] = useState(data.teamName);
  const [backup, setBackup] = useState('');

  const run = (fn: () => Promise<void>) => fn().catch((e) => notify('Erreur', String(e?.message ?? e)));

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
      <Section icon="shield-outline">Équipe</Section>
      <Card>
        <Field label="Nom de l'équipe" value={team} onChangeText={setTeam} onEndEditing={() => setTeamName(team.trim() || 'Mon équipe')} onBlur={() => setTeamName(team.trim() || 'Mon équipe')} />
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
          onPress={() => confirm('Charger la démo ?', 'Les données actuelles seront remplacées.', () => { loadDemo(); setTeam('Équipe démo'); }, 'Charger')}
        />
        <Button
          title="Tout effacer"
          icon="trash-outline"
          kind="danger"
          onPress={() => confirm('Tout effacer ?', 'Joueurs, matchs, questionnaires et blessures seront supprimés définitivement.', () => { replaceAll(emptyData()); setTeam('Mon équipe'); })}
        />
      </Card>
    </Screen>
  );
}
