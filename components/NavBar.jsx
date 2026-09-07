"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import UserButton from "./UserButton";
import ThemeToggle from "./ThemeToggle";
import { PixelButton } from "./design-system";
import { authClient } from "@/lib/auth-client";
import { isUserAdmin } from "@/lib/security";
import { Loader2 } from "lucide-react";

import CardNav from "./CardNav";

export default function NavBar() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [isDynamicAdmin, setIsDynamicAdmin] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      setIsDynamicAdmin(false);
      return;
    }
    if (isUserAdmin(user)) {
      setIsDynamicAdmin(true);
      return;
    }
    fetch("/api/admin/roles")
      .then((res) => {
        if (res.ok) setIsDynamicAdmin(true);
      })
      .catch(() => {});
  }, [user]);

  const isAuthenticated = Boolean(user);
  const isAdmin = isUserAdmin(user) || isDynamicAdmin;

  const navLinks = [
    { label: "Departments", href: "/departments" },
    ...(isAuthenticated ? [{ label: "My Profile", href: "/profile" }] : []),
    ...(isAdmin ? [{ label: "Admin Panel", href: "/admin" }] : []),
  ];

  const cardNavItems = [
    {
      label: "Departments",
      bgColor: "hsl(var(--card))",
      textColor: "hsl(var(--foreground))",
      links: [
        { label: "Explore All Trees", href: "/departments" },
        { label: "Technical Tracks", href: "/departments" },
        { label: "Creative & Management", href: "/departments" },
      ],
    },
    {
      label: "Candidate Area",
      bgColor: "hsl(var(--card))",
      textColor: "hsl(var(--foreground))",
      links: [
        ...(isAuthenticated ? [{ label: "My Profile & Status", href: "/profile" }] : [{ label: "Sign In With University Email", href: "/auth/signin" }]),
        { label: "Dino Arcade & Leaderboard", href: "/" },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Admin Controls",
            bgColor: "hsl(var(--card))",
            textColor: "hsl(var(--foreground))",
            links: [
              { label: "Applicant Review Dashboard", href: "/admin" },
              { label: "Shortlisting & Department Evaluation", href: "/admin" },
            ],
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-border/80 bg-background/90 backdrop-blur-lg transition-colors">
      {/* Mobile CardNav View */}
      <div className="md:hidden px-3 py-2 w-full">
        <CardNav
          logo={
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-7 w-7 overflow-hidden border border-border bg-card p-1 shadow-pixel-sm">
                <Image
                  src="/assets/gdg.svg"
                  alt="GDG Logo"
                  width={20}
                  height={20}
                  className="h-full w-full"
                />
              </div>
            </Link>
          }
          brandTitle="GDG on Campus"
          items={cardNavItems}
          ctaButton={
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              {isPending ? (
                <div className="flex h-7 w-7 items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                </div>
              ) : isAuthenticated ? (
                <UserButton user={user} />
              ) : (
                <PixelButton as={Link} href="/auth/signin" variant="arcade" size="sm" className="h-8 px-2 text-xs">
                  Sign In
                </PixelButton>
              )}
            </div>
          }
        />
      </div>

      {/* Desktop Navigation Bar */}
      <div className="hidden md:flex w-full max-w-[1536px] mx-auto h-16 items-center justify-between px-4 sm:px-8 lg:px-12 xl:px-16">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="relative h-9 w-9 overflow-hidden border-2 border-border bg-card p-1 shadow-pixel-sm">
            <div className="flex h-full w-full items-center justify-center bg-background">
              <Image
                src="/assets/gdg.svg"
                alt="GDG Logo"
                width={22}
                height={22}
                className="h-5 w-5"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <span>
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">D</span>
                <span className="text-[#0F9D58]">G</span>
              </span>{" "}
              <span>on Campus</span>
              <span className="hidden sm:inline-flex items-center gap-1 bg-[#4285F4]/10 px-2 py-0.5 text-[10px] font-mono font-bold text-[#4285F4] border border-[#4285F4]/30 shadow-pixel-sm">
                2026
              </span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground leading-none">
              RECRUITMENT PORTAL
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
            <PixelButton as={Link} href="/auth/signin" variant="arcade" size="sm">
              Sign In
            </PixelButton>
          )}
        </div>
      </div>
    </header>
  );
}
