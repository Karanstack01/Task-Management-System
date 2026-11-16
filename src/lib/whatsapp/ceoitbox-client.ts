/**
 * Client for the CEOITBOX official WhatsApp Business API (https://official.ceoitbox.com).
 *
 * Auth (one of):  Basic Auth (username + password)  |  x-api-key header.
 * Optional:       x-phone-id header, required only when the account has several WhatsApp numbers.
 *
 * CONFIRMED from the API documentation:
 *   POST /api/v1/whatsapp/sendMessage                  -> 200 {id, waMessageId} | 200 {error} | 400 Meta error | 401
 *   POST /api/v1/messageTemplate/getTemplates          -> 200 {results:[{id, template:{...}}], total}
 *   GET  /api/v1/messageTemplate/syncTemplatesFromMeta -> 200 (empty body)
 *
 * NOT confirmed (the documentation's schemas were truncated) - isolated in buildTextBody() and
 * buildTemplateBody() so they are easy to correct:
 *   - TextMessage.text is sent as a plain string
 *   - TemplateMessage.templateVariables is sent as an ordered array of strings
 * A wrong shape is rejected by the API with HTTP 400 *before* anything is sent, and the message shown to the
 * admin includes the API's own explanation.
 */
import { extractPlaceholders } from "./template-config";

export const DEFAULT_CEOITBOX_URL = "https://official.ceoitbox.com";
export const WA_TIMEOUT_MS = 15_000;

export interface CeoitboxConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
  phoneId?: string;
}

/** Readable reason for a failed fetch (Node hides the real cause inside err.cause). */
export function describeNetworkError(err: unknown): string {
  if (!(err instanceof Error)) return "network error";
  const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
  const detail = cause?.code || cause?.message;
  if (err.name === "TimeoutError" || err.name === "AbortError") return `timed out after ${WA_TIMEOUT_MS / 1000}s`;
  return detail ? `${err.message} (${detail})` : err.message;
}

export function hasCeoitboxCredentials(cfg: Pick<CeoitboxConfig, "username" | "password" | "apiKey">): boolean {
  return !!cfg.apiKey || (!!cfg.username && !!cfg.password);
}

function buildHeaders(cfg: CeoitboxConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cfg.apiKey) {
    headers["x-api-key"] = cfg.apiKey;
  } else if (cfg.username && cfg.password) {
    headers.Authorization = "Basic " + Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  }
  if (cfg.phoneId) headers["x-phone-id"] = cfg.phoneId;
  return headers;
}

interface RawResponse {
  status: number;
  json: Record<string, unknown> | null;
  text: string;
}

