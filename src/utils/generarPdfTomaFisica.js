import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatearFechaProyecto,
  nombreArchivoPdf,
  prepararFilasTomaFisica,
} from "./tomaFisicaReporte";

function escapeHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    .diferencia.positiva { color: #2e7d32; font-weight: 700; }
    .diferencia.negativa { color: #c62828; font-weight: 700; }
    .diferencia.neutra { color: #444; font-weight: 600; }
    footer {
      margin-top: 16px;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body { padding: 12px; }
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
      ${cuerpoFilas}
    </tbody>
  </table>
  <footer>Generado desde el sistema de inventarios.</footer>
</body>
</html>`;
}

export function descargarPdfTomaFisica({ proyecto, productos }) {
  const filas = prepararFilasTomaFisica(productos);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text("Toma física", 14, 16);

  doc.setFontSize(10);
  doc.text(`Proyecto: ${proyecto.nombre}`, 14, 24);
  doc.text(`Código: ${proyecto.codigo_acceso}`, 14, 30);
  doc.text(`Fecha: ${formatearFechaProyecto(proyecto.created_at)}`, 14, 36);
  doc.text(`Productos: ${filas.length}`, 120, 24);

  if (proyecto.nombre_archivo) {
    doc.text(`Archivo: ${proyecto.nombre_archivo}`, 120, 30);
  }

  autoTable(doc, {
    startY: 42,
    head: [["#", "Código", "Producto", "Cant. sistema", "Cant. toma física", "Diferencia"]],
    body: filas.map((fila) => [
      fila.indice,
      fila.codigo,
      fila.producto,
      fila.cantidad_sistema,
      fila.cantidad_toma_fisica,
      fila.diferencia,
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [34, 34, 34], textColor: 255 },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
    },
    didParseCell(data) {
      if (data.section !== "body" || data.column.index !== 5) return;

      const valor = filas[data.row.index]?.diferenciaNumero ?? 0;
      if (valor > 0) data.cell.styles.textColor = [46, 125, 50];
      if (valor < 0) data.cell.styles.textColor = [198, 40, 40];
    },
  });

  doc.save(nombreArchivoPdf(proyecto));
}
