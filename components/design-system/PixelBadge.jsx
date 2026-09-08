"use client";

import React from "react";
import { cn } from "@/lib/utils";

const variantStyles = {
  default: "bg-muted/70 text-foreground border-border/80 shadow-pixel-sm",
  technical: "bg-blue-500/10 text-blue-500 border-blue-500/30 pixel-shadow-blue",
  creative: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 pixel-shadow-green",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/30 pixel-shadow-amber",
  red: "bg-rose-500/10 text-rose-500 border-rose-500/30 pixel-shadow-red",
  arcade: "bg-zinc-900 text-emerald-400 border-emerald-500/40 shadow-[2px_2px_0px_#10B981]",
};

export default function PixelBadge({
  children,
  variant = "default",
  pulse = false,
  pulseColor = "bg-emerald-500",
  pixel = false,
  icon: Icon,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-none px-3 py-1 text-xs uppercase tracking-wider border transition-all duration-200 select-none",
        pixel ? "font-pixel text-[10px]" : "font-display font-semibold",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-none opacity-75",
              pulseColor
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-none",
              pulseColor
            )}
          />
        </span>
      )}
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}
