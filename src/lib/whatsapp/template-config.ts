/**
 * WhatsApp template configuration shared by the admin UI and the server.
 * Pure data + helpers (no Node / server imports) so it can be used in client components.
 *
 * An admin picks an approved template for each notification event and maps each of the template's
 * body variables ({{1}}, {{2}}, ...) to a piece of task data. At send time the values are filled in.
 */

export type WaEventKey = "TASK_ASSIGNED" | "TASK_SUBMITTED" | "TASK_VERIFIED" | "TASK_REMINDER";

export const WA_EVENTS: Array<{ key: WaEventKey; label: string; description: string }> = [
  { key: "TASK_ASSIGNED", label: "Task assigned", description: "Sent to the assignee when a task is delegated to them." },
  { key: "TASK_SUBMITTED", label: "Task submitted for verification", description: "Sent to the assigner when proof of work is submitted." },
  { key: "TASK_VERIFIED", label: "Task verified", description: "Sent to the assignee with the score and remarks." },
  { key: "TASK_REMINDER", label: "Daily reminder / follow-up", description: "Sent to the assignee for tasks due today or overdue." },
];

export type WaDataKey =
  | "task_no"
  | "task_title"
  | "due_date"
  | "assigner_name"
  | "assignee_name"
  | "priority"
  | "task_link"
  | "score"
  | "remarks"
  | "verifier_name"
  | "task_count"
  | "overdue_count";

/**
 * `tag` is the name written between double angle brackets in messages, e.g. <<Task No>>.
 * Tags are matched ignoring case, spaces and punctuation, so <<task no>> and <<Task_No>> work too.
 */
export const WA_DATA_FIELDS: Record<WaDataKey, { label: string; tag: string; sample: string }> = {
  task_no: { label: "Task number", tag: "Task No", sample: "1042" },
  task_title: { label: "Task title", tag: "Task Title", sample: "Prepare Q4 compliance report" },
  due_date: { label: "Due date", tag: "Due Date", sample: "20/11/2026" },
  assigner_name: { label: "Assigner (manager) name", tag: "Assigner Name", sample: "Neha Gupta" },
  assignee_name: { label: "Assignee (employee) name", tag: "Assignee Name", sample: "Rohan Sharma" },
  priority: { label: "Priority", tag: "Priority", sample: "HIGH" },
  task_link: { label: "Task link", tag: "Task Link", sample: "https://example.com/t/abc123" },
  score: { label: "Score awarded (out of 10)", tag: "Score", sample: "9.0" },
  remarks: { label: "Verifier remarks", tag: "Remarks", sample: "Well done, delivered on time" },
  verifier_name: { label: "Verified by", tag: "Verified By", sample: "Neha Gupta" },
  task_count: { label: "Number of tasks (reminder)", tag: "Task Count", sample: "3" },
  overdue_count: { label: "Number overdue (reminder)", tag: "Overdue Count", sample: "1" },
};

/** Which data fields exist for each event (what can be mapped to a template variable). */
export const WA_EVENT_FIELDS: Record<WaEventKey, WaDataKey[]> = {
  TASK_ASSIGNED: ["task_no", "task_title", "due_date", "assigner_name", "assignee_name", "priority", "task_link"],
  TASK_SUBMITTED: ["task_no", "task_title", "assignee_name", "assigner_name", "task_link"],
  TASK_VERIFIED: ["task_no", "task_title", "score", "remarks", "verifier_name", "assignee_name"],
  TASK_REMINDER: ["assignee_name", "task_count", "overdue_count", "task_title", "priority", "task_link"],
};

export interface WaTemplateMapping {
  templateName: string;
  language: string;
  /** Data field for each body variable, in order: variables[0] fills {{1}}, variables[1] fills {{2}}, ... */
  variables: WaDataKey[];
  /** Body text captured when the template was chosen (display only). */
  bodyPreview?: string;
}

export type WaTemplateMappings = Partial<Record<WaEventKey, WaTemplateMapping>>;

export type WaTemplateData = Partial<Record<WaDataKey, string>>;

export function isWaEventKey(v: unknown): v is WaEventKey {
  return typeof v === "string" && WA_EVENTS.some((e) => e.key === v);
}

export function isWaDataKey(v: unknown): v is WaDataKey {
  return typeof v === "string" && v in WA_DATA_FIELDS;
}

/** Unique placeholders in the order they first appear, e.g. "Hi {{1}}, due {{2}}" -> ["1", "2"]. */
export function extractPlaceholders(text: string): string[] {
  const found: string[] = [];
  for (const m of (text || "").matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)) {
    if (!found.includes(m[1])) found.push(m[1]);
  }
  return found;
}

