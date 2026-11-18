import nodemailer from "nodemailer";
import {
  renderTaskAssignedEmail,
  renderTaskSubmittedEmail,
  renderTaskVerifiedEmail,
  renderDailyDigestEmail,
  TaskAssignedEmailProps,
  TaskSubmittedEmailProps,
  TaskVerifiedEmailProps,
  DailyDigestEmailProps,
} from "./email-templates";
import { EmailProvider, NotificationDeliveryStatus } from "@/types/database.types";
import {
  getEnvSmtpConfig,
  hasRealValue,
  resolveActiveEmailProvider,
  resolveEmailConfig,
  type ConfigSource,
  type SmtpConfig,
} from "@/lib/integrations/resolve";

export type { SmtpConfig };

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
const MAX_LOG_ENTRIES = 200;

function pushLog(entry: Omit<NotificationLogEntry, "id" | "timestamp">) {
  localNotificationLogs.unshift({
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  });
  if (localNotificationLogs.length > MAX_LOG_ENTRIES) localNotificationLogs.length = MAX_LOG_ENTRIES;
}

// ---- Config helpers (environment-based; kept for backwards compatibility) ----------------------

export function getMicrosoftSmtpConfig(): SmtpConfig {
  return getEnvSmtpConfig("MICROSOFT_365");
}

export function getGoogleSmtpConfig(): SmtpConfig {
  return getEnvSmtpConfig("GOOGLE");
}

export function getSmtpConfig(provider: EmailProvider = "MICROSOFT_365"): SmtpConfig {
  return getEnvSmtpConfig(provider);
}

/**
 * True for empty credentials and obvious demo/placeholder values (used by local simulation mode,
 * where no real mail is sent). Real credentials are never treated as demo values.
 */
function isDemoCredential(cfg: SmtpConfig): boolean {
  const user = cfg.user || "";
  const pass = cfg.pass || "";
  return (
    !hasRealValue(user) ||
    !hasRealValue(pass) ||
    user.toLowerCase().startsWith("test@") ||
    /secret/i.test(pass) ||
    pass.replace(/\s/g, "").toLowerCase() === "abcdefghijklmnop" // Google's documentation example
  );
}

