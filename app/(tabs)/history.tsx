import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert as RNAlert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Colors } from '@/constants/colors';
import { useAlertsStore } from '@/store/alertsStore';
import { HistoryItem } from '@/components/HistoryItem';
import { clearHistory } from '@/store/alertsStorage';

export default function HistoryScreen() {
  const { history, refreshHistory } = useAlertsStore();

  // Refresh history whenever tab is focused
  useFocusEffect(
    useCallback(() => {
      refreshHistory();
    }, [refreshHistory])
  );

  function confirmClear() {
    RNAlert.alert(
      'Clear History',
      'Remove all triggered alert records?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            await refreshHistory();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySub}>
            Triggered alerts will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HistoryItem entry={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {history.length} trigger{history.length !== 1 ? 's' : ''}
              </Text>
              <Pressable onPress={confirmClear} hitSlop={10}>
                <Text style={styles.clearBtn}>Clear All</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listHeaderText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  clearBtn: {
    fontSize: 13,
    color: Colors.red,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 40,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
