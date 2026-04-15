import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { fetchPrices } from './priceService';
import { scheduleLocalNotification } from './notificationService';
import { loadAlertsFromStorage, saveTriggeredAlert } from '../store/alertsStorage';
import type { Alert } from '../store/alertsStore';

export const BACKGROUND_FETCH_TASK = 'PRICE_ALERT_CHECK';

/** Evaluate all active alerts against current prices and fire notifications. */
async function evaluateAlerts(alerts: Alert[]): Promise<number> {
  const prices = await fetchPrices();
  if (prices.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

  let fired = 0;

  for (const alert of alerts) {
    if (!alert.active) continue;

    const priceData = prices.find((p) => p.symbol === alert.symbol);
    if (!priceData || priceData.price === 0) continue;

    const { price } = priceData;
    let triggered = false;
    let reason = '';

    if (alert.conditionType === 'price_above' && price >= alert.targetValue) {
      triggered = true;
      reason = `${alert.name} is now $${price.toFixed(2)}, above your target of $${alert.targetValue.toFixed(2)}`;
    } else if (alert.conditionType === 'price_below' && price <= alert.targetValue) {
      triggered = true;
      reason = `${alert.name} is now $${price.toFixed(2)}, below your target of $${alert.targetValue.toFixed(2)}`;
    } else if (
      alert.conditionType === 'change_percent_up' &&
      priceData.changePercent >= alert.targetValue
    ) {
      triggered = true;
      reason = `${alert.name} rose ${priceData.changePercent.toFixed(2)}%, exceeding your +${alert.targetValue}% alert`;
    } else if (
      alert.conditionType === 'change_percent_down' &&
      priceData.changePercent <= -Math.abs(alert.targetValue)
    ) {
      triggered = true;
      reason = `${alert.name} dropped ${Math.abs(priceData.changePercent).toFixed(2)}%, exceeding your ${alert.targetValue}% alert`;
    } else if (
      alert.conditionType === 'change_dollar_up' &&
      priceData.change >= alert.targetValue
    ) {
      triggered = true;
      reason = `${alert.name} rose $${priceData.change.toFixed(2)}, exceeding your +$${alert.targetValue} alert`;
    } else if (
      alert.conditionType === 'change_dollar_down' &&
      priceData.change <= -Math.abs(alert.targetValue)
    ) {
      triggered = true;
      reason = `${alert.name} dropped $${Math.abs(priceData.change).toFixed(2)}, exceeding your $${alert.targetValue} alert`;
    }

    if (triggered) {
      await scheduleLocalNotification(`📊 ${alert.name} Alert`, reason, {
        alertId: alert.id,
        symbol: alert.symbol,
        price,
      });

      await saveTriggeredAlert({
        id: `${alert.id}-${Date.now()}`,
        alertId: alert.id,
        alertName: alert.name,
        symbol: alert.symbol,
        message: reason,
        price,
        triggeredAt: new Date().toISOString(),
        conditionType: alert.conditionType,
        targetValue: alert.targetValue,
      });

      fired++;
    }
  }

  return fired > 0
    ? BackgroundFetch.BackgroundFetchResult.NewData
    : BackgroundFetch.BackgroundFetchResult.NoData;
}

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const alerts = await loadAlertsFromStorage();
    return await evaluateAlerts(alerts);
  } catch (err) {
    console.error('[BackgroundFetch] Task error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn('[BackgroundFetch] Not available on this device');
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 15, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[BackgroundFetch] Task registered');
  }
}

export async function unregisterBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
  }
}
