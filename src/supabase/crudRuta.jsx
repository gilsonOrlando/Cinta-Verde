import { supabase } from "./supabase.config";
import { esMatriz } from "./crudSucursal";

export function esRutaTransitoria(ruta) {
  return Boolean(ruta?.transitorio);
}

export function esDuenioDeRuta(sesion, ruta) {
  return (
    Boolean(sesion?.sucursal_id) &&
    String(sesion.sucursal_id) === String(ruta?.origen_id ?? "")
  );
}

export async function asegurarRutaTransitoria(origenId) {
  if (!origenId) throw new Error("Falta la matriz para la ruta transitoria.");

  const { data: existente, error: errorExistente } = await supabase
    .from("ruta")
    .select("id, origen_id, fecha, chofer, transitorio, created_at")
    .eq("origen_id", origenId)
    .eq("transitorio", true)
    .maybeSingle();

  if (errorExistente) throw errorExistente;
  if (existente) return { ...existente, destinoIds: [] };

  const { data, error } = await supabase
    .from("ruta")
    .insert({
      origen_id: origenId,
      fecha: new Date().toISOString().slice(0, 10),
      chofer: "RUTA TRANSITORIO",
      transitorio: true,
    })
    .select("id, origen_id, fecha, chofer, transitorio, created_at")
    .single();

  if (error) throw error;
  return { ...data, destinoIds: [] };
}

export async function listarRutas() {
  const [{ data: rutas, error: errorRutas }, { data: destinos, error: errorDestinos }] =
    await Promise.all([
      supabase
        .from("ruta")
        .select("id, origen_id, fecha, chofer, transitorio, created_at")
        .order("created_at", { ascending: true }),
      supabase.from("ruta_destino").select("ruta_id, sucursal_id"),
    ]);

  if (errorRutas) throw errorRutas;
  if (errorDestinos) throw errorDestinos;

  const destinosPorRuta = new Map();
  for (const item of destinos ?? []) {
    const lista = destinosPorRuta.get(item.ruta_id) ?? [];
    lista.push(item.sucursal_id);
    destinosPorRuta.set(item.ruta_id, lista);
  }

  return (rutas ?? []).map((ruta) => ({
    ...ruta,
    destinoIds: destinosPorRuta.get(ruta.id) ?? [],
  }));
}

export async function crearRuta({ origenId, fecha, chofer, destinoIds, sucursales = [] }) {
  const { fechaValor, choferValor, destinos } = validarRuta({
    origenId,
    fecha,
    chofer,
    destinoIds,
    sucursales,
  });

  const { data, error } = await supabase
    .from("ruta")
    .insert({
      origen_id: origenId,
      fecha: fechaValor,
      chofer: choferValor,
      transitorio: false,
    })
    .select("id, origen_id, fecha, chofer, transitorio, created_at")
    .single();

  if (error) throw error;

  const { error: errorDestinos } = await supabase.from("ruta_destino").insert(
    destinos.map((sucursalId) => ({
      ruta_id: data.id,
      sucursal_id: sucursalId,
    }))
  );

  if (errorDestinos) {
    await supabase.from("ruta").delete().eq("id", data.id);
    throw errorDestinos;
  }

  return {
    ...data,
    destinoIds: destinos,
  };
}

function validarRuta({ origenId, fecha, chofer, destinoIds, sucursales = [] }) {
  const origen = sucursales.find((item) => item.id === origenId);
  if (!origen || !esMatriz(origen.tipo)) {
    throw new Error("El origen debe ser una sucursal matriz.");
  }

  const fechaValor = String(fecha ?? "").trim();
  const choferValor = String(chofer ?? "").trim().toUpperCase();
  const destinos = [...new Set((destinoIds ?? []).filter(Boolean))];

  if (!fechaValor) throw new Error("Ingresa la fecha de la ruta.");
  if (!choferValor) throw new Error("Ingresa el nombre del chofer.");
  if (destinos.length === 0) throw new Error("Selecciona al menos un destino.");
  if (destinos.includes(origenId)) {
    throw new Error("El destino no puede ser la misma sucursal de origen.");
  }

  return { origenId, fechaValor, choferValor, destinos };
}

