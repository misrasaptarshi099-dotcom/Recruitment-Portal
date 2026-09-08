"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Marquee from "@/components/magicui/marquee";
import { reviews } from "@/constants/index";
import { ArrowRight } from "lucide-react";

export const DepartmentMarqueeCard = ({ id, name, description, tone, icon: Icon }) => {
  return (
    <figure
      className={cn(
        "relative w-72 sm:w-80 cursor-pointer overflow-hidden border-2 p-5 transition-all duration-200 select-none",
        "border-border/70 bg-card hover:border-foreground/80 shadow-pixel-sm hover:shadow-pixel",
        "flex flex-col justify-between"
      )}
    >
      {/* Top Accent Strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: tone || "#3B82F6" }}
      />

      <div>
        <div className="flex items-center gap-3 mb-3 pt-1">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center border text-white shadow-sm"
            style={{ backgroundColor: tone || "#3B82F6", borderColor: tone || "#3B82F6" }}
          >
            {Icon ? <Icon className="h-5 w-5" /> : null}
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground tracking-tight">
              {name}
            </h3>
            <span className="font-display text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block">
              Track Branch
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-display font-semibold text-primary">
        <span>Explore Track</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </figure>
  );
};

export default function Departments() {
  const half = Math.ceil(reviews.length / 2);
  const primaryRow = reviews.slice(0, half);
  const secondaryRow = reviews.slice(half);

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden py-4">
      {/* Primary Row */}
      <Marquee pauseOnHover className="[--duration:35s]">
        {primaryRow.map((dept) => (
          <Link key={dept.id} href={`/departments`}>
            <DepartmentMarqueeCard {...dept} />
          </Link>
        ))}
      </Marquee>

      {/* Secondary Row */}
      <Marquee reverse pauseOnHover className="[--duration:35s] mt-4">
        {secondaryRow.map((dept) => (
          <Link key={dept.id} href={`/departments`}>
            <DepartmentMarqueeCard {...dept} />
          </Link>
        ))}
      </Marquee>

      {/* Gradient Fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 sm:w-1/4 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 sm:w-1/4 bg-gradient-to-l from-background to-transparent z-10" />
    </div>
  );
}
