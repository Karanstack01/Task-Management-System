"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CircleDashed, Pencil, ChevronLeft, ChevronRight, Calendar, Clock, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface AppleDateTimePickerProps {
  /** Selected date in YYYY-MM-DD format */
  date?: string;
  /** Selected time in HH:MM format (24-hour) */
  time?: string;
  /** Callback when date changes (YYYY-MM-DD) */
  onDateChange?: (date: string) => void;
  /** Callback when time changes (HH:MM) */
  onTimeChange?: (time: string) => void;
  /** Callback when either date or time changes */
  onChange?: (val: { date: string; time: string; isoString: string }) => void;
  /** Minimum selectable date (YYYY-MM-DD) */
  minDate?: string;
  /** Maximum selectable date (YYYY-MM-DD) */
  maxDate?: string;
  /** Whether time selection is enabled (default true) */
  allowTime?: boolean;
  /** Custom label above the picker */
  label?: string;
  /** Optional custom container class name */
  className?: string;
  /** Initial view mode ('summary' | 'date' | 'time') */
  initialView?: "summary" | "date" | "time";
  /** Required field indicator */
  required?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

// Minutes in steps of 5 matching reference video
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const HOUR_STEPS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

export function AppleDateTimePicker({
  date = "",
  time = "",
  onDateChange,
  onTimeChange,
  onChange,
  minDate,
  maxDate,
  allowTime = true,
  label,
  className = "",
  initialView = "summary",
  required = false,
}: AppleDateTimePickerProps) {
  // Current active view: 'summary' (two stacked pills) | 'date' (calendar) | 'time' (drum wheel)
  const [view, setView] = useState<"summary" | "date" | "time">(initialView);

  // Committed values
  const [selectedDate, setSelectedDate] = useState<string>(date);
  const [selectedTime, setSelectedTime] = useState<string>(time);

  // Temporary staging values while interacting with picker before clicking "Apply"
  const [tempDate, setTempDate] = useState<string>(date);
  const [tempHour, setTempHour] = useState<string>(time ? time.split(":")[0] || "18" : "18");
  const [tempMinute, setTempMinute] = useState<string>(time ? time.split(":")[1] || "00" : "00");

  // Keep state synchronized with external prop updates
  useEffect(() => {
    setSelectedDate(date);
    setTempDate(date);
  }, [date]);

  useEffect(() => {
    setSelectedTime(time);
    if (time && time.includes(":")) {
      const [h, m] = time.split(":");
      setTempHour(h.padStart(2, "0"));
      // Round or match closest minute
      setTempMinute(m.padStart(2, "0"));
    }
  }, [time]);

  // Calendar navigation state (year & month currently viewed)
  const [viewYear, setViewYear] = useState<number>(() => {
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) return parsed.getMonth();
    }
    return new Date().getMonth();
  });

  // Today reference for the small dot indicator
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Format date display: "July 16, 2026"
  const formattedDateLabel = useMemo(() => {
    if (!selectedDate) return null;
    const parts = selectedDate.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && MONTH_NAMES[m]) {
        return `${MONTH_NAMES[m]} ${d}, ${y}`;
      }
    }
    return selectedDate;
  }, [selectedDate]);

  // Format time display: "02:45"
  const formattedTimeLabel = useMemo(() => {
    if (!selectedTime) return null;
    return selectedTime;
  }, [selectedTime]);

  // Generate calendar days for current viewMonth and viewYear
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Monday is index 0 in ISO (0=Mon, 1=Tue... 6=Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday

    const days: Array<{
      dayNumber: number | null;
      dateString: string | null;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    // Empty lead cells
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        dayNumber: null,
        dateString: null,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }

    // Days in current month
    for (let day = 1; day <= totalDays; day++) {
      const dateString = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = dateString === todayStr;
      const isSelected = dateString === tempDate;
      let isDisabled = false;

      if (minDate && dateString < minDate) {
        isDisabled = true;
      }
      if (maxDate && dateString > maxDate) {
        isDisabled = true;
      }

      days.push({
        dayNumber: day,
        dateString,
        isToday,
        isSelected,
        isDisabled,
      });
    }

    return days;
  }, [viewYear, viewMonth, tempDate, todayStr, minDate, maxDate]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Open Date Picker view
  const openDatePicker = () => {
    setTempDate(selectedDate);
    if (selectedDate) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
    setView("date");
  };

  // Open Time Picker view
  const openTimePicker = () => {
    if (selectedTime && selectedTime.includes(":")) {
      const [h, m] = selectedTime.split(":");
      setTempHour(h.padStart(2, "0"));
      setTempMinute(m.padStart(2, "0"));
    } else {
      // Default to 18:00 (Standard SLA Business Close)
      setTempHour("18");
      setTempMinute("00");
    }
    setView("time");
  };

  // Apply Date
  const handleApplyDate = () => {
    if (!tempDate) return;
    setSelectedDate(tempDate);
    onDateChange?.(tempDate);

    const currentTime = selectedTime || "18:00";
    const isoString = new Date(`${tempDate}T${currentTime}:00Z`).toISOString();
    onChange?.({
      date: tempDate,
      time: currentTime,
      isoString,
    });

    setView("summary");
  };

  // Apply Time
  const handleApplyTime = () => {
    const formatted = `${tempHour.padStart(2, "0")}:${tempMinute.padStart(2, "0")}`;
    setSelectedTime(formatted);
    onTimeChange?.(formatted);

    const currentDate = selectedDate || todayStr;
    const isoString = new Date(`${currentDate}T${formatted}:00Z`).toISOString();
    onChange?.({
      date: currentDate,
      time: formatted,
      isoString,
    });

    setView("summary");
  };

  // Wheel Column Refs for smooth drum interaction
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  // Step Hour
  const stepHour = (delta: number) => {
    const current = parseInt(tempHour, 10);
    const next = (current + delta + 24) % 24;
    setTempHour(String(next).padStart(2, "0"));
  };

  // Step Minute
  const stepMinute = (delta: number) => {
    const currentIdx = MINUTE_STEPS.indexOf(tempMinute);
    const validIdx = currentIdx >= 0 ? currentIdx : 0;
    const nextIdx = (validIdx + delta + MINUTE_STEPS.length) % MINUTE_STEPS.length;
    setTempMinute(MINUTE_STEPS[nextIdx]);
  };

  // Mouse wheel handlers for natural wheel scroll
  const handleHourWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) stepHour(1);
    else if (e.deltaY < 0) stepHour(-1);
  };

  const handleMinuteWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) stepMinute(1);
    else if (e.deltaY < 0) stepMinute(-1);
  };

  // Visible drum slots for hours
  const visibleHours = useMemo(() => {
    const curr = parseInt(tempHour, 10) || 0;
    return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
      const val = (curr + offset + 24) % 24;
      return {
        value: String(val).padStart(2, "0"),
        offset,
      };
    });
  }, [tempHour]);

  // Visible drum slots for minutes
  const visibleMinutes = useMemo(() => {
    const currIdx = MINUTE_STEPS.indexOf(tempMinute) >= 0 ? MINUTE_STEPS.indexOf(tempMinute) : 0;
    const len = MINUTE_STEPS.length;
    return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
      const idx = (currIdx + offset + len) % len;
      return {
        value: MINUTE_STEPS[idx],
        offset,
      };
    });
  }, [tempMinute]);

  return (
    <div className={`w-full max-w-[340px] select-none ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-2">
          <Calendar size={14} className="text-neutral-500 dark:text-neutral-400" />
          <span>{label}</span>
          {required && <span className="text-rose-500 font-medium text-sm leading-none ml-0.5">*</span>}
        </label>
      )}

      {/* Main Apple Outer Frosted Shell matching Video Container */}
      <div className="rounded-[26px] bg-[#f2f3f5] dark:bg-neutral-900/60 p-2.5 border border-black/[0.04] dark:border-white/[0.06] shadow-2xs transition-all duration-300">
        <AnimatePresence mode="wait" initial={false}>
          {/* =========================================================================
              VIEW 1: SUMMARY PILLS (Matching Frame 0000, 0270, 0810)
             ========================================================================= */}
          {view === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-2"
            >
              {/* Date Pill Card */}
              <button
                type="button"
                onClick={openDatePicker}
                className="w-full bg-white dark:bg-[#161618] rounded-[18px] px-5 py-4 flex items-center justify-between text-left border border-black/[0.03] dark:border-white/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-black/[0.08] dark:hover:border-white/[0.1] active:scale-[0.99] transition-all cursor-pointer group"
              >
                <div>
                  {selectedDate ? (
                    <>
                      <span className="block text-[11px] font-medium text-neutral-400 dark:text-neutral-500 tracking-tight leading-none mb-1">
                        Date
                      </span>
                      <span className="block text-[15px] font-semibold text-neutral-900 dark:text-white leading-tight">
                        {formattedDateLabel}
                      </span>
                    </>
                  ) : (
                    <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">
                      Select Date
                    </span>
                  )}
                </div>

                <div className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-white transition-colors">
                  {selectedDate ? (
                    <Pencil size={17} className="stroke-[1.75]" />
                  ) : (
                    <CircleDashed size={20} className="stroke-[1.5]" />
                  )}
                </div>
              </button>

              {/* Time Pill Card (if allowTime) */}
              {allowTime && (
                <button
                  type="button"
                  onClick={openTimePicker}
                  className="w-full bg-white dark:bg-[#161618] rounded-[18px] px-5 py-4 flex items-center justify-between text-left border border-black/[0.03] dark:border-white/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-black/[0.08] dark:hover:border-white/[0.1] active:scale-[0.99] transition-all cursor-pointer group"
                >
                  <div>
                    {selectedTime ? (
                      <>
                        <span className="block text-[11px] font-medium text-neutral-400 dark:text-neutral-500 tracking-tight leading-none mb-1">
                          Time
                        </span>
                        <span className="block text-[15px] font-semibold text-neutral-900 dark:text-white leading-tight">
                          {formattedTimeLabel}
                        </span>
                      </>
                    ) : (
                      <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">
                        Select Time
                      </span>
                    )}
                  </div>

                  <div className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-white transition-colors">
                    {selectedTime ? (
                      <Pencil size={17} className="stroke-[1.75]" />
                    ) : (
                      <CircleDashed size={20} className="stroke-[1.5]" />
                    )}
                  </div>
                </button>
              )}
            </motion.div>
          )}

          {/* =========================================================================
              VIEW 2: CALENDAR PICKER (Matching Frame 0135, 0675)
             ========================================================================= */}
          {view === "date" && (
            <motion.div
              key="date-picker"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white dark:bg-[#161618] rounded-[22px] p-4 sm:p-5 shadow-xs border border-black/[0.03] dark:border-white/[0.05]"
            >
              {/* Month & Year Navigation Header */}
              <div className="flex items-center justify-between px-1 mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous Month"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>

                <h4 className="text-[15px] font-semibold text-neutral-900 dark:text-white tracking-tight">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h4>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next Month"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Weekday Row (MO, TU, WE, TH, FR, SA, SU) */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {WEEKDAY_NAMES.map((wd) => (
                  <span
                    key={wd}
                    className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider"
                  >
                    {wd}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((item, idx) => {
                  if (item.dayNumber === null) {
                    return <div key={`empty-${idx}`} className="w-9 h-9" />;
                  }

                  return (
                    <button
                      key={item.dateString}
                      type="button"
                      disabled={item.isDisabled}
                      onClick={() => item.dateString && setTempDate(item.dateString)}
                      className={`relative w-9 h-9 mx-auto rounded-xl text-[14px] flex flex-col items-center justify-center transition-all cursor-pointer ${
                        item.isSelected
                          ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] font-semibold shadow-xs scale-100"
                          : item.isDisabled
                          ? "text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                          : "text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium"
                      }`}
                    >
                      <span>{item.dayNumber}</span>

                      {/* Today dot indicator matching Frame 0135 */}
                      {item.isToday && !item.isSelected && (
                        <span className="w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-500 absolute bottom-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons: Back / Apply */}
              <div className="flex items-center gap-2.5 pt-4 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setView("summary")}
                  className="flex-1 py-2.5 px-4 rounded-full border border-neutral-200/90 dark:border-neutral-700 bg-white dark:bg-transparent text-neutral-800 dark:text-neutral-200 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800/60 active:scale-95 transition-all text-center cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  disabled={!tempDate}
                  onClick={handleApplyDate}
                  className={`flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all text-center ${
                    tempDate
                      ? "bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] hover:bg-black dark:hover:bg-neutral-100 active:scale-95 shadow-xs cursor-pointer"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                  }`}
                >
                  Apply
                </button>
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              VIEW 3: TIME DRUM / WHEEL PICKER (Matching Frame 0405, 0540)
             ========================================================================= */}
          {view === "time" && (
            <motion.div
              key="time-picker"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white dark:bg-[#161618] rounded-[22px] p-4 sm:p-5 shadow-xs border border-black/[0.03] dark:border-white/[0.05]"
            >
              {/* Wheel Container */}
              <div className="relative h-[190px] flex items-center justify-center overflow-hidden my-1">
                {/* Center Highlight Pill Capsule matching Frame 0405 */}
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-11 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 pointer-events-none" />

                {/* Left Drum: Hours */}
                <div
                  ref={hourScrollRef}
                  onWheel={handleHourWheel}
                  className="flex-1 flex flex-col items-center justify-center cursor-ns-resize py-4 z-10"
                >
                  {visibleHours.map((slot) => {
                    const isCenter = slot.offset === 0;
                    const isNear = Math.abs(slot.offset) === 1;
                    const isFar = Math.abs(slot.offset) === 2;

                    return (
                      <div
                        key={`hour-${slot.value}-${slot.offset}`}
                        onClick={() => setTempHour(slot.value)}
                        className={`h-7 flex items-center justify-center transition-all select-none cursor-pointer ${
                          isCenter
                            ? "text-[22px] font-semibold text-neutral-900 dark:text-white scale-100"
                            : isNear
                            ? "text-[16px] font-normal text-neutral-400 dark:text-neutral-500 scale-95 opacity-60"
                            : isFar
                            ? "text-[13px] font-light text-neutral-300 dark:text-neutral-700 scale-90 opacity-30"
                            : "opacity-0 pointer-events-none"
                        }`}
                      >
                        {slot.value}
                      </div>
                    );
                  })}
                </div>

                {/* Center Colon Separator */}
                <div className="w-6 text-center text-neutral-400 font-semibold text-xl self-center z-10 pb-0.5">
                  :
                </div>

                {/* Right Drum: Minutes */}
                <div
                  ref={minuteScrollRef}
                  onWheel={handleMinuteWheel}
                  className="flex-1 flex flex-col items-center justify-center cursor-ns-resize py-4 z-10"
                >
                  {visibleMinutes.map((slot) => {
                    const isCenter = slot.offset === 0;
                    const isNear = Math.abs(slot.offset) === 1;
                    const isFar = Math.abs(slot.offset) === 2;

                    return (
                      <div
                        key={`minute-${slot.value}-${slot.offset}`}
                        onClick={() => setTempMinute(slot.value)}
                        className={`h-7 flex items-center justify-center transition-all select-none cursor-pointer ${
                          isCenter
                            ? "text-[22px] font-semibold text-neutral-900 dark:text-white scale-100"
                            : isNear
                            ? "text-[16px] font-normal text-neutral-400 dark:text-neutral-500 scale-95 opacity-60"
                            : isFar
                            ? "text-[13px] font-light text-neutral-300 dark:text-neutral-700 scale-90 opacity-30"
                            : "opacity-0 pointer-events-none"
                        }`}
                      >
                        {slot.value}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Back / Apply */}
              <div className="flex items-center gap-2.5 pt-4 mt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setView("summary")}
                  className="flex-1 py-2.5 px-4 rounded-full border border-neutral-200/90 dark:border-neutral-700 bg-white dark:bg-transparent text-neutral-800 dark:text-neutral-200 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800/60 active:scale-95 transition-all text-center cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleApplyTime}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] text-sm font-medium hover:bg-black dark:hover:bg-neutral-100 active:scale-95 shadow-xs transition-all text-center cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
