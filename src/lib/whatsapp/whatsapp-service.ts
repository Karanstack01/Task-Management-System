// StackDrove CTMS - Dual-Channel WhatsApp Service
// Channel 1: Official Meta Cloud API v20.0
// Channel 2: CEOITBOX / CBXWA Gateway

import type { NotificationDeliveryStatus } from "@/types/database.types";

export interface WAPayload {
  orgId: string;
  recipientMobile: string;
  recipientName: string;
  message: string;
  templateType: "TASK_ASSIGNED" | "TASK_SUBMITTED" | "TASK_VERIFIED" | "TASK_REMINDER" | "DIAGNOSTIC";
  templateParams?: string[];
}

export interface WADispatchResult {
  success: boolean;
  channel: "META_OFFICIAL" | "CEOITBOX_GATEWAY" | "SIMULATED_LOCAL";
  messageId?: string;
  error?: string;
}

export interface WANotificationLogEntry {
  id: string;
  recipientMobile: string;
  recipientName: string;
  message: string;
  channel: "META_OFFICIAL" | "CEOITBOX_GATEWAY" | "SIMULATED_LOCAL";
  templateType: string;
  /** Same vocabulary as notification_logs.status (NotificationDeliveryStatus). */
  status: Exclude<NotificationDeliveryStatus, "QUEUED">;
  timestamp: string;
}

export const localWhatsAppNotificationLogs: WANotificationLogEntry[] = [];

// -------------------------------------------------------------
// MESSAGE FORMATTERS (MATCHING LEGACY CTMS PROTOCOL)
// -------------------------------------------------------------
export function formatTaskAssignedMessage(params: {
  taskNo: number;
  title: string;
  dueDate: string;
  delegator: string;
  shortLink: string;
}): string {
  return (
    `*New Task Assigned: #${params.taskNo}*\n` +
    `*Title:* ${params.title}\n` +
    `*Due Date:* ${params.dueDate}\n` +
    `*Assigner:* ${params.delegator}\n\n` +
    `Upload proof & update status here: ${params.shortLink}`
  );
}

export function formatTaskSubmittedMessage(params: {
  taskNo: number;
  title: string;
  delegatee: string;
  shortLink: string;
}): string {
  return (
    `*Task #${params.taskNo} Awaiting Verification*\n` +
    `*Assignee:* ${params.delegatee}\n` +
    `*Title:* ${params.title}\n\n` +
    `Inspect deliverables & verify here: ${params.shortLink}`
  );
}

export function formatTaskVerifiedMessage(params: {
  taskNo: number;
  score: number;
  remarks: string;
}): string {
  return (
    `*Task #${params.taskNo} Verified*\n` +
    `*Score Awarded:* ${params.score.toFixed(1)}/10\n` +
    `*Remarks:* ${params.remarks}`
  );
}

export function formatTaskReminderMessage(params: {
  title: string;
  priority: string;
  shortLink: string;
}): string {
  return (
    `*Task Reminder: Due Today*\n` +
    `*Task:* ${params.title}\n` +
    `*Priority:* ${params.priority}\n\n` +
    `Click to update: ${params.shortLink}`
  );
}

// -------------------------------------------------------------
// DUAL-CHANNEL DISPATCH ENGINE
// -------------------------------------------------------------
export async function dispatchWhatsAppAlert(payload: WAPayload): Promise<WADispatchResult> {
  const metaToken = process.env.META_WA_OFFICIAL_TOKEN;
  const metaPhoneId = process.env.META_WA_PHONE_ID;
  const cbxUsername = process.env.CEOITBOX_WA_USERNAME;
  const cbxPassword = process.env.CEOITBOX_WA_PASSWORD;

  // 1. Channel 1: Official Meta WhatsApp Cloud API v20.0
  if (metaToken && metaPhoneId && !metaToken.includes("placeholder") && !metaPhoneId.includes("placeholder")) {
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v20.0/${metaPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${metaToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: payload.recipientMobile.replace(/[^0-9]/g, ""),
            type: "text",
            text: { preview_url: true, body: payload.message },
          }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (metaRes.ok) {
        const data = await metaRes.json();
        const msgId = data.messages?.[0]?.id || `meta-${Date.now()}`;

        localWhatsAppNotificationLogs.unshift({
          id: `wa-log-${Date.now()}`,
          recipientMobile: payload.recipientMobile,
          recipientName: payload.recipientName,
          message: payload.message,
          channel: "META_OFFICIAL",
          templateType: payload.templateType,
          status: "SENT",
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          channel: "META_OFFICIAL",
          messageId: msgId,
        };
      }
    } catch {
      // Official Meta API failed, gracefully fall back to CEOITBOX Gateway
    }
  }

  // 2. Channel 2: CEOITBOX Gateway Service
  if (cbxUsername && cbxPassword && !cbxUsername.includes("placeholder") && !cbxPassword.includes("placeholder")) {
    try {
      const cleanMobile = payload.recipientMobile.replace(/[^0-9]/g, "");
      const cbxUrl = `https://app.ceoitbox.com/api/sendWhatsAppMessage`;

      const cbxRes = await fetch(cbxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cbxUsername,
          password: cbxPassword,
          receiverMobileNo: cleanMobile,
          receiverName: payload.recipientName,
          message: payload.message,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (cbxRes.ok) {
        const msgId = `cbx-${Date.now()}`;
        localWhatsAppNotificationLogs.unshift({
          id: `wa-log-${Date.now()}`,
          recipientMobile: payload.recipientMobile,
          recipientName: payload.recipientName,
          message: payload.message,
          channel: "CEOITBOX_GATEWAY",
          templateType: payload.templateType,
          status: "SENT",
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          channel: "CEOITBOX_GATEWAY",
          messageId: msgId,
        };
      }
    } catch {
      // Fall through to simulation if network is unreachable
    }
  }

  // 3. Local Test / Simulated Mode (Prevents crash when live credentials unconfigured)
  localWhatsAppNotificationLogs.unshift({
    id: `wa-log-${Date.now()}`,
    recipientMobile: payload.recipientMobile,
    recipientName: payload.recipientName,
    message: payload.message,
    channel: "SIMULATED_LOCAL",
    templateType: payload.templateType,
    status: "SIMULATED",
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    channel: "SIMULATED_LOCAL",
    messageId: `<simulated-wa-${Date.now()}@stackdrove>`,
  };
}

