/**
 * Shared deadline & status evaluation utilities for Round 2 and candidate progress tracking.
 */

export function checkIsDeadlinePassed(deadline) {
  if (!deadline) return false;
  const parsed = Date.parse(deadline);
  if (isNaN(parsed)) return false;
  return Date.now() > parsed;
}

export function resolveRound2StatusConfig(status, deadline) {
  const isDeadlinePassed = checkIsDeadlinePassed(deadline);
  const isActionRequired = status === "pending_submission";

  if (isActionRequired && isDeadlinePassed) {
    return {
      label: "CLOSED",
      color: "text-rose-400 border-rose-500/40 bg-rose-500/10",
    };
  }
  if (isActionRequired) {
    return {
      label: "ACTION REQUIRED",
      color: "text-emerald-400 border-emerald-500 bg-emerald-500/15 animate-pulse",
    };
  }
  if (status === "submitted") {
    return {
      label: "SUBMITTED",
      color: "text-blue-400 border-blue-500/40 bg-blue-500/10",
    };
  }
  if (status === "cleared" || status === "accepted") {
    return {
      label: "PASSED",
      color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    };
  }
  if (status === "rejected") {
    return {
      label: "NOT SELECTED",
      color: "text-rose-400 border-rose-500/40 bg-rose-500/10",
    };
  }
  return {
    label: "LOCKED",
    color: "text-muted-foreground/60 border-border/40 bg-muted/20",
  };
}
