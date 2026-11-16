import { localDb } from "@/lib/data/dal";
import { isTaskOverdue } from "@/lib/data/task-utils";
import { RecurringTemplate, HolidayCalendarItem, Task } from "@/types/database.types";
import { generateShortUrl } from "@/lib/whatsapp/shortener";
import { sendTaskAssignedAlertAction } from "@/app/actions/notification-actions";

/**
 * Calculates deadline advancing past weekends (Sat/Sun) and public holidays
 */
export function calculateNextWorkingDeadline(
  startDate: Date,
  delayDays: number,
  holidays: HolidayCalendarItem[]
): Date {
  const holidayDates = new Set(holidays.map((h) => h.holiday_date));
  const current = new Date(startDate.getTime());
  let addedDays = 0;

  while (addedDays < delayDays) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
    const dateStr = current.toISOString().split("T")[0];

    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    // Skip Public Holidays
    if (holidayDates.has(dateStr)) {
      continue;
    }

    addedDays++;
  }

  // Set time to 18:00 (6:00 PM) by default
  current.setHours(18, 0, 0, 0);
  return current;
}

export interface RecurrenceProcessResult {
  spawnedCount: number;
  spawnedTasks: Task[];
  skipped: { templateId: string; reason: string }[];
}

const toDateStr = (d: Date) => d.toISOString().split("T")[0];
const DAY_MS = 24 * 60 * 60 * 1000;

function isWorkingDay(date: Date, holidays: HolidayCalendarItem[]): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  const ds = toDateStr(date);
  return !holidays.some((h) => h.holiday_date === ds);
}

/**
 * RECURRING TEMPLATE LIFECYCLE
 *   ACTIVE  (is_active = true, ends_on not passed)  → spawns once per period
 *   PAUSED  (is_active = false)                      → never spawns
 *   ENDED   (ends_on < today)                        → never spawns (derived)
 * "Once per period" is keyed on last_spawned_at, so re-running the cron is idempotent.
 */
export type TemplateLifecycle = "ACTIVE" | "PAUSED" | "ENDED";

export function getTemplateLifecycle(template: RecurringTemplate, now = new Date()): TemplateLifecycle {
  if (template.ends_on && toDateStr(now) > template.ends_on) return "ENDED";
  return template.is_active ? "ACTIVE" : "PAUSED";
}

/** Returns null when the template should spawn now, otherwise the reason it shouldn't. */
export function getSpawnBlockReason(
  template: RecurringTemplate,
  now: Date,
  holidays: HolidayCalendarItem[]
): string | null {
  const lifecycle = getTemplateLifecycle(template, now);
  if (lifecycle !== "ACTIVE") return `Template is ${lifecycle.toLowerCase()}.`;

  const last = template.last_spawned_at ? new Date(template.last_spawned_at) : null;
  const today = toDateStr(now);

  switch (template.frequency) {
    case "DAILY":
      if (!isWorkingDay(now, holidays)) return "Not a working day.";
      if (last && toDateStr(last) >= today) return "Already spawned today.";
      return null;
    case "WEEKLY":
      if (last && now.getTime() - last.getTime() < 7 * DAY_MS) return "Already spawned this week.";
      return null;
    case "MONTHLY": {
      const monthIndex = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();
      if (last && monthIndex(last) >= monthIndex(now)) return "Already spawned this month.";
      return null;
    }
    case "CUSTOM_INTERVAL": {
      // Without a parsed cron expression, the interval is recur_delay_days (minimum 1 day).
      const intervalDays = Math.max(1, template.recur_delay_days || 1);
      if (last && now.getTime() - last.getTime() < intervalDays * DAY_MS) {
        return `Interval of ${intervalDays} day(s) not yet elapsed.`;
      }
      return null;
    }
    case "ONE_TIME":
      return last ? "One-time template already spawned." : null;
  }
}

/**
 * 8.1 Spawns tasks from the org's recurring master templates that are due.
 */
