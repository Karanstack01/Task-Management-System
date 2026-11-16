"use client";

import React, { useState } from "react";
import {
  Download,
  CreditCard,
  Check,
  Sparkles,
  ArrowRight,
  X,
  FileText,
  Shield,
  Layers,
} from "lucide-react";
import { notify } from "@/lib/notifications/toast-service";
import { InvoiceItem } from "./settings-types";

const INITIAL_INVOICES: InvoiceItem[] = [
  { id: "inv-1", invoiceNo: "INV-2026-010", date: "Oct 1, 2026", amount: "$2,480.00", status: "paid" },
  { id: "inv-2", invoiceNo: "INV-2026-009", date: "Sep 1, 2026", amount: "$2,480.00", status: "paid" },
  { id: "inv-3", invoiceNo: "INV-2026-008", date: "Aug 1, 2026", amount: "$2,480.00", status: "paid" },
  { id: "inv-4", invoiceNo: "INV-2026-007", date: "Jul 1, 2026", amount: "$2,112.40", status: "paid" },
  { id: "inv-5", invoiceNo: "INV-2026-006", date: "Jun 1, 2026", amount: "$1,980.00", status: "paid" },
];

export function BillingTab() {
  const [invoices] = useState<InvoiceItem[]>(INITIAL_INVOICES);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [autoPay, setAutoPay] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(true);

  const handleDownloadInvoice = (invoiceNo: string) => {
    notify.success("Invoice Download Initiated", {
      description: `Downloading tax invoice statement ${invoiceNo}.pdf`,
    });
  };

  const handleDownloadAllInvoices = () => {
    notify.success("Exporting Invoice Bundle", {
      description: "Compiling ZIP archive of all 2026 FY corporate invoices.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8EABC7]">
          Settings / Billing
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Billing
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#8EABC7] mt-1 max-w-xl">
              Plan, resource utilization, and invoices for StackDrove Enterprise CTMS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-[#DFECF7] border border-slate-200 dark:border-white/15">
              <span>Next invoice Nov 1 • $2,480</span>
            </span>

            <button
              onClick={handleDownloadAllInvoices}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#DFECF7] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <Download size={13} />
              <span>Download all invoices</span>
            </button>

            <button
              onClick={() => setShowCompareModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0C132B] dark:bg-[#2357D6] hover:bg-[#16234D] dark:hover:bg-[#1a44a6] text-white shadow-md transition-all hover:scale-[1.02] cursor-pointer"
            >
              <CreditCard size={14} className="text-[#D4F20D]" />
              <span>Change plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 2-Column Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Current Plan Card */}
        <div className="apple-card p-6 bg-gradient-to-br from-[#0F1424]/95 via-[#161D36]/90 to-[#0A0D18]/95 text-white border border-white/15 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#D4F20D] bg-[#D4F20D]/10 px-2 py-0.5 rounded-md inline-block">
              CURRENT PLAN
            </span>
            <h2 className="text-2xl font-black text-white mt-2 tracking-tight">Scale • yearly</h2>
            <p className="text-xs text-[#DFECF7]/80 mt-1">
              $2,480 per month, billed yearly with 15% enterprise discount.
            </p>

            <ul className="mt-4 space-y-2 text-xs text-[#DFECF7]">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-[#D4F20D] shrink-0" />
                <span>Up to 100 users and 10 departments</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-[#D4F20D] shrink-0" />
                <span>All AI agents with approval controls</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-[#D4F20D] shrink-0" />
                <span>SSO, audit logs and 2-year retention</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-[#D4F20D] shrink-0" />
                <span>Priority support • 1-hour response SLA</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/70 relative z-10">
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              Compare plans
            </button>
            <span className="text-[11px] text-white/60">Renews Jan 16, 2027</span>
          </div>
        </div>

        {/* Usage This Cycle Card */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Usage this cycle
                </h3>
                <p className="text-xs text-slate-400 dark:text-[#8EABC7]">
                  Cycle resets in 28 days
                </p>
              </div>
              <button
                onClick={() =>
                  notify.info("Usage History", {
                    description: "Displaying historical metric trends for current fiscal quarter.",
                  })
                }
                className="text-xs font-semibold text-[#2357D6] dark:text-[#DFECF7] hover:underline"
              >
                Usage history
              </button>
            </div>

            {/* Meters List */}
            <div className="mt-4 space-y-3.5">
              {/* User Seats */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">User Seats</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    88 of 100 <span className="text-slate-400 font-normal">• 1 pending</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#2357D6] rounded-full" style={{ width: "88%" }} />
                </div>
              </div>

              {/* Tasks this month */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Tasks this cycle</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    38,412 of 60,000
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#2357D6] rounded-full" style={{ width: "64%" }} />
                </div>
              </div>

              {/* Cloudinary Deliverables */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Deliverable Storage</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    14.2 GB of 25 GB
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "56%" }} />
                </div>
              </div>

              {/* SMS & WhatsApp */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    WhatsApp & SMS Alerts
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    1,204 of 5,000
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: "24%" }} />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-400 dark:text-[#8EABC7]">
            AI actions count every task verification, summary, and auto-dispatch. Manual reviews are free.
          </p>
        </div>
      </div>

      {/* Invoices Table & Payment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Invoices Table (2 columns span) */}
        <div className="lg:col-span-2 apple-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Invoices</h3>
            <button
              onClick={handleDownloadAllInvoices}
              className="text-xs font-semibold text-[#2357D6] dark:text-[#DFECF7] hover:underline"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Invoice</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-[#8EABC7]">{inv.date}</td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      {inv.amount}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Check size={10} />
                        <span>Paid</span>
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(inv.invoiceNo)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment & Billing Details */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Payment and billing details
              </h3>
              <button
                onClick={() =>
                  notify.info("Card Update", {
                    description: "Secure payment modal initialized.",
                  })
                }
                className="text-xs font-semibold text-[#2357D6] dark:text-[#DFECF7] hover:underline"
              >
                Update
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <p className="text-slate-400 text-[11px]">Payment method</p>
                <div className="flex items-center gap-2 mt-0.5 font-bold text-slate-900 dark:text-white">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-[10px]">
                    VISA
                  </span>
                  <span>Visa ending 4921</span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-[11px]">Expires</p>
                <p className="font-semibold text-slate-800 dark:text-white">08 / 2028</p>
              </div>

              <div>
                <p className="text-slate-400 text-[11px]">Billing contact</p>
                <p className="font-semibold text-slate-800 dark:text-white">Vikram Singhania</p>
              </div>

              <div>
                <p className="text-slate-400 text-[11px]">Invoice email</p>
                <p className="font-semibold text-slate-800 dark:text-white">
                  billing@stackdrove.com
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-[11px]">Billing address</p>
                <p className="text-slate-700 dark:text-[#8EABC7]">
                  450 Tech Center Way, Suite 400, San Francisco, CA
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Auto-pay on the 1st</p>
                <p className="text-[11px] text-slate-400">Charged to Visa ending 4921</p>
              </div>
              <button
                onClick={() => setAutoPay(!autoPay)}
                className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                  autoPay ? "bg-[#2357D6] dark:bg-[#D4F20D]" : "bg-slate-200 dark:bg-white/20"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-transform ${
                    autoPay ? "translate-x-4 bg-white dark:bg-[#070B18]" : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Email receipts</p>
                <p className="text-[11px] text-slate-400">Sent to billing@stackdrove.com</p>
              </div>
              <button
                onClick={() => setEmailReceipts(!emailReceipts)}
                className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                  emailReceipts
                    ? "bg-[#2357D6] dark:bg-[#D4F20D]"
                    : "bg-slate-200 dark:bg-white/20"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-transform ${
                    emailReceipts
                      ? "translate-x-4 bg-white dark:bg-[#070B18]"
                      : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 3: Compare Plans */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0D1530] border border-slate-200 dark:border-white/20 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Compare plans</h3>
                <p className="text-xs text-slate-500 dark:text-[#8EABC7] mt-0.5">
                  You're on Scale, billed yearly. Prices are per month and include every AI agent action
                  up to your limit.
                </p>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Billing Toggle (Monthly vs Yearly) */}
            <div className="py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    billingPeriod === "monthly"
                      ? "bg-white dark:bg-[#0C132B] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    billingPeriod === "yearly"
                      ? "bg-white dark:bg-[#0C132B] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <span>Yearly</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                    save 15%
                  </span>
                </button>
              </div>

              <span className="text-xs text-slate-400">
                88 of 100 users • 38,412 of 60,000 tasks this cycle
              </span>
            </div>

            {/* 3 Tier Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
              {/* Growth */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Growth</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {billingPeriod === "yearly" ? "$1,490" : "$1,750"}
                    </span>
                    <span className="text-xs text-slate-400">/month</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Up to 50 users and 5 departments</p>

                  <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-[#8EABC7]">
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#2357D6] shrink-0" />
                      <span>3 AI agents with approvals</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#2357D6] shrink-0" />
                      <span>20,000 tasks a month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#2357D6] shrink-0" />
                      <span>Audit logs: 1 year</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#2357D6] shrink-0" />
                      <span>Email support</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() =>
                    notify.info("Plan Switch Requested", {
                      description: "Enterprise sales rep notified for account downgrade review.",
                    })
                  }
                  className="mt-6 w-full py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition-colors"
                >
                  Switch to Growth
                </button>
              </div>

              {/* Scale (Current) */}
              <div className="p-5 rounded-2xl border-2 border-[#2357D6] bg-blue-50/20 dark:bg-[#121B38] flex flex-col justify-between relative shadow-lg">
                <div className="absolute -top-3 right-4 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#2357D6] text-white uppercase tracking-wider">
                  Current
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-[#2357D6] dark:text-[#60A5FA]">
                    Scale
                  </span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {billingPeriod === "yearly" ? "$2,480" : "$2,920"}
                    </span>
                    <span className="text-xs text-slate-400">/month</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Up to 100 users and 10 departments</p>

                  <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-[#DFECF7]">
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#D4F20D] shrink-0" />
                      <span>All AI agents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#D4F20D] shrink-0" />
                      <span>60,000 tasks a month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#D4F20D] shrink-0" />
                      <span>SSO and 2-year audit logs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#D4F20D] shrink-0" />
                      <span>1-hour priority support</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled
                  className="mt-6 w-full py-2 rounded-xl text-xs font-bold bg-[#0C132B] dark:bg-[#2357D6] text-white opacity-90 cursor-default"
                >
                  Current plan
                </button>
              </div>

              {/* Enterprise */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Enterprise</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">Custom</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Unlimited users and custom branches</p>

                  <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-[#8EABC7]">
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#2357D6] shrink-0" />
                      <span>Custom agent policies</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#2357D6] shrink-0" />
                      <span>Unlimited AI actions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#2357D6] shrink-0" />
                      <span>SOMS data residency, 7-year audit</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-[#2357D6] shrink-0" />
                      <span>Named success manager</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() =>
                    notify.success("Enterprise Inquiry Sent", {
                      description: "Enterprise solutions architect will contact you within 2 hours.",
                    })
                  }
                  className="mt-6 w-full py-2 rounded-xl text-xs font-bold bg-[#0C132B] dark:bg-[#2357D6] hover:bg-[#16234D] text-white transition-colors cursor-pointer"
                >
                  Talk to sales
                </button>
              </div>
            </div>

            {/* Recommendation Banner */}
            <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 dark:bg-[#141E3D] border border-indigo-100 dark:border-white/10 flex items-start gap-3">
              <Sparkles size={16} className="text-[#2357D6] dark:text-[#D4F20D] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  What we'd do
                </p>
                <p className="text-xs text-slate-600 dark:text-[#DFECF7] mt-0.5 leading-relaxed">
                  Stay on Scale. You add about 2 departments a month, so you'll reach 100 users around
                  May 2027. Revisit Enterprise at your January review.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Changes start on your next invoice, Nov 1
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0C132B] dark:bg-[#2357D6] text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

