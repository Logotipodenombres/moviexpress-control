-- Moviexpress. Ejecutar en un proyecto Supabase nuevo, una sola vez.
begin;
create extension if not exists pgcrypto;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 160),
 privacy_notice text, terms text, data_controller text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.roles (code text primary key, label text not null, can_write boolean not null default false, can_admin boolean not null default false);
insert into public.roles values ('admin','Administrador',true,true),('operator','Operador',true,false),('viewer','Consulta',false,false);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 organization_id uuid not null references public.organizations(id), full_name text not null check(length(full_name) between 2 and 160),
 role text not null references public.roles(code), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id)
);
create function public.my_org() returns uuid language sql stable security definer set search_path='' as $$ select organization_id from public.profiles where id=auth.uid() and active $$;
create function public.can_write() returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select r.can_write from public.profiles p join public.roles r on r.code=p.role where p.id=auth.uid() and p.active),false) $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select r.can_admin from public.profiles p join public.roles r on r.code=p.role where p.id=auth.uid() and p.active),false) $$;
revoke all on function public.my_org(),public.can_write(),public.is_admin() from public;
grant execute on function public.my_org(),public.can_write(),public.is_admin() to authenticated;
create table public.vehicle_types (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null check(length(name) between 2 and 60), created_at timestamptz not null default now(),updated_at timestamptz not null default now(), unique(organization_id,name));
create table public.drivers (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 full_name text not null check(length(full_name) between 2 and 160), birth_date date check(birth_date<=current_date and birth_date>='1900-01-01'),
 phone text not null check(phone~'^\+?[0-9 ()-]{7,20}$'), alternate_phone text check(alternate_phone~'^\+?[0-9 ()-]{7,20}$'),
 email text check(email~'^[^\s@]+@[^\s@]+\.[^\s@]+$'), state text, municipality text, company text, employee_number text,
 license_number text not null check(length(license_number) between 2 and 80), license_type text, license_expiry date,
 emergency_name text, emergency_phone text check(emergency_phone~'^\+?[0-9 ()-]{7,20}$'), notes text,
 photo_path text, status text not null default 'Activo' check(status in ('Activo','Inactivo','Suspendido')), archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id), unique(organization_id,license_number),
 check(photo_path is null or split_part(photo_path,'/',1)=organization_id::text)
);
create table public.vehicles (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), driver_id uuid,
 economic_number text not null check(length(economic_number) between 1 and 40), vehicle_type text not null,
 brand text not null check(length(brand)>0), subbrand text, model text, year integer check(year between 1900 and 2100), color text,
 plates text not null check(plates~'^[A-Z0-9 -]{3,20}$'), plate_state text, vin text check(length(vin) between 8 and 25), features text,
 cargo_type text, owner_name text, owner_phone text check(owner_phone~'^\+?[0-9 ()-]{7,20}$'), company text, photo_path text,
 status text not null default 'Activo' check(status in ('Activo','Inactivo','Mantenimiento')), archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id),
 unique(organization_id,plates),unique(organization_id,economic_number),
 foreign key(driver_id,organization_id) references public.drivers(id,organization_id) on delete restrict,
 check(photo_path is null or split_part(photo_path,'/',1)=organization_id::text)
);
create sequence public.report_folio_seq;
create table public.reports (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), folio text not null unique,
 created_by uuid not null default auth.uid() references auth.users(id), vehicle_id uuid not null,
 status text not null default 'Activo' check(status in ('Activo','En seguimiento','Localizado','Recuperado','Cerrado','Cancelado')),
 state text not null check(length(state)>0), municipality text, road text, kilometer text, reference text,
 latitude double precision check(latitude between -90 and 90), longitude double precision check(longitude between -180 and 180),
 last_location_at timestamptz, incident_at timestamptz not null, assault_time time, last_contact_at timestamptz,
 description text not null check(length(description) between 10 and 20000),notes text,
 cargo_type text, cargo_description text,cargo_value numeric(16,2) check(cargo_value>=0),cargo_notes text,
 contact_name text not null check(length(contact_name)>1),contact_phone text not null check(contact_phone~'^\+?[0-9 ()-]{7,20}$'),alternate_phone text check(alternate_phone~'^\+?[0-9 ()-]{7,20}$'),
 complaint_number text, precomplaint_number text, institution text, complaint_at timestamptz, complaint_notes text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,organization_id), unique(id,vehicle_id,organization_id),
 foreign key(vehicle_id,organization_id) references public.vehicles(id,organization_id) on delete restrict,
 check((latitude is null)=(longitude is null))
);
create function public.assign_folio() returns trigger language plpgsql security definer set search_path='' as $$declare n text;begin
 n:=nextval('public.report_folio_seq')::text;
 new.folio:='REP-'||extract(year from now())::text||'-'||lpad(n,greatest(6,length(n)),'0');
 new.created_by:=auth.uid(); return new; end$$;
