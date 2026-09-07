"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FileText, ExternalLink, Calendar, CheckSquare } from "lucide-react";
import { PixelButton } from "../design-system";

function formatUrlText(text) {
  if (!text) return text;
  // If the answer is a URL, make it an active clickable link
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-1.5 break-all"
      >
        <span>{trimmed}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }
  return <span className="whitespace-pre-wrap leading-relaxed">{text}</span>;
}

export default function ApplicationAnswersModal({
  departmentName,
  submittedAt,
  answers = [],
  applicationId,
  children,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold border border-border/80 bg-muted/40 hover:bg-muted/80 hover:border-emerald-500/60 text-foreground transition-all duration-150 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.3)]"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>View Answers</span>
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl max-h-[85vh] translate-x-[-50%] translate-y-[-50%] border-2 border-border bg-card p-6 shadow-[6px_6px_0px_#10B981] dark:bg-zinc-950 flex flex-col duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] focus:outline-none">
          {/* CRT Scanline */}
          <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-20" />

          <div className="relative z-20 flex flex-col min-h-0 flex-1">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-3 mb-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[9px] text-emerald-400 uppercase tracking-wider">
                    APPLICATION RECORD
                  </span>
                  <span className="border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {departmentName}
                  </span>
                </div>
                <Dialog.Title className="font-sans font-bold text-xl text-foreground">
                  Submitted Questionnaire Answers
                </Dialog.Title>
                <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-emerald-400" />
                    <span>Submitted: {new Date(submittedAt).toLocaleDateString()}</span>
                  </span>
                  {applicationId && (
                    <span className="hidden sm:inline">· ID: {applicationId}</span>
                  )}
                </div>
              </div>

              <Dialog.Close asChild>
                <button
                  aria-label="Close"
                  className="border border-border/80 p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Questions & Answers Scroll Area */}
            <div className="overflow-y-auto pr-2 space-y-4 flex-1 text-xs font-mono">
              {answers.length === 0 ? (
                <div className="border border-dashed border-border/70 p-6 text-center text-muted-foreground space-y-1">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-sans font-semibold text-foreground text-sm">
                    No Written Questions Recorded
                  </p>
                  <p className="text-[11px]">
                    This application was registered without specific long-form questionnaire entries.
                  </p>
                </div>
              ) : (
                answers.map((item, index) => (
                  <div
                    key={item.key || index}
                    className="border border-border/70 bg-muted/25 p-4 space-y-2.5"
                  >
                    {/* Question Header */}
                    <div className="flex items-start gap-2">
                      <span className="font-pixel text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 shrink-0 mt-0.5">
                        Q{String(index + 1).padStart(2, "0")}
                      </span>
                      <h4 className="font-sans font-bold text-sm text-foreground/95 leading-snug">
                        {item.question}
                      </h4>
                    </div>

                    {/* Candidate Answer Box */}
                    <div className="border-l-2 border-emerald-500/50 bg-background/80 p-3 text-foreground/90 text-xs font-sans">
                      {formatUrlText(item.answer)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-border/50 flex items-center justify-between shrink-0 mt-3">
              <span className="font-mono text-[11px] text-muted-foreground">
                Total Questions: <strong className="text-foreground">{answers.length}</strong>
              </span>
              <Dialog.Close asChild>
                <PixelButton variant="arcade" size="sm" className="font-mono text-xs cursor-pointer">
                  CLOSE DOSSIER
                </PixelButton>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
