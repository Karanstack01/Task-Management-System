"use client";

import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Filter,
  ShieldCheck,
  Search,
  Bot,
  User,
  Clock,
  Sparkles,
  ChevronDown,
  Lock,
  ExternalLink,
  Shield,
  FileText,
} from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";

export interface AuditLogItem {
  id: string;
  time: string;
  dateGroup: "today" | "yesterday" | "oct2";
  actor: {
    name: string;
    type: "agent" | "person";
    avatarUrl?: string;
    agentBadge?: string;
  };
  action: string;
  target: string;
  source: string;
  sourceType: "policy" | "web" | "app" | "sso";
}

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "log-1",
    time: "11:56 AM",
    dateGroup: "today",
    actor: {
      name: "Route Agent",
      type: "agent",
      agentBadge: "AI Agent",
    },
    action: "Requested approval for a reroute",
    target: "SF-48291 • I-680",
    source: "Policy R-2",
    sourceType: "policy",
  },
  {
    id: "log-2",
    time: "11:51 AM",
    dateGroup: "today",
    actor: {
      name: "Exception Agent",
      type: "agent",
      agentBadge: "AI Agent",
    },
    action: "Drafted a customer message",
    target: "EX-2291 • T. Reed",
    source: "Policy E-1",
    sourceType: "policy",
  },
  {
    id: "log-3",
    time: "11:33 AM",
    dateGroup: "today",
    actor: {
      name: "Priya Nair",
      type: "person",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
    },
    action: "Approved a customer ETA message",
    target: "SF-48291",
    source: "Web • Oakland, CA",
    sourceType: "web",
  },
  {
    id: "log-4",
    time: "11:20 AM",
    dateGroup: "today",
    actor: {
      name: "Dispatch Agent",
      type: "agent",
      agentBadge: "AI Agent",
    },
    action: "Requested approval to reassign",
    target: "SF-49281 • L. Hernandez",
    source: "Policy D-2",
    sourceType: "policy",
  },
  {
    id: "log-5",
    time: "10:24 AM",
    dateGroup: "today",
    actor: {
      name: "James Whitaker",
      type: "person",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    action: "Overrode an agent plan",
    target: "SF-49120 • split stop",
    source: "Web • San Leandro, CA",
    sourceType: "web",
  },
  {
    id: "log-6",
    time: "10:12 AM",
    dateGroup: "today",
    actor: {
      name: "Sarah Bennett",
      type: "person",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    action: "Approved a route plan",
    target: "R-1042 • Oct 4",
    source: "Web • Oakland, CA",
    sourceType: "web",
  },
  {
    id: "log-7",
    time: "9:41 AM",
    dateGroup: "today",
    actor: {
      name: "Dispatch Agent",
      type: "agent",
      agentBadge: "AI Agent",
    },
    action: "Notified a driver of pickup",
    target: "SF-49340 • L. Diaz",
    source: "Policy D-3",
    sourceType: "policy",
  },
  {
    id: "log-8",
    time: "9:12 AM",
    dateGroup: "today",
    actor: {
      name: "Fleet Agent",
      type: "agent",
      agentBadge: "AI Agent",
    },
    action: "Booked preventive service",
    target: "4 vehicles",
    source: "Policy F-2",
    sourceType: "policy",
  },
  {
    id: "log-9",
    time: "9:02 AM",
    dateGroup: "today",
    actor: {
      name: "Olivia Grant",
      type: "person",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    },
    action: "Changed an agent permission",
    target: "Customer Agent - Draft",
    source: "Web • Oakland, CA",
    sourceType: "web",
  },
  {
    id: "log-10",
    time: "8:12 AM",
    dateGroup: "today",
    actor: {
      name: "James Whitaker",
      type: "person",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    action: "Approved a load assignment",
    target: "SF-49033 • R. Kim",
    source: "iOS app",
    sourceType: "app",
  },
  {
    id: "log-11",
    time: "8:02 AM",
    dateGroup: "today",
    actor: {
      name: "Hannah Price",
      type: "person",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    },
    action: "Signed in",
    target: "Okta SSO",
    source: "Sacramento, CA",
    sourceType: "sso",
  },
  {
    id: "log-12",
    time: "Oct 2",
    dateGroup: "oct2",
    actor: {
      name: "Olivia Grant",
      type: "person",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    },
    action: "Rotated an API key",
    target: "ff_live_••••3f9a",
    source: "Web • Oakland, CA",
    sourceType: "web",
  },
  {
    id: "log-13",
    time: "Oct 2",
    dateGroup: "oct2",
    actor: {
      name: "Kevin O'Brien",
      type: "person",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
    action: "Approved a maintenance spend",
    target: "V-077 • ₹1,240",
    source: "Web • Oakland, CA",
    sourceType: "web",
  },
];

export function AuditLogsTab() {
  const [logs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (dateFilter === "today" && item.dateGroup !== "today") return false;
      if (dateFilter === "oct2" && item.dateGroup !== "oct2") return false;

      if (actorFilter === "agents" && item.actor.type !== "agent") return false;
      if (actorFilter === "people" && item.actor.type !== "person") return false;

      if (sourceFilter !== "all" && item.sourceType !== sourceFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.actor.name.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q) ||
          item.target.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [logs, dateFilter, actorFilter, sourceFilter, searchQuery]);

  const handleExportCSV = () => {
    notify.success("Audit Log Export Initiated", {
      description: "Generating cryptographically signed CSV archive of 3,482 events.",
    });
  };

  const handleRetentionPolicy = () => {
    notify.info("Compliance Retention Policy", {
      description: "Immutable WORM storage enabled. All events kept for 2 years with SHA-256 tamper verification.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A3A3A3]">
          Settings / Audit logs
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Audit logs
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A3A3A3] mt-1 max-w-xl">
              Every change made by people and agents, with who, what and when. Kept for 2 years and cannot be edited.
            </p>
          </div>

          {/* Top Right Action & Badges */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-[#EEEEEE] border border-slate-200 dark:border-white/15">
              <span>3,482 events in October</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Tamper proof</span>
            </span>

            <button
              onClick={handleRetentionPolicy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#EEEEEE] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/15 transition-colors cursor-pointer"
            >
              <Lock size={13} />
              <span>Retention policy</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] text-white shadow-md transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Stats Summary Row */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#A3A3A3] border-b border-slate-100 dark:border-white/10 pb-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-900 dark:text-white">
            142 events today
          </span>
          <span className="text-[#111111] dark:text-brand font-medium">
            118 by agents
          </span>
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            24 by people
          </span>
        </div>
      </div>

      {/* Filter Row Matching frame_040.png */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Filter */}
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-md text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.1] outline-none cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.1] transition-colors"
          >
            <option value="today">Date: Today</option>
            <option value="all">Date: All Time</option>
            <option value="oct2">Date: Oct 2</option>
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Actor Filter */}
        <div className="relative">
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-md text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.1] outline-none cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.1] transition-colors"
          >
            <option value="all">Actor: People and agents</option>
            <option value="agents">Actor: Agents only</option>
            <option value="people">Actor: People only</option>
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-md text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.1] outline-none cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.1] transition-colors"
          >
            <option value="all">Type: All changes</option>
            <option value="approvals">Type: Approvals</option>
            <option value="overrides">Type: Overrides</option>
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Source Filter */}
        <div className="relative">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-md text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.1] outline-none cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.1] transition-colors"
          >
            <option value="all">Source: Any</option>
            <option value="policy">Source: Automated Policy</option>
            <option value="web">Source: Web</option>
            <option value="app">Source: Mobile App</option>
            <option value="sso">Source: Okta SSO</option>
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Search */}
        <div className="relative ml-auto flex-1 min-w-[200px] max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] text-[#111111] dark:text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-[#111111] dark:focus:ring-brand"
          />
        </div>
      </div>

      {/* Audit Logs Table Matching frame_040.png */}
      <div className="apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-[11px] font-bold text-[#666666] dark:text-[#A3A3A3] uppercase tracking-wider">
                <th className="py-3 px-4 w-28">Time</th>
                <th className="py-3 px-4 w-44">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4 w-52">Target</th>
                <th className="py-3 px-4 w-40 text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {filteredLogs.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                >
                  {/* Time */}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-[#A3A3A3]">
                    {item.time}
                  </td>

                  {/* Actor */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {item.actor.type === "agent" ? (
                        <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-purple-950/70 text-[#111111] dark:text-[#A3A3A3] flex items-center justify-center ring-1 ring-purple-500/30 shrink-0">
                          <Bot size={14} />
                        </div>
                      ) : item.actor.avatarUrl ? (
                        <img
                          src={item.actor.avatarUrl}
                          alt={item.actor.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {item.actor.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
                        {item.actor.name}
                      </span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 font-normal text-slate-700 dark:text-[#EEEEEE]">
                    {item.action}
                  </td>

                  {/* Target */}
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-white">
                    <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md text-[11px]">
                      {item.target}
                    </span>
                  </td>

                  {/* Source */}
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.sourceType === "policy"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40"
                          : item.sourceType === "sso"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                          : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                      }`}
                    >
                      {item.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

