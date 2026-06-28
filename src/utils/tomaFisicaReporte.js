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

export function normalizarProductoTomaFisica(item) {
  return {
    codigo: item?.codigo ?? "",
    producto: item?.producto ?? "",
    cantidad_sistema: item?.cantidad_sistema ?? item?.cantidadSistema ?? "0,00",
    cantidad_toma_fisica:
      item?.cantidad_toma_fisica ?? item?.cantidadTomaFisica ?? "0,00",
  };
}

export function prepararFilasTomaFisica(productos) {
  const lista = Array.isArray(productos) ? productos : [];

  return lista.map((item, index) => {
    const normalizado = normalizarProductoTomaFisica(item);

    return {
      indice: index + 1,
      codigo: normalizado.codigo,
      producto: normalizado.producto,
      cantidad_sistema: normalizado.cantidad_sistema,
      cantidad_toma_fisica: normalizado.cantidad_toma_fisica,
      diferencia: formatearDiferencia(
        normalizado.cantidad_sistema,
        normalizado.cantidad_toma_fisica
      ),
      diferenciaNumero: calcularDiferenciaCantidades(
        normalizado.cantidad_sistema,
        normalizado.cantidad_toma_fisica
      ),
    };
  });
}
