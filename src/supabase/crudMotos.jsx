import { supabase } from "./supabase.config";

export function normalizarChasis(chasis) {
  return String(chasis ?? "").trim().toUpperCase();
}

function normalizarTextoMoto(valor) {
  return String(valor ?? "").trim().toUpperCase();
}

function construirPayloadMoto({
  codigo,
  producto,
  chasis,
  motor,
  camCpmRamw,
  linkMega,
  agencia,
  transferenciaNumero,
  bodegaOrigen,
  bodegaDestino,
}) {
  return {
    codigo: String(codigo ?? "").trim(),
    producto: String(producto ?? "").trim(),
    chasis: normalizarChasis(chasis),
    motor: normalizarTextoMoto(motor),
    cam_cpm_ramw: normalizarTextoMoto(camCpmRamw),
    link_mega: String(linkMega ?? "").trim() || null,
    agencia: String(agencia ?? "").trim() || null,
    transferencia_numero: transferenciaNumero ?? null,
    bodega_origen: bodegaOrigen ?? null,
    bodega_destino: bodegaDestino ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function buscarMotoPorChasis(chasis) {
  const chasisNormalizado = normalizarChasis(chasis);
  if (!chasisNormalizado) return null;

  const { data, error } = await supabase
    .from("motos")
    .select("*")
    .eq("chasis", chasisNormalizado)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function guardarMotoPorChasis(datos) {
  const payload = construirPayloadMoto(datos);

  if (!payload.chasis || !payload.motor || !payload.cam_cpm_ramw) {
    throw new Error("Faltan datos obligatorios de la moto.");
  }

  const existente = await buscarMotoPorChasis(payload.chasis);

  const { data, error } = await supabase
    .from("motos")
    .upsert(payload, { onConflict: "chasis" })
    .select()
    .single();

  if (error) throw error;

  return {
    moto: data,
    actualizado: Boolean(existente),
  };
}
