"use client";

import React from "react";

export default function AsciiDinoAtmosphere() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* ── Top Left: Soaring ASCII Pterodactyl in Flight (Google Blue) ── */}
      <div className="absolute top-3 left-3 sm:left-6 opacity-50 sm:opacity-65 dark:opacity-75 font-mono text-[9px] sm:text-[11px] leading-tight text-[#4285F4] transition-opacity">
        <pre className="whitespace-pre drop-shadow-sm">
{`          __
        / _)   <screeech!>
 .-^^--/ /
/       /
|  /|  |
|_| |_|`}
        </pre>
        <span className="font-pixel text-[8px] text-[#4285F4]/90 tracking-widest block mt-0.5">
          [PTERO_V1]
        </span>
      </div>



      {/* ── Top Right: Giant Iconic Block-Art ASCII T-Rex (Google Green) ── */}
      <div className="hidden sm:block absolute top-2 right-3 sm:right-8 opacity-50 sm:opacity-65 dark:opacity-80 font-mono text-[9px] sm:text-[11px] leading-[1.05] text-[#0F9D58] transition-opacity">
        <pre className="whitespace-pre drop-shadow-sm">
{`               ████████
              ██████████
              ██████████
              ██████
             █████████
  ██        ███████████
  ████     ████████████
   ███████████████████
    █████████████████
     ███████████████
       ███     ███
       ██       ██
      ███      ███`}
        </pre>
        <span className="font-pixel text-[8px] text-[#0F9D58]/90 tracking-widest block mt-0.5 text-right">
          [CHROME_DINO // 0x404]
        </span>
      </div>

      {/* ── Far Right Margin: Triple ASCII Cacti Cluster (Safe on the far right) ── */}
      <div className="hidden xl:block absolute top-[52%] right-4 opacity-45 sm:opacity-60 dark:opacity-75 font-mono text-[10px] sm:text-[11px] leading-tight text-[#0F9D58]">
        <pre className="whitespace-pre">
{`    _  _             _
   | || | _         | | _
  -| || || |       -| || |
   | || || |-       | || |-
   \\_   _/          \\_  /
     | |              | |
     | |              | |
═════╧═╧══════════════╧═╧═════`}
        </pre>
        <span className="font-pixel text-[8px] text-[#0F9D58]/90 tracking-widest block mt-1 text-right">
          {"[OBSTACLE_SET // CACTUS]"}
        </span>
      </div>

      {/* ── Bottom Horizon Ground Terrain: Rocks & Mini Cacti Trail ── */}
      <div className="absolute bottom-0 left-0 right-0 opacity-40 dark:opacity-60 font-mono text-[10px] sm:text-[11px] text-center text-muted-foreground overflow-hidden whitespace-nowrap border-b border-border/40 pb-0.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="inline-block mx-3">
            ─── ─ ─── 🌵 ────── ··· ── 🦖 ── 🌵 ─── ── ─────── ── ──── ···
          </span>
        ))}
      </div>
    </div>
  );
}
