import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Affichage des notifications même quand l'appli est ouverte
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
  });
}

/**
 * Demande l'autorisation et renvoie le jeton Expo Push de l'appareil (null si impossible :
 * simulateur, web, refus, ou projet EAS non configuré).
 */
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('default', { name: 'QEA Coach', importance: Notifications.AndroidImportance.HIGH, lightColor: '#107B2D' });
  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!status.granted) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('Notifications : projectId EAS manquant (lancez « npx eas-cli init »).');
    return null;
  }
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    console.warn('Jeton de notification indisponible', e);
    return null;
  }
}

/** Écran à ouvrir quand on touche une notification (champ `route` envoyé par le serveur). */
export function onNotificationTap(open: (route: string) => void) {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const route = r.notification.request.content.data?.route;
    if (typeof route === 'string' && route.startsWith('/')) open(route);
  });
  return () => sub.remove();
}

/** Pastille sur l'icône de l'appli = nombre de choses à faire */
export function setBadge(n: number) {
  if (Platform.OS !== 'web') Notifications.setBadgeCountAsync(n).catch(() => {});
}
