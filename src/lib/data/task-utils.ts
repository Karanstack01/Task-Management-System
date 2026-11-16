import { Task, TaskStatus } from "@/types/database.types";

/** Statuses in which the delegatee still owes work against the deadline. */
const OPEN_WORK_STATUSES: ReadonlyArray<TaskStatus | string> = ["PENDING", "IN_PROGRESS", "OVERDUE"];

/**
 * Checks whether a task is strictly overdue. This is the ONLY overdue rule in the app —
 * "OVERDUE" is never stored as a status.
 * Invariants:
 * - Only open work (PENDING / IN_PROGRESS, or legacy OVERDUE rows) can be overdue.
 * - DONE, CANCELLED and AWAITING_VERIFICATION (work already submitted) are NOT overdue.
 * - An open task is overdue when current_target_date is in the past.
 */
export function isTaskOverdue(task: {
  status: TaskStatus | string;
  current_target_date: string;
}): boolean {
  if (!OPEN_WORK_STATUSES.includes(task.status)) {
    return false;
  }
  const targetTime = new Date(task.current_target_date).getTime();
  if (isNaN(targetTime)) return false;
  return targetTime < Date.now();
}

/**
 * Validates if a task is eligible for further date revisions / deadline extensions.
 * Only open work can be extended, and only while revisions remain.
 */
export function canRequestRevision(task: {
  status?: TaskStatus | string;
  revision_count: number;
  max_revision_allowed: number;
}): boolean {
  if (task.status !== undefined && !OPEN_WORK_STATUSES.includes(task.status)) return false;
  return task.revision_count < task.max_revision_allowed;
}

/** Human-readable reason a revision request is blocked, or null when allowed. */
export function getRevisionBlockReason(task: {
  status?: TaskStatus | string;
  revision_count: number;
  max_revision_allowed: number;
}): string | null {
  if (task.status !== undefined && !OPEN_WORK_STATUSES.includes(task.status)) {
    return "Deadline extensions are only possible while work is still open (not submitted, completed or cancelled).";
  }
  if (task.revision_count >= task.max_revision_allowed) {
    return `Maximum revision limit of ${task.max_revision_allowed} reached. Further date extensions are prohibited.`;
  }
  return null;
}

/**
 * Calculates punctuality score with linear SLA degradation (20% penalty per day of delay).
 * Bounded strictly within [0, allocatedScore].
 */
export function calculateSlaScore(
  allocatedScore: number,
  delayDays: number,
  overrideScore?: number
): number {
  const allocated = Number(allocatedScore) || 10.0;
  if (overrideScore !== undefined && !isNaN(overrideScore)) {
    return Math.max(0, Math.min(allocated, Number(overrideScore.toFixed(2))));
  }

  if (delayDays <= 0) {
    return allocated;
  }

  const deductionPerDay = allocated / 5.0;
  const calculated = Math.max(0, allocated - deductionPerDay * delayDays);
  return Number(calculated.toFixed(2));
}

/**
 * Calculates delay in calendar days between completion and target deadline.
 */
export function calculateDelayDays(
  targetDateStr: string,
  completionDateStr?: string | null
): number {
  const targetTime = new Date(targetDateStr).getTime();
  if (isNaN(targetTime)) return 0;

  const completionTime = completionDateStr
    ? new Date(completionDateStr).getTime()
    : Date.now();

  const diffMs = completionTime - targetTime;
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

