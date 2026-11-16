import { localDb } from "../src/lib/data/dal";

async function runPhase3Tests() {
  console.log("=================================================");
  console.log("STACKDROVE CTMS — PHASE 3 VERIFICATION TEST SUITE");
  console.log("Authentication, Domain Verification & Superadmin");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Superadmin Organization Provisioning
  const newTenant = await localDb.provisionOrganization({
    name: "Nexus Global Enterprises",
    slug: "nexus-global",
    allowed_domains: ["nexusglobal.com", "nexus.io"],
    primary_contact_email: "ceo@nexusglobal.com",
    subscription_plan: "ENTERPRISE",
    max_users: 150,
    days_valid: 365,
  });

  assert(
    newTenant !== null && newTenant.slug === "nexus-global",
    "Superadmin can provision new client tenant with custom slug"
  );
  assert(
    newTenant.allowed_domains.includes("nexusglobal.com") &&
      newTenant.allowed_domains.includes("nexus.io"),
    "Multiple corporate domains whitelisted successfully"
  );
  assert(
    newTenant.is_suspended === false && newTenant.subscription_status === "ACTIVE",
    "Provisioned tenant initializes in ACTIVE state"
  );

  // 2. Domain Whitelisting Gatekeeper on Registration
  const validNexusUser = await localDb.createProfile({
    fullName: "Arjun Mehta",
    email: "arjun@nexusglobal.com",
    role: "COMPANY_ADMIN",
    orgId: newTenant.id,
  });
  assert(
    validNexusUser.profile !== null && validNexusUser.profile.email === "arjun@nexusglobal.com",
    "User with authorized whitelisted domain (@nexusglobal.com) is admitted"
  );

  const secondDomainUser = await localDb.createProfile({
    fullName: "Sarah Chen",
    email: "sarah@nexus.io",
    role: "DELEGATOR",
    orgId: newTenant.id,
  });
  assert(
    secondDomainUser.profile !== null && secondDomainUser.profile.email === "sarah@nexus.io",
    "User with secondary whitelisted domain (@nexus.io) is admitted"
  );

  const unauthorizedUser = await localDb.createProfile({
    fullName: "Intruder Attempt",
    email: "badactor@yahoo.com",
    role: "DELEGATEE",
    orgId: newTenant.id,
  });
  assert(
    unauthorizedUser.profile === null && !!unauthorizedUser.error,
    "Unauthorized domain (@yahoo.com) rejected with explicit error message"
  );

  // 3. Platform Master Kill Switch Activation
  const suspendedTenant = await localDb.toggleOrganizationKillSwitch(
    newTenant.id,
    true,
    "Non-payment of Enterprise License fee"
  );
  assert(
    suspendedTenant !== null &&
      suspendedTenant.is_suspended === true &&
      suspendedTenant.subscription_status === "SUSPENDED" &&
      suspendedTenant.suspension_reason === "Non-payment of Enterprise License fee",
    "Platform Master Kill Switch successfully suspends tenant with audit reason"
  );

  // 4. Verification that Suspended Tenant Blocks Operations
  const retrievedOrg = await localDb.getOrganizationById(newTenant.id);
  assert(
    retrievedOrg !== null && retrievedOrg.is_suspended === true,
    "Database queries reflect suspended tenant status immediately"
  );

  // 5. Reactivation of Tenant via Superadmin Console
  const reactivated = await localDb.toggleOrganizationKillSwitch(newTenant.id, false);
  assert(
    reactivated !== null &&
      reactivated.is_suspended === false &&
      reactivated.subscription_status === "ACTIVE" &&
      reactivated.suspension_reason === null,
    "Superadmin can reactivate suspended tenant restoring full operational access"
  );

  // 6. Role Hierarchy Integrity Check
  const profiles = await localDb.getProfiles();
  const superadmin = profiles.find((p) => p.role === "SUPERADMIN");
  const compAdmin = profiles.find((p) => p.role === "COMPANY_ADMIN");
  const admin = profiles.find((p) => p.role === "ADMIN");
  const boss = profiles.find((p) => p.role === "BOSS");
  const delegator = profiles.find((p) => p.role === "DELEGATOR");
  const delegatee = profiles.find((p) => p.role === "DELEGATEE");

  assert(
    !!superadmin && !!compAdmin && !!admin && !!boss && !!delegator && !!delegatee,
    "All 6 role tiers (Superadmin, Company Admin, Admin, Boss, Delegator, Delegatee) are provisioned"
  );

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!\n");
  }
}

runPhase3Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

