"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleType } from "@/lib/store/ui-store";
import { useActiveProfile } from "@/lib/hooks/use-active-org";

interface RoleMeta {
  id: RoleType;
  short: string;
  label: string;
  hint: string;
}

/** Highest authority first. A person can only "view as" their own role or one below it. */
const ROLES: RoleMeta[] = [
  { id: "SUPERADMIN", short: "SA", label: "Superadmin", hint: "Platform" },
  { id: "COMPANY_ADMIN", short: "CA", label: "Company Admin", hint: "Organization" },
  { id: "BOSS", short: "BO", label: "Boss", hint: "Executive" },
  { id: "ADMIN", short: "AD", label: "Admin", hint: "Operations" },
  { id: "DELEGATOR", short: "DL", label: "Delegator", hint: "Assigns tasks" },
  { id: "DELEGATEE", short: "DE", label: "Delegatee", hint: "Delivers tasks" },
];

interface RoleSwitcherProps {
  activeRole: RoleType;
  onChange: (role: RoleType) => void;
  onLogout: () => void;
  /** Called after a navigation click (e.g. to close the mobile drawer). */
  onNavigate?: () => void;
}

/**
 * Who's signed in + one-click role switching. Replaces the old nested dropdown:
 * every role the person may use is visible at once, the current one is highlighted.
 */
export function RoleSwitcher({ activeRole, onChange, onLogout, onNavigate }: RoleSwitcherProps) {
  const profile = useActiveProfile();

  const ownRank = ROLES.findIndex((r) => r.id === profile?.role);
  const allowed = useMemo(
    () => (ownRank < 0 ? ROLES.filter((r) => r.id === activeRole) : ROLES.slice(ownRank)),
    [ownRank, activeRole]
  );
  const current = ROLES.find((r) => r.id === activeRole) ?? ROLES[ROLES.length - 1];
  const initials = profile?.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || current.short;

  return (
    <div className="space-y-2.5">
      {/* Identity */}
      <div className="flex items-center gap-2.5">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex items-center gap-2.5 min-w-0 flex-1 rounded-xl p-1 -m-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          title="My profile"
        >
          <span className="relative w-9 h-9 rounded-full shrink-0 overflow-hidden bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold flex items-center justify-center">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-[#111111] dark:text-white truncate">
              {profile?.full_name ?? "Signed out"}
            </span>
            <span className="block text-[10px] text-[#666666] dark:text-[#A3A3A3] truncate">
              {profile?.email ?? ""}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[#666666] dark:text-[#A3A3A3] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut size={15} />
        </button>
      </div>

      {/* Role switcher */}
      {allowed.length > 1 ? (
        <div>
          <div className="flex items-center justify-between px-0.5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A3A3A3]">
              View as
            </span>
            <span className="text-[10px] font-semibold text-[#111111] dark:text-white">{current.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Switch role">
            {allowed.map((r) => {
              const active = r.id === activeRole;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(r.id)}
                  title={`${r.label} — ${r.hint}`}
                  className={cn(
                    "group flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 border text-center cursor-pointer transition-all duration-200",
                    active
                      ? "bg-[#111111] text-white border-[#111111] dark:bg-white dark:text-[#111111] dark:border-white shadow-sm scale-[1.02]"
                      : "bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-[#666666] dark:text-[#A3A3A3] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.09] hover:-translate-y-px"
                  )}
                >
                  <span className="text-[11px] font-black leading-none">{r.short}</span>
                  <span className="text-[9px] font-semibold leading-tight truncate w-full">{r.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A3A3A3]">Role</span>
          <span className="text-[11px] font-bold text-[#111111] dark:text-white">{current.label}</span>
        </div>
      )}
    </div>
  );
}
