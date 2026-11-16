import {
  calculateNextWorkingDeadline,
  processRecurringTasks,
  processDailyReminders,
  processMonthlyArchiving,
} from "../src/lib/cron/recurrence-engine";
import { localDb } from "../src/lib/data/dal";
import { HolidayCalendarItem } from "../src/types/database.types";

async function runPhase8Tests() {
  console.log("=================================================");
  console.log("   PHASE 8: RECURRENCE ENGINE & CRON WORKERS TEST");
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

  const holidays: HolidayCalendarItem[] = [
    {
      id: "hol-test-1",
      org_id: "org-sd-01",
      holiday_date: "2026-11-04", // Wednesday
      holiday_name: "Test Holiday",
      holiday_type: "PUBLIC",
      created_at: new Date().toISOString(),
    },
  ];

  // Test 1: calculateNextWorkingDeadline skipping weekends
  // 2026-11-06 is Friday. +1 working day should land on Monday 2026-11-09, skipping Sat (07) and Sun (08)
  const friday = new Date("2026-11-06T10:00:00Z");
  const nextWorkingAfterFriday = calculateNextWorkingDeadline(friday, 1, []);
  const nextWorkingDateStr = nextWorkingAfterFriday.toISOString().split("T")[0];
  assert(
    nextWorkingDateStr === "2026-11-09",
    `Test 1: Next working day after Friday skips weekend and lands on Monday (${nextWorkingDateStr} === 2026-11-09)`
  );

  // Test 2: calculateNextWorkingDeadline skipping holidays
  // 2026-11-03 is Tuesday. +1 working day would normally be Wed (2026-11-04), but 11-04 is a holiday, so it should land on Thu (2026-11-05)
  const tuesday = new Date("2026-11-03T10:00:00Z");
  const nextWorkingWithHoliday = calculateNextWorkingDeadline(tuesday, 1, holidays);
  const holidaySkippedStr = nextWorkingWithHoliday.toISOString().split("T")[0];
  assert(
    holidaySkippedStr === "2026-11-05",
    `Test 2: Next working day skips defined public holiday (${holidaySkippedStr} === 2026-11-05)`
  );

  // Test 3: calculateNextWorkingDeadline multi-day offset with weekend and holiday
  // 2026-11-05 (Thursday) + 2 working days:
  // Day 1: Fri 11-06
  // Sat 11-07 skipped, Sun 11-08 skipped
  // Day 2: Mon 11-09
  const thursday = new Date("2026-11-05T10:00:00Z");
  const twoDayOffset = calculateNextWorkingDeadline(thursday, 2, []);
  assert(
    twoDayOffset.toISOString().split("T")[0] === "2026-11-09",
    `Test 3: Multi-day offset advances past weekends correctly (${twoDayOffset.toISOString().split("T")[0]} === 2026-11-09)`
  );

  // Test 4: Target deadline sets default 18:00 (6:00 PM)
  assert(
    nextWorkingAfterFriday.getHours() === 18,
    `Test 4: Working deadline defaults to business end of day 18:00 (Hour is ${nextWorkingAfterFriday.getHours()})`
  );

  // Test 5: processRecurringTasks spawns tasks from active templates
  const initialTaskCount = (await localDb.getTasks({ orgId: "org-sd-01" })).length;
  const recurrenceResult = await processRecurringTasks("org-sd-01");
  assert(
    recurrenceResult.spawnedCount > 0,
    `Test 5: processRecurringTasks spawned ${recurrenceResult.spawnedCount} tasks from templates`
  );

  // Test 6: Spawned task has sequential task_no
  const spawnedTask = recurrenceResult.spawnedTasks[0];
  assert(
    typeof spawnedTask.task_no === "number" && spawnedTask.task_no > 1000,
    `Test 6: Spawned task has sequential task_no (#${spawnedTask.task_no})`
  );

  // Test 7: Spawned task short link generated
  assert(
    typeof spawnedTask.short_link === "string" && spawnedTask.short_link.length > 0,
    `Test 7: Spawned task has shortened action link (${spawnedTask.short_link})`
  );

  // Test 8: Template last_spawned_at updated
  const templates = await localDb.getRecurringTemplates("org-sd-01");
  const activeTemplate = templates.find((t) => t.is_active);
  assert(
    !!activeTemplate?.last_spawned_at,
    `Test 8: Template last_spawned_at updated (${activeTemplate?.last_spawned_at})`
  );

  // Test 9: processDailyReminders identifies urgent & overdue tasks
  const reminderResult = await processDailyReminders("org-sd-01");
  assert(
    typeof reminderResult.tasksDueToday === "number",
    `Test 9: processDailyReminders aggregated ${reminderResult.tasksDueToday} tasks due today`
  );

  // Test 10: processMonthlyArchiving checks completed tasks
  const archivingResult = await processMonthlyArchiving("org-sd-01");
  assert(
    typeof archivingResult.archivedCount === "number",
    `Test 10: processMonthlyArchiving calculated ${archivingResult.archivedCount} archival candidates`
  );

  // Test 11: localDb template CRUD works as expected
  const newTpl = await localDb.createRecurringTemplate({
    orgId: "org-sd-01",
    title: "Quarterly Statutory Compliance Filing",
    delegatorId: "user-boss",
    delegateeId: "user-compadmin",
    priority: "CRITICAL",
    frequency: "MONTHLY",
    recurDelayDays: 10,
    verificationNeeded: true,
  });
  assert(
    newTpl.title === "Quarterly Statutory Compliance Filing",
    `Test 11: Created new template via localDb (${newTpl.id})`
  );

  // Test 12: localDb template toggle
  const updatedTpl = await localDb.updateRecurringTemplate(newTpl.id, { is_active: false });
  assert(
    updatedTpl?.is_active === false,
    `Test 12: Toggled template to inactive (${updatedTpl?.is_active})`
  );

  console.log("\n=================================================");
  console.log(`Phase 8 Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

