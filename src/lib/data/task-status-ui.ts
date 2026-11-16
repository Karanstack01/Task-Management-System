import { Task, TaskStatus, UserRole } from "@/types/database.types";
import { localDb } from "./dal";
import { isTaskTransitionError } from "./task-state-machine";
import { notify } from "@/lib/notifications/toast-service";

/**
 * UI wrapper around localDb.updateTaskStatus used by kanban boards and quick status controls.
 * All lifecycle rules live in the state machine; this only turns its refusals into feedback.
 * Returns the updated task, or null when the change was refused.
 */
export async function changeTaskStatusWithFeedback(
  task: Task,
  newStatus: TaskStatus,
  opts: { actorRole?: UserRole; onProofRequired?: (task: Task) => void } = {}
): Promise<Task | null> {
  try {
    const updated = await localDb.updateTaskStatus(task.id, newStatus, {
      actorRole: opts.actorRole,
      knownAttachments: task.attachments,
    });
    // Client-side caches hold relations/attachments the local repository may not know about.
    const merged: Task = {
      ...task,
      ...updated,
      delegator: task.delegator,
      delegatee: task.delegatee,
      department: task.department,
      attachments: task.attachments,
    };
    notify.success("Task Status Synchronized", {
      description: `Task #${task.task_no} moved to ${merged.status.replace(/_/g, " ")}.`,
    });
    return merged;
  } catch (err: unknown) {
    if (isTaskTransitionError(err)) {
      if (err.code === "NOOP") return null;
      if (err.code === "PROOF_REQUIRED") {
        notify.info("Proof Deliverables Required", { description: err.message });
        opts.onProofRequired?.(task);
        return null;
      }
      notify.warning("Status Change Not Allowed", { description: err.message });
      return null;
    }
    const msg = err instanceof Error ? err.message : "Status update failed";
    notify.error("Status Update Failed", { description: msg });
    return null;
  }
}
