"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { FaGoogle } from "react-icons/fa";

export default function SignInButton({ children, callbackURL = "/" }) {
  const handleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackURL || "/",
        errorCallbackURL: "/auth/signin",
      });
    } catch (error) {
      console.error("Sign in error:", error);
      if (typeof window !== "undefined") {
        window.location.href = `/auth/signin?error=auth_error&reason=${encodeURIComponent(error?.message || "Sign-in failed")}`;
      }
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      className="rounded-full"
      variant="outline"
      size="icon"
    >
      {children || <FaGoogle />}
    </Button>
  );
} 