import { supabase } from "./supabase.config";
import {
  extraerNumeroGuia,
  extraerTrb,
  inspeccionarBuffer,
  ordenarParTransferenciaGuia,
} from "../utils/validarPdfTransferencia";
import { asegurarRutaTransitoria } from "./crudRuta";

export const BUCKET_TRANSFERENCIAS = "transferencias";

const CAMPOS_TRANSFERENCIA =
  "id, ruta_id, origen_id, sucursal_id, nombre, transferencia, guia, created_at";
const CAMPOS_SIN_NOMBRE =
  "id, ruta_id, origen_id, sucursal_id, transferencia, guia, created_at";

function faltaColumnaNombre(error) {
  const texto = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    texto.includes("nombre") &&
    (texto.includes("42703") || texto.includes("pgrst204") || texto.includes("column"))
  );
}

export function nombreDeTransferencia(item) {
  const crudo = String(item?.nombre ?? "").trim();
  const trb = extraerTrb(crudo);
  if (trb) return trb;
  if (!crudo || /^(transferencia|sin t[ií]tulo|guia|guía)$/i.test(crudo)) return "Sin título";
  return crudo;
}

export function nombreDeGuia(item) {
  const crudo = String(item?.nombre_guia ?? "").trim();
  if (!crudo) return "";
  if (/^gu[ií]a$/i.test(crudo)) return "";
  return /^gu[ií]a\s/i.test(crudo) ? crudo : `Guía ${crudo}`;
}

export async function completarNombresTransferencias(items = []) {
  const resultado = items.map((item) => ({ ...item }));

  for (let i = 0; i < resultado.length; i += 2) {
    const lote = resultado.slice(i, i + 2);
    await Promise.all(
      lote.map(async (item) => {
        if (!item?.transferencia && !item?.guia) return;
        try {
          const [infoT, infoG] = await Promise.all([
            item.transferencia
              ? inspeccionarBuffer(
                  await obtenerBufferArchivoTransferencia(item.transferencia),
                  item.transferencia
                )
              : null,
            item.guia
              ? inspeccionarBuffer(
                  await obtenerBufferArchivoTransferencia(item.guia),
                  item.guia
                )
              : null,
          ]);

          const deltaT = (infoT?.puntaje.guia ?? 0) - (infoT?.puntaje.transferencia ?? 0);
          const deltaG = (infoG?.puntaje.guia ?? 0) - (infoG?.puntaje.transferencia ?? 0);
          const cruzados = Boolean(infoT && infoG && deltaT > 0 && deltaG < 0);
          const nombreAntes = item.nombre;

          if (cruzados) {
            const pathT = item.transferencia;
            item.transferencia = item.guia;
            item.guia = pathT;
            item.nombre = infoG.trb || item.nombre;
            item.nombre_guia = infoT.guia || extraerNumeroGuia(infoT.texto);
          } else {
            if (infoT?.trb) item.nombre = infoT.trb;
            item.nombre_guia = infoG?.guia || extraerNumeroGuia(infoG?.texto);
          }

          if (!cruzados && item.nombre === nombreAntes) return;

          const cambios = {
            transferencia: item.transferencia,
            guia: item.guia,
            nombre: item.nombre,
          };
          const { error } = await supabase
            .from("transferencia")
            .update(cambios)
            .eq("id", item.id);
          if (error && faltaColumnaNombre(error)) {
            const { nombre: _omitido, ...sinNombre } = cambios;
            const segundo = await supabase
              .from("transferencia")
              .update(sinNombre)
              .eq("id", item.id);
            if (segundo.error) console.error(segundo.error);
          } else if (error) {
            console.error(error);
          }
        } catch (error) {
          console.error(error);
        }
      })
    );
  }

  return resultado;
}

function validarOrigenYSucursal(origenId, sucursalId) {
  if (!origenId) throw new Error("Inicia sesión para registrar la agencia origen.");
  if (!sucursalId) throw new Error("Selecciona la sucursal.");
  if (String(origenId) === String(sucursalId)) {
    throw new Error("La sucursal no puede ser la misma que la agencia origen.");
  }
}

