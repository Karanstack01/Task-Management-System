"use client";

import { useEffect, useReducer } from "react";
import { useUIStore } from "@/lib/store/ui-store";
import { localDb } from "@/lib/data/dal";

type StoredProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  org_id?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
};

function internals() {
  return localDb as unknown as { profiles?: StoredProfile[]; organizations?: { id: string }[] };
}

/**
 * The company (organization) the signed-in user works in. A company user gets their own;
 * the platform SUPERADMIN (no company) gets the company they chose to manage, or the first one.
 */
export function useActiveOrgId(): string {
  const userId = useUIStore((s) => s.activeUserId);
  const managed = useUIStore((s) => s.managedOrgId);
  const db = internals();
  const profile = userId ? db.profiles?.find((p) => p.id === userId) : undefined;
  if (!profile) return "";
  if (profile.org_id) return profile.org_id;
  const orgs = db.organizations ?? [];
  return orgs.find((o) => o.id === managed)?.id ?? orgs[0]?.id ?? "";
}

/** The signed-in user's profile (name, email, role, avatar), or null when signed out. */
export function useActiveProfile(): StoredProfile | null {
  const userId = useUIStore((s) => s.activeUserId);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  // Re-render when the profile page saves a change (name / picture) so the header updates immediately.
  useEffect(() => {
    window.addEventListener("stackdrove:profile-updated", refresh);
    return () => window.removeEventListener("stackdrove:profile-updated", refresh);
  }, []);
  return (userId && internals().profiles?.find((p) => p.id === userId)) || null;
}
