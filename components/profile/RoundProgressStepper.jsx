"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, Lock, XCircle, ExternalLink, Calendar, Video, AlertTriangle } from "lucide-react";
import TaskSubmissionDrawer from "./TaskSubmissionDrawer";

const statusConfigs = {
  cleared: {
    label: "PASSED",
    color: "text-emerald-500 border-emerald-500 bg-emerald-500/10 shadow-[2px_2px_0px_#10B981]",
    icon: Check,
    indicatorColor: "bg-emerald-500",
  },
  accepted: {
    label: "ACCEPTED",
    color: "text-emerald-400 border-emerald-500 bg-emerald-500/20 shadow-[2px_2px_0px_#10B981]",
    icon: Check,
    indicatorColor: "bg-emerald-500",
  },
  in_review: {
    label: "IN REVIEW",
    color: "text-amber-500 border-amber-500 bg-amber-500/10 shadow-[2px_2px_0px_#FBBC04]",
    icon: Clock,
    indicatorColor: "bg-amber-500",
  },
  submitted: {
    label: "SUBMITTED",
    color: "text-blue-400 border-blue-500 bg-blue-500/10 shadow-[2px_2px_0px_#4285F4]",
    icon: Check,
    indicatorColor: "bg-blue-500",
  },
  pending_submission: {
    label: "ACTION REQUIRED",
    color: "text-emerald-400 border-emerald-500 bg-emerald-500/15 animate-pulse shadow-[2px_2px_0px_#10B981]",
    icon: AlertTriangle,
    indicatorColor: "bg-emerald-500",
  },
  scheduled: {
    label: "INTERVIEW SET",
    color: "text-cyan-400 border-cyan-500 bg-cyan-500/10 shadow-[2px_2px_0px_#06B6D4]",
    icon: Calendar,
    indicatorColor: "bg-cyan-500",
  },
  rejected: {
    label: "NOT CLEARED",
    color: "text-rose-500 border-rose-500 bg-rose-500/10 shadow-[2px_2px_0px_#EA4335]",
    icon: XCircle,
    indicatorColor: "bg-rose-500",
  },
  locked: {
    label: "LOCKED",
    color: "text-muted-foreground border-border/80 bg-muted/40",
    icon: Lock,
    indicatorColor: "bg-muted-foreground",
  },
};

export default function RoundProgressStepper({
  applicationId,
  departmentName,
  rounds,
  onTaskSubmitted,
  className,
}) {
  const roundList = [
    { key: "round1", ...rounds.round1, number: "01" },
    { key: "round2", ...rounds.round2, number: "02" },
    { key: "round3", ...rounds.round3, number: "03" },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Horizontal Checkpoint Track */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 relative">
        {roundList.map((round, idx) => {
          const cfg = statusConfigs[round.status] || statusConfigs.locked;
          const Icon = cfg.icon;
          const isCurrentActive = round.status === "pending_submission" || round.status === "in_review" || round.status === "scheduled";

          return (
            <div
              key={round.key}
              className={cn(
                "relative p-4 border-2 transition-all duration-300 bg-card/90 dark:bg-zinc-950 flex flex-col justify-between",
                isCurrentActive
                  ? "border-foreground/80 shadow-[4px_4px_0px_#4285F4] dark:shadow-[4px_4px_0px_#10B981]"
                  : round.status === "cleared" || round.status === "accepted"
                  ? "border-emerald-500/50 shadow-[3px_3px_0px_#0F9D58]"
                  : round.status === "rejected"
                  ? "border-rose-500/50 opacity-75"
                  : "border-border/60 opacity-60"
              )}
            >
              {/* Top Station Tag */}
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5 mb-2.5">
                <div className="flex items-center gap-1.5 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
                  <span>STAGE {round.number}</span>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-widest border",
                    cfg.color
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>{cfg.label}</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1 mb-3">
                <h4 className="font-sans font-bold text-sm text-foreground">
                  {round.title}
                </h4>
                <p className="text-xs text-muted-foreground font-sans line-clamp-2">
                  {round.description}
                </p>
              </div>

              {/* Round-Specific Detail Box */}
              <div className="pt-2 border-t border-border/40 text-xs font-mono">
                {/* Round 1 Context */}
                {round.key === "round1" && (
                  <div className="text-[11px] text-muted-foreground">
                    {round.status === "cleared" ? (
                      <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                        ✓ Screening criteria satisfied. Proceeding to Task Stage.
                      </span>
                    ) : round.status === "rejected" ? (
                      <span className="text-rose-500">
                        Application was not advanced to Round 2.
                      </span>
                    ) : (
                      <span>Core committee reviewing your questionnaire responses.</span>
                    )}
                  </div>
                )}

                {/* Round 2 Context & Submission Trigger */}
                {round.key === "round2" && (
                  <div className="space-y-2">
                    {round.status === "pending_submission" && (
                      <div className="space-y-2">
                        <div className="text-[11px] text-amber-500 font-semibold">
                          ⚠ Task assigned: {round.taskPrompt}
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Deliverable:</span>
                          <a
                            href={round.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1 font-semibold truncate max-w-[140px]"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Link
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
                      <span className="text-emerald-500 dark:text-emerald-400 font-semibold text-[11px]">
                        ✓ Task deliverable verified and scored. Advanced to Interview.
                      </span>
                    )}

                    {round.status === "locked" && (
                      <span className="text-muted-foreground text-[11px]">
                        Unlocks upon clearing Round 01 screening.
                      </span>
                    )}
                  </div>
                )}

                {/* Round 3 Context */}
                {round.key === "round3" && (
                  <div className="space-y-1.5 text-[11px]">
                    {round.status === "scheduled" && (
                      <div className="border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-400 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Slot: {round.slotTime}</span>
                        </div>
                        {round.venue && <div>Venue: {round.venue}</div>}
                        {round.meetLink && (
                          <a
                            href={round.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-300 underline font-bold mt-1"
                          >
                            <Video className="h-3 w-3" />
                            Join Video Call
                          </a>
                        )}
                      </div>
                    )}

                    {round.status === "accepted" && (
                      <div className="border border-emerald-500/40 bg-emerald-500/15 p-2 font-pixel text-[9px] text-emerald-400 uppercase tracking-wider text-center">
                        🎉 SELECTED TO GDG COMMITTEE
                      </div>
                    )}

                    {round.status === "rejected" && (
                      <span className="text-rose-500">
                        Process concluded for this track.
                      </span>
                    )}

                    {round.status === "locked" && (
                      <span className="text-muted-foreground">
                        Unlocks upon task review & evaluation.
                      </span>
                    )}

                    {round.status === "in_review" && (
                      <span className="text-muted-foreground">
                        Interview deliberations in progress.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
