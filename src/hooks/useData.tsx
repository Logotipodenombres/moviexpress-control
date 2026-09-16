import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import { db, supabase } from '../lib/supabase';
import { demoData } from '../lib/demo';
import { message } from '../lib/utils';
import type { DataSet, Entity, EntityRecord } from '../types';
const empty: DataSet = {
  drivers: [],
  vehicles: [],
  reports: [],
  vehicle_locations: [],
  audit_logs: [],
  profiles: [],
  vehicle_photos: [],
};
interface State {
  data: DataSet;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  save: (entity: Entity, values: Record<string, unknown>, id?: string) => Promise<EntityRecord>;
  remove: (entity: Entity, id: string) => Promise<void>;
}
const Context = createContext<State | null>(null);
export function DataProvider({ children }: { children: ReactNode }) {
  const { demo, profile } = useAuth();
  const [data, setData] = useState<DataSet>(empty),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    if (!profile) return;
    const current = ++requestId.current;
    setLoading(true);
    try {
      if (demo) {
        setData(demoData());
        return;
      }
      const names = (Object.keys(empty) as (keyof DataSet)[]).filter(
        (n) => profile.role === 'admin' || !['profiles', 'audit_logs'].includes(n),
      );
      const entries = await Promise.all(
        names.map(async (n) => {
          let rows: unknown[] = [];
          for (let start = 0; ; start += 1000) {
            const { data, error } = await db()
              .from(n)
              .select('*')
              .order(n === 'vehicle_locations' ? 'timestamp' : 'created_at', { ascending: false })
              .range(start, start + 999);
            if (error) throw error;
            rows = rows.concat(data);
            if (data.length < 1000) break;
          }
          return [n, rows];
        }),
      );
      if (current === requestId.current) {
        setData({ ...empty, ...Object.fromEntries(entries) });
        setError('');
      }
    } catch (e) {
      setError(message(e));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [demo, profile]);
  useEffect(() => {
    void refresh();
    if (demo || !supabase || !profile) return;
    let timer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel('organization-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `organization_id=eq.${profile.organization_id}` },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => void refresh(), 500);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase?.removeChannel(channel);
    };
  }, [refresh, demo, profile]);
  const save = async (entity: Entity, values: Record<string, unknown>, id?: string) => {
    if (demo)
      throw new Error(
        'La demostración es de solo lectura. Conecta Supabase para guardar registros.',
      );
    if (!profile || profile.role === 'viewer')
      throw new Error('No tienes permisos para modificar registros.');
    const query = id
      ? db().from(entity).update(values).eq('id', id)
      : db()
          .from(entity)
          .insert({
            ...values,
            organization_id: profile.organization_id,
            ...(entity === 'reports' ? { created_by: profile.id } : {}),
          });
    const { data, error } = await query.select().single();
    if (error) throw error;
    await refresh();
    return data as EntityRecord;
  };
  const remove = async (entity: Entity, id: string) => {
    if (demo) throw new Error('No se pueden eliminar registros de demostración.');
    if (profile?.role !== 'admin')
      throw new Error('Solo un administrador puede eliminar registros.');
    const { error } = await db().from(entity).delete().eq('id', id);
    if (error) throw error;
    await refresh();
  };
  return (
    <Context.Provider value={{ data, loading, error, refresh, save, remove }}>
      {children}
    </Context.Provider>
  );
}
export function useData() {
  const value = useContext(Context);
  if (!value) throw new Error('DataProvider requerido');
  return value;
}
