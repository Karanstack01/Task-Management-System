// Shared helpers for the Supabase setup / check scripts. No dependencies.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Loads KEY=VALUE pairs from .env.local then .env into process.env (real environment variables win). */
export function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

/** True for empty values and the placeholders that ship in the example env files. */
export function isPlaceholder(value) {
  return !value || /placeholder|your[-_ ]|\[your|<[^>]+>|^xxx/i.test(value);
}

/** Reads the claims of a JWT without verifying it (only used to sanity-check which key is which). */
export function decodeJwt(token) {
  try {
    const part = token.split(".")[1];
    return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/** "anon" | "service_role" | null, for both the classic JWT keys and the newer sb_publishable_ / sb_secret_ keys. */
export function keyRole(key) {
  if (!key) return null;
  if (key.startsWith("sb_publishable_")) return "anon";
  if (key.startsWith("sb_secret_")) return "service_role";
  return decodeJwt(key)?.role ?? null;
}

/** The project ref a key belongs to (JWT keys only; the newer key format does not embed it). */
export function keyProjectRef(key) {
  return key && !key.startsWith("sb_") ? decodeJwt(key)?.ref ?? null : null;
}

export function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([a-z0-9]{15,25})\.supabase\.(co|in)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Project ref from a Postgres URL: pooler users look like postgres.<ref>, direct hosts like db.<ref>.supabase.co */
export function projectRefFromDbUrl(dbUrl) {
  try {
    const u = new URL(dbUrl);
    const user = decodeURIComponent(u.username);
    if (user.includes(".")) return user.split(".")[1];
    const m = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Safe description of a database URL (never includes the password). */
export function describeDbUrl(dbUrl) {
  try {
    const u = new URL(dbUrl);
    return `${decodeURIComponent(u.username)}@${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return "(unparseable URL)";
  }
}

export const isLocalHost = (host) => ["localhost", "127.0.0.1", "::1"].includes(host);

export const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
