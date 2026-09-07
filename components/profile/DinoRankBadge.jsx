"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Trophy, Gamepad2, Zap } from "lucide-react";
import Link from "next/link";
import { PixelButton } from "../design-system";

export default function DinoRankBadge({
  rank = {
    title: "PIXEL CADET",
    tier: "ROOKIE",
    level: 1,
    badgeColor: "text-blue-400 border-blue-500 bg-blue-500/10 shadow-[2px_2px_0px_#3B82F6]",
    icon: "🥚",
    description: "Beginner runner. Warming up on the desert runway.",
  },
  highScore = 0,
  gamesPlayed = 0,
  className,
}) {
  // Next tier threshold
  let nextThreshold = 250;
  let nextRankName = "DESERT RUNNER";
  if (highScore >= 1200) {
    nextThreshold = null;
    nextRankName = "MAX_TIER";
  } else if (highScore >= 600) {
    nextThreshold = 1200;
    nextRankName = "CHROME T-REX";
  } else if (highScore >= 250) {
    nextThreshold = 600;
    nextRankName = "VELOCIRAPTOR";
  }

  const progressPercent = nextThreshold
    ? Math.min(100, Math.round((highScore / nextThreshold) * 100))
    : 100;

  return (
    <div
      className={cn(
        "relative p-4 sm:p-5 border-2 border-border/80 bg-card/95 shadow-[4px_4px_0px_#10B981] dark:bg-zinc-950 overflow-hidden",
        className
      )}
    >
      {/* Background scanline */}
      <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-20" />

      <div className="relative z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Rank Tier & Sprite */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-emerald-500/40 bg-zinc-900 text-2xl shadow-[2px_2px_0px_#10B981]">
            <span role="img" aria-label="rank icon" className="animate-bounce-subtle">
              {rank.icon || "🦖"}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[11px] sm:text-xs uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
                {rank.title}
              </span>
              <span className="border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                LVL {rank.level}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {rank.description}
            </p>
          </div>
        </div>

        {/* Middle: Arcade HUD Metrics */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-xs">
          <div className="border border-border/60 bg-background/80 px-3 py-1.5 shadow-sm">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-pixel text-[8px]">
              HIGH SCORE
            </span>
            <span className="font-pixel text-sm text-foreground text-emerald-500 dark:text-emerald-400">
              {String(highScore).padStart(5, "0")}
            </span>
          </div>

          <div className="border border-border/60 bg-background/80 px-3 py-1.5 shadow-sm">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-pixel text-[8px]">
              GAMES RUN
            </span>
            <span className="font-mono font-bold text-sm text-foreground">
              {gamesPlayed}
            </span>
          </div>

          {/* Quick Play CTA */}
          <Link href="/#dino-game-section" className="inline-block">
            <PixelButton variant="arcade" size="sm" className="h-9 font-pixel text-[9px]">
              <Gamepad2 className="h-3.5 w-3.5" />
              PLAY DINO RUN
            </PixelButton>
          </Link>
        </div>
      </div>

      {/* Bottom: XP / Progress to next tier */}
      {nextThreshold && (
        <div className="mt-4 pt-3 border-t border-border/40 relative z-20">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>Next Rank: <strong className="text-foreground">{nextRankName}</strong></span>
            </span>
            <span>
              {highScore} / {nextThreshold} PTS ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full bg-muted/80 border border-border/60 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_8px_#10B981]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
