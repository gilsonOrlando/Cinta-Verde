-- Registrar sucursales una por una (upsert por nombre)
-- Ejecutar después de scripts/setup-sucursal.sql

insert into public.sucursal (nombre, tipo) values ('LOJA', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('ZAMORA', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('CATAMAYO', 'matriz')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('CARIAMANGA', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('GONZANAMA', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('CATACOCHA', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('BALSAS', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('HUAQUILLAS', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('ARENILLAS', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('PIÑAS', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('SANTA ISABEL', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('ALAMOR', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('MACHALA', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('LAS LAJAS', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('COLON', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('BOLIVAR', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('BODEGA CENTRAL', 'matriz')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('MARCABELI', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('EL GUABO', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
insert into public.sucursal (nombre, tipo) values ('PASAJE', 'agencia')
on conflict (nombre) do update set tipo = excluded.tipo;
