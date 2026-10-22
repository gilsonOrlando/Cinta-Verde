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
    return await leerTituloPdf(pdf, file);
  } finally {
    pdf.destroy?.();
  }
}

function tituloUtil(valor) {
  const titulo = String(valor ?? "").replace(/\s+/g, " ").trim();
  if (!titulo) return "";
  if (/^(untitled|sin t[ií]tulo|document|transferencia|guia|gu[ií]a)$/i.test(titulo)) {
    return "";
  }
  return titulo.slice(0, 180);
}

function numeroDesdeTexto(texto) {
  const limpio = String(texto ?? "")
    .replace(/\s+/g, " ")
    .replace(/([A-Z]{2,6})\s*-\s*(\d)/gi, "$1-$2")
    .toUpperCase();

  const conEtiqueta = limpio.match(
    /N[UÚ]MERO\s*[:.\-]?\s*(TRB-\d{4,})/
  );
  if (conEtiqueta) return conEtiqueta[1];

  const trb = limpio.match(/\b(TRB-\d{4,})\b/);
  if (trb) return trb[1];

  const trbEspacio = limpio.match(/\bTRB\s+(\d{4,})\b/);
  if (trbEspacio) return `TRB-${trbEspacio[1]}`;

  const otro = limpio.match(/N[UÚ]MERO\s*[:.\-]?\s*([A-Z]{2,6}-\d{3,})/);
  if (otro) return otro[1];

  return "";
}

async function textoDelPdf(pdf) {
  const partes = [];
  const paginas = Math.min(pdf.numPages || 1, PAGINAS_MAX_PDF);
  for (let i = 1; i <= paginas; i += 1) {
    const pagina = await pdf.getPage(i);
    const contenido = await pagina.getTextContent();
    const fragmentos = contenido.items.map((item) => ("str" in item ? item.str : ""));
    partes.push(fragmentos.join(" "), fragmentos.join(""));
  }
  return partes.join(" ");
}

async function leerTituloPdf(pdf, file) {
  try {
    const texto = await textoDelPdf(pdf);
    const numero = numeroDesdeTexto(texto);
    if (numero) return numero;
  } catch {
    /* sigue con metadatos o archivo */
  }

  try {
    const meta = await pdf.getMetadata();
    const deMeta = numeroDesdeTexto(meta?.info?.Title) || tituloUtil(meta?.info?.Title);
    if (deMeta) return deMeta;
  } catch {
    /* sigue con el nombre de archivo */
  }

  const archivo = String(file?.name ?? "").replace(/\.pdf$/i, "");
  return numeroDesdeTexto(archivo) || tituloUtil(archivo) || "Sin título";
}
