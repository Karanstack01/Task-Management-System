"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import { changeTaskStatusWithFeedback } from "@/lib/data/task-status-ui";
import { Task, Profile } from "@/types/database.types";
import { UpdateTaskDialog } from "@/components/tasks/update-task-dialog";
import { RevisionDialog } from "@/components/tasks/revision-dialog";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Calendar,
  Award,
  Search,
  ExternalLink,
  Sparkles,
  LayoutGrid,
  List,
  Kanban,
} from "lucide-react";
import { CardSkeleton, KanbanBoardSkeleton, TableSkeleton } from "@/components/common/skeleton-loaders";
import { LiquidStatsCard } from "@/components/common/liquid-stats-card";
import { notify } from "@/lib/notifications/toast-service";
import { AnimatedStatusBadge } from "@/components/common/animated-status-badge";
import { GooeySearch } from "@/components/common/gooey-search";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";
import { TaskCardsGrid } from "@/components/tasks/task-cards-grid";
import { TaskListView } from "@/components/tasks/task-list-view";
import { cn } from "@/lib/utils";

export default function DelegateePortalPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "kanban" | "list">("cards");

  // Dialog states
  const [selectedTaskForUpdate, setSelectedTaskForUpdate] = useState<Task | null>(null);
  const [selectedTaskForRevision, setSelectedTaskForRevision] = useState<Task | null>(null);

  // Active delegatee persona: Priya Sharma (user-del-1)
  const delegateeId = "user-del-1";
  const orgId = "org-sd-01";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const myTasks = await localDb.getTasks({
        orgId,
        role: "DELEGATEE",
        userId: delegateeId,
      });
      setTasks(myTasks);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.task_no.toString().includes(q);
    }
    return true;
  });

  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const awaitingCount = tasks.filter((t) => t.status === "AWAITING_VERIFICATION").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTaskForUpdate(null);
    notify.task(updatedTask.task_no, updatedTask.title, updatedTask.status, {
      description: "Progress status and deliverables synced.",
    });
  };

  const handleRevisionApproved = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTaskForRevision(null);
    notify.info(`Extension Logged: #${updatedTask.task_no}`, {
      description: `New target date: ${new Date(updatedTask.current_target_date).toLocaleDateString()}`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Enterprise Glass Section */}
      <div className="glass-section p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                My Assigned Tasks
              </h1>
              <p className="text-xs text-[#666666] dark:text-neutral-400">
                Priya Sharma &bull; Lead Backend Engineer &bull; Technology
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#111111] dark:text-white bg-black/[0.04] dark:bg-white/[0.06] px-3.5 py-1.5 rounded-full border border-black/[0.06] dark:border-white/[0.08]">
            {inProgressCount} Active Work Items
          </span>
        </div>
      </div>

      {/* Delegatee Performance Snapshot Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LiquidStatsCard
          title="Total Assigned"
          value={tasks.length}
          subtitle="Work items"
          icon={Calendar}
          variant="navy"
          onClick={() => setStatusFilter("ALL")}
          className="cursor-pointer"
        />

        <LiquidStatsCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Active delivery"
          icon={Clock}
          variant="electric"
          onClick={() => setStatusFilter("IN_PROGRESS")}
          className="cursor-pointer"
        />

        <LiquidStatsCard
          title="Awaiting Sign-off"
          value={awaitingCount}
          subtitle="In verification"
          icon={Sparkles}
          variant="ice"
          onClick={() => setStatusFilter("AWAITING_VERIFICATION")}
          className="cursor-pointer"
        />

        <LiquidStatsCard
          title="Completed"
          value={doneCount}
          subtitle={`${tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}% done`}
          progress={tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}
          icon={CheckCircle2}
          variant="chartreuse"
          onClick={() => setStatusFilter("DONE")}
          className="cursor-pointer"
        />
      </div>

      {/* Filter Pills with Glass Well & Elevated Pop */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-section p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs"
                : "glass-well text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter("IN_PROGRESS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "IN_PROGRESS"
                ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs"
                : "glass-well text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setStatusFilter("AWAITING_VERIFICATION")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "AWAITING_VERIFICATION"
                ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs"
                : "glass-well text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
            }`}
          >
            Awaiting Verification ({awaitingCount})
          </button>
          <button
            onClick={() => setStatusFilter("DONE")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "DONE"
                ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs"
                : "glass-well text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
            }`}
          >
            Completed ({doneCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto relative z-30">
          {/* View Mode Switcher */}
          <div className="apple-segmented-group">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "apple-segmented-item",
                viewMode === "cards" && "active"
              )}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "apple-segmented-item",
                viewMode === "list" && "active"
              )}
              title="List Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "apple-segmented-item",
                viewMode === "kanban" && "active"
              )}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          <GooeySearch
            buttonLabel="Search Tasks"
            placeholder="Search my tasks..."
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
              className="text-xs px-2.5 py-1 rounded-full bg-black/[0.05] dark:bg-white/[0.1] text-[#666666] dark:text-[#A1A1A6] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
            >
              Clear &times;
            </button>
          )}
        </div>
      </div>

      {/* Main Tasks View Area: Kanban, Cards, or List with Smooth Fade Animation */}
      <div key={`${viewMode}-${statusFilter}`} className="section-fade-in">
        {loading ? (
          viewMode === "kanban" ? (
            <KanbanBoardSkeleton columns={4} cardsPerColumn={2} />
          ) : viewMode === "list" ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <CardSkeleton count={8} />
            </div>
          )
        ) : filteredTasks.length === 0 ? (
          <div className="apple-card p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-neutral-400 dark:text-neutral-500 mx-auto" />
            <h3 className="font-bold text-[#111111] dark:text-white text-sm">No tasks in this category</h3>
            <p className="text-xs text-[#666666] dark:text-neutral-400">You are all caught up!</p>
          </div>
        ) : viewMode === "kanban" ? (
          <TaskKanbanBoard
            tasks={filteredTasks}
            onTaskClick={(t) => setSelectedTaskForUpdate(t)}
            onStatusChange={async (taskId, newStatus) => {
              const task = tasks.find((t) => t.id === taskId);
              if (!task) return;
              // This portal acts as the delegatee persona: lifecycle + role rules come from the state machine.
              const updated = await changeTaskStatusWithFeedback(task, newStatus, {
                actorRole: "DELEGATEE",
                onProofRequired: (t) => setSelectedTaskForUpdate(t),
              });
              if (updated) {
                setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
              }
            }}
          />
        ) : viewMode === "list" ? (
          <TaskListView
            tasks={filteredTasks}
            onTaskClick={(t) => setSelectedTaskForUpdate(t)}
          />
        ) : (
          <TaskCardsGrid
            tasks={filteredTasks}
            groupBySection={true}
            onTaskClick={(t) => setSelectedTaskForUpdate(t)}
          />
        )}
      </div>

      {/* Update Task Dialog */}
      {selectedTaskForUpdate && (
        <UpdateTaskDialog
          task={selectedTaskForUpdate}
          isOpen={!!selectedTaskForUpdate}
          onClose={() => setSelectedTaskForUpdate(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {/* Revision Dialog */}
      {selectedTaskForRevision && (
        <RevisionDialog
          task={selectedTaskForRevision}
          isOpen={!!selectedTaskForRevision}
          onClose={() => setSelectedTaskForRevision(null)}
          onRevisionApproved={handleRevisionApproved}
        />
      )}
    </div>
  );
}
