import * as XLSX from "xlsx";

function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatearCantidad(valor) {
  if (valor === null || valor === undefined || valor === "") return "";

  if (typeof valor === "number") {
    return valor.toFixed(2).replace(".", ",");
  }

  const limpio = String(valor).trim().replace(/\s+/g, "");
  if (/^\d+[.,]\d+$/.test(limpio)) {
    const n = Number(limpio.replace(",", "."));
    if (!Number.isNaN(n)) return n.toFixed(2).replace(".", ",");
  }
  if (/^\d+$/.test(limpio)) return `${limpio},00`;
  return String(valor).trim();
}

function buscarEncabezados(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const normalizados = row.map((c) => normalizar(c));
    const idxCodigo = normalizados.findIndex(
      (c) => c === "codigo" || c.includes("codigo")
    );
    const idxProducto = normalizados.findIndex(
      (c) => c === "producto" || c.includes("producto")
    );
    const idxCantidad = normalizados.findIndex(
      (c) => c === "cantidad" || c.includes("cantidad")
    );

    if (idxCodigo >= 0 && idxProducto >= 0 && idxCantidad >= 0) {
      return { rowIndex: i, idxCodigo, idxProducto, idxCantidad };
    }
  }
  return null;
}

function extraerCabecera(rows) {
  const textoPlano = rows
    .flat()
    .map((c) => String(c ?? ""))
    .join(" ");

  const numero = textoPlano.match(/\bTRB-\d+\b/i)?.[0] ?? null;

  let bodegaOrigen = null;
  let bodegaDestino = null;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const textoFila = row.map((c) => String(c ?? "")).join(" ").trim();
    if (!textoFila) continue;

    const matchAmbas = textoFila.match(
      /bodega origen:\s*(.+?)\s+bodega destino:\s*(.+)$/i
    );
    if (matchAmbas) {
      bodegaOrigen = bodegaOrigen ?? matchAmbas[1].trim();
      bodegaDestino = bodegaDestino ?? matchAmbas[2].trim();
      continue;
    }

    const matchOrigen = textoFila.match(/bodega origen:\s*(.+)$/i);
    if (
      matchOrigen &&
      !/bodega destino/i.test(matchOrigen[1]) &&
      matchOrigen[1].trim()
    ) {
      bodegaOrigen = bodegaOrigen ?? matchOrigen[1].trim();
    }

    const matchDestino = textoFila.match(/bodega destino:\s*(.+)$/i);
    if (
      matchDestino &&
      !/bodega origen/i.test(matchDestino[1]) &&
      matchDestino[1].trim()
    ) {
      bodegaDestino = bodegaDestino ?? matchDestino[1].trim();
    }

    const normRow = row.map((c) => normalizar(c));
    const idxOrigenLabel = normRow.findIndex((c) =>
      c.startsWith("bodega origen")
    );
    const idxDestinoLabel = normRow.findIndex((c) =>
      c.startsWith("bodega destino")
    );

    if (
      (idxOrigenLabel >= 0 || idxDestinoLabel >= 0) &&
      r + 1 < rows.length &&
      (!bodegaOrigen || !bodegaDestino)
    ) {
      const nextRow = rows[r + 1].map((c) => String(c ?? "").trim());
      const valores = nextRow.filter(Boolean);
      if (!bodegaOrigen && valores[0]) bodegaOrigen = valores[0];
      if (!bodegaDestino && valores[1]) bodegaDestino = valores[1];
    }

    for (let i = 0; i < row.length; i++) {
      const cell = String(row[i] ?? "").trim();
      const cellNorm = normalizar(cell);
      const next = String(row[i + 1] ?? "").trim();

      if (cellNorm.startsWith("bodega origen")) {
        const inCell = cell.match(/bodega origen:\s*(.+)$/i)?.[1]?.trim();
        if (inCell && !/bodega destino/i.test(inCell)) {
          bodegaOrigen = bodegaOrigen ?? inCell;
        } else if (next && !/bodega destino/i.test(next)) {
          bodegaOrigen = bodegaOrigen ?? next;
        }
      }

      if (cellNorm.startsWith("bodega destino")) {
        const inCell = cell.match(/bodega destino:\s*(.+)$/i)?.[1]?.trim();
        if (inCell && !/bodega origen/i.test(inCell)) {
          bodegaDestino = bodegaDestino ?? inCell;
        } else if (next && !/bodega origen/i.test(next)) {
          bodegaDestino = bodegaDestino ?? next;
        }
      }
    }
  }

  return { numero, bodegaOrigen, bodegaDestino };
}

export async function procesarTransferenciaExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!firstSheet) {
    return { numero: null, bodegaOrigen: null, bodegaDestino: null, productos: [] };
  }

  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
  const { numero, bodegaOrigen, bodegaDestino } = extraerCabecera(rows);
  const headers = buscarEncabezados(rows);

  const productos = [];

  if (headers) {
    for (let i = headers.rowIndex + 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const textoFila = row.map((c) => String(c ?? "")).join(" ").trim();
      const textoNorm = normalizar(textoFila);

      if (!textoFila) continue;
      if (
        textoNorm.startsWith("descripcion") ||
        textoNorm.startsWith("total")
      ) {
        break;
      }

      const codigo = String(row[headers.idxCodigo] ?? "").trim();
      const producto = String(row[headers.idxProducto] ?? "").trim();
      const cantidadRaw = row[headers.idxCantidad];
      const cantidad = formatearCantidad(cantidadRaw);

      if (!codigo || !producto || !cantidad) continue;

      productos.push({ codigo, producto, cantidad });
    }
  }

  return { numero, bodegaOrigen, bodegaDestino, productos };
}
