"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import { Task, Profile } from "@/types/database.types";
import {
  Users,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  ExternalLink,
  Search,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { TableSkeleton, MetricGridSkeleton } from "@/components/common/skeleton-loaders";
import { AnimatedStatusBadge } from "@/components/common/animated-status-badge";
import { GooeySearch } from "@/components/common/gooey-search";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import { notify } from "@/lib/notifications/toast-service";

import { useActiveOrgId } from "@/lib/hooks/use-active-org";

export default function DelegatorPortalPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "IN_PROGRESS" | "AWAITING_VERIFICATION" | "DONE">("ALL");
  const [search, setSearch] = useState("");

  // Edit & Delete Dialog states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const delegatorId = "user-delegator";
  const orgId = useActiveOrgId();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [allTasks, profs] = await Promise.all([
        localDb.getTasks({ orgId, role: "DELEGATOR", userId: delegatorId }),
        localDb.getProfiles(orgId),
      ]);
      setTasks(allTasks);
      setProfiles(profs);
    } finally {
      setLoading(false);
    }
  }

  const handleTaskSaved = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleTaskDeleted = (deletedTaskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
  };

  const handleDirectDelete = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      const success = await localDb.deleteTask(deletingTask.id);
      if (success) {
        notify.success("Task Deleted", {
          description: `Task #${deletingTask.task_no} has been permanently deleted.`,
        });
        handleTaskDeleted(deletingTask.id);
        setDeletingTask(null);
      } else {
        notify.error("Delete Failed", { description: "Task not found." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete task";
      notify.error("Delete Failed", { description: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab !== "ALL" && t.status !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.task_no.toString().includes(q);
    }
    return true;
  });

  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const awaitingCount = tasks.filter((t) => t.status === "AWAITING_VERIFICATION").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.full_name || id;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Enterprise Glass Section */}
      <div className="glass-section p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                Delegator Workspace
              </h1>
              <p className="text-xs text-[#666666] dark:text-neutral-400">
                Manage tasks assigned to your direct reports & audit deliverables
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/verify"
            className="apple-btn-secondary inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-semibold transition-all shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>Verify Queue ({awaitingCount})</span>
          </a>

          <a
            href="/tasks/create"
            className="apple-btn-primary inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Delegate Task</span>
          </a>
        </div>
      </div>

      {/* Tab Cards (Minimal Brand Glassmorphism) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`p-5 rounded-2xl text-left transition-all cursor-pointer select-none active:scale-[0.98] duration-200 ${
            activeTab === "ALL"
              ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-md border border-[#111111] dark:border-white scale-[1.01]"
              : "apple-card text-[#111111] dark:text-white hover:border-black/20 dark:hover:border-white/20"
          }`}
        >
          <div className={`text-xs font-bold uppercase tracking-wider ${activeTab === "ALL" ? "text-neutral-300 dark:text-neutral-600" : "text-[#666666] dark:text-neutral-400"}`}>
            All Assigned
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${activeTab === "ALL" ? "text-white dark:text-[#111111]" : "text-[#111111] dark:text-white"}`}>{tasks.length}</div>
        </button>

        <button
          onClick={() => setActiveTab("IN_PROGRESS")}
          className={`p-5 rounded-2xl text-left transition-all cursor-pointer select-none active:scale-[0.98] duration-200 ${
            activeTab === "IN_PROGRESS"
              ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-md border border-[#111111] dark:border-white scale-[1.01]"
              : "apple-card text-[#111111] dark:text-white hover:border-black/20 dark:hover:border-white/20"
          }`}
        >
          <div className={`text-xs font-bold uppercase tracking-wider ${activeTab === "IN_PROGRESS" ? "text-neutral-300 dark:text-neutral-600" : "text-[#666666] dark:text-neutral-400"}`}>
            In Progress
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${activeTab === "IN_PROGRESS" ? "text-white dark:text-[#111111]" : "text-[#111111] dark:text-white"}`}>{inProgressCount}</div>
        </button>

        <button
          onClick={() => setActiveTab("AWAITING_VERIFICATION")}
          className={`p-5 rounded-2xl text-left transition-all cursor-pointer select-none active:scale-[0.98] duration-200 ${
            activeTab === "AWAITING_VERIFICATION"
              ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-md border border-[#111111] dark:border-white scale-[1.01]"
              : "apple-card text-[#111111] dark:text-white hover:border-black/20 dark:hover:border-white/20"
          }`}
        >
          <div className={`text-xs font-bold uppercase tracking-wider ${activeTab === "AWAITING_VERIFICATION" ? "text-neutral-300 dark:text-neutral-600" : "text-[#666666] dark:text-neutral-400"}`}>
            Awaiting Verification
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${activeTab === "AWAITING_VERIFICATION" ? "text-white dark:text-[#111111]" : "text-[#111111] dark:text-white"}`}>{awaitingCount}</div>
        </button>

        <button
          onClick={() => setActiveTab("DONE")}
          className={`p-5 rounded-2xl text-left transition-all cursor-pointer select-none active:scale-[0.98] duration-200 ${
            activeTab === "DONE"
              ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-md border border-[#111111] dark:border-white scale-[1.01]"
              : "apple-card text-[#111111] dark:text-white hover:border-black/20 dark:hover:border-white/20"
          }`}
        >
          <div className={`text-xs font-bold uppercase tracking-wider ${activeTab === "DONE" ? "text-neutral-300 dark:text-neutral-600" : "text-[#666666] dark:text-neutral-400"}`}>
            Verified & Completed
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${activeTab === "DONE" ? "text-white dark:text-[#111111]" : "text-[#111111] dark:text-white"}`}>{doneCount}</div>
        </button>
      </div>

      {/* Tasks Table with Smooth Tab Transition */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div key={activeTab} className="glass-section tab-switch-enter">
          <div className="p-4 border-b border-black/[0.05] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 relative z-30">
            <h2 className="text-base font-extrabold text-[#111111] dark:text-white tracking-tight flex items-center gap-2">
              <span>Delegated Tasks</span>
              <span className="px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-xs font-black text-[#111111] dark:text-white">
                {filteredTasks.length}
              </span>
            </h2>
            <div className="flex items-center gap-2">
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
                  className="text-xs px-2.5 py-1 rounded-full bg-black/[0.05] dark:bg-white/[0.1] text-[#666666] dark:text-[#A3A3A3] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
                >
                  Clear &times;
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-b-2xl">
            <table className="w-full text-left text-sm text-[#666666] dark:text-neutral-400">
              <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-[11px] font-extrabold text-[#222222] dark:text-neutral-200 uppercase tracking-wider border-b border-black/[0.08] dark:border-white/[0.08]">
                <tr>
                  <th className="px-5 py-3.5 w-44">Actions</th>
                  <th className="px-5 py-3.5"># Task</th>
                  <th className="px-5 py-3.5">Title</th>
                  <th className="px-5 py-3.5">Assigned To</th>
                  <th className="px-5 py-3.5">Target Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05] font-medium text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500 font-medium">
                      No delegated tasks matching this view.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      {/* Very First Column: Actions (Edit, Delete, Verify) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {/* Edit Task Action */}
                          <button
                            type="button"
                            onClick={() => setEditingTask(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#111111] dark:text-white bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] transition-colors cursor-pointer shadow-2xs"
                            title="Edit task details & scope"
                          >
                            <Pencil className="w-3 h-3 text-[#111111] dark:text-brand" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Task Action */}
                          <button
                            type="button"
                            onClick={() => setDeletingTask(t)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Verify Action (if awaiting verification) */}
                          {t.status === "AWAITING_VERIFICATION" && (
                            <a
                              href="/verify"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand hover:bg-brand/20 transition-colors"
                              title="Verify deliverables"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verify</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* # Task Column */}
                      <td className="px-5 py-3.5 font-mono font-semibold text-[#111111] dark:text-white">
                        #{t.task_no}
                      </td>

                      {/* Title Column */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#111111] dark:text-white">{t.title}</div>
                        {t.description && (
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 max-w-sm mt-0.5">
                            {t.description}
                          </div>
                        )}
                      </td>

                      {/* Assigned To Column */}
                      <td className="px-5 py-3.5 text-[#111111] dark:text-white font-medium">
                        {getProfileName(t.delegatee_id)}
                      </td>

                      {/* Target Date Column */}
                      <td className="px-5 py-3.5 text-[#666666] dark:text-neutral-300 font-medium">
                        {new Date(t.current_target_date).toLocaleDateString()}
                      </td>

                      {/* Status Column */}
                      <td className="px-5 py-3.5">
                        <AnimatedStatusBadge status={t.status} size="sm" />
                      </td>

                      {/* Score Column */}
                      <td className="px-5 py-3.5 font-bold text-[#111111] dark:text-white text-right">
                        {t.status === "DONE" ? `${t.actual_score} pts` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Delegated Task Dialog */}
      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onTaskSaved={handleTaskSaved}
          onTaskDeleted={handleTaskDeleted}
        />
      )}

      {/* Quick Delete Confirmation Modal */}
      {deletingTask && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => {
              if (!isDeleting) setDeletingTask(null);
            }}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-2xl sm:rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/40 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111111] dark:text-white">
                  Delete Task #{deletingTask.task_no}?
                </h3>
                <p className="text-xs text-[#666666] dark:text-neutral-400">
                  This will permanently remove this delegated commitment.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl glass-well text-xs font-medium text-[#111111] dark:text-white">
              <p className="font-semibold line-clamp-1">{deletingTask.title}</p>
              {deletingTask.description && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                  {deletingTask.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingTask(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-[#111111] dark:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