export async function actualizarRuta({
  id,
  origenId,
  fecha,
  chofer,
  destinoIds,
  sucursales = [],
}) {
  if (!id) throw new Error("No se encontró la ruta a editar.");

  const { data: actual, error: errorActual } = await supabase
    .from("ruta")
    .select("transitorio")
    .eq("id", id)
    .single();
  if (errorActual) throw errorActual;
  if (esRutaTransitoria(actual)) {
    throw new Error("No se puede editar la ruta transitoria de la matriz.");
  }

  const { fechaValor, choferValor, destinos } = validarRuta({
    origenId,
    fecha,
    chofer,
    destinoIds,
    sucursales,
  });

  const { data, error } = await supabase
    .from("ruta")
    .update({
      origen_id: origenId,
      fecha: fechaValor,
      chofer: choferValor,
    })
    .eq("id", id)
    .select("id, origen_id, fecha, chofer, transitorio, created_at")
    .single();

  if (error) throw error;

  const { error: errorBorrar } = await supabase.from("ruta_destino").delete().eq("ruta_id", id);
  if (errorBorrar) throw errorBorrar;

  const { error: errorDestinos } = await supabase.from("ruta_destino").insert(
    destinos.map((sucursalId) => ({
      ruta_id: id,
      sucursal_id: sucursalId,
    }))
  );
  if (errorDestinos) throw errorDestinos;

  return {
    ...data,
    destinoIds: destinos,
  };
}

export async function eliminarRuta(id, { sucursalId } = {}) {
  if (!id) throw new Error("No se encontró la ruta a eliminar.");

  const { data: ruta, error: errorRuta } = await supabase
    .from("ruta")
    .select("id, origen_id, transitorio")
    .eq("id", id)
    .single();

  if (errorRuta) throw errorRuta;
  if (esRutaTransitoria(ruta)) {
    throw new Error("No se puede eliminar la ruta transitoria de la matriz.");
  }
  if (sucursalId && String(ruta.origen_id) !== String(sucursalId)) {
    throw new Error("Solo la matriz que creó la ruta puede eliminarla.");
  }

  const transitoria = await asegurarRutaTransitoria(ruta.origen_id);
  const { data: destinosRuta, error: errorDestinos } = await supabase
    .from("ruta_destino")
    .select("sucursal_id")
    .eq("ruta_id", id);
  if (errorDestinos) throw errorDestinos;

  const destinosOficiales = new Set([
    String(ruta.origen_id),
    ...(destinosRuta ?? []).map((item) => String(item.sucursal_id)),
  ]);

  const { data: items, error: errorItems } = await supabase
    .from("transferencia")
    .select("id, sucursal_id, transferencia, guia")
    .eq("ruta_id", id);
  if (errorItems) throw errorItems;

  const idsMovidas = [];
  const aEliminar = [];
  for (const item of items ?? []) {
    if (destinosOficiales.has(String(item.sucursal_id))) aEliminar.push(item);
    else idsMovidas.push(item.id);
  }

  if (idsMovidas.length > 0) {
    const { error: errorMover } = await supabase
      .from("transferencia")
      .update({ ruta_id: transitoria.id })
      .in("id", idsMovidas);
    if (errorMover) throw errorMover;
  }

  if (aEliminar.length > 0) {
    const { error: errorBorrar } = await supabase
      .from("transferencia")
      .delete()
      .in(
        "id",
        aEliminar.map((item) => item.id)
      );
    if (errorBorrar) throw errorBorrar;
    const archivos = aEliminar.flatMap((item) => [item.transferencia, item.guia]).filter(Boolean);
    if (archivos.length > 0) {
      await supabase.storage.from("transferencias").remove(archivos);
    }
  }

  let consulta = supabase.from("ruta").delete().eq("id", id);
  if (sucursalId) consulta = consulta.eq("origen_id", sucursalId);
  const { error } = await consulta;
  if (error) throw error;
  return {
    transitoria,
    idsMovidas,
    idsEliminadas: aEliminar.map((item) => item.id),
  };
}
