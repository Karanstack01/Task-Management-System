"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ── Base Skeleton Component ─────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  variant?: "rectangular" | "circular" | "rounded" | "pill";
}

export function Skeleton({ className = "", variant = "rounded" }: SkeletonProps) {
  const variantClass =
    variant === "circular"
      ? "rounded-full"
      : variant === "pill"
      ? "rounded-full"
      : variant === "rectangular"
      ? "rounded-none"
      : "rounded-xl";

  return (
    <div
      className={cn(
        "liquid-skeleton relative overflow-hidden",
        variantClass,
        className
      )}
      aria-hidden="true"
    />
  );
}

// ── 1. Single Task Deliverable Card Skeleton ────────────────────────────────

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="apple-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-3.5 border border-black/[0.06] dark:border-white/[0.08]"
        >
          {/* Top row: Task ID Pill & Priority Tag */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-20 h-5 rounded-lg" />
              <Skeleton className="w-16 h-5 rounded-lg" />
            </div>
            <Skeleton className="w-6 h-6 rounded-lg" />
          </div>

          {/* Title & Scope lines */}
          <div className="space-y-2 pt-0.5">
            <Skeleton className="w-11/12 h-4 rounded-md" />
            <Skeleton className="w-3/4 h-3.5 rounded-md" />
            <Skeleton className="w-1/2 h-2.5 rounded-md" />
          </div>

          {/* Due Date Well */}
          <div className="glass-well rounded-xl p-2.5 flex items-center gap-2">
            <Skeleton className="w-3.5 h-3.5 rounded-md shrink-0" />
            <Skeleton className="w-28 h-3 rounded-md" />
          </div>

          {/* Card Footer: Assignee Avatars & Meta */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center -space-x-1.5">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="w-5 h-5 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-3 rounded-md" />
              <Skeleton className="w-14 h-3 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── 2. Full 4-Column Kanban Board Skeleton ──────────────────────────────────

export function KanbanBoardSkeleton({
  columns = 4,
  cardsPerColumn = 2,
}: {
  columns?: number;
  cardsPerColumn?: number;
}) {
  return (
    <div className="w-full space-y-5">
      {/* Top Filter & View Bar Placeholder */}
      <div className="apple-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-8 rounded-xl" />
          <Skeleton className="w-28 h-8 rounded-xl" />
          <Skeleton className="w-20 h-8 rounded-xl hidden sm:block" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-36 h-8 rounded-xl" />
          <Skeleton className="w-20 h-8 rounded-xl" />
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-start">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="glass-column p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl space-y-3.5"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Skeleton className="w-28 h-6 rounded-xl" />
                <Skeleton className="w-6 h-5 rounded-lg" />
              </div>
              <Skeleton className="w-5 h-5 rounded-md" />
            </div>

            {/* Column Task Cards */}
            <div className="space-y-3">
              <CardSkeleton count={cardsPerColumn} />
            </div>

            {/* Bottom Add Card Button Placeholder */}
            <Skeleton className="w-full h-8 rounded-xl opacity-75" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Metric Stat Card Skeleton ────────────────────────────────────────────

export function MetricCardSkeleton() {
  return (
    <div className="apple-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3.5 border border-black/[0.06] dark:border-white/[0.08]">
      <div className="flex items-center justify-between">
        <Skeleton className="w-28 h-3.5 rounded-md" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <div className="space-y-1.5 pt-1">
        <Skeleton className="w-24 h-8 rounded-xl" />
        <Skeleton className="w-36 h-3 rounded-md" />
      </div>
      <div className="pt-2">
        <Skeleton className="w-full h-1.5 rounded-full" />
      </div>
    </div>
  );
}

// ── 4. Metric Grid (4 Cards) ────────────────────────────────────────────────

export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── 5. Data Table Skeleton (Headers & Rows) ─────────────────────────────────

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="apple-card rounded-2xl sm:rounded-3xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
      {/* Table Action Bar */}
      <div className="p-4 sm:p-5 border-b border-black/[0.05] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <Skeleton className="w-48 h-5 rounded-xl" />
          <Skeleton className="w-16 h-6 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-32 h-8 rounded-xl" />
          <Skeleton className="w-24 h-8 rounded-xl" />
        </div>
      </div>

      {/* Table Headers */}
      <div className="px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between gap-4 bg-black/[0.02] dark:bg-white/[0.02]">
        <Skeleton className="w-28 h-3.5 rounded-md" />
        <Skeleton className="w-20 h-3.5 rounded-md hidden md:block" />
        <Skeleton className="w-24 h-3.5 rounded-md hidden lg:block" />
        <Skeleton className="w-20 h-3.5 rounded-md hidden sm:block" />
        <Skeleton className="w-16 h-3.5 rounded-md" />
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05] p-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="w-2/5 h-4 rounded-lg" />
                <Skeleton className="w-3/5 h-3 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {Array.from({ length: cols - 2 }).map((_, c) => (
                <Skeleton key={c} className="w-20 h-6 rounded-xl hidden md:block" />
              ))}
              <Skeleton className="w-20 h-6 rounded-xl" />
              <Skeleton className="w-6 h-6 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 6. Full Dashboard Layout Skeleton ───────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="apple-card p-6 sm:p-7 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-black/[0.06] dark:border-white/[0.08]">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <Skeleton className="w-56 h-7 rounded-xl" />
          </div>
          <Skeleton className="w-80 h-3.5 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-32 h-9 rounded-xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
        </div>
      </div>

      {/* 4 Metric Cards */}
      <MetricGridSkeleton count={4} />

      {/* Two Split Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="apple-card rounded-2xl sm:rounded-3xl p-6 space-y-4 border border-black/[0.06] dark:border-white/[0.08] h-72">
          <div className="flex items-center justify-between">
            <Skeleton className="w-44 h-5 rounded-xl" />
            <Skeleton className="w-16 h-5 rounded-lg" />
          </div>
          <Skeleton className="w-full h-44 rounded-2xl" />
        </div>
        <div className="apple-card rounded-2xl sm:rounded-3xl p-6 space-y-4 border border-black/[0.06] dark:border-white/[0.08] h-72">
          <div className="flex items-center justify-between">
            <Skeleton className="w-44 h-5 rounded-xl" />
            <Skeleton className="w-16 h-5 rounded-lg" />
          </div>
          <Skeleton className="w-full h-44 rounded-2xl" />
        </div>
      </div>

      {/* Recent Activity Table */}
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}

