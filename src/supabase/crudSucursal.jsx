import { supabase } from "./supabase.config";

export const TIPOS_SUCURSAL = {
  AGENCIA: "agencia",
  MATRIZ: "matriz",
};

export function esMatriz(tipo) {
  return String(tipo ?? "").trim().toLowerCase() === TIPOS_SUCURSAL.MATRIZ;
}

export async function listarSucursales() {
  const { data, error } = await supabase
    .from("sucursal")
    .select("id, nombre, tipo")
    .order("tipo", { ascending: false })
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function registrarSucursal({ nombre, tipo }) {
  const payload = {
    nombre: String(nombre ?? "").trim().toUpperCase(),
    tipo: String(tipo ?? "").trim().toLowerCase(),
  };

  if (!payload.nombre) throw new Error("Ingresa el nombre de la sucursal.");
  if (!Object.values(TIPOS_SUCURSAL).includes(payload.tipo)) {
    throw new Error("El tipo debe ser agencia o matriz.");
  }

  const { data, error } = await supabase
    .from("sucursal")
    .upsert(payload, { onConflict: "nombre" })
    .select("id, nombre, tipo")
    .single();

  if (error) throw error;
  return data;
}
