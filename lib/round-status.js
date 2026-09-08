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

/**
 * Resolves Round 1 and Round 2 deadlines for a specific department from the recruitment_config/deadlines payload.
 * Supports exact name matching, normalized slug matching, and fallback to global deadlines.
 */
export function resolveDepartmentDeadline(dData, deptName) {
  if (!dData || typeof dData !== "object") {
    return { round1Deadline: null, round2Deadline: null };
  }

  const deptSlug = (deptName || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
  let round1Deadline = null;
  let round2Deadline = null;

  if (dData.departments && typeof dData.departments === "object") {
    for (const [dName, dCfg] of Object.entries(dData.departments)) {
      const normalizedCfgName = dName.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
      if (
        dName.toLowerCase().trim() === (deptName || "").toLowerCase().trim() ||
        normalizedCfgName === deptSlug
      ) {
        round1Deadline = dCfg?.round1Deadline || null;
        round2Deadline = dCfg?.round2Deadline || null;
        break;
      }
    }
  }

  // Fallback to legacy fields if department-level deadline wasn't explicitly set
  if (!round1Deadline && dData.round1Deadline) {
    round1Deadline = dData.round1Deadline;
  }
  if (!round2Deadline) {
    round2Deadline = dData.round2Deadlines?.[deptName] || dData.round2Deadline || null;
  }

  return { round1Deadline, round2Deadline };
}

/**
 * Checks if Round 1 application deadline has passed for a specific department.
 */
export function isRound1ClosedForDept(dData, deptName) {
  const { round1Deadline } = resolveDepartmentDeadline(dData, deptName);
  return checkIsDeadlinePassed(round1Deadline);
}

const roundStatusUtils = {
  checkIsDeadlinePassed,
  resolveRound2StatusConfig,
  resolveDepartmentDeadline,
  isRound1ClosedForDept,
};

export default roundStatusUtils;

