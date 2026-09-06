"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Layers, Users, Rocket } from "lucide-react";
import { Button } from "./ui/button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      {/* Background ambient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/20 via-emerald-500/10 to-amber-500/15 blur-[120px]"
        aria-hidden="true"
      />

      <div className="container mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        {/* Recruitment status badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-blue-500 shadow-sm backdrop-blur-md mb-8">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Recruitment 2026 is Now Open</span>
          <span className="h-1 w-1 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Select up to 2 departments</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Build the future with{" "}
          <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 bg-clip-text text-transparent">
            GDG on Campus
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          Step into a vibrant community of builders, designers, and innovators.
          Work on impactful real-world projects, host flagship events, and accelerate your journey in tech.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/departments">
            <Button size="lg" className="rounded-full gap-2 px-6 shadow-md hover:shadow-lg transition-all">
              <span>Explore Departments</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <a href="#departments">
            <Button variant="outline" size="lg" className="rounded-full px-6 gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>Preview Tracks</span>
            </Button>
          </a>
        </div>

        {/* Quick Highlights */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 pt-10 border-t border-border/40">
          <div className="flex flex-col items-center p-3 rounded-2xl bg-card/40 border border-border/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 mb-2">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-foreground">12</span>
            <span className="text-xs text-muted-foreground">Specialized Tracks</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-2xl bg-card/40 border border-border/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-2">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-foreground">500+</span>
            <span className="text-xs text-muted-foreground">Active Members</span>
          </div>

          <div className="col-span-2 sm:col-span-1 flex flex-col items-center p-3 rounded-2xl bg-card/40 border border-border/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 mb-2">
              <Rocket className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-foreground">2</span>
            <span className="text-xs text-muted-foreground">Max Applications</span>
          </div>
        </div>
      </div>
    </section>
  );
}
