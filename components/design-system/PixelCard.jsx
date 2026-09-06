"use client";

import React from "react";
import { cn } from "@/lib/utils";

const variantAccents = {
  default: "border-border/80 shadow-pixel-sm",
  technical: "border-blue-500/40 hover:border-blue-500 shadow-[3px_3px_0px_#4285F4]",
  creative: "border-emerald-500/40 hover:border-emerald-500 shadow-[3px_3px_0px_#0F9D58]",
  amber: "border-amber-500/40 hover:border-amber-500 shadow-[3px_3px_0px_#FBBC04]",
  red: "border-rose-500/40 hover:border-rose-500 shadow-[3px_3px_0px_#EA4335]",
  arcade: "border-2 border-foreground/80 bg-card text-card-foreground shadow-[4px_4px_0px_#0F9D58] dark:shadow-[4px_4px_0px_#10B981] dark:border-emerald-500/40 dark:bg-zinc-950",
};

export default function PixelCard({
  children,
  variant = "default",
  scanline = false,
  grid = false,
  className,
  innerClassName,
  header,
  tag,
  ...props
}) {
  return (
    <div
      className={cn(
        "group relative p-1.5 transition-all duration-300 bg-muted/40 border border-border/60",
        variantAccents[variant] || variantAccents.default,
        className
      )}
      {...props}
    >
      {/* Optional Top Tag Bar */}
      {tag && (
        <div className="absolute -top-3 left-4 z-10">
          <span className="inline-block bg-background px-2.5 py-0.5 font-pixel text-[9px] uppercase tracking-wider border border-border shadow-sm">
            {tag}
          </span>
        </div>
      )}

      {/* Inner Core Container */}
      <div
        className={cn(
          "relative overflow-hidden bg-card p-5 sm:p-6 border border-border/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]",
          grid && "pixel-grid-pattern",
          innerClassName
        )}
      >
        {/* Optional CRT Scanline Overlay */}
        {scanline && (
          <div className="scanline-overlay pointer-events-none absolute inset-0 z-10 opacity-30" />
        )}

        {header && <div className="mb-4">{header}</div>}
        {children}
      </div>
    </div>
  );
}
