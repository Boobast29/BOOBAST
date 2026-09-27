/**
 * Configuration du cloud (Supabase). Renseignez EXPO_PUBLIC_SUPABASE_URL et
 * EXPO_PUBLIC_SUPABASE_ANON_KEY dans coach-app/.env (voir docs/CLOUD.md).
 * Sans configuration, l'appli fonctionne 100 % en local.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isCloudConfigured = () => !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
