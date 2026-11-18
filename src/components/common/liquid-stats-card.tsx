"use client";

import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { RollingNumber } from "@/components/common/rolling-number";

export type MetricVariant = "chartreuse" | "electric" | "navy" | "ice" | "rose" | "amber";

export interface LiquidStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // e.g., +12.4 or -5.2
  changePeriod?: string; // e.g., "vs last cycle" or "SLA > 90%"
  changeType?: "increase-is-good" | "decrease-is-good" | "neutral";
  icon: LucideIcon;
  variant?: MetricVariant;
  progress?: number; // 0 to 100 for a progress bar
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export function LiquidStatsCard({
  title,
  value,
  subtitle,
  change,
  changePeriod = "vs last cycle",
  changeType = "increase-is-good",
  icon: Icon,
  progress,
  badge,
  onClick,
  className = "",
}: LiquidStatsCardProps) {
  // Determine sentiment of the change percentage
  let isGood = false;
  if (change !== undefined && change !== 0) {
    if (changeType === "increase-is-good") {
      isGood = change > 0;
    } else if (changeType === "decrease-is-good") {
      isGood = change < 0;
    }
  }

  const isNeutral = change === undefined || change === 0 || changeType === "neutral";

  return (
    <div
      onClick={onClick}
      className={`apple-card glass-shimmer p-5 transition-all duration-300 group ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#A3A3A3]">
              {title}
            </span>
            {badge && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full glass-well text-[#666666] dark:text-[#A3A3A3]">
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] dark:text-white">
              <RollingNumber value={value} />
            </span>
            {subtitle && (
              <span className="text-xs text-[#666666] dark:text-[#A3A3A3] font-medium">{subtitle}</span>
            )}
          </div>
        </div>

        {/* Minimalist Icon Badge with Contrasting Well */}
        <div className="p-2.5 rounded-xl glass-well text-[#111111] dark:text-white group-hover:scale-110 group-hover:rotate-3 transition-transform shrink-0 shadow-xs">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Progress Bar (Optional) */}
      {progress !== undefined && (
        <div className="mt-3.5 space-y-1">
          <div className="w-full glass-sunken rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out bg-[#111111] dark:bg-white"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer / Delta Indicator */}
      {change !== undefined && (
        <div className="mt-3.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-xs ${
                isNeutral
                  ? "glass-well text-[#666666] dark:text-[#A3A3A3]"
                  : isGood
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              }`}
            >
              {isNeutral ? (
                <Minus className="w-3 h-3" />
              ) : change > 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <RollingNumber value={Math.abs(change)} decimals={1} suffix="%" duration={900} />
            </span>
            <span className="text-[11px] text-[#666666] dark:text-[#A3A3A3] font-medium">{changePeriod}</span>
          </div>
        </div>
      )}
    </div>
  );
}
