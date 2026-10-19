-- Ruta transitoria fija por cada sucursal matriz.

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
