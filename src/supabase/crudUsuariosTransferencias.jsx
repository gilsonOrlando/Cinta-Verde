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

export async function iniciarSesionTransferencia({ usuario, clave }) {
  const usuarioValor = String(usuario ?? "").trim();
  const claveValor = String(clave ?? "");

  if (!usuarioValor) throw new Error("Ingresa el usuario.");
  if (!claveValor) throw new Error("Ingresa la clave.");

  const { data, error } = await supabase.rpc("iniciar_sesion_transferencia", {
    p_usuario: usuarioValor,
    p_clave: claveValor,
  });

  if (error) throw error;
  if (!data?.id) throw new Error("Usuario o clave incorrectos.");

  guardarSesionTransferencia(data);
  return data;
}
