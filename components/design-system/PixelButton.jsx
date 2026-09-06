"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * Synthesizes a discrete 8-bit arcade click beep using Web Audio API
 */
function playArcadeBeep() {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // AudioContext blocked or not supported
  }
}

const variants = {
  primary:
    "bg-foreground text-background border-2 border-foreground hover:bg-foreground/90 shadow-[3px_3px_0px_#202124] dark:shadow-[3px_3px_0px_#FFFFFF]",
  technical:
    "bg-blue-600 text-white border-2 border-blue-500 hover:bg-blue-500 shadow-[3px_3px_0px_#1D4ED8] dark:shadow-[3px_3px_0px_#93C5FD]",
  creative:
    "bg-emerald-600 text-white border-2 border-emerald-500 hover:bg-emerald-500 shadow-[3px_3px_0px_#047857] dark:shadow-[3px_3px_0px_#6EE7B7]",
  arcade:
    "bg-zinc-950 text-emerald-400 border-2 border-emerald-500 hover:bg-zinc-900 shadow-[3px_3px_0px_#10B981]",
  amber:
    "bg-amber-500 text-black border-2 border-amber-400 hover:bg-amber-400 shadow-[3px_3px_0px_#B45309]",
  destructive:
    "bg-rose-600 text-white border-2 border-rose-500 hover:bg-rose-500 shadow-[3px_3px_0px_#BE123C]",
  outline:
    "bg-background text-foreground border-2 border-border hover:bg-muted/60 shadow-[3px_3px_0px_currentColor]",
  ghost:
    "bg-transparent text-foreground hover:bg-muted/60 shadow-none border-transparent",
};

const sizes = {
  sm: "h-9 px-3 text-xs gap-2 font-medium",
  md: "h-11 px-5 text-sm gap-2.5 font-semibold",
  lg: "h-13 px-7 text-base gap-3 font-bold",
};

export default function PixelButton({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  trailingIcon: TrailingIcon,
  loading = false,
  sound = true,
  className,
  onClick,
  disabled,
  ...props
}) {
  const handleClick = (e) => {
    if (sound && !disabled && !loading) {
      playArcadeBeep();
    }
    if (onClick) onClick(e);
  };

  return (
    <button
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn(
        "group relative inline-flex items-center justify-center font-display font-semibold tracking-wide transition-transform duration-75 select-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current" />
      ) : (
        <>
          {Icon && (
            <span className="flex h-5 w-5 items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <span>{children}</span>
          {TrailingIcon && (
            <span className="flex h-6 w-6 items-center justify-center rounded-none bg-black/10 dark:bg-white/15 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
              <TrailingIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </>
      )}
    </button>
  );
}
