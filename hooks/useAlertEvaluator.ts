import { useEffect, useRef } from 'react';
import { useAlertsStore, type Alert } from '@/store/alertsStore';
import { scheduleLocalNotification } from '@/services/notificationService';
import { saveTriggeredAlert } from '@/store/alertsStorage';
import type { PriceData } from '@/services/priceService';

/**
 * Runs in the foreground. Evaluates alerts each time prices update
 * and fires local push notifications if thresholds are breached.
 */
export function useAlertEvaluator(prices: PriceData[] | undefined) {
  const alerts = useAlertsStore((s) => s.alerts);
  const refreshHistory = useAlertsStore((s) => s.refreshHistory);
  // Track which alerts we already fired in this session to avoid spam
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!prices || prices.length === 0) return;

    let anyFired = false;

    const evaluate = async () => {
      for (const alert of alerts) {
        if (!alert.active) continue;

        const priceData = prices.find((p) => p.symbol === alert.symbol);
        if (!priceData || priceData.price === 0) continue;

        const sessionKey = `${alert.id}-${Math.floor(Date.now() / 60_000)}`;
        if (firedRef.current.has(sessionKey)) continue;

        const { price, changePercent, change } = priceData;
        let triggered = false;
        let message = '';

        switch (alert.conditionType) {
          case 'price_above':
            if (price >= alert.targetValue) {
              triggered = true;
              message = `${alert.name} reached $${price.toFixed(2)} (above $${alert.targetValue})`;
            }
            break;
          case 'price_below':
            if (price <= alert.targetValue) {
              triggered = true;
              message = `${alert.name} dropped to $${price.toFixed(2)} (below $${alert.targetValue})`;
            }
            break;
          case 'change_percent_up':
            if (changePercent >= alert.targetValue) {
              triggered = true;
              message = `${alert.name} is up ${changePercent.toFixed(2)}% (threshold: +${alert.targetValue}%)`;
            }
            break;
          case 'change_percent_down':
            if (changePercent <= -Math.abs(alert.targetValue)) {
              triggered = true;
              message = `${alert.name} is down ${Math.abs(changePercent).toFixed(2)}% (threshold: ${alert.targetValue}%)`;
            }
            break;
          case 'change_dollar_up':
            if (change >= alert.targetValue) {
              triggered = true;
              message = `${alert.name} rose $${change.toFixed(2)} (threshold: +$${alert.targetValue})`;
            }
            break;
          case 'change_dollar_down':
            if (change <= -Math.abs(alert.targetValue)) {
              triggered = true;
              message = `${alert.name} fell $${Math.abs(change).toFixed(2)} (threshold: $${alert.targetValue})`;
            }
            break;
        }

        if (triggered) {
          firedRef.current.add(sessionKey);
          anyFired = true;

          await scheduleLocalNotification(`📊 ${alert.name} Alert`, message, {
            alertId: alert.id,
            symbol: alert.symbol,
            price,
          });

          await saveTriggeredAlert({
            id: `${alert.id}-${Date.now()}`,
            alertId: alert.id,
            alertName: alert.name,
            symbol: alert.symbol,
            message,
            price,
            triggeredAt: new Date().toISOString(),
            conditionType: alert.conditionType,
            targetValue: alert.targetValue,
          });
        }
      }

      if (anyFired) {
        await refreshHistory();
      }
    };

    evaluate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);
}
