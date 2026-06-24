import QRCode from "qrcode";

export const TIPOS_ETIQUETA = {
  PEQUENA: "pequena",
  MEDIANA: "mediana",
};

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generarQrDataUrl(codigo) {
  return QRCode.toDataURL(String(codigo), {
    margin: 0,
    errorCorrectionLevel: "M",
  });
}

function dividirNombreProducto(nombre, maxLineas = 2) {
  const palabras = String(nombre ?? "")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) return [""];

  const lineas = [];
  let actual = "";

  for (let i = 0; i < palabras.length; i++) {
    const palabra = palabras[i];
    const candidato = actual ? `${actual} ${palabra}` : palabra;

    if (candidato.length <= 22 || !actual) {
      actual = candidato;
    } else {
      lineas.push(actual);
      actual = palabra;
    }

    if (lineas.length === maxLineas - 1) {
      actual = palabras.slice(i).join(" ");
      break;
    }
  }

  if (actual) lineas.push(actual);
  return lineas.slice(0, maxLineas);
}

function estilosEtiqueta(esPequena) {
  const prefix = esPequena ? "p" : "m";

  return `
    @page {
      size: ${esPequena ? "105mm 28mm" : "70mm 51mm"};
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
        overflow: auto;
      }

      body {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${esPequena ? "48px 64px" : "24px"};
      }

      .preview-hoja {
        background: #fff;
        padding: ${esPequena ? "0" : "20px"};
        width: ${esPequena ? "105mm" : "auto"};
        overflow: visible;
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
        border-radius: 2px;
        flex-shrink: 0;
        ${esPequena ? "" : "transform: scale(1.35); transform-origin: center center;"}
      }
    }

    @media print {
      html, body {
        width: auto;
        min-height: auto;
        background: #fff;
      }

      body {
        display: block;
        padding: 0;
      }

      .preview-hoja {
        padding: 0;
        box-shadow: none;
        border-radius: 0;
        transform: none;
        width: ${esPequena ? "105mm" : "auto"};
      }
    }

    .fila {
      width: 105mm;
      height: 28mm;
      box-sizing: border-box;
      padding: 0 2mm;
      display: grid;
      grid-template-columns: repeat(3, calc((105mm - 4mm - 6mm) / 3));
      column-gap: 3mm;
      align-items: center;
    }

    .celda-${prefix} {
      width: ${esPequena ? "100%" : "70mm"};
      height: ${esPequena ? "25mm" : "51mm"};
      border: 0.4mm solid #000;
      padding: ${esPequena ? "0.8mm 1mm" : "1.5mm 2mm"};
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
      flex-shrink: ${esPequena ? "1" : "0"};
      min-width: ${esPequena ? "0" : "auto"};
      background: #fff;
    }

    ${
      esPequena
        ? ""
        : `
    .producto-top-m {
      text-align: center;
      font-weight: 700;
      text-transform: uppercase;
      line-height: 1.15;
      font-size: 9pt;
      margin-bottom: 1mm;
      flex-shrink: 0;
      word-break: break-word;
    }

    .producto-top-m div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    `
    }

    .cuerpo-${prefix} {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .qr-${prefix} {
      width: ${esPequena ? "15mm" : "32mm"};
      height: ${esPequena ? "15mm" : "32mm"};
      object-fit: contain;
      display: block;
      flex-shrink: 0;
    }

    .cod-bloque-${prefix} {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: ${esPequena ? "0.8mm" : "1.5mm"};
      flex-shrink: 0;
      margin-top: auto;
      width: 100%;
      line-height: 1;
    }

    .cod-label-${prefix} {
      font-size: ${esPequena ? "5pt" : "7pt"};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .cod-${prefix} {
      font-size: ${esPequena ? "17pt" : "22pt"};
      font-weight: 700;
      white-space: nowrap;
      letter-spacing: 0.04em;
    }
  `;
}

export function buildEtiquetaMarkup(producto, tipo, qrDataUrl) {
  const esPequena = tipo === TIPOS_ETIQUETA.PEQUENA;
  const prefix = esPequena ? "p" : "m";
  const { codigo, producto: nombre } = producto;

  const productoHtml = esPequena
    ? ""
    : (() => {
        const lineas = dividirNombreProducto(nombre);
        const lineasHtml = lineas.map((l) => `<div>${escaparHtml(l)}</div>`).join("");
        return `<div class="producto-top-m">${lineasHtml}</div>`;
      })();

  return `
    ${productoHtml}
    <div class="cuerpo-${prefix}">
      <img class="qr-${prefix}" src="${qrDataUrl}" alt="QR ${escaparHtml(codigo)}" />
    </div>
    <div class="cod-bloque-${prefix}">
      <span class="cod-label-${prefix}">Código</span>
      <span class="cod-${prefix}">${escaparHtml(codigo)}</span>
    </div>
  `;
}

function buildContenedorEtiqueta(producto, tipo, qrDataUrl) {
  const esPequena = tipo === TIPOS_ETIQUETA.PEQUENA;
  const prefix = esPequena ? "p" : "m";
  const contenido = buildEtiquetaMarkup(producto, tipo, qrDataUrl);

  if (esPequena) {
    const celda = `<div class="celda-${prefix}">${contenido}</div>`;
    return `<div class="fila">${celda}${celda}${celda}</div>`;
  }

  return `<div class="celda-${prefix}">${contenido}</div>`;
}

