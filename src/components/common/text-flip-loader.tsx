"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TextFlipLoaderProps {
  /**
   * Static prefix word before the flipping text. Defaults to "loading".
   */
  prefix?: string;
  /**
   * Words to cycle through. Must have at least 5 entries where words[4] equals words[0]
   * for seamless infinite loop. Defaults to Uiverse's: ["buttons", "forms", "switches", "cards", "buttons"]
   */
  words?: string[];
  /**
   * Display size variant:
   * - sm: compact 24px height (great for inline cards or table headers)
   * - md: medium 32px height (great for section states)
   * - lg: large 40px height (original Uiverse reference size)
   */
  size?: "sm" | "md" | "lg";
  /**
   * Visual theme:
   * - "glass": High-contrast glassmorphic surface adapting to system light/dark mode
   * - "solid-white": Clean white card with crisp black switching text
   * - "minimal": Borderless inline loader without outer card container
   */
  variant?: "glass" | "solid-white" | "minimal";
  /**
   * Force the switching word to strictly render as black even in dark mode.
   * Defaults to true (per user requirement: "use black color which part is switching").
   */
  forceBlackSwitching?: boolean;
  /**
   * Additional root container classes.
   */
  className?: string;
}

const DEFAULT_WORDS = ["buttons", "forms", "switches", "cards", "buttons"];

export function TextFlipLoader({
  prefix = "loading",
  words = DEFAULT_WORDS,
  size = "lg",
  variant = "glass",
  forceBlackSwitching = true,
  className,
}: TextFlipLoaderProps) {
  // Ensure we always have 5 items for the 4-step translateY keyframe
  const displayWords =
    words.length >= 5
      ? words.slice(0, 5)
      : [
          words[0] || "buttons",
          words[1] || "forms",
          words[2] || "switches",
          words[3] || "cards",
          words[0] || "buttons",
        ];

  // Size styling maps
  const sizeMap = {
    sm: {
      loader: "h-6 text-sm px-2 py-0.5",
      words: "h-6",
      word: "leading-6 pl-1.5",
      prefix: "leading-6",
    },
    md: {
      loader: "h-8 text-lg px-2.5 py-1",
      words: "h-8",
      word: "leading-8 pl-2",
      prefix: "leading-8",
    },
    lg: {
      loader: "h-10 text-[22px] sm:text-[25px] px-3 py-1",
      words: "h-10",
      word: "leading-10 pl-2",
      prefix: "leading-10",
    },
  };

  const currentSize = sizeMap[size] || sizeMap.lg;

  // Root card styling based on variant
  const cardVariantClasses =
    variant === "minimal"
      ? "bg-transparent p-0 border-0 shadow-none"
      : variant === "solid-white"
      ? "bg-white text-[#111111] p-4 sm:p-6 rounded-2xl border border-black/[0.08] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06)]"
      : "apple-card p-4 sm:p-6";

  return (
    <div
      className={cn(
        "uiverse-loader-card select-none",
        cardVariantClasses,
        className
      )}
    >
      <div
        className={cn(
          "uiverse-loader font-medium tracking-tight",
          currentSize.loader
        )}
      >
        <p className={cn("text-[#7C7C7C] dark:text-[#A1A1A6]", currentSize.prefix)}>
          {prefix}
        </p>
        <div className={cn("uiverse-words", currentSize.words)}>
          {displayWords.map((word, idx) => (
            <span
              key={`${word}-${idx}`}
              className={cn(
                "uiverse-word font-bold tracking-tight",
                currentSize.word,
                forceBlackSwitching
                  ? "text-black dark:text-black font-extrabold"
                  : "text-black dark:text-white"
              )}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Full page centered overlay loader using the TextFlipLoader
 */
export function FullPageLoader({
  prefix = "loading",
  words = DEFAULT_WORDS,
  subtitle = "StackDrove Enterprise CTMS",
}: {
  prefix?: string;
  words?: string[];
  subtitle?: string;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#EEF1F6]/90 dark:bg-[#0A0B10]/90 backdrop-blur-2xl transition-all">
      <TextFlipLoader
        prefix={prefix}
        words={words}
        size="lg"
        variant="glass"
        forceBlackSwitching={true}
        className="shadow-2xl hover:scale-105 transition-transform"
      />
      {subtitle && (
        <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1A6]">
          {subtitle}
        </span>
      )}
    </div>
  );
}

export default TextFlipLoader;

