import http from "http";

// Protected pages need a session (see src/proxy.ts); signed-out requests are redirected to /login.
const SESSION_COOKIE = "ctms_session=1";

async function checkEndpoint(
  url: string,
  withSession = true
): Promise<{ status: number; ok: boolean; location?: string }> {
  return new Promise((resolve) => {
    http
      .get(url, { headers: withSession ? { Cookie: SESSION_COOKIE } : {} }, (res) => {
        res.resume();
        resolve({ status: res.statusCode || 0, ok: res.statusCode === 200, location: res.headers.location });
      })
      .on("error", (err) => {
        console.error(`Error querying ${url}:`, err.message);
        resolve({ status: 500, ok: false });
      });
  });
}

async function runTests() {
  console.log("=== Testing CTMS Notification Popover & Core Layout Integration ===\n");

  // 1. Verify notification popover module exists and exports correctly
  try {
    const notifModule = await import("../src/components/notifications/notification-popover");
    console.log("✓ Module 'notification-popover.tsx' imported successfully.");
    if (typeof notifModule.NotificationPopover === "function") {
      console.log("✓ 'NotificationPopover' component exported as a function.");
    } else {
      throw new Error("NotificationPopover is not exported as a function!");
    }
  } catch (err: any) {
    console.error("✗ Failed to load notification popover module:", err.message);
    process.exit(1);
  }

  // 2. Verify dev server is responding
  const endpoints = [
    "http://localhost:3000",
    "http://localhost:3000/superadmin",
    "http://localhost:3000/verify",
    "http://localhost:3000/boss",
    "http://localhost:3000/delegator",
    "http://localhost:3000/delegatee",
    "http://localhost:3000/company-admin",
    "http://localhost:3000/recurring",
    "http://localhost:3000/settings",
  ];

  console.log("\nTesting HTTP endpoints with Notification Popover embedded in Header:");
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

  console.log("\nTesting signed-out access is redirected to /login:");
  const signedOut = await checkEndpoint("http://localhost:3000/boss", false);
  if (signedOut.status >= 300 && signedOut.status < 400 && signedOut.location?.includes("/login?next=%2Fboss")) {
    console.log(`✓ /boss without session -> ${signedOut.status} ${signedOut.location}`);
  } else {
    console.error(`✗ /boss without session -> ${signedOut.status} ${signedOut.location ?? ""}`);
    allHealthy = false;
  }
  const loginPage = await checkEndpoint("http://localhost:3000/login", false);
  if (loginPage.ok) console.log("✓ /login reachable without session");
  else {
    console.error(`✗ /login without session -> ${loginPage.status}`);
    allHealthy = false;
  }

  if (!allHealthy) {
    console.error("\nSome endpoints failed.");
    process.exit(1);
  }

  console.log("\n=== ALL NOTIFICATION POPOVER AUDITS PASSED 100% ===");
}

runTests();
