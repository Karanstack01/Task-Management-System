"use client";

import React, { useState } from "react";
import {
  Shield,
  Lock,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Download,
  Key,
  ExternalLink,
  ShieldCheck,
  Check,
  FileCheck2,
} from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { ActiveSessionItem, SecurityEventItem } from "./settings-types";

const INITIAL_SESSIONS: ActiveSessionItem[] = [
  {
    id: "sess-1",
    device: "MacBook Pro",
    browser: "Chrome",
    location: "Oakland, CA",
    lastActive: "active 2 min ago",
    isCurrent: true,
  },
  {
    id: "sess-2",
    device: "iPhone 15",
    browser: "StackDrove app",
    location: "San Francisco, CA",
    lastActive: "active 18 min ago",
    isCurrent: false,
  },
  {
    id: "sess-3",
    device: "iPad Air",
    browser: "Safari",
    location: "Berkeley, CA",
    lastActive: "yesterday 7:40 PM",
    isCurrent: false,
  },
  {
    id: "sess-4",
    device: "Dispatch desk PC",
    browser: "Edge",
    location: "Sunnyvale, CA",
    lastActive: "Oct 28",
    isCurrent: false,
  },
];

const INITIAL_EVENTS: SecurityEventItem[] = [
  {
    id: "ev-1",
    type: "sign_in",
    title: "New sign-in from San Francisco, CA",
    location: "MacBook Pro • Chrome",
    timestamp: "Today 8:02 AM",
    actor: "Vikram Singhania",
  },
  {
    id: "ev-2",
    type: "blocked",
    title: "Blocked sign-in from unknown device",
    location: "Ashburn, VA (IP: 198.51.100.24)",
    timestamp: "Yesterday 11:14 PM",
    actor: "Anonymous",
  },
  {
    id: "ev-3",
    type: "key_rotated",
    title: "API key rotated",
    location: "Production key (ctms_live_...379a)",
    timestamp: "Oct 28 4:12 PM",
    actor: "Rajesh Sharma",
  },
  {
    id: "ev-4",
    type: "two_factor",
    title: "2FA reset approved",
    location: "Rohan Mehta • Delegatee",
    timestamp: "Oct 26 2:15 PM",
    actor: "Admin Desk",
  },
];

