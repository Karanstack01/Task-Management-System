"use client";

import React, { useState, useMemo } from "react";
import { Task, TaskStatus } from "@/types/database.types";
import { isTaskOverdue } from "@/lib/data/task-utils";
import { AnimatedStatusBadge } from "@/components/common/animated-status-badge";
import { PriorityBadge, formatTaskCode, formatDueDate } from "./task-card";
import { Link2, Calendar, Share2, Paperclip, ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { cn } from "@/lib/utils";

export interface TaskListViewProps {
  tasks: Task[];
  groupBySection?: boolean;
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  className?: string;
}

export function TaskListView({
  tasks,
  groupBySection = false,
  onTaskClick,
  onStatusChange,
  className,
}: TaskListViewProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const handleCopyLink = (e: React.MouseEvent, link?: string | null) => {
    e.stopPropagation();
    if (!link) return;
    navigator.clipboard.writeText(link);
    notify.success("Shortlink Copied", { description: link });
  };

  // Grouping logic if groupBySection is enabled
  const groupedTasks = useMemo(() => {
    if (!groupBySection) return null;
    const map = new Map<string, { code: string; name: string; tasks: Task[] }>();

    tasks.forEach((t) => {
      const code = t.department?.code || (
        t.department_id === "dept-web" ? "WEB" :
        t.department_id === "dept-mob" ? "MOB" :
        t.department_id === "dept-ops" ? "OPS" :
        t.department_id === "dept-tech" ? "TECH" :
        t.department_id === "dept-hr" ? "HR" : "CTMS"
      );
      const name = t.department?.name || `${code} Department`;

      if (!map.has(code)) {
        map.set(code, { code, name, tasks: [] });
      }
      map.get(code)!.tasks.push(t);
    });

    return Array.from(map.values());
  }, [tasks, groupBySection]);

  const renderTableRows = (items: Task[]) => {
    if (items.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="px-6 py-8 text-center text-xs text-[#666666] dark:text-[#A3A3A3]">
            No tasks found in this view.
          </td>
        </tr>
      );
    }

    return items.map((t) => {
      const code = formatTaskCode(t);
      const isOverdue = isTaskOverdue(t);

      return (
        <tr
          key={t.id}
          onClick={() => onTaskClick?.(t)}
          className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
        >
          {/* # Task Code */}
          <td className="px-5 py-3.5 font-mono font-bold text-xs text-[#111111] dark:text-white whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 border border-black/[0.04] dark:border-white/[0.06] text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                {code}
              </span>
              {t.short_link && (
                <button
                  type="button"
                  onClick={(e) => handleCopyLink(e, t.short_link)}
                  className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-brand transition-opacity p-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                  title="Copy shortlink"
                >
                  <Share2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </td>

          {/* Title & Description */}
          <td className="px-5 py-3.5 max-w-xs md:max-w-sm">
            <div className="font-bold text-xs text-[#111111] dark:text-white truncate group-hover:text-brand dark:group-hover:text-brand transition-colors">
              {t.title}
            </div>
            {t.description && (
              <div className="text-[11px] text-[#666666] dark:text-[#A3A3A3] truncate mt-0.5">
                {t.description}
              </div>
            )}
            {t.attachments && t.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-brand dark:text-brand font-medium mt-0.5">
                <Paperclip className="w-3 h-3" />
                <span>{t.attachments.length} attachment(s)</span>
              </div>
            )}
          </td>

          {/* Assignee & Assigner */}
          <td className="px-5 py-3.5 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                {(t.delegatee?.full_name || "DE").substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#111111] dark:text-white truncate">
                  {t.delegatee?.full_name || "Assignee"}
                </div>
                <div className="text-[10px] text-[#666666] dark:text-[#A3A3A3] truncate">
                  By: {t.delegator?.full_name || "Manager"}
                </div>
              </div>
            </div>
          </td>

          {/* Target Date */}
          <td className="px-5 py-3.5 whitespace-nowrap text-xs">
            <span
              className={cn(
                "font-medium",
                isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[#111111] dark:text-neutral-300"
              )}
            >
              {formatDueDate(t.current_target_date)}
            </span>
            {isOverdue && (
              <div className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Overdue
              </div>
            )}
          </td>

          {/* Priority */}
          <td className="px-5 py-3.5 whitespace-nowrap">
            <PriorityBadge priority={t.priority} />
          </td>

          {/* Status */}
          <td className="px-5 py-3.5 whitespace-nowrap">
            <AnimatedStatusBadge status={t.status} size="sm" />
          </td>

          {/* Score */}
          <td className="px-5 py-3.5 whitespace-nowrap text-right font-bold text-xs">
            {t.status === "DONE" ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                {t.actual_score.toFixed(1)}/{Number(t.allocated_score).toFixed(0)}
              </span>
            ) : (
              <span className="text-neutral-400 font-normal">—</span>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className={cn("apple-card overflow-hidden shadow-md", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#666666] dark:text-neutral-400 select-none">
          <thead className="bg-neutral-50/90 dark:bg-white/[0.04] text-[11px] font-semibold text-[#111111] dark:text-white uppercase tracking-wider border-b border-black/[0.06] dark:border-white/[0.08]">
            <tr>
              <th className="px-5 py-3.5"># Task</th>
              <th className="px-5 py-3.5">Title & Deliverable</th>
              <th className="px-5 py-3.5">Assignee</th>
              <th className="px-5 py-3.5">Target Date</th>
              <th className="px-5 py-3.5">Priority</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Score</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
            {!groupedTasks ? (
              renderTableRows(tasks)
            ) : (
              groupedTasks.map((group) => {
                const isCollapsed = !!collapsedSections[group.code];
                return (
                  <React.Fragment key={group.code}>
                    {/* Section Separator Header */}
                    <tr
                      onClick={() =>
                        setCollapsedSections((prev) => ({
                          ...prev,
                          [group.code]: !prev[group.code],
                        }))
                      }
                      className="bg-neutral-50/80 dark:bg-white/[0.03] cursor-pointer hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors border-y border-black/[0.04] dark:border-white/[0.06]"
                    >
                      <td colSpan={7} className="px-5 py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                            )}
                            <span className="font-bold font-mono text-[11px] text-[#111111] dark:text-white px-1.5 py-0.5 rounded glass-pop">
                              [{group.code}]
                            </span>
                            <span className="font-bold text-xs text-[#111111] dark:text-white">
                              {group.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold glass-pop text-neutral-800 dark:text-neutral-200">
                              {group.tasks.length} tasks
                            </span>
                          </div>

                          <span className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                            {isCollapsed ? "Expand" : "Collapse"}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {!isCollapsed && renderTableRows(group.tasks)}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TaskListView;

