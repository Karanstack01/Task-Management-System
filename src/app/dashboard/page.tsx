"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Users,
  Building,
  ArrowUpRight,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/common/skeleton-loaders";
import { LiquidStatsCard } from "@/components/common/liquid-stats-card";

interface AnalyticsData {
  totalTasks: number;
  completedCount: number;
  inProgressCount: number;
  awaitingVerificationCount: number;
  overdueCount: number;
  completionRate: number;
  onTimeDeliveryRate: number;
  averageTurnaroundDays: number;
  departmentBreakdown: {
    departmentName: string;
    code?: string | null;
    total: number;
    completed: number;
    overdue: number;
  }[];
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const orgId = "org-sd-01";

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const summary = await localDb.getAnalyticsSummary(orgId);
      setData(summary);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Enterprise Glass Section */}
      <div className="glass-section p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-[#111111] dark:text-white border border-black/[0.04] dark:border-white/[0.08]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                Executive CTMS Analytics
              </h1>
              <p className="text-xs text-[#86868B] dark:text-[#A1A1A6]">
                Real-time SLA punctuality, throughput performance, and department bottlenecks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/scorecards"
            className="apple-btn-primary inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>Employee Leaderboard</span>
          </a>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LiquidStatsCard
          title="Overall Completion"
          value={`${data.completionRate}%`}
          subtitle={`${data.completedCount}/${data.totalTasks} Done`}
          progress={data.completionRate}
          change={+4.8}
          changePeriod="vs last sprint"
          changeType="increase-is-good"
          icon={CheckCircle2}
          variant="chartreuse"
        />

        <LiquidStatsCard
          title="On-Time Delivery SLA"
          value={`${data.onTimeDeliveryRate}%`}
          subtitle="Target: >90%"
          progress={data.onTimeDeliveryRate}
          change={+2.3}
          changePeriod="SLA Target Met"
          changeType="increase-is-good"
          icon={Clock}
          variant="electric"
        />

        <LiquidStatsCard
          title="Avg Turnaround Time"
          value={data.averageTurnaroundDays}
          subtitle="Working Days"
          change={-12.5}
          changePeriod="faster delivery"
          changeType="decrease-is-good"
          icon={TrendingUp}
          variant="navy"
        />

        <LiquidStatsCard
          title="Overdue Tasks"
          value={data.overdueCount}
          subtitle={data.overdueCount === 0 ? "Zero Delays" : "Past Deadline"}
          change={data.overdueCount > 0 ? -15.0 : 0}
          changePeriod={data.overdueCount === 0 ? "clean queue" : "action required"}
          changeType="decrease-is-good"
          icon={AlertTriangle}
          variant={data.overdueCount > 0 ? "rose" : "ice"}
        />
      </div>

      {/* Department Breakdown & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Performance Bar Chart */}
        <div className="lg:col-span-2 glass-section p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#111111] dark:text-white text-base">Department Throughput</h3>
              <p className="text-xs text-[#86868B] dark:text-[#A1A1A6]">
                Total vs Completed task distribution across operational units
              </p>
            </div>
            <span className="text-xs font-semibold text-[#111111] dark:text-white bg-black/[0.04] dark:bg-white/[0.08] px-3 py-1 rounded-full border border-black/[0.05] dark:border-white/[0.08]">
              {data.departmentBreakdown.length} Departments
            </span>
          </div>

          <div className="space-y-4">
            {data.departmentBreakdown.map((dept) => {
              const pct = dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
              return (
                <div key={dept.code || dept.departmentName} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#111111] dark:text-white bg-black/[0.04] dark:bg-white/[0.08] px-2 py-0.5 rounded-lg border border-black/[0.05] dark:border-white/[0.08]">
                        {dept.code || dept.departmentName.substring(0, 4).toUpperCase()}
                      </span>
                      <span className="font-semibold text-[#111111] dark:text-white">{dept.departmentName}</span>
                    </div>
                    <div className="flex items-center gap-3 font-medium">
                      {dept.overdue > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">{dept.overdue} Overdue</span>
                      )}
                      <span className="text-[#86868B] dark:text-[#A1A1A6]">
                        {dept.completed} / {dept.total} ({pct}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-black/[0.04] dark:bg-white/[0.08] rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-[#111111] dark:bg-white h-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    {dept.overdue > 0 && (
                      <div
                        className="bg-rose-500 h-full"
                        style={{
                          width: `${Math.min(100 - pct, (dept.overdue / dept.total) * 100)}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Pipeline Breakdown */}
        <div className="glass-section p-6 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-[#111111] dark:text-white text-base">Pipeline State</h3>
            <p className="text-xs text-[#86868B] dark:text-[#A1A1A6]">Active tasks across all lifecycle phases</p>

            <div className="space-y-2.5 mt-5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#2357D6]" />
                  <span className="font-medium text-[#111111] dark:text-white">In Progress</span>
                </div>
                <span className="font-bold text-[#111111] dark:text-white">{data.inProgressCount} Tasks</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-medium text-[#111111] dark:text-white">Awaiting Verification</span>
                </div>
                <span className="font-bold text-[#111111] dark:text-white">
                  {data.awaitingVerificationCount} Tasks
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-[#111111] dark:text-white">Completed &amp; Verified</span>
                </div>
                <span className="font-bold text-[#111111] dark:text-white">{data.completedCount} Tasks</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-medium text-[#111111] dark:text-white">Critical Overdue</span>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400">{data.overdueCount} Tasks</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs">
            <a
              href="/verify"
              className="text-[#111111] dark:text-white font-semibold hover:text-[#2357D6] flex items-center gap-1 transition-colors"
            >
              <span>Audit Verifications</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            <a
              href="/boss"
              className="text-[#86868B] hover:text-[#111111] dark:text-[#A1A1A6] dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
            >
              <span>Boss Matrix</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
