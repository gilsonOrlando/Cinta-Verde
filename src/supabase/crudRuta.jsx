import { supabase } from "./supabase.config";
import { esMatriz } from "./crudSucursal";

export async function listarRutas() {
  const [{ data: rutas, error: errorRutas }, { data: destinos, error: errorDestinos }] =
    await Promise.all([
      supabase
        .from("ruta")
        .select("id, origen_id, fecha, chofer, created_at")
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

  const { data, error } = await supabase
    .from("ruta")
    .insert({
      origen_id: origenId,
      fecha: fechaValor,
      chofer: choferValor,
    })
    .select("id, origen_id, fecha, chofer, created_at")
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
