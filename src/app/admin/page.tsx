"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import {
  Profile,
  Department,
  Task,
  HolidayCalendarItem,
  UserRole,
} from "@/types/database.types";
import {
  Users,
  Building,
  Calendar,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Sparkles,
  ExternalLink,
  Clock,
  Award,
} from "lucide-react";
import { TableSkeleton } from "@/components/common/skeleton-loaders";
import { notify } from "@/lib/notifications/toast-service";

export default function AdminConsolePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [holidays, setHolidays] = useState<HolidayCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "departments" | "tasks" | "holidays">("users");

  // User modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("DELEGATEE");
  const [departmentId, setDepartmentId] = useState("");
  const [userError, setUserError] = useState<string | null>(null);

  // Department modal
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

  // Holiday modal
  const [isAddHolOpen, setIsAddHolOpen] = useState(false);
  const [holName, setHolName] = useState("");
  const [holDate, setHolDate] = useState("");

  // Status feedback
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const orgId = "org-sd-01";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [p, d, t, h] = await Promise.all([
        localDb.getProfiles(orgId),
        localDb.getDepartments(orgId),
        localDb.getTasks({ orgId }),
        localDb.getHolidays(orgId),
      ]);
      setProfiles(p);
      setDepartments(d);
      setTasks(t);
      setHolidays(h);

      if (d.length > 0 && !departmentId) {
        setDepartmentId(d[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setUserError(null);

    const result = await localDb.createProfile({
      fullName,
      email,
      phoneNumber: phone || undefined,
      role,
      orgId,
      departmentId: departmentId || undefined,
    });

    if (result.error) {
      setUserError(result.error);
      notify.error("Onboarding Failed", { description: result.error });
      return;
    }

    notify.success("Employee Onboarded", {
      description: `${fullName} successfully onboarded under authorized corporate domain.`,
    });
    setStatusMsg(`User ${fullName} successfully onboarded under domain check.`);
    setIsAddUserOpen(false);
    setFullName("");
    setEmail("");
    setPhone("");
    await loadData();
  }

  async function handleCreateDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim()) return;

    await localDb.createDepartment({
      orgId,
      name: deptName,
      code: deptCode || undefined,
    });

    notify.success("Department Created", { description: `${deptName} added to organization structure.` });
    setStatusMsg(`Department '${deptName}' created successfully.`);
    setIsAddDeptOpen(false);
    setDeptName("");
    setDeptCode("");
    await loadData();
  }

  async function handleCreateHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!holName || !holDate) return;

    await localDb.addHoliday({
      orgId,
      holidayName: holName,
      holidayDate: holDate,
    });

    notify.success("Holiday Registered", { description: `${holName} on ${holDate}.` });
    setStatusMsg(`Holiday '${holName}' added to official calendar.`);
    setIsAddHolOpen(false);
    setHolName("");
    setHolDate("");
    await loadData();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="apple-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                Admin Operational Console
              </h1>
              <p className="text-xs text-[#666666] dark:text-neutral-400">
                Delegated Administration &bull; User Directory &bull; Departments &bull; Holidays
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#111111] dark:text-white bg-black/[0.04] dark:bg-white/[0.06] px-3.5 py-1.5 rounded-full border border-black/[0.06] dark:border-white/[0.08]">
            Acting on behalf of Company Admin
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
      {statusMsg && (
        <div className="p-4 rounded-2xl apple-card bg-emerald-500/10 border-emerald-500/20 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{statusMsg}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "users"
              ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
              : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
          }`}
        >
          User Directory ({profiles.length})
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "departments"
              ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
              : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "tasks"
              ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
              : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
          }`}
        >
          Tasks Dataset ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "holidays"
              ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
              : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
          }`}
        >
          Holiday Calendar ({holidays.length})
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <>
          {/* Tab 1: User Directory */}
          {activeTab === "users" && (
            <div className="apple-card overflow-hidden">
              <div className="p-4 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                <div className="text-sm font-bold text-[#111111] dark:text-white">Organization Employees</div>
                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="apple-btn-primary inline-flex items-center gap-1.5 text-xs font-medium py-1.5 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Employee
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#666666] dark:text-neutral-400">
                  <thead className="bg-black/[0.02] dark:bg-white/[0.03] text-[11px] font-semibold text-[#666666] dark:text-neutral-400 uppercase tracking-wider border-b border-black/[0.05] dark:border-white/[0.06]">
                    <tr>
                      <th className="px-6 py-3.5">Name & Email</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Phone</th>
                      <th className="px-6 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05] font-medium text-xs">
                    {profiles.map((p) => {
                      const dept = departments.find((d) => d.id === p.department_id);
                      return (
                        <tr key={p.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-[#111111] dark:text-white">{p.full_name}</div>
                            <div className="text-[#666666] dark:text-neutral-400 text-[11px]">{p.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-white/10 uppercase">
                              {p.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#111111] dark:text-neutral-200 font-medium">{dept?.name || "Unassigned"}</td>
                          <td className="px-6 py-4 text-[#666666] dark:text-neutral-400">{p.phone_number || "—"}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Departments */}
          {activeTab === "departments" && (
            <div className="apple-card overflow-hidden">
              <div className="p-4 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                <div className="text-sm font-bold text-[#111111] dark:text-white">Departments & Teams</div>
                <button
                  onClick={() => setIsAddDeptOpen(true)}
                  className="apple-btn-primary inline-flex items-center gap-1.5 text-xs font-medium py-1.5 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                {departments.map((d) => {
                  const count = profiles.filter((p) => p.department_id === d.id).length;
                  return (
                    <div
                      key={d.id}
                      className="p-5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] space-y-2 hover:border-black/15 dark:hover:border-white/20 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-[#111111] dark:text-white bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08]">
                          {d.code}
                        </span>
                        <span className="text-xs font-normal text-[#666666] dark:text-neutral-400">{count} Members</span>
                      </div>
                      <div className="font-bold text-[#111111] dark:text-white text-sm">{d.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Tasks Dataset */}
          {activeTab === "tasks" && (
            <div className="apple-card overflow-hidden">
              <div className="p-4 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                <div className="text-sm font-bold text-[#111111] dark:text-white">All Operational Tasks</div>
                <div className="flex items-center gap-2">
                  <a
                    href="/tasks/create"
                    className="apple-btn-primary inline-flex items-center gap-1.5 text-xs font-medium py-1.5 px-3"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Task
                  </a>
                  <a
                    href="/verify"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-xs font-medium transition-colors"
                  >
                    Verify Deliverables
                  </a>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#666666] dark:text-neutral-400">
                  <thead className="bg-black/[0.02] dark:bg-white/[0.03] text-[11px] font-semibold text-[#666666] dark:text-neutral-400 uppercase tracking-wider border-b border-black/[0.05] dark:border-white/[0.06]">
                    <tr>
                      <th className="px-6 py-3.5"># Task</th>
                      <th className="px-6 py-3.5">Title</th>
                      <th className="px-6 py-3.5">Target Date</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05] font-medium text-xs">
                    {tasks.map((t) => (
                      <tr key={t.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3 font-mono font-semibold text-[#111111] dark:text-white">
                          #{t.task_no}
                        </td>
                        <td className="px-6 py-3 font-semibold text-[#111111] dark:text-white">{t.title}</td>
                        <td className="px-6 py-3 text-[#666666] dark:text-neutral-400">
                          {new Date(t.current_target_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-800 dark:bg-white/10 dark:text-neutral-300 border border-neutral-200/60 dark:border-white/10">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-bold text-[#111111] dark:text-white">{t.actual_score} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Holidays */}
          {activeTab === "holidays" && (
            <div className="apple-card overflow-hidden">
              <div className="p-4 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                <div className="text-sm font-bold text-[#111111] dark:text-white">
                  Official Public Holidays (Skipped in SLA Deadlines)
                </div>
                <button
                  onClick={() => setIsAddHolOpen(true)}
                  className="apple-btn-primary inline-flex items-center gap-1.5 text-xs font-medium py-1.5 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Holiday
                </button>
              </div>

              <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                {holidays.map((h) => (
                  <div key={h.id} className="px-6 py-3.5 flex items-center justify-between text-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#111111] dark:text-white">{h.holiday_name}</div>
                        <div className="text-[#666666] dark:text-neutral-400">{h.holiday_date}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 font-medium text-[11px] border border-neutral-200/60 dark:border-white/10">
                      {h.holiday_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
              <h3 className="font-bold text-[#111111] dark:text-white text-base">Add Team Member</h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
              >
                &times;
              </button>
            </div>

            {userError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-200 text-xs rounded-xl font-medium">
                {userError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#111111] dark:text-white mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111111] dark:text-white mb-1">
                  Corporate Email * (Must be whitelisted domain)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vikram@stackdrove.com"
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111111] dark:text-white mb-1">
                  Phone (WhatsApp Notifications)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111111] dark:text-white mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 apple-input rounded-xl text-xs font-medium"
                  >
                    <option value="DELEGATEE" className="dark:bg-[#111115] dark:text-white">DELEGATEE</option>
                    <option value="DELEGATOR" className="dark:bg-[#111115] dark:text-white">DELEGATOR</option>
                    <option value="BOSS" className="dark:bg-[#111115] dark:text-white">BOSS</option>
                    <option value="ADMIN" className="dark:bg-[#111115] dark:text-white">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#111111] dark:text-white mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2.5 apple-input rounded-xl text-xs font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="dark:bg-[#111115] dark:text-white">
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary py-2 px-5 text-xs font-semibold"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-card max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
              <h3 className="font-bold text-[#111111] dark:text-white text-base">New Department</h3>
              <button
                onClick={() => setIsAddDeptOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#111111] dark:text-white mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Legal & Compliance"
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111111] dark:text-white mb-1">Code</label>
                <input
                  type="text"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="e.g. LEGL"
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="px-4 py-2 border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary py-2 px-5 text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {isAddHolOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-card max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
              <h3 className="font-bold text-[#111111] dark:text-white text-base">Add Public Holiday</h3>
              <button
                onClick={() => setIsAddHolOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateHoliday} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#111111] dark:text-white mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={holName}
                  onChange={(e) => setHolName(e.target.value)}
                  placeholder="e.g. New Year's Day"
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111111] dark:text-white mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={holDate}
                  onChange={(e) => setHolDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 apple-input rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddHolOpen(false)}
                  className="px-4 py-2 border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary py-2 px-5 text-xs font-semibold"
                >
                  Add Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
