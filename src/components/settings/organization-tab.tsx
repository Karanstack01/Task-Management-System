"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Save,
  Globe,
  Mail,
} from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { localDb } from "@/lib/data/dal";
import { useActiveOrgId } from "@/lib/hooks/use-active-org";

export function OrganizationTab() {
  const orgId = useActiveOrgId();
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    localDb.getOrganizationById(orgId).then((org) => {
      if (!org) return;
      setOrgName(org.name);
      setSlug(org.slug);
      setWebsiteUrl(org.website_url || "");
      setPrimaryContact(org.primary_contact_email || "");
      setAllowedDomains(org.allowed_domains.join(", "));
    });
  }, [orgId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      notify.error("No company selected", { description: "Create or pick a company first." });
      return;
    }
    setSaving(true);
    try {
      const saved = await localDb.updateOrganization(orgId, {
        name: orgName.trim(),
        slug: slug.trim(),
        website_url: websiteUrl.trim(),
        primary_contact_email: primaryContact.trim(),
        allowed_domains: allowedDomains.split(",").map((d) => d.trim().replace(/^@/, "").toLowerCase()).filter(Boolean),
      });
      if (!saved) {
        notify.error("Could not save", { description: "This company no longer exists." });
        return;
      }
      setOrgName(saved.name);
      setSlug(saved.slug);
      setAllowedDomains(saved.allowed_domains.join(", "));
      notify.success("Organization Profile Saved", {
        description: "Corporate workspace details updated.",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6 w-full">
      {!orgId && (
        <div className="apple-card p-5 text-xs text-[#666666] dark:text-[#A3A3A3]">
          No company is selected yet. Create one in the Superadmin hub, then pick it from &quot;Managing company&quot;.
        </div>
      )}
      {/* ------------------------------------------------------------------- */}
      {/* 1. Header & Title (Clean Apple macOS style)                          */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="text-[11px] font-semibold text-[#666666] dark:text-[#A3A3A3] tracking-tight uppercase">
            SETTINGS / ORGANIZATION
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-white">
              Organization profile
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Enterprise Tenant</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#666666] dark:text-[#A3A3A3] mt-1">
            Corporate identity, tenant settings, and allowed authentication email domains.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Compact General Information View (Matches exact UI screenshot)    */}
      {/* ------------------------------------------------------------------- */}
      <form onSubmit={handleSave} className="apple-card p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#111111] dark:text-white">
              <Building2 size={16} />
            </div>
            <h2 className="text-sm font-semibold text-[#111111] dark:text-white">
              General Information
            </h2>
          </div>
          <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[#666666] dark:text-slate-300">
            Tenant ID: {orgId || "â€”"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-semibold text-[#111111] dark:text-slate-200">
              Company / Organization Name *
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="w-full mt-1.5 px-3.5 py-2.5 text-xs apple-input"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111111] dark:text-slate-200">
              Subdomain Slug *
            </label>
            <div className="flex mt-1.5">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-black/[0.08] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.04] text-[#666666] text-xs">
                app.ctms.io/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs apple-input rounded-l-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111111] dark:text-slate-200">
              Company Website URL
            </label>
            <div className="relative mt-1.5">
              <Globe size={14} className="absolute left-3.5 top-3 text-[#666666]" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs apple-input"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111111] dark:text-slate-200">
              Primary Contact Email *
            </label>
            <div className="relative mt-1.5">
              <Mail size={14} className="absolute left-3.5 top-3 text-[#666666]" />
              <input
                type="email"
                value={primaryContact}
                onChange={(e) => setPrimaryContact(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2.5 text-xs apple-input"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[#111111] dark:text-slate-200">
              Whitelisted Corporate Domains (comma-separated) *
            </label>
            <input
              type="text"
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
              required
              placeholder="acme.com, stackdrove.com"
              className="w-full mt-1.5 px-3.5 py-2.5 text-xs apple-input font-mono"
            />
            <p className="text-[11px] text-[#666666] dark:text-[#A3A3A3] mt-1.5">
              Only users registering with these verified domain emails can join your organization.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl cursor-pointer shadow-xs transition-all active:scale-95"
          >
            <Save size={13} />
            <span>{saving ? "Saving changes..." : "Save changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

