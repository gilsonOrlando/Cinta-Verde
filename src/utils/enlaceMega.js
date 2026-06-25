export const ENLACE_MEGA_INICIO = "https://mega.nz/fm";

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
  const destino = esEnlaceMegaValido(enlace) ? enlace : ENLACE_MEGA_INICIO;

  window.open(destino, "_blank", "noopener,noreferrer");
  return { ok: true, usoFallback: !esEnlaceMegaValido(enlace) };
}
