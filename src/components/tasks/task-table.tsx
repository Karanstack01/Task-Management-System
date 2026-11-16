"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { Task, TaskStatus } from "@/types/database.types";
import { isTaskOverdue } from "@/lib/data/task-utils";
import { UpdateTaskDialog } from "./update-task-dialog";
import { RevisionDialog } from "./revision-dialog";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  MoreVertical,
  Paperclip,
  Share2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { notify } from "@/lib/notifications/toast-service";
import { AnimatedStatusBadge } from "@/components/common/animated-status-badge";

interface TaskTableProps {
  tasks: Task[];
  onTaskUpdated?: (updatedTask: Task) => void;
  showDelegatorColumn?: boolean;
  showDelegateeColumn?: boolean;
}

export function TaskTable({
  tasks: initialTasks,
  onTaskUpdated,
  showDelegatorColumn = true,
  showDelegateeColumn = true,
}: TaskTableProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "current_target_date", desc: false },
  ]);

  // Dialog states
  const [updatingTask, setUpdatingTask] = useState<Task | null>(null);
  const [revisingTask, setRevisingTask] = useState<Task | null>(null);

  // Sync internal tasks if props update
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleTaskUpdatedInternal = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (onTaskUpdated) onTaskUpdated(updated);
  };

  const handleCopyShortLink = (link?: string | null) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    notify.success("Shortlink Copied to Clipboard", { description: link });
  };

  // Status Badge Component with moving/acting effect from video source
  const renderStatusBadge = (status: TaskStatus) => {
    return <AnimatedStatusBadge status={status} size="sm" />;
  };

  const renderPriorityBadge = (priority: string) => {
    if (priority === "CRITICAL" || priority === "HIGH") {
      return <AnimatedStatusBadge status="high_priority" label={priority} size="sm" />;
    }
    if (priority === "MEDIUM") {
      return <AnimatedStatusBadge status="scheduled" label="Medium" size="sm" />;
    }
    return <AnimatedStatusBadge status="queued" label="Low" size="sm" />;
  };

  const columns = useMemo<ColumnDef<Task>[]>(() => {
    const cols: ColumnDef<Task>[] = [
      {
        accessorKey: "task_no",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-bold text-slate-700 hover:text-[#0B1B3F]"
          >
            <span>Task #</span>
            <ArrowUpDown size={12} />
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 font-bold text-[#0B1B3F]">
            <span>#{row.original.task_no}</span>
            {row.original.short_link && (
              <button
                onClick={() => handleCopyShortLink(row.original.short_link)}
                className="text-slate-400 hover:text-[#2743F5]"
                title="Copy shortlink"
              >
                <Share2 size={11} />
              </button>
            )}
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "Title & Deliverable Brief",
        cell: ({ row }) => (
          <div className="max-w-xs md:max-w-md">
            <div className="font-bold text-[#0B1B3F] truncate">{row.original.title}</div>
            {row.original.description && (
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {row.original.description}
              </div>
            )}
            {row.original.attachments && row.original.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-[#2743F5] font-semibold mt-1">
                <Paperclip size={11} />
                <span>{row.original.attachments.length} attachment(s)</span>
              </div>
            )}
          </div>
        ),
      },
    ];

    if (showDelegateeColumn) {
      cols.push({
        id: "delegatee",
        header: "Assignee",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#00C48C] text-[#0B1B3F] font-bold text-[10px] flex items-center justify-center shrink-0">
              {row.original.delegatee?.full_name?.substring(0, 2).toUpperCase() || "DE"}
            </div>
            <span className="text-xs font-semibold text-slate-700 truncate">
              {row.original.delegatee?.full_name || "Assignee"}
            </span>
          </div>
        ),
      });
    }

    if (showDelegatorColumn) {
      cols.push({
        id: "delegator",
        header: "Assigner",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600 font-medium truncate">
            {row.original.delegator?.full_name || "Delegator"}
          </span>
        ),
      });
    }

    cols.push(
      {
        accessorKey: "current_target_date",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-bold text-slate-700 hover:text-[#0B1B3F]"
          >
            <span>Target Date</span>
            <ArrowUpDown size={12} />
          </button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.original.current_target_date);
          const isOverdue = isTaskOverdue(row.original);
          return (
            <div className="text-xs">
              <span className={`font-semibold ${isOverdue ? "text-red-600 font-bold" : "text-slate-700"}`}>
                {date.toLocaleDateString()}
              </span>
              {row.original.revision_count > 0 && (
                <span className="block text-[9px] text-amber-600 font-bold">
                  Ext. {row.original.revision_count}/{row.original.max_revision_allowed}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => renderPriorityBadge(row.original.priority),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => renderStatusBadge(row.original.status),
      },
      {
        accessorKey: "actual_score",
        header: "Score",
        cell: ({ row }) => {
          // DONE always carries a score: verified tasks via review, others via direct sign-off.
          if (row.original.status === "DONE") {
            return (
              <span className="font-extrabold text-xs text-emerald-600">
                {row.original.actual_score.toFixed(1)}/{Number(row.original.allocated_score).toFixed(0)}
              </span>
            );
          }
          return <span className="text-slate-400 text-xs">-</span>;
        },
      },
      {
        id: "actions",
        header: () => <span className="text-right block">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setUpdatingTask(row.original)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-[#00C48C] hover:text-[#0B1B3F] text-slate-700 font-bold text-[11px] rounded-md transition-colors"
              title="Update progress & upload proof"
            >
              Update
            </button>
            <button
              onClick={() => setRevisingTask(row.original)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] rounded-md transition-colors"
              title="Request date extension"
            >
              Extend
            </button>
          </div>
        ),
      }
    );

    return cols;
  }, [showDelegateeColumn, showDelegatorColumn]);

  // Filtering
  const filteredData = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && task.status !== statusFilter) {
        return false;
      }
      // 2. Department Filter
      if (departmentFilter !== "ALL" && task.department_id !== departmentFilter) {
        return false;
      }
      // 3. Keyword Search
      if (globalFilter) {
        const q = globalFilter.toLowerCase();
        return (
          task.title.toLowerCase().includes(q) ||
          task.task_no.toString().includes(q) ||
          (task.description && task.description.toLowerCase().includes(q)) ||
          (task.delegatee?.full_name && task.delegatee.full_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tasks, statusFilter, departmentFilter, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <div className="space-y-4">
      {/* Table Control Bar with Glassmorphic Styling */}
      <div className="glass-section p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B] dark:text-neutral-400" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter tasks by number, title, assignee..."
            className="w-full pl-9 pr-4 py-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#2357D6] text-[#111111] dark:text-white placeholder:text-[#86868B]"
          />
        </div>

        {/* Filter Pills with Brand Book High Contrast */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { label: "All Tasks", value: "ALL" },
            { label: "In Progress", value: "IN_PROGRESS" },
            { label: "Verifying", value: "AWAITING_VERIFICATION" },
            { label: "Done", value: "DONE" },
            { label: "Overdue", value: "OVERDUE" },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                statusFilter === pill.value
                  ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs font-semibold"
                  : "glass-well text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Glassmorphic Table Container */}
      <div className="glass-section overflow-hidden shadow-2xs rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02] text-[#666666] dark:text-[#A1A1A6] uppercase font-bold tracking-wider text-[11px] border-b border-black/[0.06] dark:border-white/[0.08]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-[#86868B] dark:text-neutral-400">
                    No tasks match the selected filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle text-[#111111] dark:text-neutral-200">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01] flex items-center justify-between text-xs text-[#666666] dark:text-[#A1A1A6]">
          <div>
            Showing{" "}
            <strong className="text-[#111111] dark:text-white">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                filteredData.length
              )}
            </strong>{" "}
            of <strong className="text-[#111111] dark:text-white">{filteredData.length}</strong> tasks
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
              className="p-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] text-[#111111] dark:text-white transition-colors disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="font-semibold text-[#111111] dark:text-white">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
              className="p-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] text-[#111111] dark:text-white transition-colors disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {updatingTask && (
        <UpdateTaskDialog
          task={updatingTask}
          isOpen={!!updatingTask}
          onClose={() => setUpdatingTask(null)}
          onTaskUpdated={handleTaskUpdatedInternal}
        />
      )}

      {revisingTask && (
        <RevisionDialog
          task={revisingTask}
          isOpen={!!revisingTask}
          onClose={() => setRevisingTask(null)}
          onRevisionApproved={handleTaskUpdatedInternal}
        />
      )}
    </div>
  );
}

