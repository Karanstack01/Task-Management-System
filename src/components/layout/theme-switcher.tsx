"use client";

import React, { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { getThemePreference, setThemePreferenceAnimated, type ThemePreference } from "@/lib/theme/theme-service";

const OPTIONS: Array<{ id: ThemePreference; label: string; hint: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: "light", label: "Light", hint: "Always light", icon: Sun },
  { id: "system", label: "System", hint: "Match your device", icon: Monitor },
  { id: "dark", label: "Dark", hint: "Always dark", icon: Moon },
];

function subscribe(onChange: () => void) {
  window.addEventListener("stackdrove:theme-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("stackdrove:theme-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Light / System / Dark switch. "System" follows the device's appearance setting live.
 * Wide screens get a segmented control with a sliding thumb; small screens get one button that cycles.
 */
export function ThemeSwitcher() {
  const pref = useSyncExternalStore(subscribe, getThemePreference, () => "system" as ThemePreference);
  const index = Math.max(0, OPTIONS.findIndex((o) => o.id === pref));

  const choose = (id: ThemePreference, origin: Element | null) => {
    if (id !== pref) setThemePreferenceAnimated(id, origin);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = OPTIONS[(index + dir + OPTIONS.length) % OPTIONS.length];
    choose(next.id, e.currentTarget.querySelector(`[data-theme-option="${next.id}"]`));
    (e.currentTarget.querySelector(`[data-theme-option="${next.id}"]`) as HTMLElement | null)?.focus();
  };

  const Current = OPTIONS[index].icon;
  const nextOption = OPTIONS[(index + 1) % OPTIONS.length];

  return (
    <>
      {/* Wide screens: segmented control */}
      <div
        role="radiogroup"
        aria-label="Theme"
        onKeyDown={onKeyDown}
        className="hidden sm:inline-flex relative items-center p-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.05] dark:border-white/[0.08]"
      >
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 left-0.5 w-7 rounded-full bg-white dark:bg-white/[0.18] shadow-sm shadow-black/10 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {OPTIONS.map(({ id, label, hint, icon: Icon }) => {
          const selected = id === pref;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={`${label} — ${hint}`}
              tabIndex={selected ? 0 : -1}
              data-theme-option={id}
              onClick={(e) => choose(id, e.currentTarget)}
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 active:scale-90 ${
                selected ? "text-[#111111] dark:text-white" : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      {/* Small screens: one button that cycles Light → System → Dark */}
      <button
        type="button"
        onClick={(e) => choose(nextOption.id, e.currentTarget)}
        aria-label={`Theme: ${OPTIONS[index].label}. Switch to ${nextOption.label}`}
        title={`Theme: ${OPTIONS[index].label} (tap for ${nextOption.label})`}
        className="sm:hidden p-2 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#111111] dark:text-white transition-all cursor-pointer active:scale-90"
      >
        <Current size={17} />
      </button>
    </>
  );
}
