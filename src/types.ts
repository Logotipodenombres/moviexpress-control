export type Role = 'admin' | 'operator' | 'viewer';
export interface Organization {
  id: string;
  name: string;
  privacy_notice: string | null;
  terms: string | null;
  data_controller: string | null;
}
export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  role: Role;
  active: boolean;
  created_at: string;
}
export interface BaseRecord {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}
export interface Driver extends BaseRecord {
  full_name: string;
  birth_date: string | null;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  state: string | null;
  municipality: string | null;
  company: string | null;
  employee_number: string | null;
  license_number: string;
  license_type: string | null;
  license_expiry: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  notes: string | null;
  photo_path: string | null;
  status: string;
  archived: boolean;
}
export interface Vehicle extends BaseRecord {
  driver_id: string | null;
  economic_number: string;
  vehicle_type: string;
  brand: string;
  subbrand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  plates: string;
  plate_state: string | null;
  vin: string | null;
  features: string | null;
  cargo_type: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  company: string | null;
  photo_path: string | null;
  status: string;
  archived: boolean;
}
export interface Report extends BaseRecord {
  folio: string;
  created_by: string;
  status: string;
  vehicle_id: string;
  state: string;
  municipality: string | null;
  road: string | null;
  kilometer: string | null;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
  last_location_at: string | null;
  incident_at: string;
  assault_time: string | null;
  last_contact_at: string | null;
  description: string;
  notes: string | null;
  cargo_type: string | null;
  cargo_description: string | null;
  cargo_value: number | null;
  cargo_notes: string | null;
  contact_name: string;
  contact_phone: string;
  alternate_phone: string | null;
  complaint_number: string | null;
  precomplaint_number: string | null;
  institution: string | null;
  complaint_at: string | null;
  complaint_notes: string | null;
}
export interface VehicleLocation {
  id: string;
  organization_id: string;
  vehicle_id: string;
  report_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
  source: string;
  created_at: string;
}
export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
export interface VehiclePhoto {
  id: string;
  organization_id: string;
  vehicle_id: string;
  path: string;
  created_at: string;
}
export type Entity = 'drivers' | 'vehicles' | 'reports';
export type EntityRecord = Driver | Vehicle | Report;
export interface DataSet {
  drivers: Driver[];
  vehicles: Vehicle[];
  reports: Report[];
  vehicle_locations: VehicleLocation[];
  audit_logs: AuditLog[];
  profiles: Profile[];
  vehicle_photos: VehiclePhoto[];
}
