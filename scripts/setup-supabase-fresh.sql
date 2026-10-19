-- Instalación limpia para proyecto Supabase nuevo (qodeimcwrkehjclxpaaz)
-- Pegar en Supabase → SQL Editor → Run
-- Después ejecutar también scripts/setup-conteos-usuarios.sql.

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

create table if not exists public.sucursal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo text not null check (tipo in ('agencia', 'matriz')),
  created_at timestamptz not null default now(),
  unique (id, tipo)
);

alter table public.proyectos enable row level security;
alter table public.productos enable row level security;
alter table public.listaproductos enable row level security;
alter table public.motos enable row level security;

create policy "proyectos_all_anon" on public.proyectos for all to anon, authenticated using (true) with check (true);
create policy "productos_all_anon" on public.productos for all to anon, authenticated using (true) with check (true);
create policy "listaproductos_all_anon" on public.listaproductos for all to anon, authenticated using (true) with check (true);
create policy "motos_all_anon" on public.motos for all to anon, authenticated using (true) with check (true);
create table if not exists public.ruta (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid not null references public.sucursal(id) on delete restrict,
  origen_tipo text generated always as ('matriz') stored,
  fecha date not null,
  chofer text not null,
  transitorio boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ruta_pertenece_a_matriz_fk
    foreign key (origen_id, origen_tipo)
    references public.sucursal (id, tipo)
    on delete restrict
);
create unique index if not exists ruta_transitorio_por_matriz_idx
  on public.ruta (origen_id)
  where transitorio;

create table if not exists public.ruta_destino (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.ruta(id) on delete cascade,
  sucursal_id uuid not null references public.sucursal(id),
  created_at timestamptz not null default now(),
  unique (ruta_id, sucursal_id)
);

alter table public.sucursal enable row level security;
create policy "sucursal_all_anon" on public.sucursal for all to anon, authenticated using (true) with check (true);
alter table public.ruta enable row level security;
alter table public.ruta_destino enable row level security;
create policy "ruta_all_anon" on public.ruta for all to anon, authenticated using (true) with check (true);
create policy "ruta_destino_all_anon" on public.ruta_destino for all to anon, authenticated using (true) with check (true);

create table if not exists public.transferencia (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.ruta(id) on delete cascade,
  transferencia text not null,
  guia text not null,
  created_at timestamptz not null default now(),
  constraint transferencia_tiene_guia check (
    length(btrim(transferencia)) > 0
    and length(btrim(guia)) > 0
  )
);

alter table public.transferencia enable row level security;
create policy "transferencia_all_anon" on public.transferencia for all to anon, authenticated using (true) with check (true);

create table if not exists public.usuariostransferencias (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null unique references public.sucursal (id) on delete cascade,
  usuario text not null unique,
  clave text not null,
  tipo text not null check (tipo in ('agencia', 'matriz')),
  created_at timestamptz not null default now(),
  constraint usuariostransferencias_sucursal_tipo_fk
    foreign key (sucursal_id, tipo) references public.sucursal (id, tipo)
);
alter table public.usuariostransferencias enable row level security;
