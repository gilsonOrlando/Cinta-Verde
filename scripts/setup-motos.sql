-- Tabla de motos registradas desde el menú Motos
-- Pegar en Supabase → SQL Editor → Run

create table if not exists public.motos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  producto text not null,
  chasis text not null,
  motor text not null,
  cam_cpm_ramw text not null,
  link_mega text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists motos_chasis_unique
  on public.motos (chasis);

create index if not exists motos_codigo_idx on public.motos (codigo);
create index if not exists motos_created_at_idx on public.motos (created_at desc);

alter table public.motos enable row level security;

drop policy if exists "motos_all_anon" on public.motos;
create policy "motos_all_anon" on public.motos
  for all to anon, authenticated using (true) with check (true);

-- Migración si la tabla ya existía con columnas antiguas
alter table public.motos drop column if exists agencia;
alter table public.motos drop column if exists transferencia_numero;
alter table public.motos drop column if exists bodega_origen;
alter table public.motos drop column if exists bodega_destino;
