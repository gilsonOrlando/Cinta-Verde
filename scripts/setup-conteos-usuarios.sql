-- Conteo de toma física separado por usuario.
-- Ejecutar en Supabase SQL Editor después de crear proyectos y productos.

create table if not exists public.usuarios_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 2 and 80),
  created_at timestamptz not null default now()
);

create unique index if not exists usuarios_proyecto_nombre_unique
  on public.usuarios_proyecto (proyecto_id, lower(trim(nombre)));
create index if not exists usuarios_proyecto_proyecto_idx
  on public.usuarios_proyecto (proyecto_id);

create table if not exists public.conteos_usuario (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios_proyecto(id) on delete cascade,
  cantidad numeric not null default 0 check (cantidad >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (producto_id, usuario_id)
);

create index if not exists conteos_usuario_proyecto_idx
  on public.conteos_usuario (proyecto_id);
create index if not exists conteos_usuario_usuario_idx
  on public.conteos_usuario (usuario_id);

create or replace function public.validar_conteo_usuario_proyecto()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.productos
    where id = new.producto_id and proyecto_id = new.proyecto_id
  ) then
    raise exception 'El producto no pertenece al proyecto';
  end if;

  if not exists (
    select 1 from public.usuarios_proyecto
    where id = new.usuario_id and proyecto_id = new.proyecto_id
  ) then
    raise exception 'El usuario no pertenece al proyecto';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_conteo_usuario_proyecto_trigger on public.conteos_usuario;
create trigger validar_conteo_usuario_proyecto_trigger
before insert or update on public.conteos_usuario
for each row execute function public.validar_conteo_usuario_proyecto();

create or replace function public.actualizar_total_toma_fisica()
returns trigger
language plpgsql
as $$
declare
  producto_afectado uuid;
  total numeric;
begin
  if tg_op = 'DELETE' then
    producto_afectado := old.producto_id;
  else
    producto_afectado := new.producto_id;
  end if;

  select coalesce(sum(cantidad), 0)
  into total
  from public.conteos_usuario
  where producto_id = producto_afectado;

  update public.productos
  set cantidad_toma_fisica = replace(to_char(total, 'FM999999999990.00'), '.', ',')
  where id = producto_afectado;

  return null;
end;
$$;

drop trigger if exists actualizar_total_toma_fisica_trigger on public.conteos_usuario;
create trigger actualizar_total_toma_fisica_trigger
after insert or update or delete on public.conteos_usuario
for each row execute function public.actualizar_total_toma_fisica();

