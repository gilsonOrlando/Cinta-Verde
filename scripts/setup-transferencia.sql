-- Transferencias de una ruta: cada registro tiene PDF transferencia y PDF guía (1:1).
-- Una ruta puede tener varias transferencias (1:N).
-- Pegar en Supabase → SQL Editor → Run

create table if not exists public.transferencia (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.ruta(id) on delete cascade,
  origen_id uuid references public.sucursal(id),
  sucursal_id uuid references public.sucursal(id),
  transferencia text not null,
  guia text not null,
  created_at timestamptz not null default now(),
  constraint transferencia_tiene_guia check (
    length(btrim(transferencia)) > 0
    and length(btrim(guia)) > 0
  )
);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transferencia'
      and column_name = 'origen_id'
  ) then
    alter table public.transferencia
      add column origen_id uuid references public.sucursal(id);
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transferencia'
      and column_name = 'sucursal_id'
  ) then
    alter table public.transferencia
      add column sucursal_id uuid references public.sucursal(id);
  end if;
end $$;

create index if not exists transferencia_ruta_id_idx on public.transferencia (ruta_id);
create index if not exists transferencia_origen_id_idx on public.transferencia (origen_id);
create index if not exists transferencia_sucursal_id_idx on public.transferencia (sucursal_id);

comment on table public.transferencia is
  'Transferencia de una ruta. Cada transferencia tiene obligatoriamente su guía.';
comment on column public.transferencia.ruta_id is
  'Ruta dueña. Una ruta puede tener varias transferencias.';
comment on column public.transferencia.origen_id is
  'Sucursal de la sesión que carga la transferencia (agencia origen).';
comment on column public.transferencia.sucursal_id is
  'Sucursal seleccionada como destino. Distinta de la sucursal logueada.';
comment on column public.transferencia.transferencia is
  'Ruta del PDF de transferencia en Storage.';
comment on column public.transferencia.guia is
  'Ruta del PDF de guía en Storage. Pertenece a la misma transferencia.';

alter table public.transferencia enable row level security;

drop policy if exists "transferencia_all_anon" on public.transferencia;
create policy "transferencia_all_anon" on public.transferencia
  for all to anon, authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transferencias',
  'transferencias',
  true,
  5242880,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "transferencias_storage_select" on storage.objects;
create policy "transferencias_storage_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'transferencias');

drop policy if exists "transferencias_storage_insert" on storage.objects;
create policy "transferencias_storage_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'transferencias');

drop policy if exists "transferencias_storage_update" on storage.objects;
create policy "transferencias_storage_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'transferencias')
  with check (bucket_id = 'transferencias');

drop policy if exists "transferencias_storage_delete" on storage.objects;
create policy "transferencias_storage_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'transferencias');
