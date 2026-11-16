"use client";

import React, { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  Download,
  Copy,
  ExternalLink,
  Eye,
  X,
  Check,
} from "lucide-react";
import { TaskAttachment } from "@/types/database.types";
import { toast } from "sonner";

interface AttachmentViewerProps {
  attachments: TaskAttachment[];
  className?: string;
}

export function AttachmentViewer({ attachments, className = "" }: AttachmentViewerProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<TaskAttachment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg"].includes(ext || "")) return <ImageIcon size={18} className="text-[#2357D6]" />;
    if (ext === "pdf") return <FileText size={18} className="text-rose-500" />;
    if (["xlsx", "xls", "csv"].includes(ext || "")) return <FileSpreadsheet size={18} className="text-emerald-600" />;
    if (ext === "zip") return <FileArchive size={18} className="text-amber-500" />;
    return <FileText size={18} className="text-slate-500" />;
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link Copied to Clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className={`p-4 border border-dashed border-slate-200/80 rounded-2xl text-center text-xs text-slate-400 bg-white/40 ${className}`}>
        No deliverables attached yet.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((att) => {
          const isImage = ["png", "jpg", "jpeg"].includes(
            att.file_name.split(".").pop()?.toLowerCase() || ""
          );

          return (
            <div
              key={att.id}
              className="glass-card rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs border border-white/80 dark:border-white/15 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#162552] shadow-2xs border border-slate-100 dark:border-white/15 flex items-center justify-center shrink-0">
                  {getIcon(att.file_name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0C132B] dark:text-white truncate" title={att.file_name}>
                    {att.file_name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-[#BFD7EE] font-medium">
                    {att.file_size_bytes ? `${(att.file_size_bytes / 1024).toFixed(0)} KB` : "Document"} •{" "}
                    {new Date(att.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isImage && (
                  <button
                    onClick={() => setSelectedAttachment(att)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-[#BFD7EE] hover:text-[#0C132B] dark:hover:text-white transition-colors"
                    title="Inspect Proof"
                  >
                    <Eye size={14} />
                  </button>
                )}

                <button
                  onClick={() => handleCopy(att.file_url, att.id)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-[#BFD7EE] hover:text-[#0C132B] dark:hover:text-white transition-colors"
                  title="Copy deliverable link"
                >
                  {copiedId === att.id ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
                </button>

                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-[#BFD7EE] hover:text-[#2357D6] dark:hover:text-[#60A5FA] transition-colors"
                  title="Open deliverable in new tab"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Proof Lightbox Modal */}
      {selectedAttachment && (
        <div className="fixed inset-0 z-50 bg-[#0C132B]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel bg-white/95 dark:bg-[#111A38] backdrop-blur-2xl rounded-3xl max-w-3xl w-full p-5 shadow-2xl relative flex flex-col max-h-[90vh] border border-white/80 dark:border-white/15">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon size={18} className="text-[#2357D6] dark:text-[#60A5FA]" />
                <h4 className="text-xs font-bold text-[#0C132B] dark:text-white truncate">
                  {selectedAttachment.file_name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedAttachment(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-[#BFD7EE] hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-[#070B18] rounded-2xl p-2 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedAttachment.file_url}
                alt={selectedAttachment.file_name}
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>

            <div className="pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-[#BFD7EE]">
              <span className="font-mono text-[11px] truncate max-w-md">Cloudinary: {selectedAttachment.cloudinary_public_id}</span>
              <a
                href={selectedAttachment.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#2357D6] dark:text-[#60A5FA] hover:underline"
              >
                <span>Download Original</span>
                <Download size={13} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

