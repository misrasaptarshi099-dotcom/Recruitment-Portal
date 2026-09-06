"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import UserButton from "./UserButton";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import { authClient } from "@/lib/auth-client";
import { Loader2, Sparkles } from "lucide-react";

export default function NavBar() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === "admin";

  const navLinks = [
    { label: "Departments", href: "/departments" },
    ...(isAdmin ? [{ label: "Admin Panel", href: "/admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg transition-colors">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-400 p-[1.5px]">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-background">
              <Image
                src="/assets/gdg.svg"
                alt="GDG Logo"
                width={24}
                height={24}
                className="h-6 w-6"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
              GDG on Campus
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-500 border border-blue-500/20">
                <Sparkles className="h-2.5 w-2.5" /> 2026
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground leading-none">
              Recruitment Portal
            </span>
          </div>
        </Link>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* User / Sign In */}
          {isPending ? (
            <div className="flex h-9 w-9 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : isAuthenticated ? (
            <UserButton user={user} />
          ) : (
            <Link href="/auth/signin">
              <Button size="sm" className="rounded-full shadow-sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
