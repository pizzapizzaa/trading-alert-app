import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { configureNotificationBehaviour, registerForPushNotificationsAsync } from '@/services/notificationService';
import { registerBackgroundTask } from '@/services/backgroundTask';
import { useAlertsStore } from '@/store/alertsStore';
import { registerDeviceWithAdmin } from '@/services/adminService';
import { supabase } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';

const queryClient = new QueryClient();

configureNotificationBehaviour();

export default function RootLayout() {
  const loadFromStorage = useAlertsStore((s) => s.loadFromStorage);
  const { initialized, user, initialize, setSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !user) router.replace('/auth' as any);
  }, [initialized, user, router]);

  useEffect(() => {
    // 1. Resolve initial session from secure storage
    initialize();

    // 2. Handle magic link when app is launched cold via the deep link
    Linking.getInitialURL().then((url) => {
      if (url) supabase.auth.exchangeCodeForSession(url).catch(() => {});
    });

    // 3. Handle magic link when app is already open and link arrives
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      if (url) supabase.auth.exchangeCodeForSession(url).catch(() => {});
    });

    // 4. Keep auth store in sync with Supabase session changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // 5. Load persisted alerts and register for push / background once mounted
    loadFromStorage();
    registerForPushNotificationsAsync().then((token) => {
      if (token) registerDeviceWithAdmin(token);
    });
    registerBackgroundTask();

    return () => {
      linkSub.remove();
      authSub.unsubscribe();
    };
  }, [initialize, loadFromStorage, setSession]);

  // Show nothing until session check completes (avoids flash of wrong screen)
  if (!initialized) return null;

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
        <Stack.Screen name="auth" options={{ headerShown: false }} />
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
