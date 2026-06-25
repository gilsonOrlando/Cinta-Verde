import QRCode from "qrcode";
import {
  contarHojasImpresion,
  escaparHtml,
  expandirEtiquetasPorCantidad,
  parseCantidadEtiquetas,
} from "./imprimirEtiqueta.js";

export { parseCantidadEtiquetas };

export function formatearAgenciaDesdeBodega(bodegaDestino) {
  const texto = String(bodegaDestino ?? "").trim();
  if (!texto) return "Ag. Catamayo";

  let agencia = texto
    .replace(/^bodega\s+(destino:?\s*)?/i, "")
    .replace(/^destino:?\s*/i, "")
    .trim();

  if (!agencia) return "Ag. Catamayo";
  if (/^ag\.?\s/i.test(agencia)) return agencia;
  return `Ag. ${agencia}`;
}

function truncarLinea(texto, maxChars) {
  const limpio = String(texto ?? "").trim();
  if (limpio.length <= maxChars) return limpio;
  if (maxChars <= 1) return "…";
  return `${limpio.slice(0, maxChars - 1)}…`;
}

function dividirNombreProducto(nombre, maxLineas = 2, maxCharsPorLinea = 24) {
  const palabras = String(nombre ?? "")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) return ["", ""];

  const lineas = [];
  let actual = "";

  for (let i = 0; i < palabras.length; i++) {
    const palabra = truncarLinea(palabras[i], maxCharsPorLinea);
    const candidato = actual ? `${actual} ${palabra}` : palabra;

    if (candidato.length <= maxCharsPorLinea || !actual) {
      actual = candidato;
    } else {
      lineas.push(truncarLinea(actual, maxCharsPorLinea));
      actual = palabra;
      if (lineas.length >= maxLineas) break;
    }

    if (lineas.length === maxLineas - 1) {
      actual = truncarLinea(palabras.slice(i).join(" "), maxCharsPorLinea);
      break;
    }
  }

  if (lineas.length < maxLineas && actual) {
    lineas.push(truncarLinea(actual, maxCharsPorLinea));
  }

  while (lineas.length < maxLineas) {
    lineas.push("");
  }

  return lineas.slice(0, maxLineas);
}

function tamanoFuenteCam(valor) {
  const longitud = String(valor ?? "").length;
  if (longitud <= 8) return "10pt";
  if (longitud <= 10) return "8.5pt";
  if (longitud <= 12) return "7.5pt";
  return "6.5pt";
}

function tamanoFuenteFooter(valor) {
  const longitud = String(valor ?? "").length;
  if (longitud <= 18) return "7.2pt";
  if (longitud <= 22) return "6.8pt";
  return "6.2pt";
}

function estilosEtiquetaMoto() {
  return `
    @page {
      size: 70mm 51mm;
      margin: 0;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @media screen {
      html, body {
        width: 100%;
        min-height: 100%;
        background: #d4d4d4;
      }

      body {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .preview-hoja {
        background: #fff;
        padding: 20px;
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
        border-radius: 2px;
        transform: scale(1.35);
        transform-origin: center center;
      }
    }

    @media print {
      html, body { background: #fff; }
      body { display: block; padding: 0; }
      .preview-hoja {
        padding: 0;
        box-shadow: none;
        transform: none;
      }
    }

    .celda-moto {
      width: 70mm;
      height: 51mm;
      border: 0.45mm solid #000;
      border-radius: 2.5mm;
      padding: 1.8mm 2mm 1.6mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #fff;
    }

    .moto-header {
      text-align: center;
      font-weight: 700;
      text-transform: uppercase;
      line-height: 1.14;
      font-size: 8.8pt;
      flex-shrink: 0;
      margin-bottom: 0.8mm;
    }

    .moto-header div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .moto-body {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 1.8mm;
      flex: 1;
      min-height: 0;
      margin-bottom: 0.8mm;
    }

    .moto-izq {
      display: flex;
      align-items: flex-start;
      gap: 0.5mm;
      flex: 0 0 auto;
      min-width: 0;
    }

    .moto-factura {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 2.1mm;
      height: 19mm;
      display: flex;
      align-items: center;
    }

    .moto-qr-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3mm;
      width: 19mm;
    }

    .moto-cod {
      font-size: 6pt;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .moto-qr {
      width: 19mm;
      height: 19mm;
      object-fit: contain;
      display: block;
    }

    .moto-qr-link {
      display: block;
      line-height: 0;
      text-decoration: none;
      cursor: pointer;
    }

    .moto-mega-acceso {
      font-size: 4pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-align: center;
      color: #000;
      line-height: 1.05;
      max-width: 19mm;
    }

    @media print {
      .moto-qr-link {
        pointer-events: none;
        cursor: default;
      }
    }

    .moto-caja {
      width: 19mm;
      height: 19mm;
      flex: 0 0 19mm;
      margin-top: 2.1mm;
      border: 0.4mm solid #000;
      border-radius: 1.8mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .moto-caja-header {
      font-size: 4.2pt;
      font-weight: 600;
      text-align: center;
      padding: 0.35mm 0.5mm;
      border-bottom: 0.3mm solid #000;
      letter-spacing: 0.01em;
      line-height: 1.1;
      flex-shrink: 0;
    }

    .moto-caja-valor {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      text-align: center;
      padding: 0.3mm 0.5mm;
      line-height: 1;
      word-break: break-all;
      min-height: 0;
    }

    .moto-caja-agencia {
      font-size: 4pt;
      text-align: right;
      padding: 0.25mm 0.6mm 0.35mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
      line-height: 1.1;
    }

    .moto-footer {
      flex-shrink: 0;
      line-height: 1.22;
      font-size: 7.2pt;
    }

    .moto-footer div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .moto-footer strong {
      font-weight: 700;
    }

    body.lote {
      display: block;
      padding: 24px;
    }

    .lote-hojas {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    .hoja-impresion {
      flex-shrink: 0;
    }

    @media print {
      body.lote { padding: 0; }
      .lote-hojas { display: block; gap: 0; }
      .hoja-impresion {
        page-break-after: always;
        break-after: page;
      }
      .hoja-impresion:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  `;
}

