import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
export function db() {
  if (!supabase) throw new Error('Configura Supabase para utilizar datos reales.');
  return supabase;
}
export const appUrl = () =>
  new URL(import.meta.env.BASE_URL, window.location.href.split('#')[0]).href;
