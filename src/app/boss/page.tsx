"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import { Task, Profile, Department } from "@/types/database.types";
import {
  Crown,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Send,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  List,
  Kanban,
  Building2,
  Users,
  Layers,
  Check,
  Activity,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { TableSkeleton, MetricGridSkeleton, CardSkeleton, KanbanBoardSkeleton } from "@/components/common/skeleton-loaders";
import { LiquidStatsCard } from "@/components/common/liquid-stats-card";
import { notify } from "@/lib/notifications/toast-service";
import { AnimatedStatusBadge, AnimatedStatusFilterBar } from "@/components/common/animated-status-badge";
import { AppleDropdown, DropdownItem } from "@/components/common/apple-dropdown";
import { GooeySearch } from "@/components/common/gooey-search";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";
import { TaskCardsGrid } from "@/components/tasks/task-cards-grid";
import { cn } from "@/lib/utils";
import { isTaskOverdue } from "@/lib/data/task-utils";

export default function BossPortalPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "cards" | "kanban">("list");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [delegateeFilter, setDelegateeFilter] = useState<string>("ALL");

  const orgId = "org-sd-01";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, p, d] = await Promise.all([
        localDb.getTasks({ orgId }),
        localDb.getProfiles(orgId),
        localDb.getDepartments(orgId),
      ]);
      setTasks(t);
      setProfiles(p);
      setDepartments(d);
    } finally {
      setLoading(false);
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (deptFilter !== "ALL" && t.department_id !== deptFilter) return false;
    if (delegateeFilter !== "ALL" && t.delegatee_id !== delegateeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchNo = t.task_no.toString().includes(q);
      return matchTitle || matchNo;
    }
    return true;
  });

  const statusDropdownItems: DropdownItem[] = React.useMemo(
    () => [
      {
        id: "ALL",
        label: "All Statuses",
        icon: <Layers className="w-3.5 h-3.5 text-[#666666] dark:text-neutral-400" strokeWidth={2} />,
      },
      {
        id: "PENDING",
        label: "Pending",
        sublabel: "Awaiting dispatch",
        icon: <Clock className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />,
      },
      {
        id: "IN_PROGRESS",
        label: "In Progress",
        sublabel: "Active execution",
        icon: <Activity className="w-3.5 h-3.5 text-brand" strokeWidth={2} />,
      },
      {
        id: "AWAITING_VERIFICATION",
        label: "Awaiting Verification",
        sublabel: "Deliverable review",
        icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-500" strokeWidth={2} />,
      },
      {
        id: "DONE",
        label: "Done",
        sublabel: "Approved & completed",
        icon: <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />,
      },
    ],
    []
  );

  const deptDropdownItems: DropdownItem[] = React.useMemo(
    () => [
      {
        id: "ALL",
        label: "All Departments",
        icon: <Building2 className="w-3.5 h-3.5 text-[#666666] dark:text-neutral-400" strokeWidth={2} />,
      },
      ...departments.map((d) => ({
        id: d.id,
        label: d.name,
        icon: <Building2 className="w-3.5 h-3.5 text-brand dark:text-brand" strokeWidth={2} />,
      })),
    ],
    [departments]
  );

  const delegateeDropdownItems: DropdownItem[] = React.useMemo(
    () => [
      {
        id: "ALL",
        label: "All Assignees",
        icon: <Users className="w-3.5 h-3.5 text-[#666666] dark:text-neutral-400" strokeWidth={2} />,
      },
      ...profiles.map((p) => ({
        id: p.id,
        label: p.full_name || p.email,
        sublabel: p.email,
        thumbnail: p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={p.full_name}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
          />
        ) : undefined,
        icon: !p.avatar_url ? (
          <UserCheck className="w-3.5 h-3.5 text-[#666666] dark:text-neutral-400" strokeWidth={2} />
        ) : undefined,
      })),
    ],
    [profiles]
  );

  // Executive Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const awaitingVerification = tasks.filter((t) => t.status === "AWAITING_VERIFICATION").length;
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t)).length;

  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.full_name || id;

  const handleSendExecutiveReminder = () => {
    notify.success("Executive Reminder Broadcasted", {
      description: "Urgent SLA compliance alerts dispatched to all active assignees.",
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Enterprise Glass Section */}
      <div className="glass-section p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                Executive Boss Overview
              </h1>
              <p className="text-xs text-[#666666] dark:text-neutral-400">
                Cross-Departmental Operational Monitoring & Task SLA Compliance Matrix
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSendExecutiveReminder}
            className="btn-brand-electric inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer select-none tracking-tight"
          >
            <Send className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
            <span>Executive Reminder Broadcast</span>
          </button>
          <button
            onClick={loadData}
            aria-label="Refresh data"
            className="h-9 w-9 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.06] hover:bg-neutral-50 dark:hover:bg-white/[0.1] text-[#111111] dark:text-white transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Executive Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <LiquidStatsCard
          title="Total Pipeline"
          value={totalTasks}
          subtitle="All teams"
          icon={TrendingUp}
          variant="navy"
        />

        <LiquidStatsCard
          title="Completed"
          value={completedTasks}
          subtitle={`${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% done`}
          progress={totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}
          icon={CheckCircle2}
          variant="chartreuse"
        />

        <LiquidStatsCard
          title="In Progress"
          value={inProgressTasks}
          subtitle="Active work"
          icon={Clock}
          variant="electric"
        />

        <LiquidStatsCard
          title="Awaiting Verify"
          value={awaitingVerification}
          subtitle="Pending sign-off"
          icon={ExternalLink}
          variant="ice"
        />

        <LiquidStatsCard
          title="Overdue Tasks"
          value={overdueTasks}
          subtitle={overdueTasks === 0 ? "Zero overdue" : "Requires attention"}
          change={overdueTasks > 0 ? overdueTasks : undefined}
          changePeriod="action needed"
          changeType="decrease-is-good"
          icon={AlertTriangle}
          variant={overdueTasks > 0 ? "rose" : "ice"}
        />
      </div>

      {/* Interactive Status & Priority Pill Bar (Video Design System) */}
      <div className="glass-section p-3.5 sm:p-4 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] block">
          Task Status Filter
        </span>
        <AnimatedStatusFilterBar
          selected={
            statusFilter === "DONE"
              ? "READY"
              : statusFilter === "PENDING"
              ? "QUEUED"
              : statusFilter === "AWAITING_VERIFICATION"
              ? "WAITING"
              : statusFilter
          }
          onSelect={(val) => {
            if (val === "READY") setStatusFilter("DONE");
            else if (val === "QUEUED") setStatusFilter("PENDING");
            else if (val === "WAITING" || val === "REVIEWING") setStatusFilter("AWAITING_VERIFICATION");
            else setStatusFilter(val);
          }}
        />
      </div>

      {/* Filters Bar with Gooey Search Layout */}
      <div className="glass-section p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 relative z-30">
        <div className="flex items-center gap-2.5">
          <GooeySearch
            buttonLabel="Search Tasks"
            placeholder="Search title or #ID..."
            items={tasks.map((t) => `#${t.task_no} ${t.title}`)}
            onSelect={(selected) => {
              const match = selected.match(/^#(\d+)/);
              setSearch(match ? match[1] : selected);
            }}
            onChange={(val) => setSearch(val)}
            value={search}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs px-2.5 py-1 rounded-full bg-black/[0.05] dark:bg-white/[0.1] text-[#666666] dark:text-[#A3A3A3] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Clear</span>
              <X size={11} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <AppleDropdown
            items={statusDropdownItems}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder="Status"
            headerTitle="Filter Status"
            size="md"
          />

          <AppleDropdown
            items={deptDropdownItems}
            value={deptFilter}
            onChange={(val) => setDeptFilter(val)}
            placeholder="Department"
            headerTitle="Filter Department"
            size="md"
          />

          <AppleDropdown
            items={delegateeDropdownItems}
            value={delegateeFilter}
            onChange={(val) => setDelegateeFilter(val)}
            placeholder="Assignee"
            headerTitle="Filter Assignee"
            showSearch={profiles.length > 5}
            size="md"
          />
        </div>
      </div>

      {/* Global Tasks Table / Cards / Kanban with Smooth Fade Animation */}
      <div key={`${viewMode}-${statusFilter}-${deptFilter}`} className="section-fade-in">
        {loading ? (
          viewMode === "kanban" ? (
            <KanbanBoardSkeleton columns={4} cardsPerColumn={2} />
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <CardSkeleton count={8} />
            </div>
          ) : (
            <TableSkeleton rows={6} cols={6} />
          )
        ) : (
          <div className="apple-card overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.05] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-sm font-extrabold text-[#111111] dark:text-white tracking-tight">
                  Enterprise Task Matrix ({filteredTasks.length})
                </div>

                {/* View Switcher Segmented Pill */}
                <div className="apple-segmented-group">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "apple-segmented-item",
                      viewMode === "list" && "active"
                    )}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={cn(
                      "apple-segmented-item",
                      viewMode === "cards" && "active"
                    )}
                    title="Cards View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("kanban")}
                    className={cn(
                      "apple-segmented-item",
                      viewMode === "kanban" && "active"
                    )}
                    title="Kanban View"
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kanban</span>
                  </button>
                </div>
              </div>

            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-[#111111] dark:text-white font-semibold hover:underline"
            >
              <span>View Analytics & Leaderboard</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </a>
          </div>

          {viewMode === "kanban" ? (
            <div className="p-4 sm:p-5">
              {/* Executive view is read-only (mirrors the "Boss views org tasks" SELECT-only policy). */}
              <TaskKanbanBoard tasks={filteredTasks} />
            </div>
          ) : viewMode === "cards" ? (
            <div className="p-4 sm:p-5">
              <TaskCardsGrid tasks={filteredTasks} groupBySection={true} />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#666666] dark:text-neutral-400">
              <thead className="bg-black/[0.02] dark:bg-white/[0.03] text-[11px] font-semibold text-[#666666] dark:text-neutral-400 uppercase tracking-wider border-b border-black/[0.05] dark:border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5"># Task</th>
                  <th className="px-6 py-3.5">Title</th>
                  <th className="px-6 py-3.5">Assigner & Assignee</th>
                  <th className="px-6 py-3.5">Target Deadline</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05] font-medium text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500 font-medium">
                      No matching tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const isOverdue = isTaskOverdue(t);

                    return (
                      <tr key={t.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3.5 font-mono font-semibold text-[#111111] dark:text-white">
                          #{t.task_no}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-[#111111] dark:text-white">{t.title}</div>
                          {t.description && (
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 max-w-xs mt-0.5">
                              {t.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3.5 space-y-0.5">
                          <div>
                            <span className="text-neutral-400 dark:text-neutral-500">To: </span>
                            <span className="font-semibold text-[#111111] dark:text-white">
                              {getProfileName(t.delegatee_id)}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                            By: {getProfileName(t.delegator_id)}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={
                              isOverdue ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-[#111111] dark:text-neutral-300 font-medium"
                            }
                          >
                            {new Date(t.current_target_date).toLocaleDateString()}
                          </span>
                          {isOverdue && (
                            <div className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider">
                              OVERDUE
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <AnimatedStatusBadge
                            status={t.priority === "CRITICAL" || t.priority === "HIGH" ? "high_priority" : "scheduled"}
                            label={t.priority}
                            size="sm"
                          />
                        </td>
                        <td className="px-6 py-3.5">
                          <AnimatedStatusBadge status={t.status} size="sm" />
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-[#111111] dark:text-white">
                          {t.actual_score} / {t.allocated_score}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
