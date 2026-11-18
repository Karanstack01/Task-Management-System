#!/usr/bin/env node
// Verifies the Supabase connection end to end and catches the classic setup mistakes.
//   npm run db:check
// Exit code is 1 if anything failed, so it can also run in CI.
import { readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import {
  ROOT,
  c,
  describeDbUrl,
  isLocalHost,
  isPlaceholder,
  keyProjectRef,
  keyRole,
  loadEnv,
  projectRefFromDbUrl,
  projectRefFromUrl,
} from "./lib/supabase-env.mjs";

loadEnv();

const results = [];
const add = (status, name, detail = "", fix = "") => results.push({ status, name, detail, fix });
const pass = (n, d) => add("pass", n, d);
const fail = (n, d, f) => add("fail", n, d, f);
const warn = (n, d, f) => add("warn", n, d, f);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;
const encKey = process.env.INTEGRATION_ENCRYPTION_KEY;

const timeout = () => AbortSignal.timeout(15000);
async function rest(pathname, { key, method = "GET", body, headers = {} } = {}) {
  // Classic keys are JWTs and go in both headers. The newer sb_publishable_ / sb_secret_ keys are not JWTs: apikey only.
  const auth = key?.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` };
  const res = await fetch(`${url}${pathname}`, {
    method,
    headers: { apikey: key, ...auth, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: timeout(),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: res.status, json, text };
}

// ---- 1. configuration sanity (no network) ---------------------------------------------------------
const urlRef = isPlaceholder(url) ? null : projectRefFromUrl(url);
if (isPlaceholder(url)) fail("Project URL", "NEXT_PUBLIC_SUPABASE_URL is missing or a placeholder", "Dashboard -> Project Settings -> API -> Project URL");
else if (!urlRef) fail("Project URL", `"${url}" is not a Supabase project URL`, "It looks like https://<project-ref>.supabase.co");
else pass("Project URL", `${urlRef}.supabase.co`);

const anonRole = isPlaceholder(anonKey) ? null : keyRole(anonKey);
if (isPlaceholder(anonKey)) fail("Anon (public) key", "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or a placeholder", "Dashboard -> Project Settings -> API Keys -> anon / publishable");
else if (anonRole === "service_role") fail("Anon (public) key", "This is the SERVICE ROLE key. It is in a NEXT_PUBLIC_ variable, so it would be shipped to every browser.", "Put the 'anon' / publishable key here and keep the service key only in SUPABASE_SERVICE_ROLE_KEY. Then rotate the service key in the dashboard.");
else if (anonRole !== "anon") fail("Anon (public) key", "Not a recognisable Supabase key", "Copy it again from Project Settings -> API Keys");
else pass("Anon (public) key", "role: anon");

const serviceRole = isPlaceholder(serviceKey) ? null : keyRole(serviceKey);
if (isPlaceholder(serviceKey)) fail("Service role key", "SUPABASE_SERVICE_ROLE_KEY is missing or a placeholder", "Dashboard -> Project Settings -> API Keys -> service_role / secret (keep it private)");
else if (serviceRole === "anon") fail("Service role key", "This is the public anon key, not the service role key", "Copy the service_role / secret key instead");
else if (serviceRole !== "service_role") fail("Service role key", "Not a recognisable Supabase key", "Copy it again from Project Settings -> API Keys");
else pass("Service role key", "role: service_role (server-only)");

const refs = new Set(
  [urlRef, keyProjectRef(anonKey), keyProjectRef(serviceKey), isPlaceholder(dbUrl) ? null : projectRefFromDbUrl(dbUrl)].filter(Boolean)
);
if (refs.size > 1) fail("Same project everywhere", `Values come from different projects: ${[...refs].join(", ")}`, "URL, keys and database URL must all come from the SAME Supabase project");
else if (refs.size === 1) pass("Same project everywhere", `all values belong to ${[...refs][0]}`);

if (isPlaceholder(encKey)) warn("Encryption key", "INTEGRATION_ENCRYPTION_KEY is not set - saved passwords fall back to a weaker derived key", "Set a long random value, and use the SAME one in Vercel");
else if (String(encKey).length < 24) warn("Encryption key", "INTEGRATION_ENCRYPTION_KEY is short", "Use at least 32 random characters");
else pass("Encryption key", "set");

// ---- 2. database (direct Postgres connection) ------------------------------------------------------
if (isPlaceholder(dbUrl)) {
  warn("Database connection", "SUPABASE_DB_URL is not set, so migrations and security cannot be verified", "Dashboard -> Connect -> Session pooler -> put the string in .env.local");
} else {
  let host = "";
  try {
    host = new URL(dbUrl).hostname;
  } catch {
    /* handled below */
  }
  if (!host) {
    fail("Database connection", "SUPABASE_DB_URL is not a valid URL", "URL-encode special characters in the password (@ becomes %40)");
  } else {
    const client = new pg.Client({ connectionString: dbUrl, ssl: isLocalHost(host) ? false : { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    try {
      await client.connect();
      pass("Database connection", describeDbUrl(dbUrl));

      const files = readdirSync(path.join(ROOT, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
      let applied = new Set();
      try {
        applied = new Set((await client.query("select version from supabase_migrations.schema_migrations")).rows.map((r) => r.version));
      } catch {
        /* table not created yet */
      }
      const pending = files.filter((f) => !applied.has(f.match(/^(\d+)_/)[1]));
      if (pending.length) fail("Migrations", `${pending.length} of ${files.length} not applied yet (e.g. ${pending[0]})`, "Run: npm run db:setup");
      else pass("Migrations", `all ${files.length} applied`);

      const noRls = (await client.query("select tablename from pg_tables where schemaname = 'public' and not rowsecurity order by 1")).rows.map((r) => r.tablename);
      if (noRls.length) fail("Row-level security", `OFF on: ${noRls.join(", ")} - these are readable with the public key`, "Run: npm run db:setup (the security migration enables it)");
      else pass("Row-level security", "enabled on every table in public");

      const anonGrants = (await client.query("select distinct table_name from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon' order by 1")).rows.map((r) => r.table_name);
      if (anonGrants.length) fail("Anonymous access", `The anon role still has privileges on: ${anonGrants.join(", ")}`, "Run: npm run db:setup");
      else pass("Anonymous access", "the public anon role has no privileges on your tables");
    } catch (e) {
      fail("Database connection", e.message, "Re-copy the Session pooler string from the dashboard and check the password");
    } finally {
      await client.end().catch(() => {});
    }
  }
}

// ---- 3. REST API as the server (service role) and as a visitor (anon) -------------------------------
if (urlRef && serviceRole === "service_role") {
  try {
    const r = await rest("/rest/v1/integration_settings?select=org_id&limit=1", { key: serviceKey });
    if (r.status === 200) pass("Server access (service role)", "can read the database through the API");
    else if (r.status === 404 || r.json?.code === "PGRST205") fail("Server access (service role)", "the integration_settings table does not exist yet", "Run: npm run db:setup");
    else if (r.status === 401 || r.status === 403) fail("Server access (service role)", "the service role key was rejected", "Copy the service_role key again - make sure it belongs to this project");
    else fail("Server access (service role)", `unexpected response ${r.status}: ${r.text.slice(0, 120)}`);

    if (r.status === 200) {
      const id = "__healthcheck__";
      const w = await rest("/rest/v1/integration_settings?on_conflict=org_id", { key: serviceKey, method: "POST", body: { org_id: id, settings: { ok: true } }, headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
      const g = await rest(`/rest/v1/integration_settings?org_id=eq.${id}&select=settings`, { key: serviceKey });
      await rest(`/rest/v1/integration_settings?org_id=eq.${id}`, { key: serviceKey, method: "DELETE" });
      if ((w.status === 201 || w.status === 200 || w.status === 204) && g.json?.[0]?.settings?.ok === true) pass("Saved settings round-trip", "wrote, read back and removed a test row");
      else fail("Saved settings round-trip", `write ${w.status}, read ${g.status}`, "Check the integration_settings table and the service role key");
    }
  } catch (e) {
    fail("Server access (service role)", `could not reach ${url}: ${e.message}`, "Check the URL and your internet connection");
  }
}

if (urlRef && anonRole === "anon") {
  try {
    const probes = ["tasks", "notification_logs", "profiles", "integration_settings"];
    const leaks = [];
    for (const t of probes) {
      const r = await rest(`/rest/v1/${t}?select=*&limit=1`, { key: anonKey });
      if (r.status === 200 && Array.isArray(r.json) && r.json.length > 0) leaks.push(`${t} (rows returned!)`);
      else if (r.status === 200) leaks.push(`${t} (query allowed, rows hidden by RLS only)`);
    }
    if (leaks.length) fail("Public key cannot read data", `anon can query: ${leaks.join(", ")}`, "Run: npm run db:setup (the security migration revokes anonymous access)");
    else pass("Public key cannot read data", "anonymous requests to your tables are refused");

    const a = await rest("/auth/v1/settings", { key: anonKey });
    if (a.status === 200) {
      const ext = a.json?.external ?? {};
      const providers = Object.entries(ext).filter(([k, v]) => v === true && k !== "email" && k !== "phone").map(([k]) => k);
      pass("Auth service", `reachable; email sign-in ${ext.email ? "on" : "off"}${a.json?.disable_signup ? ", public sign-ups disabled" : ", public sign-ups enabled"}${providers.length ? `, providers: ${providers.join(", ")}` : ""}`);
      if (!a.json?.disable_signup) warn("Public sign-ups", "Anyone can create an account in this project", "For an internal enterprise tool: Authentication -> Sign In / Providers -> turn OFF 'Allow new users to sign up', and invite users instead");
    } else {
      warn("Auth service", `unexpected response ${a.status}`);
    }
  } catch (e) {
    fail("Public key checks", e.message);
  }
}

// ---- report ---------------------------------------------------------------------------------------
console.log(c.bold("\nSupabase health check\n"));
const icon = { pass: c.green("✓"), fail: c.red("✗"), warn: c.yellow("!") };
for (const r of results) {
  console.log(`  ${icon[r.status]} ${r.name}${r.detail ? c.dim(` — ${r.detail}`) : ""}`);
  if (r.fix && r.status !== "pass") console.log(`      ${c.yellow("fix:")} ${r.fix}`);
}
const nFail = results.filter((r) => r.status === "fail").length;
const nWarn = results.filter((r) => r.status === "warn").length;
console.log(
  `\n  ${results.filter((r) => r.status === "pass").length} passed, ${nFail ? c.red(nFail + " failed") : "0 failed"}${nWarn ? `, ${c.yellow(nWarn + " warning(s)")}` : ""}\n`
);
process.exit(nFail ? 1 : 0);
