import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EmailProvider } from "@/types/database.types";
import { decryptSecret, encryptSecret } from "./crypto";
import type { WaMessageTemplates, WaTemplateMappings } from "@/lib/whatsapp/template-config";
import type { WaTemplateInfo } from "@/lib/whatsapp/ceoitbox-client";

export interface WaTemplateCache {
  fetchedAt: string;
  templates: WaTemplateInfo[];
}

/**
 * Per-organization integration settings (Email / WhatsApp / Cloudinary).
 *
 * Runs on the SERVER only. Secrets are encrypted at rest and are never sent back to the browser.
 *
 * Persistence:
 *  - "supabase": table `integration_settings` (see supabase/migrations/20261116_integration_settings.sql).
 *    Used when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are real values.
 *  - "memory":   server memory only. Survives page reloads but is lost on server restart / serverless
 *    cold start. Fine for local development; use Supabase in production.
 */
export interface IntegrationSettings {
  email_provider: EmailProvider;

  google_smtp_host: string;
  google_smtp_port: number;
  google_smtp_user: string;
  google_smtp_app_password: string;
  google_sender_name: string;

  ms_smtp_host: string;
  ms_smtp_port: number;
  ms_smtp_user: string;
  ms_smtp_app_password: string;
  ms_sender_name: string;

  wa_meta_phone_id: string;
  wa_meta_token: string;
  /** CEOITBOX official WhatsApp API: base URL, Basic Auth (username + password) OR API key, optional phone ID. */
  wa_gateway_url: string;
  wa_gateway_username: string;
  wa_gateway_password: string;
  wa_gateway_api_key: string;
  wa_gateway_phone_id: string;
  /** Approved template chosen for each notification event (assigned / submitted / verified / reminder). */
  wa_templates: WaTemplateMappings;
  /** Custom plain-text message per event, written with <<Tags>>. Empty = use the built-in message. */
  wa_messages: WaMessageTemplates;
  /** Last templates fetched from CEOITBOX, kept so the Library is still there after a reload. */
  wa_template_cache: WaTemplateCache;
  wa_test_mobile: string;

  cloudinary_cloud_name: string;
  cloudinary_api_key: string;
  cloudinary_api_secret: string;
  cloudinary_upload_preset: string;
}

export const SECRET_FIELDS = [
  "google_smtp_app_password",
  "ms_smtp_app_password",
  "wa_meta_token",
  "wa_gateway_password",
  "wa_gateway_api_key",
  "cloudinary_api_secret",
] as const;

export type SecretField = (typeof SECRET_FIELDS)[number];

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  email_provider: "MICROSOFT_365",
  google_smtp_host: "smtp.gmail.com",
  google_smtp_port: 587,
  google_smtp_user: "",
  google_smtp_app_password: "",
  google_sender_name: "",
  ms_smtp_host: "smtp.office365.com",
  ms_smtp_port: 587,
  ms_smtp_user: "",
  ms_smtp_app_password: "",
  ms_sender_name: "",
  wa_meta_phone_id: "",
  wa_meta_token: "",
  wa_gateway_url: "",
  wa_gateway_username: "",
  wa_gateway_password: "",
  wa_gateway_api_key: "",
  wa_gateway_phone_id: "",
  wa_templates: {},
  wa_messages: {},
  wa_template_cache: { fetchedAt: "", templates: [] },
  wa_test_mobile: "",
  cloudinary_cloud_name: "",
  cloudinary_api_key: "",
  cloudinary_api_secret: "",
  cloudinary_upload_preset: "",
};

export type PersistenceMode = "supabase" | "memory";

const TABLE = "integration_settings";

// ---- backend selection -------------------------------------------------------------------------

function isRealValue(v: string | undefined): v is string {
  return !!v && !/placeholder/i.test(v);
}

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isRealValue(url) || !isRealValue(key) || !/^https?:\/\//i.test(url)) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getPersistenceMode(): PersistenceMode {
  return getSupabaseAdmin() ? "supabase" : "memory";
}

// Keep the in-memory map across Next.js hot reloads / module re-evaluation.
const globalStore = globalThis as unknown as {
  __ctmsIntegrationStore?: Map<string, Record<string, unknown>>;
};
function memoryStore(): Map<string, Record<string, unknown>> {
  if (!globalStore.__ctmsIntegrationStore) globalStore.__ctmsIntegrationStore = new Map();
  return globalStore.__ctmsIntegrationStore;
}

// ---- raw (encrypted) read / write --------------------------------------------------------------

async function readRaw(orgId: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("settings")
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) {
      console.error(`[integrations] Supabase read failed: ${error.message}`);
      return memoryStore().get(orgId) ?? null;
    }
    return (data?.settings as Record<string, unknown> | undefined) ?? null;
  }
  return memoryStore().get(orgId) ?? null;
}

async function writeRaw(orgId: string, raw: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ org_id: orgId, settings: raw, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
    if (error) {
      throw new Error(
        `Could not save to the database: ${error.message}. ` +
          `Make sure the migration supabase/migrations/20261116_integration_settings.sql has been run.`
      );
    }
    return;
  }
  memoryStore().set(orgId, raw);
}

// ---- public API --------------------------------------------------------------------------------

/** Decrypted settings for server-side use (sending mail, WhatsApp...). Never return this to the client. */
export async function getIntegrationSettings(orgId: string): Promise<IntegrationSettings> {
  const raw = (await readRaw(orgId)) ?? {};
  const merged = { ...DEFAULT_INTEGRATION_SETTINGS } as Record<string, unknown>;
  for (const [k, v] of Object.entries(raw)) {
    if (k in DEFAULT_INTEGRATION_SETTINGS && v !== undefined && v !== null) merged[k] = v;
  }
  for (const f of SECRET_FIELDS) merged[f] = decryptSecret(merged[f] as string);
  // never share the default objects between callers
  merged.wa_templates = { ...((merged.wa_templates as WaTemplateMappings | undefined) ?? {}) };
  merged.wa_messages = { ...((merged.wa_messages as WaMessageTemplates | undefined) ?? {}) };
  const cache = merged.wa_template_cache as WaTemplateCache | undefined;
  merged.wa_template_cache = { fetchedAt: cache?.fetchedAt ?? "", templates: [...(cache?.templates ?? [])] };
  return merged as unknown as IntegrationSettings;
}

export interface SaveOptions {
  /** Secret fields to wipe explicitly. A blank secret in `patch` means "keep the stored value". */
  clearSecrets?: SecretField[];
}

export async function saveIntegrationSettings(
  orgId: string,
  patch: Partial<IntegrationSettings>,
  options: SaveOptions = {}
): Promise<IntegrationSettings> {
  const current = (await readRaw(orgId)) ?? {};
  const next: Record<string, unknown> = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_INTEGRATION_SETTINGS) || value === undefined) continue;
    if ((SECRET_FIELDS as readonly string[]).includes(key)) {
      const secret = String(value);
      if (secret.trim() !== "") next[key] = encryptSecret(secret.trim());
      continue; // blank = keep existing
    }
    next[key] = typeof value === "string" ? value.trim() : value;
  }
  for (const f of options.clearSecrets ?? []) next[f] = "";

  await writeRaw(orgId, next);
  return getIntegrationSettings(orgId);
}