export async function generarQrDataUrlEnlace(enlace) {
  return QRCode.toDataURL(String(enlace).trim(), {
    margin: 0,
    errorCorrectionLevel: "M",
  });
}

export function buildEtiquetaMotoMarkup(producto, datosMoto, qrDataUrl) {
  const { codigo, producto: nombre } = producto;
  const [linea1, linea2] = dividirNombreProducto(nombre);
  const chasis = String(datosMoto?.chasis ?? "").trim().toUpperCase();
  const motor = String(datosMoto?.motor ?? "").trim().toUpperCase();
  const cam = String(datosMoto?.camCpmRamw ?? "").trim().toUpperCase();
  const agencia = String(datosMoto?.agencia ?? "Ag. Catamayo").trim();
  const linkMega = String(datosMoto?.linkMega ?? "").trim();
  const enlaceMega = escaparHtml(linkMega);

  return `
    <div class="celda-moto">
      <div class="moto-header">
        <div>${escaparHtml(linea1)}</div>
        <div>${escaparHtml(linea2)}</div>
      </div>
      <div class="moto-body">
        <div class="moto-izq">
          <div class="moto-factura">FACTURA</div>
          <div class="moto-qr-wrap">
            <div class="moto-cod">COD. ${escaparHtml(codigo)}</div>
            <a
              class="moto-qr-link"
              href="${enlaceMega}"
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir repositorio MEGA"
            >
              <img class="moto-qr" src="${qrDataUrl}" alt="QR acceso MEGA" />
            </a>
            <div class="moto-mega-acceso">Toca o escanea → MEGA</div>
          </div>
        </div>
        <div class="moto-caja">
          <div class="moto-caja-header">CAM/CPN/RAMV</div>
          <div class="moto-caja-valor" style="font-size:${tamanoFuenteCam(cam)}">${escaparHtml(cam)}</div>
          <div class="moto-caja-agencia">${escaparHtml(agencia)}</div>
        </div>
      </div>
      <div class="moto-footer">
        <div style="font-size:${tamanoFuenteFooter(chasis)}"><strong>CHASIS:</strong> ${escaparHtml(chasis)}</div>
        <div style="font-size:${tamanoFuenteFooter(motor)}"><strong>MOTOR:</strong> ${escaparHtml(motor)}</div>
      </div>
    </div>
  `;
}

export function buildDocumentoEtiquetaMoto(producto, datosMoto, qrDataUrl) {
  const etiquetaHtml = buildEtiquetaMotoMarkup(producto, datosMoto, qrDataUrl);

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Etiqueta moto ${escaparHtml(producto.codigo)}</title>
        <style>${estilosEtiquetaMoto()}</style>
      </head>
      <body>
        <div class="preview-hoja">${etiquetaHtml}</div>
      </body>
    </html>
  `;
}

export async function generarDocumentoEtiquetaMoto(producto, datosMoto) {
  const linkMega = String(datosMoto?.linkMega ?? "").trim();
  const qrDataUrl = await generarQrDataUrlEnlace(linkMega);
  const html = buildDocumentoEtiquetaMoto(producto, datosMoto, qrDataUrl);
  return { html, qrDataUrl };
}

function combinarItemConDatos(item, datosPorCodigo, datosComunes) {
  const extra = datosPorCodigo.get(item.codigo) ?? {};
  return {
    ...item,
    datosMoto: {
      chasis: extra.chasis ?? "",
      motor: extra.motor ?? "",
      camCpmRamw: extra.camCpmRamw ?? "",
      linkMega: datosComunes.linkMega,
      agencia: datosComunes.agencia,
    },
  };
}

export function buildDocumentoEtiquetasMotoLote(registros, qrDataUrl) {
  const hojasHtml = registros
    .map(
      (registro) => `
        <div class="hoja-impresion">
          <div class="preview-hoja">
            ${buildEtiquetaMotoMarkup(registro, registro.datosMoto, qrDataUrl)}
          </div>
        </div>
      `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Etiquetas motos</title>
        <style>${estilosEtiquetaMoto()}</style>
      </head>
      <body class="lote">
        <div class="lote-hojas">${hojasHtml}</div>
      </body>
    </html>
  `;
}

export async function generarDocumentoEtiquetasMotoLote(productos, datosEtiquetaMoto) {
  const linkMega = String(datosEtiquetaMoto?.linkMega ?? "").trim();
  const agencia = String(datosEtiquetaMoto?.agencia ?? "Ag. Catamayo").trim();
  const datosPorCodigo = new Map(
    (datosEtiquetaMoto?.items ?? []).map((item) => [item.codigo, item])
  );

  const expandidos = expandirEtiquetasPorCantidad(productos).map((item) =>
    combinarItemConDatos(item, datosPorCodigo, { linkMega, agencia })
  );

  const qrDataUrl = await generarQrDataUrlEnlace(linkMega);
  const html = buildDocumentoEtiquetasMotoLote(expandidos, qrDataUrl);

  return {
    html,
    totalEtiquetas: expandidos.length,
    totalHojas: contarHojasImpresion(expandidos.length, "mediana"),
  };
}
