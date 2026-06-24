import * as XLSX from "xlsx";

/** Columnas fijas por posición: A, B, C, D. La fila 0 del Excel es solo encabezado. */
export const COLUMNAS_TOMA_FISICA = [
  "codigo",
  "producto",
  "cantidad_sistema",
  "cantidad_toma_fisica",
];

function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function celdaTexto(valor) {
  if (valor === null || valor === undefined) return "";

  if (typeof valor === "number" && Number.isFinite(valor)) {
    return String(Number.isInteger(valor) ? valor : valor);
  }

  return String(valor).trim();
}

function formatearCantidad(valor) {
  if (valor === null || valor === undefined || valor === "") return "0,00";

  if (typeof valor === "number") {
    return valor.toFixed(2).replace(".", ",");
  }

  const limpio = String(valor).trim().replace(/\s+/g, "");
  if (/^\d+[.,]\d+$/.test(limpio)) {
    const n = Number(limpio.replace(",", "."));
    if (!Number.isNaN(n)) return n.toFixed(2).replace(".", ",");
  }
  if (/^\d+$/.test(limpio)) return `${limpio},00`;

  return String(valor).trim() || "0,00";
}

function leerProductosDesdeHoja(sheet) {
  if (!sheet?.["!ref"]) return [];

  const filas = XLSX.utils.sheet_to_json(sheet, {
    header: COLUMNAS_TOMA_FISICA,
    range: 1,
    defval: "",
  });

  const productos = [];

  for (const fila of filas) {
    const codigo = celdaTexto(fila.codigo);
    const producto = celdaTexto(fila.producto);

    if (!codigo && !producto) continue;
    if (normalizar(codigo) === "codigo") continue;

    const textoFila = [codigo, producto].join(" ");
    if (normalizar(textoFila).startsWith("total")) break;

    if (!codigo || !producto) continue;

    productos.push({
      codigo,
      producto,
      cantidad_sistema: formatearCantidad(fila.cantidad_sistema),
      cantidad_toma_fisica: formatearCantidad(fila.cantidad_toma_fisica),
    });
  }

  return productos;
}

function ordenarHojas(nombres) {
  return [...nombres].sort((a, b) => {
    const score = (nombre) => {
      const texto = nombre.toLowerCase();
      if (texto.includes("toma") || texto.includes("fisica")) return 0;
      return 1;
    };
    return score(a) - score(b);
  });
}

export async function procesarTomaFisicaExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  if (!workbook.SheetNames.length) {
    return { productos: [] };
  }

  for (const nombre of ordenarHojas(workbook.SheetNames)) {
    const productos = leerProductosDesdeHoja(workbook.Sheets[nombre]);
    if (productos.length > 0) {
      return { productos };
    }
  }

  const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
  return { productos: leerProductosDesdeHoja(primeraHoja) };
}
