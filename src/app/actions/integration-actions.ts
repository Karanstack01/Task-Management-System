"use server";

import { cookies } from "next/headers";
import type { EmailProvider } from "@/types/database.types";
import {
  getIntegrationSettings,
  getPersistenceMode,
  saveIntegrationSettings,
  SECRET_FIELDS,
  type IntegrationSettings,
  type PersistenceMode,
  type SecretField,
} from "@/lib/integrations/settings-store";
import { resolveWhatsAppConfig, getEnvSmtpConfig, hasRealValue } from "@/lib/integrations/resolve";
import { testEmailConnection, type EmailTestResult } from "@/lib/email/email-service";
import {
  fetchWhatsAppTemplates,
  testWhatsAppConnection,
  testWhatsAppMessageSend,
  testWhatsAppTemplateSend,
  type WAOverride,
  type WATemplateSendTest,
  type WATestResult,
} from "@/lib/whatsapp/whatsapp-service";
import type { WaTemplateInfo } from "@/lib/whatsapp/ceoitbox-client";
import {
  WA_EVENT_FIELDS,
  isWaDataKey,
  isWaEventKey,
  type WaEventKey,
  type WaMessageTemplates,
  type WaTemplateMapping,
  type WaTemplateMappings,
} from "@/lib/whatsapp/template-config";

/** Cookie set at sign-in (see src/lib/store/ui-store.ts). */
const SESSION_COOKIE = "ctms_session";
const ORG_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Types shared with the admin page (secrets are NEVER included, only "is set" flags) -----------

export interface IntegrationSettingsView {
  persistence: PersistenceMode;
  email_provider: EmailProvider;
  google: { host: string; port: number; user: string; senderName: string; hasPassword: boolean };
  microsoft: { host: string; port: number; user: string; senderName: string; hasPassword: boolean };
  whatsapp: {
    metaPhoneId: string;
    hasMetaToken: boolean;
    gatewayUrl: string;
    gatewayUsername: string;
    hasGatewayPassword: boolean;
    hasGatewayApiKey: boolean;
    gatewayPhoneId: string;
    /** Template chosen for each notification event. */
    templates: WaTemplateMappings;
    /** Custom plain-text message per event (with <<Tags>>). */
    messages: WaMessageTemplates;
    /** Templates from the last fetch, so the Library survives a reload. */
    library: { fetchedAt: string; templates: WaTemplateInfo[] };
    testMobile: string;
  };
  cloudinary: { cloudName: string; apiKey: string; uploadPreset: string; hasApiSecret: boolean };
  /** Credentials supplied through environment variables (used when nothing is saved in the console). */
  envFallback: { google: boolean; microsoft: boolean; meta: boolean; gateway: boolean; cloudinary: boolean };
}

