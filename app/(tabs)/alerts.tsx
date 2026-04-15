import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAlertsStore } from '@/store/alertsStore';
import { AlertItem } from '@/components/AlertItem';

export default function AlertsScreen() {
  const router = useRouter();
  const { alerts, deleteAlert, toggleAlert } = useAlertsStore();

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      'Delete Alert',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAlert(id),
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/add-alert')}
      >
        <Text style={styles.fabIcon}>＋</Text>
        <Text style={styles.fabLabel}>New Alert</Text>
      </Pressable>

      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No alerts yet</Text>
          <Text style={styles.emptySub}>
            Tap "New Alert" to get notified when prices move.
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AlertItem
              alert={item}
              onPress={() =>
                router.push({ pathname: '/edit-alert', params: { id: item.id } })
              }
              onToggle={() => toggleAlert(item.id)}
              onDelete={() => confirmDelete(item.id, item.name)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''} ·{' '}
              {alerts.filter((a) => a.active).length} active
            </Text>
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
    paddingBottom: 100,
  },
  listHeader: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    zIndex: 100,
    backgroundColor: Colors.gold,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: Colors.black,
    fontSize: 20,
    fontWeight: '700',
  },
  fabLabel: {
    color: Colors.black,
    fontSize: 15,
    fontWeight: '700',
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
