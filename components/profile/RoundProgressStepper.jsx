"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, Lock, XCircle, ExternalLink, Calendar, Video, AlertTriangle, ChevronRight } from "lucide-react";
import TaskSubmissionDrawer from "./TaskSubmissionDrawer";
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
    { key: "round1", ...rounds.round1 },
    { key: "round2", ...rounds.round2 },
    { key: "round3", ...rounds.round3 },
  ];

  return (
    <>
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-3", className)}>
        {roundList.map((round) => {
          const cfg = statusConfigs[round.status] || statusConfigs.locked;
          const Icon = cfg.icon;
          const isLocked = round.status === "locked";
          const isActionRequired = round.status === "pending_submission";
          const isSubmitted = round.status === "submitted";
          const isCleared = round.status === "cleared" || round.status === "accepted";
          const isScheduled = round.status === "scheduled";
          const isAwaitingSlot = round.status === "awaiting_schedule";

          return (
            <div
              key={round.key}
              className={cn(
                "p-3.5 sm:p-4 border transition-all duration-200 bg-background/50 flex flex-col justify-between min-h-[105px]",
                isActionRequired
                  ? "border-emerald-500/80 bg-emerald-500/5 shadow-[2px_2px_0px_#10B981]"
                  : isSubmitted
                  ? "border-blue-500/50 bg-blue-500/5 shadow-[2px_2px_0px_rgba(59,130,246,0.25)]"
                  : isAwaitingSlot
                  ? "border-cyan-500/80 bg-cyan-500/5 shadow-[2px_2px_0px_#06B6D4]"
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
                  <div className="text-muted-foreground text-[11px] space-y-1">
                    <div>
                      {round.status === "cleared" ? (
                        <span className="text-emerald-400 font-medium">Screening passed</span>
                      ) : round.status === "rejected" ? (
                        <span className="text-rose-400">Not shortlisted</span>
                      ) : (
                        <span>Application under review</span>
                      )}
                    </div>
                    {round.deadline && (
                      <div className="text-[10px] text-muted-foreground/70">
                        Deadline: {new Date(round.deadline).toLocaleDateString()}
                      </div>
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
                        {round.deadline && (
                          <div className="text-[10px] text-muted-foreground/80">
                            Due: {round.deadline.includes("T") ? new Date(round.deadline).toLocaleString() : round.deadline}
                          </div>
                        )}
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
                  <div className="space-y-2">
                    {/* Awaiting Slot Selection Action */}
                    {isAwaitingSlot && (
                      <div className="space-y-2 mt-1">
                        <p className="text-[11px] text-cyan-300">
                          Round 2 cleared! Please choose your 15-minute interview slot.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSlotModalOpen(true)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded border border-cyan-500 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 font-pixel text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-[2px_2px_0px_#06B6D4]"
                        >
                          <Calendar className="h-3 w-3" />
                          <span>SELECT INTERVIEW SLOT</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {/* Scheduled Slot Details & Meeting Link on Website */}
                    {round.status === "scheduled" && (
                      <div className="text-[11px] space-y-2">
                        <div className="text-cyan-400 font-bold flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{round.date ? `${round.date} · ` : ""}{round.slotTime}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          15-Minute Technical Interview
                        </div>

                        {/* Direct Google Meet Link on Website */}
                        {(round.meetingLink || round.meetLink) && (
                          <a
                            href={round.meetingLink || round.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-cyan-500/60 bg-cyan-500/20 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all text-xs"
                          >
                            <Video className="h-3.5 w-3.5 shrink-0" />
                            <span>JOIN GOOGLE MEET</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        )}

                        <div className="pt-0.5">
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
