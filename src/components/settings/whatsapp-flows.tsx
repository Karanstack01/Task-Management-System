"use client";

import React, { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { WaTemplateInfo } from "@/lib/whatsapp/ceoitbox-client";
import {
  DEFAULT_MESSAGES,
  WA_EVENTS,
  WA_EVENT_FIELDS,
  formatTagList,
  parseTagList,
  renderMessageTags,
  sampleDataFor,
  tagText,
  templateKey,
  unknownTagsInMessage,
  type WaDataKey,
  type WaEventKey,
  type WaMessageTemplates,
  type WaTemplateMapping,
  type WaTemplateMappings,
} from "@/lib/whatsapp/template-config";
import {
  Chip,
  MessageBubble,
  ResultBox,
  Slot,
  chipBlue,
  chipGreen,
  chipNeutral,
  inputCls,
  labelCls,
  secondaryBtn,
} from "./integration-ui";

export interface WhatsappFlowsProps {
  library: WaTemplateInfo[] | null;
  mappings: WaTemplateMappings;
  messages: WaMessageTemplates;
  testMobile: string;
  onTestMobile: (value: string) => void;
  onChooseTemplate: (event: WaEventKey, key: string) => void;
  onSetVariables: (event: WaEventKey, keys: WaDataKey[]) => void;
  onMessageChange: (event: WaEventKey, text: string) => void;
  onTestTemplate: (event: WaEventKey) => void;
  onTestMessage: (event: WaEventKey) => void;
  /** `${"template" | "message"}:${event}` while a test is being sent. */
  testing: string | null;
  results: Partial<Record<string, { ok: boolean; text: string }>>;
  connected: boolean;
  onOpenLibrary: () => void;
  onOpenConnection: () => void;
}

/** What an alert is sending right now: template > custom message > built-in message. */
function currentSource(mapping: WaTemplateMapping | undefined, custom: string | undefined) {
  if (mapping) return { kind: "template" as const, label: `Template · ${mapping.templateName} (${mapping.language})`, chip: chipGreen };
  if (custom?.trim()) return { kind: "custom" as const, label: "Custom message", chip: chipBlue };
  return { kind: "default" as const, label: "Built-in message", chip: chipNeutral };
}

export function WhatsappFlows(props: WhatsappFlowsProps) {
  const { library, mappings, messages, testing, results } = props;
  const [open, setOpen] = useState<WaEventKey | null>("TASK_ASSIGNED");
  const [tagDraft, setTagDraft] = useState<Partial<Record<WaEventKey, string>>>({});
  const textareas = useRef<Partial<Record<WaEventKey, HTMLTextAreaElement | null>>>({});

  const workingCount = WA_EVENTS.filter((e) => !!mappings[e.key]).length;

  // ---- tag list (template variables, in order) ----
  function checkTags(event: WaEventKey, text: string, info: WaTemplateInfo | undefined, fallbackCount: number) {
    const parsed = parseTagList(text, event);
    const expected = info ? info.placeholders.length : fallbackCount;
    let problem: string | null = null;
    if (parsed.unknown.length) {
      problem = `Not available for this alert: ${parsed.unknown.map((u) => `<<${u}>>`).join(", ")}.`;
    } else if (parsed.keys.length !== expected) {
      problem = `This template has ${expected} variable${expected === 1 ? "" : "s"} but ${parsed.keys.length} tag${parsed.keys.length === 1 ? " is" : "s are"} listed — not applied yet.`;
    }
    return { keys: parsed.keys, problem };
  }

  function editTags(event: WaEventKey, text: string, info: WaTemplateInfo | undefined, fallbackCount: number) {
    setTagDraft((d) => ({ ...d, [event]: text }));
    const r = checkTags(event, text, info, fallbackCount);
    if (!r.problem) props.onSetVariables(event, r.keys);
  }

  // ---- message text ----
  function insertIntoMessage(event: WaEventKey, key: WaDataKey) {
    const ta = textareas.current[event];
    const current = messages[event] ?? "";
    const tag = tagText(key);
    if (!ta) {
      props.onMessageChange(event, current + tag);
      return;
    }
    const start = ta.selectionStart ?? current.length;
    const end = ta.selectionEnd ?? current.length;
    props.onMessageChange(event, current.slice(0, start) + tag + current.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  return (
    <div className="space-y-3" role="tabpanel" id="wa-panel-flows" aria-labelledby="wa-tab-flows">
      <div>
        <div className="font-semibold text-[#111111] dark:text-white">Message flows</div>
        <p className="text-[11px] text-[#666666] dark:text-neutral-400">
          What each system alert sends. An alert uses its <strong>template</strong> if one is chosen, otherwise its{" "}
          <strong>message text</strong>; if a template is rejected the message text is sent instead. Use{" "}
          <code>&lt;&lt;Tags&gt;&gt;</code> to insert task details.
        </p>
      </div>

      {!props.connected && (
        <ResultBox warn>
          WhatsApp isn&apos;t connected yet — alerts are only simulated.{" "}
          <button type="button" onClick={props.onOpenConnection} className="underline font-semibold">
            Open Connection
          </button>
        </ResultBox>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div className="max-w-xs w-full">
          <label className={labelCls} htmlFor="wa-flows-test-mobile">Test mobile number (for “Send test”)</label>
          <input
            id="wa-flows-test-mobile"
            type="tel"
            value={props.testMobile}
            onChange={(e) => props.onTestMobile(e.target.value)}
            placeholder="919876543210"
            className={inputCls}
          />
        </div>
        <div className="text-[11px] text-[#666666] dark:text-neutral-400 sm:text-right">
          {workingCount} of {WA_EVENTS.length} alerts use a template ·{" "}
          {library ? `${library.length} in library` : "library not loaded"} ·{" "}
          <button type="button" onClick={props.onOpenLibrary} className="underline font-semibold">
            Open library
          </button>
        </div>
      </div>

      <ul className="cc-glass-soft cc-divide overflow-hidden">
        {WA_EVENTS.map((ev, evIndex) => {
          const mapping = mappings[ev.key];
          const custom = messages[ev.key];
          const source = currentSource(mapping, custom);
          const isOpen = open === ev.key;
          const info = mapping && library ? library.find((t) => templateKey(t.name, t.language) === templateKey(mapping.templateName, mapping.language)) : undefined;
          const fields = WA_EVENT_FIELDS[ev.key];
          const sample = sampleDataFor(ev.key);

          const effectiveText = custom?.trim() ? custom : DEFAULT_MESSAGES[ev.key];
          const firstLine = mapping
            ? (info?.bodyText ?? mapping.bodyPreview ?? "").split("\n")[0]
            : renderMessageTags(effectiveText, sample).split("\n")[0];

          // template tag editor state
          const tagValue = tagDraft[ev.key] ?? (mapping ? formatTagList(mapping.variables) : "");
          const tagCheck = mapping ? checkTags(ev.key, tagValue, info, mapping.variables.length) : null;

          const unknownInMessage = custom ? unknownTagsInMessage(custom, ev.key) : [];

          return (
            <li
              key={ev.key}
              className={`cc-enter overflow-hidden transition-colors duration-200 ${isOpen ? "bg-[var(--cc-soft)]" : ""}`}
              style={{ "--i": evIndex } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : ev.key)}
                aria-expanded={isOpen}
                aria-controls={`flow-${ev.key}`}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/50 dark:hover:bg-white/[0.05] transition-colors duration-200"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#111111] dark:text-white">{ev.label}</span>
                    <Chip className={source.chip}>{source.label}</Chip>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#666666] dark:text-neutral-400 truncate">{firstLine || ev.description}</div>
                </div>
                <ChevronRight className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div id={`flow-${ev.key}`} className="cc-fade px-4 pb-4 pt-3 space-y-5 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <p className="text-[11px] text-[#666666] dark:text-neutral-400">{ev.description}</p>

                  {/* A. official template */}
                  <section className="space-y-2.5" aria-label="Official template">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-[#111111] dark:text-white">1. Official WhatsApp template</div>
                      {mapping && (
                        <button type="button" onClick={props.onOpenLibrary} className="text-[11px] underline font-semibold text-[#111111] dark:text-white">
                          View in library
                        </button>
                      )}
                    </div>

                    <select
                      value={mapping ? templateKey(mapping.templateName, mapping.language) : ""}
                      onChange={(e) => {
                        setTagDraft((d) => ({ ...d, [ev.key]: undefined }));
                        props.onChooseTemplate(ev.key, e.target.value);
                      }}
                      className="w-full px-3 py-2 apple-input rounded-xl text-xs"
                      aria-label={`Template for ${ev.label}`}
                    >
                      <option value="">No template — send the message text below</option>
                      {mapping && !info && (
                        <option value={templateKey(mapping.templateName, mapping.language)}>
                          {mapping.templateName} ({mapping.language}) — saved
                        </option>
                      )}
                      {(library ?? []).map((t) => (
                        <option key={templateKey(t.name, t.language)} value={templateKey(t.name, t.language)} disabled={!t.supported}>
                          {t.name} ({t.language}){t.supported ? "" : ` — unavailable: ${t.unsupportedReason}`}
                        </option>
                      ))}
                    </select>
                    {!library && (
                      <p className="text-[11px] text-[#666666] dark:text-neutral-400">
                        No templates loaded.{" "}
                        <button type="button" onClick={props.onOpenLibrary} className="underline font-semibold">Open the library</button> to fetch them.
                      </p>
                    )}

                    {mapping && (
                      <>
                        <MessageBubble header={info?.headerText} footer={info?.footerText} buttons={info?.buttons}>
                          {(info?.bodyText ?? mapping.bodyPreview ?? "").split(/(\{\{\s*\d+\s*\}\})/g).map((part, i) => {
                            const m = part.match(/^\{\{\s*(\d+)\s*\}\}$/);
                            if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
                            const k = mapping.variables[Number(m[1]) - 1];
                            return <Slot key={i}>{k ? tagText(k) : part}</Slot>;
                          })}
                        </MessageBubble>

                        <div>
                          <label className={labelCls} htmlFor={`tags-${ev.key}`}>
                            Tags, in order — fill {mapping.variables.map((_, i) => `{{${i + 1}}}`).join(", ") || "the variables"}
                          </label>
                          <input
                            id={`tags-${ev.key}`}
                            type="text"
                            value={tagValue}
                            onChange={(e) => editTags(ev.key, e.target.value, info, mapping.variables.length)}
                            onBlur={() => { if (tagCheck && !tagCheck.problem) setTagDraft((d) => ({ ...d, [ev.key]: undefined })); }}
                            placeholder="<<Task No>>, <<Task Title>>"
                            className={`${inputCls} font-mono`}
                            aria-invalid={!!tagCheck?.problem}
                          />
                          <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Available tags">
                            {fields.map((f) => (
                              <button
                                key={f}
                                type="button"
                                title={`Add ${tagText(f)} (e.g. ${sample[f]})`}
                                onClick={() => editTags(ev.key, (tagValue.replace(/[,\s]+$/, "") + (tagValue.trim() ? ", " : "")) + tagText(f), info, mapping.variables.length)}
                                className="px-2 py-1 rounded-md text-[10px] font-semibold border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                              >
                                {tagText(f)}
                              </button>
                            ))}
                          </div>
                          {tagCheck?.problem && <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400" role="alert">{tagCheck.problem}</p>}
                          {!tagCheck?.problem && mapping.variables.length > 0 && (
                            <p className="mt-1.5 text-[11px] text-[#666666] dark:text-neutral-400">
                              {mapping.variables.map((k, i) => `{{${i + 1}}} → ${tagText(k)}`).join("   ·   ")}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => props.onTestTemplate(ev.key)} disabled={testing !== null} className={secondaryBtn}>
                            {testing === `template:${ev.key}` ? "Sending…" : "Send test template"}
                          </button>
                          <span className="text-[10px] text-[#666666] dark:text-neutral-400">Uses sample values. Save afterwards to apply.</span>
                        </div>
                        {results[`template:${ev.key}`] && <ResultBox ok={results[`template:${ev.key}`]!.ok}>{results[`template:${ev.key}`]!.text}</ResultBox>}
                      </>
                    )}
                  </section>

                  {/* B. message text */}
                  <section className="space-y-2.5" aria-label="Message text">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-[#111111] dark:text-white">
                        2. Message text <span className="font-normal text-[#666666] dark:text-neutral-400">— {mapping ? "used if the template is rejected" : "sent for this alert"}</span>
                      </div>
                      <Chip className={custom?.trim() ? chipBlue : chipNeutral}>{custom?.trim() ? "Custom" : "Built-in"}</Chip>
                    </div>

                    <div>
                      <label className="sr-only" htmlFor={`msg-${ev.key}`}>Message text for {ev.label}</label>
                      <textarea
                        id={`msg-${ev.key}`}
                        ref={(el) => { textareas.current[ev.key] = el; }}
                        rows={6}
                        value={custom ?? ""}
                        onChange={(e) => props.onMessageChange(ev.key, e.target.value)}
                        placeholder={DEFAULT_MESSAGES[ev.key]}
                        className={`${inputCls} font-mono leading-relaxed`}
                      />
                      <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Insert a tag">
                        {fields.map((f) => (
                          <button
                            key={f}
                            type="button"
                            title={`Insert ${tagText(f)} (e.g. ${sample[f]})`}
                            onClick={() => insertIntoMessage(ev.key, f)}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                          >
                            {tagText(f)}
                          </button>
                        ))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                        <button type="button" onClick={() => props.onMessageChange(ev.key, DEFAULT_MESSAGES[ev.key])} className="underline font-semibold">
                          Start from the built-in text
                        </button>
                        {custom?.trim() && (
                          <button type="button" onClick={() => props.onMessageChange(ev.key, "")} className="underline font-semibold">
                            Reset to built-in
                          </button>
                        )}
                      </div>
                      {unknownInMessage.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400" role="alert">
                          Not available for this alert (will be sent as written): {unknownInMessage.map((u) => `<<${u}>>`).join(", ")}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className={labelCls}>Preview (sample values)</div>
                      <MessageBubble>{renderMessageTags(effectiveText, sample)}</MessageBubble>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => props.onTestMessage(ev.key)} disabled={testing !== null} className={secondaryBtn}>
                        {testing === `message:${ev.key}` ? "Sending…" : "Send test message"}
                      </button>
                      <span className="text-[10px] text-[#666666] dark:text-neutral-400">Plain text only reaches numbers that messaged you in the last 24h.</span>
                    </div>
                    {results[`message:${ev.key}`] && <ResultBox ok={results[`message:${ev.key}`]!.ok}>{results[`message:${ev.key}`]!.text}</ResultBox>}
                  </section>

                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
