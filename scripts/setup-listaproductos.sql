-- Lista de productos para etiquetas (Inicio / Motos), separada de toma física.
-- Ejecutar en Supabase → SQL Editor si la búsqueda por código da error 404.

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
