import { create } from 'zustand';
import { type CommoditySymbol } from '@/constants/commodities';
import {
  loadAlertsFromStorage,
  saveAlertsToStorage,
  loadHistoryFromStorage,
} from './alertsStorage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertConditionType =
  | 'price_above'
  | 'price_below'
  | 'change_percent_up'
  | 'change_percent_down'
  | 'change_dollar_up'
  | 'change_dollar_down';

export interface Alert {
  id: string;
  name: string;
  symbol: CommoditySymbol;
  conditionType: AlertConditionType;
  targetValue: number;
  active: boolean;
  createdAt: string;
  /** ISO string of last trigger, null if never triggered */
  lastTriggeredAt: string | null;
}

export interface HistoryEntry {
  id: string;
  alertId: string;
  alertName: string;
  symbol: CommoditySymbol;
  message: string;
  price: number;
  triggeredAt: string;
  conditionType: AlertConditionType;
  targetValue: number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AlertsState {
  alerts: Alert[];
  history: HistoryEntry[];
  loaded: boolean;

  // Actions
  loadFromStorage: () => Promise<void>;
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'lastTriggeredAt'>) => Promise<void>;
  updateAlert: (id: string, partial: Partial<Alert>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  toggleAlert: (id: string) => Promise<void>;
  setHistory: (history: HistoryEntry[]) => void;
  refreshHistory: () => Promise<void>;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  history: [],
  loaded: false,

  loadFromStorage: async () => {
    const [alerts, history] = await Promise.all([
      loadAlertsFromStorage(),
      loadHistoryFromStorage(),
    ]);
    set({ alerts, history, loaded: true });
  },

  addAlert: async (alertData) => {
    const newAlert: Alert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      lastTriggeredAt: null,
    };
    const updated = [...get().alerts, newAlert];
    set({ alerts: updated });
    await saveAlertsToStorage(updated);
  },

  updateAlert: async (id, partial) => {
    const updated = get().alerts.map((a) =>
      a.id === id ? { ...a, ...partial } : a
    );
    set({ alerts: updated });
    await saveAlertsToStorage(updated);
  },

  deleteAlert: async (id) => {
    const updated = get().alerts.filter((a) => a.id !== id);
    set({ alerts: updated });
    await saveAlertsToStorage(updated);
  },

  toggleAlert: async (id) => {
    const updated = get().alerts.map((a) =>
      a.id === id ? { ...a, active: !a.active } : a
    );
    set({ alerts: updated });
    await saveAlertsToStorage(updated);
  },

  setHistory: (history) => set({ history }),

  refreshHistory: async () => {
    const history = await loadHistoryFromStorage();
    set({ history });
  },
}));
