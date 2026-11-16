import { localDb } from "../src/lib/data/dal";

async function runPhase11Tests() {
  console.log("=================================================");
  console.log("   PHASE 11: ANALYTICS, LEADERBOARDS & SCORECARDS TEST");
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

  // Test 1: Retrieve Analytics Summary
  const summary = await localDb.getAnalyticsSummary(orgId);
  assert(
    typeof summary.totalTasks === "number" && summary.totalTasks > 0,
    `Test 1: Analytics summary calculates total tasks (${summary.totalTasks})`
  );

  // Test 2: Completion Rate calculation
  assert(
    typeof summary.completionRate === "number" &&
      summary.completionRate >= 0 &&
      summary.completionRate <= 100,
    `Test 2: Completion rate mathematically bounded (${summary.completionRate}%)`
  );

  // Test 3: On-time delivery SLA
  assert(
    typeof summary.onTimeDeliveryRate === "number" &&
      summary.onTimeDeliveryRate >= 0 &&
      summary.onTimeDeliveryRate <= 100,
    `Test 3: On-time SLA rate mathematically bounded (${summary.onTimeDeliveryRate}%)`
  );

  // Test 4: Department breakdowns present
  assert(
    Array.isArray(summary.departmentBreakdown) && summary.departmentBreakdown.length > 0,
    `Test 4: Department throughput breakdown aggregated (${summary.departmentBreakdown.length} departments)`
  );

  // Test 5: User Scorecards generation
  const scorecards = await localDb.getUserScorecards(orgId);
  assert(
    scorecards.length > 0,
    `Test 5: Generated user scorecards for assignees (${scorecards.length} scorecards)`
  );

  // Test 6: Leaderboard ranking is strictly ordered descending
  let isSorted = true;
  for (let i = 0; i < scorecards.length - 1; i++) {
    if (scorecards[i].averageScore < scorecards[i + 1].averageScore) {
      isSorted = false;
      break;
    }
  }
  assert(
    isSorted,
    `Test 6: Scorecards leaderboard correctly ranked by descending performance score`
  );

  // Test 7: Rank sequence 1, 2, 3...
  assert(
    scorecards[0].rank === 1,
    `Test 7: Top scorer awarded Gold #1 Rank (${scorecards[0].fullName})`
  );

  console.log("\n=================================================");
  console.log(`Phase 11 Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase11Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

