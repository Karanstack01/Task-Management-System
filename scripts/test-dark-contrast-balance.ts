import * as fs from "fs";
import * as path from "path";

console.log("==================================================================");
console.log("🧪 TESTING DARK THEME CONTRAST & CLEAR VISIBILITY ENGINE");
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
const css = fs.readFileSync(cssPath, "utf-8");

assert(css.includes(".btn-chartreuse"), ".btn-chartreuse selector is defined in CSS");
assert(css.includes("-webkit-text-fill-color: #070B18 !important;"), "Chartreuse text enforces deep black/navy #070B18 via text-fill-color");
assert(css.includes("background-color: #0A1026 !important;"), "Dark inputs elevated with distinct dark well #0A1026");
assert(css.includes("border: 1px solid rgba(255, 255, 255, 0.22) !important;"), "Dark inputs have crisp 22% white visible border");
assert(css.includes(".dark .status-pill-active,"), "Dark status pill active rule is defined");
assert(css.includes(".dark .status-pill-suspended,"), "Dark status pill suspended rule is defined");

// 2. Verify layout.tsx does not leak Chartreuse ambient blob in dark mode
const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
const layout = fs.readFileSync(layoutPath, "utf-8");
assert(layout.includes("dark:hidden blur-[140px]"), "Layout yellow ambient blob is explicitly hidden in dark mode (dark:hidden)");

// 3. Verify superadmin/page.tsx button & modal contrast
const superadminPath = path.join(process.cwd(), "src/app/superadmin/page.tsx");
const superadmin = fs.readFileSync(superadminPath, "utf-8");
assert(superadmin.includes("btn-chartreuse"), "Superadmin button uses .btn-chartreuse class");
assert(superadmin.includes("!text-[#070B18]"), "Superadmin button enforces !text-[#070B18] text color");
assert(superadmin.includes("dark:bg-[#0E1632]"), "Modal container elevated with distinct #0E1632 surface");
assert(superadmin.includes("dark:bg-[#070D22]"), "Modal inputs use deep #070D22 with shadow-inner");
assert(superadmin.includes("dark:border-white/25"), "Modal Cancel button has high-contrast 25% white border");
assert(superadmin.includes("dark:text-[#DFECF7]"), "Modal Cancel button has legible Ice Blue text");

// 4. Verify Revision Dialog & Update Task Dialog
const revPath = path.join(process.cwd(), "src/components/tasks/revision-dialog.tsx");
const rev = fs.readFileSync(revPath, "utf-8");
assert(rev.includes("dark:border-white/25"), "Revision Dialog Cancel button has high-contrast border");

const updatePath = path.join(process.cwd(), "src/components/tasks/update-task-dialog.tsx");
const update = fs.readFileSync(updatePath, "utf-8");
assert(update.includes("dark:border-white/25"), "Update Task Dialog Cancel button has high-contrast border");

console.log("==================================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

