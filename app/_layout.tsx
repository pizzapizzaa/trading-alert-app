import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureNotificationBehaviour, registerForPushNotificationsAsync } from '@/services/notificationService';
import { registerBackgroundTask } from '@/services/backgroundTask';
import { useAlertsStore } from '@/store/alertsStore';
import { Colors } from '@/constants/colors';

const queryClient = new QueryClient();

configureNotificationBehaviour();

export default function RootLayout() {
  const loadFromStorage = useAlertsStore((s) => s.loadFromStorage);

  useEffect(() => {
    // Load persisted alerts on mount
    loadFromStorage();
    // Request notification permissions
    registerForPushNotificationsAsync();
    // Register background price-check task
    registerBackgroundTask();
  }, [loadFromStorage]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-alert"
          options={{
            presentation: 'modal',
            title: 'New Alert',
            headerStyle: { backgroundColor: Colors.surface },
            headerTintColor: Colors.gold,
            headerTitleStyle: { color: Colors.textPrimary, fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="edit-alert"
          options={{
            presentation: 'modal',
            title: 'Edit Alert',
            headerStyle: { backgroundColor: Colors.surface },
            headerTintColor: Colors.gold,
            headerTitleStyle: { color: Colors.textPrimary, fontWeight: '700' },
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
