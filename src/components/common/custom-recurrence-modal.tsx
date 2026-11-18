"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw, Calendar, Check, ChevronDown } from "lucide-react";

export interface CustomRecurrenceConfig {
  repeatEvery: number;
  unit: "day" | "week" | "month" | "year";
  repeatOnDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startDate: string; // YYYY-MM-DD
  monthlyOption?: "day_of_month" | "day_of_week";
  monthlyDayNumber?: number; // e.g. 14
  monthlyOrdinalPattern?: string; // e.g. "2nd Saturday"
  endType: "never" | "on_date" | "after_occurrences";
  endDate?: string;
  occurrences?: number;
  summaryText: string;
}

export interface CustomRecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<CustomRecurrenceConfig>;
  initialStartDate?: string;
  onSave: (config: CustomRecurrenceConfig) => void;
}

const DAYS_OF_WEEK = [
  { key: 0, label: "S", name: "Sunday" },
  { key: 1, label: "M", name: "Monday" },
  { key: 2, label: "T", name: "Tuesday" },
  { key: 3, label: "W", name: "Wednesday" },
  { key: 4, label: "T", name: "Thursday" },
  { key: 5, label: "F", name: "Friday" },
  { key: 6, label: "S", name: "Saturday" },
];

export function getMonthlyPattern(dateStr: string): {
  dayOfMonth: number;
  ordinalText: string;
  dayName: string;
} {
  const defaultRes = { dayOfMonth: 14, ordinalText: "2nd Saturday", dayName: "Saturday" };
  if (!dateStr) return defaultRes;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return defaultRes;

  const dayOfMonth = d.getDate();
  const dayOfWeekIndex = d.getDay();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[dayOfWeekIndex];

  const weekNum = Math.ceil(dayOfMonth / 7);
  const ordinals = ["", "1st", "2nd", "3rd", "4th", "5th"];
  const ordinal = ordinals[weekNum] || `${weekNum}th`;

  return {
    dayOfMonth,
    ordinalText: `${ordinal} ${dayName}`,
    dayName,
  };
}

export function buildRecurrenceSummary(cfg: {
  repeatEvery: number;
  unit: "day" | "week" | "month" | "year";
  repeatOnDays: number[];
  monthlyOption?: "day_of_month" | "day_of_week";
  monthlyDayNumber?: number;
  monthlyOrdinalPattern?: string;
  endType: "never" | "on_date" | "after_occurrences";
  endDate?: string;
  occurrences?: number;
}): string {
  const num = cfg.repeatEvery || 1;
  let text = "";

  if (cfg.unit === "day") {
    text = num === 1 ? "Daily" : `Every ${num} days`;
  } else if (cfg.unit === "week") {
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activeDays = (cfg.repeatOnDays || []).map((idx) => dayLabels[idx]).join(", ");
    if (activeDays) {
      text = num === 1 ? `Weekly on ${activeDays}` : `Every ${num} weeks on ${activeDays}`;
    } else {
      text = num === 1 ? "Weekly" : `Every ${num} weeks`;
    }
  } else if (cfg.unit === "month") {
    if (cfg.monthlyOption === "day_of_week" && cfg.monthlyOrdinalPattern) {
      text = num === 1 ? `Monthly on ${cfg.monthlyOrdinalPattern}` : `Every ${num} months on ${cfg.monthlyOrdinalPattern}`;
    } else {
      text = num === 1 ? `Monthly on day ${cfg.monthlyDayNumber || 1}` : `Every ${num} months on day ${cfg.monthlyDayNumber || 1}`;
    }
  } else if (cfg.unit === "year") {
    text = num === 1 ? "Annually" : `Every ${num} years`;
  }

  if (cfg.endType === "on_date" && cfg.endDate) {
    text += `, until ${cfg.endDate}`;
  } else if (cfg.endType === "after_occurrences" && cfg.occurrences) {
    text += `, ${cfg.occurrences} times`;
  }

  return text;
}

