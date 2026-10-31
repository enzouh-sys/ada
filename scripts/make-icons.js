// Génère les icônes de la PWA à partir du logo (assets/logo.png, portrait d'Ada Lovelace).
// `npm run icons`
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "assets", "logo.png");
const out = path.join(root, "public", "icons");
const PURPLE = { r: 69, g: 6, b: 111, alpha: 1 }; // fond du logo (#45066F)
mkdirSync(out, { recursive: true });

const roundedMask = (size, radius = 0.225) =>
  Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * radius}" ry="${size * radius}"/></svg>`);

async function rounded(size, file, { face = false } = {}) {
  // En tout petit (favicon), on garde le visage : le buste entier serait illisible.
  const img = face ? sharp(SOURCE).extract({ left: 250, top: 170, width: 760, height: 760 }) : sharp(SOURCE);
  await img.resize(size, size).composite([{ input: roundedMask(size), blend: "dest-in" }]).png({ palette: true, quality: 92, effort: 10 }).toFile(path.join(out, file));
}

// Android découpe l'icône en cercle ou en goutte : le portrait reste dans la zone sûre (80 %).
async function maskable(size, file) {
  const inner = Math.round(size * 0.8);
  const logo = await sharp(SOURCE).resize(inner, inner).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: PURPLE } })
    .composite([{ input: logo, gravity: "south" }])
    .png({ palette: true, quality: 92, effort: 10 })
    .toFile(path.join(out, file));
}

async function square(size, file) {
  await sharp(SOURCE).resize(size, size).flatten({ background: PURPLE }).png({ palette: true, quality: 92, effort: 10 }).toFile(path.join(out, file));
}

await rounded(192, "icon-192.png");
await rounded(512, "icon-512.png");
await rounded(32, "favicon-32.png", { face: true });
await maskable(512, "maskable-512.png");
await square(180, "apple-touch-icon.png");
console.log("✓ icônes générées dans public/icons");
