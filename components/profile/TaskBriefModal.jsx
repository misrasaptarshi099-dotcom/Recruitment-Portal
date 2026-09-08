"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  FileText,
  ExternalLink,
  Clock,
  X,
} from "lucide-react";

function formatDueDate(val) {
  if (!val) return "";
  try {
    if (!val.includes("T") && isNaN(Date.parse(val))) {
      return val;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const datePart = d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${datePart} · ${timePart}`;
  } catch {
    return val;
  }
}

export default function TaskBriefModal({
  departmentName,
  round2Data,
  children,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children || (
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono font-medium border border-border/80 bg-muted/40 hover:bg-muted/80 hover:border-border text-foreground transition-all duration-150 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.2)] hover:shadow-none"
          >
            <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>View Task Given</span>
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border-2 border-border bg-card p-6 shadow-[6px_6px_0px_#3B82F6] dark:bg-zinc-950 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] focus:outline-none">
          {/* CRT Scanline */}
          <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-25" />

          <div className="relative z-20">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-blue-400 uppercase tracking-wider">
                    ROUND 02 // TASK BRIEF & DETAILS
                  </span>
                  {departmentName && (
                    <span className="border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {departmentName}
                    </span>
                  )}
                </div>
                <Dialog.Title className="font-sans font-bold text-lg text-foreground mt-1">
                  {round2Data?.taskPrompt || "Practical Domain Challenge"}
                </Dialog.Title>
              </div>

              <Dialog.Close asChild>
                <button
                  aria-label="Close dialog"
                  className="rounded-none border border-border/80 p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Task Prompt Overview (styled exactly as requested) */}
            <div className="border border-border/60 bg-muted/40 p-4 mb-4 text-xs font-mono space-y-3">
              <p className="text-foreground/90 font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {round2Data?.description ||
                  "Please complete your practical task deliverables according to the prompt above and submit your repository or live link for evaluation."}
              </p>

              <div className="space-y-2 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                {round2Data?.deadline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>
                      Deadline: <strong className="text-foreground">{formatDueDate(round2Data.deadline)}</strong>
                    </span>
                  </div>
                )}

                {round2Data?.deliverableTypes && round2Data.deliverableTypes.length > 0 && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      Deliverable: <strong className="text-foreground">{round2Data.deliverableTypes.join(", ")}</strong>
                    </span>
                  </div>
                )}
              </div>

              {round2Data?.taskDocumentUrl && (
                <div className="pt-2 border-t border-border/40">
                  <a
                    href={round2Data.taskDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>{round2Data.taskDocumentTitle || "Open Task Brief & Materials (Google Drive)"}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-mono border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
