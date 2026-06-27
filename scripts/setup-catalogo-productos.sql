-- Ejecutar en Supabase → SQL Editor si la búsqueda por código da error 404.
-- Catálogo global de productos para etiquetas (Inicio / Motos)

create table if not exists public.catalogo_productos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  producto text not null,
  cantidad text not null default '1',
  created_at timestamptz not null default now()
);

create unique index if not exists catalogo_productos_codigo_unique
  on public.catalogo_productos (codigo);

create index if not exists catalogo_productos_producto_idx
  on public.catalogo_productos (producto);

alter table public.catalogo_productos enable row level security;

drop policy if exists "catalogo_productos_select_anon" on public.catalogo_productos;
drop policy if exists "catalogo_productos_insert_anon" on public.catalogo_productos;
drop policy if exists "catalogo_productos_update_anon" on public.catalogo_productos;
drop policy if exists "catalogo_productos_delete_anon" on public.catalogo_productos;

create policy "catalogo_productos_select_anon"
  on public.catalogo_productos for select
  to anon, authenticated
  using (true);

create policy "catalogo_productos_insert_anon"
  on public.catalogo_productos for insert
  to anon, authenticated
  with check (true);

create policy "catalogo_productos_update_anon"
  on public.catalogo_productos for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "catalogo_productos_delete_anon"
  on public.catalogo_productos for delete
  to anon, authenticated
  using (true);
