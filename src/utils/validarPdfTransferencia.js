import * as pdfjsLib from "pdfjs-dist";
import { resolvePublicAsset } from "./resolvePublicAsset";

pdfjsLib.GlobalWorkerOptions.workerSrc = resolvePublicAsset("pdf.worker.min.mjs");

export const TAMANO_MAX_PDF = 5 * 1024 * 1024;
export const PAGINAS_MAX_PDF = 3;

export async function validarPdfTransferencia(file, etiqueta) {
  if (!file) throw new Error(`Selecciona el PDF de ${etiqueta}.`);

  const nombre = String(file.name ?? "").toLowerCase();
  const tipo = String(file.type ?? "");
  if (tipo !== "application/pdf" && !nombre.endsWith(".pdf")) {
    throw new Error(`${etiqueta} debe ser un archivo PDF.`);
  }

  if (file.size > TAMANO_MAX_PDF) {
    throw new Error(`${etiqueta} no puede superar 5 MB.`);
  }

  const buffer = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    if (pdf.numPages > PAGINAS_MAX_PDF) {
      throw new Error(`${etiqueta} no puede tener más de 3 páginas.`);
    }
    return await extraerTituloPdf(pdf, file);
  } catch (error) {
    if (error?.message?.includes("no puede tener más de")) throw error;
    if (error?.message?.startsWith(`${etiqueta}`)) throw error;
    throw new Error(`${etiqueta} no es un PDF válido.`);
  } finally {
    pdf?.destroy();
  }
}

function recortarTitulo(texto) {
  return String(texto ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}

async function extraerTituloPdf(pdf, file) {
  try {
    const meta = await pdf.getMetadata();
    const tituloMeta = recortarTitulo(meta?.info?.Title);
    if (tituloMeta && !/^untitled$/i.test(tituloMeta)) return tituloMeta;
  } catch {
    /* sin metadatos */
  }

  try {
    const pagina = await pdf.getPage(1);
    const contenido = await pagina.getTextContent();
    const texto = recortarTitulo(
      contenido.items.map((item) => ("str" in item ? item.str : "")).join(" ")
    );
    const numero = texto.match(
      /n[uú]mero\s*[:.]?\s*([a-z]{1,6}[-/\s]?\d{3,})/i
    );
    if (numero?.[1]) return recortarTitulo(numero[1].toUpperCase());
  } catch {
    /* sin texto */
  }

  const archivo = recortarTitulo(String(file?.name ?? "").replace(/\.pdf$/i, ""));
  return archivo || "Transferencia";
}
