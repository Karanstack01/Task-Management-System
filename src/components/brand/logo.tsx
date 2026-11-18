"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  size?: number;
  variant?: "auto" | "light" | "dark" | "chartreuse" | "blue";
  tagline?: "ctms" | "brand" | "none";
}

/**
 * StackDrove Brand Mark Component (Official SD Symbol from SD asset folder)
 */
export function StackDroveMark({
  size = 32,
  className = "",
  variant = "auto",
}: {
  size?: number;
  className?: string;
  variant?: "auto" | "light" | "dark" | "chartreuse" | "blue";
}) {
  // Ratio of mark icon is 817 : 1024 (width : height)
  const width = Math.round((size * 817) / 1024);

  return (
    <div
      data-brand-mark="true"
      className={cn(
        "relative shrink-0 flex items-center justify-center select-none overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden stackdrove-mark",
        className
      )}
      style={{ width: `${width}px`, height: `${size}px` }}
    >
      {variant === "chartreuse" ? (
        <img
          src="/sd/stackdrove-mark-chartreuse.svg"
          alt="StackDrove Mark"
          width={width}
          height={size}
          className="w-full h-full object-contain block leading-none select-none pointer-events-none"
        />
      ) : variant === "blue" ? (
        <img
          src="/sd/stackdrove-mark-blue.svg"
          alt="StackDrove Mark"
          width={width}
          height={size}
          className="w-full h-full object-contain block leading-none select-none pointer-events-none"
        />
      ) : variant === "light" ? (
        <img
          src="/sd/stackdrove-mark-light.svg"
          alt="StackDrove Mark"
          width={width}
          height={size}
          className="w-full h-full object-contain block leading-none select-none pointer-events-none"
        />
      ) : variant === "dark" ? (
        <img
          src="/sd/stackdrove-mark-dark.svg"
          alt="StackDrove Mark"
          width={width}
          height={size}
          className="w-full h-full object-contain block leading-none select-none pointer-events-none"
        />
      ) : (
        <>
          {/* Light mode: dark mark */}
          <img
            src="/sd/stackdrove-mark-light.svg"
            alt="StackDrove Mark"
            width={width}
            height={size}
            className="w-full h-full object-contain block leading-none select-none pointer-events-none dark:hidden"
          />
          {/* Dark mode: white / high-contrast mark */}
          <img
            src="/sd/stackdrove-mark-dark.svg"
            alt="StackDrove Mark"
            width={width}
            height={size}
            className="w-full h-full object-contain block leading-none select-none pointer-events-none hidden dark:block"
          />
        </>
      )}
    </div>
  );
}

/**
 * StackDrove Full Logo Component (Official Logo Lockup from SD asset folder)
 */
export function StackDroveLogo({
  className = "",
  showText = true,
  textClassName = "",
  size = 32,
  variant = "auto",
  tagline = "ctms",
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* Official Symbol from SD Folder */}
      <StackDroveMark size={size} variant={variant} />

      {/* Typography Lockup */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-bold text-base tracking-[-0.03em] text-[#111111] dark:text-white",
              textClassName
            )}
          >
            StackDrove
          </span>
          {tagline === "brand" ? (
            <span className="text-[10px] font-medium text-[#666666] dark:text-[#A3A3A3] tracking-[0.12em] uppercase mt-1">
              Build. Automate. Scale.
            </span>
          ) : tagline === "ctms" ? (
            <span className="text-[10px] font-medium text-[#666666] dark:text-[#A3A3A3] tracking-[0.12em] uppercase mt-1">
              CTMS Enterprise
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
