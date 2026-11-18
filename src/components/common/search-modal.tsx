"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Buildings,
  ChatTeardropText,
  Checks,
  EnvelopeSimple,
  FileArrowDown,
  ListPlus,
  MagnifyingGlass,
  Plus,
  ShareFat,
  SlidersHorizontal,
  Users,
  X,
  ArrowRight,
  CheckCircle,
  Clock,
  Sparkle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Search Modal
 *
 * A minimalist command-palette panel: a search bar that live-filters the result
 * list, removable "I'm looking for…" tags, people/results rows with per-row
 * actions, a quick-actions list with keyboard hints, and a files section.
 *
 * Ported into a self-contained, prop-driven React component adapted to the
 * CTMS (Central Task Management System) platform use case.
 */

export interface SearchTag {
  id?: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SearchResultAction {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
}

export interface SearchResult {
  /** Primary label (also matched against the query). */
  name: string;
  /** Secondary text such as an email, status or context (also matched). */
  meta?: string;
  /** Category tag for filtering (tasks, people, workspaces, files) */
  category?: "tasks" | "people" | "workspaces" | "files" | string;
  /** Status badge text if applicable */
  status?: string;
  /** Avatar image URL or fallback initials. */
  avatar?: string;
  /** Link target for the row. */
  href?: string;
  /** Trailing action icons. */
  actions?: SearchResultAction[];
}

export interface QuickAction {
  label: string;
  icon?: React.ReactNode;
  /** Keyboard hint shown on the right (e.g. "N"). */
  shortcut?: string;
  href?: string;
  onClick?: () => void;
}

export interface SearchFile {
  name: string;
  /** File extension shown dimmed after the name (e.g. ".pdf"). */
  ext?: string;
  icon?: React.ReactNode;
  /** Show the green "verified" checks next to the name. */
  verified?: boolean;
  href?: string;
  onShare?: () => void;
}

export interface SearchModalProps {
  /** Placeholder for the search input. */
  placeholder?: string;
  /** Removable filter tags. */
  tags?: SearchTag[];
  /** Result rows, live-filtered by the query. */
  results?: SearchResult[];
  /** Quick-action rows. */
  quickActions?: QuickAction[];
  /** File rows. */
  files?: SearchFile[];
  /** Initial query value. */
  defaultQuery?: string;
  /** Called as the query changes. */
  onQueryChange?: (query: string) => void;
  /** Called when a result row is clicked. */
  onSelectResult?: (result: SearchResult, index: number) => void;
  /** Extra classes for the root panel. */
  className?: string;

  /** Render as a centered overlay with a backdrop instead of an inline panel. */
  modal?: boolean;
  /** Controlled open state (modal mode). */
  open?: boolean;
  /** Uncontrolled initial open state (modal mode). Defaults to false. */
  defaultOpen?: boolean;
  /** Called when the modal opens (true) or closes (false). */
  onOpenChange?: (open: boolean) => void;
  /** Key (pressed with ⌘/Ctrl) that toggles the modal. Defaults to "k"; set null to disable. */
  hotkey?: string | null;
  /** Close the modal on Escape. Defaults to true. */
  closeOnEscape?: boolean;
  /** Extra classes for the overlay wrapper (e.g. override `fixed` with `absolute` to scope it). */
  overlayClassName?: string;
}

const ICON = "h-[18px] w-[18px] text-neutral-400 dark:text-neutral-500";

// ── CTMS Adapted Default Filters & Data ──────────────────────────────────────

const DEFAULT_TAGS: SearchTag[] = [
  { id: "tasks", label: "Tasks & Deliverables", icon: <Checks className="h-3.5 w-3.5 text-indigo-500" /> },
  { id: "people", label: "Team & Assignees", icon: <Users className="h-3.5 w-3.5 text-emerald-500" /> },
  { id: "workspaces", label: "Workspaces", icon: <Buildings className="h-3.5 w-3.5 text-blue-500" /> },
  { id: "files", label: "Audit Proofs", icon: <FileArrowDown className="h-3.5 w-3.5 text-amber-500" /> },
];

const DEFAULT_RESULTS: SearchResult[] = [];

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { label: "Create new task", shortcut: "N", href: "/tasks/create" },
  { label: "Verification queue", shortcut: "V", href: "/verify" },
  { label: "Daily operational checklist", shortcut: "C", href: "/checklist" },
  { label: "Staff scorecards & leaderboards", shortcut: "S", href: "/scorecards" },
];

const DEFAULT_FILES: SearchFile[] = [];

