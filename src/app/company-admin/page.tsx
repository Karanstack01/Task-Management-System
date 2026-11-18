"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { localDb } from "@/lib/data/dal";
import {
  MasterIntegrationsPanel,
  type IntegrationSection,
  type IntegrationStatus,
  type WhatsappTab,
} from "@/components/settings/master-integrations-panel";
import type { Department, Organization, OrgSubscriptionStatus, Profile, UserRole } from "@/types/database.types";
import {
  Building2,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  Users,
  Mail,
  MessageSquare,
  Cloud,
  LayoutDashboard,
  CreditCard,
  TriangleAlert,
  Globe,
} from "lucide-react";

// ---------------------------------------------------------------------------------------------
// Navigation model: related things are grouped, and each item is a switchable section
// ---------------------------------------------------------------------------------------------
type NavId = "overview" | "subscription" | "admins" | "team" | IntegrationSection;
type IconType = React.ComponentType<{ className?: string }>;

const NAV_GROUPS: Array<{ label: string; items: Array<{ id: NavId; label: string; icon: IconType }> }> = [
  {
    label: "Organization",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "subscription", label: "Subscription & seats", icon: CreditCard },
    ],
  },
  {
    label: "People & access",
    items: [
      { id: "admins", label: "Delegated admins", icon: ShieldCheck },
      { id: "team", label: "Team & departments", icon: Users },
    ],
  },
  {
    label: "Integrations",
    items: [
      { id: "email", label: "Email", icon: Mail },
      { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
      { id: "storage", label: "File storage", icon: Cloud },
    ],
  },
];

const ALL_NAV_IDS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));
const INTEGRATION_IDS: IntegrationSection[] = ["email", "whatsapp", "storage"];
const isNavId = (v: string): v is NavId => (ALL_NAV_IDS as string[]).includes(v);
const isIntegration = (v: NavId): v is IntegrationSection => (INTEGRATION_IDS as string[]).includes(v);

const ROLE_LABEL: Record<UserRole, string> = {
  SUPERADMIN: "Super Admin",
  COMPANY_ADMIN: "Company Admin",
  ADMIN: "Admin",
  BOSS: "Boss",
  DELEGATOR: "Delegator",
  DELEGATEE: "Delegatee",
};

const STATUS_STYLE: Record<OrgSubscriptionStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  TRIAL: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
  PAST_DUE: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  SUSPENDED: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25",
  EXPIRED: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25",
  CANCELLED: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20",
};

// Frosted-glass surface (see `.cc-glass` in globals.css): translucent, blurs the app canvas behind it, and follows
// the light / dark / system theme. (The global .apple-card lifts on hover, which is distracting around forms.)
const panel = "cc-glass cc-enter";
const muted = "text-[#666666] dark:text-neutral-400";
const strong = "text-[#111111] dark:text-white";

/** history.pushState does not fire "hashchange", so section switches announce themselves with this event. */
const SECTION_EVENT = "ctms:section-change";

