import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowUpRight,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { PageTitle, Badge, Empty, Loading } from '../components/ui';
import { RecordForm } from '../features/RecordForm';
import { entityNames, statuses } from '../features/fields';
import { dateTime, downloadCsv } from '../lib/utils';
import type { Entity, EntityRecord } from '../types';
export function recordTitle(r: EntityRecord) {
  return 'full_name' in r ? r.full_name : 'economic_number' in r ? r.economic_number : r.folio;
}
export function EntityList({ entity }: { entity: Entity }) {
  const { data, loading } = useData(),
    { profile } = useAuth(),
    navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [archive, setArchive] = useState(false),
    [sort, setSort] = useState('newest'),
    [page, setPage] = useState(1);
  const labels = entityNames[entity];
  const rows = (data[entity] as EntityRecord[])
    .filter(
      (r) =>
        (!status || r.status === status) &&
        (!('archived' in r) || r.archived === archive) &&
        Object.values(r).some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
    )
    .sort((a, b) =>
      sort === 'name'
        ? recordTitle(a).localeCompare(recordTitle(b))
        : b.created_at.localeCompare(a.created_at),
    );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages);
  const close = () => setParams({});
  return (
    <>
      <PageTitle
        eyebrow="GESTIÓN DE OPERACIONES"
        title={labels.plural}
        description={labels.description}
      >
        {profile?.role === 'admin' && (
          <button
            className="button ghost"
            disabled={!rows.length}
            onClick={() => downloadCsv(rows as unknown as Record<string, unknown>[], entity)}
          >
            <Download size={17} />
            Exportar
          </button>
        )}
        {profile?.role !== 'viewer' && (
          <button className="button primary" onClick={() => setParams({ new: '1' })}>
            <Plus size={18} />
            Nuevo {labels.single}
          </button>
        )}
      </PageTitle>
      <section className="panel records-panel">
        <div className="list-toolbar">
          <div className="list-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={'Buscar ' + labels.plural.toLowerCase() + '…'}
              aria-label={'Buscar ' + labels.plural}
            />
          </div>
          <div className="filters">
            <SlidersHorizontal size={17} />
            <select
              aria-label="Filtrar por estatus"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los estatus</option>
              {statuses[entity].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Ordenar registros"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Más recientes</option>
              <option value="name">Nombre / folio A–Z</option>
            </select>
            {entity !== 'reports' && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={archive}
                  onChange={(e) => {
                    setArchive(e.target.checked);
                    setPage(1);
                  }}
                />
                Archivados
              </label>
            )}
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : rows.length ? (
          <>
            <div className="records-table">
              <div className="record-table-heading">
                <span>
                  {entity === 'drivers'
                    ? 'CONDUCTOR'
                    : entity === 'vehicles'
                      ? 'UNIDAD'
                      : 'REPORTE'}
                </span>
                <span>
                  {entity === 'drivers'
                    ? 'CONTACTO'
                    : entity === 'vehicles'
                      ? 'VEHÍCULO'
                      : 'UBICACIÓN'}
                </span>
                <span>{entity === 'reports' ? 'UNIDAD' : 'EMPRESA'}</span>
                <span>ESTATUS</span>
                <span />
              </div>
              {rows.slice((current - 1) * 10, current * 10).map((r) => (
                <Link key={r.id} className="record-table-row" to={'/' + entity + '/' + r.id}>
                  <div className="record-name">
                    <span className="record-initial">{recordTitle(r).slice(0, 2)}</span>
                    <div>
                      <strong>{recordTitle(r)}</strong>
                      <small>
                        {'license_number' in r
                          ? 'Lic. ' + r.license_number
                          : 'plates' in r
                            ? r.plates
                            : dateTime(r.created_at)}
                      </small>
                    </div>
                  </div>
                  <div>
                    {'phone' in r
                      ? r.phone
                      : 'brand' in r
                        ? r.brand + ' ' + (r.subbrand || '')
                        : r.state}
                  </div>
                  <div>
                    {'company' in r
                      ? r.company || 'Sin empresa'
                      : data.vehicles.find((v) => v.id === r.vehicle_id)?.economic_number || '—'}
                  </div>
                  <Badge value={r.status} />
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
            <div className="pagination">
              <span>
                {rows.length} registros · Página {current} de {pages}
              </span>
              <div>
                <button
                  className="icon-button"
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="icon-button"
                  disabled={current === pages}
                  onClick={() => setPage(current + 1)}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title={
              search || status
                ? 'No hay coincidencias'
                : 'No existen ' + labels.plural.toLowerCase() + ' registrados.'
            }
          >
            {profile?.role !== 'viewer' && (
              <button className="button primary" onClick={() => setParams({ new: '1' })}>
                Registrar {labels.single}
              </button>
            )}
          </Empty>
        )}
      </section>
      {params.get('new') === '1' && profile?.role !== 'viewer' && (
        <RecordForm
          entity={entity}
          onClose={close}
          onSaved={(id) => navigate('/' + entity + '/' + id)}
        />
      )}
    </>
  );
}
