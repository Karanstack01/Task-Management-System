// StackDrove CTMS - Dual-Channel WhatsApp Service
// Channel 1: CEOITBOX official WhatsApp Business API (https://official.ceoitbox.com) - primary
// Channel 2: Official Meta Cloud API v20.0 (direct) - fallback
//
// Each notification event can use an approved WhatsApp TEMPLATE (chosen in Master Integrations) so that alerts
// reach people outside the 24-hour customer window; without a template the plain-text message is used.

import type { NotificationDeliveryStatus } from "@/types/database.types";
import {
  hasRealValue,
  normalizeMobile,
  resolveWhatsAppConfig,
  type ResolvedWhatsApp,
} from "@/lib/integrations/resolve";
import {
  DEFAULT_MESSAGES,
  buildTemplateParams,
  isWaEventKey,
  renderMessageTags,
  sampleDataFor,
  type WaEventKey,
  type WaTemplateData,
  type WaTemplateMapping,
} from "./template-config";
import {
  DEFAULT_CEOITBOX_URL,
  WA_TIMEOUT_MS,
  describeNetworkError,
  hasCeoitboxCredentials,
  listTemplates,
  sendTemplateMessage,
  sendTextMessage,
  syncTemplatesFromMeta,
  type CeoitboxConfig,
  type WaTemplateInfo,
} from "./ceoitbox-client";

export interface WAPayload {
  orgId: string;
  recipientMobile: string;
  recipientName: string;
  message: string;
  templateType: "TASK_ASSIGNED" | "TASK_SUBMITTED" | "TASK_VERIFIED" | "TASK_REMINDER" | "DIAGNOSTIC";
  templateParams?: string[];
  /** Values for the event's template variables. When omitted, the plain-text message is used. */
  templateData?: WaTemplateData;
}

