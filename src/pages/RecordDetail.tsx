import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Archive,
  Trash2,
  FileDown,
  Camera,
  ImagePlus,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { PageTitle, Badge, Modal, Loading, Empty } from '../components/ui';
import { Documents } from '../components/Documents';
import { Photo } from '../components/Photo';
import { RecordForm } from '../features/RecordForm';
import { fields, entityNames } from '../features/fields';
import { recordTitle } from './EntityList';
import { FleetMap } from './MapPage';
import { age, dateTime, message } from '../lib/utils';
import { uploadPhoto } from '../services/photos';

import { db } from '../lib/supabase';
import type { Entity, EntityRecord, Report, Vehicle, Driver } from '../types';
export function RecordDetail({ entity }: { entity: Entity }) {
  const { id } = useParams(),
    navigate = useNavigate(),
    { data, save, remove, refresh, loading } = useData(),
    { profile, demo } = useAuth();
  const [edit, setEdit] = useState(false),
    [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('Información');
  const record = (data[entity] as EntityRecord[]).find((r) => r.id === id);
  if (loading && !record) return <Loading />;
  if (!record)
    return (
      <Empty title="Registro no encontrado">
        <Link className="button ghost" to={'/' + entity}>
          Volver al listado
        </Link>
      </Empty>
    );
  const vehicle =
    entity === 'vehicles'
      ? (record as Vehicle)
      : entity === 'reports'
        ? data.vehicles.find((v) => v.id === (record as Report).vehicle_id)
        : undefined;
  const driver =
    entity === 'drivers'
      ? (record as Driver)
      : data.drivers.find((d) => d.id === vehicle?.driver_id);
  const relatedVehicles =
    entity === 'drivers'
      ? data.vehicles.filter((v) => v.driver_id === id)
      : vehicle
        ? [vehicle]
        : [];
  const reports = data.reports.filter((r) => relatedVehicles.some((v) => v.id === r.vehicle_id));
  const raw = record as unknown as Record<string, unknown>;
  const writable = profile?.role !== 'viewer';
  const photos =
    entity === 'vehicles' ? data.vehicle_photos.filter((p) => p.vehicle_id === id) : [];
  async function upload(e: ChangeEvent<HTMLInputElement>, additional = false) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !profile || !record) return;
    if (demo) {
      toast.info('Conecta Supabase para subir fotografías.');
      return;
    }
    setBusy(true);
    try {
      for (const file of files) {
        const path = await uploadPhoto(file, profile.organization_id, entity, record.id);
        if (additional) {
          const { error } = await db()
            .from('vehicle_photos')
            .insert({ organization_id: profile.organization_id, vehicle_id: record.id, path });
          if (error) throw error;
        } else await save(entity, { photo_path: path }, record.id);
      }
      await refresh();
      toast.success('Fotografía guardada.');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function perform() {
    if (!record) return;
    setBusy(true);
    try {
      if (confirm === 'delete') {
        await remove(entity, record.id);
        navigate('/' + entity);
      } else {
        await save(entity, { archived: !raw.archived }, record.id);
      }
      setConfirm(null);
      toast.success('Operación completada.');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to={'/' + entity}>
        <ArrowLeft size={16} /> Volver a {entityNames[entity].plural.toLowerCase()}
      </Link>
      <PageTitle
        eyebrow="EXPEDIENTE"
        title={recordTitle(record)}
        description={'Actualizado: ' + dateTime(record.updated_at)}
      >
        {entity === 'reports' && (
          <button
            className="button ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { reportPdf } = await import('../services/pdf');
                await reportPdf(record as Report, data, demo);
              } catch (e) {
                toast.error(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <FileDown size={17} />
            Generar PDF
          </button>
        )}
        {writable && (
          <button className="button primary" onClick={() => setEdit(true)}>
            <Pencil size={17} />
            Editar registro
          </button>
        )}
      </PageTitle>
      <div className="detail-layout">
        <aside className="panel detail-summary">
          {entity !== 'reports' ? (
            <Photo path={(record as Driver | Vehicle).photo_path} alt={recordTitle(record)} />
          ) : (
            <div className="report-cover">
              <span>REPORTE DE INCIDENTE</span>
              <strong>{(record as Report).folio}</strong>
              <Badge value={record.status} />
            </div>
          )}
          <div className="summary-content">
            <Badge value={record.status} />
            {'archived' in record && record.archived && (
              <span className="badge neutral">Archivado</span>
            )}
            <h2>{recordTitle(record)}</h2>
            {driver && (
              <p>
                {driver.full_name}
                <br />
                {driver.phone}
                {entity === 'drivers' && (
                  <>
                    <br />
                    {age(driver.birth_date)} años
                  </>
                )}
              </p>
            )}
            {vehicle && (
              <p>
                {vehicle.brand} {vehicle.subbrand}
                <br />
                {vehicle.plates}
              </p>
            )}
            {entity !== 'reports' && writable && (
              <div className="upload-actions">
                <label className="button ghost">
                  <Camera size={16} />
                  {busy ? 'Subiendo…' : 'Tomar foto'}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    disabled={busy || demo}
                    onChange={(e) => void upload(e)}
                  />
                </label>
                <label className="text-button">
                  Elegir desde archivos
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy || demo}
                    onChange={(e) => void upload(e)}
                  />
                </label>
              </div>
            )}
            {vehicle && (
              <Link className="button ghost full" to="/map">
                <MapPin size={16} />
                Consultar mapa
              </Link>
            )}
            <div className="detail-actions">
              {writable && entity !== 'reports' && (
                <button className="text-button" onClick={() => setConfirm('archive')}>
                  <Archive size={16} />
                  {raw.archived ? 'Restaurar registro' : 'Archivar registro'}
                </button>
              )}
              {profile?.role === 'admin' && (
                <button className="text-button delete-text" onClick={() => setConfirm('delete')}>
                  <Trash2 size={16} />
                  Eliminar registro
                </button>
              )}
            </div>
          </div>
        </aside>
        <section className="panel detail-main">
          <div className="tabs" role="tablist">
            {[
              'Información',
              'Fotografías',
              'Reportes',
              'Ubicaciones',
              'Documentos',
              'Historial',
            ].map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="tab-content" role="tabpanel">
            {tab === 'Información' && (
              <>
                {Object.entries(Object.groupBy(fields[entity], (f) => f.group)).map(
                  ([group, fs]) => (
                    <div className="detail-group" key={group}>
                      <h3>{group}</h3>
                      <dl>
                        {fs?.map((f) => (
                          <div key={f.key} className={f.type === 'textarea' ? 'span-2' : ''}>
                            <dt>{f.label}</dt>
                            <dd>
                              {f.type === 'driver'
                                ? data.drivers.find((d) => d.id === raw[f.key])?.full_name ||
                                  'Sin asignar'
                                : f.type === 'vehicle'
                                  ? vehicle?.economic_number
                                  : f.type === 'datetime-local'
                                    ? dateTime(String(raw[f.key] || ''))
                                    : String(raw[f.key] ?? 'Sin registro')}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ),
                )}
                {entity === 'reports' && (
                  <div className="notice">
                    Registra la denuncia o predenuncia por los canales oficiales. La aplicación no
                    presenta denuncias automáticamente.
                  </div>
                )}
                {entity === 'drivers' &&
                  relatedVehicles.map((v) => (
                    <Link className="related-record" to={'/vehicles/' + v.id} key={v.id}>
                      {v.economic_number} · {v.plates} <ArrowLeft size={16} />
                    </Link>
                  ))}
                {vehicle && driver && (
                  <Link className="related-record" to={'/drivers/' + driver.id}>
                    Expediente de {driver.full_name}
                  </Link>
                )}
              </>
            )}
            {tab === 'Fotografías' && (
              <>
                <div className="photo-grid">
                  {driver && (
                    <div>
                      <Photo path={driver.photo_path} alt="Conductor" />
                      <p>Conductor</p>
                    </div>
                  )}
                  {vehicle && (
                    <div>
                      <Photo path={vehicle.photo_path} alt="Vehículo" />
                      <p>Vehículo</p>
                    </div>
                  )}
                  {photos.map((p) => (
                    <div key={p.id}>
                      <Photo path={p.path} alt="Fotografía adicional del vehículo" />
                    </div>
                  ))}
                </div>
                {entity === 'vehicles' && writable && (
                  <label className="button ghost">
                    <ImagePlus size={17} />
                    Agregar fotografías
                    <input
                      hidden
                      multiple
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy || demo}
                      onChange={(e) => void upload(e, true)}
                    />
                  </label>
                )}
              </>
            )}
            {tab === 'Reportes' &&
              (reports.length ? (
                reports.map((r) => (
                  <Link key={r.id} className="related-record" to={'/reports/' + r.id}>
                    <strong>{r.folio}</strong>
                    <Badge value={r.status} />
                    <span>{dateTime(r.created_at)}</span>
                  </Link>
                ))
              ) : (
                <Empty title="No hay reportes asociados" />
              ))}
            {tab === 'Ubicaciones' &&
              (vehicle ? (
                <>
                  <FleetMap vehicleId={vehicle.id} />
                  {data.vehicle_locations
                    .filter((l) => l.vehicle_id === vehicle.id)
                    .slice(0, 50)
                    .map((l) => (
                      <div className="related-record" key={l.id}>
                        <span>
                          {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                        </span>
                        <small>
                          {dateTime(l.timestamp)} · ±{Math.round(l.accuracy || 0)} m
                        </small>
                      </div>
                    ))}
                </>
              ) : (
                <Empty title="Selecciona una unidad desde el mapa para consultar su recorrido" />
              ))}
            {tab === 'Documentos' && <Documents entity={entity} id={record.id} />}
            {tab === 'Historial' &&
              (profile?.role === 'admin' ? (
                data.audit_logs
                  .filter((a) => a.entity_id === id)
                  .map((a) => (
                    <div className="related-record" key={a.id}>
                      <strong>{a.action}</strong>
                      <span>{dateTime(a.created_at)}</span>
                    </div>
                  ))
              ) : (
                <p>La bitácora de cambios está disponible para administradores.</p>
              ))}
          </div>
        </section>
      </div>
      {edit && (
        <RecordForm
          entity={entity}
          record={record}
          onClose={() => setEdit(false)}
          onSaved={() => setEdit(false)}
        />
      )}
      {confirm && (
        <Modal
          title={
            confirm === 'delete'
              ? 'Eliminar registro'
              : raw.archived
                ? 'Restaurar registro'
                : 'Archivar registro'
          }
          onClose={() => setConfirm(null)}
        >
          <div className="confirmation">
            <p>
              {confirm === 'delete'
                ? 'Se eliminará el registro de forma permanente. Los registros con reportes o ubicaciones asociados están protegidos y pueden impedir esta acción.'
                : 'El registro se conservará junto con su historial y reportes.'}
            </p>
            <div className="form-footer">
              <button className="button ghost" onClick={() => setConfirm(null)}>
                Cancelar
              </button>
              <button
                className={'button ' + (confirm === 'delete' ? 'danger' : 'primary')}
                disabled={busy || demo}
                onClick={() => void perform()}
              >
                {busy ? 'Procesando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
