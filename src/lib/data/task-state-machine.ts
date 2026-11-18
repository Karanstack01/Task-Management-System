import { Task, TaskStatus, UserRole } from "@/types/database.types";
import { calculateDelayDays, calculateSlaScore } from "./task-utils";

/**
 * TASK LIFECYCLE STATE MACHINE — single source of truth for task status transitions.
 *
 *   PENDING ──start──▶ IN_PROGRESS ──submit──▶ AWAITING_VERIFICATION ──approve──▶ DONE
 *      ▲  ◀──reset───      │  ▲                      │                            │
 *      │                   │  └──reject / withdraw───┘                            │
 *      │                   └──complete (no verification needed)──▶ DONE ◀────────┘
 *      │                                                            │
 *      │                    IN_PROGRESS ◀──────────reopen───────────┘
 *      └──restore── CANCELLED ◀──cancel── (PENDING | IN_PROGRESS | AWAITING_VERIFICATION)
 *
 * Rules:
 * - "OVERDUE" is derived (isTaskOverdue), never a target. Legacy OVERDUE rows behave as IN_PROGRESS.
 * - AWAITING_VERIFICATION → DONE only through planVerification (APPROVE), which awards the score.
 * - Submitting work that needs verification requires at least one proof-of-work attachment.
 * - Every state entry writes a consistent set of derived fields (completion/verification/score).
 *
 * Mirrored at the database level by migration 20261114000000_state_machine_hardening.sql.
 */

export type TaskTransitionErrorCode =
  | "NOOP"
  | "INVALID_TRANSITION"
  | "DERIVED_STATUS"
  | "USE_VERIFICATION"
  | "PROOF_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND";

export class TaskTransitionError extends Error {
  constructor(public readonly code: TaskTransitionErrorCode, message: string) {
    super(message);
    this.name = "TaskTransitionError";
  }
}

export function isTaskTransitionError(err: unknown): err is TaskTransitionError {
  return err instanceof TaskTransitionError;
}

/** Statuses a task can actually be stored in going forward. */
export type LifecycleStatus = Exclude<TaskStatus, "OVERDUE">;

const TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  PENDING: ["IN_PROGRESS", "AWAITING_VERIFICATION", "DONE", "CANCELLED"],
  IN_PROGRESS: ["PENDING", "AWAITING_VERIFICATION", "DONE", "CANCELLED"],
  AWAITING_VERIFICATION: ["IN_PROGRESS", "CANCELLED"], // DONE only via planVerification
  DONE: ["IN_PROGRESS"],
  CANCELLED: ["PENDING"],
};

/** Roles that manage tasks (mirrors the RLS "manage" policies). */
const MANAGER_ROLES: UserRole[] = ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "DELEGATOR"];

export interface TransitionContext {
  /** Role of the user performing the change. Omit for trusted system jobs (cron). */
  actorRole?: UserRole;
  /** Number of proof-of-work attachments known for the task (stored + just uploaded). */
  proofCount: number;
  now?: Date;
}

export interface TransitionPlan {
  from: LifecycleStatus;
  to: LifecycleStatus;
  patch: Partial<Task>;
}

export function normalizeStatus(status: TaskStatus | string): LifecycleStatus {
  if (status === "OVERDUE") return "IN_PROGRESS";
  if (status in TRANSITIONS) return status as LifecycleStatus;
  // Unknown legacy value: treat as active work rather than losing the task.
  return "IN_PROGRESS";
}

/** Maps the user's intent onto the real lifecycle state (e.g. "Done" → review when verification is needed). */
function resolveTarget(task: Task, requested: TaskStatus): LifecycleStatus {
  if (requested === "DONE" && task.verification_needed) return "AWAITING_VERIFICATION";
  if (requested === "AWAITING_VERIFICATION" && !task.verification_needed) return "DONE";
  return requested as LifecycleStatus;
}

function assertRoleMayTransition(
  role: UserRole | undefined,
  from: LifecycleStatus,
  to: LifecycleStatus
) {
  if (!role || MANAGER_ROLES.includes(role)) return;

  if (role === "BOSS") {
    throw new TaskTransitionError(
      "FORBIDDEN",
      "Executive (Boss) access is read-only. Ask the task's delegator to change its status."
    );
  }

  // DELEGATEE: may work, submit and withdraw — but not cancel, restore or reopen signed-off work.
  if (to === "CANCELLED" || from === "CANCELLED") {
    throw new TaskTransitionError("FORBIDDEN", "Only the delegator or an admin can cancel or restore a task.");
  }
  if (from === "DONE") {
    throw new TaskTransitionError("FORBIDDEN", "Only the delegator or an admin can reopen a completed task.");
  }
}

const CLEARED_COMPLETION: Partial<Task> = {
  completion_date: null,
  is_verified: false,
  verified_by: null,
  verified_at: null,
  actual_score: 0,
  delay_days: 0,
};

/**
 * Plans a status change requested by a user (dropdown, kanban drop, edit dialog).
 * Throws TaskTransitionError when the change is not allowed.
 */
