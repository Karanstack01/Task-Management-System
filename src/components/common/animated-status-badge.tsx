"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "queued"
  | "scheduled"
  | "in_progress"
  | "high_priority"
  | "ready"
  | "waiting"
  | "paused"
  | "reviewing"
  | "overdue";

export interface AnimatedStatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Normalizes input status strings from database/API into video design variants
 */
export function normalizeStatusVariant(status: string): StatusVariant {
  const s = status.toUpperCase().replace(/[\s-]/g, "_");
  switch (s) {
    case "QUEUED":
    case "PENDING":
      return "queued";
    case "SCHEDULED":
    case "RECURRING":
      return "scheduled";
    case "IN_PROGRESS":
    case "INPROGRESS":
    case "PROGRESS":
    case "ACTIVE":
      return "in_progress";
    case "HIGH_PRIORITY":
    case "CRITICAL":
    case "HIGH":
    case "URGENT":
      return "high_priority";
    case "READY":
    case "DONE":
    case "COMPLETED":
    case "VERIFIED":
      return "ready";
    case "WAITING":
    case "AWAITING_VERIFICATION":
    case "AWAITING":
      return "waiting";
    case "PAUSED":
    case "BLOCKED":
    case "ON_HOLD":
      return "paused";
    case "REVIEWING":
    case "VERIFYING":
    case "AUDIT":
      return "reviewing";
    case "OVERDUE":
      return "high_priority";
    default:
      return "queued";
  }
}

/**
 * Animated SVG Icon 1: Queued (Solid circular badge with spinning clock hand)
 */
