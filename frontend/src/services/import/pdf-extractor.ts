/**
 * Browser-only PDF text extractor using pdfjs-dist.
 * Uses dynamic import so pdfjs is never bundled into the SSR / Cloudflare Worker path.
 *
 * Text items are sorted by page number, then by Y coordinate (top → bottom),
 * then by X (left → right). Items sharing the same approximate Y are merged
 * into one "line" — this naturally handles two-column layouts on the same page.
 */

let _workerSrcSet = false;

async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!_workerSrcSet) {
    // Build a URL relative to the current module so Vite copies the worker asset
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    _workerSrcSet = true;
  }
  return pdfjsLib;
}

export async function extractPDFLines(file: File): Promise<string[]> {
  if (typeof window === "undefined") {
    throw new Error("extractPDFLines is browser-only");
  }

  const pdfjsLib = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items by approximate Y coordinate.
    // PDF coordinates have Y increasing upward, so sort descending = top-to-bottom.
    // We snap to a 4-unit grid to absorb sub-pixel differences on the same visual row.
    const byY = new Map<number, Array<{ x: number; str: string }>>();

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const str = (item as { str: string }).str.trim();
      if (!str) continue;
      const transform = (item as { transform: number[] }).transform;
      const y = Math.round(transform[5] / 4) * 4;
      const x = transform[4];
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y)!.push({ x, str });
    }

    // Sort rows top → bottom (descending Y), items within row left → right (ascending X)
    const sortedYs = [...byY.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const line = byY
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .trim();
      if (line) allLines.push(line);
    }
  }

  return allLines;
}
