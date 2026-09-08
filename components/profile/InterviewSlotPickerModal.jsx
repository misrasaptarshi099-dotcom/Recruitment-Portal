"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PixelCard, PixelButton } from "@/components/design-system";
import { Calendar, Clock, Video, X, Check, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PixelRunningDino } from "@/components/DinoRunningLoader";
import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewSlotPickerModal({
  isOpen,
  onClose,
  applicationId,
  departmentName,
  currentInterview,
  onSlotBooked,
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(currentInterview?.slotId || null);
  const [selectedDate, setSelectedDate] = useState(currentInterview?.date || null);

  useEffect(() => {
    if (!isOpen || !departmentName) return;

    async function loadSlots() {
      setLoading(true);
      try {
        const res = await fetch(`/api/user/interview-slots?department=${encodeURIComponent(departmentName)}`);
        if (res.ok) {
          const json = await res.json();
          const fetched = json.data || [];
          setSlots(fetched);

          // Auto-select first date with available slots if none selected
          if (fetched.length > 0) {
            const dates = Array.from(new Set(fetched.map((s) => s.date)));
            if (dates.length > 0) {
              setSelectedDate((prev) => (!prev || !dates.includes(prev) ? dates[0] : prev));
            }
          }
        } else {
          toast.error("Failed to load available interview slots");
        }
      } catch (err) {
        console.error("Error loading slots:", err);
        toast.error("Error loading interview slots");
      } finally {
        setLoading(false);
      }
    }

    loadSlots();
  }, [isOpen, departmentName]);

  // Group slots by date
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(slots.map((s) => s.date))).filter(Boolean);
  }, [slots]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return slots.filter((s) => s.date === selectedDate);
  }, [slots, selectedDate]);

  const selectedSlot = useMemo(() => {
    return slots.find((s) => s.slotId === selectedSlotId || s.id === selectedSlotId);
  }, [slots, selectedSlotId]);

  if (!isOpen) return null;

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    if (!selectedSlotId) {
      toast.error("Please select an available 15-minute time slot");
      return;
    }

    setBooking(true);
    try {
      const res = await fetch("/api/user/interview-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          slotId: selectedSlotId,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Interview slot reserved successfully! Meeting link is now active.");
        if (onSlotBooked) onSlotBooked(applicationId, json.data);
        onClose();
      } else {
        toast.error(json.message || "Failed to reserve slot");
      }
    } catch (err) {
      console.error("Error booking slot:", err);
      toast.error("Failed to reserve interview slot");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto relative z-50">
        <PixelCard variant="arcade" scanline={true} className="w-full p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <span className="font-pixel text-[9px] text-cyan-400 uppercase tracking-widest block">
                  ROUND 03 // INTERVIEW_SCHEDULING
                </span>
                <h3 className="font-sans font-bold text-lg text-foreground">
                  Select {departmentName} Interview Slot
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

          <div className="text-xs font-mono text-muted-foreground leading-relaxed">
            Congratulations on clearing Round 2! Each interview session is <strong>15 minutes</strong> with department leads. Choose an open slot below to confirm your schedule.
          </div>

          {loading ? (
            <div role="status" aria-busy="true" className="space-y-5">
              <span className="sr-only">Loading available interview slots...</span>
              {/* Date Selection Skeletons */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-28 rounded-lg" />
                  <Skeleton className="h-8 w-28 rounded-lg" />
                  <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
              </div>

              {/* Slot Cards Grid Skeletons */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-48" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Skeleton className="h-3.5 w-3.5 rounded-full" />
                          <Skeleton className="h-4 w-24 rounded" />
                        </div>
                        <Skeleton className="h-2.5 w-14 rounded" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button Skeleton */}
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : slots.length === 0 ? (
            <div className="py-8 text-center space-y-2 bg-muted/10 border border-dashed border-border/60 rounded-xl p-4">
              <AlertCircle className="h-6 w-6 text-amber-400 mx-auto" />
              <h4 className="font-sans font-bold text-foreground text-sm">
                Slots Not Yet Published
              </h4>
              <p className="text-xs font-mono text-muted-foreground max-w-sm mx-auto">
                The {departmentName} committee has not published interview slots yet. Please check back shortly or check department announcements.
              </p>
            </div>
          ) : (
            <form onSubmit={handleConfirmReservation} className="space-y-5">
              {/* Date Selection Tabs */}
              {uniqueDates.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-muted-foreground block uppercase">
                    1. Select Interview Date
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {uniqueDates.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          if (selectedDate !== d) {
                            setSelectedDate(d);
                            setSelectedSlotId(null);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-mono transition-all border ${
                          selectedDate === d
                            ? "border-cyan-500 bg-cyan-500/15 text-cyan-300 font-bold shadow-[2px_2px_0px_#06B6D4]"
                            : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                      >
                        📅 {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 15-Minute Slot Tiles */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-muted-foreground block uppercase">
                  2. Choose Available 15-Minute Slot
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {slotsForSelectedDate.map((slot) => {
                    const isSelected = selectedSlotId === (slot.slotId || slot.id);
                    const isAvailable = slot.isAvailable;
                    const isMine = slot.isBookedByMe;

                    return (
                      <button
                        key={slot.slotId || slot.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlotId(slot.slotId || slot.id)}
                        className={`p-3 rounded-xl border text-left font-mono transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/20 text-foreground ring-1 ring-cyan-400 shadow-[2px_2px_0px_#06B6D4]"
                            : isMine
                            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                            : isAvailable
                            ? "border-border/80 bg-card hover:border-cyan-500/60 hover:bg-muted/30 text-foreground cursor-pointer"
                            : "border-border/30 bg-muted/10 text-muted-foreground/40 cursor-not-allowed"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-cyan-400" />
                            <span>{slot.slotLabel}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Duration: 15 minutes
                          </span>
                        </div>

                        <div>
                          {isMine ? (
                            <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                              YOUR SLOT
                            </span>
                          ) : isAvailable ? (
                            <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/40">
                              OPEN
                            </span>
                          ) : (
                            <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded bg-muted text-muted-foreground/60 border border-border/40">
                              TAKEN
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Slot Confirmation Summary */}
              {selectedSlot && (
                <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-500/5 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Selected: {selectedSlot.date} · {selectedSlot.slotLabel}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Format: 15-minute live Google Meet interview. Meeting link will unlock on your profile immediately after confirmation.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
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
                  disabled={booking || !selectedSlotId}
                  className="font-mono text-xs"
                >
                  {booking ? "CONFIRMING..." : "CONFIRM & RESERVE SLOT"}
                </PixelButton>
              </div>
            </form>
          )}
        </PixelCard>
      </div>
    </div>
  );
}
