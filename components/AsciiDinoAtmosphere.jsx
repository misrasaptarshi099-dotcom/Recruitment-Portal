"use client";

import React from "react";

export default function AsciiDinoAtmosphere() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* ── Top Right: Iconic Green Block-Art ASCII Chrome Dino ── */}
      <div className="hidden sm:block absolute top-3 sm:top-4 right-4 sm:right-8 lg:right-12 xl:right-16 opacity-85 dark:opacity-90 font-mono text-[9px] sm:text-[11px] leading-[1.05] text-[#0F9D58] transition-opacity">
        <pre className="whitespace-pre drop-shadow-sm font-bold">
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
        <span className="font-pixel text-[8px] sm:text-[9px] text-[#0F9D58] tracking-widest block mt-0.5 text-right">
          [CHROME_DINO // 0x404]
        </span>
      </div>
    </div>
  );
}
