-- Rutas de transferencia: origen matriz, varios destinos, fecha y chofer
-- Relación 1:N: una matriz tiene varias rutas; cada ruta pertenece a una sola matriz.
-- Pegar en Supabase → SQL Editor → Run

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sucursal_id_tipo_unique'
  ) then
    alter table public.sucursal
      add constraint sucursal_id_tipo_unique unique (id, tipo);
  end if;
end $$;

create table if not exists public.ruta (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid not null,
  fecha date not null,
  chofer text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ruta'
      and column_name = 'origen_tipo'
  ) then
    alter table public.ruta
      add column origen_tipo text generated always as ('matriz') stored;
  end if;
end $$;

alter table public.ruta drop constraint if exists ruta_origen_id_fkey;
alter table public.ruta drop constraint if exists ruta_pertenece_a_matriz_fk;

alter table public.ruta
  add constraint ruta_origen_id_fkey
    foreign key (origen_id)
    references public.sucursal (id)
    on delete restrict;

alter table public.ruta
  add constraint ruta_pertenece_a_matriz_fk
    foreign key (origen_id, origen_tipo)
    references public.sucursal (id, tipo)
    on delete restrict;

comment on table public.ruta is
  'Ruta de transferencia. Pertenece a una sola sucursal matriz (origen_id).';
comment on column public.ruta.origen_id is
  'Sucursal matriz dueña de la ruta. Una matriz puede tener muchas rutas.';
comment on constraint ruta_pertenece_a_matriz_fk on public.ruta is
  'Una ruta pertenece a una sola matriz; una matriz puede tener varias rutas.';

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ruta'
      and column_name = 'transitorio'
  ) then
    alter table public.ruta
      add column transitorio boolean not null default false;
  end if;
end $$;

comment on column public.ruta.transitorio is
  'Ruta transitoria fija de cada matriz para transferencias pendientes.';

create unique index if not exists ruta_transitorio_por_matriz_idx
  on public.ruta (origen_id)
  where transitorio;

create index if not exists ruta_origen_id_idx on public.ruta (origen_id);
create index if not exists ruta_fecha_idx on public.ruta (fecha desc);

insert into public.ruta (origen_id, fecha, chofer, transitorio)
select s.id, current_date, 'RUTA TRANSITORIO', true
from public.sucursal s
where s.tipo = 'matriz'
  and not exists (
    select 1
    from public.ruta r
    where r.origen_id = s.id
      and r.transitorio
  );

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
