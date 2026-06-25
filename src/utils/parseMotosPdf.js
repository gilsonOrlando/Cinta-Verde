import { parseTransferenciaPdf, procesarTransferenciaPdf } from "./parseTransferenciaPdf.js";
import { obtenerProductosMotosDesdeTexto } from "./filtrarProductosMotos.js";

export function parseMotosPdf(text) {
  const transferencia = parseTransferenciaPdf(text);
  const productos = obtenerProductosMotosDesdeTexto(text, transferencia.productos);

  return {
    ...transferencia,
    productos,
  };
}

export async function procesarMotosPdf(file, extractText) {
  const text = await extractText(file);
  return parseMotosPdf(text);
}

export { procesarTransferenciaPdf };
