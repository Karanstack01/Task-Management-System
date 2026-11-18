"use client";

import React from "react";
import { Task, TaskPriority, TaskStatus } from "@/types/database.types";
import { isTaskOverdue } from "@/lib/data/task-utils";
import { Link2, Calendar, MessageSquare, Paperclip, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  className?: string;
  showSectionBadge?: boolean;
}

export function formatTaskCode(task: Task): string {
  if (task.department?.code) {
    return `${task.department.code} - ${task.task_no}`;
  }
  // Try extracting code from department_id or default to WEB / MOB / CTMS
  if (task.department_id === "dept-web") return `WEB - ${task.task_no}`;
  if (task.department_id === "dept-mob") return `MOB - ${task.task_no}`;
  if (task.department_id === "dept-ops") return `OPS - ${task.task_no}`;
  if (task.department_id === "dept-tech") return `TECH - ${task.task_no}`;
  if (task.department_id === "dept-hr") return `HR - ${task.task_no}`;
  if (task.department_id === "dept-mkt") return `MKT - ${task.task_no}`;
  return `CTMS - ${task.task_no}`;
}

export function formatDueDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatActivityDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recent";
  }
}

export function PriorityBadge({ priority }: { priority: TaskPriority | string }) {
  const p = (priority || "MEDIUM").toUpperCase();

  switch (p) {
    case "CRITICAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#FEE4E2]/90 text-[#D92D20] dark:bg-[#D92D20]/20 dark:text-[#F97066] border border-[#FECDCA]/60 dark:border-[#D92D20]/30 select-none">
          <span className="font-semibold">P</span> Urgent
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#EEEEEE]/90 text-[#333333] dark:bg-[#333333]/20 dark:text-[#A3A3A3] border border-[#EEEEEE]/60 dark:border-[#333333]/30 select-none">
          <span className="font-semibold">P</span> High
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#FEF0C7]/90 text-[#B54708] dark:bg-[#B54708]/20 dark:text-[#FDB022] border border-[#FEDF89]/60 dark:border-[#B54708]/30 select-none">
          <span className="font-semibold">P</span> Medium
        </span>
      );
    case "LOW":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#D1FADF]/90 text-[#027A48] dark:bg-[#027A48]/20 dark:text-[#6CE9A6] border border-[#A6F4C5]/60 dark:border-[#027A48]/30 select-none">
          <span className="font-semibold">P</span> Low
        </span>
      );
  }
}

export function TaskCard({
  task,
  onClick,
  onStatusChange,
  className,
  showSectionBadge = false,
}: TaskCardProps) {
  const code = formatTaskCode(task);
  const isOverdue = isTaskOverdue(task);

  // Pseudo comment / activity count based on task number
  const commentCount = ((task.task_no * 7) % 89) + (task.attachments?.length || 1);

  return (
    <div
      onClick={() => onClick?.(task)}
      className={cn(
        "apple-card group relative flex flex-col justify-between p-3.5 sm:p-4",
        "transition-all duration-200 cursor-pointer select-none",
        className
      )}
    >
      <div>
        {/* Top Header: Code + Priority Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#666666] dark:text-[#A3A3A3]">
            <Link2 className="w-3.5 h-3.5 text-[#666666] group-hover:text-brand dark:group-hover:text-brand transition-colors shrink-0" />
            <span className="tracking-tight font-mono text-[10.5px] font-medium text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded bg-black/[0.035] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]">
              {code}
            </span>
          </div>

          <PriorityBadge priority={task.priority} />
        </div>

        {/* Task Title - Brand Book Inter SemiBold */}
        <h4 className="mt-2 text-[13px] font-semibold tracking-[-0.011em] text-[#111111] dark:text-neutral-100 leading-snug line-clamp-2 group-hover:text-brand dark:group-hover:text-brand transition-colors">
          {task.title}
        </h4>

        {/* Subtitle / Description - Subtle Regular */}
        {task.description && (
          <p className="mt-1 text-[11.5px] text-[#666666] dark:text-[#666666] font-normal leading-relaxed line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Due Date Pill - Refined compact chip */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-normal bg-black/[0.025] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-[#666666] dark:text-[#666666]">
          <Calendar className="w-3 h-3 text-[#666666] shrink-0" />
          <span className={cn(isOverdue && "text-rose-600 dark:text-rose-400 font-medium")}>
            Due to: {formatDueDate(task.current_target_date)}
          </span>
          {isOverdue && (
            <span className="text-[9px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider ml-0.5">
              Overdue
            </span>
          )}
        </div>
      </div>

      {/* Footer Row: Overlapping Avatars + Comments + Activity Date */}
      <div className="mt-3.5 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
        {/* Overlapping Avatars */}
        <div className="flex items-center -space-x-1.5">
          {/* Avatar 1: Delegatee */}
          <div
            className="relative w-5 h-5 rounded-full ring-2 ring-white dark:ring-[#181818] shadow-2xs bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[8px] font-medium overflow-hidden"
            title={`Assignee: ${task.delegatee?.full_name || "Assignee"}`}
          >
            {task.delegatee?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.delegatee.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              (task.delegatee?.full_name || "DE").substring(0, 2).toUpperCase()
            )}
          </div>

          {/* Avatar 2: Delegator */}
          <div
            className="relative w-5 h-5 rounded-full ring-2 ring-white dark:ring-[#181818] shadow-2xs bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[8px] font-medium overflow-hidden"
            title={`Assigner: ${task.delegator?.full_name || "Manager"}`}
          >
            {task.delegator?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.delegator.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              (task.delegator?.full_name || "BO").substring(0, 2).toUpperCase()
            )}
          </div>

          {/* Avatar 3: Team Indicator Pill */}
          <div className="relative w-5 h-5 rounded-full ring-2 ring-white dark:ring-[#181818] shadow-2xs bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[8px] font-medium">
            +2
          </div>
        </div>

        {/* Right Info: Comment Count & Creation Date */}
        <div className="flex items-center gap-2 text-[10.5px] text-[#666666] dark:text-[#666666]">
          <div className="flex items-center gap-1 font-normal px-1.5 py-0.5 rounded bg-black/[0.025] dark:bg-white/[0.04]">
            <MessageSquare className="w-3 h-3 text-[#666666]" />
            <span>{commentCount}</span>
          </div>

          <span>
            {formatActivityDate(task.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;

