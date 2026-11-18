"use client";

import React from "react";
import { toast } from "sonner";
import {
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  UploadCloud,
  Award,
  X,
  FileCheck2,
} from "lucide-react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface AdvancedToastOptions {
  description?: string;
  badge?: string;
  action?: ToastAction;
  duration?: number;
}

/**
 * Global notification event dispatcher to synchronize the Bell icon swing
 * animation and badge update across the system.
 */
function dispatchNotificationEvent(title: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("ctms:notification-received", {
        detail: { title, timestamp: Date.now() },
      })
    );
  }
}

interface FloatingBarProps {
  id: string | number;
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: string;
  action?: ToastAction;
}

/**
 * Floating Dynamic Island Notification Pop-up Bar (Video 2 Reference)
 * Sleek acrylic pill rendered at top-center with smooth spring physics.
 */
function NotificationPopUpBar({
  id,
  iconBg,
  icon,
  title,
  description,
  badge,
  action,
}: FloatingBarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="dynamic-toast-bar group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#141416]/95 dark:bg-[#141416]/95 text-white border border-white/12 dark:border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl select-none min-w-[280px] max-w-[420px] transition-all hover:scale-[1.01]"
    >
      {/* Status Icon Pill */}
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${iconBg} shadow-xs`}
      >
        {icon}
      </div>

      {/* Text Area */}
      <div className="flex-1 min-w-0 pr-1 text-left">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-semibold text-white tracking-tight leading-snug truncate">
            {title}
          </h4>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300 shrink-0">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-[#A3A3A3] leading-snug mt-0.5 truncate font-normal">
            {description}
          </p>
        )}
      </div>

      {/* Optional Action Button */}
      {action && (
        <button
          onClick={() => {
            action.onClick();
            toast.dismiss(id);
          }}
          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white/12 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
        >
          {action.label}
        </button>
      )}

      {/* Dismiss Button */}
      {!action && (
        <button
          onClick={() => toast.dismiss(id)}
          className="p-1 rounded-md text-[#666666] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 -mr-1"
          aria-label="Dismiss notification"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export const notify = {
  // 1. Success Notification (Matches Video 2 "Changes saved")
  success: (title: string, options?: AdvancedToastOptions) => {
    dispatchNotificationEvent(title);
    return toast.custom(
      (id) => (
        <NotificationPopUpBar
          id={id}
          iconBg="bg-emerald-500 text-white"
          icon={<Check size={12} strokeWidth={2.8} />}
          title={title}
          description={options?.description}
          badge={options?.badge}
          action={options?.action}
        />
      ),
      { duration: options?.duration || 3500 }
    );
  },

  // 2. Info / Operational Notification
  info: (title: string, options?: AdvancedToastOptions) => {
    dispatchNotificationEvent(title);
    return toast.custom(
      (id) => (
        <NotificationPopUpBar
          id={id}
          iconBg="bg-brand text-white dark:text-[#111111]"
          icon={<Info size={12} strokeWidth={2.8} />}
          title={title}
          description={options?.description}
          badge={options?.badge}
          action={options?.action}
        />
      ),
      { duration: options?.duration || 4000 }
    );
  },

  // 3. Warning / Attention Notification
  warning: (title: string, options?: AdvancedToastOptions) => {
    dispatchNotificationEvent(title);
    return toast.custom(
      (id) => (
        <NotificationPopUpBar
          id={id}
          iconBg="bg-amber-500 text-white"
          icon={<AlertTriangle size={12} strokeWidth={2.8} />}
          title={title}
          description={options?.description}
          badge={options?.badge}
          action={options?.action}
        />
      ),
      { duration: options?.duration || 4500 }
    );
  },

  // 4. Error / Delay Notification
  error: (title: string, options?: AdvancedToastOptions) => {
    dispatchNotificationEvent(title);
    return toast.custom(
      (id) => (
        <NotificationPopUpBar
          id={id}
          iconBg="bg-rose-500 text-white"
          icon={<AlertCircle size={12} strokeWidth={2.8} />}
          title={title}
          description={options?.description}
          badge={options?.badge}
          action={options?.action}
        />
      ),
      { duration: options?.duration || 5000 }
    );
  },

  // 5. Specialized Task Lifecycle Notification
  task: (
    taskNo: number,
    title: string,
    status: string,
    options?: AdvancedToastOptions
  ) => {
    dispatchNotificationEvent(title);
    return toast.custom(
      (id) => (
        <NotificationPopUpBar
          id={id}
          iconBg="bg-brand text-white dark:text-[#111111]"
          icon={<FileCheck2 size={12} strokeWidth={2.8} />}
          title={title}
          description={options?.description}
          badge={`#${taskNo} • ${status}`}
          action={options?.action}
        />
      ),
      { duration: options?.duration || 4500 }
    );
  },

  // 6. Specialized SLA Score Award Notification
  score: (taskNo: number, score: number, remarks?: string) => {
    const title = `Task #${taskNo} Score Awarded`;
    dispatchNotificationEvent(title);
    return toast.custom(
      (id) => (
        <NotificationPopUpBar
          id={id}
          iconBg="bg-emerald-500 text-white"
          icon={<Award size={12} strokeWidth={2.8} />}
          title={title}
          description={remarks || "SLA compliance punctuality verified."}
          badge={`${score.toFixed(1)}/10 pts`}
        />
      ),
      { duration: 4500 }
    );
  },

  // 7. Specialized Cloudinary Deliverable Upload Notification
  upload: (fileName: string, fileSizeBytes?: number, viewUrl?: string) => {
    const title = "Deliverable Uploaded";
    dispatchNotificationEvent(title);
    return toast.custom(
      (id) => (
        <NotificationPopUpBar
          id={id}
          iconBg="bg-brand text-white dark:text-[#111111]"
          icon={<UploadCloud size={12} strokeWidth={2.8} />}
          title={title}
          description={`${fileName}${
            fileSizeBytes ? ` • ${(fileSizeBytes / 1024).toFixed(0)} KB` : ""
          }`}
          badge="Cloudinary"
          action={
            viewUrl
              ? {
                  label: "View Proof",
                  onClick: () => window.open(viewUrl, "_blank"),
                }
              : undefined
          }
        />
      ),
      { duration: 4500 }
    );
  },
};
