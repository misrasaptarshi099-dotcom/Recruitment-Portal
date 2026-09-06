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
        "relative w-72 sm:w-80 cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all duration-200",
        "border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card/90 hover:shadow-lg",
        "flex flex-col justify-between"
      )}
    >
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: tone || "#3B82F6" }}
          >
            {Icon ? <Icon className="h-5 w-5 fill-current" /> : null}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              {name}
            </h3>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Track
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
        <span>Learn more</span>
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
