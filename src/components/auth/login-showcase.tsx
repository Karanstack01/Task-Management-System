"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Gauge,
  ShieldCheck,
  Users,
} from "lucide-react";

/** Illustrative product walkthrough for the sign-in screen. Generic sample content only — no real people or numbers. */
const STEP_MS = 4200;

const STEPS = [
  { id: "assign", label: "Assign", icon: ClipboardList, title: "Delegate with clarity", text: "Owners, deadlines, priority and proof requirements set up front." },
  { id: "track", label: "Track", icon: Gauge, title: "See work as it moves", text: "Live status across boards, lists and role-based dashboards." },
  { id: "verify", label: "Verify", icon: FileCheck2, title: "Approve on evidence", text: "Deliverables are reviewed before a task is marked complete." },
  { id: "score", label: "Score", icon: Award, title: "Measure what matters", text: "SLA-based scoring turns delivery into fair, comparable results." },
] as const;

const FEATURES = [
  { icon: ShieldCheck, label: "Role-based access" },
  { icon: Bell, label: "Automated reminders" },
  { icon: Users, label: "Multi-company workspaces" },
];

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" | "ok" }) {
  const tones = {
    neutral: "bg-white/10 text-neutral-200 border-white/15",
    warn: "bg-amber-400/15 text-amber-200 border-amber-300/25",
    ok: "bg-emerald-400/15 text-emerald-200 border-emerald-300/25",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tones[tone]}`}>{children}</span>;
}

function AssignCard() {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <Chip>Sample task</Chip>
          <Chip tone="warn">High priority</Chip>
        </div>
        <span className="text-[10px] text-neutral-400 flex items-center gap-1"><CalendarClock size={11} /> Due Friday</span>
      </div>
      <p className="text-sm font-semibold text-white">Quarterly compliance report</p>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {[["Owner", "Delegator"], ["Assignee", "Team member"], ["Proof", "Required"]].map(([k, v], i) => (
          <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }} className="rounded-lg bg-white/[0.06] border border-white/10 px-2.5 py-2">
            <span className="block text-neutral-400">{k}</span>
            <span className="block font-semibold text-white mt-0.5">{v}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TrackCard() {
  const cols = [
    { name: "Pending", n: 2, w: "30%" },
    { name: "In progress", n: 3, w: "55%" },
    { name: "Done", n: 4, w: "80%" },
  ];
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Live board</p>
        <Chip tone="ok"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> Syncing</Chip>
      </div>
      <div className="space-y-2.5">
        {cols.map((c, i) => (
          <div key={c.name}>
            <div className="flex justify-between text-[10px] text-neutral-300 mb-1"><span>{c.name}</span><span className="tabular-nums">{c.n}</span></div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: c.w }} transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyCard() {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Awaiting review</p>
        <Chip tone="warn">Pending approval</Chip>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-white/[0.06] border border-white/10 px-3 py-2.5">
        <FileCheck2 size={18} className="text-neutral-200" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">deliverable-proof.pdf</p>
          <p className="text-[10px] text-neutral-400">Uploaded with the task</p>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <motion.span initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="px-3 py-1.5 rounded-lg bg-white text-[#111111] text-[11px] font-bold">Approve</motion.span>
        <span className="px-3 py-1.5 rounded-lg border border-white/20 text-neutral-200 text-[11px] font-semibold">Request revision</span>
        <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 1.4, type: "spring", stiffness: 260, damping: 16 }} className="ml-auto text-emerald-300">
          <CheckCircle2 size={22} />
        </motion.span>
      </div>
    </div>
  );
}

function ScoreCard() {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[84px] h-[84px] shrink-0">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
          <motion.circle cx="40" cy="40" r={r} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * 0.08 }} transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">SLA</span>
      </div>
      <div className="space-y-1.5 min-w-0">
        <p className="text-sm font-semibold text-white">On-time delivery scoring</p>
        <p className="text-[11px] text-neutral-400 leading-relaxed">Points are earned for on-time, verified work and reduced for delays and revisions.</p>
        <div className="flex gap-1.5"><Chip tone="ok">On time</Chip><Chip>Verified</Chip></div>
      </div>
    </div>
  );
}

const CARDS = { assign: AssignCard, track: TrackCard, verify: VerifyCard, score: ScoreCard };

export function LoginShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [active, paused]);

  const step = STEPS[active];
  const Card = CARDS[step.id];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 xl:p-14 overflow-hidden bg-[#0A0A0A] text-white"
    >
      {/* Ambient background: drifting light + fine grid */}
      <motion.div aria-hidden className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-white/[0.07] blur-3xl pointer-events-none" animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full bg-white/[0.05] blur-3xl pointer-events-none" animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.06] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      {/* Top: logo */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 flex items-center justify-between">
        <Link href="/login" className="inline-block transition-transform hover:scale-[1.02] active:scale-95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sd/stackdrove-logo-dark.svg" alt="StackDrove" className="h-8 xl:h-9 w-auto object-contain select-none pointer-events-none" />
        </Link>
        <span className="text-[11px] font-medium tracking-wide text-neutral-400">Task Management System</span>
      </motion.div>

      {/* Middle */}
      <div className="relative z-10 my-auto py-8 space-y-8 max-w-xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="space-y-3">
          <h1 className="text-4xl xl:text-5xl font-bold tracking-[-0.03em] leading-[1.05]">
            Delegate. Track.<br />
            <span className="text-neutral-400">Verify. Deliver.</span>
          </h1>
          <p className="text-sm xl:text-[15px] text-neutral-400 leading-relaxed max-w-md">
            One governed workspace for assigning work, proving it is done, and measuring delivery across every team and company.
          </p>
        </motion.div>

        {/* Step selector with progress */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === active;
            return (
              <button key={s.id} type="button" onClick={() => setActive(i)} className="group text-left cursor-pointer">
                <div className="h-[3px] rounded-full bg-white/10 overflow-hidden mb-2.5">
                  {isActive ? (
                    <motion.div key={`${active}-${paused}`} className="h-full bg-white" initial={{ width: paused ? "100%" : 0 }} animate={{ width: "100%" }} transition={{ duration: paused ? 0 : STEP_MS / 1000, ease: "linear" }} />
                  ) : (
                    <div className={`h-full bg-white transition-all duration-500 ${i < active ? "w-full opacity-60" : "w-0"}`} />
                  )}
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${isActive ? "text-white" : "text-neutral-500 group-hover:text-neutral-300"}`}>
                  <Icon size={13} /> {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Animated card */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-white/[0.14] bg-white/[0.06] backdrop-blur-xl p-5 shadow-2xl shadow-black/40"
            >
              <div className="mb-4 pb-4 border-b border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Step {active + 1} of {STEPS.length}</p>
                <p className="text-base font-semibold mt-1">{step.title}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{step.text}</p>
              </div>
              <Card />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Capabilities */}
        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-wrap gap-x-6 gap-y-2">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-xs text-neutral-400"><Icon size={14} className="text-neutral-300" /> {label}</li>
          ))}
        </motion.ul>
      </div>

      <div className="relative z-10 text-xs text-neutral-500">© 2026 StackDrove, Inc. All rights reserved.</div>
    </div>
  );
}
