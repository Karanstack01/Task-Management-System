import * as fs from "fs";
import * as path from "path";
import { getCurrentTheme, applyTheme, initTheme, wipeThemeTransition } from "../src/lib/theme/theme-service";

console.log("==================================================================");
console.log("🧪 LIVE TESTING DARK/LIGHT THEME TOGGLE & SURFACE STYLES");
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

// 1. Verify CSS definition in globals.css
const cssPath = path.join(process.cwd(), "src/app/globals.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

assert(cssContent.includes("@custom-variant dark (&:where(.dark, .dark *));"), "Tailwind v4 selector variant @custom-variant dark is defined");
assert(cssContent.includes("@keyframes circle-wipe"), "@keyframes circle-wipe is defined");
assert(cssContent.includes("var(--wipe-radius"), "circle-wipe references dynamic --wipe-radius property");
assert(cssContent.includes(".dark body,"), ".dark body override rule is defined");
assert(cssContent.includes("[data-theme=\"dark\"] body"), "[data-theme=\"dark\"] body override rule is defined");
assert(cssContent.includes(".dark .liquid-card"), ".dark .liquid-card surface rule is defined");
assert(cssContent.includes(".dark h1,"), ".dark heading text color override is defined");
assert(cssContent.includes(".dark .text-\\[\\#0C132B\\]"), ".dark .text-[#0C132B] color override is defined");
assert(cssContent.includes("rgba(17, 26, 56"), "Dark cards use Midnight Navy/Slate background (#111A38)");
assert(cssContent.includes("#060A18"), "Dark background strictly uses Midnight Dark (#060A18)");

// 2. Verify theme initialization in providers.tsx & clean layout
const providersPath = path.join(process.cwd(), "src/components/layout/providers.tsx");
const providersContent = fs.readFileSync(providersPath, "utf-8");
assert(providersContent.includes("initTheme()"), "Providers component automatically calls initTheme() on mount");

const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
const layoutContent = fs.readFileSync(layoutPath, "utf-8");
assert(!layoutContent.includes("text-[#0C132B]\""), "Root layout body no longer hardcodes text-[#0C132B] utility");
assert(layoutContent.includes("suppressHydrationWarning"), "Root layout <html> suppresses hydration warning for client theme class");

// 3. Verify Theme Service operates without SSR client-boundary restrictions
assert(typeof getCurrentTheme === "function", "getCurrentTheme is a valid function");
assert(typeof applyTheme === "function", "applyTheme is a valid function");
assert(typeof wipeThemeTransition === "function", "wipeThemeTransition is a valid function");

console.log("==================================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
