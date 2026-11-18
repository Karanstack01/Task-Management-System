# Supabase setup

This project already contains the full database schema (`supabase/migrations`). These steps create your Supabase project
and connect it. Only steps 1–2 need you in a browser; everything else is a command.

## 1. Create the project (about 2 minutes)

1. Sign in at <https://supabase.com> and click **New project**.
2. Choose a name, a **region close to your users**, and a **strong database password** — store it in a password manager,
   you need it in step 2.
3. Wait until the project finishes provisioning.

> Free projects pause after about a week without activity. Use a paid plan for production.

## 2. Put four values in `.env.local`

Open `.env.local` in the project root (it is git-ignored and never committed). A Supabase block has already been added.

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → **API** → Project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → **API Keys** → the `anon` / *publishable* key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → the `service_role` / *secret* key (click **Reveal**) |
| `SUPABASE_DB_URL` | **Connect** button → **Session pooler** → copy the string, replace `[YOUR-PASSWORD]` with your database password |

Rules that matter:

- The **service_role key is a master key** — it bypasses all security. It must only ever be in `SUPABASE_SERVICE_ROLE_KEY`,
  never in a variable starting with `NEXT_PUBLIC_` (those are sent to every browser).
- If your database password contains `@ : / # ? %`, URL-encode it in `SUPABASE_DB_URL` (for example `@` → `%40`),
  or reset it to something without symbols under Project Settings → Database.
- Use the **Session pooler** string, not "Direct connection": the direct one is IPv6-only on the free plan and often fails.

## 3. Create the tables

```bash
npm run db:status   # shows what is applied / pending (changes nothing)
npm run db:setup    # applies every pending migration, each in its own transaction
npm run db:check    # end-to-end health check
```

`db:setup` is safe to re-run: applied migrations are recorded (in the same table the official Supabase CLI uses) and skipped.
If a migration fails it is rolled back completely and the script stops with the reason.

`db:check` verifies: the keys are the right kind (and not swapped), all values belong to the same project, every migration
is applied, **row-level security is on for every table**, the public key cannot read your data, and saved settings can be
written and read back through the API. Fix anything it marks ✗ before continuing.

## 4. Authentication settings (dashboard)

Authentication → **URL Configuration**:

- **Site URL**: your production URL (for example `https://your-app.vercel.app`).
- **Redirect URLs**: add `http://localhost:3000/**` and your production URL with `/**`.

Authentication → **Sign In / Providers**: for an internal company tool, turn **off** "Allow new users to sign up" and
invite people instead. (`db:check` warns while sign-ups are open.)

## 5. Vercel

Add these in Project → Settings → Environment Variables, then redeploy:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INTEGRATION_ENCRYPTION_KEY`

`INTEGRATION_ENCRYPTION_KEY` must be **identical** everywhere that shares this database (local and Vercel), because saved
passwords are encrypted with it. Changing it later makes existing saved secrets unreadable. `SUPABASE_DB_URL` is **not**
needed on Vercel — it is only used by the setup scripts on your machine.

## What is stored in Supabase today

- **Integration settings** (email, WhatsApp, Cloudinary credentials — encrypted — and WhatsApp template choices) are saved
  in the `integration_settings` table once the database is connected. Until then they live in server memory and are lost on
  restart (the app shows which mode it is in).
- The application's tasks, users and organizations still run on the built-in demo data. Moving them to the Supabase tables is
  a separate step (data layer + Supabase Auth).

## Troubleshooting

| Message | Meaning / fix |
|---|---|
| `password authentication failed` | Wrong database password. Reset it under Project Settings → Database and update `SUPABASE_DB_URL`. |
| `Tenant or user not found` | The pooler string does not match your project/region. Re-copy the Session pooler string. |
| `ETIMEDOUT` / `ENOTFOUND` | Use the **Session pooler** string; check your network. |
| `relation "…" does not exist` | Migrations not applied yet — run `npm run db:setup`. |
| `db:check` says a key is the wrong role | You pasted the keys in the wrong places. Swap them, then **rotate** the service key in the dashboard if it was ever in a `NEXT_PUBLIC_` variable. |
