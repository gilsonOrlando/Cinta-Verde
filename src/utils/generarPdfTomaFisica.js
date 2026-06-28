import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  formatearFechaProyecto,
  nombreArchivoPdf,
  normalizarProductoTomaFisica,
  prepararFilasTomaFisica,
} from "./tomaFisicaReporte";

function escapeHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function esperarRenderizado(iframe) {
  return new Promise((resolve) => {
    const completar = () => requestAnimationFrame(() => requestAnimationFrame(resolve));

    if (iframe.contentDocument?.readyState === "complete") {
      completar();
      return;
    }

    iframe.addEventListener("load", completar, { once: true });
    setTimeout(completar, 400);
  });
}

function agregarCanvasEnPaginas(pdf, canvas, margen = 10) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margen * 2;
  const contentHeight = pageHeight - margen * 2;
  const sliceHeightPx = Math.floor((contentHeight * canvas.width) / contentWidth);

  let offsetY = 0;

  while (offsetY < canvas.height) {
    const sliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const context = pageCanvas.getContext("2d");
    if (!context) break;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight
    );

    const imgHeightMm = (sliceHeight * contentWidth) / canvas.width;
    pdf.addImage(
      pageCanvas.toDataURL("image/png"),
      "PNG",
      margen,
      margen,
      contentWidth,
      imgHeightMm
    );

    offsetY += sliceHeight;
    if (offsetY < canvas.height) {
      pdf.addPage();
    }
  }
}

export function buildHtmlTomaFisica({ proyecto, productos }) {
  const filas = prepararFilasTomaFisica(productos);
  const fecha = formatearFechaProyecto(proyecto.created_at);

  const cuerpoFilas = filas
    .map((fila) => {
      const claseDiferencia =
        fila.diferenciaNumero > 0
          ? "positiva"
          : fila.diferenciaNumero < 0
            ? "negativa"
            : "neutra";

      return `<tr>
        <td class="centro">${fila.indice}</td>
        <td>${escapeHtml(fila.codigo)}</td>
        <td>${escapeHtml(fila.producto)}</td>
        <td class="centro">${escapeHtml(fila.cantidad_sistema)}</td>
        <td class="centro">${escapeHtml(fila.cantidad_toma_fisica)}</td>
        <td class="centro diferencia ${claseDiferencia}">${escapeHtml(fila.diferencia)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Toma física - ${escapeHtml(proyecto.nombre)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #222;
      margin: 0;
      padding: 24px;
      background: #fff;
    }
    header {
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 2px solid #222;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 22px;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 24px;
      font-size: 13px;
      color: #444;
    }
    .meta strong { color: #111; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #222;
      color: #fff;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tbody tr:nth-child(even) { background: #fafafa; }
    .centro { text-align: center; white-space: nowrap; }
    td:nth-child(3) { word-break: break-word; }
    .diferencia.positiva { color: #2e7d32; font-weight: 700; }
    .diferencia.negativa { color: #c62828; font-weight: 700; }
    .diferencia.neutra { color: #444; font-weight: 600; }
    footer {
      margin-top: 16px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <header>
    <h1>Toma física</h1>
    <div class="meta">
      <div><span>Proyecto: </span><strong>${escapeHtml(proyecto.nombre)}</strong></div>
      <div><span>Código: </span><strong>${escapeHtml(proyecto.codigo_acceso)}</strong></div>
      <div><span>Fecha: </span><strong>${escapeHtml(fecha)}</strong></div>
      <div><span>Productos: </span><strong>${filas.length}</strong></div>
      ${
        proyecto.nombre_archivo
          ? `<div><span>Archivo: </span><strong>${escapeHtml(proyecto.nombre_archivo)}</strong></div>`
          : ""
      }
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Código</th>
        <th>Producto</th>
        <th>Cant. sistema</th>
        <th>Cant. toma física</th>
        <th>Diferencia</th>
      </tr>
    </thead>
    <tbody>
      ${cuerpoFilas || `<tr><td colspan="6" class="centro">Sin productos registrados</td></tr>`}
    </tbody>
  </table>
  <footer>Generado desde el sistema de inventarios.</footer>
</body>
</html>`;
}

export async function descargarPdfTomaFisica({ proyecto, productos }) {
  const lista = Array.isArray(productos)
    ? productos.map(normalizarProductoTomaFisica)
    : [];

  if (lista.length === 0) {
    throw new Error("SIN_PRODUCTOS");
  }

  const html = buildHtmlTomaFisica({ proyecto, productos: lista });
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "1100px";
  iframe.style.height = "1px";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";

  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error("No se pudo preparar el reporte.");
    }

    doc.open();
    doc.write(html);
    doc.close();

    await esperarRenderizado(iframe);

    const body = iframe.contentDocument?.body;
    if (!body) {
      throw new Error("No se pudo renderizar el reporte.");
    }

    iframe.style.height = `${body.scrollHeight}px`;

    const canvas = await html2canvas(body, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: body.scrollWidth,
      height: body.scrollHeight,
      windowWidth: body.scrollWidth,
      windowHeight: body.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    agregarCanvasEnPaginas(pdf, canvas);
    pdf.save(nombreArchivoPdf(proyecto));
  } finally {
    iframe.remove();
  }
}
