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
