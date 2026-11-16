import {
  normalizeLegacyDate,
  normalizePriority,
  normalizeStatus,
  runHistoricalDataMigration,
  LegacySheetTaskRow,
  LegacySheetRecurringRow,
} from "./migrate-from-sheets";
import { localDb } from "../src/lib/data/dal";

async function runPhase13Tests() {
  console.log("=================================================");
  console.log("   PHASE 13: GOOGLE SHEETS DATA MIGRATION ETL TEST");
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

  // Test 1: Date Normalization
  const d1 = normalizeLegacyDate("25-10-2026");
  assert(d1.startsWith("2026-10-25"), `Test 1a: Normalized DD-MM-YYYY date (${d1})`);

  const d2 = normalizeLegacyDate("2026-11-02T10:00:00Z");
  assert(d2.startsWith("2026-11-02T10:00:00"), `Test 1b: Preserved ISO date string (${d2})`);

  // Test 2: Priority Normalization
  assert(normalizePriority("URGENT") === "CRITICAL", `Test 2a: 'URGENT' mapped to CRITICAL`);
  assert(normalizePriority("High") === "HIGH", `Test 2b: 'High' mapped to HIGH`);
  assert(normalizePriority("unknown") === "MEDIUM", `Test 2c: Fallback priority mapped to MEDIUM`);

  // Test 3: Status Normalization
  assert(normalizeStatus("COMPLETED") === "DONE", `Test 3a: 'COMPLETED' mapped to DONE`);
  assert(
    normalizeStatus("VERIFICATION_PENDING") === "AWAITING_VERIFICATION",
    `Test 3b: 'VERIFICATION_PENDING' mapped to AWAITING_VERIFICATION`
  );
  assert(normalizeStatus("WIP") === "IN_PROGRESS", `Test 3c: 'WIP' mapped to IN_PROGRESS`);

  // Test 4: Batch Migration of Historical Google Sheet Tasks
  const sampleLegacyRows: LegacySheetTaskRow[] = [
    {
      taskNo: 1050,
      timestamp: "2026-09-10",
      delegatorEmail: "rajesh.kumar@stackdrove.com",
      delegateeEmail: "priya.sharma@stackdrove.com",
      departmentName: "Technology",
      title: "Legacy Sheet Task #1: Q2 Financial Audit Migration",
      description: "Historical task imported from legacy Google Sheets CTMS.",
      priority: "HIGH",
      targetDate: "15-09-2026",
      completionDate: "15-09-2026",
      status: "COMPLETED",
      revisions: 0,
      verificationNeeded: true,
      isVerified: true,
      allocatedScore: 10.0,
      actualScore: 10.0,
      delayDays: 0,
    },
    {
      taskNo: 1051,
      timestamp: "2026-09-12",
      delegatorEmail: "rajesh.kumar@stackdrove.com",
      delegateeEmail: "amit.verma@stackdrove.com",
      departmentName: "Operations",
      title: "Legacy Sheet Task #2: Warehouse Inventory Count",
      priority: "CRITICAL",
      targetDate: "20-09-2026",
      status: "IN PROGRESS",
      verificationNeeded: true,
      allocatedScore: 10.0,
    },
    {
      taskNo: 1052,
      timestamp: "2026-09-15",
      delegatorEmail: "rohan.mehra@stackdrove.com",
      delegateeEmail: "priya.sharma@stackdrove.com",
      title: "Legacy Sheet Task #3: API Endpoint Documentation",
      targetDate: "25-09-2026",
      status: "VERIFICATION_PENDING",
      verificationNeeded: true,
      allocatedScore: 10.0,
    },
  ];

  const sampleRecurringRows: LegacySheetRecurringRow[] = [
    {
      templateTitle: "Historical Daily Security Audit",
      frequency: "DAILY",
      recurDelayDays: 1,
      delegatorEmail: "rohan.mehra@stackdrove.com",
      delegateeEmail: "priya.sharma@stackdrove.com",
      priority: "HIGH",
      verificationNeeded: false,
    },
  ];

  const migrationSummary = await runHistoricalDataMigration(
    sampleLegacyRows,
    sampleRecurringRows,
    "org-sd-01"
  );

  assert(
    migrationSummary.tasksImported === 3,
    `Test 4: Successfully migrated ${migrationSummary.tasksImported}/3 historical tasks`
  );
  assert(
    migrationSummary.recurringImported === 1,
    `Test 5: Successfully migrated ${migrationSummary.recurringImported}/1 recurring templates`
  );
  assert(
    migrationSummary.errors.length === 0,
    `Test 6: Zero migration errors reported (100% data integrity)`
  );

  console.log("\n=================================================");
  console.log(`Phase 13 Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase13Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
