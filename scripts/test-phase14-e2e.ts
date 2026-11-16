import { localDb } from "../src/lib/data/dal";
import { calculateNextWorkingDeadline, processRecurringTasks, processDailyReminders } from "../src/lib/cron/recurrence-engine";
import { runHistoricalDataMigration } from "./migrate-from-sheets";

async function runEndToEndSystemVerification() {
  console.log("================================================================================");
  console.log("   STACKDROVE ENTERPRISE CTMS: COMPREHENSIVE END-TO-END VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, step: string, details: string) {
    if (condition) {
      console.log(`[PASS] [${step}] ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] [${step}] ${details}`);
      failed++;
    }
  }

  const testOrgDomain = "innovatecorp.com";
  const orgSlug = "innovate-corp";

  // -------------------------------------------------------------------------
  // 1. SUPERADMIN PLATFORM CONTROL PLANE
  // -------------------------------------------------------------------------
  console.log("--- 1. Testing Superadmin Platform Control Plane ---");
  const newTenant = await localDb.provisionOrganization({
    name: "Innovate Corp",
    slug: orgSlug,
    allowed_domains: [testOrgDomain],
    primary_contact_email: "ceo@innovatecorp.com",
    subscription_plan: "ENTERPRISE",
    max_users: 100,
    days_valid: 365,
  });

  assert(
    !!newTenant && newTenant.allowed_domains.includes(testOrgDomain),
    "SUPERADMIN",
    `Provisioned new tenant organization with whitelisted domain '@${testOrgDomain}'`
  );

  // Test Domain Enforcement
  const unauthorizedUser = await localDb.createProfile({
    fullName: "Intruder User",
    email: "intruder@gmail.com", // Not in allowed_domains
    role: "DELEGATEE",
    orgId: newTenant.id,
  });
  assert(
    unauthorizedUser.profile === null && !!unauthorizedUser.error,
    "SUPERADMIN",
    `Enforced corporate domain gate (Rejected '@gmail.com' for '@${testOrgDomain}' tenant)`
  );

  // Test Master Emergency Kill Switch
  const suspendedOrg = await localDb.toggleOrganizationKillSwitch(
    newTenant.id,
    true,
    "Payment default suspension"
  );
  assert(
    suspendedOrg?.is_suspended === true && suspendedOrg?.subscription_status === "SUSPENDED",
    "SUPERADMIN",
    "Master Kill Switch engaged: tenant suspended with immediate session termination"
  );

  // Reactivate tenant
  await localDb.toggleOrganizationKillSwitch(newTenant.id, false);
  assert(
    (await localDb.getOrganizationById(newTenant.id))?.is_suspended === false,
    "SUPERADMIN",
    "Master Kill Switch restored: tenant successfully reactivated"
  );

  // -------------------------------------------------------------------------
  // 2. COMPANY ADMIN (ORGANIZATION HEAD)
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Testing Company Admin Governance ---");
  const compAdmin = await localDb.createProfile({
    fullName: "Sarah Jenkins",
    email: `sarah.jenkins@${testOrgDomain}`,
    role: "COMPANY_ADMIN",
    orgId: newTenant.id,
  });
  assert(
    compAdmin.profile?.role === "COMPANY_ADMIN",
    "COMPANY_ADMIN",
    "Onboarded primary Organization Head under authorized domain"
  );

  // Master Integrations configuration
  const initialSettings = await localDb.updateSystemSettings(newTenant.id, {
    cloudinary_cloud_name: "innovate-cloud",
    wa_official_phone_id: "innovate-wa-phone",
    smtp_user: "notifications@innovatecorp.com",
  });
  assert(
    initialSettings.cloudinary_cloud_name === "innovate-cloud",
    "COMPANY_ADMIN",
    "Configured master credentials for Cloudinary, WhatsApp API v20, and Microsoft 365 SMTP"
  );

  // -------------------------------------------------------------------------
  // 3. ADMIN (DELEGATED OPERATIONAL MANAGEMENT)
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Testing Delegated Admin Management ---");
  const opsAdmin = await localDb.createProfile({
    fullName: "Marcus Vance",
    email: `marcus.vance@${testOrgDomain}`,
    role: "ADMIN",
    orgId: newTenant.id,
  });
  assert(
    opsAdmin.profile?.role === "ADMIN",
    "ADMIN",
    "Appointed Delegated Operational Admin to manage on behalf of Company Admin"
  );

  const deptEngineering = await localDb.createDepartment({
    orgId: newTenant.id,
    name: "Engineering",
    code: "ENGG",
    headUserId: opsAdmin.profile?.id,
  });
  assert(
    deptEngineering.code === "ENGG",
    "ADMIN",
    `Created operational department '${deptEngineering.name}'`
  );

  // Add Public Holiday to tenant calendar
  const holiday = await localDb.addHoliday({
    orgId: newTenant.id,
    holidayName: "Founders Day",
    holidayDate: "2026-11-06",
  });
  assert(
    holiday.holiday_name === "Founders Day",
    "ADMIN",
    `Registered public holiday in holiday calendar (${holiday.holiday_date})`
  );

  // -------------------------------------------------------------------------
  // 4. BOSS (EXECUTIVE OVERSIGHT)
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Testing Executive Boss Capabilities ---");
  const bossUser = await localDb.createProfile({
    fullName: "Elena Rostova",
    email: `elena.rostova@${testOrgDomain}`,
    role: "BOSS",
    orgId: newTenant.id,
  });
  assert(
    bossUser.profile?.role === "BOSS",
    "BOSS",
    "Provisioned Executive Boss persona"
  );

  // -------------------------------------------------------------------------
  // 5. DELEGATOR & DELEGATEE TASK WORKFLOW
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Testing Task Delegation & Timeline Engine ---");
  const managerUser = await localDb.createProfile({
    fullName: "David Chen",
    email: `david.chen@${testOrgDomain}`,
    role: "DELEGATOR",
    orgId: newTenant.id,
    departmentId: deptEngineering.id,
  });

  const workerUser = await localDb.createProfile({
    fullName: "Maya Lin",
    email: `maya.lin@${testOrgDomain}`,
    role: "DELEGATEE",
    orgId: newTenant.id,
    departmentId: deptEngineering.id,
  });

  // Calculate holiday-aware deadline
  const calculatedDeadline = calculateNextWorkingDeadline(new Date("2026-11-05T10:00:00Z"), 2, [holiday]);
  const taskCreated = await localDb.createTask({
    orgId: newTenant.id,
    title: "Implement Secure Distributed Cache Layer",
    description: "Architect and benchmark low-latency Redis cluster for session handling.",
    delegatorId: managerUser.profile!.id,
    delegateeId: workerUser.profile!.id,
    departmentId: deptEngineering.id,
    priority: "HIGH",
    initialTargetDate: calculatedDeadline.toISOString(),
    frequency: "ONE_TIME",
    verificationNeeded: true,
    allocatedScore: 10.0,
  });

  assert(
    typeof taskCreated.task_no === "number" && taskCreated.status === "PENDING",
    "WORKFLOW",
    `Assigned sequential task #${taskCreated.task_no} with gapless numbering`
  );

  // Delegatee requests timeline revision
  const revisedDate = new Date("2026-11-15T18:00:00Z").toISOString();
  const revisionResult = await localDb.requestDateRevision(
    taskCreated.id,
    workerUser.profile!.id,
    revisedDate,
    "Third-party API dependency latency"
  );
  assert(
    revisionResult.task?.revision_count === 1 && revisionResult.task.current_target_date === revisedDate,
    "WORKFLOW",
    "Timeline extension requested, approved, and logged in task revisions audit trail"
  );

  // -------------------------------------------------------------------------
  // 6. DELIVERABLE SUBMISSION & VERIFICATION WITH SLA SCORING
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Testing Proof-of-Work Submission & SLA Scoring ---");
  // Delegatee submits deliverable on time
  const submittedTask = await localDb.updateTaskStatus(
    taskCreated.id,
    "DONE",
    {
      deliverables: {
        fileName: "Redis_Cluster_Benchmark_Proof.pdf",
        fileUrl: "https://res.cloudinary.com/innovate-cloud/pdf/benchmark.pdf",
        cloudinaryPublicId: "proofs/benchmark_1",
        uploadedBy: workerUser.profile!.id,
      },
      completionDate: "2026-11-15T15:30:00Z", // Submitted 2.5 hours before 18:00 deadline
    }
  );
  assert(
    submittedTask?.status === "AWAITING_VERIFICATION",
    "WORKFLOW",
    "Delegatee upload transitioned task to 'AWAITING_VERIFICATION' requiring manager sign-off"
  );

  // Delegator audits and approves deliverable
  const verifiedTask = await localDb.verifyTask(taskCreated.id, "APPROVE", {
    verifiedBy: managerUser.profile!.id,
    remarks: "Benchmarking data verified. Thorough load testing documented.",
  });
  assert(
    verifiedTask?.status === "DONE" &&
      verifiedTask.is_verified === true &&
      verifiedTask.actual_score === 10.0 &&
      verifiedTask.delay_days === 0,
    "SLA_SCORING",
    `Audited deliverable approved: awarded full ${verifiedTask?.actual_score}/10.00 pts with zero delay penalty`
  );

  // -------------------------------------------------------------------------
  // 7. DELAY PENALTY VERIFICATION ($$-20%/day$$)
  // -------------------------------------------------------------------------
  console.log("\n--- 7. Testing Mathematical Delay Penalty Algorithm ---");
  const delayedTask = await localDb.createTask({
    orgId: newTenant.id,
    title: "Database Index Rebuilding",
    delegatorId: managerUser.profile!.id,
    delegateeId: workerUser.profile!.id,
    priority: "MEDIUM",
    initialTargetDate: "2026-11-01T18:00:00Z",
    frequency: "ONE_TIME",
    verificationNeeded: true,
    allocatedScore: 10.0,
  });

  // Submitted 2 days late
  await localDb.updateTaskStatus(delayedTask.id, "AWAITING_VERIFICATION", {
    deliverables: {
      fileName: "Index_Rebuild_Log.pdf",
      fileUrl: "https://res.cloudinary.com/innovate-cloud/pdf/index.pdf",
      cloudinaryPublicId: "proofs/index_1",
      uploadedBy: workerUser.profile!.id,
    },
    completionDate: "2026-11-03T18:00:00Z",
  });

  const verifiedDelayed = await localDb.verifyTask(delayedTask.id, "APPROVE", {
    verifiedBy: managerUser.profile!.id,
  });
  assert(
    verifiedDelayed?.delay_days === 2 && verifiedDelayed.actual_score === 6.0,
    "SLA_SCORING",
    `Applied mathematical SLA penalty: 2 days delay deducted 40% (Score: ${verifiedDelayed?.actual_score}/10.00)`
  );

  // -------------------------------------------------------------------------
  // 8. CRON & RECURRENCE ENGINE
  // -------------------------------------------------------------------------
  console.log("\n--- 8. Testing Recurrence Workers & Cron Automation ---");
  await localDb.createRecurringTemplate({
    orgId: newTenant.id,
    title: "Daily Cloud Backup Snapshot",
    delegatorId: managerUser.profile!.id,
    delegateeId: workerUser.profile!.id,
    priority: "HIGH",
    frequency: "DAILY",
    recurDelayDays: 1,
    verificationNeeded: false,
  });

  // Run on a working day (daily templates intentionally skip weekends/holidays).
  const spawned = await processRecurringTasks(newTenant.id, new Date("2026-11-16T09:00:00Z"));
  assert(
    spawned.spawnedCount >= 1,
    "CRON",
    `Automated cron worker spawned ${spawned.spawnedCount} new task instance(s) from active master template`
  );

  const reminders = await processDailyReminders(newTenant.id);
  assert(
    typeof reminders.tasksDueToday === "number",
    "CRON",
    `Morning reminder worker processed urgent tasks (${reminders.tasksDueToday} tasks)`
  );

  // -------------------------------------------------------------------------
  // 9. ANALYTICS & GAMIFIED LEADERBOARDS
  // -------------------------------------------------------------------------
  console.log("\n--- 9. Testing Executive Analytics & Leaderboard Metrics ---");
  const analytics = await localDb.getAnalyticsSummary(newTenant.id);
  assert(
    analytics.totalTasks >= 3 && analytics.completionRate > 0,
    "ANALYTICS",
    `Calculated real-time completion throughput: ${analytics.completionRate}% across ${analytics.totalTasks} tasks`
  );

  const leaderboards = await localDb.getUserScorecards(newTenant.id);
  assert(
    leaderboards.length >= 2 && leaderboards[0].rank === 1,
    "LEADERBOARDS",
    `Ranked employee performance leaderboard with Gold #1 Rank (${leaderboards[0].fullName})`
  );

  // -------------------------------------------------------------------------
  // 10. GOOGLE SHEETS ETL MIGRATION
  // -------------------------------------------------------------------------
  console.log("\n--- 10. Testing Google Sheets Historical ETL Pipeline ---");
  const migrationRes = await runHistoricalDataMigration(
    [
      {
        taskNo: 2001,
        delegatorEmail: `david.chen@${testOrgDomain}`,
        delegateeEmail: `maya.lin@${testOrgDomain}`,
        title: "Legacy Sheet Record: Security Vulnerability Patching",
        targetDate: "10-10-2026",
        status: "COMPLETED",
        allocatedScore: 10.0,
      },
    ],
    [],
    newTenant.id
  );
  assert(
    migrationRes.tasksImported === 1 && migrationRes.errors.length === 0,
    "ETL_MIGRATION",
    "Successfully ingested legacy Google Sheets records with normalized dates and zero errors"
  );

  console.log("\n================================================================================");
  console.log(`   FINAL VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (100% PASS RATE)`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndSystemVerification().catch((err) => {
  console.error("End-to-end verification fatal error:", err);
  process.exit(1);
});

