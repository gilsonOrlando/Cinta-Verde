import {
  calcularDiferenciaCantidades,
  calcularFaltante,
  calcularSobrante,
  formatearCantidadTexto,
  parseCantidadTexto,
} from "./cantidadTexto";

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
    conteos_usuario: item?.conteos_usuario ?? {},
  };
}

export function prepararFilasTomaFisica(productos, usuarios = []) {
  const lista = Array.isArray(productos) ? productos : [];
  const listaUsuarios = Array.isArray(usuarios) ? usuarios : [];

  return lista.map((item, index) => {
    const normalizado = normalizarProductoTomaFisica(item);
    const conteos = listaUsuarios.map((usuario) => ({
      usuarioId: usuario.id,
      cantidad: formatearCantidadTexto(normalizado.conteos_usuario[usuario.id] ?? 0),
    }));
    const totalUsuarios = conteos.reduce(
      (total, conteo) => total + parseCantidadTexto(conteo.cantidad),
      0
    );
    const cantidadFisica =
      listaUsuarios.length > 0
        ? formatearCantidadTexto(totalUsuarios)
        : normalizado.cantidad_toma_fisica;

    return {
      indice: index + 1,
      codigo: normalizado.codigo,
      producto: normalizado.producto,
      cantidad_sistema: normalizado.cantidad_sistema,
      conteos,
      cantidad_toma_fisica: cantidadFisica,
      faltante: formatearCantidadTexto(
        calcularFaltante(normalizado.cantidad_sistema, cantidadFisica)
      ),
      sobrante: formatearCantidadTexto(
        calcularSobrante(normalizado.cantidad_sistema, cantidadFisica)
      ),
      diferencia: formatearDiferencia(
        normalizado.cantidad_sistema,
        cantidadFisica
      ),
      diferenciaNumero: calcularDiferenciaCantidades(
        normalizado.cantidad_sistema,
        cantidadFisica
      ),
    };
  });
}
