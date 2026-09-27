import * as Crypto from 'expo-crypto';

/**
 * Les codes sont stockés hachés sur le téléphone. C'est une protection d'usage (le coach prête son
 * téléphone ou sa tablette à un joueur), pas un coffre-fort : quelqu'un qui a accès aux fichiers de
 * l'appareil peut toujours lire les données.
 */
export function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `qea-coach:${salt}:${pin}`);
}

export async function checkPin(pin: string, salt: string, hash?: string) {
  if (!hash) return true;
  return (await hashPin(pin, salt)) === hash;
}

export const PIN_LENGTH = 4;
