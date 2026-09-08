"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import DinoGame from "./DinoGame";
import { PixelBadge, PixelButton, ArcadeHUD } from "./design-system";
import AsciiDinoAtmosphere from "./AsciiDinoAtmosphere";

export default function Hero() {
  const [liveScore, setLiveScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-4.5rem)] flex items-center py-12 lg:py-20">
      {/* Background Pixel Grid Matrix */}
      <div className="pixel-grid-pattern pointer-events-none absolute inset-0 -z-10 opacity-20" />

      {/* Subtle Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/3 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-500/5 blur-[140px]"
        aria-hidden="true"
      />

      {/* Iconic ASCII Chrome Dino Atmosphere */}
      <AsciiDinoAtmosphere />

      <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 relative z-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-center">
          
          {/* =================================================================
              Left Column (5 cols): Focused Headline, Value Prop & Direct CTAs
              ================================================================= */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-6">
            {/* Minimalist Badge */}
            <div>
              <PixelBadge variant="arcade" pulse pulseColor="bg-emerald-400">
                GDG RECRUITMENT 2026 // ARCADE EDITION
              </PixelBadge>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              Ready to leap into{" "}
              <span className="inline-flex items-baseline font-black tracking-tight select-none">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">D</span>
                <span className="text-[#0F9D58]">G</span>
              </span>{" "}
              <span className="text-foreground">on Campus</span>
              <span className="text-[#FBBC04]">?</span>
            </h1>

            {/* Clean, Concise Subtext */}
            <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
              Conquer the bugs, explore our twin department trees, and track your application progress in real time.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <PixelButton
                as={Link}
                href="/departments"
                variant="technical"
                size="lg"
                trailingIcon={ArrowRight}
              >
                Explore Department Trees
              </PixelButton>

              <PixelButton
                as={Link}
                href="/profile"
                variant="outline"
                size="lg"
                icon={User}
              >
                My Profile & Rounds
              </PixelButton>
            </div>
          </div>

          {/* =================================================================
              Right Column (7 cols): Clean, Widescreen Dino Arcade Console
              ================================================================= */}
          <div className="lg:col-span-6 xl:col-span-7">
            <div className="w-full border-2 border-foreground/80 bg-card shadow-pixel">
              {/* Heads-Up Display Bar */}
              <ArcadeHUD
                score={liveScore}
                highScore={highScore}
                stage="ROUND 1"
                soundEnabled={soundEnabled}
                onToggleSound={() => setSoundEnabled((prev) => !prev)}
              />

              {/* Live Canvas Game Engine */}
              <DinoGame
                soundEnabled={soundEnabled}
                onScoreUpdate={setLiveScore}
                onHighScoreUpdate={setHighScore}
              />

              {/* Minimal Keycap Helper Strip */}
              <div className="px-4 py-2 bg-muted/40 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span className="text-foreground/80">Offline Arcade Station</span>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 border border-border bg-background shadow-sm text-foreground font-bold text-[10px]">
                    SPACE
                  </kbd>
                  <span>JUMP</span>
                  <span className="text-muted-foreground/40">·</span>
                  <kbd className="px-1.5 py-0.5 border border-border bg-background shadow-sm text-foreground font-bold text-[10px]">
                    ↓
                  </kbd>
                  <span>DUCK</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
