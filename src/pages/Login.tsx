import { useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck, Eye, EyeOff, LockKeyhole, MoveUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { appUrl, db, supabase } from '../lib/supabase';
import { message } from '../lib/utils';
import { Brand } from '../components/ui';
export function Login() {
  const { enterDemo, error, session, recovery, clearRecovery, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'reset'>('login'),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const changePassword = recovery && !!session;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const email = String(f.get('email') || ''),
        password = String(f.get('password') || '');
      if (changePassword) {
        if (password !== f.get('confirm')) throw new Error('Las contraseñas no coinciden.');
        const { error } = await db().auth.updateUser({ password });
        if (error) throw error;
        clearRecovery();
        history.replaceState(null, '', appUrl() + '#/');
        toast.success('Contraseña actualizada.');
      } else if (mode === 'reset') {
        const { error } = await db().auth.resetPasswordForEmail(email, {
          redirectTo: appUrl() + '?flow=recovery',
        });
        if (error) throw error;
        toast.success('Si el correo está registrado, recibirás un enlace de recuperación.');
        setMode('login');
      } else {
        const { error } = await db().auth.signInWithPassword({ email, password });
        if (error) throw error;
        void db().rpc('record_login');
      }
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-art">
        <Brand large />
        <div className="login-copy">
          <div className="eyebrow">TU OPERACIÓN. SIEMPRE A LA VISTA.</div>
          <h1>
            Cada ruta.
            <br />
            Cada unidad.
            <br />
            <em>Bajo control.</em>
          </h1>
          <p>
            Registro, seguimiento y respuesta.
            <br />
            Todo tu equipo, en un mismo lugar.
          </p>
          <div className="route-art" aria-hidden="true">
            <span>ORIGEN</span>
            <div className="route-line">
              <i />
            </div>
            <MoveUpRight />
            <span>DESTINO</span>
          </div>
        </div>
        <div className="login-footer">
          NUESTRO EQUIPO ES NUESTRO MAYOR MOTOR <ArrowRight size={19} />
        </div>
      </section>
      <section className="login-form">
        <div className="access-tag">
          <ShieldCheck size={16} /> ACCESO PRIVADO
        </div>
        <div className="login-form-inner">
          <div className="square-icon">
            <LockKeyhole />
          </div>
          <h2>
            {changePassword
              ? 'Nueva contraseña'
              : mode === 'reset'
                ? 'Recupera tu acceso'
                : 'Bienvenido de nuevo'}
          </h2>
          <p>
            {changePassword
              ? 'Elige una contraseña de al menos 12 caracteres.'
              : mode === 'reset'
                ? 'Te enviaremos un enlace a tu correo.'
                : 'Ingresa para continuar con tu operación.'}
          </p>
          {!supabase && (
            <div className="notice">
              Conexión pendiente con Supabase. Puedes explorar una demostración con datos ficticios.
            </div>
          )}
          {error && (
            <div role="alert" className="error-box">
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            {!changePassword && (
              <label>
                Correo electrónico
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="tu@empresa.com"
                  required
                  disabled={!supabase}
                />
              </label>
            )}
            {(mode === 'login' || changePassword) && (
              <label>
                Contraseña
                <div className="password-field">
                  <input
                    name="password"
                    type={show ? 'text' : 'password'}
                    minLength={changePassword ? 12 : undefined}
                    autoComplete={changePassword ? 'new-password' : 'current-password'}
                    required
                    disabled={!supabase}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}
            {changePassword && (
              <label>
                Confirmar contraseña
                <input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </label>
            )}
            {!changePassword && mode === 'login' && (
              <button type="button" className="text-button forgot" onClick={() => setMode('reset')}>
                Olvidé mi contraseña
              </button>
            )}
            <button className="button primary full" disabled={busy || !supabase}>
              {busy
                ? 'Procesando…'
                : changePassword
                  ? 'Guardar contraseña'
                  : mode === 'reset'
                    ? 'Enviar enlace'
                    : 'Iniciar sesión'}
              <ArrowRight size={18} />
            </button>
          </form>
          {!changePassword &&
            (mode === 'reset' ? (
              <button className="text-button" onClick={() => setMode('login')}>
                Volver al inicio de sesión
              </button>
            ) : (
              <button className="button ghost full demo-button" onClick={enterDemo}>
                Explorar demostración <MoveUpRight size={17} />
              </button>
            ))}
          {session && !changePassword && (
            <button className="text-button" onClick={() => void signOut()}>
              Cerrar sesión actual
            </button>
          )}
          <div className="login-help">
            ¿Necesitas acceso? Contacta al administrador de tu empresa.
          </div>
        </div>
        <small className="login-bottom">MOVIEXPRESS · PLATAFORMA DE OPERACIONES</small>
      </section>
    </main>
  );
}