export interface WADispatchResult {
  success: boolean;
  channel: "META_OFFICIAL" | "CEOITBOX_GATEWAY" | "SIMULATED_LOCAL";
  messageId?: string;
  error?: string;
  /** Per-channel outcome, in the order they were tried. */
  attempts?: WAChannelAttempt[];
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
// CHANNEL SENDERS
// -------------------------------------------------------------
const META_API_VERSION = "v20.0";

export interface WAChannelAttempt {
  channel: "META_OFFICIAL" | "CEOITBOX_GATEWAY";
  kind: "template" | "text";
  ok: boolean;
  messageId?: string;
  error?: string;
}

interface ChannelSender {
  channel: "META_OFFICIAL" | "CEOITBOX_GATEWAY";
  text(to: string, message: string): Promise<WAChannelAttempt>;
  template(to: string, mapping: WaTemplateMapping, params: string[]): Promise<WAChannelAttempt>;
}

function pushWaLog(entry: Omit<WANotificationLogEntry, "id" | "timestamp">) {
  localWhatsAppNotificationLogs.unshift({
    ...entry,
    id: `wa-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  });
  if (localWhatsAppNotificationLogs.length > 200) localWhatsAppNotificationLogs.length = 200;
}

/** Translates Meta Graph API errors into an actionable message. */
function explainMetaError(status: number, body: unknown): string {
  const err = (body as { error?: { message?: string; code?: number; error_data?: { details?: string } } } | null)?.error;
  const code = err?.code;
  const detail = err?.error_data?.details || err?.message || `HTTP ${status}`;
  if (code === 190 || status === 401) {
    return `Meta rejected the access token (${detail}). Generate a new permanent System User token with the whatsapp_business_messaging permission.`;
  }
  if (code === 131030) {
    return `Recipient is not on the allowed list for this Meta test number (${detail}). Add the number in the WhatsApp API Setup page, or use a live number.`;
  }
  if (code === 131047 || code === 131026) {
    return `Meta could not deliver a free-form message (${detail}). Outside the 24-hour customer window WhatsApp only allows approved templates; the recipient must have messaged you in the last 24h.`;
  }
  if (code === 132001) {
    return `Meta says this template does not exist in this language (${detail}). Re-select the template in Master Integrations.`;
  }
  if (code === 100 || code === 33) {
    return `Meta says the Phone Number ID is invalid or the token has no access to it (${detail}).`;
  }
  return `Meta Cloud API error: ${detail}`;
}

async function postMeta(
  cfg: { phoneId: string; token: string },
  kind: "template" | "text",
  payload: Record<string, unknown>
): Promise<WAChannelAttempt> {
  try {
    const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(cfg.phoneId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      const id = (data as { messages?: Array<{ id?: string }> } | null)?.messages?.[0]?.id;
      return { channel: "META_OFFICIAL", kind, ok: true, messageId: id || `meta-${Date.now()}` };
    }
    return { channel: "META_OFFICIAL", kind, ok: false, error: explainMetaError(res.status, data) };
  } catch (err) {
    return { channel: "META_OFFICIAL", kind, ok: false, error: `Could not reach Meta Cloud API: ${describeNetworkError(err)}` };
  }
}

function metaSender(cfg: { phoneId: string; token: string }): ChannelSender {
  return {
    channel: "META_OFFICIAL",
    text: (to, message) => postMeta(cfg, "text", { to, type: "text", text: { preview_url: true, body: message } }),
    template: (to, mapping, params) =>
      postMeta(cfg, "template", {
        to,
        type: "template",
        template: {
          name: mapping.templateName,
          language: { code: mapping.language },
          ...(params.length
            ? { components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] }
            : {}),
        },
      }),
  };
}

function gatewaySender(cfg: CeoitboxConfig): ChannelSender {
  const wrap = (kind: "template" | "text") => (r: { ok: boolean; messageId?: string; error?: string }): WAChannelAttempt => ({
    channel: "CEOITBOX_GATEWAY",
    kind,
    ok: r.ok,
    messageId: r.messageId,
    error: r.error,
  });
  return {
    channel: "CEOITBOX_GATEWAY",
    text: async (to, message) => wrap("text")(await sendTextMessage(cfg, to, message)),
    template: async (to, mapping, params) =>
      wrap("template")(await sendTemplateMessage(cfg, to, mapping.templateName, mapping.language, params)),
  };
}

// -------------------------------------------------------------
// DUAL-CHANNEL DISPATCH ENGINE
// -------------------------------------------------------------
export async function dispatchWhatsAppAlert(payload: WAPayload): Promise<WADispatchResult> {
  const { meta, gateway, templates, messages } = await resolveWhatsAppConfig(payload.orgId);
  const to = normalizeMobile(payload.recipientMobile);

  // Plain-text body: the admin's custom message (with <<Tags>> filled in) when set, else the built-in one.
  const custom = isWaEventKey(payload.templateType) ? messages[payload.templateType]?.trim() : undefined;
  const textBody = custom && payload.templateData ? renderMessageTags(custom, payload.templateData) : payload.message;

  // CEOITBOX official API is the primary channel (it is where templates are managed); Meta direct is the fallback.
  const senders: ChannelSender[] = [];
  if (gateway) senders.push(gatewaySender(gateway));
  if (meta) senders.push(metaSender(meta));

  const log = (channel: WANotificationLogEntry["channel"], status: WANotificationLogEntry["status"]) =>
    pushWaLog({
      recipientMobile: payload.recipientMobile,
      recipientName: payload.recipientName,
      message: textBody,
      channel,
      templateType: payload.templateType,
      status,
    });

  if (senders.length === 0) {
    // Nothing configured: local test / simulated mode (keeps local flows working without credentials).
    log("SIMULATED_LOCAL", "SIMULATED");
    return { success: true, channel: "SIMULATED_LOCAL", messageId: `<simulated-wa-${Date.now()}@stackdrove>` };
  }

  if (to.length < 8) {
    const channel = senders[0].channel;
    log(channel, "FAILED");
    return { success: false, channel, error: `Invalid recipient mobile number "${payload.recipientMobile}".`, attempts: [] };
  }

  // Use the admin-selected template for this event when the caller supplied its data.
  const mapping = isWaEventKey(payload.templateType) ? templates[payload.templateType] : undefined;
  const params = mapping && payload.templateData ? buildTemplateParams(mapping, payload.templateData) : null;

  const attempts: WAChannelAttempt[] = [];
  for (const sender of senders) {
    if (mapping && params) {
      const a = await sender.template(to, mapping, params);
      attempts.push(a);
      if (a.ok) {
        log(a.channel, "SENT");
        return { success: true, channel: a.channel, messageId: a.messageId, attempts };
      }
    }
    // Plain text: the default when no template is set, and a last resort if a template send failed.
    const t = await sender.text(to, textBody);
    attempts.push(t);
    if (t.ok) {
      log(t.channel, "SENT");
      return { success: true, channel: t.channel, messageId: t.messageId, attempts };
    }
  }

  // Every attempt failed: report the real reasons (never fake success).
  const last = attempts[attempts.length - 1];
  const error = attempts.map((a) => `[${a.channel === "META_OFFICIAL" ? "Meta" : "CEOITBOX"} ${a.kind}] ${a.error}`).join(" | ");
  console.error(`[whatsapp] dispatch to ${to} failed: ${error}`);
  log(last.channel, "FAILED");
  return { success: false, channel: last.channel, error, attempts };
}

// -------------------------------------------------------------
// ADMIN CONSOLE: CONNECTION TEST, TEMPLATE FETCH, TEMPLATE TEST
// -------------------------------------------------------------
export interface WAChannelTestResult {
  channel: "META_OFFICIAL" | "CEOITBOX_GATEWAY";
  status: "ok" | "failed" | "skipped" | "not_configured";
  message: string;
  messageId?: string;
}

export interface WATestResult {
  success: boolean;
  configured: boolean;
  message: string;
  results: WAChannelTestResult[];
}

/** Values typed in the form but not yet saved. Blank fields fall back to what is saved. */
export interface WAOverride {
  metaPhoneId?: string;
  metaToken?: string;
  gatewayUrl?: string;
  gatewayUsername?: string;
  gatewayPassword?: string;
  gatewayApiKey?: string;
  gatewayPhoneId?: string;
}

/**
 * Effective CEOITBOX config = saved/env credentials with any form values layered on top.
 * Credentials typed in the form replace the saved ones as a set (API key XOR username/password).
 */
function mergeGateway(resolved: ResolvedWhatsApp["gateway"], o?: WAOverride): CeoitboxConfig | null {
  const key = o?.gatewayApiKey?.trim();
  const user = o?.gatewayUsername?.trim();
  const pass = o?.gatewayPassword?.trim();

  let apiKey: string | undefined;
  let username: string | undefined;
  let password: string | undefined;
  if (key) {
    apiKey = key;
  } else if (user || pass) {
    username = user || resolved?.username;
    password = pass || resolved?.password;
  } else {
    apiKey = resolved?.apiKey;
    username = resolved?.username;
    password = resolved?.password;
  }

  const cfg: CeoitboxConfig = {
    baseUrl: (o?.gatewayUrl?.trim() || resolved?.baseUrl || DEFAULT_CEOITBOX_URL).replace(/\/+$/, ""),
    apiKey,
    username,
    password,
    phoneId: o?.gatewayPhoneId?.trim() || resolved?.phoneId,
  };
  return hasCeoitboxCredentials(cfg) ? cfg : null;
}

function mergeMeta(resolved: ResolvedWhatsApp["meta"], o?: WAOverride): { phoneId: string; token: string } | null {
  const phoneId = o?.metaPhoneId?.trim() || resolved?.phoneId || "";
  const token = o?.metaToken?.trim() || resolved?.token || "";
  return hasRealValue(phoneId) && hasRealValue(token) ? { phoneId, token } : null;
}

/**
 * Real test for both WhatsApp channels. Never fakes success.
 *  - CEOITBOX: a read-only authenticated call (template list) proves the credentials; with a test mobile it
 *    also sends a plain-text message.
 *  - Meta: validates the token + Phone Number ID with a read-only Graph API call; with a test mobile it also sends.
 */
export async function testWhatsAppConnection(params: {
  orgId: string;
  toMobile?: string;
  override?: WAOverride;
}): Promise<WATestResult> {
  const resolved = await resolveWhatsAppConfig(params.orgId);
  const gw = mergeGateway(resolved.gateway, params.override);
  const meta = mergeMeta(resolved.meta, params.override);

  const to = params.toMobile ? normalizeMobile(params.toMobile) : "";
  if (params.toMobile && to.length < 8) {
    return {
      success: false,
      configured: true,
      message: `"${params.toMobile}" is not a valid mobile number. Use the full number with country code, e.g. 919876543210.`,
      results: [],
    };
  }

  const testText =
    `*StackDrove CTMS - WhatsApp connection test*\n` +
    `Your WhatsApp alert channel is working.\n` +
    `Time: ${new Date().toLocaleString("en-GB", { timeZone: "UTC" })} UTC`;
  const windowHint =
    " Free-text messages are only delivered to numbers that messaged you in the last 24 hours - use \"Send test\" on the Templates tab to test real alerts.";

  const results: WAChannelTestResult[] = [];

  // ---- CEOITBOX official API ----
  if (!gw) {
    results.push({
      channel: "CEOITBOX_GATEWAY",
      status: "not_configured",
      message: "CEOITBOX is not configured (needs an API key, or a username and password).",
    });
  } else {
    const listed = await listTemplates(gw, { pageSize: 1, maxPages: 1 });
    if (!listed.ok) {
      results.push({ channel: "CEOITBOX_GATEWAY", status: "failed", message: listed.error });
    } else {
      const base = `Connected to ${gw.baseUrl} (${gw.apiKey ? "API key" : "Basic Auth"}); ${listed.total} template(s) available.`;
      if (!to) {
        results.push({ channel: "CEOITBOX_GATEWAY", status: "ok", message: `${base} Enter a test mobile to also send a message.` });
      } else {
        const sent = await sendTextMessage(gw, to, testText);
        results.push(
          sent.ok
            ? { channel: "CEOITBOX_GATEWAY", status: "ok", messageId: sent.messageId, message: `${base} Test message sent to ${to}.` }
            : { channel: "CEOITBOX_GATEWAY", status: "failed", message: `${base} But the test message failed: ${sent.error}${windowHint}` }
        );
      }
    }
  }

  // ---- Meta Cloud API (direct) ----
  if (!meta) {
    results.push({
      channel: "META_OFFICIAL",
      status: "not_configured",
      message: "Meta Cloud API is not configured (needs Phone Number ID and token).",
    });
  } else {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(meta.phoneId)}?fields=verified_name,display_phone_number,quality_rating`,
        { headers: { Authorization: `Bearer ${meta.token}` }, signal: AbortSignal.timeout(WA_TIMEOUT_MS) }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        results.push({ channel: "META_OFFICIAL", status: "failed", message: explainMetaError(res.status, data) });
      } else {
        const d = data as { verified_name?: string; display_phone_number?: string };
        const who = [d.verified_name, d.display_phone_number].filter(Boolean).join(" / ");
        if (!to) {
          results.push({
            channel: "META_OFFICIAL",
            status: "ok",
            message: `Token and Phone Number ID are valid${who ? ` (${who})` : ""}. Enter a test mobile to also send a message.`,
          });
        } else {
          const sent = await metaSender(meta).text(to, testText);
          results.push(
            sent.ok
              ? { channel: "META_OFFICIAL", status: "ok", messageId: sent.messageId, message: `Credentials valid${who ? ` (${who})` : ""} and test message sent to ${to}.` }
              : { channel: "META_OFFICIAL", status: "failed", message: `Credentials valid${who ? ` (${who})` : ""}, but sending failed: ${sent.error}` }
          );
        }
      }
    } catch (err) {
      results.push({ channel: "META_OFFICIAL", status: "failed", message: `Could not reach Meta Cloud API: ${describeNetworkError(err)}` });
    }
  }

