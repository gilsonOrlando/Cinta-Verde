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

  try {
    if (pdf.numPages > PAGINAS_MAX_PDF) {
      throw new Error(`${etiqueta} no puede tener más de 3 páginas.`);
    }
    return await leerTituloPdf(pdf, file, etiqueta);
  } finally {
    pdf.destroy?.();
  }
}

async function leerTituloPdf(pdf, file, etiqueta) {
  let titulo = "";
  try {
    const meta = await pdf.getMetadata();
    titulo = String(meta?.info?.Title ?? "").trim();
  } catch {
    titulo = "";
  }

  if (!titulo) {
    try {
      const pagina = await pdf.getPage(1);
      const contenido = await pagina.getTextContent();
      const texto = contenido.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      const numero = texto.match(
        /\b(?:N[uú]mero|No\.?)[:\s]*([A-Z]{2,6}-?\d{3,})\b/i
      );
      if (numero) titulo = numero[1].toUpperCase();
    } catch {
      titulo = "";
    }
  }

  if (!titulo) {
    titulo = String(file?.name ?? "").replace(/\.pdf$/i, "").trim();
  }

  return (titulo || etiqueta).slice(0, 180);
}
