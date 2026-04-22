// ─── Admin email ──────────────────────────────────────────────────────────────
// Used to identify the admin user by email address (routing only — access is
// controlled by Supabase authentication, not by a client-side password).
// Set via EAS environment variable:
//   eas secret:create --scope project --name EXPO_PUBLIC_ADMIN_EMAIL --value "..."
// ──────────────────────────────────────────────────────────────────────────────
export const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? '';
