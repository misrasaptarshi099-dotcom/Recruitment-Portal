"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { PixelCard, PixelButton, PixelBadge } from "@/components/design-system";
import DinoRankBadge from "@/components/profile/DinoRankBadge";
import RoundProgressStepper from "@/components/profile/RoundProgressStepper";
import ApplicationAnswersModal from "@/components/profile/ApplicationAnswersModal";
import DinoRunningLoader from "@/components/profile/DinoRunningLoader";
import {
  Mail,
  Hash,
  Compass,
  ArrowRight,
  ShieldCheck,
  Gamepad2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

let cachedProfileInMemory = null;

function getCachedProfile() {
  if (cachedProfileInMemory) return cachedProfileInMemory;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem("gdg_profile_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        cachedProfileInMemory = parsed;
        return parsed;
      }
    } catch {}
  }
  return null;
}

export default function ProfilePage() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedApp, setExpandedApp] = useState(null);
  const [progress, setProgress] = useState(0);
  const [readyToDisplay, setReadyToDisplay] = useState(false);
  const hasLoadedRef = React.useRef(false);

  // Hydration sync: safely hydrate client cache after mount
  useEffect(() => {
    setMounted(true);
    const cached = getCachedProfile();
    if (cached) {
      setProfileData(cached);
      hasLoadedRef.current = true;
    }
  }, []);

  const userEmail = session?.user?.email;

  const fetchProfile = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && !hasLoadedRef.current) {
        setLoading(true);
      }
      setError(null);
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        if (res.status === 401) {
          setProfileData(null);
          cachedProfileInMemory = null;
          if (typeof window !== "undefined") {
            try { sessionStorage.removeItem("gdg_profile_cache"); } catch {}
          }
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load candidate profile");
      }
      const data = await res.json();
      setProfileData(data);
      hasLoadedRef.current = true;
      cachedProfileInMemory = data;
      if (typeof window !== "undefined") {
        try { sessionStorage.setItem("gdg_profile_cache", JSON.stringify(data)); } catch {}
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      if (!hasLoadedRef.current) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading) {
      if (userEmail) {
        const isSilent = hasLoadedRef.current;
        fetchProfile(isSilent);
      } else {
        setLoading(false);
        setReadyToDisplay(true);
      }
    }
  }, [sessionLoading, userEmail, fetchProfile]);

  // Running Dino Telemetry progress loop (0% to 100%) - only runs on first cold load
  useEffect(() => {
    if (!mounted || readyToDisplay) return;

    if (!sessionLoading && !userEmail) {
      setReadyToDisplay(true);
      return;
    }

    let interval = null;
    let finishTimeout = null;

    interval = setInterval(() => {
      setProgress((prev) => {
        // If profileData is loaded, accelerate towards 100%
        if (profileData) {
          const next = prev + 10;
          if (next >= 100) {
            clearInterval(interval);
            finishTimeout = setTimeout(() => {
              setReadyToDisplay(true);
            }, 180);
            return 100;
          }
          return next;
        }

        // While waiting for API, smoothly climb up to ~85%
        if (prev < 85) {
          const step = Math.max(1, (85 - prev) * 0.14);
          return Math.min(prev + step, 85);
        }
        return prev;
      });
    }, 45);

    return () => {
      if (interval) clearInterval(interval);
      if (finishTimeout) clearTimeout(finishTimeout);
    };
  }, [mounted, sessionLoading, userEmail, profileData, readyToDisplay]);

  const handleTaskSubmitted = (applicationId, newRound2Task) => {
    setProfileData((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        applications: prev.applications.map((app) => {
          if (app.applicationId === applicationId) {
            return {
              ...app,
              rounds: {
                ...app.rounds,
                round2: {
                  ...app.rounds.round2,
                  status: "submitted",
                  submissionUrl: newRound2Task.submissionUrl,
                  submittedAt: newRound2Task.submittedAt,
                  notes: newRound2Task.notes,
                },
              },
            };
          }
          return app;
        }),
      };
      cachedProfileInMemory = updated;
      if (typeof window !== "undefined") {
        try { sessionStorage.setItem("gdg_profile_cache", JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
  };

  const handleSlotBooked = (applicationId, slotDetails) => {
    setProfileData((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        applications: prev.applications.map((app) => {
          if (app.applicationId === applicationId) {
            return {
              ...app,
              status: app.status === "accepted" ? "accepted" : "round3_scheduled",
              rounds: {
                ...app.rounds,
                round3: {
                  ...app.rounds.round3,
                  status: "scheduled",
                  slotTime: slotDetails.slotTime,
                  date: slotDetails.date,
                  startTime: slotDetails.startTime,
                  endTime: slotDetails.endTime,
                  meetingLink: slotDetails.meetingLink || slotDetails.meetLink,
                  meetLink: slotDetails.meetingLink || slotDetails.meetLink,
                  venue: slotDetails.venue,
                  slotId: slotDetails.slotId,
                  bookedAt: slotDetails.bookedAt,
                },
              },
            };
          }
          return app;
        }),
      };
      cachedProfileInMemory = updated;
      if (typeof window !== "undefined") {
        try { sessionStorage.setItem("gdg_profile_cache", JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
  };

  // --- 1. Hydration Guard: Render identical loader on SSR and first client hydration pass ---
  if (!mounted) {
    return (
      <DinoRunningLoader
        progress={0}
        statusMessage="Synchronizing candidate application dossier and arcade telemetry..."
      />
    );
  }

  // --- 2. Animated Running Dino Loading Screen (0% -> 100%) ---
  // Only shows on initial cold load before data is available
  if (!readyToDisplay) {
    if (!sessionLoading && !session?.user) {
      // Proceed to unauthenticated screen below
    } else if (error && !profileData) {
      // Proceed to error screen below
    } else {
      return (
        <DinoRunningLoader
          progress={progress}
          statusMessage="Synchronizing candidate application dossier and arcade telemetry..."
        />
      );
    }
  }

  // --- 3. Unauthenticated State (only when session resolution is complete and user is absent) ---
  if (!sessionLoading && !session?.user) {
    return (
      <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <PixelCard variant="arcade" scanline={true} className="max-w-md w-full text-center p-6 sm:p-8">
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-emerald-500/50 bg-zinc-900 text-2xl shadow-[2px_2px_0px_#10B981]">
              <span role="img" aria-label="locked">🔒</span>
            </div>
            <div>
              <span className="font-pixel text-[10px] text-emerald-500 uppercase tracking-wider block">
                TERMINAL // AUTH_REQUIRED
              </span>
              <h2 className="font-sans font-bold text-xl text-foreground mt-1">
                Candidate Profile Locked
              </h2>
            </div>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Please sign in with your verified <strong>@vitstudent.ac.in</strong> account to review your recruitment progress, track round evaluations, and submit tasks.
            </p>
            <div className="pt-2">
              <Link href="/auth/signin">
                <PixelButton variant="arcade" size="md" className="w-full font-pixel text-xs">
                  SIGN IN WITH UNIVERSITY ID
                </PixelButton>
              </Link>
            </div>
          </div>
        </PixelCard>
      </div>
    );
  }

  // --- 4. Sync Error State ---
  if (error && !profileData) {
    return (
      <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <PixelCard variant="arcade" scanline={true} className="max-w-md w-full text-center p-6 sm:p-8">
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-destructive/50 bg-zinc-900 text-2xl shadow-[2px_2px_0px_#EF4444]">
              <span role="img" aria-label="error">⚠️</span>
            </div>
            <div>
              <span className="font-pixel text-[10px] text-destructive uppercase tracking-wider block">
                TERMINAL // SYNC_ERROR
              </span>
              <h2 className="font-sans font-bold text-xl text-foreground mt-1">
                Unable to Load Telemetry
              </h2>
            </div>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              {error || "An error occurred while synchronizing candidate applications."}
            </p>
            <div className="pt-2">
              <PixelButton onClick={() => fetchProfile()} variant="arcade" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                RETRY SYNCHRONIZATION
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      </div>
    );
  }

  // --- 5. Data Guard: Dossier values must be available before displaying profile ---
  if (!profileData) {
    return (
      <DinoRunningLoader
        progress={progress}
        statusMessage="Synchronizing candidate application dossier and arcade telemetry..."
      />
    );
  }

  const user = {
    name: profileData?.user?.name || session?.user?.name || "VIT Student",
    email: profileData?.user?.email || session?.user?.email || "",
    registrationNumber: profileData?.user?.registrationNumber || "",
    gender: profileData?.user?.gender || "",
    yearOfStudy: profileData?.user?.yearOfStudy || "",
    avatar: profileData?.user?.avatar || session?.user?.image || null,
  };

  const stats = profileData?.stats || {
    highScore: 0,
    gamesPlayed: 0,
    rank: {
      title: "PIXEL CADET",
      tier: "ROOKIE",
      level: 1,
      badgeColor: "text-blue-400 border-blue-500 bg-blue-500/10 shadow-[2px_2px_0px_#3B82F6]",
      icon: "🥚",
      description: "Beginner runner. Desert runway warmup.",
    },
  };

  const applications = profileData?.applications || [];
  const hasRemainingQuota = applications.length < 2;
  const userHandle = (user.email ? user.email.split("@")[0] : "STUDENT").toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pixel Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 pixel-grid-pattern opacity-15" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-20">
        {/* Connection Warning Banner if fetch had issues */}
        {error && (
          <div className="border border-amber-500/60 bg-amber-500/10 p-3.5 flex items-center justify-between gap-3 text-xs font-mono text-amber-500">
            <span>⚠ Connection note: Telemetry loaded from cache. ({error})</span>
            <button
              onClick={() => fetchProfile()}
              className="flex items-center gap-1 underline font-bold hover:text-amber-400 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              RETRY
            </button>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <PixelBadge variant="arcade" pixel={true}>
                CANDIDATE STATION
              </PixelBadge>
              <span className="font-mono text-xs text-muted-foreground">
                {"// ID: "}{userHandle}
              </span>
            </div>
            <h1 className="font-sans font-black text-2xl sm:text-3xl text-foreground tracking-tight">
              Recruitment Dossier
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/departments">
              <PixelButton variant="outline" size="sm" className="font-mono text-xs">
                <Compass className="h-3.5 w-3.5" />
                EXPLORE TRACKS
              </PixelButton>
            </Link>
            <Link href="/#dino-game-section">
              <PixelButton variant="arcade" size="sm" className="font-pixel text-[9px]">
                <Gamepad2 className="h-3.5 w-3.5" />
                DINO RUN
              </PixelButton>
            </Link>
          </div>
        </div>

        {/* User Identity HUD Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left 2 Cols: Identity Info */}
          <div className="lg:col-span-2 border border-border/80 bg-card p-5 sm:p-6 shadow-[2px_2px_0px_#4285F4] dark:bg-zinc-950 relative overflow-hidden flex flex-col justify-between">
            <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-20" />

            <div className="relative z-20 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                {/* Avatar Box */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-border bg-muted/60 text-foreground font-pixel text-xl shadow-[2px_2px_0px_rgba(0,0,0,0.3)] overflow-hidden">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name || "Avatar"}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{user.name ? user.name[0].toUpperCase() : "U"}</span>
                  )}
                </div>

                {/* User Bio Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-sans font-bold text-lg sm:text-xl text-foreground truncate">
                      {user.name || "VIT Student"}
                    </h2>
                    <span className="inline-flex items-center gap-1 border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-500 font-semibold">
                      <ShieldCheck className="h-3 w-3" />
                      VERIFIED STUDENT
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-muted-foreground">
                    {user.email && (
                      <span className="flex items-center gap-1 text-foreground/90">
                        <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </span>
                    )}
                    {user.registrationNumber && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{user.registrationNumber}</span>
                      </span>
                    )}
                    {user.yearOfStudy && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Year {user.yearOfStudy}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Application Quota Meter Bar */}
              <div className="border border-border/80 bg-background/90 p-3 flex items-center justify-between gap-3">
                <span className="font-pixel text-[8px] uppercase tracking-widest text-muted-foreground">
                  APPLICATION QUOTA
                </span>
                <span className="font-pixel text-xs text-foreground">
                  {applications.length} / 2 TRACKS USED
                </span>
              </div>
            </div>
          </div>

          {/* Right Col: Arcade High Score & Rank Tier */}
          <div className="lg:col-span-1 flex flex-col">
            <DinoRankBadge
              rank={stats.rank}
              highScore={stats.highScore}
              gamesPlayed={stats.gamesPlayed}
              className="h-full"
            />
          </div>
        </div>

        {/* Applications & 3-Round Progression Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground block">
                EVALUATION TRACKER
              </span>
              <h3 className="font-sans font-bold text-lg text-foreground">
                Active Track Applications ({applications.length})
              </h3>
            </div>
            {applications.length === 1 ? (
              <Link href="/departments">
                <PixelButton variant="outline" size="sm" className="font-pixel text-[9px]">
                  + APPLY 2ND TRACK
                </PixelButton>
              </Link>
            ) : applications.length === 0 ? (
              <Link href="/departments">
                <PixelButton variant="outline" size="sm" className="font-pixel text-[9px]">
                  + EXPLORE TRACKS
                </PixelButton>
              </Link>
            ) : null}
          </div>

          {/* If Candidate has No Applications Yet */}
          {applications.length === 0 ? (
            <PixelCard variant="arcade" scanline={true} className="text-center py-12 px-6">
              <div className="max-w-md mx-auto space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-emerald-500/50 bg-zinc-900 text-3xl shadow-[3px_3px_0px_#10B981]">
                  🦖
                </div>
                <div>
                  <h4 className="font-sans font-bold text-lg text-foreground">
                    No Active Applications Registered
                  </h4>
                  <p className="font-mono text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    You haven&apos;t applied to any GDG departments yet. You are eligible to submit up to <strong>2 applications</strong> across Technical and Creative/Management tracks.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/departments">
                    <PixelButton variant="arcade" size="md" className="font-pixel text-xs">
                      EXPLORE DEPARTMENT TREES
                      <ArrowRight className="h-4 w-4" />
                    </PixelButton>
                  </Link>
                </div>
              </div>
            </PixelCard>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.applicationId}
                  className="border border-border/80 bg-card/95 p-5 sm:p-6 shadow-xs dark:bg-zinc-950/90 relative overflow-hidden pl-6"
                >
                  {/* Subtle track tone accent stripe on the left edge */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: app.tone || "#4285F4" }}
                  />

                  <div className="relative z-20 space-y-4 text-foreground">
                    {/* App Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans font-bold text-lg text-foreground">
                            {app.department}
                          </h4>
                          <span
                            className="font-pixel text-[8px] uppercase tracking-wider px-2 py-0.5 border"
                            style={{
                              borderColor: `${app.tone}40`,
                              color: app.tone || "#4285F4",
                              backgroundColor: `${app.tone}12`,
                            }}
                          >
                            {app.isTechnical ? "Technical" : "Creative & Operations"}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          Applied: {new Date(app.submittedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <ApplicationAnswersModal
                          departmentName={app.department}
                          submittedAt={app.submittedAt}
                          answers={app.answers || []}
                          applicationId={app.applicationId}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedApp(expandedApp === app.applicationId ? null : app.applicationId)
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground border border-transparent hover:border-border/60 transition-colors cursor-pointer"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          <span>{expandedApp === app.applicationId ? "Hide Info" : "Info"}</span>
                          {expandedApp === app.applicationId ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 3-Round Progress Stepper */}
                    <RoundProgressStepper
                      applicationId={app.applicationId}
                      departmentName={app.department}
                      rounds={app.rounds}
                      onTaskSubmitted={(newTask) =>
                        handleTaskSubmitted(app.applicationId, newTask)
                      }
                      onSlotBooked={(appId, slotDetails) =>
                        handleSlotBooked(appId, slotDetails)
                      }
                    />

                    {/* Expandable Submission Details */}
                    {expandedApp === app.applicationId && (
                      <div className="pt-3 border-t border-border/30 font-mono text-xs bg-muted/20 p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                          <div>
                            <span className="text-muted-foreground/80">Application ID:</span>{" "}
                            <span className="text-foreground">{app.applicationId}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/80">Candidate:</span>{" "}
                            <span className="text-foreground">{user.email}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border/20 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            Questionnaire responses: {app.answers?.length || 0} recorded
                          </span>
                          <ApplicationAnswersModal
                            departmentName={app.department}
                            submittedAt={app.submittedAt}
                            answers={app.answers || []}
                            applicationId={app.applicationId}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Second Quota Available Notice */}
              {hasRemainingQuota && applications.length > 0 && (
                <div className="border border-dashed border-border/80 bg-muted/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div className="space-y-1">
                    <span className="font-pixel text-[9px] text-emerald-500 uppercase tracking-wider">
                      QUOTA ALERT // 1 REMAINING SLOT
                    </span>
                    <p className="font-mono text-xs text-muted-foreground">
                      You are eligible to apply for 1 additional department. Diversify your chances across technical and creative tracks.
                    </p>
                  </div>
                  <Link href="/departments">
                    <PixelButton variant="outline" size="sm" className="font-pixel text-[9px] shrink-0">
                      APPLY FOR 2ND TRACK
                      <ArrowRight className="h-3.5 w-3.5" />
                    </PixelButton>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Arcade Leaderboard Banner */}
        <div className="border border-border/80 bg-card p-5 shadow-[2px_2px_0px_#10B981] dark:bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="h-10 w-10 flex items-center justify-center border border-emerald-500/40 bg-zinc-900 text-xl shadow-[2px_2px_0px_#10B981] shrink-0">
              🦖
            </div>
            <div>
              <span className="font-pixel text-[9px] text-emerald-500 uppercase tracking-widest block">
                DINO ARENA // REPUTATION
              </span>
              <p className="font-mono text-xs text-muted-foreground">
                Your highest run score contributes to your candidate rank on the arcade leaderboard.
              </p>
            </div>
          </div>

          <Link href="/#dino-game-section">
            <PixelButton variant="arcade" size="sm" className="font-pixel text-[9px]">
              LAUNCH DINO RUNNER
            </PixelButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
