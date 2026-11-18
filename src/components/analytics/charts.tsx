"use client";

import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";

/** Semantic palette shared by every analytics chart (status colors are reserved; always paired with a label). */
export const CHART_COLORS = {
  blue: "var(--sd-ink)",
  amber: "#F5A524",
  green: "var(--sd-ink)", // "good" = brand ink: colour is reserved for what needs attention
  red: "#F04438",
  slate: "#B5B5B5",
  violet: "#666666",
} as const;

export const MUTED = "text-[#666666] dark:text-[#A3A3A3]";
export const INK = "text-[#111111] dark:text-white";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white dark:bg-[#111111] border border-[#111111]/10 dark:border-white/[0.11] p-5 sm:p-6 flex flex-col ${className}`}
    >
      <header className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h3 className={`text-[15px] font-semibold leading-tight ${INK}`}>{title}</h3>
          {subtitle && <p className={`text-xs mt-1 ${MUTED}`}>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "neutral",
  progress,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "warn" | "bad";
  progress?: number;
}) {
  const toneColor =
    tone === "good" ? CHART_COLORS.green : tone === "warn" ? CHART_COLORS.amber : tone === "bad" ? CHART_COLORS.red : "var(--sd-ink)";
  return (
    <div className="rounded-2xl bg-white dark:bg-[#111111] border border-[#111111]/10 dark:border-white/[0.11] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${MUTED}`}>{label}</span>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${tone === "neutral" ? "var(--sd-ink)" : toneColor} 12%, transparent)`, color: tone === "neutral" ? "var(--sd-ink)" : toneColor }}
        >
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[32px] leading-none font-semibold tabular-nums tracking-tight ${INK}`}>{value}</span>
        {unit && <span className={`text-sm font-medium ${MUTED}`}>{unit}</span>}
      </div>
      {progress !== undefined && (
        <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: toneColor }}
          />
        </div>
      )}
      {hint && <p className={`text-xs ${MUTED}`}>{hint}</p>}
    </div>
  );
}

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Donut with a centre total and a legend that carries the values (so color is never the only cue). */
export function Donut({ slices, centerLabel, centerValue }: { slices: Slice[]; centerLabel: string; centerValue: string | number }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
          <circle cx="70" cy="70" r={r} fill="none" strokeWidth="14" className="stroke-black/[0.06] dark:stroke-white/[0.08]" />
          {total > 0 &&
            slices.map((s, i) => {
              const len = (s.value / total) * c;
              const gap = slices.filter((x) => x.value > 0).length > 1 ? 2 : 0;
              const el = (
                <circle
                  key={s.label}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hover === i ? 17 : 14}
                  strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                  strokeDashoffset={-offset}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  style={{ transition: "stroke-width .15s" }}
                />
              );
              offset += len;
              return s.value > 0 ? el : null;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-3xl font-semibold tabular-nums ${INK}`}>{hover !== null ? slices[hover].value : centerValue}</span>
          <span className={`text-[11px] ${MUTED}`}>{hover !== null ? slices[hover].label : centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {slices.map((s, i) => (
          <li
            key={s.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />
              <span className={INK}>{s.label}</span>
            </span>
            <span className="flex items-center gap-2 tabular-nums">
              <span className={`font-semibold ${INK}`}>{s.value}</span>
              <span className={`text-xs w-9 text-right ${MUTED}`}>{total ? Math.round((s.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Grouped weekly columns (two series) with hover tooltip, y-gridlines and a legend. */
export function WeeklyColumns({
  data,
}: {
  data: { label: string; created: number; completed: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.completed]));
  const ticks = [0, Math.ceil(max / 2), max];
  const H = 150;
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: CHART_COLORS.slate }} /><span className={MUTED}>Created</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: CHART_COLORS.blue }} /><span className={MUTED}>Completed</span></span>
      </div>
      <div className="relative flex gap-3">
        <div className="flex flex-col justify-between text-[10px] tabular-nums text-right w-5 pb-6" style={{ height: H + 24 }}>
          {[...ticks].reverse().map((t) => (
            <span key={t} className={MUTED}>{t}</span>
          ))}
        </div>
        <div className="flex-1 relative" style={{ height: H + 24 }}>
          {ticks.map((t) => (
            <div key={t} className="absolute left-0 right-0 border-t border-dashed border-black/[0.08] dark:border-white/[0.08]" style={{ top: H - (t / max) * H }} />
          ))}
          <div className="absolute inset-x-0 top-0 flex items-end justify-between gap-1" style={{ height: H }}>
            {data.map((d, i) => (
              <div
                key={d.label}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="relative flex-1 h-full flex items-end justify-center gap-[3px]"
              >
                <div className="w-[38%] max-w-3.5 rounded-t-[4px]" style={{ height: `${(d.created / max) * 100}%`, minHeight: d.created ? 3 : 0, background: CHART_COLORS.slate }} />
                <div className="w-[38%] max-w-3.5 rounded-t-[4px]" style={{ height: `${(d.completed / max) * 100}%`, minHeight: d.completed ? 3 : 0, background: CHART_COLORS.blue }} />
                {hover === i && (
                  <div className="absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-lg bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-[11px] px-2.5 py-1.5 shadow-lg">
                    <div className="font-semibold">Week of {d.label}</div>
                    <div>Created {d.created} · Completed {d.completed}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 flex justify-between gap-1" style={{ top: H + 8 }}>
            {data.map((d) => (
              <span key={d.label} className={`flex-1 text-center text-[10px] ${MUTED}`}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Horizontal stacked segments with 2px gaps (used for deadline aging and priority load). */
export function SegmentBar({ segments }: { segments: Slice[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] rounded-full overflow-hidden bg-black/[0.06] dark:bg-white/[0.08]">
        {segments.map((s) =>
          s.value > 0 ? <div key={s.label} title={`${s.label}: ${s.value}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} /> : null
        )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />
              <span className={INK}>{s.label}</span>
            </span>
            <span className={`font-semibold tabular-nums ${INK}`}>{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Row bar: a labelled track with a coloured fill and an optional second (alert) segment. */
export function BarRow({
  label,
  sublabel,
  value,
  max,
  alert = 0,
  right,
  color = CHART_COLORS.blue,
}: {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  alert?: number;
  right?: React.ReactNode;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const alertPct = max > 0 ? (alert / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className={`font-medium truncate ${INK}`}>{label}</span>
          {sublabel && <span className={`text-[11px] shrink-0 ${MUTED}`}>{sublabel}</span>}
        </div>
        <div className="shrink-0 text-xs tabular-nums">{right}</div>
      </div>
      <div className="flex h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden gap-[2px]">
        <div style={{ width: `${Math.max(0, pct - alertPct)}%`, background: color }} className="rounded-r-[3px]" />
        {alert > 0 && <div style={{ width: `${alertPct}%`, background: CHART_COLORS.red }} className="rounded-[3px]" />}
      </div>
    </div>
  );
}

export function PriorityPill({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    CRITICAL: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    HIGH: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    MEDIUM: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    LOW: "bg-black/[0.05] text-[#4D4D4D] dark:bg-white/10 dark:text-[#C4C4C4]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${map[priority] || map.LOW}`}>
      {priority}
    </span>
  );
}

/** Circular score gauge (0-10) for scorecards. */
export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const color = score >= 7.5 ? "var(--sd-ink)" : CHART_COLORS.amber;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 52 52" className="w-full h-full -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" className="stroke-black/[0.07] dark:stroke-white/[0.1]" />
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke={color} strokeDasharray={`${(score / 10) * c} ${c}`} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums ${INK}`}>{score.toFixed(1)}</span>
    </div>
  );
}
