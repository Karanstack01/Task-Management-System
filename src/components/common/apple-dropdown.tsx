"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Check, Search } from "lucide-react";

export interface DropdownItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  thumbnail?: React.ReactNode;
  badge?: string | number | null;
  disabled?: boolean;
  danger?: boolean;
  children?: DropdownItem[]; // Nested sub-menu matching video Frame 004-007
  onClick?: () => void;
}

export interface AppleDropdownProps {
  items: DropdownItem[];
  value?: string;
  onChange?: (value: string, item: DropdownItem) => void;
  placeholder?: string;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  direction?: "auto" | "up" | "down";
  align?: "left" | "right" | "center";
  leadingThumbnail?: React.ReactNode;
  headerTitle?: string;
  showSearch?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "form";
  disabled?: boolean;
  fullWidth?: boolean;
  matchTriggerWidth?: boolean;
  hideHeader?: boolean;
}

// Find item recursively by id
function findItemById(items: DropdownItem[], id?: string): DropdownItem | null {
  if (!id) return null;
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const childMatch = findItemById(item.children, id);
      if (childMatch) return childMatch;
    }
  }
  return null;
}

export function AppleDropdown({
  items,
  value,
  onChange,
  placeholder = "Select...",
  trigger,
  triggerClassName = "",
  direction = "auto",
  align = "left",
  leadingThumbnail,
  headerTitle,
  showSearch = false,
  className = "",
  size = "md",
  disabled = false,
  fullWidth = false,
  matchTriggerWidth = false,
  hideHeader = false,
}: AppleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<DropdownItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    width?: number;
    openUpward: boolean;
  }>({ openUpward: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedItem = findItemById(items, value);

  // Compute position relative to trigger pill
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 320; // approximate maxHeight for auto calculations
    const gap = 6;

    let openUpward = false;
    if (direction === "up") {
      openUpward = true;
    } else if (direction === "down") {
      openUpward = false;
    } else {
      // auto
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        openUpward = true;
      }
    }

    const newCoords: typeof coords = {
      openUpward,
      width: matchTriggerWidth ? rect.width : Math.max(rect.width, 220),
    };

    if (openUpward) {
      newCoords.bottom = window.innerHeight - rect.top + gap;
    } else {
      newCoords.top = rect.bottom + gap;
    }

    if (align === "right") {
      newCoords.right = window.innerWidth - rect.right;
    } else if (align === "center") {
      newCoords.left = Math.max(12, rect.left + rect.width / 2 - 120);
    } else {
      newCoords.left = matchTriggerWidth
        ? rect.left
        : Math.min(Math.max(12, rect.left), window.innerWidth - 260);
    }

    setCoords(newCoords);
  }, [direction, align, matchTriggerWidth]);

  // Open / Close toggling
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
      setActiveSubMenu(null);
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setIsOpen(false);
      setActiveSubMenu(null);
    }
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeSubMenu) {
          setActiveSubMenu(null);
        } else {
          setIsOpen(false);
        }
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setActiveSubMenu(null);
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, activeSubMenu, updateCoords]);

  const handleSelectItem = (item: DropdownItem) => {
    if (item.disabled) return;
    if (item.children && item.children.length > 0) {
      // Toggle nested submenu drawer (matching video Frame 004 -> Frame 007)
      setActiveSubMenu(item);
      return;
    }

    if (item.onClick) {
      item.onClick();
    }
    if (onChange) {
      onChange(item.id, item);
    }
    setIsOpen(false);
    setActiveSubMenu(null);
  };

  // Filter items by search query
  const filterList = (list: DropdownItem[]): DropdownItem[] => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q) ||
        (item.children && item.children.some((c) => c.label.toLowerCase().includes(q)))
    );
  };

  const displayedItems = activeSubMenu
    ? activeSubMenu.children || []
    : filterList(items);

  // Size styling for the sleek enterprise glass trigger
  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs min-h-[32px] gap-2 rounded-lg",
    md: "px-3 py-1.5 text-xs min-h-[36px] gap-2 rounded-xl",
    lg: "px-4 py-2 text-sm min-h-[40px] gap-2.5 rounded-xl",
    form: "px-3.5 py-2 text-xs min-h-[40px] h-10 gap-2.5 rounded-xl",
  }[size];

  // Visual thumbnail or vector icon rendering helper
  const renderVisual = () => {
    if (selectedItem?.icon) {
      return (
        <span className="shrink-0 flex items-center justify-center text-[#666666] dark:text-neutral-400 group-hover:text-[#111111] dark:group-hover:text-white transition-colors">
          {selectedItem.icon}
        </span>
      );
    }
    if (selectedItem?.thumbnail) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-black/10 dark:ring-white/10">
          {selectedItem.thumbnail}
        </div>
      );
    }
    if (leadingThumbnail) {
      return <div className="shrink-0 flex items-center justify-center">{leadingThumbnail}</div>;
    }
    return null;
  };

  return (
    <div className={`relative ${fullWidth ? "block w-full" : "inline-block"} ${className}`}>
      {/* ENTERPRISE GLASS TRIGGER BUTTON */}
      {trigger ? (
        <div
          ref={(el) => {
            triggerRef.current = el as unknown as HTMLButtonElement;
          }}
          onClick={handleToggle}
          className="cursor-pointer"
        >
          {trigger}
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`group flex items-center bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl text-[#111111] dark:text-[#EDEDED] border border-black/[0.08] dark:border-white/[0.08] shadow-2xs hover:bg-white dark:hover:bg-white/[0.08] hover:border-black/20 dark:hover:border-white/20 active:scale-[0.98] transition-all duration-200 outline-none select-none cursor-pointer ${sizeStyles} ${
            fullWidth ? "w-full justify-between" : ""
          } ${triggerClassName} ${
            isOpen ? "ring-2 ring-black/10 dark:ring-white/15 border-black/20 dark:border-white/20" : ""
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {/* Visual element and Active Label */}
          <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
            {renderVisual()}

            <span className="font-medium tracking-tight truncate text-[#111111] dark:text-white">
              {selectedItem ? selectedItem.label : placeholder}
            </span>
          </div>

          {/* Badge & Chevron */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {selectedItem?.badge !== undefined && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/[0.05] dark:bg-white/[0.1] text-[#666666] dark:text-[#A1A1A6]">
                {selectedItem.badge}
              </span>
            )}

            <ChevronDown
              className={`w-3.5 h-3.5 text-[#86868B] dark:text-neutral-400 transition-transform duration-200 shrink-0 ${
                isOpen ? "rotate-180 text-[#111111] dark:text-white" : ""
              }`}
            />
          </div>
        </button>
      )}

      {/* EXPANDED DROPDOWN CARD (Matching Frames 004 & 007) */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: coords.left !== undefined ? `${coords.left}px` : undefined,
              right: coords.right !== undefined ? `${coords.right}px` : undefined,
              width: matchTriggerWidth && coords.width ? `${coords.width}px` : undefined,
              minWidth: matchTriggerWidth && coords.width ? `${coords.width}px` : "240px",
              maxWidth: matchTriggerWidth ? "calc(100vw - 24px)" : "360px",
              zIndex: 99999,
            }}
            className="animate-in fade-in zoom-in-95 duration-200 origin-top rounded-2xl bg-white/95 dark:bg-[#121216]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] p-2 shadow-2xl text-[#111111] dark:text-[#F5F5F7] select-none"
            role="listbox"
          >
            {/* Header: Displays Category/Active Title matching Video */}
            {(!hideHeader || activeSubMenu) && (
              <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1.5 border-b border-black/[0.05] dark:border-white/[0.06]">
                {activeSubMenu ? (
                  // SUB-MENU HEADER (Frame 007): Circular button with flipped chevron (^) to return
                  <button
                    type="button"
                    onClick={() => setActiveSubMenu(null)}
                    className="group flex items-center gap-2 w-full text-left cursor-pointer outline-none"
                  >
                    <div className="w-6 h-6 rounded-full bg-black/[0.08] dark:bg-white/[0.14] group-hover:bg-black/[0.14] dark:group-hover:bg-white/[0.2] flex items-center justify-center transition-colors shrink-0">
                      <ChevronUp className="w-3.5 h-3.5 text-[#111111] dark:text-white" />
                    </div>
                    <span className="text-xs font-bold tracking-tight text-[#111111] dark:text-white truncate">
                      {activeSubMenu.label}
                    </span>
                  </button>
                ) : (
                  // ROOT HEADER: Bold header title with subtle icon
                  <div className="flex items-center gap-2 w-full">
                    {renderVisual()}
                    <span className="text-xs font-bold tracking-tight text-[#111111] dark:text-white truncate">
                      {headerTitle || selectedItem?.label || placeholder}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Optional Integrated Search */}
            {showSearch && !activeSubMenu && (
              <div className="relative mb-2 px-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#86868B]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] outline-none focus:ring-1 focus:ring-[#2357D6] text-[#111111] dark:text-white placeholder-[#86868B]"
                />
              </div>
            )}

            {/* ITEM LIST */}
            <div className="max-h-[260px] overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
              {displayedItems.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-[#86868B]">
                  No options found
                </div>
              ) : (
                displayedItems.map((item) => {
                  const isSelected = item.id === value;
                  const hasChildren = Boolean(item.children && item.children.length > 0);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-black/[0.06] dark:bg-white/[0.1] text-[#111111] dark:text-white font-semibold"
                          : "text-[#333333] dark:text-[#CCCCCC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#111111] dark:hover:text-white"
                      } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.icon ? (
                          <div className="w-4 h-4 flex items-center justify-center shrink-0 text-[#666666] dark:text-[#A1A1A6] group-hover:text-[#111111] dark:group-hover:text-white">
                            {item.icon}
                          </div>
                        ) : item.thumbnail ? (
                          <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-black/10 dark:ring-white/10">
                            {item.thumbnail}
                          </div>
                        ) : hasChildren ? (
                          <div className="w-5 h-5 rounded-md bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center transition-colors shrink-0">
                            <ChevronDown className="w-3 h-3 text-[#666666] dark:text-[#A1A1A6]" />
                          </div>
                        ) : null}

                        <div className="min-w-0 text-left">
                          <div className="truncate font-medium">{item.label}</div>
                          {item.sublabel && (
                            <div className="text-[10px] text-[#86868B] truncate">
                              {item.sublabel}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Indicator / Badge / Checkmark */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {item.badge !== undefined && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/[0.05] dark:bg-white/[0.1] text-[#666666] dark:text-[#A1A1A6]">
                            {item.badge}
                          </span>
                        )}
                        {isSelected && !hasChildren && (
                          <Check className="w-3.5 h-3.5 text-[#2357D6] dark:text-[#2357D6] stroke-[2.5]" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
