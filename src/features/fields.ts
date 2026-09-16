import type { Entity } from '../types';
export interface Field {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  group: string;
  min?: number;
  max?: number;
}
const field = (
  group: string,
  key: string,
  label: string,
  type = 'text',
  required = false,
  options?: string[],
): Field => ({ group, key, label, type, required, options });
export const statuses = {
  drivers: ['Activo', 'Inactivo', 'Suspendido'],
  vehicles: ['Activo', 'Inactivo', 'Mantenimiento'],
  reports: ['Activo', 'En seguimiento', 'Localizado', 'Recuperado', 'Cerrado', 'Cancelado'],
};
export const vehicleTypes = [
  'Tractocamión',
  'Camión',
  'Rabón',
  'Torton',
  'Pickup',
  'Van',
  'Automóvil',
  'Remolque',
  'Semirremolque',
  'Otro',
];
export const fields: Record<Entity, Field[]> = {
  drivers: [
    field('Información personal', 'full_name', 'Nombre completo', 'text', true),
    field('Información personal', 'birth_date', 'Fecha de nacimiento', 'date'),
    field('Información personal', 'phone', 'Celular', 'tel', true),
    field('Información personal', 'alternate_phone', 'Teléfono alternativo', 'tel'),
    field('Información personal', 'email', 'Correo electrónico', 'email'),
    field('Información personal', 'state', 'Estado / entidad'),
    field('Información personal', 'municipality', 'Municipio'),
    field('Información laboral', 'company', 'Empresa'),
    field('Información laboral', 'employee_number', 'Número de empleado'),
    field('Información laboral', 'license_number', 'Número de licencia', 'text', true),
    field('Información laboral', 'license_type', 'Tipo de licencia'),
    field('Información laboral', 'license_expiry', 'Vigencia de licencia', 'date'),
    field('Contacto de emergencia', 'emergency_name', 'Nombre del contacto'),
    field('Contacto de emergencia', 'emergency_phone', 'Teléfono de emergencia', 'tel'),
    field('Información adicional', 'status', 'Estatus', 'select', true, statuses.drivers),
    field('Información adicional', 'notes', 'Observaciones', 'textarea'),
  ],
  vehicles: [
    field('Identificación', 'economic_number', 'Número económico', 'text', true),
    field('Identificación', 'vehicle_type', 'Tipo de vehículo', 'select', true, vehicleTypes),
    field('Identificación', 'brand', 'Marca', 'text', true),
    field('Identificación', 'subbrand', 'Submarca'),
    field('Identificación', 'model', 'Modelo'),
    { ...field('Identificación', 'year', 'Año', 'number'), min: 1900, max: 2100 },
    field('Identificación', 'color', 'Color'),
    field('Identificación', 'plates', 'Placas', 'text', true),
    field('Identificación', 'plate_state', 'Estado de las placas'),
    field('Identificación', 'vin', 'Número de serie / VIN'),
    field('Asignación', 'driver_id', 'Conductor asignado', 'driver'),
    field('Asignación', 'company', 'Empresa'),
    field('Asignación', 'owner_name', 'Propietario'),
    field('Asignación', 'owner_phone', 'Teléfono del propietario', 'tel'),
    field('Información adicional', 'cargo_type', 'Tipo de carga habitual'),
    field('Información adicional', 'features', 'Señas particulares', 'textarea'),
    field('Información adicional', 'status', 'Estatus', 'select', true, statuses.vehicles),
  ],
  reports: [
    field('Datos generales', 'vehicle_id', 'Vehículo', 'vehicle', true),
    field('Datos generales', 'status', 'Estatus', 'select', true, statuses.reports),
    field('Lugar del incidente', 'state', 'Estado / entidad', 'text', true),
    field('Lugar del incidente', 'municipality', 'Municipio'),
    field('Lugar del incidente', 'road', 'Carretera'),
    field('Lugar del incidente', 'kilometer', 'Kilómetro'),
    field('Lugar del incidente', 'reference', 'Referencia'),
    { ...field('Lugar del incidente', 'latitude', 'Latitud', 'number'), min: -90, max: 90 },
    { ...field('Lugar del incidente', 'longitude', 'Longitud', 'number'), min: -180, max: 180 },
    field(
      'Lugar del incidente',
      'last_location_at',
      'Hora de la última ubicación',
      'datetime-local',
    ),
    field('Incidente', 'incident_at', 'Fecha y hora del incidente', 'datetime-local', true),
    field('Incidente', 'assault_time', 'Hora del asalto', 'time'),
    field('Incidente', 'last_contact_at', 'Último contacto', 'datetime-local'),
    field('Incidente', 'description', 'Descripción de los hechos', 'textarea', true),
    field('Incidente', 'notes', 'Observaciones', 'textarea'),
    field('Carga', 'cargo_type', 'Tipo de carga'),
    field('Carga', 'cargo_description', 'Descripción de la carga', 'textarea'),
    { ...field('Carga', 'cargo_value', 'Valor aproximado (MXN)', 'number'), min: 0 },
    field('Carga', 'cargo_notes', 'Observaciones de carga', 'textarea'),
    field('Contacto', 'contact_name', 'Persona que reporta', 'text', true),
    field('Contacto', 'contact_phone', 'Teléfono', 'tel', true),
    field('Contacto', 'alternate_phone', 'Segundo teléfono', 'tel'),
    field('Denuncia', 'complaint_number', 'Número de denuncia'),
    field('Denuncia', 'precomplaint_number', 'Número de predenuncia'),
    field('Denuncia', 'institution', 'Institución'),
    field('Denuncia', 'complaint_at', 'Fecha y hora de denuncia', 'datetime-local'),
    field('Denuncia', 'complaint_notes', 'Observaciones de denuncia', 'textarea'),
  ],
};
export const entityNames: Record<Entity, { plural: string; single: string; description: string }> =
  {
    drivers: {
      plural: 'Conductores',
      single: 'conductor',
      description: 'Las personas que mantienen tu operación en movimiento.',
    },
    vehicles: {
      plural: 'Vehículos',
      single: 'vehículo',
      description: 'Identifica, consulta y administra cada unidad de tu flota.',
    },
    reports: {
      plural: 'Reportes',
      single: 'reporte',
      description: 'Información clara para responder y dar seguimiento.',
    },
  };
