import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';

interface AuthState {
  user: User | null;
  session: Session | null;
  /** True once the initial session check has completed */
  initialized: boolean;
  /** True after the admin has passed the in-app password gate (resets on app restart) */
  adminVerified: boolean;

  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setAdminVerified: (verified: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  adminVerified: false,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      initialized: true,
    });
  },

  setSession: (session) =>
    set({ session, user: session?.user ?? null, adminVerified: false }),

  setAdminVerified: (verified) => set({ adminVerified: verified }),
}));
