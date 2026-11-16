async function testEndpoints() {
  const urls = [
    { name: "Brandbook PDF", url: "http://localhost:3000/sd/stackdrove-brand-book.pdf", expectPdf: true },
    { name: "Guideline Board SVG", url: "http://localhost:3000/sd/guidelines/00-StackDrove-brand-guideline-board.svg" },
    { name: "Logo Dark SVG", url: "http://localhost:3000/sd/stackdrove-logo-dark.svg" },
    { name: "Settings Page", url: "http://localhost:3000/settings?tab=organization" },
    { name: "Superadmin Page", url: "http://localhost:3000/superadmin" },
    { name: "Dashboard Page", url: "http://localhost:3000/dashboard" },
  ];

  let allSuccess = true;

  for (const item of urls) {
    try {
      const res = await fetch(item.url);
      if (res.status === 200) {
        const text = item.expectPdf ? "" : await res.text();
        console.log(`[PASS] ${item.name}: HTTP ${res.status} (Content-Type: ${res.headers.get("content-type")})`);
      } else {
        console.error(`[FAIL] ${item.name}: HTTP ${res.status}`);
        allSuccess = false;
      }
    } catch (err: any) {
      console.error(`[FAIL] ${item.name} error: ${err.message}`);
      allSuccess = false;
    }
  }

  if (!allSuccess) {
    process.exit(1);
  }
  console.log("\n>>> ALL ENDPOINTS AND ASSETS VERIFIED WITH 200 OK <<<");
}

testEndpoints();

