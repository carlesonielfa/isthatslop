import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

GlobalFonts.registerFromPath(
  join(
    import.meta.dir,
    "../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
  ),
  "Inter",
);

const ICONS_DIR = join(import.meta.dir, "../public/icons");

const STATES: Array<{ key: string; color: string }> = [
  { key: "neutral", color: "rgb(127,177,179)" },
  { key: "tier0", color: "#006400" },
  { key: "tier1", color: "#008000" },
  { key: "tier2", color: "#FFD700" },
  { key: "tier3", color: "#FF8C00" },
  { key: "tier4", color: "#FF0000" },
];

const SIZES = [16, 32, 48];

mkdirSync(ICONS_DIR, { recursive: true });

for (const { key, color } of STATES) {
  for (const size of SIZES) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Win95 beveled square background
    const border = 1;

    // Fill background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // Light edge (top, left)
    ctx.fillStyle = "rgb(247,247,247)";
    ctx.fillRect(0, 0, size, border); // top
    ctx.fillRect(0, 0, border, size); // left

    // Dark edge (bottom, right)
    ctx.fillStyle = "rgb(96,96,96)";
    ctx.fillRect(0, size - border, size, border); // bottom
    ctx.fillRect(size - border, 0, border, size); // right

    // Text centered using actual glyph bounds
    const fontSize = Math.round(size * 0.35);
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText("[ITS]");
    const textW =
      metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft;
    const textH =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const tx = (size - textW) / 2 - metrics.actualBoundingBoxLeft;
    const ty = (size + textH) / 2 - metrics.actualBoundingBoxDescent;
    const shadowOffset = Math.max(1, Math.round(size * 0.04));

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillText("[ITS]", tx + shadowOffset, ty + shadowOffset);

    // Draw white "[ITS]" centered
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("[ITS]", tx, ty);

    const buffer = canvas.toBuffer("image/png");
    const filename = `icon-${key}-${size}.png`;
    const filepath = join(ICONS_DIR, filename);
    writeFileSync(filepath, buffer);
    console.log(`Generated: ${filename}`);
  }
}

console.log(
  `\nDone. Generated ${STATES.length * SIZES.length} icons in ${ICONS_DIR}`,
);