export interface IntegrationSettingsInput {
  email_provider?: EmailProvider;
  google_smtp_host?: string;
  google_smtp_port?: number | string;
  google_smtp_user?: string;
  google_smtp_app_password?: string;
  google_sender_name?: string;
  ms_smtp_host?: string;
  ms_smtp_port?: number | string;
  ms_smtp_user?: string;
  ms_smtp_app_password?: string;
  ms_sender_name?: string;
  wa_meta_phone_id?: string;
  wa_meta_token?: string;
  wa_gateway_url?: string;
  wa_gateway_username?: string;
  wa_gateway_password?: string;
  wa_gateway_api_key?: string;
  wa_gateway_phone_id?: string;
  wa_templates?: WaTemplateMappings;
  wa_messages?: WaMessageTemplates;
  wa_test_mobile?: string;
  cloudinary_cloud_name?: string;
  cloudinary_api_key?: string;
  cloudinary_api_secret?: string;
  cloudinary_upload_preset?: string;
  /** Secret fields to erase. Leaving a secret blank keeps the stored value. */
  clearSecrets?: SecretField[];
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ---- Helpers ------------------------------------------------------------------------------------

async function guard(orgId: string): Promise<string | null> {
  const jar = await cookies();
  if (!jar.has(SESSION_COOKIE)) return "You are signed out. Please sign in again.";
  if (!ORG_ID_PATTERN.test(orgId)) return "Invalid organization.";
  return null;
}

async function buildView(orgId: string): Promise<IntegrationSettingsView> {
  const s = await getIntegrationSettings(orgId);
  const envWa = await resolveWhatsAppConfig(undefined);
  const envG = getEnvSmtpConfig("GOOGLE");
  const envM = getEnvSmtpConfig("MICROSOFT_365");
  return {
    persistence: getPersistenceMode(),
    email_provider: s.email_provider,
    google: {
      host: s.google_smtp_host,
      port: s.google_smtp_port,
      user: s.google_smtp_user,
      senderName: s.google_sender_name,
      hasPassword: !!s.google_smtp_app_password,
    },
    microsoft: {
      host: s.ms_smtp_host,
      port: s.ms_smtp_port,
      user: s.ms_smtp_user,
      senderName: s.ms_sender_name,
      hasPassword: !!s.ms_smtp_app_password,
    },
    whatsapp: {
      metaPhoneId: s.wa_meta_phone_id,
      hasMetaToken: !!s.wa_meta_token,
      gatewayUrl: s.wa_gateway_url,
      gatewayUsername: s.wa_gateway_username,
      hasGatewayPassword: !!s.wa_gateway_password,
      hasGatewayApiKey: !!s.wa_gateway_api_key,
      gatewayPhoneId: s.wa_gateway_phone_id,
      templates: s.wa_templates,
      messages: s.wa_messages,
      library: s.wa_template_cache,
      testMobile: s.wa_test_mobile,
    },
    cloudinary: {
      cloudName: s.cloudinary_cloud_name,
      apiKey: s.cloudinary_api_key,
      uploadPreset: s.cloudinary_upload_preset,
      hasApiSecret: !!s.cloudinary_api_secret,
    },
    envFallback: {
      google: !!(envG.user && envG.pass),
      microsoft: !!(envM.user && envM.pass),
      meta: !!envWa.meta,
      gateway: !!envWa.gateway,
      cloudinary:
        hasRealValue(process.env.CLOUDINARY_CLOUD_NAME) &&
        hasRealValue(process.env.CLOUDINARY_API_KEY) &&
        hasRealValue(process.env.CLOUDINARY_API_SECRET),
    },
  };
}

/** Validates the per-event template mapping coming from the browser. Returns a cleaned copy or an error string. */
function sanitizeTemplates(input: unknown): WaTemplateMappings | string {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return "Invalid template settings.";
  const out: WaTemplateMappings = {};
  for (const [event, raw] of Object.entries(input as Record<string, unknown>)) {
    if (raw === null || raw === undefined) continue; // no template for this event
    if (!isWaEventKey(event)) return `Unknown notification event "${event}".`;
    const m = raw as Partial<WaTemplateMapping>;
    const name = typeof m.templateName === "string" ? m.templateName.trim() : "";
    const language = typeof m.language === "string" ? m.language.trim() : "";
    if (!name || name.length > 512) return `Template name for "${event}" is missing or too long.`;
    if (!language || language.length > 20) return `Template language for "${event}" is missing or invalid.`;
    if (!Array.isArray(m.variables) || m.variables.length > 20) return `Template variables for "${event}" are invalid.`;
    const allowed = WA_EVENT_FIELDS[event];
    for (const v of m.variables) {
      if (!isWaDataKey(v) || !allowed.includes(v)) return `"${String(v)}" cannot be used as a variable for "${event}".`;
    }
    out[event] = {
      templateName: name,
      language,
      variables: m.variables,
      bodyPreview: typeof m.bodyPreview === "string" ? m.bodyPreview.slice(0, 2000) : undefined,
    };
  }
  return out;
}

/** Validates the custom per-event messages coming from the browser. Blank entries are dropped (= use default). */
function sanitizeMessages(input: unknown): WaMessageTemplates | string {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return "Invalid message settings.";
  const out: WaMessageTemplates = {};
  for (const [event, raw] of Object.entries(input as Record<string, unknown>)) {
    if (raw === null || raw === undefined) continue;
    if (!isWaEventKey(event)) return `Unknown notification event "${event}".`;
    if (typeof raw !== "string") return `The message for "${event}" must be text.`;
    const text = raw.replace(/\r\n/g, "\n").trim();
    if (text.length > 4000) return `The message for "${event}" is too long (max 4000 characters).`;
    if (text) out[event] = text;
  }
  return out;
}

function parsePort(value: number | string | undefined, label: string): number | undefined | string {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return `${label} must be a port number between 1 and 65535.`;
  return n;
}

// ---- Actions ------------------------------------------------------------------------------------

export async function getIntegrationSettingsAction(
  orgId: string
): Promise<ActionResult<IntegrationSettingsView>> {
  const denied = await guard(orgId);
  if (denied) return { ok: false, error: denied };
  try {
    return { ok: true, data: await buildView(orgId) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not load settings." };
  }
}

export async function saveIntegrationSettingsAction(
  orgId: string,
  input: IntegrationSettingsInput
): Promise<ActionResult<IntegrationSettingsView>> {
  const denied = await guard(orgId);
  if (denied) return { ok: false, error: denied };

  // ---- validation ----
  for (const [field, label] of [
    ["google_smtp_user", "Google email ID"],
    ["ms_smtp_user", "Microsoft sender email"],
  ] as const) {
    const v = input[field]?.trim();
    if (v && !EMAIL_PATTERN.test(v)) return { ok: false, error: `${label} is not a valid email address.` };
  }
  const googlePort = parsePort(input.google_smtp_port, "Google SMTP port");
  if (typeof googlePort === "string") return { ok: false, error: googlePort };
  const msPort = parsePort(input.ms_smtp_port, "Microsoft SMTP port");
  if (typeof msPort === "string") return { ok: false, error: msPort };

  if (input.email_provider && input.email_provider !== "GOOGLE" && input.email_provider !== "MICROSOFT_365") {
    return { ok: false, error: "Unknown email provider." };
  }
  const gw = input.wa_gateway_url?.trim();
  if (gw && !/^https:\/\//i.test(gw)) {
    return { ok: false, error: "Gateway URL must start with https://" };
  }
  let templates: WaTemplateMappings | undefined;
  if (input.wa_templates !== undefined) {
    const cleaned = sanitizeTemplates(input.wa_templates);
    if (typeof cleaned === "string") return { ok: false, error: cleaned };
    templates = cleaned;
  }
  let messages: WaMessageTemplates | undefined;
  if (input.wa_messages !== undefined) {
    const cleaned = sanitizeMessages(input.wa_messages);
    if (typeof cleaned === "string") return { ok: false, error: cleaned };
    messages = cleaned;
  }
  const clear = (input.clearSecrets ?? []).filter((f): f is SecretField =>
    (SECRET_FIELDS as readonly string[]).includes(f)
  );

  // Ports are validated/converted above; clearSecrets is an instruction, not a stored field.
  const patch: Record<string, unknown> = { ...input };
  delete patch.clearSecrets;
  delete patch.google_smtp_port;
  delete patch.ms_smtp_port;
  // Server-managed: the fetched-template cache is only ever written by a real fetch from CEOITBOX, never by the browser.
  delete patch.wa_template_cache;
  if (templates !== undefined) patch.wa_templates = templates;
  if (messages !== undefined) patch.wa_messages = messages;
  if (googlePort !== undefined) patch.google_smtp_port = googlePort;
  if (msPort !== undefined) patch.ms_smtp_port = msPort;

  try {
    await saveIntegrationSettings(orgId, patch as Partial<IntegrationSettings>, { clearSecrets: clear });
    return { ok: true, data: await buildView(orgId) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save settings." };
  }
}

/** Tests an email provider. Values typed in the form but not yet saved can be passed as `override`. */
export async function testEmailAction(
  orgId: string,
  params: {
    provider: EmailProvider;
    toEmail?: string;
    override?: { host?: string; port?: number | string; user?: string; pass?: string; senderName?: string };
  }
): Promise<ActionResult<EmailTestResult>> {
  const denied = await guard(orgId);
  if (denied) return { ok: false, error: denied };

  const to = params.toEmail?.trim();
  if (to && !EMAIL_PATTERN.test(to)) return { ok: false, error: "The test recipient is not a valid email address." };
  if (params.provider !== "GOOGLE" && params.provider !== "MICROSOFT_365") {
    return { ok: false, error: "Unknown email provider." };
  }

  try {
    const o = params.override;
    const result = await testEmailConnection({
      orgId,
      provider: params.provider,
      toEmail: to || undefined,
      override: o
        ? { host: o.host, port: o.port ? Number(o.port) : undefined, user: o.user, pass: o.pass, senderName: o.senderName }
        : undefined,
    });
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email test failed unexpectedly." };
  }
}

function checkOverride(o: WAOverride | undefined): string | null {
  const gw = o?.gatewayUrl?.trim();
  if (gw && !/^https:\/\//i.test(gw)) return "Gateway URL must start with https://";
  return null;
}

export async function testWhatsAppAction(
  orgId: string,
  params: { toMobile?: string; override?: WAOverride }
): Promise<ActionResult<WATestResult>> {
  const denied = await guard(orgId);
  if (denied) return { ok: false, error: denied };
  const bad = checkOverride(params.override);
  if (bad) return { ok: false, error: bad };

  try {
    const result = await testWhatsAppConnection({
      orgId,
      toMobile: params.toMobile?.trim() || undefined,
      override: params.override,
    });
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "WhatsApp test failed unexpectedly." };
  }
}

/** Fetches the account's WhatsApp templates from CEOITBOX (optionally re-syncing them from Meta first). */
export async function fetchWhatsAppTemplatesAction(
  orgId: string,
  params: { override?: WAOverride; sync?: boolean }
): Promise<ActionResult<{ templates: WaTemplateInfo[]; total: number; fetchedAt: string; syncWarning?: string }>> {
  const denied = await guard(orgId);
  if (denied) return { ok: false, error: denied };
  const bad = checkOverride(params.override);
  if (bad) return { ok: false, error: bad };

  try {
    const res = await fetchWhatsAppTemplates({ orgId, override: params.override, sync: params.sync });
    if (!res.ok) return { ok: false, error: res.error };

    // Remember the library so it is still there after a reload. A failure to cache must not fail the fetch.
    const fetchedAt = new Date().toISOString();
    try {
      await saveIntegrationSettings(orgId, { wa_template_cache: { fetchedAt, templates: res.templates } });
    } catch (err) {
      console.error("[integrations] could not cache fetched templates:", err);
    }
    return { ok: true, data: { templates: res.templates, total: res.total, fetchedAt, syncWarning: res.syncWarning } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not fetch templates." };
  }
}

/** Sends the template chosen for an event to a test number using sample values. */
export async function testWhatsAppTemplateAction(
  orgId: string,
  params: { event: WaEventKey; toMobile: string; mapping?: WaTemplateMapping; override?: WAOverride }
): Promise<ActionResult<WATemplateSendTest>> {
  const denied = await guard(orgId);
  if (denied) return { ok: false, error: denied };
  if (!isWaEventKey(params.event)) return { ok: false, error: "Unknown notification event." };
  const bad = checkOverride(params.override);
  if (bad) return { ok: false, error: bad };

  let mapping: WaTemplateMapping | undefined;
  if (params.mapping) {
    const cleaned = sanitizeTemplates({ [params.event]: params.mapping });
    if (typeof cleaned === "string") return { ok: false, error: cleaned };
    mapping = cleaned[params.event];
  }

  try {
    const result = await testWhatsAppTemplateSend({
      orgId,
      event: params.event,
      toMobile: params.toMobile,
      mapping,
      override: params.override,
    });
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Template test failed unexpectedly." };
  }
}

/** Sends a flow's plain-text message (with <<Tags>> filled with sample values) to a test number. */
export async function testWhatsAppMessageAction(
  orgId: string,
  params: { event: WaEventKey; toMobile: string; text?: string; override?: WAOverride }
): Promise<ActionResult<WATemplateSendTest>> {
  const denied = await guard(orgId);
  if (denied) return { ok: false, error: denied };
  if (!isWaEventKey(params.event)) return { ok: false, error: "Unknown notification event." };
  const bad = checkOverride(params.override);
  if (bad) return { ok: false, error: bad };
  if (params.text !== undefined && params.text.length > 4000) return { ok: false, error: "The message is too long (max 4000 characters)." };

  try {
    return {
      ok: true,
      data: await testWhatsAppMessageSend({
        orgId,
        event: params.event,
        toMobile: params.toMobile,
        text: params.text,
        override: params.override,
      }),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Message test failed unexpectedly." };
  }
}
