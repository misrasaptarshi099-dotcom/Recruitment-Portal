import React from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Smartphone, Globe, ArrowRight, Code } from "lucide-react";

const tracks = [
  {
    name: "App Development",
    icon: Smartphone,
    color: "#EA4335",
    description:
      "Build intuitive, high-performance mobile applications across Android and iOS using modern frameworks like Flutter, React Native, Kotlin, and Swift.",
    href: "/join/339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    cta: "Apply for App Dev",
  },
  {
    name: "Web Development",
    icon: Globe,
    color: "#FBBC04",
    description:
      "Design and deploy production-grade websites and web services using Next.js, React, Node.js, and TypeScript, powering GDG events, portals, and platforms.",
    href: "/join/8143de1d-db17-42fa-958d-13b10804f894",
    cta: "Apply for Web Dev",
  },
];

export default function DevelopmentPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavBar />

      <main className="flex-1 py-16 sm:py-24">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-500 border border-blue-500/20 mb-4">
              <Code className="h-3.5 w-3.5" />
              <span>Engineering Division</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Development Department Tracks
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose your engineering focus. Our developers build production-ready applications that serve thousands of students and organizers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {tracks.map((track) => {
              const Icon = track.icon;
              return (
                <div
                  key={track.name}
                  className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card/60 p-8 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg"
                >
                  <div>
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-white mb-6 shadow-sm"
                      style={{ backgroundColor: track.color }}
                    >
                      <Icon className="h-7 w-7" />
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      {track.name}
                    </h2>

                    <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                      {track.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border/40">
                    <Link href={track.href}>
                      <Button className="w-full rounded-full gap-2" size="lg">
                        <span>{track.cta}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