export function planStatusChange(
  task: Task,
  requested: TaskStatus,
  ctx: TransitionContext
): TransitionPlan {
  const now = (ctx.now ?? new Date()).toISOString();
  const from = normalizeStatus(task.status);

  if (requested === "OVERDUE") {
    throw new TaskTransitionError(
      "DERIVED_STATUS",
      "Overdue is calculated from the deadline and can't be set manually."
    );
  }

  if (from === "AWAITING_VERIFICATION" && requested === "DONE") {
    throw new TaskTransitionError(
      "USE_VERIFICATION",
      "This task is under review. Approve it from the Verification queue so the SLA score is awarded."
    );
  }

  const to = resolveTarget(task, requested);

  if (to === from) {
    // Still normalize legacy statuses (e.g. OVERDUE → IN_PROGRESS) when "re-setting" them.
    if (task.status !== from) return { from, to, patch: { status: to } };
    throw new TaskTransitionError("NOOP", `Task is already ${from.replace(/_/g, " ").toLowerCase()}.`);
  }

  if (!TRANSITIONS[from].includes(to)) {
    throw new TaskTransitionError(
      "INVALID_TRANSITION",
      `A task can't move from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`
    );
  }

  assertRoleMayTransition(ctx.actorRole, from, to);

  switch (to) {
    case "AWAITING_VERIFICATION": {
      if (ctx.proofCount === 0) {
        throw new TaskTransitionError(
          "PROOF_REQUIRED",
          `Task #${task.task_no} requires proof-of-work deliverables before it can be submitted for review.`
        );
      }
      return {
        from,
        to,
        patch: { ...CLEARED_COMPLETION, status: to, completion_date: now },
      };
    }

    case "DONE": {
      // Direct sign-off (verification not required): score is awarded immediately.
      const delayDays = calculateDelayDays(task.current_target_date, now);
      const score = calculateSlaScore(Number(task.allocated_score) || 10, delayDays);
      return {
        from,
        to,
        patch: {
          status: to,
          completion_date: now,
          is_verified: false,
          verified_by: null,
          verified_at: null,
          delay_days: delayDays,
          actual_score: score,
          score_remarks:
            delayDays === 0
              ? "Completed on time (no verification required). Full allocated score awarded."
              : `Completed ${delayDays} day(s) late (no verification required). SLA delay penalty applied.`,
        },
      };
    }

    case "IN_PROGRESS":
    case "PENDING": {
      const remarks =
        from === "DONE"
          ? "Reopened for rework. Previous score revoked."
          : from === "AWAITING_VERIFICATION"
          ? "Submission withdrawn for further work."
          : task.score_remarks ?? null;
      return { from, to, patch: { ...CLEARED_COMPLETION, status: to, score_remarks: remarks } };
    }

    case "CANCELLED":
      return {
        from,
        to,
        patch: { ...CLEARED_COMPLETION, status: to, score_remarks: "Task cancelled. No score awarded." },
      };
  }
}

export type VerificationDecision = "APPROVE" | "REJECT";

/** Plans the reviewer's decision on a submitted task. */
export function planVerification(
  task: Task,
  decision: VerificationDecision,
  ctx: { verifiedBy: string; actorRole?: UserRole; remarks?: string; overrideScore?: number; now?: Date }
): TransitionPlan {
  const now = (ctx.now ?? new Date()).toISOString();
  const from = normalizeStatus(task.status);

  if (from !== "AWAITING_VERIFICATION") {
    throw new TaskTransitionError(
      "INVALID_TRANSITION",
      `Only tasks awaiting verification can be reviewed (task #${task.task_no} is ${from.replace(/_/g, " ")}).`
    );
  }
  if (ctx.actorRole && !MANAGER_ROLES.includes(ctx.actorRole)) {
    throw new TaskTransitionError("FORBIDDEN", "Only the delegator or an admin can verify deliverables.");
  }

  if (decision === "REJECT") {
    return {
      from,
      to: "IN_PROGRESS",
      patch: {
        ...CLEARED_COMPLETION,
        status: "IN_PROGRESS",
        score_remarks: ctx.remarks || "Deliverable rejected by delegator. Rework requested.",
      },
    };
  }

  const delayDays = calculateDelayDays(task.current_target_date, task.completion_date ?? now);
  const score = calculateSlaScore(Number(task.allocated_score) || 10, delayDays, ctx.overrideScore);
  return {
    from,
    to: "DONE",
    patch: {
      status: "DONE",
      is_verified: true,
      verified_by: ctx.verifiedBy,
      verified_at: now,
      completion_date: task.completion_date ?? now,
      delay_days: delayDays,
      actual_score: score,
      score_remarks:
        ctx.remarks ||
        (delayDays === 0
          ? "Delivered strictly on time. Full allocated score awarded."
          : `Delivered ${delayDays} days late. SLA delay penalty applied.`),
    },
  };
}

/**
 * Statuses a user may pick for this task right now (for dropdowns / drop targets).
 * Always includes the current status so a select can display it.
 */
export function getSelectableStatuses(
  task: Task,
  actorRole?: UserRole,
  proofCount = Number.POSITIVE_INFINITY
): LifecycleStatus[] {
  const from = normalizeStatus(task.status);
  const options = new Set<LifecycleStatus>([from]);
  const candidates: TaskStatus[] = ["PENDING", "IN_PROGRESS", "AWAITING_VERIFICATION", "DONE", "CANCELLED"];
  for (const c of candidates) {
    try {
      options.add(planStatusChange(task, c, { actorRole, proofCount }).to);
    } catch {
      /* not reachable from here */
    }
  }
  return [...options];
}
