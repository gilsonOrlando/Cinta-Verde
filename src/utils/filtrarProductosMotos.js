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

function combinarRegistrosUn(listas) {
  const mapa = new Map();

  for (const lista of listas) {
    for (const item of lista) {
      if (!item?.codigo || !item?.producto || !item?.cantidad) continue;
      mapa.set(item.codigo, item);
    }
  }

  return [...mapa.values()];
}

export function diagnosticarCapturaMotos(text, transferenciaProductos = []) {
  const textoPlano = normalizarTextoPdf(text);
  const textoContinuo = textoPlano.replace(/\n+/g, " ");
  const lineas = textoPlano
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  const registrosUn = combinarRegistrosUn([
    extraerRegistrosPorUnEnTexto(textoContinuo),
    extraerRegistrosPorAnclasUn(lineas),
  ]);

  const motos = extraerProductosMotoDeTexto(text);

  return {
    textoPlano,
    lineas,
    registrosUn,
    transferenciaProductos,
    motos,
  };
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatearListaProductos(productos, vacio = "(ninguno)") {
  if (!productos?.length) return vacio;

  return productos
    .map((item) => {
      const primera = item.producto.split(/\s+/)[0] ?? "";
      const esMoto = esProductoMoto(item) ? "SÍ" : "NO";
      return `• ${item.codigo} | ${item.producto} | cant: ${item.cantidad} | MOTO: ${esMoto} (1ª palabra: ${primera})`;
    })
    .join("\n");
}

export function formatearDiagnosticoMotosHtml(diagnostico) {
  const maxTexto = 2800;
  const texto =
    diagnostico.textoPlano.length > maxTexto
      ? `${diagnostico.textoPlano.slice(0, maxTexto)}\n...\n[Total: ${diagnostico.textoPlano.length} caracteres]`
      : diagnostico.textoPlano;

  const lineas = diagnostico.lineas
    .map((linea, index) => `${String(index + 1).padStart(3, "0")}: ${linea}`)
    .join("\n");

  return `
    <div style="text-align:left;font-size:12px;line-height:1.45;max-height:65vh;overflow:auto">
      <p><strong>Resumen</strong></p>
      <ul style="margin:0 0 12px;padding-left:18px">
        <li>Líneas detectadas: ${diagnostico.lineas.length}</li>
        <li>Registros por UN (sin filtrar): ${diagnostico.registrosUn.length}</li>
        <li>Parser transferencia: ${diagnostico.transferenciaProductos.length}</li>
        <li>Motos finales (MOTO en 1ª palabra): ${diagnostico.motos.length}</li>
      </ul>

      <p><strong>Registros detectados con UN</strong></p>
      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:10px;border-radius:8px">${escaparHtml(formatearListaProductos(diagnostico.registrosUn))}</pre>

      <p><strong>Parser general (transferencia)</strong></p>
      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:10px;border-radius:8px">${escaparHtml(formatearListaProductos(diagnostico.transferenciaProductos))}</pre>

      <p><strong>Motos que se mostrarán</strong></p>
      <pre style="white-space:pre-wrap;background:#e8f5e9;padding:10px;border-radius:8px">${escaparHtml(formatearListaProductos(diagnostico.motos))}</pre>

      <p><strong>Líneas del PDF (numeradas)</strong></p>
      <pre style="white-space:pre-wrap;background:#fff8e1;padding:10px;border-radius:8px">${escaparHtml(lineas)}</pre>

      <p><strong>Texto plano capturado</strong></p>
      <pre style="white-space:pre-wrap;background:#fafafa;padding:10px;border-radius:8px;border:1px solid #eee">${escaparHtml(texto)}</pre>
    </div>
  `;
}
