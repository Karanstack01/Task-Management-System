"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import {
  Award,
  Trophy,
  Medal,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { TableSkeleton, MetricGridSkeleton } from "@/components/common/skeleton-loaders";
import { LiquidStatsCard } from "@/components/common/liquid-stats-card";
import { notify } from "@/lib/notifications/toast-service";
import { GooeySearch } from "@/components/common/gooey-search";

interface ScorecardRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  departmentName: string;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  punctualityRate: number;
  averageScore: number;
  rank: number;
}

export default function ScorecardsLeaderboardPage() {
  const [scorecards, setScorecards] = useState<ScorecardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const orgId = "org-sd-01";

  useEffect(() => {
    loadScorecards();
  }, []);

  async function loadScorecards() {
    setLoading(true);
    try {
      const data = await localDb.getUserScorecards(orgId);
      setScorecards(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredScorecards = scorecards.filter((sc) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      sc.fullName.toLowerCase().includes(q) ||
      sc.departmentName.toLowerCase().includes(q) ||
      sc.email.toLowerCase().includes(q)
    );
  });

  const top3 = scorecards.slice(0, 3);
  const attentionRequired = scorecards.filter((sc) => sc.delayedTasks > 0 || sc.averageScore < 7.0);

  const avgOrgScore =
    scorecards.length > 0
      ? (scorecards.reduce((acc, s) => acc + s.averageScore, 0) / scorecards.length).toFixed(1)
      : "10.0";
  const avgOrgPunctuality =
    scorecards.length > 0
      ? Math.round(scorecards.reduce((acc, s) => acc + s.punctualityRate, 0) / scorecards.length)
      : 100;
  const totalAuditedDeliverables = scorecards.reduce((acc, s) => acc + s.completedTasks, 0);
  const zeroPenaltyCount = scorecards.filter((s) => s.delayedTasks === 0).length;

  const handleExportPDF = () => {
    notify.info("Preparing Export", { description: "Generating performance scorecards print layout." });
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="apple-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                Employee Performance Leaderboards & Scorecards
              </h1>
              <p className="text-xs text-[#666666] dark:text-neutral-400">
                Algorithmic Punctuality Scoring &bull; 20% delay deductions per business day &bull; Deliverables compliance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="apple-btn-primary inline-flex items-center gap-2 text-xs font-semibold py-2.5 px-4"
          >
            <Download className="w-4 h-4" />
            Export Performance Report
          </button>
        </div>
      </div>

      {/* Organization Performance Benchmark Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LiquidStatsCard
          title="Avg SLA Score"
          value={`${avgOrgScore}/10`}
          subtitle="Enterprise SLA"
          progress={Number(avgOrgScore) * 10}
          change={+5.0}
          changePeriod="benchmark met"
          changeType="increase-is-good"
          icon={Award}
          variant="chartreuse"
        />

        <LiquidStatsCard
          title="On-Time Rate"
          value={`${avgOrgPunctuality}%`}
          subtitle="Punctual deliveries"
          progress={avgOrgPunctuality}
          change={+2.8}
          changePeriod="punctuality trend"
          changeType="increase-is-good"
          icon={Clock}
          variant="electric"
        />

        <LiquidStatsCard
          title="Audited Tasks"
          value={totalAuditedDeliverables}
          subtitle="Verified deliverables"
          icon={CheckCircle2}
          variant="navy"
        />

        <LiquidStatsCard
          title="Zero Delay Members"
          value={zeroPenaltyCount}
          subtitle={`of ${scorecards.length} staff`}
          change={zeroPenaltyCount === scorecards.length ? 100 : Math.round((zeroPenaltyCount / (scorecards.length || 1)) * 100)}
          changePeriod="perfect punctuality"
          changeType="increase-is-good"
          icon={Sparkles}
          variant="ice"
        />
      </div>

      {/* Top 3 Podium Cards */}
      {loading ? (
        <MetricGridSkeleton count={3} />
      ) : top3.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {top3.map((winner, idx) => (
            <div
              key={winner.userId}
              className="apple-card p-6 flex flex-col justify-between hover:border-black/15 dark:hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    idx === 0
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      : idx === 1
                      ? "bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-500/20"
                      : "bg-amber-700/10 text-amber-800 dark:text-amber-400 border border-amber-700/20"
                  }`}
                >
                  <Medal className="w-3.5 h-3.5" />
                  {idx === 0 ? "Gold #1 Rank" : idx === 1 ? "Silver #2 Rank" : "Bronze #3 Rank"}
                </span>

                <span className="text-3xl font-bold text-[#111111] dark:text-white">{winner.averageScore}</span>
              </div>

              <div className="mt-5 space-y-0.5">
                <div className="font-bold text-[#111111] dark:text-white text-base">{winner.fullName}</div>
                <div className="text-xs font-medium text-[#666666] dark:text-neutral-400">{winner.departmentName}</div>
              </div>

              <div className="mt-5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-[#666666] dark:text-neutral-400">
                <span>Punctuality: <strong className="text-[#111111] dark:text-white font-semibold">{winner.punctualityRate}%</strong></span>
                <span className="font-medium text-[#111111] dark:text-white">{winner.completedTasks} Completed</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Attention Required Panel (if any delayed assignees) */}
      {attentionRequired.length > 0 && (
        <div className="apple-card p-4.5 bg-amber-500/[0.03] border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Manager Workload Redistribution Alert ({attentionRequired.length} Members)</span>
          </div>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80 font-normal">
            The following assignees experienced delayed deliveries or accumulated SLA penalty deductions. Review task distribution and support bandwidth.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {attentionRequired.map((m) => (
              <span
                key={m.userId}
                className="px-3 py-1 rounded-xl bg-white/80 dark:bg-white/[0.06] border border-amber-500/20 text-xs text-[#111111] dark:text-neutral-200 font-medium shadow-2xs"
              >
                {m.fullName} ({m.delayedTasks} late tasks &bull; {m.averageScore}/10)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Comprehensive Scorecard Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : (
        <div className="apple-card">
        <div className="p-4 border-b border-black/[0.05] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 relative z-30">
          <div className="text-sm font-bold text-[#111111] dark:text-white">
            All Scorecards ({filteredScorecards.length})
          </div>

          <div className="flex items-center gap-2">
            <GooeySearch
              buttonLabel="Search Staff"
              placeholder="Search by name or department..."
              items={scorecards.map((s) => `${s.fullName} (${s.departmentName})`)}
              onSelect={(selected) => {
                const name = selected.split(" (")[0];
                setSearch(name);
              }}
              onChange={(val) => setSearch(val)}
              value={search}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs px-2.5 py-1 rounded-full bg-black/[0.05] dark:bg-white/[0.1] text-[#666666] dark:text-[#A1A1A6] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
              >
                Clear &times;
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-b-2xl">
          <table className="w-full text-left text-sm text-[#666666] dark:text-neutral-400">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03] text-[11px] font-semibold text-[#666666] dark:text-neutral-400 uppercase tracking-wider border-b border-black/[0.05] dark:border-white/[0.06]">
              <tr>
                <th className="px-6 py-3.5">Rank</th>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Assigned</th>
                <th className="px-6 py-3.5">Completed</th>
                <th className="px-6 py-3.5">Punctuality %</th>
                <th className="px-6 py-3.5 text-right">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05] font-medium text-xs">
              {filteredScorecards.map((sc) => (
                <tr key={sc.userId} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        sc.rank === 1
                          ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                          : sc.rank === 2
                          ? "bg-neutral-500/15 text-neutral-800 dark:text-neutral-300 border border-neutral-500/30"
                          : sc.rank === 3
                          ? "bg-amber-700/15 text-amber-900 dark:text-amber-300 border border-amber-700/30"
                          : "text-neutral-400 dark:text-neutral-500 font-semibold"
                      }`}
                    >
                      #{sc.rank}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#111111] dark:text-white">{sc.fullName}</div>
                    <div className="text-[11px] text-[#666666] dark:text-neutral-400">{sc.email}</div>
                  </td>

                  <td className="px-6 py-4 text-[#111111] dark:text-neutral-200 font-medium">{sc.departmentName}</td>

                  <td className="px-6 py-4 font-semibold text-[#111111] dark:text-white">{sc.totalTasks}</td>

                  <td className="px-6 py-4 text-[#666666] dark:text-neutral-300">
                    <span className="text-[#111111] dark:text-white font-medium">{sc.onTimeTasks} On-Time</span>
                    {sc.delayedTasks > 0 && (
                      <span className="text-rose-500 dark:text-rose-400 ml-1 font-semibold">({sc.delayedTasks} Late)</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`font-semibold ${
                        sc.punctualityRate >= 90
                          ? "text-emerald-600 dark:text-emerald-400"
                          : sc.punctualityRate >= 75
                          ? "text-[#111111] dark:text-white"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {sc.punctualityRate}%
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-[#111111] dark:text-white">{sc.averageScore}</span>
                    <span className="text-[#666666] dark:text-neutral-400 text-xs font-normal"> / 10.0</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
    </div>
  );
}
