import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, Alert } from 'react-native';
import { Colors } from '@/constants/colors';
import { Bell, ChartBar, ClipboardText, SignOut, UserCircle } from 'phosphor-react-native';
import { signOut } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

function AuthButton() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  if (!user) {
    return (
      <TouchableOpacity onPress={() => router.push('/auth' as any)} style={{ paddingRight: 16 }}>
        <UserCircle size={24} color={Colors.gold} weight="regular" />
      </TouchableOpacity>
    );
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut().catch(() => {}),
      },
    ]);
  }
  return (
    <TouchableOpacity onPress={handleSignOut} style={{ paddingRight: 16 }}>
      <SignOut size={22} color={Colors.textMuted} weight="bold" />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'GoldTracker',
          headerRight: () => <AuthButton />,
          tabBarIcon: ({ focused, color }) => (
            <ChartBar size={24} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          headerTitle: 'My Alerts',
          tabBarIcon: ({ focused, color }) => (
            <Bell size={24} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          headerTitle: 'Alert History',
          tabBarIcon: ({ focused, color }) => (
            <ClipboardText size={24} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
    </Tabs>
  );
}
