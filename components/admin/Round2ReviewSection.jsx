"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FilterDepartment from "@/components/FilterDepartment";
import PaginationComp from "@/components/PaginationComp";
import { CSVLink } from "react-csv";
import { CSV_Header_Round2 } from "@/constants";
import { toast } from "sonner";
import { IoCloudDownloadOutline } from "react-icons/io5";
import { GrPowerReset } from "react-icons/gr";
import { FaSortAmountDownAlt } from "react-icons/fa";
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  FileCode2,
  XCircle,
  Eye,
  AlertCircle,
  X,
  Lock,
  Award,
  Mail,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function Round2ReviewSection({ data = [], onDataUpdate, allowedDepartments }) {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeCandidateModal, setActiveCandidateModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Candidates eligible for Round 2
  const round2Candidates = useMemo(() => {
    return data.filter((item) => {
      return Boolean(
        item.shortlisted ||
        item.Shortlisted ||
        item.status === "shortlisted" ||
        item.status === "round2_cleared" ||
        item.status === "accepted" ||
        item.round2Task?.submissionUrl ||
        item.round2Cleared
      );
    });
  }, [data]);

  // Derived filtered data
  const filteredData = useMemo(() => {
    return round2Candidates.filter((item) => {
      const q = search.toLowerCase().trim();
      const name = (item.Name || "").toLowerCase();
      const reg = (item.RegistrationNumber || "").toLowerCase();
      const email = (item.Email || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || reg.includes(q) || email.includes(q);

      const matchesDept = selectedDept === "All" || item.Department === selectedDept;

      const hasSubmitted = Boolean(item.round2Task?.submissionUrl);
      const isCleared = Boolean(item.round2Cleared || item.status === "round2_cleared" || item.status === "accepted");
      const isRejected = item.status === "rejected";

      let matchesStatus = true;
      if (selectedStatus === "submitted") matchesStatus = hasSubmitted && !isCleared && !isRejected;
      if (selectedStatus === "pending") matchesStatus = !hasSubmitted && !isRejected;
      if (selectedStatus === "cleared") matchesStatus = isCleared;
      if (selectedStatus === "rejected") matchesStatus = isRejected;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [round2Candidates, search, selectedDept, selectedStatus]);

  // Metric cards
  const stats = useMemo(() => {
    const total = round2Candidates.length;
    const submitted = round2Candidates.filter((c) => c.round2Task?.submissionUrl).length;
    const cleared = round2Candidates.filter((c) => c.round2Cleared || c.status === "round2_cleared" || c.status === "accepted").length;
    const awaiting = total - submitted;
    return { total, submitted, cleared, awaiting };
  }, [round2Candidates]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageIndex, pageSize]);

  const handlePageSizeChange = (e) => {
    const val = Number(e.target.value);
    setPageSize(val > 0 ? val : 10);
    setPageIndex(0);
  };

  const resetAllFilters = () => {
    setSearch("");
    setSelectedDept("All");
    setSelectedStatus("All");
    setPageIndex(0);
  };

  // CSV Export Data
  const csvLinkData = useMemo(() => {
    return {
      headers: CSV_Header_Round2,
      data: filteredData.map((item) => {
        const task = item.round2Task || {};
        const isCleared = Boolean(item.round2Cleared || item.status === "round2_cleared" || item.status === "accepted");
        return {
          Name: item.Name || "",
          Email: item.Email || "",
          RegistrationNumber: item.RegistrationNumber || "",
          Phone: item.Phone || "",
          Department: item.Department || "",
          Pref: item.Pref || "",
          submissionUrl: task.submissionUrl || "Not Submitted",
          submittedAt: task.submittedAt ? new Date(task.submittedAt).toLocaleString() : "N/A",
          notes: task.notes || "",
          round2Cleared: isCleared ? "Yes" : "No",
          status: item.status || "pending",
        };
      }),
      filename: `GDG_Recruitment_Round2_Tasks_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }, [filteredData]);

  // Action: Clear or undo Round 2
  const handleClearRound2 = useCallback(
    async (id, currentCleared) => {
      const candidate = data.find((c) => (c._id || c.id) === id);
      if (candidate?.round2MailSent) {
        toast.error("Cannot modify Round 2 decision: Decision email has already been sent to this candidate.");
        return;
      }

      setActionLoading(id);
      try {
        const res = await fetch(`/api/admin/round2/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ round2Cleared: !currentCleared }),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success(
            !currentCleared
              ? "Candidate cleared Round 2! You can now send notification email to finalize."
              : "Round 2 clearance reverted."
          );
          if (onDataUpdate) onDataUpdate(id, { round2Cleared: !currentCleared, status: !currentCleared ? "round2_cleared" : "shortlisted" });
        } else {
          toast.error(json.message || "Failed to update Round 2 clearance");
        }
      } catch (err) {
        console.error("Error clearing candidate for Round 2:", err);
        toast.error("Failed to update candidate clearance");
      } finally {
        setActionLoading(null);
      }
    },
    [data, onDataUpdate]
  );

  // Action: Reject candidate
  const handleRejectCandidate = useCallback(
    async (id) => {
      const candidate = data.find((c) => (c._id || c.id) === id);
      if (candidate?.round2MailSent) {
        toast.error("Cannot modify Round 2 decision: Decision email has already been sent to this candidate.");
        return;
      }

      if (!confirm("Are you sure you want to mark this candidate as rejected for Round 2?")) return;
      setActionLoading(id);
      try {
        const res = await fetch(`/api/admin/round2/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected", round2Cleared: false }),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("Candidate marked as rejected. You can now send notification email to finalize.");
          if (onDataUpdate) onDataUpdate(id, { status: "rejected", round2Cleared: false });
        } else {
          toast.error(json.message || "Failed to reject candidate");
        }
      } catch (err) {
        console.error("Error rejecting candidate:", err);
        toast.error("Failed to reject candidate");
      } finally {
        setActionLoading(null);
      }
    },
    [data, onDataUpdate]
  );

  // Action: Undo rejection
  const handleUndoReject = useCallback(
    async (id) => {
      const candidate = data.find((c) => (c._id || c.id) === id);
      if (candidate?.round2MailSent) {
        toast.error("Cannot modify Round 2 decision: Decision email has already been sent to this candidate.");
        return;
      }

      setActionLoading(id);
      try {
        const resetStatus = candidate?.round2Task?.submissionUrl ? "submitted" : "shortlisted";
        const res = await fetch(`/api/admin/round2/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: resetStatus, round2Cleared: false }),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("Rejection undone. Candidate restored to pending review.");
          if (onDataUpdate) onDataUpdate(id, { status: resetStatus, round2Cleared: false });
        } else {
          toast.error(json.message || "Failed to undo rejection");
        }
      } catch (err) {
        console.error("Error undoing rejection:", err);
        toast.error("Failed to undo rejection");
      } finally {
        setActionLoading(null);
      }
    },
    [data, onDataUpdate]
  );

  // Action: Send decision email and finalize
  const handleSendMail = useCallback(
    async (id) => {
      setActionLoading(id);
      try {
        const res = await fetch(`/api/admin/send-mail/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ round: "round2" }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success(json.message || "✉️ Round 2 decision email dispatched! Decision is permanently locked.");
          if (onDataUpdate) onDataUpdate(id, { round2MailSent: true, round2MailSentAt: new Date().toISOString() });
        } else {
          toast.error(json.message || "Failed to send decision email");
        }
      } catch (err) {
        console.error("Error sending decision email:", err);
        toast.error("Failed to send decision email");
      } finally {
        setActionLoading(null);
      }
    },
    [onDataUpdate]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Cards - Harmonized with Design System */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Round 2 Eligible
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground mt-1">
            {stats.total}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Shortlisted from R1</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tasks Submitted
          </div>
          <div className="text-3xl font-bold tracking-tight text-blue-500 mt-1">
            {stats.submitted}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Ready for evaluation</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Awaiting Upload
          </div>
          <div className="text-3xl font-bold tracking-tight text-amber-500 mt-1">
            {stats.awaiting}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pending candidate submission</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cleared for R3
          </div>
          <div className="text-3xl font-bold tracking-tight text-emerald-500 mt-1">
            {stats.cleared}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Advanced to interviews</p>
        </div>
      </div>

      {/* Main Table Card Container - 100% Identical to DataTable */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(0);
              }}
              placeholder="Search candidate, reg no, email..."
              className="w-64 rounded-xl"
            />
            <Input
              className="w-28 rounded-xl"
              onChange={handlePageSizeChange}
              placeholder="Page size"
              type="number"
              min="1"
              value={pageSize}
            />
            <FilterDepartment filterFunc={(dept) => { setSelectedDept(dept || "All"); setPageIndex(0); }} allowedDepartments={allowedDepartments} />

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPageIndex(0);
              }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="All">All Statuses</option>
              <option value="submitted">Submitted (In Review)</option>
              <option value="pending">Awaiting Submission</option>
              <option value="cleared">Cleared for R3</option>
              <option value="rejected">Rejected</option>
            </select>

            <Button variant="outline" size="sm" onClick={resetAllFilters} className="rounded-xl gap-1.5">
              <GrPowerReset className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="rounded-xl gap-1.5" asChild>
              <CSVLink {...csvLinkData} className="flex items-center gap-1.5">
                <IoCloudDownloadOutline className="h-4 w-4" />
                <span>Export CSV</span>
              </CSVLink>
            </Button>
          </div>
        </div>

        {/* Table - Standard Shadcn UI Table Component */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">
                  <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    Sr No
                  </div>
                </TableHead>
                <TableHead>
                  <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    Candidate
                    <FaSortAmountDownAlt className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    Department
                  </div>
                </TableHead>
                <TableHead>
                  <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    Task Deliverable
                  </div>
                </TableHead>
                <TableHead>
                  <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    Submission Time
                  </div>
                </TableHead>
                <TableHead>
                  <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    Evaluation
                  </div>
                </TableHead>
                <TableHead className="text-right w-[330px] min-w-[320px]">
                  <div className="inline-flex items-center justify-end gap-1.5 font-semibold text-foreground w-full">
                    Actions
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                    No Round 2 candidates found matching current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((candidate, idx) => {
                  const id = candidate._id || candidate.id;
                  const task = candidate.round2Task;
                  const hasSubmitted = Boolean(task?.submissionUrl);
                  const isCleared = Boolean(candidate.round2Cleared || candidate.status === "round2_cleared" || candidate.status === "accepted");
                  const isRejected = candidate.status === "rejected";
                  const isMailSent = Boolean(candidate.round2MailSent);

                  return (
                    <TableRow key={id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-muted-foreground">
                        {pageIndex * pageSize + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{candidate.Name || "Anonymous"}</div>
                        <div className="text-xs text-muted-foreground">
                          {candidate.RegistrationNumber || "N/A"} · {candidate.Email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border border-border/80 bg-muted/50 text-foreground">
                          {candidate.Department || "General"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasSubmitted ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={task.submissionUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline max-w-[200px] truncate"
                              title={task.submissionUrl}
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{task.submissionUrl.replace(/^https?:\/\//, "")}</span>
                            </a>
                            {task.notes && (
                              <button
                                onClick={() => setActiveCandidateModal(candidate)}
                                className="inline-flex items-center p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                                title="View architecture & submission notes"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            Awaiting Upload
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task?.submittedAt ? (
                          new Date(task.submittedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            <XCircle className="h-3.5 w-3.5" />
                            Rejected
                          </span>
                        ) : isCleared ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Cleared for R3
                          </span>
                        ) : hasSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <Clock className="h-3.5 w-3.5" />
                            In Evaluation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/60">
                            Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {isMailSent ? (
                          <div className="flex items-center justify-end">
                            <span
                              className="h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 bg-muted/60 text-muted-foreground border border-border/80 select-none"
                              title="Decision email sent. Round 2 decision is permanently locked."
                            >
                              <Lock className="h-3.5 w-3.5 text-amber-500" />
                              <span>{isCleared ? "Cleared · Mail Sent" : "Rejected · Mail Sent"}</span>
                            </span>
                          </div>
                        ) : isCleared ? (
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button
                              onClick={() => handleClearRound2(id, true)}
                              disabled={actionLoading === id}
                              className="h-8 min-w-[84px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center transition-colors cursor-pointer bg-amber-600 text-white hover:bg-amber-700"
                            >
                              Undo Clearance
                            </button>
                            <button
                              onClick={() => handleRejectCandidate(id)}
                              disabled={actionLoading === id}
                              className="h-8 min-w-[84px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center transition-colors cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleSendMail(id)}
                              disabled={actionLoading === id}
                              className="h-8 min-w-[84px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                              title="Send decision email to candidate and permanently lock Round 2 decision"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              <span>Send Mail</span>
                            </button>
                          </div>
                        ) : isRejected ? (
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button
                              onClick={() => handleUndoReject(id)}
                              disabled={actionLoading === id}
                              className="h-8 min-w-[84px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center transition-colors cursor-pointer bg-amber-600 text-white hover:bg-amber-700"
                            >
                              Undo Rejection
                            </button>
                            <button
                              onClick={() => handleClearRound2(id, false)}
                              disabled={actionLoading === id}
                              className="h-8 min-w-[84px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center transition-colors cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Pass to R3
                            </button>
                            <button
                              onClick={() => handleSendMail(id)}
                              disabled={actionLoading === id}
                              className="h-8 min-w-[84px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                              title="Send decision email to candidate and permanently lock Round 2 decision"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              <span>Send Mail</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button
                              onClick={() => handleClearRound2(id, false)}
                              disabled={actionLoading === id}
                              className="h-8 min-w-[84px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center transition-colors cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Pass to R3
                            </button>
                            <button
                              onClick={() => handleRejectCandidate(id)}
                              disabled={actionLoading === id}
                              className="h-8 min-w-[84px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center transition-colors cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Component - Identical to DataTable */}
        <PaginationComp
          pageIndex={pageIndex}
          pages={totalPages}
          nextPage={() => setPageIndex((p) => Math.min(p + 1, totalPages - 1))}
          canNext={pageIndex < totalPages - 1}
          previousPage={() => setPageIndex((p) => Math.max(p - 1, 0))}
          canPrev={pageIndex > 0}
          goto={(idx) => setPageIndex(idx)}
          pageCount={totalPages}
        />
      </div>

      {/* Candidate Notes Modal */}
      {activeCandidateModal && (
        <Dialog.Root open={true} onOpenChange={() => setActiveCandidateModal(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {activeCandidateModal.Name} · Deliverable Notes
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeCandidateModal.Department} · {activeCandidateModal.RegistrationNumber}
                  </p>
                </div>
                <button
                  onClick={() => setActiveCandidateModal(null)}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                    Deliverable URL
                  </label>
                  <a
                    href={activeCandidateModal.round2Task?.submissionUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-medium text-primary hover:underline break-all inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span>{activeCandidateModal.round2Task?.submissionUrl}</span>
                  </a>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                    Candidate Implementation Notes
                  </label>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {activeCandidateModal.round2Task?.notes || "No additional notes provided by candidate."}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>
                    Submitted: {activeCandidateModal.round2Task?.submittedAt ? new Date(activeCandidateModal.round2Task.submittedAt).toLocaleString() : "N/A"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveCandidateModal(null)}
                    className="rounded-xl"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
