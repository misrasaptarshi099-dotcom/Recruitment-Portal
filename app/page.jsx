"use client";

import React, { useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import Departments from "@/components/Departments";
import Footer from "@/components/Footer";
import PopupComp from "@/components/PopupComp";
import { authClient } from "@/lib/auth-client";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  const [isNoticeOpen, setIsNoticeOpen] = useState(true);
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const popupConfig = {
    header: "Recruitment 2026 Guidelines",
    description: "Welcome to the GDG on Campus recruitment portal!",
    message: [
      "Sign in with your email address to access the application forms.",
      "You can select and apply to a maximum of two unique departments.",
      "Save drafts anytime and return before the deadline to submit.",
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavBar />

      {!isPending && !user && (
        <PopupComp
          isOpen={isNoticeOpen}
          onClose={() => setIsNoticeOpen(false)}
          PopupData={popupConfig}
        />
      )}

      <main className="flex-1">
        <Hero />

        {/* Departments Marquee Section */}
        <section id="departments" className="relative py-20 sm:py-28 border-t-2 border-border/80 bg-muted/15">
          <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center mb-10">
            <div className="inline-flex items-center gap-2 border-2 border-border bg-card px-3.5 py-1.5 text-xs font-display font-semibold tracking-wider text-muted-foreground mb-3 shadow-pixel-sm">
              <span className="text-[#4285F4] font-mono">[01]</span>
              <span>ORGANIZATIONAL TAXONOMY // DUAL-TREE SYSTEM</span>
            </div>
            <h2 className="text-3xl font-display font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Discover Our Department Trees
            </h2>
            <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Explore 7 Technical engineering tracks and 5 Non-Technical creative branches. Trace the growing circuit pathways and select up to 2 departments.
            </p>
          </div>

          <Departments />

          <div className="mt-12 text-center">
            <Link
              href="/departments"
              className="inline-flex items-center justify-center gap-2.5 border-2 border-foreground bg-foreground px-8 py-4 font-display text-sm sm:text-base font-bold uppercase tracking-wider text-background shadow-pixel hover:bg-foreground/90 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <span>Explore Interactive Trees (12 Tracks)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
