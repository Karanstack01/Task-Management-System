"use server";

import {
  dispatchTaskAssignedEmail,
  dispatchTaskSubmittedEmail,
  dispatchTaskVerifiedEmail,
  dispatchDailyDigestEmail,
} from "@/lib/email/email-service";
import {
  dispatchWhatsAppAlert,
  formatTaskAssignedMessage,
  formatTaskSubmittedMessage,
  formatTaskVerifiedMessage,
  formatTaskReminderMessage,
} from "@/lib/whatsapp/whatsapp-service";
import { getAppUrl } from "@/lib/integrations/app-url";

/** Waits for all dispatches and returns human-readable errors for the ones that did not go out. */
async function collectFailures(promises: Promise<unknown>[]): Promise<string[]> {
  const settled = await Promise.allSettled(promises);
  const failures: string[] = [];
  for (const s of settled) {
    if (s.status === "rejected") {
      failures.push(s.reason instanceof Error ? s.reason.message : "Notification failed");
    } else {
      const r = s.value as { success?: boolean; error?: string; channel?: string } | null;
      if (r && r.success === false) failures.push(r.error || `${r.channel ?? "Channel"} delivery failed`);
    }
  }
  return failures;
}

/**
 * Follow-up reminder: one digest per assignee listing tasks that are due today or overdue,
 * sent by email and WhatsApp. Used by the daily cron job.
 */
export async function sendTaskReminderDigestAction(params: {
  orgId: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientName: string;
  tasks: Array<{ taskNo: number; title: string; priority: string; targetDate: string }>;
  overdueCount: number;
  shortLink?: string;
}): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
  if (params.tasks.length === 0) return { emailSent: false, whatsappSent: false };

  const [emailRes, waRes] = await Promise.all([
    params.recipientEmail
      ? dispatchDailyDigestEmail(
          params.recipientEmail,
          {
            recipientName: params.recipientName,
            tasks: params.tasks.map((t) => ({ ...t, targetDate: new Date(t.targetDate).toLocaleDateString("en-GB") })),
            overdueCount: params.overdueCount,
          },
          undefined,
          params.orgId
        )
      : Promise.resolve(null),
    params.recipientPhone
      ? dispatchWhatsAppAlert({
          orgId: params.orgId,
          recipientMobile: params.recipientPhone,
          recipientName: params.recipientName,
          message: (() => {
            const first = params.tasks[0];
            const more = params.tasks.length > 1 ? ` (+${params.tasks.length - 1} more)` : "";
            return formatTaskReminderMessage({
              title: `${first.title}${more}`,
              priority: params.overdueCount > 0 ? `${first.priority} - ${params.overdueCount} overdue` : first.priority,
              shortLink: params.shortLink || `${getAppUrl()}/delegatee`,
            });
          })(),
          templateType: "TASK_REMINDER",
          templateData: {
            assignee_name: params.recipientName,
            task_count: String(params.tasks.length),
            overdue_count: String(params.overdueCount),
            task_title: `${params.tasks[0].title}${params.tasks.length > 1 ? ` (+${params.tasks.length - 1} more)` : ""}`,
            priority: params.tasks[0].priority,
            task_link: params.shortLink || `${getAppUrl()}/delegatee`,
          },
        })
      : Promise.resolve(null),
  ]);

  return { emailSent: !!emailRes?.success, whatsappSent: !!waRes?.success };
}

