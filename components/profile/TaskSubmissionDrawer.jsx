"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Send, Link as LinkIcon, AlertCircle, CheckCircle2, Clock, FileText, ExternalLink } from "lucide-react";
import { PixelButton } from "../design-system";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TaskSubmissionDrawer({
  applicationId,
  departmentName,
  round2Data,
  onSuccess,
  triggerText,
  triggerClassName,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(round2Data?.submissionUrl || "");
  const [notes, setNotes] = useState(round2Data?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAlreadySubmitted = Boolean(round2Data?.submissionUrl);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Please provide a valid deliverable URL");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Please enter a valid HTTP/HTTPS URL (e.g. https://github.com/...)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/submit-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          submissionUrl: trimmedUrl,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit task deliverable");
      }

      toast.success(
        isAlreadySubmitted
          ? "Deliverable URL updated successfully!"
          : "Round 2 Task submitted successfully!"
      );
      if (onSuccess) {
        onSuccess(data.round2Task);
      }
      setOpen(false);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children || (
          isAlreadySubmitted ? (
            <button
              type="button"
              className={cn(
                "w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold border border-border/80 bg-muted/30 hover:bg-muted/70 hover:border-emerald-500/60 text-foreground transition-all duration-150 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.3)]",
                triggerClassName
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{triggerText || "Update Submission"}</span>
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                "w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-bold border-2 border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all duration-150 cursor-pointer shadow-[2px_2px_0px_#10B981]",
                triggerClassName
              )}
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span>{triggerText || "Submit Task Deliverable"}</span>
            </button>
          )
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border-2 border-border bg-card p-6 shadow-[6px_6px_0px_#10B981] dark:bg-zinc-950 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] focus:outline-none">
          {/* CRT Scanline */}
          <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-25" />

          <div className="relative z-20">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-emerald-500 uppercase tracking-wider">
                    ROUND 02 // TASK SUBMISSION
                  </span>
                  <span className="border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {departmentName}
                  </span>
                </div>
                <Dialog.Title className="font-sans font-bold text-lg text-foreground mt-1">
                  {round2Data?.taskPrompt || "Practical Domain Challenge"}
                </Dialog.Title>
              </div>

              <Dialog.Close asChild>
                <button
                  aria-label="Close dialog"
                  className="rounded-none border border-border/80 p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Task Prompt Overview */}
            <div className="border border-border/60 bg-muted/40 p-3.5 mb-4 text-xs font-mono space-y-2">
              <p className="text-foreground/90 font-sans text-xs leading-relaxed">
                {round2Data?.description || "Please submit your completed project repository, design link, or documentation below for evaluation."}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span>Deadline: <strong>{round2Data?.deadline || "48 Hours"}</strong></span>
                </span>
                {round2Data?.deliverableTypes && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-blue-500" />
                    <span>Deliverable: <strong>{round2Data.deliverableTypes.join(", ")}</strong></span>
                  </span>
                )}
              </div>
              {round2Data?.taskDocumentUrl && (
                <div className="pt-2 border-t border-border/40">
                  <a
                    href={round2Data.taskDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>{round2Data.taskDocumentTitle || "Open Task Brief & Materials (Google Drive)"}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 border border-rose-500/50 bg-rose-500/10 p-2.5 text-xs text-rose-400 font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-foreground mb-1">
                  Deliverable URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <LinkIcon className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/username/project or https://figma.com/file/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-none border-2 border-border/80 bg-background/90 py-2 pl-9 pr-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] font-mono text-muted-foreground">
                  Ensure public or view access is granted for evaluation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-foreground mb-1">
                  Architecture Notes / Comments (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  placeholder="Briefly describe your stack, setup instructions, or key design decisions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-none border-2 border-border/80 bg-background/90 p-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {isAlreadySubmitted && round2Data?.submittedAt && (
                <div className="text-[11px] font-mono text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 p-2">
                  ✓ Current submission recorded at: {new Date(round2Data.submittedAt).toLocaleString()}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-mono font-semibold border border-border/80 bg-muted/40 hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                </Dialog.Close>
                <PixelButton
                  type="submit"
                  variant="arcade"
                  size="sm"
                  disabled={loading}
                  className="font-mono text-xs font-bold"
                >
                  {loading ? "TRANSMITTING..." : isAlreadySubmitted ? "UPDATE SUBMISSION" : "CONFIRM SUBMISSION"}
                </PixelButton>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
