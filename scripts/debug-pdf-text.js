import fs from "fs";
import { PDFParse } from "pdf-parse";
import { parseTransferenciaPdf } from "../src/utils/parseTransferenciaPdf.js";

const path =
  process.argv[2] ||
  "c:\\Users\\Gilson Quezada\\Downloads\\ejemplo-transferencia.pdf";

const buffer = fs.readFileSync(path);
const parser = new PDFParse({ data: buffer });
const result = await parser.getText();
await parser.destroy();

console.log("=== RAW TEXT ===");
console.log(result.text);
console.log("\n=== LINES ===");
const lines = result.text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
lines.forEach((l, i) => console.log(`${i}: ${l}`));
console.log("\n=== PARSED ===");
console.log(JSON.stringify(parseTransferenciaPdf(result.text), null, 2));
