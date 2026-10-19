-- Usuarios de transferencias: 1 credencial por sucursal (tipos matriz y agencia).
-- Pegar en Supabase → SQL Editor → Run

create table if not exists public.usuariostransferencias (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null unique,
  usuario text not null unique,
  clave text not null,
  tipo text not null check (tipo in ('agencia', 'matriz')),
  created_at timestamptz not null default now(),
  constraint usuariostransferencias_sucursal_fk
    foreign key (sucursal_id) references public.sucursal (id) on delete cascade,
  constraint usuariostransferencias_sucursal_tipo_fk
    foreign key (sucursal_id, tipo) references public.sucursal (id, tipo)
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usuariostransferencias'
      and column_name = 'clave_hash'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'usuariostransferencias'
        and column_name = 'clave'
    ) then
      alter table public.usuariostransferencias add column clave text;
    end if;

    alter table public.usuariostransferencias drop column clave_hash;
  end if;
end $$;

create index if not exists usuariostransferencias_tipo_idx
  on public.usuariostransferencias (tipo);

comment on table public.usuariostransferencias is
  'Credencial de autenticación de transferencias. Cada sucursal tiene un usuario; el tipo es matriz o agencia.';
comment on column public.usuariostransferencias.sucursal_id is
  'Sucursal a la que pertenece el usuario (1:1).';
comment on column public.usuariostransferencias.clave is
  'Clave de acceso en texto plano.';
comment on column public.usuariostransferencias.tipo is
  'Tipo de usuario: matriz o agencia, igual al tipo de la sucursal.';

alter table public.usuariostransferencias enable row level security;

drop policy if exists "usuariostransferencias_all_anon" on public.usuariostransferencias;

create or replace function public.iniciar_sesion_transferencia(p_usuario text, p_clave text)
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
  where lower(u.usuario) = lower(btrim(p_usuario))
    and u.clave = p_clave
  limit 1;

  if fila.id is null then
    raise exception 'Usuario o clave incorrectos';
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

revoke all on function public.iniciar_sesion_transferencia(text, text) from public;
grant execute on function public.iniciar_sesion_transferencia(text, text) to anon, authenticated;
