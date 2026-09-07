"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import DataTable from "./DataTable";
import Round2ReviewSection from "./admin/Round2ReviewSection";
import Round3ReviewSection from "./admin/Round3ReviewSection";
import DeadlineConfigModal from "./admin/DeadlineConfigModal";
import AdminRoleManagerModal from "./admin/AdminRoleManagerModal";
import { ShieldAlert, Lock, ArrowRight, Loader2, Layers, FileCode2, Users, CheckCircle2, Calendar, Clock, Crown, Shield, UserCog, Mail } from "lucide-react";
import { isUserAdmin } from "@/lib/security";
import DinoRunningLoader from "./DinoRunningLoader";
import { toast } from "sonner";

function UnauthorizedView() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/60 p-8 text-center shadow-lg backdrop-blur-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
        <Lock className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Authentication Required
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Please sign in with an administrator account to access the recruitment admin dashboard.
      </p>
      <div className="mt-6">
        <Button
          onClick={() => {
            window.location.href = "/auth/signin";
          }}
          className="w-full rounded-full gap-2"
          size="lg"
        >
          <span>Sign In as Admin</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AccessDeniedView() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-lg">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Access Denied
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Your account does not have administrator privileges for this recruitment portal.
      </p>
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/";
          }}
          className="w-full rounded-full"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
}

