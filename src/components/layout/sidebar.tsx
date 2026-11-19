"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StackDroveMark } from "@/components/brand/logo";
import { useUIStore, RoleType, SectionId } from "@/lib/store/ui-store";
import {
  NAV_SECTIONS,
  getSectionByPath,
  NavSectionConfig,
  NavItemConfig,
  isItemAllowed,
  isSectionAllowed,
  getAccessibleSections,
  getDefaultHrefForRole,
} from "@/lib/navigation/navigation-config";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { localDb } from "@/lib/data/dal";
import { useActiveOrgId } from "@/lib/hooks/use-active-org";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarOpen,
    toggleSidebar,
    siderowOpen,
    toggleSiderow,
    setSiderowOpen,
    activeSection,
    setActiveSection,
    activeRole,
    setActiveRole,
    endSession,
  } = useUIStore();

  // Role-based visible sections in Rail 1
  const visibleSections = useMemo(
    () => NAV_SECTIONS.filter((sec) => isSectionAllowed(sec, activeRole)),
    [activeRole]
  );

  // Auto-sync active section based on current URL path
  useEffect(() => {
    if (pathname) {
      const detected = getSectionByPath(pathname);
      // Only set if allowed for active role
      const detectedSec = NAV_SECTIONS.find((s) => s.id === detected);
      if (detectedSec && isSectionAllowed(detectedSec, activeRole)) {
        setActiveSection(detected);
      } else if (visibleSections.length > 0) {
        // Fallback to first allowed section
        setActiveSection(visibleSections[0].id);
      }
    }
  }, [pathname, activeRole, visibleSections, setActiveSection]);

  // Find currently active section configuration (ensuring it's permitted)
  const currentSectionConfig =
    visibleSections.find((sec) => sec.id === activeSection) ||
    visibleSections[0] ||
    NAV_SECTIONS[0];

  const [currentSearch, setCurrentSearch] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentSearch(window.location.search);
    }
  }, [pathname]);

  // Dynamic live data counts for sidebar badges
  const orgId = useActiveOrgId() || "org-sd-01";
  const activeUserId = useUIStore((s) => s.activeUserId);

  const [liveCounts, setLiveCounts] = useState<{
    delegatee?: number;
    checklist?: number;
    verify?: number;
    team_roles?: number;
  }>({});

  const refreshCounts = useCallback(async () => {
    try {
      const allTasks = await localDb.getTasks({ orgId });

      // Delegatee tasks: tasks assigned to active user, or to the active delegatee in the workspace
      const myTasks = activeUserId
        ? allTasks.filter((t) => t.delegatee_id === activeUserId && t.status !== "CANCELLED")
        : allTasks.filter((t) => t.delegatee_id === "user-del-1" || (t.delegatee_id && t.status !== "CANCELLED"));

      const delegateeCount = myTasks.length;

      // Daily Checklist items count
      let checklistCount = 5;
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("ctms_daily_checklist");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) checklistCount = parsed.length;
          }
        } catch {}
      }

      // Verification queue count (status === "AWAITING_VERIFICATION")
      const verifyCount = allTasks.filter((t) => t.status === "AWAITING_VERIFICATION").length;

      // Profiles count
      const profiles = await localDb.getProfiles(orgId);
      const teamRolesCount = profiles.length;

      setLiveCounts({
        delegatee: delegateeCount,
        checklist: checklistCount,
        verify: verifyCount,
        team_roles: teamRolesCount,
      });
    } catch {
      // Fallback silently
    }
  }, [orgId, activeUserId]);

  useEffect(() => {
    void refreshCounts();
    const handleUpdate = () => void refreshCounts();

    window.addEventListener("ctms:task-updated", handleUpdate);
    window.addEventListener("ctms:tasks-updated", handleUpdate);
    window.addEventListener("stackdrove:task-updated", handleUpdate);
    window.addEventListener("ctms:checklist-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("ctms:task-updated", handleUpdate);
      window.removeEventListener("ctms:tasks-updated", handleUpdate);
      window.removeEventListener("stackdrove:task-updated", handleUpdate);
      window.removeEventListener("ctms:checklist-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshCounts, pathname, activeRole]);

  const resolveItemBadge = useCallback(
    (item: NavItemConfig): string | undefined => {
      if (item.id === "delegatee") {
        return liveCounts.delegatee !== undefined && liveCounts.delegatee > 0
          ? String(liveCounts.delegatee)
          : undefined;
      }
      if (item.id === "checklist") {
        return liveCounts.checklist !== undefined && liveCounts.checklist > 0
          ? String(liveCounts.checklist)
          : undefined;
      }
      if (item.id === "verify") {
        return liveCounts.verify !== undefined && liveCounts.verify > 0
          ? String(liveCounts.verify)
          : undefined;
      }
      if (item.id === "team_roles") {
        return liveCounts.team_roles !== undefined && liveCounts.team_roles > 0
          ? String(liveCounts.team_roles)
          : undefined;
      }
      return item.badge;
    },
    [liveCounts]
  );

  // Robust active item matching: exact match precedence prevents sibling routes
  // (e.g. /tasks vs /tasks/create) from both being highlighted at the same time.
  const isItemActive = useCallback(
    (itemOrHref: NavItemConfig | string, sec?: NavSectionConfig): boolean => {
      if (!pathname) return false;

      const targetHref = typeof itemOrHref === "string" ? itemOrHref : itemOrHref.href;
      const section = sec || currentSectionConfig;

      // Special handling for tabbed routes (e.g. /settings?tab=organization)
      if (targetHref.includes("?tab=")) {
        if (pathname !== "/settings") return false;
        const targetTab = targetHref.split("?tab=")[1];
        const searchStr = typeof window !== "undefined" ? window.location.search : currentSearch;
        const activeTab = new URLSearchParams(searchStr).get("tab") || "organization";
        return targetTab === activeTab;
      }

      // 1. Strict exact match wins unconditionally
      if (pathname === targetHref) {
        return true;
      }

      // 2. If another item in the same section matches pathname EXACTLY,
      // this item cannot be active (prevents /tasks being highlighted when on /tasks/create)
      const hasExactMatchInSameSection = section.items.some(
        (other) => other.href === pathname
      );
      if (hasExactMatchInSameSection) {
        return false;
      }

      // 3. Sub-route prefix match: only if targetHref is a proper path prefix with '/'
      // e.g. /tasks/123 matches /tasks, but /tasks won't match if /tasks/create is the exact route
      if (targetHref !== "/" && pathname.startsWith(targetHref + "/")) {
        // Check if any other item in this section is a longer (more specific) prefix match
        const longerMatch = section.items.some(
          (other) =>
            other.href !== "/" &&
            other.href !== targetHref &&
            pathname.startsWith(other.href + "/") &&
            other.href.length > targetHref.length
        );
        return !longerMatch;
      }

      return false;
    },
    [pathname, currentSectionConfig, currentSearch]
  );

  const currentActiveItem =
    currentSectionConfig.items.find((item) => isItemActive(item, currentSectionConfig)) ||
    currentSectionConfig.items[0];

  const handleSectionClick = (sec: NavSectionConfig) => {
    if (activeSection === sec.id) {
      toggleSiderow();
    } else {
      setActiveSection(sec.id);
      setSiderowOpen(true);
    }
  };

  const handleLogout = () => {
    endSession();
    try {
      sessionStorage.clear();
      localStorage.removeItem("stackdrove_user_session");
    } catch {}
    notify.success("Logged Out", { description: "You have safely exited the CTMS workspace." });
    router.replace("/login");
  };

  const handleRoleChange = (newRole: RoleType) => {
    setActiveRole(newRole);
    const accessible = getAccessibleSections(newRole);
    const isCurrentStillAllowed = accessible.some((s) => s.id === activeSection);
    if (!isCurrentStillAllowed && accessible.length > 0) {
      const targetSec = accessible[0];
      setActiveSection(targetSec.id);
      router.push(getDefaultHrefForRole(targetSec, newRole));
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP DUAL-RAIL SIDEBAR                                                 */}
      {/* Strict zero horizontal overflow & clean single-toggle Apple design        */}
      {/* ========================================================================= */}
      <aside
        id="platform-dual-rail"
        className="hidden md:flex my-3 ml-3 mr-3 h-[calc(100vh-1.5rem)] sticky top-3 z-30 select-none overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-xl shadow-black/[0.03] dark:shadow-black/50"
      >
        {/* ----------------------------------------------------------------------- */}
        {/* RAIL 1: PRIMARY ICON DOCK (ROLE-FILTERED SECTIONS)                       */}
        {/* ----------------------------------------------------------------------- */}
        <div className="glass-rail-1 w-16 h-full flex flex-col justify-between items-center pb-3.5 shrink-0 z-20 overflow-hidden select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-colors">
          {/* Top Brand Logo Mark - Locked to EXACT height (h-16) to align with header grid */}
          <div className="h-16 shrink-0 flex items-center justify-center w-full">
            <Link
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-transform hover:scale-105 active:scale-95 shrink-0 overflow-hidden select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              title="StackDrove Home"
            >
              <StackDroveMark size={22} />
            </Link>
          </div>

          {/* Middle: Role-Filtered Vertical Section Icons */}
          <nav className="flex flex-col items-center gap-2 my-auto shrink-0 overflow-hidden">
            {visibleSections.map((sec) => {
              const Icon = sec.icon;
              const isSelected = activeSection === sec.id;

              return (
                <button
                  key={sec.id}
                  onClick={() => handleSectionClick(sec)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group",
                    isSelected
                      ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-md border border-black/10 scale-[1.03] dark:border-white/20"
                      : "text-[#666666] hover:text-[#111111] hover:bg-black/[0.05] dark:text-[#A3A3A3] dark:hover:text-white dark:hover:bg-white/[0.08]"
                  )}
                  title={`${sec.label} (${siderowOpen && isSelected ? "Click to collapse" : "Click to view sub-sections"})`}
                  aria-label={sec.label}
                >
                  <Icon size={18} className="transition-transform group-hover:scale-105" />

                  {/* Clean Tooltip on Hover */}
                  <div className="absolute left-full ml-3 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {sec.label}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Bottom Role Matrix Indicator with Brand Glass Theme */}
          <div className="flex flex-col items-center shrink-0 overflow-hidden">
            <div
              className="w-9 h-9 rounded-xl bg-[#111111] dark:bg-white dark:text-[#111111] text-white font-black text-xs flex items-center justify-center border border-black/10 dark:border-white/20 shadow-xs cursor-default relative group"
              title={`Role Matrix Active: ${activeRole.replace("_", " ")}`}
            >
              {activeRole === "SUPERADMIN"
                ? "SA"
                : activeRole === "COMPANY_ADMIN"
                ? "CA"
                : activeRole === "BOSS"
                ? "BO"
                : activeRole === "ADMIN"
                ? "AD"
                : activeRole === "DELEGATOR"
                ? "DL"
                : "DE"}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111111] shadow-[0_0_6px_#10B981]" />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RAIL 2: SECONDARY SIDEROW (ROLE-FILTERED UNDER-SECTIONS)                  */}
        {/* Continuous mount with hardware-accelerated fluid width & opacity curve     */}
        {/* ----------------------------------------------------------------------- */}
        <div
          className={cn(
            "glass-rail-2 h-full flex flex-col justify-between shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            siderowOpen
              ? "w-60 lg:w-64 opacity-100 pointer-events-auto"
              : "w-0 opacity-0 border-r-0 pointer-events-none"
          )}
        >
          {/* Header: Section Title - Locked to EXACT height (h-16) to equal the main header */}
          <div className="h-16 shrink-0 flex flex-col justify-center px-4 sm:px-5 border-b border-black/[0.06] dark:border-white/[0.08]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] block truncate leading-tight">
              {currentSectionConfig.shortLabel} / {currentActiveItem?.title || "Overview"}
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[#111111] dark:text-white mt-0.5 truncate leading-tight">
              {currentSectionConfig.label}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-4 space-y-1 scrollbar-thin">
            {/* Sub-sections List: Strictly Role-Filtered with smooth transition on section change */}
            <nav key={activeSection} className="space-y-1 animate-in fade-in-50 slide-in-from-left-2 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
              {currentSectionConfig.items
                .filter((item) => isItemAllowed(item, activeRole))
                .map((item) => {
                  const active = isItemActive(item, currentSectionConfig);
                  const SubIcon = item.icon;
                  const itemBadge = resolveItemBadge(item);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        if (item.href.includes("?tab=")) {
                          setCurrentSearch("?tab=" + item.href.split("?tab=")[1]);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group relative select-none",
                        active
                          ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white font-bold shadow-sm"
                          : "text-[#555555] hover:text-[#111111] hover:bg-black/[0.04] dark:text-[#A3A3A3] dark:hover:text-white dark:hover:bg-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pl-1">
                        <SubIcon
                          size={16}
                          className={cn(
                            "shrink-0 transition-colors",
                            active
                              ? "text-white dark:text-[#111111]"
                              : "text-[#666666] group-hover:text-[#111111] dark:text-[#666666] dark:group-hover:text-white"
                          )}
                        />
                        <span className={cn("truncate", active ? "text-white dark:text-[#111111] font-bold" : "")}>
                          {item.title}
                        </span>
                      </div>

                      {itemBadge && (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors backdrop-blur-md",
                            itemBadge.includes("live")
                              ? "bg-emerald-500 text-white border border-emerald-400"
                              : active
                              ? "bg-white/20 text-white dark:bg-black/15 dark:text-[#111111]"
                              : "bg-black/[0.05] dark:bg-white/10 text-[#666666] dark:text-neutral-300"
                          )}
                        >
                          {itemBadge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </nav>
          </div>

          {/* Bottom: who is signed in + one-click role switching */}
          <div className="p-3 sm:p-3.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] shrink-0">
            <RoleSwitcher activeRole={activeRole} onChange={handleRoleChange} onLogout={handleLogout} />
          </div>        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER (RESPONSIVE BACKWARD COMPATIBILITY)                         */}
      {/* ========================================================================= */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
          <div className="w-72 bg-white dark:bg-[#111111] text-[#111111] dark:text-white h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 overflow-x-hidden">
            <div className="space-y-5 overflow-y-auto overflow-x-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <StackDroveMark size={20} />
                  <span className="font-extrabold text-sm tracking-tight">StackDrove CTMS</span>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg text-[#666666] hover:text-[#111111] dark:hover:text-white"
                  title="Close sidebar"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Sections with their Sub-sections: Role-Filtered */}
              <div className="space-y-4">
                {visibleSections.map((sec) => (
                  <div key={sec.id} className="space-y-1">
                    <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-2">
                      {sec.label}
                    </div>
                    {sec.items
                      .filter((item) => isItemAllowed(item, activeRole))
                      .map((item) => {
                        const active = isItemActive(item, sec);
                        const SubIcon = item.icon;
                        const itemBadge = resolveItemBadge(item);
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => {
                              toggleSidebar();
                              if (item.href.includes("?tab=")) {
                                setCurrentSearch("?tab=" + item.href.split("?tab=")[1]);
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors",
                              active
                                ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white font-bold"
                                : "text-[#666666] dark:text-[#A3A3A3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <SubIcon size={15} className={active ? "text-white dark:text-[#111111]" : ""} />
                              <span className={active ? "text-white dark:text-[#111111] font-bold" : ""}>{item.title}</span>
                            </div>
                            {itemBadge && (
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                  active
                                    ? "bg-white/20 text-white dark:bg-black/15 dark:text-[#111111]"
                                    : "bg-black/[0.05] dark:bg-white/10"
                                )}
                              >
                                {itemBadge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: who is signed in + role switching */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              <RoleSwitcher
                activeRole={activeRole}
                onChange={handleRoleChange}
                onLogout={() => {
                  toggleSidebar();
                  handleLogout();
                }}
                onNavigate={toggleSidebar}
              />
            </div>
          </div>          <div className="flex-1" onClick={toggleSidebar} />
        </div>
      )}
    </>
  );
}
