-- Rutas de transferencia: origen matriz, varios destinos, fecha y chofer
-- Pegar en Supabase → SQL Editor → Run

create table if not exists public.ruta (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid not null references public.sucursal(id),
  fecha date not null,
  chofer text not null,
  created_at timestamptz not null default now()
);

create index if not exists ruta_origen_id_idx on public.ruta (origen_id);
create index if not exists ruta_fecha_idx on public.ruta (fecha desc);

create table if not exists public.ruta_destino (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.ruta(id) on delete cascade,
  sucursal_id uuid not null references public.sucursal(id),
  created_at timestamptz not null default now(),
  unique (ruta_id, sucursal_id)
);

create index if not exists ruta_destino_ruta_id_idx on public.ruta_destino (ruta_id);

alter table public.ruta enable row level security;
alter table public.ruta_destino enable row level security;

drop policy if exists "ruta_all_anon" on public.ruta;
create policy "ruta_all_anon" on public.ruta
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "ruta_destino_all_anon" on public.ruta_destino;
create policy "ruta_destino_all_anon" on public.ruta_destino
  for all to anon, authenticated using (true) with check (true);
