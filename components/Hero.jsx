"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, User, Trophy, Play, Sparkles, Terminal, Gamepad2 } from "lucide-react";
import DinoGame from "./DinoGame";
import AsciiDinoAtmosphere from "./AsciiDinoAtmosphere";
import { PixelBadge, PixelButton, PixelCard, ArcadeHUD } from "./design-system";

export default function Hero() {
  const [liveScore, setLiveScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <section className="relative overflow-hidden py-10 sm:py-16 lg:py-20">
      {/* Authentic ASCII Dino + Desert Background Atmosphere (Zero overlap with text) */}
      <AsciiDinoAtmosphere />

      {/* Background Pixel Grid Matrix */}
      <div className="pixel-grid-pattern pointer-events-none absolute inset-0 -z-10 opacity-30" />

      {/* Ambient Radial Mesh Drops */}
      <div
        className="pointer-events-none absolute -top-40 left-1/4 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/10 via-emerald-500/5 to-amber-500/5 blur-[140px]"
        aria-hidden="true"
      />

      {/* Widescreen Container: Eliminates giant side black gaps */}
      <div className="relative z-10 w-full max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-center">
          
          {/* =================================================================
              Left Column (45% on xl): Value Proposition & Direct Navigation CTAs
              ================================================================= */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-6">
            {/* ASCII Dino Companion Badge */}
            <div className="inline-flex items-center gap-3 p-2 px-3 border-2 border-border bg-card/90 shadow-pixel-sm font-mono text-xs">
              <pre className="text-[#0F9D58] font-black leading-none text-[11px] select-none">
{`   __
 / _)
/ /
|_|`}
              </pre>
              <div className="flex flex-col">
                <span className="font-pixel text-[9px] text-[#4285F4] tracking-wider">
                  CHROME DINO PROTOCOL v2.6
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  OFFLINE // JUMP TO UNLOCK RECRUITMENT
                </span>
              </div>
            </div>

            {/* Retro Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              <PixelBadge variant="arcade" pulse pulseColor="bg-emerald-400">
                RECRUITMENT 2026 // ARCADE EDITION
              </PixelBadge>
              <span className="font-mono text-[11px] text-muted-foreground hidden sm:inline">
                [JUMP TO APPLY]
              </span>
            </div>

            {/* Main Headline: GDG in iconic Google colors (each letter distinct) */}
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.08]">
              Ready to leap into{" "}
              <span className="inline-flex items-baseline font-black tracking-tight select-none">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">D</span>
                <span className="text-[#0F9D58]">G</span>
              </span>{" "}
              <span className="text-foreground">on Campus</span>
              <span className="text-[#FBBC04]">?</span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Dodge the cacti, conquer the bugs, and build next-generation products.
              Explore our twin technical and creative department trees, test your reflexes, and track your application progress in real time.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/departments">
                <PixelButton
                  variant="technical"
                  size="lg"
                  trailingIcon={ArrowRight}
                >
                  Explore Department Trees
                </PixelButton>
              </Link>

              <Link href="/profile">
                <PixelButton
                  variant="outline"
                  size="lg"
                  icon={User}
                >
                  My Profile & Rounds
                </PixelButton>
              </Link>
            </div>

            {/* Metric Highlights Strip with Dino-Themed Icons */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t-2 border-border/80">
              <div className="p-3.5 border-2 border-border/80 bg-card shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="block font-display text-2xl sm:text-3xl font-bold text-[#4285F4]">12</span>
                  <span className="text-xs">🌵</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-1">
                  Tracks
                </span>
              </div>
              <div className="p-3.5 border-2 border-border/80 bg-card shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="block font-display text-2xl sm:text-3xl font-bold text-[#0F9D58]">2</span>
                  <span className="text-xs">🦖</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-1">
                  Max Choices
                </span>
              </div>
              <div className="p-3.5 border-2 border-border/80 bg-card shadow-pixel-sm">
                <div className="flex items-center justify-between">
                  <span className="block font-display text-2xl sm:text-3xl font-bold text-[#FBBC04]">3</span>
                  <span className="text-xs">🏆</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-1">
                  Rounds
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================
              Right Column (55% on xl): Playable Widescreen Chrome Dino Arcade Station
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

              {/* Live Canvas Game Engine (Widescreen 960x240) */}
              <DinoGame
                soundEnabled={soundEnabled}
                onScoreUpdate={setLiveScore}
                onHighScoreUpdate={setHighScore}
              />

              {/* Bottom Quick Advice & Keycaps Strip */}
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
