"use client";

import React, { useState, useEffect } from "react";
import {
  Crown,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Power,
  Globe,
  Users,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { localDb } from "@/lib/data/dal";
import { Organization } from "@/types/database.types";
import { getOrgAccessState } from "@/lib/data/org-lifecycle";
import { toast } from "sonner";

export default function SuperadminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // New Org Form State
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPlan, setFormPlan] = useState<Organization["subscription_plan"]>("PROFESSIONAL");
  const [formUsers, setFormUsers] = useState(50);
  const [formDays, setFormDays] = useState(365);

  const fetchOrgs = async () => {
    setLoading(true);
    const data = await localDb.getOrganizations();
    setOrganizations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  // Handle Master Kill Switch Toggle
  const handleToggleKillSwitch = async (org: Organization) => {
    const newSuspendedState = !org.is_suspended;

    const updated = await localDb.toggleOrganizationKillSwitch(
      org.id,
      newSuspendedState,
      newSuspendedState ? "Suspended by Superadmin platform control" : undefined
    );

    if (updated) {
      if (newSuspendedState) {
        toast.error(`Kill Switch Activated: '${org.name}' is now SUSPENDED.`, {
          description: "All tenant users are locked out and will be redirected to /saas-expired.",
        });
      } else {
        const access = getOrgAccessState(updated);
        if (access.canAccess) {
          toast.success(`Access Restored: '${org.name}' is now ${access.status}.`, {
            description: "Tenant members can log in and access CTMS normally.",
          });
        } else {
          toast.warning(`Kill switch lifted, but '${org.name}' is ${access.status}.`, {
            description: access.reason || "Tenant still cannot sign in until billing is resolved.",
          });
        }
      }
      fetchOrgs();
    }
  };

  // Handle Tenant Provisioning
  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSlug || !formDomain || !formContact) {
      toast.error("Please fill in all required tenant details.");
      return;
    }

    const domains = formDomain
      .split(",")
      .map((d) => d.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean);

    await localDb.provisionOrganization({
      name: formName,
      slug: formSlug,
      allowed_domains: domains,
      primary_contact_email: formContact,
      subscription_plan: formPlan,
      max_users: Number(formUsers),
      days_valid: Number(formDays),
    });

    toast.success(`Organization '${formName}' provisioned successfully!`, {
      description: `Whitelisted domains: ${domains.join(", ")}`,
    });

    setShowModal(false);
    setFormName("");
    setFormSlug("");
    setFormDomain("");
    setFormContact("");
    fetchOrgs();
  };

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()) ||
      o.allowed_domains.some((d) => d.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCount = organizations.filter((o) => getOrgAccessState(o).canAccess).length;
  const suspendedCount = organizations.filter((o) => o.is_suspended).length;
  const totalSeats = organizations.reduce((acc, o) => acc + o.max_users, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="apple-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold mb-2">
            <Crown size={13} className="text-[#666666] dark:text-slate-400" />
            <span>Platform Owner Control Plane</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111] dark:text-white">
            Superadmin Licensing &amp; Tenant Master
          </h1>
          <p className="text-[#666666] dark:text-slate-400 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
            Provision corporate domains, manage enterprise subscription quotas, and trigger
            the remote platform kill switch.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] inline-flex items-center gap-2 font-semibold text-xs px-5 py-2.5 rounded-full shadow-xs transition-all hover:scale-[1.01] active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <Plus size={15} />
          <span>Provision New Tenant</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#666666] dark:text-slate-400 uppercase tracking-wider">
              Total Tenants
            </span>
            <Building2 size={18} className="text-[#666666]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#111111] dark:text-white">
              {organizations.length}
            </span>
            <p className="text-[11px] text-[#666666] mt-1 font-medium">Managed client organizations</p>
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#666666] dark:text-slate-400 uppercase tracking-wider">
              Active Subscriptions
            </span>
            <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#111111] dark:text-white">
              {activeCount}
            </span>
            <p className="text-[11px] text-[#666666] mt-1 font-medium">Healthy active licenses</p>
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#666666] dark:text-slate-400 uppercase tracking-wider">
              Kill Switch / Suspended
            </span>
            <ShieldAlert size={18} className="text-rose-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {suspendedCount}
            </span>
            <p className="text-[11px] text-[#666666] mt-1 font-medium">Locked out or expired</p>
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#666666] dark:text-slate-400 uppercase tracking-wider">
              Total User Seats
            </span>
            <Users size={18} className="text-[#666666]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#111111] dark:text-white">
              {totalSeats}
            </span>
            <p className="text-[11px] text-[#666666] mt-1 font-medium">Licensed seats across all orgs</p>
          </div>
        </div>
      </div>

      {/* Tenants Table & Search */}
      <div className="apple-card overflow-hidden">
        <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by organization or domain..."
              className="w-full pl-9 pr-4 py-2 text-xs apple-input rounded-full placeholder:text-[#666666]"
            />
          </div>
          <button
            onClick={fetchOrgs}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#111111] dark:text-white hover:text-black dark:hover:text-white px-3.5 py-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#666666]">Loading tenants...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/[0.02] dark:bg-white/[0.02] text-[#666666] uppercase font-semibold tracking-wider text-[11px] border-b border-black/[0.06] dark:border-white/[0.08]">
                <tr>
                  <th className="px-4 py-3.5">Organization</th>
                  <th className="px-4 py-3.5">Whitelisted Domains</th>
                  <th className="px-4 py-3.5">Plan Tier</th>
                  <th className="px-4 py-3.5">Max Seats</th>
                  <th className="px-4 py-3.5">Expires At</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Master Kill Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06] font-medium">
                {filteredOrgs.map((org) => {
                  const isSusp = org.is_suspended;
                  const access = getOrgAccessState(org);
                  return (
                    <tr
                      key={org.id}
                      className={
                        isSusp
                          ? "bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/50"
                          : "hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                      }
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#111111] dark:text-white text-xs">{org.name}</div>
                        <div className="text-[10px] text-[#666666]">/{org.slug}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {org.allowed_domains.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.08] text-[10px] font-medium"
                            >
                              <Globe size={10} className="text-[#666666]" />
                              <span>@{d}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#111111] dark:text-white">
                        {org.subscription_plan}
                      </td>
                      <td className="px-4 py-3.5 text-[#111111] dark:text-white">
                        {org.max_users} Users
                      </td>
                      <td className="px-4 py-3.5 text-[#666666]">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          <span>
                            {org.subscription_expires_at
                              ? new Date(org.subscription_expires_at).toLocaleDateString()
                              : "Perpetual"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {!access.canAccess ? (
                          <span
                            title={access.reason || undefined}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                          >
                            <AlertTriangle size={11} />
                            <span>{access.status.replace("_", " ")}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                            <ShieldCheck size={11} />
                            <span>{access.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleToggleKillSwitch(org)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all shadow-xs ${
                            isSusp
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-rose-600 hover:bg-rose-700 text-white"
                          }`}
                        >
                          <Power size={12} />
                          <span>{isSusp ? "Reactivate" : "Kill Switch"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision New Tenant Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-card max-w-lg w-full p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#111111] dark:text-white flex items-center justify-center">
                  <Crown size={17} />
                </div>
                <h3 className="font-bold text-base text-[#111111] dark:text-white">
                  Provision Client Organization
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#666666] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-sm font-bold transition-colors cursor-pointer"
                title="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleProvision} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#111111] dark:text-slate-200 block mb-1">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formSlug) {
                      setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                    }
                  }}
                  placeholder="e.g. Acme Global Logistics"
                  className="w-full px-3.5 py-2.5 apple-input"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111111] dark:text-slate-200 block mb-1">
                  Subdomain Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="e.g. acme"
                  className="w-full px-3.5 py-2.5 apple-input"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111111] dark:text-slate-200 block mb-1">
                  Whitelisted Corporate Domains (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  placeholder="e.g. acmeglobal.com, acme.co"
                  className="w-full px-3.5 py-2.5 apple-input"
                />
                <span className="text-[11px] text-[#666666] font-medium mt-1 block">
                  Only users registering with these email domains will be allowed access.
                </span>
              </div>

              <div>
                <label className="font-semibold text-[#111111] dark:text-slate-200 block mb-1">
                  Primary Company Admin Email *
                </label>
                <input
                  type="email"
                  required
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  placeholder="e.g. admin@acmeglobal.com"
                  className="w-full px-3.5 py-2.5 apple-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111111] dark:text-slate-200 block mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value as Organization["subscription_plan"])}
                    className="w-full px-3.5 py-2.5 apple-input"
                  >
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="CUSTOM">Custom Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#111111] dark:text-slate-200 block mb-1">
                    Max User Seats
                  </label>
                  <input
                    type="number"
                    value={formUsers}
                    onChange={(e) => setFormUsers(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 apple-input"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#111111] dark:text-slate-200 block mb-1">
                  Validity (Days)
                </label>
                <input
                  type="number"
                  value={formDays}
                  onChange={(e) => setFormDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 apple-input"
                />
              </div>

              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-full font-semibold text-xs text-[#666666] dark:text-slate-300 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary px-6 py-2 text-xs cursor-pointer shadow-xs"
                >
                  Confirm &amp; Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
