"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Gamepad2, Zap } from "lucide-react";
import Link from "next/link";
import { PixelButton } from "../design-system";

export default function DinoRankBadge({
  rank = {
    title: "PIXEL CADET",
    tier: "ROOKIE",
    level: 1,
    badgeColor: "text-blue-400 border-blue-500 bg-blue-500/10 shadow-[2px_2px_0px_#3B82F6]",
    icon: "🥚",
    description: "Beginner runner. Desert runway warmup.",
  },
  highScore = 0,
  gamesPlayed = 0,
  className,
}) {
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
        "relative p-5 border border-border/80 bg-card/95 shadow-[2px_2px_0px_#10B981] dark:bg-zinc-950 flex flex-col justify-between overflow-hidden",
        className
      )}
    >
      {/* Background scanline */}
      <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-20" />

      <div className="relative z-20 space-y-4">
        {/* Header: Rank Tier & Sprite */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center border-2 border-emerald-500/40 bg-zinc-900 text-2xl shadow-[2px_2px_0px_#10B981]">
            <span role="img" aria-label="rank icon">
              {rank.icon || "🦖"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs uppercase tracking-wider text-emerald-500 dark:text-emerald-400 truncate">
                {rank.title}
              </span>
              <span className="border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">
                LVL {rank.level}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground font-sans">
              {rank.description || "Beginner runner. Desert runway warmup."}
            </p>
          </div>
        </div>

        {/* 2-Column Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
          <div className="border border-border/60 bg-background/80 p-2.5 text-center shadow-xs">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-pixel">
              HIGH SCORE
            </span>
            <span className="font-pixel text-base text-emerald-500 dark:text-emerald-400 mt-0.5 block">
              {String(highScore).padStart(5, "0")}
            </span>
          </div>

          <div className="border border-border/60 bg-background/80 p-2.5 text-center shadow-xs">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-pixel">
              GAMES RUN
            </span>
            <span className="font-mono font-bold text-base text-foreground mt-0.5 block">
              {gamesPlayed}
            </span>
          </div>
        </div>

        {/* Quick Play CTA: Full Width */}
        <Link href="/#dino-game-section" className="block w-full">
          <PixelButton
            variant="arcade"
            size="sm"
            className="w-full justify-center h-10 font-pixel text-[10px] whitespace-nowrap"
          >
            <Gamepad2 className="h-4 w-4 shrink-0" />
            <span>PLAY DINO RUN</span>
          </PixelButton>
        </Link>
      </div>

      {/* Bottom XP / Progress to next tier */}
      {nextThreshold && (
        <div className="mt-4 pt-3 border-t border-border/40 relative z-20">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1 truncate">
              <Zap className="h-3 w-3 text-amber-500 shrink-0" />
              <span>Next: <strong className="text-foreground">{nextRankName}</strong></span>
            </span>
            <span className="shrink-0 font-mono">
              {highScore}/{nextThreshold} ({progressPercent}%)
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
