import * as pdfjsLib from "pdfjs-dist";
import { resolvePublicAsset } from "./resolvePublicAsset";

pdfjsLib.GlobalWorkerOptions.workerSrc = resolvePublicAsset("pdf.worker.min.mjs");

function sortItems(items) {
  return [...items]
    .filter((item) => "str" in item && item.str.trim())
    .sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      if (Math.abs(yA - yB) > 8) return yB - yA;
      return a.transform[4] - b.transform[4];
    });
}

function groupItemsIntoLines(items, tolerance = 8) {
  const sorted = sortItems(items);
  const lines = [];
  let currentLine = [];
  let lastY = null;

  for (const item of sorted) {
    const y = Math.round(item.transform[5]);

    if (lastY !== null && Math.abs(y - lastY) > tolerance) {
      if (currentLine.length) {
        lines.push(currentLine.map((i) => i.str).join(" ").trim());
        currentLine = [];
      }
    }

    currentLine.push(item);
    lastY = y;
  }

  if (currentLine.length) {
    lines.push(currentLine.map((i) => i.str).join(" ").trim());
  }

  return lines;
}

export async function extractTextFromPdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageLines = [];
  const flatParts = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const { lines, flat } = {
      lines: groupItemsIntoLines(content.items, 8),
      flat: sortItems(content.items)
        .map((item) => item.str)
        .join(" "),
    };

    pageLines.push(...lines);
    flatParts.push(flat);
  }

  const lineText = pageLines.join("\n");
  const flatText = flatParts.join("\n");

  return `${lineText}\n${flatText}`;
}
