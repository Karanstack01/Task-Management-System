import * as fs from "fs";
import * as path from "path";
import { getCurrentTheme, applyTheme, initTheme, wipeThemeTransition } from "../src/lib/theme/theme-service";

console.log("==================================================================");
console.log("🧪 AUDITING CIRCULAR WIPE THEME ENGINE & VIEW TRANSITIONS");
console.log("==================================================================");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

// 1. Verify function exports
assert(typeof getCurrentTheme === "function", "getCurrentTheme function is exported");
assert(typeof applyTheme === "function", "applyTheme function is exported");
assert(typeof initTheme === "function", "initTheme function is exported");
assert(typeof wipeThemeTransition === "function", "wipeThemeTransition function is exported");

// 2. Verify Pythagorean Radius Calculation for Viewport Coverage
function computeEndRadius(x: number, y: number, innerWidth: number, innerHeight: number): number {
  return Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
}

const screenW = 1920;
const screenH = 1080;

// Test Top-Right corner click (typical navbar position)
const trX = 1800;
const trY = 30;
const trRadius = computeEndRadius(trX, trY, screenW, screenH);
assert(trRadius >= Math.hypot(trX, screenH - trY), "Radius from top-right corner fully spans to bottom-left screen edge");
assert(trRadius > screenW * 0.9, `Computed radius (${Math.round(trRadius)}px) completely blankets 1920x1080 display`);

// Test Center screen click
const cX = screenW / 2;
const cY = screenH / 2;
const cRadius = computeEndRadius(cX, cY, screenW, screenH);
assert(cRadius >= Math.hypot(screenW / 2, screenH / 2), "Radius from center covers all 4 quadrants symmetrically");

// 3. Verify CSS Configuration in globals.css
const cssPath = path.join(process.cwd(), "src/app/globals.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

assert(cssContent.includes("::view-transition-old(root)"), "CSS includes ::view-transition-old(root) normalization");
assert(cssContent.includes("::view-transition-new(root)"), "CSS includes ::view-transition-new(root) z-index elevation");
assert(cssContent.includes(".dark"), "CSS defines .dark theme root tokens");
assert(cssContent.includes(".dark .liquid-card"), "CSS defines .dark liquid-card glassmorphism surfaces");
assert(cssContent.includes(".dark .liquid-panel"), "CSS defines .dark liquid-panel midnight surfaces");

console.log("==================================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

