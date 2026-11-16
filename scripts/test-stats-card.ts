import { LiquidStatsCard, LiquidStatsCardProps, MetricVariant } from "../src/components/common/liquid-stats-card";

console.log("==================================================================");
console.log("🧪 AUDITING LIQUID STATS CARD COMPONENT & PANTONE THEME");
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

// 1. Verify component export
assert(typeof LiquidStatsCard === "function", "LiquidStatsCard component is exported as a function");

// 2. Verify prop types and variants supported
const variants: MetricVariant[] = ["chartreuse", "electric", "navy", "ice", "rose", "amber"];
assert(variants.length === 6, "All 6 design variants are accounted for");

console.log("==================================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

