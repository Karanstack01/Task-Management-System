import http from "http";

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
  console.log("=== Testing Modern UI/UX Sidebar & Settings Suite Enhancement ===\n");

  // 1. Verify modules exist and export cleanly
  try {
    const sidebarModule = await import("../src/components/layout/sidebar");
    console.log("✓ Module 'sidebar.tsx' imported successfully.");
    if (typeof sidebarModule.Sidebar !== "function") {
      throw new Error("Sidebar is not exported as a function!");
    }

    const auditModule = await import("../src/components/settings/audit-logs-tab");
    console.log("✓ Module 'audit-logs-tab.tsx' imported successfully.");
    if (typeof auditModule.AuditLogsTab !== "function") {
      throw new Error("AuditLogsTab is not exported as a function!");
    }
  } catch (err: any) {
    console.error("✗ Module verification failed:", err.message);
    process.exit(1);
  }

  // 2. Verify all settings tabs & main views respond with 200 OK
  const endpoints = [
    "http://localhost:3000",
    "http://localhost:3000/settings",
    "http://localhost:3000/settings?tab=billing",
    "http://localhost:3000/settings?tab=integrations",
    "http://localhost:3000/settings?tab=security",
    "http://localhost:3000/settings?tab=audit_logs",
    "http://localhost:3000/settings?tab=team_roles",
    "http://localhost:3000/settings?tab=organization",
    "http://localhost:3000/settings?tab=notifications",
    "http://localhost:3000/settings?tab=sla_automation",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/superadmin",
    "http://localhost:3000/company-admin",
  ];

  console.log("\nTesting HTTP endpoints with new Sidebar & Settings Sub-Sidebar:");
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
    console.error("\nSome endpoints failed.");
    process.exit(1);
  }

  console.log("\n=== ALL MODERN UI/UX AUDITS PASSED 100% ===");
}

runTests();

