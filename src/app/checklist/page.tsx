"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Square,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Calendar,
  Clock,
  Award,
} from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";

interface RoutineItem {
  id: string;
  title: string;
  category: "MORNING" | "MIDDAY" | "EVENING";
  completed: boolean;
  completedAt?: string;
  estimatedMinutes: number;
}

const initialRoutineItems: RoutineItem[] = [
  {
    id: "item-1",
    title: "Morning Operations & Ticket Triage Standup",
    category: "MORNING",
    completed: true,
    completedAt: "09:30 AM",
    estimatedMinutes: 15,
  },
  {
    id: "item-2",
    title: "Verify Supabase Database Backups & Cloud Snapshots",
    category: "MORNING",
    completed: true,
    completedAt: "10:15 AM",
    estimatedMinutes: 20,
  },
  {
    id: "item-3",
    title: "Audit Pending Verifications & Deliverables Proofs",
    category: "MIDDAY",
    completed: false,
    estimatedMinutes: 30,
  },
  {
    id: "item-4",
    title: "Review Overdue Tasks & Follow-up with Assignees via WhatsApp",
    category: "MIDDAY",
    completed: false,
    estimatedMinutes: 25,
  },
  {
    id: "item-5",
    title: "End of Day Progress Reconciliation & Dispatch Daily Digest",
    category: "EVENING",
    completed: false,
    estimatedMinutes: 20,
  },
];

export default function ChecklistRoutinePage() {
  const [items, setItems] = useState<RoutineItem[]>(initialRoutineItems);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextCompleted = !item.completed;
          return {
            ...item,
            completed: nextCompleted,
            completedAt: nextCompleted
              ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : undefined,
          };
        }
        return item;
      })
    );
  };

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  const handleReset = () => {
    setItems((prev) =>
      prev.map((i) => ({ ...i, completed: false, completedAt: undefined }))
    );
    notify.info("Routine Reset", { description: "Daily routine checklist cleared for a new cycle." });
  };

  const handleCompleteAll = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setItems((prev) =>
      prev.map((i) => ({ ...i, completed: true, completedAt: timeStr }))
    );
    notify.success("All Routine Items Completed!", { description: "100% daily checklist achieved." });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="apple-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                Daily Operational Routine
              </h1>
              <p className="text-xs text-[#666666] dark:text-neutral-400">
                Daily recurring checklist for operational excellence & discipline
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#111111] dark:text-white text-xs font-medium transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            Reset
          </button>
          <button
            onClick={handleCompleteAll}
            className="apple-btn-primary inline-flex items-center gap-1.5 text-xs font-medium py-2 px-4"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete All
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div className="apple-card p-6 space-y-3.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[#111111] dark:text-white">Today&apos;s Operational Progress</span>
          <span className="text-[#111111] dark:text-white font-bold">{progressPercent}% Completed</span>
        </div>

        <div className="w-full bg-black/[0.04] dark:bg-white/[0.06] rounded-full h-2.5 overflow-hidden p-0.5 border border-black/[0.04] dark:border-white/[0.05]">
          <div
            className="bg-[#111111] dark:bg-white h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[#666666] dark:text-neutral-400 pt-1">
          <span className="font-medium">
            {completedCount} of {items.length} tasks checked off
          </span>
          <span className="flex items-center gap-1 text-[#111111] dark:text-white font-medium">
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
            Keep up the momentum
          </span>
        </div>
      </div>

      {/* Checklist items */}
      <div className="apple-card divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                className="focus:outline-none"
                aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
              >
                {item.completed ? (
                  <CheckSquare className="w-5 h-5 text-[#111111] dark:text-white" />
                ) : (
                  <Square className="w-5 h-5 text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400" />
                )}
              </button>
              <div>
                <span
                  className={`text-xs font-semibold transition-all ${
                    item.completed
                      ? "line-through text-neutral-400 dark:text-neutral-500"
                      : "text-[#111111] dark:text-white"
                  }`}
                >
                  {item.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                  <span className="uppercase font-bold text-[#111111] dark:text-neutral-300">{item.category}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    ~{item.estimatedMinutes} mins
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.completedAt && (
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
                  {item.completedAt}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