function buildFilaPequena(productos, tipo, qrPorCodigo) {
  const prefix = "p";
  const celdas = [];

  for (let i = 0; i < 3; i++) {
    const item = productos[i];
    if (item) {
      celdas.push(
        `<div class="celda-${prefix}">${buildEtiquetaMarkup(item, tipo, qrPorCodigo[item.codigo])}</div>`
      );
    }
  }

  return `<div class="fila">${celdas.join("")}</div>`;
}

function estilosLote(esPequena) {
  return `
    ${estilosEtiqueta(esPequena)}

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
      body.lote {
        padding: 0;
      }

      .lote-hojas {
        display: block;
        gap: 0;
      }

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

export function parseCantidadEtiquetas(cantidad) {
  if (cantidad == null || cantidad === "") return 1;

  const texto = String(cantidad).replace(",", ".").trim();
  const valor = Math.floor(Number(texto));

  return Number.isFinite(valor) && valor > 0 ? valor : 1;
}

export function expandirEtiquetasPorCantidad(productos) {
  const resultado = [];

  for (const item of productos) {
    const total = parseCantidadEtiquetas(item.cantidad);
    for (let i = 0; i < total; i++) {
      resultado.push({ ...item });
    }
  }

  return resultado;
}

export function contarHojasImpresion(totalEtiquetas, tipo) {
  if (totalEtiquetas <= 0) return 0;
  if (tipo === TIPOS_ETIQUETA.PEQUENA) return Math.ceil(totalEtiquetas / 3);
  return totalEtiquetas;
}

function agruparEnChunks(items, tamano) {
  const grupos = [];
  for (let i = 0; i < items.length; i += tamano) {
    grupos.push(items.slice(i, i + tamano));
  }
  return grupos;
}

async function generarQrPorCodigo(productos) {
  const codigos = [...new Set(productos.map((item) => item.codigo))];
  const entradas = await Promise.all(
    codigos.map(async (codigo) => [codigo, await generarQrDataUrl(codigo)])
  );
  return Object.fromEntries(entradas);
}

export function buildDocumentoEtiquetasLote(productos, tipo, qrPorCodigo) {
  const esPequena = tipo === TIPOS_ETIQUETA.PEQUENA;
  const expandidos = expandirEtiquetasPorCantidad(productos);

  let hojasHtml;

  if (esPequena) {
    const filas = agruparEnChunks(expandidos, 3);
    hojasHtml = filas
      .map(
        (fila) => `
          <div class="hoja-impresion">
            <div class="preview-hoja">${buildFilaPequena(fila, tipo, qrPorCodigo)}</div>
          </div>
        `
      )
      .join("");
  } else {
    hojasHtml = expandidos
      .map(
        (item) => `
          <div class="hoja-impresion">
            <div class="preview-hoja">
              <div class="celda-m">${buildEtiquetaMarkup(item, tipo, qrPorCodigo[item.codigo])}</div>
            </div>
          </div>
        `
      )
      .join("");
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Etiquetas lote</title>
        <style>${estilosLote(esPequena)}</style>
      </head>
      <body class="lote">
        <div class="lote-hojas">${hojasHtml}</div>
      </body>
    </html>
  `;
}

export async function generarDocumentoEtiquetasLote(
  productos,
  tipo = TIPOS_ETIQUETA.MEDIANA
) {
  const expandidos = expandirEtiquetasPorCantidad(productos);
  const qrPorCodigo = await generarQrPorCodigo(expandidos);
  const html = buildDocumentoEtiquetasLote(productos, tipo, qrPorCodigo);

  return {
    html,
    totalEtiquetas: expandidos.length,
    totalHojas: contarHojasImpresion(expandidos.length, tipo),
  };
}

export function buildDocumentoEtiqueta(producto, tipo, qrDataUrl) {
  const esPequena = tipo === TIPOS_ETIQUETA.PEQUENA;
  const etiquetaHtml = buildContenedorEtiqueta(producto, tipo, qrDataUrl);

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Etiqueta ${escaparHtml(producto.codigo)}</title>
        <style>${estilosEtiqueta(esPequena)}</style>
      </head>
      <body>
        <div class="preview-hoja">${etiquetaHtml}</div>
      </body>
    </html>
  `;
}

export async function generarDocumentoEtiqueta(producto, tipo = TIPOS_ETIQUETA.MEDIANA) {
  const qrDataUrl = await generarQrDataUrl(producto.codigo);
  const html = buildDocumentoEtiqueta(producto, tipo, qrDataUrl);
  return { html, qrDataUrl };
}

export function imprimirDesdeIframe(iframe, { onAfterPrint } = {}) {
  if (!iframe?.contentWindow) {
    throw new Error("No se pudo acceder al documento de la etiqueta.");
  }

  const ventana = iframe.contentWindow;

  if (onAfterPrint) {
    const handleAfterPrint = () => {
      ventana.removeEventListener("afterprint", handleAfterPrint);
      onAfterPrint();
    };
    ventana.addEventListener("afterprint", handleAfterPrint);
  }

  ventana.focus();
  ventana.print();
}

export function getEtiquetaTipoLabel(tipo) {
  return tipo === TIPOS_ETIQUETA.PEQUENA
    ? "Pequeña (105 × 28 mm, márgenes 2 mm, separación 3 mm)"
    : "Mediana (70 × 51 mm)";
}
