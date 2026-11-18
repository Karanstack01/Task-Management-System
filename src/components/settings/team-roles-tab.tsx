"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Users, Plus, X, Mail, Shield, Check, Search } from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { localDb } from "@/lib/data/dal";
import { useActiveOrgId } from "@/lib/hooks/use-active-org";
import type { Department, UserRole } from "@/types/database.types";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
  initials: string;
  status: "active" | "invited";
}

export function TeamRolesTab() {
  const orgId = useActiveOrgId();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [search, setSearch] = useState("");

  // Invite state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DELEGATEE");
  const [inviteDept, setInviteDept] = useState("");

  const refresh = useCallback(async () => {
    if (!orgId) return;
    const [profiles, depts] = await Promise.all([localDb.getProfiles(orgId), localDb.getDepartments(orgId)]);
    setDepartments(depts);
    setMembers(
      profiles.map((p) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        role: p.role,
        department: depts.find((d) => d.id === p.department_id)?.name ?? "—",
        avatarUrl: p.avatar_url || undefined,
        initials: p.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
        status: p.is_active ? "active" : "invited",
      }))
    );
  }, [orgId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    const result = await localDb.createProfile({
      fullName: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole as UserRole,
      orgId,
      departmentId: inviteDept || undefined,
    });
    if (!result.profile) {
      notify.error("Could not add member", { description: result.error });
      return;
    }

    setShowInviteModal(false);
    setInviteName("");
    setInviteEmail("");
    await refresh();
    notify.success("Member added", {
      description: `${result.profile.email} can now sign in with Google, Microsoft or their password.`,
    });
  };
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A3A3A3]">
          Settings / Team & Roles
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Team & roles
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A3A3A3] mt-1 max-w-xl">
              Manage organization teammates, hierarchical permissions, and department access.
            </p>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] text-white shadow-md transition-all self-start cursor-pointer"
          >
            <Plus size={14} className="text-brand" />
            <span>Invite member</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="apple-card p-3 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, department..."
            className="w-full pl-8 pr-3 py-1.5 text-xs apple-input"
          />
        </div>

        <span className="text-xs font-semibold text-[#666666] dark:text-[#A3A3A3]">
          {members.length} team members
        </span>
      </div>

      {/* Team Table */}
      <div className="apple-card p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Member</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Role</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {m.avatarUrl ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-slate-200 dark:ring-white/10">
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                          {m.initials}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                        <p className="text-[11px] text-slate-400">{m.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 text-slate-600 dark:text-[#EEEEEE] font-medium">
                    {m.department}
                  </td>

                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        m.role === "COMPANY_ADMIN" || m.role === "BOSS"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : m.role === "DELEGATOR"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                      }`}
                    >
                      {m.role.replace("_", " ")}
                    </span>
                  </td>

                  <td className="py-3 text-right">
                    {m.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check size={12} /> Active
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        Invite Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/20 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Invite team member
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A3A3A3] mt-0.5">
                  Grant workspace access and assign a CTMS operational role.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  required
                  className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@stackdrove.com"
                  required
                  className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="DELEGATEE">Delegatee</option>
                    <option value="DELEGATOR">Delegator (Manager)</option>
                    <option value="BOSS">Executive (Boss)</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Department
                  </label>
                  <select
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="">No department</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] text-white shadow-md"
                >
                  Send invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