export async function processRecurringTasks(
  orgId: string = "org-sd-01",
  now: Date = new Date()
): Promise<RecurrenceProcessResult> {
  const holidays = await localDb.getHolidays(orgId);
  const profiles = await localDb.getProfiles(orgId);
  const templates = await localDb.getRecurringTemplates(orgId);

  const spawnedTasks: Task[] = [];
  const skipped: RecurrenceProcessResult["skipped"] = [];

  for (const template of templates) {
    const blocked = getSpawnBlockReason(template, now, holidays);
    if (blocked) {
      skipped.push({ templateId: template.id, reason: blocked });
      continue;
    }

    const deadline = calculateNextWorkingDeadline(now, template.recur_delay_days, holidays);

    const newTask = await localDb.createTask({
      orgId: template.org_id,
      title: template.title,
      description: template.description || undefined,
      delegatorId: template.delegator_id,
      delegateeId: template.delegatee_id,
      departmentId: template.department_id || undefined,
      priority: template.priority,
      initialTargetDate: deadline.toISOString(),
      frequency: template.frequency,
      verificationNeeded: template.verification_needed,
      allocatedScore: template.allocated_score,
      recurringTemplateId: template.id,
      startDate: toDateStr(now),
    });

    // Mark the period as served before notifying, so a notification failure can't cause a duplicate.
    await localDb.updateRecurringTemplate(template.id, { last_spawned_at: now.toISOString() });

    const shortLink = await generateShortUrl(`http://localhost:3000/delegatee?task=${newTask.task_no}`);
    newTask.short_link = shortLink;

    const delegatee = profiles.find((p) => p.id === template.delegatee_id);
    const delegator = profiles.find((p) => p.id === template.delegator_id);

    if (delegatee) {
      await sendTaskAssignedAlertAction({
        orgId,
        recipientEmail: delegatee.email,
        recipientPhone: delegatee.phone_number,
        recipientName: delegatee.full_name,
        taskNo: newTask.task_no,
        title: newTask.title,
        delegatorName: delegator?.full_name || "Manager",
        priority: newTask.priority,
        dueDate: newTask.current_target_date,
        shortLink,
      });
    }

    spawnedTasks.push(newTask);
  }

  return { spawnedCount: spawnedTasks.length, spawnedTasks, skipped };
}

/**
 * 8.2 Daily Morning 9:00 AM Reminder Digest
 */
export async function processDailyReminders(orgId: string = "org-sd-01"): Promise<{
  assigneesNotified: number;
  tasksDueToday: number;
}> {
  const allTasks = await localDb.getTasks({ orgId });
  const todayStr = new Date().toISOString().split("T")[0];

  // Find open work due today or overdue (submitted, completed and cancelled tasks need no reminder)
  const urgentTasks = allTasks.filter(
    (t) =>
      (t.status === "PENDING" || t.status === "IN_PROGRESS") &&
      (t.current_target_date.startsWith(todayStr) || isTaskOverdue(t))
  );

  // Group by Delegatee
  const groupedByAssignee: Record<string, Task[]> = {};
  for (const t of urgentTasks) {
    if (!groupedByAssignee[t.delegatee_id]) {
      groupedByAssignee[t.delegatee_id] = [];
    }
    groupedByAssignee[t.delegatee_id].push(t);
  }

  let notifiedCount = 0;
  for (const [delegateeId, tasks] of Object.entries(groupedByAssignee)) {
    const profile = await localDb.getProfileById(delegateeId);
    if (!profile) continue;

    // Simulate / dispatch morning digest
    notifiedCount++;
  }

  return {
    assigneesNotified: notifiedCount,
    tasksDueToday: urgentTasks.length,
  };
}

/**
 * 8.3 Monthly Automated Archiving Worker
 */
export async function processMonthlyArchiving(
  orgId: string = "org-sd-01",
  now: Date = new Date()
): Promise<{
  archivedCount: number;
}> {
  // Archive DONE / CANCELLED tasks finished more than 30 days ago (sets tasks.archived_at).
  const cutoff = new Date(now.getTime() - 30 * DAY_MS);
  const archivedCount = await localDb.archiveCompletedTasks(orgId, cutoff);
  return { archivedCount };
}

