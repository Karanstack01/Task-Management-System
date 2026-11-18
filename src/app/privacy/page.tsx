"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Server,
  FileCheck,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import {
  getThemePreference,
  setThemePreference,
  ThemePreference,
} from "@/lib/theme/theme-service";

export default function PrivacyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Lock size={13} />
            <span>SOC 2 Type II & GDPR Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#666666] dark:text-neutral-400">
            Last Updated: November 2026 • Enterprise Data Governance & Information Security
          </p>
        </div>

        {/* Commitment Overview Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span>1. Enterprise Privacy Commitment</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#555555] dark:text-neutral-300 leading-relaxed font-normal">
            At StackDrove CTMS, information security and employee data sovereignty are core architectural foundations. We enforce strict multi-tenant isolation, cryptographic proof validation, and zero cross-tenant data leakage. We do not sell or monetize enterprise task metrics, delegation history, or employee performance scorecards.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[11px] font-bold text-neutral-400 uppercase">Encryption at Rest</div>
              <div className="text-xs font-semibold mt-1">AES-256 Bit Enterprise</div>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[11px] font-bold text-neutral-400 uppercase">In-Transit Security</div>
              <div className="text-xs font-semibold mt-1">TLS 1.3 Strict HTTPS</div>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[11px] font-bold text-neutral-400 uppercase">Identity Handshake</div>
              <div className="text-xs font-semibold mt-1">Google & Microsoft SSO</div>
            </div>
          </div>
        </div>

        {/* Section 2: Data Collected */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#111111] dark:text-white">
            <Database size={18} className="text-blue-500" />
            <span>2. Data Elements Governed within CTMS</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-[#555555] dark:text-neutral-300 leading-relaxed font-normal">
            <p>
              <strong>2.1 Corporate Directory Data:</strong> We store minimal profile metadata necessary for operational task assignment: Corporate Email, Full Name, Department / Section, and Assigned Role (`SUPERADMIN`, `COMPANY_ADMIN`, `ADMIN`, `BOSS`, `DELEGATOR`, `DELEGATEE`).
            </p>
            <p>
              <strong>2.2 Task Commitments & Audit Logs:</strong> System logs record the task creator, assigned delegates, target due dates, SLA score allocations, revision rejection comments, and managerial verification timestamps. These records form an immutable compliance audit trail.
            </p>
          </div>
        </div>

        {/* Section 3: Media Proofs & Cloudinary Handling */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#111111] dark:text-white">
            <Server size={18} className="text-amber-500" />
            <span>3. Cloudinary Proof Attachments & Media Isolation</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-[#555555] dark:text-neutral-300 leading-relaxed font-normal">
            <p>
              <strong>3.1 Zero Database Blobs:</strong> Media attachments (PDF briefs, verification screenshots, design files) are processed through Cloudinary signed URLs. The internal Postgres database only maintains verified HTTPS URLs, resource public IDs, and byte size metadata.
            </p>
            <p>
              <strong>3.2 Access Token Expiration:</strong> All client uploads require an ephemeral signature generated on demand. Unauthorized access to raw bucket storage is prohibited.
            </p>
          </div>
        </div>

        {/* Section 4: Performance Scorecards & Managerial Privacy */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#111111] dark:text-white">
            <Eye size={18} className="text-purple-500" />
            <span>4. Scorecard Privacy & Role-Based Access Controls (RBAC)</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-[#555555] dark:text-neutral-300 leading-relaxed font-normal">
            <p>
              Individual performance metrics, timely delivery scores, and penalty history are strictly gated according to managerial hierarchy. Delegatees can view their personal scorecards; Delegators can view their direct reports; Executives (Boss) view company-wide aggregated operational matrices.
            </p>
          </div>
        </div>

        {/* Footer Navigation Strip */}
        <div className="pt-8 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 font-medium">
          <div>© 2026 StackDrove, Inc. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-[#111111] dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="font-bold text-[#111111] dark:text-white">
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

