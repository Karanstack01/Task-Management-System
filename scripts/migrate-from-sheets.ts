import { localDb } from "../src/lib/data/dal";
import { Task, RecurringTemplate, TaskPriority, TaskStatus, TaskFrequency } from "../src/types/database.types";

export interface LegacySheetTaskRow {
  taskNo: number | string;
  timestamp?: string;
  delegatorEmail: string;
  delegatorName?: string;
  delegateeEmail: string;
  delegateeName?: string;
  departmentName?: string;
  title: string;
  description?: string;
  priority?: string;
  frequency?: string;
  targetDate: string; // e.g. "25-10-2026", "2026-10-25", "10/25/2026"
  completionDate?: string;
  status?: string;
  revisions?: number | string;
  verificationNeeded?: boolean | string;
  isVerified?: boolean | string;
  allocatedScore?: number | string;
  actualScore?: number | string;
  delayDays?: number | string;
  remarks?: string;
}

export interface LegacySheetRecurringRow {
  templateTitle: string;
  description?: string;
  frequency: string;
  recurDelayDays: number | string;
  delegatorEmail: string;
  delegateeEmail: string;
  priority?: string;
  verificationNeeded?: boolean | string;
}

export interface MigrationSummary {
  tasksProcessed: number;
  tasksImported: number;
  recurringImported: number;
  datesNormalized: number;
  errors: string[];
}

/**
 * Normalizes multi-format date strings into ISO-8601 strings
 */
export function normalizeLegacyDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) {
    return new Date().toISOString();
  }

  const trimmed = dateStr.trim();

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day, 18, 0, 0));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Handle standard ISO or YYYY-MM-DD
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

/**
 * Normalizes priority
 */
export function normalizePriority(val?: string): TaskPriority {
  const upper = (val || "").toUpperCase().trim();
  if (upper === "CRITICAL" || upper === "URGENT") return "CRITICAL";
  if (upper === "HIGH") return "HIGH";
  if (upper === "LOW") return "LOW";
  return "MEDIUM";
}

/**
 * Normalizes status
 */
export function normalizeStatus(val?: string): TaskStatus {
  const upper = (val || "").toUpperCase().trim();
  if (upper === "DONE" || upper === "COMPLETED") return "DONE";
  if (upper === "AWAITING_VERIFICATION" || upper === "VERIFICATION_PENDING" || upper === "PENDING VERIFICATION") {
    return "AWAITING_VERIFICATION";
  }
  if (upper === "IN_PROGRESS" || upper === "IN PROGRESS" || upper === "WIP") return "IN_PROGRESS";
  return "PENDING";
}

/**
 * Runs the ETL migration process from legacy sheet records into the target system
 */
export async function runHistoricalDataMigration(
  sheetRows: LegacySheetTaskRow[],
  recurringRows: LegacySheetRecurringRow[] = [],
  orgId: string = "org-sd-01"
): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    tasksProcessed: sheetRows.length,
    tasksImported: 0,
    recurringImported: 0,
    datesNormalized: 0,
    errors: [],
  };

  const profiles = await localDb.getProfiles(orgId);
  const departments = await localDb.getDepartments(orgId);

  // Helper to find or resolve profile UUID
  const resolveProfileId = (email: string, fallbackName?: string): string => {
    const cleanEmail = email.toLowerCase().trim();
    const existing = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existing) return existing.id;
    // Fallback to active delegator/delegatee
    return profiles[0]?.id || "user-delegator";
  };

  // 1. Migrate Tasks
  for (const row of sheetRows) {
    try {
      const taskNo = typeof row.taskNo === "number" ? row.taskNo : parseInt(row.taskNo, 10);
      const delegatorId = resolveProfileId(row.delegatorEmail, row.delegatorName);
      const delegateeId = resolveProfileId(row.delegateeEmail, row.delegateeName);

      const targetDate = normalizeLegacyDate(row.targetDate);
      summary.datesNormalized++;

      const completionDate = row.completionDate ? normalizeLegacyDate(row.completionDate) : null;
      if (row.completionDate) summary.datesNormalized++;

      const priority = normalizePriority(row.priority);
      const status = normalizeStatus(row.status);

      const isVerified =
        row.isVerified === true ||
        row.isVerified === "TRUE" ||
        row.isVerified === "true" ||
        status === "DONE";

      const allocatedScore = row.allocatedScore ? parseFloat(String(row.allocatedScore)) : 10.0;
      const actualScore = row.actualScore ? parseFloat(String(row.actualScore)) : (status === "DONE" ? 10.0 : 0.0);
      const delayDays = row.delayDays ? parseInt(String(row.delayDays), 10) : 0;
      const revisions = row.revisions ? parseInt(String(row.revisions), 10) : 0;

      // Find department
      const dept = departments.find(
        (d) => d.name.toLowerCase() === (row.departmentName || "").toLowerCase()
      );

      // Create Task instance
      const task: Task = {
        id: `migrated-task-${taskNo}`,
        task_no: taskNo,
        org_id: orgId,
        title: row.title,
        description: row.description || null,
        delegator_id: delegatorId,
        delegatee_id: delegateeId,
        department_id: dept?.id || null,
        priority,
        status,
        frequency: "ONE_TIME",
        start_date: row.timestamp ? normalizeLegacyDate(row.timestamp).split("T")[0] : targetDate.split("T")[0],
        initial_target_date: targetDate,
        current_target_date: targetDate,
        completion_date: completionDate,
        revision_count: revisions,
        max_revision_allowed: 3,
        verification_needed: row.verificationNeeded === true || row.verificationNeeded === "TRUE",
        is_verified: isVerified,
        verified_by: isVerified ? delegatorId : null,
        verified_at: isVerified ? completionDate || new Date().toISOString() : null,
        allocated_score: allocatedScore,
        actual_score: actualScore,
        delay_days: delayDays,
        score_remarks: row.remarks || (status === "DONE" ? "Historical verified completion." : null),
        short_link: `https://cbxit.in/t/${taskNo}`,
        created_at: row.timestamp ? normalizeLegacyDate(row.timestamp) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add to local database
      await localDb.createTask({
        orgId,
        title: task.title,
        description: task.description || undefined,
        delegatorId: task.delegator_id,
        delegateeId: task.delegatee_id,
        departmentId: task.department_id || undefined,
        priority: task.priority,
        initialTargetDate: task.initial_target_date,
        frequency: task.frequency,
        verificationNeeded: task.verification_needed,
        allocatedScore: task.allocated_score,
      });

      summary.tasksImported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown row error";
      summary.errors.push(`Row ${row.taskNo}: ${msg}`);
    }
  }

  // 2. Migrate Recurring Templates
  for (const rec of recurringRows) {
    try {
      const delegatorId = resolveProfileId(rec.delegatorEmail);
      const delegateeId = resolveProfileId(rec.delegateeEmail);
      const freq: TaskFrequency =
        rec.frequency.toUpperCase() === "WEEKLY"
          ? "WEEKLY"
          : rec.frequency.toUpperCase() === "MONTHLY"
          ? "MONTHLY"
          : "DAILY";

      await localDb.createRecurringTemplate({
        orgId,
        title: rec.templateTitle,
        description: rec.description || undefined,
        delegatorId,
        delegateeId,
        priority: normalizePriority(rec.priority),
        frequency: freq,
        recurDelayDays: parseInt(String(rec.recurDelayDays), 10) || 1,
        verificationNeeded: rec.verificationNeeded === true || rec.verificationNeeded === "TRUE",
      });

      summary.recurringImported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown template error";
      summary.errors.push(`Template '${rec.templateTitle}': ${msg}`);
    }
  }

  return summary;
}

