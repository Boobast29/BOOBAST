import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { playerReportHtml } from './reportHtml';
import type { AppData, ID } from './types';

/** Ouvre le bilan : impression / PDF sur ordinateur, partage du PDF sur téléphone. */
export async function sharePlayerReport(data: AppData, playerId: ID, clubName: string) {
  const html = playerReportHtml(data, playerId, clubName);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('Autorisez les fenêtres pop-up pour imprimer le bilan.');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Bilan du joueur', UTI: 'com.adobe.pdf' });
  else await Print.printAsync({ uri });
}