function subscribeToHash(onChange: () => void) {
  const events = ["hashchange", "popstate", SECTION_EVENT];
  events.forEach((e) => window.addEventListener(e, onChange));
  return () => events.forEach((e) => window.removeEventListener(e, onChange));
}
const readHash = () => window.location.hash.replace("#", "");
const WA_TAB_HASH: Record<WhatsappTab, string> = {
  connection: "whatsapp",
  library: "whatsapp-library",
  flows: "whatsapp-flows",
};
/** "#whatsapp-templates" was the old name of the flows tab and still works. */
function waTabFromHash(hash: string): WhatsappTab | null {
  if (hash === "whatsapp") return "connection";
  if (hash === "whatsapp-library") return "library";
  if (hash === "whatsapp-flows" || hash === "whatsapp-templates") return "flows";
  return null;
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Pill({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${className}`}>
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  children,
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  children?: React.ReactNode;
  /** Position in the row: staggers the entrance animation. */
  index?: number;
}) {
  return (
    <div className={`${panel} p-4`} style={{ "--i": index } as React.CSSProperties}>
      <div className={`text-[11px] font-medium uppercase tracking-wide ${muted}`}>{label}</div>
      <div className={`cc-num mt-1 text-xl font-semibold tracking-tight ${strong}`}>{value}</div>
      {children}
      {hint && <div className={`mt-1 text-[11px] ${muted}`}>{hint}</div>}
    </div>
  );
}

function Bar({ pct, tone = "bg-[#111111] dark:bg-white" }: { pct: number; tone?: string }) {
  return (
    <div className="mt-2 h-1.5 rounded-full cc-inset overflow-hidden" role="presentation">
      <div className={`h-full rounded-full cc-grow ${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 flex flex-col sm:flex-row sm:items-baseline sm:gap-4 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0">
      <dt className={`text-[11px] font-medium sm:w-40 shrink-0 ${muted}`}>{label}</dt>
      <dd className={`text-xs font-medium min-w-0 [overflow-wrap:anywhere] ${strong}`}>{children}</dd>
    </div>
  );
}

export default function CompanyAdminPage() {
  const orgId = "org-sd-01";

  const [org, setOrg] = useState<Organization | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [now] = useState(() => Date.now());

  // The visible section lives in the URL hash (#whatsapp, #team, ...): linkable, and the back button works.
  const hash = useSyncExternalStore(subscribeToHash, readHash, () => "");
  // "#whatsapp", "#whatsapp-library" and "#whatsapp-flows" are the three parts of the WhatsApp section;
  // every other hash is a plain section id.
  const hashWaTab = waTabFromHash(hash);
  const sectionHash = hashWaTab ? "whatsapp" : hash;
  const active: NavId = isNavId(sectionHash) ? sectionHash : "overview";
  const [lastIntegration, setLastIntegration] = useState<IntegrationSection>("email");
  const [lastWaTab, setLastWaTab] = useState<WhatsappTab>("connection");
  const waTab: WhatsappTab = hashWaTab ?? lastWaTab;
  const integrationSection: IntegrationSection = isIntegration(active) ? active : lastIntegration;
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [appointing, setAppointing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");

  const fetchAll = () =>
    Promise.all([localDb.getOrganizationById(orgId), localDb.getProfiles(orgId), localDb.getDepartments(orgId)]);

  function applyData([o, p, d]: Awaited<ReturnType<typeof fetchAll>>) {
    setOrg(o);
    setProfiles(p);
    setDepartments(d);
  }

  async function loadData() {
    applyData(await fetchAll());
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      localDb.getOrganizationById(orgId),
      localDb.getProfiles(orgId),
      localDb.getDepartments(orgId),
    ]).then(([o, p, d]) => {
      if (cancelled) return;
      setOrg(o);
      setProfiles(p);
      setDepartments(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function go(id: NavId, tab?: WhatsappTab) {
    if (isIntegration(id)) setLastIntegration(id);
    let target: string = id;
    if (id === "whatsapp") {
      const t = tab ?? lastWaTab; // reopen the part of WhatsApp you were last on
      setLastWaTab(t);
      target = WA_TAB_HASH[t];
    }
    // Shallow URL update (supported by Next.js): no navigation, back/forward still move between sections.
    window.history.pushState(null, "", `#${target}`);
    window.dispatchEvent(new Event(SECTION_EVENT));
  }

  async function handleAppointAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setAppointing(true);
    setActionMessage(null);
    try {
      const updated = await localDb.updateProfileRole(selectedUserId, "ADMIN");
      if (updated) {
        setActionMessage(`Granted delegated Admin rights to ${updated.full_name}.`);
        setSelectedUserId("");
        await loadData();
      }
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Role change failed.");
    } finally {
      setAppointing(false);
    }
  }

  async function handleRevokeAdmin(userId: string) {
    try {
      const updated = await localDb.updateProfileRole(userId, "DELEGATOR");
      if (updated) {
        setActionMessage(`Revoked Admin rights from ${updated.full_name}. Restored to Delegator.`);
        await loadData();
      }
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Role change failed.");
    }
  }

  // ---- derived details -------------------------------------------------------------------------
  const delegatedAdmins = profiles.filter((p) => p.role === "ADMIN");
  const appointable = profiles.filter(
    (p) => p.is_active && p.role !== "ADMIN" && p.role !== "COMPANY_ADMIN" && p.role !== "SUPERADMIN"
  );
  const activeMembers = profiles.filter((p) => p.is_active).length;
  const maxUsers = org?.max_users ?? 0;
  const seatPct = maxUsers > 0 ? (activeMembers / maxUsers) * 100 : 0;

  const expiresMs = org ? new Date(org.subscription_expires_at).getTime() : 0;
  const startedMs = org ? new Date(org.subscription_started_at).getTime() : 0;
  const daysLeft = org ? Math.ceil((expiresMs - now) / 86_400_000) : null;
  const periodPct = expiresMs > startedMs ? ((now - startedMs) / (expiresMs - startedMs)) * 100 : 0;

  const roleCounts = profiles.reduce<Partial<Record<UserRole, number>>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

  const connected = integration
    ? [integration.email.configured, integration.whatsapp.configured, integration.storage.configured].filter(Boolean).length
    : null;

  type Step = { done: boolean | null; title: string; detail: string; to?: NavId; tab?: WhatsappTab };
  const checklist: Step[] = [
    {
      done: !!org && org.allowed_domains.length > 0,
      title: "Company email domain verified",
      detail: org?.allowed_domains.length ? org.allowed_domains.map((d) => `@${d}`).join(", ") : "No domain whitelisted yet",
    },
    {
      done: departments.length > 0,
      title: "Departments created",
      detail: departments.length ? departments.map((d) => d.name).join(", ") : "Add departments so tasks can be grouped",
      to: "team",
    },
    {
      done: profiles.length > 1,
      title: "Team members added",
      detail: `${activeMembers} active of ${maxUsers || "—"} seats`,
      to: "team",
    },
    {
      done: delegatedAdmins.length > 0,
      title: "Delegated admin appointed",
      detail: delegatedAdmins.length ? delegatedAdmins.map((a) => a.full_name).join(", ") : "Share day-to-day administration with a trusted person",
      to: "admins",
    },
    {
      done: integration ? integration.email.configured : null,
      title: "Email connected",
      detail: integration?.email.detail ?? "Checking…",
      to: "email",
    },
    {
      done: integration ? integration.whatsapp.configured : null,
      title: "WhatsApp connected",
      detail: integration?.whatsapp.detail ?? "Checking…",
      to: "whatsapp",
      tab: "connection",
    },
    {
      done: integration ? integration.whatsapp.templatesMapped > 0 : null,
      title: "WhatsApp templates chosen",
      detail: integration ? `${integration.whatsapp.templatesMapped} of 4 alerts use a template` : "Checking…",
      to: "whatsapp",
      tab: "flows",
    },
    {
      done: integration ? integration.storage.configured : null,
      title: "File storage connected",
      detail: integration?.storage.detail ?? "Checking…",
      to: "storage",
    },
  ];
  const doneCount = checklist.filter((s) => s.done === true).length;

  const navBadge = (id: NavId): React.ReactNode => {
    if (id === "admins") return <span className={`text-[10px] font-semibold ${muted}`}>{delegatedAdmins.length}</span>;
    if (id === "team") return <span className={`text-[10px] font-semibold ${muted}`}>{profiles.length}</span>;
    if (isIntegration(id) && integration) {
      const ok = integration[id].configured;
      return (
        <span
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${ok ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"}`}
          title={ok ? "Configured" : "Not set up"}
          role="img"
          aria-label={ok ? "Configured" : "Not set up"}
        />
      );
    }
    return null;
  };

  // ---- sections --------------------------------------------------------------------------------
  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat index={0} label="Seats in use" value={`${activeMembers} / ${maxUsers || "—"}`} hint={`${Math.max(0, maxUsers - activeMembers)} seats free`}>
          <Bar pct={seatPct} tone={seatPct > 90 ? "bg-red-500" : seatPct > 75 ? "bg-amber-500" : "bg-[#111111] dark:bg-white"} />
        </Stat>
        <Stat index={1}
          label="License"
          value={daysLeft === null ? "—" : daysLeft >= 0 ? `${daysLeft} days` : "Expired"}
          hint={org ? `Renews ${fmtDate(org.subscription_expires_at)}` : undefined}
        />
        <Stat index={2} label="Delegated admins" value={delegatedAdmins.length} hint={`${profiles.length} people in total`} />
        <Stat index={3} label="Integrations" value={connected === null ? "…" : `${connected} / 3`} hint="Email · WhatsApp · Storage" />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-5">
        <section className={`${panel} p-5 2xl:col-span-3`} aria-labelledby="setup-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="setup-title" className={`font-semibold text-base ${strong}`}>Setup checklist</h2>
              <p className={`text-xs ${muted}`}>{doneCount} of {checklist.length} complete</p>
            </div>
            <div className="w-28 shrink-0">
              <Bar pct={(doneCount / checklist.length) * 100} tone="bg-emerald-500" />
            </div>
          </div>
          <ul className="mt-3 cc-divide">
            {checklist.map((s, i) => (
              <li key={s.title} className="cc-enter py-3.5 flex items-center gap-3" style={{ "--i": i } as React.CSSProperties}>
                {s.done ? (
                  <CheckCircle2 className="cc-pop w-4 h-4 text-emerald-500 shrink-0" style={{ "--i": i } as React.CSSProperties} />
                ) : (
                  <Circle className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-semibold ${strong}`}>{s.title}</div>
                  <div className={`text-[11px] truncate ${muted}`}>{s.detail}</div>
                </div>
                {s.done === false && s.to && (
                  <button
                    type="button"
                    onClick={() => go(s.to!, s.tab)}
                    className="text-[11px] font-semibold text-[#111111] dark:text-white inline-flex items-center gap-0.5 hover:underline shrink-0"
                  >
                    Set up <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="2xl:col-span-2 space-y-5">
          <section className={`${panel} p-5`} aria-labelledby="org-title">
            <h2 id="org-title" className={`font-semibold text-base ${strong}`}>Organization</h2>
            <dl className="mt-2">
              <Field label="Name">{org?.name ?? "—"}</Field>
              <Field label="Workspace ID">{org?.slug ?? "—"}</Field>
              <Field label="Primary contact">{org?.primary_contact_email ?? "—"}</Field>
              <Field label="Support email">{org?.support_email ?? "—"}</Field>
              <Field label="Website">
                {org?.website_url ? (
                  <a href={org.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                    <Globe className="w-3 h-3" /> {org.website_url.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Allowed domains">
                {org?.allowed_domains.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {org.allowed_domains.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.08] text-[11px]">@{d}</span>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Created">{fmtDate(org?.created_at)}</Field>
            </dl>
          </section>

          <section className={`${panel} p-5`} aria-labelledby="links-title">
            <h2 id="links-title" className={`font-semibold text-sm ${strong}`}>Quick links</h2>
            <div className="mt-2 cc-divide">
              {[
                { href: "/admin", label: "Admin operations console" },
                { href: "/settings", label: "System settings & permissions" },
                { href: "/recurring", label: "Recurring master tasks" },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className={`flex items-center justify-between py-2.5 text-xs font-medium ${strong} hover:text-[var(--cc-accent)] transition-colors`}
                >
                  {l.label}
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderSubscription = () => (
    <div className="space-y-5">
      <div>
        <h2 className={`font-semibold text-lg tracking-tight ${strong}`}>Subscription & seats</h2>
        <p className={`text-xs mt-0.5 ${muted}`}>Your licence is managed by StackDrove. Contact support to change plan or seat count.</p>
      </div>

      {org?.is_suspended && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl border border-red-500/25 bg-red-500/10 text-xs text-red-900 dark:text-red-200" role="alert">
          <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">This workspace is suspended</div>
            <div>{org.suspension_reason || "No reason recorded."}{org.suspended_at ? ` (since ${fmtDate(org.suspended_at)})` : ""}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className={`${panel} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className={`font-semibold text-sm ${strong}`}>Plan</h3>
            {org && <Pill className={STATUS_STYLE[org.subscription_status]}>{org.subscription_status.replace("_", " ")}</Pill>}
          </div>
          <div className={`mt-2 text-2xl font-semibold tracking-tight ${strong}`}>{org?.subscription_plan ?? "—"}</div>
          <dl className="mt-3">
            <Field label="Started">{fmtDate(org?.subscription_started_at)}</Field>
            <Field label="Expires">{fmtDate(org?.subscription_expires_at)}</Field>
            <Field label="Time remaining">
              {daysLeft === null ? "—" : daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"}` : `Expired ${Math.abs(daysLeft)} day(s) ago`}
            </Field>
          </dl>
          <div className={`mt-3 text-[11px] ${muted}`}>Billing period used</div>
          <Bar pct={periodPct} tone={daysLeft !== null && daysLeft < 15 ? "bg-amber-500" : "bg-[#111111] dark:bg-white"} />
        </section>

        <section className={`${panel} p-5`}>
          <h3 className={`font-semibold text-sm ${strong}`}>Seats</h3>
          <div className={`cc-num mt-2 text-2xl font-semibold tracking-tight ${strong}`}>
            {activeMembers} <span className={`text-base font-medium ${muted}`}>of {maxUsers || "—"} used</span>
          </div>
          <Bar pct={seatPct} tone={seatPct > 90 ? "bg-red-500" : seatPct > 75 ? "bg-amber-500" : "bg-[#111111] dark:bg-white"} />
          <dl className="mt-3">
            <Field label="Active people">{activeMembers}</Field>
            <Field label="Deactivated">{profiles.length - activeMembers}</Field>
            <Field label="Free seats">{Math.max(0, maxUsers - activeMembers)}</Field>
          </dl>
          {seatPct > 90 && <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-300">You are almost out of seats — contact support to add more.</p>}
        </section>
      </div>
    </div>
  );

  const renderAdmins = () => (
    <div className="space-y-5">
      <div>
        <h2 className={`font-semibold text-lg tracking-tight ${strong}`}>Delegated admins</h2>
        <p className={`text-xs mt-0.5 ${muted}`}>Admins can manage users, SLA rules and data on your behalf. You always keep full control.</p>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-5">
        <section className={`${panel} p-5 2xl:col-span-3`}>
          <h3 className={`font-semibold text-sm ${strong}`}>Appointed admins ({delegatedAdmins.length})</h3>
          {delegatedAdmins.length === 0 ? (
            <div className={`py-8 text-center text-xs ${muted}`}>No admins appointed yet. Use the form to appoint one.</div>
          ) : (
            <ul className="mt-2 divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {delegatedAdmins.map((adm) => (
                <li key={adm.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] font-semibold flex items-center justify-center shrink-0">
                      {adm.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold truncate ${strong}`}>{adm.full_name}</div>
                      <div className={`text-[11px] truncate ${muted}`}>{adm.email}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRevokeAdmin(adm.id)} className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline shrink-0">
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${panel} p-5 2xl:col-span-2`}>
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-neutral-400" />
            <h3 className={`font-semibold text-sm ${strong}`}>Appoint an admin</h3>
          </div>
          <p className={`mt-1 text-xs ${muted}`}>Choose an active team member to give operational admin rights.</p>
          <form onSubmit={handleAppointAdmin} className="mt-4 space-y-3 text-xs">
            <label className={`block font-semibold ${strong}`} htmlFor="appoint-user">Team member</label>
            <select
              id="appoint-user"
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2.5 apple-input rounded-xl text-xs font-medium"
            >
              <option value="">Choose a person…</option>
              {appointable.map((u) => (
                <option key={u.id} value={u.id} className="dark:bg-[#111111] dark:text-white">
                  {u.full_name} ({ROLE_LABEL[u.role]})
                </option>
              ))}
            </select>
            <button type="submit" disabled={appointing || !selectedUserId} className="apple-btn-primary w-full py-2.5 text-xs font-semibold disabled:opacity-50">
              {appointing ? "Appointing…" : "Grant admin rights"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );

  const renderTeam = () => {
    const visible = roleFilter === "ALL" ? profiles : profiles.filter((p) => p.role === roleFilter);
    const roles = (Object.keys(ROLE_LABEL) as UserRole[]).filter((r) => (roleCounts[r] ?? 0) > 0);
    return (
      <div className="space-y-5">
        <div>
          <h2 className={`font-semibold text-lg tracking-tight ${strong}`}>Team & departments</h2>
          <p className={`text-xs mt-0.5 ${muted}`}>Everyone in your workspace and how they are organised.</p>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-5 gap-5">
          <section className={`${panel} p-5 2xl:col-span-3`}>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by role">
              {(["ALL", ...roles] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  aria-pressed={roleFilter === r}
                  className={`cc-press px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
                    roleFilter === r
                      ? "cc-chip-active"
                      : `border-black/[0.08] dark:border-white/[0.1] ${muted} hover:text-[#111111] dark:hover:text-white`
                  }`}
                >
                  {r === "ALL" ? `Everyone (${profiles.length})` : `${ROLE_LABEL[r]} (${roleCounts[r]})`}
                </button>
              ))}
            </div>
            <ul className="mt-3 divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {visible.map((p) => {
                const dept = departments.find((d) => d.id === p.department_id);
                return (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] font-semibold flex items-center justify-center shrink-0">
                        {p.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${strong}`}>{p.full_name}</div>
                        <div className={`text-[11px] truncate ${muted}`}>{p.email}{dept ? ` · ${dept.name}` : ""}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!p.is_active && <Pill className="bg-neutral-500/10 text-neutral-500 border-neutral-500/20">Inactive</Pill>}
                      <Pill className="bg-black/[0.04] dark:bg-white/[0.08] border-black/[0.06] dark:border-white/[0.1]">{ROLE_LABEL[p.role]}</Pill>
                    </div>
                  </li>
                );
              })}
              {visible.length === 0 && <li className={`py-8 text-center text-xs ${muted}`}>No one in this group.</li>}
            </ul>
          </section>

          <section className={`${panel} p-5 2xl:col-span-2`}>
            <h3 className={`font-semibold text-sm ${strong}`}>Departments ({departments.length})</h3>
            {departments.length === 0 ? (
              <div className={`py-8 text-center text-xs ${muted}`}>No departments yet.</div>
            ) : (
              <ul className="mt-2 divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {departments.map((d) => {
                  const members = profiles.filter((p) => p.department_id === d.id).length;
                  return (
                    <li key={d.id} className="py-3 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${strong}`}>
                          {d.name} {d.code && <span className={`font-normal ${muted}`}>· {d.code}</span>}
                        </div>
                        <div className={`text-[11px] ${muted}`}>
                          Head: {d.head_user_id ? nameById.get(d.head_user_id) ?? "Unknown" : "Not assigned"}
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold shrink-0 ${muted}`}>
                        {members} {members === 1 ? "person" : "people"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    );
  };

  // ---- layout ----------------------------------------------------------------------------------
  const showIntegrations = isIntegration(active);

  return (
    <div className="cc-stage max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <header className={`${panel} p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
            <Building2 className={`w-6 h-6 ${strong}`} />
          </div>
          <div className="min-w-0">
            <h1 className={`text-xl sm:text-2xl font-semibold tracking-tight ${strong}`}>Company Admin Command Center</h1>
            <p className={`text-xs truncate ${muted}`}>
              {org?.name ?? "Your organization"} · Primary organization head
            </p>
          </div>
        </div>
        {org && (
          <div className="flex flex-wrap items-center gap-2">
            <Pill className="bg-black/[0.04] dark:bg-white/[0.08] border-black/[0.06] dark:border-white/[0.1]">{org.subscription_plan} plan</Pill>
            <Pill className={STATUS_STYLE[org.subscription_status]}>{org.subscription_status.replace("_", " ")}</Pill>
            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
              <Pill className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25">Renews in {daysLeft}d</Pill>
            )}
          </div>
        )}
      </header>

      {actionMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200" role="status">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{actionMessage}</span>
          </div>
          <button type="button" onClick={() => setActionMessage(null)} className="font-medium underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-5 items-start">
        {/* Section navigation: desktop = grouped sidebar */}
        <nav aria-label="Company admin sections" className={`${panel} p-3 hidden lg:block lg:sticky lg:top-4`}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
              <div className={`px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider ${muted}`}>{group.label}</div>
              <ul className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon }) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => go(id)}
                      aria-current={active === id ? "page" : undefined}
                      className={`cc-press w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium ${
                        active === id
                          ? "cc-nav-active"
                          : `${muted} hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-[#111111] dark:hover:text-white`
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{label}</span>
                      {navBadge(id)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Section navigation: mobile = scrollable chips */}
        <nav aria-label="Company admin sections" className="lg:hidden -mx-1 overflow-x-auto">
          <ul className="flex gap-1.5 px-1 pb-1 w-max">
            {NAV_GROUPS.flatMap((g) => g.items).map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active === id ? "page" : undefined}
                  className={`cc-press inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border whitespace-nowrap ${
                    active === id
                      ? "cc-chip-active"
                      : `border-black/[0.08] dark:border-white/[0.1] ${muted}`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {navBadge(id)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <main className="min-w-0">
          {/* Re-keyed per section so each one fades in when you switch */}
          {!isIntegration(active) && (
            <div key={active} className="cc-fade">
              {active === "overview" && renderOverview()}
              {active === "subscription" && renderSubscription()}
              {active === "admins" && renderAdmins()}
              {active === "team" && renderTeam()}
            </div>
          )}

          {/* Stays mounted while you move between integration sections (or away), so unsaved edits are not lost. */}
          <div className={showIntegrations ? "" : "hidden"}>
            <div className={`${panel} p-5 sm:p-6`}>
              <MasterIntegrationsPanel
                orgId={orgId}
                section={integrationSection}
                whatsappTab={waTab}
                onWhatsappTabChange={(t) => go("whatsapp", t)}
                onMessage={setActionMessage}
                onStatusChange={setIntegration}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
