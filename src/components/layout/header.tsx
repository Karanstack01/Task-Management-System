"use client";

import React, { useState, useEffect, useRef, Suspense, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Menu,
  PanelLeft,
  HelpCircle,
  X,
  Keyboard,
  BookOpen,
  Mail,
  Check,
  ExternalLink,
  LogOut,
  Settings,
} from "lucide-react";
import { useUIStore, RoleType } from "@/lib/store/ui-store";
import { NAV_SECTIONS } from "@/lib/navigation/navigation-config";
import { getCurrentTheme, setThemePreferenceAnimated } from "@/lib/theme/theme-service";
import { NotificationPopover } from "@/components/notifications/notification-popover";
import { ThemeSwitcher } from "./theme-switcher";
import { SearchModal } from "@/components/common/search-modal";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { notify } from "@/lib/notifications/toast-service";

const subscribeNoop = () => () => {};

function ActiveSectionLabelContent({ activeSection }: { activeSection: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname.startsWith("/settings")) {
    const tab = searchParams?.get("tab") || "organization";
    switch (tab) {
      case "organization":
        return <>ORGANIZATION</>;
      case "team_roles":
        return <>TEAM &amp; ROLES</>;
      case "notifications":
        return <>NOTIFICATIONS</>;
      case "integrations":
        return <>INTEGRATIONS</>;
      case "sla_automation":
        return <>AI &amp; AUTOMATION</>;
      case "billing":
        return <>BILLING</>;
      case "security":
        return <>SECURITY</>;
      case "audit_logs":
        return <>AUDIT LOGS</>;
      default:
        return <>SETTINGS</>;
    }
  }
  if (pathname.startsWith("/superadmin")) return <>PLATFORM / SUPERADMIN</>;
  if (pathname.startsWith("/company-admin")) return <>PLATFORM / COMPANY ADMIN</>;
  if (pathname.startsWith("/admin")) return <>PLATFORM / ADMIN CONSOLE</>;
  if (pathname.startsWith("/tasks/create")) return <>TASK ACTIONS / CREATE</>;
  if (pathname.startsWith("/tasks")) return <>TASK ACTIONS / KANBAN &amp; CARDS</>;
  if (pathname.startsWith("/verify")) return <>TASK ACTIONS / VERIFICATION</>;
  if (pathname.startsWith("/recurring")) return <>TASK ACTIONS / RECURRING</>;
  if (pathname.startsWith("/dashboard")) return <>INSIGHTS / DASHBOARD</>;
  if (pathname.startsWith("/scorecards")) return <>INSIGHTS / SCORECARDS</>;
  if (pathname.startsWith("/boss")) return <>WORKSPACES / EXECUTIVE</>;
  if (pathname.startsWith("/delegator")) return <>WORKSPACES / DELEGATOR</>;
  if (pathname.startsWith("/delegatee")) return <>WORKSPACES / MY TASKS</>;
  if (pathname.startsWith("/checklist")) return <>WORKSPACES / DAILY CHECKLIST</>;

  const currentSec = NAV_SECTIONS.find((s) => s.id === activeSection);
  return <>{currentSec ? currentSec.label.toUpperCase() : "CTMS"}</>;
}

