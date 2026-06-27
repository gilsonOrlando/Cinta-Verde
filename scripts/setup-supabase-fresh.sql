-- Instalación limpia para proyecto Supabase nuevo (qodeimcwrkehjclxpaaz)
-- Pegar en Supabase → SQL Editor → Run

create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_archivo text,
  codigo_acceso text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists proyectos_codigo_acceso_unique
  on public.proyectos (codigo_acceso);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  codigo text not null,
  producto text not null,
  cantidad_sistema text not null,
  cantidad_toma_fisica text not null,
  created_at timestamptz not null default now()
);

create index if not exists productos_proyecto_id_idx on public.productos (proyecto_id);
create unique index if not exists productos_proyecto_codigo_unique
  on public.productos (proyecto_id, codigo);

create table if not exists public.listaproductos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  producto text not null,
  cantidad text not null default '1',
  created_at timestamptz not null default now()
);

create unique index if not exists listaproductos_codigo_unique
  on public.listaproductos (codigo);

create index if not exists listaproductos_producto_idx
  on public.listaproductos (producto);

alter table public.proyectos enable row level security;
alter table public.productos enable row level security;
alter table public.listaproductos enable row level security;

create policy "proyectos_all_anon" on public.proyectos for all to anon, authenticated using (true) with check (true);
create policy "productos_all_anon" on public.productos for all to anon, authenticated using (true) with check (true);
create policy "listaproductos_all_anon" on public.listaproductos for all to anon, authenticated using (true) with check (true);
