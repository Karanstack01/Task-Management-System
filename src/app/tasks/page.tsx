"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import { useActiveOrgId } from "@/lib/hooks/use-active-org";
import { Task } from "@/types/database.types";
import { TaskViewContainer } from "@/components/tasks/task-view-container";
import { KanbanBoardSkeleton, Skeleton } from "@/components/common/skeleton-loaders";

export default function TasksPage() {
  const orgId = useActiveOrgId();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await localDb.getTasks({ orgId });
        setTasks(data);
      } catch (err) {
        console.error("Failed to load tasks", err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="glass-section p-6 sm:p-7 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-black/[0.06] dark:border-white/[0.08]">
          <div className="space-y-2">
            <Skeleton className="w-64 h-7 rounded-xl" />
            <Skeleton className="w-80 h-3.5 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-28 h-9 rounded-xl" />
            <Skeleton className="w-28 h-9 rounded-xl" />
          </div>
        </div>
        <KanbanBoardSkeleton columns={4} cardsPerColumn={2} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <TaskViewContainer
        initialTasks={tasks}
        title="Enterprise Tasks & Deliverables"
        subtitle="Manage and track section-wise deliverables across Cards, List, and Kanban views"
        defaultView="kanban"
      />
    </div>
  );
}

