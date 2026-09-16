import { useState, type FormEvent } from 'react';
import { LocateFixed, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Photo } from '../components/Photo';
import { Modal, Badge } from '../components/ui';
import { fields, entityNames } from './fields';
import { message } from '../lib/utils';
import type { Entity, EntityRecord } from '../types';
const localDate = (value: unknown) => {
  if (!value) return '';
  const d = new Date(String(value));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function RecordForm({
  entity,
  record,
  onClose,
  onSaved,
}: {
  entity: Entity;
  record?: EntityRecord;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { data, save } = useData(),
    { demo } = useAuth();
  const [busy, setBusy] = useState(false),
    [gpsBusy, setGpsBusy] = useState(false),
    [values, setValues] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        fields[entity].map((f) => {
          const v = record
            ? (record as unknown as Record<string, unknown>)[f.key]
            : f.key === 'status'
              ? 'Activo'
              : f.key === 'incident_at'
                ? new Date().toISOString()
                : '';
          return [f.key, f.type === 'datetime-local' ? localDate(v) : String(v ?? '')];
        }),
      ),
    );
  const [error, setError] = useState('');
  const vehicle = data.vehicles.find((v) => v.id === values.vehicle_id),
    driver = data.drivers.find((d) => d.id === vehicle?.driver_id);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (entity === 'reports' && Boolean(values.latitude) !== Boolean(values.longitude))
        throw new Error('Ingresa latitud y longitud juntas.');
      const payload = Object.fromEntries(
        fields[entity].map((f) => {
          let value: unknown = values[f.key]?.trim() || null;
          if (value && f.type === 'datetime-local') value = new Date(String(value)).toISOString();
          if (value !== null && f.type === 'number') value = Number(value);
          if (f.key === 'plates' && value) value = String(value).toUpperCase();
          return [f.key, value];
        }),
      );
      const saved = await save(entity, payload, record?.id);
      toast.success(record ? 'Registro actualizado.' : 'Registro creado.');
      onSaved(saved.id);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function gps() {
    if (!navigator.geolocation) {
      setError('Tu navegador no ofrece ubicación.');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setValues((v) => ({
          ...v,
          latitude: String(p.coords.latitude),
          longitude: String(p.coords.longitude),
          last_location_at: localDate(new Date(p.timestamp).toISOString()),
        }));
        setGpsBusy(false);
      },
      () => {
        setError('No se obtuvo la ubicación. Revisa los permisos del navegador.');
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }
  return (
    <Modal
      title={(record ? 'Editar ' : 'Registrar ') + entityNames[entity].single}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="record-form">
        {demo && (
          <div className="notice">
            Vista del formulario. La demostración no guarda datos; inicia sesión con Supabase para
            registrar información.
          </div>
        )}
        {Object.entries(Object.groupBy(fields[entity], (f) => f.group)).map(
          ([group, groupFields]) => (
            <fieldset key={group}>
              <legend>{group}</legend>
              {group === 'Lugar del incidente' && (
                <button
                  className="button ghost geo-button"
                  type="button"
                  disabled={gpsBusy}
                  onClick={gps}
                >
                  <LocateFixed size={16} />
                  {gpsBusy ? 'Obteniendo ubicación…' : 'Obtener mi ubicación'}
                </button>
              )}
              {group === 'Denuncia' && (
                <p className="notice">
                  Se recomienda generar la denuncia o predenuncia lo antes posible por los canales
                  oficiales. Este sistema solo registra la información que proporciones.
                </p>
              )}
              <div className="form-grid">
                {groupFields?.map((f) => (
                  <label key={f.key} className={f.type === 'textarea' ? 'span-2' : ''}>
                    {f.label}
                    {f.required ? ' *' : ''}
                    {['select', 'driver', 'vehicle'].includes(f.type || '') ? (
                      <select
                        required={f.required}
                        value={values[f.key]}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      >
                        <option value="">Selecciona una opción</option>
                        {f.type === 'driver'
                          ? data.drivers
                              .filter((d) => !d.archived || d.id === values[f.key])
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.full_name}
                                </option>
                              ))
                          : f.type === 'vehicle'
                            ? data.vehicles
                                .filter((v) => !v.archived || v.id === values[f.key])
                                .map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.economic_number} · {v.plates}
                                  </option>
                                ))
                            : f.options?.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={values[f.key]}
                        minLength={f.key === 'description' ? 10 : undefined}
                        maxLength={20000}
                        required={f.required}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      />
                    ) : (
                      <input
                        value={values[f.key]}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                        type={f.type || 'text'}
                        required={f.required}
                        min={f.min}
                        max={f.key === 'birth_date' ? new Date().toISOString().slice(0, 10) : f.max}
                        step={f.type === 'number' ? 'any' : undefined}
                        maxLength={f.type === 'tel' ? 20 : f.key === 'plates' ? 20 : 160}
                        pattern={
                          f.type === 'tel'
                            ? '[+0-9 \\(\\)\\-]{7,20}'
                            : f.key === 'plates'
                              ? '[A-Za-z0-9 \\-]{3,20}'
                              : undefined
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              {group === 'Datos generales' && vehicle && (
                <div className="linked-unit">
                  <strong>
                    {vehicle.brand} {vehicle.subbrand} · {vehicle.color}
                  </strong>
                  <p>
                    {vehicle.economic_number} / {vehicle.plates} · {vehicle.vehicle_type}
                  </p>
                  <p>
                    Conductor: {driver?.full_name || 'Sin asignar'} · {driver?.phone || ''}
                  </p>
                  <Badge value={vehicle.status} />
                  <div className="linked-photos">
                    <div>
                      <Photo path={vehicle.photo_path} alt="Vehículo seleccionado" />
                    </div>
                    {driver && (
                      <div>
                        <Photo path={driver.photo_path} alt="Conductor asignado" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </fieldset>
          ),
        )}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <div className="form-footer">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy || demo}>
            <Save size={17} />
            {busy ? 'Guardando…' : 'Guardar registro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