export function CustomRecurrenceModal({
  isOpen,
  onClose,
  initialConfig,
  initialStartDate,
  onSave,
}: CustomRecurrenceModalProps) {
  const [mounted, setMounted] = useState(false);

  // Default start date: today
  const defaultStart = initialStartDate || new Date().toISOString().split("T")[0];

  const [repeatEvery, setRepeatEvery] = useState<number>(initialConfig?.repeatEvery || 1);
  const [unit, setUnit] = useState<"day" | "week" | "month" | "year">(initialConfig?.unit || "week");
  const [repeatOnDays, setRepeatOnDays] = useState<number[]>(
    initialConfig?.repeatOnDays || [new Date(defaultStart + "T00:00:00").getDay()]
  );
  const [startDate, setStartDate] = useState<string>(initialConfig?.startDate || defaultStart);

  // Month-specific pattern
  const pattern = getMonthlyPattern(startDate);
  const [monthlyOption, setMonthlyOption] = useState<"day_of_month" | "day_of_week">(
    initialConfig?.monthlyOption || "day_of_month"
  );

  // End options
  const [endType, setEndType] = useState<"never" | "on_date" | "after_occurrences">(
    initialConfig?.endType || "never"
  );
  const [endDate, setEndDate] = useState<string>(
    initialConfig?.endDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [occurrences, setOccurrences] = useState<number>(initialConfig?.occurrences || 1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When initialStartDate or initialConfig changes, sync state
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.repeatEvery) setRepeatEvery(initialConfig.repeatEvery);
      if (initialConfig.unit) setUnit(initialConfig.unit);
      if (initialConfig.repeatOnDays) setRepeatOnDays(initialConfig.repeatOnDays);
      if (initialConfig.startDate) setStartDate(initialConfig.startDate);
      if (initialConfig.monthlyOption) setMonthlyOption(initialConfig.monthlyOption);
      if (initialConfig.endType) setEndType(initialConfig.endType);
      if (initialConfig.endDate) setEndDate(initialConfig.endDate);
      if (initialConfig.occurrences) setOccurrences(initialConfig.occurrences);
    } else if (initialStartDate) {
      setStartDate(initialStartDate);
    }
  }, [initialConfig, initialStartDate]);

  if (!isOpen || !mounted) return null;

  const handleToggleDay = (dayIdx: number) => {
    setRepeatOnDays((prev) => {
      if (prev.includes(dayIdx)) {
        // Keep at least one day selected
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayIdx);
      } else {
        return [...prev, dayIdx].sort((a, b) => a - b);
      }
    });
  };

  const handleResetStartDate = () => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
  };

  const handleDone = () => {
    const summaryText = buildRecurrenceSummary({
      repeatEvery,
      unit,
      repeatOnDays,
      monthlyOption,
      monthlyDayNumber: pattern.dayOfMonth,
      monthlyOrdinalPattern: pattern.ordinalText,
      endType,
      endDate: endType === "on_date" ? endDate : undefined,
      occurrences: endType === "after_occurrences" ? occurrences : undefined,
    });

    onSave({
      repeatEvery: Math.max(1, Number(repeatEvery) || 1),
      unit,
      repeatOnDays: unit === "week" ? repeatOnDays : [],
      startDate,
      monthlyOption: unit === "month" ? monthlyOption : undefined,
      monthlyDayNumber: unit === "month" ? pattern.dayOfMonth : undefined,
      monthlyOrdinalPattern: unit === "month" ? pattern.ordinalText : undefined,
      endType,
      endDate: endType === "on_date" ? endDate : undefined,
      occurrences: endType === "after_occurrences" ? Math.max(1, occurrences) : undefined,
      summaryText,
    });

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className="relative bg-white dark:bg-[#181818] text-[#111111] dark:text-neutral-100 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 w-full max-w-[360px] p-5 space-y-4 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurrence-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-black/[0.06] dark:border-white/[0.08]">
          <h2 id="recurrence-modal-title" className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Custom recurrence
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Repeat Every Row */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-normal text-neutral-700 dark:text-neutral-300 shrink-0">
            Repeat Every
          </label>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <input
              type="number"
              min={1}
              max={99}
              value={repeatEvery}
              onChange={(e) => setRepeatEvery(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-8 text-center text-xs font-semibold apple-input rounded-lg border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04]"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as "day" | "week" | "month" | "year")}
              className="h-8 px-2.5 text-xs font-medium apple-input rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#1F1F1F] cursor-pointer"
            >
              <option value="day">day</option>
              <option value="week">week</option>
              <option value="month">month</option>
              <option value="year">year</option>
            </select>
          </div>
        </div>

        {/* Repeat On (Visible only when unit === "week") */}
        {unit === "week" && (
          <div className="space-y-2 pt-0.5">
            <div className="text-xs font-normal text-neutral-700 dark:text-neutral-300">
              Repeat On
            </div>
            <div className="flex items-center justify-between gap-1">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = repeatOnDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => handleToggleDay(day.key)}
                    className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-brand text-white dark:text-[#111111] shadow-xs scale-105"
                        : "bg-black/[0.04] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.08] dark:hover:bg-white/[0.12]"
                    }`}
                    title={day.name}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Start Date */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-normal text-neutral-700 dark:text-neutral-300">
              Start Date
            </label>
          </div>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-medium apple-input rounded-lg border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04]"
            />
          </div>
          <div className="pt-0.5">
            <button
              type="button"
              onClick={handleResetStartDate}
              className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Monthly Pattern Selector (Visible only when unit === "month") */}
        {unit === "month" && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand text-white dark:text-[#111111]">
                Click Frequency
              </span>
            </div>
            <select
              value={monthlyOption}
              onChange={(e) => setMonthlyOption(e.target.value as "day_of_month" | "day_of_week")}
              className="w-full h-8 px-2.5 text-xs font-medium apple-input rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#1F1F1F] cursor-pointer"
            >
              <option value="day_of_month">Monthly on day {pattern.dayOfMonth}</option>
              <option value="day_of_week">Monthly on {pattern.ordinalText}</option>
            </select>
          </div>
        )}

        {/* End Section */}
        <div className="space-y-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
          <div className="text-xs font-normal text-neutral-700 dark:text-neutral-300">End</div>

          <div className="space-y-2 text-xs">
            {/* Never */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="recurrence_end"
                checked={endType === "never"}
                onChange={() => setEndType("never")}
                className="w-4 h-4 text-brand accent-brand cursor-pointer"
              />
              <span className="font-normal text-neutral-800 dark:text-neutral-200">Never</span>
            </label>

            {/* On specific date */}
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                id="end_on_date"
                name="recurrence_end"
                checked={endType === "on_date"}
                onChange={() => setEndType("on_date")}
                className="w-4 h-4 text-brand accent-brand cursor-pointer"
              />
              <label htmlFor="end_on_date" className="cursor-pointer shrink-0 font-normal text-neutral-800 dark:text-neutral-200">
                On
              </label>
              <input
                type="date"
                disabled={endType !== "on_date"}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`flex-1 h-7 px-2 text-xs rounded-lg border transition-all ${
                  endType === "on_date"
                    ? "apple-input border-black/15 dark:border-white/15 bg-white dark:bg-[#1F1F1F]"
                    : "bg-black/[0.04] dark:bg-white/[0.04] border-transparent text-neutral-400 cursor-not-allowed"
                }`}
              />
            </div>

            {/* After N occurrences */}
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                id="end_after_occurrences"
                name="recurrence_end"
                checked={endType === "after_occurrences"}
                onChange={() => setEndType("after_occurrences")}
                className="w-4 h-4 text-brand accent-brand cursor-pointer"
              />
              <label
                htmlFor="end_after_occurrences"
                className="cursor-pointer shrink-0 font-normal text-neutral-800 dark:text-neutral-200"
              >
                After
              </label>
              <input
                type="number"
                min={1}
                max={999}
                disabled={endType !== "after_occurrences"}
                value={occurrences}
                onChange={(e) => setOccurrences(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-14 h-7 text-center text-xs font-semibold rounded-lg border transition-all ${
                  endType === "after_occurrences"
                    ? "apple-input border-black/15 dark:border-white/15 bg-white dark:bg-[#1F1F1F]"
                    : "bg-black/[0.04] dark:bg-white/[0.04] border-transparent text-neutral-400 cursor-not-allowed"
                }`}
              />
              <span className="text-neutral-700 dark:text-neutral-300 font-normal">occurrences</span>
            </div>
          </div>
        </div>

        {/* Footer Actions matching screenshot colors */}
        <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-5 py-1.5 rounded-lg text-xs font-medium bg-brand hover:bg-[#666666] text-white shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
