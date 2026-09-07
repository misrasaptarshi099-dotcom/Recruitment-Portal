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
import { CSV_Header_Round3 } from "@/constants";
import { toast } from "sonner";
import { IoCloudDownloadOutline } from "react-icons/io5";
import { GrPowerReset } from "react-icons/gr";
import { FaSortAmountDownAlt } from "react-icons/fa";
import {
  Calendar,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
} from "lucide-react";
import InterviewSlotManagerModal from "./InterviewSlotManagerModal";

export default function Round3ReviewSection({ data = [], onDataUpdate }) {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [slotConfigModalOpen, setSlotConfigModalOpen] = useState(false);

  // Candidates who reached Round 3
  const round3Candidates = useMemo(() => {
    return data.filter((item) => {
      return Boolean(
        item.round2Cleared ||
        item.status === "round2_cleared" ||
        item.status === "scheduled" ||
        item.status === "accepted" ||
        item.round3Interview?.slotTime
      );
    });
  }, [data]);

  // Derived filtered data
  const filteredData = useMemo(() => {
    return round3Candidates.filter((item) => {
      const q = search.toLowerCase().trim();
      const name = (item.Name || "").toLowerCase();
      const reg = (item.RegistrationNumber || "").toLowerCase();
      const email = (item.Email || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || reg.includes(q) || email.includes(q);

      const matchesDept = selectedDept === "All" || item.Department === selectedDept;

      const r3 = item.round3Interview || {};
      const isAccepted = item.status === "accepted";
      const isRejected = item.status === "rejected";
      const isScheduled = Boolean(r3.slotTime) && !isAccepted && !isRejected;
      const isAwaiting = !r3.slotTime && !isAccepted && !isRejected;

      let matchesStatus = true;
      if (selectedStatus === "accepted") matchesStatus = isAccepted;
      if (selectedStatus === "scheduled") matchesStatus = isScheduled;
      if (selectedStatus === "awaiting") matchesStatus = isAwaiting;
      if (selectedStatus === "rejected") matchesStatus = isRejected;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [round3Candidates, search, selectedDept, selectedStatus]);

  // Metric cards
  const stats = useMemo(() => {
    const total = round3Candidates.length;
    const accepted = round3Candidates.filter((c) => c.status === "accepted").length;
    const scheduled = round3Candidates.filter((c) => c.round3Interview?.slotTime && c.status !== "accepted" && c.status !== "rejected").length;
    const awaiting = total - accepted - scheduled;
    return { total, accepted, scheduled, awaiting };
  }, [round3Candidates]);

  // Pagination
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
      headers: CSV_Header_Round3,
      data: filteredData.map((item) => {
        const r3 = item.round3Interview || {};
        return {
          Name: item.Name || "",
          Email: item.Email || "",
          RegistrationNumber: item.RegistrationNumber || "",
          Phone: item.Phone || "",
          Department: item.Department || "",
          Pref: item.Pref || "",
          slotTime: r3.slotTime || "Not Scheduled",
          venue: r3.venue || "TBD",
          meetLink: r3.meetLink || "N/A",
          status: item.status || "round2_cleared",
        };
      }),
      filename: `GDG_Recruitment_Round3_Interviews_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }, [filteredData]);



  const handleAcceptToCore = useCallback(
    async (id) => {
      setActionLoading(id);
      try {
        const res = await fetch(`/api/admin/round3/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("🎉 Candidate officially accepted into GDG Core!");
          if (onDataUpdate) onDataUpdate(id, { status: "accepted" });
        } else {
          toast.error(json.message || "Failed to accept candidate");
        }
      } catch (err) {
        console.error("Error accepting candidate:", err);
        toast.error("Failed to accept candidate");
      } finally {
        setActionLoading(null);
      }
    },
    [onDataUpdate]
  );

  const handleRejectCandidate = useCallback(
    async (id) => {
      if (!confirm("Are you sure you want to mark this candidate as rejected?")) return;
      setActionLoading(id);
      try {
        const res = await fetch(`/api/admin/round3/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected" }),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("Candidate marked as rejected.");
          if (onDataUpdate) onDataUpdate(id, { status: "rejected" });
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
    [onDataUpdate]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Cards - Harmonized with Design System */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Round 3 Finalists
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground mt-1">
            {stats.total}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Cleared practical tasks</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Interviews Scheduled
          </div>
          <div className="text-3xl font-bold tracking-tight text-cyan-500 mt-1">
            {stats.scheduled}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Slots assigned</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Pending Slot
          </div>
          <div className="text-3xl font-bold tracking-tight text-amber-500 mt-1">
            {stats.awaiting}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Awaiting interview scheduling</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Selected Core Recruits
          </div>
          <div className="text-3xl font-bold tracking-tight text-emerald-500 mt-1">
            {stats.accepted}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Accepted into GDG Core</p>
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
            <FilterDepartment filterFunc={(dept) => { setSelectedDept(dept || "All"); setPageIndex(0); }} />

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPageIndex(0);
              }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="All">All Final Statuses</option>
              <option value="accepted">Accepted (Core Recruits)</option>
              <option value="scheduled">Interview Scheduled</option>
              <option value="awaiting">Pending Slot Scheduling</option>
              <option value="rejected">Rejected</option>
            </select>

            <Button variant="outline" size="sm" onClick={resetAllFilters} className="rounded-xl gap-1.5">
              <GrPowerReset className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlotConfigModalOpen(true)}
              className="rounded-xl gap-1.5 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Configure 15-Min Slots</span>
            </Button>

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
                    Interview Schedule
                  </div>
                </TableHead>
                <TableHead>
                  <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    Status
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="inline-flex items-center justify-end gap-1.5 font-semibold text-foreground w-full">
                    Decision Controls
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    No Round 3 finalists found matching current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((candidate, idx) => {
                  const id = candidate._id || candidate.id;
                  const r3 = candidate.round3Interview || {};
                  const isAccepted = candidate.status === "accepted";
                  const isRejected = candidate.status === "rejected";
                  const isScheduled = Boolean(r3.slotTime);

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
                        {isScheduled ? (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                              <span>{r3.slotTime}</span>
                            </div>
                            {r3.venue && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{r3.venue}</span>
                              </div>
                            )}
                            {r3.meetLink && (
                              <div className="flex items-center gap-1.5">
                                <Video className="h-3.5 w-3.5 text-blue-400" />
                                <a
                                  href={r3.meetLink}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-primary hover:underline max-w-[150px] truncate"
                                >
                                  {r3.meetLink.replace(/^https?:\/\//, "")}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            Slot Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAccepted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Accepted (GDG Core)
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            <XCircle className="h-3.5 w-3.5" />
                            Rejected
                          </span>
                        ) : isScheduled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                            <Calendar className="h-3.5 w-3.5" />
                            Scheduled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock className="h-3.5 w-3.5" />
                            Awaiting Slot
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">

                          {!isAccepted && (
                            <button
                              onClick={() => handleAcceptToCore(id)}
                              disabled={actionLoading === id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>Accept</span>
                            </button>
                          )}

                          {!isRejected && (
                            <button
                              onClick={() => handleRejectCandidate(id)}
                              disabled={actionLoading === id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Reject
                            </button>
                          )}
                        </div>
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



      {/* 15-Minute Cumulative Slot Generator Modal */}
      <InterviewSlotManagerModal
        isOpen={slotConfigModalOpen}
        onClose={() => setSlotConfigModalOpen(false)}
        defaultDepartment={selectedDept !== "All" ? selectedDept : "Web Dev"}
        onSlotsUpdated={() => {
          // If parent provided onDataUpdate or refresh
        }}
      />
    </div>
  );
}
