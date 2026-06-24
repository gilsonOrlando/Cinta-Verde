import { copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = resolve(root, "dist", "index.html");
const fallbackHtml = resolve(root, "dist", "404.html");

if (!existsSync(indexHtml)) {
  console.warn("[copy-spa-fallback] dist/index.html no existe; omitiendo copia.");
  process.exit(0);
}

copyFileSync(indexHtml, fallbackHtml);
console.log("[copy-spa-fallback] Copiado dist/index.html → dist/404.html");
