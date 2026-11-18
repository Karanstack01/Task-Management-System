"use client";

import React, { useMemo, useRef, useState } from "react";
import type { WaTemplateInfo } from "@/lib/whatsapp/ceoitbox-client";
import { WA_EVENTS, templateKey, type WaEventKey, type WaTemplateMappings } from "@/lib/whatsapp/template-config";
import {
  Chip,
  MessageBubble,
  ResultBox,
  Slot,
  chipAmber,
  chipBlue,
  chipGreen,
  chipNeutral,
  chipRed,
  inputCls,
  labelCls,
  secondaryBtn,
} from "./integration-ui";

type Filter = "all" | "usable" | "inuse" | "unavailable";

export interface WhatsappLibraryProps {
  /** null = nothing fetched yet. */
  templates: WaTemplateInfo[] | null;
  fetchedAt: string;
  loading: "fetch" | "sync" | null;
  note: { ok: boolean; warn?: boolean; text: string } | null;
  connected: boolean;
  mappings: WaTemplateMappings;
  onFetch: (sync: boolean) => void;
  onAssign: (event: WaEventKey, template: WaTemplateInfo) => void;
  onUnassign: (event: WaEventKey) => void;
  onOpenFlows: () => void;
  onOpenConnection: () => void;
}

const statusChip = (t: WaTemplateInfo) =>
  t.status === "APPROVED" ? chipGreen : t.status === "PENDING" || t.status === "IN_APPEAL" ? chipAmber : t.status === "REJECTED" ? chipRed : chipNeutral;

