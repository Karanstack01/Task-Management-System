import type { EmailProvider } from "@/types/database.types";
import { getIntegrationSettings } from "./settings-store";
import type { WaMessageTemplates, WaTemplateMappings } from "@/lib/whatsapp/template-config";

/**
 * Resolves the effective credentials for an organization.
 * Precedence: settings saved in the admin console  >  environment variables  >  built-in defaults.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  senderName?: string;
  provider?: EmailProvider;
}

export type ConfigSource = "saved" | "env" | "none";

export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || /placeholder/i.test(value);
}

/** A credential counts as "real" only if it is non-empty and not a placeholder. */
export function hasRealValue(value: string | null | undefined): value is string {
  return !!value && value.trim() !== "" && !isPlaceholder(value);
}

function clean(value: string | null | undefined): string {
  return hasRealValue(value) ? value.trim() : "";
}

// ---- Email -------------------------------------------------------------------------------------

export function getEnvSmtpConfig(provider: EmailProvider): SmtpConfig {
  if (provider === "GOOGLE") {
    return {
      host: process.env.GOOGLE_SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.GOOGLE_SMTP_PORT) || 587,
      user: clean(process.env.GOOGLE_SMTP_USER),
      pass: clean(process.env.GOOGLE_APP_PASSWORD),
      senderName: process.env.GOOGLE_SENDER_NAME || "StackDrove CTMS",
      provider,
    };
  }
  return {
    host: process.env.MICROSOFT_SMTP_HOST || "smtp.office365.com",
    port: Number(process.env.MICROSOFT_SMTP_PORT) || 587,
    user: clean(process.env.MICROSOFT_SMTP_USER),
    pass: clean(process.env.MICROSOFT_APP_PASSWORD),
    senderName: process.env.MICROSOFT_SENDER_NAME || "StackDrove CTMS",
    provider,
  };
}

export async function resolveActiveEmailProvider(orgId?: string): Promise<EmailProvider> {
  if (!orgId) return "MICROSOFT_365";
  const s = await getIntegrationSettings(orgId);
  return s.email_provider === "GOOGLE" ? "GOOGLE" : "MICROSOFT_365";
}

export async function resolveEmailConfig(
  orgId: string | undefined,
  provider: EmailProvider
): Promise<{ config: SmtpConfig; source: ConfigSource }> {
  const env = getEnvSmtpConfig(provider);
  if (!orgId) {
    return { config: env, source: env.user && env.pass ? "env" : "none" };
  }

  const s = await getIntegrationSettings(orgId);
  const g = provider === "GOOGLE";
  const savedUser = clean(g ? s.google_smtp_user : s.ms_smtp_user);
  const savedPass = clean(g ? s.google_smtp_app_password : s.ms_smtp_app_password);

  const config: SmtpConfig = {
    host: (g ? s.google_smtp_host : s.ms_smtp_host) || env.host,
    port: (g ? s.google_smtp_port : s.ms_smtp_port) || env.port,
    user: savedUser || env.user,
    pass: savedPass || env.pass,
    senderName: (g ? s.google_sender_name : s.ms_sender_name) || env.senderName,
    provider,
  };

  const source: ConfigSource =
    savedUser && savedPass ? "saved" : config.user && config.pass ? "env" : "none";
  return { config, source };
}

// ---- WhatsApp ----------------------------------------------------------------------------------

export interface MetaWaConfig {
  phoneId: string;
  token: string;
}
export interface GatewayWaConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
  phoneId?: string;
}
export interface ResolvedWhatsApp {
  meta: (MetaWaConfig & { source: ConfigSource }) | null;
  /** CEOITBOX official WhatsApp API (official.ceoitbox.com). */
  gateway: (GatewayWaConfig & { source: ConfigSource }) | null;
  /** Approved templates the admin mapped to each notification event (saved settings only). */
  templates: WaTemplateMappings;
  /** Custom plain-text message per event (saved settings only). */
  messages: WaMessageTemplates;
}

