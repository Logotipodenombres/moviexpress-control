begin;
create table public.record_documents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 driver_id uuid, vehicle_id uuid, report_id uuid,
 name text not null check(length(name) between 1 and 200), path text not null check(split_part(path,'/',1)=organization_id::text),
 created_at timestamptz not null default now(),
 check(num_nonnulls(driver_id,vehicle_id,report_id)=1),
 foreign key(driver_id,organization_id) references public.drivers(id,organization_id) on delete cascade,
 foreign key(vehicle_id,organization_id) references public.vehicles(id,organization_id) on delete cascade,
 foreign key(report_id,organization_id) references public.reports(id,organization_id) on delete cascade
);
alter table public.record_documents enable row level security;
create index on public.record_documents(organization_id);
create policy documents_read on public.record_documents for select to authenticated using(organization_id=public.my_org());
create policy documents_insert on public.record_documents for insert to authenticated with check(organization_id=public.my_org() and public.can_write());
create policy documents_delete on public.record_documents for delete to authenticated using(organization_id=public.my_org() and public.is_admin());
revoke all on public.record_documents from anon,authenticated;
grant select,insert,delete on public.record_documents to authenticated;
create trigger document_audit after insert or delete on public.record_documents for each row execute function public.audit_record();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('fleet-documents','fleet-documents',false,10485760,array['application/pdf']);
create policy document_file_read on storage.objects for select to authenticated using(bucket_id='fleet-documents' and (storage.foldername(name))[1]=public.my_org()::text);
create policy document_file_upload on storage.objects for insert to authenticated with check(bucket_id='fleet-documents' and (storage.foldername(name))[1]=public.my_org()::text and public.can_write());
create policy document_file_delete on storage.objects for delete to authenticated using(bucket_id='fleet-documents' and (storage.foldername(name))[1]=public.my_org()::text and public.is_admin());
commit;
