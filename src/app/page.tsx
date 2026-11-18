"use client";

import React from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Shield,
  Building2,
  Crown,
  UserCheck,
  ListTodo,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useUIStore } from "@/lib/store/ui-store";

export default function HomePage() {
  const { activeRole } = useUIStore();

  const metrics = [
    {
      title: "Total Active Tasks",
      value: "128",
      subtext: "Across 6 departments",
      icon: Briefcase,
      color: "text-brand",
      bg: "bg-[#EEEEEE]/70",
      border: "border-[#EEEEEE]",
    },
    {
      title: "Tasks In Progress",
      value: "84",
      subtext: "Assigned & under execution",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Awaiting Verification",
      value: "19",
      subtext: "Proof submitted by assignees",
      icon: CheckCircle2,
      color: "text-[#111111]",
      bg: "bg-brand/30",
      border: "border-brand/50",
    },
    {
      title: "Overdue Bottlenecks",
      value: "5",
      subtext: "Past SLA deadline",
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ];

  const portals = [
    {
      title: "Superadmin Control Hub",
      role: "SUPERADMIN",
      badge: "Platform Master",
      desc: "Whitelist corporate domains, assign subscription tiers, seat limits, and operate emergency kill switch.",
      href: "/superadmin",
      icon: Crown,
      accent: "from-brand to-[#111111]",
    },
    {
      title: "Company Admin Portal",
      role: "COMPANY_ADMIN",
      badge: "Organization Head",
      desc: "Configure Cloudinary, Microsoft 365 Email, WhatsApp API v20, and appoint operational Admins.",
      href: "/company-admin",
      icon: Building2,
      accent: "from-[#111111] to-[#333333]",
    },
    {
      title: "Operational Admin Console",
      role: "ADMIN",
      badge: "Operations",
      desc: "Manage departments, user directory, role assignments, SLA parameters, and column permissions.",
      href: "/admin",
      icon: Shield,
      accent: "from-brand to-[#111111]",
    },
    {
      title: "Boss / Executive View",
      role: "BOSS",
      badge: "C-Suite",
      desc: "Bird's-eye view across all departments, overdue bottlenecks, executive reminders, and team scorecards.",
      href: "/boss",
      icon: Briefcase,
      accent: "from-[#111111] via-[#111111] to-brand",
    },
    {
      title: "Delegator / Manager Workspace",
      role: "DELEGATOR",
      badge: "Assigner",
      desc: "Create tasks, review extension requests, inspect submitted proof files, and award punctuality scores.",
      href: "/delegator",
      icon: UserCheck,
      accent: "from-[#333333] to-[#111111]",
    },
    {
      title: "Delegatee / My Tasks",
      role: "DELEGATEE",
      badge: "Assignee",
      desc: "View personal task queue, update completion progress, upload proof deliverables, and view score.",
      href: "/delegatee",
      icon: ListTodo,
      accent: "from-brand to-[#111111]",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ------------------------------------------------------------------- */}
      {/* Minimalist Subtle Glassmorphic Welcome Hero                         */}
      {/* ------------------------------------------------------------------- */}
      <div className="apple-card p-7 sm:p-9 relative overflow-hidden">
        {/* Subtle Ambient Refraction Orb */}
        <div className="absolute right-[-5%] top-[-20%] w-[320px] h-[320px] rounded-full bg-brand/[0.04] dark:bg-brand/[0.06] blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Cloud-Native Task Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-white">
            Enterprise Centralized Task Management System
          </h1>
          <p className="text-[#666666] dark:text-[#A3A3A3] text-xs sm:text-sm mt-2 leading-relaxed">
            Eliminating spreadsheet concurrency limits with high-throughput PostgreSQL,
            multi-channel notifications (Microsoft 365 + WhatsApp Meta v20), and automated
            mathematical SLA delay deductions.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/tasks/create"
              className="apple-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              <span>Create New Task</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white/60 dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] text-[#111111] dark:text-white font-semibold text-xs px-5 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.1] backdrop-blur-md transition-all cursor-pointer"
            >
              <span>View Analytics</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards in Frosted Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.title}
              className="apple-card p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#666666] dark:text-[#A3A3A3] uppercase tracking-wider">
                  {m.title}
                </span>
                <div className={`p-2.5 rounded-xl ${m.bg} ${m.color} border ${m.border}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-[#111111] dark:text-white tracking-tight">
                  {m.value}
                </span>
                <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1 font-medium">{m.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Workspaces & Portals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#111111] dark:text-white">
              Role-Based Portals &amp; Governance
            </h2>
            <p className="text-xs text-[#666666] dark:text-[#A3A3A3]">
              Select a portal according to your active permission tier (Active:{" "}
              <span className="font-bold text-[#111111] dark:text-white uppercase tracking-wide">{activeRole}</span>)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portals.map((p) => {
            const Icon = p.icon;
            const isSelected = activeRole === p.role;

            return (
              <Link
                key={p.title}
                href={p.href}
                className={`group apple-card p-5 sm:p-6 relative overflow-hidden transition-all ${
                  isSelected
                    ? "ring-1.5 ring-[#111111] dark:ring-white shadow-sm"
                    : "hover:border-black/[0.12] dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center border border-black/[0.04] dark:border-white/[0.08] group-hover:scale-105 transition-transform">
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-black/[0.03] dark:bg-white/[0.06] text-[#666666] dark:text-[#A3A3A3]">
                    {p.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#111111] dark:text-white mt-3.5 group-hover:text-brand dark:group-hover:text-brand transition-colors">
                  {p.title}
                </h3>
                <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1 leading-relaxed line-clamp-2">
                  {p.desc}
                </p>
                <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#111111] dark:text-white group-hover:text-brand dark:group-hover:text-brand">
                  <span>Enter Portal</span>
                  <ArrowRight
                    size={14}
                    className="transform group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Cloud Integrations Status Bar */}
      <div className="apple-card p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
          <span className="font-semibold text-[#111111] dark:text-white">
            Architecture Status:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[#666666] dark:text-slate-300 font-medium">
          <span className="px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08]">
            PostgreSQL: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08]">
            Cloudinary CDN: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Connected</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08]">
            Microsoft 365: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Live</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08]">
            Meta WhatsApp v20: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
