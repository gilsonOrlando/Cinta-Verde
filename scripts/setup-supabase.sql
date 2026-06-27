-- Proyectos de toma física (cada lista Excel pertenece a un proyecto)
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_archivo text,
  created_at timestamptz not null default now()
);

alter table public.proyectos add column if not exists codigo_acceso text;

update public.proyectos
set codigo_acceso = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where codigo_acceso is null;

create unique index if not exists proyectos_codigo_acceso_unique
  on public.proyectos (codigo_acceso);

alter table public.proyectos alter column codigo_acceso set not null;
-- Productos: solo columnas extraídas del Excel + relación al proyecto
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.productos add column if not exists proyecto_id uuid references public.proyectos(id) on delete cascade;
alter table public.productos add column if not exists codigo text;
alter table public.productos add column if not exists producto text;
alter table public.productos add column if not exists cantidad_sistema text;
alter table public.productos add column if not exists cantidad_toma_fisica text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'productos'
      and column_name = 'nombre'
  ) then
    update public.productos
    set producto = nombre
    where producto is null and nombre is not null;

    alter table public.productos drop column nombre;
  end if;
end $$;

alter table public.productos drop column if exists stock;
alter table public.productos drop column if exists precio;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'productos'
      and column_name = 'cantidad_sistema'
      and data_type = 'numeric'
  ) then
    alter table public.productos
      alter column cantidad_sistema type text
      using replace(cantidad_sistema::text, '.', ',');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'productos'
      and column_name = 'cantidad_toma_fisica'
      and data_type = 'numeric'
  ) then
    alter table public.productos
      alter column cantidad_toma_fisica type text
      using replace(cantidad_toma_fisica::text, '.', ',');
  end if;
end $$;

delete from public.productos where proyecto_id is null;

alter table public.productos alter column proyecto_id set not null;
alter table public.productos alter column codigo set not null;
alter table public.productos alter column producto set not null;
alter table public.productos alter column cantidad_sistema set not null;
alter table public.productos alter column cantidad_toma_fisica set not null;

create index if not exists productos_proyecto_id_idx on public.productos (proyecto_id);
create unique index if not exists productos_proyecto_codigo_unique
  on public.productos (proyecto_id, codigo);

alter table public.productos enable row level security;
alter table public.proyectos enable row level security;

drop policy if exists "productos_select_anon" on public.productos;
drop policy if exists "productos_insert_anon" on public.productos;
drop policy if exists "productos_update_anon" on public.productos;
drop policy if exists "productos_delete_anon" on public.productos;

create policy "productos_select_anon"
  on public.productos for select
  to anon, authenticated
  using (true);

create policy "productos_insert_anon"
  on public.productos for insert
  to anon, authenticated
  with check (true);

create policy "productos_update_anon"
  on public.productos for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "productos_delete_anon"
  on public.productos for delete
  to anon, authenticated
  using (true);

drop policy if exists "proyectos_select_anon" on public.proyectos;
drop policy if exists "proyectos_insert_anon" on public.proyectos;
drop policy if exists "proyectos_update_anon" on public.proyectos;
drop policy if exists "proyectos_delete_anon" on public.proyectos;

create policy "proyectos_select_anon"
  on public.proyectos for select
  to anon, authenticated
  using (true);

create policy "proyectos_insert_anon"
  on public.proyectos for insert
  to anon, authenticated
  with check (true);

create policy "proyectos_update_anon"
  on public.proyectos for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "proyectos_delete_anon"
  on public.proyectos for delete
  to anon, authenticated
  using (true);

-- Lista de productos para etiquetas (Inicio / Motos), separada de toma física
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

alter table public.listaproductos enable row level security;

drop policy if exists "listaproductos_select_anon" on public.listaproductos;
drop policy if exists "listaproductos_insert_anon" on public.listaproductos;
drop policy if exists "listaproductos_update_anon" on public.listaproductos;
drop policy if exists "listaproductos_delete_anon" on public.listaproductos;

create policy "listaproductos_select_anon"
  on public.listaproductos for select
  to anon, authenticated
  using (true);

create policy "listaproductos_insert_anon"
  on public.listaproductos for insert
  to anon, authenticated
  with check (true);

create policy "listaproductos_update_anon"
  on public.listaproductos for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "listaproductos_delete_anon"
  on public.listaproductos for delete
  to anon, authenticated
  using (true);
