// ─── Admin credentials ────────────────────────────────────────────────────────
// Values are injected at build time via EAS environment variables:
//   EXPO_PUBLIC_ADMIN_EMAIL
//   EXPO_PUBLIC_ADMIN_PASSWORD
// Set these in your EAS project dashboard or via:
//   eas secret:create --scope project --name EXPO_PUBLIC_ADMIN_EMAIL --value "..."
//   eas secret:create --scope project --name EXPO_PUBLIC_ADMIN_PASSWORD --value "..."
// ──────────────────────────────────────────────────────────────────────────────
export const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? '';
export const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_ADMIN_PASSWORD ?? '';
