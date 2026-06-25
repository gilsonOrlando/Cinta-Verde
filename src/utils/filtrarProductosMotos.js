const PALABRAS_EXCLUIDAS =
  /^(?:total|producto|c[oó]digo|unidad|lote|cantidad|recibido|descripci[oó]n)\b/i;

function limpiarNombreProductoMoto(nombre) {
  let texto = String(nombre ?? "").trim();
  const conCodigo = texto.match(/^\d{4,6}\s+(.+)$/);
  if (conCodigo) texto = conCodigo[1].trim();
  return texto.replace(/\s+/g, " ");
}

function limpiarProductoMoto(nombre) {
  return limpiarNombreProductoMoto(nombre);
}

export function esProductoMoto(valor) {
  const nombre =
    typeof valor === "object"
      ? limpiarNombreProductoMoto(valor?.producto)
      : limpiarNombreProductoMoto(valor);

  const primeraPalabra = nombre.split(/\s+/).find(Boolean)?.toUpperCase();
  return Boolean(primeraPalabra?.startsWith("MOTO"));
}

export function filtrarProductosMotos(productos) {
  return productos.filter((item) => esProductoMoto(item));
}

function combinarProductosMotos(listas) {
  const mapa = new Map();

  for (const lista of listas) {
    for (const item of lista) {
      if (!item?.codigo || !item?.producto || !item?.cantidad) continue;
      if (!esProductoMoto(item)) continue;
      if (PALABRAS_EXCLUIDAS.test(item.producto)) continue;

      mapa.set(item.codigo, {
        codigo: item.codigo,
        producto: limpiarProductoMoto(item.producto),
        cantidad: item.cantidad,
      });
    }
  }

  return [...mapa.values()];
}

function normalizarTextoPdf(text) {
  return String(text ?? "")
    .replace(/\t/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function esLineaEncabezado(linea) {
  return PALABRAS_EXCLUIDAS.test(linea) || /^inform$/i.test(linea);
}

function crearRegistro(codigo, producto, cantidad) {
  const item = {
    codigo: String(codigo ?? "").trim(),
    producto: limpiarProductoMoto(producto),
    cantidad: String(cantidad ?? "").trim(),
  };

  if (!item.codigo || !item.producto || !item.cantidad) return null;
  if (esLineaEncabezado(item.producto)) return null;
  return item;
}

/**
 * Regla principal: cada registro termina en "UN cantidad".
 * Estructura: [codigo] [nombre producto] [lote opcional] UN [cantidad] [recibido]
 */
function extraerRegistrosPorUnEnTexto(textoContinuo) {
  const productos = [];
  const regex =
    /(\d{4,6})\s+(.+?)(?:\s+\d+\s+(?:DISCO\s*\(\d+\)\s+)?)?\s+UN\s+([\d,]+)(?:\s+[\d,]+)?/gi;

  let match;
  regex.lastIndex = 0;

  while ((match = regex.exec(textoContinuo)) !== null) {
    const item = crearRegistro(match[1], match[2], match[3]);
    if (item) productos.push(item);
  }

  return productos;
}

function extraerRegistrosPorAnclasUn(lineas) {
  const productos = [];

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    let cantidad = null;
    let indiceUn = i;

    if (/^UN$/i.test(linea)) {
      const posibleCantidad = lineas[i + 1] ?? "";
      if (/^[\d,]+$/.test(posibleCantidad)) {
        cantidad = posibleCantidad;
      }
    } else {
      const detalle = linea.match(/\bUN\s+([\d,]+)/i);
      if (detalle) cantidad = detalle[1];
    }

    if (!cantidad) continue;

    const partes = [];
    let codigo = null;

    for (let j = indiceUn - 1; j >= 0; j--) {
      const anterior = lineas[j];

      if (esLineaEncabezado(anterior)) break;

      const codigoConTexto = anterior.match(/^(\d{4,6})\s+(.+)$/);
      if (codigoConTexto) {
        codigo = codigoConTexto[1];
        partes.unshift(codigoConTexto[2].trim());
        break;
      }

      if (/^\d{4,6}$/.test(anterior)) {
        codigo = anterior;
        break;
      }

      if (/^\d{4,6}\s+\S/.test(anterior)) break;

      partes.unshift(anterior);
    }

    if (!codigo || partes.length === 0) continue;

    const item = crearRegistro(codigo, partes.join(" "), cantidad);
    if (item) productos.push(item);
  }

  return productos;
}

export function extraerProductosMotoDeTexto(text) {
  const textoPlano = normalizarTextoPdf(text);
  const textoContinuo = textoPlano.replace(/\n+/g, " ");
  const lineas = textoPlano
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  return combinarProductosMotos([
    extraerRegistrosPorUnEnTexto(textoContinuo),
    extraerRegistrosPorAnclasUn(lineas),
  ]);
}

export function obtenerProductosMotosDesdeTransferencia(productos) {
  return combinarProductosMotos([productos]);
}

export function obtenerProductosMotosDesdeTexto(text, productosTransferencia = []) {
  return combinarProductosMotos([
    extraerProductosMotoDeTexto(text),
    productosTransferencia,
  ]);
}
