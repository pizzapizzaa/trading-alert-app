/**
 * SMS alerts via TextBelt (https://textbelt.com)
 * Free tier: 1 SMS per day using key "textbelt" — no account required.
 * For higher volume, purchase credits at textbelt.com.
 */

const TEXTBELT_URL = 'https://textbelt.com/text';
const FREE_KEY = 'textbelt';

export interface SmsResult {
  success: boolean;
  quotaRemaining?: number;
  error?: string;
}

/**
 * Sends an SMS via TextBelt.
 * @param phone  E.164 or standard format, e.g. "+14155552671" or "14155552671"
 * @param message Text body (keep under 160 chars for single-segment)
 */
export async function sendSmsAlert(phone: string, message: string): Promise<SmsResult> {
  // Sanitise: strip all non-digit/plus chars
  const sanitised = phone.replace(/[^\d+]/g, '');
  if (sanitised.length < 7) {
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    const response = await fetch(TEXTBELT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: sanitised,
        message: message.slice(0, 160),
        key: FREE_KEY,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const json = await response.json();
    return {
      success: json.success === true,
      quotaRemaining: json.quotaRemaining,
      error: json.error ?? undefined,
    };
  } catch (err) {
    console.warn('[SmsService] Failed to send SMS:', err);
    return { success: false, error: 'Network error' };
  }
}