create trigger report_folio before insert on public.reports for each row execute function public.assign_folio();
create table public.vehicle_photos (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), vehicle_id uuid not null,
 path text not null check(split_part(path,'/',1)=organization_id::text),created_at timestamptz not null default now(),
 foreign key(vehicle_id,organization_id) references public.vehicles(id,organization_id) on delete cascade
);
create table public.vehicle_locations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),vehicle_id uuid not null,report_id uuid,
 latitude double precision not null check(latitude between -90 and 90),longitude double precision not null check(longitude between -180 and 180),
 accuracy double precision check(accuracy>=0),speed double precision check(speed>=0),heading double precision check(heading>=0 and heading<360),
 timestamp timestamptz not null default now(),source text not null default 'browser' check(length(source) between 1 and 60),created_at timestamptz not null default now(),
 foreign key(vehicle_id,organization_id) references public.vehicles(id,organization_id) on delete restrict,
 foreign key(report_id,vehicle_id,organization_id) references public.reports(id,vehicle_id,organization_id) on delete restrict
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),actor_id uuid,
 action text not null,entity text not null,entity_id uuid,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
create function public.guard_record() returns trigger language plpgsql set search_path='' as $$begin
 if new.id is distinct from old.id or new.organization_id is distinct from old.organization_id or new.created_at is distinct from old.created_at then raise exception 'Los identificadores, la organización y la fecha de creación son inmutables';end if;
 if tg_table_name='reports' then if new.folio is distinct from old.folio or new.created_by is distinct from old.created_by then raise exception 'El folio y autor son inmutables';end if;end if;
 if tg_table_name='profiles' and old.id=auth.uid() then if new.role is distinct from old.role or new.active is distinct from old.active then raise exception 'No puedes cambiar tu propio rol o desactivar tu acceso';end if;end if;
 new.updated_at:=now();return new;end$$;
create function public.audit_record() returns trigger language plpgsql security definer set search_path='' as $$declare row_data jsonb;act text;summary jsonb:='{}';begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;act:=case when tg_op='INSERT' then 'CREATE' else tg_op end;
 if tg_table_name='vehicle_locations' then act:='LOCATION_UPDATE';end if;
 if tg_table_name='reports' and tg_op='UPDATE' then if old.status is distinct from new.status then act:='REPORT_STATUS_CHANGE';summary:=jsonb_build_object('previous_status',old.status,'status',new.status);end if;end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity,entity_id,details) values((row_data->>'organization_id')::uuid,auth.uid(),act,tg_table_name,(row_data->>'id')::uuid,summary);
 return coalesce(new,old);end$$;
create function public.record_login() returns void language plpgsql security definer set search_path='' as $$begin
 if public.my_org() is null then raise exception 'Perfil no autorizado';end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity,entity_id) values(public.my_org(),auth.uid(),'LOGIN','profiles',auth.uid());end$$;
