import { useState, useEffect } from 'react';
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
import { Bell, EnvelopeSimple, CheckCircle, XCircle, ArrowLeft } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { signInWithMagicLink } from '@/services/authService';
import { supabase } from '@/services/supabaseClient';

type Step = 'email' | 'sent' | 'success' | 'error';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState('');
  const router = useRouter();

  // Listen for successful sign-in after magic link tap
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStep('success');
      } else if (event === 'TOKEN_REFRESHED' && !session) {
        setLinkError('This link has expired or already been used.');
        setStep('error');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

  if (step === 'success') {
    return (
      <View style={styles.container}>
        <CheckCircle size={64} color={Colors.gold} weight="fill" />
        <Text style={styles.title}>You're signed in!</Text>
        <Text style={styles.sub}>Welcome to GoldTracker. Your alerts and history are now synced to your account.</Text>
        <TouchableOpacity style={styles.sendBtn} onPress={() => router.replace('/(tabs)' as any)} activeOpacity={0.8}>
          <View style={styles.btnContent}>
            <Text style={styles.sendBtnText}>Go to App</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'error') {
    return (
      <View style={styles.container}>
        <XCircle size={64} color="#ef4444" weight="fill" />
        <Text style={styles.title}>Link expired</Text>
        <Text style={styles.sub}>{linkError || 'This magic link is no longer valid.'}</Text>
        <TouchableOpacity style={styles.sendBtn} onPress={() => { setStep('email'); setError(''); }} activeOpacity={0.8}>
          <View style={styles.btnContent}>
            <ArrowLeft size={18} color={Colors.black} weight="bold" />
            <Text style={styles.sendBtnText}>Try again</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
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
