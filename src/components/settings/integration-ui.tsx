import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/** Shared look for the integration settings screens. */
export const labelCls = "block text-[#666666] dark:text-neutral-400 mb-1 font-medium";
export const inputCls = "w-full px-3 py-2 apple-input rounded-xl text-xs";
/** A section of an integration screen: separated from its neighbours by a hairline (see .cc-section), not boxed. */
export const cardCls = "cc-section space-y-3";
export const secondaryBtn =
  "cc-press px-3.5 py-2 rounded-xl text-xs font-semibold border border-black/[0.08] dark:border-white/[0.12] text-[#111111] dark:text-white bg-white/60 dark:bg-white/[0.06] hover:bg-white/90 dark:hover:bg-white/[0.12] hover:shadow-sm disabled:opacity-50";

export function ResultBox({ ok, warn, children }: { ok?: boolean; warn?: boolean; children: React.ReactNode }) {
  const tone = ok
    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200"
    : warn
    ? "bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200"
    : "bg-red-500/10 border-red-500/25 text-red-900 dark:text-red-200";
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div className={`cc-enter flex items-start gap-2 p-3 rounded-xl border text-[11px] leading-relaxed ${tone}`} role="status">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

/** Small rounded label, e.g. a language, category or status. */
export function Chip({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${className}`}>{children}</span>
  );
}

export const chipNeutral = "bg-black/[0.04] dark:bg-white/[0.08] border-black/[0.06] dark:border-white/[0.1] text-[#444] dark:text-neutral-300";
export const chipGreen = "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300";
export const chipAmber = "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300";
export const chipBlue = "bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-300";
export const chipRed = "bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300";

/**
 * A WhatsApp-style message bubble. `parts` are plain text or highlighted placeholder chips, so previews can show
 * where variables go.
 */
export function MessageBubble({
  header,
  footer,
  buttons,
  children,
}: {
  header?: string;
  footer?: string;
  buttons?: Array<{ type: string; text: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="cc-enter rounded-2xl rounded-tl-md bg-[#e4f6df]/90 dark:bg-[#1c3326]/85 backdrop-blur-sm border border-emerald-900/10 dark:border-emerald-300/10 shadow-sm p-3 text-[12px] leading-relaxed text-[#111] dark:text-neutral-100 max-w-md">
      {header && <div className="font-bold mb-1">{header}</div>}
      <div className="whitespace-pre-wrap break-words">{children}</div>
      {footer && <div className="mt-1.5 text-[10px] opacity-60">{footer}</div>}
      {buttons && buttons.length > 0 && (
        <div className="mt-2 space-y-1">
          {buttons.map((b, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-white/70 dark:bg-white/[0.08] rounded-lg py-1.5">
              {b.text || b.type}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A highlighted placeholder/tag inside a message preview. */
export function Slot({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className="px-1 py-px rounded bg-amber-300/40 dark:bg-amber-300/25 text-amber-900 dark:text-amber-200 font-semibold">
      {children}
    </span>
  );
}
