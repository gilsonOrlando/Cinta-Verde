import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

function extraerTrb(texto) {
  const compacto = String(texto ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const coincidencia = compacto.match(/TRB(\d{5,})/);
  return coincidencia ? `TRB-${coincidencia[1]}` : "";
}

async function textoDelPdf(pdf) {
  const partes = [];
  const paginas = Math.min(pdf.numPages || 1, PAGINAS_MAX_PDF);
  for (let i = 1; i <= paginas; i += 1) {
    const pagina = await pdf.getPage(i);
    const contenido = await pagina.getTextContent();
    const items = contenido.items.filter((item) => "str" in item && item.str);
    const ordenados = [...items].sort((a, b) => {
      const yA = a.transform?.[5] ?? 0;
      const yB = b.transform?.[5] ?? 0;
      if (Math.abs(yA - yB) > 8) return yB - yA;
      return (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0);
    });
    const lineas = [];
    let linea = [];
    let lastY = null;
    for (const item of ordenados) {
      const y = Math.round(item.transform?.[5] ?? 0);
      if (lastY !== null && Math.abs(y - lastY) > 8) {
        if (linea.length) lineas.push(linea.join(" "));
        linea = [];
      }
      linea.push(item.str);
      lastY = y;
    }
    if (linea.length) lineas.push(linea.join(" "));
    partes.push(lineas.join("\n"), items.map((item) => item.str).join(" "), items.map((item) => item.str).join(""));
  }
  return partes.join("\n");
}

async function leerTituloPdf(pdf, file) {
  try {
    const texto = await textoDelPdf(pdf);
    const numero = extraerTrb(texto);
    if (numero) return numero;
  } catch (error) {
    console.error("No se pudo leer el número del PDF de transferencia.", error);
  }

  try {
    const meta = await pdf.getMetadata();
    const deMeta = extraerTrb(meta?.info?.Title) || tituloUtil(meta?.info?.Title);
    if (deMeta) return deMeta;
  } catch {
    /* sigue con el nombre de archivo */
  }

  const archivo = String(file?.name ?? "").replace(/\.pdf$/i, "");
  return extraerTrb(archivo) || tituloUtil(archivo) || "Sin título";
}
