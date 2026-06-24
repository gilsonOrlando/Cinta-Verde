import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origen = resolve(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const destinoDir = resolve(root, "public");
const destino = resolve(destinoDir, "pdf.worker.min.mjs");

if (!existsSync(origen)) {
  console.error("[copy-pdf-worker] No se encontró pdf.worker en node_modules.");
  process.exit(1);
}

if (!existsSync(destinoDir)) {
  mkdirSync(destinoDir, { recursive: true });
}

copyFileSync(origen, destino);
console.log("[copy-pdf-worker] Copiado a public/pdf.worker.min.mjs");
