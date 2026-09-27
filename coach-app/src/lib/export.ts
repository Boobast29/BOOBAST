import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { ATTENDANCE, STAT_FIELDS, WELLNESS_FIELDS } from './constants';
import { formatAnswer, matchLabel, playerName, sessionLoad, wellnessScore } from './stats';
import type { AppData } from './types';

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// Point-virgule : ouverture directe dans Excel en français
const toCsv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(cell).join(';')).join('\n');

export function reportsCsv(data: AppData) {
  const players = new Map(data.players.map((p) => [p.id, p]));
  const matches = new Map(data.matches.map((m) => [m.id, m]));
  const header = [
    'Date',
    'Match',
    'Joueur',
    'Titulaire',
    'Minutes',
    ...STAT_FIELDS.map((f) => f.label),
    'RPE',
    'Charge (RPE×min)',
    ...WELLNESS_FIELDS.map((f) => f.label),
    'Bien-être moyen',
    'Auto-évaluation',
    'Note coach',
    'Douleur',
    'Zone douleur',
    'Intensité douleur',
    'Commentaire joueur',
    'Commentaire coach',
    ...data.questions.map((q) => q.label),
  ];
  const rows = data.reports.map((r) => {
    const m = matches.get(r.matchId);
    return [
      m?.date,
      matchLabel(m),
      playerName(players.get(r.playerId)),
      r.starter ? 'oui' : 'non',
      r.minutesPlayed,
      ...STAT_FIELDS.map((f) => r.stats[f.key] ?? 0),
      r.rpe,
      sessionLoad(r),
      ...WELLNESS_FIELDS.map((f) => r[f.key]),
      wellnessScore(r)?.toFixed(1),
      r.selfRating,
      r.coachRating,
      r.pain ? 'oui' : 'non',
      r.painZone,
      r.painLevel,
      r.playerComment,
      r.coachComment,
      ...data.questions.map((q) => formatAnswer(r.answers?.[q.id])),
    ];
  });
  rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  return toCsv([header, ...rows]);
}

export function attendanceCsv(data: AppData) {
  const sessions = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
  const header = ['Joueur', ...sessions.map((x) => `${x.date}${x.theme ? ` ${x.theme}` : ''}`), 'Présences', 'Taux'];
  const rows = data.players
    .filter((p) => !p.archived)
    .map((p) => {
      const cells = sessions.map((x) => ATTENDANCE[x.attendance[p.id]]?.short ?? '');
      const counted = sessions.filter((x) => x.attendance[p.id] && x.attendance[p.id] !== 'blesse');
      const present = counted.filter((x) => ['present', 'retard'].includes(x.attendance[p.id])).length;
      return [playerName(p), ...cells, `${present}/${counted.length}`, counted.length ? `${Math.round((present / counted.length) * 100)} %` : ''];
    });
  return toCsv([header, ...rows]);
}

export function injuriesCsv(data: AppData) {
  const players = new Map(data.players.map((p) => [p.id, p]));
  const header = ['Date', 'Joueur', 'Zone', 'Côté', 'Type', 'Gravité', 'Statut', 'Retour prévu', 'Retour effectif', 'Traitement', 'Notes'];
  const rows = data.injuries.map((i) => [
    i.date,
    playerName(players.get(i.playerId)),
    i.bodyZone,
    i.side,
    i.type,
    i.severity,
    i.status,
    i.expectedReturn,
    i.returnDate,
    i.treatment,
    i.notes,
  ]);
  return toCsv([header, ...rows]);
}

/** Écrit un fichier temporaire et ouvre la feuille de partage (mail, Drive, WhatsApp…). */
export async function shareText(filename: string, content: string, mimeType: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    return;
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
  } else {
    await Share.share({ message: content });
  }
}
