import { NextResponse } from "next/server";
import {
  processRecurringTasks,
  processDailyReminders,
  processMonthlyArchiving,
} from "@/lib/cron/recurrence-engine";
import { localDb } from "@/lib/data/dal";
import { getOrgAccessState } from "@/lib/data/org-lifecycle";

export async function GET(request: Request) {
  return handleCronExecution(request);
}

export async function POST(request: Request) {
  return handleCronExecution(request);
}

async function handleCronExecution(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Validate secret if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const now = new Date();

    // 1. Persist subscription expiries, then only process tenants that still have access.
    const expiredOrgs = await localDb.sweepExpiredOrganizations(now);
    const orgs = (await localDb.getOrganizations()).filter((o) => getOrgAccessState(o, now).canAccess);

    const recurrence = { spawnedCount: 0, skippedCount: 0 };
    const reminders = { assigneesNotified: 0, tasksDueToday: 0 };
    const archiving = { archivedCount: 0 };

    for (const org of orgs) {
      const r = await processRecurringTasks(org.id, now);
      recurrence.spawnedCount += r.spawnedCount;
      recurrence.skippedCount += r.skipped.length;

      const d = await processDailyReminders(org.id);
      reminders.assigneesNotified += d.assigneesNotified;
      reminders.tasksDueToday += d.tasksDueToday;

      const a = await processMonthlyArchiving(org.id, now);
      archiving.archivedCount += a.archivedCount;
    }

    return NextResponse.json(
      {
        success: true,
        timestamp: now.toISOString(),
        organizationsProcessed: orgs.length,
        expiredOrgs,
        recurrence,
        reminders,
        archiving,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cron worker failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