  const configured = results.some((r) => r.status !== "not_configured");
  const anyOk = results.some((r) => r.status === "ok");
  const anyFailed = results.some((r) => r.status === "failed");
  const success = anyOk && !anyFailed;

  let message: string;
  if (!configured) message = "WhatsApp is not configured. Enter the CEOITBOX credentials and/or the Meta credentials.";
  else if (success) message = "WhatsApp connection verified.";
  else if (anyFailed) message = "WhatsApp test failed - see the details below.";
  else message = "Nothing could be verified yet - see the details below.";

  return { success, configured, message, results };
}

export type WATemplateFetchResult =
  | { ok: true; templates: WaTemplateInfo[]; total: number; syncWarning?: string }
  | { ok: false; error: string };

/** Fetches the account's WhatsApp templates from CEOITBOX. `sync: true` first re-imports them from Meta. */
export async function fetchWhatsAppTemplates(params: {
  orgId: string;
  override?: WAOverride;
  sync?: boolean;
}): Promise<WATemplateFetchResult> {
  const resolved = await resolveWhatsAppConfig(params.orgId);
  const gw = mergeGateway(resolved.gateway, params.override);
  if (!gw) {
    return { ok: false, error: "Connect CEOITBOX first: enter an API key (or username and password) and test the connection." };
  }

  let syncWarning: string | undefined;
  if (params.sync) {
    const s = await syncTemplatesFromMeta(gw);
    if (!s.ok) syncWarning = `Could not sync from Meta (showing what CEOITBOX already has): ${s.error}`;
  }

  const listed = await listTemplates(gw);
  if (!listed.ok) return { ok: false, error: listed.error };
  return { ok: true, templates: listed.templates, total: listed.total, syncWarning };
}