// ── 7. Full Page Layout Skeleton (Universal Root Loading) ───────────────────

export function PageLayoutSkeleton({
  viewType = "kanban",
}: {
  viewType?: "kanban" | "table" | "dashboard";
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner Placeholder */}
      <div className="apple-card p-6 sm:p-7 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-black/[0.06] dark:border-white/[0.08]">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <Skeleton className="w-64 h-7 rounded-xl" />
          </div>
          <Skeleton className="w-80 h-3.5 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
        </div>
      </div>

      {/* Metrics Row Placeholder */}
      <MetricGridSkeleton count={4} />

      {/* Main View Area */}
      {viewType === "kanban" ? (
        <KanbanBoardSkeleton columns={4} cardsPerColumn={2} />
      ) : viewType === "table" ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}

// ── 8. Routine Checklist Skeleton ───────────────────────────────────────────

export function ChecklistSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="apple-card rounded-2xl sm:rounded-3xl p-6 space-y-4 border border-black/[0.06] dark:border-white/[0.08]">
      <div className="flex items-center justify-between pb-4 border-b border-black/[0.05] dark:border-white/[0.06]">
        <Skeleton className="w-48 h-6 rounded-xl" />
        <Skeleton className="w-28 h-7 rounded-xl" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="glass-well rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="w-48 h-4 rounded-lg" />
                <Skeleton className="w-24 h-3 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-20 h-6 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 9. Micro / Text Flip Loader Export ──────────────────────────────────────
export { TextFlipLoader, FullPageLoader } from "./text-flip-loader";
