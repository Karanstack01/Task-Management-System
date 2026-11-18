"use client";

import React, { useState, useEffect, useMemo } from "react";
import { localDb } from "@/lib/data/dal";
import {
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  Sparkles,
  Info,
  X,
  Trophy,
  Flame,
} from "lucide-react";
import { TableSkeleton, MetricGridSkeleton } from "@/components/common/skeleton-loaders";
import { RollingNumber } from "@/components/common/rolling-number";
import { notify } from "@/lib/notifications/toast-service";
import { Kpi, Panel, Donut, BarRow, ScoreRing, CHART_COLORS, INK, MUTED } from "@/components/analytics/charts";

export interface ScorecardTaskItem {
  id: string;
  task_no: number;
  title: string;
  status: string;
  priority: string;
  current_target_date: string;
  completion_date?: string | null;
  delay_days: number;
  allocated_score: number;
  actual_score: number;
  is_overdue: boolean;
}

export interface ScorecardRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  departmentName: string;
  departmentId?: string | null;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  activeOverdueTasks: number;
  punctualityRate: number;
  completionRate: number;
  averageScore: number;
  rank: number;
  tier: "ELITE" | "ON_TARGET" | "NEEDS_ATTENTION";
  trend: number;
  tasks: ScorecardTaskItem[];
}

const TIER_LABEL = { ELITE: "Elite", ON_TARGET: "On target", NEEDS_ATTENTION: "Needs coaching" } as const;
const TIER_STYLE = {
  ELITE: "bg-[#111111] text-white dark:bg-white dark:text-[#111111]",
  ON_TARGET: "bg-black/[0.06] text-[#333333] dark:bg-white/10 dark:text-[#E0E0E0]",
  NEEDS_ATTENTION: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
} as const;