export interface WATemplateSendTest {
  success: boolean;
  message: string;
  channel?: "META_OFFICIAL" | "CEOITBOX_GATEWAY";
  messageId?: string;
}

/** Sends the template chosen for `event` to `toMobile` with sample values, to verify the mapping end to end. */
export async function testWhatsAppTemplateSend(params: {
  orgId: string;
  event: WaEventKey;
  toMobile: string;
  /** Mapping from the form (unsaved). Falls back to the saved mapping. */
  mapping?: WaTemplateMapping;
  override?: WAOverride;
}): Promise<WATemplateSendTest> {
  const resolved = await resolveWhatsAppConfig(params.orgId);
  const mapping = params.mapping ?? resolved.templates[params.event];
  if (!mapping) return { success: false, message: "Choose a template for this event first." };

  const to = normalizeMobile(params.toMobile);
  if (to.length < 8) {
    return { success: false, message: `"${params.toMobile}" is not a valid mobile number. Use the full number with country code.` };
  }

  const gw = mergeGateway(resolved.gateway, params.override);
  const meta = mergeMeta(resolved.meta, params.override);
  const sender = gw ? gatewaySender(gw) : meta ? metaSender(meta) : null;
  if (!sender) return { success: false, message: "WhatsApp is not configured - connect CEOITBOX (or Meta) first." };

  const values = buildTemplateParams(mapping, sampleDataFor(params.event));
  const a = await sender.template(to, mapping, values);
  return a.ok
    ? {
        success: true,
        channel: a.channel,
        messageId: a.messageId,
        message: `Template "${mapping.templateName}" accepted for ${to}. Variables were filled with sample values.`,
      }
    : { success: false, channel: a.channel, message: a.error || "Template send failed." };
}

