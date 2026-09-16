import { Link } from 'react-router-dom';
import {
  Users,
  Truck,
  FileWarning,
  MapPin,
  Plus,
  ArrowUpRight,
  ArrowRight,
  CheckCheck,
  Radio,
} from 'lucide-react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Badge, PageTitle, Empty, Loading } from '../components/ui';
import { dateTime } from '../lib/utils';
import { FleetMap } from './MapPage';
export function Dashboard() {
  const { data, loading } = useData(),
    { profile, demo } = useAuth();
  const active = data.reports.filter(
    (r) => !['Cerrado', 'Cancelado', 'Recuperado'].includes(r.status),
  );
  const today = data.reports.filter(
    (r) => new Date(r.created_at).toDateString() === new Date().toDateString(),
  ).length;
  const monitored = new Set(
    data.vehicle_locations
      .filter((l) => Date.now() - new Date(l.timestamp).getTime() < 86400000)
      .map((l) => l.vehicle_id),
  ).size;
  const stats = [
    {
      label: 'Conductores',
      value: data.drivers.filter((d) => !d.archived).length,
      icon: Users,
      detail: 'Personal registrado',
      path: '/drivers',
    },
    {
      label: 'Vehículos',
      value: data.vehicles.filter((v) => !v.archived).length,
      icon: Truck,
      detail: 'Unidades en tu flota',
      path: '/vehicles',
    },
    {
      label: 'Reportes activos',
      value: active.length,
      icon: FileWarning,
      detail: 'Requieren seguimiento',
      path: '/reports',
    },
    {
      label: 'Con ubicación reciente',
      value: monitored,
      icon: MapPin,
      detail: 'Actualizadas en las últimas 24 h',
      path: '/map',
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="CENTRO DE OPERACIONES"
        title="Tu operación, en perspectiva"
        description={new Intl.DateTimeFormat('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date())}
      >
        {profile?.role !== 'viewer' && (
          <Link className="button primary" to="/reports?new=1">
            <Plus size={18} /> Nuevo reporte
          </Link>
        )}
      </PageTitle>
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="stat-grid">
            {stats.map((s, i) => (
              <Link to={s.path} className={'stat-card stat-' + i} key={s.label}>
                <div className="stat-top">
                  <span>{s.label}</span>
                  <s.icon size={20} />
                </div>
                <div className="stat-value">
                  {String(s.value).padStart(2, '0')}
                  <ArrowUpRight size={21} />
                </div>
                <small>{s.detail}</small>
              </Link>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="panel map-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">VISIBILIDAD DE FLOTA</span>
                  <h2>En el mapa</h2>
                </div>
                <Link to="/map" className="text-button">
                  Abrir mapa <ArrowUpRight size={16} />
                </Link>
              </div>
              <FleetMap compact />
              <div className="map-footer">
                <span>
                  <Radio size={15} />
                  {demo ? 'Posiciones de demostración' : 'Últimas posiciones registradas'}
                </span>
                <span>{data.vehicles.length} unidades</span>
              </div>
            </section>
            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">PULSO DE LA OPERACIÓN</span>
                  <h2>Actividad reciente</h2>
                </div>
                <HistoryIcon />
              </div>
              <div className="activity-list">
                {(profile?.role === 'admin'
                  ? data.audit_logs.map((a) => ({
                      id: a.id,
                      label:
                        a.action === 'LOCATION_UPDATE'
                          ? 'Ubicación actualizada'
                          : a.action === 'CREATE'
                            ? 'Nuevo registro creado'
                            : a.action === 'LOGIN'
                              ? 'Inicio de sesión'
                              : a.action === 'REPORT_STATUS_CHANGE'
                                ? 'Estatus de reporte actualizado'
                                : 'Información actualizada',
                      sub:
                        (
                          {
                            reports: 'Reportes',
                            vehicles: 'Vehículos',
                            drivers: 'Conductores',
                            vehicle_locations: 'Seguimiento',
                          } as Record<string, string>
                        )[a.entity] || a.entity,
                      at: a.created_at,
                    }))
                  : data.reports.map((r) => ({
                      id: r.id,
                      label: r.folio,
                      sub: r.status,
                      at: r.updated_at,
                    }))
                )
                  .slice(0, 5)
                  .map((a, i) => (
                    <div className="activity-item" key={a.id}>
                      <div className={'activity-marker m' + i}>
                        {i === 1 ? <MapPin size={17} /> : <FileWarning size={17} />}
                      </div>
                      <div>
                        <strong>{a.label}</strong>
                        <p>{a.sub}</p>
                        <small>{dateTime(a.at)}</small>
                      </div>
                    </div>
                  ))}
                {!data.audit_logs.length && !data.reports.length && (
                  <Empty title="Sin actividad todavía" />
                )}
              </div>
              {profile?.role === 'admin' && (
                <Link className="activity-more" to="/audit">
                  Ver toda la actividad <ArrowRight size={16} />
                </Link>
              )}
            </section>
          </div>
          <div className="dashboard-bottom">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">ATENCIÓN Y SEGUIMIENTO</span>
                  <h2>Reportes recientes</h2>
                </div>
                <Link to="/reports" className="text-button">
                  Ver todos <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="mini-table">
                <div className="mini-table-head">
                  <span>FOLIO / UNIDAD</span>
                  <span>UBICACIÓN</span>
                  <span>ESTATUS</span>
                  <span />
                </div>
                {data.reports.slice(0, 4).map((r) => (
                  <Link key={r.id} to={'/reports/' + r.id} className="report-row">
                    <div>
                      <strong>{r.folio}</strong>
                      <small>
                        {data.vehicles.find((v) => v.id === r.vehicle_id)?.economic_number ||
                          'Unidad'}
                      </small>
                    </div>
                    <div>
                      <span>{r.state}</span>
                      <small>{r.road || 'Sin carretera registrada'}</small>
                    </div>
                    <Badge value={r.status} />
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
                {!data.reports.length && <Empty title="No hay reportes registrados" />}
              </div>
            </section>
            <section className="daily-summary">
              <div className="eyebrow">RESUMEN DEL DÍA</div>
              <h2>
                Avanzamos
                <br />
                juntos<span>.</span>
              </h2>
              <p className="chart-caption">Reportes · últimos 7 días</p>
              <div
                className="chart-bars"
                role="img"
                aria-label="Reportes por día en los últimos siete días"
              >
                {Array.from({ length: 7 }, (_, i) => {
                  const day = new Date();
                  day.setDate(day.getDate() - 6 + i);
                  const count = data.reports.filter(
                    (r) => new Date(r.created_at).toDateString() === day.toDateString(),
                  ).length;
                  return (
                    <div
                      key={i}
                      title={day.toLocaleDateString('es-MX') + ': ' + count + ' reportes'}
                    >
                      <i style={{ height: Math.max(3, Math.min(60, count * 14)) + 'px' }} />
                      <small>{day.toLocaleDateString('es-MX', { weekday: 'narrow' })}</small>
                    </div>
                  );
                })}
              </div>
              <div>
                <FileWarning size={19} />
                <span>Reportes de hoy</span>
                <strong>{today}</strong>
              </div>
              <div>
                <CheckCheck size={19} />
                <span>Reportes cerrados</span>
                <strong>{data.reports.filter((r) => r.status === 'Cerrado').length}</strong>
              </div>
              <Link to="/vehicles">
                Consultar mi flota <ArrowUpRight size={18} />
              </Link>
            </section>
          </div>
        </>
      )}
    </>
  );
}
function HistoryIcon() {
  return (
    <span className="activity-pulse">
      <Radio size={18} />
    </span>
  );
}