export default function ScorecardsLeaderboardPage() {
  const [scorecards, setScorecards] = useState<ScorecardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<ScorecardRow | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const orgId = "org-sd-01";

  useEffect(() => {
    localDb
      .getUserScorecards(orgId)
      .then((data) => setScorecards(data as ScorecardRow[]))
      .finally(() => setLoading(false));
  }, []);

  const filteredScorecards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scorecards.filter((sc) => {
      if (deptFilter !== "ALL" && sc.departmentName !== deptFilter) return false;
      if (criticalOnly && !sc.tasks.some((t) => t.priority === "CRITICAL")) return false;
      if (!q) return true;
      return (
        sc.fullName.toLowerCase().includes(q) ||
        sc.departmentName.toLowerCase().includes(q) ||
        sc.email.toLowerCase().includes(q)
      );
    });
  }, [scorecards, deptFilter, criticalOnly, search]);

  const departments = useMemo(
    () => Array.from(new Set(scorecards.map((s) => s.departmentName).filter(Boolean))),
    [scorecards]
  );

  const stats = useMemo(() => {
    const n = filteredScorecards.length;
    const sum = (f: (s: ScorecardRow) => number) => filteredScorecards.reduce((a, s) => a + f(s), 0);
    const completed = sum((s) => s.completedTasks);
    const onTime = sum((s) => s.onTimeTasks);
    return {
      n,
      avgScore: n ? sum((s) => s.averageScore) / n : 0,
      onTimeRate: completed ? Math.round((onTime / completed) * 100) : 100,
      completed,
      assigned: sum((s) => s.totalTasks),
      overdue: sum((s) => s.activeOverdueTasks),
      late: sum((s) => s.delayedTasks),
      elite: filteredScorecards.filter((s) => s.tier === "ELITE").length,
      onTarget: filteredScorecards.filter((s) => s.tier === "ON_TARGET").length,
      coaching: filteredScorecards.filter((s) => s.tier === "NEEDS_ATTENTION").length,
    };
  }, [filteredScorecards]);

  // Average score per department (computed from the filtered people)
  const deptScores = useMemo(() => {
    const map = new Map<string, { sum: number; n: number; overdue: number }>();
    filteredScorecards.forEach((s) => {
      const cur = map.get(s.departmentName) || { sum: 0, n: 0, overdue: 0 };
      cur.sum += s.averageScore;
      cur.n += 1;
      cur.overdue += s.activeOverdueTasks;
      map.set(s.departmentName, cur);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, avg: v.sum / v.n, n: v.n, overdue: v.overdue }))
      .sort((a, b) => b.avg - a.avg);
  }, [filteredScorecards]);

  const handleExportCSV = () => {
    const headers = ["Rank,Employee,Email,Department,Role,TotalTasks,Completed,OnTime,Delayed,ActiveOverdue,PunctualityRate,AvgScore,Tier"];
    const rows = filteredScorecards.map(
      (s) =>
        `"${s.rank}","${s.fullName}","${s.email}","${s.departmentName}","${s.role}",${s.totalTasks},${s.completedTasks},${s.onTimeTasks},${s.delayedTasks},${s.activeOverdueTasks},"${s.punctualityRate}%",${s.averageScore},"${s.tier}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `CTMS_Scorecards_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success("Scorecards Exported", { description: "Downloaded complete CSV performance ledger." });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-semibold tracking-tight ${INK}`}>Team Scorecards</h1>
          <p className={`text-sm mt-1 ${MUTED}`}>
            SLA score, punctuality and workload per employee. Score = 10 − delay penalties − overdue backlog.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setShowFormulaModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.03] cursor-pointer"
          >
            <Info size={14} />
            <span>How scoring works</span>
          </button>
          <button onClick={handleExportCSV} className="apple-btn-primary inline-flex items-center gap-2 text-xs font-semibold h-9 px-4 rounded-xl">
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or department"
            className="w-full h-10 pl-9 pr-9 rounded-xl text-sm bg-white dark:bg-[#111111] border border-black/[0.08] dark:border-white/[0.1] text-[#111111] dark:text-white placeholder:text-[#9CA3AF] outline-none focus:border-brand"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111111] cursor-pointer" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 text-sm bg-white dark:bg-[#111111] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 text-[#111111] dark:text-white cursor-pointer"
        >
          <option value="ALL">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button
          onClick={() => setCriticalOnly((v) => !v)}
          aria-pressed={criticalOnly}
          className={`h-10 px-3.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 border transition-colors cursor-pointer ${
            criticalOnly
              ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white border-[#111111]"
              : "bg-white dark:bg-[#111111] border-black/[0.08] dark:border-white/[0.1] text-[#111111] dark:text-white"
          }`}
        >
          <Flame className="w-4 h-4" />
          Has critical tasks
        </button>
      </div>

      {loading ? (
        <>
          <MetricGridSkeleton count={4} />
          <TableSkeleton rows={5} cols={7} />
        </>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi label="Average SLA score" value={stats.avgScore.toFixed(1)} unit="/ 10" hint={`Across ${stats.n} employees`} icon={Award} progress={stats.avgScore * 10} tone={stats.avgScore >= 7.5 ? "neutral" : "warn"} />
            <Kpi label="On-time rate" value={stats.onTimeRate} unit="%" hint={`${stats.late} late of ${stats.completed} delivered`} icon={Clock} progress={stats.onTimeRate} tone={stats.onTimeRate >= 90 ? "neutral" : stats.onTimeRate >= 75 ? "warn" : "bad"} />
            <Kpi label="Delivered" value={stats.completed} unit={`of ${stats.assigned}`} hint="Completed vs assigned tasks" icon={CheckCircle2} progress={stats.assigned ? (stats.completed / stats.assigned) * 100 : 0} />
            <Kpi label="Overdue backlog" value={stats.overdue} unit="tasks" hint={stats.overdue ? "Each costs −0.4 score until closed" : "No active penalties"} icon={AlertTriangle} tone={stats.overdue ? "bad" : "neutral"} />
          </div>

          {/* Distribution + departments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Performance tiers" subtitle="Elite ≥ 9.0 · On target 7.5–8.9 · Needs coaching < 7.5">
              <Donut
                centerLabel="Employees"
                centerValue={stats.n}
                slices={[
                  { label: "Elite", value: stats.elite, color: "var(--sd-ink)" },
                  { label: "On target", value: stats.onTarget, color: "#A3A3A3" },
                  { label: "Needs coaching", value: stats.coaching, color: CHART_COLORS.amber },
                ]}
              />
            </Panel>
            <Panel title="Department average score" subtitle="Mean SLA score of employees in each department">
              {deptScores.length === 0 ? (
                <p className={`text-sm ${MUTED}`}>No data for the current filters.</p>
              ) : (
                <div className="space-y-4">
                  {deptScores.map((d) => (
                    <BarRow
                      key={d.name}
                      label={d.name}
                      sublabel={`${d.n} staff`}
                      value={d.avg}
                      max={10}
                      color={d.avg >= 7.5 ? "var(--sd-ink)" : CHART_COLORS.amber}
                      right={
                        <span className={MUTED}>
                          <span className={`font-semibold ${INK}`}>{d.avg.toFixed(1)}</span> / 10
                          {d.overdue > 0 && <span className="text-[#F04438] font-semibold"> · {d.overdue} overdue</span>}
                        </span>
                      }
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Leaderboard */}
          <section className="rounded-2xl bg-white dark:bg-[#111111] border border-black/[0.07] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <header className="px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <h2 className={`text-[15px] font-semibold ${INK}`}>Leaderboard</h2>
                <p className={`text-xs mt-0.5 ${MUTED}`}>Select an employee to open their task ledger</p>
              </div>
              <span className={`text-xs ${MUTED}`}>{filteredScorecards.length} employees</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left text-[11px] uppercase tracking-[0.08em] ${MUTED} bg-black/[0.02] dark:bg-white/[0.03]`}>
                    <th className="pl-5 sm:pl-6 pr-2 py-3 font-semibold w-14">Rank</th>
                    <th className="px-3 py-3 font-semibold">Employee</th>
                    <th className="px-3 py-3 font-semibold">Department</th>
                    <th className="px-3 py-3 font-semibold w-44">Completion</th>
                    <th className="px-3 py-3 font-semibold w-44">Punctuality</th>
                    <th className="px-3 py-3 font-semibold text-center">Overdue</th>
                    <th className="px-3 py-3 font-semibold">Tier</th>
                    <th className="pl-3 pr-5 sm:pr-6 py-3 font-semibold text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {filteredScorecards.length === 0 && (
                    <tr>
                      <td colSpan={8} className={`px-6 py-10 text-center ${MUTED}`}>No employees match these filters.</td>
                    </tr>
                  )}
                  {filteredScorecards.map((sc) => (
                    <tr key={sc.userId} onClick={() => setSelectedEmployee(sc)} className="hover:bg-black/[0.025] dark:hover:bg-white/[0.03] cursor-pointer transition-colors">
                      <td className="pl-5 sm:pl-6 pr-2 py-3.5">
                        {sc.rank <= 3 ? (
                          <span
                            className="inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold text-white"
                            style={{ background: sc.rank === 1 ? "#111111" : sc.rank === 2 ? "#666666" : "#A3A3A3" }}
                          >
                            {sc.rank}
                          </span>
                        ) : (
                          <span className={`inline-flex w-7 justify-center text-sm tabular-nums ${MUTED}`}>{sc.rank}</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className={`font-medium ${INK}`}>{sc.fullName}</div>
                        <div className={`text-xs ${MUTED}`}>{sc.role.charAt(0) + sc.role.slice(1).toLowerCase()}</div>
                      </td>
                      <td className={`px-3 py-3.5 ${INK}`}>{sc.departmentName}</td>
                      <td className="px-3 py-3.5">
                        <MiniMeter value={sc.completionRate} label={`${sc.completedTasks}/${sc.totalTasks}`} color="#A3A3A3" />
                      </td>
                      <td className="px-3 py-3.5">
                        <MiniMeter
                          value={sc.punctualityRate}
                          label={`${sc.punctualityRate}%`}
                          color={sc.punctualityRate >= 75 ? "var(--sd-ink)" : sc.punctualityRate >= 50 ? CHART_COLORS.amber : CHART_COLORS.red}
                        />
                      </td>
                      <td className="px-3 py-3.5 text-center tabular-nums">
                        {sc.activeOverdueTasks > 0 ? (
                          <span className="font-semibold text-[#F04438]">{sc.activeOverdueTasks}</span>
                        ) : (
                          <span className={MUTED}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${TIER_STYLE[sc.tier]}`}>{TIER_LABEL[sc.tier]}</span>
                      </td>
                      <td className="pl-3 pr-5 sm:pr-6 py-2.5">
                        <div className="flex justify-end">
                          <ScoreRing score={sc.averageScore} size={46} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* MODAL 1: Algorithmic SLA Formula Inspector */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111111] border border-black/[0.08] dark:border-white/10 max-w-xl w-full p-6 rounded-2xl shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#111111] dark:text-white">
                    CTMS Algorithmic Scoring Specification
                  </h3>
                  <p className="text-xs text-[#666666] dark:text-[#A3A3A3]">
                    Deterministic mathematical model for objective SLA performance scoring
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/10 text-[#666666] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 font-mono text-[11px] text-purple-900 dark:text-purple-200">
                Score = Base (10.0) - (DelayDays &times; 2.0) - (OverdueBacklog &times; 0.4) + (CleanBonus &times; 0.2)
              </div>

              <div className="space-y-2 text-[#666666] dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#111111] dark:text-white shrink-0">1. Base Allocation:</span>
                  <span>Every task starts with 10.0 allocated points upon delegation.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#111111] dark:text-white shrink-0">2. Linear Delay Penalty:</span>
                  <span>Each business day past the target completion date applies a -20% deduction (-2.0 pts per day late).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#111111] dark:text-white shrink-0">3. Live Overdue Weighting:</span>
                  <span>Active work currently past deadline incurs a real-time -0.4 pt deduction until submitted.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#111111] dark:text-white shrink-0">4. First-Pass Bonus:</span>
                  <span>Deliverables approved on first review without rework receive a +0.2 excellence incentive (max 10.0).</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-end text-xs">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] px-5 py-2 rounded-xl font-bold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Employee Detailed Performance Audit Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111111] border border-black/[0.08] dark:border-white/10 max-w-3xl w-full p-6 rounded-2xl shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] flex items-center justify-center text-lg font-bold text-[#111111] dark:text-white">
                  {selectedEmployee.avatarUrl ? (
                    <img
                      src={selectedEmployee.avatarUrl}
                      alt={selectedEmployee.fullName}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    selectedEmployee.fullName.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#111111] dark:text-white">
                      {selectedEmployee.fullName}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Rank #{selectedEmployee.rank}
                    </span>
                  </div>
                  <p className="text-xs text-[#666666] dark:text-[#A3A3A3]">
                    {selectedEmployee.email} &bull; {selectedEmployee.departmentName} &bull; {selectedEmployee.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/10 text-[#666666] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[10px] uppercase font-bold text-[#666666] block">SLA SCORE</span>
                <span className="text-xl font-extrabold text-[#111111] dark:text-white font-mono tabular-nums">
                  <RollingNumber value={selectedEmployee.averageScore} decimals={1} /> / 10.0
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[10px] uppercase font-bold text-[#666666] block">PUNCTUALITY</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  <RollingNumber value={selectedEmployee.punctualityRate} suffix="%" />
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[10px] uppercase font-bold text-[#666666] block">COMPLETED</span>
                <span className="text-xl font-extrabold text-[#111111] dark:text-white font-mono tabular-nums">
                  <RollingNumber value={selectedEmployee.completedTasks} />
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[10px] uppercase font-bold text-[#666666] block">OVERDUE</span>
                <span className={`text-xl font-extrabold font-mono tabular-nums ${
                  selectedEmployee.activeOverdueTasks > 0 ? "text-rose-600" : "text-emerald-600"
                }`}>
                  <RollingNumber value={selectedEmployee.activeOverdueTasks} />
                </span>
              </div>
            </div>

            {/* Task Ledger Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A3A3A3] block mb-1">
                Task Performance Ledger ({selectedEmployee.tasks.length} items)
              </span>

              {selectedEmployee.tasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#666666]">
                  No tasks assigned to this employee in current scope.
                </div>
              ) : (
                selectedEmployee.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.02] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#666666]">#{task.task_no}</span>
                        <span className="font-bold text-[#111111] dark:text-white truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#666666]">
                        <span>Target: {new Date(task.current_target_date).toLocaleDateString("en-GB")}</span>
                        <span>&bull;</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          task.priority === "CRITICAL"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-black/[0.05] text-[#666666] dark:bg-white/10 dark:text-slate-300"
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold block ${
                          task.status === "DONE"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : task.is_overdue
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}>
                          {task.status === "DONE" ? "Completed" : task.is_overdue ? "Overdue" : "In Progress"}
                        </span>
                        <span className="text-[10px] text-[#666666] mt-0.5 block font-mono">
                          {task.status === "DONE" ? `Score: ${task.actual_score}/10` : task.is_overdue ? "SLA Penalty Active" : "Pending review"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-[#666666]">Audited by StackDrove Algorithmic Engine</span>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] px-5 py-2 rounded-xl font-bold cursor-pointer"
              >
                Close audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniMeter({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums text-[#4B5563] dark:text-[#D1D5DB]">{label}</span>
    </div>
  );
}
