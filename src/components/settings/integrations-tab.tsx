"use client";

import React, { useState } from "react";
import {
  Plug,
  Plus,
  Key,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  FileCode,
  Shield,
  Layers,
  Sparkles,
  Check,
  Building,
  Mail,
  MessageSquare,
  Cloud,
  Database,
  Bot,
} from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { IntegrationItem, ApiKeyItem } from "./settings-types";

// =============================================================================
// AUTHORIZED INTEGRATIONS (STRICTLY CONFINED TO MD SPECIFICATIONS)
// Next.js • Supabase • Cloudinary • Microsoft 365 • CEOITBOX / Meta WhatsApp • Google Workspace • AI Engine
// =============================================================================
const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "int-cloudinary",
    name: "Cloudinary CDN",
    category: "storage",
    categoryLabel: "Media & Storage CDN",
    description: "Zero-database-blob encrypted asset pipeline for task deliverables, proof-of-work documents, and secure signed URLs.",
    status: "connected",
    syncMeta: "Live • Signed Uploads",
    logo: "https://cloudinary-res.cloudinary.com/image/upload/v1574245648/cloudinary_favicon.png",
    iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
  },
  {
    id: "int-ms365",
    name: "Microsoft 365",
    category: "email_docs",
    categoryLabel: "Email & Outlook SMTP",
    description: "Office 365 SMTP relay and Graph API for executive task notices, daily reminders, and weekly digests.",
    status: "connected",
    syncMeta: "Live • Port 587 STARTTLS",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  },
  {
    id: "int-wa",
    name: "WhatsApp Cloud API & CEOITBOX",
    category: "messaging",
    categoryLabel: "Instant Alerts & Dispatch",
    description: "Official Meta Cloud API v20 and CEOITBOX Gateway for automated task assignment alerts and dynamic shortlinks.",
    status: "connected",
    syncMeta: "Live • Cloud API v20",
    logo: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
    iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  {
    id: "int-google",
    name: "Google Workspace",
    category: "email_docs",
    categoryLabel: "Email & Calendar",
    description: "Gmail transactional relay and Google Drive document archiving via Dual Email architecture.",
    status: "connected",
    syncMeta: "Live • Gmail SMTP",
    logo: "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png",
    iconBg: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  },
  {
    id: "int-supabase",
    name: "Supabase PostgreSQL",
    category: "storage",
    categoryLabel: "Database & RLS Engine",
    description: "ACID-compliant transactional database, Row Level Security (RLS), Realtime triggers, and pg_cron scheduler.",
    status: "connected",
    syncMeta: "Live • PostgreSQL 16",
    logo: "https://supabase.com/favicon/favicon-32x32.png",
    iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  {
    id: "int-ai",
    name: "AI Orchestration Engine",
    category: "messaging",
    categoryLabel: "AI Verification & SLA",
    description: "OpenAI, Claude, and Gemini Edge Functions for automated task verification, deliverable proof analysis, and SLA scoring.",
    status: "connected",
    syncMeta: "Live • Edge Functions",
    logo: "https://cdn.iconscout.com/icon/free/png-256/free-openai-logo-icon-download-in-svg-png-gif-file-formats--chat-gpt-brand-logos-pack-icons-9376997.png",
    iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
  },
];

const INITIAL_API_KEYS: ApiKeyItem[] = [
  {
    id: "key-prod-1",
    name: "Production CTMS Dispatcher",
    prefix: "sd_live_••••3f9a",
    environment: "production",
    scopes: ["tasks:read", "tasks:write", "verify:approve", "deliverables:upload"],
    lastUsed: "used 2 min ago",
    createdDate: "Oct 1, 2026",
    expiresIn: "In 90 days • Jan 1, 2027",
  },
  {
    id: "key-sand-2",
    name: "Staging Test Suite",
    prefix: "sd_test_••••81c2",
    environment: "sandbox",
    scopes: ["tasks:read", "deliverables:upload"],
    lastUsed: "used yesterday",
    createdDate: "Oct 14, 2026",
    expiresIn: "In 180 days • Apr 1, 2027",
  },
];

const AUTHORIZED_CONNECTORS = [
  {
    id: "modal-cloudinary",
    name: "Cloudinary Deliverables Pipeline",
    cat: "Storage & CDN",
    desc: "Direct browser-to-Cloudinary signed file upload pipeline for task proof deliverables.",
  },
  {
    id: "modal-m365",
    name: "Microsoft 365 SMTP Relay",
    cat: "Email Pipeline",
    desc: "Enterprise SMTP relay with port 587 STARTTLS for executive task notifications.",
  },
  {
    id: "modal-whatsapp",
    name: "CEOITBOX & WhatsApp Gateway",
    cat: "Instant Messaging",
    desc: "Official Meta Cloud API v20 webhook gateway for instant task alert dispatch.",
  },
  {
    id: "modal-google",
    name: "Google Workspace Email",
    cat: "Email Pipeline",
    desc: "Gmail SMTP relay for transactional task notices and calendar archiving.",
  },
  {
    id: "modal-supabase",
    name: "Supabase PostgreSQL Database",
    cat: "Database Engine",
    desc: "ACID-compliant transactional database with Row Level Security (RLS) isolation.",
  },
  {
    id: "modal-ai",
    name: "AI Verification & SLA Scoring",
    cat: "AI Automation",
    desc: "Automated deliverable inspection and mathematical SLA delay deduction algorithms.",
  },
];

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_API_KEYS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(false);

  // Add Integration Modal state
  const [addSearch, setAddSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  // New Key Form state
  const [newKeyName, setNewKeyName] = useState("Enterprise Webhook Gateway");
  const [newKeyExpiry, setNewKeyExpiry] = useState("90_days");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "tasks:read",
    "tasks:write",
    "deliverables:upload",
  ]);

  const connectedCount = integrations.filter((i) => i.status === "connected").length;
  const needsAttentionCount = integrations.filter((i) => i.status === "needs_attention").length;

  const handleConnectIntegration = (id: string, name: string) => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "connected", syncMeta: "Just connected" }
          : item
      )
    );
    notify.success(`${name} Verified & Connected`, {
      description: `Production endpoints validated according to official MD architecture.`,
    });
    setShowAddModal(false);
  };

  const handleReconnect = (id: string, name: string) => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "connected", syncMeta: "Refreshed just now" }
          : item
      )
    );
    notify.success(`${name} Reconnected`, {
      description: "Service credentials and API tokens successfully refreshed and verified.",
    });
  };

  const handleRotateKey = (keyId: string, keyName: string) => {
    notify.success("API Key Rotated", {
      description: `New secret token issued for ${keyName}. Previous secret remains valid for 24h grace period.`,
    });
  };

  const handleRevokeKey = (keyId: string, keyName: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    notify.info("API Key Revoked", {
      description: `Key ${keyName} has been deactivated immediately.`,
    });
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const newKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      prefix: `sd_live_••••${Math.floor(1000 + Math.random() * 9000)}`,
      environment: "production",
      scopes: selectedScopes,
      lastUsed: "just created",
      createdDate: "Today",
      expiresIn: "In 90 days • Jan 1, 2027",
    };
    setApiKeys((prev) => [newKey, ...prev]);
    setShowKeysModal(false);
    notify.success("API Key Generated", {
      description: `Secret key created with ${selectedScopes.length} scopes. Copy the key now as it won't be shown again.`,
    });
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1A6]">
          Settings / Integrations
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
              Authorized Integrations
            </h1>
            <p className="text-xs text-[#86868B] dark:text-[#A1A1A6] mt-1 max-w-xl">
              Strictly authorized systems from CTMS architecture specification: Cloudinary, Microsoft 365, WhatsApp Cloud v20, Google Workspace, Supabase, and AI verification.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start">
            <button
              onClick={() => {
                notify.info("API Docs & OpenAPI Spec", {
                  description: "Opening StackDrove Enterprise Developer Portal & Webhook guide.",
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/60 dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.1] transition-all shadow-xs cursor-pointer backdrop-blur-md"
            >
              <FileCode size={14} className="text-[#86868B]" />
              <span>API docs</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-slate-200 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus size={15} />
              <span>Connect service</span>
            </button>
          </div>
        </div>

        {/* Status Indicators Pill Bar */}
        <div className="flex items-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
            <CheckCircle2 size={12} />
            <span>{connectedCount} authorized &amp; live</span>
          </span>
          {needsAttentionCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
              <AlertTriangle size={12} />
              <span>{needsAttentionCount} needs attention</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid of Authorized Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="apple-card p-5 flex flex-col justify-between group"
          >
            <div>
              {/* Top row: Icon & Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#111111] dark:bg-white/10 text-white flex items-center justify-center font-bold text-xs shadow-xs p-2 shrink-0">
                  <Plug size={18} className="text-[#D4F20D]" />
                </div>

                {item.status === "connected" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Connected</span>
                  </span>
                )}

                {item.status === "needs_attention" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                    <AlertTriangle size={11} />
                    <span>Needs attention</span>
                  </span>
                )}

                {item.status === "available" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/[0.05] text-[#666666] dark:bg-white/10 dark:text-slate-300">
                    <span>+ Available</span>
                  </span>
                )}
              </div>

              {/* Title & Category */}
              <div className="mt-3">
                <h3 className="text-sm font-bold text-[#111111] dark:text-white leading-snug">
                  {item.name}
                </h3>
                <p className="text-[11px] font-semibold text-[#86868B] dark:text-[#A1A1A6] mt-0.5">
                  {item.categoryLabel}
                </p>
                <p className="text-xs text-[#666666] dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            {/* Bottom Row: Sync Meta & Action */}
            <div className="mt-4 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#86868B] dark:text-[#A1A1A6] font-medium">
                {item.syncMeta}
              </span>

              {item.status === "connected" && (
                <button
                  onClick={() =>
                    notify.info(`Managing ${item.name}`, {
                      description: "Configuring webhook routing and access permissions.",
                    })
                  }
                  className="text-xs font-bold text-[#111111] hover:text-[#2357D6] dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Manage
                </button>
              )}

              {item.status === "needs_attention" && (
                <button
                  onClick={() => handleReconnect(item.id, item.name)}
                  className="text-xs font-bold text-[#2357D6] dark:text-[#60A5FA] hover:underline cursor-pointer"
                >
                  Reconnect
                </button>
              )}

              {item.status === "available" && (
                <button
                  onClick={() => handleConnectIntegration(item.id, item.name)}
                  className="text-xs font-bold text-[#2357D6] dark:text-[#60A5FA] hover:underline cursor-pointer"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom API and Webhooks Banner */}
      <div className="apple-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#111111] dark:bg-white/10 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Key size={18} className="text-[#D4F20D]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#111111] dark:text-white">
              API and webhooks
            </h4>
            <p className="text-xs text-[#86868B] dark:text-[#A1A1A6]">
              Every API call is authenticated and logged with its assigned secret key.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#86868B] dark:text-[#A1A1A6] block">
              API KEYS
            </span>
            <span className="font-semibold text-[#111111] dark:text-white">
              {apiKeys.length} active • {apiKeys[0]?.prefix || "sd_live_••••3f9a"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#86868B] dark:text-[#A1A1A6] block">
              WEBHOOKS
            </span>
            <span className="font-semibold text-[#111111] dark:text-white">
              6 endpoints • 100% delivered
            </span>
          </div>

          <button
            onClick={() => setShowKeysModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-slate-200 transition-all shadow-xs cursor-pointer ml-auto sm:ml-0"
          >
            <Key size={13} />
            <span>Manage keys</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Connect Authorized Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="apple-card max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 bg-white/95 dark:bg-[#161618]/95 backdrop-blur-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#111111] dark:text-white">
                  Authorized Platform Connectors
                </h3>
                <p className="text-xs text-[#86868B] dark:text-[#A1A1A6] mt-1">
                  Connect and configure services authorized by the CTMS architecture specification.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/10 text-[#86868B] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Search authorized platform connectors..."
                className="w-full pl-10 pr-4 py-2.5 text-xs apple-input"
              />
            </div>

            {/* Integration Grid to Connect */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {AUTHORIZED_CONNECTORS.filter((item) =>
                item.name.toLowerCase().includes(addSearch.toLowerCase()) ||
                item.cat.toLowerCase().includes(addSearch.toLowerCase())
              ).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] flex items-start justify-between gap-3 hover:border-[#111111] dark:hover:border-white/30 transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-black/[0.06] dark:bg-white/10 flex items-center justify-center text-[#111111] dark:text-white shrink-0 mt-0.5 font-bold text-xs">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111111] dark:text-white">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-[#86868B] font-semibold">{item.cat}</p>
                      <p className="text-[11px] text-[#666666] dark:text-slate-300 mt-1 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnectIntegration(item.id, item.name)}
                    className="text-xs font-bold text-[#2357D6] hover:underline shrink-0 cursor-pointer"
                  >
                    Configure
                  </button>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-[#86868B]">All 6 connectors conform strictly to MD architecture</span>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl font-bold bg-[#111111] text-white dark:bg-white dark:text-[#111111] hover:bg-black transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: API Keys Management Modal */}
      {showKeysModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="apple-card max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 bg-white/95 dark:bg-[#161618]/95 backdrop-blur-2xl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#111111] dark:text-white">
                  API keys
                </h3>
                <p className="text-xs text-[#86868B] dark:text-[#A1A1A6] mt-1">
                  Keys allow external systems and webhooks to interact with StackDrove CTMS under strict role scopes.
                </p>
              </div>
              <button
                onClick={() => setShowKeysModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/10 text-[#86868B] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Active Keys List */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1A6] mb-2.5">
                Active keys
              </p>
              <div className="space-y-2.5">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111111] dark:text-white">
                          {key.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            key.environment === "production"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-black/[0.05] text-[#666666] dark:bg-white/15 dark:text-slate-300"
                          }`}
                        >
                          {key.environment === "production" ? "Read and write" : "Test data"}
                        </span>
                      </div>
                      <p className="font-mono text-[#86868B] dark:text-[#A1A1A6] mt-1 text-[11px]">
                        {key.prefix}
                      </p>
                      <p className="text-[10px] text-[#86868B] mt-0.5">
                        {key.lastUsed} • {key.expiresIn}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRotateKey(key.id, key.name)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-white/10 text-[#111111] dark:text-white border border-black/[0.08] dark:border-white/15 hover:bg-black/[0.03] transition-colors cursor-pointer"
                      >
                        Rotate
                      </button>
                      <button
                        onClick={() => handleRevokeKey(key.id, key.name)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Key Form */}
            <div className="p-4 rounded-2xl border border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] space-y-3.5">
              <p className="text-xs font-bold text-[#111111] dark:text-white">
                Generate new API key
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[#86868B] dark:text-slate-400 block mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Webhook Dispatcher"
                    className="w-full px-3 py-2 text-xs apple-input"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#86868B] dark:text-slate-400 block mb-1">
                    Expiration
                  </label>
                  <select
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-xs apple-input cursor-pointer"
                  >
                    <option value="30_days">In 30 days</option>
                    <option value="90_days">In 90 days • Jan 1, 2027</option>
                    <option value="180_days">In 180 days</option>
                    <option value="1_year">In 1 year</option>
                  </select>
                </div>
              </div>

              {/* Scopes Multi-Select */}
              <div>
                <label className="text-[11px] font-semibold text-[#86868B] dark:text-slate-400 block mb-1.5">
                  Permissions &amp; Scopes
                </label>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    "tasks:read",
                    "tasks:write",
                    "deliverables:upload",
                    "verify:approve",
                    "webhooks",
                  ].map((sc) => {
                    const active = selectedScopes.includes(sc);
                    return (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => toggleScope(sc)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111]"
                            : "bg-black/[0.05] dark:bg-white/10 text-[#666666] dark:text-slate-300"
                        }`}
                      >
                        {active && <Check size={12} className="inline mr-1 -mt-0.5" />}
                        {sc}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#86868B] mt-1.5">
                  Read-only scopes can never modify task states or trigger dispatch alerts.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#86868B]">
                A new key is shown once, then hidden forever.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKeysModal(false)}
                  className="px-4 py-2 rounded-xl font-bold bg-black/[0.05] dark:bg-white/10 text-[#111111] dark:text-white hover:bg-black/[0.1] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleCreateKey}
                  className="px-5 py-2 rounded-xl font-bold bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-slate-200 shadow-sm transition-colors cursor-pointer"
                >
                  Create key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
