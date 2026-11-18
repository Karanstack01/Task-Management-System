"use client";

import React, { useState, useMemo } from "react";
import { Task, TaskStatus } from "@/types/database.types";
import { TaskCard } from "./task-card";
import { ChevronDown, ChevronRight, Layers, Globe, Smartphone, Server, Briefcase, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaskCardsGridProps {
  tasks: Task[];
  groupBySection?: boolean;
  onTaskClick?: (task: Task) => void;
  onNewTask?: () => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  className?: string;
}

interface SectionGroup {
  id: string;
  code: string;
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
}

function getSectionMeta(task: Task): { id: string; code: string; title: string; icon: React.ReactNode } {
  const code = task.department?.code || (
    task.department_id === "dept-web" ? "WEB" :
    task.department_id === "dept-mob" ? "MOB" :
    task.department_id === "dept-ops" ? "OPS" :
    task.department_id === "dept-tech" ? "TECH" :
    task.department_id === "dept-hr" ? "HR" :
    task.department_id === "dept-mkt" ? "MKT" : "CTMS"
  );

  switch (code) {
    case "WEB":
      return { id: "web", code: "WEB", title: "Web Platforms & SaaS", icon: <Globe className="w-4 h-4 text-blue-500" /> };
    case "MOB":
      return { id: "mob", code: "MOB", title: "Mobile Applications", icon: <Smartphone className="w-4 h-4 text-purple-500" /> };
    case "OPS":
      return { id: "ops", code: "OPS", title: "Operations & Logistics", icon: <Briefcase className="w-4 h-4 text-amber-500" /> };
    case "TECH":
      return { id: "tech", code: "TECH", title: "Engineering & Cloud", icon: <Server className="w-4 h-4 text-emerald-500" /> };
    case "HR":
      return { id: "hr", code: "HR", title: "Human Resources", icon: <Users className="w-4 h-4 text-pink-500" /> };
    default:
      return { id: "general", code: "GEN", title: "General Workspace", icon: <Layers className="w-4 h-4 text-indigo-500" /> };
  }
}

export function TaskCardsGrid({
  tasks,
  groupBySection = true,
  onTaskClick,
  onNewTask,
  onStatusChange,
  className,
}: TaskCardsGridProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const sectionGroups = useMemo<SectionGroup[]>(() => {
    const map = new Map<string, SectionGroup>();

    tasks.forEach((task) => {
      const meta = getSectionMeta(task);
      if (!map.has(meta.id)) {
        map.set(meta.id, {
          id: meta.id,
          code: meta.code,
          title: meta.title,
          icon: meta.icon,
          tasks: [],
        });
      }
      map.get(meta.id)!.tasks.push(task);
    });

    return Array.from(map.values());
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="apple-card p-12 text-center space-y-3">
        <Layers className="w-10 h-10 text-neutral-400 dark:text-neutral-500 mx-auto" />
        <h3 className="font-bold text-[#111111] dark:text-white text-base">No tasks found</h3>
        <p className="text-xs text-[#666666] dark:text-[#A3A3A3]">
          Try clearing your filters or create a new deliverable.
        </p>
        {onNewTask && (
          <button
            onClick={onNewTask}
            className="bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Task</span>
          </button>
        )}
      </div>
    );
  }

  if (!groupBySection) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5", className)}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={onTaskClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 sm:space-y-8", className)}>
      {sectionGroups.map((group) => {
        const isCollapsed = !!collapsedSections[group.id];

        return (
          <div key={group.id} className="space-y-3.5">
            {/* Section Header with Elevated Clean White Card */}
            <div
              onClick={() => toggleSection(group.id)}
              className="bg-white dark:bg-[#111111] border border-black/[0.07] dark:border-white/[0.08] flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer select-none hover:bg-neutral-50/80 dark:hover:bg-white/[0.04] transition-all shadow-xs group"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-white/10">
                    {group.icon}
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider text-[#666666] dark:text-[#A3A3A3] font-mono">
                    [{group.code}]
                  </span>
                  <h3 className="text-[13px] font-bold text-[#111111] dark:text-white tracking-[-0.01em]">
                    {group.title}
                  </h3>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 border border-black/[0.04] dark:border-white/[0.06]">
                  {group.tasks.length} tasks
                </span>
              </div>

              <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                {isCollapsed ? "Expand" : "Collapse"}
              </span>
            </div>

            {/* Section Cards Grid */}
            {!isCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 animate-in fade-in-50 duration-200">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={onTaskClick}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TaskCardsGrid;