export async function sendTaskAssignedAlertAction(params: {
  orgId: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientName: string;
  taskNo: number;
  title: string;
  delegatorName: string;
  priority: string;
  dueDate: string;
  shortLink?: string;
}) {
  const promises: Promise<unknown>[] = [];

  // 1. Email Dispatch
  if (params.recipientEmail) {
    promises.push(
      dispatchTaskAssignedEmail(
        params.recipientEmail,
        {
          taskNo: params.taskNo,
          title: params.title,
          delegatorName: params.delegatorName,
          priority: params.priority,
          targetDate: params.dueDate,
          shortLink: params.shortLink,
        },
        undefined,
        params.orgId
      )
    );
  }

  // 2. WhatsApp Dispatch
  if (params.recipientPhone) {
    const waMsg = formatTaskAssignedMessage({
      taskNo: params.taskNo,
      title: params.title,
      dueDate: new Date(params.dueDate).toLocaleDateString(),
      delegator: params.delegatorName,
      shortLink: params.shortLink || "",
    });

    promises.push(
      dispatchWhatsAppAlert({
        orgId: params.orgId,
        recipientMobile: params.recipientPhone,
        recipientName: params.recipientName,
        message: waMsg,
        templateType: "TASK_ASSIGNED",
        templateData: {
          task_no: String(params.taskNo),
          task_title: params.title,
          due_date: new Date(params.dueDate).toLocaleDateString("en-GB"),
          assigner_name: params.delegatorName,
          assignee_name: params.recipientName,
          priority: params.priority,
          task_link: params.shortLink || `${getAppUrl()}/delegatee`,
        },
      })
    );
  }

  return { success: true, failures: await collectFailures(promises) };
}

export async function sendTaskSubmittedAlertAction(params: {
  orgId: string;
  delegatorEmail?: string | null;
  delegatorPhone?: string | null;
  delegatorName: string;
  delegateeName: string;
  taskNo: number;
  title: string;
  deliverableName: string;
  deliverableUrl: string;
  shortLink?: string;
}) {
  const promises: Promise<unknown>[] = [];

  if (params.delegatorEmail) {
    promises.push(
      dispatchTaskSubmittedEmail(
        params.delegatorEmail,
        {
          taskNo: params.taskNo,
          title: params.title,
          delegateeName: params.delegateeName,
          deliverableName: params.deliverableName,
          deliverableUrl: params.deliverableUrl,
          verifyLink: `${getAppUrl()}/verify`,
        },
        undefined,
        params.orgId
      )
    );
  }

  if (params.delegatorPhone) {
    const waMsg = formatTaskSubmittedMessage({
      taskNo: params.taskNo,
      title: params.title,
      delegatee: params.delegateeName,
      shortLink: params.shortLink || "https://cbxit.in/t/verify",
    });

    promises.push(
      dispatchWhatsAppAlert({
        orgId: params.orgId,
        recipientMobile: params.delegatorPhone,
        recipientName: params.delegatorName,
        message: waMsg,
        templateType: "TASK_SUBMITTED",
        templateData: {
          task_no: String(params.taskNo),
          task_title: params.title,
          assignee_name: params.delegateeName,
          assigner_name: params.delegatorName,
          task_link: params.shortLink || `${getAppUrl()}/verify`,
        },
      })
    );
  }

  return { success: true, failures: await collectFailures(promises) };
}

export async function sendTaskVerifiedAlertAction(params: {
  orgId: string;
  delegateeEmail?: string | null;
  delegateePhone?: string | null;
  delegateeName: string;
  verifiedByName: string;
  taskNo: number;
  title: string;
  score: number;
  delayDays: number;
  remarks: string;
}) {
  const promises: Promise<unknown>[] = [];

  if (params.delegateeEmail) {
    promises.push(
      dispatchTaskVerifiedEmail(
        params.delegateeEmail,
        {
          taskNo: params.taskNo,
          title: params.title,
          score: params.score,
          delayDays: params.delayDays,
          remarks: params.remarks,
          verifiedByName: params.verifiedByName,
        },
        undefined,
        params.orgId
      )
    );
  }

  if (params.delegateePhone) {
    const waMsg = formatTaskVerifiedMessage({
      taskNo: params.taskNo,
      score: params.score,
      remarks: params.remarks,
    });

    promises.push(
      dispatchWhatsAppAlert({
        orgId: params.orgId,
        recipientMobile: params.delegateePhone,
        recipientName: params.delegateeName,
        message: waMsg,
        templateType: "TASK_VERIFIED",
        templateData: {
          task_no: String(params.taskNo),
          task_title: params.title,
          score: params.score.toFixed(1),
          remarks: params.remarks,
          verifier_name: params.verifiedByName,
          assignee_name: params.delegateeName,
        },
      })
    );
  }

  return { success: true, failures: await collectFailures(promises) };
}

