import { useEffect, useState, type FormEvent } from 'react';
import {
  UserPlus,
  Download,
  Save,
  KeyRound,
  Smartphone,
  ShieldCheck,
  Plug,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useInstall } from '../hooks/useInstall';
import { PageTitle, Modal, Badge, Empty } from '../components/ui';
import { appUrl, db } from '../lib/supabase';
import { dateTime, downloadCsv, message } from '../lib/utils';
import type { Organization, Role } from '../types';
const roleLabel = { admin: 'Administrador', operator: 'Operador', viewer: 'Consulta' };
export function UsersPage() {
  const { profile, demo } = useAuth(),
    { data, refresh } = useData();
  const [invite, setInvite] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (profile?.role !== 'admin') return <Empty title="Acceso exclusivo para administradores" />;
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const f = new FormData(e.currentTarget);
      const { error } = await db().functions.invoke('invite-user', {
        body: {
          full_name: f.get('full_name'),
          email: f.get('email'),
          role: f.get('role'),
          organization_id: profile?.organization_id,
        },
      });
      if (error)
        throw new Error(
          'No se pudo enviar la invitación. Revisa que la función invite-user esté desplegada y el correo no tenga cuenta.',
        );
      setInvite(false);
      toast.success('Invitación enviada por correo.');
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function update(id: string, values: { role?: Role; active?: boolean }) {
    if (demo) {
      toast.info('La demostración es de solo lectura.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await db().from('profiles').update(values).eq('id', id);
      if (error) throw error;
      await refresh();
      toast.success('Acceso actualizado.');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRACIÓN"
        title="Usuarios"
        description="Controla quién puede acceder a la información de tu empresa."
      >
        <button className="button primary" onClick={() => setInvite(true)}>
          <UserPlus size={17} />
          Invitar usuario
        </button>
      </PageTitle>
      <div className="panel user-list">
        {data.profiles.map((p) => (
          <div className="user-row" key={p.id}>
            <span className="avatar">{p.full_name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{p.full_name}</strong>
              <small>{p.id === profile.id ? 'Tu cuenta' : dateTime(p.created_at)}</small>
            </div>
            <select
              aria-label={'Rol de ' + p.full_name}
              value={p.role}
              disabled={p.id === profile.id || busy || demo}
              onChange={(e) => void update(p.id, { role: e.target.value as Role })}
            >
              {Object.entries(roleLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <Badge value={p.active ? 'Activo' : 'Inactivo'} />
            <button
              className="button ghost"
              disabled={p.id === profile.id || busy || demo}
              onClick={() => void update(p.id, { active: !p.active })}
            >
              {p.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        ))}
      </div>
      <div className="notice section-gap">
        Las invitaciones requieren la Edge Function <strong>invite-user</strong>. Desactivar un
        perfil bloquea el acceso a los datos incluso si su sesión sigue abierta.
      </div>
      {invite && (
        <Modal title="Invitar a tu equipo" onClose={() => setInvite(false)}>
          <form className="simple-form" onSubmit={send}>
            <label>
              Nombre completo
              <input name="full_name" required minLength={2} maxLength={160} />
            </label>
            <label>
              Correo electrónico
              <input name="email" type="email" required />
            </label>
            <label>
              Rol
              <select name="role" defaultValue="viewer">
                {Object.entries(roleLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <p>
              El usuario pertenecerá a tu organización. Recibirá un correo para definir su
              contraseña.
            </p>
            {error && <div className="error-box">{error}</div>}
            <button className="button primary" disabled={busy || demo}>
              {busy ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function AuditPage() {
  const { profile } = useAuth(),
    { data } = useData();
  const [search, setSearch] = useState(''),
    [action, setAction] = useState(''),
    [page, setPage] = useState(1);
  if (profile?.role !== 'admin') return <Empty title="Acceso exclusivo para administradores" />;
  const rows = data.audit_logs.filter(
    (a) =>
      (!action || a.action === action) &&
      `${a.action} ${a.entity} ${a.entity_id} ${data.profiles.find((p) => p.id === a.actor_id)?.full_name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 20)),
    current = Math.min(page, pages);
  return (
    <>
      <PageTitle
        eyebrow="TRAZABILIDAD"
        title="Bitácora de cambios"
        description="Un registro de las acciones importantes de tu organización."
      >
        <button
          className="button ghost"
          disabled={!rows.length}
          onClick={() => downloadCsv(rows as unknown as Record<string, unknown>[], 'bitacora')}
        >
          <Download size={17} />
          Exportar
        </button>
      </PageTitle>
      <section className="panel">
        <div className="list-toolbar">
          <input
            aria-label="Buscar en bitácora"
            placeholder="Buscar actividad, usuario o registro…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filtrar acción"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las acciones</option>
            {[
              'CREATE',
              'UPDATE',
              'DELETE',
              'LOGIN',
              'REPORT_STATUS_CHANGE',
              'LOCATION_UPDATE',
              'INVITE',
            ].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="audit-list">
          {rows.slice((current - 1) * 20, current * 20).map((a) => (
            <div key={a.id}>
              <ShieldCheck size={19} />
              <div>
                <strong>
                  {a.action} <span>· {a.entity}</span>
                </strong>
                <p>
                  {data.profiles.find((p) => p.id === a.actor_id)?.full_name ||
                    'Sistema / usuario no disponible'}
                </p>
                <small>{a.entity_id || '—'}</small>
                {'status' in a.details && (
                  <p>
                    {String(a.details.previous_status)} → {String(a.details.status)}
                  </p>
                )}
              </div>
              <time>{dateTime(a.created_at)}</time>
            </div>
          ))}
          {!rows.length && <Empty title="Sin actividad registrada" />}
        </div>
        <div className="pagination">
          <span>
            {rows.length} eventos · Página {current} de {pages}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Anterior"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Siguiente"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
export function SettingsPage() {
  const { profile, demo } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null),
    [busy, setBusy] = useState(false),
    [password, setPassword] = useState(false);
  const { ready, install } = useInstall();
  useEffect(() => {
    let live = true;
    if (demo) {
      setOrg({
        id: 'demo',
        name: 'Moviexpress Demo',
        privacy_notice: null,
        terms: null,
        data_controller: null,
      });
      return;
    }
    void db()
      .from('organizations')
      .select('*')
      .eq('id', profile?.organization_id)
      .single()
      .then(({ data, error }) => {
        if (live) {
          if (error) toast.error(message(error));
          else setOrg(data);
        }
      });
    return () => {
      live = false;
    };
  }, [demo, profile?.organization_id]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const { error } = await db()
        .from('organizations')
        .update({
          name: f.get('name'),
          privacy_notice: f.get('privacy_notice'),
          terms: f.get('terms'),
          data_controller: f.get('data_controller'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.organization_id);
      if (error) throw error;
      toast.success('Configuración guardada.');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="TU ESPACIO DE TRABAJO"
        title="Configuración"
        description="Preferencias, acceso e información de la organización."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <h2>Organización y privacidad</h2>
          {org && (
            <form onSubmit={save} className="settings-form">
              <label>
                Nombre de la empresa
                <input
                  name="name"
                  defaultValue={org.name}
                  required
                  minLength={2}
                  maxLength={160}
                  disabled={profile?.role !== 'admin'}
                />
              </label>
              <label>
                Responsable del tratamiento
                <input
                  name="data_controller"
                  defaultValue={org.data_controller || ''}
                  disabled={profile?.role !== 'admin'}
                />
              </label>
              <label>
                Aviso de privacidad
                <textarea
                  name="privacy_notice"
                  defaultValue={org.privacy_notice || ''}
                  placeholder="Pendiente de configurar por el responsable de la empresa."
                  disabled={profile?.role !== 'admin'}
                />
              </label>
              <label>
                Términos de uso
                <textarea
                  name="terms"
                  defaultValue={org.terms || ''}
                  disabled={profile?.role !== 'admin'}
                />
              </label>
              {profile?.role === 'admin' && (
                <button className="button primary" disabled={busy || demo}>
                  <Save size={17} />
                  Guardar configuración
                </button>
              )}
            </form>
          )}
        </section>
        <div className="settings-stack">
          <section className="panel settings-card">
            <KeyRound className="setting-icon" />
            <h2>Tu acceso</h2>
            <p>
              {profile?.full_name} · {roleLabel[profile?.role || 'viewer']}
            </p>
            <button className="button ghost" onClick={() => setPassword(true)} disabled={demo}>
              Cambiar contraseña
            </button>
          </section>
          <section className="panel settings-card">
            <Smartphone className="setting-icon" />
            <h2>Llévalo contigo</h2>
            <p>Instala Moviexpress para abrirlo desde la pantalla de inicio.</p>
            {ready ? (
              <button className="button primary" onClick={() => void install()}>
                Instalar aplicación
              </button>
            ) : (
              <p className="help">
                En iPhone: Safari → Compartir → Añadir a pantalla de inicio. En Android o
                computadora: menú del navegador → Instalar aplicación, si está disponible.
              </p>
            )}
            <small>Sin conexión se abre la interfaz. Los datos privados requieren internet.</small>
          </section>
          <section className="panel settings-card">
            <Plug className="setting-icon" />
            <h2>Proveedores GPS</h2>
            <p>Navegador: disponible con permiso del dispositivo.</p>
            {['Samsara', 'Geotab', 'Wialon', 'Teltonika', 'API personalizada'].map((p) => (
              <div className="integration" key={p}>
                <span>{p}</span>
                <small>Integración pendiente</small>
              </div>
            ))}
          </section>
        </div>
      </div>
      {password && (
        <Modal title="Cambiar contraseña" onClose={() => setPassword(false)}>
          <form
            className="simple-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (f.get('password') !== f.get('confirm')) {
                toast.error('Las contraseñas no coinciden.');
                return;
              }
              setBusy(true);
              try {
                const { error } = await db().auth.updateUser({
                  password: String(f.get('password')),
                });
                if (error) throw error;
                toast.success('Contraseña actualizada.');
                setPassword(false);
              } catch (e) {
                toast.error(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nueva contraseña
              <input
                name="password"
                type="password"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              Confirmar contraseña
              <input
                name="confirm"
                type="password"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>
            <button className="button primary" disabled={busy}>
              Guardar contraseña
            </button>
            <button
              type="button"
              className="text-button"
              onClick={async () => {
                const { data } = await db().auth.getUser();
                if (data.user?.email) {
                  const { error } = await db().auth.resetPasswordForEmail(data.user.email, {
                    redirectTo: appUrl() + '?flow=recovery',
                  });
                  if (error) toast.error(message(error));
                  else toast.success('Enlace de recuperación enviado.');
                }
              }}
            >
              Enviar enlace de recuperación
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
