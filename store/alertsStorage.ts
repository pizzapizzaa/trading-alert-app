import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabaseClient';
import type { Alert } from './alertsStore';
import type { HistoryEntry } from './alertsStore';

const ALERTS_KEY = '@goldtracker/alerts';
const HISTORY_KEY = '@goldtracker/history';

// ─── Row ↔ Model mappers ──────────────────────────────────────────────────────

function rowToAlert(row: Record<string, unknown>): Alert {
  return {
    id: row.id as string,
    name: row.name as string,
    symbol: row.symbol as Alert['symbol'],
    conditionType: row.condition_type as Alert['conditionType'],
    targetValue: row.target_value as number,
    active: row.active as boolean,
    createdAt: row.created_at as string,
    lastTriggeredAt: (row.last_triggered_at as string | null) ?? null,
    smsEnabled: (row.sms_enabled as boolean) ?? false,
    smsPhone: (row.sms_phone as string) ?? '',
    emailEnabled: (row.email_enabled as boolean) ?? false,
  };
}

function alertToRow(alert: Alert, userId: string): Record<string, unknown> {
  return {
    id: alert.id,
    user_id: userId,
    name: alert.name,
    symbol: alert.symbol,
    condition_type: alert.conditionType,
    target_value: alert.targetValue,
    active: alert.active,
    created_at: alert.createdAt,
    last_triggered_at: alert.lastTriggeredAt,
    sms_enabled: alert.smsEnabled,
    sms_phone: alert.smsPhone,
    email_enabled: alert.emailEnabled,
  };
}

function rowToHistoryEntry(row: Record<string, unknown>): HistoryEntry {
  return {
    id: row.id as string,
    alertId: row.alert_id as string,
    alertName: row.alert_name as string,
    symbol: row.symbol as HistoryEntry['symbol'],
    message: row.message as string,
    price: row.price as number,
    triggeredAt: row.triggered_at as string,
    conditionType: row.condition_type as HistoryEntry['conditionType'],
    targetValue: row.target_value as number,
  };
}

function historyToRow(entry: HistoryEntry, userId: string): Record<string, unknown> {
  return {
    id: entry.id,
    user_id: userId,
    alert_id: entry.alertId,
    alert_name: entry.alertName,
    symbol: entry.symbol,
    message: entry.message,
    price: entry.price,
    triggered_at: entry.triggeredAt,
    condition_type: entry.conditionType,
    target_value: entry.targetValue,
  };
}

// ─── Session helper ───────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function loadAlertsFromStorage(): Promise<Alert[]> {
  // Return local cache immediately if signed out
  const userId = await getUserId();
  if (!userId) {
    try {
      const raw = await AsyncStorage.getItem(ALERTS_KEY);
      return raw ? (JSON.parse(raw) as Alert[]) : [];
    } catch {
      return [];
    }
  }

  // Signed in — fetch from Supabase and refresh cache
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const alerts = data.map(rowToAlert);
      await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
      return alerts;
    }
  } catch {
    // fall through to cache
  }

  // Supabase unavailable — return cached data
  try {
    const raw = await AsyncStorage.getItem(ALERTS_KEY);
    return raw ? (JSON.parse(raw) as Alert[]) : [];
  } catch {
    return [];
  }
}

export async function saveAlertsToStorage(alerts: Alert[]): Promise<void> {
  // Always write to local cache first (offline-safe, fast)
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));

  const userId = await getUserId();
  if (!userId) return;

  if (alerts.length === 0) {
    await supabase.from('alerts').delete().eq('user_id', userId);
    return;
  }

  // Upsert all current alerts
  const rows = alerts.map((a) => alertToRow(a, userId));
  const { error: upsertErr } = await supabase
    .from('alerts')
    .upsert(rows, { onConflict: 'id' });
  if (upsertErr) console.warn('[Storage] Alert upsert failed:', upsertErr.message);

  // Delete any alerts removed from the list
  const ids = alerts.map((a) => a.id);
  const { error: delErr } = await supabase
    .from('alerts')
    .delete()
    .eq('user_id', userId)
    .not('id', 'in', `(${ids.map((id) => `"${id}"`).join(',')})`);
  if (delErr) console.warn('[Storage] Alert cleanup failed:', delErr.message);
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function loadHistoryFromStorage(): Promise<HistoryEntry[]> {
  const userId = await getUserId();
  if (!userId) {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('alert_history')
      .select('*')
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      const history = data.map(rowToHistoryEntry);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return history;
    }
  } catch {
    // fall through to cache
  }

  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveTriggeredAlert(entry: HistoryEntry): Promise<void> {
  // Update local cache
  const existing = await loadHistoryFromStorage();
  const updated = [entry, ...existing].slice(0, 200);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

  // Persist to Supabase
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('alert_history')
    .insert(historyToRow(entry, userId));
  if (error) console.warn('[Storage] History insert failed:', error.message);
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);

  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('alert_history').delete().eq('user_id', userId);
}

