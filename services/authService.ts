import { supabase } from './supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// In Expo Go, deep links use the Expo proxy (exp+goldtracker:// or exp://).
// In a standalone/dev build, use the custom scheme directly.
const isExpoGo = Constants.appOwnership === 'expo';
const REDIRECT_URL = isExpoGo
  ? Linking.createURL('/auth/callback')
  : 'goldtracker://auth/callback';

/**
 * Send a magic link to the given email address.
 * The link will deep-link back to the app via goldtracker://auth/callback.
 */
export async function signInWithMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: REDIRECT_URL },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
