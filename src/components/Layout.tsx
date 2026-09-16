import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  FileWarning,
  Map,
  Shield,
  History,
  Settings,
  LogOut,
  Search,
  ArrowUpRight,
  Menu,
  X,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Brand } from './ui';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { message } from '../lib/utils';
const links = [
  ['/', 'Resumen', LayoutDashboard],
  ['/drivers', 'Conductores', Users],
  ['/vehicles', 'Vehículos', Truck],
  ['/reports', 'Reportes', FileWarning],
  ['/map', 'Mapa y seguimiento', Map],
  ['/users', 'Usuarios', Shield],
  ['/audit', 'Bitácora', History],
  ['/settings', 'Configuración', Settings],
] as const;
export function Layout() {
  const { profile, demo, signOut } = useAuth(),
    { data, loading, error, refresh } = useData();
  const [query, setQuery] = useState(''),
    [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const results =
    query.trim().length > 1
      ? [
          ...data.drivers
            .filter((r) => `${r.full_name} ${r.phone}`.toLowerCase().includes(query.toLowerCase()))
            .map((r) => ({
              group: 'Conductores',
              label: r.full_name,
              sub: r.phone,
              path: '/drivers/' + r.id,
            })),
          ...data.vehicles
            .filter((r) =>
              `${r.plates} ${r.economic_number} ${r.brand} ${r.subbrand}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((r) => ({
              group: 'Vehículos',
              label: r.economic_number,
              sub: r.plates,
              path: '/vehicles/' + r.id,
            })),
          ...data.reports
            .filter((r) =>
              `${r.folio} ${r.complaint_number}`.toLowerCase().includes(query.toLowerCase()),
            )
            .map((r) => ({
              group: 'Reportes',
              label: r.folio,
              sub: r.status,
              path: '/reports/' + r.id,
            })),
        ].slice(0, 12)
      : [];
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: { registerTool: (tool: unknown, options: unknown) => void };
      }
    ).modelContext;
    if (!context) return;
    const controller = new AbortController();
    context.registerTool(
      {
        name: 'navigate_operations',
        description: 'Abre un módulo visible del centro de control.',
        inputSchema: {
          type: 'object',
          properties: {
            module: { type: 'string', enum: ['drivers', 'vehicles', 'reports', 'map'] },
          },
          required: ['module'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input: unknown) => {
          const module =
            typeof input === 'object' && input && 'module' in input ? input.module : null;
          if (
            typeof module !== 'string' ||
            !['drivers', 'vehicles', 'reports', 'map'].includes(module)
          )
            throw new Error('Módulo inválido');
          navigate('/' + module);
          return { opened: module };
        },
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, [navigate]);
  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (menu ? 'open' : '')}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Cerrar menú"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-chip">
          <div className="workspace-icon">M</div>
          <div>
            <strong>Moviexpress</strong>
            <small>Gestión de transportistas</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <div className="nav-label">OPERACIÓN</div>
        <nav>
          {links
            .filter(([path]) => profile?.role === 'admin' || !['/users', '/audit'].includes(path))
            .map(([path, label, Icon], i) => (
              <div key={path}>
                {i === 5 && <div className="nav-label management">ADMINISTRACIÓN</div>}
                <NavLink
                  to={path}
                  end={path === '/'}
                  onClick={() => {
                    setMenu(false);
                    setQuery('');
                  }}
                  className={({ isActive }) => 'nav-link ' + (isActive ? 'selected' : '')}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {path === '/reports' &&
                    data.reports.filter((r) => r.status === 'Activo').length > 0 && (
                      <b>{data.reports.filter((r) => r.status === 'Activo').length}</b>
                    )}
                </NavLink>
              </div>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="brand-motto">
            <span>En movimiento.</span>
            <strong>
              Siempre contigo.
              <ArrowUpRight size={20} />
            </strong>
          </div>
          <button
            className="profile-button"
            onClick={() => void signOut().catch((e) => toast.error(message(e)))}
          >
            <span className="avatar">{profile?.full_name.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{profile?.full_name}</strong>
              <small>
                {profile?.role === 'admin'
                  ? 'Administrador'
                  : profile?.role === 'operator'
                    ? 'Operador'
                    : 'Consulta'}
              </small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {menu && <button aria-label="Cerrar menú" className="scrim" onClick={() => setMenu(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            onClick={() => setMenu(true)}
            aria-label="Abrir menú"
          >
            <Menu />
          </button>
          <img
            className="mobile-only mobile-logo"
            src={import.meta.env.BASE_URL + 'logo.jpg'}
            alt="Moviexpress"
          />
          <div className="global-search">
            <Search size={19} />
            <input
              aria-label="Buscador global"
              placeholder="Buscar conductor, placa o folio…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('');
              }}
            />
            {query && (
              <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            )}
            {query.length > 1 && (
              <div className="search-results">
                {results.length ? (
                  results.map((r) => (
                    <button
                      key={r.path}
                      onClick={() => {
                        navigate(r.path);
                        setQuery('');
                      }}
                    >
                      <small>{r.group}</small>
                      <strong>{r.label}</strong>
                      <span>{r.sub}</span>
                    </button>
                  ))
                ) : (
                  <p>Sin resultados para “{query}”.</p>
                )}
              </div>
            )}
          </div>
          <div className="topbar-right">
            <span className={'connection ' + (demo ? 'is-demo' : '')}>
              <i />
              {demo ? 'DEMO · DATOS FICTICIOS' : 'SESIÓN PRIVADA'}
            </span>
            <button
              className="icon-button"
              onClick={() => void refresh()}
              disabled={loading}
              aria-label="Actualizar información"
            >
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </button>
            <span className="avatar small">MX</span>
          </div>
        </header>
        <div className="content">
          {demo && (
            <div className="demo-notice">
              <span>Estás explorando una demostración de solo lectura.</span>
              <button onClick={() => void signOut()}>
                Ir al acceso real <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {error && (
            <div className="error-box" role="alert">
              No se pudo actualizar la información: {error}
              <button onClick={() => void refresh()}>Reintentar</button>
            </div>
          )}
          <Outlet />
        </div>
        <footer className="app-footer">
          <span>
            MOVIEXPRESS <b>/</b> CENTRO DE CONTROL
          </span>
          <span>Tu equipo es nuestro mayor motor.</span>
        </footer>
      </div>
      <nav className="bottom-nav">
        {links.slice(0, 5).map(([path, label, Icon]) => (
          <NavLink key={path} to={path} end={path === '/'}>
            <Icon size={20} />
            <span>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
