alter table public.transferencia
  add column if not exists nombre text;

comment on column public.transferencia.nombre is
  'Título del PDF de transferencia, para listarlo en la pizarra.';
