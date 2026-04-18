import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LockKey } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { ADMIN_PASSWORD } from '@/constants/adminSecrets';
import { useAuthStore } from '@/store/authStore';

export default function AdminGateScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAdminVerified = useAuthStore((s) => s.setAdminVerified);
  const router = useRouter();

  function handleVerify() {
    if (password === ADMIN_PASSWORD) {
      setAdminVerified(true);
      router.replace('/admin' as any);
    } else {
      setError('Incorrect password. Try again.');
      setPassword('');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LockKey size={52} color={Colors.gold} weight="fill" />
      <Text style={styles.title}>Admin Access</Text>
      <Text style={styles.sub}>Enter your admin password to continue.</Text>

      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        placeholder="Admin password"
        placeholderTextColor={Colors.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={(t) => { setPassword(t); setError(''); }}
        onSubmitEditing={handleVerify}
        returnKeyType="done"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.btn}
        onPress={handleVerify}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>Unlock</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
  input: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputError: {
    borderColor: Colors.red,
  },
  errorText: {
    color: Colors.red,
    fontSize: 13,
    marginBottom: 12,
    alignSelf: 'flex-start',
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
