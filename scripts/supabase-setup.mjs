#!/usr/bin/env node
// Applies the SQL files in supabase/migrations to your Supabase database, in order, once each.
//
//   npm run db:setup            apply every pending migration
//   npm run db:status           show which are applied / pending (changes nothing)
//   node scripts/supabase-setup.mjs --dry   same as status
//
// Needs SUPABASE_DB_URL in .env.local (Supabase dashboard -> Connect -> "Session pooler" connection string).
// Applied migrations are recorded in supabase_migrations.schema_migrations - the same table the official
// Supabase CLI uses - so switching to the CLI later will not re-run anything.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { ROOT, c, describeDbUrl, isLocalHost, isPlaceholder, loadEnv } from "./lib/supabase-env.mjs";

loadEnv();
const statusOnly = process.argv.includes("--status") || process.argv.includes("--dry");
const dbUrl = process.env.SUPABASE_DB_URL;

function die(msg) {
  console.error(c.red(`\n✗ ${msg}\n`));
  process.exit(1);
}

if (isPlaceholder(dbUrl)) {
  die(
    "SUPABASE_DB_URL is not set in .env.local.\n  Supabase dashboard -> your project -> Connect -> 'Session pooler' -> copy the connection string,\n  put your database password in place of [YOUR-PASSWORD], and save it as SUPABASE_DB_URL=... in .env.local"
  );
}

let host;
try {
  host = new URL(dbUrl).hostname;
} catch {
  die("SUPABASE_DB_URL is not a valid URL. If your password contains characters like @ : / # ? %, URL-encode them (e.g. @ becomes %40).");
}

const dir = path.join(ROOT, "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const migrations = files.map((f) => {
  const m = f.match(/^(\d+)_(.+)\.sql$/);
  return { file: f, version: m?.[1], name: m?.[2] };
});

const bad = migrations.filter((m) => !m.version);
if (bad.length) die(`Migration files must be named <version>_<name>.sql: ${bad.map((b) => b.file).join(", ")}`);
const seen = new Map();
for (const m of migrations) {
  if (seen.has(m.version)) die(`Two migrations share the version ${m.version} (${seen.get(m.version)} and ${m.file}). Give each a unique version so the order is unambiguous.`);
  seen.set(m.version, m.file);
}

const client = new pg.Client({
  connectionString: dbUrl,
  // Supabase requires TLS. Local test databases do not use it.
  ssl: isLocalHost(host) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

console.log(c.bold("\nSupabase database setup"));
console.log(c.dim(`  target: ${describeDbUrl(dbUrl)}`));

try {
  await client.connect();
} catch (e) {
  const hint = /password authentication failed/i.test(e.message)
    ? "The database password is wrong. Reset it under Project Settings -> Database, then update SUPABASE_DB_URL."
    : /ENOTFOUND|getaddrinfo/i.test(e.message)
    ? "The host could not be found. Copy the connection string again from the dashboard (Connect button)."
    : /ETIMEDOUT|ECONNREFUSED|timeout/i.test(e.message)
    ? "Could not reach the database. The 'Direct connection' is IPv6-only on the free plan - use the 'Session pooler' string instead."
    : /Tenant or user not found/i.test(e.message)
    ? "The project reference in the username does not match this pooler region. Re-copy the Session pooler string."
    : "";
  die(`Could not connect: ${e.message}${hint ? `\n  ${hint}` : ""}`);
}

try {
  await client.query("create schema if not exists supabase_migrations");
  await client.query(
    "create table if not exists supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text)"
  );
  const applied = new Set((await client.query("select version from supabase_migrations.schema_migrations")).rows.map((r) => r.version));
  const pending = migrations.filter((m) => !applied.has(m.version));

  console.log("");
  for (const m of migrations) {
    console.log(`  ${applied.has(m.version) ? c.green("applied") : c.yellow("pending")}  ${m.file}`);
  }

  if (statusOnly) {
    console.log(`\n${pending.length ? `${pending.length} migration(s) pending. Run: npm run db:setup` : "Database is up to date."}\n`);
    process.exit(0);
  }
  if (!pending.length) {
    console.log(c.green("\n✓ Nothing to do - the database is already up to date.\n"));
    process.exit(0);
  }

  console.log("");
  for (const m of pending) {
    const sql = readFileSync(path.join(dir, m.file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)", [m.version, m.name, [sql]]);
      await client.query("commit");
      console.log(`  ${c.green("✓")} applied ${m.file}`);
    } catch (e) {
      await client.query("rollback");
      console.error(c.red(`  ✗ ${m.file} failed and was rolled back (nothing from it was kept):\n    ${String(e.message).split("\n")[0]}`));
      if (e.position) console.error(c.dim(`    near character ${e.position} of the file`));
      process.exit(1);
    }
  }
  console.log(c.green(`\n✓ ${pending.length} migration(s) applied. Next: npm run db:check\n`));
} finally {
  await client.end().catch(() => {});
}
