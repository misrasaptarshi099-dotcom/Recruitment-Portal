"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PixelCard, PixelButton } from "@/components/design-system";
import { Calendar, Clock, Video, X, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Users } from "lucide-react";
import { departmentsData as rawDepts } from "@/constants/departments-data";
import { toast } from "sonner";

const departmentsList = Array.isArray(rawDepts) ? rawDepts : [];

export default function InterviewSlotManagerModal({ isOpen, onClose, defaultDepartment = "Web Dev", onSlotsUpdated }) {
  const [selectedDept, setSelectedDept] = useState(defaultDepartment || "Web Dev");
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("17:00");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [existingSlots, setExistingSlots] = useState([]);

  // Calculate live preview of slots
  const slotCountPreview = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;
    const diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff < 15) return 0;
    return Math.floor(diff / 15);
  }, [startTime, endTime]);

  const fetchSlots = useCallback(async () => {
    if (!selectedDept) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/interview-slots?department=${encodeURIComponent(selectedDept)}`);
      if (res.ok) {
        const json = await res.json();
        setExistingSlots(json.data || []);
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
    }
  }, [isOpen, fetchSlots]);

  if (!isOpen) return null;

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    if (slotCountPreview <= 0) {
      toast.error("Please enter a valid time range of at least 15 minutes");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/interview-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: selectedDept,
          date,
          startTime,
          endTime,
          meetingLink,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || `Generated ${slotCountPreview} 15-minute slots!`);
        fetchSlots();
        if (onSlotsUpdated) onSlotsUpdated();
      } else {
        toast.error(json.message || "Failed to generate interview slots");
      }
    } catch (err) {
      console.error("Error generating slots:", err);
      toast.error("An error occurred while generating interview slots");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      const res = await fetch(`/api/admin/interview-slots?slotId=${encodeURIComponent(slotId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Slot deleted");
        setExistingSlots((prev) => prev.filter((s) => s.slotId !== slotId && s.id !== slotId));
        if (onSlotsUpdated) onSlotsUpdated();
      } else {
        const json = await res.json();
        toast.error(json.message || "Failed to delete slot");
      }
    } catch (err) {
      console.error("Error deleting slot:", err);
      toast.error("Error deleting slot");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-50">
        <PixelCard variant="arcade" scanline={true} className="w-full p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <span className="font-pixel text-[9px] text-cyan-400 uppercase tracking-widest block">
                  ROUND 03 // 15-MIN CUMULATIVE INTERVIEWS
                </span>
                <h3 className="font-sans font-bold text-lg sm:text-xl text-foreground">
                  Configure Department Interview Slots
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

          {/* Generator Form */}
          <form onSubmit={handleGenerateSlots} className="bg-muted/20 border border-border/60 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground block">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-foreground"
                >
                  {(departmentsList || []).map((d) => (
                    <option key={d.name || d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground block">
                  Interview Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-foreground"
                />
              </div>

              {/* Time Range: N to M */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground block">
                  Start Time (N)
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground block">
                  End Time (M)
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-foreground"
                />
              </div>
            </div>

            {/* Google Meet Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-cyan-400" />
                <span>Default Interview Google Meet Link</span>
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                required
                className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Preview Banner & Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border/40">
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  Generates <strong>{slotCountPreview}</strong> contiguous 15-min interview slots ({startTime} → {endTime})
                </span>
              </div>
              <PixelButton
                type="submit"
                variant="arcade"
                size="sm"
                disabled={generating || slotCountPreview <= 0}
                className="font-mono text-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {generating ? "GENERATING..." : `PUBLISH ${slotCountPreview} SLOTS`}
              </PixelButton>
            </div>
          </form>

          {/* Existing Slots Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <span>Active Slots for {selectedDept}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/60">
                  {existingSlots.length} Slots Total
                </span>
              </h4>
              <button
                type="button"
                onClick={fetchSlots}
                className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                Loading existing slots...
              </div>
            ) : existingSlots.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-muted-foreground/80 bg-muted/10 border border-dashed border-border/60 rounded-xl">
                No slots configured for {selectedDept} yet. Use the generator above to create slots.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-border/60 rounded-xl divide-y divide-border/40 bg-background">
                {existingSlots.map((slot) => {
                  const isBooked = slot.status === "booked";
                  return (
                    <div
                      key={slot.slotId || slot.id}
                      className="p-2.5 flex items-center justify-between text-xs font-mono hover:bg-muted/20 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-foreground shrink-0">{slot.date}</span>
                        <span className="text-cyan-400 shrink-0 font-medium">{slot.slotLabel}</span>
                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                          (15 min)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isBooked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            <Users className="h-2.5 w-2.5" />
                            <span>{slot.candidateName || slot.bookedBy || "Reserved"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Available</span>
                          </span>
                        )}

                        {!isBooked && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.slotId || slot.id)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete unbooked slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </PixelCard>
      </div>
    </div>
  );
}