export function sampleDataFor(event: WaEventKey): WaTemplateData {
  const data: WaTemplateData = {};
  for (const k of WA_EVENT_FIELDS[event]) data[k] = WA_DATA_FIELDS[k].sample;
  return data;
}

/** WhatsApp rejects template parameters containing newlines, tabs or 4+ consecutive spaces, and empty values. */
export function cleanTemplateParam(value: string | undefined): string {
  const v = (value ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();
  return v === "" ? "-" : v.slice(0, 1000);
}

/** Resolves a mapping against event data into the ordered list of parameter values. */
export function buildTemplateParams(mapping: WaTemplateMapping, data: WaTemplateData): string[] {
  return mapping.variables.map((k) => cleanTemplateParam(data[k]));
}

/** Custom plain-text message per event, written with <<Tags>>. An empty/missing entry means "use the default". */
export type WaMessageTemplates = Partial<Record<WaEventKey, string>>;

/** The built-in message for each event, expressed with tags (what is sent when nothing is customised). */
export const DEFAULT_MESSAGES: Record<WaEventKey, string> = {
  TASK_ASSIGNED:
    "*New Task Assigned: #<<Task No>>*\n*Title:* <<Task Title>>\n*Due Date:* <<Due Date>>\n*Assigner:* <<Assigner Name>>\n\nUpload proof & update status here: <<Task Link>>",
  TASK_SUBMITTED:
    "*Task #<<Task No>> Awaiting Verification*\n*Assignee:* <<Assignee Name>>\n*Title:* <<Task Title>>\n\nInspect deliverables & verify here: <<Task Link>>",
  TASK_VERIFIED: "*Task #<<Task No>> Verified*\n*Score Awarded:* <<Score>>/10\n*Remarks:* <<Remarks>>",
  TASK_REMINDER: "*Task Reminder: Due Today*\n*Task:* <<Task Title>>\n*Priority:* <<Priority>>\n\nClick to update: <<Task Link>>",
};

// ---- <<Tag>> handling ---------------------------------------------------------------------------

const normalizeTag = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

let tagLookup: Map<string, WaDataKey> | null = null;
function lookup(): Map<string, WaDataKey> {
  if (!tagLookup) {
    tagLookup = new Map();
    for (const key of Object.keys(WA_DATA_FIELDS) as WaDataKey[]) {
      const f = WA_DATA_FIELDS[key];
      for (const alias of [f.tag, key, f.label]) tagLookup.set(normalizeTag(alias), key);
    }
  }
  return tagLookup;
}

/** Finds the data field for a tag name such as "Task No" (case/space/punctuation-insensitive). */
export function findDataKeyByTag(name: string): WaDataKey | undefined {
  return lookup().get(normalizeTag(name));
}

export const tagText = (key: WaDataKey) => `<<${WA_DATA_FIELDS[key].tag}>>`;

/** "<<Task No>>, <<Task Title>>" for ordered variables. */
export function formatTagList(keys: WaDataKey[]): string {
  return keys.map(tagText).join(", ");
}

/**
 * Parses an ordered tag list ("<<Task No>>, <<Task Title>>" - angle brackets optional, comma or newline separated).
 * Tags that do not exist, or are not available for `event`, are returned in `unknown`.
 */
export function parseTagList(text: string, event?: WaEventKey): { keys: WaDataKey[]; unknown: string[] } {
  const keys: WaDataKey[] = [];
  const unknown: string[] = [];
  for (const raw of (text || "").split(/[,\n;]+/)) {
    const name = raw.replace(/^\s*<<\s*|\s*>>\s*$/g, "").trim();
    if (!name) continue;
    const key = findDataKeyByTag(name);
    if (key && (!event || WA_EVENT_FIELDS[event].includes(key))) keys.push(key);
    else unknown.push(name);
  }
  return { keys, unknown };
}

/** Replaces every <<Tag>> in `text` with its value. Unknown tags are left as written. */
export function renderMessageTags(text: string, data: WaTemplateData): string {
  return (text || "").replace(/<<\s*([^<>]+?)\s*>>/g, (whole, name: string) => {
    const key = findDataKeyByTag(name);
    if (!key) return whole;
    const value = data[key];
    return value === undefined || value === "" ? "-" : value;
  });
}

/** Tags written in `text` that do not exist or are not available for `event`. */
export function unknownTagsInMessage(text: string, event: WaEventKey): string[] {
  const bad: string[] = [];
  for (const m of (text || "").matchAll(/<<\s*([^<>]+?)\s*>>/g)) {
    const key = findDataKeyByTag(m[1]);
    if ((!key || !WA_EVENT_FIELDS[event].includes(key)) && !bad.includes(m[1])) bad.push(m[1]);
  }
  return bad;
}

/** Identity of a template: the same name can exist in several languages. */
export const templateKey = (name: string, language: string) => `${name}||${language}`;
