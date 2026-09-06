"use client";

import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import Departments from "@/components/Departments";
import Footer from "@/components/Footer";
import PopupComp from "@/components/PopupComp";
import { authClient } from "@/lib/auth-client";
import { Sparkles } from "lucide-react";

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
        <section id="departments" className="py-12 sm:py-20 border-t border-border/40 bg-card/10">
          <div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8 mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-muted-foreground mb-3">
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span>Explore Opportunities</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Discover Our Departments
            </h2>
            <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
              Find your community. Whether you love writing low-level systems, designing UI, or managing large-scale events, there is a place for you.
            </p>
          </div>

          <Departments />
        </section>
      </main>

      <Footer />
    </div>
  );
}
