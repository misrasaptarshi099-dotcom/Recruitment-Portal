"use client";

import React, { useState, useMemo } from "react";
import { useRouter, notFound } from "next/navigation";
import { reviews } from "@/constants/index";
import NavBar from "@/components/NavBar";
import FormComp from "@/components/FormComp";
import Footer from "@/components/Footer";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

export default function JoinDepartmentPage({ params }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isSignedIn = Boolean(user);

  const joinIds = params?.joinIds || [];

  const departments = useMemo(() => {
    return reviews.filter((dept) => joinIds.includes(dept.id));
  }, [joinIds]);

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
          {isPending ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Checking authentication status...</p>
            </div>
          ) : isSignedIn ? (
            <FormComp
              dept1={departments[0]}
              dept2={departments[1]}
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
