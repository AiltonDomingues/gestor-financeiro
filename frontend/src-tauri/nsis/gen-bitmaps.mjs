// Generates NSIS installer BMPs matching the app theme
// Header: 150x57 | Sidebar: 164x314
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

function writeBmp(filename, width, height, getPixel) {
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowStride * height;
  const buf = Buffer.alloc(54 + pixelDataSize);

  // File header
  buf.write("BM", 0);
  buf.writeUInt32LE(54 + pixelDataSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);
  // DIB header (BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive = bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelDataSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  for (let y = 0; y < height; y++) {
    const flippedY = height - 1 - y; // BMP rows are bottom-up
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, flippedY, width, height);
      const off = 54 + y * rowStride + x * 3;
      buf[off] = Math.min(255, Math.max(0, Math.round(b)));
      buf[off + 1] = Math.min(255, Math.max(0, Math.round(g)));
      buf[off + 2] = Math.min(255, Math.max(0, Math.round(r)));
    }
  }
  writeFileSync(`${__dir}/${filename}`, buf);
  console.log(`✓ ${filename} (${width}x${height})`);
}

// ─── Color helpers ──────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));

// App colors (from oklch theme)
const BG     = [19,  21,  32];   // oklch(0.14 0.02 260)  dark bg
const BLUE   = [80, 110, 228];   // oklch(0.72 0.16 255)  primary
const PURPLE = [148, 80, 210];   // oklch(0.74 0.16 305)  accent

function radialGlow(cx, cy, rx, ry, color, x, y) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const d = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, 1 - d);
}

// ─── Header 150x57 ──────────────────────────────────────────────────────────
writeBmp("installer-header.bmp", 150, 57, (x, y, W, H) => {
  let r = BG[0], g = BG[1], b = BG[2];

  // Soft blue glow top-left
  const g1 = radialGlow(0, 0, W * 0.8, H * 1.2, BLUE, x, y) * 0.5;
  // Soft purple glow bottom-right
  const g2 = radialGlow(W, H, W * 0.9, H * 1.5, PURPLE, x, y) * 0.4;

  r = lerp(r, BLUE[0],   g1) + (PURPLE[0] - r) * g2;
  g = lerp(g, BLUE[1],   g1) + (PURPLE[1] - g) * g2;
  b = lerp(b, BLUE[2],   g1) + (PURPLE[2] - b) * g2;

  // Thin gradient line at the very bottom
  if (y === H - 1) { r = lerp(BLUE[0], PURPLE[0], x / W); g = lerp(BLUE[1], PURPLE[1], x / W); b = lerp(BLUE[2], PURPLE[2], x / W); }

  return [clamp(r), clamp(g), clamp(b)];
});

// ─── Sidebar 164x314 ────────────────────────────────────────────────────────
writeBmp("installer-sidebar.bmp", 164, 314, (x, y, W, H) => {
  let r = BG[0], g = BG[1], b = BG[2];

  // Blue glow top-center
  const g1 = radialGlow(W * 0.5, 0, W * 0.8, H * 0.5, BLUE, x, y) * 0.55;
  // Purple glow bottom-right
  const g2 = radialGlow(W, H, W * 1.2, H * 0.6, PURPLE, x, y) * 0.45;

  r = lerp(r, BLUE[0],   g1) + (PURPLE[0] - r) * g2;
  g = lerp(g, BLUE[1],   g1) + (PURPLE[1] - g) * g2;
  b = lerp(b, BLUE[2],   g1) + (PURPLE[2] - b) * g2;

  // Thin vertical gradient line on the right edge
  if (x === W - 1) { r = lerp(BLUE[0], PURPLE[0], y / H); g = lerp(BLUE[1], PURPLE[1], y / H); b = lerp(BLUE[2], PURPLE[2], y / H); }

  return [clamp(r), clamp(g), clamp(b)];
});

console.log("Done — place BMPs in src-tauri/nsis/ and update tauri.conf.json");
