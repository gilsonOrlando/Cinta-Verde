const CODIGO_PRODUCTO = /^\d{4,6}$/;
const PALABRAS_EXCLUIDAS =
  /bodega|transferencia|n[uú]mero|p[aá]gina|tel[eé]fono|direcci[oó]n|fecha|usuario|impresi[oó]n|electrohogar|producto|unidad|inform|recibido|descripci[oó]n|total|central|fact|pedido|lote/i;

const REGEX_DETALLE_CON_LOTE =
  /^(\d+)\s+(?:DISCO\s*\(\d+\)\s+)?UN\s+([\d,]+)\s+[\d,]+\s*$/i;

const REGEX_DETALLE_SIN_LOTE = /^UN\s+([\d,]+)\s+[\d,]+\s*$/i;

const REGEX_BLOQUE_PRODUCTO =
  /(\d{4,6})\s+(.+?)\s+(?:\d+\s+(?:DISCO\s*\(\d+\)\s+)?)?UN\s+([\d,]+)\s+[\d,]+/gi;

function normalizarTexto(text) {
  return text
    .replace(/\t/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ ]+/g, " ")
    .replace(/\n[ ]+/g, "\n")
    .trim();
}

function limpiarProducto(nombre) {
  return nombre.replace(/\s+/g, " ").replace(/\++\s*$/, "").trim();
}

function esLineaEncabezadoTabla(linea) {
  return (
    /producto/i.test(linea) &&
    (/c[oó]digo/i.test(linea) || /cantidad/i.test(linea) || /unidad/i.test(linea))
  );
}

function esLineaBasura(linea) {
  if (!linea || linea.length < 2) return true;
  if (PALABRAS_EXCLUIDAS.test(linea)) return true;
  if (/^inform$/i.test(linea)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(linea)) return true;
  if (/^p[aá]gina\s+\d+/i.test(linea)) return true;
  if (/^total:/i.test(linea)) return true;
  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(linea)) return true;
  return false;
}

function esLineaTotalCantidad(linea) {
  return /^\d{1,4},\d{2}$/.test(linea);
}

function esCantidadSola(linea) {
  return /^[\d]+,\d{2}$/.test(linea);
}

function esLineaProductoInline(linea) {
  const match = linea.match(/^(\d{4,6})\s+(.+)$/);
  if (!match) return null;

  const codigo = match[1];
  const producto = limpiarProducto(match[2]);

  if (!CODIGO_PRODUCTO.test(codigo)) return null;
  if (esLineaBasura(linea)) return null;
  if (/\bUN\b/i.test(linea)) return null;
  if (/DISCO/i.test(linea)) return null;
  if (/\d+,\d+/.test(linea)) return null;
  if (producto.length < 3) return null;

  return { codigo, producto };
}

function esLineaDetalle(linea) {
  const conLote = linea.match(REGEX_DETALLE_CON_LOTE);
  if (conLote) return { cantidad: conLote[2] };

  const sinLote = linea.match(REGEX_DETALLE_SIN_LOTE);
  if (sinLote) return { cantidad: sinLote[1] };

  return null;
}

function encontrarLimitesTabla(lines) {
  let inicio = 0;
  let fin = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (esLineaEncabezadoTabla(lines[i])) {
      inicio = i + 1;
      while (inicio < lines.length && esLineaBasura(lines[inicio])) {
        inicio++;
      }
      break;
    }
  }

  if (inicio === 0) {
    const idxBodega = lines.findIndex((l) => /bodega destino:/i.test(l));
    if (idxBodega >= 0) {
      inicio = idxBodega;
    }
  }

  for (let i = Math.max(inicio, 1); i < lines.length; i++) {
    if (/^descripci[oó]n\b/i.test(lines[i]) || /^total:/i.test(lines[i])) {
      fin = i;
      break;
    }
  }

  if (inicio >= fin) {
    inicio = 0;
    fin = lines.length;
  }

  return { inicio, fin };
}

function extraerRegionProductos(text) {
  const normalizado = normalizarTexto(text);
  const lower = normalizado.toLowerCase();

  const inicioBodega = lower.indexOf("bodega destino:");
  const inicio = inicioBodega >= 0 ? inicioBodega : 0;

  const resto = normalizado.slice(inicio);
  const finDescripcion = resto.search(/\bdescripci[oó]n\b/i);
  const finTotal = resto.search(/\btotal:/i);

  let fin = resto.length;
  if (finDescripcion >= 0) fin = Math.min(fin, finDescripcion);
  if (finTotal >= 0) fin = Math.min(fin, finTotal);

  return resto.slice(0, fin).replace(/\s+/g, " ").trim();
}

function combinarProductos(listas) {
  const mapa = new Map();

  for (const lista of listas) {
    for (const item of lista) {
      if (!item?.codigo || !item?.producto || !item?.cantidad) continue;
      mapa.set(item.codigo, item);
    }
  }

  return [...mapa.values()];
}

