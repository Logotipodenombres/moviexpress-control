import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const pg = new PGlite();
const orgA = '10000000-0000-4000-8000-000000000001',
  orgB = '10000000-0000-4000-8000-000000000002';
const admin = '20000000-0000-4000-8000-000000000001',
  operator = '20000000-0000-4000-8000-000000000002',
  viewer = '20000000-0000-4000-8000-000000000003',
  other = '20000000-0000-4000-8000-000000000004';
const driverA = '30000000-0000-4000-8000-000000000001',
  driverB = '30000000-0000-4000-8000-000000000002';
const vehicleA = '40000000-0000-4000-8000-000000000001',
  vehicleB = '40000000-0000-4000-8000-000000000002';
async function as(user: string, sql: string) {
  await pg.exec(`reset role; set request.jwt.claim.sub='${user}';set role authenticated;`);
  return pg.query(sql);
}
beforeAll(async () => {
  await pg.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;create publication supabase_realtime;`,
  );
  const migration = readFileSync(resolve('supabase/migrations/001_core.sql'), 'utf8').replace(
    'create extension if not exists pgcrypto;',
    '',
  );
  await pg.exec(migration);
  await pg.exec(readFileSync(resolve('supabase/migrations/002_documents.sql'), 'utf8'));
  await pg.exec(
    `insert into auth.users values('${admin}'),('${operator}'),('${viewer}'),('${other}');insert into organizations(id,name) values('${orgA}','Empresa A'),('${orgB}','Empresa B');insert into profiles(id,organization_id,full_name,role) values('${admin}','${orgA}','Admin A','admin'),('${operator}','${orgA}','Operador A','operator'),('${viewer}','${orgA}','Consulta A','viewer'),('${other}','${orgB}','Admin B','admin');insert into drivers(id,organization_id,full_name,phone,license_number) values('${driverA}','${orgA}','Conductor A','0000000000','LIC-A'),('${driverB}','${orgB}','Conductor B','0000000000','LIC-B');insert into vehicles(id,organization_id,driver_id,economic_number,vehicle_type,brand,plates) values('${vehicleA}','${orgA}','${driverA}','A-1','Camión','Demo','DEM-A'),('${vehicleB}','${orgB}','${driverB}','B-1','Camión','Demo','DEM-B');`,
  );
}, 30000);
afterAll(async () => {
  await pg.close();
});
describe('Seguridad multiempresa y permisos SQL', () => {
  it('consulta solo ve conductores de su organización', async () => {
    const r = await as(viewer, 'select full_name from drivers');
    expect(r.rows).toEqual([{ full_name: 'Conductor A' }]);
  });
  it('consulta no puede insertar', async () => {
    await expect(
      as(
        viewer,
        `insert into drivers(organization_id,full_name,phone,license_number) values('${orgA}','Prueba','0000000000','X')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it('operador puede editar su empresa pero no puede cambiar roles', async () => {
    await as(operator, `update drivers set company='Empresa Demo' where id='${driverA}'`);
    const r = await as(
      operator,
      `update profiles set role='admin' where id='${operator}' returning id`,
    );
    expect(r.rows).toHaveLength(0);
  });
  it('operador no puede borrar', async () => {
    const r = await as(operator, `delete from drivers where id='${driverA}' returning id`);
    expect(r.rows).toHaveLength(0);
  });
  it('administrador no puede ver ni modificar otra empresa', async () => {
    const r = await as(
      admin,
      `update drivers set full_name='Ataque' where id='${driverB}' returning id`,
    );
    expect(r.rows).toHaveLength(0);
    expect((await as(admin, `select * from vehicles where id='${vehicleB}'`)).rows).toHaveLength(0);
  });
  it('bloquea claves foráneas entre empresas', async () => {
    await expect(
      as(operator, `update vehicles set driver_id='${driverB}' where id='${vehicleA}'`),
    ).rejects.toThrow(/foreign key/);
  });
  it('bloquea cambios de organización y autoascenso', async () => {
    await expect(
      as(admin, `update drivers set organization_id='${orgB}' where id='${driverA}'`),
    ).rejects.toThrow();
    await expect(
      as(admin, `update profiles set role='viewer' where id='${admin}'`),
    ).rejects.toThrow(/propio rol/);
  });
  it('genera folios únicos y audita cambios de estado', async () => {
    const insert = `insert into reports(organization_id,vehicle_id,state,incident_at,description,contact_name,contact_phone) values('${orgA}','${vehicleA}','Puebla',now(),'Incidente ficticio para pruebas','Contacto Demo','0000000000') returning id,folio`;
    const a = await as(operator, insert),
      b = await as(operator, insert);
    expect(a.rows[0].folio).not.toBe(b.rows[0].folio);
    await as(operator, `update reports set status='Cerrado' where id='${a.rows[0].id}'`);
    const log = await as(
      admin,
      `select action,details from audit_logs where entity_id='${a.rows[0].id}' and action='REPORT_STATUS_CHANGE'`,
    );
    expect(log.rows[0].details).toEqual({ previous_status: 'Activo', status: 'Cerrado' });
  });
  it('historial de posiciones es append-only', async () => {
    await as(
      operator,
      `insert into vehicle_locations(organization_id,vehicle_id,latitude,longitude) values('${orgA}','${vehicleA}',19.2,-99.1)`,
    );
    await expect(
      as(operator, `update vehicle_locations set latitude=0 where vehicle_id='${vehicleA}'`),
    ).rejects.toThrow();
    expect((await as(viewer, 'select * from vehicle_locations')).rows).toHaveLength(1);
  });
  it('consulta no puede subir fotos y nadie accede a fotos de otra organización', async () => {
    await expect(
      as(
        viewer,
        `insert into storage.objects(bucket_id,name) values('fleet-photos','${orgA}/photo.jpg')`,
      ),
    ).rejects.toThrow(/row-level security/);
    await as(
      operator,
      `insert into storage.objects(bucket_id,name) values('fleet-photos','${orgA}/photo.jpg')`,
    );
    expect((await as(other, 'select * from storage.objects')).rows).toHaveLength(0);
  });
  it('usuarios no pueden falsificar la bitácora', async () => {
    await expect(
      as(
        admin,
        `insert into audit_logs(organization_id,action,entity) values('${orgA}','FAKE','drivers')`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it('documentos privados conservan aislamiento y referencias de empresa', async () => {
    await as(
      operator,
      `insert into record_documents(organization_id,vehicle_id,name,path) values('${orgA}','${vehicleA}','Prueba.pdf','${orgA}/demo.pdf')`,
    );
    expect((await as(viewer, 'select * from record_documents')).rows).toHaveLength(1);
    expect((await as(other, 'select * from record_documents')).rows).toHaveLength(0);
    await expect(
      as(
        viewer,
        `insert into record_documents(organization_id,vehicle_id,name,path) values('${orgA}','${vehicleA}','Prueba.pdf','${orgA}/otro.pdf')`,
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(
        operator,
        `insert into record_documents(organization_id,vehicle_id,name,path) values('${orgA}','${vehicleB}','Prueba.pdf','${orgA}/otro.pdf')`,
      ),
    ).rejects.toThrow(/foreign key/);
  });
  it('desactivar usuario bloquea datos con sesión existente', async () => {
    await as(admin, `update profiles set active=false where id='${operator}'`);
    expect((await as(operator, 'select * from drivers')).rows).toHaveLength(0);
  });
});
