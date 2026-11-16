import http from "http";
import fs from "fs";
import path from "path";

async function checkEndpoint(url: string): Promise<{ status: number; ok: boolean }> {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        resolve({ status: res.statusCode || 0, ok: res.statusCode === 200 });
      })
      .on("error", (err) => {
        console.error(`Error querying ${url}:`, err.message);
        resolve({ status: 500, ok: false });
      });
  });
}

async function runTests() {
  console.log("=== Testing Official SD Brand Logo Assets & Integration ===\n");

  // 1. Check assets in public/sd/
  const requiredFiles = [
    "stackdrove-browser-tab.png",
    "stackdrove-color-2048.png",
    "stackdrove-color.svg",
    "stackdrove-inverse-2048.png",
    "stackdrove-inverse.svg",
    "stackdrove-logo-light.svg",
    "stackdrove-logo-dark.svg",
    "stackdrove-mark-light.svg",
    "stackdrove-mark-dark.svg",
    "stackdrove-mark-chartreuse.svg",
    "stackdrove-mark-blue.svg",
  ];

  const sdDir = path.join(process.cwd(), "public", "sd");
  for (const file of requiredFiles) {
    const fullPath = path.join(sdDir, file);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`✓ Asset found: ${file} (${stats.size} bytes)`);
    } else {
      console.error(`✗ Missing required asset: ${file}`);
      process.exit(1);
    }
  }

  // 2. Check component imports
  try {
    const brandModule = await import("../src/components/brand/logo");
    console.log("\n✓ Module 'logo.tsx' imported successfully.");
    if (typeof brandModule.StackDroveLogo !== "function") {
      throw new Error("StackDroveLogo is not exported as a function!");
    }
    if (typeof brandModule.StackDroveMark !== "function") {
      throw new Error("StackDroveMark is not exported as a function!");
    }
    console.log("✓ 'StackDroveLogo' and 'StackDroveMark' components verified.");
  } catch (err: any) {
    console.error("✗ Failed to import brand logo module:", err.message);
    process.exit(1);
  }

  // 3. Test HTTP endpoints
  const endpoints = [
    "http://localhost:3000",
    "http://localhost:3000/login",
    "http://localhost:3000/saas-expired",
    "http://localhost:3000/settings",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/sd/stackdrove-mark-light.svg",
    "http://localhost:3000/sd/stackdrove-mark-dark.svg",
    "http://localhost:3000/sd/stackdrove-browser-tab.png",
  ];

  console.log("\nTesting HTTP endpoints & Brand Asset URLs:");
  let allHealthy = true;
  for (const url of endpoints) {
    const res = await checkEndpoint(url);
    if (res.ok) {
      console.log(`✓ ${url} -> ${res.status} OK`);
    } else {
      console.error(`✗ ${url} -> ${res.status}`);
      allHealthy = false;
    }
  }

  if (!allHealthy) {
    console.error("\nSome endpoints or assets failed.");
    process.exit(1);
  }

  console.log("\n=== ALL SD BRAND LOGO INTEGRATION AUDITS PASSED 100% ===");
}

runTests();

