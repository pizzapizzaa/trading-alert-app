import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alert } from './alertsStore';
import type { HistoryEntry } from './alertsStore';

const ALERTS_KEY = '@goldtracker/alerts';
const HISTORY_KEY = '@goldtracker/history';

export async function loadAlertsFromStorage(): Promise<Alert[]> {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_KEY);
    return raw ? (JSON.parse(raw) as Alert[]) : [];
  } catch {
    return [];
  }
}

export async function saveAlertsToStorage(alerts: Alert[]): Promise<void> {
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export async function loadHistoryFromStorage(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveTriggeredAlert(entry: HistoryEntry): Promise<void> {
  const existing = await loadHistoryFromStorage();
  const updated = [entry, ...existing].slice(0, 200); // keep last 200
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