export function esOrigenDeTransferencia(sesion, item) {
  return Boolean(sesion?.sucursal_id) && String(sesion.sucursal_id) === String(item?.origen_id ?? "");
}

export function puedeGestionarItemTransferencia(sesion, item, ruta) {
  if (!sesion?.sucursal_id || !item) return false;
  if (esOrigenDeTransferencia(sesion, item)) return true;
  return (
    String(sesion.tipo ?? "").toLowerCase() === "matriz" &&
    String(sesion.sucursal_id) === String(ruta?.origen_id ?? "")
  );
}

export function puedeEliminarItemTransferencia(sesion, item, ruta) {
  if (!sesion?.sucursal_id || !item) return false;
  if (esOrigenDeTransferencia(sesion, item)) return true;
  if (String(sesion.tipo ?? "").toLowerCase() !== "matriz") return false;
  return String(sesion.sucursal_id) === String(ruta?.origen_id ?? "");
}

async function cargarRutaDeTransferencia(rutaId) {
  const { data, error } = await supabase
    .from("ruta")
    .select("id, origen_id, transitorio")
    .eq("id", rutaId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function exigirPermisoGestion({ sucursalSesionId, tipoSesion, item }) {
  if (!sucursalSesionId) {
    throw new Error("Inicia sesión para gestionar esta transferencia.");
  }

  const ruta = await cargarRutaDeTransferencia(item.ruta_id);
  if (!ruta?.id) throw new Error("No se encontró la ruta de la transferencia.");

  const sesion = { sucursal_id: sucursalSesionId, tipo: tipoSesion };
  if (!puedeGestionarItemTransferencia(sesion, item, ruta)) {
    throw new Error(
      "Solo la agencia origen o la matriz que creó la ruta pueden gestionar esta transferencia."
    );
  }

  return ruta;
}

export function urlArchivoTransferencia(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET_TRANSFERENCIAS).getPublicUrl(path);
  const url = data?.publicUrl ?? "";
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(path.split("/").pop() ?? "pdf")}`;
}

export async function obtenerBufferArchivoTransferencia(path) {
  if (!path) throw new Error("No hay archivo para previsualizar.");
  const { data, error } = await supabase.storage
    .from(BUCKET_TRANSFERENCIAS)
    .download(path);
  if (error) throw error;
  return await data.arrayBuffer();
}

export async function listarTransferencias(rutaId) {
  let consulta = supabase
    .from("transferencia")
    .select(CAMPOS_TRANSFERENCIA)
    .order("created_at", { ascending: true });

  if (rutaId) consulta = consulta.eq("ruta_id", rutaId);

  const { data, error } = await consulta;
  if (!error) return data ?? [];
  if (!faltaColumnaNombre(error)) throw error;

  let respaldo = supabase
    .from("transferencia")
    .select(CAMPOS_SIN_NOMBRE)
    .order("created_at", { ascending: true });
  if (rutaId) respaldo = respaldo.eq("ruta_id", rutaId);
  const segundo = await respaldo;
  if (segundo.error) throw segundo.error;
  return (segundo.data ?? []).map((item) => ({ ...item, nombre: "" }));
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

  const par = await ordenarParTransferenciaGuia(archivoTransferencia, archivoGuia);
  const id = crypto.randomUUID();
  const pathTransferencia = `${rutaId}/${id}/transferencia-${id}.pdf`;
  const pathGuia = `${rutaId}/${id}/guia-${id}.pdf`;

  try {
    await subirPdf(pathTransferencia, par.archivoTransferencia);
    await subirPdf(pathGuia, par.archivoGuia);

    const fila = {
      id,
      ruta_id: rutaId,
      origen_id: origenId,
      sucursal_id: sucursalId,
      nombre: par.nombre,
      transferencia: pathTransferencia,
      guia: pathGuia,
    };
    let { data, error } = await supabase
      .from("transferencia")
      .insert(fila)
      .select(CAMPOS_TRANSFERENCIA)
      .single();

    if (error && faltaColumnaNombre(error)) {
      const { nombre: _omitido, ...sinNombre } = fila;
      const segundo = await supabase
        .from("transferencia")
        .insert(sinNombre)
        .select(CAMPOS_SIN_NOMBRE)
        .single();
      if (segundo.error) throw segundo.error;
      return { ...segundo.data, nombre: par.nombre, nombre_guia: par.nombreGuia };
    }

    if (error) throw error;
    return { ...data, nombre_guia: par.nombreGuia };
  } catch (error) {
    await borrarArchivos([pathTransferencia, pathGuia]);
    throw error;
  }
}

export async function actualizarTransferencia({
  id,
  rutaId,
  sucursalSesionId,
  tipoSesion,
  sucursalId,
  archivoTransferencia,
  archivoGuia,
}) {
  if (!id) throw new Error("No se encontró la transferencia a editar.");
  if (!rutaId) throw new Error("Selecciona una ruta para editar la transferencia.");

  const { data: actual, error: errorLectura } = await supabase
    .from("transferencia")
    .select("id, origen_id, ruta_id, transferencia, guia")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura) throw errorLectura;
  if (!actual?.id) throw new Error("No se encontró la transferencia a editar.");

  await exigirPermisoGestion({ sucursalSesionId, tipoSesion, item: actual });
  validarOrigenYSucursal(actual.origen_id, sucursalId);

  const par = await ordenarParTransferenciaGuia(archivoTransferencia, archivoGuia);
  const marca = crypto.randomUUID();
  const pathTransferencia = `${rutaId}/${id}/transferencia-${marca}.pdf`;
  const pathGuia = `${rutaId}/${id}/guia-${marca}.pdf`;
  const anteriores = [actual.transferencia, actual.guia];

  const { error: errorT } = await supabase.storage
    .from(BUCKET_TRANSFERENCIAS)
    .upload(pathTransferencia, par.archivoTransferencia, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (errorT) throw errorT;

  const { error: errorG } = await supabase.storage
    .from(BUCKET_TRANSFERENCIAS)
    .upload(pathGuia, par.archivoGuia, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (errorG) {
    await borrarArchivos([pathTransferencia]);
    throw errorG;
  }

  const cambios = {
    sucursal_id: sucursalId,
    nombre: par.nombre,
    transferencia: pathTransferencia,
    guia: pathGuia,
  };
  let { data, error } = await supabase
    .from("transferencia")
    .update(cambios)
    .eq("id", id)
    .select(CAMPOS_TRANSFERENCIA)
    .single();

  if (error && faltaColumnaNombre(error)) {
    const { nombre: _omitido, ...sinNombre } = cambios;
    const segundo = await supabase
      .from("transferencia")
      .update(sinNombre)
      .eq("id", id)
      .select(CAMPOS_SIN_NOMBRE)
      .single();
    if (segundo.error) throw segundo.error;
    await borrarArchivos(anteriores);
    return { ...segundo.data, nombre: par.nombre, nombre_guia: par.nombreGuia };
  }

  if (error) throw error;
  await borrarArchivos(anteriores);
  return { ...data, nombre_guia: par.nombreGuia };
}

export async function moverTransferenciasARuta({ ids, rutaId }) {
  const lista = [...new Set((ids ?? []).filter(Boolean))];
  if (lista.length === 0) throw new Error("Selecciona al menos una transferencia.");
  if (!rutaId) throw new Error("Selecciona la ruta destino.");

  const { error } = await supabase
    .from("transferencia")
    .update({ ruta_id: rutaId })
    .in("id", lista);

  if (error) throw error;
}

export async function devolverTransferenciaATransitorio(item, { sucursalSesionId, tipoSesion } = {}) {
  if (!item?.id) throw new Error("No se encontró la transferencia a devolver.");

  let { data: actual, error: errorLectura } = await supabase
    .from("transferencia")
    .select(CAMPOS_TRANSFERENCIA)
    .eq("id", item.id)
    .maybeSingle();

  if (errorLectura && faltaColumnaNombre(errorLectura)) {
    const segundo = await supabase
      .from("transferencia")
      .select(CAMPOS_SIN_NOMBRE)
      .eq("id", item.id)
      .maybeSingle();
    actual = segundo.data ? { ...segundo.data, nombre: "" } : segundo.data;
    errorLectura = segundo.error;
  }

  if (errorLectura) throw errorLectura;
  if (!actual?.id) throw new Error("No se encontró la transferencia a devolver.");

  const ruta = await exigirPermisoGestion({ sucursalSesionId, tipoSesion, item: actual });
  if (ruta.transitorio) {
    throw new Error("Esta transferencia ya está en la ruta transitorio.");
  }

  const transitoria = await asegurarRutaTransitoria(ruta.origen_id);
  if (String(transitoria.id) === String(actual.ruta_id)) {
    throw new Error("Esta transferencia ya está en la ruta transitorio.");
  }

  let { data, error } = await supabase
    .from("transferencia")
    .update({ ruta_id: transitoria.id })
    .eq("id", actual.id)
    .select(CAMPOS_TRANSFERENCIA)
    .single();

  if (error && faltaColumnaNombre(error)) {
    const segundo = await supabase
      .from("transferencia")
      .update({ ruta_id: transitoria.id })
      .eq("id", actual.id)
      .select(CAMPOS_SIN_NOMBRE)
      .single();
    if (segundo.error) throw segundo.error;
    return {
      transferencia: { ...segundo.data, nombre: actual.nombre ?? "" },
      transitoria,
    };
  }

  if (error) throw error;
  return { transferencia: data, transitoria };
}

export async function eliminarTransferencia(item, { sucursalId, tipoSesion } = {}) {
  if (!item?.id) throw new Error("No se encontró la transferencia a eliminar.");

  const { data: actual, error: errorLectura } = await supabase
    .from("transferencia")
    .select("id, origen_id, ruta_id, transferencia, guia")
    .eq("id", item.id)
    .maybeSingle();

  if (errorLectura) throw errorLectura;
  if (!actual?.id) throw new Error("No se encontró la transferencia a eliminar.");

  const ruta = await cargarRutaDeTransferencia(actual.ruta_id);
  if (!ruta?.id) throw new Error("No se encontró la ruta de la transferencia.");
  const sesion = { sucursal_id: sucursalId, tipo: tipoSesion };
  if (!puedeEliminarItemTransferencia(sesion, actual, ruta)) {
    throw new Error(
      "Solo la agencia origen o la matriz dueña de esta ruta pueden eliminar la transferencia."
    );
  }

  const { error } = await supabase.from("transferencia").delete().eq("id", actual.id);
  if (error) throw error;

  await borrarArchivos([actual.transferencia, actual.guia]);
}

function slugArchivo(texto) {
  const limpio = String(texto ?? "guia")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return (limpio || "guia").slice(0, 48);
}

function dispararDescarga(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function guiasSubidasPorMatriz(transferencias, { rutaId, matrizId }) {
  return (transferencias ?? []).filter(
    (item) =>
      String(item.ruta_id) === String(rutaId) &&
      String(item.origen_id) === String(matrizId) &&
      item.guia
  );
}

export async function descargarGuiasDeMatriz({ grupos, nombreZip }) {
  const lista = (grupos ?? []).filter((grupo) => grupo.items?.length);
  if (lista.length === 0) {
    throw new Error("No hay guías subidas por tu matriz para descargar.");
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const grupo of lista) {
    const carpeta = lista.length > 1 ? zip.folder(slugArchivo(grupo.nombre) || "ruta") : zip;
    for (let i = 0; i < grupo.items.length; i += 1) {
      const item = grupo.items[i];
      const respuesta = await fetch(urlArchivoTransferencia(item.guia));
      if (!respuesta.ok) throw new Error("No se pudo descargar una de las guías.");
      const blob = await respuesta.blob();
      const etiqueta = item.etiqueta || `guia-${i + 1}`;
      carpeta.file(`${slugArchivo(etiqueta)}.pdf`, blob);
    }
  }

  const contenido = await zip.generateAsync({ type: "blob" });
  dispararDescarga(contenido, `${slugArchivo(nombreZip)}.zip`);
}
