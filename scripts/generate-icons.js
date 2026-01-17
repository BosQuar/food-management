import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, "../static/icons/icon.svg");
const outputDir = join(__dirname, "../static/icons");

const sizes = [192, 512];

async function generateIcons() {
  const svgBuffer = readFileSync(svgPath);

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(outputDir, `icon-${size}.png`));

    console.log(`Generated icon-${size}.png`);
  }

  console.log("All icons generated successfully!");
}

generateIcons().catch(console.error);
