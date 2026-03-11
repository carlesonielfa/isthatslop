import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ICONS_DIR = join(import.meta.dir, "../assets/icons");

const STATES: Array<{ key: string; color: string }> = [
  { key: "neutral", color: "#808080" },
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

    // Fill background with tier color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // Draw white "S" centered
    ctx.fillStyle = "#FFFFFF";
    const fontSize = Math.round(size * 0.6);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", size / 2, size / 2);

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
