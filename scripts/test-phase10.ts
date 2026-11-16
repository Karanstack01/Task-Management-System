import { localDb } from "../src/lib/data/dal";

async function runPhase10Tests() {
  console.log("=================================================");
  console.log("   PHASE 10: MULTI-TIER PORTALS & RBAC ROLES TEST");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const orgId = "org-sd-01";

  // Test 1: Superadmin platform level - get all orgs
  const orgs = await localDb.getOrganizations();
  assert(orgs.length >= 2, `Test 1: Superadmin accesses global organizations (${orgs.length} orgs)`);

  // Test 2: Company Admin appoints Delegated Admin
  const targetUser = await localDb.getProfiles(orgId);
  const employeeToPromote = targetUser.find((u) => u.role === "DELEGATOR");
  assert(!!employeeToPromote, `Test 2a: Found employee candidate for Admin delegation`);

  if (employeeToPromote) {
    const promoted = await localDb.updateProfileRole(employeeToPromote.id, "ADMIN");
    assert(
      promoted?.role === "ADMIN",
      `Test 2b: Company Admin successfully appointed ${promoted?.full_name} as Delegated Admin`
    );

    // Restore back
    await localDb.updateProfileRole(employeeToPromote.id, "DELEGATOR");
  }

  // Test 3: Company Admin updates master enterprise integrations
  const updatedSettings = await localDb.updateSystemSettings(orgId, {
    cloudinary_cloud_name: "test-cloud-updated",
    wa_official_phone_id: "999888777666",
  });
  assert(
    updatedSettings.cloudinary_cloud_name === "test-cloud-updated" &&
      updatedSettings.wa_official_phone_id === "999888777666",
    `Test 3: Company Admin updated master integrations credentials`
  );

  // Test 4: Admin creates new operational department
  const newDept = await localDb.createDepartment({
    orgId,
    name: "Customer Success",
    code: "CSUC",
  });
  assert(
    newDept.name === "Customer Success" && newDept.code === "CSUC",
    `Test 4: Admin created new operational department (${newDept.id})`
  );

  // Test 5: Admin creates user under whitelisted domain
  const userResult = await localDb.createProfile({
    fullName: "Ananya Roy",
    email: "ananya.roy@stackdrove.com",
    role: "DELEGATEE",
    orgId,
    departmentId: newDept.id,
  });
  assert(
    !!userResult.profile && userResult.profile.full_name === "Ananya Roy",
    `Test 5: Admin onboarded employee under whitelisted domain (@stackdrove.com)`
  );

  // Test 6: Boss portal accesses cross-departmental tasks
  const bossTasks = await localDb.getTasks({ orgId, role: "BOSS", userId: "user-boss" });
  assert(
    bossTasks.length > 0,
    `Test 6: Boss portal retrieved cross-departmental task matrix (${bossTasks.length} tasks)`
  );

  // Test 7: Delegator portal scoped strictly to delegated tasks
  const delegatorTasks = await localDb.getTasks({
    orgId,
    role: "DELEGATOR",
    userId: "user-delegator",
  });
  const allMatchDelegator = delegatorTasks.every((t) => t.delegator_id === "user-delegator");
  assert(
    allMatchDelegator && delegatorTasks.length > 0,
    `Test 7: Delegator portal scoped strictly to user-delegator (${delegatorTasks.length} tasks)`
  );

  // Test 8: Delegatee portal scoped strictly to assigned tasks
  const delegateeTasks = await localDb.getTasks({
    orgId,
    role: "DELEGATEE",
    userId: "user-del-1",
  });
  const allMatchDelegatee = delegateeTasks.every((t) => t.delegatee_id === "user-del-1");
  assert(
    allMatchDelegatee && delegateeTasks.length > 0,
    `Test 8: Delegatee portal scoped strictly to user-del-1 (${delegateeTasks.length} tasks)`
  );

  console.log("\n=================================================");
  console.log(`Phase 10 Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

