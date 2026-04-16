import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Bell, EnvelopeSimple, CheckCircle } from 'phosphor-react-native';
import { Colors } from '@/constants/colors';
import { signInWithMagicLink } from '@/services/authService';

type Step = 'email' | 'sent';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithMagicLink(trimmed);
      setStep('sent');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send link. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'sent') {
    return (
      <View style={styles.container}>
        <CheckCircle size={56} color={Colors.gold} weight="fill" />
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.sub}>
          We sent a sign-in link to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>
        <Text style={styles.hint}>
          Tap the link in the email to open the app and sign in.
        </Text>
        <TouchableOpacity onPress={() => setStep('email')} style={styles.resendBtn}>
          <Text style={styles.resendText}>Use a different email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Bell size={48} color={Colors.gold} weight="fill" />
      <Text style={styles.title}>Sign in to GoldTracker</Text>
      <Text style={styles.sub}>
        Enter your email — we'll send you a magic link to sign in instantly.
        No password needed.
      </Text>

      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        placeholder="you@example.com"
        placeholderTextColor={Colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        value={email}
        onChangeText={(t) => { setEmail(t); setError(''); }}
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.black} />
        ) : (
          <View style={styles.btnContent}>
            <EnvelopeSimple size={18} color={Colors.black} weight="bold" />
            <Text style={styles.sendBtnText}>Send Magic Link</Text>
          </View>
        )}
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
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  emailHighlight: {
    color: Colors.gold,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
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
  sendBtn: {
    width: '100%',
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.black,
  },
  resendBtn: {
    marginTop: 24,
  },
  resendText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
