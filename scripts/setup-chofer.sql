-- Choferes en usuariostransferencias: varios por matriz, tipo chofer.
-- La clave es el nombre del chofer en minúsculas y sin espacios.

alter table public.usuariostransferencias
  drop constraint if exists usuariostransferencias_sucursal_tipo_fk;

alter table public.usuariostransferencias
  drop constraint if exists usuariostransferencias_sucursal_id_key;

alter table public.usuariostransferencias
  drop constraint if exists usuariostransferencias_usuario_key;

drop index if exists public.usuariostransferencias_clave_key;

alter table public.usuariostransferencias
  drop constraint if exists usuariostransferencias_tipo_check;

alter table public.usuariostransferencias
  add constraint usuariostransferencias_tipo_check
  check (tipo in ('agencia', 'matriz', 'chofer'));

create unique index if not exists usuariostransferencias_login_por_sucursal_idx
  on public.usuariostransferencias (sucursal_id)
  where tipo in ('agencia', 'matriz');

create unique index if not exists usuariostransferencias_login_clave_idx
  on public.usuariostransferencias (clave)
  where tipo in ('agencia', 'matriz');

create unique index if not exists usuariostransferencias_chofer_por_matriz_idx
  on public.usuariostransferencias (sucursal_id, usuario)
  where tipo = 'chofer';

comment on column public.usuariostransferencias.tipo is
  'Tipo de usuario: matriz, agencia o chofer.';
comment on column public.usuariostransferencias.sucursal_id is
  'Sucursal del usuario. En choferes es la matriz que lo registró.';

drop policy if exists "usuariostransferencias_all_anon" on public.usuariostransferencias;
create policy "usuariostransferencias_all_anon" on public.usuariostransferencias
  for all to anon, authenticated using (true) with check (true);

create or replace function public.iniciar_sesion_transferencia(p_clave text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  fila record;
begin
  select
    u.id,
    u.sucursal_id,
    u.usuario,
    u.tipo,
    s.nombre as sucursal_nombre
  into fila
  from public.usuariostransferencias u
  join public.sucursal s on s.id = u.sucursal_id
  where u.clave = btrim(p_clave)
    and u.tipo in ('agencia', 'matriz')
  limit 1;

  if fila.id is null then
    raise exception 'Credencial incorrecta';
  end if;

  return json_build_object(
    'id', fila.id,
    'sucursal_id', fila.sucursal_id,
    'usuario', fila.usuario,
    'tipo', fila.tipo,
    'sucursal_nombre', fila.sucursal_nombre
  );
end;
$$;