revoke all on function public.record_login() from public;grant execute on function public.record_login() to authenticated;
do $$declare t text;begin
 foreach t in array array['profiles','drivers','vehicles','reports','vehicle_types'] loop
 execute format('create trigger guard_record before update on public.%I for each row execute function public.guard_record()',t);
 end loop;
 foreach t in array array['profiles','drivers','vehicles','reports','vehicle_locations','vehicle_photos','vehicle_types'] loop
 execute format('create trigger audit_record after insert or update or delete on public.%I for each row execute function public.audit_record()',t);
 end loop;
 foreach t in array array['organizations','profiles','roles','drivers','vehicles','reports','vehicle_photos','vehicle_locations','audit_logs','vehicle_types'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 end loop;
 foreach t in array array['drivers','vehicles','reports','vehicle_photos','vehicle_types'] loop
 execute format('create index on public.%I (organization_id)',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using(organization_id=public.my_org())',t);
 execute format('create policy tenant_insert on public.%I for insert to authenticated with check(organization_id=public.my_org() and public.can_write())',t);
 execute format('create policy tenant_update on public.%I for update to authenticated using(organization_id=public.my_org() and public.can_write()) with check(organization_id=public.my_org() and public.can_write())',t);
 execute format('create policy tenant_delete on public.%I for delete to authenticated using(organization_id=public.my_org() and public.is_admin())',t);
 end loop;
end$$;
create policy location_read on public.vehicle_locations for select to authenticated using(organization_id=public.my_org());
create policy location_append on public.vehicle_locations for insert to authenticated with check(organization_id=public.my_org() and public.can_write());
-- Historial GPS append-only: ni operadores ni administradores sobrescriben posiciones.
create policy location_delete on public.vehicle_locations for delete to authenticated using(organization_id=public.my_org() and public.is_admin());
create policy org_read on public.organizations for select to authenticated using(id=public.my_org());
create policy org_update on public.organizations for update to authenticated using(id=public.my_org() and public.is_admin()) with check(id=public.my_org() and public.is_admin());
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or (organization_id=public.my_org() and public.is_admin()));
create policy profile_update on public.profiles for update to authenticated using(organization_id=public.my_org() and public.is_admin()) with check(organization_id=public.my_org() and public.is_admin());
-- Crear perfiles exclusivamente desde Edge Function / consola de administración.
create policy roles_read on public.roles for select to authenticated using(public.my_org() is not null);
create policy audit_read on public.audit_logs for select to authenticated using(organization_id=public.my_org() and public.is_admin());
revoke all on public.audit_logs from authenticated;grant select on public.audit_logs to authenticated;
grant select,update on public.organizations to authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.roles to authenticated;
grant select,insert,update,delete on public.drivers,public.vehicles,public.reports,public.vehicle_photos,public.vehicle_types to authenticated;
grant select,insert,delete on public.vehicle_locations to authenticated;
revoke all on sequence public.report_folio_seq from public,anon,authenticated;
create index on public.profiles(organization_id);
create index on public.drivers(organization_id,full_name);
create index on public.vehicles(organization_id,driver_id);
create index on public.reports(organization_id,status,created_at desc);
create index on public.reports(organization_id,vehicle_id);
create index on public.vehicle_locations(organization_id,vehicle_id,timestamp desc);
create index on public.vehicle_locations(organization_id,report_id);
create index on public.audit_logs(organization_id,created_at desc);
create view public.latest_locations with(security_invoker=true) as select distinct on(vehicle_id) * from public.vehicle_locations order by vehicle_id,timestamp desc;
grant select on public.latest_locations to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('fleet-photos','fleet-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy private_photo_read on storage.objects for select to authenticated using(bucket_id='fleet-photos' and (storage.foldername(name))[1]=public.my_org()::text);
create policy private_photo_upload on storage.objects for insert to authenticated with check(bucket_id='fleet-photos' and (storage.foldername(name))[1]=public.my_org()::text and public.can_write());
create policy private_photo_delete on storage.objects for delete to authenticated using(bucket_id='fleet-photos' and (storage.foldername(name))[1]=public.my_org()::text and public.is_admin());
-- Objetos inmutables: reemplazar foto crea una nueva ruta. No hay UPDATE de Storage.
do $$declare t text;begin
 foreach t in array array['drivers','vehicles','reports','vehicle_locations','vehicle_photos'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
 end loop;
end$$;
commit;
