"use client";

import React, { useEffect, useState, useRef } from "react";

export interface RollingNumberProps {
  value: string | number;
  duration?: number; // in milliseconds (default 1200ms)
  delay?: number; // delay before starting in ms
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Parses numeric strings such as "15", "27%", "2.4", "10.0/10", "₹2,480", "+4.8%"
 * into numerical target, prefix, suffix, and decimal precision.
 */
export function parseNumberParts(value: string | number): {
  prefix: string;
  target: number;
  suffix: string;
  decimals: number;
  hasCommas: boolean;
} | null {
  if (typeof value === "number") {
    if (isNaN(value)) return null;
    const dec = value.toString().includes(".") ? value.toString().split(".")[1].length : 0;
    return { prefix: "", target: value, suffix: "", decimals: dec, hasCommas: false };
  }

  const str = String(value).trim();
  // Regex to capture prefix, signed number with commas/decimals, and trailing suffix
  const match = str.match(/^([^\d\-+.]*)?([+\-]?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return null;

  const prefix = match[1] || "";
  const rawNum = match[2];
  const suffix = match[3] || "";
  const hasCommas = rawNum.includes(",");
  const cleanNum = rawNum.replace(/,/g, "");
  const target = parseFloat(cleanNum);

  if (isNaN(target)) return null;
  const dec = cleanNum.includes(".") ? cleanNum.split(".")[1].length : 0;

  return { prefix, target, suffix, decimals: dec, hasCommas };
}

/**
 * High-performance smooth cubic ease-out curve (Apple-grade physics)
 * Starts fast and decelerates gracefully to rest.
 */
function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

export function RollingNumber({
  value,
  duration = 1100,
  delay = 0,
  className = "",
  decimals: explicitDecimals,
  prefix: explicitPrefix,
  suffix: explicitSuffix,
}: RollingNumberProps) {
  const parsed = parseNumberParts(value);

  // If value is not parsable as a number, render verbatim
  if (!parsed) {
    return <span className={className}>{String(value)}</span>;
  }

  const target = parsed.target;
  const decimals = explicitDecimals !== undefined ? explicitDecimals : parsed.decimals;
  const prefix = explicitPrefix !== undefined ? explicitPrefix : parsed.prefix;
  const suffix = explicitSuffix !== undefined ? explicitSuffix : parsed.suffix;
  const hasCommas = parsed.hasCommas;

  const [displayValue, setDisplayValue] = useState<number>(0);
  const startTimestampRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    const startVal = displayValue;
    startValueRef.current = startVal;
    startTimestampRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimestampRef.current) {
        startTimestampRef.current = timestamp;
      }

      const elapsed = timestamp - startTimestampRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const current = startVal + (target - startVal) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(target);
      }
    };

    if (delay > 0) {
      timeoutId = setTimeout(() => {
        frameRef.current = requestAnimationFrame(animate);
      }, delay);
    } else {
      frameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  // Format the numerical output
  let formattedNumber: string;
  if (decimals > 0) {
    formattedNumber = displayValue.toFixed(decimals);
  } else {
    formattedNumber = Math.round(displayValue).toString();
  }

  if (hasCommas) {
    const parts = formattedNumber.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    formattedNumber = parts.join(".");
  }

  return (
    <span className={`inline-flex items-baseline font-mono tabular-nums tracking-tight ${className}`}>
      {prefix && <span className="select-none">{prefix}</span>}
      <span>{formattedNumber}</span>
      {suffix && <span className="select-none">{suffix}</span>}
    </span>
  );
}
