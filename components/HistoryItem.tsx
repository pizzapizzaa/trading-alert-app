import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { COMMODITY_MAP } from '@/constants/commodities';
import type { HistoryEntry } from '@/store/alertsStore';

interface HistoryItemProps {
  entry: HistoryEntry;
}

export function HistoryItem({ entry }: HistoryItemProps) {
  const commodity = COMMODITY_MAP[entry.symbol];

  const isUp =
    entry.conditionType === 'price_above' ||
    entry.conditionType === 'change_percent_up' ||
    entry.conditionType === 'change_dollar_up';

  const tagColor = isUp ? Colors.green : Colors.red;
  const tagLabel = isUp ? 'UP' : 'DOWN';

  const date = new Date(entry.triggeredAt);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.left}>
          <Text style={styles.emoji}>{commodity?.emoji ?? '📈'}</Text>
          <View>
            <Text style={styles.alertName}>{entry.alertName}</Text>
            <Text style={styles.timestamp}>
              {dateStr} · {timeStr}
            </Text>
          </View>
        </View>
        <View style={[styles.tag, { backgroundColor: tagColor + '22' }]}>
          <Text style={[styles.tagText, { color: tagColor }]}>{tagLabel}</Text>
        </View>
      </View>
      <Text style={styles.message}>{entry.message}</Text>
      <Text style={styles.price}>
        Price at trigger:{' '}
        <Text style={styles.priceValue}>
          ${entry.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  emoji: {
    fontSize: 26,
  },
  alertName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  price: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  priceValue: {
    color: Colors.gold,
    fontWeight: '700',
  },
});
