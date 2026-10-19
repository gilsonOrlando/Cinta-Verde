import { supabase } from "./supabase.config";
import { validarPdfTransferencia } from "../utils/validarPdfTransferencia";

export const BUCKET_TRANSFERENCIAS = "transferencias";

const CAMPOS_TRANSFERENCIA =
  "id, ruta_id, origen_id, sucursal_id, transferencia, guia, created_at";

function validarOrigenYSucursal(origenId, sucursalId) {
  if (!origenId) throw new Error("Inicia sesión para registrar la agencia origen.");
  if (!sucursalId) throw new Error("Selecciona la sucursal.");
  if (String(origenId) === String(sucursalId)) {
    throw new Error("La sucursal no puede ser la misma que la agencia origen.");
  }
}

export function urlArchivoTransferencia(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET_TRANSFERENCIAS).getPublicUrl(path);
  return data?.publicUrl ?? "";
}

export async function listarTransferencias(rutaId) {
  let consulta = supabase
    .from("transferencia")
    .select(CAMPOS_TRANSFERENCIA)
    .order("created_at", { ascending: true });

  if (rutaId) consulta = consulta.eq("ruta_id", rutaId);

  const { data, error } = await consulta;
  if (error) throw error;
  return data ?? [];
}

async function subirPdf(path, file) {
  const { error } = await supabase.storage.from(BUCKET_TRANSFERENCIAS).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;
}

async function borrarArchivos(paths) {
  const limpios = paths.filter(Boolean);
  if (limpios.length === 0) return;
  await supabase.storage.from(BUCKET_TRANSFERENCIAS).remove(limpios);
}

export async function crearTransferencia({
  rutaId,
  origenId,
  sucursalId,
  archivoTransferencia,
  archivoGuia,
}) {
  if (!rutaId) throw new Error("Selecciona una ruta para cargar la transferencia.");
  validarOrigenYSucursal(origenId, sucursalId);

  await validarPdfTransferencia(archivoTransferencia, "Transferencia");
  await validarPdfTransferencia(archivoGuia, "Guía");

  const id = crypto.randomUUID();
  const pathTransferencia = `${rutaId}/${id}/transferencia.pdf`;
  const pathGuia = `${rutaId}/${id}/guia.pdf`;

  try {
    await subirPdf(pathTransferencia, archivoTransferencia);
    await subirPdf(pathGuia, archivoGuia);

    const { data, error } = await supabase
      .from("transferencia")
      .insert({
        id,
        ruta_id: rutaId,
        origen_id: origenId,
        sucursal_id: sucursalId,
        transferencia: pathTransferencia,
        guia: pathGuia,
      })
      .select(CAMPOS_TRANSFERENCIA)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    await borrarArchivos([pathTransferencia, pathGuia]);
    throw error;
  }
}

export async function actualizarTransferencia({
  id,
  rutaId,
  sucursalSesionId,
  sucursalId,
  archivoTransferencia,
  archivoGuia,
}) {
  if (!id) throw new Error("No se encontró la transferencia a editar.");
  if (!rutaId) throw new Error("Selecciona una ruta para editar la transferencia.");
  if (!sucursalSesionId) {
    throw new Error("Inicia sesión para editar una transferencia.");
  }

  const { data: actual, error: errorLectura } = await supabase
    .from("transferencia")
    .select("id, origen_id")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura) throw errorLectura;
  if (!actual?.id) throw new Error("No se encontró la transferencia a editar.");
  if (String(actual.origen_id ?? "") !== String(sucursalSesionId)) {
    throw new Error("Solo la agencia origen puede editar esta transferencia.");
  }

  validarOrigenYSucursal(actual.origen_id, sucursalId);

  await validarPdfTransferencia(archivoTransferencia, "Transferencia");
  await validarPdfTransferencia(archivoGuia, "Guía");

  const pathTransferencia = `${rutaId}/${id}/transferencia.pdf`;
  const pathGuia = `${rutaId}/${id}/guia.pdf`;

  const { error: errorT } = await supabase.storage
    .from(BUCKET_TRANSFERENCIAS)
    .upload(pathTransferencia, archivoTransferencia, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (errorT) throw errorT;

  const { error: errorG } = await supabase.storage
    .from(BUCKET_TRANSFERENCIAS)
    .upload(pathGuia, archivoGuia, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (errorG) throw errorG;

  const { data, error } = await supabase
    .from("transferencia")
    .update({
      sucursal_id: sucursalId,
      transferencia: pathTransferencia,
      guia: pathGuia,
    })
    .eq("id", id)
    .eq("origen_id", sucursalSesionId)
    .select(CAMPOS_TRANSFERENCIA)
    .single();

  if (error) throw error;
  return data;
}

export async function moverTransferenciasARuta({ ids, rutaId }) {
  const lista = [...new Set((ids ?? []).filter(Boolean))];
  if (lista.length === 0) throw new Error("Selecciona al menos una transferencia.");
  if (!rutaId) throw new Error("Selecciona la ruta entre matrices.");

  const { error } = await supabase
    .from("transferencia")
    .update({ ruta_id: rutaId })
    .in("id", lista);

  if (error) throw error;
}

export function esOrigenDeTransferencia(sesion, item) {
  return Boolean(sesion?.sucursal_id) && String(sesion.sucursal_id) === String(item?.origen_id ?? "");
}

export async function eliminarTransferencia(item, { sucursalId } = {}) {
  if (!item?.id) throw new Error("No se encontró la transferencia a eliminar.");
  if (!sucursalId) {
    throw new Error("Inicia sesión para eliminar una transferencia.");
  }

  const { data: actual, error: errorLectura } = await supabase
    .from("transferencia")
    .select("id, origen_id, ruta_id, transferencia, guia")
    .eq("id", item.id)
    .maybeSingle();

  if (errorLectura) throw errorLectura;
  if (!actual?.id) throw new Error("No se encontró la transferencia a eliminar.");

  const esOrigen = String(actual.origen_id ?? "") === String(sucursalId);
  let enTransitorioPropio = false;

  if (!esOrigen) {
    const { data: ruta, error: errorRuta } = await supabase
      .from("ruta")
      .select("id, origen_id, transitorio")
      .eq("id", actual.ruta_id)
      .maybeSingle();

    if (errorRuta) throw errorRuta;
    enTransitorioPropio =
      Boolean(ruta?.transitorio) && String(ruta?.origen_id ?? "") === String(sucursalId);
  }

  if (!esOrigen && !enTransitorioPropio) {
    throw new Error(
      "Solo la agencia origen o la matriz de la ruta transitorio pueden eliminar esta transferencia."
    );
  }

  const { error } = await supabase.from("transferencia").delete().eq("id", actual.id);
  if (error) throw error;

  await borrarArchivos([actual.transferencia, actual.guia]);
}