export function createTransporter(config: SmtpConfig) {
  const port = Number(config.port) || 587;
  // Google shows app passwords as "abcd efgh ijkl mnop" - the spaces are not part of the password.
  const pass =
    config.provider === "GOOGLE" || config.host.includes("gmail.com")
      ? (config.pass || "").replace(/\s+/g, "")
      : config.pass;

  return nodemailer.createTransport({
    host: config.host,
    port,
    secure: port === 465, // implicit TLS on 465
    requireTLS: port !== 465, // STARTTLS is mandatory on 587 / 25
    auth: { user: config.user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // Verify the server certificate and refuse legacy protocol versions.
    tls: { minVersion: "TLSv1.2", servername: config.host },
  });
}

/** Turns low-level SMTP errors into something an admin can act on. */
export function explainSmtpError(err: unknown, provider: EmailProvider): string {
  const e = err as { code?: string; responseCode?: number; message?: string } | undefined;
  const raw = e?.message || "Unknown SMTP error";
  const code = e?.code;
  const label = provider === "GOOGLE" ? "Google Workspace / Gmail" : "Microsoft 365";

  if (code === "EAUTH" || e?.responseCode === 535 || /invalid login|authentication/i.test(raw)) {
    return provider === "GOOGLE"
      ? `${label} rejected the login. Use the full email address and a 16-character App Password ` +
          `(Google Account > Security > 2-Step Verification > App passwords) - your normal Google password will not work.`
      : `${label} rejected the login. Check the email address and app password, and make sure SMTP AUTH ` +
          `is enabled for this mailbox (Microsoft 365 admin center > Users > Mail > Manage email apps > Authenticated SMTP).`;
  }
  if (code === "ETIMEDOUT" || code === "ECONNECTION" || code === "ESOCKET" || code === "EDNS" || code === "ENOTFOUND") {
    return `Could not reach the ${label} SMTP server (${raw}). Check the host and port (587 with STARTTLS, or 465), and that the network allows outbound SMTP.`;
  }
  if (code === "EENVELOPE") {
    return `The recipient address was rejected: ${raw}`;
  }
  // 4xx = the mail server accepted the login but temporarily refused to send (rate limit, reputation, greylisting).
  if (e?.responseCode && e.responseCode >= 400 && e.responseCode < 500) {
    return (
      `${label} temporarily refused to send this message (SMTP ${e.responseCode}). Your login is fine - this is a ` +
      `temporary block on the sending side, not a credentials problem. Wait 10-15 minutes and retry, try a different ` +
      `recipient address, and avoid repeated test sends. If it keeps happening, check the sending account's mail log ` +
      `in the provider's admin console. Server said: ${raw}`
    );
  }
  return raw;
}

async function sendThroughTransport(
  cfg: SmtpConfig,
  message: { to: string; subject: string; html: string }
): Promise<{ messageId: string }> {
  const transporter = createTransporter(cfg);
  const info = await transporter.sendMail({
    from: `"${(cfg.senderName || "StackDrove CTMS").replace(/"/g, "")}" <${cfg.user}>`,
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
  return { messageId: info.messageId };
}

// ---- Sending -----------------------------------------------------------------------------------

export async function sendEmailMessage(params: {
  to: string;
  subject: string;
  html: string;
  templateType: string;
  provider?: EmailProvider;
  customConfig?: SmtpConfig;
  /** When set, the organization's saved integration settings are used (falling back to env vars). */
  orgId?: string;
}): Promise<EmailDispatchResult> {
  // Provider: explicit > custom config > organization's chosen provider > Microsoft 365
  const provider: EmailProvider =
    params.provider ||
    params.customConfig?.provider ||
    (await resolveActiveEmailProvider(params.orgId));

  const cfg: SmtpConfig = params.customConfig
    ? { ...params.customConfig }
    : (await resolveEmailConfig(params.orgId, provider)).config;
  cfg.provider = provider;

  const targetChannel: "GOOGLE_WORKSPACE_SMTP" | "MICROSOFT_365_SMTP" =
    provider === "GOOGLE" ? "GOOGLE_WORKSPACE_SMTP" : "MICROSOFT_365_SMTP";

  // No live credentials configured (local / demo mode): log and simulate so app flows keep working.
  if (isDemoCredential(cfg)) {
    pushLog({
      recipient: params.to,
      subject: params.subject,
      template: params.templateType,
      provider,
      status: "SIMULATED",
    });
    return {
      success: true,
      messageId: `<simulated-${provider.toLowerCase()}-${Date.now()}@stackdrove.local>`,
      channel: "SIMULATED_LOCAL",
    };
  }

  try {
    const { messageId } = await sendThroughTransport(cfg, {
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    pushLog({
      recipient: params.to,
      subject: params.subject,
      template: params.templateType,
      provider,
      status: "SENT",
    });
    return { success: true, messageId, channel: targetChannel };
  } catch (err: unknown) {
    const message = explainSmtpError(err, provider);
    console.error(`[email] ${provider} send to ${params.to} failed: ${message}`);
    pushLog({
      recipient: params.to,
      subject: params.subject,
      template: params.templateType,
      provider,
      status: "FAILED",
    });
    return { success: false, channel: targetChannel, error: message };
  }
}

// ---- Transactional helpers ---------------------------------------------------------------------

export async function dispatchTaskAssignedEmail(
  toEmail: string,
  props: TaskAssignedEmailProps,
  provider?: EmailProvider,
  orgId?: string
) {
  const { subject, html } = renderTaskAssignedEmail(props);
  return sendEmailMessage({ to: toEmail, subject, html, templateType: "TASK_ASSIGNED", provider, orgId });
}

export async function dispatchTaskSubmittedEmail(
  toEmail: string,
  props: TaskSubmittedEmailProps,
  provider?: EmailProvider,
  orgId?: string
) {
  const { subject, html } = renderTaskSubmittedEmail(props);
  return sendEmailMessage({ to: toEmail, subject, html, templateType: "TASK_SUBMITTED", provider, orgId });
}

export async function dispatchTaskVerifiedEmail(
  toEmail: string,
  props: TaskVerifiedEmailProps,
  provider?: EmailProvider,
  orgId?: string
) {
  const { subject, html } = renderTaskVerifiedEmail(props);
  return sendEmailMessage({ to: toEmail, subject, html, templateType: "TASK_VERIFIED", provider, orgId });
}

export async function dispatchDailyDigestEmail(
  toEmail: string,
  props: DailyDigestEmailProps,
  provider?: EmailProvider,
  orgId?: string
) {
  const { subject, html } = renderDailyDigestEmail(props);
  return sendEmailMessage({ to: toEmail, subject, html, templateType: "TASK_REMINDER", provider, orgId });
}

// ---- Connection checks -------------------------------------------------------------------------

/**
 * Legacy diagnostic: reports success in local simulation mode when no live credentials exist.
 * For the real "does my account work" check used by the admin console, see testEmailConnection().
 */
export async function verifyEmailConnection(params?: {
  provider?: EmailProvider;
  config?: SmtpConfig;
}): Promise<{ success: boolean; message: string; provider: EmailProvider }> {
  const provider = params?.provider || params?.config?.provider || "MICROSOFT_365";
  const cfg = params?.config ? { ...params.config } : getSmtpConfig(provider);
  cfg.provider = provider;

  const providerLabel = provider === "GOOGLE" ? "Google Workspace / Gmail" : "Microsoft 365";

  if (isDemoCredential(cfg)) {
    return {
      success: true,
      message: `${providerLabel} SMTP configured in local simulation mode (ready for live credentials).`,
      provider,
    };
  }

  try {
    await createTransporter(cfg).verify();
    return {
      success: true,
      message: `Successfully authenticated with ${cfg.host} as ${cfg.user} (${providerLabel})`,
      provider,
    };
  } catch (err: unknown) {
    return { success: false, message: explainSmtpError(err, provider), provider };
  }
}

// Backwards compatibility alias
export async function verifySmtpConnection(config?: SmtpConfig) {
  return verifyEmailConnection({ provider: config?.provider || "MICROSOFT_365", config });
}

export interface EmailTestResult {
  success: boolean;
  /** False when no usable credentials exist - nothing was tested. */
  configured: boolean;
  provider: EmailProvider;
  stage: "not_configured" | "connect" | "send" | "done";
  message: string;
  messageId?: string;
  source: ConfigSource;
  host?: string;
  user?: string;
}

/**
 * Real connection test for the admin console. Never fakes success:
 *  1. checks credentials exist, 2. logs in to the SMTP server, 3. (optionally) sends a test email.
 * `override` lets the admin test values typed into the form before saving them.
 */
export async function testEmailConnection(params: {
  orgId: string;
  provider: EmailProvider;
  toEmail?: string;
  override?: Partial<Pick<SmtpConfig, "host" | "port" | "user" | "pass" | "senderName">>;
}): Promise<EmailTestResult> {
  const { provider } = params;
  const resolved = await resolveEmailConfig(params.orgId, provider);
  const cfg: SmtpConfig = { ...resolved.config, provider };
  let source = resolved.source;

  const o = params.override;
  if (o) {
    if (o.host?.trim()) cfg.host = o.host.trim();
    if (o.port) cfg.port = Number(o.port);
    if (o.senderName?.trim()) cfg.senderName = o.senderName.trim();
    if (o.user?.trim()) cfg.user = o.user.trim();
    if (o.pass?.trim()) cfg.pass = o.pass.trim();
    if (o.user?.trim() || o.pass?.trim()) source = "saved"; // form values, not yet persisted
  }

  const label = provider === "GOOGLE" ? "Google Workspace / Gmail" : "Microsoft 365";

  if (!hasRealValue(cfg.user) || !hasRealValue(cfg.pass)) {
    return {
      success: false,
      configured: false,
      provider,
      stage: "not_configured",
      source: "none",
      message: `${label} is not configured: enter the email ID and app password (and save), or set the ${
        provider === "GOOGLE" ? "GOOGLE_SMTP_USER / GOOGLE_APP_PASSWORD" : "MICROSOFT_SMTP_USER / MICROSOFT_APP_PASSWORD"
      } environment variables.`,
    };
  }

  const base = { provider, source, host: cfg.host, user: cfg.user };

  try {
    await createTransporter(cfg).verify();
  } catch (err: unknown) {
    return {
      ...base,
      success: false,
      configured: true,
      stage: "connect",
      message: explainSmtpError(err, provider),
    };
  }

  if (!params.toEmail) {
    return {
      ...base,
      success: true,
      configured: true,
      stage: "done",
      message: `Connected and logged in to ${cfg.host} as ${cfg.user}. Enter a recipient email to also send a test message.`,
    };
  }

  try {
    const { messageId } = await sendThroughTransport(cfg, {
      to: params.toEmail,
      subject: `StackDrove CTMS - ${label} connection test`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;border:1px solid #EEEEEE;border-radius:16px;background:#F7F7F7;">
          <div style="display:inline-block;padding:6px 12px;background:#111111;color:#FFFFFF;border-radius:8px;font-weight:bold;font-size:12px;margin-bottom:12px;">STACKDROVE ENTERPRISE CTMS</div>
          <h2 style="color:#111111;margin-top:0;">${label} connection verified</h2>
          <p style="color:#4D4D4D;font-size:14px;line-height:1.5;">
            This test message was sent from the Master Enterprise Integrations console using <strong>${cfg.user}</strong> via <strong>${cfg.host}</strong>.
          </p>
          <p style="color:#111111;font-weight:bold;font-size:13px;">Status: email delivery is working.</p>
        </div>`,
    });
    pushLog({
      recipient: params.toEmail,
      subject: `${label} connection test`,
      template: "DIAGNOSTIC_TEST",
      provider,
      status: "SENT",
    });
    return {
      ...base,
      success: true,
      configured: true,
      stage: "done",
      messageId,
      message: `Logged in and sent a test email to ${params.toEmail}. Check that inbox (and spam).`,
    };
  } catch (err: unknown) {
    pushLog({
      recipient: params.toEmail,
      subject: `${label} connection test`,
      template: "DIAGNOSTIC_TEST",
      provider,
      status: "FAILED",
    });
    return {
      ...base,
      success: false,
      configured: true,
      stage: "send",
      message: `Login worked but sending failed: ${explainSmtpError(err, provider)}`,
    };
  }
}
