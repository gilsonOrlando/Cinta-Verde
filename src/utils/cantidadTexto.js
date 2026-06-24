export function parseCantidadTexto(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;

  const numero = Number(String(valor).trim().replace(/\s+/g, "").replace(",", "."));
  return Number.isNaN(numero) ? 0 : numero;
}

export function formatearCantidadTexto(valor) {
  const numero = typeof valor === "number" ? valor : parseCantidadTexto(valor);
  return numero.toFixed(2).replace(".", ",");
}

export function calcularDiferenciaCantidades(cantidadSistema, cantidadTomaFisica) {
  return parseCantidadTexto(cantidadTomaFisica) - parseCantidadTexto(cantidadSistema);
}