export default function AdminContent({
  applicants,
  userRole = "super_admin",
  assignedDepartments = [],
  isSuperAdmin: isSuperAdminProp = true,
}) {
  const { data: session, isPending } = authClient.useSession();
  const [activeRound, setActiveRound] = React.useState("round1");
  const [applicantsData, setApplicantsData] = React.useState(applicants || []);
  const [deadlineModalOpen, setDeadlineModalOpen] = React.useState(false);
  const [roleManagerOpen, setRoleManagerOpen] = React.useState(false);
  const [checkingSmtp, setCheckingSmtp] = React.useState(false);
  const user = session?.user;

  const handleCheckSmtp = async () => {
    setCheckingSmtp(true);
    try {
      const res = await fetch("/api/admin/smtp-status");
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`✅ SMTP Connected: ${json.sender}`);
      } else {
        toast.error(`❌ SMTP Issue: ${json.message}`);
      }
    } catch (err) {
      toast.error("Failed to connect to SMTP server");
    } finally {
      setCheckingSmtp(false);
    }
  };

  React.useEffect(() => {
    setApplicantsData(applicants || []);
  }, [applicants]);

  const handleDataUpdate = React.useCallback((id, patch) => {
    setApplicantsData((prev) =>
      prev.map((app) => (app.id === id || app._id === id ? { ...app, ...patch } : app))
    );
  }, []);

  // Compute counts for tab badges
  const roundCounts = React.useMemo(() => {
    const r1Total = applicantsData.length;
    const r1Shortlisted = applicantsData.filter((a) => a.shortlisted || a.Shortlisted || a.status === "shortlisted").length;
    const r2Eligible = applicantsData.filter((a) =>
      Boolean(a.shortlisted || a.Shortlisted || a.status === "shortlisted" || a.round2Task?.submissionUrl || a.round2Cleared)
    ).length;
    const r2Submitted = applicantsData.filter((a) => a.round2Task?.submissionUrl).length;
    const r3Finalists = applicantsData.filter((a) =>
      Boolean(a.round2Cleared || a.status === "round2_cleared" || a.status === "scheduled" || a.status === "accepted" || a.round3Interview?.slotTime)
    ).length;
    const r3Accepted = applicantsData.filter((a) => a.status === "accepted").length;

    return {
      r1Total,
      r1Shortlisted,
      r2Eligible,
      r2Submitted,
      r3Finalists,
      r3Accepted,
    };
  }, [applicantsData]);

  const renderContent = () => (
    <div className="w-full space-y-6">
      {/* Role Badge + Super Admin Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Role Badge */}
        <div className="flex items-center gap-2">
          {isSuperAdminProp ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20">
              <Crown className="h-3.5 w-3.5" />
              <span>Super Admin · Full Access</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-500 border border-cyan-500/20">
              <Shield className="h-3.5 w-3.5" />
              <span>Manager · {(assignedDepartments || []).join(", ")}</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Check SMTP Connection */}
          <Button
            variant="outline"
            size="sm"
            disabled={checkingSmtp}
            onClick={handleCheckSmtp}
            className="rounded-xl gap-2 border-border/80 hover:border-blue-500/50 py-5 px-3.5 text-xs font-mono shrink-0 shadow-xs cursor-pointer"
          >
            {checkingSmtp ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <Mail className="h-4 w-4 text-blue-500" />
            )}
            <div className="text-left hidden sm:block">
              <span className="block font-bold text-foreground">SMTP Test</span>
              <span className="block text-[10px] text-muted-foreground">Verify Mailer</span>
            </div>
          </Button>

          {/* Manage Roles button — Available for Super Admins and Department Managers */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRoleManagerOpen(true)}
            className="rounded-xl gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 py-5 px-4 text-xs font-mono shrink-0 shadow-xs cursor-pointer"
          >
            <UserCog className="h-4 w-4 text-amber-500" />
            <div className="text-left">
              <span className="block font-bold text-foreground">Manage Roles</span>
              <span className="block text-[10px] text-muted-foreground">
                {isSuperAdminProp ? "Global Permissions" : `${(assignedDepartments || []).join(", ") || "Dept"} Permissions`}
              </span>
            </div>
          </Button>
        </div>
      </div>

      {/* 3-Round Stage Navigation Tabs + Global Deadline Trigger */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-card/40 p-2 backdrop-blur-sm flex-1">
        {/* Tab 1: Round 1 Screening */}
        <button
          onClick={() => setActiveRound("round1")}
          className={`flex items-start gap-3 p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
            activeRound === "round1"
              ? "bg-card border-blue-500/50 shadow-sm text-foreground ring-1 ring-blue-500/30"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <div
            className={`p-2.5 rounded-lg border shrink-0 ${
              activeRound === "round1"
                ? "border-blue-500/50 bg-blue-500/10 text-blue-500"
                : "border-border/60 bg-muted/40 text-muted-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm font-semibold tracking-tight">
                01 · Screening
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border/60 bg-muted/60 text-muted-foreground">
                {roundCounts.r1Total} Apps
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">
              Review questionnaire dossier & shortlist
            </p>
          </div>
        </button>

        {/* Tab 2: Round 2 Practical Tasks */}
        <button
          onClick={() => setActiveRound("round2")}
          className={`flex items-start gap-3 p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
            activeRound === "round2"
              ? "bg-card border-emerald-500/50 shadow-sm text-foreground ring-1 ring-emerald-500/30"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <div
            className={`p-2.5 rounded-lg border shrink-0 ${
              activeRound === "round2"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                : "border-border/60 bg-muted/40 text-muted-foreground"
            }`}
          >
            <FileCode2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm font-semibold tracking-tight">
                02 · Practical Tasks
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-500">
                {roundCounts.r2Submitted} Submitted
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">
              Inspect code repositories & evaluate deliverables
            </p>
          </div>
        </button>

        {/* Tab 3: Round 3 Interview & Final Selection */}
        <button
          onClick={() => setActiveRound("round3")}
          className={`flex items-start gap-3 p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
            activeRound === "round3"
              ? "bg-card border-cyan-500/50 shadow-sm text-foreground ring-1 ring-cyan-500/30"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <div
            className={`p-2.5 rounded-lg border shrink-0 ${
              activeRound === "round3"
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500"
                : "border-border/60 bg-muted/40 text-muted-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm font-semibold tracking-tight">
                03 · Interviews & Final
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-500">
                {roundCounts.r3Finalists} Finalists
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">
              Schedule interview slots & select core recruits
            </p>
          </div>
        </button>
        </div>

        {/* Set Deadlines — Available for both Super Admins and Department Managers */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeadlineModalOpen(true)}
          className="rounded-xl gap-2 border-border/80 hover:border-blue-500/50 py-5 px-4 text-xs font-mono shrink-0 shadow-xs"
        >
          <Clock className="h-4 w-4 text-blue-500" />
          <div className="text-left">
            <span className="block font-bold text-foreground">Set Deadlines</span>
            <span className="block text-[10px] text-muted-foreground">
              {isSuperAdminProp ? "All Departments" : assignedDepartments.join(", ") || "Department"}
            </span>
          </div>
        </Button>
      </div>

      {/* Render Active Round Section */}
      {activeRound === "round1" && (
        <div className="space-y-3">
          <div>
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider block">
              Stage 01 Evaluation · Questionnaire Screening
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              Application Review & Shortlisting
            </h2>
          </div>
          <DataTable
            data={applicantsData}
            onDataUpdate={handleDataUpdate}
            allowedDepartments={isSuperAdminProp ? null : assignedDepartments}
          />
        </div>
      )}

      {activeRound === "round2" && (
        <div className="space-y-3">
          <div>
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider block">
              Stage 02 Evaluation · Domain Proficiency Tasks
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              Practical Task Submissions & Deliverables
            </h2>
          </div>
          <Round2ReviewSection
            data={applicantsData}
            onDataUpdate={handleDataUpdate}
            allowedDepartments={isSuperAdminProp ? null : assignedDepartments}
          />
        </div>
      )}

      {activeRound === "round3" && (
        <div className="space-y-3">
          <div>
            <span className="text-xs font-semibold text-cyan-500 uppercase tracking-wider block">
              Stage 03 Evaluation · Technical & Core Interviews
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              Interview Scheduling & Final Committee Decisions
            </h2>
          </div>
          <Round3ReviewSection
            data={applicantsData}
            onDataUpdate={handleDataUpdate}
            allowedDepartments={isSuperAdminProp ? null : assignedDepartments}
          />
        </div>
      )}

      {/* Recruitment Deadlines Config Modal */}
      <DeadlineConfigModal
        isOpen={deadlineModalOpen}
        onClose={() => setDeadlineModalOpen(false)}
        allowedDepartments={assignedDepartments}
        isSuperAdmin={isSuperAdminProp}
      />

      {/* Admin Role Manager Modal */}
      <AdminRoleManagerModal
        isOpen={roleManagerOpen}
        onClose={() => setRoleManagerOpen(false)}
        allowedDepartments={assignedDepartments}
        isSuperAdmin={isSuperAdminProp}
      />
    </div>
  );

  if (isPending) {
    return (
      <DinoRunningLoader
        badgeText="ADMIN_PORTAL // AUTHENTICATING"
        statusMessage="Verifying admin credentials and security clearance..."
        fullScreen={false}
      />
    );
  }

  if (!user && !userRole) {
    return <UnauthorizedView />;
  }

  const isAuthorized =
    userRole === "super_admin" ||
    userRole === "dept_manager" ||
    isUserAdmin(user);

  if (!isAuthorized) {
    return <AccessDeniedView />;
  }

  return renderContent();
}
