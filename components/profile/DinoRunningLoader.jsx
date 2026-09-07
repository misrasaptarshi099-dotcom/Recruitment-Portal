"use client";

import React, { useState, useEffect } from "react";

// Pixel Dino SVG Sprite with alternating running legs
export function PixelRunningDino({ frame = 0, className = "h-10 w-10 text-emerald-400" }) {
  const isFrame0 = frame % 2 === 0;

  return (
    <svg
      viewBox="0 0 44 44"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      style={{ shapeRendering: "crispEdges" }}
    >
      {/* Torso */}
      <rect x="12" y="14" width="20" height="20" />
      {/* Back & Tail */}
      <rect x="2" y="18" width="10" height="10" />
      <rect x="0" y="20" width="4" height="4" />
      {/* Neck */}
      <rect x="22" y="6" width="12" height="12" />
      {/* Head & Snout */}
      <rect x="22" y="0" width="22" height="12" />
      <rect x="36" y="6" width="8" height="6" />
      {/* Eye Cutout */}
      <rect x="28" y="2" width="3" height="3" fill="#09090b" />
      {/* Front Arm */}
      <rect x="32" y="18" width="6" height="3" />

      {/* Alternating Running Legs */}
      {isFrame0 ? (
        <>
          {/* Left leg down & extended */}
          <rect x="14" y="34" width="4" height="8" />
          <rect x="14" y="42" width="6" height="2" />
          {/* Right leg lifted */}
          <rect x="24" y="34" width="4" height="4" />
        </>
      ) : (
        <>
          {/* Left leg lifted */}
          <rect x="14" y="34" width="4" height="4" />
          {/* Right leg down & extended */}
          <rect x="24" y="34" width="4" height="8" />
          <rect x="24" y="42" width="6" height="2" />
        </>
      )}
    </svg>
  );
}

export default function DinoRunningLoader({ progress = 0, statusMessage = "Synchronizing telemetry..." }) {
  const [frame, setFrame] = useState(0);

  // Fast leg animation (every 100ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % 2);
    }, 110);
    return () => clearInterval(timer);
  }, []);

  const clampedProgress = Math.min(Math.max(Math.round(progress), 0), 100);

  // Dynamic status text based on progress milestone
  const stageStatus =
    clampedProgress < 30
      ? "INITIALIZING MAINFRAME TELEMETRY..."
      : clampedProgress < 65
      ? "ACCESSING CANDIDATE APPLICATION DOSSIER..."
      : clampedProgress < 95
      ? "CALCULATING DINO RANK & ARCADE STATS..."
      : "SYNCHRONIZATION COMPLETE // UNLOCKING...";

  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Terminal Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-pixel text-[10px] tracking-widest uppercase animate-pulse">
            <span>●</span>
            <span>MAINFRAME // ACCESSING_CANDIDATE_DATA</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground pt-1">
            {stageStatus}
          </p>
        </div>

        {/* Arcade Running Track Arena */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-zinc-950 p-5 shadow-[4px_4px_0px_#10B981] relative overflow-hidden">
          {/* Subtle Scanline Effect */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent bg-[length:100%_4px] opacity-40" />

          {/* Running Arena */}
          <div className="relative h-20 w-full mb-2">
            {/* Destination Flag at 100% */}
            <div className="absolute right-1 bottom-1 text-center z-0 opacity-80">
              <div className="w-1 h-12 bg-emerald-500/60 mx-auto" />
              <div className="font-pixel text-[9px] text-emerald-400 font-bold bg-zinc-900 border border-emerald-500/40 px-1 py-0.5 rounded -mt-12 ml-2">
                100%
              </div>
            </div>

            {/* Running Dino moving smoothly from 0% to 100% */}
            <div
              className="absolute bottom-1 transition-all duration-150 ease-out z-10 flex flex-col items-center"
              style={{
                left: `calc(${clampedProgress}% - ${Math.min(clampedProgress * 0.44, 40)}px)`,
              }}
            >
              {/* Floating Mini Badge above Dino */}
              <div className="font-mono text-[10px] font-bold text-emerald-400 bg-zinc-900/90 border border-emerald-500/50 px-1.5 py-0.2 rounded mb-1 shadow-sm whitespace-nowrap">
                {clampedProgress}%
              </div>

              {/* The Animated Dino Sprite */}
              <div className="relative">
                <PixelRunningDino frame={frame} className="h-10 w-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                {/* Dust particles behind feet */}
                {clampedProgress > 2 && (
                  <span className="absolute -left-2 bottom-1 w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-ping opacity-75" />
                )}
              </div>
            </div>

            {/* Desert Ground Line with animated dash pattern */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/40" />
            <div
              className="absolute bottom-[2px] left-0 right-0 h-1 bg-repeat-x opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #10B981 1px, transparent 1px)",
                backgroundSize: "8px 4px",
              }}
            />
          </div>

          {/* Progress Bar Track */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                TELEMETRY_SYNC
              </span>
              <span className="font-bold text-emerald-400 tracking-wider">
                {clampedProgress} / 100%
              </span>
            </div>

            {/* Progress Fill Bar */}
            <div className="h-3 w-full rounded-full border border-emerald-500/50 bg-zinc-900 p-0.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400 transition-all duration-150 ease-out shadow-[0_0_12px_#10B981]"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer Subtitle */}
        <p className="font-mono text-[11px] text-center text-muted-foreground">
          {statusMessage}
        </p>
      </div>
    </div>
  );
}
