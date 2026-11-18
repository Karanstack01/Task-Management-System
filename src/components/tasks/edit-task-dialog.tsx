"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Task, Profile, Department, TaskPriority, TaskStatus, TaskFrequency } from "@/types/database.types";
import { localDb } from "@/lib/data/dal";
import { getSelectableStatuses, LifecycleStatus } from "@/lib/data/task-state-machine";
import { useUIStore } from "@/lib/store/ui-store";
import {
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Users,
  Building2,
  Flame,
  Award,
  Clock,
  Loader2,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { AppleDropdown, DropdownItem } from "@/components/common/apple-dropdown";

export interface EditTaskDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskSaved: (updatedTask: Task) => void;
  onTaskDeleted?: (deletedTaskId: string) => void;
}

export function EditTaskDialog({
  task,
  isOpen,
  onClose,
  onTaskSaved,
  onTaskDeleted,
}: EditTaskDialogProps) {
  const [mounted, setMounted] = useState(false);
  const activeRole = useUIStore((s) => s.activeRole);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [delegateeId, setDelegateeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("PENDING");
  const [frequency, setFrequency] = useState<TaskFrequency>("ONE_TIME");
  const [targetDate, setTargetDate] = useState("");
  const [allocatedScore, setAllocatedScore] = useState(10);
  const [verificationNeeded, setVerificationNeeded] = useState(true);

  // Submitting states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDelegateeId(task.delegatee_id || "");
      setDepartmentId(task.department_id || "");
      setPriority(task.priority || "MEDIUM");
      setStatus(task.status || "PENDING");
      setFrequency(task.frequency || "ONE_TIME");
      setTargetDate(
        task.current_target_date ? task.current_target_date.split("T")[0] : ""
      );
      setAllocatedScore(task.allocated_score || 10);
      setVerificationNeeded(task.verification_needed ?? true);
      setShowDeleteConfirm(false);
    }
  }, [task]);

  // Load profiles and departments for dropdowns
  useEffect(() => {
    if (!task?.org_id || !isOpen) return;

    async function loadLookups() {
      setLoadingLookups(true);
      try {
        const [profs, depts] = await Promise.all([
          localDb.getProfiles(task!.org_id),
          localDb.getDepartments(task!.org_id),
        ]);
        setProfiles(profs);
        setDepartments(depts);
      } catch (err) {
        console.error("Failed to load lookups for edit dialog", err);
      } finally {
        setLoadingLookups(false);
      }
    }
    loadLookups();
  }, [task?.org_id, isOpen]);

  const handleAssigneeChange = (id: string) => {
    setDelegateeId(id);
    const chosen = profiles.find((p) => p.id === id);
    if (chosen?.department_id) {
      setDepartmentId(chosen.department_id);
    }
  };

  const assigneeOptions: DropdownItem[] = useMemo(() => {
    return profiles.map((p) => {
      const initials = p.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const dept = departments.find((d) => d.id === p.department_id);
      return {
        id: p.id,
        label: p.full_name,
        sublabel: p.email,
        badge: dept?.code || p.role.replace("_", " "),
        thumbnail: (
          <div className="w-5 h-5 rounded-full bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 flex items-center justify-center text-[9px] font-bold">
            {initials}
          </div>
        ),
      };
    });
  }, [profiles, departments]);

  const departmentOptions: DropdownItem[] = useMemo(() => {
    return [
      {
        id: "",
        label: "No Department (Unassigned)",
        sublabel: "Clear department selection",
      },
      ...departments.map((d) => ({
        id: d.id,
        label: d.name,
        sublabel: `Section Code: ${d.code || "GENERAL"}`,
        badge: d.code || undefined,
        icon: <Building2 className="w-3.5 h-3.5 text-neutral-500" />,
      })),
    ];
  }, [departments]);

  const priorityOptions: DropdownItem[] = useMemo(
    () => [
      {
        id: "CRITICAL",
        label: "Critical Priority",
        sublabel: "Immediate SLA escalation",
        badge: "Urgent",
        icon: <Flame className="w-3.5 h-3.5 text-rose-500" />,
      },
      {
        id: "HIGH",
        label: "High Priority",
        sublabel: "SLA target < 48 hours",
        badge: "High",
        icon: <Flame className="w-3.5 h-3.5 text-amber-500" />,
      },
      {
        id: "MEDIUM",
        label: "Medium Priority",
        sublabel: "Standard routine completion",
        badge: "Medium",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-blue-500" />,
      },
      {
        id: "LOW",
        label: "Low Priority",
        sublabel: "Flexible timeline buffer",
        badge: "Low",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
      },
    ],
    []
  );

  // Only statuses reachable from the task's current state are offered (task-state-machine.ts).
  const statusOptions: DropdownItem[] = useMemo(() => {
    const all: DropdownItem[] = [
      {
        id: "PENDING",
        label: task?.status === "CANCELLED" ? "Restore to Backlog" : "Not Started / Queued",
        sublabel: "Initial backlog state",
        badge: "Pending",
      },
      {
        id: "IN_PROGRESS",
        label: task?.status === "DONE" ? "Reopen for Rework" : "In Progress",
        sublabel: task?.status === "DONE" ? "Revokes the awarded score" : "Active execution by report",
        badge: "Active",
      },
      {
        id: "AWAITING_VERIFICATION",
        label: "Under Review",
        sublabel: "Submit for manager signoff (proof required)",
        badge: "Review",
      },
      {
        id: "DONE",
        label: "Completed",
        sublabel: "Direct sign-off (no verification required)",
        badge: "Done",
      },
      {
        id: "CANCELLED",
        label: "Cancelled",
        sublabel: "Withdraw the task; no score is awarded",
        badge: "Cancel",
      },
    ];
    if (!task) return all;
    const allowed = getSelectableStatuses({ ...task, verification_needed: verificationNeeded }, activeRole);
    return all.filter((o) => allowed.includes(o.id as LifecycleStatus));
  }, [task, verificationNeeded, activeRole]);

  const frequencyOptions: DropdownItem[] = useMemo(
    () => [
      {
        id: "ONE_TIME",
        label: "One-Time Deliverable",
        sublabel: "Single deliverable execution",
        badge: "One-Off",
        icon: <Clock className="w-3.5 h-3.5 text-neutral-500" />,
      },
      {
        id: "DAILY",
        label: "Daily SLA Commitment",
        sublabel: "Recurs every working business day",
        badge: "Daily",
        icon: <Calendar className="w-3.5 h-3.5 text-neutral-500" />,
      },
      {
        id: "WEEKLY",
        label: "Weekly Sprint Target",
        sublabel: "Every Monday morning cycle",
        badge: "Weekly",
        icon: <Calendar className="w-3.5 h-3.5 text-neutral-500" />,
      },
      {
        id: "MONTHLY",
        label: "Monthly Deliverable",
        sublabel: "End-of-month review cycle",
        badge: "Monthly",
        icon: <Calendar className="w-3.5 h-3.5 text-neutral-500" />,
      },
    ],
    []
  );

  if (!isOpen || !mounted || !task) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notify.error("Title Required", { description: "Please enter a title for the task." });
      return;
    }
    if (!targetDate) {
      notify.error("Target Date Required", { description: "Please specify a target completion date." });
      return;
    }

    setSaving(true);
    try {
      let updated = await localDb.updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        delegatee_id: delegateeId || task.delegatee_id,
        department_id: departmentId || null,
        priority,
        frequency,
        current_target_date: targetDate,
        allocated_score: Number(allocatedScore) || 10,
        verification_needed: verificationNeeded,
      });

      // Status changes go through the lifecycle state machine (guards, scoring, proof checks).
      if (updated && status !== task.status) {
        updated = await localDb.updateTaskStatus(task.id, status, {
          actorRole: activeRole,
          knownAttachments: task.attachments,
        });
      }

      if (updated) {
        notify.success("Task Details Updated", {
          description: `Task #${task.task_no} was successfully updated.`,
        });
        onTaskSaved(updated);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update task";
      notify.error("Update Failed", { description: msg });
      // Details may have saved before a refused status change; refresh the caller's copy.
      const fresh = await localDb.getTaskById(task.id);
      if (fresh) onTaskSaved({ ...fresh, attachments: task.attachments });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const success = await localDb.deleteTask(task.id);
      if (success) {
        notify.success("Task Deleted", {
          description: `Task #${task.task_no} has been permanently deleted.`,
        });
        onTaskDeleted?.(task.id);
        onClose();
      } else {
        notify.error("Delete Failed", { description: "Task not found." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete task";
      notify.error("Delete Failed", { description: msg });
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-md transition-opacity"
        onClick={() => {
          if (!saving && !deleting) onClose();
        }}
      />

      {/* Main Dialog Container */}
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-[#111111] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col border border-black/10 dark:border-white/10 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Pinned Header */}
        <div className="p-5 sm:p-6 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] text-[#111111] dark:text-white flex items-center justify-center shadow-xs">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-[#111111] dark:text-white tracking-tight leading-tight">
                  Edit Task Details
                </h2>
                <span className="px-2 py-0.5 rounded-lg bg-[#111111]/10 dark:bg-brand/20 text-[#111111] dark:text-brand font-medium text-xs tracking-tight">
                  #{task.task_no}
                </span>
              </div>
              <p className="text-xs font-medium text-[#666666] dark:text-neutral-400 mt-0.5">
                Modify commitment scope, assignee, timeline, and SLA rules
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="edit-task-form" onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Delete Confirmation Banner (When active) */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <span className="font-extrabold">Permanently delete Task #{task.task_no}?</span>
                  <p className="text-[11px] font-medium text-rose-700/80 dark:text-rose-300/70 mt-0.5">
                    This will remove the task, all activity logs, and attached deliverables.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-black/40 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Task Core Information */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  General Information & Deliverables
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Core Scope</span>
            </div>

            {/* Task Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                <FileText className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Task Title</span>
                <span className="text-rose-500 font-medium text-sm leading-none ml-0.5">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Supabase Schema Migration & Audit"
                className="w-full h-10 px-3.5 rounded-xl apple-input text-xs font-medium text-[#111111] dark:text-white placeholder:text-neutral-400 outline-none transition-all"
              />
            </div>

            {/* Task Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                <FileText className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Description & Detailed Deliverables</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide explicit completion criteria, guidelines, and context..."
                className="w-full p-3 rounded-xl apple-input text-xs font-medium text-[#111111] dark:text-white placeholder:text-neutral-400 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Section 2: Assignment & Department Scope */}
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  Assignment & Department Scope
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Direct Reports</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assignee (Delegatee) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                  <Users className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Assigned Delegatee (Direct Report)</span>
                  <span className="text-rose-500 font-medium text-sm leading-none ml-0.5">*</span>
                </label>
                <AppleDropdown
                  items={assigneeOptions}
                  value={delegateeId}
                  onChange={handleAssigneeChange}
                  fullWidth
                  matchTriggerWidth
                  size="form"
                  hideHeader
                  showSearch
                  placeholder="Select delegatee..."
                />
              </div>

              {/* Department / Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                    <Building2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                    <span>Department / Section</span>
                  </label>
                </div>
                <AppleDropdown
                  items={departmentOptions}
                  value={departmentId}
                  onChange={(id) => setDepartmentId(id)}
                  fullWidth
                  matchTriggerWidth
                  size="form"
                  hideHeader
                  placeholder="Select department..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Priority & Status */}
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  Priority & Execution Status
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">State Machine</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                  <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Priority Level</span>
                </label>
                <AppleDropdown
                  items={priorityOptions}
                  value={priority}
                  onChange={(id) => setPriority(id as TaskPriority)}
                  fullWidth
                  matchTriggerWidth
                  size="form"
                  hideHeader
                  placeholder="Select priority..."
                />
              </div>

              {/* Current Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                  <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Task Status</span>
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
              </div>
            </div>
          </div>

          {/* Section 4: Target Date & Frequency */}
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  Timeline & Recurrence Cadence
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Cadence</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target Due Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Target Due Date</span>
                  <span className="text-rose-500 font-medium text-sm leading-none ml-0.5">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl apple-input text-xs font-medium text-[#111111] dark:text-white outline-none cursor-pointer"
                />
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                  <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Commitment Frequency</span>
                </label>
                <AppleDropdown
                  items={frequencyOptions}
                  value={frequency}
                  onChange={(id) => setFrequency(id as TaskFrequency)}
                  fullWidth
                  matchTriggerWidth
                  size="form"
                  hideHeader
                  placeholder="Select frequency..."
                />
              </div>
            </div>
          </div>

          {/* Section 5: Score Points & Verification Required */}
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  SLA Score Weight & Proof Verification
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Governance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Allocated Score */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                  <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>SLA Score Weight (Points)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={allocatedScore}
                  onChange={(e) => setAllocatedScore(Number(e.target.value))}
                  className="w-full h-10 px-3.5 rounded-xl apple-input text-xs font-medium text-[#111111] dark:text-white outline-none"
                />
              </div>

              {/* Verification Guard Toggle */}
              <div className="p-3 rounded-xl glass-well flex items-center justify-between gap-3 border border-black/[0.06] dark:border-white/[0.08] mt-4 sm:mt-0">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                    <ShieldCheck className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                    <span>Require Deliverable Proof</span>
                  </span>
                  <p className="text-[11px] font-medium text-[#666666] dark:text-neutral-400">
                    Must upload proof of work deliverable before completing
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={verificationNeeded}
                  onChange={(e) => setVerificationNeeded(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#111111] dark:accent-white cursor-pointer"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Pinned Footer with Delete & Save options */}
        <div className="p-4 sm:p-5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-xl">
          {/* Delete Option (Triggers Confirm) */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>

          {/* Action Buttons: Cancel & Save */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#111111] dark:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-task-form"
              disabled={saving || deleting}
              className="apple-btn-primary px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default EditTaskDialog;

