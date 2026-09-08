"use client";

import React from "react";
import { cn } from "@/lib/utils";

const strokeColors = {
  default: "stroke-border",
  technical: "stroke-blue-500",
  creative: "stroke-emerald-500",
  amber: "stroke-amber-500",
  red: "stroke-rose-500",
  arcade: "stroke-cyan-400",
};

export default function PixelConnector({
  variant = "default",
  active = false,
  length = 60,
  orientation = "vertical",
  className,
}) {
  const colorClass = strokeColors[variant] || strokeColors.default;

  if (orientation === "vertical") {
    return (
      <div className={cn("flex flex-col items-center justify-center my-1", className)}>
        <svg
          width="12"
          height={length}
          viewBox={`0 0 12 ${length}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Background Track Line */}
          <line
            x1="6"
            y1="0"
            x2="6"
            y2={length}
            strokeWidth="2"
            strokeDasharray="4 4"
            className="stroke-muted-foreground/30"
          />

          {/* Active Flow Line */}
          {active && (
            <line
              x1="6"
              y1="0"
              x2="6"
              y2={length}
              strokeWidth="2"
              className={cn(colorClass, "transition-all duration-500")}
            />
          )}

          {/* Center Pixel Node Node */}
          <rect
            x="3"
            y={length / 2 - 3}
            width="6"
            height="6"
            className={cn(
              "fill-background stroke-[2]",
              active ? colorClass : "stroke-muted-foreground/40"
            )}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center mx-1", className)}>
      <svg
        width={length}
        height="12"
        viewBox={`0 0 ${length} 12`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <line
          x1="0"
          y1="6"
          x2={length}
          y2="6"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="stroke-muted-foreground/30"
        />
        {active && (
          <line
            x1="0"
            y1="6"
            x2={length}
            y2="6"
            strokeWidth="2"
            className={cn(colorClass, "transition-all duration-500")}
          />
        )}
        <rect
          x={length / 2 - 3}
          y="3"
          width="6"
          height="6"
          className={cn(
            "fill-background stroke-[2]",
            active ? colorClass : "stroke-muted-foreground/40"
          )}
        />
      </svg>
    </div>
  );
}