const DEFAULT_GATEWAY_URL = "https://official.ceoitbox.com";

/** The first version of this app pointed at app.ceoitbox.com, which is not the official API host - ignore it. */
function normalizeGatewayUrl(value: string | undefined): string {
  const v = clean(value);
  if (!v || /^https?:\/\/app\.ceoitbox\.com/i.test(v)) return DEFAULT_GATEWAY_URL;
  return v.replace(/\/+$/, "");
}

export async function resolveWhatsAppConfig(orgId?: string): Promise<ResolvedWhatsApp> {
  const saved = orgId ? await getIntegrationSettings(orgId) : null;

  const savedPhoneId = clean(saved?.wa_meta_phone_id);
  const savedToken = clean(saved?.wa_meta_token);
  const envPhoneId = clean(process.env.META_WA_PHONE_ID);
  const envToken = clean(process.env.META_WA_OFFICIAL_TOKEN);

  const phoneId = savedPhoneId || envPhoneId;
  const token = savedToken || envToken;
  const meta =
    phoneId && token
      ? { phoneId, token, source: (savedPhoneId && savedToken ? "saved" : "env") as ConfigSource }
      : null;

  const savedUser = clean(saved?.wa_gateway_username);
  const savedPass = clean(saved?.wa_gateway_password);
  const savedKey = clean(saved?.wa_gateway_api_key);
  const envUser = clean(process.env.CEOITBOX_WA_USERNAME);
  const envPass = clean(process.env.CEOITBOX_WA_PASSWORD);
  const envKey = clean(process.env.CEOITBOX_WA_API_KEY);

  // Saved credentials win as a whole (never mix a saved username with an env password).
  const savedHasAuth = !!savedKey || (!!savedUser && !!savedPass);
  const auth = savedHasAuth
    ? { apiKey: savedKey, username: savedUser, password: savedPass }
    : { apiKey: envKey, username: envUser, password: envPass };
  const hasAuth = !!auth.apiKey || (!!auth.username && !!auth.password);

  const gateway = hasAuth
    ? {
        baseUrl: normalizeGatewayUrl(clean(saved?.wa_gateway_url) || process.env.CEOITBOX_GATEWAY_URL),
        apiKey: auth.apiKey || undefined,
        username: auth.apiKey ? undefined : auth.username || undefined,
        password: auth.apiKey ? undefined : auth.password || undefined,
        phoneId: clean(saved?.wa_gateway_phone_id) || clean(process.env.CEOITBOX_WA_PHONE_ID) || undefined,
        source: (savedHasAuth ? "saved" : "env") as ConfigSource,
      }
    : null;

  return { meta, gateway, templates: saved?.wa_templates ?? {}, messages: saved?.wa_messages ?? {} };
}

/** Normalizes a phone number to digits only; bare 10-digit numbers get the default country code. */
export function normalizeMobile(raw: string): string {
  const digits = (raw || "").replace(/[^0-9]/g, "");
  const cc = (process.env.WA_DEFAULT_COUNTRY_CODE || "91").replace(/[^0-9]/g, "");
  return digits.length === 10 ? `${cc}${digits}` : digits;
}

// ---- Cloudinary --------------------------------------------------------------------------------

export interface ResolvedCloudinary {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
}

/** Only non-empty saved fields are returned, so the Cloudinary service falls back to env vars for the rest. */
export async function resolveCloudinaryConfig(orgId?: string): Promise<ResolvedCloudinary | undefined> {
  if (!orgId) return undefined;
  const s = await getIntegrationSettings(orgId);
  const cfg: ResolvedCloudinary = {
    cloudName: clean(s.cloudinary_cloud_name) || undefined,
    apiKey: clean(s.cloudinary_api_key) || undefined,
    apiSecret: clean(s.cloudinary_api_secret) || undefined,
    uploadPreset: clean(s.cloudinary_upload_preset) || undefined,
  };
  return cfg.cloudName || cfg.apiKey || cfg.apiSecret ? cfg : undefined;
}
