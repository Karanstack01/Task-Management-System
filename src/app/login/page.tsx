"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Flame,
  Clock,
  CheckCircle2,
  Sparkles,
  Calendar,
  Award,
  UserCheck,
  Loader2,
  Sun,
  Moon,
  Laptop,
  Layers,
  ShieldCheck,
  Check,
  AlertTriangle,
  FileCheck2,
  Link2,
  MessageSquare,
  Building2,
  TrendingUp,
  Bell,
  Kanban,
  RotateCw,
} from "lucide-react";
import { useUIStore, RoleType } from "@/lib/store/ui-store";
import { resolveSignIn, signInWithPassword, signOutEverywhere, startOAuth, isProviderEnabled, type OAuthProviderId } from "@/lib/auth/sign-in";
import { notify } from "@/lib/notifications/toast-service";
import {
  getThemePreference,
  setThemePreference,
  ThemePreference,
} from "@/lib/theme/theme-service";
import { AnimatedStatusBadge } from "@/components/common/animated-status-badge";

/**
 * Authentic Official Google 'G' Multi-Color SVG
 */
function GoogleLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/**
 * Authentic Official Microsoft 4-Color Square SVG
 */
function MicrosoftLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { startSession } = useUIStore();

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProviderId | null>(null);

  // Theme switcher state (light, dark, system)
  const [themePref, setThemePref] = useState<ThemePreference>("system");

  // Track hover state for pausing ongoing moving stream
  const [isPaused, setIsPaused] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState<number | null>(null);

  useEffect(() => {
    setThemePref(getThemePreference());
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ preference: ThemePreference }>;
      if (customEvent.detail?.preference) {
        setThemePref(customEvent.detail.preference);
      }
    };
    window.addEventListener("stackdrove:theme-change", handler);
    return () => window.removeEventListener("stackdrove:theme-change", handler);
  }, []);

  const handleThemeChange = (pref: ThemePreference) => {
    setThemePref(pref);
    setThemePreference(pref);
  };

  const routeForRole = (role: RoleType) => {
    if (role === "SUPERADMIN") return "/superadmin";
    if (role === "COMPANY_ADMIN") return "/company-admin";
    if (role === "ADMIN") return "/admin";
    if (role === "BOSS") return "/boss";
    if (role === "DELEGATOR") return "/delegator";
    return "/delegatee";
  };

  /** Where to go after sign-in: the page the proxy bounced us from, else the role's home. */
  const destinationFor = (role: RoleType) => {
    try {
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    } catch {}
    return routeForRole(role);
  };

  /** Finishes a verified sign-in: maps the email to a workspace user and opens their home page. */
  const finishSignIn = async (email: string, via: string): Promise<boolean> => {
    const result = await resolveSignIn(email);
    switch (result.status) {
      case "no_profile":
        await signOutEverywhere();
        notify.error("No workspace access", {
          description: `${email} has not been added to any company yet. Ask your administrator to add this email.`,
        });
        return false;
      case "inactive":
        await signOutEverywhere();
        notify.error("Account Deactivated", {
          description: "Your account has been deactivated. Contact your workspace administrator.",
        });
        return false;
      case "workspace_missing":
        await signOutEverywhere();
        notify.error("Workspace Not Found", { description: "Your organization could not be loaded." });
        return false;
      case "blocked":
        await signOutEverywhere();
        notify.error("Workspace unavailable", { description: "Redirecting to subscription lock screen..." });
        router.push(
          `/saas-expired?org=${encodeURIComponent(result.orgName)}&reason=${encodeURIComponent(result.reason)}`
        );
        return false;
      case "ok":
        startSession(result.user.id, result.user.role);
        notify.success(`Welcome back, ${result.user.full_name}!`, {
          description: `Signed in ${via} as ${result.user.role}`,
        });
        router.push(destinationFor(result.user.role));
        return true;
    }
  };

  // Show errors sent back from the Google / Microsoft callback.
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) notify.error("Sign-in failed", { description: err });
  }, []);

  // Google & Microsoft sign-in: real OAuth through Supabase Auth (redirects away, returns via /auth/callback)
  const handleOAuthLogin = async (provider: OAuthProviderId) => {
    const label = provider === "google" ? "Google" : "Microsoft";
    setOauthProvider(provider);
    setLoading(true);
    try {
      if (!(await isProviderEnabled(provider))) {
        notify.error(`${label} sign-in is not enabled`, {
          description: `Turn on the ${label} provider in Supabase → Authentication → Providers (see SUPABASE_SETUP.md).`,
        });
        return;
      }
      const { error } = await startOAuth(provider);
      if (error) {
        notify.error(`${label} sign-in failed`, { description: error });
        return;
      }
      return; // browser is redirecting to the provider
    } catch {
      notify.error("Single Sign-On Failed", { description: "Could not reach the identity provider." });
    } finally {
      // Keep the spinner while the redirect happens; clear it only on failure paths.
      setLoading(false);
      setOauthProvider(null);
    }
  };

  // Email + password sign-in, verified by Supabase Auth
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = identifier.trim();
    if (!email || !password) {
      notify.warning("Email and password required", { description: "Enter your email and password to continue." });
      return;
    }

    setLoading(true);
    try {
      const { email: verified, error } = await signInWithPassword(email, password);
      if (error || !verified) {
        notify.error("Sign-in failed", {
          description: error === "Invalid login credentials" ? "Incorrect email or password." : error || "Could not sign in.",
        });
        return;
      }
      await finishSignIn(verified, "with password");
    } finally {
      setLoading(false);
    }
  };
  /**
   * Sequence of 6 Ongoing Action Elements Requested by User:
   * 1. card view
   * 2. notification
   * 3. tasks
   * 4. employee
   * 5. kanban
   * 6. top performars
   */
  const movingActionElements = [
    // 1. CARD VIEW: Task Card with Wireframe & Priority
    {
      id: "elem-card-view",
      title: "Card View",
      icon: <Layers size={13} className="text-blue-400" />,
      floatClass: "animate-float-a",
      content: (
        <div className="w-[335px] shrink-0 p-4.5 rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.18] shadow-2xl space-y-3.5 group hover:border-white/35 transition-all text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link2 size={12} className="text-blue-400" />
              <span className="font-mono text-[11px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                WEB - 145
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE4E2] text-[#D92D20] border border-[#FECDCA]/80">
                <Flame size={11} className="animate-pulse" /> P Urgent
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-neutral-400 bg-neutral-500/15 px-2 py-0.5 rounded-full border border-neutral-500/20">
              20 pts
            </span>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-white leading-snug">
              Zentro SaaS Landing Page Design
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
              Creating Full Homepage, Pricing Table & Component Library
            </p>
          </div>

          {/* Visual Deliverable Miniature Wireframe */}
          <div className="p-2.5 rounded-xl bg-black/35 border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-neutral-400">
              <span>Card Deliverable Progress</span>
              <span className="text-blue-400 font-bold">85% Complete</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-[85%]" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="inline-flex items-center gap-1 text-[11px] text-neutral-300 font-medium">
              <Calendar size={12} className="text-neutral-400" />
              <span>Due: May 12, 2026</span>
            </div>
            <AnimatedStatusBadge status="in_progress" label="In Progress" size="sm" />
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08] text-[11px]">
            <div className="flex items-center -space-x-1.5">
              <div className="w-5 h-5 rounded-full ring-2 ring-[#0A0A0A] bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[8px] font-bold">
                RM
              </div>
              <div className="w-5 h-5 rounded-full ring-2 ring-[#0A0A0A] bg-gradient-to-tr from-neutral-500 to-teal-600 flex items-center justify-center text-white text-[8px] font-bold">
                NS
              </div>
              <div className="w-5 h-5 rounded-full ring-2 ring-[#0A0A0A] bg-purple-500/30 text-purple-300 border border-purple-400/40 flex items-center justify-center text-[8px] font-bold">
                +2
              </div>
            </div>
            <div className="flex items-center gap-2 text-neutral-400 text-[10px]">
              <span className="flex items-center gap-0.5">
                <MessageSquare size={11} /> 37
              </span>
              <span>Apr 19</span>
            </div>
          </div>
        </div>
      ),
    },

    // 2. NOTIFICATION: Real-Time Verification Alert Toast
    {
      id: "elem-notification",
      title: "Notification",
      icon: <Bell size={13} className="text-neutral-400" />,
      floatClass: "animate-float-b",
      content: (
        <div className="w-[335px] shrink-0 p-4.5 rounded-2xl bg-gradient-to-br from-neutral-950/40 via-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-neutral-500/30 shadow-2xl space-y-3 group hover:border-neutral-400/50 transition-all text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-neutral-500/20 text-neutral-400 border border-neutral-500/40 shadow-xs">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-40"></span>
                <CheckCircle2 size={15} />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">
                  Live Verification
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">Just now • Synchronized</span>
              </div>
            </div>

            <AnimatedStatusBadge status="ready" label="Verified" size="sm" />
          </div>

          <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
            <div className="text-xs font-bold text-white leading-snug">
              Task #145 Deliverables Approved
            </div>
            <p className="text-[11px] text-neutral-300 mt-1">
              Rajesh Mehta approved deliverables. +20 SLA points credited to Rohan Mehta.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-300">
            <span className="text-neutral-400 font-semibold flex items-center gap-1">
              <Sparkles size={11} />
              SLA Score Synced
            </span>
            <span className="font-mono text-neutral-300 font-bold">+20 pts</span>
          </div>
        </div>
      ),
    },

    // 3. TASKS: Active Delegated Task with Countdown Clock
    {
      id: "elem-tasks",
      title: "Tasks",
      icon: <Clock size={13} className="text-neutral-400" />,
      floatClass: "animate-float-a",
      content: (
        <div className="w-[335px] shrink-0 p-4.5 rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.18] shadow-2xl space-y-3.5 group hover:border-white/35 transition-all text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold text-neutral-300 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                TECH - 1002
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEEEEE] text-[#333333] border border-[#EEEEEE]/80">
                P High
              </span>
            </div>
            <span className="text-[10px] font-bold text-neutral-400 bg-neutral-500/15 border border-neutral-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock size={11} className="animate-spin" />
              Under Review
            </span>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-white leading-snug">
              Supabase Postgres Database Migration
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
              Migrating 40-column Google Sheet tasks into partitioned tables
            </p>
          </div>

          {/* Active SLA Countdown Timer */}
          <div className="p-2.5 rounded-xl bg-neutral-500/10 border border-neutral-500/20 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
              <Clock size={12} className="text-neutral-400" />
              SLA Review Window
            </span>
            <span className="font-mono font-black text-neutral-200 text-xs">
              03h : 24m : 18s
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[11px]">
            <div className="flex items-center gap-1.5 text-neutral-300">
              <UserCheck size={12} className="text-neutral-400" />
              <span>Ananya Patel</span>
            </div>
            <span className="text-purple-300 font-bold text-[10px]">
              Delegated by Amit (Boss)
            </span>
          </div>
        </div>
      ),
    },

    // 4. EMPLOYEE: Employee Profile Scorecard
    {
      id: "elem-employee",
      title: "Employee",
      icon: <UserCheck size={13} className="text-indigo-400" />,
      floatClass: "animate-float-b",
      content: (
        <div className="w-[335px] shrink-0 p-4.5 rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.18] shadow-2xl space-y-3.5 group hover:border-white/35 transition-all text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
                  RM
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-neutral-500 border-2 border-[#0A0A0A] rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">Rohan Mehta</h4>
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    DELEGATEE
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">Web Platforms (WEB)</p>
              </div>
            </div>

            <AnimatedStatusBadge status="ready" label="Certified" size="sm" />
          </div>

          {/* Main Score Metrics */}
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                SLA Accuracy
              </span>
              <div className="text-2xl font-black text-white">98.4%</div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-md bg-neutral-500/20 text-neutral-300 text-[10px] font-extrabold border border-neutral-500/30">
                Tier 1 Assignee
              </span>
              <div className="text-[10px] text-neutral-400 mt-1">Top 2% Org Rank</div>
            </div>
          </div>

          {/* 3 Metric Badges */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <div className="font-bold text-white">24 Done</div>
              <div className="text-[9px] text-neutral-400">On-Time</div>
            </div>
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <div className="font-bold text-neutral-400">0 Overdue</div>
              <div className="text-[9px] text-neutral-400">SLA 100%</div>
            </div>
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <div className="font-bold text-neutral-300">+140 Pts</div>
              <div className="text-[9px] text-neutral-400">Points</div>
            </div>
          </div>
        </div>
      ),
    },

    // 5. KANBAN: Mini Kanban Board with Status Columns
    {
      id: "elem-kanban",
      title: "Kanban",
      icon: <Kanban size={13} className="text-sky-400" />,
      floatClass: "animate-float-a",
      content: (
        <div className="w-[335px] shrink-0 p-4.5 rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.18] shadow-2xl space-y-3 group hover:border-white/35 transition-all text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/25">
                KANBAN BOARD
              </span>
              <span className="text-xs font-bold text-white">Live Status</span>
            </div>
            <AnimatedStatusBadge status="in_progress" label="Active" size="sm" />
          </div>

          {/* 3 Mini Columns */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {/* Column 1: Queued */}
            <div className="p-2 rounded-xl bg-black/35 border border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-bold text-neutral-400 uppercase">
                <span>Queued</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[9px] font-semibold text-white">
                WEB - 87
                <div className="text-[8px] text-neutral-400 truncate">Amary Store</div>
              </div>
            </div>

            {/* Column 2: Active */}
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/25 space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-bold text-blue-300 uppercase">
                <span>Active</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              </div>
              <div className="p-1.5 rounded-lg bg-blue-600/25 border border-blue-400/35 text-[9px] font-bold text-white shadow-xs">
                MOB - 78
                <div className="text-[8px] text-blue-200 truncate">Paynix App</div>
              </div>
            </div>

            {/* Column 3: Done */}
            <div className="p-2 rounded-xl bg-neutral-500/15 border border-neutral-500/25 space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-bold text-neutral-300 uppercase">
                <span>Done</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              </div>
              <div className="p-1.5 rounded-lg bg-neutral-600/25 border border-neutral-400/35 text-[9px] font-bold text-white">
                FIN - 1001
                <div className="text-[8px] text-neutral-200 truncate">Audit Pass</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[10px] text-neutral-400">
            <span>Fluid drag-and-drop state sync</span>
            <span className="text-neutral-400 font-bold">100% Synced</span>
          </div>
        </div>
      ),
    },

    // 6. TOP PERFORMERS: Leaderboard Podium
    {
      id: "elem-performers",
      title: "Top Performers",
      icon: <Award size={13} className="text-neutral-400" />,
      floatClass: "animate-float-b",
      content: (
        <div className="w-[335px] shrink-0 p-4.5 rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.18] shadow-2xl space-y-3 group hover:border-white/35 transition-all text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Award size={14} className="text-neutral-400" />
              <span className="text-xs font-bold text-white">Top Performers</span>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-neutral-300 bg-neutral-500/20 border border-neutral-500/30 px-2 py-0.5 rounded-full">
              Podium
            </span>
          </div>

          {/* 3 Ranked Rows */}
          <div className="space-y-1.5">
            {/* #1 Rohan Mehta */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-neutral-500/15 via-white/[0.04] to-transparent border border-neutral-500/30">
              <div className="flex items-center gap-2">
                <span className="w-4 text-[11px] font-black text-neutral-400">1</span>
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 ring-1 ring-neutral-400 text-[8px] font-bold flex items-center justify-center text-white">
                  RM
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">Rohan Mehta</div>
                  <div className="text-[9px] text-neutral-400">Web Platforms</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-neutral-300 font-mono">98.4%</span>
                <div className="text-[9px] text-neutral-400 font-semibold">+140 pts</div>
              </div>
            </div>

            {/* #2 Ananya Patel */}
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-4 text-[11px] font-bold text-neutral-400">2</span>
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-pink-600 text-[8px] font-bold flex items-center justify-center text-white">
                  AP
                </div>
                <div className="text-[10px] font-semibold text-neutral-200">Ananya Patel</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-white font-mono">97.8%</span>
                <div className="text-[9px] text-neutral-400">+125 pts</div>
              </div>
            </div>

            {/* #3 Neha Sharma */}
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-4 text-[11px] font-bold text-neutral-400">3</span>
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-neutral-500 to-teal-600 text-[8px] font-bold flex items-center justify-center text-white">
                  NS
                </div>
                <div className="text-[10px] font-semibold text-neutral-200">Neha Sharma</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-white font-mono">96.5%</span>
                <div className="text-[9px] text-neutral-400">+110 pts</div>
              </div>
            </div>
          </div>

          <div className="pt-1 text-[10px] text-neutral-400 flex items-center justify-between border-t border-white/[0.08]">
            <span>Compliance Rate: 99.2%</span>
            <span className="text-neutral-300 font-bold">Q4 Cycle</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F1F1F1] dark:bg-[#0A0A0A] text-[#111111] dark:text-white select-none overflow-hidden">
      {/* =========================================================================
          LEFT SIDE: Ongoing Moving Action Elements
          Sequence: Card View -> Notification -> Tasks -> Employee -> Kanban -> Top Performers
          ========================================================================= */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          setSpotlightIndex(null);
        }}
        className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 xl:p-14 overflow-hidden bg-[#0A0A0A] text-white"
      >
        {/* Specular Ambient Gradient Lighting */}
        <div className="absolute -top-36 -left-36 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-brand/20 via-blue-700/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-36 -right-36 w-[450px] h-[450px] rounded-full bg-gradient-to-tl from-brand/10 via-neutral-600/10 to-transparent blur-3xl pointer-events-none" />

        {/* Top Header: Official StackDrove Brand Logo from Brand Folder */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/login" className="inline-block transition-transform hover:scale-[1.02] active:scale-95">
            <img
              src="/sd/stackdrove-logo-dark.svg"
              alt="StackDrove"
              className="h-8 xl:h-9 w-auto object-contain select-none pointer-events-none"
            />
          </Link>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500"></span>
            </span>
            <span className="text-[11px] font-mono tracking-wider text-neutral-400 uppercase">
              Ongoing Action Engine
            </span>
          </div>
        </div>

        {/* Middle Section: Typography + Ongoing Moving Action Elements Stream */}
        <div className="relative z-10 my-auto py-6 space-y-6">
          {/* Header Typography */}
          <div className="space-y-2 max-w-xl">
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              Real-Time Task Governance. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
                In Continuous Motion.
              </span>
            </h1>
            <p className="text-xs xl:text-sm text-neutral-400 font-normal leading-relaxed max-w-md">
              Live moving stream of active task cards, instant notifications, team assignments, employee scorecards, kanban movements, and top performers.
            </p>
          </div>

          {/* Quick-Jump Action Sequence Navigation Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.05] border border-white/[0.1] backdrop-blur-md w-fit">
            {movingActionElements.map((elem, idx) => (
              <button
                key={elem.id}
                type="button"
                onClick={() => setSpotlightIndex(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  spotlightIndex === idx
                    ? "bg-white text-[#111111] shadow-md scale-105"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>{elem.icon}</span>
                <span className="hidden sm:inline">{elem.title}</span>
              </button>
            ))}
          </div>

          {/* Spotlighted Selected Element OR Ongoing Moving Action Stream */}
          {spotlightIndex !== null ? (
            /* User clicked a pill to spotlight a single element */
            <div className="relative pt-2 animate-in fade-in-50 zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-400 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Spotlighted View: {movingActionElements[spotlightIndex].title}
                </span>
                <button
                  type="button"
                  onClick={() => setSpotlightIndex(null)}
                  className="text-xs text-blue-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                >
                  <span>Resume Stream</span>
                  <RotateCw size={11} />
                </button>
              </div>
              <div>{movingActionElements[spotlightIndex].content}</div>
            </div>
          ) : (
            /* Continuous Ongoing Moving Stream */
            <div className="relative w-full overflow-hidden py-3 -mx-10 xl:-mx-14 px-10 xl:px-14">
              {/* Fade Edges for Smooth Horizon Exit */}
              <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none" />

              {/* Continuous Ticker Track with All 6 Sequence Elements */}
              <div
                className={`animate-login-ticker gap-4 flex items-center ${
                  isPaused ? "[animation-play-state:paused]" : ""
                }`}
              >
                {/* First Pass (Sequence: 1 to 6) */}
                {movingActionElements.map((elem) => (
                  <div key={elem.id} className={elem.floatClass}>
                    {elem.content}
                  </div>
                ))}

                {/* Duplicate Pass for Seamless Infinite Loop */}
                {movingActionElements.map((elem) => (
                  <div key={`dup-${elem.id}`} className={elem.floatClass}>
                    {elem.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Copyright */}
        <div className="relative z-10 text-xs text-neutral-500 font-normal pt-4">
          © 2026 StackDrove, Inc. All rights reserved.
        </div>
      </div>

      {/* =========================================================================
          RIGHT SIDE: High-Contrast Minimal Login Form
          (Light/Dark/System Switcher, Google & Microsoft SSO, Clean Minimal Fields)
          ========================================================================= */}
      <div className="flex flex-col justify-between items-center w-full lg:w-1/2 min-h-screen px-6 sm:px-12 py-8 bg-white dark:bg-[#0B0B0E]">
        {/* Top Header: Logo on Mobile + Theme Switcher (Light / Dark / System) */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="lg:hidden flex items-center">
            <img
              src="/sd/stackdrove-logo-light.svg"
              alt="StackDrove"
              className="h-7 w-auto object-contain dark:hidden select-none pointer-events-none"
            />
            <img
              src="/sd/stackdrove-logo-dark.svg"
              alt="StackDrove"
              className="h-7 w-auto object-contain hidden dark:block select-none pointer-events-none"
            />
          </div>
          <div className="hidden lg:block" />

          {/* Apple-Style Theme Switcher: Light | Dark | System */}
          <div className="flex items-center p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] text-xs">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              title="Light Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                themePref === "light"
                  ? "bg-white text-[#111111] shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Sun size={12} />
              <span className="hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              title="Dark Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                themePref === "dark"
                  ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Moon size={12} />
              <span className="hidden sm:inline">Dark</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("system")}
              title="System Preference"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                themePref === "system"
                  ? "bg-white dark:bg-white/20 text-[#111111] dark:text-white shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Laptop size={12} />
              <span className="hidden sm:inline">System</span>
            </button>
          </div>
        </div>

        {/* Center Container: Minimal Clean Form */}
        <div className="w-full max-w-[400px] my-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] dark:text-white">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] dark:text-neutral-400">
              Sign in to continue.
            </p>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or username field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111111] dark:text-neutral-300 block">
                Email or username
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or username"
                  required
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-sm text-[#111111] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111111] dark:text-neutral-300 block">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-sm text-[#111111] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#111111] dark:text-neutral-300 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-[#111111] focus:ring-0 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  notify.info("Password Recovery", {
                    description: "Please contact your workspace administrator to reset credentials.",
                  })
                }
                className="font-semibold text-[#111111] dark:text-white hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Action Button (Sign in) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#111111] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#111111] dark:hover:bg-neutral-100 font-bold text-sm tracking-wide transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 mt-2"
            >
              {loading && !oauthProvider ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider: Or continue with */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-[#0B0B0E] px-3 text-[#666666] dark:text-neutral-400 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google & Microsoft SSO Options Only */}
          <div className="space-y-2.5">
            {/* Continue with Google */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuthLogin("google")}
              className="w-full h-11 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-white/[0.05] text-[#111111] dark:text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              {loading && oauthProvider === "google" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <GoogleLogo className="w-4 h-4" />
              )}
              <span>Continue with Google</span>
            </button>

            {/* Continue with Microsoft */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuthLogin("microsoft")}
              className="w-full h-11 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-white/[0.05] text-[#111111] dark:text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              {loading && oauthProvider === "microsoft" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MicrosoftLogo className="w-4 h-4" />
              )}
              <span>Continue with Microsoft</span>
            </button>
          </div>
        </div>

        {/* Footer Legal Links */}
        <div className="flex items-center justify-center gap-6 text-xs text-neutral-400 font-medium pt-8">
          <Link
            href="/terms"
            className="hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
          >
            Privacy
          </Link>
          <Link
            href="/support"
            className="hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
          >
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
