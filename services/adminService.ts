import { Platform } from 'react-native';
import { ADMIN_SERVER_URL } from '@/constants/adminConfig';
import { supabase } from '@/services/supabaseClient';

export async function registerDeviceWithAdmin(token: string): Promise<void> {
  if (!ADMIN_SERVER_URL) return;

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id ?? null;

  try {
    const response = await fetch(`${ADMIN_SERVER_URL}/api/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        label: `${Platform.OS.charAt(0).toUpperCase() + Platform.OS.slice(1)} Device`,
        userId,
      }),
    });

    if (!response.ok) {
      console.warn('[AdminService] Registration failed:', response.status);
    }
  } catch (err) {
    console.warn('[AdminService] Could not reach admin server:', err);
  }
}
