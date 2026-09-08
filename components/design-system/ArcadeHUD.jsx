"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX, Sparkles } from "lucide-react";

function padZero(num, length = 5) {
  return String(Math.floor(num || 0)).padStart(length, "0");
}

export default function ArcadeHUD({
  score = 0,
  highScore = 0,
  stage = "ROUND 1",
  soundEnabled = true,
  onToggleSound,
  className,
}) {
  return (
    <div
      className={cn(
        "relative flex flex-wrap items-center justify-between gap-4 border-b-2 border-border/80 bg-muted/90 dark:bg-zinc-950/95 px-4 py-2.5 text-foreground dark:text-zinc-100 backdrop-blur-md shadow-pixel-sm font-pixel select-none",
        className
      )}
    >
      {/* CRT Scanline Overlay */}
      <div className="scanline-overlay pointer-events-none absolute inset-0 opacity-20" />

      {/* Left: Stage Indicator */}
      <div className="flex items-center gap-2.5 z-10">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] text-muted-foreground dark:text-zinc-400">MISSION:</span>
        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{stage}</span>
      </div>

      {/* Center: Score Display */}
      <div className="flex items-center gap-6 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground dark:text-zinc-500">HI</span>
          <span className="text-[11px] tracking-wider text-amber-600 dark:text-amber-400 font-bold">
            {padZero(highScore)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground dark:text-zinc-500">SCORE</span>
          <span className="text-[12px] tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
            {padZero(score)}
          </span>
        </div>
      </div>

      {/* Right: Audio Toggle & Quick Badges */}
      <div className="flex items-center gap-3 z-10">
        <button
          type="button"
          onClick={onToggleSound}
          className="flex h-7 w-7 items-center justify-center border-2 border-border bg-background hover:bg-muted dark:border-zinc-700 dark:bg-zinc-900 text-foreground dark:text-zinc-300 hover:text-foreground dark:hover:text-white transition-colors shadow-pixel-sm"
          title={soundEnabled ? "Mute Arcade Sound" : "Enable Arcade Sound"}
        >
          {soundEnabled ? (
            <Volume2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
          )}
        </button>
      </div>
    </div>
  );
}
