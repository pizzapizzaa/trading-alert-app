import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { usePrices } from '@/hooks/usePrices';
import { useAlertEvaluator } from '@/hooks/useAlertEvaluator';
import { PriceCard } from '@/components/PriceCard';
import { useAlertsStore } from '@/store/alertsStore';
import { scheduleLocalNotification } from '@/services/notificationService';

export default function DashboardScreen() {
  const router = useRouter();
  const { data: prices, isLoading, isError, refetch, isFetching } = usePrices(30_000);
  const alerts = useAlertsStore((s) => s.alerts);
  const activeAlerts = alerts.filter((a) => a.active);

  // Evaluate alerts in the foreground whenever prices update
  useAlertEvaluator(prices);

  const lastUpdated =
    prices && prices.length > 0
      ? new Date(prices[0].lastUpdated).toLocaleTimeString()
      : null;

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
        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>Spot Prices</Text>
          <Text style={styles.heroSub}>Live · USD per troy ounce</Text>
          {lastUpdated ? (
            <Text style={styles.heroTime}>Last updated: {lastUpdated}</Text>
          ) : null}
        </View>

        {/* Active alert count chip */}
        {activeAlerts.length > 0 && (
          <Pressable
            style={styles.alertChip}
            onPress={() => router.push('/alerts')}
          >
            <Text style={styles.alertChipText}>
              🔔 {activeAlerts.length} active alert
              {activeAlerts.length !== 1 ? 's' : ''} — tap to manage
            </Text>
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
            <Text style={styles.errorIcon}>⚠️</Text>
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
          <Text style={styles.testBtnText}>🔔 Send Test Notification</Text>
        </Pressable>

        {/* CTA if no alerts */}
        {!isLoading && activeAlerts.length === 0 && (
          <Pressable
            style={styles.ctaCard}
            onPress={() => router.push('/add-alert')}
          >
            <Text style={styles.ctaIcon}>➕</Text>
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
  heroBanner: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.goldDark + '55',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  heroSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  heroTime: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
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
  errorIcon: {
    fontSize: 30,
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
  ctaIcon: {
    fontSize: 36,
    marginBottom: 8,
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
  testBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  testBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
