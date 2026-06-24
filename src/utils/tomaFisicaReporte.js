import { calcularDiferenciaCantidades, formatearCantidadTexto } from "./cantidadTexto";

export function formatearDiferencia(cantidadSistema, cantidadTomaFisica) {
  const diferencia = calcularDiferenciaCantidades(cantidadSistema, cantidadTomaFisica);
  const texto = formatearCantidadTexto(diferencia);

  if (diferencia > 0) return `+${texto}`;
  return texto;
}

export function formatearFechaProyecto(fecha) {
  if (!fecha) return "—";

  return new Date(fecha).toLocaleString("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function nombreArchivoPdf(proyecto) {
  const codigo = String(proyecto?.codigo_acceso ?? "proyecto").toLowerCase();
  return `toma-fisica-${codigo}.pdf`;
}

export function prepararFilasTomaFisica(productos) {
  return productos.map((item, index) => ({
    indice: index + 1,
    codigo: item.codigo,
    producto: item.producto,
    cantidad_sistema: item.cantidad_sistema,
    cantidad_toma_fisica: item.cantidad_toma_fisica,
    diferencia: formatearDiferencia(item.cantidad_sistema, item.cantidad_toma_fisica),
    diferenciaNumero: calcularDiferenciaCantidades(
      item.cantidad_sistema,
      item.cantidad_toma_fisica
    ),
  }));
}
