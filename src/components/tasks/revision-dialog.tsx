"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Task } from "@/types/database.types";
import { localDb } from "@/lib/data/dal";
import { getRevisionBlockReason } from "@/lib/data/task-utils";
import { useUIStore } from "@/lib/store/ui-store";
import { Clock, Calendar, AlertTriangle, X, FileText } from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";

interface RevisionDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onRevisionApproved: (updatedTask: Task) => void;
}

export function RevisionDialog({
  task,
  isOpen,
  onClose,
  onRevisionApproved,
}: RevisionDialogProps) {
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sessionUserId = useUIStore((s) => s.activeUserId);
  const activeRole = useUIStore((s) => s.activeRole);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // Same rule the DAL enforces: open work only, and within the revision allowance.
  const blockReason = getRevisionBlockReason(task);
  const isLimitReached = blockReason !== null;
  // A manager extending the deadline approves it; a delegatee's request is self-service (auto-approved).
  const isManager = activeRole !== "DELEGATEE" && activeRole !== "BOSS";
  const currentDeadlineDay = task.current_target_date ? task.current_target_date.split("T")[0] : "";
  const todayDay = new Date().toISOString().split("T")[0];
  const minDate = currentDeadlineDay > todayDay ? currentDeadlineDay : todayDay;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !reason) {
      notify.warning("Missing Fields", { description: "Please specify a new target date and justification." });
      return;
    }

    setSubmitting(true);
    try {
      const requester = sessionUserId || task.delegatee_id;
      const result = await localDb.requestDateRevision(
        task.id,
        requester,
        new Date(newDate).toISOString(),
        reason,
        { approvedBy: isManager ? requester : undefined }
      );

      if (result.error) {
        notify.error("Revision Blocked", { description: result.error });
        return;
      }

      if (result.task) {
        notify.success(
          `Timeline Extension Approved (${result.task.revision_count}/${result.task.max_revision_allowed})`,
          {
          description: `Deadline moved to ${new Date(newDate).toLocaleDateString()}.`,
        });

        onRevisionApproved({
          ...result.task,
          delegator: task.delegator,
          delegatee: task.delegatee,
          department: task.department,
          attachments: task.attachments,
        });
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Revision failed";
      notify.error("Extension Request Failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Fullscreen Backdrop Barrier */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Card Container with Pinned Header, Scrollable Body & Pinned Footer */}
      <div
        className="relative z-10 apple-card max-w-md w-full shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.12] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-white/80 dark:bg-[#161618]/80 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-[#111111] dark:text-white truncate tracking-tight">
                  Request Date Extension
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-[#2B4887]/10 dark:bg-[#3B82F6]/20 text-[#2B4887] dark:text-[#60A5FA] font-medium text-xs tracking-tight shrink-0">
                  #{task.task_no}
                </span>
              </div>
              <p className="text-xs font-normal text-[#666666] dark:text-neutral-400 truncate max-w-xs mt-0.5">
                {task.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            title="Close dialog"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {isLimitReached ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 text-center space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <h4 className="font-extrabold text-sm text-[#111111] dark:text-white">
                {task.revision_count >= task.max_revision_allowed
                  ? "Maximum Extensions Exceeded"
                  : "Extension Not Available"}
              </h4>
              <p className="text-xs text-[#666666] dark:text-neutral-400 leading-relaxed font-medium">
                {blockReason}
              </p>
            </div>
            <div className="shrink-0 px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 border border-black/[0.08] dark:border-white/[0.10] bg-white/80 dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.10] text-[#111111] dark:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Close Dialog
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs scrollbar-thin">
              {/* Revision Count Alert */}
              <div className="p-3.5 rounded-xl flex items-center justify-between text-xs bg-black/[0.02] dark:bg-white/[0.03] text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.08]">
                <span className="font-medium">
                  Extension Count: <strong className="font-extrabold text-[#2B4887] dark:text-[#60A5FA]">{task.revision_count} / {task.max_revision_allowed}</strong>
                </span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Permitted
                </span>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <Calendar size={14} className="text-[#2B4887] dark:text-[#3B82F6]" />
                  <span>Current Target Date</span>
                </label>
                <div className="flex items-center gap-2 h-10 px-3.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl text-[#111111] dark:text-white font-medium border border-black/[0.04] dark:border-white/[0.05]">
                  <Calendar size={14} className="text-neutral-400" />
                  <span>{new Date(task.current_target_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <Calendar size={14} className="text-[#2B4887] dark:text-[#3B82F6]" />
                  <span>Requested New Target Date</span>
                  <span className="text-rose-500 font-extrabold text-sm leading-none ml-0.5">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={minDate}
                  className="w-full h-10 px-3.5 apple-input rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <FileText size={14} className="text-[#2B4887] dark:text-[#3B82F6]" />
                  <span>Justification & Business Reason</span>
                  <span className="text-rose-500 font-extrabold text-sm leading-none ml-0.5">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the technical or logistical bottleneck necessitating this extension..."
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-medium resize-y min-h-[72px]"
                />
              </div>
            </div>

            {/* Pinned Sticky Footer */}
            <div className="shrink-0 px-5 sm:px-6 py-3 sm:py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] backdrop-blur-md flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-black/[0.08] dark:border-white/[0.10] rounded-xl font-bold text-xs text-[#111111] dark:text-white bg-white/80 dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.10] transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="apple-btn-primary py-2 px-5 text-xs font-extrabold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {submitting ? "Submitting..." : "Submit Extension"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
