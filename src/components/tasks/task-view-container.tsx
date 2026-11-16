"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskPriority, TaskStatus } from "@/types/database.types";
import { changeTaskStatusWithFeedback } from "@/lib/data/task-status-ui";
import { useUIStore } from "@/lib/store/ui-store";
import { TaskKanbanBoard } from "./task-kanban-board";
import { TaskCardsGrid } from "./task-cards-grid";
import { TaskListView } from "./task-list-view";
import { UpdateTaskDialog } from "./update-task-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import {
  LayoutGrid,
  List,
  Kanban,
  Search,
  Plus,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskViewMode = "kanban" | "cards" | "list";

export interface TaskViewContainerProps {
  initialTasks: Task[];
  title?: string;
  subtitle?: string;
  defaultView?: TaskViewMode;
  allowViewSwitch?: boolean;
  showSectionFilter?: boolean;
  onTaskUpdated?: (updatedTask: Task) => void;
  className?: string;
}

export function TaskViewContainer({
  initialTasks,
  title = "Task Management",
  subtitle = "Section-wise deliverables across cards, list, and kanban views",
  defaultView = "kanban",
  allowViewSwitch = true,
  showSectionFilter = true,
  onTaskUpdated,
  className,
}: TaskViewContainerProps) {
  const router = useRouter();
  const activeRole = useUIStore((s) => s.activeRole);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [viewMode, setViewMode] = useState<TaskViewMode>(defaultView);
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [groupBySection, setGroupBySection] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected task for updating deliverables / progress dialog
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // Selected task for full detail editing / delete dialog (Delegator)
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Sync tasks when initialTasks prop updates
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Extract distinct sections from tasks
  const sectionPills = useMemo(() => {
    const sectionMap = new Map<string, { code: string; label: string; count: number }>();

    tasks.forEach((t) => {
      const code = t.department?.code || (
        t.department_id === "dept-web" ? "WEB" :
        t.department_id === "dept-mob" ? "MOB" :
        t.department_id === "dept-ops" ? "OPS" :
        t.department_id === "dept-tech" ? "TECH" :
        t.department_id === "dept-hr" ? "HR" :
        t.department_id === "dept-mkt" ? "MKT" : "CTMS"
      );

      const label = t.department?.name || (
        code === "WEB" ? "Web Platforms" :
        code === "MOB" ? "Mobile Apps" :
        code === "OPS" ? "Operations" :
        code === "TECH" ? "Cloud & Tech" :
        code === "HR" ? "Human Resources" :
        code === "MKT" ? "Marketing" : "General"
      );

      if (!sectionMap.has(code)) {
        sectionMap.set(code, { code, label, count: 0 });
      }
      sectionMap.get(code)!.count += 1;
    });

    return Array.from(sectionMap.values());
  }, [tasks]);

  // Filter tasks based on search, section, priority, and status
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = (t.department?.code || "").toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = (t.description || "").toLowerCase().includes(q);
        const matchesNo = String(t.task_no).includes(q);
        const matchesCode = code.includes(q);
        if (!matchesTitle && !matchesDesc && !matchesNo && !matchesCode) {
          return false;
        }
      }

      // 2. Section / Department Filter
      if (selectedSection !== "ALL") {
        const taskCode = t.department?.code || (
          t.department_id === "dept-web" ? "WEB" :
          t.department_id === "dept-mob" ? "MOB" :
          t.department_id === "dept-ops" ? "OPS" :
          t.department_id === "dept-tech" ? "TECH" :
          t.department_id === "dept-hr" ? "HR" :
          t.department_id === "dept-mkt" ? "MKT" : "CTMS"
        );
        if (taskCode !== selectedSection) {
          return false;
        }
      }

      // 3. Priority Filter
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) {
        return false;
      }

      // 4. Status Filter (Kanban manages its own columns, but cards/list respect it)
      if (viewMode !== "kanban" && statusFilter !== "ALL") {
        if (t.status !== statusFilter) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedSection, priorityFilter, statusFilter, viewMode]);

  // Status transitions are validated by the task state machine (see task-state-machine.ts)
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updated = await changeTaskStatusWithFeedback(task, newStatus, {
      actorRole: activeRole,
      onProofRequired: (t) => setActiveTask(t), // open the upload dialog
    });
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      onTaskUpdated?.(updated);
    }
  };

  const handleTaskSaved = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    onTaskUpdated?.(updatedTask);
  };

  return (
    <div className={cn("space-y-5 select-none", className)}>
      {/* ========================================================================= */}
      {/* Top Controls Bar: View Switcher, Search, Section Tabs & Add Task          */}
      {/* ========================================================================= */}
      <div className="glass-section p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Row 1: Header Title + View Mode Segmented Controls + New Task */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-white">
                {title}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold glass-pop bg-[#2357D6]/10 text-[#2357D6] dark:bg-[#D4F20D]/20 dark:text-[#D4F20D]">
                {filteredTasks.length} tasks
              </span>
            </div>
            {subtitle && (
              <p className="text-xs text-[#86868B] dark:text-[#A1A1A6] mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* View Mode Segmented Switcher */}
            {allowViewSwitch && (
              <div className="apple-segmented-group">
                {/* Kanban View */}
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

                {/* Cards View */}
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

                {/* List View */}
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
              </div>
            )}

            {/* Create Task Button (Brand Book Minimalist Primary) */}
            <button
              type="button"
              onClick={() => router.push("/tasks/create")}
              className="apple-btn-primary flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-semibold cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Row 2: Section-Wise Tabs & Filter Pills */}
        {showSectionFilter && (
          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            {/* Section Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B] mr-1 hidden sm:inline">
                Section:
              </span>

              <button
                type="button"
                onClick={() => setSelectedSection("ALL")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs transition-all cursor-pointer",
                  selectedSection === "ALL"
                    ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs font-black"
                    : "glass-well text-[#666666] dark:text-[#9E9EA4] hover:text-[#111111] dark:hover:text-white font-medium"
                )}
              >
                All Sections ({tasks.length})
              </button>

              {sectionPills.map((sec) => (
                <button
                  key={sec.code}
                  type="button"
                  onClick={() => setSelectedSection(sec.code)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all cursor-pointer",
                    selectedSection === sec.code
                      ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs font-black"
                      : "glass-well text-[#666666] dark:text-[#9E9EA4] hover:text-[#111111] dark:hover:text-white font-medium"
                  )}
                >
                  <span className="font-mono text-[10px] font-bold opacity-75">
                    {sec.code}
                  </span>
                  <span>{sec.label}</span>
                  <span className="text-[10px] opacity-60">({sec.count})</span>
                </button>
              ))}
            </div>

            {/* Secondary Controls: Search & Group-by Toggle */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Search Bar with Glass Well */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks or #ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs glass-well text-[#111111] dark:text-white outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all placeholder:text-neutral-400 font-medium"
                />
              </div>

              {/* Group by Section Toggle (for cards and list) */}
              {viewMode !== "kanban" && (
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#666666] dark:text-[#A1A1A6] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupBySection}
                    onChange={(e) => setGroupBySection(e.target.checked)}
                    className="rounded border-neutral-300 text-[#111111] dark:text-white focus:ring-0 cursor-pointer"
                  />
                  <span className="hidden md:inline">Group Sections</span>
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Main View Area: Render Active View Mode with Fluid Cross-Fade Animation   */}
      {/* ========================================================================= */}
      <div key={viewMode} className="section-fade-in">
        {viewMode === "kanban" && (
          <TaskKanbanBoard
            tasks={filteredTasks}
            onTaskClick={(task) => setActiveTask(task)}
            onNewTask={(status) => router.push(`/tasks/create${status ? `?status=${status}` : ""}`)}
            onStatusChange={handleStatusChange}
          />
        )}

        {viewMode === "cards" && (
          <TaskCardsGrid
            tasks={filteredTasks}
            groupBySection={groupBySection}
            onTaskClick={(task) => setActiveTask(task)}
            onNewTask={() => router.push("/tasks/create")}
            onStatusChange={handleStatusChange}
          />
        )}

        {viewMode === "list" && (
          <TaskListView
            tasks={filteredTasks}
            groupBySection={groupBySection}
            onTaskClick={(task) => setActiveTask(task)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* Update Task Dialog (Proof of Work with MagneticDropZone)                  */}
      {/* ========================================================================= */}
      {activeTask && (
        <UpdateTaskDialog
          task={activeTask}
          isOpen={!!activeTask}
          onClose={() => setActiveTask(null)}
          onTaskUpdated={handleTaskSaved}
          onEditDetails={(t) => setEditingTask(t)}
        />
      )}

      {/* ========================================================================= */}
      {/* Edit Task Dialog: Full Scope, Detail, Timeline, & Delete (Delegator)      */}
      {/* ========================================================================= */}
      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onTaskSaved={(updated) => {
            handleTaskSaved(updated);
            setEditingTask(null);
          }}
          onTaskDeleted={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t.id !== deletedId));
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

export default TaskViewContainer;

