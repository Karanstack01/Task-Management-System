"use client";

import React, { useState, useRef, useEffect, useMemo, useId, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ArrowRight, CornerDownLeft, Sparkles, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Utilities ────────────────────────────────────────────────────────────────

function detectUnsupportedBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isSafari =
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium") &&
    !ua.includes("android") &&
    !ua.includes("firefox");
  return isSafari || ua.includes("crios");
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Animation variants ───────────────────────────────────────────────────────

const buttonMotionVariants = {
  step1: { x: 0, width: 120 },
  step2: { x: 0, width: 240 },
};

const iconMotionVariants = {
  hidden: { x: -30, opacity: 0, scale: 0.6 },
  visible: { x: 8, opacity: 1, scale: 1 },
};

// ── Loading SVG icon ─────────────────────────────────────────────────────────

function LoadingSvgIcon() {
  const lines: [number, number, number, number][] = [
    [128, 32, 128, 64],
    [195.88, 60.12, 173.25, 82.75],
    [224, 128, 192, 128],
    [195.88, 195.88, 173.25, 173.25],
    [128, 224, 128, 192],
    [60.12, 195.88, 82.75, 173.25],
    [32, 128, 64, 128],
    [60.12, 60.12, 82.75, 82.75],
  ];
  return (
    <svg
      className="gooey-search-loading"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      aria-label="Loading"
      role="status"
      style={{ width: 16, height: 16 }}
    >
      <rect width="256" height="256" fill="none" />
      {lines.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={20}
        />
      ))}
    </svg>
  );
}

// ── Text Highlight Helper ───────────────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;

  const before = text.substring(0, idx);
  const match = text.substring(idx, idx + q.length);
  const after = text.substring(idx + q.length);

  return (
    <span className="truncate">
      {before}
      <span className="font-bold underline decoration-indigo-500/60 dark:decoration-indigo-400/80 decoration-2 underline-offset-2">
        {match}
      </span>
      {after}
    </span>
  );
}

// ── Public Types ─────────────────────────────────────────────────────────────

export interface GooeySearchProps {
  /** Strings to search locally. Ignored when `onSearch` is provided. */
  items?: string[];
  /** Async/sync custom search function for external data sources. */
  onSearch?: (query: string) => Promise<string[]> | string[];
  /** Input placeholder text. */
  placeholder?: string;
  /** Label shown on the collapsed button. */
  buttonLabel?: string;
  /** Called when the user clicks a result item. */
  onSelect?: (item: string) => void;
  /** Direct search input callback for live parent filtering */
  onChange?: (value: string) => void;
  /** Controlled value if parent manages state */
  value?: string;
  /** Extra class names for the outermost wrapper. */
  className?: string;
  /** Input debounce delay in ms. Defaults to 250. */
  debounceMs?: number;
  /** Maximum number of results to render. Defaults to 6. */
  maxResults?: number;
  /** Dropdown results horizontal alignment. Defaults to "left". */
  align?: "left" | "right";
}

// ── Main Component ───────────────────────────────────────────────────────────

