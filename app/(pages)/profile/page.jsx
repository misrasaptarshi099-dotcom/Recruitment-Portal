"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { PixelCard, PixelButton, PixelBadge } from "@/components/design-system";
import DinoRankBadge from "@/components/profile/DinoRankBadge";
import RoundProgressStepper from "@/components/profile/RoundProgressStepper";
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

export default function ProfilePage() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedApp, setExpandedApp] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        if (res.status === 401) {
          setProfileData(null);
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load candidate profile");
      }
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading) {
      if (session?.user) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    }
  }, [sessionLoading, session, fetchProfile]);

  const handleTaskSubmitted = (applicationId, newRound2Task) => {
    setProfileData((prev) => {
      if (!prev) return prev;
      return {
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
    });
  };

  // --- Loading Skeleton ---
  if (sessionLoading || (loading && !profileData && !session?.user)) {
    return (
      <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-block p-4 border-2 border-emerald-500/60 bg-zinc-950 shadow-[4px_4px_0px_#10B981]">
            <pre className="font-mono text-emerald-400 text-xs leading-none select-none">
{`    ███████
   ███  ████
   █████████
   ████
  ███████
 █  ███  █
    █ █   `}
            </pre>
          </div>
          <div className="font-pixel text-xs text-emerald-500 uppercase tracking-widest animate-pulse">
            [MAINFRAME // ACCESSING_CANDIDATE_DATA]
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            Synchronizing BCNF records and arcade telemetry...
          </p>
        </div>
      </div>
    );
  }

  // --- Unauthenticated State ---
  if (!session?.user) {
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
          <div className="lg:col-span-2 border-2 border-border/80 bg-card p-5 sm:p-6 shadow-[4px_4px_0px_#4285F4] dark:bg-zinc-950 relative overflow-hidden flex flex-col justify-between">
            <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-20" />

            <div className="relative z-20 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                {/* Avatar Box */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-border bg-muted/60 text-foreground font-pixel text-xl shadow-[2px_2px_0px_currentColor] overflow-hidden">
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
            <div className="space-y-6">
              {applications.map((app) => (
                <div
                  key={app.applicationId}
                  className="border-2 border-border/80 bg-card p-5 sm:p-6 shadow-[5px_5px_0px_currentColor] dark:bg-zinc-950 relative overflow-hidden"
                  style={{ color: app.tone || "#4285F4" }}
                >
                  <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-15" />

                  <div className="relative z-20 space-y-6 text-foreground">
                    {/* App Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-pixel text-[9px] uppercase tracking-wider px-2 py-0.5 border"
                            style={{
                              borderColor: app.tone,
                              color: app.tone,
                              backgroundColor: `${app.tone}15`,
                            }}
                          >
                            {app.isTechnical ? "TECHNICAL TRACK" : "MANAGEMENT / CREATIVE"}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            Applied: {new Date(app.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-sans font-black text-xl text-foreground">
                          {app.department}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setExpandedApp(expandedApp === app.applicationId ? null : app.applicationId)
                          }
                          className="flex items-center gap-1.5 border border-border/80 bg-muted/60 px-2.5 py-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          <span>{expandedApp === app.applicationId ? "Hide Details" : "View Submission"}</span>
                          {expandedApp === app.applicationId ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 3-Round Progress Stepper */}
                    <div>
                      <div className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground mb-3">
                        [PROGRESSION_STAGE // ROUNDS_01_THROUGH_03]
                      </div>
                      <RoundProgressStepper
                        applicationId={app.applicationId}
                        departmentName={app.department}
                        rounds={app.rounds}
                        onTaskSubmitted={(newTask) =>
                          handleTaskSubmitted(app.applicationId, newTask)
                        }
                      />
                    </div>

                    {/* Expandable Submission Details */}
                    {expandedApp === app.applicationId && (
                      <div className="pt-4 border-t border-border/40 font-mono text-xs space-y-2 bg-muted/30 p-4">
                        <span className="font-pixel text-[9px] uppercase text-muted-foreground block">
                          SYSTEM DOSSIER // APPLICANT RECORD
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground">
                          <div>
                            <strong>Application ID:</strong>{" "}
                            <span className="text-foreground">{app.applicationId}</span>
                          </div>
                          <div>
                            <strong>Candidate Key:</strong>{" "}
                            <span className="text-foreground">{user.email}</span>
                          </div>
                          <div>
                            <strong>Initial Screening Status:</strong>{" "}
                            <span className="text-foreground uppercase">{app.rounds.round1.status}</span>
                          </div>
                          <div>
                            <strong>Active Evaluation Stage:</strong>{" "}
                            <span className="text-foreground">Round {app.currentRound}</span>
                          </div>
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
        <div className="border-2 border-border/80 bg-card p-5 shadow-[4px_4px_0px_#10B981] dark:bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-4">
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
