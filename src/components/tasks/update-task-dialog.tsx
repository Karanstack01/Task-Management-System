"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Task, TaskAttachment, TaskStatus } from "@/types/database.types";
import { localDb } from "@/lib/data/dal";
import { isTaskTransitionError } from "@/lib/data/task-state-machine";
import { useUIStore } from "@/lib/store/ui-store";
import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { AttachmentViewer } from "@/components/common/attachment-viewer";
import { CheckCircle2, Clock, X, AlertCircle, Pencil, FileText, Upload } from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { sendTaskSubmittedAlertAction } from "@/app/actions/notification-actions";
import { AppleDropdown, DropdownItem } from "@/components/common/apple-dropdown";

interface UpdateTaskDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onEditDetails?: (task: Task) => void;
}

export function UpdateTaskDialog({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onEditDetails,
}: UpdateTaskDialogProps) {
  const activeRole = useUIStore((s) => s.activeRole);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [remarks, setRemarks] = useState(task.score_remarks || "");
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const statusOptions: DropdownItem[] = useMemo(
    () => [
      {
        id: "IN_PROGRESS",
        label: "In Progress (Active execution)",
        sublabel: "Ongoing deliverable progress",
        badge: "Active",
        icon: <Clock size={14} className="text-blue-500" />,
      },
      {
        id: "DONE",
        label: "Done (Submit deliverables for completion)",
        sublabel: task.verification_needed ? "Submits for manager verification" : "Direct signoff",
        badge: "Submit",
        icon: <CheckCircle2 size={14} className="text-emerald-500" />,
      },
    ],
    [task.verification_needed]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleUploadSuccess = (newAtt: TaskAttachment) => {
    setAttachments((prev) => [newAtt, ...prev]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Attachments uploaded in this dialog go through the API route, so pass them as known proof.
      const updated = await localDb.updateTaskStatus(task.id, status, {
        actorRole: activeRole,
        knownAttachments: attachments,
      });

      if (updated) {
        // If moved to Awaiting Verification, dispatch notifications to Delegator via Server Action
        if (updated.status === "AWAITING_VERIFICATION") {
          const delegator = task.delegator;
          const delegatee = task.delegatee;

          await sendTaskSubmittedAlertAction({
            orgId: task.org_id,
            delegatorEmail: delegator?.email,
            delegatorPhone: delegator?.phone_number,
            delegatorName: delegator?.full_name || "Delegator",
            delegateeName: delegatee?.full_name || "Assignee",
            taskNo: task.task_no,
            title: task.title,
            deliverableName: attachments[0]?.file_name || "Proof of Work",
            deliverableUrl: attachments[0]?.file_url || "https://res.cloudinary.com/demo/sample.pdf",
            shortLink: task.short_link || "https://cbxit.in/t/verify",
          });

          notify.task(task.task_no, task.title, "AWAITING_VERIFICATION", {
            description: `Deliverables submitted. Notification dispatched to manager (${delegator?.full_name || "Delegator"}).`,
          });
        } else {
          notify.task(task.task_no, task.title, status, {
            description: `Task status marked as ${status}.`,
          });
        }

        onTaskUpdated({
          ...updated,
          attachments,
          delegator: task.delegator,
          delegatee: task.delegatee,
          department: task.department,
        });
        onClose();
      }
    } catch (err: unknown) {
      if (isTaskTransitionError(err) && err.code === "NOOP") {
        onClose();
        return;
      }
      const msg = err instanceof Error ? err.message : "Update failed";
      notify.error(isTaskTransitionError(err) ? "Status Change Not Allowed" : "Update Failed", {
        description: msg,
      });
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
        className="relative z-10 apple-card max-w-xl w-full shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[82vh] rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.12] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-white/80 dark:bg-[#161618]/80 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-[#111111] dark:text-white truncate tracking-tight">
                  Update Progress
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-[#2B4887]/10 dark:bg-[#3B82F6]/20 text-[#2B4887] dark:text-[#60A5FA] font-medium text-xs tracking-tight shrink-0">
                  #{task.task_no}
                </span>
              </div>
              <p className="text-xs font-normal text-[#666666] dark:text-neutral-400 truncate max-w-xs sm:max-w-md mt-0.5">
                {task.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {onEditDetails && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditDetails(task);
                }}
                className="px-2.5 py-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-neutral-600 dark:text-neutral-300 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold bg-black/[0.03] dark:bg-white/[0.05]"
                title="Edit Full Task Details"
              >
                <Pencil size={13} className="text-[#2B4887] dark:text-[#3B82F6]" />
                <span className="hidden sm:inline">Edit Details</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Close dialog"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Form Layout with Scrollable Form Body and Pinned Sticky Footer */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs scrollbar-thin">
            {/* Section 1: Execution Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                    Status & Progression
                  </h4>
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">State Machine</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <Clock size={14} className="text-neutral-500 dark:text-neutral-400" />
                  <span>Update Status</span>
                  <span className="text-rose-500 font-medium text-sm leading-none ml-0.5">*</span>
                </label>
                <AppleDropdown
                  items={statusOptions}
                  value={status}
                  onChange={(id) => setStatus(id as TaskStatus)}
                  fullWidth
                  matchTriggerWidth
                  size="form"
                  hideHeader
                  placeholder="Select status..."
                />
                {status === "DONE" && task.verification_needed && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium mt-2 flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Requires manager verification: status will move to AWAITING VERIFICATION upon submission.</span>
                  </p>
                )}
              </div>
            </div>

            {/* Section 2: Deliverables & Evidence */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                    Deliverables & Verification Evidence
                  </h4>
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">Proof & Notes</span>
              </div>

              {/* Progress Notes */}
              <div>
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <FileText size={14} className="text-neutral-500 dark:text-neutral-400" />
                  <span>Progress Notes / Submission Remarks</span>
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide a summary of completed deliverables or updates..."
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-medium resize-y min-h-[64px]"
                />
              </div>

              {/* Deliverables Upload with compact dropzone */}
              <div>
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <Upload size={14} className="text-[#2B4887] dark:text-[#3B82F6]" />
                  <span>Proof of Work Deliverable (Cloudinary Upload)</span>
                </label>
                <FileUploadDropzone
                  taskId={task.id}
                  orgId={task.org_id}
                  uploadedBy={task.delegatee_id}
                  onUploadSuccess={handleUploadSuccess}
                  compact={true}
                />
              </div>

              {/* Existing Deliverables */}
              {attachments.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Attached Proofs ({attachments.length})</span>
                  </label>
                  <AttachmentViewer attachments={attachments} />
                </div>
              )}
            </div>
          </div>

          {/* Pinned Sticky Footer - ALWAYS 100% visible, never cut off */}
          <div className="shrink-0 px-5 sm:px-6 py-3 sm:py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] backdrop-blur-md flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-black/[0.08] dark:border-white/[0.10] rounded-xl font-semibold text-xs text-[#111111] dark:text-white bg-white/80 dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.10] transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="apple-btn-primary py-2 px-6 text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? "Updating..." : "Commit Update"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
