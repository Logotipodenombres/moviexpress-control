import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { demoProfile } from '../lib/demo';
import { message } from '../lib/utils';
interface AuthState {
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  demo: boolean;
  recovery: boolean;
  error: string;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  clearRecovery: () => void;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(!!supabase),
    [demo, setDemo] = useState(false),
    [recovery, setRecovery] = useState(
      /type=(recovery|invite)/.test(location.hash) ||
        ['recovery', 'invite'].includes(new URLSearchParams(location.search).get('flow') || ''),
    ),
    [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let live = true;
    let serial = 0;
    const update = async (s: Session | null) => {
      const request = ++serial;
      setSession(s);
      if (!s) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .single();
        if (error) throw error;
        if (live && request === serial) {
          setProfile(data.active ? data : null);
          setError(data.active ? '' : 'Tu acceso está desactivado. Contacta al administrador.');
        }
      } catch (e) {
        if (live && request === serial) {
          setProfile(null);
          setError('No se pudo cargar tu perfil. ' + message(e));
        }
      } finally {
        if (live && request === serial) setLoading(false);
      }
    };
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setTimeout(() => {
        if (live) void update(s);
      }, 0);
    });
    void client.auth.getSession().then(({ data }) => {
      if (live) void update(data.session);
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        profile,
        session,
        loading,
        demo,
        recovery,
        error,
        clearRecovery: () => setRecovery(false),
        enterDemo: () => {
          setDemo(true);
          setProfile(demoProfile);
          setError('');
        },
        signOut: async () => {
          if (!demo && supabase) {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
          }
          setProfile(null);
          setSession(null);
          setDemo(false);
          setRecovery(false);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider requerido');
  return value;
}
