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

const INITIAL_INVOICES: InvoiceItem[] = [];

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
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A3A3A3]">
          Settings / Billing
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
              Billing
            </h1>
            <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1 max-w-xl">
              Plan, resource utilization, and invoices for StackDrove Enterprise CTMS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-[#111111] dark:text-white border border-black/[0.06] dark:border-white/[0.08]">
              <span>Next invoice Nov 1 • ₹2,480</span>
            </span>

            <button
              onClick={handleDownloadAllInvoices}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#666666] dark:text-[#A3A3A3] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Download all invoices</span>
            </button>

            <button
              onClick={() => setShowCompareModal(true)}
              className="apple-btn-primary inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <CreditCard size={14} />
              <span>Change plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 2-Column Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Current Plan Hero Card (Stacked Deep Charcoal Apple Theme) */}
        <div className="p-6 rounded-2xl bg-[#111111] dark:bg-[#111111] text-white border border-black/10 dark:border-white/10 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand dark:text-brand bg-brand/20 px-2.5 py-1 rounded-full inline-block">
              CURRENT PLAN
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-2.5 tracking-tight">Scale • Yearly</h2>
            <p className="text-xs text-neutral-300 mt-1 font-medium">
              ₹2,480 per month, billed yearly with 15% enterprise discount.
            </p>

            <ul className="mt-4 space-y-2.5 text-xs text-neutral-200">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Up to 100 users and 10 departments</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>All AI agents with approval controls</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>SSO, audit logs and 2-year retention</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Priority support • 1-hour response SLA</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/70 relative z-10">
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              Compare plans
            </button>
            <span className="text-[11px] text-neutral-400 font-medium">Renews Jan 16, 2027</span>
          </div>
        </div>

        {/* Usage This Cycle Card (Crisp White Apple Card) */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111111] dark:text-white">
                  Usage this cycle
                </h3>
                <p className="text-xs text-[#666666] dark:text-[#A3A3A3]">
                  Cycle resets in 28 days
                </p>
              </div>
              <button
                onClick={() =>
                  notify.info("Usage History", {
                    description: "Displaying historical metric trends for current fiscal quarter.",
                  })
                }
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                Usage history
              </button>
            </div>

            {/* Meters List */}
            <div className="mt-4 space-y-3.5">
              {/* User Seats */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-[#333333] dark:text-neutral-200">User Seats</span>
                  <span className="text-[#111111] dark:text-white font-bold">
                    88 of 100 <span className="text-[#666666] font-normal">• 1 pending</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: "88%" }} />
                </div>
              </div>

              {/* Tasks this month */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-[#333333] dark:text-neutral-200">Tasks this cycle</span>
                  <span className="text-[#111111] dark:text-white font-bold">
                    38,412 of 60,000
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: "64%" }} />
                </div>
              </div>

              {/* Cloudinary Deliverables */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-[#333333] dark:text-neutral-200">Deliverable Storage</span>
                  <span className="text-[#111111] dark:text-white font-bold">
                    14.2 GB of 25 GB
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "56%" }} />
                </div>
              </div>

              {/* SMS & WhatsApp */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-[#333333] dark:text-neutral-200">
                    WhatsApp & SMS Alerts
                  </span>
                  <span className="text-[#111111] dark:text-white font-bold">
                    1,204 of 5,000
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: "24%" }} />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.08] text-[11px] text-[#666666] dark:text-[#A3A3A3]">
            AI actions count every task verification, summary, and auto-dispatch. Manual reviews are free.
          </p>
        </div>
      </div>

      {/* Invoices Table & Payment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Invoices Table (2 columns span) */}
        <div className="lg:col-span-2 apple-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#111111] dark:text-white">Invoices</h3>
            <button
              onClick={handleDownloadAllInvoices}
              className="text-xs font-semibold text-brand hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[#666666] dark:text-[#A3A3A3] font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Invoice</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#111111] dark:text-white">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3 text-[#666666] dark:text-[#A3A3A3]">{inv.date}</td>
                    <td className="py-3 font-semibold text-[#111111] dark:text-white">
                      {inv.amount}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <Check size={10} />
                        <span>Paid</span>
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(inv.invoiceNo)}
                        className="p-1.5 rounded-lg text-[#666666] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
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
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <h3 className="text-sm font-bold text-[#111111] dark:text-white">
                Payment and billing details
              </h3>
              <button
                onClick={() =>
                  notify.info("Card Update", {
                    description: "Secure payment modal initialized.",
                  })
                }
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                Update
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <p className="text-[#666666] dark:text-[#A3A3A3] text-[11px] font-medium">Payment method</p>
                <div className="flex items-center gap-2 mt-0.5 font-bold text-[#111111] dark:text-white">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20">
                    VISA
                  </span>
                  <span>Visa ending 4921</span>
                </div>
              </div>

              <div>
                <p className="text-[#666666] dark:text-[#A3A3A3] text-[11px] font-medium">Expires</p>
                <p className="font-semibold text-[#111111] dark:text-white">08 / 2028</p>
              </div>

              <div>
                <p className="text-[#666666] dark:text-[#A3A3A3] text-[11px] font-medium">Billing contact</p>
                <p className="font-semibold text-[#111111] dark:text-white">Not set</p>
              </div>

              <div>
                <p className="text-[#666666] dark:text-[#A3A3A3] text-[11px] font-medium">Invoice email</p>
                <p className="font-semibold text-[#111111] dark:text-white">
                  Not set
                </p>
              </div>

              <div>
                <p className="text-[#666666] dark:text-[#A3A3A3] text-[11px] font-medium">Billing address</p>
                <p className="text-[#666666] dark:text-[#A3A3A3]">
                  450 Tech Center Way, Suite 400, San Francisco, CA
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[#111111] dark:text-white">Auto-pay on the 1st</p>
                <p className="text-[11px] text-[#666666] dark:text-[#A3A3A3]">Charged to Visa ending 4921</p>
              </div>
              <button
                onClick={() => setAutoPay(!autoPay)}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  autoPay ? "bg-[#111111] dark:bg-white" : "bg-neutral-200 dark:bg-white/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full transition-transform ${
                    autoPay ? "translate-x-4 bg-white dark:bg-[#111111]" : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[#111111] dark:text-white">Email receipts</p>
                <p className="text-[11px] text-[#666666] dark:text-[#A3A3A3]">Sent to Not set</p>
              </div>
              <button
                onClick={() => setEmailReceipts(!emailReceipts)}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  emailReceipts
                    ? "bg-[#111111] dark:bg-white"
                    : "bg-neutral-200 dark:bg-white/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full transition-transform ${
                    emailReceipts
                      ? "translate-x-4 bg-white dark:bg-[#111111]"
                      : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Compare Plans */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white dark:bg-[#111111] border border-black/[0.08] dark:border-white/[0.1] rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <h3 className="text-xl font-bold text-[#111111] dark:text-white tracking-tight">Compare plans</h3>
                <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-0.5">
                  You're on Scale, billed yearly. Prices are per month and include every AI agent action
                  up to your limit.
                </p>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#666666] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Billing Toggle (Monthly vs Yearly) */}
            <div className="py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-white/[0.08] text-xs font-bold">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    billingPeriod === "monthly"
                      ? "bg-white dark:bg-[#111111] text-[#111111] dark:text-white shadow-xs"
                      : "text-[#666666] dark:text-[#A3A3A3] hover:text-[#111111]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    billingPeriod === "yearly"
                      ? "bg-white dark:bg-[#111111] text-[#111111] dark:text-white shadow-xs"
                      : "text-[#666666] dark:text-[#A3A3A3] hover:text-[#111111]"
                  }`}
                >
                  <span>Yearly</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                    save 15%
                  </span>
                </button>
              </div>

              <span className="text-xs text-[#666666] dark:text-[#A3A3A3]">
                88 of 100 users • 38,412 of 60,000 tasks this cycle
              </span>
            </div>

            {/* 3 Tier Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
              {/* Growth */}
              <div className="p-5 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-neutral-50/50 dark:bg-white/[0.02] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-[#666666] dark:text-[#A3A3A3]">Growth</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#111111] dark:text-white">
                      {billingPeriod === "yearly" ? "₹1,490" : "₹1,750"}
                    </span>
                    <span className="text-xs text-[#666666]">/month</span>
                  </div>
                  <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1">Up to 50 users and 5 departments</p>

                  <ul className="mt-4 space-y-2 text-xs text-[#444444] dark:text-neutral-300">
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-brand shrink-0 stroke-[2.2]" />
                      <span>3 AI agents with approvals</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-brand shrink-0 stroke-[2.2]" />
                      <span>20,000 tasks a month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-brand shrink-0 stroke-[2.2]" />
                      <span>Audit logs: 1 year</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-brand shrink-0 stroke-[2.2]" />
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
                  className="mt-6 w-full py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#111111] dark:text-white transition-colors cursor-pointer"
                >
                  Switch to Growth
                </button>
              </div>

              {/* Scale (Current) */}
              <div className="p-5 rounded-2xl border-2 border-brand bg-brand/[0.03] dark:bg-brand/10 flex flex-col justify-between relative shadow-sm">
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-brand text-white dark:text-[#111111] uppercase tracking-wider">
                  Current
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-brand dark:text-brand">
                    Scale
                  </span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#111111] dark:text-white">
                      {billingPeriod === "yearly" ? "₹2,480" : "₹2,920"}
                    </span>
                    <span className="text-xs text-[#666666]">/month</span>
                  </div>
                  <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1">Up to 100 users and 10 departments</p>

                  <ul className="mt-4 space-y-2 text-xs text-[#444444] dark:text-neutral-300">
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-500 shrink-0 stroke-[2.5]" />
                      <span>All AI agents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-500 shrink-0 stroke-[2.5]" />
                      <span>60,000 tasks a month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-500 shrink-0 stroke-[2.5]" />
                      <span>SSO and 2-year audit logs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-500 shrink-0 stroke-[2.5]" />
                      <span>1-hour priority support</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled
                  className="mt-6 w-full py-2 rounded-xl text-xs font-bold bg-[#111111] dark:bg-white dark:text-[#111111] text-white opacity-90 cursor-default"
                >
                  Current plan
                </button>
              </div>

              {/* Enterprise */}
              <div className="p-5 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-neutral-50/50 dark:bg-white/[0.02] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-[#666666] dark:text-[#A3A3A3]">Enterprise</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#111111] dark:text-white">Custom</span>
                  </div>
                  <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1">Unlimited users and custom branches</p>

                  <ul className="mt-4 space-y-2 text-xs text-[#444444] dark:text-neutral-300">
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-brand shrink-0 stroke-[2.2]" />
                      <span>Custom agent policies</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-brand shrink-0 stroke-[2.2]" />
                      <span>Unlimited AI actions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-brand shrink-0 stroke-[2.2]" />
                      <span>SOMS data residency, 7-year audit</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={13} className="text-brand shrink-0 stroke-[2.2]" />
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
                  className="mt-6 w-full py-2 rounded-xl text-xs font-bold bg-[#111111] dark:bg-white dark:text-[#111111] text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Talk to sales
                </button>
              </div>
            </div>

            {/* Recommendation Banner */}
            <div className="mt-4 p-4 rounded-2xl bg-brand/[0.05] dark:bg-brand/15 border border-brand/20 flex items-start gap-3">
              <Sparkles size={16} className="text-brand dark:text-brand shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#111111] dark:text-white uppercase tracking-wider">
                  What we'd do
                </p>
                <p className="text-xs text-[#555555] dark:text-neutral-300 mt-0.5 leading-relaxed">
                  Stay on Scale. You add about 2 departments a month, so you'll reach 100 users around
                  May 2027. Revisit Enterprise at your January review.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] text-[#666666] dark:text-[#A3A3A3]">
                Changes start on your next invoice, Nov 1
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#666666] dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="apple-btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
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
