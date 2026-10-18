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
  } catch {
    throw new Error(`${etiqueta} no es un PDF válido.`);
  }

  if (pdf.numPages > PAGINAS_MAX_PDF) {
    throw new Error(`${etiqueta} no puede tener más de 3 páginas.`);
  }
}
