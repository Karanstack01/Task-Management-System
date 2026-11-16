import { localDb } from "../src/lib/data/dal";

async function runPhase7Tests() {
  console.log("=================================================");
  console.log("STACKDROVE CTMS — PHASE 7 VERIFICATION TEST SUITE");
  console.log("Core Task Management Engine (CRUD & Timelines)");
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

  // 1. Task Sequential Numbering Check
  const t1 = await localDb.createTask({
    orgId: "org-sd-01",
    title: "Sequential Test Task Alpha",
    delegatorId: "user-delegator",
    delegateeId: "user-del-1",
    initialTargetDate: new Date(Date.now() + 86400000).toISOString(),
    priority: "HIGH",
    verificationNeeded: true,
  });

  const t2 = await localDb.createTask({
    orgId: "org-sd-01",
    title: "Sequential Test Task Beta",
    delegatorId: "user-delegator",
    delegateeId: "user-del-2",
    initialTargetDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    priority: "CRITICAL",
    verificationNeeded: true,
  });

  assert(t2.task_no === t1.task_no + 1, `Sequential task_no incremented gaplessly (#${t1.task_no} -> #${t2.task_no})`);

  // 2. Status Workflow & Proof Attachment
  const updatedT1 = await localDb.updateTaskStatus(t1.id, "IN_PROGRESS");
  assert(updatedT1 !== null && updatedT1.status === "IN_PROGRESS", "Task status updated to IN_PROGRESS");

  const submittedT1 = await localDb.updateTaskStatus(t1.id, "DONE", {
    deliverables: {
      fileName: "Final_Deliverable.pdf",
      fileUrl: "https://res.cloudinary.com/demo/sample.pdf",
      cloudinaryPublicId: "stackdrove-ctms/org-sd-01/tasks/t1/proof",
      uploadedBy: "user-del-1",
    },
  });

  assert(
    submittedT1 !== null && submittedT1.status === "AWAITING_VERIFICATION",
    "Submitting deliverable on verification_needed task sets status to AWAITING_VERIFICATION"
  );

  const t1Fetched = await localDb.getTaskById(t1.id);
  assert(
    t1Fetched?.attachments !== undefined && t1Fetched.attachments.length > 0,
    "Proof deliverable metadata persisted into attachments list"
  );

  // 3. Date Extension / Revision Flow
  const originalDate = t2.current_target_date;
  const newExtendedDate = new Date(Date.now() + 86400000 * 5).toISOString();

  const revRes = await localDb.requestDateRevision(
    t2.id,
    "user-del-2",
    newExtendedDate,
    "Vendor delayed shipment by 3 business days."
  );

  assert(revRes.task !== null && revRes.task.revision_count === 1, "Revision count incremented to 1");
  assert(
    revRes.task !== null && revRes.task.current_target_date === newExtendedDate,
    "current_target_date updated to newly requested target date"
  );

  // 4. Verification & Scoring Algorithm
  const verifiedT1 = await localDb.verifyTask(t1.id, "APPROVE", {
    verifiedBy: "user-delegator",
    remarks: "Verified and accepted on time.",
  });

  assert(
    verifiedT1 !== null && verifiedT1.status === "DONE" && verifiedT1.is_verified === true,
    "Verification approval transitions task to DONE and sets is_verified = true"
  );
  assert(
    verifiedT1 !== null && verifiedT1.actual_score === 10.0,
    "On-time verified task awarded full allocated score (10.0/10)"
  );

  // 5. Query & Role Scoping
  const allTasks = await localDb.getTasks({ orgId: "org-sd-01" });
  assert(allTasks.length >= 8, `Org tasks query returns all ${allTasks.length} tasks`);

  const del1Tasks = await localDb.getTasks({
    orgId: "org-sd-01",
    role: "DELEGATEE",
    userId: "user-del-1",
  });
  assert(
    del1Tasks.every((t) => t.delegatee_id === "user-del-1"),
    "Delegatee role query strictly returns assigned tasks only"
  );

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("ALL PHASE 7 VERIFICATION TESTS PASSED SUCCESSFULLY!\n");
  }
}

runPhase7Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

