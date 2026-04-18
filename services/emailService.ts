import { supabase } from './supabaseClient';

export interface EmailAlertPayload {
  to: string;
  alertName: string;
  message: string;
  price?: number;
  symbol?: string;
}

/**
 * Sends a price alert email via the Supabase Edge Function `send-alert-email`.
 * The edge function uses Resend under the hood — API key stays server-side.
 * Silently no-ops if the user is not authenticated.
 */
export async function sendEmailAlert(payload: EmailAlertPayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-alert-email', {
    body: payload,
  });

  if (error) {
    console.warn('[EmailService] Failed to send alert email:', error.message);
    return;
  }

  if (data && !data.success) {
    console.warn('[EmailService] Email send returned failure:', data.error);
  }
}
