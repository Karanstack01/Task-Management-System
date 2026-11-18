"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { localDb } from "@/lib/data/dal";
import { Task, Profile, TaskAttachment } from "@/types/database.types";
import { AttachmentViewer } from "@/components/common/attachment-viewer";
import { sendTaskVerifiedAlertAction } from "@/app/actions/notification-actions";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  FileCheck,
  Calendar,
  User,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Filter,
} from "lucide-react";
import { CardSkeleton } from "@/components/common/skeleton-loaders";
import { notify } from "@/lib/notifications/toast-service";
import { calculateDelayDays, calculateSlaScore } from "@/lib/data/task-utils";
import { useUIStore } from "@/lib/store/ui-store";

import { useActiveOrgId } from "@/lib/hooks/use-active-org";

export default function VerificationPortalPage() {
  const sessionUserId = useUIStore((s) => s.activeUserId);
  const activeRole = useUIStore((s) => s.activeRole);
  const orgId = useActiveOrgId();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Task for Verification Modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [remarks, setRemarks] = useState("");
  const [isOverrideEnabled, setIsOverrideEnabled] = useState(false);
  const [overrideScore, setOverrideScore] = useState<number>(10.0);
  const [processing, setProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [allTasks, profs] = await Promise.all([
        localDb.getTasks({ orgId, status: "AWAITING_VERIFICATION" }),
        localDb.getProfiles(orgId),
      ]);
      setTasks(allTasks);
      setProfiles(profs);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenVerification(task: Task) {
    setSelectedTask(task);
    setRemarks("");
    setIsOverrideEnabled(false);

    // Calculate initial preview score
    const delayDays = calculateDelayDays(task.current_target_date, task.completion_date);
    const calculated = calculateSlaScore(task.allocated_score, delayDays);
    setOverrideScore(calculated);

    // Fetch attachments for this task
    const atts = await localDb.getTaskAttachments(task.id);
    setTaskAttachments(atts);
  }

  async function handleProcessDecision(decision: "APPROVE" | "REJECT") {
    if (!selectedTask) return;
    setProcessing(true);
    setFeedbackMsg(null);

    try {
      // The reviewer is the signed-in user (falls back to the task's delegator for demo sessions).
      const delegatorId = sessionUserId || selectedTask.delegator_id;
      const scoreToAward = isOverrideEnabled ? overrideScore : undefined;

      const updated = await localDb.verifyTask(selectedTask.id, decision, {
        verifiedBy: delegatorId,
        actorRole: activeRole,
        remarks: remarks.trim() || undefined,
        overrideScore: scoreToAward,
      });

      if (updated) {
        const delegatee = profiles.find((p) => p.id === selectedTask.delegatee_id);
        const delegator = profiles.find((p) => p.id === delegatorId);

        // Notify delegatee in real-time
        if (decision === "APPROVE" && delegatee) {
          await sendTaskVerifiedAlertAction({
            orgId: selectedTask.org_id,
            delegateeEmail: delegatee.email,
            delegateePhone: delegatee.phone_number,
            delegateeName: delegatee.full_name,
            verifiedByName: delegator?.full_name || "Manager",
            taskNo: updated.task_no,
            title: updated.title,
            score: updated.actual_score,
            delayDays: updated.delay_days,
            remarks: updated.score_remarks || "Deliverable verified & accepted.",
          });
        }

        if (decision === "APPROVE") {
          notify.score(
            updated.task_no,
            updated.actual_score,
            updated.score_remarks || "Deliverable verified & awarded."
          );
        } else {
          notify.warning(`Task #${updated.task_no} Rework Requested`, {
            description: updated.score_remarks || "Deliverable returned to in progress for revisions.",
          });
        }

        setFeedbackMsg({
          type: "success",
          text: `Task #${updated.task_no} ${decision === "APPROVE" ? "approved with score " + updated.actual_score + " pts" : "rejected and returned to In Progress"}.`,
        });
        setSelectedTask(null);
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification action failed";
      notify.error("Verification Failed", { description: msg });
      setFeedbackMsg({ type: "error", text: msg });
    } finally {
      setProcessing(false);
    }
  }

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="apple-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                Deliverables Verification Portal
              </h1>
              <p className="text-xs text-[#666666] dark:text-neutral-400">
                Audit submitted proof of work, calculate mathematical SLA penalties, and award performance scores.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#111111] dark:text-white text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08]">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>{tasks.length} Pending Approval</span>
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm apple-card ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-900 dark:text-rose-200 border-rose-500/20"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-neutral-500" />
            <span className="font-medium text-xs">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tasks Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton count={3} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="apple-card p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-base font-bold text-[#111111] dark:text-white">Verification Queue Empty</h3>
          <p className="text-xs text-[#666666] dark:text-neutral-400 max-w-md mx-auto">
            All submitted tasks have been audited and scored. New submissions from assignees will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const delegatee = getProfile(task.delegatee_id);
            const isOverdue =
              task.completion_date &&
              new Date(task.completion_date).getTime() >
                new Date(task.current_target_date).getTime();

            return (
              <div
                key={task.id}
                className="apple-card p-5 transition-all flex flex-col justify-between space-y-4 hover:border-black/15 dark:hover:border-white/20 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#111111] dark:text-white bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-1 rounded-lg border border-black/[0.06] dark:border-white/[0.08]">
                      #{task.task_no}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40">
                      Awaiting Verification
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#111111] dark:text-white text-sm leading-snug line-clamp-2">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-[#666666] dark:text-neutral-400 line-clamp-2 mt-1">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl space-y-2 text-xs border border-black/[0.04] dark:border-white/[0.05]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#666666] dark:text-neutral-400">Assignee:</span>
                      <span className="font-semibold text-[#111111] dark:text-white">
                        {delegatee?.full_name || "Assignee"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#666666] dark:text-neutral-400">Target Date:</span>
                      <span className="font-medium text-[#111111] dark:text-neutral-200">
                        {new Date(task.current_target_date).toLocaleDateString()}
                      </span>
                    </div>
                    {task.completion_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#666666] dark:text-neutral-400">Submitted:</span>
                        <span className={`font-semibold ${isOverdue ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {new Date(task.completion_date).toLocaleDateString()}
                          {isOverdue && " (Late)"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111111] dark:text-white">
                    <Award className="w-4 h-4 text-neutral-400" />
                    <span>{task.allocated_score} pts pool</span>
                  </div>

                  <button
                    onClick={() => handleOpenVerification(task)}
                    className="apple-btn-primary inline-flex items-center gap-1.5 text-xs font-medium py-1.5 px-3"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Audit & Verify
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verification Audit Modal with Pinned Header, Scrollable Body & Pinned Footer */}
      {selectedTask && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Fullscreen Backdrop Barrier */}
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => setSelectedTask(null)}
          />

          {/* Modal Card */}
          <div
            className="relative z-10 apple-card max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[82vh] rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.12] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned Header */}
            <div className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shrink-0 shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white truncate">
                    Verify Deliverables — #{selectedTask.task_no}
                  </h3>
                  <p className="text-[11px] text-[#666666] dark:text-neutral-400 truncate max-w-xs sm:max-w-md">
                    {selectedTask.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                title="Close dialog"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs scrollbar-thin">
              {/* Task Details */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-[#111111] dark:text-white text-base">{selectedTask.title}</h4>
                  {selectedTask.description && (
                    <p className="text-xs text-[#666666] dark:text-neutral-400 mt-1 leading-relaxed">{selectedTask.description}</p>
                  )}
                </div>

                {/* Timeline and SLA Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-2xl border border-black/[0.04] dark:border-white/[0.05] text-xs">
                  <div>
                    <div className="text-[#666666] dark:text-neutral-400 text-[11px] font-medium">Target Deadline</div>
                    <div className="font-semibold text-[#111111] dark:text-white mt-0.5">
                      {new Date(selectedTask.current_target_date).toLocaleDateString()} 18:00
                    </div>
                  </div>
                  <div>
                    <div className="text-[#666666] dark:text-neutral-400 text-[11px] font-medium">Submitted On</div>
                    <div className="font-semibold text-[#111111] dark:text-white mt-0.5">
                      {selectedTask.completion_date
                        ? new Date(selectedTask.completion_date).toLocaleDateString()
                        : "Today"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#666666] dark:text-neutral-400 text-[11px] font-medium">Allocated Pool</div>
                    <div className="font-semibold text-[#111111] dark:text-white mt-0.5">
                      {selectedTask.allocated_score} Points
                    </div>
                  </div>
                </div>

                {/* Proof Deliverables */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-neutral-400" />
                    <span>Submitted Proof Deliverables</span>
                  </div>

                  {taskAttachments.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-black/[0.06] dark:border-white/[0.08] text-center text-xs text-neutral-400 dark:text-neutral-500">
                      No attachments uploaded. Assignee marked submission without files.
                    </div>
                  ) : (
                    <AttachmentViewer attachments={taskAttachments} />
                  )}
                </div>

                {/* Score & SLA Penalty Preview */}
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#111111] dark:text-white">Calculated SLA Score</div>
                      <div className="text-[11px] text-[#666666] dark:text-neutral-400">
                        Formula: Allocated - (20% &times; Delay Days)
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-[#111111] dark:text-white">{overrideScore}</span>
                      <span className="text-xs text-[#666666] dark:text-neutral-400 font-medium"> / {selectedTask.allocated_score}</span>
                    </div>
                  </div>

                  {/* Manual Override Option */}
                  <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOverrideEnabled}
                        onChange={(e) => setIsOverrideEnabled(e.target.checked)}
                        className="w-4 h-4 accent-[#111111] dark:accent-white rounded cursor-pointer"
                      />
                      <span className="font-medium text-[#111111] dark:text-white">Override Calculated Score</span>
                    </label>

                    {isOverrideEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#666666] dark:text-neutral-400 font-medium">New Score:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={selectedTask.allocated_score}
                          value={overrideScore}
                          onChange={(e) => setOverrideScore(Number(e.target.value))}
                          className="w-20 px-2.5 py-1 apple-input rounded-xl text-xs font-bold text-center"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks & Feedback */}
                <div>
                  <label className="block text-xs font-semibold text-[#111111] dark:text-white mb-1">
                    Manager Remarks & Feedback
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Provide constructive feedback (sent to delegatee via WhatsApp & Email)..."
                    className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs resize-y min-h-[60px]"
                  />
                </div>
              </div>
            </div>

            {/* Pinned Sticky Footer - ALWAYS 100% visible, never cut off */}
            <div className="shrink-0 px-5 sm:px-6 py-3 sm:py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] backdrop-blur-md flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.10] text-[#111111] dark:text-white bg-white/80 dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.10] text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleProcessDecision("REJECT")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Deliverables</span>
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleProcessDecision("APPROVE")}
                  className="apple-btn-primary inline-flex items-center gap-1.5 text-xs font-medium py-2 px-5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{processing ? "Recording Approval..." : "Approve & Award Score"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
