import { supabase } from "./supabase.config";

const STORAGE_KEY = "sicob-sesion-transferencias";

export function leerSesionTransferencia() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const sesion = JSON.parse(raw);
    if (!sesion?.id || !sesion?.sucursal_id || !sesion?.tipo) return null;
    return sesion;
  } catch {
    return null;
  }
}

export function guardarSesionTransferencia(sesion) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
}

export function borrarSesionTransferencia() {
  localStorage.removeItem(STORAGE_KEY);
}

export function esUsuarioMatriz(sesion) {
  return String(sesion?.tipo ?? "").toLowerCase() === "matriz";
}

export function esUsuarioAgencia(sesion) {
  return String(sesion?.tipo ?? "").toLowerCase() === "agencia";
}

export function puedeGestionarRutas(sesion) {
  return esUsuarioMatriz(sesion);
}

export function puedeCrudTransferencias(sesion) {
  return esUsuarioMatriz(sesion) || esUsuarioAgencia(sesion);
}

export const TIPO_CHOFER = "chofer";

export function claveChoferDesdeNombre(nombre) {
  return String(nombre ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

export async function listarChoferes(sucursalId) {
  if (!sucursalId) return [];

  const { data, error } = await supabase
    .from("usuariostransferencias")
    .select("id, sucursal_id, usuario, tipo, created_at")
    .eq("tipo", TIPO_CHOFER)
    .eq("sucursal_id", sucursalId)
    .order("usuario", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function crearChofer({ sucursalId, nombre }) {
  const usuario = String(nombre ?? "").trim().toUpperCase();
  const clave = claveChoferDesdeNombre(nombre);
  if (!sucursalId) throw new Error("Inicia sesión como matriz para registrar un chofer.");
  if (!usuario || !clave) throw new Error("Ingresa el nombre del chofer.");

  const { data, error } = await supabase
    .from("usuariostransferencias")
    .insert({
      sucursal_id: sucursalId,
      usuario,
      clave,
      tipo: TIPO_CHOFER,
    })
    .select("id, sucursal_id, usuario, clave, tipo, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ese chofer ya está registrado en tu matriz.");
    }
    throw error;
  }
  return data;
}

export async function iniciarSesionTransferencia({ clave }) {
  const claveValor = String(clave ?? "").trim();

  if (!claveValor) throw new Error("Ingresa la credencial.");

  const { data, error } = await supabase.rpc("iniciar_sesion_transferencia", {
    p_clave: claveValor,
  });

  if (error) throw error;
  if (!data?.id) throw new Error("Credencial incorrecta.");

  guardarSesionTransferencia(data);
  return data;
}
