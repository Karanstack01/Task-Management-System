import nodemailer from "nodemailer";
import {
  renderTaskAssignedEmail,
  renderTaskSubmittedEmail,
  renderTaskVerifiedEmail,
  TaskAssignedEmailProps,
  TaskSubmittedEmailProps,
  TaskVerifiedEmailProps,
} from "./email-templates";
import { EmailProvider, NotificationDeliveryStatus } from "@/types/database.types";

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  senderName?: string;
  provider?: EmailProvider;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  channel: "GOOGLE_WORKSPACE_SMTP" | "MICROSOFT_365_SMTP" | "SIMULATED_LOCAL";
  error?: string;
}

// In-Memory Notification Audit Log for Test Execution
export interface NotificationLogEntry {
  id: string;
  recipient: string;
  subject: string;
  template: string;
  provider: EmailProvider | "LOCAL";
  /** Same vocabulary as notification_logs.status (NotificationDeliveryStatus). */
  status: Exclude<NotificationDeliveryStatus, "QUEUED">;
  timestamp: string;
}

export const localNotificationLogs: NotificationLogEntry[] = [];

export function getMicrosoftSmtpConfig(): SmtpConfig {
  return {
    host: process.env.MICROSOFT_SMTP_HOST || "smtp.office365.com",
    port: Number(process.env.MICROSOFT_SMTP_PORT) || 587,
    user: process.env.MICROSOFT_SMTP_USER || "",
    pass: process.env.MICROSOFT_APP_PASSWORD || "",
    senderName: process.env.MICROSOFT_SENDER_NAME || "StackDrove CTMS",
    provider: "MICROSOFT_365",
  };
}

export function getGoogleSmtpConfig(): SmtpConfig {
  return {
    host: process.env.GOOGLE_SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.GOOGLE_SMTP_PORT) || 587,
    user: process.env.GOOGLE_SMTP_USER || "",
    pass: process.env.GOOGLE_APP_PASSWORD || "",
    senderName: process.env.GOOGLE_SENDER_NAME || "StackDrove CTMS (Google)",
    provider: "GOOGLE",
  };
}

export function getSmtpConfig(provider: EmailProvider = "MICROSOFT_365"): SmtpConfig {
  return provider === "GOOGLE" ? getGoogleSmtpConfig() : getMicrosoftSmtpConfig();
}

export function createTransporter(config: SmtpConfig) {
  const isGoogle = config.provider === "GOOGLE" || config.host.includes("gmail.com");

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });
}

export async function sendEmailMessage(params: {
  to: string;
  subject: string;
  html: string;
  templateType: string;
  provider?: EmailProvider;
  customConfig?: SmtpConfig;
}): Promise<EmailDispatchResult> {
  const provider = params.provider || params.customConfig?.provider || "MICROSOFT_365";
  const cfg = params.customConfig || getSmtpConfig(provider);
  cfg.provider = provider;

  const targetChannel: "GOOGLE_WORKSPACE_SMTP" | "MICROSOFT_365_SMTP" =
    provider === "GOOGLE" ? "GOOGLE_WORKSPACE_SMTP" : "MICROSOFT_365_SMTP";

  // If live credentials are not set (local test server mode), log and simulate cleanly
  if (
    !cfg.user ||
    !cfg.pass ||
    cfg.user.includes("test@") ||
    cfg.pass.includes("secret") ||
    cfg.pass.includes("placeholder") ||
    cfg.pass.includes("abcd")
  ) {
    const entry: NotificationLogEntry = {
      id: `log-${Date.now()}`,
      recipient: params.to,
      subject: params.subject,
      template: params.templateType,
      provider: provider,
      status: "SIMULATED",
      timestamp: new Date().toISOString(),
    };
    localNotificationLogs.unshift(entry);

    return {
      success: true,
      messageId: `<simulated-${provider.toLowerCase()}-${Date.now()}@stackdrove.local>`,
      channel: "SIMULATED_LOCAL",
    };
  }

  try {
    const transporter = createTransporter(cfg);
    const info = await transporter.sendMail({
      from: `"${cfg.senderName || "StackDrove CTMS"}" <${cfg.user}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    const entry: NotificationLogEntry = {
      id: `log-${Date.now()}`,
      recipient: params.to,
      subject: params.subject,
      template: params.templateType,
      provider: provider,
      status: "SENT",
      timestamp: new Date().toISOString(),
    };
    localNotificationLogs.unshift(entry);

    return {
      success: true,
      messageId: info.messageId,
      channel: targetChannel,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : `${provider} SMTP Dispatch Failed`;
    const entry: NotificationLogEntry = {
      id: `log-${Date.now()}`,
      recipient: params.to,
      subject: params.subject,
      template: params.templateType,
      provider: provider,
      status: "FAILED",
      timestamp: new Date().toISOString(),
    };
    localNotificationLogs.unshift(entry);

    return {
      success: false,
      channel: targetChannel,
      error: errorMsg,
    };
  }
}

// Transactional Helpers
export async function dispatchTaskAssignedEmail(
  toEmail: string,
  props: TaskAssignedEmailProps,
  provider?: EmailProvider
) {
  const { subject, html } = renderTaskAssignedEmail(props);
  return sendEmailMessage({
    to: toEmail,
    subject,
    html,
    templateType: "TASK_ASSIGNED",
    provider,
  });
}

export async function dispatchTaskSubmittedEmail(
  toEmail: string,
  props: TaskSubmittedEmailProps,
  provider?: EmailProvider
) {
  const { subject, html } = renderTaskSubmittedEmail(props);
  return sendEmailMessage({
    to: toEmail,
    subject,
    html,
    templateType: "TASK_SUBMITTED",
    provider,
  });
}

export async function dispatchTaskVerifiedEmail(
  toEmail: string,
  props: TaskVerifiedEmailProps,
  provider?: EmailProvider
) {
  const { subject, html } = renderTaskVerifiedEmail(props);
  return sendEmailMessage({
    to: toEmail,
    subject,
    html,
    templateType: "TASK_VERIFIED",
    provider,
  });
}

// Diagnostic Connection Tester (Supports both Google and Microsoft 365)
export async function verifyEmailConnection(params?: {
  provider?: EmailProvider;
  config?: SmtpConfig;
}): Promise<{ success: boolean; message: string; provider: EmailProvider }> {
  const provider = params?.provider || params?.config?.provider || "MICROSOFT_365";
  const cfg = params?.config || getSmtpConfig(provider);
  cfg.provider = provider;

  const providerLabel = provider === "GOOGLE" ? "Google Workspace / Gmail" : "Microsoft 365";

  if (
    !cfg.user ||
    !cfg.pass ||
    cfg.pass.includes("placeholder") ||
    cfg.pass.includes("secret") ||
    cfg.pass.includes("abcd")
  ) {
    return {
      success: true,
      message: `${providerLabel} SMTP configured in local simulation mode (ready for live credentials).`,
      provider,
    };
  }

  try {
    const transporter = createTransporter(cfg);
    await transporter.verify();
    return {
      success: true,
      message: `Successfully authenticated with ${cfg.host} as ${cfg.user} (${providerLabel})`,
      provider,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `${providerLabel} connection failed`;
    return {
      success: false,
      message: msg,
      provider,
    };
  }
}

// Backwards compatibility alias
export async function verifySmtpConnection(config?: SmtpConfig) {
  return verifyEmailConnection({ provider: config?.provider || "MICROSOFT_365", config });
}
