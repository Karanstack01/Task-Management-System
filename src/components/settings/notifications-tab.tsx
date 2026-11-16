"use client";

import React, { useState } from "react";
import { Bell, Smartphone, Mail, Volume2, Save, Sparkles, Check } from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";

export function NotificationsTab() {
  const [waAlerts, setWaAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [browserPush, setBrowserPush] = useState(true);
  const [audioChimes, setAudioChimes] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      notify.success("Notification Preferences Saved", {
        description: "Alert dispatch rules and real-time triggers have been updated.",
      });
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8EABC7]">
          Settings / Notifications
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Notification preferences
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#8EABC7] mt-1 max-w-xl">
              Configure real-time communication channels, daily summaries, and urgency thresholds.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0C132B] dark:bg-[#2357D6] hover:bg-[#16234D] text-white shadow-md transition-all self-start cursor-pointer"
          >
            <Save size={14} className="text-[#D4F20D]" />
            <span>{saving ? "Saving..." : "Save preferences"}</span>
          </button>
        </div>
      </div>

      <div className="apple-card p-6 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
        {/* WhatsApp */}
        <div className="py-4 first:pt-0 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">WhatsApp Business Dispatch</p>
              <p className="text-[11px] text-slate-400">
                Direct mobile alerts on task assignment and verification requests
              </p>
            </div>
          </div>
          <button
            onClick={() => setWaAlerts(!waAlerts)}
            className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
              waAlerts ? "bg-[#2357D6] dark:bg-[#D4F20D]" : "bg-slate-200 dark:bg-white/20"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                waAlerts ? "translate-x-4 bg-white dark:bg-[#070B18]" : "translate-x-0 bg-white"
              }`}
            />
          </button>
        </div>

        {/* Email */}
        <div className="py-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Mail size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Email Alerts</p>
              <p className="text-[11px] text-slate-400">
                HTML deliverables summaries and SLA escalation reports
              </p>
            </div>
          </div>
          <button
            onClick={() => setEmailAlerts(!emailAlerts)}
            className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
              emailAlerts ? "bg-[#2357D6] dark:bg-[#D4F20D]" : "bg-slate-200 dark:bg-white/20"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                emailAlerts ? "translate-x-4 bg-white dark:bg-[#070B18]" : "translate-x-0 bg-white"
              }`}
            />
          </button>
        </div>

        {/* Browser Push */}
        <div className="py-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Bell size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Desktop Browser Push</p>
              <p className="text-[11px] text-slate-400">
                Native system notifications even when CTMS tab is minimized
              </p>
            </div>
          </div>
          <button
            onClick={() => setBrowserPush(!browserPush)}
            className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
              browserPush ? "bg-[#2357D6] dark:bg-[#D4F20D]" : "bg-slate-200 dark:bg-white/20"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                browserPush ? "translate-x-4 bg-white dark:bg-[#070B18]" : "translate-x-0 bg-white"
              }`}
            />
          </button>
        </div>

        {/* Audio Chimes */}
        <div className="py-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Volume2 size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Harmonic Audio Chimes</p>
              <p className="text-[11px] text-slate-400">
                Play subtle ambient chimes on new incoming task deliverables
              </p>
            </div>
          </div>
          <button
            onClick={() => setAudioChimes(!audioChimes)}
            className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
              audioChimes ? "bg-[#2357D6] dark:bg-[#D4F20D]" : "bg-slate-200 dark:bg-white/20"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                audioChimes ? "translate-x-4 bg-white dark:bg-[#070B18]" : "translate-x-0 bg-white"
              }`}
            />
          </button>
        </div>

        {/* Daily Digest */}
        <div className="py-4 last:pb-0 flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Daily Morning Digest</p>
            <p className="text-[11px] text-slate-400">
              Dispatched daily at 09:00 AM with pending deliverables and critical SLAs
            </p>
          </div>
          <button
            onClick={() => setDailyDigest(!dailyDigest)}
            className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
              dailyDigest ? "bg-[#2357D6] dark:bg-[#D4F20D]" : "bg-slate-200 dark:bg-white/20"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                dailyDigest ? "translate-x-4 bg-white dark:bg-[#070B18]" : "translate-x-0 bg-white"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
