import { localDb } from "../src/lib/data/dal";

async function runPhase2Tests() {
  console.log("=================================================");
  console.log("STACKDROVE CTMS — PHASE 2 VERIFICATION TEST SUITE");
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

  // 1. Tenant & Organization Retrieval
  const orgs = await localDb.getOrganizations();
  assert(orgs.length >= 3, "Organizations seeded (StackDrove, Acme, Suspended Demo)");

  const stackdrove = await localDb.getOrganizationById("org-sd-01");
  assert(
    stackdrove !== null && stackdrove.subscription_plan === "ENTERPRISE",
    "StackDrove organization has ENTERPRISE subscription plan"
  );

  // 2. Domain Whitelisting Validation
  const validProfileRes = await localDb.createProfile({
    fullName: "Valid Employee",
    email: "valid.user@stackdrove.com",
    role: "DELEGATEE",
    orgId: "org-sd-01",
  });
  assert(validProfileRes.profile !== null, "Whitelisted domain (@stackdrove.com) successfully allowed");

  const invalidProfileRes = await localDb.createProfile({
    fullName: "Hacker / Unknown Domain",
    email: "intruder@gmail.com",
    role: "DELEGATEE",
    orgId: "org-sd-01",
  });
  assert(
    invalidProfileRes.profile === null && !!invalidProfileRes.error,
    "Non-whitelisted domain (@gmail.com) rejected by domain gatekeeper"
  );

  // 3. Platform Master Kill Switch
  const killedOrg = await localDb.toggleOrganizationKillSwitch(
    "org-acme-02",
    true,
    "Non-payment of Enterprise License"
  );
  assert(
    killedOrg !== null && killedOrg.is_suspended === true && killedOrg.subscription_status === "SUSPENDED",
    "Platform Master Kill Switch immediately suspends organization"
  );

  const restoredOrg = await localDb.toggleOrganizationKillSwitch("org-acme-02", false);
  assert(
    restoredOrg !== null && restoredOrg.is_suspended === false && restoredOrg.subscription_status === "ACTIVE",
    "Platform Master Kill Switch reactivates organization cleanly"
  );

  // 4. Sequential Task Numbering
  const createdTask = await localDb.createTask({
    orgId: "org-sd-01",
    title: "Phase 2 Automated Test Task",
    delegatorId: "user-delegator",
    delegateeId: "user-del-1",
    initialTargetDate: new Date(Date.now() + 86400000).toISOString(),
    verificationNeeded: true,
  });
  assert(createdTask.task_no >= 1007, `Sequential task_no incremented properly (assigned #${createdTask.task_no})`);

  // 5. Task Status Workflow (Submit Deliverable -> Awaiting Verification)
  const updated = await localDb.updateTaskStatus(createdTask.id, "DONE", {
    deliverables: {
      fileName: "Proof_of_Work.pdf",
      fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
      cloudinaryPublicId: "ctms/tests/proof_pdf",
      uploadedBy: "user-del-1",
    },
  });
  assert(
    updated !== null && updated.status === "AWAITING_VERIFICATION",
    "Task requiring verification transitions to AWAITING_VERIFICATION when assignee submits"
  );

  // 6. Mathematical Delay Penalty SLA Calculation
  // Test 6a: On-time verification
  const verifiedOnTime = await localDb.verifyTask(createdTask.id, "APPROVE", {
    verifiedBy: "user-delegator",
    remarks: "Approved on time",
  });
  assert(
    verifiedOnTime !== null &&
      verifiedOnTime.is_verified === true &&
      verifiedOnTime.actual_score === 10.0,
    "On-time delivery awards 10.00 / 10.00 score"
  );

  // Test 6b: 2-day delay verification
  const overdueTask = await localDb.createTask({
    orgId: "org-sd-01",
    title: "Overdue Test Task",
    delegatorId: "user-delegator",
    delegateeId: "user-del-2",
    initialTargetDate: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    verificationNeeded: true,
  });
  // Mark completion today (2 days late)
  await localDb.updateTaskStatus(overdueTask.id, "DONE", {
    deliverables: {
      fileName: "Late_Proof.pdf",
      fileUrl: "https://res.cloudinary.com/demo/image/upload/late.pdf",
      cloudinaryPublicId: "ctms/tests/late_pdf",
      uploadedBy: "user-del-2",
    },
  });
  const verifiedLate = await localDb.verifyTask(overdueTask.id, "APPROVE", {
    verifiedBy: "user-delegator",
    remarks: "Delayed submission",
  });
  assert(
    verifiedLate !== null && verifiedLate.delay_days >= 2 && verifiedLate.actual_score === 6.0,
    `2-Day Delay applies 40% penalty (Score: ${verifiedLate?.actual_score}/10, Delay: ${verifiedLate?.delay_days} days)`
  );

  // 7. Revision Limit Enforcement
  const revTask = await localDb.createTask({
    orgId: "org-sd-01",
    title: "Revision Testing Task",
    delegatorId: "user-delegator",
    delegateeId: "user-del-1",
    initialTargetDate: new Date().toISOString(),
  });

  await localDb.requestDateRevision(revTask.id, "user-del-1", new Date().toISOString(), "Rev 1");
  await localDb.requestDateRevision(revTask.id, "user-del-1", new Date().toISOString(), "Rev 2");
  await localDb.requestDateRevision(revTask.id, "user-del-1", new Date().toISOString(), "Rev 3");
  const rev4 = await localDb.requestDateRevision(revTask.id, "user-del-1", new Date().toISOString(), "Rev 4");
  assert(
    rev4.task === null && !!rev4.error,
    "4th revision correctly blocked (max_revision_allowed = 3 limit enforced)"
  );

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("ALL PHASE 2 UNIT & DOMAIN TESTS PASSED SUCCESSFULLY!\n");
  }
}

runPhase2Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