export function SecurityTab() {
  const [sessions, setSessions] = useState<ActiveSessionItem[]>(INITIAL_SESSIONS);
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [ipRestricted, setIpRestricted] = useState(false);
  const [noAiTraining, setNoAiTraining] = useState(true);

  const handleSignOutOtherSessions = () => {
    const current = sessions.filter((s) => s.isCurrent);
    setSessions(current);
    notify.success("3 of 4 other sessions signed out", {
      description: "Tokens invalidated. All secondary laptops and mobile clients have been terminated.",
    });
  };

  const handleSignOutSingle = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    notify.info("Session Terminated", {
      description: "Remote device logged out successfully.",
    });
  };

  const handleDownloadDoc = (docName: string) => {
    notify.success("Compliance Document Ready", {
      description: `Downloading verified ${docName}.pdf with cryptographic signature.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A3A3A3]">
          Settings / Security
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Security
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A3A3A3] mt-1 max-w-xl">
              Sign in, session telemetry, and enterprise data protection for the StackDrove workspace.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
              <ShieldCheck size={14} className="text-brand dark:text-brand" />
              <span>SOC 2 Type II Verified</span>
            </span>

            <button
              onClick={() => handleDownloadDoc("Enterprise Security Audit Report")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#EEEEEE] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <Download size={13} />
              <span>Security report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2x2 Grid of Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Sign in */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sign in</h3>
                <p className="text-[11px] text-slate-400">Applies to all 135 active members</p>
              </div>
              <button
                onClick={() =>
                  notify.info("Okta Configuration", {
                    description: "SSO directory metadata verified with okta.stackdrove.com",
                  })
                }
                className="text-xs font-semibold text-brand dark:text-[#EEEEEE] hover:underline"
              >
                Okta settings
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* SSO */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Single sign-on with Okta
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Members sign in with their corporate Okta directory
                  </p>
                </div>
                <button
                  onClick={() => setSsoEnabled(!ssoEnabled)}
                  className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                    ssoEnabled ? "bg-[#111111] dark:bg-white" : "bg-slate-200 dark:bg-white/20"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      ssoEnabled ? "translate-x-4 bg-white dark:bg-[#0A0A0A]" : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>

              {/* 2FA */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Two-factor authentication (2FA)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Required: 135 of 135 members enrolled
                  </p>
                </div>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                    twoFactorEnabled
                      ? "bg-[#111111] dark:bg-white"
                      : "bg-slate-200 dark:bg-white/20"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      twoFactorEnabled
                        ? "translate-x-4 bg-white dark:bg-[#0A0A0A]"
                        : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>

              {/* Office IP */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Restrict to office networks
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Only allow sign-in from corporate CIDR IP ranges
                  </p>
                </div>
                <button
                  onClick={() => setIpRestricted(!ipRestricted)}
                  className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                    ipRestricted
                      ? "bg-[#111111] dark:bg-white"
                      : "bg-slate-200 dark:bg-white/20"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      ipRestricted
                        ? "translate-x-4 bg-white dark:bg-[#0A0A0A]"
                        : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>

              {/* Session length */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Session length</span>
                <span className="font-bold text-slate-800 dark:text-white">12 hours</span>
              </div>

              {/* Allowed email domains */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Allowed email domain</span>
                <div className="flex gap-1.5">
                  <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-[#EEEEEE]">
                    stackdrove.com
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-[#EEEEEE]">
                    ctms.com
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Data protection */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Data protection</h3>
              <p className="text-[11px] text-slate-400">How your tenant data is stored and isolated</p>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Data region</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  US East (N. Virginia)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Encryption standard</span>
                <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-white">
                  AES-256 at rest • TLS 1.3
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Messages and documents</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Encrypted with KMS tenant key
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">GPS and SLA telemetry</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  Retained for audit & proof
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Never train AI models on our data
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Agents strictly execute scoped client rules
                  </p>
                </div>
                <button
                  disabled
                  className="w-9 h-5 flex items-center rounded-full p-1 bg-[#111111] dark:bg-white opacity-90 cursor-default"
                >
                  <div className="w-3.5 h-3.5 rounded-full translate-x-4 bg-white dark:bg-[#0A0A0A]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Your active sessions */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Your active sessions
              </h3>
              <button
                onClick={handleSignOutOtherSessions}
                className="text-xs font-semibold text-brand dark:text-[#EEEEEE] hover:underline cursor-pointer"
              >
                Sign out other sessions
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
              {sessions.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {s.device.includes("iPhone") || s.device.includes("iPad") ? (
                      <Smartphone size={16} className="text-slate-400" />
                    ) : (
                      <Laptop size={16} className="text-slate-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {s.device} • {s.browser}
                        </span>
                        {s.isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            This device
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {s.location} • {s.lastActive}
                      </p>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      onClick={() => handleSignOutSingle(s.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Sign out
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Security events */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security events</h3>
              <p className="text-[11px] text-slate-400">Recent account and authentication changes</p>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
              {INITIAL_EVENTS.map((ev) => (
                <div key={ev.id} className="py-2.5 flex items-start gap-3 text-xs">
                  <div className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#EEEEEE] shrink-0 mt-0.5">
                    {ev.type === "blocked" ? (
                      <AlertTriangle size={13} className="text-amber-500" />
                    ) : (
                      <Shield size={13} className="text-brand dark:text-brand" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{ev.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {ev.location} • {ev.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Documents Footer Bar */}
      <div className="bg-white/95 dark:bg-[#111111] border border-slate-200/90 dark:border-white/18 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Compliance documents
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#A3A3A3] mt-0.5">
            Share attested compliance reports with enterprise auditors and client executives.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDownloadDoc("SOC 2 Type II")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold border border-slate-200 dark:border-white/15 transition-colors"
          >
            <Download size={12} />
            <span>SOC 2 Type II</span>
          </button>
          <button
            onClick={() => handleDownloadDoc("Data Processing Addendum")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold border border-slate-200 dark:border-white/15 transition-colors"
          >
            <Download size={12} />
            <span>Data processing addendum</span>
          </button>
          <button
            onClick={() => handleDownloadDoc("Pen Test Summary")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold border border-slate-200 dark:border-white/15 transition-colors"
          >
            <Download size={12} />
            <span>Pen test summary</span>
          </button>
        </div>
      </div>
    </div>
  );
}
