"use client";

import { localDb } from "@/lib/data/dal";
import { getOrgAccessState } from "@/lib/data/org-lifecycle";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database.types";

export type OAuthProviderId = "google" | "microsoft";

/** Supabase calls Microsoft "azure". */
const SUPABASE_PROVIDER: Record<OAuthProviderId, "google" | "azure"> = {
  google: "google",
  microsoft: "azure",
};

export type SignInResolution =
  | { status: "ok"; user: Profile }
  | { status: "no_profile" }
  | { status: "inactive" }
  | { status: "workspace_missing" }
  | { status: "blocked"; orgName: string; reason: string };

/**
 * Turns a verified email (proved by Supabase Auth: password, Google or Microsoft) into a workspace user.
 * Only people who already exist in the system (the superadmin, or someone a company admin added) may enter.
 */
export async function resolveSignIn(email: string): Promise<SignInResolution> {
  const wanted = email.trim().toLowerCase();
  const profiles = await localDb.getProfiles();
  const user = profiles.find((p) => p.email.toLowerCase() === wanted);
  if (!user) return { status: "no_profile" };
  if (!user.is_active) return { status: "inactive" };
  if (!user.org_id) return { status: "ok", user }; // platform SUPERADMIN has no tenant

  const org = await localDb.getOrganizationById(user.org_id);
  if (!org) return { status: "workspace_missing" };
  const access = getOrgAccessState(org);
  if (!access.canAccess) return { status: "blocked", orgName: org.name, reason: access.reason || "" };
  return { status: "ok", user };
}

/** Is this social provider switched on in the Supabase project? (Dashboard → Authentication → Providers) */
export async function isProviderEnabled(provider: OAuthProviderId): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
    });
    if (!res.ok) return false;
    const settings = await res.json();
    return Boolean(settings?.external?.[SUPABASE_PROVIDER[provider]]);
  } catch {
    return false;
  }
}

/** Starts the Google / Microsoft redirect. Resolves only if the redirect could not start. */
export async function startOAuth(provider: OAuthProviderId): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: SUPABASE_PROVIDER[provider],
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      // Microsoft only returns the email claim when asked for it.
      scopes: provider === "microsoft" ? "email openid profile" : undefined,
    },
  });
  return error ? { error: error.message } : {};
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  return { email: data.user?.email ?? null, error: error?.message ?? null };
}

export async function signOutEverywhere() {
  try {
    await createClient().auth.signOut();
  } catch {
    // Already signed out / offline.
  }
}
