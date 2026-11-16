"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Mail, MessageSquare, Cloud } from "lucide-react";
import { ResultBox, cardCls, inputCls, labelCls, secondaryBtn } from "./integration-ui";
import {
  fetchWhatsAppTemplatesAction,
  getIntegrationSettingsAction,
  saveIntegrationSettingsAction,
  testEmailAction,
  testWhatsAppAction,
  testWhatsAppMessageAction,
  testWhatsAppTemplateAction,
  type IntegrationSettingsInput,
  type IntegrationSettingsView,
} from "@/app/actions/integration-actions";
import type { EmailTestResult } from "@/lib/email/email-service";
import type { WATestResult } from "@/lib/whatsapp/whatsapp-service";
import type { WaTemplateInfo } from "@/lib/whatsapp/ceoitbox-client";
import {
  WA_EVENTS,
  WA_EVENT_FIELDS,
  templateKey,
  type WaDataKey,
  type WaEventKey,
  type WaMessageTemplates,
  type WaTemplateMappings,
} from "@/lib/whatsapp/template-config";
import { WhatsappLibrary } from "./whatsapp-library";
import { WhatsappFlows } from "./whatsapp-flows";
import type { EmailProvider } from "@/types/database.types";
import type { SecretField } from "@/lib/integrations/settings-store";

export type IntegrationSection = "email" | "whatsapp" | "storage";
export type WhatsappTab = "connection" | "library" | "flows";

interface Props {
  orgId: string;
  /** Which integration group to show. The panel stays mounted so unsaved form values survive switching. */
  section: IntegrationSection;
  /** Which part of WhatsApp setup is open (kept in the page URL so it can be linked to). */
  whatsappTab: WhatsappTab;
  onWhatsappTabChange: (tab: WhatsappTab) => void;
  onMessage?: (message: string) => void;
  /** Called whenever the saved configuration changes, so the page can show status badges. */
  onStatusChange?: (status: IntegrationStatus) => void;
}

export interface IntegrationStatus {
  email: { configured: boolean; detail: string };
  whatsapp: { configured: boolean; detail: string; templatesMapped: number };
  storage: { configured: boolean; detail: string };
  persistence: IntegrationSettingsView["persistence"];
}

/** "Configured" = credentials are present (saved here or in server env). It does not mean a test has passed. */
export function summarizeIntegrationStatus(v: IntegrationSettingsView): IntegrationStatus {
  const g = !!(v.google.user && v.google.hasPassword) || v.envFallback.google;
  const m = !!(v.microsoft.user && v.microsoft.hasPassword) || v.envFallback.microsoft;
  const primary = v.email_provider === "GOOGLE" ? g : m;
  const primaryName = v.email_provider === "GOOGLE" ? "Google Workspace" : "Microsoft 365";

  const cbx = v.whatsapp.hasGatewayApiKey || (!!v.whatsapp.gatewayUsername && v.whatsapp.hasGatewayPassword) || v.envFallback.gateway;
  const meta = (!!v.whatsapp.metaPhoneId && v.whatsapp.hasMetaToken) || v.envFallback.meta;
  const templatesMapped = Object.keys(v.whatsapp.templates).length;

  const storage = (!!v.cloudinary.cloudName && !!v.cloudinary.apiKey && v.cloudinary.hasApiSecret) || v.envFallback.cloudinary;

  return {
    email: {
      configured: primary,
      detail: primary ? `${primaryName} active` : g || m ? `${primaryName} (primary) has no credentials` : "No email account connected",
    },
    whatsapp: {
      configured: cbx || meta,
      detail: cbx ? `CEOITBOX connected${meta ? " + Meta fallback" : ""}` : meta ? "Meta Cloud API connected" : "Not connected",
      templatesMapped,
    },
    storage: { configured: storage, detail: storage ? "Cloudinary connected" : "Not connected" },
    persistence: v.persistence,
  };
}

const SECTION_META: Record<IntegrationSection, { title: string; description: string }> = {
  email: {
    title: "Email delivery",
    description: "Connect the mailbox that sends task emails: assignments, submissions, verifications and daily reminders.",
  },
  whatsapp: {
    title: "WhatsApp notifications",
    description: "Connect your WhatsApp service and choose the approved template used for each alert.",
  },
  storage: {
    title: "File storage",
    description: "Where proof-of-work deliverables are stored. Files go straight to Cloudinary; the database keeps only the links.",
  },
};