function parseProductosInline(lines, inicio, fin) {
  const productos = [];

  for (let i = inicio; i < fin; i++) {
    const linea = lines[i];
    if (esLineaBasura(linea) || esLineaTotalCantidad(linea)) continue;

    const producto = esLineaProductoInline(linea);
    if (!producto) continue;

    const siguiente = lines[i + 1];
    if (!siguiente) continue;

    const detalle = esLineaDetalle(siguiente);
    if (!detalle) continue;

    productos.push({
      codigo: producto.codigo,
      producto: producto.producto,
      cantidad: detalle.cantidad,
    });

    i++;
  }

  return productos;
}

function parseProductosFragmentados(lines, inicio, fin) {
  const productos = [];
  let i = inicio;

  while (i < fin) {
    const linea = lines[i];

    if (esLineaBasura(linea) || esLineaTotalCantidad(linea)) {
      i++;
      continue;
    }

    let codigo = null;
    const productoPartes = [];

    const inline = esLineaProductoInline(linea);
    if (inline) {
      codigo = inline.codigo;
      productoPartes.push(inline.producto);
      i++;
    } else if (/^\d{4,6}$/.test(linea)) {
      codigo = linea;
      i++;

      while (i < fin) {
        const actual = lines[i];

        if (/^\d{4,6}$/.test(actual)) break;
        if (esLineaDetalle(actual) || /^UN$/i.test(actual)) break;
        if (esCantidadSola(actual)) break;
        if (/^descripci[oó]n\b/i.test(actual)) break;
        if (/^DISCO/i.test(actual)) {
          i++;
          continue;
        }
        if (esLineaBasura(actual)) {
          i++;
          continue;
        }

        productoPartes.push(actual);
        i++;
      }
    } else {
      i++;
      continue;
    }

    while (i < fin && (/^\d{4,6}$/.test(lines[i]) || /^DISCO/i.test(lines[i]))) {
      i++;
    }

    let cantidad = null;

    if (i < fin && esLineaDetalle(lines[i])) {
      cantidad = esLineaDetalle(lines[i]).cantidad;
      i++;
    } else if (i < fin && /^UN$/i.test(lines[i])) {
      i++;
      if (i < fin && esCantidadSola(lines[i])) {
        cantidad = lines[i];
        i++;
        if (i < fin && esCantidadSola(lines[i])) i++;
      }
    } else if (i < fin && esCantidadSola(lines[i])) {
      cantidad = lines[i];
      i++;
      if (i < fin && esCantidadSola(lines[i])) i++;
    }

    if (codigo && productoPartes.length > 0 && cantidad) {
      productos.push({
        codigo,
        producto: limpiarProducto(productoPartes.join(" ")),
        cantidad,
      });
    }
  }

  return productos;
}

function parseProductosPorBloques(textoTabla) {
  if (!textoTabla) return [];

  const productos = [];
  let match;

  REGEX_BLOQUE_PRODUCTO.lastIndex = 0;

  while ((match = REGEX_BLOQUE_PRODUCTO.exec(textoTabla)) !== null) {
    const codigo = match[1];
    const producto = limpiarProducto(match[2]);
    const cantidad = match[3];

    if (!CODIGO_PRODUCTO.test(codigo)) continue;
    if (PALABRAS_EXCLUIDAS.test(producto)) continue;
    if (/\bUN\b/i.test(producto) || /DISCO/i.test(producto)) continue;
    if (producto.length < 3) continue;

    productos.push({ codigo, producto, cantidad });
  }

  return productos;
}

function parseProductos(text) {
  const normalizado = normalizarTexto(text);
  const lines = normalizado
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const { inicio, fin } = encontrarLimitesTabla(lines);
  const regionProductos = extraerRegionProductos(normalizado);
  const textoLineas = lines.slice(inicio, fin).join(" ");

  return combinarProductos([
    parseProductosInline(lines, inicio, fin),
    parseProductosFragmentados(lines, inicio, fin),
    parseProductosPorBloques(textoLineas),
    parseProductosPorBloques(regionProductos),
    parseProductosPorBloques(normalizado.replace(/\s+/g, " ")),
  ]);
}

export function parseTransferenciaPdf(text) {
  const normalizado = normalizarTexto(text);
  const lines = normalizado
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const numero =
    normalizado.match(/N[uú]mero:\s*(\S+)/i)?.[1] ??
    normalizado.match(/\bTRB-\d+\b/i)?.[0] ??
    null;

  const bodegasMatch = normalizado.match(
    /Bodega Origen:\s*(.+?)\s+Bodega Destino:\s*(.+?)(?:\s+Producto|\n|$)/i
  );

  const bodegaOrigen = bodegasMatch?.[1]?.trim() ?? null;
  const bodegaDestino = bodegasMatch?.[2]?.trim() ?? null;

  const productos = parseProductos(normalizado);

  return {
    numero,
    bodegaOrigen,
    bodegaDestino,
    productos,
  };
}

export async function procesarTransferenciaPdf(file, extractText) {
  const text = await extractText(file);
  return parseTransferenciaPdf(text);
}