async function call(cfg: CeoitboxConfig, method: "GET" | "POST", path: string, body?: unknown): Promise<RawResponse> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/+$/, "")}${path}`, {
    method,
    headers: buildHeaders(cfg),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(WA_TIMEOUT_MS),
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") json = parsed as Record<string, unknown>;
  } catch {
    /* empty or non-JSON body */
  }
  return { status: res.status, json, text };
}

/** Turns the API's problem+json / Meta error bodies into one actionable sentence. */
function explainFailure(r: RawResponse): string {
  const j = r.json;
  if (r.status === 401) {
    return "CEOITBOX rejected the credentials (401). Check the username/password or API key.";
  }
  if (r.status === 403) {
    return "CEOITBOX denied access (403). The account may not have API access enabled.";
  }
  const err = (j?.error ?? null) as { message?: string; error_data?: { details?: string } } | null;
  const parts = [
    typeof j?.detail === "string" ? j.detail : "",
    err?.error_data?.details || "",
    err?.message && err.message !== j?.detail ? err.message : "",
  ].filter(Boolean);
  if (r.status === 400 && /failed to read request/i.test(String(j?.detail ?? ""))) {
    return "CEOITBOX could not read the request body (400 \"Failed to read request\"). The message format is not what the API expects - nothing was sent.";
  }
  if (parts.length) return `${r.status === 400 ? "Rejected by WhatsApp" : `CEOITBOX error ${r.status}`}: ${parts.join(" - ")}`;
  return `CEOITBOX error ${r.status}${r.text ? `: ${r.text.slice(0, 200)}` : ""}`;
}

// ---------------------------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------------------------

export interface WaTemplateInfo {
  id?: string;
  name: string;
  language: string;
  status: string;
  category: string;
  bodyText: string;
  /** Body placeholders in order of appearance, e.g. ["1", "2"]. */
  placeholders: string[];
  headerFormat?: string;
  /** Header text when the header is plain text (for previews). */
  headerText?: string;
  footerText?: string;
  buttons: Array<{ type: string; text: string }>;
  hasButtons: boolean;
  /** Example values supplied when the template was created, in placeholder order (for previews). */
  bodyExamples: string[];
  /** True when this app can send it automatically (approved, no media header, positional variables). */
  supported: boolean;
  unsupportedReason?: string;
}

type Json = Record<string, unknown>;

export function normalizeTemplate(row: Json): WaTemplateInfo | null {
  const t = ((row.template as Json | undefined) ?? row) as Json;
  const name = String(t.name ?? t.templateName ?? "").trim();
  if (!name) return null;

  const components = Array.isArray(t.components) ? (t.components as Json[]) : [];
  const byType = (type: string) => components.find((c) => String(c.type ?? "").toUpperCase() === type);
  const body = byType("BODY");
  const header = byType("HEADER");
  const buttons = byType("BUTTONS");
  const footer = byType("FOOTER");

  const buttonList = (Array.isArray(buttons?.buttons) ? (buttons!.buttons as Json[]) : []).map((b) => ({
    type: String(b.type ?? ""),
    text: String(b.text ?? ""),
  }));
  const exampleRows = (body?.example as Json | undefined)?.body_text;
  const bodyExamples = Array.isArray(exampleRows) && Array.isArray(exampleRows[0]) ? (exampleRows[0] as unknown[]).map(String) : [];

  const bodyText = String(body?.text ?? t.body ?? "");
  const placeholders = extractPlaceholders(bodyText);
  const headerFormat = header ? String(header.format ?? "TEXT").toUpperCase() : undefined;
  const status = String(t.status ?? "UNKNOWN").toUpperCase();

  let unsupportedReason: string | undefined;
  if (status !== "APPROVED") unsupportedReason = `Not approved (status: ${status})`;
  else if (!bodyText) unsupportedReason = "Template has no body text";
  else if (headerFormat && ["IMAGE", "VIDEO", "DOCUMENT", "LOCATION"].includes(headerFormat)) {
    unsupportedReason = `Needs a ${headerFormat.toLowerCase()} header, which automatic alerts cannot supply`;
  } else if (headerFormat === "TEXT" && extractPlaceholders(String(header?.text ?? "")).length > 0) {
    unsupportedReason = "Header contains variables";
  } else if (placeholders.some((p) => !/^\d+$/.test(p))) {
    unsupportedReason = "Uses named variables (only numbered {{1}}, {{2}} are supported)";
  }

  return {
    id: row.id ? String(row.id) : undefined,
    name,
    language: String(t.language ?? t.lang ?? "en"),
    status,
    category: String(t.category ?? ""),
    bodyText,
    placeholders,
    headerFormat,
    headerText: headerFormat === "TEXT" ? String(header?.text ?? "") || undefined : undefined,
    footerText: footer ? String(footer.text ?? "") || undefined : undefined,
    buttons: buttonList,
    hasButtons: !!buttons,
    bodyExamples,
    supported: !unsupportedReason,
    unsupportedReason,
  };
}

export type TemplateListResult =
  | { ok: true; templates: WaTemplateInfo[]; total: number }
  | { ok: false; error: string };

/** Fetches every template (paged) from CEOITBOX. A successful call also proves the credentials work. */
export async function listTemplates(cfg: CeoitboxConfig, opts: { pageSize?: number; maxPages?: number } = {}): Promise<TemplateListResult> {
  const pageSize = opts.pageSize ?? 100;
  const maxPages = opts.maxPages ?? 10;
  const templates: WaTemplateInfo[] = [];
  let total = 0;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const r = await call(cfg, "POST", "/api/v1/messageTemplate/getTemplates", {
        pagination: { current: page, pageSize },
        order: [{ fieldName: "creationTime", dir: "desc" }],
        search: [],
      });
      if (r.status !== 200) return { ok: false, error: explainFailure(r) };

      const results = Array.isArray(r.json?.results) ? (r.json!.results as Json[]) : [];
      total = Number(r.json?.total ?? (r.json?.metadata as Json | undefined)?.totalRecords ?? total) || total;
      for (const row of results) {
        const info = normalizeTemplate(row);
        if (info) templates.push(info);
      }
      if (results.length < pageSize || (total && page * pageSize >= total)) break;
    }
    return { ok: true, templates, total: total || templates.length };
  } catch (err) {
    return { ok: false, error: `Could not reach CEOITBOX (${cfg.baseUrl}): ${describeNetworkError(err)}` };
  }
}

/** Asks CEOITBOX to re-import the latest templates from Meta WhatsApp Manager. */
export async function syncTemplatesFromMeta(cfg: CeoitboxConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await call(cfg, "GET", "/api/v1/messageTemplate/syncTemplatesFromMeta");
    return r.status === 200 ? { ok: true } : { ok: false, error: explainFailure(r) };
  } catch (err) {
    return { ok: false, error: `Could not reach CEOITBOX (${cfg.baseUrl}): ${describeNetworkError(err)}` };
  }
}

// ---------------------------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------------------------

export interface CeoitboxSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** UNCONFIRMED shape: `text` as a plain string. */
function buildTextBody(to: string, text: string, userMessageId?: string) {
  return { to, text, ...(userMessageId ? { userMessageId } : {}) };
}

/** UNCONFIRMED shape: `templateVariables` as an ordered array of strings. */
function buildTemplateBody(to: string, templateName: string, language: string, variables: string[]) {
  return { templateName, language, to, ...(variables.length ? { templateVariables: variables } : {}) };
}

/** HTTP 200 can still carry an `error` (empty wallet, opted-out receiver) - that is a failure, not a success. */
function interpretSend(r: RawResponse): CeoitboxSendResult {
  const j = r.json;
  if (r.status === 200 && j && !j.error) {
    return { ok: true, messageId: String(j.waMessageId ?? j.id ?? `ceoitbox-${Date.now()}`) };
  }
  if (r.status === 200 && j?.error) {
    const e = j.error as { title?: string; message?: string; details?: string };
    const reason = [e.title, e.message, e.details].filter(Boolean).join(" - ") || "message blocked before reaching WhatsApp";
    return { ok: false, error: `CEOITBOX did not send the message: ${reason}` };
  }
  if (r.status === 200) return { ok: true, messageId: `ceoitbox-${Date.now()}` };
  return { ok: false, error: explainFailure(r) };
}

async function post(cfg: CeoitboxConfig, body: unknown): Promise<CeoitboxSendResult> {
  try {
    return interpretSend(await call(cfg, "POST", "/api/v1/whatsapp/sendMessage", body));
  } catch (err) {
    return { ok: false, error: `Could not reach CEOITBOX (${cfg.baseUrl}): ${describeNetworkError(err)}` };
  }
}

export function sendTextMessage(cfg: CeoitboxConfig, to: string, text: string, userMessageId?: string) {
  return post(cfg, buildTextBody(to, text, userMessageId));
}

export function sendTemplateMessage(cfg: CeoitboxConfig, to: string, templateName: string, language: string, variables: string[]) {
  return post(cfg, buildTemplateBody(to, templateName, language, variables));
}
