"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import { useActiveOrgId } from "@/lib/hooks/use-active-org";
import { RecurringTemplate, Profile, TaskPriority, TaskFrequency } from "@/types/database.types";
import {
  Repeat,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Award,
  Sparkles,
} from "lucide-react";
import {
  CustomRecurrenceModal,
  CustomRecurrenceConfig,
} from "@/components/common/custom-recurrence-modal";

export default function RecurringTemplatesPage() {
  const orgId = useActiveOrgId();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCronRunning, setIsCronRunning] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
  const [recurrenceConfig, setRecurrenceConfig] = useState<CustomRecurrenceConfig | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [delegatorId, setDelegatorId] = useState("");
  const [delegateeId, setDelegateeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("HIGH");
  const [frequency, setFrequency] = useState<TaskFrequency>("DAILY");
  const [recurDelayDays, setRecurDelayDays] = useState(1);
  const [verificationNeeded, setVerificationNeeded] = useState(true);
  const [allocatedScore, setAllocatedScore] = useState(10.0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tpls, profs] = await Promise.all([
        localDb.getRecurringTemplates(orgId),
        localDb.getProfiles(orgId),
      ]);
      setTemplates(tpls);
      setProfiles(profs);

      // Set defaults for creation modal
      const delegator = profs.find((p) => p.role === "DELEGATOR" || p.role === "COMPANY_ADMIN");
      const delegatee = profs.find((p) => p.role === "DELEGATEE");
      if (delegator) setDelegatorId(delegator.id);
      if (delegatee) setDelegateeId(delegatee.id);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(templateId: string, currentActive: boolean) {
    await localDb.updateRecurringTemplate(templateId, {
      is_active: !currentActive,
    });
    await loadData();
  }

  async function handleTriggerCron() {
    setIsCronRunning(true);
    setCronMessage(null);
    try {
      const res = await fetch("/api/cron/process", { credentials: "omit" });
      const data = await res.json();
      if (data.success) {
        setCronMessage(
          `Success: Spawned ${data.recurrence.spawnedCount} recurring tasks! Due reminders: ${data.reminders.tasksDueToday}`
        );
        await loadData();
      } else {
        setCronMessage(`Cron execution warning: ${data.error || "Execution failed"}`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Cron trigger failed";
      setCronMessage(`Trigger failed: ${errorMsg}`);
    } finally {
      setIsCronRunning(false);
    }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !delegatorId || !delegateeId) return;

    setSubmitting(true);
    try {
      const delegator = profiles.find((p) => p.id === delegatorId);
      await localDb.createRecurringTemplate({
        orgId,
        title,
        description: description.trim() || undefined,
        delegatorId,
        delegateeId,
        departmentId: delegator?.department_id || undefined,
        priority,
        frequency,
        recurDelayDays: Number(recurDelayDays),
        verificationNeeded,
        allocatedScore: Number(allocatedScore),
      });

      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      await loadData();
    } finally {
      setSubmitting(false);
    }
  }

  const getProfileName = (id: string) => {
    return profiles.find((p) => p.id === id)?.full_name || id;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="apple-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <Repeat className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
              Recurring Master Templates
            </h1>
          </div>
          <p className="text-xs text-[#666666] dark:text-neutral-400 pl-14">
            Automate periodic operational tasks with holiday-skipping SLA calculations & cron scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTriggerCron}
            disabled={isCronRunning}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#111111] dark:text-white font-medium text-xs transition-colors disabled:opacity-60 shadow-2xs"
          >
            <Play className={`w-3.5 h-3.5 ${isCronRunning ? "animate-spin text-neutral-400" : "text-neutral-500"}`} />
            {isCronRunning ? "Processing Workers..." : "Execute Cron Job"}
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary inline-flex items-center gap-2 text-xs font-semibold py-2.5 px-4"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Cron Execution Banner */}
      {cronMessage && (
        <div className="p-4 rounded-2xl apple-card bg-emerald-500/10 border-emerald-500/20 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{cronMessage}</span>
          </div>
          <button
            onClick={() => setCronMessage(null)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Master Templates List */}
      <div className="apple-card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span className="font-bold text-sm text-[#111111] dark:text-white">Configured Schedules</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] font-semibold text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.08]">
              {templates.length}
            </span>
          </div>
          <span className="text-xs text-[#666666] dark:text-neutral-400 font-normal">
            Auto-spawns at 00:00 or via pg_cron triggers
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-neutral-400 dark:text-neutral-500 font-medium text-xs">Loading recurring schedules...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Clock className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
            <p className="text-[#111111] dark:text-white font-bold text-sm">No recurring templates created yet</p>
            <p className="text-xs text-[#666666] dark:text-neutral-400">
              Click &quot;New Template&quot; above to setup daily, weekly, or monthly scheduled jobs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#666666] dark:text-neutral-400">
              <thead className="bg-black/[0.02] dark:bg-white/[0.03] text-[11px] font-semibold text-[#666666] dark:text-neutral-400 uppercase tracking-wider border-b border-black/[0.05] dark:border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Schedule</th>
                  <th className="px-6 py-3.5">Task Title</th>
                  <th className="px-6 py-3.5">Assigner & Assignee</th>
                  <th className="px-6 py-3.5">Target Offset</th>
                  <th className="px-6 py-3.5">Score & Verify</th>
                  <th className="px-6 py-3.5">Last Spawned</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05] font-medium text-xs">
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-white/10">
                        {tpl.frequency}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#111111] dark:text-white">{tpl.title}</div>
                      {tpl.description && (
                        <div className="text-xs text-[#666666] dark:text-neutral-400 line-clamp-1 max-w-sm mt-0.5 font-normal">
                          {tpl.description}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs space-y-1">
                      <div className="text-[#666666] dark:text-neutral-300">
                        <span className="text-neutral-400 dark:text-neutral-500">From: </span>
                        <span className="font-semibold text-[#111111] dark:text-white">{getProfileName(tpl.delegator_id)}</span>
                      </div>
                      <div className="text-[#666666] dark:text-neutral-300">
                        <span className="text-neutral-400 dark:text-neutral-500">To: </span>
                        <span className="font-semibold text-[#111111] dark:text-white">{getProfileName(tpl.delegatee_id)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-[#666666] dark:text-neutral-300">
                      <span className="font-semibold text-[#111111] dark:text-white">+{tpl.recur_delay_days} days</span>
                      <div className="text-[11px] text-neutral-400 font-normal">skips weekends & holidays</div>
                    </td>

                    <td className="px-6 py-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-[#111111] dark:text-white font-bold">
                        <Award className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{tpl.allocated_score} pts</span>
                      </div>
                      {tpl.verification_needed ? (
                        <div className="flex items-center gap-1 text-[11px] text-[#111111] dark:text-neutral-300 font-medium">
                          <ShieldCheck className="w-3 h-3 text-neutral-400" />
                          <span>Verification Required</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-neutral-400 font-normal">Auto-complete allowed</div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-[#666666] dark:text-neutral-400">
                      {tpl.last_spawned_at ? (
                        new Date(tpl.last_spawned_at).toLocaleDateString()
                      ) : (
                        <span className="text-neutral-400 italic">Never</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggle(tpl.id, tpl.is_active)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      >
                        {tpl.is_active ? (
                          <>
                            <span className="text-[#111111] dark:text-white">Active</span>
                            <ToggleRight className="w-6 h-6 text-[#111111] dark:text-white" />
                          </>
                        ) : (
                          <>
                            <span className="text-neutral-400">Paused</span>
                            <ToggleLeft className="w-6 h-6 text-neutral-300 dark:text-neutral-600" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-card max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center">
                  <Repeat className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#111111] dark:text-white">New Recurring Master Schedule</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#111111] dark:text-white mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Daily Inventory Reconciliation"
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] dark:text-white mb-1">
                  Brief Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide standard instructions for recurring assignees..."
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] dark:text-white mb-1">
                    Assigned By (Delegator)
                  </label>
                  <select
                    value={delegatorId}
                    onChange={(e) => setDelegatorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-medium"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id} className="dark:bg-[#111111] dark:text-white">
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] dark:text-white mb-1">
                    Assigned To (Delegatee)
                  </label>
                  <select
                    value={delegateeId}
                    onChange={(e) => setDelegateeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-medium"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id} className="dark:bg-[#111111] dark:text-white">
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#111111] dark:text-white">
                      Frequency
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsRecurrenceModalOpen(true)}
                      className="text-[10px] font-semibold text-brand dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {recurrenceConfig ? "Edit" : "Custom"}
                    </button>
                  </div>
                  <select
                    value={frequency}
                    onChange={(e) => {
                      const val = e.target.value as TaskFrequency;
                      setFrequency(val);
                      if (val === "CUSTOM_INTERVAL" || val === "DAILY" || val === "WEEKLY" || val === "MONTHLY") {
                        setIsRecurrenceModalOpen(true);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-medium"
                  >
                    <option value="DAILY" className="dark:bg-[#111111] dark:text-white">DAILY</option>
                    <option value="WEEKLY" className="dark:bg-[#111111] dark:text-white">WEEKLY</option>
                    <option value="MONTHLY" className="dark:bg-[#111111] dark:text-white">MONTHLY</option>
                    <option value="CUSTOM_INTERVAL" className="dark:bg-[#111111] dark:text-white">CUSTOM INTERVAL</option>
                  </select>
                  {recurrenceConfig && (
                    <div className="text-[10px] font-medium text-brand dark:text-blue-400 truncate mt-1">
                      {recurrenceConfig.summaryText}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] dark:text-white mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-medium"
                  >
                    <option value="LOW" className="dark:bg-[#111111] dark:text-white">LOW</option>
                    <option value="MEDIUM" className="dark:bg-[#111111] dark:text-white">MEDIUM</option>
                    <option value="HIGH" className="dark:bg-[#111111] dark:text-white">HIGH</option>
                    <option value="CRITICAL" className="dark:bg-[#111111] dark:text-white">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] dark:text-white mb-1">
                    Target Offset
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={recurDelayDays}
                    onChange={(e) => setRecurDelayDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-neutral-400" />
                  <div>
                    <div className="text-xs font-semibold text-[#111111] dark:text-white">Require Manager Verification</div>
                    <div className="text-[11px] text-[#666666] dark:text-neutral-400">Require proof deliverable before done</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={verificationNeeded}
                  onChange={(e) => setVerificationNeeded(e.target.checked)}
                  className="w-4 h-4 accent-[#111111] dark:accent-white rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="apple-btn-primary py-2 px-5 text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Recurrence Modal */}
      <CustomRecurrenceModal
        isOpen={isRecurrenceModalOpen}
        onClose={() => setIsRecurrenceModalOpen(false)}
        initialConfig={recurrenceConfig || undefined}
        onSave={(cfg) => {
          setRecurrenceConfig(cfg);
          setFrequency("CUSTOM_INTERVAL");
          const recurDays =
            cfg.unit === "day"
              ? cfg.repeatEvery
              : cfg.unit === "week"
              ? cfg.repeatEvery * 7
              : cfg.unit === "month"
              ? cfg.repeatEvery * 30
              : cfg.repeatEvery * 365;
          setRecurDelayDays(recurDays);
        }}
      />
    </div>
  );
}
