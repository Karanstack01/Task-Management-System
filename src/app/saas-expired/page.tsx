"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, AlertOctagon, Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { StackDroveLogo } from "@/components/brand/logo";

function SaasExpiredContent() {
  const searchParams = useSearchParams();
  const orgName = searchParams.get("org") || "Your Organization";
  const reason =
    searchParams.get("reason") ||
    "Your organization's subscription has expired or the tenant workspace was suspended via the platform management console.";

  return (
    <div className="min-h-screen ambient-glass-bg text-[#111111] dark:text-white flex flex-col justify-center items-center p-4 select-none relative overflow-hidden">
      <div className="w-full max-w-md apple-card p-8 text-center relative overflow-hidden shadow-2xl">
        {/* Brand Header */}
        <div className="flex justify-center mb-6">
          <StackDroveLogo size={36} showText={false} />
        </div>

        {/* Lockout Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-5 shadow-2xs">
          <Lock size={28} />
        </div>

        {/* Heading */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3 border border-rose-500/20">
          <AlertOctagon size={13} />
          <span>Access Restricted</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] dark:text-white mb-2">
          Workspace Suspended
        </h1>

        <p className="text-xs font-semibold text-[#666666] dark:text-neutral-400 mb-4">
          Tenant: {orgName}
        </p>

        <p className="text-sm text-[#666666] dark:text-neutral-300 leading-relaxed mb-6 font-normal">
          {reason}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href="mailto:support@stackdrove.com?subject=CTMS%20Tenant%20Subscription%20Renewal"
            className="apple-btn-primary w-full h-11 text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
          >
            <Mail size={15} />
            <span>Contact Account Executive</span>
          </a>

          <Link
            href="/login"
            className="w-full h-10 border border-black/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#111111] dark:text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Switch Organization or Log In</span>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-black/[0.05] dark:border-white/[0.06] text-[11px] text-[#666666] dark:text-neutral-400 flex items-center justify-center gap-1.5">
          <RefreshCw size={12} className="text-neutral-400" />
          <span>StackDrove SaaS Licensing & Governance Engine</span>
        </div>
      </div>
    </div>
  );
}

export default function SaasExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1B3F] text-white flex items-center justify-center text-sm font-semibold">
          Loading system status...
        </div>
      }
    >
      <SaasExpiredContent />
    </Suspense>
  );
}

