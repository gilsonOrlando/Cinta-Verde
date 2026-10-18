import { supabase } from "./supabase.config";
import { validarPdfTransferencia } from "../utils/validarPdfTransferencia";

export const BUCKET_TRANSFERENCIAS = "transferencias";

export function urlArchivoTransferencia(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET_TRANSFERENCIAS).getPublicUrl(path);
  return data?.publicUrl ?? "";
}

export async function listarTransferencias(rutaId) {
  let consulta = supabase
    .from("transferencia")
    .select("id, ruta_id, transferencia, guia, created_at")
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

export async function crearTransferencia({ rutaId, archivoTransferencia, archivoGuia }) {
  if (!rutaId) throw new Error("Selecciona una ruta para cargar la transferencia.");

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
        transferencia: pathTransferencia,
        guia: pathGuia,
      })
      .select("id, ruta_id, transferencia, guia, created_at")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    await borrarArchivos([pathTransferencia, pathGuia]);
    throw error;
  }
}

export async function eliminarTransferencia(item) {
  if (!item?.id) throw new Error("No se encontró la transferencia a eliminar.");

  const { error } = await supabase.from("transferencia").delete().eq("id", item.id);
  if (error) throw error;

  await borrarArchivos([item.transferencia, item.guia]);
}
