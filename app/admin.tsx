import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ShieldCheck, SignOut, User } from 'phosphor-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/services/authService';

export default function AdminScreen() {
  const user = useAuthStore((s) => s.user);

  function handleSignOut() {
    Alert.alert('Sign Out', 'Sign out of admin account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut().catch(() => {}),
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ShieldCheck size={40} color={Colors.gold} weight="fill" />
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <User size={20} color={Colors.textMuted} weight="regular" />
          <Text style={styles.cardLabel}>Signed in as</Text>
        </View>
        <Text style={styles.cardValue}>{user?.email ?? '—'}</Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <SignOut size={18} color={Colors.red} weight="bold" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.red,
  },
});
