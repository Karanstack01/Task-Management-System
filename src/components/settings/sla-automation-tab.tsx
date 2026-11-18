"use client";

import React, { useState } from "react";
import { Sliders, Calendar, Shield, Save, Check, Plus, Trash2 } from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";

export function SlaAutomationTab() {
  const [defaultScore, setDefaultScore] = useState(10.0);
  const [reminderHour, setReminderHour] = useState(9);
  const [maxRevisionGap, setMaxRevisionGap] = useState(5);
  const [skipHoliday, setSkipHoliday] = useState(true);
  const [saving, setSaving] = useState(false);

  // Field-level permissions matrix
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    title: { BOSS: true, DELEGATOR: true, DELEGATEE: true },
    description: { BOSS: true, DELEGATOR: true, DELEGATEE: true },
    priority: { BOSS: true, DELEGATOR: true, DELEGATEE: false },
    allocated_score: { BOSS: true, DELEGATOR: true, DELEGATEE: false },
    actual_score: { BOSS: true, DELEGATOR: true, DELEGATEE: false },
    revisions: { BOSS: true, DELEGATOR: true, DELEGATEE: true },
  });

  const [holidays, setHolidays] = useState<{ id: string; name: string; date: string }[]>([
    { id: "h-1", name: "Republic Day", date: "2026-01-26" },
    { id: "h-2", name: "Independence Day", date: "2026-08-15" },
    { id: "h-3", name: "Diwali Festival", date: "2026-11-08" },
  ]);

  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  const togglePermission = (field: string, role: string) => {
    setPermissions((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [role]: !prev[field][role],
      },
    }));
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;
    setHolidays((prev) => [
      ...prev,
      { id: `h-${Date.now()}`, name: newHolidayName.trim(), date: newHolidayDate },
    ]);
    setNewHolidayName("");
    setNewHolidayDate("");
    notify.success("Holiday Added", {
      description: "SLA calculation engine will automatically freeze deadlines on this calendar day.",
    });
  };

  const handleRemoveHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      notify.success("SLA & Automation Rules Saved", {
        description: "Scoring thresholds, reminder cron, and permissions matrix synced.",
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A3A3A3]">
          Settings / AI & Automation
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              SLA & workflow automation
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A3A3A3] mt-1 max-w-xl">
              Configure automated score allocation, deadline grace periods, and field permissions.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] text-white shadow-md transition-all self-start cursor-pointer"
          >
            <Save size={14} className="text-brand" />
            <span>{saving ? "Saving..." : "Save rules"}</span>
          </button>
        </div>
      </div>

      {/* Grid of SLA Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Core SLA Thresholds */}
        <div className="apple-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
            SLA Thresholds & Scoring
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Default Allocated Score (0.0 – 10.0)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                value={defaultScore}
                onChange={(e) => setDefaultScore(parseFloat(e.target.value) || 10)}
                className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Base merit points awarded on first-pass deliverable approval.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Daily Notification Dispatch Hour
              </label>
              <select
                value={reminderHour}
                onChange={(e) => setReminderHour(parseInt(e.target.value))}
                className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-bold"
              >
                <option value={8}>08:00 AM (Early Dispatch)</option>
                <option value={9}>09:00 AM (Standard Office)</option>
                <option value={10}>10:00 AM</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Max Revision Window (Days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={maxRevisionGap}
                onChange={(e) => setMaxRevisionGap(parseInt(e.target.value) || 5)}
                className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  Skip Public Holidays in SLA
                </p>
                <p className="text-[11px] text-slate-400">
                  Deadlines freeze on calendar holidays
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSkipHoliday(!skipHoliday)}
                className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                  skipHoliday ? "bg-[#111111] dark:bg-white" : "bg-slate-200 dark:bg-white/20"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-transform ${
                    skipHoliday ? "translate-x-4 bg-white dark:bg-[#0A0A0A]" : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Holiday Calendar */}
        <div className="apple-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
            Holiday Calendar
          </h3>

          <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              placeholder="Holiday Name"
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white"
            />
            <div className="flex gap-1.5">
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] text-white shrink-0 font-bold"
              >
                Add
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-brand dark:text-brand" />
                  <span className="font-bold text-slate-900 dark:text-white">{h.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">{h.date}</span>
                  <button
                    onClick={() => handleRemoveHoliday(h.id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="apple-card p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Field-Level Permission Matrix
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Control which organizational roles can edit specific task metadata fields.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Field Name</th>
                <th className="pb-3 text-center">Executive (BOSS)</th>
                <th className="pb-3 text-center">Delegator (Manager)</th>
                <th className="pb-3 text-center">Delegatee (Worker)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {Object.entries(permissions).map(([field, roles]) => (
                <tr key={field} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-3 font-mono font-bold text-slate-800 dark:text-white capitalize">
                    {field.replace("_", " ")}
                  </td>
                  {["BOSS", "DELEGATOR", "DELEGATEE"].map((role) => (
                    <td key={role} className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => togglePermission(field, role)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors mx-auto ${
                          roles[role]
                            ? "bg-brand text-white dark:text-[#111111]"
                            : "bg-slate-200 dark:bg-white/10 text-transparent"
                        }`}
                      >
                        <Check size={12} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
