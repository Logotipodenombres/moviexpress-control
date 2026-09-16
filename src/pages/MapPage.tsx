import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import { LocateFixed, Square, Truck, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { PageTitle, Empty } from '../components/ui';
import { dateTime, distance, message } from '../lib/utils';
import { BrowserGeolocationProvider, type GpsFix } from '../services/gps';
import { db } from '../lib/supabase';
import type { VehicleLocation } from '../types';
function Fit({ points }: { points: VehicleLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length)
      map.fitBounds(new LatLngBounds(points.map((p) => [p.latitude, p.longitude])), {
        padding: [40, 40],
        maxZoom: 11,
        animate: false,
      });
  }, [points, map]);
  return null;
}
export function FleetMap({
  compact = false,
  vehicleId,
}: {
  compact?: boolean;
  vehicleId?: string;
}) {
  const { data } = useData();
  const history = useMemo(
    () =>
      data.vehicle_locations
        .filter((l) => !vehicleId || l.vehicle_id === vehicleId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [data.vehicle_locations, vehicleId],
  );
  const latest = useMemo(
    () => Object.values(Object.fromEntries(history.map((l) => [l.vehicle_id, l]))),
    [history],
  );
  return (
    <div className={'fleet-map ' + (compact ? 'compact' : '')}>
      <MapContainer center={[20, -100]} zoom={5} scrollWheelZoom={!compact} attributionControl>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Fit points={latest} />
        {vehicleId && history.length > 1 && (
          <Polyline
            positions={history.map((l) => [l.latitude, l.longitude])}
            pathOptions={{ color: '#e22935', weight: 4 }}
          />
        )}
        {latest.map((l) => {
          const v = data.vehicles.find((v) => v.id === l.vehicle_id);
          return (
            <CircleMarker
              key={l.vehicle_id}
              center={[l.latitude, l.longitude]}
              radius={9}
              pathOptions={{ color: '#fff', weight: 3, fillColor: '#d91529', fillOpacity: 1 }}
            >
              <Popup>
                <strong>
                  {v?.economic_number} · {v?.plates}
                </strong>
                <p>
                  {data.drivers.find((d) => d.id === v?.driver_id)?.full_name ||
                    'Sin conductor asignado'}
                </p>
                <p>{dateTime(l.timestamp)}</p>
                <p>
                  {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                </p>
                {l.report_id && <Link to={'/reports/' + l.report_id}>Ver reporte asociado</Link>}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {!latest.length && <div className="map-empty">No hay posiciones registradas todavía.</div>}
    </div>
  );
}
export function MapPage() {
  const { data, refresh } = useData(),
    { profile, demo } = useAuth();
  const [vehicle, setVehicle] = useState(''),
    [report, setReport] = useState(''),
    [tracking, setTracking] = useState(false),
    [seconds, setSeconds] = useState(30),
    [meters, setMeters] = useState(50),
    [fix, setFix] = useState<GpsFix | null>(null),
    [savedAt, setSavedAt] = useState('');
  const provider = useRef(new BrowserGeolocationProvider()),
    last = useRef<GpsFix | null>(null),
    busy = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    const p = provider.current;
    const invalidate = () => {
      generation.current++;
    };
    return () => {
      invalidate();
      p.stop();
    };
  }, []);
  function stop() {
    generation.current++;
    provider.current.stop();
    setTracking(false);
  }
  function start() {
    if (demo) {
      toast.info('El seguimiento real requiere una sesión conectada a Supabase.');
      return;
    }
    if (!vehicle) {
      toast.error('Selecciona una unidad.');
      return;
    }
    last.current = null;
    setTracking(true);
    const id = ++generation.current;
    provider.current.start(
      async (p) => {
        if (id !== generation.current) return;
        setFix(p);
        if (
          busy.current ||
          (last.current &&
            new Date(p.timestamp).getTime() - new Date(last.current.timestamp).getTime() <
              seconds * 1000 &&
            distance(last.current, p) < meters)
        )
          return;
        busy.current = true;
        try {
          const { error } = await db()
            .from('vehicle_locations')
            .insert({
              ...p,
              organization_id: profile?.organization_id,
              vehicle_id: vehicle,
              report_id: report || null,
              source: 'browser',
            });
          if (error) throw error;
          last.current = p;
          setSavedAt(p.timestamp);
          await refresh();
        } catch (e) {
          stop();
          toast.error(message(e));
        } finally {
          busy.current = false;
        }
      },
      (e) => {
        stop();
        toast.error(e.message);
      },
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="VISIBILIDAD Y UBICACIÓN"
        title="Mapa y seguimiento"
        description="Consulta la última posición y el recorrido de cada unidad."
      />
      <div className="map-workspace">
        <section className="panel map-controls">
          <h2>
            <Truck size={20} /> Seleccionar unidad
          </h2>
          <label>
            Vehículo
            <select
              value={vehicle}
              disabled={tracking}
              onChange={(e) => {
                setVehicle(e.target.value);
                setReport('');
              }}
            >
              <option value="">Toda la flota</option>
              {data.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.economic_number} · {v.plates}
                </option>
              ))}
            </select>
          </label>
          {profile?.role !== 'viewer' && (
            <>
              <label>
                Reporte asociado
                <select
                  value={report}
                  disabled={tracking}
                  onChange={(e) => setReport(e.target.value)}
                >
                  <option value="">Sin reporte</option>
                  {data.reports
                    .filter((r) => r.vehicle_id === vehicle)
                    .map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.folio}
                      </option>
                    ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Intervalo (s)
                  <input
                    type="number"
                    min={10}
                    max={3600}
                    value={seconds}
                    disabled={tracking}
                    onChange={(e) =>
                      setSeconds(Math.min(3600, Math.max(10, Number(e.target.value))))
                    }
                  />
                </label>
                <label>
                  Distancia (m)
                  <input
                    type="number"
                    min={10}
                    max={10000}
                    value={meters}
                    disabled={tracking}
                    onChange={(e) =>
                      setMeters(Math.min(10000, Math.max(10, Number(e.target.value))))
                    }
                  />
                </label>
              </div>
              <p className="help">
                Se guarda una posición cuando transcurra el intervalo o se recorra la distancia.
              </p>
              <div className="notice">
                Se registra la ubicación de <strong>este dispositivo</strong>. Activa el seguimiento
                solo si estás en la unidad seleccionada. La aplicación debe permanecer abierta.
              </div>
              <button
                className={'button full ' + (tracking ? 'danger' : 'primary')}
                onClick={tracking ? stop : start}
              >
                {tracking ? <Square size={17} /> : <LocateFixed size={17} />}{' '}
                {tracking ? 'Detener seguimiento' : 'Iniciar seguimiento'}
              </button>
            </>
          )}
          {fix && (
            <div className="fix-info">
              <strong>Posición del dispositivo</strong>
              <p>
                {fix.latitude.toFixed(6)}, {fix.longitude.toFixed(6)}
              </p>
              <p>Precisión: ±{Math.round(fix.accuracy)} m</p>
              <small>Lectura: {dateTime(fix.timestamp)}</small>
              <small>Guardada: {dateTime(savedAt)}</small>
            </div>
          )}
          <div className="location-list">
            {data.vehicle_locations
              .filter((l) => !vehicle || l.vehicle_id === vehicle)
              .slice(0, 8)
              .map((l) => (
                <div key={l.id}>
                  <MapPin size={16} />
                  <div>
                    <strong>
                      {data.vehicles.find((v) => v.id === l.vehicle_id)?.economic_number}
                    </strong>
                    <small>{dateTime(l.timestamp)}</small>
                  </div>
                </div>
              ))}
            {!data.vehicle_locations.length && <Empty title="Sin ubicaciones" />}
          </div>
        </section>
        <section className="panel map-full">
          <FleetMap vehicleId={vehicle || undefined} />
        </section>
      </div>
    </>
  );
}
