"use client";

import React, { useState, useEffect } from "react";
import { PixelCard, PixelButton } from "@/components/design-system";
import { Calendar, Clock, X, Check, AlertCircle, Save, Layers, FileCode2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { departmentsData } from "@/constants/departments-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeadlineConfigModal({
  isOpen,
  onClose,
  onUpdated,
  allowedDepartments = [],
  isSuperAdmin = false,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("round1");

  // All departments data from backend: { [deptName]: { round1Deadline, round2Deadline, updatedAt, updatedBy } }
  const [deptDeadlinesMap, setDeptDeadlinesMap] = useState({});
  const [availableDepts, setAvailableDepts] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");

  // Current inputs for the selected department
  const [round1Deadline, setRound1Deadline] = useState("");
  const [round2Deadline, setRound2Deadline] = useState("");
  const [defaultDeadlines, setDefaultDeadlines] = useState({ round1: "", round2: "" });

  const formatForInput = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const allowedDeptsKey = Array.isArray(allowedDepartments) ? allowedDepartments.join(",") : "";

  useEffect(() => {
    if (!isOpen) return;

    async function fetchDeadlines() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/deadlines");
        if (res.ok) {
          const json = await res.json();
          const departmentsConfig = json.data?.departments || {};
          setDeptDeadlinesMap(departmentsConfig);

          const globalR1 = json.data?.round1Deadline || "";
          const globalR2 = json.data?.round2Deadline || "";
          setDefaultDeadlines({ round1: globalR1, round2: globalR2 });

          // Determine selectable departments:
          // Super admin gets all departments. Dept managers get their allowedDepartments.
          const allDepts = departmentsData.map((d) => d.name);
          const depts = isSuperAdmin
            ? allDepts
            : (allowedDepartments && allowedDepartments.length > 0)
            ? allowedDepartments
            : json.allowedDepartments || allDepts;

          setAvailableDepts(depts);

          // Default selected department
          const initialDept = depts[0] || "Management";
          setSelectedDept(initialDept);

          // Populate inputs for initial department
          const currentConfig = departmentsConfig[initialDept] || {};
          setRound1Deadline(formatForInput(currentConfig.round1Deadline || globalR1));
          setRound2Deadline(formatForInput(currentConfig.round2Deadline || globalR2));
        }
      } catch (err) {
        console.error("Error loading deadlines:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDeadlines();
  }, [isOpen, isSuperAdmin, allowedDeptsKey]);

  // When selected department changes, switch inputs to that department's deadlines
  const handleDepartmentChange = (deptName) => {
    setSelectedDept(deptName);
    const config = deptDeadlinesMap[deptName] || {};
    setRound1Deadline(formatForInput(config.round1Deadline || defaultDeadlines.round1));
    setRound2Deadline(formatForInput(config.round2Deadline || defaultDeadlines.round2));
  };

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDept) {
      toast.error("Please select a department first");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        department: selectedDept,
        round1Deadline: round1Deadline ? new Date(round1Deadline).toISOString() : null,
        round2Deadline: round2Deadline ? new Date(round2Deadline).toISOString() : null,
      };

      const res = await fetch("/api/admin/deadlines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(`Deadlines for "${selectedDept}" updated successfully!`);

        // Update local map so department switching immediately shows updated dates
        setDeptDeadlinesMap((prev) => ({
          ...prev,
          [selectedDept]: {
            ...prev[selectedDept],
            ...json.data,
          },
        }));

        if (onUpdated) onUpdated();
        onClose();
      } else {
        toast.error(json.message || "Failed to update deadlines");
      }
    } catch (err) {
      console.error("Error saving deadlines:", err);
      toast.error("Failed to update deadlines");
    } finally {
      setSaving(false);
    }
  };

  const selectedDeptConfig = deptDeadlinesMap[selectedDept] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="w-full max-w-lg relative z-50">
        <PixelCard variant="arcade" scanline={true} className="w-full p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/30">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <span className="font-pixel text-[9px] text-blue-400 uppercase tracking-widest block">
                  ADMINISTRATION // DEPARTMENT_SCHEDULE
                </span>
                <h3 className="font-sans font-bold text-lg text-foreground">
                  Department Recruitment Deadlines
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {/* Department Selector Skeleton */}
              <div className="space-y-2 bg-muted/40 p-3.5 rounded-xl border border-border/80">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>

              {/* Round Selector Tabs Skeleton */}
              <div className="flex gap-2 p-1 bg-muted/30 border border-border/60 rounded-xl">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
              </div>

              {/* Deadline Input Box Skeleton */}
              <div className="space-y-2 p-4 rounded-xl border border-border/60 bg-muted/20">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-3 w-48" />
              </div>

              {/* Save Button Skeleton */}
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Department Selector */}
              <div className="space-y-1.5 bg-muted/40 p-3.5 rounded-xl border border-border/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Target Department</span>
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {isSuperAdmin ? "Super Admin Access · All Departments" : "Your Assigned Department(s)"}
                  </span>
                </div>
                <select
                  value={selectedDept}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground cursor-pointer"
                >
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {selectedDeptConfig.updatedAt && (
                  <p className="text-[10px] font-mono text-muted-foreground pt-1">
                    Last modified: {new Date(selectedDeptConfig.updatedAt).toLocaleString()}{" "}
                    {selectedDeptConfig.updatedBy ? `by ${selectedDeptConfig.updatedBy}` : ""}
                  </p>
                )}
              </div>

              {/* Round Selector Tabs */}
              <div className="flex gap-2 p-1 bg-muted/30 border border-border/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("round1")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono transition-all ${
                    activeTab === "round1"
                      ? "bg-card text-foreground font-bold shadow-sm border border-blue-500/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  <span>Round 1 (Screening)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("round2")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono transition-all ${
                    activeTab === "round2"
                      ? "bg-card text-foreground font-bold shadow-sm border border-emerald-500/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Round 2 (Tasks)</span>
                </button>
              </div>

              {activeTab === "round1" ? (
                <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold">
                    <Layers className="h-4 w-4" />
                    <span>Round 1 Screening Cutoff · {selectedDept}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                    Set the strict deadline for candidate application submission and Round 1 evaluation for{" "}
                    <strong className="text-foreground">{selectedDept}</strong>.
                  </p>
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] font-mono text-muted-foreground block">
                      Target Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={round1Deadline}
                      onChange={(e) => setRound1Deadline(e.target.value)}
                      className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                    />
                  </div>
                  {round1Deadline && (
                    <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                      <Check className="h-3.5 w-3.5" />
                      <span>Closes on: {new Date(round1Deadline).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold">
                    <FileCode2 className="h-4 w-4" />
                    <span>Round 2 Task Submission Deadline · {selectedDept}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                    Set the deadline for shortlisted candidates in{" "}
                    <strong className="text-foreground">{selectedDept}</strong> to submit their repository, Figma, or Drive deliverable URLs.
                  </p>
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] font-mono text-muted-foreground block">
                      Target Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={round2Deadline}
                      onChange={(e) => setRound2Deadline(e.target.value)}
                      className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                    />
                  </div>
                  {round2Deadline && (
                    <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                      <Check className="h-3.5 w-3.5" />
                      <span>Task Submissions due by: {new Date(round2Deadline).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <PixelButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="font-mono text-xs"
                >
                  CANCEL
                </PixelButton>
                <PixelButton
                  type="submit"
                  variant="arcade"
                  size="sm"
                  disabled={saving}
                  className="font-mono text-xs"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "SAVING..." : `SAVE ${selectedDept?.toUpperCase()} DEADLINES`}
                </PixelButton>
              </div>
            </form>
          )}
        </PixelCard>
      </div>
    </div>
  );
}