function SectionLabelFallback({ activeSection }: { activeSection: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/settings")) return <>SETTINGS</>;
  if (pathname.startsWith("/superadmin")) return <>PLATFORM / SUPERADMIN</>;
  if (pathname.startsWith("/company-admin")) return <>PLATFORM / COMPANY ADMIN</>;
  if (pathname.startsWith("/admin")) return <>PLATFORM / ADMIN CONSOLE</>;
  if (pathname.startsWith("/tasks/create")) return <>TASK ACTIONS / CREATE</>;
  if (pathname.startsWith("/tasks")) return <>TASK ACTIONS / KANBAN &amp; CARDS</>;
  if (pathname.startsWith("/verify")) return <>TASK ACTIONS / VERIFICATION</>;
  if (pathname.startsWith("/recurring")) return <>TASK ACTIONS / RECURRING</>;
  if (pathname.startsWith("/dashboard")) return <>INSIGHTS / DASHBOARD</>;
  if (pathname.startsWith("/scorecards")) return <>INSIGHTS / SCORECARDS</>;
  if (pathname.startsWith("/boss")) return <>WORKSPACES / EXECUTIVE</>;
  if (pathname.startsWith("/delegator")) return <>WORKSPACES / DELEGATOR</>;
  if (pathname.startsWith("/delegatee")) return <>WORKSPACES / MY TASKS</>;
  if (pathname.startsWith("/checklist")) return <>WORKSPACES / DAILY CHECKLIST</>;

  const currentSec = NAV_SECTIONS.find((s) => s.id === activeSection);
  return <>{currentSec ? currentSec.label.toUpperCase() : "CTMS"}</>;
}

export function Header() {
  const router = useRouter();
  const {
    activeRole,
    setActiveRole,
    endSession,
    toggleSidebar,
    siderowOpen,
    toggleSiderow,
    activeSection,
  } = useUIStore();


  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  // false while server-rendering / hydrating, true afterwards (portals can only render on the client)
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const helpRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [helpCoords, setHelpCoords] = useState<{ top: number; right: number }>({ top: 60, right: 16 });
  const [profileCoords, setProfileCoords] = useState<{ top: number; right: number }>({ top: 60, right: 16 });


  const updateHelpCoords = () => {
    if (helpButtonRef.current) {
      const rect = helpButtonRef.current.getBoundingClientRect();
      setHelpCoords({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right - 10),
      });
    }
  };

  const updateProfileCoords = () => {
    if (profileButtonRef.current) {
      const rect = profileButtonRef.current.getBoundingClientRect();
      setProfileCoords({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right - 10),
      });
    }
  };

  useEffect(() => {
    if (showHelp) {
      updateHelpCoords();
      window.addEventListener("resize", updateHelpCoords);
      window.addEventListener("scroll", updateHelpCoords, true);
      return () => {
        window.removeEventListener("resize", updateHelpCoords);
        window.removeEventListener("scroll", updateHelpCoords, true);
      };
    }
  }, [showHelp]);

  useEffect(() => {
    if (showProfile) {
      updateProfileCoords();
      window.addEventListener("resize", updateProfileCoords);
      window.addEventListener("scroll", updateProfileCoords, true);
      return () => {
        window.removeEventListener("resize", updateProfileCoords);
        window.removeEventListener("scroll", updateProfileCoords, true);
      };
    }
  }, [showProfile]);

  // Keyboard shortcut listener: Ctrl+\ for siderow, ? for help, Ctrl+Shift+D for theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        toggleSiderow();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "L" || e.key === "d" || e.key === "l")) {
        e.preventDefault();
        setThemePreferenceAnimated(getCurrentTheme() === "dark" ? "light" : "dark");
      }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowHelp(false);
        setShowProfile(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSiderow]);

  // Click outside listener for modals
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    if (showHelp || showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHelp, showProfile]);

  return (
    <header className="glass-header mt-3 mr-3 ml-3 md:ml-0 h-16 shrink-0 relative z-40 flex items-center justify-between px-4 sm:px-6 select-none transition-colors rounded-2xl overflow-hidden shadow-xl shadow-black/[0.03] dark:shadow-black/50">
      {/* ------------------------------------------------------------------- */}
      {/* Left: Mobile Toggle, Desktop Siderow Toggle, Uppercase Section Pill */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Toggle */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#111111] dark:text-white transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>

        {/* Desktop Split-Panel Toggle Button */}
        <button
          onClick={toggleSiderow}
          className="hidden md:flex p-1.5 rounded-lg text-[#86868B] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          title={siderowOpen ? "Hide sub-sidebar (Ctrl+\\)" : "Show sub-sidebar (Ctrl+\\)"}
          aria-label="Toggle sub-sidebar"
        >
          <PanelLeft size={16} />
        </button>

        {/* Uppercase Active Section Indicator (Matches user screenshot: 'ORGANIZATION') */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-bold tracking-wider text-[#86868B] dark:text-[#A1A1A6] uppercase px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08] backdrop-blur-md">
            <Suspense fallback={<SectionLabelFallback activeSection={activeSection} />}>
              <ActiveSectionLabelContent activeSection={activeSection} />
            </Suspense>
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Center: Global Search Bar Trigger (Replaced with SearchModal)       */}
      {/* ------------------------------------------------------------------- */}
      <div className="hidden sm:flex items-center justify-center relative shrink-0">
        <button
          type="button"
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#86868B] dark:text-[#A1A1A6] transition-all cursor-pointer w-44 sm:w-52 md:w-56 lg:w-60 justify-between shadow-xs hover:shadow-sm group select-none shrink-0"
        >
          <div className="flex items-center gap-2 truncate">
            <MagnifyingGlass className="w-3.5 h-3.5 text-[#86868B] group-hover:text-[#111111] dark:group-hover:text-white transition-colors shrink-0" />
            <span className="font-medium text-[#111111]/75 dark:text-white/75 truncate">Search CTMS...</span>
          </div>
          <kbd className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-black/[0.05] dark:bg-white/[0.08] text-[#86868B] dark:text-[#A1A1A6] shrink-0 border border-black/[0.04] dark:border-white/[0.06]">
            <span>⌘</span>K
          </kbd>
        </button>

        <SearchModal
          modal={true}
          open={searchModalOpen}
          onOpenChange={setSearchModalOpen}
          hotkey="k"
        />
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Right Utility Actions: Theme Toggle, Notifications, Help, Avatar    */}
      {/* (Exact replication from media_1793777075431_a617abfb.png)            */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 sm:gap-2 relative">
        {/* Theme: Light / System / Dark (System follows the device live) */}
        <ThemeSwitcher />

        {/* Rich CTMS Notifications Popover */}
        <NotificationPopover />

        {/* Platform Help & Shortcuts Icon */}
        <div className="relative">
          <button
            ref={helpButtonRef}
            onClick={() => setShowHelp((prev) => !prev)}
            className="p-2 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#111111] dark:text-white transition-all cursor-pointer"
            title="Help, Guidelines & Shortcuts (?)"
            aria-label="Platform Help"
          >
            <HelpCircle size={17} />
          </button>

          {/* Help Modal Popover rendered via portal into document.body */}
          {mounted && showHelp && createPortal(
            <>
              {/* Fullscreen backdrop barrier */}
              <div
                className="fixed inset-0 z-[9998] bg-black/35 dark:bg-black/60 transition-opacity animate-in fade-in duration-150"
                onClick={() => setShowHelp(false)}
                aria-hidden="true"
              />
              <div
                ref={helpRef}
                className="apple-popover fixed z-[9999] w-80 sm:w-96 p-5 rounded-2xl bg-white dark:bg-[#161618] border border-black/[0.12] dark:border-white/[0.16] shadow-2xl shadow-black/30 dark:shadow-black/90 ring-1 ring-black/[0.06] dark:ring-white/[0.08] text-[#111111] dark:text-white animate-in fade-in zoom-in-95 duration-150"
                style={{
                  top: `${helpCoords.top}px`,
                  right: `${helpCoords.right}px`,
                  backgroundColor: "var(--popover-surface, #FFFFFF)",
                  opacity: 1,
                  isolation: "isolate",
                  backdropFilter: "none",
                  WebkitBackdropFilter: "none",
                }}
              >
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                    <Keyboard size={15} />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white">
                    Platform Help &amp; Shortcuts
                  </h3>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 rounded-lg text-[#86868B] hover:text-[#111111] dark:hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="py-3 space-y-2 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#86868B]">Toggle Sub-Sidebar</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.1] font-mono text-[10px] font-bold">
                    Ctrl + \
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#86868B]">Global Search</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.1] font-mono text-[10px] font-bold">
                    Ctrl + K
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#86868B]">Toggle Theme</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.1] font-mono text-[10px] font-bold">
                    Ctrl + Shift + D
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#86868B]">Toggle Help</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.1] font-mono text-[10px] font-bold">
                    ?
                  </kbd>
                </div>
              </div>

              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
                <a
                  href="/sd/stackdrove-brand-book.pdf"
                  download
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-[#2357D6] dark:text-[#D4F20D]" />
                    <span>Download Official Brand Book</span>
                  </div>
                  <ExternalLink size={12} className="text-[#86868B]" />
                </a>

                <div className="flex items-center gap-1.5 text-[11px] text-[#86868B] px-1">
                  <Mail size={12} />
                  <span>Support: head@stackdrove.com</span>
                </div>
              </div>
            </div>
            </>,
            document.body
          )}
        </div>

        {/* User Profile Avatar (OG / SD Badge from Screenshot) */}
        <div className="relative">
          <button
            ref={profileButtonRef}
            onClick={() => setShowProfile((prev) => !prev)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white flex items-center justify-center text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer relative"
            title="Profile & Role Governance (OG)"
            aria-label="User Profile"
          >
            <span>OG</span>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161618]" />
          </button>

          {/* Profile Dropdown rendered via portal into document.body */}
          {mounted && showProfile && createPortal(
            <>
              {/* Fullscreen backdrop barrier */}
              <div
                className="fixed inset-0 z-[9998] bg-black/35 dark:bg-black/60 transition-opacity animate-in fade-in duration-150"
                onClick={() => setShowProfile(false)}
                aria-hidden="true"
              />
              <div
                ref={profileRef}
                className="apple-popover fixed z-[9999] w-64 p-4 rounded-2xl bg-white dark:bg-[#161618] border border-black/[0.12] dark:border-white/[0.16] shadow-2xl shadow-black/30 dark:shadow-black/90 ring-1 ring-black/[0.06] dark:ring-white/[0.08] text-[#111111] dark:text-white animate-in fade-in zoom-in-95 duration-150"
                style={{
                  top: `${profileCoords.top}px`,
                  right: `${profileCoords.right}px`,
                  backgroundColor: "var(--popover-surface, #FFFFFF)",
                  opacity: 1,
                  isolation: "isolate",
                  backdropFilter: "none",
                  WebkitBackdropFilter: "none",
                }}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="w-9 h-9 rounded-full bg-[#E11D48] text-white font-bold flex items-center justify-center text-sm shrink-0">
                    OG
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold truncate">Omar Galal</h4>
                    <p className="text-[11px] text-[#86868B] truncate">head@stackdrove.com</p>
                  </div>
                </div>

                <div className="py-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B] block mb-1">
                    Active Governance View
                  </span>
                  {(
                    [
                      "SUPERADMIN",
                      "COMPANY_ADMIN",
                      "ADMIN",
                      "BOSS",
                      "DELEGATOR",
                      "DELEGATEE",
                    ] as RoleType[]
                  ).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        setActiveRole(role);
                        setShowProfile(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeRole === role
                          ? "bg-black/[0.07] text-[#111111] dark:bg-white/[0.14] dark:text-white font-bold"
                          : "text-[#666666] dark:text-slate-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span>{role.replace("_", " ")}</span>
                      {activeRole === role && <Check size={12} className="text-[#111111] dark:text-white" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] space-y-1">
                  <Link
                    href="/settings?tab=organization"
                    onClick={() => setShowProfile(false)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[#111111] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                  >
                    <Settings size={14} className="text-[#86868B]" />
                    <span>Workspace Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(false);
                      endSession();
                      try {
                        sessionStorage.clear();
                        localStorage.removeItem("stackdrove_user_session");
                      } catch {}
                      notify.success("Logged Out", {
                        description: "You have safely exited the CTMS workspace.",
                      });
                      router.replace("/login");
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </header>
  );
}
