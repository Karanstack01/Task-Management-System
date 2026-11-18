"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { localDb } from "@/lib/data/dal";
import { CheckCircle2, Clock, AlertTriangle, Timer, Award, ArrowUpRight, RefreshCcw, Layers } from "lucide-react";
import { DashboardSkeleton } from "@/components/common/skeleton-loaders";
import {
  Kpi,
  Panel,
  Donut,
  WeeklyColumns,
  SegmentBar,
  BarRow,
  PriorityPill,
  CHART_COLORS,
  INK,
  MUTED,
} from "@/components/analytics/charts";

type AnalyticsData = Awaited<ReturnType<typeof localDb.getAnalyticsSummary>>;

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const orgId = "org-sd-01";

  useEffect(() => {
    localDb.getAnalyticsSummary(orgId).then(setData);
  }, []);

  if (!data) return <DashboardSkeleton />;

  const slaTone = data.onTimeDeliveryRate >= 90 ? "neutral" : data.onTimeDeliveryRate >= 75 ? "warn" : "bad";
  const maxLoad = Math.max(1, ...data.workload.map((w) => w.open));
  const maxDept = Math.max(1, ...data.departmentBreakdown.map((d) => d.total));
  const a = data.aging;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-semibold tracking-tight ${INK}`}>Executive Analytics</h1>
          <p className={`text-sm mt-1 ${MUTED}`}>Delivery performance, deadline risk and team workload across the organisation.</p>
        </div>
        <Link
          href="/scorecards"
          className="apple-btn-primary inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-semibold self-start"
        >
          <Award className="w-4 h-4" />
          Employee Leaderboard
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          label="Completion rate"
          value={data.completionRate}
          unit="%"
          hint={`${data.completedCount} of ${data.totalTasks} tasks delivered`}
          icon={CheckCircle2}
          progress={data.completionRate}
        />
        <Kpi
          label="On-time delivery"
          value={data.onTimeDeliveryRate}
          unit="%"
          hint="Target ≥ 90% of completed tasks"
          icon={Clock}
          tone={slaTone}
          progress={data.onTimeDeliveryRate}
        />
        <Kpi
          label="Avg. turnaround"
          value={data.averageTurnaroundDays}
          unit="days"
          hint="Start to completion, completed tasks"
          icon={Timer}
        />
        <Kpi
          label="Overdue now"
          value={data.overdueCount}
          unit={`of ${data.openCount} open`}
          hint={data.overdueCount === 0 ? "No open work past its deadline" : "Open tasks past deadline"}
          icon={AlertTriangle}
          tone={data.overdueCount > 0 ? "bad" : "neutral"}
        />
      </div>

      {/* Trend + status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Panel title="Weekly throughput" subtitle="Tasks created vs completed, last 8 weeks" className="lg:col-span-3">
          <WeeklyColumns data={data.weekly} />
        </Panel>
        <Panel title="Pipeline status" subtitle="All tasks by lifecycle stage" className="lg:col-span-2">
          <Donut
            centerLabel="Total tasks"
            centerValue={data.totalTasks}
            slices={[
              { label: "Pending", value: data.pendingCount, color: "#BDBDBD" },
              { label: "In progress", value: data.inProgressCount, color: "#666666" },
              { label: "Awaiting verification", value: data.awaitingVerificationCount, color: CHART_COLORS.amber },
              { label: "Completed", value: data.completedCount, color: "var(--sd-ink)" },
            ]}
          />
          <Link href="/verify" className={`mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] inline-flex items-center gap-1 text-xs font-semibold hover:text-brand ${INK}`}>
            Review verification queue <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </Panel>
      </div>

      {/* Deadline risk + priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Deadline health" subtitle="Open tasks grouped by time to / past deadline">
          <SegmentBar
            segments={[
              { label: "Overdue > 7 days", value: a.overdueOver7, color: "#B42318" },
              { label: "Overdue 3–7 days", value: a.overdue3to7, color: CHART_COLORS.red },
              { label: "Overdue < 3 days", value: a.overdue0to3, color: "#F97066" },
              { label: "Due in < 3 days", value: a.dueIn3, color: CHART_COLORS.amber },
              { label: "Due in 3–7 days", value: a.dueIn7, color: "#666666" },
              { label: "Due later", value: a.later, color: "#BDBDBD" },
            ]}
          />
        </Panel>

        <Panel title="Open work by priority" subtitle="Share of active tasks that are already overdue">
          <div className="space-y-4">
            {data.priorityBreakdown.map((p) => (
              <BarRow
                key={p.priority}
                label={p.priority.charAt(0) + p.priority.slice(1).toLowerCase()}
                value={p.open}
                alert={p.overdue}
                max={Math.max(1, ...data.priorityBreakdown.map((x) => x.open))}
                right={
                  <span className={MUTED}>
                    <span className={`font-semibold ${INK}`}>{p.open}</span> open
                    {p.overdue > 0 && <span className="text-[#F04438] font-semibold"> · {p.overdue} overdue</span>}
                  </span>
                }
              />
            ))}
          </div>
        </Panel>
      </div>

      {/* Departments + workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Department performance" subtitle="Completed share of tasks; red marks overdue work">
          <div className="space-y-4">
            {data.departmentBreakdown
              .filter((d) => d.total > 0)
              .sort((x, y) => y.total - x.total)
              .map((d) => {
                const pct = Math.round((d.completed / d.total) * 100);
                return (
                  <BarRow
                    key={d.code || d.departmentName}
                    label={d.departmentName}
                    sublabel={d.code || undefined}
                    value={d.total}
                    alert={d.overdue}
                    max={maxDept}
                    color={CHART_COLORS.green}
                    right={
                      <span className={MUTED}>
                        <span className={`font-semibold ${INK}`}>{pct}%</span> done · {d.completed}/{d.total}
                        {d.overdue > 0 && <span className="text-[#F04438] font-semibold"> · {d.overdue} late</span>}
                      </span>
                    }
                  />
                );
              })}
          </div>
        </Panel>

        <Panel title="Team workload" subtitle="Open tasks per assignee">
          {data.workload.length === 0 ? (
            <p className={`text-sm ${MUTED}`}>No open work is currently assigned.</p>
          ) : (
            <div className="space-y-4">
              {data.workload.map((w) => (
                <BarRow
                  key={w.userId}
                  label={w.name}
                  value={w.open}
                  alert={w.overdue}
                  max={maxLoad}
                  right={
                    <span className={MUTED}>
                      <span className={`font-semibold ${INK}`}>{w.open}</span> open
                      {w.overdue > 0 && <span className="text-[#F04438] font-semibold"> · {w.overdue} overdue</span>}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Needs attention */}
      <Panel
        title="Needs attention"
        subtitle="Longest-overdue open tasks"
        action={
          <span className={`inline-flex items-center gap-1.5 text-xs ${MUTED}`}>
            <RefreshCcw className="w-3.5 h-3.5" /> Revision rate {data.revisionRate}%
          </span>
        }
      >
        {data.topOverdue.length === 0 ? (
          <p className={`text-sm ${MUTED}`}>Nothing is overdue. 🎉</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-[11px] uppercase tracking-[0.08em] ${MUTED}`}>
                  <th className="px-1 py-2 font-semibold">Task</th>
                  <th className="px-1 py-2 font-semibold">Assignee</th>
                  <th className="px-1 py-2 font-semibold">Priority</th>
                  <th className="px-1 py-2 font-semibold text-right">Days late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {data.topOverdue.map((t) => (
                  <tr key={t.id}>
                    <td className={`px-1 py-3 font-medium ${INK}`}>
                      <span className={`text-xs tabular-nums mr-2 ${MUTED}`}>#{t.taskNo}</span>
                      {t.title}
                    </td>
                    <td className={`px-1 py-3 ${MUTED}`}>{t.assignee}</td>
                    <td className="px-1 py-3"><PriorityPill priority={t.priority} /></td>
                    <td className="px-1 py-3 text-right font-semibold tabular-nums text-[#F04438]">{t.daysLate}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className={`mt-4 flex items-center gap-1.5 text-xs ${MUTED}`}>
          <Layers className="w-3.5 h-3.5" />
          <Link href="/boss" className="hover:text-brand">Open Boss matrix for reassignment</Link>
        </div>
      </Panel>
    </div>
  );
}
