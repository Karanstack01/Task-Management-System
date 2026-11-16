"use server";

import {
  dispatchTaskAssignedEmail,
  dispatchTaskSubmittedEmail,
  dispatchTaskVerifiedEmail,
} from "@/lib/email/email-service";
import {
  dispatchWhatsAppAlert,
  formatTaskAssignedMessage,
  formatTaskSubmittedMessage,
  formatTaskVerifiedMessage,
} from "@/lib/whatsapp/whatsapp-service";

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
      dispatchTaskAssignedEmail(params.recipientEmail, {
        taskNo: params.taskNo,
        title: params.title,
        delegatorName: params.delegatorName,
        priority: params.priority,
        targetDate: params.dueDate,
        shortLink: params.shortLink,
      })
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
      })
    );
  }

  await Promise.allSettled(promises);
  return { success: true };
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
      dispatchTaskSubmittedEmail(params.delegatorEmail, {
        taskNo: params.taskNo,
        title: params.title,
        delegateeName: params.delegateeName,
        deliverableName: params.deliverableName,
        deliverableUrl: params.deliverableUrl,
        verifyLink: "http://localhost:3000/verify",
      })
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
      })
    );
  }

  await Promise.allSettled(promises);
  return { success: true };
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
      dispatchTaskVerifiedEmail(params.delegateeEmail, {
        taskNo: params.taskNo,
        title: params.title,
        score: params.score,
        delayDays: params.delayDays,
        remarks: params.remarks,
        verifiedByName: params.verifiedByName,
      })
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
      })
    );
  }

  await Promise.allSettled(promises);
  return { success: true };
}

