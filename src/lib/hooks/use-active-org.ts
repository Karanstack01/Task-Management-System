"use client";

import { useUIStore } from "@/lib/store/ui-store";
import { localDb } from "@/lib/data/dal";

/** Synchronous lookup of a stored profile (the repository loads from localStorage on the client). */
function findProfileOrg(userId: string | null): string {
  if (!userId) return "";
  const internal = localDb as unknown as { profiles?: { id: string; org_id?: string | null }[] };
  return internal.profiles?.find((p) => p.id === userId)?.org_id ?? "";
}

/**
 * The company (organization) the signed-in user belongs to. Empty for the platform SUPERADMIN,
 * who has no company of their own. Replaces the old hard-coded demo org id.
 */
export function useActiveOrgId(): string {
  const userId = useUIStore((s) => s.activeUserId);
  return findProfileOrg(userId);
}

/** The signed-in user's profile (name, email, role), or null when signed out. */
export function useActiveProfile() {
  const userId = useUIStore((s) => s.activeUserId);
  const internal = localDb as unknown as {
    profiles?: { id: string; full_name: string; email: string; role: string; org_id?: string | null }[];
  };
  return (userId && internal.profiles?.find((p) => p.id === userId)) || null;
}
