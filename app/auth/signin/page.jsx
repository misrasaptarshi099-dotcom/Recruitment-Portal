"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { PixelButton, PixelBadge } from "@/components/design-system";
import DinoRunningLoader from "@/components/DinoRunningLoader";

/* ════════════════════════════════════════════════════════════════
   ASCII DINO MASCOT — Reacts to auth states
   ════════════════════════════════════════════════════════════════ */

const DINO_IDLE = `    ████████
   ██████████
   ██  ██████
   ██████████
   ██████
  █████████
  ████████████
 █████████████
 ████████████
  ██████████
    ███  ███
    ██    ██
   ███   ███`;

const DINO_LOOK = `    ████████
   ██████████
   ██████████
   ██  ██████
   ██████
  █████████
  ████████████
 █████████████
 ████████████
  ██████████
    ███  ███
    ██    ██
   ███   ███`;

const DINO_TAG = "[CHROME_DINO // AUTH_GATE]";

function DinoMascot({ state = "idle" }) {
  const sprite = state === "loading" ? DINO_LOOK : DINO_IDLE;

  const stateClasses = {
    idle: "",
    loading: "",
    success: "animate-dino-jump",
    error: "animate-dino-shake",
  };

  return (
    <div
      className={`transition-all duration-300 ${stateClasses[state] || ""}`}
      aria-hidden="true"
    >
      <pre className="whitespace-pre text-[#0F9D58] text-[10px] sm:text-[11px] leading-[1.1] font-bold font-mono drop-shadow-sm select-none">
        {sprite}
      </pre>
      <span className="font-pixel text-[8px] text-[#0F9D58] tracking-widest block mt-1">
        {DINO_TAG}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   GOOGLE G ICON — Flat quadrant colors
   ════════════════════════════════════════════════════════════════ */

function GoogleGIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#0F9D58"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   SIGN IN PAGE CONTENT — With Rejection Reason Banner
   ════════════════════════════════════════════════════════════════ */

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const [submitting, setSubmitting] = useState(false);
  const [dinoState, setDinoState] = useState("idle");

  const errorParam = searchParams.get("error");
  const reasonParam = searchParams.get("reason");
  const errorDescParam = searchParams.get("error_description");
  const messageParam = searchParams.get("message");

  // Determine explicit human-readable rejection reason
  const rejectionReason = useMemo(() => {
    if (reasonParam) return decodeURIComponent(reasonParam);
    if (errorDescParam) return decodeURIComponent(errorDescParam);
    if (messageParam) return decodeURIComponent(messageParam);
    if (errorParam) {
      switch (errorParam.toLowerCase()) {
        case "forbidden":
          return "Access Denied: Only @vitstudent.ac.in institutional accounts are permitted. Personal Gmail accounts cannot register as candidates.";
        case "access_denied":
          return "Google sign-in was cancelled or permissions were denied.";
        case "oauth_code_verification_failed":
        case "invalid_code":
          return "Authentication session expired or invalid authorization code. Please try signing in again.";
        case "no_callback_url":
        case "state_mismatch":
          return "Authentication session mismatch. Please retry signing in.";
        default:
          return `Sign-in rejected (${errorParam.replace(/_/g, " ")}). Please try again with your official VIT account.`;
      }
    }
    return null;
  }, [errorParam, reasonParam, errorDescParam, messageParam]);

  // If rejection reason is present, animate dino error & toast
  useEffect(() => {
    if (rejectionReason) {
      setDinoState("error");
      toast.error(rejectionReason, {
        duration: 8000,
        id: "auth-rejection-toast",
      });
    }
  }, [rejectionReason]);

  // Redirect if already authenticated
  useEffect(() => {
    if (session?.user && !isPending && !rejectionReason) {
      router.push("/");
    }
  }, [session, isPending, router, rejectionReason]);

  // Reset dino after temporary animation only when no persistent rejection is active
  useEffect(() => {
    if ((dinoState === "success" || dinoState === "error") && !rejectionReason) {
      const timer = setTimeout(() => setDinoState("idle"), 1200);
      return () => clearTimeout(timer);
    }
  }, [dinoState, rejectionReason]);

  if (isPending) {
    return (
      <DinoRunningLoader
        badgeText="AUTH // LOADING_SESSION"
        statusMessage="Synchronizing authentication session..."
      />
    );
  }

  if (session?.user && !rejectionReason) {
    return (
      <DinoRunningLoader
        progress={100}
        badgeText="AUTH // REDIRECTING"
        statusMessage="Session authenticated. Accessing recruitment portal..."
      />
    );
  }

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setDinoState("loading");
    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/auth/signin",
      });
      if (res?.error) {
        console.error("Google sign-in error:", res.error);
        toast.error(
          res.error.message ||
            "Sign-in failed. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured in .env.local."
        );
        setDinoState("error");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      toast.error(
        err?.message ||
          "Sign-in failed. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured in .env.local."
      );
      setDinoState("error");
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* Background grid + scanlines */}
      <div className="pixel-grid-pattern pointer-events-none absolute inset-0 opacity-15" />
      <div className="scanline-overlay pointer-events-none absolute inset-0 opacity-[0.03] z-0" />

      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-[#4285F4]/[0.03] blur-[120px]"
        aria-hidden="true"
      />

      {/* Back to Home */}
      <div className="relative z-10 w-full max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>cd ~/home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-12">
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 items-center">

          {/* ═══════ Left Column: ASCII Dino Mascot ═══════ */}
          <div className="hidden md:flex flex-col items-center justify-center space-y-8">
            {/* Terminal Frame */}
            <div className="w-full max-w-xs">
              <div className="border-2 border-border bg-card shadow-pixel">
                {/* Terminal Top Bar */}
                <div className="px-3 py-2 border-b-2 border-border bg-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC04]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F9D58]" />
                  </div>
                  <span className="font-pixel text-[8px] text-muted-foreground tracking-wider">
                    AUTH_TERMINAL
                  </span>
                </div>

                {/* Dino Display */}
                <div className="p-6 flex flex-col items-center justify-center bg-background/50">
                  <DinoMascot state={dinoState} />
                </div>

                {/* Terminal Status Bar */}
                <div className="px-3 py-1.5 border-t-2 border-border bg-muted/40">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    <span className="text-[#0F9D58]">●</span>{" "}
                    {dinoState === "idle" && "awaiting google auth..."}
                    {dinoState === "loading" && "authenticating..."}
                    {dinoState === "success" && "access granted ✓"}
                    {dinoState === "error" && "access denied ✗"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="text-center space-y-2">
              <p className="font-display text-lg font-bold text-foreground tracking-tight">
                Jump past the{" "}
                <span className="text-[#EA4335]">404</span>
              </p>
              <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                Sign in with your VIT Student Google account to unlock the recruitment portal.
              </p>
            </div>
          </div>

          {/* ═══════ Right Column: Sign In Card ═══════ */}
          <div className="w-full">
            <div className="border-2 border-foreground/80 bg-card shadow-pixel">
              {/* Card Header */}
              <div className="px-5 sm:px-6 pt-6 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <PixelBadge variant="arcade" pulse pulseColor="bg-[#4285F4]">
                    AUTH // GOOGLE SSO
                  </PixelBadge>
                  <span className="font-pixel text-[8px] text-muted-foreground tracking-wider hidden sm:inline">
                    [ENCRYPTED]
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground">
                    Sign In to{" "}
                    <span className="inline-flex items-baseline">
                      <span className="text-[#4285F4]">G</span>
                      <span className="text-[#EA4335]">D</span>
                      <span className="text-[#0F9D58]">G</span>
                    </span>
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    Use your <span className="font-mono text-foreground/80">@vitstudent.ac.in</span> Google account to access the recruitment portal.
                  </p>
                </div>
              </div>

              {/* ═══════ REJECTION NOTICE BANNER (Shown when sign-in rejected) ═══════ */}
              {rejectionReason ? (
                <div className="mx-5 sm:mx-6 mb-4 p-4 border-2 border-[#EA4335] bg-[#EA4335]/10 shadow-[0_0_15px_rgba(234,67,53,0.12)]">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-[#EA4335]/20 text-[#EA4335] shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-pixel text-[8px] sm:text-[9px] text-[#EA4335] tracking-wider uppercase">
                          [AUTH // REJECTION_NOTICE]
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            router.replace("/auth/signin");
                            setDinoState("idle");
                          }}
                          className="text-[#EA4335]/70 hover:text-[#EA4335] text-xs font-mono font-bold"
                          title="Dismiss notice"
                        >
                          ✕ DISMISS
                        </button>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-1">
                        Sign-In Rejected
                      </h4>
                      <p className="text-xs text-foreground/90 mt-1 font-mono leading-relaxed bg-background/60 p-2 border border-[#EA4335]/20 rounded">
                        {rejectionReason}
                      </p>
                      <div className="mt-3 pt-2 border-t border-[#EA4335]/20 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Institutional account required (@vitstudent.ac.in)
                        </span>
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={submitting}
                          className="text-xs font-mono font-bold text-[#4285F4] hover:underline flex items-center gap-1"
                        >
                          Switch Google Account →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Domain Notice */
                <div className="mx-5 sm:mx-6 mb-4 p-3 border-2 border-dashed border-[#FBBC04]/40 bg-[#FBBC04]/5">
                  <p className="text-[11px] font-mono text-[#FBBC04] leading-relaxed">
                    <span className="font-bold">⚠ DOMAIN LOCK:</span>{" "}
                    Only @vitstudent.ac.in accounts are accepted (Authorized admins exempt). Personal Gmail accounts will be rejected.
                  </p>
                </div>
              )}

              {/* Google Sign-In Button */}
              <div className="px-5 sm:px-6 pb-6">
                <PixelButton
                  variant="outline"
                  size="lg"
                  className="w-full justify-center gap-3"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  loading={submitting}
                  sound
                >
                  {!submitting && <GoogleGIcon className="h-5 w-5 shrink-0" />}
                  <span>{submitting ? "Connecting to Google..." : rejectionReason ? "Sign In with Different Account" : "Continue with Google"}</span>
                </PixelButton>

                {/* Mobile-only dino + tagline */}
                <div className="md:hidden mt-6 text-center space-y-3">
                  <div className="flex justify-center">
                    <DinoMascot state={dinoState} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sign in with your VIT Student Google account.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 sm:px-6 py-3 border-t-2 border-border bg-muted/30 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  Institutional SSO • @vitstudent.ac.in
                </span>
                <span className="font-pixel text-[8px] text-muted-foreground/50 tracking-wider hidden sm:inline">
                  v2.7
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Dino Mascot Animation Keyframes ═══════ */}
      <style jsx global>{`
        @keyframes dino-jump {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-12px); }
          60% { transform: translateY(-12px); }
        }
        @keyframes dino-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .animate-dino-jump {
          animation: dino-jump 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-dino-shake {
          animation: dino-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-dino-jump,
          .animate-dino-shake {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <DinoRunningLoader
          badgeText="AUTH // INITIALIZING"
          statusMessage="Loading recruitment portal authentication..."
        />
      }
    >
      <SignInContent />
    </Suspense>
  );
}
