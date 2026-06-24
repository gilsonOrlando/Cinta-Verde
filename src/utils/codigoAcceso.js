const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generarCodigoAcceso(longitud = 8) {
  let codigo = "";
  for (let i = 0; i < longitud; i += 1) {
    codigo += CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
  }
  return codigo;
}

export function normalizarCodigoAcceso(valor) {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function esCodigoAccesoValido(valor) {
  return /^[A-Z0-9]{4,12}$/.test(normalizarCodigoAcceso(valor));
}
