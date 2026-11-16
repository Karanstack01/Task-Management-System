import { localDb } from "../src/lib/data/dal";
import { sendTaskVerifiedAlertAction } from "../src/app/actions/notification-actions";

async function runPhase9Tests() {
  console.log("=================================================");
  console.log("   PHASE 9: VERIFICATION & SCORING PIPELINE TEST");
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
  const proof = (completionDate: string) => ({
    completionDate,
    deliverables: {
      fileName: "proof.pdf",
      fileUrl: "https://res.cloudinary.com/demo/sample.pdf",
      cloudinaryPublicId: "tests/proof",
      uploadedBy: "user-del-1",
    },
  });

  // Test 1: On-time completion awards full score (10.0 / 10.0)
  const taskOnTime = await localDb.createTask({
    orgId,
    title: "Test Task On Time",
    delegatorId: "user-delegator",
    delegateeId: "user-del-1",
    priority: "HIGH",
    initialTargetDate: "2026-11-02T18:00:00Z",
    frequency: "ONE_TIME",
    verificationNeeded: true,
    allocatedScore: 10.0,
  });

  // Delegatee submits on time
  await localDb.updateTaskStatus(
    taskOnTime.id,
    "AWAITING_VERIFICATION",
    proof("2026-11-02T17:00:00Z")
  );

  const verifiedOnTime = await localDb.verifyTask(taskOnTime.id, "APPROVE", {
    verifiedBy: "user-delegator",
    remarks: "Great work, completed on time.",
  });

  assert(
    verifiedOnTime?.actual_score === 10.0 && verifiedOnTime?.delay_days === 0,
    `Test 1: On-time task awarded full 10.00/10.00 (Score: ${verifiedOnTime?.actual_score}, Delay: ${verifiedOnTime?.delay_days})`
  );
  assert(
    verifiedOnTime?.status === "DONE" && verifiedOnTime?.is_verified === true,
    `Test 1b: Task transitioned to DONE and is_verified=true`
  );

  // Test 2: 2 days late submission deducts 40% (Score 6.00 / 10.00)
  const task2DaysLate = await localDb.createTask({
    orgId,
    title: "Test Task 2 Days Late",
    delegatorId: "user-delegator",
    delegateeId: "user-del-2",
    priority: "MEDIUM",
    initialTargetDate: "2026-11-01T18:00:00Z",
    frequency: "ONE_TIME",
    verificationNeeded: true,
    allocatedScore: 10.0,
  });

  // Submitted 2 days late (2026-11-03)
  await localDb.updateTaskStatus(
    task2DaysLate.id,
    "AWAITING_VERIFICATION",
    proof("2026-11-03T18:00:00Z")
  );

  const verified2DaysLate = await localDb.verifyTask(task2DaysLate.id, "APPROVE", {
    verifiedBy: "user-delegator",
  });

  assert(
    verified2DaysLate?.delay_days === 2 && verified2DaysLate?.actual_score === 6.0,
    `Test 2: Task 2 days late correctly deducted to 6.00/10.00 (Score: ${verified2DaysLate?.actual_score}, Delay: ${verified2DaysLate?.delay_days})`
  );

  // Test 3: 5+ days late submission floored at 0.00
  const task6DaysLate = await localDb.createTask({
    orgId,
    title: "Test Task 6 Days Late",
    delegatorId: "user-delegator",
    delegateeId: "user-del-1",
    priority: "LOW",
    initialTargetDate: "2026-10-25T18:00:00Z",
    frequency: "ONE_TIME",
    verificationNeeded: true,
    allocatedScore: 10.0,
  });

  await localDb.updateTaskStatus(
    task6DaysLate.id,
    "AWAITING_VERIFICATION",
    proof("2026-10-31T18:00:00Z") // 6 days late
  );

  const verified6DaysLate = await localDb.verifyTask(task6DaysLate.id, "APPROVE", {
    verifiedBy: "user-delegator",
  });

  assert(
    verified6DaysLate?.actual_score === 0.0,
    `Test 3: 6 days late floored at 0.00/10.00 (Score: ${verified6DaysLate?.actual_score})`
  );

  // Test 4: Manager score override takes precedence
  const taskOverride = await localDb.createTask({
    orgId,
    title: "Test Task Override",
    delegatorId: "user-delegator",
    delegateeId: "user-del-2",
    priority: "HIGH",
    initialTargetDate: "2026-11-01T18:00:00Z",
    frequency: "ONE_TIME",
    verificationNeeded: true,
    allocatedScore: 10.0,
  });

  await localDb.updateTaskStatus(
    taskOverride.id,
    "AWAITING_VERIFICATION",
    proof("2026-11-03T18:00:00Z") // 2 days late (would normally be 6.0)
  );

  const verifiedOverride = await localDb.verifyTask(taskOverride.id, "APPROVE", {
    verifiedBy: "user-delegator",
    remarks: "Exceptional output despite delay. Override score granted.",
    overrideScore: 8.5, // Manager discretionary override
  });

  assert(
    verifiedOverride?.actual_score === 8.5,
    `Test 4: Discretionary score override respected (Score: ${verifiedOverride?.actual_score})`
  );

  // Test 5: Rejection returns task to IN_PROGRESS
  const taskRejected = await localDb.createTask({
    orgId,
    title: "Test Task Rejection",
    delegatorId: "user-delegator",
    delegateeId: "user-del-1",
    priority: "CRITICAL",
    initialTargetDate: "2026-11-05T18:00:00Z",
    frequency: "ONE_TIME",
    verificationNeeded: true,
    allocatedScore: 10.0,
  });

  await localDb.updateTaskStatus(
    taskRejected.id,
    "AWAITING_VERIFICATION",
    proof("2026-11-02T12:00:00Z")
  );

  const rejectedResult = await localDb.verifyTask(taskRejected.id, "REJECT", {
    verifiedBy: "user-delegator",
    remarks: "Missing appendix tables and executive summary. Please revise.",
  });

  assert(
    rejectedResult?.status === "IN_PROGRESS" && rejectedResult?.is_verified === false,
    `Test 5: Rejected task returned to IN_PROGRESS with is_verified=false`
  );

  // Test 6: Real-time notification action execution
  const alertRes = await sendTaskVerifiedAlertAction({
    orgId,
    delegateeEmail: "priya.sharma@stackdrove.com",
    delegateePhone: "+919876543212",
    delegateeName: "Priya Sharma",
    verifiedByName: "Rajesh Kumar",
    taskNo: taskOnTime.task_no,
    title: taskOnTime.title,
    score: 10.0,
    delayDays: 0,
    remarks: "Delivered strictly on schedule.",
  });

  assert(alertRes.success === true, `Test 6: Real-time alert dispatched to delegatee`);

  console.log("\n=================================================");
  console.log(`Phase 9 Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

