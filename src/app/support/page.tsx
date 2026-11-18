"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  Headphones,
  Sun,
  Moon,
  Laptop,
  Check,
} from "lucide-react";
import {
  getThemePreference,
  setThemePreference,
  ThemePreference,
} from "@/lib/theme/theme-service";
import { notify } from "@/lib/notifications/toast-service";

export default function SupportPage() {
  const [themePref, setThemePref] = useState<ThemePreference>("system");

  // Form states
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("task-delegation");
  const [priority, setPriority] = useState("p2");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");

  useEffect(() => {
    setThemePref(getThemePreference());
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ preference: ThemePreference }>;
      if (customEvent.detail?.preference) {
        setThemePref(customEvent.detail.preference);
      }
    };
    window.addEventListener("stackdrove:theme-change", handler);
    return () => window.removeEventListener("stackdrove:theme-change", handler);
  }, []);

  const handleThemeChange = (pref: ThemePreference) => {
    setThemePref(pref);
    setThemePreference(pref);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !subject.trim() || !message.trim()) {
      notify.warning("Incomplete Form", {
        description: "Please fill in all required support ticket fields.",
      });
      return;
    }

    const generatedId = `CTMS-SUP-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(generatedId);
    setSubmitted(true);
    notify.success("Support Ticket Dispatched", {
      description: `Ticket #${generatedId} logged with enterprise operations desk.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F1F1F1] dark:bg-[#0A0A0A] text-[#111111] dark:text-white transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
            <div className="h-4 w-px bg-neutral-200 dark:border-neutral-800" />
            <Link href="/login" className="flex items-center">
              <img
                src="/sd/stackdrove-logo-light.svg"
                alt="StackDrove"
                className="h-7 w-auto object-contain dark:hidden"
              />
              <img
                src="/sd/stackdrove-logo-dark.svg"
                alt="StackDrove"
                className="h-7 w-auto object-contain hidden dark:block"
              />
            </Link>
          </div>

          {/* Theme Switcher Segmented Control */}
          <div className="flex items-center p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] text-xs">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                themePref === "light"
                  ? "bg-white text-[#111111] shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Sun size={12} />
              <span className="hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                themePref === "dark"
                  ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Moon size={12} />
              <span className="hidden sm:inline">Dark</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("system")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                themePref === "system"
                  ? "bg-white dark:bg-white/20 text-[#111111] dark:text-white shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Laptop size={12} />
              <span className="hidden sm:inline">System</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Hero Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <LifeBuoy size={13} />
            <span>24/7 Enterprise Response</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Enterprise Support Hub
          </h1>
          <p className="text-sm text-[#666666] dark:text-neutral-400 max-w-xl">
            Direct operational support for StackDrove CTMS administrators, delegators, and assignees. Guaranteed SLA response response windows.
          </p>
        </div>

        {/* SLA Tiers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
            <div className="flex items-center justify-between text-rose-500 text-xs font-bold mb-2">
              <span>P1 Critical Outage</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-[10px]">15 Min SLA</span>
            </div>
            <div className="text-xs text-[#666666] dark:text-neutral-400">
              Tenant lockout, complete system unavailability, or database authorization failure.
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
            <div className="flex items-center justify-between text-amber-500 text-xs font-bold mb-2">
              <span>P2 High Priority</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[10px]">1 Hour SLA</span>
            </div>
            <div className="text-xs text-[#666666] dark:text-neutral-400">
              Delegated task verification failures, SLA score miscalculations, or Cloudinary upload errors.
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
            <div className="flex items-center justify-between text-blue-500 text-xs font-bold mb-2">
              <span>P3 Standard Service</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[10px]">4 Hours SLA</span>
            </div>
            <div className="text-xs text-[#666666] dark:text-neutral-400">
              User onboarding, role re-assignments, or recurring task template configuration.
            </div>
          </div>
        </div>

        {/* Interactive Support Request Form or Confirmation */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Support Ticket Received</h2>
              <div className="inline-block px-3 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                Ticket Reference: {ticketId}
              </div>
              <p className="text-xs sm:text-sm text-[#666666] dark:text-neutral-400 max-w-md mx-auto">
                Our CTMS technical desk has received your report. An operational specialist will initiate contact with your corporate email within the designated SLA window.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSubject("");
                  setMessage("");
                }}
                className="apple-btn-secondary px-4 py-2 text-xs font-bold rounded-xl mt-4 cursor-pointer"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#111111] dark:text-white">
                    Submit CTMS Support Ticket
                  </h2>
                  <p className="text-xs text-[#666666] dark:text-neutral-400">
                    Direct routing to our Central Operations engineering cluster.
                  </p>
                </div>
                <Headphones size={20} className="text-neutral-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111111] dark:text-white block">
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. employee@company.com"
                    required
                    className="w-full h-10 px-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-xs text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111111] dark:text-white block">
                    Incident Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-xs text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all cursor-pointer"
                  >
                    <option value="task-delegation">Task Delegation & Assignment</option>
                    <option value="verification">Verification & Revision Workflow</option>
                    <option value="scoring">SLA Scoring & Points Calculation</option>
                    <option value="cloudinary">Cloudinary Proof & Attachment Upload</option>
                    <option value="tenant">Tenant Licensing & Subscription Lock</option>
                    <option value="access">Account Credentials & Role Elevation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111111] dark:text-white block">
                    Severity Level *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-xs text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all cursor-pointer"
                  >
                    <option value="p1">P1 — Critical Outage (15 min response)</option>
                    <option value="p2">P2 — High Impact Bug (1 hr response)</option>
                    <option value="p3">P3 — Standard Operation (4 hr response)</option>
                    <option value="p4">P4 — General Question (24 hr response)</option>
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111111] dark:text-white block">
                    Subject Brief *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Cannot verify task #1002 attachments"
                    required
                    className="w-full h-10 px-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-xs text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] dark:text-white block">
                  Detailed Operational Description *
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe the steps to reproduce, relevant task IDs (#1001, #145), and error messages..."
                  required
                  className="w-full p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-xs text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all resize-none"
                />
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                className="bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] w-full sm:w-auto px-6 h-11 rounded-lg font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Send size={13} />
                <span>Dispatch Support Ticket</span>
              </button>
            </form>
          )}
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#111111] dark:text-white">
            <FileQuestion size={18} className="text-neutral-400" />
            <span>Frequently Asked Operational Questions</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08]">
              <div className="text-xs font-bold text-[#111111] dark:text-white mb-1">
                How do Delegators request revisions?
              </div>
              <div className="text-xs text-[#666666] dark:text-neutral-400">
                In the Delegator portal, click the Revision action on any task in &quot;Under Review&quot; status to append feedback and return to the delegatee queue.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08]">
              <div className="text-xs font-bold text-[#111111] dark:text-white mb-1">
                Why does Cloudinary fail on upload?
              </div>
              <div className="text-xs text-[#666666] dark:text-neutral-400">
                Verify network connectivity to `api.cloudinary.com`. Uploads require active tenant signatures generated via `/api/uploads/sign`.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Strip */}
        <div className="pt-8 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 font-medium">
          <div>© 2026 StackDrove, Inc. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-[#111111] dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-[#111111] dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/support" className="font-bold text-[#111111] dark:text-white">
              Support Desk
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

