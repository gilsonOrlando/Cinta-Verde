import { readFileSync } from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseTransferenciaPdf } from "../src/utils/parseTransferenciaPdf.js";

const path = process.argv[2];
if (!path) {
  console.error("Uso: node scripts/test-pdf-real.js <ruta.pdf>");
  process.exit(1);
}

const data = new Uint8Array(readFileSync(path));
const pdf = await pdfjsLib.getDocument({ data }).promise;

let text = "";
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();

  let lastY = null;
  let line = "";

  for (const item of content.items) {
    if (!("str" in item)) continue;
    const y = Math.round(item.transform[5]);
    if (lastY !== null && Math.abs(y - lastY) > 4) {
      text += line.trim() + "\n";
      line = "";
    }
    line += item.str + " ";
    lastY = y;
  }
  if (line.trim()) text += line.trim() + "\n";
}

console.log("=== TEXTO EXTRAIDO ===");
console.log(text);
console.log("=== PARSE RESULT ===");
console.log(JSON.stringify(parseTransferenciaPdf(text), null, 2));
