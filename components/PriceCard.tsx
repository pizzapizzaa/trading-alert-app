import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/colors';
import { COMMODITY_MAP } from '@/constants/commodities';
import { CommodityIcon } from './CommodityIcon';
import {
  formatPrice,
  formatChange,
  formatChangePercent,
  type PriceData,
} from '@/services/priceService';

interface PriceCardProps {
  data: PriceData;
  onPress?: () => void;
}

export function PriceCard({ data, onPress }: PriceCardProps) {
  const commodity = COMMODITY_MAP[data.symbol];
  const isPositive = data.change >= 0;
  const changeColor = isPositive ? Colors.green : Colors.red;
  const arrowChar = isPositive ? '▲' : '▼';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <CommodityIcon symbol={data.symbol} size={32} color={commodity?.color} weight="fill" />
          <View>
            <Text style={styles.commodity}>{data.name}</Text>
            <Text style={styles.symbol}>{data.symbol}</Text>
          </View>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>{formatPrice(data.price, data.symbol)}</Text>
          <View style={styles.changeRow}>
            <Text style={[styles.changeArrow, { color: changeColor }]}>
              {arrowChar}
            </Text>
            <Text style={[styles.change, { color: changeColor }]}>
              {formatChange(data.change)} (
              {formatChangePercent(data.changePercent)})
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.updatedAt}>
          Updated {new Date(data.lastUpdated).toLocaleTimeString()}
        </Text>
        <Text style={styles.unit}>per troy oz · USD</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commodity: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  symbol: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  changeArrow: {
    fontSize: 11,
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  updatedAt: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  unit: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
