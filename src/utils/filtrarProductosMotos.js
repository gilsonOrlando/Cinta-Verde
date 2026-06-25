function limpiarNombreProductoMoto(nombre) {
  let texto = String(nombre ?? "").trim();
  const conCodigo = texto.match(/^\d{4,6}\s+(.+)$/);
  if (conCodigo) texto = conCodigo[1].trim();
  return texto.replace(/\s+/g, " ");
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

      mapa.set(item.codigo, {
        codigo: item.codigo,
        producto: limpiarNombreProductoMoto(item.producto),
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

function limpiarProductoMoto(nombre) {
  return limpiarNombreProductoMoto(nombre)
    .replace(/\s+\d{4}\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function esLineaDetalleProducto(linea) {
  return /(?:^|\s)(?:\d+\s+)?(?:DISCO\s*\(\d+\)\s+)?UN\s+[\d,]+/i.test(linea);
}

function extraerCantidadDeDetalle(linea) {
  const match = String(linea ?? "").match(
    /(?:\d+\s+)?(?:DISCO\s*\(\d+\)\s+)?UN\s+([\d,]+)/i
  );
  return match?.[1] ?? null;
}

function separarProductoYCantidadEnLinea(texto) {
  const match = String(texto ?? "").match(/^(.+?)\s+UN\s+([\d,]+)(?:\s+[\d,]+)?$/i);
  if (!match) {
    return { producto: limpiarProductoMoto(texto), cantidad: null };
  }

  return {
    producto: limpiarProductoMoto(match[1]),
    cantidad: match[2],
  };
}

function esInicioRegistroProducto(linea) {
  return /^\d{4,6}(?:\s+.+)?$/.test(linea) && !esLineaDetalleProducto(linea);
}

function leerBloqueProducto(lineas, indiceInicial) {
  const linea = lineas[indiceInicial];
  if (!esInicioRegistroProducto(linea)) return null;

  const soloCodigo = linea.match(/^(\d{4,6})$/);
  const conTexto = linea.match(/^(\d{4,6})\s+(.+)$/);

  const codigo = (soloCodigo || conTexto)[1];
  const partes = conTexto ? [conTexto[2].trim()] : [];
  let j = indiceInicial + 1;

  if (conTexto) {
    const enLinea = separarProductoYCantidadEnLinea(conTexto[2]);
    if (enLinea.cantidad) {
      return {
        siguienteIndice: indiceInicial,
        item: { codigo, producto: enLinea.producto, cantidad: enLinea.cantidad },
      };
    }
  }

  while (j < lineas.length) {
    const siguiente = lineas[j];

    if (esLineaDetalleProducto(siguiente)) break;
    if (/^UN$/i.test(siguiente)) break;
    if (/^\d{5,6}$/.test(siguiente)) break;
    if (/^\d{4,6}\s+\S/.test(siguiente)) break;

    partes.push(siguiente);
    j++;
  }

  let cantidad = null;

  if (j < lineas.length) {
    if (/^UN$/i.test(lineas[j]) && /^[\d,]+$/.test(lineas[j + 1] ?? "")) {
      cantidad = lineas[j + 1];
    } else {
      cantidad = extraerCantidadDeDetalle(lineas[j]);
    }
  }

  const producto = limpiarProductoMoto(partes.join(" "));

  if (!cantidad || !producto) {
    return { siguienteIndice: j, item: null };
  }

  return {
    siguienteIndice: j,
    item: { codigo, producto, cantidad },
  };
}

function extraerProductosMotoPorBloques(lineas) {
  const productos = [];

  for (let i = 0; i < lineas.length; i++) {
    if (!esInicioRegistroProducto(lineas[i])) continue;

    const bloque = leerBloqueProducto(lineas, i);
    if (!bloque) continue;

    if (bloque.item && esProductoMoto(bloque.item)) {
      productos.push(bloque.item);
    }

    i = Math.max(i, bloque.siguienteIndice);
  }

  return productos;
}

function extraerProductosMotoPorRegex(textoUnaLinea) {
  const productos = [];
  const regexBloque =
    /(\d{4,6})\s+((?:MOTO\S*)\s+.+?)(?:\s+\d{4})?\s+(?:\d+\s+(?:DISCO\s*\(\d+\)\s+)?)?UN\s+([\d,]+)(?:\s+[\d,]+)?/gi;

  let match;
  regexBloque.lastIndex = 0;

  while ((match = regexBloque.exec(textoUnaLinea)) !== null) {
    productos.push({
      codigo: match[1],
      producto: limpiarProductoMoto(match[2]),
      cantidad: match[3],
    });
  }

  return productos;
}

export function extraerProductosMotoDeTexto(text) {
  const textoPlano = normalizarTextoPdf(text);
  const textoUnaLinea = textoPlano.replace(/\n+/g, " ");
  const lineas = textoPlano
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  return combinarProductosMotos([
    extraerProductosMotoPorRegex(textoUnaLinea),
    extraerProductosMotoPorBloques(lineas),
  ]);
}

export function obtenerProductosMotosDesdeTransferencia(productos) {
  return combinarProductosMotos([productos]);
}

export function obtenerProductosMotosDesdeTexto(text, productosTransferencia = []) {
  return combinarProductosMotos([
    productosTransferencia,
    extraerProductosMotoDeTexto(text),
  ]);
}
