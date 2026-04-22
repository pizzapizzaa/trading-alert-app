import { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LockKey } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';

export default function AdminGateScreen() {
  const user = useAuthStore((s) => s.user);
  const setAdminVerified = useAuthStore((s) => s.setAdminVerified);
  const router = useRouter();

  useEffect(() => {
    // If the user has a valid Supabase session they are authenticated —
    // that is sufficient to grant admin access. No client-side password check.
    if (user) {
      setAdminVerified(true);
      router.replace('/admin' as any);
    }
  }, [user, setAdminVerified, router]);

  // Shown only when there is no active session (edge case: arrived here directly)
  return (
    <View style={styles.container}>
      <LockKey size={52} color={Colors.gold} weight="fill" />
      <Text style={styles.title}>Admin Access</Text>
      <Text style={styles.sub}>You must be signed in to access the admin area.</Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.replace('/auth' as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },
  sub: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  btn: {
    width: '100%',
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.black,
  },
});