/** Body text with {{1}}-style placeholders highlighted. */
function BodyWithSlots({ text }: { text: string }) {
  const parts = text.split(/(\{\{\s*[^}\s]+\s*\}\})/g);
  return (
    <>
      {parts.map((p, i) => (/^\{\{/.test(p) ? <Slot key={i}>{p.replace(/\s+/g, "")}</Slot> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </>
  );
}

function ago(iso: string): string {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function WhatsappLibrary({
  templates,
  fetchedAt,
  loading,
  note,
  connected,
  mappings,
  onFetch,
  onAssign,
  onUnassign,
  onOpenFlows,
  onOpenConnection,
}: WhatsappLibraryProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [assignedNote, setAssignedNote] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const eventsUsing = (t: WaTemplateInfo) =>
    WA_EVENTS.filter((e) => {
      const m = mappings[e.key];
      return !!m && templateKey(m.templateName, m.language) === templateKey(t.name, t.language);
    });

  const all = useMemo(() => templates ?? [], [templates]);
  const counts = {
    all: all.length,
    usable: all.filter((t) => t.supported).length,
    inuse: all.filter((t) => eventsUsing(t).length > 0).length,
    unavailable: all.filter((t) => !t.supported).length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const using = (t: WaTemplateInfo) =>
      WA_EVENTS.some((e) => {
        const m = mappings[e.key];
        return !!m && templateKey(m.templateName, m.language) === templateKey(t.name, t.language);
      });
    return all.filter((t) => {
      if (filter === "usable" && !t.supported) return false;
      if (filter === "unavailable" && t.supported) return false;
      if (filter === "inuse" && !using(t)) return false;
      if (!q) return true;
      return `${t.name} ${t.language} ${t.category} ${t.bodyText}`.toLowerCase().includes(q);
    });
  }, [all, query, filter, mappings]);

  const selected = all.find((t) => templateKey(t.name, t.language) === selectedKey) ?? null;

  // Templates a flow is set to use that are not in the fetched list (e.g. deleted or not fetched yet).
  const missing = templates
    ? WA_EVENTS.filter((e) => {
        const m = mappings[e.key];
        return !!m && !all.some((t) => templateKey(t.name, t.language) === templateKey(m.templateName, m.language));
      })
    : [];

  function select(t: WaTemplateInfo) {
    setSelectedKey(templateKey(t.name, t.language));
    setAssignedNote(null);
    // When the list and preview are stacked (narrow screens) bring the preview into view.
    requestAnimationFrame(() => {
      const el = detailRef.current;
      if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const fetchButtons = (
    <div className="flex gap-2 shrink-0">
      <button type="button" onClick={() => onFetch(false)} disabled={loading !== null} className={secondaryBtn}>
        {loading === "fetch" ? "Fetching…" : templates ? "Refresh" : "Fetch templates"}
      </button>
      <button type="button" onClick={() => onFetch(true)} disabled={loading !== null} className={secondaryBtn}>
        {loading === "sync" ? "Syncing…" : "Sync from Meta & fetch"}
      </button>
    </div>
  );

  return (
    <div className="@container space-y-3" role="tabpanel" id="wa-panel-library" aria-labelledby="wa-tab-library">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="font-semibold text-[#111111] dark:text-white">Template library</div>
          <p className="text-[11px] text-[#666666] dark:text-neutral-400">
            Everything your CEOITBOX account has.
            {fetchedAt && <> Last fetched {ago(fetchedAt)}.</>} Click a template to preview it, then use it for a system alert.
          </p>
        </div>
        {fetchButtons}
      </div>

      {!connected && !templates && (
        <ResultBox warn>
          WhatsApp isn&apos;t connected yet. Enter your CEOITBOX credentials on the{" "}
          <button type="button" onClick={onOpenConnection} className="underline font-semibold">
            Connection tab
          </button>{" "}
          (you can fetch before saving).
        </ResultBox>
      )}
      {note && <ResultBox ok={note.ok && !note.warn} warn={note.ok && note.warn}>{note.text}</ResultBox>}

      {missing.length > 0 && (
        <ResultBox warn>
          {missing.map((e) => `${e.label} → “${mappings[e.key]!.templateName}”`).join("; ")} — not in the list above. It may have been
          deleted or renamed in CEOITBOX; choose another in Message flows.
        </ResultBox>
      )}

      {!templates ? (
        <div className="rounded-xl border border-dashed border-black/[0.12] dark:border-white/[0.15] p-8 text-center text-xs text-[#666666] dark:text-neutral-400">
          No templates loaded yet. Press <strong>Fetch templates</strong> to load them from CEOITBOX.
        </div>
      ) : (
        <div className="grid grid-cols-1 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 items-start">
          {/* List */}
          <div className="space-y-2.5 min-w-0">
            <div>
              <label className="sr-only" htmlFor="wa-library-search">Search templates</label>
              <input
                id="wa-library-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, language or text…"
                className={inputCls}
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter templates">
              {(
                [
                  ["all", "All"],
                  ["usable", "Usable"],
                  ["inuse", "In use"],
                  ["unavailable", "Unavailable"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    filter === id
                      ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white border-[#111111] dark:border-white"
                      : "border-black/[0.08] dark:border-white/[0.1] text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
                  }`}
                >
                  {label} ({counts[id]})
                </button>
              ))}
            </div>

            <ul className="cc-scroll max-h-[26rem] overflow-y-auto space-y-1.5 pr-1" aria-label="Templates">
              {visible.map((t, idx) => {
                const key = templateKey(t.name, t.language);
                const using = eventsUsing(t);
                const active = key === selectedKey;
                return (
                  <li key={key} className="cc-enter" style={{ "--i": Math.min(idx, 8) } as React.CSSProperties}>
                    <button
                      type="button"
                      onClick={() => select(t)}
                      aria-pressed={active}
                      className={`cc-press w-full text-left rounded-xl border p-3 transition-all duration-200 hover:-translate-y-px hover:shadow-md ${
                        active
                          ? "border-brand/60 dark:border-brand/70 bg-white/95 dark:bg-white/[0.1] shadow-md ring-1 ring-brand/20 dark:ring-brand/25"
                          : "border-black/[0.07] dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.04] hover:bg-white/90 dark:hover:bg-white/[0.08]"
                      } ${t.supported ? "" : "opacity-70"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-[#111111] dark:text-white break-all">{t.name}</span>
                        <Chip className={statusChip(t)}>{t.status}</Chip>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Chip className={chipNeutral}>{t.language}</Chip>
                        {t.category && <Chip className={chipNeutral}>{t.category}</Chip>}
                        {t.placeholders.length > 0 && <Chip className={chipNeutral}>{t.placeholders.length} variable{t.placeholders.length === 1 ? "" : "s"}</Chip>}
                        {using.map((e) => (
                          <Chip key={e.key} className={chipBlue}>In use · {e.label}</Chip>
                        ))}
                      </div>
                      <div className="mt-1.5 text-[11px] text-[#666666] dark:text-neutral-400 line-clamp-2 break-words">
                        {t.bodyText || "(no body text)"}
                      </div>
                      {!t.supported && <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">{t.unsupportedReason}</div>}
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && (
                <li className="py-8 text-center text-xs text-[#666666] dark:text-neutral-400">
                  {all.length === 0 ? "Your CEOITBOX account has no templates yet." : "No templates match."}
                </li>
              )}
            </ul>
          </div>

          {/* Preview + use */}
          <div ref={detailRef} className="min-w-0 scroll-mt-24 @3xl:sticky @3xl:top-4">
            {!selected ? (
              <div className="rounded-xl border border-dashed border-black/[0.12] dark:border-white/[0.15] p-8 text-center text-xs text-[#666666] dark:text-neutral-400">
                Select a template on the {`left`} to preview its content.
              </div>
            ) : (
              // Keyed by template so the preview animates in each time you pick a different one.
              <div key={selectedKey} className="cc-glass cc-enter p-4 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-semibold text-sm text-[#111111] dark:text-white break-all">{selected.name}</h3>
                    <Chip className={statusChip(selected)}>{selected.status}</Chip>
                    <Chip className={chipNeutral}>{selected.language}</Chip>
                    {selected.category && <Chip className={chipNeutral}>{selected.category}</Chip>}
                  </div>
                </div>

                <div>
                  <div className={labelCls}>Preview</div>
                  <MessageBubble header={selected.headerText} footer={selected.footerText} buttons={selected.buttons}>
                    <BodyWithSlots text={selected.bodyText || "(no body text)"} />
                  </MessageBubble>
                  {selected.headerFormat && selected.headerFormat !== "TEXT" && (
                    <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                      This template has a {selected.headerFormat.toLowerCase()} header, which is not shown here.
                    </p>
                  )}
                </div>

                {selected.placeholders.length > 0 && (
                  <div>
                    <div className={labelCls}>Variables</div>
                    <ul className="text-[11px] divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-lg border border-black/[0.06] dark:border-white/[0.08]">
                      {selected.placeholders.map((p, i) => (
                        <li key={p} className="flex items-center justify-between gap-3 px-3 py-1.5">
                          <Slot>{`{{${p}}}`}</Slot>
                          <span className="text-[#666666] dark:text-neutral-400 truncate">
                            {selected.bodyExamples[i] ? `e.g. ${selected.bodyExamples[i]}` : "no example given"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <div className={labelCls}>Use this template for</div>
                  {!selected.supported && (
                    <div className="mb-2">
                      <ResultBox warn>Can&apos;t be used for automatic alerts: {selected.unsupportedReason}.</ResultBox>
                    </div>
                  )}
                  <ul className="space-y-1.5">
                    {WA_EVENTS.map((ev) => {
                      const m = mappings[ev.key];
                      const usingThis = !!m && templateKey(m.templateName, m.language) === templateKey(selected.name, selected.language);
                      return (
                        <li key={ev.key} className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.06] dark:border-white/[0.08] px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#111111] dark:text-white">{ev.label}</div>
                            <div className="text-[10px] text-[#666666] dark:text-neutral-400 truncate">
                              {usingThis ? "Sending this template" : m ? `Currently: ${m.templateName}` : "Currently: message text"}
                            </div>
                          </div>
                          {usingThis ? (
                            <button type="button" onClick={() => { onUnassign(ev.key); setAssignedNote(null); }} className={secondaryBtn}>
                              Stop using
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!selected.supported}
                              onClick={() => {
                                onAssign(ev.key, selected);
                                setAssignedNote(ev.label);
                              }}
                              className="apple-btn-primary px-3.5 py-2 text-xs font-semibold disabled:opacity-40"
                            >
                              Use
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {assignedNote && (
                    <div className="mt-2">
                      <ResultBox ok>
                        Now used for <strong>{assignedNote}</strong>. Check its variables in{" "}
                        <button type="button" onClick={onOpenFlows} className="underline font-semibold">
                          Message flows
                        </button>
                        , then press Save.
                      </ResultBox>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