/**
 * Sends a flow's plain-text message to `toMobile` with sample values, to check wording and tags.
 * `text` is the editor's current (maybe unsaved) text; otherwise the saved custom message, otherwise the built-in one.
 * Note: WhatsApp only delivers plain text to numbers that messaged you in the last 24 hours.
 */
export async function testWhatsAppMessageSend(params: {
  orgId: string;
  event: WaEventKey;
  toMobile: string;
  text?: string;
  override?: WAOverride;
}): Promise<WATemplateSendTest> {
  const resolved = await resolveWhatsAppConfig(params.orgId);
  const to = normalizeMobile(params.toMobile);
  if (to.length < 8) {
    return { success: false, message: `"${params.toMobile}" is not a valid mobile number. Use the full number with country code.` };
  }

  const gw = mergeGateway(resolved.gateway, params.override);
  const meta = mergeMeta(resolved.meta, params.override);
  const sender = gw ? gatewaySender(gw) : meta ? metaSender(meta) : null;
  if (!sender) return { success: false, message: "WhatsApp is not configured - connect CEOITBOX (or Meta) first." };

  const source = params.text?.trim() || resolved.messages[params.event]?.trim() || DEFAULT_MESSAGES[params.event];
  const a = await sender.text(to, renderMessageTags(source, sampleDataFor(params.event)));
  return a.ok
    ? { success: true, channel: a.channel, messageId: a.messageId, message: `Message sent to ${to} with sample values.` }
    : {
        success: false,
        channel: a.channel,
        message: `${a.error || "Message send failed."} Plain text is only delivered to numbers that messaged you in the last 24 hours.`,
      };
}