export function GooeySearch({
  items = [],
  onSearch,
  placeholder = "Type to search...",
  buttonLabel = "Search",
  onSelect,
  onChange,
  value,
  className,
  debounceMs = 250,
  maxResults = 6,
  align = "left",
}: GooeySearchProps) {
  const uid = useId().replace(/:/g, "_");
  const filterId = `gooey-search-${uid}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [searchText, setSearchText] = useState(value || "");
  const [results, setResults] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);

  const isUnsupported = useMemo(() => detectUnsupportedBrowser(), []);
  const debouncedQuery = useDebounce(searchText, debounceMs);

  // Sync external value
  useEffect(() => {
    if (value !== undefined && value !== searchText) {
      setSearchText(value);
      if (value && step === 1) {
        setStep(2);
      }
    }
  }, [value, step, searchText]);

  // Focus input when expanding
  useEffect(() => {
    if (step === 2) {
      inputRef.current?.focus();
    }
  }, [step]);

  // Handle outside click & escape
  useEffect(() => {
    if (step === 1 && results.length === 0) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!searchText.trim()) {
          setStep(1);
        }
        setResults([]);
        setSelectedIndex(-1);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStep(1);
        setSearchText("");
        onChange?.("");
        setResults([]);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step, searchText, onChange, results.length]);

  // Search execution
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setSelectedIndex(-1);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let data: string[];
        if (onSearch) {
          data = await onSearch(debouncedQuery);
        } else {
          await new Promise<void>((r) => setTimeout(r, 120));
          const q = debouncedQuery.trim().toLowerCase();
          data = items.filter((item) => item.toLowerCase().includes(q));
        }
        if (!cancelled) {
          setResults(data.slice(0, maxResults));
          setSelectedIndex(-1);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, items, onSearch, maxResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchText(val);
    onChange?.(val);
  };

  const handleItemSelect = (item: string) => {
    onSelect?.(item);
    setSearchText(item);
    onChange?.(item);
    setResults([]);
    setSelectedIndex(-1);
  };

  // Keyboard navigation for results
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleItemSelect(results[selectedIndex]);
      } else if (results.length > 0) {
        handleItemSelect(results[0]);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center select-none z-40", className)}
    >
      {/* Keyframe injection */}
      <style>{`
        .gooey-search-loading {
          animation: gooeySearchSpin 0.6s linear infinite;
          transform-origin: center center;
        }
        @keyframes gooeySearchSpin { to { transform: rotate(360deg); } }
        .gooey-search-input::placeholder { color: currentColor; opacity: 0.5; }
      `}</style>

      {/* SVG gooey filter */}
      <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -15"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Search Bar Container */}
      <div className="relative flex items-center">
        {/* Morphing Capsule Button & Input */}
        <motion.div
          variants={buttonMotionVariants}
          initial="step1"
          animate={step === 1 ? "step1" : "step2"}
          transition={{ duration: 0.5, type: "spring", bounce: 0.12 }}
          onClick={() => step === 1 && setStep(2)}
          whileHover={{ scale: step === 2 ? 1 : 1.02 }}
          whileTap={{ scale: 0.97 }}
          role={step === 1 ? "button" : undefined}
          aria-label={step === 1 ? "Open search" : undefined}
          className={cn(
            "relative flex items-center rounded-full transition-shadow duration-200 cursor-pointer overflow-hidden outline-none",
            step === 1
              ? "bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#111111] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.12] px-3.5 py-1.5 shadow-xs"
              : "bg-white dark:bg-[#18181B] text-[#111111] dark:text-[#F5F5F7] border border-black/[0.12] dark:border-white/[0.18] px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-2 ring-black/5 dark:ring-white/10"
          )}
        >
          {step === 1 ? (
            <div className="flex items-center justify-center gap-2 w-full text-xs font-semibold tracking-tight">
              <Search className="w-3.5 h-3.5 text-[#86868B] dark:text-[#A1A1A6]" />
              <span className="truncate">{buttonLabel}</span>
            </div>
          ) : (
            <div className="flex items-center w-full pr-8">
              <Search className="w-3.5 h-3.5 text-[#86868B] dark:text-[#A1A1A6] mr-2 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="gooey-search-input w-full bg-transparent border-none outline-none text-xs font-medium text-[#111111] dark:text-[#F5F5F7]"
                placeholder={placeholder}
                aria-label="Search input"
                value={searchText}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          )}
        </motion.div>

        {/* Floating Animated Icon Bubble */}
        <AnimatePresence mode="wait">
          {step === 2 && (
            <motion.div
              key="icon-bubble"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={iconMotionVariants}
              transition={{ delay: 0.05, duration: 0.6, type: "spring", bounce: 0.2 }}
              className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-[#111111] flex items-center justify-center shadow-md shrink-0 pointer-events-none"
            >
              {isLoading ? (
                <LoadingSvgIcon />
              ) : (
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================================================================= */}
        {/* CORRECTED UNIFIED DROPDOWN RESULTS CARD                           */}
        {/* ================================================================= */}
        <AnimatePresence>
          {step === 2 && results.length > 0 && (
            <motion.div
              key="unified-results-card"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                ...(align === "right" ? { right: 0 } : { left: 0 }),
                width: "max(100%, 280px)",
                maxWidth: "340px",
                zIndex: 99999,
              }}
              className="rounded-2xl bg-white dark:bg-[#18181B] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.22)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] p-2 overflow-hidden text-[#111111] dark:text-[#F5F5F7] select-none"
              role="listbox"
            >
              {/* Header: Suggestions Count */}
              <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-black/[0.04] dark:border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1A6]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#2357D6] dark:text-[#D4F20D]" />
                  <span>Matching Results</span>
                </div>
                <span className="font-semibold text-[9px] px-1.5 py-0.2 rounded-full bg-black/[0.04] dark:bg-white/[0.08]">
                  {results.length} found
                </span>
              </div>

              {/* Items List */}
              <div className="max-h-[260px] overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
                {results.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleItemSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150",
                        isSelected
                          ? "bg-black/[0.06] dark:bg-white/[0.1] text-[#111111] dark:text-white font-semibold shadow-xs"
                          : "text-[#333333] dark:text-[#CCCCCC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-black/[0.08] dark:bg-white/[0.14] text-[#111111] dark:text-white"
                              : "bg-black/[0.03] dark:bg-white/[0.06] text-[#86868B] group-hover:text-[#111111] dark:group-hover:text-white"
                          )}
                        >
                          <Navigation className="w-3 h-3 rotate-45" />
                        </div>

                        <HighlightMatch text={item} query={searchText} />
                      </div>

                      {/* Right Indicator: Action Hint */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span
                          className={cn(
                            "text-[10px] font-semibold flex items-center gap-0.5 transition-opacity",
                            isSelected
                              ? "opacity-100 text-[#2357D6] dark:text-[#D4F20D]"
                              : "opacity-0 group-hover:opacity-75 text-[#86868B]"
                          )}
                        >
                          Jump <CornerDownLeft className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Hint */}
              <div className="px-2.5 pt-1.5 mt-1 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[10px] text-[#86868B]">
                <span>Navigate with ↑ ↓</span>
                <span>Select ↵</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default GooeySearch;
