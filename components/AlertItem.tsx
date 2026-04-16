import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { Colors } from '@/constants/colors';
import { COMMODITY_MAP } from '@/constants/commodities';
import { CommodityIcon } from './CommodityIcon';
import type { Alert, AlertConditionType } from '@/store/alertsStore';

interface AlertItemProps {
  alert: Alert;
  onPress: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const CONDITION_LABELS: Record<AlertConditionType, string> = {
  price_above: 'Price rises above',
  price_below: 'Price falls below',
  change_percent_up: 'Price increases by',
  change_percent_down: 'Price decreases by',
  change_dollar_up: 'Price increases by',
  change_dollar_down: 'Price decreases by',
};

const CONDITION_SUFFIX: Record<AlertConditionType, string> = {
  price_above: '',
  price_below: '',
  change_percent_up: '%',
  change_percent_down: '%',
  change_dollar_up: '',
  change_dollar_down: '',
};

export function AlertItem({ alert, onPress, onToggle, onDelete }: AlertItemProps) {
  const commodity = COMMODITY_MAP[alert.symbol];
  const isPercent = alert.conditionType.includes('percent');
  const isDollar =
    alert.conditionType === 'price_above' ||
    alert.conditionType === 'price_below' ||
    alert.conditionType.includes('dollar');
  const valueStr = isDollar && !isPercent
    ? `$${alert.targetValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : `${alert.targetValue}%`;

  const suffix = CONDITION_SUFFIX[alert.conditionType];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        !alert.active && styles.cardInactive,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <View style={styles.nameRow}>
          <CommodityIcon symbol={alert.symbol} size={26} color={commodity?.color} weight="fill" />
          <View>
            <Text style={styles.alertName}>{alert.name}</Text>
            <Text style={styles.symbol}>{commodity?.name ?? alert.symbol}</Text>
          </View>
        </View>
        <Switch
          value={alert.active}
          onValueChange={onToggle}
          trackColor={{ false: Colors.borderLight, true: Colors.goldDark }}
          thumbColor={alert.active ? Colors.gold : Colors.textMuted}
        />
      </View>

      <View style={styles.conditionRow}>
        <Text style={styles.conditionLabel}>
          {CONDITION_LABELS[alert.conditionType]}
        </Text>
        <Text style={styles.conditionValue}>
          {valueStr}
          {suffix}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.createdAt}>
          Created {new Date(alert.createdAt).toLocaleDateString()}
        </Text>
        <Pressable onPress={onDelete} hitSlop={12}>
          <Text style={styles.deleteBtn}>Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInactive: {
    opacity: 0.5,
  },
  cardPressed: {
    opacity: 0.8,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  alertName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  symbol: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 8,
  },
  conditionLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  conditionValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  createdAt: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  deleteBtn: {
    fontSize: 13,
    color: Colors.red,
    fontWeight: '600',
  },
});
