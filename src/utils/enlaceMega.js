export function esEnlaceMegaValido(valor) {
  try {
    const url = new URL(String(valor ?? "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizarEnlaceMega(valor) {
  return String(valor ?? "").trim();
}

export function abrirRepositorioMega(valor) {
  const enlace = normalizarEnlaceMega(valor);

  if (!esEnlaceMegaValido(enlace)) {
    return false;
  }

  window.open(enlace, "_blank", "noopener,noreferrer");
  return true;
}
