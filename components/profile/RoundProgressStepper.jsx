"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Check,
  Clock,
  Lock,
  XCircle,
  ExternalLink,
  Calendar,
  Video,
  AlertTriangle,
  ChevronRight,
  FileText,
  Send,
} from "lucide-react";
import TaskSubmissionDrawer from "./TaskSubmissionDrawer";
import TaskBriefModal from "./TaskBriefModal";
import InterviewSlotPickerModal from "./InterviewSlotPickerModal";

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
  awaiting_schedule: {
    label: "AWAITING SLOT",
    color: "text-cyan-400 border-cyan-500/60 bg-cyan-500/15 animate-pulse",
    icon: Calendar,
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

function formatDueDate(val, dateOnly = false) {
  if (!val) return "";
  try {
    if (!val.includes("T") && isNaN(Date.parse(val))) {
      return val;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    if (dateOnly) {
      return d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
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

function cleanDisplayUrl(url) {
  if (!url) return "";
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export default function RoundProgressStepper({
  applicationId,
  departmentName,
  rounds,
  onTaskSubmitted,
  onSlotBooked,
  className,
}) {
  const [slotModalOpen, setSlotModalOpen] = useState(false);

  const roundList = [
    { key: "round1", ...rounds?.round1 },
    { key: "round2", ...rounds?.round2 },
    { key: "round3", ...rounds?.round3 },
  ];

  return (
    <>
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-3", className)}>
        {roundList.map((round) => {
          const isDeadlinePassed = Boolean(
            round.isDeadlinePassed ||
            (round.deadline && !isNaN(Date.parse(round.deadline)) && Date.now() > new Date(round.deadline).getTime())
          );
          const isLocked = round.status === "locked";
          const isActionRequired = round.status === "pending_submission";
          const isSubmitted = round.status === "submitted";
          const isCleared = round.status === "cleared" || round.status === "accepted";
          const isScheduled = round.status === "scheduled";
          const isAwaitingSlot = round.status === "awaiting_schedule";

          let cfg = statusConfigs[round.status] || statusConfigs.locked;
          if (round.key === "round2" && isActionRequired && isDeadlinePassed) {
            cfg = {
              label: "CLOSED",
              color: "text-rose-400 border-rose-500/40 bg-rose-500/10",
              icon: Lock,
            };
          }
          const Icon = cfg.icon;

          return (
            <div
              key={round.key}
              className={cn(
                "p-3.5 sm:p-4 border transition-all duration-200 bg-background/50 flex flex-col justify-between min-h-[120px] rounded-none",
                isActionRequired && !isDeadlinePassed
                  ? "border-emerald-500/80 bg-emerald-500/5 shadow-[2px_2px_0px_#10B981]"
                  : isActionRequired && isDeadlinePassed
                  ? "border-rose-500/40 bg-rose-500/5 shadow-[2px_2px_0px_rgba(244,63,94,0.15)]"
                  : isSubmitted
                  ? "border-blue-500/50 bg-blue-500/5 shadow-[2px_2px_0px_rgba(59,130,246,0.25)]"
                  : isAwaitingSlot
                  ? "border-cyan-500/80 bg-cyan-500/5 shadow-[2px_2px_0px_#06B6D4]"
                  : isScheduled
                  ? "border-cyan-500/50 bg-cyan-500/5 shadow-[2px_2px_0px_rgba(6,182,212,0.25)]"
                  : isCleared
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : isLocked
                  ? "border-border/40 bg-muted/10 opacity-60"
                  : "border-border/70 bg-card/40"
              )}
            >
              {/* Card Header: Stage name & Status pill */}
              <div className="flex items-center justify-between gap-2 shrink-0">
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

              {/* Card Body */}
              <div className="my-2.5 text-xs font-mono flex-1 flex flex-col justify-center">
                {/* Stage 01: Screening */}
                {round.key === "round1" && (
                  <div className="space-y-1">
                    {round.status === "cleared" ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>Screening Cleared</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70">
                          Application verified & approved
                        </p>
                      </>
                    ) : round.status === "rejected" ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400">
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Not Shortlisted</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70">
                          Application not moving forward
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Application Under Review</span>
                        </div>
                        {round.deadline ? (
                          <p className="text-[10px] text-muted-foreground/70">
                            Deadline: {formatDueDate(round.deadline, true)}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/70">
                            Evaluation in progress
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Stage 02: Practical Task */}
                {round.key === "round2" && (
                  <div className="flex-1 flex flex-col justify-between">
                    {isActionRequired && (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div
                            className="font-sans font-semibold text-xs text-foreground truncate"
                            title={round.taskPrompt || "Practical Domain Challenge"}
                          >
                            {round.taskPrompt || "Practical Domain Challenge"}
                          </div>
                          {round.deadline && (
                            <div className={cn(
                              "flex items-center gap-1 text-[10px]",
                              isDeadlinePassed ? "text-rose-400 font-semibold" : "text-muted-foreground/80"
                            )}>
                              <Clock className={cn("h-3 w-3 shrink-0", isDeadlinePassed ? "text-rose-400" : "text-amber-400")} />
                              <span>{isDeadlinePassed ? "Deadline Expired: " : "Due: "}{formatDueDate(round.deadline)}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-border/40">
                          <TaskBriefModal
                            departmentName={departmentName}
                            round2Data={round}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-mono font-medium border border-border/80 bg-muted/40 hover:bg-muted/80 hover:border-border text-foreground transition-all duration-150 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:shadow-none truncate"
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">View Task Given</span>
                            </button>
                          </TaskBriefModal>

                          {isDeadlinePassed ? (
                            <div
                              className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-mono font-semibold border border-rose-500/40 bg-rose-500/10 text-rose-400 select-none truncate shadow-[2px_2px_0px_rgba(244,63,94,0.15)]"
                              title="The deadline has expired. Submissions are closed."
                            >
                              <Lock className="h-3 w-3 text-rose-400 shrink-0" />
                              <span className="truncate"><span className="hidden sm:inline">Submissions </span>Closed</span>
                            </div>
                          ) : (
                            <TaskSubmissionDrawer
                              applicationId={applicationId}
                              departmentName={departmentName}
                              round2Data={round}
                              onSuccess={onTaskSubmitted}
                              triggerText="Submit Task"
                              triggerClassName="px-2 py-1.5 text-[11px] shadow-[2px_2px_0px_#10B981] hover:shadow-none"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {round.status === "submitted" && (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div
                            className="font-sans font-semibold text-xs text-foreground truncate"
                            title={round.taskPrompt || "Practical Domain Challenge"}
                          >
                            {round.taskPrompt || "Practical Domain Challenge"}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 truncate">
                            <span className="text-[8px] uppercase font-pixel text-blue-400 shrink-0">
                              SUBMITTED:
                            </span>
                            <a
                              href={round.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground hover:text-blue-400 hover:underline truncate inline-flex items-center gap-1 font-mono text-[10px]"
                              title={round.submissionUrl}
                            >
                              <span className="truncate">{cleanDisplayUrl(round.submissionUrl)}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                            </a>
                          </div>
                          {round.deadline && (
                            <div className={cn(
                              "flex items-center gap-1 text-[10px]",
                              isDeadlinePassed ? "text-muted-foreground/70" : "text-muted-foreground/80"
                            )}>
                              <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                              <span>{isDeadlinePassed ? "Deadline Passed: " : "Deadline: "}{formatDueDate(round.deadline)}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons for Submitted State */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-border/40">
                          <TaskBriefModal
                            departmentName={departmentName}
                            round2Data={round}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-mono font-medium border border-border/80 bg-muted/40 hover:bg-muted/80 hover:border-border text-foreground transition-all duration-150 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:shadow-none truncate"
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">View Task Given</span>
                            </button>
                          </TaskBriefModal>

                          {isDeadlinePassed ? (
                            <div
                              className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-mono font-semibold border border-border/70 bg-muted/20 text-muted-foreground/80 select-none truncate"
                              title="Deadline has passed. Further updates are closed."
                            >
                              <Lock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                              <span className="truncate"><span className="hidden sm:inline">Submissions </span>Closed</span>
                            </div>
                          ) : (
                            <TaskSubmissionDrawer
                              applicationId={applicationId}
                              departmentName={departmentName}
                              round2Data={round}
                              onSuccess={onTaskSubmitted}
                              triggerText="Update Task"
                              triggerClassName="px-2 py-1.5 text-[11px] shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:shadow-none"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {round.status === "cleared" && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>Task Cleared</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70">
                          Deliverable reviewed & approved
                        </p>
                      </div>
                    )}

                    {isLocked && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                          <Lock className="h-3.5 w-3.5 shrink-0" />
                          <span>Stage Locked</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50">
                          Unlocks after Round 1 clearance
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Stage 03: Interview */}
                {round.key === "round3" && (
                  <div className="space-y-1">
                    {/* Awaiting Slot Selection Action */}
                    {isAwaitingSlot && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-cyan-300 font-medium leading-tight">
                          Round 2 cleared! Book your 15-min interview:
                        </p>
                        <button
                          type="button"
                          onClick={() => setSlotModalOpen(true)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-pixel uppercase tracking-wider border-2 border-cyan-500 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer shadow-[2px_2px_0px_#06B6D4]"
                        >
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>Select Interview Slot</span>
                          <ChevronRight className="h-3 w-3 shrink-0" />
                        </button>
                      </div>
                    )}

                    {/* Scheduled Slot Details & Meeting Link on Website */}
                    {round.status === "scheduled" && (
                      <div className="space-y-2">
                        <div className="text-cyan-400 font-bold flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{round.date ? `${round.date} · ` : ""}{round.slotTime}</span>
                        </div>

                        {(round.meetingLink || round.meetLink) && (
                          <a
                            href={round.meetingLink || round.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 border border-cyan-500/60 bg-cyan-500/20 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all text-xs"
                          >
                            <Video className="h-3.5 w-3.5 shrink-0" />
                            <span>JOIN GOOGLE MEET</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() => setSlotModalOpen(true)}
                            className="text-[10px] text-cyan-400/80 hover:text-cyan-300 underline font-mono cursor-pointer"
                          >
                            Change Slot
                          </button>
                        </div>
                      </div>
                    )}

                    {round.status === "accepted" && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>Selected</span>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-pixel uppercase">
                          🎉 Welcome to GDG!
                        </p>
                      </div>
                    )}

                    {round.status === "rejected" && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-rose-400">
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Concluded</span>
                        </div>
                      </div>
                    )}

                    {isLocked && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                          <Lock className="h-3.5 w-3.5 shrink-0" />
                          <span>Stage Locked</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50">
                          Unlocks after Round 2 clearance
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 15-Minute Interview Slot Picker Modal */}
      <InterviewSlotPickerModal
        isOpen={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
        applicationId={applicationId}
        departmentName={departmentName}
        currentInterview={rounds?.round3}
        onSlotBooked={(appId, slotDetails) => {
          if (onSlotBooked) onSlotBooked(appId, slotDetails);
        }}
      />
    </>
  );
}
