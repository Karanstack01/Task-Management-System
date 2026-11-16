import { Organization, OrgSubscriptionStatus } from "@/types/database.types";

/**
 * ORGANIZATION SUBSCRIPTION LIFECYCLE — single source of truth for tenant access.
 *
 * Stored:   subscription_status ∈ TRIAL | ACTIVE | PAST_DUE | CANCELLED   (billing state)
 *           is_suspended (+ suspended_at, suspension_reason, pre_suspension_status) (kill switch)
 *           subscription_expires_at                                         (time limit)
 *
 * Effective status precedence:  SUSPENDED (kill switch) > CANCELLED > EXPIRED (by date) > stored.
 * Access is granted only for effective TRIAL / ACTIVE — identical to public.is_org_active() in SQL.
 */

export interface OrgAccessState {
  status: OrgSubscriptionStatus;
  canAccess: boolean;
  reason: string | null;
}

const ACCESS_STATUSES: OrgSubscriptionStatus[] = ["TRIAL", "ACTIVE"];

export function isOrgExpired(org: Pick<Organization, "subscription_expires_at">, now = new Date()): boolean {
  const t = new Date(org.subscription_expires_at).getTime();
  return !isNaN(t) && t <= now.getTime();
}

export function getOrgAccessState(org: Organization, now = new Date()): OrgAccessState {
  if (org.is_suspended) {
    return {
      status: "SUSPENDED",
      canAccess: false,
      reason: org.suspension_reason || "This workspace was suspended by the platform administrator.",
    };
  }
  if (org.subscription_status === "CANCELLED") {
    return { status: "CANCELLED", canAccess: false, reason: "This workspace's subscription was cancelled." };
  }
  if (org.subscription_status === "EXPIRED" || isOrgExpired(org, now)) {
    return {
      status: "EXPIRED",
      canAccess: false,
      reason: `This workspace's subscription expired on ${new Date(org.subscription_expires_at).toLocaleDateString()}.`,
    };
  }
  if (org.subscription_status === "PAST_DUE") {
    return { status: "PAST_DUE", canAccess: false, reason: "This workspace has an overdue invoice. Please settle billing to continue." };
  }
  // A stray stored "SUSPENDED" without the kill switch flag is treated as active billing.
  const status = org.subscription_status === "SUSPENDED" ? "ACTIVE" : org.subscription_status;
  return { status, canAccess: ACCESS_STATUSES.includes(status), reason: null };
}

/** Kill switch ON: remember the billing state so it can be restored exactly. */
export function planSuspend(org: Organization, reason: string | undefined, now = new Date()): Partial<Organization> {
  if (org.is_suspended) return {};
  return {
    is_suspended: true,
    suspended_at: now.toISOString(),
    suspension_reason: reason || "Suspended by Superadmin master kill switch.",
    pre_suspension_status: org.subscription_status === "SUSPENDED" ? "ACTIVE" : org.subscription_status,
    subscription_status: "SUSPENDED",
  };
}

/** Kill switch OFF: restore the prior billing state; expiry still applies. */
export function planReactivate(org: Organization, now = new Date()): Partial<Organization> {
  if (!org.is_suspended) return {};
  let restored: OrgSubscriptionStatus = org.pre_suspension_status || "ACTIVE";
  if (restored === "SUSPENDED") restored = "ACTIVE";
  if (restored !== "CANCELLED" && isOrgExpired(org, now)) restored = "EXPIRED";
  return {
    is_suspended: false,
    suspended_at: null,
    suspension_reason: null,
    pre_suspension_status: null,
    subscription_status: restored,
  };
}