interface FormState {
  email_provider: EmailProvider;
  google_user: string;
  google_pass: string;
  google_sender: string;
  google_host: string;
  google_port: string;
  ms_user: string;
  ms_pass: string;
  ms_sender: string;
  ms_host: string;
  ms_port: string;
  wa_phone_id: string;
  wa_token: string;
  wa_gw_url: string;
  wa_gw_user: string;
  wa_gw_pass: string;
  wa_gw_key: string;
  wa_gw_phone: string;
  wa_test_mobile: string;
  cl_name: string;
  cl_key: string;
  cl_secret: string;
  cl_preset: string;
}

const EMPTY_FORM: FormState = {
  email_provider: "MICROSOFT_365",
  google_user: "",
  google_pass: "",
  google_sender: "",
  google_host: "smtp.gmail.com",
  google_port: "587",
  ms_user: "",
  ms_pass: "",
  ms_sender: "",
  ms_host: "smtp.office365.com",
  ms_port: "587",
  wa_phone_id: "",
  wa_token: "",
  wa_gw_url: "",
  wa_gw_user: "",
  wa_gw_pass: "",
  wa_gw_key: "",
  wa_gw_phone: "",
  wa_test_mobile: "",
  cl_name: "",
  cl_key: "",
  cl_secret: "",
  cl_preset: "",
};

function formFromView(v: IntegrationSettingsView): FormState {
  return {
    email_provider: v.email_provider,
    google_user: v.google.user,
    google_pass: "",
    google_sender: v.google.senderName,
    google_host: v.google.host,
    google_port: String(v.google.port),
    ms_user: v.microsoft.user,
    ms_pass: "",
    ms_sender: v.microsoft.senderName,
    ms_host: v.microsoft.host,
    ms_port: String(v.microsoft.port),
    wa_phone_id: v.whatsapp.metaPhoneId,
    wa_token: "",
    wa_gw_url: v.whatsapp.gatewayUrl,
    wa_gw_user: v.whatsapp.gatewayUsername,
    wa_gw_pass: "",
    wa_gw_key: "",
    wa_gw_phone: v.whatsapp.gatewayPhoneId,
    wa_test_mobile: v.whatsapp.testMobile,
    cl_name: v.cloudinary.cloudName,
    cl_key: v.cloudinary.apiKey,
    cl_secret: "",
    cl_preset: v.cloudinary.uploadPreset,
  };
}

/** Comparable fingerprint of everything the admin can edit, used to detect unsaved changes. */
function snapshot(form: FormState, templates: WaTemplateMappings, messages: WaMessageTemplates, clearing: Set<SecretField>): string {
  return JSON.stringify([form, templates, messages, [...clearing].sort()]);
}

function SecretHint({ saved, willClear, onClear, onUndo }: { saved: boolean; willClear: boolean; onClear: () => void; onUndo: () => void }) {
  if (willClear) {
    return (
      <span className="text-[10px] text-amber-600 dark:text-amber-400">
        Will be removed on save.{" "}
        <button type="button" onClick={onUndo} className="underline">
          Undo
        </button>
      </span>
    );
  }
  if (!saved) return null;
  return (
    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
      Saved (hidden).{" "}
      <button type="button" onClick={onClear} className="underline text-neutral-500">
        Remove
      </button>
    </span>
  );
}