function QueuedIcon() {
  return (
    <div className="relative w-4 h-4 rounded-full bg-[#8B5CF6] dark:bg-[#A78BFA] flex items-center justify-center shrink-0 shadow-xs">
      {/* Clock Face & Animated Hand */}
      <svg
        className="w-3 h-3 text-white dark:text-[#1E1B4B]"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        {/* Animated Minute Hand */}
        <line
          x1="8"
          y1="8"
          x2="8"
          y2="3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="animate-icon-clock"
        />
        {/* Fixed Hour Hand */}
        <line
          x1="8"
          y1="8"
          x2="10.5"
          y2="8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Animated SVG Icon 2: Scheduled (Calendar badge with "17" and flapping motion)
 */
function ScheduledIcon() {
  return (
    <div className="relative w-4 h-4 rounded-[5px] bg-[#0284C7] dark:bg-[#38BDF8] flex items-center justify-center shrink-0 shadow-xs animate-icon-calendar">
      <svg
        className="w-3 h-3 text-white dark:text-[#082F49]"
        viewBox="0 0 16 16"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Calendar top hooks */}
        <rect x="3.5" y="1" width="1.5" height="2" rx="0.5" fill="currentColor" />
        <rect x="11" y="1" width="1.5" height="2" rx="0.5" fill="currentColor" />
        {/* Date number 17 */}
        <text
          x="8"
          y="12"
          fontSize="8.5"
          fontWeight="900"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          17
        </text>
      </svg>
    </div>
  );
}

/**
 * Animated SVG Icon 3: In Progress (Rotating pie/spinner ring)
 */
function InProgressIcon() {
  return (
    <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
      <svg
        className="w-4 h-4 text-[#EA580C] dark:text-[#FB923C] animate-icon-pie"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Ring */}
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.4" opacity="0.25" />
        {/* 90-degree rotating slice segment */}
        <path
          d="M10 2 A8 8 0 0 1 18 10 L10 10 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/**
 * Animated SVG Icon 4: High Priority (Flickering, wavering flame)
 */
function HighPriorityIcon() {
  return (
    <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
      <svg
        className="w-4 h-4 text-[#E11D48] dark:text-[#FB7185] animate-icon-flame"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2C9.5 6 7 8.5 7 12C7 15.5 9.5 19 12 21C14.5 19 17 15.5 17 12C17 8.5 14.5 6 12 2ZM12 18.5C10.5 17.5 9.5 15.5 9.5 13.5C9.5 11.5 11 9.5 12 7.5C13 9.5 14.5 11.5 14.5 13.5C14.5 15.5 13.5 17.5 12 18.5Z" />
      </svg>
    </div>
  );
}

/**
 * Animated SVG Icon 5: Ready (Scalloped badge with checking pop)
 */
function ReadyIcon() {
  return (
    <div className="relative w-4 h-4 rounded-full bg-[#0D9488] dark:bg-[#2DD4BF] flex items-center justify-center shrink-0 shadow-xs animate-icon-check">
      <svg
        className="w-2.5 h-2.5 text-white dark:text-[#042F2E]"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline points="2.5 6.5 5 9 9.5 3.5" />
      </svg>
    </div>
  );
}

/**
 * Animated SVG Icon 6: Waiting (Stopwatch with ticking needle)
 */
function WaitingIcon() {
  return (
    <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
      <svg
        className="w-4 h-4 text-[#C026D3] dark:text-[#E879F9]"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stopwatch Body */}
        <circle cx="12" cy="13" r="8" fill="currentColor" opacity="0.9" />
        {/* Top Button */}
        <rect x="10.5" y="1.5" width="3" height="3" rx="1" fill="currentColor" />
        {/* Ticking Needle */}
        <line
          x1="12"
          y1="13"
          x2="12"
          y2="8"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-icon-timer"
        />
      </svg>
    </div>
  );
}

/**
 * Animated SVG Icon 7: Paused (Octagonal pause pill with breathing pulse)
 */
function PausedIcon() {
  return (
    <div className="relative w-4 h-4 rounded-[5px] bg-[#D97706] dark:bg-[#FBBF24] flex items-center justify-center shrink-0 shadow-xs animate-icon-pause">
      <div className="flex items-center gap-[2.5px]">
        <span className="w-[2px] h-2.5 bg-white dark:bg-[#451A03] rounded-full" />
        <span className="w-[2px] h-2.5 bg-white dark:bg-[#451A03] rounded-full" />
      </div>
    </div>
  );
}

/**
 * Animated SVG Icon 8: Reviewing (Document with sweeping magnifying glass)
 */
function ReviewingIcon() {
  return (
    <div className="relative w-4 h-4 rounded-[4px] bg-[#00838F] dark:bg-[#22D3EE] flex items-center justify-center shrink-0 shadow-xs animate-icon-search">
      <svg
        className="w-2.5 h-2.5 text-white dark:text-[#083344]"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="6.5" cy="6.5" r="4" />
        <line x1="9.5" y1="9.5" x2="14" y2="14" />
      </svg>
    </div>
  );
}

/**
 * Style dictionary matching the video design:
 * Soft pastel glass background, vibrant typography, refined specular border
 */
const STATUS_CONFIGS: Record<
  StatusVariant,
  {
    defaultLabel: string;
    bgLight: string;
    bgDark: string;
    textLight: string;
    textDark: string;
    borderLight: string;
    borderDark: string;
    renderIcon: () => React.ReactNode;
  }
> = {
  queued: {
    defaultLabel: "Queued",
    bgLight: "bg-[#F3E8FF]",
    bgDark: "dark:bg-purple-950/45",
    textLight: "text-[#7E22CE]",
    textDark: "dark:text-[#C084FC]",
    borderLight: "border-purple-200/90",
    borderDark: "dark:border-purple-800/40",
    renderIcon: QueuedIcon,
  },
  scheduled: {
    defaultLabel: "Scheduled",
    bgLight: "bg-[#E0F2FE]",
    bgDark: "dark:bg-sky-950/45",
    textLight: "text-[#0284C7]",
    textDark: "dark:text-[#38BDF8]",
    borderLight: "border-sky-200/90",
    borderDark: "dark:border-sky-800/40",
    renderIcon: ScheduledIcon,
  },
  in_progress: {
    defaultLabel: "In progress",
    bgLight: "bg-[#FFEDD5]",
    bgDark: "dark:bg-orange-950/45",
    textLight: "text-[#EA580C]",
    textDark: "dark:text-[#FB923C]",
    borderLight: "border-orange-200/90",
    borderDark: "dark:border-orange-800/40",
    renderIcon: InProgressIcon,
  },
  high_priority: {
    defaultLabel: "High Priority",
    bgLight: "bg-[#FFE4E6]",
    bgDark: "dark:bg-rose-950/45",
    textLight: "text-[#E11D48]",
    textDark: "dark:text-[#FB7185]",
    borderLight: "border-rose-200/90",
    borderDark: "dark:border-rose-800/40",
    renderIcon: HighPriorityIcon,
  },
  ready: {
    defaultLabel: "Ready",
    bgLight: "bg-[#CCFBF1]",
    bgDark: "dark:bg-teal-950/45",
    textLight: "text-[#0D9488]",
    textDark: "dark:text-[#2DD4BF]",
    borderLight: "border-teal-200/90",
    borderDark: "dark:border-teal-800/40",
    renderIcon: ReadyIcon,
  },
  waiting: {
    defaultLabel: "Waiting",
    bgLight: "bg-[#FCE7F3]",
    bgDark: "dark:bg-pink-950/45",
    textLight: "text-[#C026D3]",
    textDark: "dark:text-[#E879F9]",
    borderLight: "border-pink-200/90",
    borderDark: "dark:border-pink-800/40",
    renderIcon: WaitingIcon,
  },
  paused: {
    defaultLabel: "Paused",
    bgLight: "bg-[#FEF3C7]",
    bgDark: "dark:bg-amber-950/45",
    textLight: "text-[#D97706]",
    textDark: "dark:text-[#FBBF24]",
    borderLight: "border-amber-200/90",
    borderDark: "dark:border-amber-800/40",
    renderIcon: PausedIcon,
  },
  reviewing: {
    defaultLabel: "Reviewing",
    bgLight: "bg-[#E0F7FA]",
    bgDark: "dark:bg-cyan-950/45",
    textLight: "text-[#00838F]",
    textDark: "dark:text-[#22D3EE]",
    borderLight: "border-cyan-200/90",
    borderDark: "dark:border-cyan-800/40",
    renderIcon: ReviewingIcon,
  },
  overdue: {
    defaultLabel: "Overdue",
    bgLight: "bg-[#FFE4E6]",
    bgDark: "dark:bg-rose-950/45",
    textLight: "text-[#E11D48]",
    textDark: "dark:text-[#FB7185]",
    borderLight: "border-rose-200/90",
    borderDark: "dark:border-rose-800/40",
    renderIcon: HighPriorityIcon,
  },
};

/**
 * AnimatedStatusBadge — Pure Apple/Video Implementation
 * Features moving icon animations, soft pastel backgrounds, and interactive hover elevation
 */
export function AnimatedStatusBadge({
  status,
  label,
  size = "md",
  interactive = false,
  active = false,
  onClick,
  className = "",
}: AnimatedStatusBadgeProps) {
  const variant = normalizeStatusVariant(status);
  const cfg = STATUS_CONFIGS[variant] || STATUS_CONFIGS.queued;
  const displayLabel = label || cfg.defaultLabel;

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-[11px] gap-1.5 rounded-full font-semibold",
    md: "px-3.5 py-1.5 text-xs sm:text-[13px] gap-2 rounded-2xl font-semibold",
    lg: "px-4 py-2 text-sm gap-2.5 rounded-2xl font-bold",
  }[size];

  const Comp = interactive || onClick ? "button" : "span";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "inline-flex items-center border select-none transition-all duration-200 shadow-2xs backdrop-blur-md",
        cfg.bgLight,
        cfg.bgDark,
        cfg.textLight,
        cfg.textDark,
        cfg.borderLight,
        cfg.borderDark,
        sizeClasses,
        interactive &&
          "cursor-pointer hover:scale-105 active:scale-95 hover:shadow-xs group/badge",
        active && "ring-2 ring-current font-bold",
        className
      )}
    >
      <span className="shrink-0 group-hover/badge:scale-110 transition-transform">
        {cfg.renderIcon()}
      </span>
      <span className="tracking-tight truncate">{displayLabel}</span>
    </Comp>
  );
}

