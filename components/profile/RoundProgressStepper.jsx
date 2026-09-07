"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, Lock, XCircle, ExternalLink, Calendar, Video, AlertTriangle } from "lucide-react";
import TaskSubmissionDrawer from "./TaskSubmissionDrawer";

const statusConfigs = {
  cleared: {
    label: "PASSED",
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    icon: Check,
  },
  accepted: {
    label: "SELECTED",
    color: "text-emerald-400 border-emerald-500/50 bg-emerald-500/20",
    icon: Check,
  },
  in_review: {
    label: "IN REVIEW",
    color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
    icon: Clock,
  },
  submitted: {
    label: "SUBMITTED",
    color: "text-blue-400 border-blue-500/40 bg-blue-500/10",
    icon: Check,
  },
  pending_submission: {
    label: "ACTION REQUIRED",
    color: "text-emerald-400 border-emerald-500 bg-emerald-500/15 animate-pulse",
    icon: AlertTriangle,
  },
  scheduled: {
    label: "SCHEDULED",
    color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
    icon: Calendar,
  },
  rejected: {
    label: "NOT SELECTED",
    color: "text-rose-400 border-rose-500/40 bg-rose-500/10",
    icon: XCircle,
  },
  locked: {
    label: "LOCKED",
    color: "text-muted-foreground/60 border-border/40 bg-muted/20",
    icon: Lock,
  },
};

const stageNames = {
  round1: "01 · Screening",
  round2: "02 · Practical Task",
  round3: "03 · Interview",
};

export default function RoundProgressStepper({
  applicationId,
  departmentName,
  rounds,
  onTaskSubmitted,
  className,
}) {
  const roundList = [
    { key: "round1", ...rounds.round1 },
    { key: "round2", ...rounds.round2 },
    { key: "round3", ...rounds.round3 },
  ];

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-3", className)}>
      {roundList.map((round) => {
        const cfg = statusConfigs[round.status] || statusConfigs.locked;
        const Icon = cfg.icon;
        const isLocked = round.status === "locked";
        const isActionRequired = round.status === "pending_submission";
        const isSubmitted = round.status === "submitted";
        const isCleared = round.status === "cleared" || round.status === "accepted";
        const isScheduled = round.status === "scheduled";

        return (
          <div
            key={round.key}
            className={cn(
              "p-3.5 sm:p-4 border transition-all duration-200 bg-background/50 flex flex-col justify-between min-h-[105px]",
              isActionRequired
                ? "border-emerald-500/80 bg-emerald-500/5 shadow-[2px_2px_0px_#10B981]"
                : isSubmitted
                ? "border-blue-500/50 bg-blue-500/5 shadow-[2px_2px_0px_rgba(59,130,246,0.25)]"
                : isScheduled
                ? "border-cyan-500/50 bg-cyan-500/5 shadow-[2px_2px_0px_rgba(6,182,212,0.25)]"
                : isCleared
                ? "border-emerald-500/40 bg-emerald-500/5"
                : isLocked
                ? "border-border/40 bg-muted/10 opacity-50"
                : "border-border/70 bg-card/40"
            )}
          >
            {/* Header: Stage name & Status pill */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-semibold text-xs text-foreground/90 uppercase tracking-wide">
                {stageNames[round.key] || round.key}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider border shrink-0",
                  cfg.color
                )}
              >
                <Icon className="h-2.5 w-2.5 shrink-0" />
                <span>{cfg.label}</span>
              </span>
            </div>

            {/* Content: Only shown when active or relevant, avoiding clutter */}
            <div className="mt-2 text-xs font-mono">
              {/* Round 1 (Screening) */}
              {round.key === "round1" && (
                <div className="text-muted-foreground text-[11px]">
                  {round.status === "cleared" ? (
                    <span className="text-emerald-400 font-medium">Screening passed</span>
                  ) : round.status === "rejected" ? (
                    <span className="text-rose-400">Not shortlisted</span>
                  ) : (
                    <span>Application under review</span>
                  )}
                </div>
              )}

              {/* Round 2 (Task) */}
              {round.key === "round2" && (
                <div>
                  {isActionRequired && (
                    <div className="space-y-2 mt-1">
                      <div className="text-[11px] text-amber-400 font-medium truncate">
                        {round.taskPrompt || "Task Assigned"}
                      </div>
                      <TaskSubmissionDrawer
                        applicationId={applicationId}
                        departmentName={departmentName}
                        round2Data={round}
                        onSuccess={onTaskSubmitted}
                      />
                    </div>
                  )}

                  {round.status === "submitted" && (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center justify-between gap-2 border border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs font-mono">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">LINK:</span>
                        <a
                          href={round.submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 text-[11px] font-medium truncate max-w-[170px]"
                          title={round.submissionUrl}
                        >
                          <span className="truncate">{round.submissionUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                      <TaskSubmissionDrawer
                        applicationId={applicationId}
                        departmentName={departmentName}
                        round2Data={round}
                        onSuccess={onTaskSubmitted}
                      />
                    </div>
                  )}

                  {round.status === "cleared" && (
                    <span className="text-emerald-400 font-medium text-[11px]">
                      Task evaluated & passed
                    </span>
                  )}

                  {isLocked && (
                    <span className="text-muted-foreground/60 text-[11px]">
                      Unlocks after Round 1
                    </span>
                  )}
                </div>
              )}

              {/* Round 3 (Interview) */}
              {round.key === "round3" && (
                <div>
                  {round.status === "scheduled" && (
                    <div className="text-[11px] text-cyan-400 space-y-1">
                      <div>Slot: {round.slotTime}</div>
                      {round.venue && <div className="text-muted-foreground">{round.venue}</div>}
                      {round.meetLink && (
                        <a
                          href={round.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 underline font-bold text-cyan-300"
                        >
                          <Video className="h-3 w-3 shrink-0" />
                          <span>Join Meet</span>
                        </a>
                      )}
                    </div>
                  )}

                  {round.status === "accepted" && (
                    <span className="text-emerald-400 font-pixel text-[9px] uppercase">
                      🎉 Welcome to GDG!
                    </span>
                  )}

                  {round.status === "rejected" && (
                    <span className="text-rose-400 text-[11px]">Concluded</span>
                  )}

                  {isLocked && (
                    <span className="text-muted-foreground/60 text-[11px]">
                      Unlocks after Round 2
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
