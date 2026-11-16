import fs from "fs";
import path from "path";

const SD_DIR = path.resolve(process.cwd(), "public/sd");
const GUIDELINES_DIR = path.join(SD_DIR, "guidelines");

console.log("=== VERIFYING OFFICIAL STACKDROVE BRANDBOOK IMPLEMENTATION ===");

// 1. Check official PDF
const pdfPath = path.join(SD_DIR, "stackdrove-brand-book.pdf");
if (fs.existsSync(pdfPath)) {
  const stats = fs.statSync(pdfPath);
  console.log(`[PASS] Official Brand Book PDF present: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} else {
  console.error(`[FAIL] Official Brand Book PDF missing at ${pdfPath}`);
  process.exit(1);
}

// 2. Check guideline SVG assets
const requiredGuidelines = [
  "00-StackDrove-brand-guideline-board.svg",
  "01-primary-logo.svg",
  "02-symbol.svg",
  "03-wordmark-lockup.svg",
  "04-color-palette.svg",
  "05-typography.svg",
  "06-clear-space.svg",
  "07-minimum-size.svg",
  "08-background-usage.svg",
  "09-favicon.svg",
  "10-logo-dos-and-donts.svg",
];

let allGuidelinesPresent = true;
for (const file of requiredGuidelines) {
  const fullPath = path.join(GUIDELINES_DIR, file);
  if (fs.existsSync(fullPath)) {
    console.log(`[PASS] Guideline sheet: ${file}`);
  } else {
    console.error(`[FAIL] Missing guideline sheet: ${file}`);
    allGuidelinesPresent = false;
  }
}

if (!allGuidelinesPresent) {
  process.exit(1);
}

// 3. Check trimmed logo and mark assets
const requiredBrandAssets = [
  "stackdrove-logo-light.svg",
  "stackdrove-logo-dark.svg",
  "stackdrove-mark-light.svg",
  "stackdrove-mark-dark.svg",
  "stackdrove-mark-chartreuse.svg",
  "stackdrove-mark-blue.svg",
  "stackdrove-browser-tab.png",
];

for (const asset of requiredBrandAssets) {
  const fullPath = path.join(SD_DIR, asset);
  if (fs.existsSync(fullPath)) {
    console.log(`[PASS] Brand asset ready: ${asset}`);
  } else {
    console.error(`[FAIL] Missing brand asset: ${asset}`);
    process.exit(1);
  }
}

// 4. Verify globals.css contains official tokens
const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");
const tokens = [
  "--color-sd-primary-navy",
  "--color-sd-primary-blue",
  "--color-sd-deep-blue",
  "--color-sd-silver-accent",
  "--color-sd-warm-white",
  "--color-sd-charcoal",
  "--color-sd-accent-chartreuse",
  "--color-sd-accent-electric-blue",
];

for (const token of tokens) {
  if (cssContent.includes(token)) {
    console.log(`[PASS] CSS token found: ${token}`);
  } else {
    console.error(`[FAIL] Missing CSS token in globals.css: ${token}`);
    process.exit(1);
  }
}

console.log("=== ALL STACKDROVE BRANDBOOK ASSETS & TOKENS VERIFIED SUCCESSFULLY ===");