export function SearchModal({
  placeholder = "Search tasks, team members, workspaces, audit proofs...",
  tags = DEFAULT_TAGS,
  results = DEFAULT_RESULTS,
  quickActions = DEFAULT_QUICK_ACTIONS,
  files = DEFAULT_FILES,
  defaultQuery = "",
  onQueryChange,
  onSelectResult,
  className,
  modal = false,
  open,
  defaultOpen = false,
  onOpenChange,
  hotkey = "k",
  closeOnEscape = true,
  overlayClassName,
}: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [activeTags, setActiveTags] = useState<SearchTag[]>(tags);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);

  // Open state — controlled via `open`, otherwise internal.
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const actualOpen = isControlled ? open : internalOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange]
  );

  // Keep latest open state reachable from keyboard listener.
  const openRef = useRef(actualOpen);
  const setOpenRef = useRef(setOpen);
  useEffect(() => {
    openRef.current = actualOpen;
    setOpenRef.current = setOpen;
  });

  // ⌘K / Ctrl+K to toggle, Escape to close.
  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (hotkey && e.key.toLowerCase() === hotkey.toLowerCase() && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenRef.current(!openRef.current);
      } else if (closeOnEscape && e.key === "Escape" && openRef.current) {
        setOpenRef.current(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, hotkey, closeOnEscape]);

  // Focus input when modal opens.
  useEffect(() => {
    if (modal && actualOpen) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [modal, actualOpen]);

  // Filter results by query AND active tags
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeCategoryIds = new Set(
      activeTags.map((t) => t.id || t.label.toLowerCase())
    );

    return results.filter((r) => {
      // If categories are set on items, respect active tags
      if (r.category && activeTags.length > 0) {
        const matchesTag =
          activeCategoryIds.has(r.category) ||
          activeTags.some((t) => t.label.toLowerCase().includes(r.category!));
        if (!matchesTag) return false;
      }
      if (!q) return true;
      return `${r.name} ${r.meta ?? ""} ${r.category ?? ""}`.toLowerCase().includes(q);
    });
  }, [query, results, activeTags]);

  const handleQuery = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };

  const removeTag = (index: number) =>
    setActiveTags((prev) => prev.filter((_, i) => i !== index));

  const handleRowClick = (
    e: React.MouseEvent,
    result: SearchResult,
    index: number
  ) => {
    e.preventDefault();
    onSelectResult?.(result, index);
    if (result.href) {
      router.push(result.href);
      setOpen(false);
    }
  };

  const handleQuickActionClick = (action: QuickAction) => {
    if (action.onClick) action.onClick();
    if (action.href) {
      router.push(action.href);
      setOpen(false);
    }
  };

  const handleFileShare = (file: SearchFile) => {
    if (file.onShare) file.onShare();
    if (file.href) {
      window.open(file.href, "_blank");
    }
  };

  const panel = (
    <div
      role={modal ? "dialog" : undefined}
      aria-modal={modal ? true : undefined}
      className={cn(
        "mx-auto w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all",
        "border-black/[0.08] bg-white/95 text-neutral-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]",
        "dark:border-white/[0.12] dark:bg-[#111111]/95 dark:text-white dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.75)]",
        className
      )}
    >
      {/* Search Bar - Fixed Header */}
      <div className="shrink-0 flex items-center gap-1.5 border-b border-black/[0.06] px-4 py-3.5 dark:border-white/[0.06]">
        <MagnifyingGlass className={ICON} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search CTMS"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-current outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />
        <div className="flex shrink-0 items-center gap-2">
          {query && (
            <button
              type="button"
              onClick={() => handleQuery("")}
              className="text-xs text-[#666666] hover:text-[#111111] dark:hover:text-white px-1.5 py-0.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              Clear
            </button>
          )}
          <kbd className="flex items-center gap-0.5 rounded-md border border-black/[0.06] bg-black/[0.03] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-neutral-400 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-neutral-500">
            <span className="text-[12px] leading-none">⌘</span>
            {modal && hotkey ? hotkey.toUpperCase() : "K"}
          </kbd>
        </div>
      </div>

      {/* System Filter Tags ("I'm looking for...") - Fixed Subheader */}
      {activeTags.length > 0 ? (
        <div className="shrink-0 border-b border-black/[0.06] px-4 py-2.5 dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            I&apos;m looking for...
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeTags.map((tag, i) => (
              <span
                key={`${tag.label}-${i}`}
                className="flex items-center gap-1.5 rounded-full bg-black/[0.04] py-0.5 pl-2.5 pr-2 text-xs font-medium ring-1 ring-inset ring-black/[0.05] dark:bg-white/[0.06] dark:ring-white/[0.08] transition-colors"
              >
                {tag.icon}
                <span>{tag.label}</span>
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  aria-label={`Remove filter ${tag.label}`}
                  className="text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Scrollable Content Body: Results, Quick Actions, and Audit Files */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-black/[0.06] dark:divide-white/[0.06] scrollbar-thin">
        {/* Results Section */}
        {results.length > 0 ? (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5 text-xs text-neutral-400 dark:text-neutral-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Matching Results
              </span>
              <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                {filteredResults.length} found
              </span>
            </div>

            <ul className="px-1.5 pb-2 space-y-0.5">
              {filteredResults.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-neutral-400">
                  No matching results found for &ldquo;{query}&rdquo;
                </li>
              ) : (
                filteredResults.map((result, i) => (
                  <li key={`${result.name}-${i}`}>
                    <a
                      href={result.href ?? "#"}
                      onClick={(e) => handleRowClick(e, result, i)}
                      className="group relative flex items-center rounded-xl px-2.5 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                    >
                      {result.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.avatar}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
                        />
                      ) : result.category === "workspaces" ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 text-xs font-bold">
                          <Buildings className="h-3.5 w-3.5" />
                        </span>
                      ) : result.category === "people" ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 text-[10px] font-bold">
                          {result.name.substring(0, 2).toUpperCase()}
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20 text-xs font-bold">
                          <Checks className="h-3.5 w-3.5" />
                        </span>
                      )}

                      <div className="ml-2.5 min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
                          {result.name}
                        </div>
                        {result.meta ? (
                          <div className="truncate text-[10px] text-neutral-400 dark:text-neutral-500">
                            {result.meta}
                          </div>
                        ) : null}
                      </div>

                      {result.actions && result.actions.length > 0 ? (
                        <span className="ml-auto flex items-center gap-2 pl-2 text-neutral-400 opacity-60 transition-opacity group-hover:opacity-100 dark:text-neutral-500">
                          {result.actions.map((action, ai) => (
                            <button
                              key={ai}
                              type="button"
                              aria-label={action.label}
                              title={action.label}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                action.onClick?.();
                              }}
                              className="p-1 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            >
                              {action.icon}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
                      )}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {/* Quick Actions */}
        {quickActions.length > 0 ? (
          <div className="px-1.5 py-1.5">
            <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Quick actions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {quickActions.map((action, i) => (
                <button
                  key={`${action.label}-${i}`}
                  type="button"
                  onClick={() => handleQuickActionClick(action)}
                  className="relative flex items-center rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-300">
                    {action.icon ?? <Plus className="h-3.5 w-3.5" />}
                  </span>
                  <span className="pl-2.5 text-xs font-medium truncate">{action.label}</span>
                  {action.shortcut ? (
                    <kbd className="ml-auto flex h-5 w-5 items-center justify-center rounded-md bg-black/[0.04] font-sans text-[11px] font-bold text-neutral-500 ring-1 ring-inset ring-black/[0.04] dark:bg-white/[0.06] dark:text-neutral-300 dark:ring-white/[0.06]">
                      {action.shortcut}
                    </kbd>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Audit Files Section */}
        {files.length > 0 ? (
          <div className="px-1.5 py-1.5 bg-black/[0.01] dark:bg-white/[0.01]">
            <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 text-xs text-neutral-400 dark:text-neutral-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Deliverable Proofs & Files
              </span>
              <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                {files.length}
              </span>
            </div>

            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="group relative flex items-center rounded-xl px-2.5 py-1.5 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-300">
                  {file.icon ?? <FileArrowDown className="h-3.5 w-3.5" />}
                </span>
                <span className="flex items-center gap-1.5 pl-2.5 text-xs font-medium truncate">
                  <span className="truncate">{file.name}</span>
                  {file.ext ? (
                    <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">
                      {file.ext}
                    </span>
                  ) : null}
                  {file.verified ? (
                    <CheckCircle weight="fill" className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => handleFileShare(file)}
                  className="ml-auto flex items-center gap-1 text-[11px] font-medium text-neutral-400 opacity-80 transition-all hover:text-neutral-800 group-hover:opacity-100 dark:text-neutral-500 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <ShareFat weight="bold" className="h-3.5 w-3.5" />
                  <span>View</span>
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!modal) return panel;

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={() => setOpen(false)}
      aria-hidden={!actualOpen}
      className={cn(
        "fixed inset-0 z-[99999] flex items-start justify-center p-3 sm:p-4 pt-[4vh] sm:pt-[6vh] pb-6 transition-opacity duration-200 select-none",
        actualOpen ? "opacity-100" : "pointer-events-none opacity-0",
        overlayClassName
      )}
    >
      {/* Fullscreen Backdrop Barrier */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md dark:bg-black/70" />

      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 w-full max-w-xl max-h-[82vh] flex flex-col transition-all duration-200 ease-out",
          actualOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-[0.98] opacity-0"
        )}
      >
        {panel}
      </div>
    </div>,
    document.body
  );
}

export default SearchModal;

