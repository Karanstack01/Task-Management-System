import { localDb } from "../src/lib/data/dal";
import { isTaskTransitionError, getSelectableStatuses } from "../src/lib/data/task-state-machine";
import { isTaskOverdue, getRevisionBlockReason } from "../src/lib/data/task-utils";
import { getOrgAccessState } from "../src/lib/data/org-lifecycle";
import {
  processRecurringTasks,
  processMonthlyArchiving,
  getSpawnBlockReason,
} from "../src/lib/cron/recurrence-engine";
import type { Organization, RecurringTemplate, TaskStatus } from "../src/types/database.types";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}
async function expectCode(p: Promise<unknown>, code: string, msg: string) {
  try {
    await p;
    assert(false, `${msg} (expected ${code}, got success)`);
  } catch (e) {
    assert(isTaskTransitionError(e) && e.code === code, `${msg} (${isTaskTransitionError(e) ? e.code : String(e)})`);
  }
}

const PROOF = {
  fileName: "proof.pdf",
  fileUrl: "https://res.cloudinary.com/demo/sample.pdf",
  cloudinaryPublicId: "tests/proof",
  uploadedBy: "user-del-1",
};

async function newTask(verificationNeeded: boolean, targetOffsetDays = 2) {
  return localDb.createTask({
    orgId: "org-sd-01",
    title: `SM test ${Math.random().toString(36).slice(2, 7)}`,
    delegatorId: "user-delegator",
    delegateeId: "user-del-1",
    initialTargetDate: new Date(Date.now() + targetOffsetDays * 86400000).toISOString(),
    verificationNeeded,
  });
}

