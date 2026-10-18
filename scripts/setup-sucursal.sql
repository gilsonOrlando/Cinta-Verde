-- Actores de transferencias entre bodegas
-- Pegar en Supabase → SQL Editor → Run

create table if not exists public.sucursal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo text not null check (tipo in ('agencia', 'matriz')),
  created_at timestamptz not null default now()
);

create index if not exists sucursal_tipo_idx on public.sucursal (tipo);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sucursal_nombre_key'
  ) then
    alter table public.sucursal add constraint sucursal_nombre_key unique (nombre);
  end if;
end $$;

alter table public.sucursal enable row level security;

drop policy if exists "sucursal_all_anon" on public.sucursal;
create policy "sucursal_all_anon" on public.sucursal
  for all to anon, authenticated using (true) with check (true);
