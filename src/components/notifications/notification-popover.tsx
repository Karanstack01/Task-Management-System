"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bell,
  Settings,
  Paperclip,
  Check,
  X,
  Volume2,
  VolumeX,
  Clock,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  Mail,
  Smartphone,
  CheckCheck,
  FileCheck2,
  Download,
  Building2,
  CalendarCheck,
  Sparkles,
} from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { localDb } from "@/lib/data/dal";
import { useUIStore } from "@/lib/store/ui-store";

export type NotificationCategory =
  | "deliverable"
  | "comment"
  | "extension_request"
  | "attachment"
  | "sla"
  | "system";

export type NotificationTab = "inbox" | "general";

export interface CTMSNotificationItem {
  id: string;
  tab: NotificationTab;
  category: NotificationCategory;
  actor: {
    name: string;
    avatarUrl?: string;
    initials: string;
    bgColor: string;
  };
  title: string;
  meta: string;
  timeAgo: string;
  isRead: boolean;
  link?: string;
  hasActions?: boolean;
  actionState?: "pending" | "accepted" | "declined";
  /** For category "extension_request": what the accept/decline actions operate on. */
  extensionRequest?: {
    taskId: string;
    requestedBy: string;
    extensionDays: number;
  };
  attachment?: {
    name: string;
    size?: string;
    url?: string;
  };
}

const INITIAL_NOTIFICATIONS: CTMSNotificationItem[] = [];

function playNotificationChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Non-critical, audio context may be blocked by user gesture policy
  }
}

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>("inbox");
  const [notifications, setNotifications] =
    useState<CTMSNotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [showSettings, setShowSettings] = useState(false);

  // Settings State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopPush, setDesktopPush] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 60, right: 16 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronized Bell Ringing Animation trigger (Video 1 Reference)
  const triggerBellRing = () => {
    setIsRinging(true);
    if (soundEnabled) {
      playNotificationChime();
    }
    setTimeout(() => setIsRinging(false), 1200);
  };

  // Listen to system-wide notification dispatch events to ring the bell
  useEffect(() => {
    const onNotification = () => {
      triggerBellRing();
    };
    window.addEventListener("ctms:notification-received", onNotification);
    return () => window.removeEventListener("ctms:notification-received", onNotification);
  }, [soundEnabled]);

  // Initial welcome bell ring animation if unread notifications exist
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRinging(true);
      setTimeout(() => setIsRinging(false), 1100);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 10,
        right: Math.max(16, window.innerWidth - rect.right - 10),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
      return () => {
        window.removeEventListener("resize", updateCoords);
        window.removeEventListener("scroll", updateCoords, true);
      };
    }
  }, [isOpen]);

  // Count unread items
  const unreadInboxCount = notifications.filter(
    (n) => n.tab === "inbox" && !n.isRead
  ).length;

  const unreadGeneralCount = notifications.filter(
    (n) => n.tab === "general" && !n.isRead
  ).length;

  const totalUnreadCount = notifications.filter((n) => !n.isRead).length;

  // Click outside and Escape key handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowSettings(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setShowSettings(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const togglePopover = () => {
    if (!isOpen && soundEnabled) {
      playNotificationChime();
    }
    setIsOpen((prev) => !prev);
    setShowSettings(false);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.tab === activeTab ? { ...item, isRead: true } : item
      )
    );
    notify.success("All notifications marked as read", {
      description: `Inbox and active alerts for ${activeTab.toUpperCase()} tab have been cleared.`,
    });
  };

  const handleItemClick = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  };

  /** Resolves the task + requested date an extension notification refers to. */
  const loadExtensionRequest = async (id: string) => {
    const item = notifications.find((n) => n.id === id);
    const req = item?.extensionRequest;
    if (!req) {
      notify.error("Extension Request Unavailable", { description: "This request has no linked task." });
      return null;
    }
    const task = await localDb.getTaskById(req.taskId);
    if (!task) {
      notify.error("Extension Request Unavailable", { description: "The linked task no longer exists." });
      return null;
    }
    const requestedDate = new Date(
      new Date(task.current_target_date).getTime() + req.extensionDays * 24 * 60 * 60 * 1000
    ).toISOString();
    return { task, req, requestedDate };
  };

  const settleNotification = (id: string, actionState: "accepted" | "declined") =>
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true, actionState } : item))
    );

  const handleAccept = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ctx = await loadExtensionRequest(id);
    if (!ctx) return;
    const { task, req, requestedDate } = ctx;

    const approver = useUIStore.getState().activeUserId || task.delegator_id;
    const res = await localDb.requestDateRevision(
      task.id,
      req.requestedBy,
      requestedDate,
      `Extension approved via manager notification popover (+${req.extensionDays} days).`,
      { approvedBy: approver }
    );
    if (res.error) {
      notify.error("Extension Request Blocked", { description: res.error });
      return;
    }

    settleNotification(id, "accepted");
    notify.success("Timeline Extension Approved", {
      description: `Task #${task.task_no} deadline extended by +${req.extensionDays} days and logged.`,
    });
  };

  const handleDecline = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ctx = await loadExtensionRequest(id);
    if (!ctx) return;
    const { task, req, requestedDate } = ctx;

    const decider = useUIStore.getState().activeUserId || task.delegator_id;
    await localDb.declineDateRevision(
      task.id,
      req.requestedBy,
      requestedDate,
      `Extension declined via manager notification popover (+${req.extensionDays} days requested).`,
      decider
    );

    settleNotification(id, "declined");
    notify.info("Extension Request Declined", {
      description: `Task #${task.task_no} original SLA deadline remains enforced.`,
    });
  };

  const handleDownloadAttachment = (e: React.MouseEvent, filename?: string) => {
    e.stopPropagation();
    notify.info("Downloading Deliverable File", {
      description: `Initiated download for ${filename || "attachment.pdf"}.`,
    });
  };

  const visibleNotifications = notifications.filter(
    (n) => n.tab === activeTab
  );

  return (
    <div className="relative">
      {/* Anchor Bell Button with Swinging Animation & Spring Badge (Video 1 Reference) */}
      <button
        ref={buttonRef}
        onClick={togglePopover}
        className={`p-2 rounded-full transition-all relative group cursor-pointer ${
          isOpen
            ? "bg-black/[0.08] dark:bg-white/[0.12] text-[#111111] dark:text-white"
            : "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#111111] dark:text-white"
        }`}
        title="Notifications"
        aria-label="Open notifications menu"
        aria-expanded={isOpen}
      >
        <div
          className={`origin-top transition-transform duration-300 ${
            isRinging ? "animate-bell-ring" : "group-hover:rotate-12"
          }`}
        >
          <Bell size={17} />
        </div>

        {totalUnreadCount > 0 && (
          <span
            key={totalUnreadCount}
            className="animate-badge-pop absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-md ring-2 ring-white dark:ring-[#111111] pointer-events-none"
          >
            {totalUnreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown rendered via portal to escape parent backdrop-filter and ensure 100% occlusion */}
      {mounted && isOpen && createPortal(
        <>
          {/* Fullscreen modal backdrop barrier that dims background & blocks all mouse hover events & clicks */}
          <div
            className="fixed inset-0 z-[9998] bg-black/35 dark:bg-black/60 transition-opacity animate-in fade-in duration-150"
            onClick={() => {
              setIsOpen(false);
              setShowSettings(false);
            }}
            aria-hidden="true"
          />
          <div
            ref={popoverRef}
            className="apple-popover fixed z-[9999] w-[calc(100vw-2rem)] max-w-[390px] sm:w-[400px] rounded-2xl bg-white dark:bg-[#111111] border border-black/[0.12] dark:border-white/[0.16] shadow-2xl shadow-black/30 dark:shadow-black/90 ring-1 ring-black/[0.06] dark:ring-white/[0.08] animate-in fade-in zoom-in-95 duration-150 overflow-hidden text-[#111111] dark:text-white"
            style={{
              top: `${coords.top}px`,
              right: `${coords.right}px`,
              backgroundColor: "var(--popover-surface, #FFFFFF)",
              opacity: 1,
              isolation: "isolate",
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
            }}
          >
            {/* Top Notch Pointer (Aligned with Bell) */}
            <div
              className="apple-popover absolute -top-2 right-4 sm:right-6 w-3.5 h-3.5 rotate-45 bg-white dark:bg-[#111111] border-t border-l border-black/[0.12] dark:border-white/[0.16] z-10 pointer-events-none"
              style={{ backgroundColor: "var(--popover-surface, #FFFFFF)" }}
              aria-hidden="true"
            />

            {/* Popover Header */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111111]">
              <h3 className="text-sm font-bold text-[#111111] dark:text-white tracking-tight">
                Notifications
              </h3>
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-[#666666] hover:text-[#111111] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
              Mark all as read
            </button>
          </div>

          {/* Subheader / Tabs Row */}
          <div className="px-5 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111111]">
            {/* Tabs List */}
            <div className="flex items-center gap-6">
              {/* Inbox Tab */}
              <button
                onClick={() => {
                  setActiveTab("inbox");
                  setShowSettings(false);
                }}
                className={`relative pb-3 flex items-center gap-2 text-xs font-semibold transition-colors ${
                  activeTab === "inbox" && !showSettings
                    ? "text-[#111111] dark:text-white"
                    : "text-[#666666] hover:text-[#111111] dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>Inbox</span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
                    activeTab === "inbox" && !showSettings
                      ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white"
                      : "bg-black/[0.05] dark:bg-white/10 text-[#666666] dark:text-slate-300"
                  }`}
                >
                  {unreadInboxCount}
                </span>
                {/* Active Indicator Underline */}
                {activeTab === "inbox" && !showSettings && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#111111] dark:bg-white rounded-full" />
                )}
              </button>

              {/* General Tab */}
              <button
                onClick={() => {
                  setActiveTab("general");
                  setShowSettings(false);
                }}
                className={`relative pb-3 flex items-center gap-2 text-xs font-semibold transition-colors ${
                  activeTab === "general" && !showSettings
                    ? "text-[#111111] dark:text-white"
                    : "text-[#666666] hover:text-[#111111] dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>General</span>
                {unreadGeneralCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      activeTab === "general" && !showSettings
                        ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white"
                        : "bg-black/[0.05] dark:bg-white/10 text-[#666666] dark:text-slate-300"
                    }`}
                  >
                    {unreadGeneralCount}
                  </span>
                )}
                {/* Active Indicator Underline */}
                {activeTab === "general" && !showSettings && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#111111] dark:bg-white rounded-full" />
                )}
              </button>
            </div>

            {/* Settings Gear Icon */}
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className={`p-1.5 -mr-1.5 mb-2 rounded-lg transition-colors ${
                showSettings
                  ? "bg-black/[0.08] dark:bg-white/[0.12] text-[#111111] dark:text-white"
                  : "text-[#666666] hover:text-[#111111] dark:text-slate-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              }`}
              title="Notification Settings"
              aria-label="Configure notifications"
            >
              <Settings size={16} />
            </button>
          </div>

          {/* Popover Content Body */}
          {showSettings ? (
            /* Settings Panel */
            <div className="p-5 space-y-4 bg-white dark:bg-[#111111]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A3A3A3]">
                  Alert Preferences
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Sparkles size={12} /> Auto-Saved
                </span>
              </div>

              <div className="space-y-3">
                {/* Audio Chime Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {soundEnabled ? (
                      <Volume2 size={16} className="text-brand dark:text-brand" />
                    ) : (
                      <VolumeX size={16} className="text-slate-400" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Audio Chime Alerts
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">
                        Plays soft harmonic chime on notifications
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      if (!soundEnabled) playNotificationChime();
                    }}
                    className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                      soundEnabled
                        ? "bg-[#111111] dark:bg-white"
                        : "bg-slate-200 dark:bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        soundEnabled
                          ? "translate-x-4 bg-white dark:bg-[#0A0A0A]"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                {/* Desktop Push */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Desktop Browser Push
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">
                        System toasts for incoming deliverables
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDesktopPush(!desktopPush)}
                    className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                      desktopPush
                        ? "bg-[#111111] dark:bg-white"
                        : "bg-slate-200 dark:bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        desktopPush
                          ? "translate-x-4 bg-white dark:bg-[#0A0A0A]"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                {/* WhatsApp Dispatch */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Smartphone size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        WhatsApp Instant Alerts
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">
                        Task assignment & submission pings
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setWhatsappAlerts(!whatsappAlerts)}
                    className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                      whatsappAlerts
                        ? "bg-[#111111] dark:bg-white"
                        : "bg-slate-200 dark:bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        whatsappAlerts
                          ? "translate-x-4 bg-white dark:bg-[#0A0A0A]"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                {/* Email Digest */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Daily Email Summary
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">
                        Morning digest of pending SLA tasks
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailDigest(!emailDigest)}
                    className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                      emailDigest
                        ? "bg-[#111111] dark:bg-white"
                        : "bg-slate-200 dark:bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        emailDigest
                          ? "translate-x-4 bg-white dark:bg-[#0A0A0A]"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] dark:hover:bg-[#E5E5E5] text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Notification List Items */
            <div className="max-h-[380px] overflow-y-auto divide-y divide-black/[0.05] dark:divide-white/[0.08] overscroll-contain bg-white dark:bg-[#111111]">
              {visibleNotifications.length === 0 ? (
                <div className="py-12 px-6 text-center bg-white dark:bg-[#111111]">
                  <div className="w-12 h-12 rounded-full bg-black/[0.04] dark:bg-white/5 flex items-center justify-center mx-auto text-[#666666] mb-3">
                    <CheckCheck size={22} />
                  </div>
                  <p className="text-sm font-bold text-[#111111] dark:text-white">
                    You're all caught up!
                  </p>
                  <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1">
                    No unread notifications in {activeTab === "inbox" ? "Inbox" : "General"}.
                  </p>
                </div>
              ) : (
                visibleNotifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className="p-4 flex items-start gap-3.5 bg-white dark:bg-[#111111] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-pointer group"
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      {item.actor.avatarUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-white/15">
                          <img
                            src={item.actor.avatarUrl}
                            alt={item.actor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-slate-200 dark:ring-white/15 ${item.actor.bgColor}`}
                        >
                          {item.actor.initials}
                        </div>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 pr-1">
                      {/* Title */}
                      <p className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </p>

                      {/* Meta & Timestamp */}
                      <p className="text-[11px] text-slate-400 dark:text-[#A3A3A3] mt-0.5 font-normal">
                        {item.meta}
                      </p>

                      {/* Actionable Extension Request Buttons (e.g. Item 3) */}
                      {item.hasActions && (
                        <div className="mt-2.5">
                          {item.actionState === "pending" && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => handleDecline(e, item.id)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-[#111111] dark:text-white transition-colors"
                              >
                                Decline
                              </button>
                              <button
                                onClick={(e) => handleAccept(e, item.id)}
                                className="bg-[#111111] hover:bg-black text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#E5E5E5] px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                              >
                                Accept
                              </button>
                            </div>
                          )}

                          {item.actionState === "accepted" && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                              <Check size={12} />
                              <span>Accepted (+3 Days Granted)</span>
                            </div>
                          )}

                          {item.actionState === "declined" && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
                              <X size={12} />
                              <span>Declined (Standard SLA)</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* File Attachment Chip (e.g. Item 4) */}
                      {item.attachment && (
                        <div className="mt-2.5">
                          <button
                            onClick={(e) =>
                              handleDownloadAttachment(e, item.attachment?.name)
                            }
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-[#111111] dark:text-white text-xs font-medium transition-all group/chip"
                            title="Click to download deliverable attachment"
                          >
                            <Paperclip
                              size={13}
                              className="text-[#666666] group-hover/chip:text-[#111111] dark:group-hover/chip:text-white transition-colors"
                            />
                            <span className="truncate max-w-[210px] font-medium text-[11px]">
                              {item.attachment.name}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Unread Indicator Dot */}
                    <div className="shrink-0 pt-1">
                      {!item.isRead && (
                        <span
                          className="block w-2 h-2 rounded-full bg-[#111111] dark:bg-white shadow-xs"
                          aria-label="Unread notification"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Popover Footer */}
          <div className="px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#F7F7F7] dark:bg-[#111114] rounded-b-2xl flex items-center justify-between text-xs">
            <span className="text-[#666666] dark:text-[#A3A3A3] font-medium text-[11px]">
              CTMS Notification Stream
            </span>
            <Link
              href="/verify"
              onClick={() => setIsOpen(false)}
              className="text-[#111111] dark:text-white hover:underline font-bold flex items-center gap-1 text-[11px]"
            >
              <span>Verification Queue</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
