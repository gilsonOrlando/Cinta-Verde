import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const TAMANO_MAX_PDF = 5 * 1024 * 1024;
export const PAGINAS_MAX_PDF = 3;

export async function validarPdfTransferencia(file, etiqueta) {
  const info = await inspeccionarPdf(file, etiqueta);
  return info.trb || info.titulo;
}

export async function inspeccionarPdf(file, etiqueta = "PDF") {
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
    return await inspeccionarDocumento(pdf, file.name);
  } finally {
    pdf.destroy?.();
  }
}

export async function ordenarParTransferenciaGuia(archivoTransferencia, archivoGuia) {
  const [infoT, infoG] = await Promise.all([
    inspeccionarPdf(archivoTransferencia, "Transferencia"),
    inspeccionarPdf(archivoGuia, "Guía"),
  ]);

  const deltaT = infoT.puntaje.guia - infoT.puntaje.transferencia;
  const deltaG = infoG.puntaje.guia - infoG.puntaje.transferencia;
  const cruzados = deltaT > 0 && deltaG < 0;

  if (cruzados) {
    return {
      archivoTransferencia: archivoGuia,
      archivoGuia: archivoTransferencia,
      nombre: infoG.trb || infoG.titulo,
      nombreGuia: infoT.guia,
      cruzados: true,
    };
  }

  return {
    archivoTransferencia,
    archivoGuia,
    nombre: infoT.trb || infoT.titulo,
    nombreGuia: infoG.guia,
    cruzados: false,
  };
}

function tituloUtil(valor) {
  const titulo = String(valor ?? "").replace(/\s+/g, " ").trim();
  if (!titulo) return "";
  if (/^(untitled|sin t[ií]tulo|document|transferencia|guia|gu[ií]a)$/i.test(titulo)) {
    return "";
  }
  return titulo.slice(0, 180);
}

export function extraerTrb(texto) {
  const original = String(texto ?? "");
  const juntoAlNumero = original.match(/n[uú]mero\s*[:.]?\s*TRB[-\s]*(\d{5,})/i);
  if (juntoAlNumero) return `TRB-${juntoAlNumero[1]}`;
  const compacto = original.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const coincidencia = compacto.match(/TRB(\d{5,})/);
  return coincidencia ? `TRB-${coincidencia[1]}` : "";
}

export function extraerNumeroGuia(texto) {
  const original = String(texto ?? "");
  const sri = original.match(/\b\d{3}-\d{3}-\d{6,9}\b/);
  if (sri) return sri[0];
  const juntoGuia = original.match(/gu[ií]a(?:\s*de\s*remisi[oó]n)?[^0-9A-Z]{0,24}(\d{6,})/i);
  if (juntoGuia) return juntoGuia[1];
  const compacto = original.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const gre = compacto.match(/(?:GRE|GRR|GDR)(\d{5,})/);
  if (gre) return gre[1];
  const guia = compacto.match(/GUIA(\d{5,})/);
  if (guia) return guia[1];
  return "";
}

function puntuarDocumento(texto, fileName = "") {
  const nombre = String(fileName ?? "").toLowerCase();
  const plano = String(texto ?? "");
  const mayus = plano.toUpperCase();
  let transferencia = 0;
  let guia = 0;

  if (extraerTrb(plano)) transferencia += 4;
  if (/TRANSFER/.test(mayus)) transferencia += 2;
  if (/transfer|trb/.test(nombre)) transferencia += 3;

  if (/GU[IÍ]A|REMISI[OÓ]N/.test(mayus)) guia += 3;
  if (/guia|guía|remision|remisión/.test(nombre)) guia += 4;
  if (extraerNumeroGuia(plano)) guia += 2;

  if (/GU[IÍ]A/.test(mayus) && extraerTrb(plano)) {
    guia += 2;
    transferencia -= 2;
  }

  return { transferencia, guia };
}

function tipoSegunPuntaje(puntaje) {
  if (puntaje.guia > puntaje.transferencia) return "guia";
  if (puntaje.transferencia > puntaje.guia) return "transferencia";
  return "desconocido";
}

async function inspeccionarDocumento(pdf, fileName = "") {
  const texto = await textoDelPdf(pdf);
  const trb = extraerTrb(texto) || extraerTrb(fileName);
  const guia = extraerNumeroGuia(texto) || extraerNumeroGuia(fileName);
  const puntaje = puntuarDocumento(texto, fileName);
  const titulo = trb || tituloUtil(fileName.replace(/\.pdf$/i, "")) || "Sin título";
  return {
    texto,
    trb,
    guia,
    titulo,
    puntaje,
    tipo: tipoSegunPuntaje(puntaje),
  };
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

export async function inspeccionarBuffer(buffer, fileName = "") {
  const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
  try {
    return await inspeccionarDocumento(pdf, fileName);
  } finally {
    pdf.destroy?.();
  }
}

export async function extraerNombreDesdeBuffer(buffer, fileName = "") {
  const info = await inspeccionarBuffer(buffer, fileName);
  return info.trb || info.titulo;
}
