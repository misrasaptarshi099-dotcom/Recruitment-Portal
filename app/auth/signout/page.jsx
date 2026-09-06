"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await authClient.signOut();
        toast.success("Signed out successfully");
        router.push("/");
        router.refresh();
      } catch (error) {
        console.error("Sign out error:", error);
        toast.error("Failed to sign out");
        router.push("/");
      }
    };

    performSignOut();
  }, [router]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background text-foreground overflow-hidden">
      {/* Background grid */}
      <div className="pixel-grid-pattern pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative z-10 text-center space-y-4">
        {/* Pixel loading box */}
        <div className="inline-flex items-center justify-center h-14 w-14 border-2 border-border bg-card shadow-pixel-sm mx-auto">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-[#4285F4] animate-pulse" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-[#EA4335] animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-[#FBBC04] animate-pulse" style={{ animationDelay: "300ms" }} />
            <span className="w-2 h-2 bg-[#0F9D58] animate-pulse" style={{ animationDelay: "450ms" }} />
          </div>
        </div>
        <p className="font-pixel text-[10px] text-muted-foreground tracking-wider">
          SIGNING OUT...
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          Clearing session data
        </p>
      </div>
    </div>
  );
}