/**
 * AnimatedStatusFilterBar — Interactive filter bar displaying all 8 states from the video
 */
export function AnimatedStatusFilterBar({
  selected,
  onSelect,
  className = "",
}: {
  selected: string;
  onSelect: (val: string) => void;
  className?: string;
}) {
  const allVariants: StatusVariant[] = [
    "queued",
    "scheduled",
    "in_progress",
    "high_priority",
    "ready",
    "waiting",
    "paused",
    "reviewing",
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        onClick={() => onSelect("ALL")}
        className={cn(
          "px-3.5 py-1.5 rounded-2xl text-xs font-semibold border transition-all cursor-pointer",
          selected === "ALL"
            ? "bg-[#111111] text-white border-[#111111] dark:bg-white dark:text-[#111111] dark:border-white shadow-xs"
            : "bg-white/70 dark:bg-white/[0.06] text-[#666666] dark:text-[#A1A1A6] border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.1]"
        )}
      >
        All Tasks
      </button>

      {allVariants.map((v) => {
        const isSelected = selected.toLowerCase() === v.toLowerCase();
        return (
          <AnimatedStatusBadge
            key={v}
            status={v}
            interactive
            active={isSelected}
            onClick={() => onSelect(v.toUpperCase())}
            size="md"
          />
        );
      })}
    </div>
  );
}

