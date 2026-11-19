"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Calendar,
  User,
  Users,
  Building,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  FileText,
  Flame,
  Clock,
  Award,
  ShieldCheck,
  Repeat,
} from "lucide-react";
import { localDb } from "@/lib/data/dal";
import { useActiveOrgId } from "@/lib/hooks/use-active-org";
import { Profile, Department, TaskPriority, TaskFrequency } from "@/types/database.types";
import { generateShortUrl } from "@/lib/whatsapp/shortener";
import { sendTaskAssignedAlertAction } from "@/app/actions/notification-actions";
import { toast } from "sonner";
import Link from "next/link";
import { AppleDateTimePicker } from "@/components/common/apple-date-time-picker";
import { AppleDropdown, DropdownItem } from "@/components/common/apple-dropdown";
import {
  CustomRecurrenceModal,
  CustomRecurrenceConfig,
} from "@/components/common/custom-recurrence-modal";

export default function CreateTaskPage() {
  const orgId = useActiveOrgId();
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [delegatorId, setDelegatorId] = useState("");
  const [delegateeId, setDelegateeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("HIGH");
  const [targetDate, setTargetDate] = useState("");
  const [targetTime, setTargetTime] = useState("18:00");
  const [frequency, setFrequency] = useState<TaskFrequency>("ONE_TIME");
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
  const [recurrenceConfig, setRecurrenceConfig] = useState<CustomRecurrenceConfig | null>(null);
  const [verificationNeeded, setVerificationNeeded] = useState(true);
  const [allocatedScore, setAllocatedScore] = useState(10.0);
  const [isDeptAutoPicked, setIsDeptAutoPicked] = useState(false);

  useEffect(() => {
    async function loadData() {
      const p = await localDb.getProfiles(orgId);
      const d = await localDb.getDepartments(orgId);
      setProfiles(p);
      setDepartments(d);

      // Default delegator to manager / admin
      const defaultDelegator = p.find((u) => u.role === "DELEGATOR" || u.role === "COMPANY_ADMIN");
      if (defaultDelegator) setDelegatorId(defaultDelegator.id);

      // Default delegatee to first assignee
      const defaultDelegatee = p.find((u) => u.role === "DELEGATEE") || p[0];
      if (defaultDelegatee) {
        setDelegateeId(defaultDelegatee.id);
        if (defaultDelegatee.department_id) {
          setDepartmentId(defaultDelegatee.department_id);
          setIsDeptAutoPicked(true);
        }
      }

      // Default target date to 3 days from now
      const d3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setTargetDate(d3);

      setLoading(false);
    }
    loadData();
  }, []);

  // When assignee is changed, automatically pick their assigned department
  const handleAssigneeChange = (selectedId: string) => {
    setDelegateeId(selectedId);
    const chosenAssignee = profiles.find((p) => p.id === selectedId);
    if (chosenAssignee?.department_id) {
      setDepartmentId(chosenAssignee.department_id);
      setIsDeptAutoPicked(true);
      const matchedDept = departments.find((d) => d.id === chosenAssignee.department_id);
      if (matchedDept) {
        toast.info(`Department auto-picked: ${matchedDept.name} (${matchedDept.code})`, {
          duration: 2500,
        });
      }
    }
  };

  const handleDepartmentChange = (deptId: string) => {
    setDepartmentId(deptId);
    setIsDeptAutoPicked(false);
  };

  // Dropdown options
  const assignerOptions: DropdownItem[] = useMemo(() => {
    return profiles.map((p) => {
      const initials = p.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return {
        id: p.id,
        label: p.full_name,
        sublabel: p.email,
        badge: p.role.replace("_", " "),
        thumbnail: (
          <div className="w-5 h-5 rounded-full bg-[#111111] dark:bg-white dark:text-[#111111] text-white flex items-center justify-center text-[9px] font-bold">
            {initials}
          </div>
        ),
      };
    });
  }, [profiles]);

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
    return departments.map((d) => ({
      id: d.id,
      label: d.name,
      sublabel: `Section Code: ${d.code || "GENERAL"}`,
      badge: d.code || undefined,
      icon: <Building size={14} className="text-neutral-500 dark:text-neutral-400" />,
    }));
  }, [departments]);

  const priorityOptions: DropdownItem[] = useMemo(
    () => [
      {
        id: "CRITICAL",
        label: "Critical Priority",
        sublabel: "Immediate SLA / Escalation",
        badge: "Urgent",
        icon: <Flame size={14} className="text-rose-500" />,
      },
      {
        id: "HIGH",
        label: "High Priority",
        sublabel: "SLA target < 48 hours",
        badge: "High",
        icon: <Flame size={14} className="text-amber-500" />,
      },
      {
        id: "MEDIUM",
        label: "Medium Priority",
        sublabel: "Standard routine completion",
        badge: "Medium",
        icon: <AlertCircle size={14} className="text-blue-500" />,
      },
      {
        id: "LOW",
        label: "Low Priority",
        sublabel: "Flexible timeline buffer",
        badge: "Low",
        icon: <CheckCircle2 size={14} className="text-emerald-500" />,
      },
    ],
    []
  );

  const handleFrequencyChange = (id: string) => {
    if (id === "CUSTOM_INTERVAL" || id === "DAILY" || id === "WEEKLY" || id === "MONTHLY") {
      const unitMap: Record<string, "day" | "week" | "month" | "year"> = {
        DAILY: "day",
        WEEKLY: "week",
        MONTHLY: "month",
        CUSTOM_INTERVAL: recurrenceConfig?.unit || "week",
      };
      const targetUnit = unitMap[id] || "week";

      if (!recurrenceConfig) {
        const initialDay = targetDate ? new Date(targetDate + "T00:00:00").getDay() : new Date().getDay();
        setRecurrenceConfig({
          repeatEvery: 1,
          unit: targetUnit,
          repeatOnDays: [isNaN(initialDay) ? 1 : initialDay],
          startDate: targetDate || new Date().toISOString().split("T")[0],
          endType: "never",
          summaryText: targetUnit === "day" ? "Daily" : targetUnit === "week" ? "Weekly" : "Monthly",
        });
      } else {
        setRecurrenceConfig((prev) => (prev ? { ...prev, unit: targetUnit } : null));
      }

      setFrequency(id as TaskFrequency);
      setIsRecurrenceModalOpen(true);
    } else {
      setFrequency("ONE_TIME");
      setRecurrenceConfig(null);
    }
  };

  const frequencyOptions: DropdownItem[] = useMemo(
    () => [
      {
        id: "ONE_TIME",
        label: "One-Time Task",
        sublabel: "Single deliverable execution (no repeat)",
        badge: "One-Off",
        icon: <Clock size={14} className="text-neutral-500 dark:text-neutral-400" />,
      },
      {
        id: "CUSTOM_INTERVAL",
        label: recurrenceConfig ? recurrenceConfig.summaryText : "Custom Recurrence...",
        sublabel: "Configure daily, weekly, monthly, or yearly cadence",
        badge: "Custom",
        icon: <Repeat size={14} className="text-brand dark:text-blue-400" />,
      },
      {
        id: "DAILY",
        label: "Daily Routine",
        sublabel: "Recurs every 1 day",
        badge: "Daily",
        icon: <Calendar size={14} className="text-neutral-500 dark:text-neutral-400" />,
      },
      {
        id: "WEEKLY",
        label: "Weekly Routine",
        sublabel: "Recurs every 1 week on chosen days",
        badge: "Weekly",
        icon: <Calendar size={14} className="text-neutral-500 dark:text-neutral-400" />,
      },
      {
        id: "MONTHLY",
        label: "Monthly Audit",
        sublabel: "Recurs monthly on specific day",
        badge: "Monthly",
        icon: <Calendar size={14} className="text-neutral-500 dark:text-neutral-400" />,
      },
    ],
    [recurrenceConfig]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !delegatorId || !delegateeId || !targetDate) {
      toast.error("Please complete all required task parameters.");
      return;
    }

    setSubmitting(true);
    try {
      const timeVal = targetTime && targetTime.includes(":") ? targetTime : "18:00";
      const targetIso = new Date(`${targetDate}T${timeVal}:00Z`).toISOString();

      // 1. Insert into Database
      const newTask = await localDb.createTask({
        orgId: orgId,
        title,
        description: recurrenceConfig
          ? `${description || ""}\n[Recurrence Schedule: ${recurrenceConfig.summaryText}]`.trim()
          : description,
        delegatorId,
        delegateeId,
        departmentId: departmentId || undefined,
        priority,
        initialTargetDate: targetIso,
        frequency,
        verificationNeeded,
        allocatedScore: Number(allocatedScore),
      });

      // 1b. If recurring, register Recurring Template so background cron automates it
      if (recurrenceConfig && frequency !== "ONE_TIME") {
        const recurDays =
          recurrenceConfig.unit === "day"
            ? recurrenceConfig.repeatEvery
            : recurrenceConfig.unit === "week"
            ? recurrenceConfig.repeatEvery * 7
            : recurrenceConfig.unit === "month"
            ? recurrenceConfig.repeatEvery * 30
            : recurrenceConfig.repeatEvery * 365;

        const templateFreq: TaskFrequency =
          recurrenceConfig.unit === "day"
            ? "DAILY"
            : recurrenceConfig.unit === "week"
            ? "WEEKLY"
            : recurrenceConfig.unit === "month"
            ? "MONTHLY"
            : "CUSTOM_INTERVAL";

        await localDb.createRecurringTemplate({
          orgId: orgId,
          title,
          description: description || undefined,
          delegatorId,
          delegateeId,
          departmentId: departmentId || undefined,
          priority,
          frequency: templateFreq,
          recurDelayDays: recurDays,
          verificationNeeded,
          allocatedScore: Number(allocatedScore),
        });
      }

      // 2. Generate Dynamic Short Link
      const longUrl = `${window.location.origin}/delegatee?task=${newTask.task_no}`;
      const shortLink = await generateShortUrl(longUrl);
      newTask.short_link = shortLink;

      const delegatee = profiles.find((p) => p.id === delegateeId);
      const delegator = profiles.find((p) => p.id === delegatorId);

      // 3. Dispatch Multi-Channel Notifications via Server Action
      const alerts = await sendTaskAssignedAlertAction({
        orgId: orgId,
        recipientEmail: delegatee?.email,
        recipientPhone: delegatee?.phone_number,
        recipientName: delegatee?.full_name || "Assignee",
        taskNo: newTask.task_no,
        title: newTask.title,
        delegatorName: delegator?.full_name || "Manager",
        priority: newTask.priority,
        dueDate: newTask.current_target_date,
        shortLink,
      });

      if (alerts.failures.length > 0) {
        toast.warning(`Task #${newTask.task_no} created, but a notification failed`, {
          description: alerts.failures.join(" • "),
        });
      } else {
        toast.success(`Task #${newTask.task_no} Delegated Successfully!`, {
          description: `Notifications dispatched to ${delegatee?.full_name || "Assignee"}.`,
        });
      }

      router.push("/delegator");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Creation failed";
      toast.error("Failed to create task", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-neutral-500 font-medium">Loading form parameters...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/delegator"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to Delegator Hub</span>
        </Link>
        <div className="text-[11px] font-medium text-neutral-400">
          CTMS Form Engine v2.0
        </div>
      </div>

      {/* Main Form Card Container */}
      <div className="apple-card p-6 md:p-8 rounded-2xl">
        {/* Form Card Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-black/[0.06] dark:border-white/[0.08] mb-6">
          <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center shadow-2xs shrink-0">
            <PlusCircle size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#111111] dark:text-white tracking-tight">
              Create & Delegate New Task
            </h1>
            <p className="text-xs font-normal text-[#666666] dark:text-neutral-400 mt-0.5">
              Assign deliverables, configure SLA deadlines, and trigger multi-channel alerts.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section 1: Core Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  Task Deliverable & Instructions
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Core Scope</span>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                <FileText size={14} className="text-neutral-500 dark:text-neutral-400" />
                <span>Task Title / Deliverable Summary</span>
                <span className="text-rose-500 font-medium text-sm leading-none ml-0.5">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual IT Security Compliance & Penetration Testing Audit"
                className="w-full h-10 px-3.5 apple-input rounded-xl text-xs font-normal text-[#111111] dark:text-white placeholder:text-neutral-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                <FileText size={14} className="text-neutral-500 dark:text-neutral-400" />
                <span>Detailed Deliverable Brief & Execution Instructions</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify required documentation, deliverable file formats, acceptance criteria..."
                className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-normal text-[#111111] dark:text-white placeholder:text-neutral-400 resize-y min-h-[76px]"
              />
            </div>
          </div>

          {/* Section 2: Roles & Direct Reports */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  Assignment & Team Scope
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Direct Reports</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <User size={14} className="text-neutral-500 dark:text-neutral-400" />
                  <span>Delegated By (Assigner)</span>
                  <span className="text-rose-500 font-medium text-sm leading-none ml-0.5">*</span>
                </label>
                <AppleDropdown
                  items={assignerOptions}
                  value={delegatorId}
                  onChange={(id) => setDelegatorId(id)}
                  fullWidth
                  matchTriggerWidth
                  size="form"
                  hideHeader
                  showSearch
                  placeholder="Select assigner..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <Users size={14} className="text-neutral-500 dark:text-neutral-400" />
                  <span>Assignee (Direct Report)</span>
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
                  placeholder="Select direct report..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Priority & Department */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  Department, Priority & Frequency
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Classification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                    <Building size={14} className="text-neutral-500 dark:text-neutral-400" />
                    <span>Department / Section</span>
                  </label>
                  {isDeptAutoPicked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-in fade-in">
                      <CheckCircle2 size={10} />
                      Auto-picked
                    </span>
                  )}
                </div>
                <AppleDropdown
                  items={departmentOptions}
                  value={departmentId}
                  onChange={handleDepartmentChange}
                  fullWidth
                  matchTriggerWidth
                  size="form"
                  hideHeader
                  placeholder="Select department..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                  <Flame size={14} className="text-amber-500 dark:text-amber-400" />
                  <span>Priority Tier</span>
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

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight">
                    <Clock size={14} className="text-neutral-500 dark:text-neutral-400" />
                    <span>Recurrence Frequency</span>
                  </label>
                  {recurrenceConfig && frequency !== "ONE_TIME" && (
                    <button
                      type="button"
                      onClick={() => setIsRecurrenceModalOpen(true)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/10 text-brand dark:text-blue-400 hover:bg-brand/20 transition-colors cursor-pointer"
                    >
                      <Repeat size={10} />
                      <span>Edit Rule</span>
                    </button>
                  )}
                </div>
                <AppleDropdown
                  items={frequencyOptions}
                  value={frequency}
                  onChange={handleFrequencyChange}
                  fullWidth
                  matchTriggerWidth
                  size="form"
                  hideHeader
                  placeholder="Select recurrence..."
                />
                {recurrenceConfig && frequency !== "ONE_TIME" && (
                  <div className="mt-1.5 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-[11px] text-brand dark:text-blue-400 animate-in fade-in">
                    <div className="flex items-center gap-1.5 truncate">
                      <Repeat size={12} className="shrink-0" />
                      <span className="truncate font-medium">{recurrenceConfig.summaryText}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecurrenceModalOpen(true)}
                      className="ml-2 underline text-[10px] font-semibold hover:text-[#666666] dark:hover:text-blue-300 transition-colors cursor-pointer shrink-0"
                    >
                      Configure
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Target Date & SLA Score */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#111111] dark:text-white">
                  Timeline & SLA Scoring
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Compliance Target</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Apple-grade Interactive Date & Time Picker */}
              <div>
                <AppleDateTimePicker
                  label="Target Due Date and SLA Cutoff Time"
                  required
                  date={targetDate}
                  time={targetTime}
                  onDateChange={setTargetDate}
                  onTimeChange={setTargetTime}
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-semibold text-[#111111] dark:text-white flex items-center gap-1.5 tracking-tight block mb-1.5">
                    <Award size={14} className="text-amber-500 dark:text-amber-400" />
                    <span>SLA Score Weight (Points)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    value={allocatedScore}
                    onChange={(e) => setAllocatedScore(Number(e.target.value))}
                    className="w-full h-10 px-3.5 apple-input rounded-xl text-xs font-semibold text-[#111111] dark:text-white"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                    Standard enterprise SLA baseline is 10.0 points. Daily delay deductions will decrement this score by 20% per business day past cutoff.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05] space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#111111] dark:text-white">
                    <Clock size={13} className="text-neutral-500" />
                    <span>Cutoff Window</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Deliverable must be submitted by {targetTime || '18:00'} UTC on {targetDate ? new Date(targetDate + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'target date'} for 100% on-time SLA verification credit.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Governance Checkbox */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] flex items-start gap-3">
            <input
              type="checkbox"
              id="verification_needed"
              checked={verificationNeeded}
              onChange={(e) => setVerificationNeeded(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#111111] dark:accent-white rounded cursor-pointer"
            />
            <div>
              <label htmlFor="verification_needed" className="font-semibold text-xs text-[#111111] dark:text-white cursor-pointer flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-neutral-700 dark:text-neutral-300" />
                <span>Require Manager Verification on Completion</span>
              </label>
              <p className="text-[11px] text-[#666666] dark:text-neutral-400 mt-0.5 leading-relaxed font-normal">
                When checked, assignee cannot mark task complete directly. Submission will require
                proof of work upload and manager approval in the Verification Portal.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-black/[0.05] dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-[#666666] dark:text-neutral-400 font-medium">
              <Sparkles size={14} className="text-neutral-400" />
              <span>Automated Email & WhatsApp alert triggers are active.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Link
                href="/delegator"
                className="px-4 py-2 border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] rounded-xl font-medium text-xs text-[#111111] dark:text-white bg-white/60 dark:bg-white/[0.04] transition-colors shadow-2xs"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="apple-btn-primary inline-flex items-center gap-2 text-xs font-semibold py-2 px-5 disabled:opacity-50"
              >
                <span>{submitting ? "Delegating..." : "Delegate Task"}</span>
                <CheckCircle2 size={15} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Custom Recurrence Modal matching uploaded spec */}
      <CustomRecurrenceModal
        isOpen={isRecurrenceModalOpen}
        onClose={() => setIsRecurrenceModalOpen(false)}
        initialConfig={recurrenceConfig || undefined}
        initialStartDate={targetDate}
        onSave={(cfg) => {
          setRecurrenceConfig(cfg);
          setFrequency("CUSTOM_INTERVAL");
          toast.success("Recurrence Schedule Configured", {
            description: cfg.summaryText,
          });
        }}
      />
    </div>
  );
}
