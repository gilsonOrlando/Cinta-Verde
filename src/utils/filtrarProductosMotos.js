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

  const primeraPalabra = nombre.split(/\s+/)[0]?.toUpperCase();
  return primeraPalabra === "MOTO";
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
    .replace(/[ ]+/g, " ")
    .trim();
}

function limpiarProductoMoto(nombre) {
  return limpiarNombreProductoMoto(nombre)
    .replace(/\s+\d{4}\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerCantidadDeDetalle(linea) {
  const match = String(linea ?? "").match(
    /^(?:\d+\s+)?(?:DISCO\s*\(\d+\)\s+)?UN\s+([\d,]+)/i
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

export function extraerProductosMotoDeTexto(text) {
  const productos = [];
  const textoPlano = normalizarTextoPdf(text);
  const textoUnaLinea = textoPlano.replace(/\n+/g, " ");

  const regexBloque =
    /(\d{4,6})\s+(MOTO\s+.+?)(?:\s+\d{4})?\s+(?:\d+\s+(?:DISCO\s*\(\d+\)\s+)?)?UN\s+([\d,]+)(?:\s+[\d,]+)?/gi;

  let match;
  regexBloque.lastIndex = 0;

  while ((match = regexBloque.exec(textoUnaLinea)) !== null) {
    productos.push({
      codigo: match[1],
      producto: limpiarProductoMoto(match[2]),
      cantidad: match[3],
    });
  }

  const lineas = textoPlano
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const inicio = linea.match(/^(\d{4,6})\s+(MOTO\s+.*)$/i);
    if (!inicio) continue;

    const codigo = inicio[1];
    const primeraParte = inicio[2].trim();
    const enMismaLinea = separarProductoYCantidadEnLinea(primeraParte);

    if (enMismaLinea.cantidad && esProductoMoto(enMismaLinea.producto)) {
      productos.push({
        codigo,
        producto: enMismaLinea.producto,
        cantidad: enMismaLinea.cantidad,
      });
      continue;
    }

    const partes = [primeraParte];
    let j = i + 1;

    while (j < lineas.length) {
      const siguiente = lineas[j];

      if (/^\d{4,6}(\s|$)/.test(siguiente)) break;
      if (/^(?:\d+\s+)?(?:DISCO\s*\(\d+\)\s+)?UN\s+[\d,]+/i.test(siguiente)) break;

      partes.push(siguiente);
      j++;
    }

    let cantidad = null;

    if (j < lineas.length) {
      cantidad = extraerCantidadDeDetalle(lineas[j]);
    }

    const producto = limpiarProductoMoto(partes.join(" "));

    if (cantidad && esProductoMoto(producto)) {
      productos.push({ codigo, producto, cantidad });
    }

    i = Math.max(i, j - 1);
  }

  return combinarProductosMotos([productos]);
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