async function run() {
  console.log("=== TASK LIFECYCLE ===");

  // Submitting without proof is refused at the data layer (not just the UI)
  const a = await newTask(true);
  await expectCode(localDb.updateTaskStatus(a.id, "DONE"), "PROOF_REQUIRED", "Submit without proof refused");
  const aSub = await localDb.updateTaskStatus(a.id, "DONE", { deliverables: PROOF });
  assert(aSub.status === "AWAITING_VERIFICATION" && !!aSub.completion_date, "DONE on verification task → AWAITING_VERIFICATION");

  // Drag from review to DONE must go through verification
  await expectCode(localDb.updateTaskStatus(a.id, "DONE"), "USE_VERIFICATION", "AWAITING → DONE via status change refused");

  // Delegatee can't approve
  await expectCode(
    localDb.verifyTask(a.id, "APPROVE", { verifiedBy: "user-del-1", actorRole: "DELEGATEE" }),
    "FORBIDDEN",
    "Delegatee cannot approve"
  );
  const aDone = await localDb.verifyTask(a.id, "APPROVE", { verifiedBy: "user-delegator", actorRole: "DELEGATOR" });
  assert(aDone.status === "DONE" && aDone.is_verified && aDone.actual_score === 10, "Approve → DONE with score");

  // verifyTask on a non-submitted task is refused
  const b = await newTask(true);
  await expectCode(localDb.verifyTask(b.id, "APPROVE", { verifiedBy: "user-delegator" }), "INVALID_TRANSITION", "Cannot approve a PENDING task");

  // Reopening DONE revokes the score; delegatee may not reopen
  await expectCode(localDb.updateTaskStatus(a.id, "IN_PROGRESS", { actorRole: "DELEGATEE" }), "FORBIDDEN", "Delegatee cannot reopen DONE");
  const aReopen = await localDb.updateTaskStatus(a.id, "IN_PROGRESS", { actorRole: "DELEGATOR" });
  assert(
    aReopen.status === "IN_PROGRESS" && !aReopen.is_verified && aReopen.actual_score === 0 && !aReopen.verified_by && !aReopen.completion_date,
    "Reopen clears verification, score and completion"
  );

  // No-verification tasks are scored on direct sign-off
  const c = await newTask(false);
  const cDone = await localDb.updateTaskStatus(c.id, "DONE", { actorRole: "DELEGATEE" });
  assert(cDone.status === "DONE" && cDone.actual_score === 10 && cDone.delay_days === 0, "Direct sign-off awards score");
  const cLate = await newTask(false, -2);
  const cLateDone = await localDb.updateTaskStatus(cLate.id, "DONE");
  assert(cLateDone.delay_days === 2 && cLateDone.actual_score === 6, `Late direct sign-off penalised (${cLateDone.actual_score})`);
  // Dropping a no-verification task on "Under Review" completes it instead of stranding it
  const c2 = await newTask(false);
  const c2Done = await localDb.updateTaskStatus(c2.id, "AWAITING_VERIFICATION");
  assert(c2Done.status === "DONE", "AWAITING on no-verification task resolves to DONE");

  // Cancel / restore are manager-only; cancelled tasks are never overdue
  const d = await newTask(true, -1);
  await expectCode(localDb.updateTaskStatus(d.id, "CANCELLED", { actorRole: "DELEGATEE" }), "FORBIDDEN", "Delegatee cannot cancel");
  const dCan = await localDb.updateTaskStatus(d.id, "CANCELLED", { actorRole: "DELEGATOR" });
  assert(dCan.status === "CANCELLED" && !isTaskOverdue(dCan), "Cancelled + past deadline is not overdue");
  await expectCode(localDb.updateTaskStatus(d.id, "DONE", { actorRole: "DELEGATOR" }), "INVALID_TRANSITION", "CANCELLED → DONE refused");
  const dRestored = await localDb.updateTaskStatus(d.id, "PENDING", { actorRole: "DELEGATOR" });
  assert(dRestored.status === "PENDING", "CANCELLED → PENDING restore");

  // Boss is read-only; OVERDUE can't be written
  await expectCode(localDb.updateTaskStatus(d.id, "IN_PROGRESS", { actorRole: "BOSS" }), "FORBIDDEN", "Boss cannot change status");
  await expectCode(localDb.updateTaskStatus(d.id, "OVERDUE" as TaskStatus), "DERIVED_STATUS", "OVERDUE cannot be stored");

  // Submitted work is not overdue even past deadline
  const e = await newTask(true, -1);
  const eSub = await localDb.updateTaskStatus(e.id, "AWAITING_VERIFICATION", { deliverables: PROOF });
  assert(!isTaskOverdue(eSub), "AWAITING_VERIFICATION past deadline is not overdue");

  // Scoring inputs are frozen after submission
  let frozen = false;
  try {
    await localDb.updateTask(e.id, { verification_needed: false });
  } catch {
    frozen = true;
  }
  assert(frozen, "verification_needed can't be toggled while under review");

  // Selectable statuses reflect the machine
  const opts = getSelectableStatuses(aDone, "DELEGATOR");
  assert(opts.includes("IN_PROGRESS") && !opts.includes("CANCELLED"), `DONE options: ${opts.join(",")}`);

  // Legacy OVERDUE seed is normalized
  const legacy = await localDb.getTaskById("task-uuid-1004");
  assert(legacy?.status === "IN_PROGRESS" && isTaskOverdue(legacy) && legacy.actual_score === 0, "Seed #1004 is open + derived overdue");

  console.log("\n=== REVISIONS ===");
  const r = await newTask(true);
  const r1 = await localDb.requestDateRevision(r.id, "user-del-1", new Date(Date.now() + 5 * 86400000).toISOString(), "self");
  assert(r1.task?.revisions?.at(-1)?.status === "AUTO_APPROVED" && r1.task.revisions.at(-1)?.approved_by === null, "Self-service extension recorded AUTO_APPROVED");
  const r2 = await localDb.requestDateRevision(r.id, "user-del-1", new Date(Date.now() + 6 * 86400000).toISOString(), "mgr", { approvedBy: "user-delegator" });
  assert(r2.task?.revisions?.at(-1)?.status === "APPROVED" && r2.task.revisions.at(-1)?.approved_by === "user-delegator", "Manager extension recorded APPROVED with approver");
  const declined = await localDb.declineDateRevision(r.id, "user-del-1", new Date(Date.now() + 9 * 86400000).toISOString(), "no", "user-delegator");
  assert(declined.task?.revision_count === 2 && declined.task.revisions?.at(-1)?.status === "REJECTED", "Decline logged without consuming a revision");
  const closed = await localDb.requestDateRevision(cDone.id, "user-del-1", new Date(Date.now() + 30 * 86400000).toISOString(), "late");
  assert(!!closed.error, "Can't extend a non-open task");
  assert(getRevisionBlockReason({ status: "DONE", revision_count: 0, max_revision_allowed: 3 }) !== null, "Block reason for DONE");

  console.log("\n=== ORGANIZATION LIFECYCLE ===");
  const trial = await localDb.provisionOrganization({
    name: "Trial Co",
    slug: "trial-co",
    allowed_domains: ["trial.co"],
    primary_contact_email: "a@trial.co",
    days_valid: 30,
  });
  trial.subscription_status = "TRIAL"; // provisioned orgs default to ACTIVE; simulate a trial
  const stored = await localDb.getOrganizationById(trial.id);
  if (stored) stored.subscription_status = "TRIAL";
  await localDb.toggleOrganizationKillSwitch(trial.id, true, "test");
  const restored = await localDb.toggleOrganizationKillSwitch(trial.id, false);
  assert(restored?.subscription_status === "TRIAL", `Reactivation restores TRIAL (got ${restored?.subscription_status})`);

  const expiredOrg = { ...(restored as Organization), subscription_status: "ACTIVE" as const, subscription_expires_at: "2020-01-01T00:00:00Z" };
  const access = getOrgAccessState(expiredOrg);
  assert(access.status === "EXPIRED" && !access.canAccess, "Past expiry date denies access even if ACTIVE");
  const reactivated = await localDb.toggleOrganizationKillSwitch("org-susp-03", false);
  assert(
    reactivated?.subscription_status === "EXPIRED" && !getOrgAccessState(reactivated).canAccess,
    "Lifting kill switch on an expired tenant leaves it EXPIRED (not ACTIVE)"
  );

  console.log("\n=== RECURRING TEMPLATES ===");
  const monday = new Date("2026-11-16T09:00:00Z");
  const saturday = new Date("2026-11-14T09:00:00Z");
  const first = await processRecurringTasks("org-sd-01", monday);
  const again = await processRecurringTasks("org-sd-01", monday);
  assert(first.spawnedCount === 3, `First Monday run spawns each due template once (${first.spawnedCount})`);
  assert(again.spawnedCount === 0, "Second run same day spawns nothing (idempotent)");
  assert(first.spawnedTasks.every((t) => !!t.recurring_template_id), "Spawned tasks link back to their template");

  const tpl = (await localDb.getRecurringTemplates("org-sd-01"))[0];
  await localDb.updateRecurringTemplate(tpl.id, { is_active: false });
  const paused = await processRecurringTasks("org-sd-01", new Date("2026-11-17T09:00:00Z"));
  assert(!paused.spawnedTasks.some((t) => t.recurring_template_id === tpl.id), "Paused template does not spawn");
  await localDb.updateRecurringTemplate(tpl.id, { is_active: true });

  const daily: RecurringTemplate = { ...tpl, frequency: "DAILY", last_spawned_at: null };
  assert(getSpawnBlockReason(daily, saturday, []) === "Not a working day.", "Daily template skips weekends");
  assert(getSpawnBlockReason({ ...daily, ends_on: "2026-11-01" }, monday, [])?.includes("ended") === true, "Ended template does not spawn");

  console.log("\n=== ARCHIVING ===");
  const before = (await localDb.getTasks({ orgId: "org-sd-01", includeArchived: true })).length;
  const arch = await processMonthlyArchiving("org-sd-01", new Date("2027-03-01T00:00:00Z"));
  const visible = (await localDb.getTasks({ orgId: "org-sd-01" })).length;
  const all = (await localDb.getTasks({ orgId: "org-sd-01", includeArchived: true })).length;
  assert(arch.archivedCount > 0 && visible === all - arch.archivedCount && all === before, `Archiving hides ${arch.archivedCount} finished tasks without deleting them`);

  console.log(`\nState machine tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
