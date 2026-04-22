// ─── Supabase project credentials ─────────────────────────────────────────────
// Set these as EAS environment variables (or in a local .env file for development):
//   EXPO_PUBLIC_SUPABASE_URL    → Project Settings → API → Project URL
//   EXPO_PUBLIC_SUPABASE_ANON_KEY → Project Settings → API → anon/public key
// ──────────────────────────────────────────────────────────────────────────────
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
