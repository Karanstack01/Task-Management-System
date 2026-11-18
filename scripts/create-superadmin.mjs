// Creates (or resets) the platform superadmin login in Supabase Auth.
//   node scripts/create-superadmin.mjs <email> <password>
// The password is passed on the command line and never stored in the repo.
import { readFileSync } from "node:fs";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/create-superadmin.mjs <email> <password>");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const list = await (await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers })).json();
const existing = (list.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());

const res = existing
  ? await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
      method: "PUT", headers, body: JSON.stringify({ password, email_confirm: true }),
    })
  : await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST", headers, body: JSON.stringify({ email, password, email_confirm: true }),
    });

const body = await res.json();
if (!res.ok) {
  console.error("Failed:", res.status, body.msg || body.message || JSON.stringify(body));
  process.exit(1);
}
console.log(`${existing ? "Updated" : "Created"} superadmin login: ${body.email} (email confirmed)`);
