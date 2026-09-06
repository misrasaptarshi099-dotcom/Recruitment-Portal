"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, User, Trophy, Sparkles } from "lucide-react";
import DinoGame from "./DinoGame";
import { PixelBadge, PixelButton, PixelCard, ArcadeHUD } from "./design-system";

export default function Hero() {
  const [liveScore, setLiveScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <section className="relative overflow-hidden py-8 sm:py-12 lg:py-16">
      {/* Background Pixel Grid Matrix */}
      <div className="pixel-grid-pattern pointer-events-none absolute inset-0 -z-10 opacity-25" />

      {/* Ambient Radial Mesh Drops */}
      <div
        className="pointer-events-none absolute -top-40 left-1/4 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/10 via-emerald-500/5 to-amber-500/5 blur-[140px]"
        aria-hidden="true"
      />

      {/* Widescreen Container: Breathable and Uncongested */}
      <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-center">
          
          {/* =================================================================
              Left Column (5 cols on lg/xl): Clean Headline, Value Prop & CTAs
              ================================================================= */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-6">
            {/* Single Clean Eyebrow Badge */}
            <div className="flex items-center gap-3">
              <PixelBadge variant="arcade" pulse pulseColor="bg-emerald-400">
                GDG RECRUITMENT 2026 // ARCADE EDITION
              </PixelBadge>
              <span className="font-mono text-[11px] text-muted-foreground hidden sm:inline">
                [ROUND 1 ACTIVE]
              </span>
            </div>

            {/* Main Headline: Clean 2-3 Line Hierarchy with Google Brand Colors */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Ready to leap into{" "}
              <span className="inline-flex items-baseline font-black tracking-tight select-none">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">D</span>
                <span className="text-[#0F9D58]">G</span>
              </span>{" "}
              <span className="text-foreground">on Campus</span>
              <span className="text-[#FBBC04]">?</span>
            </h1>

            {/* Value Proposition Subtext */}
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
              Dodge the cacti, conquer the bugs, and build next-generation products.
              Explore our twin technical and creative department trees, test your reflexes in the offline dino arcade, and track your application progress in real time.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link href="/departments">
                <PixelButton
                  variant="technical"
                  size="md"
                  trailingIcon={ArrowRight}
                >
                  Explore Department Trees
                </PixelButton>
              </Link>

              <Link href="/profile">
                <PixelButton
                  variant="outline"
                  size="md"
                  icon={User}
                >
                  My Profile & Rounds
                </PixelButton>
              </Link>
            </div>

            {/* Metric Highlights Strip */}
            <div className="grid grid-cols-3 gap-3 pt-5 border-t-2 border-border/80">
              <div className="p-3 border-2 border-border/80 bg-card shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="block font-display text-2xl font-bold text-[#4285F4]">12</span>
                  <span className="text-xs">🌵</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">
                  Tracks
                </span>
              </div>
              <div className="p-3 border-2 border-border/80 bg-card shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="block font-display text-2xl font-bold text-[#0F9D58]">2</span>
                  <span className="text-xs">🦖</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">
                  Max Choices
                </span>
              </div>
              <div className="p-3 border-2 border-border/80 bg-card shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="block font-display text-2xl font-bold text-[#FBBC04]">3</span>
                  <span className="text-xs">🏆</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">
                  Rounds
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================
              Right Column (7 cols on lg/xl): Playable Widescreen Chrome Dino Arcade Station
              ================================================================= */}
          <div className="lg:col-span-6 xl:col-span-7">
            <PixelCard
              variant="arcade"
              className="w-full"
              tag="CHROME DINO ARCADE STATION // 60 FPS"
              innerClassName="p-0 sm:p-0 overflow-hidden"
            >
              {/* Heads-Up Display */}
              <ArcadeHUD
                score={liveScore}
                highScore={highScore}
                stage="ROUND 1: APPLICATION"
                soundEnabled={soundEnabled}
                onToggleSound={() => setSoundEnabled((prev) => !prev)}
              />

              {/* Live Canvas Game Engine */}
              <DinoGame
                soundEnabled={soundEnabled}
                onScoreUpdate={setLiveScore}
                onHighScoreUpdate={setHighScore}
              />

              {/* Bottom Quick Advice & Controls Strip */}
              <div className="p-3 bg-muted/70 dark:bg-zinc-950 border-t-2 border-border/80 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium text-foreground/90">
                    High scores automatically sync to your profile!
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <kbd className="px-1.5 py-0.5 border border-border bg-background shadow-sm text-foreground font-bold">
                    SPACE
                  </kbd>
                  <span>JUMP</span>
                  <span className="text-muted-foreground/50">·</span>
                  <kbd className="px-1.5 py-0.5 border border-border bg-background shadow-sm text-foreground font-bold">
                    ↓
                  </kbd>
                  <span>DUCK</span>
                </div>
              </div>
            </PixelCard>
          </div>

        </div>
      </div>
    </section>
  );
}
