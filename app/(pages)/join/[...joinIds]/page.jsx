"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, notFound } from "next/navigation";
import { reviews } from "@/constants/index";
import NavBar from "@/components/NavBar";
import FormComp from "@/components/FormComp";
import Footer from "@/components/Footer";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, XCircle } from "lucide-react";
import DinoRunningLoader from "@/components/DinoRunningLoader";
import { toast } from "sonner";

export default function JoinDepartmentPage({ params }) {
  const [isLoading, setIsLoading] = useState(false);
  const [closedDepartments, setClosedDepartments] = useState([]);
  const [isCheckingDeadlines, setIsCheckingDeadlines] = useState(true);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isSignedIn = Boolean(user);

  const rawJoinIds = params?.joinIds;
  const joinIds = useMemo(() => rawJoinIds || [], [rawJoinIds]);

  const departments = useMemo(() => {
    return reviews.filter((dept) => joinIds.includes(dept.id));
  }, [joinIds]);

  // Fetch current recruitment deadlines to prevent filling expired tracks
  useEffect(() => {
    let isMounted = true;
    async function checkDeadlines() {
      try {
        const res = await fetch("/api/deadlines");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data?.closedDepartments)) {
            setClosedDepartments(data.closedDepartments);
          }
        }
      } catch (err) {
        console.error("Failed to check deadlines:", err);
      } finally {
        if (isMounted) setIsCheckingDeadlines(false);
      }
    }
    checkDeadlines();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeDepartments = useMemo(() => {
    return departments.filter((d) => !closedDepartments.includes(d.name));
  }, [departments, closedDepartments]);

  const allClosed = departments.length > 0 && activeDepartments.length === 0 && !isCheckingDeadlines;

  // Inform user if one of their two selected tracks has closed
  useEffect(() => {
    if (!isCheckingDeadlines && departments.length > 1 && activeDepartments.length === 1) {
      const closedOne = departments.find((d) => closedDepartments.includes(d.name));
      if (closedOne) {
        toast.warning(`Applications for ${closedOne.name} are closed. You can still apply for ${activeDepartments[0].name}.`);
      }
    }
  }, [isCheckingDeadlines, departments, activeDepartments, closedDepartments]);

  const isValid = useMemo(() => {
    if (!joinIds.length) return false;
    return joinIds.every(
      (id) => reviews.some((dept) => dept.id === id) || id.startsWith("clerk_")
    );
  }, [joinIds]);

  if (!isValid) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavBar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {isPending || isCheckingDeadlines ? (
            <DinoRunningLoader
              badgeText="MAINFRAME // VERIFYING_CLEARANCE"
              statusMessage="Verifying session and application deadlines..."
              fullScreen={false}
            />
          ) : allClosed ? (
            <div className="mx-auto max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center shadow-lg backdrop-blur-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <XCircle className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Applications Closed
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                The submission deadline for {departments.map((d) => d.name).join(" and ")} has passed. Round 1 candidate evaluations are now underway, and we are no longer accepting new submissions for this track.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => router.push("/departments")}
                  className="w-full rounded-full gap-2 bg-foreground text-background hover:bg-foreground/90"
                  size="lg"
                >
                  <span>Explore Open Tracks</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : isSignedIn ? (
            <FormComp
              dept1={activeDepartments[0]}
              dept2={activeDepartments[1]}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/60 p-8 text-center shadow-lg backdrop-blur-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Authentication Required
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Please sign in with your email address to fill out and submit your recruitment application.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => router.push("/auth/signin")}
                  className="w-full rounded-full gap-2"
                  size="lg"
                >
                  <span>Sign In to Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

