"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/data/dal";
import {
  Organization,
  Profile,
  SystemSettings,
  UserRole,
} from "@/types/database.types";
import {
  Building2,
  ShieldCheck,
  UserPlus,
  Key,
  Mail,
  MessageSquare,
  Cloud,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  AlertCircle,
  ExternalLink,
  Users,
  Settings,
  ChevronRight,
} from "lucide-react";

export default function CompanyAdminPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "admins" | "integrations">("overview");

  // Admin Appointment State
  const [selectedUserId, setSelectedUserId] = useState("");
  const [appointing, setAppointing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Settings form state
  const [savingSettings, setSavingSettings] = useState(false);
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [emailProvider, setEmailProvider] = useState<"MICROSOFT_365" | "GOOGLE">("MICROSOFT_365");
  const [googleUser, setGoogleUser] = useState("");
  const [googleAppPassword, setGoogleAppPassword] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [cloudinaryName, setCloudinaryName] = useState("");
  const [cloudinaryKey, setCloudinaryKey] = useState("");
  const [cloudinarySecret, setCloudinarySecret] = useState("");

  const orgId = "org-sd-01";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [o, s, p] = await Promise.all([
        localDb.getOrganizationById(orgId),
        localDb.getSystemSettings(orgId),
        localDb.getProfiles(orgId),
      ]);
      setOrg(o);
      setSettings(s);
      setProfiles(p);

      if (s) {
        setWaPhoneId(s.wa_official_phone_id || "");
        setWaToken(s.wa_official_api_token || "");
        setEmailProvider(s.email_provider || "MICROSOFT_365");
        setGoogleUser(s.google_smtp_user || "");
        setGoogleAppPassword(s.google_smtp_app_password || "");
        setSmtpUser(s.smtp_user || "");
        setSmtpPassword(s.smtp_app_password || "");
        setCloudinaryName(s.cloudinary_cloud_name || "");
        setCloudinaryKey(s.cloudinary_api_key || "");
        setCloudinarySecret(s.cloudinary_api_secret || "");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppointAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setAppointing(true);
    setActionMessage(null);
    try {
      const updated = await localDb.updateProfileRole(selectedUserId, "ADMIN");
      if (updated) {
        setActionMessage(`Granted delegated Admin rights to ${updated.full_name}.`);
        setSelectedUserId("");
        await loadData();
      }
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Role change failed.");
    } finally {
      setAppointing(false);
    }
  }

  async function handleRevokeAdmin(userId: string) {
    try {
      const updated = await localDb.updateProfileRole(userId, "DELEGATOR");
      if (updated) {
        setActionMessage(`Revoked Admin rights from ${updated.full_name}. Restored to Delegator.`);
        await loadData();
      }
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Role change failed.");
    }
  }

  async function handleSaveIntegrations(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await localDb.updateSystemSettings(orgId, {
        wa_official_phone_id: waPhoneId,
        wa_official_api_token: waToken,
        email_provider: emailProvider,
        google_smtp_user: googleUser,
        google_smtp_app_password: googleAppPassword,
        smtp_user: smtpUser,
        smtp_app_password: smtpPassword,
        cloudinary_cloud_name: cloudinaryName,
        cloudinary_api_key: cloudinaryKey,
        cloudinary_api_secret: cloudinarySecret,
      });
      setActionMessage("Enterprise integration credentials successfully updated.");
      await loadData();
    } finally {
      setSavingSettings(false);
    }
  }

  const delegatedAdmins = profiles.filter((p) => p.role === "ADMIN");
  const nonAdmins = profiles.filter(
    (p) => p.role !== "ADMIN" && p.role !== "COMPANY_ADMIN" && p.role !== "SUPERADMIN"
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="apple-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
                Company Admin Command Center
              </h1>
              <p className="text-xs text-[#666666] dark:text-neutral-400">
                {org?.name || "Organization"} &bull; Primary Organization Head & Master Tenant
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#111111] dark:text-white text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08]">
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>{org?.subscription_plan} Plan Active</span>
          </span>
        </div>
      </div>

      {/* Action feedback */}
      {actionMessage && (
        <div className="p-4 rounded-2xl apple-card bg-emerald-500/10 border-emerald-500/20 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "overview"
              ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
              : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
          }`}
        >
          Overview & Subscription
        </button>
        <button
          onClick={() => setActiveTab("admins")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "admins"
              ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
              : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
          }`}
        >
          Delegated Admins ({delegatedAdmins.length})
        </button>
        <button
          onClick={() => setActiveTab("integrations")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === "integrations"
              ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
              : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
          }`}
        >
          Master Integrations
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Organization Health */}
            <div className="apple-card p-6 space-y-4">
              <h3 className="font-bold text-[#111111] dark:text-white text-base">Organization Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#666666] dark:text-neutral-400 font-medium">Allowed Domains</span>
                  <div className="font-bold text-[#111111] dark:text-white text-sm mt-0.5">
                    {org?.allowed_domains.join(", ") || "stackdrove.com"}
                  </div>
                </div>
                <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#666666] dark:text-neutral-400 font-medium">Total Seats</span>
                  <div className="font-bold text-[#111111] dark:text-white text-sm mt-0.5">
                    {profiles.length} / {org?.max_users || 50} Allocated
                  </div>
                </div>
                <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#666666] dark:text-neutral-400 font-medium">License Expiration</span>
                  <div className="font-bold text-[#111111] dark:text-white text-sm mt-0.5">
                    {org?.subscription_expires_at
                      ? new Date(org.subscription_expires_at).toLocaleDateString()
                      : "Active"}
                  </div>
                </div>
              </div>

              <div className="pt-2 text-xs text-[#666666] dark:text-neutral-400">
                <span className="font-semibold text-[#111111] dark:text-white">Primary Contact: </span>
                {org?.primary_contact_email} &bull; Managed directly via Superadmin licensing.
              </div>
            </div>

            {/* Onboarding Checklist */}
            <div className="apple-card p-6 space-y-4">
              <h3 className="font-bold text-[#111111] dark:text-white text-base">Onboarding & Setup Checklist</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium">
                    Corporate email domain whitelisted by Superadmin (@stackdrove.com)
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium">
                    Operational departments configured (Technology, Operations, Finance, Sales)
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.06] text-[#666666] dark:text-neutral-300">
                  <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="font-medium">
                    Connect official Meta WhatsApp Phone ID & Cloudinary API keys
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-6">
            <div className="apple-card p-6 space-y-4">
              <h3 className="font-bold text-[#111111] dark:text-white text-sm">Quick Governance Links</h3>
              <div className="space-y-2.5 text-xs">
                <a
                  href="/admin"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] font-medium text-[#111111] dark:text-white transition-all group"
                >
                  <span>Admin Operations Console</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                </a>
                <a
                  href="/settings"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] font-medium text-[#111111] dark:text-white transition-all group"
                >
                  <span>System Settings & Permissions</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                </a>
                <a
                  href="/recurring"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] font-medium text-[#111111] dark:text-white transition-all group"
                >
                  <span>Recurring Master Tasks</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Delegated Admins */}
      {activeTab === "admins" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="apple-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#111111] dark:text-white text-base">Appointed Delegated Admins</h3>
                <span className="text-xs text-[#666666] dark:text-neutral-400">
                  Authorized to manage users, SLA, and datasets on your behalf
                </span>
              </div>

              {delegatedAdmins.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                  No operational admins appointed yet. Appoint one using the form on the right.
                </div>
              ) : (
                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                  {delegatedAdmins.map((adm) => (
                    <div
                      key={adm.id}
                      className="py-3.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white font-bold flex items-center justify-center">
                          {adm.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-[#111111] dark:text-white">{adm.full_name}</div>
                          <div className="text-[#666666] dark:text-neutral-400 text-[11px]">{adm.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 font-medium text-[11px] border border-neutral-200/60 dark:border-white/10">
                          OPERATIONAL ADMIN
                        </span>
                        <button
                          onClick={() => handleRevokeAdmin(adm.id)}
                          className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          Revoke Rights
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Appoint Admin Form */}
          <div>
            <div className="apple-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#111111] dark:text-white text-sm">Appoint New Admin</h3>
              </div>
              <p className="text-xs text-[#666666] dark:text-neutral-400 font-normal">
                Select an existing team member from your organization to grant operational Admin rights.
              </p>

              <form onSubmit={handleAppointAdmin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#111111] dark:text-white mb-1">
                    Select Team Member
                  </label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2.5 apple-input rounded-xl text-xs font-medium"
                  >
                    <option value="">-- Choose employee --</option>
                    {nonAdmins.map((u) => (
                      <option key={u.id} value={u.id} className="dark:bg-[#111115] dark:text-white">
                        {u.full_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={appointing || !selectedUserId}
                  className="apple-btn-primary w-full py-2.5 text-xs font-semibold disabled:opacity-50"
                >
                  {appointing ? "Appointing..." : "Grant Admin Rights"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Master Integrations */}
      {activeTab === "integrations" && (
        <div className="apple-card p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="font-bold text-[#111111] dark:text-white text-base">Master Enterprise Integrations</h3>
            <p className="text-xs text-[#666666] dark:text-neutral-400 mt-0.5">
              Configure tenant-wide credentials for proof-of-work cloud storage, corporate email dispatch, and WhatsApp notifications.
            </p>
          </div>

          <form onSubmit={handleSaveIntegrations} className="space-y-5 text-xs">
            {/* WhatsApp API Section */}
            <div className="p-4.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] space-y-3 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 font-semibold text-[#111111] dark:text-white">
                <MessageSquare className="w-4 h-4 text-neutral-400" />
                <span>Official Meta WhatsApp Cloud API v20.0</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">
                    WhatsApp Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={waPhoneId}
                    onChange={(e) => setWaPhoneId(e.target.value)}
                    placeholder="e.g. 109823471029384"
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">
                    Meta Permanent System Token
                  </label>
                  <input
                    type="password"
                    value={waToken}
                    onChange={(e) => setWaToken(e.target.value)}
                    placeholder="EAAB..."
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Cloudinary Section */}
            <div className="p-4.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] space-y-3 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-[#111111] dark:text-white">
                  <Cloud className="w-4 h-4 text-neutral-400" />
                  <span>Cloudinary Media Storage</span>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-[#111111] dark:text-white border border-neutral-200/60 dark:border-white/10">
                  Zero DB Blobs
                </span>
              </div>
              <p className="text-[11px] text-[#666666] dark:text-neutral-400 font-normal">
                Direct tenant cloud storage. All deliverables stream directly to Cloudinary — database strictly saves URL metadata references.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">Cloud Name</label>
                  <input
                    type="text"
                    value={cloudinaryName}
                    onChange={(e) => setCloudinaryName(e.target.value)}
                    placeholder="stackdrove-cloud"
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">API Key</label>
                  <input
                    type="text"
                    value={cloudinaryKey}
                    onChange={(e) => setCloudinaryKey(e.target.value)}
                    placeholder="873491823749182"
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">API Secret</label>
                  <input
                    type="password"
                    value={cloudinarySecret}
                    onChange={(e) => setCloudinarySecret(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Primary Email Provider Selector */}
            <div className="p-4 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#111111] dark:text-white block">Primary Email Dispatch Service</span>
                <span className="text-[11px] text-[#666666] dark:text-neutral-400">Choose between Google Workspace or Microsoft 365</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEmailProvider("GOOGLE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    emailProvider === "GOOGLE"
                      ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
                      : "border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white bg-white/60 dark:bg-white/[0.04]"
                  }`}
                >
                  Google Workspace
                </button>
                <button
                  type="button"
                  onClick={() => setEmailProvider("MICROSOFT_365")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    emailProvider === "MICROSOFT_365"
                      ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
                      : "border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white bg-white/60 dark:bg-white/[0.04]"
                  }`}
                >
                  Microsoft 365
                </button>
              </div>
            </div>

            {/* Google Workspace Email Section */}
            <div className="p-4.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] space-y-3 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-[#111111] dark:text-white">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <span>Google Workspace / Gmail Integration</span>
                </div>
                {emailProvider === "GOOGLE" && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                    PRIMARY ACTIVE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">
                    Google Email ID
                  </label>
                  <input
                    type="email"
                    value={googleUser}
                    onChange={(e) => setGoogleUser(e.target.value)}
                    placeholder="notifications@yourcompany.com"
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">
                    Google App Password (16-chars)
                  </label>
                  <input
                    type="password"
                    value={googleAppPassword}
                    onChange={(e) => setGoogleAppPassword(e.target.value)}
                    placeholder="•••• •••• •••• ••••"
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Microsoft 365 Section */}
            <div className="p-4.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] space-y-3 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-[#111111] dark:text-white">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <span>Microsoft 365 SMTP Relay</span>
                </div>
                {emailProvider === "MICROSOFT_365" && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                    PRIMARY ACTIVE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">
                    Microsoft Sender Email
                  </label>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="notifications@stackdrove.com"
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#666666] dark:text-neutral-400 mb-1 font-medium">
                    Microsoft App Password
                  </label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="apple-btn-primary py-2.5 px-6 text-xs font-semibold disabled:opacity-50"
              >
                {savingSettings ? "Saving Settings..." : "Save Master Integrations"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
