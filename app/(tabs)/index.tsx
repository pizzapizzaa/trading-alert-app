import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Bell, Warning, PlusCircle } from 'phosphor-react-native';
import { CommodityIcon } from '@/components/CommodityIcon';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { COMMODITIES, type CommoditySymbol } from '@/constants/commodities';
import { usePrices } from '@/hooks/usePrices';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { useAlertEvaluator } from '@/hooks/useAlertEvaluator';
import { PriceCard } from '@/components/PriceCard';
import { PriceChart } from '@/components/PriceChart';
import { useAlertsStore } from '@/store/alertsStore';
import { scheduleLocalNotification } from '@/services/notificationService';

export default function DashboardScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { data: prices, isLoading, isError, refetch, isFetching } = usePrices(30_000);
  const alerts = useAlertsStore((s) => s.alerts);
  const activeAlerts = alerts.filter((a) => a.active);

  // Evaluate alerts in the foreground whenever prices update
  useAlertEvaluator(prices);

  const [selectedSymbol, setSelectedSymbol] = useState<CommoditySymbol>('XAU');
  const priceHistory = usePriceHistory(prices);

  const selectedCommodity = COMMODITIES.find((c) => c.symbol === selectedSymbol) ?? COMMODITIES[0];
  const selectedPriceData = prices?.find((p) => p.symbol === selectedSymbol) ?? null;
  const chartData = priceHistory[selectedSymbol] ?? [];
  // 16px scroll padding × 2 + 16px card padding × 2
  const chartWidth = windowWidth - 64;

  const isUp = (selectedPriceData?.changePercent ?? 0) >= 0;
  const changeColor = isUp ? Colors.green : Colors.red;
  const changeText = selectedPriceData
    ? `${isUp ? '▲' : '▼'} ${Math.abs(selectedPriceData.changePercent).toFixed(2)}%`
    : '—';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={Colors.gold}
          />
        }
      >
        {/* Live price chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartNameRow}>
              <CommodityIcon symbol={selectedSymbol} size={20} color={selectedCommodity.color} weight="fill" />
              <Text style={styles.chartCommodityName}>
                {selectedCommodity.name}
              </Text>
              <Text style={styles.chartUnit}>{selectedCommodity.unit}</Text>
            </View>
            <View style={styles.chartPriceRow}>
              {selectedPriceData ? (
                <>
                  <Text style={styles.chartPrice}>
                    ${selectedPriceData.price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={[styles.chartChange, { color: changeColor }]}>
                    {changeText}
                  </Text>
                </>
              ) : (
                <Text style={styles.chartPrice}>—</Text>
              )}
            </View>
          </View>

          {/* Chart */}
          <PriceChart
            data={chartData}
            color={selectedCommodity.color}
            width={chartWidth}
          />

          {/* Commodity selector pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContainer}
          >
            {COMMODITIES.map((c) => (
              <Pressable
                key={c.symbol}
                style={[
                  styles.pill,
                  selectedSymbol === c.symbol && {
                    backgroundColor: c.color + '22',
                    borderColor: c.color,
                  },
                ]}
                onPress={() => setSelectedSymbol(c.symbol)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedSymbol === c.symbol && { color: c.color },
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Active alert count chip */}
        {activeAlerts.length > 0 && (
          <Pressable
            style={styles.alertChip}
            onPress={() => router.push('/alerts')}
          >
          <View style={styles.alertChipContent}>
            <Bell size={14} color={Colors.gold} weight="fill" />
            <Text style={styles.alertChipText}>
              {activeAlerts.length} active alert
              {activeAlerts.length !== 1 ? 's' : ''} — tap to manage
            </Text>
          </View>
          </Pressable>
        )}

        {/* Loading state */}
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.gold} />
            <Text style={styles.loadingText}>Fetching live prices…</Text>
          </View>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <View style={styles.errorBox}>
            <Warning size={30} color={Colors.red} />
            <Text style={styles.errorText}>
              Unable to fetch prices. Pull down to retry.
            </Text>
          </View>
        )}

        {/* Price cards */}
        {prices && prices.map((p) => (
          <PriceCard
            key={p.symbol}
            data={p}
            onPress={() =>
              router.push({
                pathname: '/add-alert',
                params: { symbol: p.symbol },
              })
            }
          />
        ))}

        {/* Test notification button */}
        <Pressable
          style={styles.testBtn}
          onPress={() =>
            scheduleLocalNotification(
              '📊 Test Alert — Gold',
              'Gold is now $2,350.00, above your target of $2,300.00',
              { test: true }
            )
          }
        >
          <View style={styles.testBtnContent}>
            <Bell size={15} color={Colors.textSecondary} />
            <Text style={styles.testBtnText}>Send Test Notification</Text>
          </View>
        </Pressable>

        {/* CTA if no alerts */}
        {!isLoading && activeAlerts.length === 0 && (
          <Pressable
            style={styles.ctaCard}
            onPress={() => router.push('/add-alert')}
          >
            <PlusCircle size={36} color={Colors.gold} weight="fill" />
            <Text style={styles.ctaTitle}>Set your first alert</Text>
            <Text style={styles.ctaSub}>
              Get notified when gold prices move past your threshold
            </Text>
          </Pressable>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 16,
  },
  alertChip: {
    backgroundColor: Colors.gold + '22',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.goldDark,
  },
  alertChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertChipText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: Colors.red + '22',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.red + '44',
    marginBottom: 16,
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    textAlign: 'center',
  },
  ctaCard: {
    backgroundColor: Colors.gold + '15',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.goldDark + '55',
    marginTop: 8,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.gold,
    marginBottom: 6,
  },
  ctaSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  bottomPad: {
    height: 20,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartHeader: {
    marginBottom: 12,
  },
  chartNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  chartCommodityName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  chartUnit: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  chartPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  chartPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  chartChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  pillsContainer: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: 2,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  testBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  testBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