export function MasterIntegrationsPanel({ orgId, section, whatsappTab, onWhatsappTabChange, onMessage, onStatusChange }: Props) {
  const [view, setView] = useState<IntegrationSettingsView | null>(null);
  const [baseline, setBaseline] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [clearing, setClearing] = useState<Set<SecretField>>(new Set());

  const [emailTo, setEmailTo] = useState<Record<EmailProvider, string>>({ GOOGLE: "", MICROSOFT_365: "" });
  const [emailTesting, setEmailTesting] = useState<EmailProvider | null>(null);
  const [emailResult, setEmailResult] = useState<Partial<Record<EmailProvider, EmailTestResult | { error: string }>>>({});

  const [waTesting, setWaTesting] = useState(false);
  const [waResult, setWaResult] = useState<WATestResult | { error: string } | null>(null);

  // WhatsApp templates: what is chosen per event, what CEOITBOX returned, and fetch/test progress.
  const [templates, setTemplates] = useState<WaTemplateMappings>({});
  const [tplList, setTplList] = useState<WaTemplateInfo[] | null>(null);
  const [tplLoading, setTplLoading] = useState<"fetch" | "sync" | null>(null);
  const [tplNote, setTplNote] = useState<{ ok: boolean; warn?: boolean; text: string } | null>(null);
  const [tplFetchedAt, setTplFetchedAt] = useState("");
  const [messages, setMessages] = useState<WaMessageTemplates>({});
  const [flowTesting, setFlowTesting] = useState<string | null>(null);
  const [flowResults, setFlowResults] = useState<Partial<Record<string, { ok: boolean; text: string }>>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    const res = await getIntegrationSettingsAction(orgId);
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    setLoadError(null);
    setView(res.data);
    const fresh = formFromView(res.data);
    setForm(fresh);
    setTemplates(res.data.whatsapp.templates);
    setClearing(new Set());
    setMessages(res.data.whatsapp.messages);
    setTplList(res.data.whatsapp.library.templates.length ? res.data.whatsapp.library.templates : null);
    setTplFetchedAt(res.data.whatsapp.library.fetchedAt);
    setBaseline(snapshot(fresh, res.data.whatsapp.templates, res.data.whatsapp.messages, new Set()));
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Let the page show Configured / Not set up badges without loading the settings itself.
  useEffect(() => {
    if (view) onStatusChange?.(summarizeIntegrationStatus(view));
  }, [view, onStatusChange]);

  const dirty = baseline !== "" && baseline !== snapshot(form, templates, messages, clearing);

  const toggleClear = (field: SecretField, on: boolean) =>
    setClearing((prev) => {
      const next = new Set(prev);
      if (on) next.add(field);
      else next.delete(field);
      return next;
    });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const input: IntegrationSettingsInput = {
      email_provider: form.email_provider,
      google_smtp_host: form.google_host,
      google_smtp_port: form.google_port,
      google_smtp_user: form.google_user,
      google_smtp_app_password: form.google_pass,
      google_sender_name: form.google_sender,
      ms_smtp_host: form.ms_host,
      ms_smtp_port: form.ms_port,
      ms_smtp_user: form.ms_user,
      ms_smtp_app_password: form.ms_pass,
      ms_sender_name: form.ms_sender,
      wa_meta_phone_id: form.wa_phone_id,
      wa_meta_token: form.wa_token,
      wa_gateway_url: form.wa_gw_url,
      wa_gateway_username: form.wa_gw_user,
      wa_gateway_password: form.wa_gw_pass,
      wa_gateway_api_key: form.wa_gw_key,
      wa_gateway_phone_id: form.wa_gw_phone,
      wa_templates: templates,
      wa_messages: messages,
      wa_test_mobile: form.wa_test_mobile,
      cloudinary_cloud_name: form.cl_name,
      cloudinary_api_key: form.cl_key,
      cloudinary_api_secret: form.cl_secret,
      clearSecrets: [...clearing],
    };
    try {
      const res = await saveIntegrationSettingsAction(orgId, input);
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setView(res.data);
      const saved = formFromView(res.data);
      setForm(saved);
      setTemplates(res.data.whatsapp.templates);
      setClearing(new Set());
      setMessages(res.data.whatsapp.messages);
      setBaseline(snapshot(saved, res.data.whatsapp.templates, res.data.whatsapp.messages, new Set()));
      onMessage?.("Enterprise integration settings saved. Use the Test buttons to confirm each connection.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function runEmailTest(provider: EmailProvider) {
    setEmailTesting(provider);
    setEmailResult((r) => ({ ...r, [provider]: undefined }));
    const g = provider === "GOOGLE";
    try {
      const res = await testEmailAction(orgId, {
        provider,
        toEmail: emailTo[provider],
        override: {
          host: g ? form.google_host : form.ms_host,
          port: g ? form.google_port : form.ms_port,
          user: g ? form.google_user : form.ms_user,
          pass: g ? form.google_pass : form.ms_pass,
          senderName: g ? form.google_sender : form.ms_sender,
        },
      });
      setEmailResult((r) => ({ ...r, [provider]: res.ok ? res.data : { error: res.error } }));
    } catch (err) {
      setEmailResult((r) => ({ ...r, [provider]: { error: err instanceof Error ? err.message : "Test failed." } }));
    } finally {
      setEmailTesting(null);
    }
  }

  /** Values currently typed in the form (even if unsaved); blank fields fall back to the saved ones on the server. */
  function waOverride() {
    return {
      metaPhoneId: form.wa_phone_id,
      metaToken: form.wa_token,
      gatewayUrl: form.wa_gw_url,
      gatewayUsername: form.wa_gw_user,
      gatewayPassword: form.wa_gw_pass,
      gatewayApiKey: form.wa_gw_key,
      gatewayPhoneId: form.wa_gw_phone,
    };
  }

  async function fetchTemplates(sync: boolean) {
    setTplLoading(sync ? "sync" : "fetch");
    setTplNote(null);
    try {
      const res = await fetchWhatsAppTemplatesAction(orgId, { override: waOverride(), sync });
      if (!res.ok) {
        setTplNote({ ok: false, text: res.error });
        return;
      }
      setTplList(res.data.templates);
      setTplFetchedAt(res.data.fetchedAt);
      const usable = res.data.templates.filter((t) => t.supported).length;
      setTplNote({
        ok: true,
        warn: !!res.data.syncWarning || usable === 0,
        text:
          `Loaded ${res.data.templates.length} template(s); ${usable} can be used for alerts.` +
          (usable === 0 ? " Only approved templates without a media header can be used." : "") +
          (res.data.syncWarning ? ` ${res.data.syncWarning}` : ""),
      });
    } catch (err) {
      setTplNote({ ok: false, text: err instanceof Error ? err.message : "Could not fetch templates." });
    } finally {
      setTplLoading(null);
    }
  }

  /** Make `info` the template used for `event`, with a sensible first guess for its variables. */
  function assignTemplate(event: WaEventKey, info: WaTemplateInfo) {
    setFlowResults((r) => ({ ...r, [`template:${event}`]: undefined }));
    const fields = WA_EVENT_FIELDS[event];
    const variables = info.placeholders.map((_, i) => fields[i % fields.length]);
    setTemplates((t) => ({
      ...t,
      [event]: { templateName: info.name, language: info.language, variables, bodyPreview: info.bodyText },
    }));
  }

  function unassignTemplate(event: WaEventKey) {
    setFlowResults((r) => ({ ...r, [`template:${event}`]: undefined }));
    setTemplates((t) => {
      const next = { ...t };
      delete next[event];
      return next;
    });
  }

  function chooseTemplate(event: WaEventKey, key: string) {
    if (!key) {
      unassignTemplate(event);
      return;
    }
    const info = tplList?.find((t) => templateKey(t.name, t.language) === key);
    if (info) assignTemplate(event, info); // a saved template that is not in the loaded list is kept as it is
  }

  function setVariables(event: WaEventKey, keys: WaDataKey[]) {
    setTemplates((t) => {
      const m = t[event];
      return m ? { ...t, [event]: { ...m, variables: keys } } : t;
    });
  }

  function setMessage(event: WaEventKey, text: string) {
    setMessages((m) => {
      const next = { ...m };
      if (text === "") delete next[event]; // empty = use the built-in message
      else next[event] = text;
      return next;
    });
  }

  /** Sends one flow's template (with sample values) or message text to the test number. */
  async function runFlowTest(kind: "template" | "message", event: WaEventKey) {
    const key = `${kind}:${event}`;
    if (kind === "template" && !templates[event]) return;
    if (!form.wa_test_mobile.trim()) {
      setFlowResults((r) => ({ ...r, [key]: { ok: false, text: "Enter a test mobile number first." } }));
      return;
    }
    setFlowTesting(key);
    setFlowResults((r) => ({ ...r, [key]: undefined }));
    try {
      const res =
        kind === "template"
          ? await testWhatsAppTemplateAction(orgId, { event, toMobile: form.wa_test_mobile, mapping: templates[event], override: waOverride() })
          : await testWhatsAppMessageAction(orgId, { event, toMobile: form.wa_test_mobile, text: messages[event], override: waOverride() });
      setFlowResults((r) => ({ ...r, [key]: res.ok ? { ok: res.data.success, text: res.data.message } : { ok: false, text: res.error } }));
    } catch (err) {
      setFlowResults((r) => ({ ...r, [key]: { ok: false, text: err instanceof Error ? err.message : "Test failed." } }));
    } finally {
      setFlowTesting(null);
    }
  }

  async function runWhatsAppTest() {
    setWaTesting(true);
    setWaResult(null);
    try {
      const res = await testWhatsAppAction(orgId, { toMobile: form.wa_test_mobile, override: waOverride() });
      setWaResult(res.ok ? res.data : { error: res.error });
    } catch (err) {
      setWaResult({ error: err instanceof Error ? err.message : "Test failed." });
    } finally {
      setWaTesting(false);
    }
  }

  function renderEmailResult(provider: EmailProvider) {
    const r = emailResult[provider];
    if (!r) return null;
    if ("error" in r) return <ResultBox>{r.error}</ResultBox>;
    return (
      <ResultBox ok={r.success} warn={!r.configured}>
        <div className="font-semibold">{r.success ? "Connection OK" : r.configured ? "Connection failed" : "Not configured"}</div>
        <div>{r.message}</div>
        {r.configured && (
          <div className="opacity-70 mt-0.5">
            {r.user} via {r.host} (credentials from {r.source === "saved" ? "console / form" : "server environment"})
          </div>
        )}
      </ResultBox>
    );
  }

  function emailSection(provider: EmailProvider) {
    const g = provider === "GOOGLE";
    const user = g ? form.google_user : form.ms_user;
    const pass = g ? form.google_pass : form.ms_pass;
    const host = g ? form.google_host : form.ms_host;
    const port = g ? form.google_port : form.ms_port;
    const sender = g ? form.google_sender : form.ms_sender;
    const secretField: SecretField = g ? "google_smtp_app_password" : "ms_smtp_app_password";
    const hasPassword = g ? view?.google.hasPassword : view?.microsoft.hasPassword;
    const envOk = g ? view?.envFallback.google : view?.envFallback.microsoft;
    const isPrimary = form.email_provider === provider;
    const label = g ? "Google Workspace / Gmail" : "Microsoft 365 SMTP";

    return (
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-[#111111] dark:text-white">
            <Mail className="w-4 h-4 text-neutral-400" />
            <span>{label} Integration</span>
          </div>
          {isPrimary && (
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              PRIMARY ACTIVE
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{g ? "Google Email ID" : "Microsoft Sender Email"}</label>
            <input
              type="email"
              autoComplete="off"
              value={user}
              onChange={(e) => set(g ? "google_user" : "ms_user", e.target.value)}
              placeholder={g ? "notifications@yourcompany.com" : "notifications@yourcompany.com"}
              className={inputCls}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>{g ? "Google App Password (16 chars)" : "Microsoft App Password"}</label>
              <SecretHint
                saved={!!hasPassword}
                willClear={clearing.has(secretField)}
                onClear={() => toggleClear(secretField, true)}
                onUndo={() => toggleClear(secretField, false)}
              />
            </div>
            <input
              type="password"
              autoComplete="new-password"
              value={pass}
              onChange={(e) => set(g ? "google_pass" : "ms_pass", e.target.value)}
              placeholder={hasPassword ? "•••••••• (leave blank to keep saved)" : g ? "xxxx xxxx xxxx xxxx" : "App password"}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Sender display name</label>
            <input
              type="text"
              value={sender}
              onChange={(e) => set(g ? "google_sender" : "ms_sender", e.target.value)}
              placeholder="StackDrove CTMS"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-[1fr_5.5rem] gap-2">
            <div>
              <label className={labelCls}>SMTP host</label>
              <input type="text" value={host} onChange={(e) => set(g ? "google_host" : "ms_host", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Port</label>
              <input type="text" inputMode="numeric" value={port} onChange={(e) => set(g ? "google_port" : "ms_port", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#666666] dark:text-neutral-400">
          {g
            ? "Needs 2-Step Verification on the Google account; create the App Password under Security > App passwords."
            : "SMTP AUTH must be enabled on the mailbox; if MFA is on, use an app password."}
          {envOk && !hasPassword && !pass && " Server environment variables are currently supplying credentials."}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end pt-1">
          <div className="flex-1">
            <label className={labelCls}>Send a test email to (optional)</label>
            <input
              type="email"
              value={emailTo[provider]}
              onChange={(e) => setEmailTo((t) => ({ ...t, [provider]: e.target.value }))}
              placeholder="you@yourcompany.com"
              className={inputCls}
            />
          </div>
          <button type="button" onClick={() => runEmailTest(provider)} disabled={emailTesting !== null} className={secondaryBtn}>
            {emailTesting === provider ? "Testing…" : "Test connection"}
          </button>
        </div>
        {renderEmailResult(provider)}
      </div>
    );
  }

  if (loadError) {
    return <ResultBox>{loadError}</ResultBox>;
  }

  if (!view) {
    // Shimmering placeholders that mirror the real layout, so the page doesn't jump when settings arrive.
    return (
      <div className="space-y-4" role="status" aria-label="Loading integration settings">
        <div className="cc-skeleton h-7 w-56" />
        <div className="cc-skeleton h-4 w-full max-w-xl" />
        <div className="cc-skeleton h-11 w-72" />
        <div className="cc-skeleton h-56 w-full" />
      </div>
    );
  }

  const status = summarizeIntegrationStatus(view);
  const sectionStatus = status[section];
  const meta = SECTION_META[section];

  return (
    <form onSubmit={handleSave} className="space-y-5 text-xs">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="font-semibold text-[#111111] dark:text-white text-lg tracking-tight">{meta.title}</h2>
          <p className="text-xs text-[#666666] dark:text-neutral-400 mt-0.5 max-w-xl">{meta.description}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-[11px] font-semibold border ${
            sectionStatus.configured
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
              : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${sectionStatus.configured ? "bg-emerald-500" : "bg-neutral-400"}`} />
          {sectionStatus.detail}
        </span>
      </div>

      <p className="text-[11px] text-[#666666] dark:text-neutral-400 -mt-2">
        Passwords and tokens are encrypted when saved and are never shown again.
      </p>

      {view.persistence === "memory" && (
        <ResultBox warn>
          <strong>Temporary storage.</strong> The database is not connected, so saved settings are lost when the server restarts.
          <details className="mt-1">
            <summary className="cursor-pointer font-semibold">How to make it permanent</summary>
            <div className="mt-1">
              Set <code>SUPABASE_SERVICE_ROLE_KEY</code> and a real <code>NEXT_PUBLIC_SUPABASE_URL</code>, then run{" "}
              <code>supabase/migrations/20261116_integration_settings.sql</code> in Supabase.
            </div>
          </details>
        </ResultBox>
      )}

      {/* Re-keyed so each section / WhatsApp tab fades in when you switch (the form state itself lives above) */}
      <div key={`${section}-${whatsappTab}`} className="cc-fade space-y-5">
        {section === "email" && (
          <>
        {/* Primary Email Provider Selector */}
        <div className="cc-section flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="font-semibold text-[#111111] dark:text-white block">Primary Email Dispatch Service</span>
            <span className="text-[11px] text-[#666666] dark:text-neutral-400">
              All task emails (assigned, submitted, verified, reminders) are sent through this account.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(["GOOGLE", "MICROSOFT_365"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("email_provider", p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  form.email_provider === p
                    ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-2xs"
                    : "border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white bg-white/60 dark:bg-white/[0.04]"
                }`}
              >
                {p === "GOOGLE" ? "Google Workspace" : "Microsoft 365"}
              </button>
            ))}
          </div>
        </div>

        {emailSection("GOOGLE")}
        {emailSection("MICROSOFT_365")}
          </>
        )}

        {/* WhatsApp */}
        {section === "whatsapp" && (
        <>
          {/* Three parts of WhatsApp setup: connect, browse the library, choose what each alert sends */}
          <div role="tablist" aria-label="WhatsApp setup" className="inline-flex flex-wrap p-1 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] gap-1">
            {(["connection", "library", "flows"] as const).map((t) => {
              const selected = whatsappTab === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`wa-tab-${t}`}
                  aria-selected={selected}
                  aria-controls={`wa-panel-${t}`}
                  onClick={() => onWhatsappTabChange(t)}
                  className={`cc-press inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold ${
                    selected
                      ? "bg-white text-[#111111] shadow-sm dark:bg-white/[0.16] dark:text-white"
                      : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
                  }`}
                >
                  {t === "connection" ? "1 · Connection" : t === "library" ? "2 · Library" : "3 · Message flows"}
                  {t === "connection" ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${status.whatsapp.configured ? "bg-emerald-500" : "bg-neutral-400"}`}
                      role="img"
                      aria-label={status.whatsapp.configured ? "Connected" : "Not connected"}
                    />
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.1]" title={t === "library" ? "Templates in your library" : "Alerts using a template"}>
                      {t === "library" ? (tplList ? tplList.length : "–") : `${Object.keys(templates).length}/${WA_EVENTS.length}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        {whatsappTab === "connection" && (
        <div className={cardCls} role="tabpanel" id="wa-panel-connection" aria-labelledby="wa-tab-connection">
          <div className="flex items-center gap-2 font-semibold text-[#111111] dark:text-white">
            <MessageSquare className="w-4 h-4 text-neutral-400" />
            <span>Connect your WhatsApp service</span>
          </div>
          <p className="text-[11px] text-[#666666] dark:text-neutral-400">
            Alerts go out through the CEOITBOX official WhatsApp API first, and fall back to Meta Cloud API (if configured) when that
            fails. Once connected, open the <strong>Templates</strong> tab to choose what each alert sends.
          </p>

          <div className="font-medium text-[#111111] dark:text-white">Channel 1 — CEOITBOX Official WhatsApp API</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>API URL (optional)</label>
              <input type="url" value={form.wa_gw_url} onChange={(e) => set("wa_gw_url", e.target.value)} placeholder="https://official.ceoitbox.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone ID (only if you have several numbers)</label>
              <input type="text" value={form.wa_gw_phone} onChange={(e) => set("wa_gw_phone", e.target.value)} placeholder="e.g. 123456789012345" className={inputCls} />
            </div>
          </div>
          <p className="text-[11px] text-[#666666] dark:text-neutral-400">Sign in with an API key <strong>or</strong> a username and password — not both.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className={labelCls}>API key</label>
                <SecretHint
                  saved={view.whatsapp.hasGatewayApiKey}
                  willClear={clearing.has("wa_gateway_api_key")}
                  onClear={() => toggleClear("wa_gateway_api_key", true)}
                  onUndo={() => toggleClear("wa_gateway_api_key", false)}
                />
              </div>
              <input
                type="password"
                autoComplete="new-password"
                value={form.wa_gw_key}
                onChange={(e) => set("wa_gw_key", e.target.value)}
                placeholder={view.whatsapp.hasGatewayApiKey ? "•••••••• (leave blank to keep saved)" : ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Username</label>
              <input type="text" autoComplete="off" value={form.wa_gw_user} onChange={(e) => set("wa_gw_user", e.target.value)} className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={labelCls}>Password</label>
                <SecretHint
                  saved={view.whatsapp.hasGatewayPassword}
                  willClear={clearing.has("wa_gateway_password")}
                  onClear={() => toggleClear("wa_gateway_password", true)}
                  onUndo={() => toggleClear("wa_gateway_password", false)}
                />
              </div>
              <input
                type="password"
                autoComplete="new-password"
                value={form.wa_gw_pass}
                onChange={(e) => set("wa_gw_pass", e.target.value)}
                placeholder={view.whatsapp.hasGatewayPassword ? "•••••••• (leave blank to keep saved)" : ""}
                className={inputCls}
              />
            </div>
          </div>

          <div className="font-medium text-[#111111] dark:text-white pt-1">Channel 2 — Meta WhatsApp Cloud API v20.0 (optional fallback)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>WhatsApp Phone Number ID</label>
              <input type="text" value={form.wa_phone_id} onChange={(e) => set("wa_phone_id", e.target.value)} placeholder="e.g. 109823471029384" className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={labelCls}>Meta Permanent System Token</label>
                <SecretHint
                  saved={view.whatsapp.hasMetaToken}
                  willClear={clearing.has("wa_meta_token")}
                  onClear={() => toggleClear("wa_meta_token", true)}
                  onUndo={() => toggleClear("wa_meta_token", false)}
                />
              </div>
              <input
                type="password"
                autoComplete="new-password"
                value={form.wa_token}
                onChange={(e) => set("wa_token", e.target.value)}
                placeholder={view.whatsapp.hasMetaToken ? "•••••••• (leave blank to keep saved)" : "EAAB..."}
                className={inputCls}
              />
            </div>
          </div>

          {(view.envFallback.meta || view.envFallback.gateway) && (
            <p className="text-[11px] text-[#666666] dark:text-neutral-400">
              Server environment variables are also set for{" "}
              {[view.envFallback.gateway && "CEOITBOX", view.envFallback.meta && "Meta"].filter(Boolean).join(" and ")} and are used when the console fields are empty.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:items-end pt-1">
            <div className="flex-1">
              <label className={labelCls}>Test mobile number (with country code)</label>
              <input type="tel" value={form.wa_test_mobile} onChange={(e) => set("wa_test_mobile", e.target.value)} placeholder="919876543210" className={inputCls} />
            </div>
            <button type="button" onClick={runWhatsAppTest} disabled={waTesting} className={secondaryBtn}>
              {waTesting ? "Testing…" : "Test connection"}
            </button>
          </div>
          <p className="text-[11px] text-[#666666] dark:text-neutral-400">
            Without a mobile number only the login is checked; with one, a plain-text test message is also sent. Plain text is only
            delivered to numbers that messaged you in the last 24 hours (a WhatsApp rule) — test real alerts from the Templates tab.
          </p>

          {waResult && ("error" in waResult ? (
            <ResultBox>{waResult.error}</ResultBox>
          ) : (
            <div className="space-y-2">
              <ResultBox ok={waResult.success} warn={!waResult.configured}>
                <div className="font-semibold">{waResult.message}</div>
              </ResultBox>
              {waResult.results.map((r) => (
                <ResultBox key={r.channel} ok={r.status === "ok"} warn={r.status === "skipped" || r.status === "not_configured"}>
                  <div className="font-semibold">{r.channel === "META_OFFICIAL" ? "Meta Cloud API" : "CEOITBOX Official API"}</div>
                  <div>{r.message}</div>
                </ResultBox>
              ))}
            </div>
          ))}

        </div>
        )}

        {/* Library: everything fetched, with preview */}
        {whatsappTab === "library" && (
        <div className={cardCls}>
          <WhatsappLibrary
            templates={tplList}
            fetchedAt={tplFetchedAt}
            loading={tplLoading}
            note={tplNote}
            connected={status.whatsapp.configured || !!form.wa_gw_key || !!form.wa_gw_user}
            mappings={templates}
            onFetch={fetchTemplates}
            onAssign={assignTemplate}
            onUnassign={unassignTemplate}
            onOpenFlows={() => onWhatsappTabChange("flows")}
            onOpenConnection={() => onWhatsappTabChange("connection")}
          />
        </div>
        )}

        {/* Message flows: what each system alert sends */}
        {whatsappTab === "flows" && (
        <div className={cardCls}>
          <WhatsappFlows
            library={tplList}
            mappings={templates}
            messages={messages}
            testMobile={form.wa_test_mobile}
            onTestMobile={(v) => set("wa_test_mobile", v)}
            onChooseTemplate={chooseTemplate}
            onSetVariables={setVariables}
            onMessageChange={setMessage}
            onTestTemplate={(e) => void runFlowTest("template", e)}
            onTestMessage={(e) => void runFlowTest("message", e)}
            testing={flowTesting}
            results={flowResults}
            connected={status.whatsapp.configured || !!form.wa_gw_key || !!form.wa_gw_user}
            onOpenLibrary={() => onWhatsappTabChange("library")}
            onOpenConnection={() => onWhatsappTabChange("connection")}
          />
        </div>
        )}
        </>
        )}

        {/* Cloudinary */}
        {section === "storage" && (
        <div className={cardCls}>
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
            Direct tenant cloud storage. All deliverables stream directly to Cloudinary — the database only saves URL references.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Cloud Name</label>
              <input type="text" value={form.cl_name} onChange={(e) => set("cl_name", e.target.value)} placeholder="stackdrove-cloud" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>API Key</label>
              <input type="text" value={form.cl_key} onChange={(e) => set("cl_key", e.target.value)} placeholder="873491823749182" className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={labelCls}>API Secret</label>
                <SecretHint
                  saved={view.cloudinary.hasApiSecret}
                  willClear={clearing.has("cloudinary_api_secret")}
                  onClear={() => toggleClear("cloudinary_api_secret", true)}
                  onUndo={() => toggleClear("cloudinary_api_secret", false)}
                />
              </div>
              <input
                type="password"
                autoComplete="new-password"
                value={form.cl_secret}
                onChange={(e) => set("cl_secret", e.target.value)}
                placeholder={view.cloudinary.hasApiSecret ? "•••••••• (leave blank to keep saved)" : "••••••••••••••••"}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        )}
      </div>

      {saveError && <ResultBox>{saveError}</ResultBox>}

      {/* Save bar: sticky so it is always reachable on long sections */}
      <div className="cc-glass sticky bottom-[5.5rem] lg:bottom-3 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3">
        <div className="text-[11px] text-[#666666] dark:text-neutral-400">
          {dirty ? (
            <span className="cc-fade inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />
              Unsaved changes
            </span>
          ) : (
            <span>All changes saved</span>
          )}
          <span className="mx-1.5">·</span>
          Stored in {view.persistence === "supabase" ? "the database (permanent)" : "server memory (temporary)"}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button type="button" onClick={() => void load()} disabled={saving} className={`${secondaryBtn} cc-pop`}>
              Discard
            </button>
          )}
          <button type="submit" disabled={saving || !dirty} className="apple-btn-primary py-2.5 px-6 text-xs font-semibold disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
