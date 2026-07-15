-- Conteo de toma física separado por usuario.
-- Este esquema coincide con la app Flutter.
-- Ejecutar en Supabase SQL Editor después de crear proyectos y productos.

create extension if not exists pgcrypto;

create table if not exists public.usuarios_toma_fisica (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 2 and 80),
  nombre_normalizado text generated always as (lower(btrim(nombre))) stored,
  created_at timestamptz not null default now(),
  unique (proyecto_id, nombre_normalizado)
);

create table if not exists public.conteos_usuario (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios_toma_fisica(id) on delete cascade,
  cantidad numeric(14, 2) not null default 0 check (cantidad >= 0),
  updated_at timestamptz not null default now(),
  unique (producto_id, usuario_id)
);

create index if not exists idx_usuarios_toma_fisica_proyecto
  on public.usuarios_toma_fisica (proyecto_id);
create index if not exists idx_conteos_usuario_proyecto
  on public.conteos_usuario (proyecto_id);
create index if not exists idx_conteos_usuario_producto
  on public.conteos_usuario (producto_id);

alter table public.usuarios_toma_fisica enable row level security;
alter table public.conteos_usuario enable row level security;

drop policy if exists "Lectura publica usuarios toma fisica"
  on public.usuarios_toma_fisica;
create policy "Lectura publica usuarios toma fisica"
  on public.usuarios_toma_fisica for select
  to anon, authenticated
  using (true);

drop policy if exists "Lectura publica conteos usuario"
  on public.conteos_usuario;
create policy "Lectura publica conteos usuario"
  on public.conteos_usuario for select
  to anon, authenticated
  using (true);

create or replace function public.registrar_usuario_toma_fisica(
  p_proyecto_id uuid,
  p_nombre text
)
returns setof public.usuarios_toma_fisica
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.proyectos where id = p_proyecto_id
  ) then
    raise exception 'Proyecto no encontrado';
  end if;

  if char_length(btrim(coalesce(p_nombre, ''))) < 2 then
    raise exception 'El nombre debe tener al menos 2 caracteres';
  end if;

  return query
  insert into public.usuarios_toma_fisica (proyecto_id, nombre)
  values (p_proyecto_id, btrim(p_nombre))
  on conflict (proyecto_id, nombre_normalizado)
  do update set nombre = excluded.nombre
  returning *;
end;
$$;

create or replace function public.establecer_conteo_usuario(
  p_producto_id uuid,
  p_usuario_id uuid,
  p_cantidad numeric
)
returns setof public.productos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proyecto_id uuid;
  v_total numeric(14, 2);
begin
  if coalesce(p_cantidad, -1) < 0 then
    raise exception 'La cantidad no puede ser negativa';
  end if;

  select proyecto_id into v_proyecto_id
  from public.productos
  where id = p_producto_id
  for update;

  if v_proyecto_id is null then
    raise exception 'Producto no encontrado';
  end if;

  if not exists (
    select 1
    from public.usuarios_toma_fisica
    where id = p_usuario_id and proyecto_id = v_proyecto_id
  ) then
    raise exception 'El usuario no pertenece a este proyecto';
  end if;

  insert into public.conteos_usuario (
    proyecto_id, producto_id, usuario_id, cantidad, updated_at
  )
  values (
    v_proyecto_id, p_producto_id, p_usuario_id, p_cantidad, now()
  )
  on conflict (producto_id, usuario_id)
  do update set cantidad = excluded.cantidad, updated_at = now();

  select coalesce(sum(cantidad), 0)
  into v_total
  from public.conteos_usuario
  where producto_id = p_producto_id;

  return query
  update public.productos
  set cantidad_toma_fisica =
    replace(to_char(v_total, 'FM999999999990.00'), '.', ',')
  where id = p_producto_id
  returning *;
end;
$$;

create or replace function public.ajustar_conteo_usuario(
  p_producto_id uuid,
  p_usuario_id uuid,
  p_delta numeric
)
returns setof public.productos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proyecto_id uuid;
  v_actual numeric(14, 2);
begin
  select proyecto_id into v_proyecto_id
  from public.productos
  where id = p_producto_id
  for update;

  if v_proyecto_id is null then
    raise exception 'Producto no encontrado';
  end if;

  if not exists (
    select 1
    from public.usuarios_toma_fisica
    where id = p_usuario_id and proyecto_id = v_proyecto_id
  ) then
    raise exception 'El usuario no pertenece a este proyecto';
  end if;

  select coalesce(cantidad, 0)
  into v_actual
  from public.conteos_usuario
  where producto_id = p_producto_id and usuario_id = p_usuario_id;

  v_actual := coalesce(v_actual, 0) + coalesce(p_delta, 0);
  if v_actual < 0 then
    raise exception 'La cantidad del usuario ya está en 0';
  end if;

  return query
  select *
  from public.establecer_conteo_usuario(
    p_producto_id, p_usuario_id, v_actual
  );
end;
$$;

grant execute on function public.registrar_usuario_toma_fisica(uuid, text)
  to anon, authenticated;
grant execute on function public.establecer_conteo_usuario(uuid, uuid, numeric)
  to anon, authenticated;
grant execute on function public.ajustar_conteo_usuario(uuid, uuid, numeric)
  to anon, authenticated;
grant select on public.usuarios_toma_fisica to anon, authenticated;
grant select on public.conteos_usuario to anon, authenticated;

-- Conserva cantidades existentes como una columna "Conteo previo".
insert into public.usuarios_toma_fisica (proyecto_id, nombre)
select distinct p.proyecto_id, 'Conteo previo'
from public.productos p
where coalesce(nullif(btrim(p.cantidad_toma_fisica), ''), '0,00')
      not in ('0', '0,0', '0,00', '0.0', '0.00')
on conflict (proyecto_id, nombre_normalizado) do nothing;

insert into public.conteos_usuario (
  proyecto_id, producto_id, usuario_id, cantidad
)
select
  p.proyecto_id,
  p.id,
  u.id,
  replace(p.cantidad_toma_fisica, ',', '.')::numeric
from public.productos p
join public.usuarios_toma_fisica u
  on u.proyecto_id = p.proyecto_id
 and u.nombre_normalizado = 'conteo previo'
where coalesce(nullif(btrim(p.cantidad_toma_fisica), ''), '0,00')
      not in ('0', '0,0', '0,00', '0.0', '0.00')
on conflict (producto_id, usuario_id) do nothing;
