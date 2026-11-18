"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  Lock,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import {
  getThemePreference,
  setThemePreference,
  ThemePreference,
} from "@/lib/theme/theme-service";

export default function TermsPage() {
  const [themePref, setThemePref] = useState<ThemePreference>("system");

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

  return (
    <div className="min-h-screen bg-[#F1F1F1] dark:bg-[#0A0A0A] text-[#111111] dark:text-white transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
            <div className="h-4 w-px bg-neutral-200 dark:border-neutral-800" />
            <Link href="/login" className="flex items-center">
              <img
                src="/sd/stackdrove-logo-light.svg"
                alt="StackDrove"
                className="h-7 w-auto object-contain dark:hidden"
              />
              <img
                src="/sd/stackdrove-logo-dark.svg"
                alt="StackDrove"
                className="h-7 w-auto object-contain hidden dark:block"
              />
            </Link>
          </div>

          {/* Theme Switcher Segmented Control */}
          <div className="flex items-center p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] text-xs">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
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
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Hero Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <FileText size={13} />
            <span>CTMS Enterprise Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-[#666666] dark:text-neutral-400">
            Last Updated: November 2026 • Effective for all StackDrove CTMS Tenant Organizations
          </p>
        </div>

        {/* Legal Overview Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span>1. Scope of Service & Platform Governance</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#555555] dark:text-neutral-300 leading-relaxed font-normal">
            StackDrove CTMS (Centralized Task Management System) is an enterprise governance platform providing multi-tier operational accountability, SLA-weighted commitment delivery, cryptographic task verification, and automated managerial reporting. By accessing or provisioning accounts within StackDrove CTMS, your enterprise organization and all subordinate users agree to adhere to these terms.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[11px] font-bold text-neutral-400 uppercase">Tenant Isolation</div>
              <div className="text-xs font-semibold mt-1">100% Schema Segregation</div>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[11px] font-bold text-neutral-400 uppercase">Zero-Blob Policy</div>
              <div className="text-xs font-semibold mt-1">Cloudinary Signed Media</div>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[11px] font-bold text-neutral-400 uppercase">Audit Immutability</div>
              <div className="text-xs font-semibold mt-1">Permanent SLA Logs</div>
            </div>
          </div>
        </div>

        {/* Section 2: Task Delegation & SLA Scoring Rules */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#111111] dark:text-white">
            <Clock size={18} className="text-blue-500" />
            <span>2. Task Delegation, SLA Commitments & Scoring Rules</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-[#555555] dark:text-neutral-300 leading-relaxed font-normal">
            <p>
              <strong>2.1 Commitment Deadlines:</strong> When a Delegator assigns a deliverable with an SLA weight and Target Due Date, the Assignee (Delegatee) is legally bound within organizational parameters to submit verifiable proof before the commitment deadline expires.
            </p>
            <p>
              <strong>2.2 Automated Scoring & Penalty Deductions:</strong> Deliverables approved on or before the due date receive full score weighting (+10 to +25 points). Tasks submitted after the grace window incur systematic SLA score penalties reflected immediately across team scorecards and executive matrix reviews.
            </p>
            <p>
              <strong>2.3 Verification & Revision Rights:</strong> Delegators retain sole authority to approve, reject, or request revisions on submitted work. A rejected task re-enters the active queue and does not pause the SLA countdown.
            </p>
          </div>
        </div>

        {/* Section 3: Cloudinary Storage & File Attachment Rules */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#111111] dark:text-white">
            <Layers size={18} className="text-purple-500" />
            <span>3. Cloudinary Zero-Blob Architecture & Media Compliance</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-[#555555] dark:text-neutral-300 leading-relaxed font-normal">
            <p>
              <strong>3.1 External Media Handling:</strong> In compliance with the StackDrove Zero-Database-Blob Architecture, no binary files, documents, or video proofs are persisted in the core relational database.
            </p>
            <p>
              <strong>3.2 Secure Upload Signatures:</strong> All attachments must pass through the authorized `/api/uploads/sign` cryptographic endpoint to generate time-limited Cloudinary upload parameters. Users may not upload malicious, unapproved, or non-work-related media.
            </p>
          </div>
        </div>

        {/* Section 4: Role Permissions & Suspension */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#111111] dark:text-white">
            <Lock size={18} className="text-rose-500" />
            <span>4. RBAC Roles, Tenant Suspension & Kill-Switch</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-[#555555] dark:text-neutral-300 leading-relaxed font-normal">
            <p>
              <strong>4.1 Role Hierarchy:</strong> User accounts are bound to strictly defined roles (Superadmin, Company Admin, Operational Admin, Boss, Delegator, Delegatee). Unauthorized elevation or session manipulation is logged and grounds for immediate account termination.
            </p>
            <p>
              <strong>4.2 Subscription & Kill-Switch Enforcement:</strong> StackDrove reserves the right to engage the automated tenant lock screen (`/saas-expired`) in the event of enterprise subscription expiration, governance non-compliance, or requested executive lockdown.
            </p>
          </div>
        </div>

        {/* Footer Navigation Strip */}
        <div className="pt-8 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 font-medium">
          <div>© 2026 StackDrove, Inc. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="font-bold text-[#111111] dark:text-white">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-[#111111] dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/support" className="hover:text-[#111111] dark:hover:text-white transition-colors">
              Support Desk
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