create or replace function public.registrar_usuario_proyecto(
  p_proyecto_id uuid,
  p_nombre text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario_id uuid;
  nombre_limpio text := trim(p_nombre);
begin
  if length(nombre_limpio) < 2 then
    raise exception 'NOMBRE_USUARIO_REQUERIDO';
  end if;

  if not exists (select 1 from public.proyectos where id = p_proyecto_id) then
    raise exception 'PROYECTO_NO_ENCONTRADO';
  end if;

  select id into usuario_id
  from public.usuarios_proyecto
  where proyecto_id = p_proyecto_id
    and lower(trim(nombre)) = lower(nombre_limpio)
  limit 1;

  if usuario_id is null then
    insert into public.usuarios_proyecto (proyecto_id, nombre)
    values (p_proyecto_id, nombre_limpio)
    on conflict do nothing
    returning id into usuario_id;

    if usuario_id is null then
      select id into usuario_id
      from public.usuarios_proyecto
      where proyecto_id = p_proyecto_id
        and lower(trim(nombre)) = lower(nombre_limpio)
      limit 1;
    end if;
  end if;

  return usuario_id;
end;
$$;

create or replace function public.registrar_usuario_por_codigo(
  p_codigo_acceso text,
  p_nombre text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  proyecto public.proyectos;
  usuario_id uuid;
begin
  select * into proyecto
  from public.proyectos
  where codigo_acceso = upper(trim(p_codigo_acceso))
  limit 1;

  if proyecto.id is null then
    raise exception 'PROYECTO_NO_ENCONTRADO';
  end if;

  usuario_id := public.registrar_usuario_proyecto(proyecto.id, p_nombre);

  return jsonb_build_object(
    'proyecto_id', proyecto.id,
    'proyecto_nombre', proyecto.nombre,
    'usuario_id', usuario_id,
    'usuario_nombre', trim(p_nombre)
  );
end;
$$;

create or replace function public.aplicar_conteo_usuario(
  p_proyecto_id uuid,
  p_usuario_id uuid,
  p_producto_id uuid,
  p_cantidad numeric,
  p_absoluto boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  producto public.productos;
  total_usuario numeric;
begin
  if not exists (
    select 1 from public.usuarios_proyecto
    where id = p_usuario_id and proyecto_id = p_proyecto_id
  ) then
    raise exception 'USUARIO_NO_VALIDO';
  end if;

  insert into public.conteos_usuario (
    proyecto_id, producto_id, usuario_id, cantidad
  )
  values (
    p_proyecto_id, p_producto_id, p_usuario_id, greatest(p_cantidad, 0)
  )
  on conflict (producto_id, usuario_id)
  do update set
    cantidad = case
      when p_absoluto then greatest(p_cantidad, 0)
      else greatest(public.conteos_usuario.cantidad + p_cantidad, 0)
    end,
    updated_at = now()
  returning cantidad into total_usuario;

  select * into producto from public.productos where id = p_producto_id;

  return jsonb_build_object(
    'encontrado', true,
    'producto', to_jsonb(producto),
    'producto_id', producto.id,
    'codigo', producto.codigo,
    'cantidad_usuario', total_usuario
  );
end;
$$;

create or replace function public.registrar_conteo_usuario(
  p_proyecto_id uuid,
  p_usuario_id uuid,
  p_codigo_producto text,
  p_cantidad numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  producto public.productos;
begin
  select * into producto
  from public.productos
  where proyecto_id = p_proyecto_id
    and codigo = trim(p_codigo_producto)
  limit 1;

  if producto.id is null then
    return jsonb_build_object('encontrado', false);
  end if;

  return public.aplicar_conteo_usuario(
    p_proyecto_id, p_usuario_id, producto.id, p_cantidad, false
  );
end;
$$;

create or replace function public.ajustar_conteo_usuario(
  p_proyecto_id uuid,
  p_usuario_id uuid,
  p_producto_id uuid,
  p_delta numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.aplicar_conteo_usuario(
    p_proyecto_id, p_usuario_id, p_producto_id, p_delta, false
  );
end;
$$;

create or replace function public.establecer_conteo_usuario(
  p_proyecto_id uuid,
  p_usuario_id uuid,
  p_producto_id uuid,
  p_cantidad numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.aplicar_conteo_usuario(
    p_proyecto_id, p_usuario_id, p_producto_id, p_cantidad, true
  );
end;
$$;

alter table public.usuarios_proyecto enable row level security;
alter table public.conteos_usuario enable row level security;

drop policy if exists "usuarios_proyecto_all_anon" on public.usuarios_proyecto;
create policy "usuarios_proyecto_all_anon"
  on public.usuarios_proyecto for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "conteos_usuario_all_anon" on public.conteos_usuario;
create policy "conteos_usuario_all_anon"
  on public.conteos_usuario for all
  to anon, authenticated
  using (true)
  with check (true);

grant execute on function public.registrar_usuario_proyecto(uuid, text)
  to anon, authenticated;
grant execute on function public.registrar_usuario_por_codigo(text, text)
  to anon, authenticated;
grant execute on function public.aplicar_conteo_usuario(uuid, uuid, uuid, numeric, boolean)
  to anon, authenticated;
grant execute on function public.registrar_conteo_usuario(uuid, uuid, text, numeric)
  to anon, authenticated;
grant execute on function public.ajustar_conteo_usuario(uuid, uuid, uuid, numeric)
  to anon, authenticated;
grant execute on function public.establecer_conteo_usuario(uuid, uuid, uuid, numeric)
  to anon, authenticated;
